// One continuous, isolated experiment; start and resume are separate foreground processes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Effect, Exit, Layer } from 'effect'
import { loadPrescriptions } from '../../src/cards.ts'
import { drive, promote } from '../../src/engine.ts'
import { MadeWellError, quote } from '../../src/errors.ts'
import { requestPackUpdate } from '../../src/functions.ts'
import { harnessWorker } from '../../src/harness.ts'
import { auditJumpDiscovery } from '../../src/jump-pack-audit.ts'
import { loadJumpPacks, resolveJumpPacks, type JumpPack } from '../../src/jump-packs.ts'
import { laneOf, lastJson } from '../../src/lane.ts'
import { openStore, Store, type Item } from '../../src/store.ts'
import { Worker } from '../../src/worker.ts'

const { positionals, values } = parseArgs({ allowPositionals: true, options: { tier: { type: 'string' }, id: { type: 'string' } } })
const command = positionals[0] ?? 'status'
const config = JSON.parse(readFileSync(resolve('.demo/demo.json'), 'utf8'))
process.env.MW_HOME = config.home
process.env.MW_AUTORUN = '0'
const store = openStore(config.store)
const print = (value: unknown) => console.log(JSON.stringify(value, null, 2))
const pathFor = (file: string) => fileURLToPath(new URL(file, import.meta.url))
const key = 'raw-clay-continuity'
const source = `Fictional little example, no real project. I'm thinking about a workshop... Calm Inbox, that's the name. People like independent designers, working for themselves. Free, about 45 minutes. I don't have a date or time yet. Need something I can read locally, draft.md, not a campaign sent anywhere. Maybe a subject, who it's for, what we'd do? Keep that proposed, we haven't run it. People could reply if they want updates. Don't make up a signup link or promise they'll get results. And put a tiny internal note at the bottom: what a reply actually tells us, what it doesn't, what we'd do next. Need an actual draft, not just a plan for one. Nothing published, no messages sent, nobody contacted. Date and time stay TBD.`
const prefix = (item: Item) => ({ accepted: item.flow?.accepted ?? [], outputs: Object.fromEntries((item.flow?.accepted ?? []).map(job => [job, item.outputs[job]])), invocations: Object.fromEntries((item.flow?.accepted ?? []).map(job => [job, store.events(item.id).filter(e => e.kind === 'trace-started' && e.data.kind === 'execute' && e.data.job === job).length])) })
const latest = () => store.list().findLast(item => store.events(item.id).some(e => e.kind === 'lab-case' && e.data.key === key))
const selectedItem = () => values.id ? store.get(Number(values.id)) : latest()

