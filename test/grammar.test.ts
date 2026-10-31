import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import type { Card, Prescriptions } from '../src/cards.ts'
import { drive, runQueue } from '../src/engine.ts'
import { DISCOVERY_FUNCTIONS, discoveryContextFor, GRAMMAR_PACK, grammarOf, grammarRuns } from '../src/grammar.ts'
import { problemsOf, SOFTWARE, type Job } from '../src/lane.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

// A scripted worker is a test instrument; product files and check processes are real.
const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
const jobs: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate']
const prescriptions: Prescriptions = {
	tiers: { deep: [card], coding: [card], intake: [card] },
	jobs: {
		...Object.fromEntries(jobs.map((job) => [job, { tier: job === 'implement' ? 'coding' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : job === 'arbitrate' ? 'run' : 'read', budget: { minutes: 1 } }])),
		verify: { budget: { minutes: 1 } },
	} as Prescriptions['jobs'],
	parallel: 2,
}
const clear = { understanding: 'The specified inputs and obligation are clear.', unclear: [], ambiguous: [], missing: [], notes: [] }
const rawSource = 'First build one export.\r\nThen build another independent export.\nKeep the original source exactly.  '
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

function assertSoftwareDeliveryContract(packet: { deliveryContract?: unknown }) {
	assert.ok(packet.deliveryContract, 'thinking roles must receive the effective software execution contract')
	const contract = packet.deliveryContract as { owner: string; verification: string; shipment: { configured: boolean; procedure: string }; acceptance: string }
	assert.equal(contract.owner, 'Made Well')
	assert.equal(contract.shipment.configured, true, 'the actual registered project has a ship command')
	assert.match(contract.verification, /checks.*BEFORE merging or shipping/)
	assert.match(contract.shipment.procedure, /After passing verification and merging/)
	assert.match(contract.acceptance, /Never require.*already shipped.*prerequisite.*own checks/)
	assert.deepEqual(Object.keys(contract.shipment).sort(), ['configured', 'procedure'], 'effective release facts disclose no executable command or credentials')
	assert.doesNotMatch(JSON.stringify(contract), /git rev-parse HEAD/, 'the registered executable stays in project configuration')
}

function fixture() {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'mw-grammar-')))
	const home = join(tmp, 'home')
	const repo = join(tmp, 'product')
	mkdirSync(join(repo, 'src'), { recursive: true })
	mkdirSync(home)
	writeFileSync(join(repo, 'src/app.sh'), 'echo app\n')
	git(repo, 'init', '-q', '-b', 'main')
	git(repo, 'config', 'user.name', 'Grammar acceptance')
	git(repo, 'config', 'user.email', 'grammar@example.com')
	git(repo, 'add', 'src/app.sh')
	git(repo, 'commit', '-qm', 'Seed the acceptance application')
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, ship: 'git rev-parse HEAD' }]))
	const previousHome = process.env.MW_HOME
	process.env.MW_HOME = home
	const path = join(home, 'record.db')
	let store = openStore(path)
	const createDiscovery = (pack = GRAMMAR_PACK) => store.create({ title: 'Export discovery', objective: 'Identify independent exports', source: rawSource, workspace: repo, pack, autonomy: 'full', job: pack.discovery[0]!.steps[0]!.job })
	const clean = () => {
		store.close()
		if (previousHome === undefined) delete process.env.MW_HOME
		else process.env.MW_HOME = previousHome
		rmSync(tmp, { recursive: true, force: true })
	}
	return { repo, home, path, createDiscovery, get store() { return store }, reopen() { store.close(); store = openStore(path) }, clean }
}

