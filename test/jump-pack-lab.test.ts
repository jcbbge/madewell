import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { drive, go, promote } from '../src/engine.ts'
import { jumpPackLab } from '../src/jump-pack-lab.ts'
import { problemsOf, type Pack } from '../src/lane.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = { tiers: { deep: [card], intake: [card] }, jobs: {
	...Object.fromEntries(AGENT_JOBS.map((job) => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])),
	verify: { budget: { minutes: 1 } },
} as Prescriptions['jobs'], parallel: 2 }
const clear = { understanding: 'The supplied function is understood.', unclear: [], ambiguous: [], missing: [], notes: [] }
const object = { type: 'object' }
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'"
const command = (code: string) => `${quote(process.execPath)} -e ${quote(code)}`
const jsonCommand = (value: unknown) => command(`console.log(${JSON.stringify(JSON.stringify(value))})`)
const source = 'Preserve this exact source.\r\nNo invented publication.  '

function fixture(script: (req: WorkerRequest) => unknown = () => { throw new Error('No worker should be called by a command cartridge') }) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-jump-lab-')))
	const workspace = join(root, 'workspace')
	mkdirSync(workspace)
	const path = join(root, 'record.db')
	let store = openStore(path)
	const requests: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: (req) => Effect.sync(() => {
		requests.push(req)
		const value = script(req)
		return value && typeof value === 'object' && 'ok' in value ? value as WorkerResult : { ok: true as const, output: JSON.stringify(value) }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const create = (pack: Pack, fields: Partial<Pick<Item, 'autonomy' | 'flow' | 'job' | 'outputs' | 'source' | 'discovery'>> = {}) => {
		assert.deepEqual(problemsOf(pack), [], 'the fixture uses a valid public function-pack contract')
		return store.create({ title: 'Local experiment', objective: 'Inspect actual function evidence', source, workspace, pack, autonomy: 'full', ...fields })
	}
	return { root, workspace, path, requests, run, create, get store() { return store },
		reopen() { store.close(); store = openStore(path) },
		clean() { store.close(); rmSync(root, { recursive: true, force: true }) },
	}
}

const delivery = [{ cartridge: 'work', steps: [{ job: 'deliver', run: jsonCommand({ done: true }), output: object }] }]
const discoveryPack = (items: unknown[]): Pack => ({ name: 'dependency experiment', runtime: 'functions', discovery: [
	{ cartridge: 'capture', steps: [{ job: 'capture', run: jsonCommand({ sourceAccepted: true }), output: object }] },
	{ cartridge: 'candidates', steps: [{ job: 'confirm', run: jsonCommand({ items }), output: object }] },
], delivery })

const captureStdin = command('let raw="";process.stdin.on("data",c=>raw+=c);process.stdin.on("end",()=>console.log(JSON.stringify({captured:JSON.parse(raw)})))')

for (const mode of ['command', 'agent'] as const) test(`${mode} delivery receives complete original discovery context when the candidate brief omits source facts`, async () => {
	const t = fixture((req) => req.kind === 'intake' ? clear : { captured: JSON.parse(req.prompt).function })
	try {
		const raw = 'Make a local draft titled Calm Inbox.\r\nAudience: independent designers.\nDuration: 45 minutes. Date: TBD.  '
		const brief = 'Produce the local draft; see the agreed completion conditions.'
		const final = { items: [{ title: 'Workshop invitation', objective: 'Create the invitation draft', text: brief }], outcomes: [{ id: 'O1', description: 'Produce an invitation with the original event facts.' }], coverage: [{ outcome: 'O1', candidates: ['C1'] }] }
		const pack: Pack = { name: `discovery context ${mode}`, version: '1', runtime: 'functions',
			discovery: [{ cartridge: 'discovery', steps: [{ job: 'confirm', run: jsonCommand(final), output: object }] }],
			delivery: [{ cartridge: 'delivery', steps: [
				{ job: 'prepare', run: jsonCommand({ result: 'Only this prior delivery output belongs in received.' }), output: object },
				{ job: 'inspect', receives: ['prepare'], output: object, ...(mode === 'command' ? { run: captureStdin } : { profile: 'reviewer', duty: 'Inspect the exact discovery context and prior delivery output.' }) },
			] }],
		}
		const parent = t.create(pack, { source: raw, job: 'confirm', flow: { loop: 'discovery', accepted: [] } })
		assert.equal((await t.run(drive(parent.id, { prescriptions }))).status, 'discovered')
		const child = t.store.list().find((i) => i.discovery === parent.id)!
		assert.equal(child.source, brief)
		assert.doesNotMatch(child.source, /Calm Inbox|45 minutes|independent designers/)
		const parentBefore = t.store.get(parent.id)
		t.reopen()
		const done = await t.run(drive(child.id, { prescriptions }))
		assert.equal(done.status, 'completed')
		const captured = JSON.parse(done.outputs.inspect!).captured
		const discovery = { id: parent.id, available: true, source: raw, output: final, record: `mw show ${parent.id}` }
		assert.deepEqual(captured.discovery, discovery, 'the actual delivery invocation resolves the complete durable parent, not only candidate.text')
		assert.equal(captured.item.source, brief, 'the candidate source remains the candidate brief')
		assert.deepEqual(captured.received, { prepare: { result: 'Only this prior delivery output belongs in received.' } })
		assert.deepEqual(Object.keys(done.outputs).sort(), ['inspect', 'prepare'], 'context is not inserted as a fake prior output')
		assert.deepEqual(t.store.get(parent.id), parentBefore)
		if (mode === 'agent') {
			assert.deepEqual(t.requests.map((req) => req.kind), ['intake', 'execute'])
			for (const req of t.requests) {
				const packet = JSON.parse(req.prompt)
				assert.deepEqual(packet.function.discovery, discovery, 'both NQ intake and execution receive the complete parent context')
				assert.deepEqual(packet.received, captured.received, 'parent context never broadens the declared received outputs')
				assert.deepEqual(packet.function.received, captured.received)
			}
		} else {
			assert.equal(t.requests.length, 0)
			const invocation = t.store.events(child.id).find((e) => e.kind === 'trace-started' && e.data.job === 'inspect')!
			assert.deepEqual((invocation.data.args as { input: unknown }).input, captured, 'the command actually received the recorded context bytes on stdin')
		}
	} finally { t.clean() }
})

for (const mode of ['command', 'agent'] as const) test(`${mode} delivery marks an absent discovery parent unavailable and leaves standalone work without invented context`, async () => {
	const t = fixture((req) => req.kind === 'intake' ? clear : { captured: JSON.parse(req.prompt).function })
	try {
		const pack: Pack = { name: `missing context ${mode}`, runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [
			{ job: 'inspect', output: object, ...(mode === 'command' ? { run: captureStdin } : { profile: 'reviewer', duty: 'Report actual supplied context without filling absent evidence.' }) },
		] }] }
		const orphan = t.create(pack, { source: 'Only this narrow brief is known.', discovery: 999999 })
		assert.equal(t.store.get(999999), undefined)
		const done = await t.run(drive(orphan.id, { prescriptions }))
		assert.equal(done.status, 'completed')
		const captured = JSON.parse(done.outputs.inspect!).captured
		assert.equal(captured.discovery.id, 999999)
		assert.equal(captured.discovery.available, false)
		assert.equal(captured.discovery.source, null)
		assert.equal(captured.discovery.output, undefined, 'a missing parent has no invented completion output')
		assert.deepEqual(captured.received, {})
		const standalone = t.create(pack)
		const standaloneDone = await t.run(drive(standalone.id, { prescriptions }))
		assert.equal(standaloneDone.status, 'completed')
		assert.equal(JSON.parse(standaloneDone.outputs.inspect!).captured.discovery, undefined)
		assert.equal(t.store.list().length, 2, 'resolving unavailable context does not create a parent record')
	} finally { t.clean() }
})

