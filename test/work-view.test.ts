import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { drive, promote } from '../src/engine.ts'
import { auditJumpDiscovery } from '../src/jump-pack-audit.ts'
import { jumpPackLab } from '../src/jump-pack-lab.ts'
import type { Pack } from '../src/lane.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { Worker } from '../src/worker.ts'

const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'"
const command = (code: string) => `${quote(process.execPath)} -e ${quote(code)}`
const jsonCommand = (value: unknown) => command(`console.log(${JSON.stringify(JSON.stringify(value))})`)
const object = { type: 'object' }
const source = 'Make a local invitation.\r\nTitle: Calm Inbox. Audience: independent designers.\nKeep the date TBD.  '
const content = '# Calm Inbox\nFor independent designers. Date: TBD.\nReply for updates.\n'
const clear = { understanding: 'The verification function is clear.', unclear: [], ambiguous: [], missing: [], notes: [] }
const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = { tiers: { deep: [card], intake: [card] }, jobs: {
	...Object.fromEntries(AGENT_JOBS.map((job) => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } },
} as Prescriptions['jobs'] }

function fixture() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-work-view-')))
	const workspace = join(root, 'workspace')
	mkdirSync(workspace)
	let store = openStore(join(root, 'record.db'))
	const worker = Layer.succeed(Worker, { run: (req) => Effect.succeed({ ok: true as const, output: JSON.stringify(req.kind === 'intake' ? clear : { verdict: 'passed', result: 'A scripted verifier claims success.' }) }) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const create = (pack: Pack, fields: Partial<Pick<Item, 'title' | 'source' | 'objective' | 'flow' | 'job' | 'autonomy' | 'after'>> = {}) => store.create({ title: 'Local invitation', objective: 'Create and check the invitation draft', source, workspace, pack, autonomy: 'full', ...fields })
	const view = (id: number) => jumpPackLab(store).cases.find((c) => c.id === id)!
	return { root, workspace, run, create, view, get store() { return store }, reopen() { store.close(); store = openStore(join(root, 'record.db')) }, clean() { store.close(); rmSync(root, { recursive: true, force: true }) } }
}

function deliveryPack(options: { artifact?: string; fingerprint?: boolean; fingerprintArtifact?: boolean; agentVerification?: boolean; missingPhase?: string; failedCheck?: boolean; verdict?: string } = {}): Pack {
	const artifact = options.artifact ?? 'draft.md'
	const verification = options.agentVerification ? { profile: 'reviewer', duty: 'Report verification evidence.' } : { run: command(`
		const fs=require('node:fs'), assert=require('node:assert/strict'), crypto=require('node:crypto');
		const actual=fs.readFileSync('draft.md','utf8'); assert.equal(actual,${JSON.stringify(content)});
		${options.failedCheck ? "console.error('The invitation failed its independent check');process.exit(19);" : ''}
		console.log(JSON.stringify({verdict:${JSON.stringify(options.verdict ?? 'passed')},result:'The invitation passed the actual local check.',artifact:${JSON.stringify(artifact)},evidence:${options.fingerprint === false ? '[]' : `['sha256:'+crypto.createHash('sha256').update(${options.fingerprintArtifact ? `fs.readFileSync(${JSON.stringify(artifact)})` : 'actual'}).digest('hex')]`}}));
	`) }
	const steps = [
		{ job: 'ideation', run: jsonCommand({ result: 'Shape the local invitation.' }), output: object },
		{ job: 'planning', run: jsonCommand({ result: 'Write draft.md and check its exact contents.' }), output: object },
		{ job: 'implementation', run: command(`require('node:fs').writeFileSync('draft.md',${JSON.stringify(content)});console.log(JSON.stringify({result:'Created draft.md'}))`), output: object },
		{ job: 'verification', ...verification, output: object },
	].filter((step) => step.job !== options.missingPhase)
	return { name: 'work view acceptance', version: '1', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'delivery', steps }] }
}

