import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { answer, contextFact, contextFacts, drive } from '../src/engine.ts'
import { contextFactsFor } from '../src/context-facts.ts'
import { preserveArtifact } from '../src/artifact-evidence.ts'
import type { Prescriptions } from '../src/cards.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest } from '../src/worker.ts'

const grant = 'Browser tooling is permitted; temporary fixtures may be written under the task workspace.'
const clear = { understanding: 'Correct the independent checks on the retained candidate.', unclear: [], ambiguous: [], missing: [], notes: [] }
const card = { harness: 'codex', provider: 'local', account: 'scripted', model: 'scripted', effort: 'low' as const }
const prescriptions = {
	tiers: { deep: [card] },
	jobs: { ...Object.fromEntries(['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate'].map((job) => [job, { tier: 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
} as Prescriptions

function setup(inspect: (request: WorkerRequest, attempt: number) => unknown = () => undefined) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-context-facts-')))
	const workspace = join(root, 'product')
	const home = join(root, 'home')
	mkdirSync(workspace)
	mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', workspace, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main')
	git('config', 'user.name', 'Operator')
	git('config', 'user.email', 'operator@example.com')
	writeFileSync(join(workspace, 'value.txt'), 'old\n')
	git('add', 'value.txt')
	git('commit', '-qm', 'initial value')
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: workspace }]))
	const priorHome = process.env.MW_HOME
	process.env.MW_HOME = home
	let store = openStore(join(home, 'work.db'))
	const calls: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: (request) => Effect.sync(() => {
		calls.push(request)
		const attempt = calls.filter((call) => call.kind === request.kind && call.job === request.job).length
		let output = inspect(request, attempt)
		if (output === undefined) {
			if (request.kind === 'intake') output = clear
			else if (request.kind === 'originator') output = { answer: 'Use the fixed plan and the registered environment.', needsOperator: false }
			else if (request.job === 'ideate') output = { outcome: 'Update value', approach: 'Edit its file', decisions: [] }
			else if (request.job === 'challenge') output = { findings: [], decisions: [] }
			else if (request.job === 'plan') output = { making: 'Update value', notMaking: [], scope: ['value.txt'], steps: ['Write the new value'], doneWhen: [{ id: 'D1', text: 'Value is new' }], decisions: [] }
			else if (request.job === 'implement') { writeFileSync(join(request.cwd, 'value.txt'), 'new\n'); output = { summary: 'Updated value' } }
			else if (request.job === 'test-plan') output = { checks: [{ id: 'C1', doneWhen: 'D1', run: attempt < 4 ? 'exit 1' : 'test "$(cat value.txt)" = new' }] }
			else if (request.job === 'arbitrate') output = { cause: attempt === 1 ? 'undetermined' : 'test', answer: `Correction ${attempt - 1}: check the actual value.`, evidence: 'The check failed on the retained candidate.' }
		}
		return { ok: true as const, output: JSON.stringify(output) }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const item = store.create({ title: 'Update value', objective: 'The value is new', source: 'Operator asks for the new value.', workspace, autonomy: 'checkpoints' })
	return {
		root, workspace, home, item, calls, run,
		get store() { return store },
		restart() { store.close(); store = openStore(join(home, 'work.db')) },
		cleanup() { store.close(); if (priorHome === undefined) delete process.env.MW_HOME; else process.env.MW_HOME = priorHome; rmSync(root, { recursive: true, force: true }) },
	}
}

test('baseline: an unregistered historical ruling disappears from fresh correction packets', async () => {
	const t = setup()
	try {
		assert.equal((await t.run(drive(t.item.id, { prescriptions }))).hold?.code, 'arbiter_undetermined')
		await t.run(answer(t.item.id, grant, 'test'))
		await t.run(drive(t.item.id, { prescriptions }))
		const packets = t.calls.filter((call) => call.kind === 'execute' && call.job === 'test-plan').map((call) => JSON.parse(call.prompt))
		assert.equal(packets.length, 4)
		assert.match(packets[1].exchange.handoff, /Browser tooling is permitted/)
		assert.ok(!JSON.stringify(packets[2]).includes(grant), 'the first arbiter correction replaces the grant handoff')
		assert.ok(!JSON.stringify(packets[3]).includes(grant), 'the second correction still has no standing grant')
		assert.ok(t.store.events(t.item.id).some((event) => event.kind === 'ruling' && event.data.answer === grant), 'the grant remains historical evidence')
	} finally { t.cleanup() }
})

const registration = (requestId: string, extra: Record<string, unknown> = {}) => ({
	operation: 'set', requestId, key: 'browser-fixtures', revision: 0,
	text: grant, jobs: ['plan', 'test-plan', 'arbitrate'], scope: 'item',
	enteredBy: { kind: 'operator', label: 'Operator' }, source: { reference: 'Explicit browser and temporary-fixture grant for this work item.' }, nonsecret: true,
	...extra,
})

test('registered browser and fixture context survives restart and two corrections, then an explicit revocation', async () => {
	const t = setup((request, attempt) => {
		if (request.kind === 'intake' && request.job === 'test-plan' && attempt === 1) return { ...clear, unclear: ['Which candidate should the checks target?'] }
		if (request.kind === 'execute' && request.job === 'test-plan' && attempt === 4) return { checks: [{ id: 'C1', doneWhen: 'D1', run: 'exit 1' }] }
	})
	try {
		const receipt = await t.run(contextFact(t.item.id, registration('grant-browser')))
		assert.equal(receipt.revision, 1)
		assert.equal((await t.run(drive(t.item.id, { prescriptions }))).hold?.code, 'arbiter_undetermined')
		const originator = t.calls.find((call) => call.kind === 'originator' && call.job === 'test-plan')!
		assert.equal(JSON.parse(originator.prompt).contextFacts[0].event, receipt.event, 'the permitted planner originator sees the same registered fact')
		await t.run(answer(t.item.id, grant, 'test'))
		t.restart()
		const again = await t.run(contextFact(t.item.id, registration('grant-browser')))
		assert.equal(again.replayed, true)
		assert.equal(again.event, receipt.event, 'restart retry records no duplicate grant')
		const corrected = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(corrected.hold?.code, 'too_many_corrections')
		const testCalls = t.calls.filter((call) => call.job === 'test-plan' && ['intake', 'execute'].includes(call.kind))
		assert.equal(testCalls.filter((call) => call.kind === 'execute').length, 4)
		for (const call of testCalls) {
			const facts = JSON.parse(call.prompt).contextFacts
			assert.equal(facts.length, 1, `${call.kind} receives each key once`)
			assert.equal(facts[0].text, grant)
			assert.equal(facts[0].status, 'active')
			assert.equal(facts[0].event, receipt.event)
			assert.equal(facts[0].source.reference, registration('x').source.reference)
		}
		assert.ok(t.calls.filter((call) => call.job === 'implement').every((call) => !call.prompt.includes(grant)), 'the other maker never receives the restricted context')
		const revoked = await t.run(contextFact(t.item.id, { operation: 'revoke', requestId: 'revoke-browser', key: 'browser-fixtures', revision: 1, enteredBy: { kind: 'operator', label: 'Operator' }, source: { reference: 'Operator withdraws browser use.' }, nonsecret: true, reason: 'Browser grant withdrawn; use only the retained local value.' }))
		assert.equal(revoked.revision, 2)
		t.restart()
		await t.run(answer(t.item.id, 'Use the retained value without a browser.', 'test'))
		assert.equal((await t.run(drive(t.item.id, { prescriptions }))).status, 'paused')
		const last = JSON.parse(t.calls.findLast((call) => call.kind === 'execute' && call.job === 'test-plan')!.prompt).contextFacts[0]
		assert.equal(last.status, 'revoked')
		assert.equal(last.text, undefined, 'revocation is an explicit tombstone, without replaying the old grant')
		assert.equal(last.previousEvent, receipt.event)
		assert.equal(last.revocation.reason, 'Browser grant withdrawn; use only the retained local value.')
		assert.equal((await t.run(contextFacts(t.item.id))).facts[0].status, 'revoked')
	} finally { t.cleanup() }
})

test('fact updates are explicit CAS revisions with exact text, retry identity and durable provenance', async () => {
	const t = setup()
	try {
		const first = await t.run(contextFact(t.item.id, registration('first')))
		const revised = 'Browser capture is permitted only under ./fixtures.\r\nKeep this exact grant. λ'
		const update = registration('second', { operation: 'update', revision: 1, text: revised, source: { reference: 'Operator narrows the original grant.', event: first.event } })
		const second = await t.run(contextFact(t.item.id, update))
		assert.equal(second.revision, 2)
		assert.equal((await t.run(contextFact(t.item.id, update))).event, second.event)
		assert.equal((await t.run(contextFact(t.item.id, Object.fromEntries(Object.entries(update).reverse())))).event, second.event, 'JSON object order does not change retry identity')
		await assert.rejects(t.run(contextFact(t.item.id, registration('stale', { operation: 'update', revision: 1 }))), /context_fact_revision/)
		await assert.rejects(t.run(contextFact(t.item.id, { ...update, text: 'Different request using the same identity.' })), /request ID was already used/)
		await assert.rejects(t.run(contextFact(t.item.id, registration('secret', { nonsecret: false }))), /invalid_context_fact/)
		await assert.rejects(t.run(contextFact(t.item.id, registration('unknown-job', { key: 'invalid', jobs: ['not-a-job'] }))), /context_fact_unknown_job/)
		const facts = contextFactsFor(t.store, t.store.get(t.item.id)!, 'test-plan', Date.now())
		assert.equal(facts.length, 1)
		assert.equal(facts[0].text, revised)
		assert.equal(facts[0].previousEvent, first.event)
		assert.equal(facts[0].source.event, first.event)
		assert.equal(t.store.events(t.item.id).filter((event) => event.kind === 'context-fact').length, 2)
	} finally { t.cleanup() }
})

test('descendant inheritance is explicit, bounded to the workspace and overridden by nearer keyed facts', async () => {
	const t = setup()
	try {
		const child = t.store.create({ title: 'Child', objective: 'Child work', source: 'Child source', workspace: t.workspace, discovery: t.item.id })
		const grandchild = t.store.create({ title: 'Grandchild', objective: 'Nested fix', source: 'Fix source', workspace: t.workspace, parent: child.id })
		const other = t.store.create({ title: 'Elsewhere', objective: 'Other project', source: 'Other source', workspace: join(t.root, 'other'), parent: t.item.id })
		const sibling = t.store.create({ title: 'Unrelated', objective: 'Other work', source: 'Other source', workspace: t.workspace })
		await t.run(contextFact(t.item.id, registration('local-only')))
		assert.deepEqual(contextFactsFor(t.store, child, 'test-plan', Date.now()), [], 'item scope never inherits implicitly')
		await t.run(contextFact(t.item.id, registration('explicit-inheritance', { operation: 'update', revision: 1, scope: 'descendants' })))
		assert.equal(contextFactsFor(t.store, grandchild, 'test-plan', Date.now())[0].text, grant)
		assert.deepEqual(contextFactsFor(t.store, other, 'test-plan', Date.now()), [])
		assert.deepEqual(contextFactsFor(t.store, sibling, 'test-plan', Date.now()), [])
		await t.run(contextFact(child.id, registration('nearer', { text: 'Use only the local fixture.', scope: 'descendants' })))
		const own = contextFactsFor(t.store, grandchild, 'test-plan', Date.now())
		assert.equal(own.length, 1)
		assert.equal(own[0].text, 'Use only the local fixture.')
		await t.run(contextFact(child.id, { operation: 'revoke', requestId: 'nearer-revoked', key: 'browser-fixtures', revision: 1, enteredBy: { kind: 'operator', label: 'Operator' }, source: { reference: 'Withdraw inherited use.' }, nonsecret: true, reason: 'Withdraw this grant.' }))
		assert.equal(contextFactsFor(t.store, grandchild, 'test-plan', Date.now())[0].status, 'revoked', 'an inherited tombstone prevents falling back to the older broader grant')
	} finally { t.cleanup() }
})

test('expiry and job visibility apply to the reader and receiving maker, including private source provenance', async () => {
	const t = setup()
	try {
		const expiresAt = '2026-10-30T12:00:00.000Z'
		await t.run(contextFact(t.item.id, registration('expiring', { expiresAt })))
		assert.equal(contextFactsFor(t.store, t.item, 'test-plan', Date.parse(expiresAt) - 1)[0].status, 'active')
		assert.equal(contextFactsFor(t.store, t.item, 'test-plan', Date.parse(expiresAt))[0].status, 'expired')
		assert.deepEqual(contextFactsFor(t.store, t.item, 'plan', Date.now(), 'implement'), [], 'an originator serving the other maker cannot retrieve a restricted fact')
		t.store.note(t.item.id, 'nq-answer', { job: 'implement', answer: 'Private implementation detail.' })
		const privateEvent = t.store.events(t.item.id).at(-1)!.seq
		await assert.rejects(t.run(contextFact(t.item.id, registration('private-leak', { key: 'private', source: { reference: 'Implementation exchange', event: privateEvent }, jobs: ['test-plan'] }))), /context_fact_maker_isolation/)
		const own = await t.run(contextFact(t.item.id, registration('private-own', { key: 'private', source: { reference: 'Implementation exchange', event: privateEvent }, jobs: ['implement'] })))
		assert.equal(contextFactsFor(t.store, t.item, 'implement', Date.now())[0].sourceJob, 'implement')
		assert.ok(contextFactsFor(t.store, t.item, 'test-plan', Date.now()).every((fact) => fact.key !== 'private'))
		await assert.rejects(t.run(contextFact(t.item.id, registration('private-update-leak', { key: 'private', operation: 'update', revision: 1, jobs: ['test-plan'] }))), /context_fact_maker_isolation/, 'changing provenance text cannot erase the key\'s private origin')
		await assert.rejects(t.run(contextFact(t.item.id, registration('private-indirect-leak', { key: 'private-copy', source: { reference: 'Registered private context', event: own.event }, jobs: ['test-plan'] }))), /context_fact_maker_isolation/, 'referencing another fact retains its private source boundary')
		await assert.rejects(t.run(contextFact(t.item.id, { operation: 'revoke', requestId: 'private-revocation-leak', key: 'browser-fixtures', revision: 1, enteredBy: { kind: 'operator', label: 'Operator' }, source: { reference: 'Implementation exchange', event: privateEvent }, nonsecret: true, reason: 'A private reason must not enter the other maker\'s tombstone.' })), /context_fact_maker_isolation/)
	} finally { t.cleanup() }
})

test('CLI explicitly registers, updates, lists and revokes facts without moving work', () => {
	const t = setup()
	try {
		const input = join(t.root, 'fact.json')
		const cli = (...args: string[]) => {
			const result = spawnSync(process.execPath, [join(import.meta.dirname, '../src/cli.ts'), ...args], { cwd: t.workspace, env: { ...process.env, MW_STORE: t.store.path, MW_AUTORUN: '0' }, encoding: 'utf8' })
			assert.equal(result.status, 0, result.stderr)
			return JSON.parse(result.stdout)
		}
		const before = t.store.get(t.item.id)
		writeFileSync(input, JSON.stringify(registration('cli-set')))
		assert.equal(cli('context-fact', String(t.item.id), '--input-file', input).revision, 1)
		writeFileSync(input, JSON.stringify(registration('cli-update', { operation: 'update', revision: 1, text: 'Local screenshots only.' })))
		assert.equal(cli('context-fact', String(t.item.id), '--input-file', input).revision, 2)
		assert.equal(cli('context-fact', String(t.item.id)).facts[0].text, 'Local screenshots only.')
		writeFileSync(input, JSON.stringify({ operation: 'revoke', requestId: 'cli-revoke', key: 'browser-fixtures', revision: 2, enteredBy: { kind: 'operator', label: 'Operator' }, source: { reference: 'Operator withdraws screenshots.' }, nonsecret: true, reason: 'Capture complete.' }))
		assert.equal(cli('context-fact', String(t.item.id), '--input-file', input).revision, 3)
		assert.equal(cli('context-fact', String(t.item.id)).facts[0].status, 'revoked')
		assert.deepEqual(t.store.get(t.item.id), before, 'saving facts does not alter the delivery state or release a hold')
		assert.equal(t.store.runner(), null)
	} finally { t.cleanup() }
})

test('saved artifact provenance keeps standing facts private to each real maker role', async () => {
	const t = setup()
	try {
		for (const [role, other] of [['implement', 'test-plan'], ['test-plan', 'implement']] as const) {
			preserveArtifact(t.store, t.item, role, `Private ${role} fixture bytes.`, 'fixture-base')
			const event = t.store.events(t.item.id).at(-1)!
			assert.equal(event.kind, 'artifact-saved')
			assert.equal(event.data.job, undefined, 'exercise the actual persisted role-only event')
			const source = { reference: `${role} saved artifact`, event: event.seq }
			const key = `artifact-${role}`
			await assert.rejects(t.run(contextFact(t.item.id, registration(`${key}-leak`, { key, jobs: [other], source }))), /context_fact_maker_isolation/)
			const own = await t.run(contextFact(t.item.id, registration(`${key}-own`, { key, jobs: ['plan', role], source })))
			assert.equal(contextFactsFor(t.store, t.item, role, Date.now()).find(f => f.key === key)?.sourceJob, role)
			assert.ok(contextFactsFor(t.store, t.item, other, Date.now()).every(f => f.key !== key))
			assert.ok(contextFactsFor(t.store, t.item, 'plan', Date.now(), other).every(f => f.key !== key), 'an originator serving the opposing maker stays blind')
			await assert.rejects(t.run(contextFact(t.item.id, registration(`${key}-update`, { key, operation: 'update', revision: 1, jobs: [other] }))), /context_fact_maker_isolation/, 'an update cannot remove the private origin')
			await assert.rejects(t.run(contextFact(t.item.id, registration(`${key}-copy`, { key: `${key}-copy`, jobs: [other], source: { reference: 'Private standing fact', event: own.event } }))), /context_fact_maker_isolation/)
		}
	} finally { t.cleanup() }
})