test('generic discovery maps earlier positions to durable item IDs and preserves dependencies across restart', async () => {
	const t = fixture()
	try {
		const pack = discoveryPack([
			{ title: 'Foundation', objective: 'First artifact' },
			{ title: 'Dependent', objective: 'Use the first artifact', text: 'Own exact scope.  ', after: [1] },
			{ title: 'Final', objective: 'Use both artifacts', after: [1, 2] },
		])
		const parent = t.create(pack, { autonomy: 'steps', flow: { loop: 'discovery', accepted: [] }, job: 'capture' })
		t.create({ name: 'unrelated', runtime: 'functions', discovery: [], delivery: [] })
		assert.equal((await t.run(drive(parent.id, { prescriptions }))).status, 'paused')
		assert.equal(t.store.list().filter((i) => i.discovery === parent.id).length, 0)
		t.reopen()
		await t.run(go(parent.id))
		assert.equal((await t.run(drive(parent.id, { prescriptions }))).status, 'discovered')
		const children = t.store.list().filter((i) => i.discovery === parent.id)
		assert.equal(children.length, 3)
		assert.ok(children[0]!.id > 2, 'candidate positions differ from database IDs')
		assert.deepEqual(children.map((i) => i.after ?? []), [[], [children[0]!.id], [children[0]!.id, children[1]!.id]])
		assert.deepEqual(children.map((i) => i.source), [source, 'Own exact scope.  ', source])
		assert.deepEqual(children.map((i) => i.status), ['candidate', 'candidate', 'candidate'])
		assert.deepEqual(children.map((i) => i.flow), children.map(() => ({ loop: 'delivery', accepted: [] })))
		const acceptedCapture = t.store.events(parent.id).filter((e) => e.kind === 'trace-started' && e.data.job === 'capture')
		assert.equal(acceptedCapture.length, 1, 'restart did not repeat the accepted command')
		t.reopen()
		assert.deepEqual(t.store.list().filter((i) => i.discovery === parent.id), children)
		const chosen = await t.run(promote(parent.id, [children[2]!.id]))
		assert.deepEqual(chosen.map((i) => i.id), children.map((i) => i.id), 'selecting the last task retains its prerequisites')
		assert.equal((await t.run(drive(children[2]!.id, { prescriptions }))).status, 'queued', 'the dependent task cannot execute first')
		assert.equal(t.store.events(children[2]!.id).filter((e) => e.kind === 'trace-started').length, 0)
		for (const child of children) assert.equal((await t.run(drive(child.id, { prescriptions }))).status, 'completed')
		assert.equal(t.requests.length, 0, 'trusted command cartridges never invoked a model')
	} finally { t.clean() }
})

