import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { drive, go, promote, retry } from '../src/engine.ts'
import { quote } from '../src/errors.ts'
import { exportItem } from '../src/export.ts'
import { GRAMMAR_PACK } from '../src/grammar.ts'
import { lastJson, problemsOf, type Job, type Pack } from '../src/lane.ts'
import { openStore, Store, type Autonomy } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'
import type { Card, Prescriptions } from '../src/cards.ts'

const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const jobs: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate']
const prescriptions: Prescriptions = { tiers: { deep: [card], coding: [card], intake: [card] }, jobs: { ...Object.fromEntries(jobs.map(job => [job, { tier: job === 'implement' ? 'coding' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : job === 'arbitrate' ? 'run' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'], parallel: 2 }
const config = { prescriptions }
const command = (code: string) => `${quote(process.execPath)} -e ${quote(code)}`
const jsonCommand = (value: unknown) => command(`console.log(${JSON.stringify(JSON.stringify(value))})`)
const object = { type: 'object' }
const clear = { understanding: 'I understand this task and my fixed phase responsibilities.', unclear: [], ambiguous: [], missing: [], notes: [] }
const question = { id: 'Q-delimiter', text: 'Which delimiter should the export use?', ownerRole: 'planner', blockingRole: 'planner' }
const judged = { verdict: 'at-least-two' as const, legs: [
	{ leg: 'DX' as const, pass: true, gets: 'Use existing shell conventions', costs: 'One script', why: 'The supplied code already uses POSIX shell' },
	{ leg: 'UX' as const, pass: true, gets: 'A directly readable CSV report', costs: 'No extra settings', why: 'The requested format is available without configuration' },
	{ leg: 'AX' as const, pass: false, gets: 'No new runtime dependency', costs: 'No new capability', why: 'This task is bounded to one known output' },
] }
const resolution = () => ({ questionId: question.id, question: question.text, decision: 'Use a comma delimiter.', why: 'The requested CSV format and supplied report use comma-separated fields.', ...judged })
const plan = () => ({ making: 'The requested CSV export', notMaking: ['Other formats'], scope: ['src/export.sh'], follows: [{ path: 'src/export.sh', follows: 'src/app.sh' }], steps: ['Create src/export.sh printing exactly a,b followed by a newline.'], doneWhen: [{ id: 'D-csv', text: 'The exported report prints a,b.' }], decisions: [] as Record<string, unknown>[] })
const write = (req: WorkerRequest, path: string, text: string) => { mkdirSync(dirname(join(req.cwd, path)), { recursive: true }); writeFileSync(join(req.cwd, path), text) }
function standard(req: WorkerRequest): Record<string, unknown> {
	if (req.kind === 'intake') return clear
	if (req.kind === 'originator') return { answer: 'The planner owns this choice; resolve it from the fixed task, repository and experience rubric.', needsOperator: false }
	if (req.job === 'ideate') return { outcome: 'Make the requested CSV report available', approach: 'Use the existing shell application', decisions: [] }
	if (req.job === 'challenge') return { findings: [], decisions: [] }
	if (req.job === 'plan') return plan()
	if (req.job === 'implement') { write(req, 'src/export.sh', 'echo a,b\n'); return { summary: 'Implemented the accepted plan.' } }
	if (req.job === 'test-plan') { write(req, 'checks/export.sh', 'actual=$(sh src/export.sh)\n[ "$actual" = "a,b" ] || { echo "wrong CSV: $actual"; exit 1; }\n'); return { checks: [{ id: 'C-csv', doneWhen: 'D-csv', run: 'sh checks/export.sh' }] } }
	return { cause: 'implementation', answer: 'Follow the fixed plan.', evidence: 'The candidate check failed.' }
}
type Reply = WorkerResult | string | Record<string, unknown> | undefined
type Script = (request: WorkerRequest, attempt: number) => Reply | Promise<Reply>

function fixture(script: Script = () => undefined, options: { autonomy?: Autonomy; includeQuestion?: boolean; blockingRole?: string; extraQuestion?: typeof question } = {}) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-nq-handoffs-'))), repo = join(root, 'product'), home = join(root, 'home')
	mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main'); git('config', 'user.name', 'NQ acceptance'); git('config', 'user.email', 'nq@localhost')
	writeFileSync(join(repo, 'src/app.sh'), 'echo app\n'); writeFileSync(join(repo, '.gitignore'), '.fixtures/\n')
	git('add', 'src/app.sh', '.gitignore'); git('commit', '-qm', 'Seed the real NQ acceptance product')
	const source = 'Export this report as CSV using the existing shell application. Keep this same task through delivery.\r\nOriginal input  '
	const pack: Pack = { ...GRAMMAR_PACK, name: 'nq-handoff-acceptance', contracts: { handoff: '1' } }
	const oldHome = process.env.MW_HOME; process.env.MW_HOME = home
	const path = join(home, 'work.db'); let store = openStore(path)
	const candidate = { key: 'csv', title: 'CSV export', kind: 'feature', objective: 'Let the user obtain the requested report as CSV', text: 'Deliver the same CSV report through the established four phases.', requirementIds: ['R-csv'], questionRefs: options.includeQuestion ? [question.id, ...(options.extraQuestion ? [options.extraQuestion.id] : [])] : [], artifacts: [] }
	const questions = options.includeQuestion ? [{ ...question, ...(options.blockingRole ? { blockingRole: options.blockingRole } : {}) }, ...(options.extraQuestion ? [options.extraQuestion] : []), { id: 'Q-other-task', text: 'Which color belongs to an unrelated task?', ownerRole: 'planner', blockingRole: 'planner' }] : []
	const parent = store.create({ title: 'Recorded discovery', objective: 'Generate the CSV work', source, workspace: repo, status: 'discovered', job: 'discover', pack, outputs: { declare: JSON.stringify({ discoveryContract: '1', result: 'Source retained', sources: ['capture:original'], unknowns: [], decisions: [], evidence: [{ id: 'raw', ref: 'capture:original' }], intent: [{ id: 'I-csv', text: 'Export CSV', authority: 'explicit', sources: ['raw'] }], questions }), discover: JSON.stringify({ items: [candidate], questions: [] }) } })
	const item = store.create({ title: candidate.title, objective: candidate.objective, source, workspace: repo, status: 'candidate', discovery: parent.id, from: { kind: 'job', job: 'discover' }, pack, autonomy: options.autonomy ?? 'full', outputs: { discover: JSON.stringify(candidate) } })
	const ship = `printf '%s %s\\n' "$MW_ITEM" "$MW_COMMIT" >> ${quote(join(root, 'shipped.log'))}`
	const project = (extra: Record<string, unknown> = {}) => writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, ship, ...extra }]))
	project()
	const calls: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: req => Effect.promise(async (): Promise<WorkerResult> => {
		calls.push(req)
		const count = calls.filter(call => call.item === req.item && call.kind === req.kind && call.job === req.job).length
		const selected = await script(req, count), answer = selected ?? standard(req)
		if (typeof answer === 'string') return { ok: true, output: answer }
		if ('ok' in answer) return answer as WorkerResult
		return { ok: true, output: `Done.\n${JSON.stringify(answer)}` }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const of = (kind: string, job: Job) => calls.filter(call => call.kind === kind && call.job === job)
	return { root, repo, home, path, git, item, parent, source, calls, project, of, run, get store() { return store }, restart() { store.close(); store = openStore(path) }, clean() { store.close(); if (oldHome === undefined) delete process.env.MW_HOME; else process.env.MW_HOME = oldHome; rmSync(root, { recursive: true, force: true }) } }
}

async function finish(t: ReturnType<typeof fixture>) {
	let item = await t.run(drive(t.item.id, config))
	for (let n = 0; n < 6 && item.status === 'paused'; n++) { await t.run(go(item.id)); item = await t.run(drive(item.id, config)) }
	return item
}

function assertSameTask(t: ReturnType<typeof fixture>, status = 'shipped') {
	const item = t.store.get(t.item.id)!
	assert.equal(item.id, t.item.id); assert.equal(item.status, status)
	assert.equal(item.source, t.source); assert.equal(item.objective, t.item.objective)
	assert.ok(t.calls.length > 0 && t.calls.every(call => call.item === item.id), 'every intake, answer and phase executes on the same durable task')
	assert.equal(t.store.list().length, 2, 'the recorded discovery and its one delivery task are the only work identities')
	assert.ok(t.calls.every(call => JSON.parse(call.prompt).item.id === item.id))
}

function functionTask(t: ReturnType<typeof fixture>, delivery: Pack['delivery']) {
	const pack: Pack = { name: 'NQ function acceptance', runtime: 'functions', contracts: { handoff: '1' }, discovery: [], delivery }
	assert.deepEqual(problemsOf(pack), [])
	return t.store.save({ ...t.item, pack, status: 'queued', flow: { loop: 'delivery', accepted: [] } }, 'fixture-function-task', {})
}

test('NQ handoff: a clear proposed task traverses all four phases without manufactured questions or new task identities', async () => {
	const t = fixture()
	try {
		assert.equal(t.store.get(t.item.id)!.status, 'candidate')
		await t.run(promote(t.parent.id, [t.item.id]))
		const item = await finish(t)
		assert.equal(item.verification?.passed, true)
		assertSameTask(t)
		assert.equal(t.calls.filter(call => call.kind === 'originator').length, 0)
		assert.equal(t.store.events(item.id).filter(event => event.kind === 'nq-question').length, 0)
		assert.deepEqual([...new Set(t.calls.filter(call => call.kind === 'execute').map(call => call.job))].sort(), ['challenge', 'ideate', 'implement', 'plan', 'test-plan'])
		assert.equal(readFileSync(join(t.repo, 'src/export.sh'), 'utf8'), 'echo a,b\n')
		assert.equal(t.store.events(item.id).filter(event => event.kind === 'shipped').length, 1)
	} finally { t.clean() }
})

test('NQ handoff: planning starts its own decision work but cannot hand an unresolved choice to implementation', async () => {
	let t: ReturnType<typeof fixture>
	t = fixture((req, attempt) => {
		if (req.kind === 'execute' && req.job === 'plan') {
			const packet = JSON.parse(req.prompt)
			assert.deepEqual(packet.questionsToSettle.map((q: { id: string }) => q.id), [question.id], 'the unrelated sibling question is outside this task')
			assert.equal(t.of('originator', 'plan').length, attempt - 1, 'the first planning call starts without asking the sender to make its own choice')
			return { ...plan(), decisions: attempt === 1 ? [] : [resolution()] }
		}
		return undefined
	}, { includeQuestion: true })
	try {
		await t.run(promote(t.parent.id, [t.item.id]))
		await finish(t)
		assertSameTask(t)
		assert.equal(t.of('execute', 'plan').length, 2)
		const attempted = t.store.calls(t.item.id).filter(call => call.kind === 'execute' && call.job === 'plan')
		assert.equal(attempted[0]!.outcome, 'rejected')
		assert.match(attempted[0]!.error!, /Q-delimiter.*Which delimiter/)
		assert.equal(attempted[1]!.outcome, 'ok')
		const events = t.store.events(t.item.id), settled = events.filter(event => event.kind === 'nq-decided' && (event.data.questionIds as string[] | undefined)?.includes(question.id))
		assert.equal(settled.length, 1)
		assert.equal(settled[0]!.data.job, 'plan')
		const acceptedDecisions = lastJson(t.store.get(t.item.id)!.outputs.plan!)!.decisions as { questionId?: string }[]
		assert.equal(acceptedDecisions[0]!.questionId, question.id)
		assert.ok(events.find(event => event.kind === 'nq-question')!.seq < settled[0]!.seq)
	} finally { t.clean() }
})

test('NQ handoff: an accepted planning decision survives reopening and later maker intake reuses it without a new originator', async () => {
	const t = fixture((req, attempt) => {
		if (req.kind === 'execute' && req.job === 'plan') return { ...plan(), decisions: [resolution()] }
		if (req.kind === 'intake' && req.job === 'implement' && attempt === 1) return { ...clear, unclear: [question.text] }
		return undefined
	}, { includeQuestion: true, autonomy: 'steps' })
	try {
		await t.run(promote(t.parent.id, [t.item.id]))
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.status, 'paused'); assert.equal(item.job, 'plan')
		await t.run(go(item.id)); item = await t.run(drive(item.id, config))
		assert.equal(item.status, 'paused'); assert.ok(item.outputs.plan); assert.equal(t.of('intake', 'implement').length, 0)
		const settled = t.store.events(item.id).find(event => event.kind === 'nq-decided' && (event.data.questionIds as string[] | undefined)?.includes(question.id))!
		assert.ok(settled)
		t.restart()
		await t.run(go(item.id)); await finish(t)
		assertSameTask(t)
		assert.equal(t.of('originator', 'implement').length, 0)
		const intake = JSON.parse(t.of('intake', 'implement')[0]!.prompt)
		const saved = intake.answeredBefore.find((answer: { id: string }) => answer.id === `${settled.seq}:0`)
		assert.ok(saved); assert.match(saved.answer, /comma delimiter/)
		assert.ok(t.store.events(item.id).some(event => event.kind === 'nq-reused' && event.data.job === 'implement'))
		assert.equal(t.store.events(item.id).filter(event => event.kind === 'nq-decided' && (event.data.questionIds as string[] | undefined)?.includes(question.id)).length, 1)
		if (process.env.NQ_EVIDENCE_DIR) {
			const destination = join(resolve(process.env.NQ_EVIDENCE_DIR), 'same-task-reopen')
			await t.run(exportItem(t.store, item.id, destination))
			writeFileSync(join(destination, 'fixture.json'), JSON.stringify({ kind: 'scripted-worker engine integration; real Git, SQLite, subprocess check and phase transitions', workItem: item.id, discovery: t.parent.id, source: t.source, status: t.store.get(item.id)!.status, verification: t.store.get(item.id)!.verification, claim: 'The same task passed its own checks after a saved planning decision, SQLite reopen and NQ answer reuse. This is fixture evidence, not real-model or plant-application acceptance.' }, null, 2))
			writeFileSync(join(destination, 'produced-export.sh'), readFileSync(join(t.repo, 'src/export.sh')))
		}
	} finally { t.clean() }
})

test('NQ handoff: an explicit decision ID cannot also resolve a different question named by its prose', async () => {
	const second = { id: 'Q-newline', text: 'How should the exported record end?', ownerRole: 'planner', blockingRole: 'planner' }
	const t = fixture((req, attempt) => {
		if (req.kind === 'execute' && req.job === 'plan') return {
			...plan(),
			decisions: attempt === 1
				? [{ ...resolution(), question: second.text }]
				// Both obligations now have explicit IDs and their own answers. Crossed labels must not change those bindings.
				: [{ ...resolution(), question: second.text }, { questionId: second.id, question: question.text, decision: 'End the CSV record with one newline.', why: 'The fixed shell export contract specifies a complete newline-terminated record.', ...judged }],
		}
		return undefined
	}, { includeQuestion: true, extraQuestion: second })
	try {
		await t.run(promote(t.parent.id, [t.item.id]))
		await finish(t)
		assertSameTask(t)
		const attempts = t.store.calls(t.item.id).filter(call => call.kind === 'execute' && call.job === 'plan')
		assert.equal(attempts.length, 2)
		assert.equal(attempts[0]!.outcome, 'rejected')
		assert.match(attempts[0]!.error!, /Q-newline/)
		assert.doesNotMatch(attempts[0]!.error!, /Q-delimiter/, 'the explicit first ID resolves only that first obligation')
		assert.equal(attempts[1]!.outcome, 'ok')
		const answers = t.store.events(t.item.id).filter(event => event.kind === 'nq-decided' && event.data.job === 'plan')
		assert.equal(answers.length, 2, 'the refused mixed-binding attempt contributes no accepted answer')
		assert.deepEqual(answers.map(event => event.data.questionIds), [[question.id], [second.id]])
		assert.deepEqual(answers.map(event => event.data.questions), [[question.text], [second.text]])
		assert.ok(answers.every(event => event.item === t.item.id))
	} finally { t.clean() }
})

test('NQ handoff: an unresolved maker input enters its existing exchange with the planner instead of becoming a maker decision', async () => {
	const t = fixture(req => req.kind === 'originator' && req.job === 'implement' ? { answer: 'Use a comma delimiter. This clarifies the fixed instruction to print a,b; do not change the implementation scope.', needsOperator: false } : undefined, { includeQuestion: true, blockingRole: 'implement' })
	try {
		await t.run(promote(t.parent.id, [t.item.id]))
		await finish(t)
		assertSameTask(t)
		assert.equal(t.of('originator', 'implement').length, 1)
		assert.equal(t.of('originator', 'implement')[0]!.profile, 'planner')
		assert.deepEqual(JSON.parse(t.of('originator', 'implement')[0]!.prompt).questions, [question.text])
		assert.equal(t.of('execute', 'plan').length, 1, 'clarifying the fixed plan does not invent a replacement task or a replan')
	} finally { t.clean() }
})

test('NQ handoff: a missing real prerequisite is the receiver question, then prepared and resumed on the same task', async () => {
	const t = fixture(req => {
		if (req.kind === 'originator' && req.job === 'implement') {
			assert.match(JSON.parse(req.prompt).questions[0], /csv-fixture.*\.fixtures.*ENOENT/)
			return { answer: 'The registered preparation provides csv-fixture at .fixtures/export.csv. Retry the receiving handoff and use that exact prepared input.', needsOperator: false }
		}
		if (req.kind === 'execute' && req.job === 'implement') assert.equal(readFileSync(join(req.cwd, '.fixtures/export.csv'), 'utf8'), 'a,b\n')
		return undefined
	})
	try {
		const prepare = join(t.root, 'prepare.mjs'), counter = join(t.root, 'prepares.txt')
		writeFileSync(prepare, `import{existsSync,readFileSync,writeFileSync,mkdirSync}from'node:fs';import{join}from'node:path';\nconst counter=${JSON.stringify(counter)};if(process.env.MW_NAME.endsWith('-implement-execute')){const n=(existsSync(counter)?Number(readFileSync(counter,'utf8')):0)+1;writeFileSync(counter,String(n));if(n>1){mkdirSync('.fixtures',{recursive:true});writeFileSync(join('.fixtures','export.csv'),'a,b\\n')}}\n`)
		t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}`, inputs: [{ id: 'csv-fixture', path: '.fixtures/export.csv', kind: 'file', jobs: ['implement'] }] })
		await t.run(promote(t.parent.id, [t.item.id]))
		await finish(t)
		assertSameTask(t)
		assert.equal(t.of('execute', 'implement').length, 1, 'the worker never executes against the missing input')
		assert.equal(t.of('originator', 'implement').length, 1, 'the answering sender is not blocked by the receiver-only input')
		const receipts = t.store.events(t.item.id).filter(event => event.kind === 'inputs-checked' && event.data.job === 'implement')
		assert.equal(receipts.length, 2)
		assert.equal((receipts[0]!.data.inputs as { ok: boolean }[])[0]!.ok, false)
		assert.equal((receipts[1]!.data.inputs as { ok: boolean }[])[0]!.ok, true)
		const asked = t.store.events(t.item.id).find(event => event.kind === 'nq-question' && event.data.job === 'implement')!
		assert.match(JSON.stringify(asked.data), /csv-fixture/)
	} finally { t.clean() }
})

test('NQ handoff: an unbound environment proof is refused through NQ before either maker starts', async () => {
	let t: ReturnType<typeof fixture>
	t = fixture((req, attempt) => {
		if (req.kind === 'execute' && req.job === 'plan') {
			assert.equal(t.of('execute', 'implement').length, 0)
			assert.equal(t.of('execute', 'test-plan').length, 0)
			return { ...plan(), doneWhen: [{ ...plan().doneWhen[0]!, evidence: { evaluator: 'candidate-check', availableAfter: 'implementation', inputs: [{ kind: 'environment', ref: attempt === 1 ? 'an unspecified browser' : 'input:runtime' }] } }] }
		}
		return undefined
	})
	try {
		t.project({ inputs: [{ id: 'runtime', path: process.execPath, kind: 'executable', jobs: ['test-plan', 'verify'] }] })
		await t.run(promote(t.parent.id, [t.item.id]))
		await finish(t)
		assertSameTask(t)
		const plans = t.store.calls(t.item.id).filter(call => call.kind === 'execute' && call.job === 'plan')
		assert.equal(plans.length, 2); assert.equal(plans[0]!.outcome, 'rejected'); assert.equal(plans[1]!.outcome, 'ok')
		assert.match(plans[0]!.error!, /input:<id>/)
		assert.equal(t.of('originator', 'plan').length, 1)
		assert.ok(t.store.events(t.item.id).some(event => event.kind === 'inputs-checked' && event.data.job === 'test-plan'))
		assert.ok(t.store.events(t.item.id).some(event => event.kind === 'inputs-checked' && event.data.job === 'verify'))
	} finally { t.clean() }
})

test('NQ handoff: a question introduced in the current discovery output must be settled before that phase completes', async () => {
	const owned = { id: 'Q-current-interpretation', text: 'How is the source term CSV interpreted here?', ownerRole: 'ideator', blockingRole: 'ideator' }
	const t = fixture((req, attempt) => {
		if (req.kind === 'originator' && req.job === 'declare') return { answer: 'Settle this declaration-owned interpretation from the original request and record the decision. No changed task is authorized.', needsOperator: false }
		if (req.kind === 'execute' && req.job === 'declare') return { result: 'Declared the exact source and its bounded interpretation.', sources: ['capture:original'], unknowns: [], questions: [owned], decisions: attempt === 1 ? [] : [{ questionId: owned.id, question: owned.text, decision: 'CSV means the requested comma-separated report.', why: 'This is an interpretation of the given format term, not additional work.', ...judged }] }
		return undefined
	})
	try {
		const steps = GRAMMAR_PACK.discovery[0]!.steps
		const pack: Pack = { ...GRAMMAR_PACK, contracts: { handoff: '1' }, discovery: [{ cartridge: 'capture', steps: [steps[0]!] }, { cartridge: 'later-discovery', steps: steps.slice(1) }] }
		const work = t.store.create({ title: 'Current discovery decision', objective: 'Declare the supplied source', source: t.source, workspace: t.repo, job: 'declare', autonomy: 'steps', pack })
		const item = await t.run(drive(work.id, config))
		assert.equal(item.id, work.id); assert.equal(item.status, 'paused'); assert.equal(item.job, 'look-first')
		const attempts = t.store.calls(work.id).filter(call => call.kind === 'execute' && call.job === 'declare')
		assert.equal(attempts.length, 2); assert.equal(attempts[0]!.outcome, 'rejected'); assert.equal(attempts[1]!.outcome, 'ok')
		assert.match(attempts[0]!.error!, /Q-current-interpretation/)
		assert.ok(t.store.events(work.id).some(event => event.kind === 'nq-decided' && (event.data.questionIds as string[] | undefined)?.includes(owned.id)))
		assert.ok(t.calls.every(call => call.item === work.id))
	} finally { t.clean() }
})

test('NQ handoff: a future planning question introduced by discovery does not block the current discovery phase', async () => {
	const t = fixture(req => req.kind === 'execute' && req.job === 'declare' ? { result: 'Declared the source; planning will decide its delimiter.', sources: ['capture:original'], unknowns: [], questions: [question], decisions: [] } : undefined)
	try {
		const steps = GRAMMAR_PACK.discovery[0]!.steps
		const pack: Pack = { ...GRAMMAR_PACK, contracts: { handoff: '1' }, discovery: [{ cartridge: 'capture', steps: [steps[0]!] }, { cartridge: 'later-discovery', steps: steps.slice(1) }] }
		const work = t.store.create({ title: 'Future planning decision', objective: 'Declare the source and preserve its future choice', source: t.source, workspace: t.repo, job: 'declare', autonomy: 'steps', pack })
		const item = await t.run(drive(work.id, config))
		assert.equal(item.id, work.id); assert.equal(item.status, 'paused'); assert.equal(item.job, 'look-first')
		assert.equal(t.store.calls(work.id).filter(call => call.kind === 'execute').length, 1)
		assert.equal(t.store.events(work.id).filter(event => event.kind === 'nq-question').length, 0)
		assert.deepEqual((lastJson(item.outputs.declare!)!.questions as { id: string }[]).map(q => q.id), [question.id])
	} finally { t.clean() }
})

test('NQ handoff: accepting the phase and saving its reusable answer are one durable transaction', async () => {
	const t = fixture(req => req.kind === 'execute' && req.job === 'plan' ? { ...plan(), decisions: [resolution()] } : undefined, { includeQuestion: true })
	try {
		const db = new DatabaseSync(t.path)
		try { db.exec(`CREATE TRIGGER fail_nq_answer BEFORE INSERT ON events WHEN NEW.item = ${t.item.id} AND NEW.kind = 'nq-decided' BEGIN SELECT RAISE(ABORT, 'Injected NQ answer storage failure'); END;`) } finally { db.close() }
		await t.run(promote(t.parent.id, [t.item.id]))
		await assert.rejects(t.run(drive(t.item.id, config)), /Injected NQ answer storage failure/)
		const interrupted = t.store.get(t.item.id)!
		assert.equal(interrupted.job, 'plan')
		assert.equal(interrupted.outputs.plan, undefined, 'an output cannot be accepted without its reusable answer')
		assert.equal(interrupted.split, undefined)
		assert.equal(t.store.events(interrupted.id).filter(event => event.kind === 'nq-decided').length, 0)
		assert.equal(t.of('intake', 'implement').length, 0)
		const repair = new DatabaseSync(t.path)
		try { repair.exec('DROP TRIGGER fail_nq_answer') } finally { repair.close() }
		t.restart()
		await finish(t)
		assertSameTask(t)
		assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'nq-decided' && (event.data.questionIds as string[] | undefined)?.includes(question.id)).length, 1)
	} finally { t.clean() }
})

test('NQ functions: a trusted command cannot complete an assigned choice and its accepted answer reaches the next command after reopening', async () => {
	const t = fixture(() => undefined, { includeQuestion: true })
	try {
		const proposal = join(t.root, 'choice.json'), received = join(t.root, 'received.json')
		writeFileSync(proposal, JSON.stringify({ decisions: [] }))
		const item = functionTask(t, [{ cartridge: 'delivery', steps: [
			{ job: 'resolve-choice', profile: 'planner', run: command(`process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(proposal)},'utf8'))`), output: object },
			{ job: 'consume-choice', run: command(`let raw='';process.stdin.on('data',c=>raw+=c);process.stdin.on('end',()=>{require('node:fs').writeFileSync(${JSON.stringify(received)},raw);console.log('{}')})`), output: object },
		] }])
		const held = await t.run(drive(item.id, config))
		assert.equal(held.status, 'held'); assert.equal(held.hold?.code, 'function_failed')
		assert.match(held.hold!.message, /Q-delimiter/)
		assert.deepEqual(held.flow?.accepted, []); assert.equal(held.outputs['resolve-choice'], undefined)
		assert.equal(existsSync(received), false); assert.equal(t.calls.length, 0)
		t.restart()
		writeFileSync(proposal, JSON.stringify({ decisions: [resolution()] }))
		await t.run(retry(item.id))
		const done = await t.run(drive(item.id, config))
		assert.equal(done.id, item.id); assert.equal(done.status, 'completed')
		assert.equal(done.source, t.source)
		assert.deepEqual(done.flow?.accepted, ['resolve-choice', 'consume-choice'])
		const saved = t.store.events(item.id).filter(e => e.kind === 'nq-decided')
		assert.equal(saved.length, 1); assert.deepEqual(saved[0]!.data.questionIds, [question.id])
		assert.equal(typeof saved[0]!.data.invocation, 'string')
		const packet = JSON.parse(readFileSync(received, 'utf8'))
		assert.equal(packet.item.id, item.id); assert.equal(packet.item.source, t.source)
		assert.ok(packet.answeredBefore.some((answer: { question: string; answer: string }) => answer.question === question.text && /comma delimiter/.test(answer.answer)))
	} finally { t.clean() }
})

for (const resolved of [false, true]) test(`NQ functions: a composed group ${resolved ? 'reuses the accepted child decision' : 'refuses its unresolved assigned question'}`, async () => {
	const t = fixture(() => undefined, { includeQuestion: true, blockingRole: 'compose' })
	try {
		const item = functionTask(t, [{ cartridge: 'delivery', steps: [{ job: 'compose', children: [
			{ job: 'prepare-choice', profile: 'planner', run: jsonCommand({ decisions: resolved ? [resolution()] : [] }), output: object },
		] }] }])
		const result = await t.run(drive(item.id, config))
		assert.equal(result.id, item.id)
		assert.equal(result.status, resolved ? 'completed' : 'held')
		assert.deepEqual(result.flow?.accepted, resolved ? ['prepare-choice', 'compose'] : ['prepare-choice'])
		assert.equal(t.store.events(item.id).filter(e => e.kind === 'nq-decided').length, resolved ? 1 : 0)
		if (!resolved) {
			assert.match(result.hold!.message, /Q-delimiter/)
			assert.equal(result.outputs.compose, undefined)
		} else {
			assert.deepEqual(lastJson(result.outputs.compose!), { 'prepare-choice': { decisions: [resolution()] } })
			const compose = t.store.events(item.id).find(e => e.kind === 'trace-started' && e.data.kind === 'compose')!
			const packet = (compose.data.args as { input: { questionsToSettle: { id: string; resolved: boolean }[]; answeredBefore: unknown[] } }).input
			assert.deepEqual(packet.questionsToSettle.map(q => [q.id, q.resolved]), [[question.id, true]])
			assert.equal(packet.answeredBefore.length, 1)
		}
		assert.equal(t.calls.length, 0, 'trusted composition does not invent an agent exchange')
	} finally { t.clean() }
})

test('NQ functions: trusted command acceptance and its reusable decision roll back together on a real ledger write failure', async () => {
	const t = fixture(() => undefined, { includeQuestion: true })
	try {
		const item = functionTask(t, [{ cartridge: 'delivery', steps: [{ job: 'resolve-choice', profile: 'planner', run: jsonCommand({ decisions: [resolution()] }), output: object }] }])
		const db = new DatabaseSync(t.path)
		try { db.exec(`CREATE TRIGGER fail_function_answer BEFORE INSERT ON events WHEN NEW.item = ${item.id} AND NEW.kind = 'nq-decided' BEGIN SELECT RAISE(ABORT, 'Injected function answer failure'); END;`) } finally { db.close() }
		await assert.rejects(t.run(drive(item.id, config)), /Injected function answer failure/)
		const interrupted = t.store.get(item.id)!
		assert.deepEqual(interrupted.flow?.accepted, []); assert.equal(interrupted.outputs['resolve-choice'], undefined)
		assert.equal(t.store.events(item.id).filter(e => e.kind === 'accepted' || e.kind === 'nq-decided').length, 0)
		const repair = new DatabaseSync(t.path)
		try { repair.exec('DROP TRIGGER fail_function_answer') } finally { repair.close() }
		t.restart()
		assert.equal((await t.run(drive(item.id, config))).status, 'completed')
		assert.equal(t.store.events(item.id).filter(e => e.kind === 'nq-decided').length, 1)
	} finally { t.clean() }
})

test('NQ functions: saved discovery output constrains the next command and generated tasks retain source and bindings', async () => {
	const t = fixture()
	try {
		const envelope = { discoveryContract: '1', result: 'Source retained', sources: ['capture:original'], unknowns: [], decisions: [], evidence: [], questions: [] }
		const declaration = { ...envelope, evidence: [{ id: 'raw', ref: 'capture:original' }], intent: [{ id: 'I-csv', text: 'Export CSV', authority: 'explicit', sources: ['raw'] }, { id: 'I-lab', text: 'Use the supplied laboratory', authority: 'explicit', sources: ['raw'] }] }
		const classification = { ...envelope, requirements: [{ id: 'R-csv', text: 'Export CSV', kind: 'outcome', origin: 'explicit', sources: ['raw'], intentIds: ['I-csv'] }], intentDispositions: [] as Record<string, unknown>[] }
		const candidate = { key: 'csv', title: 'CSV export', kind: 'feature', objective: 'Export the requested CSV', text: 'Clarified task wording', requirementIds: ['R-csv'], questionRefs: [], artifacts: [] }
		const proposal = join(t.root, 'classification.json')
		writeFileSync(proposal, JSON.stringify(classification))
		const pack: Pack = { name: 'Discovery commands', runtime: 'functions', contracts: { handoff: '1', discovery: '1' }, discovery: [{ cartridge: 'discovery', steps: [
			{ job: 'declare', run: jsonCommand(declaration), output: object },
			{ job: 'look-first', run: jsonCommand({ ...envelope, observations: [{ id: 'F-shell', text: 'The existing shell application is supplied.', sources: ['raw'] }] }), output: object },
			{ job: 'classify', run: command(`process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(proposal)},'utf8'))`), output: object },
			{ job: 'finalize', run: jsonCommand({ items: [candidate] }), output: object },
		] }], delivery: [] }
		assert.deepEqual(problemsOf(pack), [])
		const item = t.store.create({ title: 'Raw discovery', objective: 'Produce candidate work', source: t.source, workspace: t.repo, pack, autonomy: 'checkpoints', job: 'declare', flow: { loop: 'discovery', accepted: [] } })
		const held = await t.run(drive(item.id, config))
		assert.equal(held.status, 'held'); assert.match(held.hold!.message, /I-lab/)
		assert.deepEqual(held.flow?.accepted, ['declare', 'look-first'])
		assert.equal(t.store.events(item.id).filter(e => e.kind === 'trace-started' && e.data.job === 'finalize').length, 0)
		writeFileSync(proposal, JSON.stringify({ ...classification, intentDispositions: [{ intentId: 'I-lab', kind: 'provided', reason: 'The laboratory is already supplied infrastructure.', sources: ['raw'] }] }))
		t.restart(); await t.run(retry(item.id))
		const done = await t.run(drive(item.id, config))
		assert.equal(done.status, 'discovered', JSON.stringify(done.hold))
		assert.equal(t.store.events(item.id).filter(e => e.kind === 'trace-started' && e.data.job === 'declare').length, 1)
		const child = t.store.list().find(i => i.discovery === item.id)!
		assert.equal(child.status, 'candidate'); assert.equal(child.source, t.source)
		assert.deepEqual(lastJson(child.outputs.discover!), candidate)
	} finally { t.clean() }
})

for (const mode of ['command', 'group'] as const) test(`NQ functions: a ${mode} checks real required inputs after preparation and cannot proceed while they are absent`, async () => {
	const t = fixture()
	try {
		const allowed = join(t.root, 'supply-input'), invoked = join(t.root, 'consumer-invoked'), prepare = join(t.root, 'prepare-input.mjs')
		const job = mode === 'command' ? 'consume-fixture' : 'compose'
		writeFileSync(prepare, `import{existsSync,mkdirSync,writeFileSync}from'node:fs';if(process.env.MW_JOB===${JSON.stringify(job)}&&existsSync(${JSON.stringify(allowed)})){mkdirSync('.fixtures',{recursive:true});writeFileSync('.fixtures/input.csv','a,b\\n')}`)
		t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}`, inputs: [{ id: 'csv-fixture', path: '.fixtures/input.csv', kind: 'file', jobs: [job] }] })
		const check = command(`const fs=require('node:fs');require('node:assert/strict').equal(fs.readFileSync('.fixtures/input.csv','utf8'),'a,b\\n');fs.writeFileSync(${JSON.stringify(invoked)},'yes');console.log('{}')`)
		const item = functionTask(t, [{ cartridge: 'delivery', steps: mode === 'command'
			? [{ job, run: check, output: object }]
			: [{ job, children: [{ job: 'child-output', run: jsonCommand({ value: 21 }), output: object }], check }] }])
		const held = await t.run(drive(item.id, config))
		assert.equal(held.status, 'held'); assert.match(held.hold!.message, /csv-fixture.*ENOENT/)
		assert.equal(held.outputs[job], undefined); assert.equal(existsSync(invoked), false)
		assert.deepEqual(held.flow?.accepted, mode === 'command' ? [] : ['child-output'])
		writeFileSync(allowed, 'yes'); t.restart(); await t.run(retry(item.id))
		const done = await t.run(drive(item.id, config))
		assert.equal(done.id, item.id); assert.equal(done.status, 'completed'); assert.equal(existsSync(invoked), true)
		const receipts = t.store.events(item.id).filter(e => e.kind === 'inputs-checked' && e.data.job === job)
		assert.deepEqual(receipts.map(e => (e.data.inputs as { ok: boolean }[])[0]!.ok), [false, true])
		assert.ok(receipts.every(e => e.data.dir === t.repo))
		if (mode === 'group') assert.equal(t.store.events(item.id).filter(e => e.kind === 'accepted' && e.data.job === 'child-output').length, 1)
	} finally { t.clean() }
})

