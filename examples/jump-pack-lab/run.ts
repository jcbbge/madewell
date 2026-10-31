// Foreground, opt-in experiments. Uses the existing record and executor; no project registration.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { DatabaseSync } from 'node:sqlite'
import { Effect, Layer } from 'effect'
import { loadPrescriptions } from '../../src/cards.ts'
import { drive, go, promote } from '../../src/engine.ts'
import { MadeWellError, quote } from '../../src/errors.ts'
import { requestPackUpdate } from '../../src/functions.ts'
import { harnessWorker } from '../../src/harness.ts'
import { auditJumpDiscovery } from '../../src/jump-pack-audit.ts'
import { loadJumpPacks, resolveJumpPacks, type JumpPack, type JumpSlot, type ResolvedJumpPacks } from '../../src/jump-packs.ts'
import { laneOf, lastJson, type Pack } from '../../src/lane.ts'
import { Store, openStore, type Item } from '../../src/store.ts'

const { positionals, values } = parseArgs({ allowPositionals: true, options: { tier: { type: 'string' }, case: { type: 'string' }, resume: { type: 'boolean', default: false } } })
const command = positionals[0] ?? 'status'
const config = JSON.parse(readFileSync(resolve('.demo/demo.json'), 'utf8'))
process.env.MW_HOME = config.home
process.env.MW_AUTORUN = '0'
const store = openStore(config.store)
const check = fileURLToPath(new URL('./check.ts', import.meta.url))
const print = (value: unknown) => console.log(JSON.stringify(value, null, 2))
const phases = ['ideation', 'planning', 'implementation', 'verification'] as const
const nodeCommand = (phase: string, mode: string) => `${quote(process.execPath)} ${quote(check)} ${quote(phase)} ${quote(mode)}`

const campaignSource = 'Standalone fictional example, not a real company or campaign. Produce a local invitation draft in draft.md for a free 45-minute workshop titled Calm Inbox, for independent designers. Include a subject, the audience fit, what happens, and a reply-for-updates call to action. Date and time are TBD: preserve that uncertainty and invent no registration URL, event date, proof of benefits or guaranteed results. Include a short sales handoff note identifying what a reply would tell us and the next step. The requested outcome is the local draft itself; it is authorized only in this isolated example. Do not send, publish, contact anyone or use any real project. Discovery should retain this outcome, not replace it with research. Its delivery should plan, make and independently check the local artifact.'