test('process death during candidate creation reuses its committed prefix and maps later dependencies to the original IDs', async () => {
	const t = fixture()
	try {
		const pack = discoveryPack([{ title: 'First', objective: 'Committed before interruption' }, { title: 'Second', objective: 'Depends on the surviving first candidate', after: [1] }, { title: 'Third', objective: 'Depends on both original IDs', after: [1, 2] }])
		const parent = t.create(pack, { flow: { loop: 'discovery', accepted: [] }, job: 'capture' })
		// Test-only fault injection exits AFTER the real Store transaction commits the first child.
		const script = `import { Effect, Layer } from 'effect'; import { openStore, Store } from './src/store.ts'; import { Worker } from './src/worker.ts'; import { drive } from './src/engine.ts';
			const store = openStore(process.argv[1]), id = Number(process.argv[2]); const create = store.create.bind(store);
			store.create = (fields) => { const item = create(fields); if (fields.discovery === id) process.exit(73); return item; };
			await Effect.runPromise(drive(id, { prescriptions: ${JSON.stringify(prescriptions)} }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), Layer.succeed(Worker, { run: () => Effect.die('No models') })))));`
		const stopped = spawnSync(process.execPath, ['--input-type=module', '-e', script, t.path, String(parent.id)], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8', timeout: 10000 })
		assert.equal(stopped.status, 73, stopped.stderr)
		t.reopen()
		const prefix = t.store.list().filter((i) => i.discovery === parent.id)
		assert.equal(prefix.length, 1)
		assert.equal(t.store.get(parent.id)!.status, 'running', 'interruption is not an invented discovery completion')
		t.create({ name: 'interleaved unrelated work', runtime: 'functions', discovery: [], delivery: [] })
		assert.equal((await t.run(drive(parent.id, { prescriptions }))).status, 'discovered')
		const children = t.store.list().filter((i) => i.discovery === parent.id)
		assert.equal(children.length, 3, 'redrive must not duplicate the committed candidate')
		assert.equal(children[0]!.id, prefix[0]!.id)
		assert.equal(children[1]!.id, children[0]!.id + 2, 'the interleaved item is not a candidate position')
		assert.deepEqual(children.map((i) => i.after ?? []), [[], [children[0]!.id], [children[0]!.id, children[1]!.id]])
		assert.equal(t.store.events(parent.id).filter((e) => e.kind === 'trace-started' && e.data.job === 'confirm').length, 1, 'accepted discovery is not repeated on creation recovery')
		assert.deepEqual(t.store.events(parent.id).findLast((e) => e.kind === 'discovered')!.data.candidates, children.map((i) => i.id))
	} finally { t.clean() }
})

for (const [name, after] of [
	['zero', [0]], ['self', [2]], ['forward', [3]], ['fractional', [1.5]], ['string', ['1']],
] as const) test(`generic discovery rejects ${name} prerequisite positions before creating any candidate`, async () => {
	const t = fixture()
	try {
		const pack = discoveryPack([{ title: 'Valid prefix', objective: 'Must not be created on partial validation' }, { title: 'Invalid dependency', objective: 'Invalid graph', after }])
		const parent = t.create(pack, { flow: { loop: 'discovery', accepted: [] }, job: 'capture' })
		const held = await t.run(drive(parent.id, { prescriptions }))
		assert.equal(held.status, 'held')
		assert.equal(held.hold?.code, 'function_failed')
		assert.equal(held.completion, undefined)
		assert.deepEqual(t.store.list().filter((i) => i.discovery === parent.id), [], 'a later invalid reference cannot leave a valid-looking candidate prefix')
		assert.ok(t.store.events(parent.id).some((e) => e.kind === 'accepted' && e.data.job === 'confirm'), 'the failure is candidate graph validation after an actual command return')
		t.reopen()
		assert.equal(t.store.get(parent.id)?.status, 'held')
		assert.equal(t.store.list().length, 1)
	} finally { t.clean() }
})

test('lab receipts keep a real failed check distinct from a successful experiment verdict and preserve pinned provenance', async () => {
	const t = fixture()
	try {
		const method = { pack: 'software', version: '7', id: 'check-receipt-v2' }
		const requirements = [{ pack: 'database', version: '4', id: 'preserve-rows', text: 'Existing rows must survive.', constraints: { destructive: false } }]
		const pack: Pack = { name: 'pinned evidence', version: 'software@7+database@4', runtime: 'functions', discovery: [], delivery: [
			{ cartridge: 'implementation', steps: [{ job: 'implementation', run: jsonCommand({ result: 'Claimed artifact', verdict: 'passed', method: 'spoofed', requirements: ['spoofed'] }), output: object }] },
			{ cartridge: 'verification', steps: [{ job: 'verification', receives: ['implementation'], args: { contract: { label: 'verification', method, requirements } },
				run: command('const fs=require("node:fs"); if(!fs.existsSync("required-receipt.json")){console.error("Required receipt is absent");process.exit(23)};console.log("{}")'), output: object }] },
		] }
		const item = t.create(pack)
		t.store.note(item.id, 'lab-case', { kind: 'deterministic', hypothesis: 'Missing artifacts must block execution.', expected: ['Actual failing check retained'] })
		t.store.note(item.id, 'lab-resolved', { selected: [{ name: 'not-the-binding', version: '99' }], bindings: [{ method: 'event cannot replace pinned contract' }] })
		const held = await t.run(drive(item.id, { prescriptions }))
		assert.equal(held.status, 'held')
		let view = jumpPackLab(t.store).cases[0]!
		assert.equal(view.verdict, null, 'accepted JSON and a held check do not invent a hypothesis verdict')
		const verdict = { passed: true, reason: 'The expected missing-artifact failure was observed.', actual: { status: 'held', exit: 23 } }
		t.store.note(item.id, 'lab-verdict', verdict)
		const savedItem = t.store.get(item.id)
		const savedMark = t.store.mark()
		t.reopen()
		view = jumpPackLab(t.store).cases[0]!
		assert.equal(view.status, 'held')
		assert.deepEqual(view.verdict, verdict)
		const check = view.nodes.find((n) => n.job === 'verification')!
		assert.equal(check.state, 'blocked')
		assert.deepEqual(check.method, method)
		assert.deepEqual(check.requirements, requirements)
		assert.equal(check.output, null, 'failed commands have no accepted output')
		assert.equal(check.evidence.hold?.code, 'function_failed')
		assert.equal(check.evidence.commandResult?.status, 'failed')
		assert.match(JSON.stringify(check.evidence.commandResult), /exit 23/)
		assert.match(JSON.stringify(t.store.events(item.id)), /Required receipt is absent/)
		const start = t.store.events(item.id).find((e) => e.kind === 'trace-started' && e.data.job === 'verification')!
		assert.deepEqual(check.input, start.data.args, 'command inputs come from the actual saved invocation')
		assert.deepEqual(view.composition?.bindings.find((b) => b.job === 'verification'), { job: 'verification', method, requirements })
		assert.deepEqual(t.store.get(item.id), savedItem)
		assert.deepEqual(t.store.mark(), savedMark, 'reading lab evidence cannot mutate calls, events, acceptance or state')
		assert.deepEqual(jumpPackLab(t.store).runner, { active: false, pid: null }, 'a held item is distinct from an active runner')
	} finally { t.clean() }
})

test('lab agent input is the original saved execute packet even when current outputs later change', async () => {
	const t = fixture((req) => req.kind === 'intake' ? clear : { result: JSON.parse(req.prompt).received.prepare.result })
	try {
		const pack: Pack = { name: 'saved invocation', version: '1', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [
			{ job: 'prepare', run: jsonCommand({ result: 'Original upstream value' }), output: object },
			{ job: 'inspect', profile: 'reviewer', duty: 'Report the actual received value.', receives: ['prepare'], output: object },
		] }] }
		const item = t.create(pack)
		t.store.note(item.id, 'lab-case', { hypothesis: 'Original invocation arguments remain inspectable.' })
		const completed = await t.run(drive(item.id, { prescriptions }))
		assert.equal(completed.status, 'completed')
		const call = t.store.calls(item.id).find((c) => c.kind === 'execute' && c.job === 'inspect')!
		assert.ok(call)
		const original = { call: call.id, packet: JSON.parse(call.prompt), started: call.started, outcome: call.outcome }
		assert.deepEqual((original.packet as { received: unknown }).received, { prepare: { result: 'Original upstream value' } })
		t.store.save({ ...completed, outputs: { ...completed.outputs, prepare: JSON.stringify({ result: 'Later replacement' }) } }, 'fixture-imported-later-output')
		t.reopen()
		const node = jumpPackLab(t.store).cases[0]!.nodes.find((n) => n.job === 'inspect')!
		assert.deepEqual(node.input, original)
		assert.doesNotMatch(JSON.stringify(node.input), /Later replacement/)
		assert.deepEqual(node.output, { result: 'Original upstream value' })
		assert.equal(jumpPackLab(t.store).cases[0]!.verdict, null, 'work completion does not manufacture experiment acceptance')
	} finally { t.clean() }
})

