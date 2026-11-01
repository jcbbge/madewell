import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { runGates } from '../src/change.ts'
import { drive, go } from '../src/engine.ts'
import { quote } from '../src/errors.ts'
import type { Gate } from '../src/project.ts'
import type { GateReceipt } from '../src/rumen.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { workEvidenceOf } from '../src/work-evidence.ts'
import { Worker } from '../src/worker.ts'

const retired = 'src/retired file.txt', current = 'src/current file.txt'
const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = {
	tiers: { deep: [card], coding: [card], intake: [card] },
	jobs: { ...Object.fromEntries(AGENT_JOBS.map(job => [job, { tier: 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
}
function fixture() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-deletion-gates-'))), repo = join(root, 'repo'), home = join(root, 'home')
	mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Independent deletion acceptance'); git('config', 'user.email', 'deletion@localhost')
	writeFileSync(join(repo, retired), 'Retire this tracked product.\n'); writeFileSync(join(repo, current), 'Keep this tracked product.\n')
	git('add', '.'); git('commit', '-qm', 'Seed retired and surviving product files')
	const base = git('rev-parse', 'HEAD'), inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^MW_/i.test(key)))
	for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
	process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
	const store = openStore(process.env.MW_STORE), item = store.create({ title: 'Remove a retired product file', objective: 'Remove the retired file while preserving the surviving product', source: 'Delete only the retired file and run the project gates.', workspace: repo, autonomy: 'checkpoints' })
	const shipped = join(root, 'shipped.log'), change = join(root, 'change.patch')
	const project = (gates: Gate[]) => writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, gates, ship: `git rev-parse HEAD >> ${quote(shipped)}` }]))
	project([])
	return {
		root, repo, home, base, store, item, git, shipped, project,
		stage(mixed = false) { git('rm', '--quiet', '--', retired); if (mixed) { writeFileSync(join(repo, current), 'Updated surviving product.\n'); git('add', '--', current) }; writeFileSync(change, git('diff', '--cached', '--binary', base) + '\n') },
		gates(gates: Gate[]) { return Effect.runPromise(runGates(item.id, repo, base, gates, change, { minutes: 1 }, { ...process.env, MW_ITEM: String(item.id) }).pipe(Effect.provide(Layer.succeed(Store, store)))) },
		clean() { store.close(); for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(inherited)) if (value !== undefined) process.env[key] = value; rmSync(root, { recursive: true, force: true }) },
	}
}
function delivery(gates: Gate[], changeSurvivor = false) {
	const t = fixture()
	t.project(gates)
	const worker = Layer.succeed(Worker, { run: req => Effect.sync(() => {
		let output: Record<string, unknown>
		if (req.kind === 'intake') output = { understanding: 'Remove the fixed retired file and preserve required project evidence.', unclear: [], ambiguous: [], missing: [], notes: [] }
		else if (req.kind === 'originator') output = { answer: 'Keep the exact fixed deletion scope.', needsOperator: false }
		else if (req.job === 'ideate') output = { outcome: 'The retired product file is removed.', approach: 'Delete the existing file.', decisions: [] }
		else if (req.job === 'challenge') output = { findings: [], decisions: [] }
		else if (req.job === 'plan') output = { making: 'Remove the retired product', notMaking: ['Unrelated changes'], scope: [retired, ...(changeSurvivor ? [current] : [])], follows: [], steps: ['Delete the retired file.'], doneWhen: [{ id: 'D-delete', text: 'The retired file is absent.' }], decisions: [] }
		else if (req.job === 'implement') { rmSync(join(req.cwd, retired)); if (changeSurvivor) writeFileSync(join(req.cwd, current), 'Updated surviving product.\n'); output = { summary: 'Deleted the fixed retired file.' } }
		else if (req.job === 'test-plan') {
			const file = join(req.cwd, 'checks/deletion.sh'); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, `test ! -e ${quote(retired)}\n`)
			output = { checks: [{ id: 'C-delete', doneWhen: 'D-delete', run: 'sh checks/deletion.sh' }] }
		} else { assert.equal(req.job, 'arbitrate'); output = { cause: 'undetermined', answer: 'Keep the failed gate stopped for inspection.', evidence: 'The engine owns the gate result.' } }
		return { ok: true as const, output: JSON.stringify(output) }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, t.store), worker))))
	return { ...t, run }
}
const deletedIdentity = (path: string) => ({ path, sha256: null, deleted: true })

test('deletion gates: a failing global gate runs on a deletion-only change and blocks merge and shipment', { timeout: 30_000 }, async () => {
	const command = "printf 'global deletion gate ran\\n'\nexit 23"
	const t = delivery([{ id: 'deletion-policy', run: command }])
	try {
		const result = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(result.status, 'held')
		assert.equal(result.verification?.passed, false)
		const gate = result.verification!.results.find(check => check.id === 'G1')!
		assert.equal(gate.exitCode, 23)
		assert.match(gate.output, /global deletion gate ran/)
		const receipt = result.verification!.gateReceipts![0]!
		assert.equal(receipt.command, command)
		assert.equal(receipt.outcome, 'failed')
		assert.deepEqual(receipt.files, [retired])
		assert.deepEqual(receipt.sourceBefore, [deletedIdentity(retired)])
		assert.deepEqual(receipt.sourceAfter, [deletedIdentity(retired)])
		assert.equal(t.git('rev-parse', 'main'), t.base)
		assert.equal(result.merged, undefined)
		assert.equal(existsSync(t.shipped), false)
	} finally { t.clean() }
})