async function main() {
	if (!['start', 'resume', 'status'].includes(command)) throw new MadeWellError({ code: 'usage', message: 'Use start, resume or status.', context: { command }, next: [{ run: 'node examples/jump-pack-lab/continuity.ts status', why: 'inspect the saved experiment' }] })
	if (command === 'status') { const item = selectedItem(); print(item ? { id: item.id, status: item.status, job: item.job, accepted: item.flow?.accepted, hold: item.hold ?? null, children: store.list().filter(c => c.discovery === item.id).map(c => ({ id: c.id, title: c.title, status: c.status })), url: `http://127.0.0.1:4758/lab?id=${item.id}` } : { state: 'not-started' }); return }
	const prescriptions = await Effect.runPromise(loadPrescriptions(config.prescriptions))
	if (values.tier && !prescriptions.tiers[values.tier]) throw new MadeWellError({ code: 'prescriptions_invalid', message: 'Experiment tier is not configured.', context: { path: config.prescriptions, tier: values.tier, tiers: Object.keys(prescriptions.tiers) }, next: [{ run: 'node examples/jump-pack-lab/continuity.ts start', why: 'use the configured default' }] })
	let item: Item
	if (command === 'start') {
		const packs = await Effect.runPromise(loadJumpPacks(['generic', 'marketing', 'sales'].map(name => pathFor(`./packs/${name}.json`))))
		const confirmation = packs[0]!.methods!.confirm!
		const audit: JumpPack = { name: 'discovery-reference-check', version: '1', methods: { confirm: { ...confirmation, id: 'confirm-with-reference-check', fallback: false, check: `${quote(process.execPath)} ${quote(pathFor('./accept-discovery.ts'))}` } } }
		const composition = resolveJumpPacks([...packs, audit], { planning: 'marketing' })
		const pack = { ...composition.pack, discovery: composition.pack.discovery.map(c => ({ ...c, steps: c.steps.map(s => ({ ...s, ...(values.tier ? { tier: values.tier } : {}) })) })), delivery: composition.pack.delivery.map(c => ({ ...c, steps: c.steps.map(s => ({ ...s, ...(values.tier ? { tier: values.tier } : {}) })) })) }
		const workspace = mkdtempSync(join(tmpdir(), 'made-well-clay-'))
		writeFileSync(join(workspace, 'CASE.md'), 'Fictional isolated example. No real project or organization. Only local draft artifacts authorized. No publishing, messages, live systems or external changes.\n')
		item = store.create({ title: 'Rough workshop notes → checked local invitation', objective: 'Prepare these rough notes into usable intent and candidate work. Clarify through the source and DX/UX/AX rubric. The selected local outcome can then be delivered in this isolated experiment.', source, workspace, pack, job: 'declare', flow: { loop: 'discovery', accepted: [] }, autonomy: 'checkpoints' })
		store.note(item.id, 'lab-case', { key, kind: 'live-model', hypothesis: 'Saved work carries raw intent through a rejected confirmation, process replacement and delivery of a generated task.', expected: ['Discovery prepares usable intent without a golden task list', 'Injected broken reference rejected before acceptance', 'Fresh process repeats only confirmation', 'Generated task produces an independently checked local draft'], tier: values.tier ?? 'pack/default' })
		store.note(item.id, 'lab-context', { inputOrigin: 'Rough fictional workshop notes, written for this continuity trial', workTitle: 'Make a local Calm Inbox invitation from rough notes', testQuestion: 'Can discovery prepare useful intent, survive a broken return and a fresh worker, then deliver its own generated task?', attemptLabel: 'Continuous discovery and delivery, with a deliberate bad return' })
		store.note(item.id, 'lab-resolved', { selected: composition.selected, bindings: composition.bindings })
	} else {
		const saved = selectedItem()
		assert.ok(saved && store.events(saved.id).some(e => e.kind === 'lab-case' && e.data.key === key), 'No matching saved continuity trial')
		item = saved
		assert.ok(store.events(item.id).some(e => e.kind === 'lab-process-handoff'), 'The deliberate rejection/handoff boundary has not been reached')
	}
	print({ id: item.id, command, pid: process.pid, url: `http://127.0.0.1:4758/lab?id=${item.id}` })
	const program = Effect.gen(function* () {
		yield* store.claimRunner()
		yield* Effect.addFinalizer(() => Effect.sync(() => store.releaseRunner()))
		const real = yield* Worker
		let injected = false
		const experimentalWorker: Worker['Service'] = { run: request => {
			if (command === 'start' && injected && store.get(item.id)?.rejected) {
				const current = store.get(item.id)!
				store.note(item.id, 'lab-process-handoff', { pid: process.pid, reason: 'Deliberate experiment stop after reference rejection, before the next real worker call.', prefix: prefix(current), rejected: current.rejected, candidates: store.list().filter(c => c.discovery === item.id).map(c => c.id) })
				return Effect.interrupt
			}
			return real.run(request).pipe(Effect.map(result => {
				if (command !== 'start' || injected || request.item !== item.id || request.job !== 'confirm' || request.kind !== 'execute' || !result.ok) return result
				const original = lastJson(result.output) as Record<string, unknown> | undefined
				assert.ok(original && Array.isArray(original.outcomes), 'Need a real confirmation return before injecting the fault')
				const output = { ...original, outcomes: (original.outcomes as Record<string, unknown>[]).map((outcome, index) => ({ ...outcome, id: `injected-broken-reference-${index + 1}` })) }
				store.note(item.id, 'lab-fault-injected', { synthetic: true, reason: 'Deliberately rename final outcome identities; this is not a natural model failure.', original: result.output, injected: output, pid: process.pid })
				injected = true
				return { ...result, output: JSON.stringify(output) }
			}))
		} }
		store.note(item.id, 'lab-process-started', { pid: process.pid, command, source: 'saved work record', inputHash: createHash('sha256').update(item.source).digest('hex') })
		const discovery = yield* drive(item.id, { prescriptions }).pipe(Effect.provideService(Worker, experimentalWorker), Effect.exit)
		if (command === 'start') {
			const handoff = store.events(item.id).findLast(e => e.kind === 'lab-process-handoff')
			assert.ok(Exit.isFailure(discovery) && handoff, 'Expected the labelled process handoff')
			assert.equal(store.get(item.id)!.flow!.accepted.length, 6)
			assert.equal(store.get(item.id)!.outputs.confirm, undefined)
			assert.equal(store.list().filter(c => c.discovery === item.id).length, 0)
			print({ id: item.id, state: 'stopped-after-rejection', accepted: store.get(item.id)!.flow!.accepted, next: `node examples/jump-pack-lab/continuity.ts resume --id ${item.id}` })
			return
		}
		if (Exit.isFailure(discovery)) return yield* Effect.failCause(discovery.cause)
		const recovered = store.get(item.id)!
		const handoff = store.events(item.id).findLast(e => e.kind === 'lab-process-handoff')!
		const previous = handoff.data.prefix as ReturnType<typeof prefix>
		const now = prefix(recovered)
		assert.deepEqual({ ...now, accepted: now.accepted.slice(0, 6), outputs: Object.fromEntries(previous.accepted.map(job => [job, now.outputs[job]])), invocations: Object.fromEntries(previous.accepted.map(job => [job, now.invocations[job]])) }, previous, 'Earlier accepted outputs/invocations changed during recovery')
		assert.notEqual(handoff.data.pid, process.pid, 'Recovery must run in a different process')
		const final = lastJson(recovered.outputs.confirm ?? '') as { items?: { kind: string }[] } | undefined
		const audit = auditJumpDiscovery(lastJson(recovered.outputs.declare ?? ''), final)
		store.note(item.id, 'lab-coverage-audit', audit)
		store.note(item.id, 'lab-recovery-proof', { passed: recovered.status === 'discovered' && audit.passed, priorPid: handoff.data.pid, resumedPid: process.pid, unchangedPrefix: previous, candidates: store.list().filter(c => c.discovery === item.id).map(c => c.id) })
		assert.equal(recovered.status, 'discovered', recovered.hold?.message ?? 'Discovery did not finish')
		assert.equal(audit.passed, true, audit.issues.join('; '))
		const candidates = store.list().filter(c => c.discovery === item.id)
		const outcomeIds = candidates.filter((_candidate, index) => final!.items![index]?.kind === 'outcome').map(c => c.id)
		assert.ok(outcomeIds.length, 'No generated outcome task to deliver')
		for (const id of outcomeIds) {
			const task = store.get(id)!
			const proof = `${quote(process.execPath)} ${quote(pathFor('./check.ts'))} verification campaign`
			const current = laneOf(task.pack).delivery.find(step => step.job === 'verification')!
			if (!['completed', 'shipped'].includes(task.status) && current.run !== proof) yield* requestPackUpdate(id, { ...task.pack!, version: `${task.pack!.version}+local-draft-proof@1`, delivery: task.pack!.delivery.map(c => ({ ...c, steps: c.steps.map(step => step.job === 'verification' ? { ...step, run: proof, args: { ...step.args, contract: { ...step.args?.contract as Record<string, unknown>, method: { pack: 'local-draft-proof', version: '1', id: 'read-actual-draft' } } } } : step) })) })
		}
		const selected = yield* promote(item.id, outcomeIds)
		for (const task of selected) { const result = yield* drive(task.id, { prescriptions }); if (result.status === 'held') break }
		const results = selected.map(task => { const actual = store.get(task.id)!; return { id: actual.id, title: actual.title, status: actual.status, accepted: actual.flow?.accepted, verification: lastJson(actual.outputs.verification ?? ''), hold: actual.hold ?? null } })
		const finished = results.every(task => task.status === 'completed')
		store.note(item.id, 'lab-verdict', { result: finished ? 'unreviewed' : 'fail', actual: finished ? 'Continuous generated-task delivery and configured checks finished; independent semantic review remains.' : 'Recovery preserved discovery, but delivery did not finish.', tasks: results })
		print({ id: item.id, recovery: 'six earlier outputs and invocation counts unchanged', tasks: results, semanticReview: 'pending' })
	}).pipe(Effect.scoped, Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), harnessWorker)))
	await Effect.runPromise(program)
	mkdirSync('.demo/lab', { recursive: true })
	writeFileSync(join('.demo/lab', `continuity-${item.id}-${command}.json`), JSON.stringify({ id: item.id, status: store.get(item.id)!.status, events: store.events(item.id).filter(e => e.kind.startsWith('lab-')).map(e => ({ seq: e.seq, kind: e.kind, data: e.data })) }, null, 2))
}
main().catch(error => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1 }).finally(() => store.close())