test('work context retains exact inputs and task contracts; a discovery PASS does not complete unselected work', async () => {
	const t = fixture()
	try {
		const candidates = [
			{ title: 'Invitation', objective: 'Make the local draft', text: 'Draft the invitation without inventing a date.' },
			{ title: 'Handoff', objective: 'Record the reply handoff', text: 'Keep the next-step decision visible.' },
			{ title: 'Review', objective: 'Review the invitation', text: 'Read the produced draft against the source.', after: [1] },
		]
		const pack: Pack = { ...deliveryPack(), discovery: [{ cartridge: 'discovery', steps: [
			{ job: 'declare', run: jsonCommand({ outcomes: [{ id: 'O1', description: 'An invitation with the original facts.' }] }), output: object },
			{ job: 'confirm', run: jsonCommand({ items: candidates }), output: object },
		] }] }
		const parent = t.create(pack, { job: 'declare', flow: { loop: 'discovery', accepted: [] }, autonomy: 'checkpoints' })
		t.store.note(parent.id, 'lab-case', { kind: 'live-model', hypothesis: 'Retain the real outcome.' })
		const context = { inputOrigin: 'Operator transcript, retained verbatim', workTitle: 'Workshop invitation', testQuestion: 'Did the source become completed work?', attemptLabel: 'Discovery attempt A', intent: ['Create the invitation.', 'Keep the date unresolved.'] }
		t.store.note(parent.id, 'lab-context', context)
		assert.equal((await t.run(drive(parent.id, { prescriptions }))).status, 'discovered')
		t.store.note(parent.id, 'lab-verdict', { result: 'pass', actual: 'Discovery structure passed its experiment.' })
		t.reopen()
		const view = t.view(parent.id)
		assert.equal(view.source, source)
		assert.equal(view.objective, parent.objective)
		assert.equal(view.inputKey, createHash('sha256').update(source).digest('hex'))
		assert.deepEqual(Object.fromEntries(Object.keys(context).map((key) => [key, view[key as keyof typeof view]])), context)
		assert.equal(view.category, 'work-example')
		assert.equal(view.mode, 'discovery')
		assert.equal(view.discoveryDone, true)
		assert.equal(view.verdict?.result, 'pass')
		assert.equal(view.done, false, 'a passing experiment does not select or deliver its candidate tasks')
		assert.equal(view.tasksDone, 0)
		assert.deepEqual(view.tasks.map((task) => [task.title, task.objective, task.brief]), candidates.map((candidate) => [candidate.title, candidate.objective, candidate.text]))
		assert.ok(view.tasks.every((task) => !task.enteredDelivery && !task.done && task.status === 'candidate'))
		assert.ok(view.tasks.every((task) => /not been selected/i.test(task.why)))
		assert.deepEqual(view.tasks[2]!.after, [{ id: view.tasks[0]!.id, title: 'Invitation', done: false }])
		assert.ok(view.tasks.every((task) => task.phases.length === 4 && task.phases.every((phase) => phase.state === 'pending')))
		const direct = t.create(deliveryPack())
		t.store.note(direct.id, 'lab-case', { kind: 'live-model' })
		assert.equal((await t.run(drive(direct.id, { prescriptions }))).status, 'completed')
		assert.equal(t.view(direct.id).inputKey, view.inputKey, 'two attempts of the same exact input can be grouped')
		assert.equal(t.view(direct.id).mode, 'direct-delivery')
		assert.equal(t.view(direct.id).done, true)
		assert.equal(t.view(direct.id).discoveryDone, false)
		assert.equal(t.view(parent.id).done, false, 'a separate completed attempt cannot complete this discovery task list')
	} finally { t.clean() }
})