for (const mode of ['command', 'agent'] as const) for (const fails of [false, true]) test(`NQ functions: prepared ${mode} resources are torn down exactly once after ${fails ? 'failure' : 'completion'}`, async () => {
	const t = fixture(req => req.kind === 'execute' && req.job === 'transform' ? fails ? { ok: false, error: 'Deliberate fixture worker failure' } : { value: 21 } : undefined)
	try {
		const counter = join(t.root, 'resources.txt'), torn = join(t.root, 'torn.jsonl'), prepare = join(t.root, 'prepare-resources.mjs')
		writeFileSync(prepare, `import{existsSync,readFileSync,writeFileSync}from'node:fs';const counter=${JSON.stringify(counter)};const n=(existsSync(counter)?Number(readFileSync(counter,'utf8')):0)+1;writeFileSync(counter,String(n));const id='prepared-'+n,marker=${JSON.stringify(join(t.root, 'resource-'))}+n;writeFileSync(marker,id);const teardown=${JSON.stringify(quote(process.execPath))}+' -e '+"'"+('const fs=require("node:fs");fs.rmSync('+JSON.stringify(marker)+');fs.appendFileSync('+JSON.stringify(${JSON.stringify(torn)})+','+JSON.stringify(id+'\\n')+')').replaceAll("'","'\\\\''")+"'";console.log(JSON.stringify({provisioned:[{kind:'fixture',id,teardown}]}));`)
		t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}` })
		const item = functionTask(t, [{ cartridge: 'delivery', steps: [{ job: 'transform', output: object,
			...(mode === 'command' ? { run: fails ? command("console.error('Deliberate fixture command failure');process.exit(7)") : jsonCommand({ value: 21 }) }
				: { profile: 'planner', duty: 'Triple seven.', access: 'read' as const }),
		}] }])
		const result = await t.run(drive(item.id, config))
		assert.equal(result.status, fails ? 'held' : 'completed')
		assert.ok(result.provisioned?.length, 'preparation actually created a real fixture resource')
		const resources = result.provisioned!
		assert.ok(resources.every(r => r.torn?.exitCode === 0))
		assert.deepEqual(readFileSync(torn, 'utf8').trim().split('\n').sort(), resources.map(r => r.id).sort())
		for (const resource of resources) assert.equal(existsSync(join(t.root, `resource-${resource.id.slice('prepared-'.length)}`)), false)
		await t.run(drive(item.id, config))
		assert.equal(readFileSync(torn, 'utf8').trim().split('\n').length, resources.length, 'redriving an ended/held item never tears down an accepted resource again')
	} finally { t.clean() }
})
