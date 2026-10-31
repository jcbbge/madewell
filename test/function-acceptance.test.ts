import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { answer, drive, go, retry } from '../src/engine.ts'
import { functionProgress } from '../src/function-progress.ts'
import { loadPack, problemsOf, SOFTWARE, type Pack } from '../src/lane.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { Worker, type WorkerRequest } from '../src/worker.ts'

const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'"
const command = (code: string) => `${quote(process.execPath)} -e ${quote(code)}`
const jsonCommand = (value: unknown) => command(`console.log(${JSON.stringify(JSON.stringify(value))})`)
const object = { type: 'object' }
const originalSource = 'Original idea: preserve the full outcome.\r\nFact: 45 minutes; audience: independent designers.\nDate: TBD.  '
const clear = { understanding: 'The exact supplied function and acceptance condition are understood.', unclear: [], ambiguous: [], missing: [], notes: [] }
const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = { tiers: { deep: [card], intake: [card] }, jobs: {
	...Object.fromEntries(AGENT_JOBS.map((job) => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } },
} as Prescriptions['jobs'] }
const prefix = ['capture', 'ground', 'classify', 'perspectives', 'outcomes', 'dependencies']
const prefixValues = Object.fromEntries(prefix.map((job, index) => [job, { result: `Accepted ${job}`, position: index + 1 }]))
const refused = { approved: false, items: [{ title: 'Preparation only', objective: 'This must not become a candidate.', text: 'Investigate the outcome.' }] }
const corrected = { approved: true, items: [{ title: 'Deliver the actual outcome', objective: 'Produce the requested local result.', text: 'Keep the original facts and unresolved date.' }], preserved: { exact: 'This value belongs to the producer.' } }