test('failed discovery coverage or phase review prevents discovery completion while preserving accepted execution and unselected tasks', async () => {
	const t = fixture()
	try {
		for (const cause of ['coverage', 'phase'] as const) {
			const declared = { outcomes: [{ id: 'O1', description: 'Deliver the actual invitation.' }] }
			const confirmation = { outcomes: declared.outcomes, items: [{ id: 'C1', title: 'Invitation task', objective: 'Make the invitation', text: 'Create the agreed draft.', kind: cause === 'coverage' ? 'research' : 'outcome', outcomeRefs: ['O1'], after: [] }], coverage: [{ outcome: 'O1', candidates: ['C1'], disposition: 'represented', reason: 'Candidate was linked to the intended outcome.' }] }
			const pack: Pack = { ...deliveryPack(), discovery: [{ cartridge: 'discovery', steps: [
				{ job: 'declare', run: jsonCommand(declared), output: object },
				{ job: 'look-first', run: jsonCommand({ result: 'I could not inspect the missing evidence.' }), output: object },
				{ job: 'confirm', run: jsonCommand(confirmation), output: object },
			] }] }
			const item = t.create(pack, { job: 'declare', flow: { loop: 'discovery', accepted: [] }, autonomy: 'checkpoints' })
			t.store.note(item.id, 'lab-case', { kind: 'live-model' })
			const discovered = await t.run(drive(item.id, { prescriptions }))
			assert.equal(discovered.status, 'discovered')
			assert.ok(t.view(item.id).nodes.every((node) => node.state === 'accepted'), 'the engine really accepted each returned JSON object')
			const accepted = t.store.events(item.id).filter((event) => event.kind === 'accepted')
			const audit = auditJumpDiscovery(JSON.parse(discovered.outputs.declare!), JSON.parse(discovered.outputs.confirm!))
			assert.equal(audit.passed, cause !== 'coverage')
			t.store.note(item.id, 'lab-coverage-audit', audit)
			const review = { job: 'look-first', done: false, reason: 'The returned report explicitly says inspection could not be completed.' }
			if (cause === 'phase') t.store.note(item.id, 'work-phase-review', review)
			t.reopen()
			const before = t.store.mark()
			const view = t.view(item.id)
			const rejected = view.nodes.find((node) => node.job === (cause === 'coverage' ? 'confirm' : 'look-first'))!
			assert.equal(rejected.state, 'blocked')
			assert.equal(rejected.evidence.acceptedEvent, accepted.find((event) => event.data.job === rejected.job)!.seq)
			assert.deepEqual(rejected.output, JSON.parse(discovered.outputs[rejected.job]!))
			if (cause === 'coverage') assert.deepEqual(rejected.evidence.coverageAudit, audit)
			else assert.deepEqual(rejected.evidence.workReview, review)
			assert.equal(view.discoveryDone, false, cause)
			assert.equal(view.done, false)
			assert.equal(view.tasksDone, 0)
			assert.equal(view.tasks.length, 1)
			assert.equal(view.tasks[0]!.status, 'candidate')
			assert.equal(view.tasks[0]!.done, false)
			assert.equal(view.tasks[0]!.enteredDelivery, false)
			assert.deepEqual(t.store.get(item.id), discovered, 'review evidence never rewrites the saved execution result')
			assert.deepEqual(t.store.events(item.id).filter((event) => event.kind === 'accepted'), accepted)
			assert.deepEqual(t.store.mark(), before)
		}
	} finally { t.clean() }
})

test('task selection, prerequisites, entered delivery and completion come from each actual task', async () => {
	const t = fixture()
	try {
		const pack: Pack = { ...deliveryPack(), discovery: [{ cartridge: 'discovery', steps: [{ job: 'confirm', run: jsonCommand({ items: [
			{ title: 'Prerequisite', objective: 'Make the required draft', text: 'Build the draft first.' },
			{ title: 'Unselected alternative', objective: 'A separate possible task', text: 'Do not select this task.' },
			{ title: 'Dependent', objective: 'Review the prerequisite', text: 'Use its result.', after: [1] },
		] }), output: object }] }] }
		const parent = t.create(pack, { job: 'confirm', flow: { loop: 'discovery', accepted: [] }, autonomy: 'checkpoints' })
		t.store.note(parent.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(parent.id, { prescriptions }))
		const proposed = t.view(parent.id).tasks
		await t.run(promote(parent.id, [proposed[2]!.id]))
		await t.run(drive(proposed[2]!.id, { prescriptions }))
		const waiting = t.view(parent.id).tasks[2]!
		assert.equal(waiting.enteredDelivery, false)
		assert.equal(waiting.done, false)
		assert.match(waiting.why, /Waiting for: Prerequisite/)
		// Function delivery has no intervening cartridge checkpoint in this fixture.
		assert.equal((await t.run(drive(proposed[0]!.id, { prescriptions }))).status, 'completed')
		assert.equal(t.view(parent.id).tasks[0]!.done, true)
		assert.equal(t.view(parent.id).tasks[0]!.enteredDelivery, true)
		assert.equal(t.view(parent.id).tasks[2]!.after[0]!.done, true)
		assert.equal((await t.run(drive(proposed[2]!.id, { prescriptions }))).status, 'completed')
		const view = t.view(parent.id)
		assert.equal(view.tasksDone, 2)
		assert.equal(view.done, false)
		assert.equal(view.tasks[1]!.enteredDelivery, false)
		assert.equal(view.tasks[1]!.done, false)
		assert.equal(view.tasks[2]!.result, 'The invitation passed the actual local check.')
	} finally { t.clean() }
})