function recordedTask(t: ReturnType<typeof fixture>, parent = t.createDiscovery()) {
	t.store.save({ ...parent, status: 'discovered', job: 'discover', outputs: { discover: JSON.stringify({ items: [{ title: 'Export' }] }) } }, 'discovered', { candidates: [] })
	const child = t.store.create({ title: 'Export', objective: 'Export the result', source: rawSource, workspace: t.repo, pack: GRAMMAR_PACK, discovery: parent.id, autonomy: 'full' })
	const checks = [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/export.sh' }]
	const results = [{ ...checks[0]!, exitCode: 0, ms: 1, output: 'passed' }]
	const outputs = Object.fromEntries(['ideate', 'challenge', 'plan', 'implement', 'test-plan'].map((job) => [job, JSON.stringify(job === 'test-plan' ? { checks } : { result: `${job} output` })]))
	let item: Item = { ...child, status: 'shipped', job: 'verify', outputs, change: { files: ['src/export.sh'] }, checks: { checks, files: ['checks/export.sh'] }, verification: { on: 'base-a', commit: 'candidate-a', results, passed: true }, shipped: { command: 'local-release', output: 'released candidate-a', main: 'candidate-a' } }
	for (const job of Object.keys(outputs)) t.store.note(child.id, 'accepted', { job })
	t.store.note(child.id, 'verified', { on: 'base-a', commit: 'candidate-a', results })
	item = t.store.save(item, 'shipped', { main: 'candidate-a' })
	return { parent, item }
}

function recordedDiscovery(t: ReturnType<typeof fixture>) {
	const parent = t.createDiscovery()
	const outputs: Record<string, string> = {}
	for (const [index, [job]] of DISCOVERY_FUNCTIONS.entries()) {
		outputs[job] = JSON.stringify(job === 'discover' ? { items: [] } : { result: `Accepted ${job}`, sources: [], unknowns: [], decisions: [] })
		const call = t.store.recordCall({ item: parent.id, kind: 'execute', job, profile: 'ideator', card, system: 'Scripted acceptance fixture', prompt: JSON.stringify({ item: { source: rawSource } }), outcome: 'ok', output: outputs[job]!, error: null, raw: null, started: new Date().toISOString(), ms: 20 })
		t.store.note(parent.id, 'call-finished', { call, job, kind: 'execute', outcome: 'ok' })
		t.store.note(parent.id, job === 'discover' ? 'discovered' : 'handed-off', job === 'discover' ? { candidates: [] } : { from: job, to: DISCOVERY_FUNCTIONS[index + 1]![0] })
	}
	return t.store.save({ ...parent, status: 'discovered', job: 'discover', outputs }, 'fixture-discovery-recorded', {})
}

test('completion follows an accepted repaired output after reopening, rather than the malformed original answer', () => {
	const t = fixture()
	try {
		const root = recordedDiscovery(t)
		const output = JSON.stringify({ result: 'Recovered declaration', sources: ['capture:original'], unknowns: [], decisions: [] })
		const fields = { item: root.id, job: 'declare', profile: 'ideator', card, system: 'repair fixture', prompt: '{}', outcome: 'ok' as const, error: null, raw: null, started: new Date().toISOString(), ms: 1 }
		const original = t.store.recordCall({ ...fields, kind: 'execute', output: 'malformed answer' })
		t.store.note(root.id, 'call-finished', { call: original, job: 'declare', kind: 'execute', outcome: 'ok' })
		const repaired = t.store.recordCall({ ...fields, kind: 'repair', output })
		t.store.note(root.id, 'repaired', { call: original, repair: repaired, job: 'declare', ok: true })
		t.store.save({ ...root, outputs: { ...root.outputs, declare: output } }, 'handed-off', { from: 'declare', to: 'look-first' })
		t.reopen()
		const view = grammarOf(t.store, root.id)!
		assert.equal(view.discovery.steps[0]!.complete, true)
		assert.deepEqual(view.discovery.steps[0]!.output, JSON.parse(output))
		assert.equal(view.discovery.complete, true)
	} finally { t.clean() }
})

test('the prescribed pack contains all seven discovery obligations and retains the independent software delivery lane', () => {
	assert.deepEqual(problemsOf(GRAMMAR_PACK), [])
	assert.deepEqual(DISCOVERY_FUNCTIONS.map(([, label]) => label), ['Declare()', 'lookFirst()', 'classify()', 'Lenses()', 'oneThing()', 'route()', 'confirm()'])
	assert.deepEqual(GRAMMAR_PACK.discovery.flatMap((c) => c.steps.map((s) => s.job)), DISCOVERY_FUNCTIONS.map(([job]) => job))
	assert.deepEqual(GRAMMAR_PACK.delivery, SOFTWARE.delivery)
	assert.ok(GRAMMAR_PACK.delivery.some((c) => c.steps.some((s) => s.job === 'test-plan')))
})

test('seven real engine handoffs accumulate discovery outputs, deliver independent tasks, and preserve a candidate during test-only correction', async () => {
	const t = fixture()
	const discovery = t.createDiscovery()
	const calls: WorkerRequest[] = []
	const counters = new Map<string, number>()
	let correctionSawCandidate = false
	const worker = Layer.succeed(Worker, { run: (req) => Effect.promise(async (): Promise<WorkerResult> => {
		calls.push(req)
		const key = `${req.item}:${req.kind}:${req.job}`
		const count = (counters.get(key) ?? 0) + 1
		counters.set(key, count)
		let output: unknown
		const write = (path: string, body: string) => { mkdirSync(dirname(join(req.cwd, path)), { recursive: true }); writeFileSync(join(req.cwd, path), body) }
		const packet = JSON.parse(req.prompt)
		const name = packet.item.title.includes('Second') ? 'two' : 'one'
		if (req.kind === 'intake') output = clear
		else if (req.kind === 'originator') output = { answer: 'Use the accepted contract and its saved evidence.', needsOperator: false }
		else if (req.job === 'discover') output = { items: ['First', 'Second'].map((word) => ({ title: `${word} export`, kind: 'feature', objective: `Create the ${word.toLowerCase()} export`, text: `One independently deliverable ${word.toLowerCase()} export.`, after: [] })) }
		else if (DISCOVERY_FUNCTIONS.some(([job]) => job === req.job)) output = { result: `Accepted ${req.job}`, sources: ['src/app.sh'], unknowns: [], decisions: [] }
		else if (req.job === 'ideate') output = { outcome: `${name} export`, approach: 'A standalone shell module', decisions: [] }
		else if (req.job === 'challenge') output = { findings: [], decisions: [] }
		else if (req.job === 'plan') output = { making: `${name} export`, notMaking: ['Other exports'], scope: [`src/${name}.sh`], follows: [{ path: `src/${name}.sh`, follows: 'src/app.sh' }], steps: [`Write src/${name}.sh to print ${name}`], doneWhen: [{ id: 'D1', text: `The export prints ${name}` }], decisions: [] }
		else if (req.job === 'implement') { await new Promise((resolve) => setTimeout(resolve, 80)); write(`src/${name}.sh`, `echo ${name}\n`); output = { summary: `Created ${name}` } }
		else if (req.job === 'test-plan') {
			if (name === 'one' && count > 1) correctionSawCandidate = readFileSync(join(req.cwd, 'src/one.sh'), 'utf8') === 'echo one\n'
			write(`checks/${name}.sh`, `[ "$(sh src/${name}.sh)" = "${name === 'one' && count === 1 ? 'incorrect-test-expectation' : name}" ]\n`)
			output = { checks: [{ id: 'C1', doneWhen: 'D1', run: `sh checks/${name}.sh` }] }
		} else if (req.job === 'arbitrate') output = { cause: 'test', answer: 'The accepted contract requires one, so correct the mistaken expected string without rebuilding product code.', evidence: 'The candidate prints one while the check expects incorrect-test-expectation.' }
		else throw new Error(`Unexpected scripted job ${req.kind}/${req.job}`)
		return { ok: true, output: JSON.stringify(output) }
	}) })
	const execute = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, t.store), worker))))
	try {
		await execute(drive(discovery.id, { prescriptions }))
		const discoveryCalls = calls.filter((c) => c.item === discovery.id && c.kind === 'execute')
		assert.deepEqual(discoveryCalls.map((c) => c.job), DISCOVERY_FUNCTIONS.map(([job]) => job))
		for (let i = 0; i < discoveryCalls.length; i++) {
			const packet = JSON.parse(discoveryCalls[i]!.prompt)
			assert.equal(packet.item.source, rawSource)
			assert.deepEqual(Object.keys(packet.received), DISCOVERY_FUNCTIONS.slice(0, i).map(([job]) => job), 'each discovery operation receives all accepted predecessors')
			assertSoftwareDeliveryContract(packet)
		}
		for (const call of calls.filter((c) => c.item === discovery.id && c.kind === 'intake')) assertSoftwareDeliveryContract(JSON.parse(call.prompt))
		const children = t.store.list().filter((i) => i.discovery === discovery.id)
		assert.equal(children.length, 2)
		assert.ok(children.every((c) => c.source === rawSource && c.status === 'queued'))
		t.reopen() // The workflow has no process-local conversation dependency.
		await execute(runQueue({ prescriptions }))
		for (const child of children) {
			assert.equal(t.store.get(child.id)!.status, 'shipped')
			for (const c of calls.filter((c) => c.item === child.id && ['intake', 'execute'].includes(c.kind))) {
				const packet = JSON.parse(c.prompt)
				if (['ideate', 'challenge', 'plan'].includes(c.job)) {
					assertSoftwareDeliveryContract(packet)
					assert.equal(packet.discoveryContext.id, discovery.id)
					assert.equal(packet.discoveryContext.source, rawSource)
					assert.deepEqual(Object.keys(packet.discoveryContext.outputs), DISCOVERY_FUNCTIONS.map(([job]) => job))
					assert.equal(packet.discoveryContext.outputs.declare.output, t.store.get(discovery.id)!.outputs.declare)
				} else if (['implement', 'test-plan'].includes(c.job)) {
					assert.equal(packet.discoveryContext, undefined, 'blind makers receive no discovery side channel')
					assert.equal(packet.deliveryContract, undefined, 'blind makers receive no additional delivery-policy side channel')
					assert.deepEqual(Object.keys(packet.received), ['plan'])
				}
			}
		}
		const first = children[0]!
		assert.equal(counters.get(`${first.id}:execute:implement`), 1, 'a bad check never rebuilds accepted implementation')
		assert.equal(counters.get(`${first.id}:execute:plan`), 1)
		assert.equal(counters.get(`${first.id}:execute:test-plan`), 2)
		assert.equal(correctionSawCandidate, true)
		assert.equal(execFileSync('sh', [join(t.repo, 'src/one.sh')], { encoding: 'utf8' }).trim(), 'one')
		assert.equal(execFileSync('sh', [join(t.repo, 'src/two.sh')], { encoding: 'utf8' }).trim(), 'two')
		const view = grammarOf(t.store, discovery.id)!
		assert.ok(view.discovery.steps.every((s) => s.state === 'yes'))
		assert.equal(view.discovery.complete, true)
		assert.equal(view.discovery.completedStepCount, 7)
		assert.equal(view.discovery.requiredStepCount, 7)
		assert.ok(view.tasks.every((task) => task.phases.every((phase) => phase.state === 'yes') && task.testsCreated && task.delivered))
		assert.equal(view.allDelivered, true)
		assert.equal(view.parallel.observed, true)
		assert.equal(grammarOf(t.store, first.id)!.discovery.id, discovery.id)
		assert.equal(git(t.repo, 'status', '--porcelain'), '')
		const lookCall = t.store.calls(discovery.id).find((c) => c.job === 'look-first' && c.kind === 'execute')!
		const planCall = t.store.calls(first.id).find((c) => c.job === 'plan' && c.kind === 'execute')!
		const lookInput = { call: lookCall.id, started: lookCall.started, outcome: lookCall.outcome, packet: JSON.parse(lookCall.prompt), returnedOutput: JSON.parse(lookCall.output!), record: `/api/call/${lookCall.id}` }
		const planInput = { call: planCall.id, started: planCall.started, outcome: planCall.outcome, packet: JSON.parse(planCall.prompt), returnedOutput: JSON.parse(planCall.output!), record: `/api/call/${planCall.id}` }
		assert.deepEqual(view.discovery.steps.find((s) => s.job === 'look-first')!.input, lookInput)
		const planningInput = view.tasks.find((task) => task.id === first.id)!.phases.find((phase) => phase.job === 'planning')!.input as { plan: unknown }
		assert.deepEqual(planningInput.plan, planInput)
		assert.equal(planInput.packet.discoveryContext.outputs.declare.output, t.store.get(discovery.id)!.outputs.declare)
		const currentDiscovery = t.store.get(discovery.id)!
		t.store.save({ ...currentDiscovery, outputs: { ...currentDiscovery.outputs, declare: '{"result":"Later declaration never supplied to the old call"}' } }, 'fixture-later-discovery-output', {})
		const currentTask = t.store.get(first.id)!
		t.store.save({ ...currentTask, outputs: { ...currentTask.outputs, plan: '{"result":"Later plan never supplied to the old call"}' } }, 'fixture-later-plan-output', {})
		t.reopen()
		const changed = grammarOf(t.store, discovery.id)!
		assert.deepEqual(changed.discovery.steps.find((s) => s.job === 'look-first')!.input, lookInput, 'discovery input is the actual historical call, not current upstream output')
		const changedPlanInput = changed.tasks.find((task) => task.id === first.id)!.phases.find((phase) => phase.job === 'planning')!.input as { plan: unknown }
		assert.deepEqual(changedPlanInput.plan, planInput, 'the displayed injected discovery context remains exactly what the planner received')
	} finally { t.clean() }
})