async function main() {
	if (command === 'status') { print(store.list().filter(i => store.events(i.id).some(e => e.kind === 'lab-case')).map(i => ({ id: i.id, title: i.title, status: i.status }))); return }
	if (!['structural', 'live', 'delivery'].includes(command)) throw new MadeWellError({ code: 'usage', message: 'Use structural, live, delivery or status.', context: { command }, next: [{ run: 'npm run lab -- status', why: 'inspect existing experiments' }] })
	if (values.resume && command !== 'live') throw new MadeWellError({ code: 'usage', message: '--resume is supported for the recorded live cases only. Structural runs create fresh fixtures.', context: { command }, next: [{ run: 'npm run lab -- live --resume', why: 'resume the existing live discovery and delivery records' }] })
	if (values.case && !['tax', 'marketing'].includes(values.case)) throw new MadeWellError({ code: 'usage', message: '--case must be tax or marketing.', context: { command }, next: [{ run: 'npm run lab -- status', why: 'inspect recorded cases' }] })
	const prescriptions = await Effect.runPromise(loadPrescriptions(config.prescriptions))
	if (values.tier && !prescriptions.tiers[values.tier]) throw new MadeWellError({ code: 'prescriptions_invalid', message: 'The selected experiment tier is not configured.', context: { path: config.prescriptions, tier: values.tier, tiers: Object.keys(prescriptions.tiers) }, next: [{ run: 'npm run lab -- live', why: 'use the configured defaults instead' }] })
	const names = ['generic', 'software', 'database', 'marketing', 'sales']
	const loaded = await Effect.runPromise(loadJumpPacks(names.map(n => fileURLToPath(new URL(`./packs/${n}.json`, import.meta.url)))))
	const packs = Object.fromEntries(loaded.map(p => [p.name, p]))
	const layer = Layer.mergeAll(Layer.succeed(Store, store), harnessWorker)
	const execute = <A, E>(effect: Effect.Effect<A, E, Store | import('../../src/worker.ts').Worker>) => Effect.runPromise(effect.pipe(Effect.provide(layer)))
	const workspaceRoot = mkdtempSync(join(tmpdir(), 'made-well-jump-lab-'))
	const workspace = (key: string) => { const path = join(workspaceRoot, key); mkdirSync(path); writeFileSync(join(path, 'CASE.md'), 'Isolated, non-authoritative example. No real project is associated. Only explicitly selected local fixture artifacts may be made. Do not contact anyone, publish, use live systems or infer missing facts.\n'); return path }
	const tune = (resolved: ResolvedJumpPacks): ResolvedJumpPacks => ({ ...resolved, pack: { ...resolved.pack, discovery: resolved.pack.discovery.map(c => ({ ...c, steps: c.steps.map(s => s.run || !values.tier ? s : { ...s, tier: values.tier }) })), delivery: resolved.pack.delivery.map(c => ({ ...c, steps: c.steps.map(s => s.run || !values.tier ? s : { ...s, tier: values.tier }) })) } })
	const create = (key: string, title: string, hypothesis: string, expected: string[], composition: ResolvedJumpPacks, source: string, loop: 'discovery' | 'delivery', kind: 'live-model' | 'deterministic', path = workspace(key), autonomy: Item['autonomy'] = 'checkpoints') => {
		if (values.resume) {
			const prior = store.list().findLast(i => store.events(i.id).some(e => e.kind === 'lab-case' && e.data.key === key && e.data.kind === kind))
			if (!prior) throw new MadeWellError({ code: 'usage', message: `No recorded ${key} case can be resumed.`, context: { command }, next: [{ run: 'npm run lab -- status', why: 'inspect recorded case identities first' }] })
			print({ case: prior.id, resumed: true, url: `http://127.0.0.1:4758/lab?id=${prior.id}` })
			return prior
		}
		const resolved = tune(composition)
		const first = laneOf(resolved.pack)[loop][0]!.job
		const item = store.create({ title, objective: loop === 'discovery' ? 'Generate provisional outcome work and prerequisites from this exact example. Preserve outcomes separately from execution authority. Return concise findings and explicit uncertainty. No real project is associated.' : 'Perform only this isolated fixture task, with its actual checks and recorded evidence.', source, workspace: path, pack: resolved.pack, job: first, flow: { loop, accepted: [] }, autonomy })
		store.note(item.id, 'lab-case', { key, kind, hypothesis, expected, tier: values.tier ?? 'pack/default' })
		store.note(item.id, 'lab-resolved', { selected: resolved.selected, bindings: resolved.bindings })
		print({ case: item.id, title, url: `http://127.0.0.1:4758/lab?id=${item.id}` })
		return item
	}
	const verdict = (item: number, passed: boolean | null, actual: string, evidence: unknown) => store.note(item, 'lab-verdict', { result: passed === null ? 'unreviewed' : passed ? 'pass' : 'fail', actual, evidence })
	const fixturePack = (mode: string): JumpPack => ({ name: 'fixture-methods', version: '1', methods: Object.fromEntries(phases.map(phase => [phase, { id: `${mode}-${phase}`, run: nodeCommand(phase, mode) }])) })
	const pickFixture = Object.fromEntries(phases.map(p => [p, 'fixture-methods'])) as Partial<Record<JumpSlot, string>>
	const scoped = (work: Effect.Effect<void, MadeWellError, Store | import('../../src/worker.ts').Worker>) => Effect.gen(function* () { yield* store.claimRunner(); yield* Effect.addFinalizer(() => Effect.sync(() => store.releaseRunner())); yield* work }).pipe(Effect.scoped)

	if (command === 'delivery') {
		const proof: JumpPack = { name: 'local-draft-proof', version: '1', methods: { verification: { id: 'read-actual-draft', run: nodeCommand('verification', 'campaign') } } }
		const item = create('explicit-draft', 'Marketing + sales: delivery of an explicit local task', 'The four delivery obligations work outside software with a task-specific independent checker.', ['All four delivery functions accepted', 'draft.md actually produced and checked', 'No discovery repair or external publication claimed'], resolveJumpPacks([packs.generic!, packs.marketing!, packs.sales!, proof], { planning: 'marketing' }), campaignSource, 'delivery', 'live-model')
		await execute(scoped(Effect.gen(function* () {
			const done = yield* drive(item.id, { prescriptions })
			const verification = lastJson(done.outputs.verification ?? '') as { verdict?: string } | null
			const checked = done.status === 'completed' && verification?.verdict === 'passed'
			verdict(done.id, checked ? null : false, checked ? 'Actual local draft and independent checks completed; semantic review is pending.' : `Delivery stopped at ${done.job} with status ${done.status}; passing artifact verification was not reached.`, { status: done.status, verification, hold: done.hold ?? null, workspace: done.workspace })
		})))
	} else if (command === 'structural') {
		await execute(scoped(Effect.gen(function* () {
			const database = resolveJumpPacks([packs.generic!, packs.software!, packs.database!, fixturePack('database')], pickFixture)
			const data = create('database', 'Software + database: preserve actual rows', 'Added database requirements survive composition and a real local migration passes independent checks.', ['All four delivery functions accepted', 'Both fixture rows preserved', 'Software and database requirement origins visible'], database, 'Rename people.name to full_name in fixture.db while preserving the two known rows. This is a deterministic local fixture, not a live application.', 'delivery', 'deterministic')
			const db = new DatabaseSync(join(data.workspace, 'fixture.db')); db.exec("CREATE TABLE people(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO people VALUES(1,'Ada'),(2,'Lin')"); db.close()
			const done = yield* drive(data.id, { prescriptions })
			const verified = done.status === 'completed' && JSON.parse(done.outputs.verification ?? '{}').verdict === 'passed'
			verdict(data.id, verified, verified ? 'Actual sandbox SQLite migration and row/schema checks executed.' : 'The sandbox migration did not reach passing verification.', { status: done.status, verification: lastJson(done.outputs.verification ?? ''), hold: done.hold ?? null })

			const missing = create('missing', 'Missing proof must remain visibly blocked', 'A failed real check cannot be mistaken for verified delivery.', ['Verification fails', 'Work remains held', 'Earlier accepted outputs remain visible'], resolveJumpPacks([packs.generic!, fixturePack('missing-proof')], pickFixture), 'Produce receipt.json before verification. The fixture intentionally omits it.', 'delivery', 'deterministic')
			const held = yield* drive(missing.id, { prescriptions })
			verdict(missing.id, held.status === 'held' && !held.completion, 'The independent checker exited nonzero because receipt.json was absent; work did not complete.', { status: held.status, hold: held.hold, accepted: held.flow?.accepted })

			const swapBase = resolveJumpPacks([packs.generic!, fixturePack('v1')], pickFixture)
			const swap = create('swap', 'Replace a future method without repeating accepted work', 'Boundary updates preserve accepted inputs and apply the new future method.', ['Past-node rewrite rejected', 'Future planning method replaced', 'First accepted invocation occurs once'], swapBase, 'Create and independently verify a local fixture receipt.', 'delivery', 'deterministic', undefined, 'steps')
			const paused = yield* drive(swap.id, { prescriptions })
			assert.equal(paused.status, 'paused')
			const replacement: JumpPack = { name: 'replacement-planning', version: '2', methods: { planning: { id: 'planning-v2', run: nodeCommand('planning', 'v2') } } }
			const updated = resolveJumpPacks([packs.generic!, fixturePack('v1'), replacement], { ...pickFixture, planning: replacement.name })
			const bad: Pack = { ...updated.pack, delivery: updated.pack.delivery.map((c, i) => i ? c : { ...c, steps: c.steps.map(s => ({ ...s, args: { ...s.args, rewritten: true } })) }) }
			const rejected = yield* Effect.result(requestPackUpdate(swap.id, bad))
			assert.equal(rejected._tag, 'Failure')
			store.note(swap.id, 'lab-replacement-rejected', { reason: 'Accepted node input rewrite was refused.', result: rejected })
			yield* requestPackUpdate(swap.id, updated.pack)
			for (let count = 0; count < 4 && store.get(swap.id)!.status === 'paused'; count++) { yield* go(swap.id); yield* drive(swap.id, { prescriptions }) }
			const final = store.get(swap.id)!
			const firstCalls = store.events(swap.id).filter(e => e.kind === 'trace-started' && e.data.job === 'ideation').length
			verdict(swap.id, final.status === 'completed' && firstCalls === 1 && final.outputs.planning!.includes('v2'), 'Accepted ideation kept its original evidence; future planning used v2; rewriting past input was rejected.', { firstCalls, planning: lastJson(final.outputs.planning!), status: final.status })

			const conflict = create('conflict', 'Conflicting packs stop before execution', 'Conflicting methods require an explicit choice rather than load-order wins.', ['Composition reports both competing methods', 'No function or agent call starts'], resolveJumpPacks([packs.generic!]), 'Attempt marketing + sales without selecting a planning method.', 'discovery', 'deterministic')
			let error: unknown
			try { resolveJumpPacks([packs.generic!, packs.marketing!, packs.sales!]) } catch (cause) { error = cause }
			assert.ok(error instanceof MadeWellError)
			store.note(conflict.id, 'lab-conflict', { message: error.message, details: error.context })
			store.save({ ...conflict, status: 'held', hold: { code: 'cartridges_invalid', message: error.message, context: { details: error.context } } }, 'held', { reason: error.message })
			verdict(conflict.id, store.callHeads().every(c => c.item !== conflict.id), 'Both planning methods were named in the composition error; no execution occurred.', error.context)
		})))
	} else {
		const tax = values.case === 'marketing' ? null : create('tax', 'Fresh transcript: retain the intended capability', 'Domain-neutral contracts retain the outcome alongside uncertainty, without assuming a project or tax policy.', ['Seven discovery functions recorded', 'An explicit outcome candidate retained', 'Unknown rates and alternatives preserved', 'Nothing promoted'], resolveJumpPacks([packs.generic!]), readFileSync('.demo/cases/alcohol-transcript-001/raw-input.txt', 'utf8'), 'discovery', 'live-model')

		const proof: JumpPack = { name: 'local-draft-proof', version: '1', methods: { verification: { id: 'read-actual-draft', run: nodeCommand('verification', 'campaign') } } }
		const campaign = values.case === 'tax' ? null : create('campaign', `Marketing + sales: local draft (${packs.generic!.version})`, 'Changing the domain pack changes appropriate methods and evidence while preserving all four delivery obligations.', ['Marketing planning chosen explicitly', 'Sales requirements retained', 'Local draft produced and checked', 'Nothing sent or published'], resolveJumpPacks([packs.generic!, packs.marketing!, packs.sales!], { planning: 'marketing' }), campaignSource, 'discovery', 'live-model')
		const studies = [tax, campaign].filter((item): item is Item => item !== null)
		await execute(scoped(Effect.gen(function* () {
			yield* Effect.all(studies.map(item => drive(item.id, { prescriptions })), { concurrency: 2 })
			for (const original of studies) {
				const item = store.get(original.id)!
				const final = lastJson(item.outputs.confirm ?? '') as { items?: { kind: string }[] } | null
				const audit = auditJumpDiscovery(lastJson(item.outputs.declare ?? ''), final)
				store.note(item.id, 'lab-coverage-audit', audit)
				if (item.id === tax?.id || item.status !== 'discovered' || !audit.passed) {
					verdict(item.id, item.status === 'discovered' && audit.passed ? null : false, 'Fresh discovery and outcome-link checks recorded. Semantic fidelity needs independent review before a passing hypothesis verdict.', { audit, status: item.status })
					continue
				}
				const candidate = store.list().filter(c => c.discovery === item.id)[final!.items!.findIndex(c => c.kind === 'outcome')]
				if (!candidate) { verdict(item.id, false, 'No outcome candidate was available for local artifact delivery.', audit); continue }
				const selected = yield* promote(item.id, [candidate.id])
				// The artifact check belongs to the outcome task, not to every prerequisite generated by discovery.
				const outcomePack = tune(resolveJumpPacks([packs.generic!, packs.marketing!, packs.sales!, proof], { planning: 'marketing' }))
				const pinned = store.get(candidate.id)!
				const proofStep = outcomePack.pack.delivery.flatMap(c => c.steps).find(step => step.job === 'verification')!
				const currentProof = laneOf(pinned.pack).delivery.find(step => step.job === 'verification')!
				if (!['completed', 'shipped'].includes(pinned.status) && currentProof.run !== proofStep.run) {
					// Keep every other pinned node, including its original execution tier and requirements.
					const replacement = { ...pinned.pack!, version: `${pinned.pack!.version}+local-draft-proof@1`, delivery: pinned.pack!.delivery.map(c => ({ ...c, steps: c.steps.map(step => step.job === 'verification' ? proofStep : step) })) }
					const pending = store.events(candidate.id).findLast(e => e.kind === 'cartridges-requested')?.data.pack
					if (JSON.stringify(pending) !== JSON.stringify(replacement)) yield* requestPackUpdate(candidate.id, replacement)
					store.note(candidate.id, 'lab-resolved', { selected: outcomePack.selected, reason: 'Only the future verification node changes; earlier pinned functions remain intact.' })
				}
				for (const task of selected) {
					const delivered = yield* drive(task.id, { prescriptions })
					if (delivered.status === 'held') break
				}
				const outcome = store.get(candidate.id)!
				const verified = outcome.status === 'completed' && JSON.parse(outcome.outputs.verification ?? '{}').verdict === 'passed'
				verdict(item.id, verified ? null : false, verified ? 'The selected local draft completed delivery and actual artifact checks. Independent semantic review is still required.' : `The outcome task is ${outcome.status}; passing artifact verification was not reached.`, { audit, task: outcome.id, status: outcome.status, verification: lastJson(outcome.outputs.verification ?? ''), artifact: existsSync(join(outcome.workspace, 'draft.md')) ? join(outcome.workspace, 'draft.md') : null })
			}
		})))
	}
	mkdirSync('.demo/lab', { recursive: true })
	writeFileSync(join('.demo/lab', `${command}-${Date.now()}.json`), JSON.stringify(store.list().filter(i => store.events(i.id).some(e => e.kind === 'lab-case')).map(i => ({ id: i.id, status: i.status, verdict: store.events(i.id).findLast(e => e.kind === 'lab-verdict')?.data ?? null })), null, 2))
}
main().catch(error => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1 }).finally(() => store.close())