test('a prerequisite and its dependency label share current review and artifact completion evidence', async () => {
	const t = fixture()
	try {
		const prerequisite = t.create(deliveryPack(), { title: 'Checked prerequisite' })
		const dependent = t.create(deliveryPack(), { title: 'Waiting dependent', after: [prerequisite.id] })
		for (const item of [prerequisite, dependent]) t.store.note(item.id, 'lab-case', { kind: 'live-model' })
		assert.equal((await t.run(drive(prerequisite.id, { prescriptions }))).status, 'completed')
		const assertBoth = (expected: boolean) => {
			assert.equal(t.view(prerequisite.id).tasks[0]!.done, expected, 'the prerequisite card uses current completion evidence')
			assert.deepEqual(t.view(dependent.id).tasks[0]!.after, [{ id: prerequisite.id, title: prerequisite.title, done: expected }], 'the dependency label must report the same result')
			assert.equal(t.view(dependent.id).done, false)
			assert.equal(t.view(dependent.id).tasks[0]!.enteredDelivery, false)
		}
		assertBoth(true)
		t.store.note(prerequisite.id, 'lab-semantic-review', { result: 'pass', evidence: 'Initial independent acceptance.' })
		t.store.note(prerequisite.id, 'lab-semantic-review', { result: 'fail', evidence: 'The output does not satisfy the source.' })
		assertBoth(false)
		assert.match(t.view(dependent.id).tasks[0]!.why, /Waiting for: Checked prerequisite/)
		t.store.note(prerequisite.id, 'lab-semantic-review', { result: 'pass', evidence: 'The latest review accepted the actual result.' })
		assertBoth(true)
		writeFileSync(join(t.workspace, 'draft.md'), '# Altered after verification\n')
		assertBoth(false)
		t.store.note(prerequisite.id, 'lab-semantic-review', { result: 'pass', evidence: 'A passing review cannot erase a mismatched artifact fingerprint.' })
		assertBoth(false)
		writeFileSync(join(t.workspace, 'draft.md'), content)
		assertBoth(true)
		assert.equal(t.store.get(prerequisite.id)!.status, 'completed', 'labels are not inferred from status alone')
		assert.equal(t.store.get(dependent.id)!.status, 'queued')
	} finally { t.clean() }
})

test('four accepted agent outputs and a passing hypothesis still require independent verification', async () => {
	const t = fixture()
	try {
		const item = t.create(deliveryPack({ agentVerification: true }))
		t.store.note(item.id, 'lab-case', { kind: 'live-model' })
		assert.equal((await t.run(drive(item.id, { prescriptions }))).status, 'completed')
		t.store.note(item.id, 'lab-verdict', { result: 'pass' })
		assert.ok(t.view(item.id).tasks[0]!.phases.every((phase) => phase.state === 'accepted'))
		assert.equal(t.view(item.id).done, false, 'an agent verdict cannot verify its own completion claim')
		assert.match(t.view(item.id).tasks[0]!.why, /sufficient verification is not recorded/)
		t.store.note(item.id, 'lab-semantic-review', { result: 'fail', evidence: 'The result did not fulfill the requested work.' })
		assert.equal(t.view(item.id).done, false)
		t.store.note(item.id, 'lab-semantic-review', { result: 'pass', evidence: 'Independent reviewer checked the actual requested result.' })
		assert.equal(t.view(item.id).done, true)
		t.store.note(item.id, 'lab-semantic-review', { result: 'fail', evidence: 'Later independent review found the output did not satisfy the request.' })
		assert.equal(t.view(item.id).done, false, 'a superseded passing review must not overrule the latest failing review')
	} finally { t.clean() }
})