test('an arbitrary function cartridge receives its own contract without inheriting software shipment obligations', async () => {
	const t = fixture()
	const calls: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: (request) => Effect.sync(() => {
		calls.push(request)
		return { ok: true as const, output: JSON.stringify(request.kind === 'intake' ? clear : { value: 21 }) }
	}) })
	try {
		const item = t.store.create({ title: 'A domain-specific transformation', objective: 'Return the configured value', source: '21', workspace: t.repo, autonomy: 'full', pack: {
			name: 'function-contract-acceptance', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'transform', profile: 'implementer', duty: 'Return the supplied value without software delivery.', args: { value: 21 }, output: { type: 'object', required: ['value'], properties: { value: { type: 'number' } } } }] }],
		} })
		const completed = await Effect.runPromise(drive(item.id, { prescriptions }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, t.store), worker))))
		assert.equal(completed.status, 'completed')
		assert.deepEqual(completed.completion?.output, { value: 21 })
		assert.deepEqual(calls.map((c) => c.kind), ['intake', 'execute'])
		for (const call of calls) {
			const packet = JSON.parse(call.prompt)
			assert.equal(packet.deliveryContract, undefined)
			assert.equal(packet.discoveryContext, undefined)
			assert.equal(packet.function.node.job, 'transform')
			assert.deepEqual(packet.function.args, { value: 21 })
		}
		assert.equal(completed.shipped, undefined)
		assert.equal(completed.verification, undefined)
	} finally { t.clean() }
})