function fixture() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-function-acceptance-')))
	const workspace = join(root, 'workspace')
	mkdirSync(workspace)
	const path = join(root, 'record.db')
	let store = openStore(path)
	const requests: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: (req) => Effect.sync(() => {
		requests.push(req)
		const value = req.kind === 'intake' ? clear : req.kind === 'originator'
			? { answer: 'The proposed return must meet the saved acceptance condition; retain the full intended outcome.', needsOperator: false }
			: JSON.parse(readFileSync(join(workspace, 'proposal.json'), 'utf8'))
		return { ok: true as const, output: JSON.stringify(value) }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const create = (pack: Pack, fields: Partial<Pick<Item, 'status' | 'job' | 'flow' | 'outputs' | 'after' | 'autonomy'>> = {}) => {
		assert.deepEqual(problemsOf(pack), [])
		return store.create({ title: 'Function acceptance', objective: 'Accept only the contracted result', source: originalSource, workspace, pack, autonomy: 'full', ...fields })
	}
	return { root, path, workspace, requests, run, create, get store() { return store },
		reopen() { store.close(); store = openStore(path) },
		clean() { store.close(); rmSync(root, { recursive: true, force: true }) },
	}
}

const checkingCommand = command(`
	let raw='';process.stdin.on('data',part=>raw+=part);process.stdin.on('end',()=>{
		const fs=require('node:fs'),assert=require('node:assert/strict'),packet=JSON.parse(raw);
		fs.appendFileSync('acceptance-inputs.jsonl',JSON.stringify(packet)+'\\n');
		assert.deepEqual(Object.keys(packet).sort(),['input','output']);
		assert.equal(packet.input.item.source,${JSON.stringify(originalSource)});
		assert.deepEqual(packet.input.received,${JSON.stringify(prefixValues)});
		if(packet.output.approved!==true){console.error('gate_rejected: the actual outcome was omitted');process.exit(9)};
		console.log(JSON.stringify({approved:false,items:[],injected:'The checker cannot replace the producer return.'}));
	})
`)

function discoveryPack(mode: 'command' | 'agent'): Pack {
	return { name: `checked ${mode} composition`, runtime: 'functions', discovery: [{ cartridge: 'discovery', steps: [
		...prefix.map((job) => ({ job, run: jsonCommand(prefixValues[job]), output: object })),
		{ job: 'propose', receives: prefix, output: object, check: checkingCommand, ...(mode === 'command'
			? { run: command("process.stdout.write(require('node:fs').readFileSync('proposal.json','utf8'))") }
			: { profile: 'planner', duty: 'Return the full candidate work under the supplied acceptance contract.' }) },
	] }], delivery: [{ cartridge: 'delivery', steps: [{ job: 'deliver', run: command("require('node:fs').writeFileSync('delivery-started','yes');console.log('{}')"), output: object }] }] }
}

for (const mode of ['command', 'agent'] as const) test(`${mode} acceptance rejection preserves all six saved outputs, blocks candidates, and resumes only the refused node`, async () => {
	const t = fixture()
	try {
		writeFileSync(join(t.workspace, 'proposal.json'), JSON.stringify(refused))
		const item = t.create(discoveryPack(mode), { job: prefix[0], flow: { loop: 'discovery', accepted: [] } })
		let progress = functionProgress(item, t.store)
		assert.equal(progress.allowed, true)
		assert.equal(progress.kind, 'run')
		assert.equal(progress.job, prefix[0])
		const held = await t.run(drive(item.id, { prescriptions }))
		assert.equal(held.status, 'held')
		assert.equal(held.job, 'propose')
		assert.equal(held.completion, undefined)
		assert.deepEqual(held.flow?.accepted, prefix)
		assert.deepEqual(Object.fromEntries(Object.entries(held.outputs).map(([job, raw]) => [job, JSON.parse(raw!)])), prefixValues)
		assert.equal(t.store.list().filter((child) => child.discovery === item.id).length, 0)
		assert.equal(existsSync(join(t.workspace, 'delivery-started')), false)
		assert.ok(!t.store.events(item.id).some((event) => event.kind === 'accepted' && event.data.job === 'propose'))
		const savedPrefix = t.store.events(item.id).filter((event) => event.kind === 'accepted')
		const savedOutputs = { ...held.outputs }
		const history = t.store.events(item.id)
		const acceptanceStarts = history.filter((event) => event.kind === 'trace-started' && event.data.kind === 'acceptance')
		assert.ok(acceptanceStarts.length >= 1)
		const producerStarts = history.filter((event) => event.kind === 'trace-started' && event.data.job === 'propose' && event.data.kind === (mode === 'agent' ? 'execute' : 'function'))
		assert.equal(acceptanceStarts.length, producerStarts.length)
		for (const started of acceptanceStarts) {
			assert.ok(!producerStarts.some((producer) => producer.data.invocation === started.data.invocation), 'the checker has its own observable invocation')
			assert.deepEqual((started.data.args as { input: { received: unknown; item: { source: string } } }).input.received, prefixValues)
			assert.equal((started.data.args as { input: { item: { source: string } } }).input.item.source, originalSource)
			assert.deepEqual((started.data.args as { output: unknown }).output, refused)
			const finished = history.find((event) => event.kind === 'trace-finished' && event.data.invocation === started.data.invocation)!
			assert.equal(finished.data.status, 'failed')
			assert.match(String(finished.data.error), /acceptance check exited 9/)
		}
		assert.match(JSON.stringify(history), /gate_rejected: the actual outcome was omitted/)
		if (mode === 'agent') assert.ok(t.store.calls(item.id).some((call) => call.kind === 'execute' && call.job === 'propose' && call.outcome === 'rejected' && /gate_rejected/.test(call.error ?? '')), 'the refused agent return remains durably rejected')
		progress = functionProgress(held, t.store)
		assert.equal(progress.allowed, false)
		assert.equal(progress.kind, 'resume')
		assert.equal(progress.job, 'propose')
		assert.ok(progress.required.some((text) => /acceptance check/.test(text)))
		t.reopen()
		assert.deepEqual(t.store.get(item.id)!.outputs, savedOutputs)
		writeFileSync(join(t.workspace, 'proposal.json'), JSON.stringify(corrected))
		if (['nq_turns', 'question_for_operator', 'authority'].includes(held.hold!.code)) await t.run(answer(item.id, 'The corrected producer return now retains the complete requested outcome.'))
		else await t.run(retry(item.id))
		assert.equal(functionProgress(t.store.get(item.id)!, t.store).allowed, true)
		const done = await t.run(drive(item.id, { prescriptions }))
		assert.equal(done.status, 'discovered')
		assert.deepEqual(done.flow?.accepted, [...prefix, 'propose'])
		assert.deepEqual(done.completion?.output, corrected, 'exit 0 cannot substitute the checker stdout for the original producer return')
		assert.deepEqual(JSON.parse(done.outputs.propose!), corrected)
		for (const job of prefix) {
			assert.equal(done.outputs[job], savedOutputs[job])
			assert.equal(t.store.events(item.id).filter((event) => event.kind === 'trace-started' && event.data.kind === 'function' && event.data.job === job).length, 1)
		}
		assert.deepEqual(t.store.events(item.id).filter((event) => event.kind === 'accepted' && prefix.includes(String(event.data.job))), savedPrefix)
		const children = t.store.list().filter((child) => child.discovery === item.id)
		assert.equal(children.length, 1)
		assert.equal(children[0]!.title, corrected.items[0]!.title)
		assert.equal(existsSync(join(t.workspace, 'delivery-started')), false, 'candidate generation does not silently run delivery')
		const packets = readFileSync(join(t.workspace, 'acceptance-inputs.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
		assert.equal(packets.length, acceptanceStarts.length + 1)
		assert.deepEqual(packets.at(-1)!.output, corrected)
		assert.equal(packets.at(-1)!.input.item.source, originalSource)
		assert.deepEqual(packets.at(-1)!.input.received, prefixValues)
		assert.equal(functionProgress(done, t.store).kind, 'done')
		assert.equal(functionProgress(done, t.store).allowed, false)
	} finally { t.clean() }
})

test('a rejected intermediate command cannot invoke its next node, and no-check nodes add no acceptance invocation', async () => {
	const t = fixture()
	try {
		const pack: Pack = { name: 'intermediate gate', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'delivery', steps: [
			{ job: 'first', run: jsonCommand({ result: 'Original value' }), check: command("console.error('Needs an actual artifact');process.exit(12)"), output: object },
			{ job: 'later', run: command("require('node:fs').writeFileSync('later-invoked','yes');console.log('{}')"), output: object },
		] }] }
		const blocked = t.create(pack)
		assert.equal((await t.run(drive(blocked.id, { prescriptions }))).status, 'held')
		assert.deepEqual(t.store.get(blocked.id)!.flow?.accepted ?? [], [])
		assert.deepEqual(t.store.get(blocked.id)!.outputs, {})
		assert.equal(existsSync(join(t.workspace, 'later-invoked')), false)
		const plain = t.create({ ...pack, delivery: [{ cartridge: 'delivery', steps: [{ job: 'plain', run: jsonCommand({ kept: true }), output: object }] }] })
		assert.equal((await t.run(drive(plain.id, { prescriptions }))).status, 'completed')
		assert.ok(!t.store.events(plain.id).some((event) => event.kind === 'trace-started' && event.data.kind === 'acceptance'))
	} finally { t.clean() }
})

test('schema rejection precedes a configured acceptance command', async () => {
	const t = fixture()
	try {
		const item = t.create({ name: 'shape before check', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'delivery', steps: [{ job: 'return',
			run: jsonCommand({ result: 7 }), output: { type: 'object', properties: { result: { type: 'string' } }, required: ['result'] },
			check: command("require('node:fs').writeFileSync('check-invoked','yes');console.log('{}')"),
		}] }] })
		assert.equal((await t.run(drive(item.id, { prescriptions }))).status, 'held')
		assert.equal(existsSync(join(t.workspace, 'check-invoked')), false)
		assert.ok(!t.store.events(item.id).some((event) => event.kind === 'trace-started' && event.data.kind === 'acceptance'))
	} finally { t.clean() }
})