test('a failed independent review or phase review overrides successful command execution without rewriting its evidence', async () => {
	const t = fixture()
	try {
		const item = t.create(deliveryPack())
		t.store.note(item.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(item.id, { prescriptions }))
		assert.equal(t.view(item.id).done, true)
		const saved = t.store.get(item.id)
		t.store.note(item.id, 'lab-semantic-review', { result: 'pass', evidence: 'Prior independent review accepted the output.' })
		t.store.note(item.id, 'lab-semantic-review', { result: 'fail', evidence: 'The actual output did not fulfill the source.' })
		assert.equal(t.view(item.id).done, false, 'a successful process does not override the latest rejected result')
		assert.match(t.view(item.id).tasks[0]!.why, /Independent review did not accept/)
		t.store.note(item.id, 'lab-semantic-review', { result: 'pass', evidence: 'Independent review accepted the corrected interpretation.' })
		assert.equal(t.view(item.id).done, true)
		const phaseReview = { job: 'implementation', done: false, reason: 'The returned report says implementation could not begin.' }
		t.store.note(item.id, 'work-phase-review', phaseReview)
		const task = t.view(item.id).tasks[0]!
		assert.equal(task.done, false, 'accepted return shape alone does not prove that the phase performed the work')
		const phase = task.phases.find((p) => p.job === 'implementation')!
		assert.equal(phase.state, 'blocked')
		assert.deepEqual(phase.evidence.workReview, phaseReview)
		assert.equal(typeof phase.evidence.acceptedEvent, 'number', 'the actual execution acceptance remains inspectable')
		assert.deepEqual(phase.output, { result: 'Created draft.md' })
		assert.deepEqual(t.store.get(item.id), saved, 'work reviews change the projection, never the engine item or its historical output')
		t.store.note(item.id, 'work-phase-review', { job: 'implementation', done: true, reason: 'Later review accepted the actual implementation.' })
		assert.equal(t.view(item.id).done, true)
	} finally { t.clean() }
})

test('missing phases, an unsuccessful check or an absent passing verdict prevent a completed-work claim', async () => {
	for (const options of [{ missingPhase: 'ideation' }, { failedCheck: true }, { verdict: 'unknown' }] as const) {
		const t = fixture()
		try {
			const item = t.create(deliveryPack(options))
			t.store.note(item.id, 'lab-case', { kind: 'deterministic' })
			await t.run(drive(item.id, { prescriptions }))
			const view = t.view(item.id)
			assert.equal(view.category, 'tool-check')
			assert.equal(view.done, false, JSON.stringify(options))
			assert.equal(view.tasks[0]!.done, false)
			assert.equal(view.tasks[0]!.enteredDelivery, true)
			if ('failedCheck' in options) assert.match(view.tasks[0]!.why, /exit 19/)
		} finally { t.clean() }
	}
	const t = fixture()
	try {
		const item = t.create({ name: 'empty is not done', runtime: 'functions', discovery: [], delivery: [] })
		t.store.note(item.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(item.id, { prescriptions }))
		assert.equal(t.view(item.id).done, false)
		assert.equal(t.view(item.id).tasks[0]!.enteredDelivery, false)
	} finally { t.clean() }
})

test('artifact previews read actual files, match saved fingerprints, and invalidate completion after changes or deletion', async () => {
	const t = fixture()
	try {
		const item = t.create(deliveryPack())
		t.store.note(item.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(item.id, { prescriptions }))
		const before = { item: t.store.get(item.id), mark: t.store.mark() }
		let view = t.view(item.id)
		assert.equal(view.done, true)
		assert.deepEqual(view.tasks[0]!.artifact, { path: join(t.workspace, 'draft.md'), content, available: true, hashMatches: true, message: 'This is the actual output; it matches the saved verification.' })
		const changed = '# Changed after checking\nThis was never verified.\n'
		writeFileSync(join(t.workspace, 'draft.md'), changed)
		view = t.view(item.id)
		assert.equal(view.tasks[0]!.artifact?.content, changed, 'the current file replaces any decorative or saved preview')
		assert.equal(view.tasks[0]!.artifact?.hashMatches, false)
		assert.equal(view.done, false)
		assert.match(view.tasks[0]!.why, /changed since it was checked/)
		rmSync(join(t.workspace, 'draft.md'))
		view = t.view(item.id)
		assert.equal(view.tasks[0]!.artifact?.available, false)
		assert.equal(view.tasks[0]!.artifact?.content, null)
		assert.equal(view.done, false)
		assert.deepEqual({ item: t.store.get(item.id), mark: t.store.mark() }, before, 'artifact inspection never changes task acceptance or the record')
	} finally { t.clean() }
})