test('accepted outputs without captured invocation records expose missing inputs rather than reconstructing packets', () => {
	const t = fixture()
	try {
		const { parent } = recordedTask(t)
		const view = grammarOf(t.store, parent.id)!
		assert.ok(view.discovery.steps.every((step) => step.input === null))
		const phases = view.tasks[0]!.phases
		assert.deepEqual(phases.find((phase) => phase.job === 'ideation')!.input, { ideate: null, challenge: null })
		assert.deepEqual(phases.find((phase) => phase.job === 'planning')!.input, { plan: null })
		assert.deepEqual(phases.find((phase) => phase.job === 'implementation')!.input, { implement: null })
		assert.equal(phases.find((phase) => phase.job === 'verification')!.input, null)
	} finally { t.clean() }
})

test('legacy discovery cannot manufacture seven completed functions or infer execution from a child candidate', () => {
	const t = fixture()
	try {
		const parent = t.createDiscovery(SOFTWARE)
		t.store.save({ ...parent, status: 'discovered', job: 'discover', outputs: { discover: JSON.stringify({ items: [{ title: 'Candidate' }] }) } }, 'discovered', { candidates: [] })
		const child = t.store.create({ title: 'Candidate', objective: 'Do work', source: rawSource, workspace: t.repo, discovery: parent.id, outputs: { discover: '{"title":"Candidate"}' } })
		const view = grammarOf(t.store, child.id)!
		assert.equal(view.discovery.taskListProduced, true)
		assert.equal(view.discovery.complete, false)
		assert.equal(view.discovery.completedStepCount, 1)
		assert.equal(view.discovery.requiredStepCount, 7)
		assert.deepEqual(view.discovery.steps.slice(0, 6).map((s) => s.state), Array(6).fill('unknown'))
		assert.equal(view.tasks[0]!.enteredDelivery, false)
		assert.equal(view.tasks[0]!.delivered, false)
		assert.equal(view.allDelivered, false)
		assert.deepEqual(grammarRuns(t.store).map((i) => i.id), [parent.id])
		assert.equal(grammarOf(t.store, 999), undefined)
	} finally { t.clean() }
})