test('a new execute attempt exposes its own durable invocation arguments before its call is returned', async () => {
	let executions = 0
	let observedRetry = false
	const t = fixture((req) => {
		if (req.kind === 'intake') return clear
		if (req.kind === 'originator') return { answer: 'The transient scripted launch failure has been resolved; continue this function.', needsOperator: false }
		if (++executions === 1) return { ok: false, error: 'Test-only transient launch failure' }
		const reader = openStore(t.path)
		try {
			const failed = reader.calls(req.item).find((c) => c.kind === 'execute')!
			assert.equal(failed.outcome, 'error', 'the previous failed attempt is a real persisted worker result')
			const history = reader.events(req.item)
			const started = history.findLast((e) => e.kind === 'trace-started' && e.data.kind === 'execute' && e.data.job === req.job)!
			const oldLink = history.find((e) => e.kind === 'trace-call' && e.data.call === failed.id)!
			assert.notEqual(started.data.invocation, oldLink.data.invocation)
			assert.ok(!history.some((e) => e.kind === 'trace-call' && e.data.invocation === started.data.invocation), 'the second attempt is still in flight')
			const before = reader.mark()
			const node = jumpPackLab(reader).cases[0]!.nodes[0]!
			assert.deepEqual(node.input, started.data.args, 'the new attempt cannot borrow the old saved packet')
			assert.equal((node.input as Record<string, unknown>).prompt, req.prompt)
			assert.equal((node.input as Record<string, unknown>).call, undefined)
			assert.equal(node.evidence.commandInvocation, started.data.invocation)
			assert.equal(node.evidence.commandResult, null, 'the previous finished attempt is not the result of this new invocation')
			assert.deepEqual(reader.mark(), before)
			observedRetry = true
		} finally { reader.close() }
		return { result: 'Recovered on the second real attempt' }
	})
	try {
		const pack: Pack = { name: 'retry arguments', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'inspect', profile: 'reviewer', duty: 'Return the local observation.', output: object }] }] }
		const item = t.create(pack)
		t.store.note(item.id, 'lab-case', { hypothesis: 'Retries display their own actual inputs.' })
		assert.equal((await t.run(drive(item.id, { prescriptions }))).status, 'completed')
		assert.equal(executions, 2)
		assert.equal(observedRetry, true)
		const returned = t.store.calls(item.id).filter((c) => c.kind === 'execute').at(-1)!
		assert.equal(returned.outcome, 'ok')
		assert.deepEqual(jumpPackLab(t.store).cases[0]!.nodes[0]!.input, { call: returned.id, packet: JSON.parse(returned.prompt), started: returned.started, outcome: returned.outcome }, 'after return the new invocation resolves to its own saved call')
	} finally { t.clean() }
})