test('artifact previews cannot escape the real workspace through traversal, absolute paths or symlinks', async () => {
	const t = fixture()
	try {
		const outside = join(t.root, 'outside')
		mkdirSync(outside)
		writeFileSync(join(outside, 'private.md'), 'External contents must never be returned by the work view.')
		symlinkSync(join(outside, 'private.md'), join(t.workspace, 'escape.md'))
		symlinkSync(outside, join(t.workspace, 'escape-dir'))
		for (const artifact of ['../outside/private.md', join(outside, 'private.md'), 'escape.md', 'escape-dir/private.md']) {
			const item = t.create(deliveryPack({ artifact }))
			t.store.note(item.id, 'lab-case', { kind: 'live-model' })
			assert.equal((await t.run(drive(item.id, { prescriptions }))).status, 'completed')
			const view = t.view(item.id)
			assert.equal(view.done, false, artifact)
			assert.equal(view.tasks[0]!.artifact?.available, false, artifact)
			assert.equal(view.tasks[0]!.artifact?.content, null, artifact)
			assert.match(view.tasks[0]!.artifact!.message, /outside this task workspace/)
			assert.doesNotMatch(JSON.stringify(view), /External contents must never be returned/)
		}
	} finally { t.clean() }
})

test('preview limits preserve real artifact availability while saved fingerprints still govern completion', async () => {
	const t = fixture()
	try {
		writeFileSync(join(t.workspace, 'large.txt'), 'x'.repeat(65537))
		writeFileSync(join(t.workspace, 'program.sh'), 'echo unpreviewable\n')
		for (const artifact of ['large.txt', 'program.sh']) {
			const item = t.create(deliveryPack({ artifact, fingerprintArtifact: true }))
			t.store.note(item.id, 'lab-case', { kind: 'live-model' })
			await t.run(drive(item.id, { prescriptions }))
			assert.equal(t.view(item.id).done, true, artifact)
			assert.equal(t.view(item.id).tasks[0]!.artifact?.available, true, 'a display limit does not erase an existing artifact')
			assert.equal(t.view(item.id).tasks[0]!.artifact?.content, null)
			assert.equal(t.view(item.id).tasks[0]!.artifact?.hashMatches, true, 'the saved hash remains checkable without a text preview')
			writeFileSync(join(t.workspace, artifact), artifact === 'large.txt' ? 'z'.repeat(65537) : 'echo changed after checking\n')
			assert.equal(t.view(item.id).tasks[0]!.artifact?.available, true)
			assert.equal(t.view(item.id).tasks[0]!.artifact?.hashMatches, false)
			assert.equal(t.view(item.id).done, false, 'preview restrictions cannot bypass a recorded fingerprint mismatch')
		}
		const absent = t.create(deliveryPack({ artifact: 'absent.md' }))
		t.store.note(absent.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(absent.id, { prescriptions }))
		assert.equal(t.view(absent.id).done, false)
		assert.equal(t.view(absent.id).tasks[0]!.artifact?.available, false)
		const noFingerprint = t.create(deliveryPack({ fingerprint: false }))
		t.store.note(noFingerprint.id, 'lab-case', { kind: 'live-model' })
		await t.run(drive(noFingerprint.id, { prescriptions }))
		assert.equal(t.view(noFingerprint.id).done, true, 'an actual successful checker still supplies proof when it did not record a fingerprint')
		assert.equal(t.view(noFingerprint.id).tasks[0]!.artifact?.hashMatches, null)
		assert.match(t.view(noFingerprint.id).tasks[0]!.artifact!.message, /no saved fingerprint/)
	} finally { t.clean() }
})