test('blocked outputs and a stopped runner remain unfinished despite historical acceptance records', () => {
	const t = fixture()
	try {
		const { parent, item } = recordedTask(t)
		t.store.save({ ...item, status: 'held', job: 'implement', outputs: { ...item.outputs, implement: '{"blocked":"Required resource unavailable"}' }, hold: { code: 'environment', message: 'Required resource unavailable', context: {} } }, 'held', { code: 'environment' })
		const view = grammarOf(t.store, parent.id)!
		assert.equal(view.runner.active, false)
		assert.equal(view.tasks[0]!.phases.find((s) => s.job === 'implementation')!.state, 'blocked')
		assert.equal(view.tasks[0]!.delivered, false)
	} finally { t.clean() }
})

test('an implementation correction invalidates dependent fulfillment while preserving ideation evidence', () => {
	const t = fixture()
	try {
		const { parent, item } = recordedTask(t)
		t.store.save({ ...item, status: 'running', job: 'plan' }, 'ruling', { cause: 'implementation', to: 'plan' })
		const task = grammarOf(t.store, parent.id)!.tasks[0]!
		assert.equal(task.phases[0]!.state, 'yes')
		assert.deepEqual(task.phases.slice(1).map((s) => s.state), ['no', 'no', 'no'])
		assert.equal(task.testsCreated, false)
		assert.equal(task.verification.passed, null, 'old passing evidence is historical, not a current failure or pass')
		assert.equal(task.delivered, false)
	} finally { t.clean() }
})