test('legacy accepted outputs without saved calls expose unknown input rather than reconstructed current data', () => {
	const t = fixture()
	try {
		const pack: Pack = { name: 'legacy evidence', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'inspect', profile: 'reviewer', duty: 'Inspect saved evidence.', args: { tempting: 'must not be reconstructed' }, output: object }] }] }
		const item = t.create(pack, { outputs: { inspect: JSON.stringify({ result: 'Imported accepted result' }) } })
		t.store.note(item.id, 'lab-case', {})
		t.store.note(item.id, 'accepted', { job: 'inspect' })
		const ordinary = t.create({ name: 'ordinary', runtime: 'functions', discovery: [], delivery: [] })
		const before = t.store.mark()
		const view = jumpPackLab(t.store)
		assert.deepEqual(view.cases.map((c) => c.id), [item.id])
		assert.ok(!view.cases.some((c) => c.id === ordinary.id), 'unlabelled work never becomes a fabricated experiment')
		assert.equal(view.cases[0]!.nodes[0]!.state, 'accepted')
		assert.equal(view.cases[0]!.nodes[0]!.input, null)
		assert.deepEqual(view.cases[0]!.nodes[0]!.output, { result: 'Imported accepted result' })
		assert.deepEqual(t.store.mark(), before)
	} finally { t.clean() }
})