test('software packs reject function acceptance commands instead of silently dropping them', async () => {
	const t = fixture()
	try {
		const pack: Pack = { ...SOFTWARE, discovery: [{ cartridge: 'discovery', steps: [{ job: 'discover', check: 'exit 0' }] }] }
		assert.ok(problemsOf(pack).some((problem) => /function-node fields require runtime "functions"/.test(problem)))
		const path = join(t.root, 'software.json')
		writeFileSync(path, JSON.stringify(pack))
		const error = await Effect.runPromise(Effect.flip(loadPack(path)))
		assert.equal(error.code, 'cartridges_invalid')
		assert.match(JSON.stringify(error.context), /function-node fields require runtime/)
		assert.equal(t.store.list().length, 0)
	} finally { t.clean() }
})

const twoSteps: Pack = { name: 'progress matches execution', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [
	{ job: 'first', run: jsonCommand({ first: true }), output: object }, { job: 'second', run: jsonCommand({ second: true }), output: object },
] }] }

test('structural next-action and drive agree on candidate, held, paused, dependency and ended states', async () => {
	const t = fixture()
	try {
		for (const [status, kind] of [['candidate', 'select'], ['held', 'resume'], ['paused', 'resume'], ['completed', 'done'], ['shipped', 'done'], ['discovered', 'done'], ['dropped', 'done']] as const) {
			const item = t.create(twoSteps, { status })
			const before = t.store.mark()
			const progress = functionProgress(item, t.store)
			assert.equal(progress.allowed, false, status)
			assert.equal(progress.kind, kind, status)
			assert.equal((await t.run(drive(item.id, { prescriptions }))).status, status)
			assert.deepEqual(t.store.mark(), before, 'a forbidden next action cannot start a call or mutate the item')
		}
		const prerequisite = t.create({ name: 'empty prerequisite', runtime: 'functions', discovery: [], delivery: [] })
		const dependent = t.create(twoSteps, { after: [prerequisite.id] })
		assert.equal(functionProgress(dependent, t.store).kind, 'wait')
		assert.equal((await t.run(drive(dependent.id, { prescriptions }))).status, 'queued')
		assert.equal(t.store.events(dependent.id).filter((event) => event.kind === 'trace-started').length, 0)
		await t.run(drive(prerequisite.id, { prescriptions }))
		assert.equal(functionProgress(t.store.get(dependent.id)!, t.store).kind, 'run')
		assert.equal((await t.run(drive(dependent.id, { prescriptions }))).status, 'completed')
		const missing = t.create(twoSteps, { after: [999999] })
		assert.equal(functionProgress(missing, t.store).allowed, false)
		assert.equal(functionProgress(missing, t.store).kind, 'wait')
		assert.equal((await t.run(drive(missing.id, { prescriptions }))).status, 'queued')
	} finally { t.clean() }
})