test('moving the candidate base requires fresh verification and failed check evidence cannot release delivery', () => {
	const t = fixture()
	try {
		const { parent, item } = recordedTask(t)
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.delivered, true)
		t.store.note(item.id, 'main-moved', { from: 'base-a', to: 'base-b' })
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.verification.passed, null)
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.delivered, false)
		const results = item.verification!.results.map((r) => ({ ...r, exitCode: 1, output: 'failed against changed candidate' }))
		t.store.save({ ...item, verification: { on: 'base-b', commit: 'candidate-b', results, passed: false } }, 'failure', { from: 'verify', results })
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.verification.passed, false)
		assert.equal(grammarOf(t.store, parent.id)!.allDelivered, false)
	} finally { t.clean() }
})

test('a gates-only result without independently created checks cannot mark the prescribed demonstration delivered', () => {
	const t = fixture()
	try {
		const { parent, item } = recordedTask(t)
		const outputs = { ...item.outputs }
		delete outputs['test-plan']
		const results = [{ id: 'G1', doneWhen: '(gate)', run: 'true', exitCode: 0, ms: 1, output: '' }]
		t.store.save({ ...item, outputs, checks: undefined, verification: { on: 'base-a', commit: 'candidate-a', results, passed: true } }, 'fixture-missing-checks', {})
		const task = grammarOf(t.store, parent.id)!.tasks[0]!
		assert.equal(task.testsCreated, false)
		assert.equal(task.delivered, false, 'the explicit test-creation obligation is not fulfilled by a generic gate')
	} finally { t.clean() }
})

test('a successful receipt cannot verify a different candidate or a changed check definition', () => {
	const t = fixture()
	try {
		const { parent, item } = recordedTask(t)
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.delivered, true)
		t.store.save({ ...item, verification: { ...item.verification!, commit: 'candidate-b' } }, 'fixture-replaced-candidate', {})
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.verification.passed, null, 'candidate-a evidence cannot green candidate-b')
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.delivered, false)
		const changed = { ...item.checks!, checks: item.checks!.checks.map((c) => ({ ...c, run: 'sh checks/new-acceptance.sh' })) }
		t.store.save({ ...item, checks: changed }, 'fixture-replaced-check', {})
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.verification.passed, null, 'old successful commands cannot satisfy a changed accepted check')
		assert.equal(grammarOf(t.store, parent.id)!.tasks[0]!.delivered, false)
	} finally { t.clean() }
})

test('parent discovery references remain explicitly unavailable when missing and never leak into maker packets', () => {
	const t = fixture()
	try {
		const child = t.store.create({ title: 'Orphan candidate', objective: 'Do work', source: rawSource, workspace: t.repo, pack: GRAMMAR_PACK, discovery: 999 })
		assert.deepEqual(discoveryContextFor(t.store, child, 'ideate'), { id: 999, record: 'mw show 999', available: false })
		assert.equal(discoveryContextFor(t.store, child, 'implement'), undefined)
		assert.equal(discoveryContextFor(t.store, child, 'test-plan'), undefined)
		assert.equal(grammarOf(t.store, child.id), undefined)
		assert.equal(existsSync(join(t.repo, 'src/export.sh')), false)
	} finally { t.clean() }
})

test('discovery completion counts accepted functions separately from task generation and delivery, and survives reopening', () => {
	const t = fixture()
	try {
		const parent = recordedDiscovery(t)
		const before = grammarOf(t.store, parent.id)!
		assert.equal(before.discovery.complete, true)
		assert.equal(before.discovery.completedStepCount, 7)
		assert.equal(before.discovery.taskListProduced, true)
		assert.equal(before.allDelivered, false, 'empty candidate lists do not claim delivered work')
		assert.ok(before.discovery.steps.every((step) => step.complete && step.metrics.calls === 1 && step.metrics.durationMs === 20 && step.metrics.tokens === null && step.metrics.unreportedUsage === 1))
		t.reopen()
		const after = grammarOf(t.store, parent.id)!
		assert.deepEqual(after.discovery, before.discovery)
	} finally { t.clean() }
})