test('the real lab HTTP route reads the same durable record and refuses writes', async () => {
	const t = fixture()
	let child: ReturnType<typeof spawn> | undefined
	try {
		const item = t.create({ name: 'HTTP evidence', runtime: 'functions', discovery: [], delivery })
		t.store.note(item.id, 'lab-case', { hypothesis: 'Read-only HTTP projection' })
		await t.run(drive(item.id, { prescriptions }))
		const before = { item: t.store.get(item.id), mark: t.store.mark() }
		const script = `import { Effect } from 'effect'; import { serve } from './src/ui.ts'; await Effect.runPromise(serve(process.argv[1], () => [], '127.0.0.1', 0));`
		child = spawn(process.execPath, ['--input-type=module', '-e', script, t.path], { cwd: join(import.meta.dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] })
		const running = child
		let stderr = ''
		running.stderr!.on('data', (chunk) => { stderr += String(chunk) })
		const url = await new Promise<string>((resolve, reject) => {
			let stdout = ''
			const timer = setTimeout(() => reject(new Error(`Lab server failed to start: ${stderr}`)), 10000)
			running.once('error', (e) => { clearTimeout(timer); reject(e) })
			running.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Lab server exited ${code}: ${stderr}`)) })
			running.stdout!.on('data', (chunk) => {
				stdout += String(chunk)
				if (!stdout.includes('\n')) return
				clearTimeout(timer)
				resolve(JSON.parse(stdout.slice(0, stdout.indexOf('\n'))).ui)
			})
		})
		const response = await fetch(`${url}api/lab`)
		assert.equal(response.status, 200)
		const body = await response.json() as ReturnType<typeof jumpPackLab>
		assert.deepEqual(body.cases, jumpPackLab(t.store).cases)
		assert.deepEqual(body.runner, { active: false, pid: null })
		const refused = await fetch(`${url}api/lab`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approve: item.id }) })
		assert.equal(refused.status, 405)
		assert.equal((await refused.json() as { error: string }).error, 'method_not_allowed')
		assert.deepEqual({ item: t.store.get(item.id), mark: t.store.mark() }, before)
		assert.match(await (await fetch(`${url}lab`)).text(), /<!doctype html>/i)
	} finally {
		if (child && child.exitCode === null && child.signalCode === null) {
			const stopped = new Promise<void>((resolve) => child!.once('exit', () => resolve()))
			child.kill('SIGTERM')
			await stopped
		}
		t.clean()
	}
})