test('deletion gates: a passing global deletion gate retains absence evidence and establishes current delivered work', { timeout: 30_000 }, async () => {
	const t = delivery([{ id: 'deletion-policy', run: `test ! -e ${quote(retired)}\nprintf 'deletion accepted\\n'` }])
	try {
		let result = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(result.status, 'paused', JSON.stringify(result.hold))
		assert.equal(result.verification?.passed, true)
		const receipt = result.verification!.gateReceipts![0]!
		assert.equal(receipt.outcome, 'passed')
		assert.deepEqual(receipt.sourceBefore, [deletedIdentity(retired)])
		assert.deepEqual(receipt.sourceAfter, [deletedIdentity(retired)])
		assert.equal(workEvidenceOf(t.store, result).verificationCurrent, true, 'intentional absence remains usable verification evidence')
		await t.run(go(result.id)); result = await t.run(drive(result.id, { prescriptions }))
		assert.equal(result.status, 'shipped')
		assert.equal(existsSync(join(t.repo, retired)), false)
		assert.equal(readFileSync(t.shipped, 'utf8').trim(), result.verification!.commit)
		assert.equal(workEvidenceOf(t.store, result).delivered, true)
		// Keep both saved and projected claims consistent: failure must come from the unreadable identity itself.
		const receipts: GateReceipt[] = result.verification!.gateReceipts!.map(entry => ({ ...entry, sourceAfter: entry.sourceAfter.map(source => ({ path: source.path, sha256: null })) }))
		const tampered: Item = { ...result, verification: { ...result.verification!, gateReceipts: receipts } }
		const reader = { call: t.store.call, events: (id: number) => t.store.events(id).map(event => event.kind === 'verified' ? { ...event, data: { ...event.data, gateReceipts: receipts } } : event) }
		assert.equal(workEvidenceOf(reader, tampered).verificationCurrent, false, 'unexpected unreadability cannot borrow a staged deletion identity')
	} finally { t.clean() }
})

test('deletion gates: mixed file arguments include surviving matched paths and exclude deleted paths', async () => {
	const t = fixture()
	try {
		t.stage(true)
		const captured = join(t.root, 'arguments.json'), code = `require('node:fs').writeFileSync(${JSON.stringify(captured)}, JSON.stringify(process.argv.slice(1)))`
		const command = `${quote(process.execPath)} -e ${quote(code)} -- {files}`
		const result = await t.gates([{ id: 'format-current', glob: '*.txt', run: command }])
		assert.deepEqual(JSON.parse(readFileSync(captured, 'utf8')), [current], 'a path containing spaces is passed as one existing argument')
		assert.equal(result.results.length, 1)
		assert.equal(result.results[0]!.exitCode, 0)
		const receipt = result.gateReceipts[0]!
		assert.equal(receipt.command, command.replace('{files}', quote(current)))
		assert.deepEqual(receipt.files, [current, retired])
		assert.deepEqual(receipt.sourceBefore.find(source => source.path === retired), deletedIdentity(retired))
		assert.deepEqual(receipt.sourceAfter.find(source => source.path === retired), deletedIdentity(retired))
		assert.match(receipt.sourceBefore.find(source => source.path === current)!.sha256!, /^[a-f0-9]{64}$/)
	} finally { t.clean() }
})

test('deletion gates: deletion-only file formatters are explicitly inapplicable and never launch with empty arguments', async () => {
	const t = fixture()
	try {
		t.stage()
		const marker = join(t.root, 'formatter-was-launched'), code = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unexpected formatter invocation')`
		const result = await t.gates([{ id: 'format-existing', glob: '*.txt', run: `${quote(process.execPath)} -e ${quote(code)} -- {files}` }])
		assert.equal(existsSync(marker), false)
		assert.deepEqual(result.results, [])
		assert.equal(result.gateReceipts[0]!.outcome, 'not-applicable')
		assert.equal(result.gateReceipts[0]!.command, null)
		assert.equal(result.gateReceipts[0]!.exitCode, null)
		assert.equal(t.store.events(t.item.id).some(event => event.kind === 'trace-started' && event.data.kind === 'gate'), false)
	} finally { t.clean() }
})

test('deletion gates: an initially present file disappearing during a passing gate is unavailable evidence and blocks shipment', { timeout: 30_000 }, async () => {
	const t = delivery([{ id: 'unexpected-removal', glob: '*.txt', run: `rm -- ${quote(current)}` }], true)
	try {
		const result = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(result.status, 'held')
		assert.equal(result.hold?.code, 'environment')
		assert.equal(result.verification?.passed ?? false, false)
		const event = t.store.events(result.id).findLast(event => event.kind === 'rumen-gate')!
		const sources = event.data.sourceAfter as Array<{ path: string; sha256: string | null; deleted?: boolean }>
		assert.deepEqual(sources.find(source => source.path === current), { path: current, sha256: null })
		assert.deepEqual(sources.find(source => source.path === retired), deletedIdentity(retired))
		assert.equal(t.git('rev-parse', 'main'), t.base)
		assert.equal(result.shipped, undefined)
		assert.equal(existsSync(t.shipped), false)
		assert.equal(workEvidenceOf(t.store, result).verificationCurrent, false)
	} finally { t.clean() }
})