test('retained, empty, blocked and partially accepted discovery outputs never complete missing functions', () => {
	const t = fixture()
	try {
		const parent = t.createDiscovery()
		const outputs = Object.fromEntries(DISCOVERY_FUNCTIONS.map(([job]) => [job, JSON.stringify({ result: 'Retained but not accepted' })]))
		outputs.declare = '  '
		outputs['look-first'] = '{"blocked":"Missing required source"}'
		outputs.classify = JSON.stringify({ result: 'Accepted classification', sources: [], unknowns: [], decisions: [] })
		outputs.lenses = '{}'
		t.store.note(parent.id, 'accepted', { job: 'declare' })
		t.store.note(parent.id, 'accepted', { job: 'look-first' })
		t.store.note(parent.id, 'accepted', { job: 'classify' })
		t.store.note(parent.id, 'accepted', { job: 'lenses' })
		t.store.save({ ...parent, status: 'held', job: 'look-first', outputs, hold: { code: 'environment', message: 'Missing required source', context: {} } }, 'held', {})
		const view = grammarOf(t.store, parent.id)!
		assert.equal(view.discovery.complete, false)
		assert.equal(view.discovery.completedStepCount, 1)
		assert.deepEqual(view.discovery.steps.map((step) => step.complete), [false, false, true, false, false, false, false])
		assert.equal(view.discovery.steps[1]!.state, 'blocked')
		assert.equal(view.discovery.taskListProduced, false)
		assert.equal(view.discovery.steps[0]!.metrics.durationMs, null)
		assert.equal(view.discovery.steps[0]!.metrics.tokens, null)
	} finally { t.clean() }
})

test('a retained output must still match its accepted call or structured acceptance receipt', () => {
	const t = fixture()
	try {
		const parent = recordedDiscovery(t)
		const rejected = t.store.recordCall({ item: parent.id, kind: 'execute', job: 'route', profile: 'ideator', card, system: 'Scripted rejected attempt', prompt: '{}', outcome: 'rejected', output: '{"partial":"Unaccepted retry"}', error: 'Incomplete response', raw: null, started: new Date().toISOString(), ms: 1 })
		t.store.note(parent.id, 'call-finished', { call: rejected, job: 'route', kind: 'execute', outcome: 'rejected' })
		assert.equal(grammarOf(t.store, parent.id)!.discovery.complete, true, 'a later unaccepted attempt cannot replace the call that established acceptance')
		t.store.save({ ...parent, outputs: { ...parent.outputs, route: '{"result":"Changed after the accepted call"}' } }, 'fixture-output-replaced', {})
		const changed = grammarOf(t.store, parent.id)!
		assert.equal(changed.discovery.complete, false)
		assert.equal(changed.discovery.completedStepCount, 6)
		assert.equal(changed.discovery.taskListProduced, true)
		assert.match(changed.discovery.steps.find((step) => step.job === 'route')!.reason!, /differs from its accepted execution/)
		const output = { result: 'Fresh accepted boundary output', sources: [], unknowns: [], decisions: [] }
		t.store.note(parent.id, 'accepted', { job: 'route', output })
		t.store.save({ ...t.store.get(parent.id)!, outputs: { ...parent.outputs, route: JSON.stringify(output) } }, 'fixture-output-accepted', {})
		assert.equal(grammarOf(t.store, parent.id)!.discovery.complete, true)
		t.store.save({ ...t.store.get(parent.id)!, outputs: { ...parent.outputs, route: '{"result":"Changed after receipt"}' } }, 'fixture-output-replaced', {})
		assert.equal(grammarOf(t.store, parent.id)!.discovery.complete, false)
	} finally { t.clean() }
})

test('changed discovery contracts invalidate earlier acceptance and unconfigured functions remain visible and incomplete', () => {
	const t = fixture()
	try {
		const parent = recordedDiscovery(t)
		const changed = { ...GRAMMAR_PACK, discovery: GRAMMAR_PACK.discovery.map((cartridge) => ({ ...cartridge, steps: cartridge.steps.map((step) => step.job === 'route' ? { ...step, duty: 'A changed routing contract' } : step) })) }
		t.store.save({ ...parent, pack: changed }, 'cartridges-applied', { from: GRAMMAR_PACK, to: changed })
		const invalidated = grammarOf(t.store, parent.id)!
		assert.equal(invalidated.discovery.complete, false)
		assert.equal(invalidated.discovery.completedStepCount, 6)
		assert.match(invalidated.discovery.steps.find((step) => step.job === 'route')!.reason!, /changed contract/)
		t.store.note(parent.id, 'accepted', { job: 'route', output: JSON.parse(parent.outputs.route!) })
		assert.equal(grammarOf(t.store, parent.id)!.discovery.complete, true)
		const missing = { ...changed, discovery: changed.discovery.map((cartridge) => ({ ...cartridge, steps: cartridge.steps.filter((step) => step.job !== 'lenses') })) }
		t.store.save({ ...t.store.get(parent.id)!, pack: missing }, 'cartridges-applied', { from: changed, to: missing })
		const unconfigured = grammarOf(t.store, parent.id)!.discovery
		assert.equal(unconfigured.steps.length, 7)
		assert.equal(unconfigured.requiredStepCount, 7)
		assert.equal(unconfigured.complete, false)
		assert.equal(unconfigured.steps.find((step) => step.job === 'lenses')!.state, 'unknown')
		assert.equal(unconfigured.steps.find((step) => step.job === 'lenses')!.complete, false)
	} finally { t.clean() }
})