test('a real checkpoint resumes at the next saved node and an output without acceptance cannot skip work', async () => {
	const t = fixture()
	try {
		const split: Pack = { ...twoSteps, delivery: twoSteps.delivery[0]!.steps.map((step) => ({ cartridge: step.job, steps: [step] })) }
		const item = t.create(split, { autonomy: 'steps', outputs: { second: JSON.stringify({ stale: 'not accepted' }) } })
		assert.equal(functionProgress(item, t.store).job, 'first')
		const paused = await t.run(drive(item.id, { prescriptions }))
		assert.equal(paused.status, 'paused')
		assert.equal(functionProgress(paused, t.store).job, 'second')
		assert.equal(functionProgress(paused, t.store).kind, 'resume')
		t.reopen()
		await t.run(go(item.id))
		assert.equal(functionProgress(t.store.get(item.id)!, t.store).allowed, true)
		const completed = await t.run(drive(item.id, { prescriptions }))
		assert.equal(completed.status, 'completed')
		assert.deepEqual(JSON.parse(completed.outputs.second!), { second: true })
		assert.equal(t.store.events(item.id).filter((event) => event.kind === 'trace-started' && event.data.job === 'first').length, 1)
	} finally { t.clean() }
})

test('corrupted accepted prefixes are visible repairs and cannot execute or skip functions', async () => {
	const t = fixture()
	try {
		for (const [accepted, outputs] of [
			[['second'], { second: '{}' }], [['first', 'first'], { first: '{}' }], [['first'], {}], [['first'], { first: '   ' }], [['first', 'second', 'ghost'], { first: '{}', second: '{}', ghost: '{}' }],
		] as const) {
			const item = t.create(twoSteps, { job: 'second', flow: { loop: 'delivery', accepted }, outputs })
			const progress = functionProgress(item, t.store)
			assert.equal(progress.kind, 'repair')
			assert.equal(progress.allowed, false)
			assert.match(progress.problem!, /Invalid accepted function prefix/)
			const held = await t.run(drive(item.id, { prescriptions }))
			assert.equal(held.status, 'held')
			assert.equal(held.hold?.code, 'function_failed')
			assert.deepEqual(held.outputs, outputs)
			assert.deepEqual(held.flow?.accepted, accepted)
			assert.equal(t.store.events(item.id).filter((event) => event.kind === 'trace-started').length, 0)
		}
		const finishing = t.create(twoSteps, { job: 'first', flow: { loop: 'delivery', accepted: ['first', 'second'] }, outputs: { first: '{"kept":1}', second: '{"kept":2}' } })
		const progress = functionProgress(finishing, t.store)
		assert.equal(progress.kind, 'finish')
		assert.equal(progress.job, null)
		assert.equal(progress.allowed, true)
		const done = await t.run(drive(finishing.id, { prescriptions }))
		assert.equal(done.status, 'completed')
		assert.deepEqual(done.completion?.output, { kept: 2 })
		assert.equal(t.store.events(finishing.id).filter((event) => event.kind === 'trace-started').length, 0)
	} finally { t.clean() }
})