test('a stopped discovery runner retains accepted progress and resumes its visible saved position after reopening', () => {
	const t = fixture()
	try {
		const parent = t.createDiscovery()
		t.store.save({ ...parent, status: 'running', job: 'look-first', outputs: { declare: JSON.stringify({ result: 'Accepted declaration', sources: [], unknowns: [], decisions: [] }) } }, 'handed-off', { from: 'declare', to: 'look-first' })
		t.reopen()
		const view = grammarOf(t.store, parent.id)!
		assert.equal(view.runner.active, false)
		assert.equal(view.discovery.complete, false)
		assert.equal(view.discovery.completedStepCount, 1)
		assert.equal(view.discovery.currentJob, 'look-first')
		assert.equal(view.discovery.steps[0]!.complete, true)
		assert.match(view.discovery.steps[1]!.reason!, /runner is stopped/)
	} finally { t.clean() }
})

test('task readiness names pending and held dependencies, then exposes a ready task waiting for a runner without saving state', () => {
	const t = fixture()
	try {
		const parent = recordedDiscovery(t)
		const dependency = t.store.create({ title: 'Required export', objective: 'Export', source: rawSource, workspace: t.repo, status: 'queued', discovery: parent.id, pack: GRAMMAR_PACK })
		const dependent = t.store.create({ title: 'Dependent export', objective: 'Use the export', source: rawSource, workspace: t.repo, status: 'queued', discovery: parent.id, after: [dependency.id], pack: GRAMMAR_PACK })
		const task = () => grammarOf(t.store, parent.id)!.tasks.find((item) => item.id === dependent.id)!
		assert.equal(task().readiness.state, 'dependency-unshipped')
		assert.equal(task().readiness.ready, false)
		assert.equal(task().readiness.ownerId, dependency.id)
		assert.deepEqual(task().readiness.waitingOn, [dependency.id])
		t.store.save({ ...dependency, status: 'held', hold: { code: 'environment', message: 'Required input unavailable', context: {} } }, 'held', {})
		assert.equal(task().readiness.state, 'dependency-held')
		t.store.save({ ...dependency, status: 'shipped' }, 'fixture-prerequisite-shipped', {})
		t.reopen()
		const mark = t.store.mark()
		assert.equal(task().readiness.state, 'ready-waiting-runner')
		assert.equal(task().readiness.ready, true)
		assert.equal(task().readiness.ownerId, dependent.id)
		assert.deepEqual(task().readiness.waitingOn, [])
		assert.equal(task().delivered, false)
		assert.deepEqual(t.store.mark(), mark, 'the readiness view never saves a transition or starts work')
		t.store.save({ ...t.store.get(dependent.id)!, waitsOn: dependency.id, after: [], status: 'waiting-prerequisite' }, 'fixture-prerequisite-recovery', {})
		t.store.save({ ...dependency, status: 'queued' }, 'fixture-prerequisite-running', {})
		assert.equal(task().readiness.state, 'dependency-unshipped')
		t.store.save({ ...dependency, status: 'dropped' }, 'fixture-prerequisite-dropped', {})
		assert.equal(task().readiness.state, 'ready-waiting-runner', 'dropping a fix prerequisite releases redrive, not verification')
	} finally { t.clean() }
})

test('an empty configured discovery exposes seven unknown obligations and never claims completed work', () => {
	const t = fixture()
	try {
		const item = t.store.create({ title: 'Empty discovery', objective: 'No nodes configured', source: rawSource, workspace: t.repo,
			pack: { name: 'empty-discovery', runtime: 'functions', discovery: [], delivery: [] }, flow: { loop: 'discovery', accepted: [] }, job: '', status: 'completed' })
		const view = grammarOf(t.store, item.id)!
		assert.equal(view.discovery.complete, false)
		assert.equal(view.discovery.completedStepCount, 0)
		assert.equal(view.discovery.requiredStepCount, 7)
		assert.ok(view.discovery.steps.every((step) => step.state === 'unknown' && !step.complete))
		assert.equal(view.discovery.taskListProduced, false)
		assert.equal(view.allDelivered, false)
	} finally { t.clean() }
})
