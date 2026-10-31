import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'
import { Effect } from 'effect'
import { TestClock } from 'effect/testing'
import { API_SCHEMAS, contextOf, createApi, OPENAPI, revisionOf } from '../src/api.ts'
import { MadeWellError } from '../src/errors.ts'
import { qaCase, qaCases, qaCreateCase, qaExport, qaLink, qaObserve, qaObservations, qaReviseCase, qaRun, qaRuns, qaSnapshot, qaStartRun, qaVerdict } from '../src/qa.ts'
import { openStore, Store } from '../src/store.ts'

// Every result below is labelled fixture data, never evidence that Arc or another product passed.
// Public HTTP/CLI fixtures follow api.test.ts; no implementation helper or worker call order is asserted.
const root = mkdtempSync(join(tmpdir(), 'mw-qa-'))
after(() => rmSync(root, { recursive: true, force: true }))
const operator = { kind: 'operator', label: 'fixture operator' } as const
const agent = { kind: 'agent', label: 'test architect' } as const
const instructions = (fields = {}) => ({
	title: '  Fixture 50%_Draft 😀  ', area: 'Drafts', change: 'Preserve café\nexactly; not an Arc result',
	sourceRefs: [{ label: 'Fixture source', ref: 'fixture:qa/draft#α' }], prerequisites: '', testData: '  e\u0301 ≠ é\r\n  ',
	actions: ['  Enter asymmetric text 😀  ', 'Reload once', 'Compare exact whitespace'], expected: 'The same text remains\n  including trailing space  ', ...fields,
})
const note = (revision = 0, fields = {}) => ({
	requestId: randomUUID(), revision, kind: 'note' as const, enteredBy: agent, claimedVerifier: null, observedAt: null,
	actual: '', reproduction: '', notes: '  fixture note\n😀  ', evidence: [], reportedResult: null, ...fields,
})
const verdict = (revision = 0, state: 'untested' | 'passed' | 'failed' | 'needs-refinement' = 'passed', fields = {}) => ({
	requestId: randomUUID(), revision, enteredBy: operator, attestation: 'operator-manual-verdict' as const,
	verdict: state, actual: state === 'untested' ? '' : `Labelled fixture: ${state}`, reproduction: '', notes: '', evidence: [], ...fields,
})
type Response = { status: number; body: any; headers: Headers }

async function setup(existing?: string, seed = true) {
	const dir = existing ?? mkdtempSync(join(root, 'case-'))
	const path = join(dir, 'madewell.db')
	const workspace = join(dir, 'disposable-non-git')
	let store: ReturnType<typeof openStore> | undefined
	const open = (create = false) => {
		if (!store && (create || existsSync(path))) store = openStore(path)
		return store
	}
	if (!existing && seed) {
		mkdirSync(workspace)
		open(true)!.create({ title: 'Manual QA fixture anchor', objective: 'Record fixture QA, do not schedule', source: 'Labelled fixture, not Arc', workspace, status: 'completed' })
	}
	let wakes = 0
	const api = createApi({ path, open, wake: async () => { wakes++ } })
	const server = createServer((req, res) => { void api(req, res) })
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
	const token = (await (await fetch(`${url}/api/v1/session`)).json()).csrfToken as string
	const headers = { Origin: url, 'Content-Type': 'application/json', 'X-MW-CSRF': token }
	const get = async (route: string): Promise<Response> => {
		const r = await fetch(`${url}${route.startsWith('/api/') ? route : `/api/v1${route}`}`)
		return { status: r.status, body: await r.json(), headers: r.headers }
	}
	const raw = (route: string, body: string | Buffer, override: Record<string, string> = {}): Promise<Response> => new Promise((resolve, reject) => {
		const req = request(`${url}/api/v1${route}`, { method: 'POST', headers: { ...headers, ...override } }, (res) => {
			let text = ''
			res.on('data', (chunk) => { text += String(chunk) })
			res.on('end', () => { try { resolve({ status: res.statusCode!, body: JSON.parse(text), headers: new Headers(Object.entries(res.headers).map(([k, v]) => [k, String(v)])) }) } catch (e) { reject(e) } })
		})
		req.on('error', reject)
		req.end(body)
	})
	const post = async (route: string, value: unknown, override = {}) => {
		const items = open()?.list() ?? []
		const calls = open()?.calls() ?? []
		const result = await raw(route, JSON.stringify(value), override)
		assert.deepEqual(open()?.list() ?? [], items, `${route} must not change work or queue membership`)
		assert.deepEqual(open()?.calls() ?? [], calls, `${route} must not invoke a worker`)
		assert.equal(open()?.runner() ?? null, null)
		assert.equal(wakes, 0)
		return result
	}
	const create = (fields = {}) => ({ requestId: randomUUID(), workItem: 1, workspace, enteredBy: agent, instructions: instructions(), ...fields })
	const start = (caseId: number, caseRevision = 1, fields = {}) => ({
		requestId: randomUUID(), workItem: 1, workspace, enteredBy: operator, application: 'Labelled fixture application',
		environment: 'Local fixture only', version: { kind: 'unknown' as const }, cases: [{ caseId, caseRevision }], ...fields,
	})
	const run = async <A, E>(effect: Effect.Effect<A, E, Store>) => {
		const items = open()!.list()
		const calls = open()!.calls()
		const result = await Effect.runPromise(effect.pipe(Effect.provideService(Store, open()!)))
		assert.deepEqual(open()!.list(), items, 'QA service must not change work')
		assert.deepEqual(open()!.calls(), calls, 'QA service must not invoke workers')
		assert.equal(open()!.runner(), null)
		return result
	}
	const mw = (...args: string[]) => {
		const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('MW_'))), MW_HOME: dir, MW_AUTORUN: '0', NODE_NO_WARNINGS: '1' }
		const r = spawnSync(process.execPath, [join(import.meta.dirname, '../src/cli.ts'), ...args], { cwd: dir, env, encoding: 'utf8', maxBuffer: 4 << 20 })
		assert.ifError(r.error)
		assert.equal(r.signal, null)
		return { code: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr ? JSON.parse(r.stderr) : null }
	}
	const input = (body: unknown) => { const file = join(dir, `${randomUUID()}.json`); writeFileSync(file, JSON.stringify(body)); return file }
	return { dir, path, workspace, open, get, post, raw, create, start, run, mw, input, url, headers, wakes: () => wakes,
		close: async () => { await new Promise<void>((resolve) => server.close(() => resolve())); store?.close() } }
}
type Fixture = Awaited<ReturnType<typeof setup>>

function accepted(r: Response, status = 200) {
	assert.equal(r.status, status, JSON.stringify(r.body))
	assert.equal(r.body.apiVersion, '1')
	assert.equal(r.body.accepted, true)
	assert.ok(Number.isSafeInteger(r.body.receipt.id) && r.body.receipt.id > 0)
	assert.ok(Number.isSafeInteger(r.body.receipt.event) && r.body.receipt.event > 0)
	assert.match(r.body.links.read, /^\/api\/v1\/qa\//)
	return r.body
}
function problem(r: Response, status: number, reason: string) {
	assert.equal(r.status, status, JSON.stringify(r.body))
	assert.equal(r.body.reason, reason)
	assert.equal(r.headers.get('content-type'), 'application/problem+json')
	assert.equal(r.body.recovery.preserveDraft, true)
	assert.ok(r.body.next.length > 0)
	return r.body
}
async function entry(t: Fixture) {
	const c = accepted(await t.post('/qa/cases', t.create()), 201)
	const r = accepted(await t.post('/qa/runs', t.start(c.receipt.id)), 201)
	return { caseId: c.receipt.id as number, runId: r.receipt.id as number, route: `/qa/runs/${r.receipt.id}/cases/${c.receipt.id}` }
}
// Search structured evidence without asserting its private nesting or incidental field ordering.
function contains(value: unknown, expected: unknown): boolean {
	try { assert.deepEqual(value, expected); return true } catch { /* descend through evidence */ }
	return value !== null && typeof value === 'object' && Object.values(value).some((v) => contains(v, expected))
}
const errorContext = (error: MadeWellError) => error.context as { status: number; reason: string; facts: Record<string, unknown> }

test('Q1/Q2/Q10: service cases preserve exact instructions, immutable revisions and legacy records across restart', async () => {
	let t = await setup()
	try {
		const store = t.open()!
		store.note(1, 'fixture-before-qa', { exact: '  old evidence 😀  ' })
		const oldItem = store.get(1)!
		const oldEvents = store.events(1)
		store.operatorRequest('fixture-operator-request', 'unchanged', () => ({ item: 1, revision: revisionOf(oldItem), event: oldEvents.at(-1)!.seq }))
		store.recordCall({ item: 1, kind: 'execute', job: 'fixture', profile: 'test architect', card: { harness: 'amp', provider: 'fixture', account: 'fixture', model: 'fixture', effort: 'low' }, system: 'fixture', prompt: 'fixture', outcome: 'ok', output: '{}', error: null, raw: '{}', started: oldItem.created, ms: 1 })
		const oldCalls = store.calls(1)
		const body = t.create()
		const created = await t.run(qaCreateCase(body))
		const id = created.receipt.id
		assert.equal(created.receipt.revision, 1)
		assert.equal(created.receipt.resource, 'case')
		assert.equal(created.receipt.caseId, null)
		assert.deepEqual((await t.run(qaCase(id, {}))).revision.instructions, body.instructions)
		const changed = { requestId: randomUUID(), revision: 1, enteredBy: operator, instructions: instructions({ title: 'Revised β', actions: ['Second recipe', 'Then first recipe'] }) }
		const revised = await t.run(qaReviseCase(id, changed))
		assert.equal(revised.receipt.revision, 2)
		assert.deepEqual((await t.run(qaCase(id, { revision: 1 }))).revision.instructions, body.instructions)
		assert.deepEqual((await t.run(qaCase(id, {}))).revision.instructions, changed.instructions)
		assert.equal((await t.run(qaCase(id, {}))).case.currentRevision, 2)
		assert.deepEqual(store.get(1), oldItem)
		assert.deepEqual(store.calls(1), oldCalls)
		assert.deepEqual(store.events(1).slice(0, oldEvents.length), oldEvents)
		assert.equal(store.list().length, 1)
		assert.equal(store.runner(), null)
		assert.ok(store.events(1).slice(oldEvents.length).every((e) => /^(qa-|trace-)/.test(e.kind)))
		await t.close(); t = await setup(t.dir)
		assert.deepEqual((await t.run(qaCase(id, { revision: 1 }))).revision.instructions, body.instructions)
		assert.deepEqual((await t.run(qaReviseCase(id, changed))).receipt, { ...revised.receipt, replayed: true })
		assert.deepEqual((await t.run(qaCreateCase(body))).receipt, { ...created.receipt, replayed: true })
		assert.deepEqual(t.open()!.get(1), oldItem)
		assert.deepEqual(t.open()!.calls(1), oldCalls)
		assert.equal(t.open()!.operatorRequest('fixture-operator-request', 'unchanged', () => { assert.fail('existing operator receipt must replay') }).replayed, true)
		const mark = t.open()!.mark()
		await t.run(qaCases({})); await t.run(qaRuns({})); await t.run(qaCase(id, {}))
		contextOf(t.open()!, 1)
		assert.deepEqual(t.open()!.mark(), mark)
		assert.equal(t.wakes(), 0)
	} finally { await t.close() }
})

test('Q1/Q8: empty reads never initialize a disk store; missing anchors never create hidden work', async () => {
	const t = await setup(undefined, false)
	try {
		for (const route of ['/qa/cases', '/qa/runs']) assert.deepEqual((await t.get(route)).body, { apiVersion: '1', items: [], nextAfter: null, hasMore: false })
		for (const command of ['qa-cases', 'qa-runs']) assert.deepEqual(t.mw(command).out, { apiVersion: '1', items: [], nextAfter: null, hasMore: false })
		assert.equal((await t.get('/qa/cases/99')).status, 404)
		assert.equal((await t.get('/qa/runs/99')).status, 404)
		assert.equal(existsSync(t.path), false)
		const failed = await t.post('/qa/cases', t.create())
		assert.equal(failed.body.code, 'item_not_found')
		assert.equal(existsSync(t.path), false)
	} finally { await t.close() }
})

test('Q1/Q8: case filters are literal, latest-revision, AND-combined and paged in ascending ID order', async () => {
	const t = await setup()
	try {
		const a = accepted(await t.post('/qa/cases', t.create()), 201).receipt.id
		const b = accepted(await t.post('/qa/cases', t.create({ instructions: instructions({ title: 'No wildcard', area: 'Other', change: 'ONLY NEEDLE here' }) })), 201).receipt.id
		const c = accepted(await t.post('/qa/cases', t.create({ instructions: instructions({ title: '50%_draft second', area: 'Drafts' }) })), 201).receipt.id
		assert.deepEqual((await t.run(qaCases({ q: '%_' }))).items.map((i) => i.id), [a, c])
		assert.deepEqual((await t.run(qaCases({ q: 'only needle', area: 'Other', workspace: t.workspace, workItem: 1 }))).items.map((i) => i.id), [b])
		assert.deepEqual((await t.run(qaCases({ q: 'only needle', area: 'Drafts' }))).items, [])
		const first = await t.run(qaCases({ limit: 2 }))
		assert.deepEqual(first.items.map((i) => i.id), [a, b]); assert.equal(first.hasMore, true); assert.equal(first.nextAfter, b)
		const last = await t.run(qaCases({ after: first.nextAfter!, limit: 2 }))
		assert.deepEqual(last.items.map((i) => i.id), [c]); assert.equal(last.hasMore, false); assert.equal(last.nextAfter, null)
		await t.run(qaReviseCase(a, { requestId: randomUUID(), revision: 1, enteredBy: agent, instructions: instructions({ title: 'Renamed', change: 'Fresh', area: 'New' }) }))
		assert.deepEqual((await t.run(qaCases({ q: '%_' }))).items.map((i) => i.id), [c])
		assert.equal('status' in (await t.run(qaCase(a, {}))).case, false, 'a case has no global manual pass')
	} finally { await t.close() }
})

test('Q3/Q4/Q11: runs pin instructions, explicit versions and order; revisions and retests never copy a verdict', async () => {
	let t = await setup()
	try {
		const { caseId, runId, route } = await entry(t)
		const original = await t.run(qaRun(runId))
		assert.deepEqual(original.run.version, { kind: 'unknown' })
		assert.equal(original.entries[0]!.status, 'untested'); assert.equal(original.entries[0]!.entryRevision, 0)
		assert.equal(original.entries[0]!.latestVerdictId, null)
		accepted(await t.post(`${route}/verdicts`, verdict()))
		await t.run(qaReviseCase(caseId, { requestId: randomUUID(), revision: 1, enteredBy: agent, instructions: instructions({ title: 'New instructions', area: 'Changed area' }) }))
		const old = await t.run(qaRun(runId))
		assert.deepEqual(old.run, original.run)
		assert.equal(old.entries[0]!.title, instructions().title)
		assert.equal(old.entries[0]!.area, 'Drafts')
		assert.equal(old.entries[0]!.caseRevision, 1)
		assert.equal(old.entries[0]!.currentCaseRevision, 2)
		assert.equal(old.entries[0]!.outdated, true)
		assert.equal(old.entries[0]!.status, 'passed')
		assert.deepEqual((await t.get(old.entries[0]!.instructionsHref)).body.revision.instructions, instructions())
		assert.equal((await t.get(old.entries[0]!.observationsHref)).body.items.length, 1)
		for (const revision of [2, 1]) {
			const r = await t.run(qaStartRun(t.start(caseId, revision, { version: { kind: 'known', value: '  fixture-build-β  ', source: { label: 'Explicit operator input', ref: 'fixture:build/β' } } })))
			const next = await t.run(qaRun(r.receipt.id))
			assert.notEqual(next.run.id, runId)
			assert.equal(next.entries[0]!.status, 'untested'); assert.equal(next.entries[0]!.entryRevision, 0)
			assert.equal((await t.run(qaObservations(r.receipt.id, {}))).items.length, 0)
			assert.deepEqual(next.run.version, { kind: 'known', value: '  fixture-build-β  ', source: { label: 'Explicit operator input', ref: 'fixture:build/β' } })
		}
		const snapshot = await t.run(qaSnapshot(runId))
		assert.equal(snapshot.schemaVersion, 1)
		assert.deepEqual(snapshot.run, old.run)
		assert.deepEqual(snapshot.entries[0]!.instructions, (await t.run(qaCase(caseId, { revision: 1 }))).revision)
		assert.deepEqual(snapshot.entries[0]!.observations, (await t.run(qaObservations(runId, {}))).items)
		await t.close(); rmSync(t.workspace, { recursive: true }); t = await setup(t.dir)
		assert.deepEqual(await t.run(qaRun(runId)), old)
		assert.deepEqual(await t.run(qaSnapshot(runId)), snapshot)
		const before = t.open()!.mark()
		await t.run(qaSnapshot(runId)); await t.get(`/qa/runs/${runId}`)
		assert.deepEqual(t.open()!.mark(), before)
	} finally { await t.close() }
})

test('Q4/Q5: all four states retain append-only evidence; actor labels and reported passes never attest', async () => {
	const t = await setup()
	try {
		const { caseId, runId, route } = await entry(t)
		let revision = 0
		for (const kind of ['historical', 'technical'] as const) {
			const body = note(revision, { kind, enteredBy: kind === 'historical' ? { kind: 'import', label: 'operator' } : { kind: 'agent', label: 'operator' }, claimedVerifier: operator,
				observedAt: '2020-02-29T12:34:56+02:00', actual: 'Source claimed a fixture pass; no execution witnessed', reportedResult: 'passed', evidence: [{ label: 'Untrusted opaque text', ref: 'javascript:fixture-only' }] })
			const result = accepted(await t.post(`${route}/observations`, body))
			assert.equal(result.receipt.revision, ++revision)
			assert.equal((await t.run(qaRun(runId))).entries[0]!.status, 'untested')
			const saved = (await t.run(qaObservations(runId, {}))).items.at(-1)!
			assert.equal(saved.verdict, null); assert.equal(saved.reportedResult, 'passed')
			assert.deepEqual(saved.enteredBy, body.enteredBy); assert.deepEqual(saved.claimedVerifier, operator)
			assert.equal(saved.observedAt, body.observedAt); assert.deepEqual(saved.evidence, body.evidence)
		}
		for (const state of ['passed', 'failed', 'needs-refinement', 'untested'] as const) {
			const r = await t.run(qaVerdict(runId, caseId, verdict(revision, state)))
			assert.equal(r.receipt.revision, ++revision)
			const manual = (await t.run(qaObservations(runId, {}))).items.at(-1)!
			assert.equal(manual.kind, 'manual-verdict'); assert.equal(manual.verdict, state); assert.equal(manual.reportedResult, null)
			assert.deepEqual(manual.claimedVerifier, operator); assert.equal(manual.observedAt, manual.at)
			const body = note(revision, { actual: '  actual α  ', reproduction: 'Step B\nStep A', notes: 'Distinct notes\r\n', evidence: [{ label: 'Fixture artifact', ref: 'fixture:external/unavailable' }] })
			await t.run(qaObserve(runId, caseId, body)); revision++
			const detail = await t.run(qaRun(runId))
			assert.equal(detail.entries[0]!.status, state); assert.equal(detail.entries[0]!.entryRevision, revision)
			assert.equal(detail.entries[0]!.latestVerdictId, manual.id)
			const saved = (await t.run(qaObservations(runId, {}))).items.at(-1)!
			for (const key of ['actual', 'reproduction', 'notes', 'evidence'] as const) assert.deepEqual(saved[key], body[key])
			await t.run(qaObserve(runId, caseId, note(revision, { notes: '' }))); revision++
			const cleared = await t.run(qaRun(runId))
			assert.equal(cleared.entries[0]!.status, state)
			assert.equal(cleared.entries[0]!.latestVerdictId, manual.id)
			assert.equal((await t.run(qaObservations(runId, {}))).items.at(-1)!.notes, '')
		}
		const history = await t.run(qaObservations(runId, { limit: 3 }))
		assert.equal(history.items.length, 3); assert.equal(history.hasMore, true)
		const rest = await t.run(qaObservations(runId, { after: history.nextAfter!, caseId }))
		assert.equal(history.items.length + rest.items.length, revision)
		assert.deepEqual([...history.items, ...rest.items].map((o) => o.entryRevision), Array.from({ length: revision }, (_, i) => i + 1))
	} finally { await t.close() }
})

test('clearing saved QA notes retains exact history, replay identity and stale-write protection', async () => {
	let t = await setup()
	try {
		const { runId, caseId, route } = await entry(t)
		problem(await t.post(`${route}/observations`, note(0, { notes: '' })), 400, 'invalid_input')
		problem(await t.post(`${route}/observations`, note(1, { notes: '' })), 409, 'stale_revision')
		const original = note()
		accepted(await t.post(`${route}/observations`, original))
		const clear = note(1, { notes: '' })
		const receipt = accepted(await t.post(`${route}/observations`, clear)).receipt
		assert.equal(receipt.revision, 2)
		assert.equal((await t.run(qaRun(runId))).entries[0]!.status, 'untested')
		for (const fields of [{ notes: ' \n ' }, { kind: 'technical' }, { kind: 'historical' }, { notes: null }]) {
			problem(await t.post(`${route}/observations`, note(2, { notes: '', ...fields })), 400, 'invalid_input')
		}
		await t.close(); t = await setup(t.dir)
		assert.deepEqual(accepted(await t.post(`${route}/observations`, clear)).receipt, { ...receipt, replayed: true })
		problem(await t.post(`${route}/observations`, { ...clear, notes: 'changed' }), 409, 'request_id_conflict')
		problem(await t.post(`${route}/observations`, { ...clear, requestId: randomUUID() }), 409, 'stale_revision')
		const saved = (await t.run(qaObservations(runId))).items
		assert.deepEqual(saved.map((o) => o.notes), [original.notes, ''])
		assert.deepEqual(saved.map((o) => o.entryRevision), [1, 2])
		assert.equal(t.mw('qa-observations', String(runId), '--case-id', String(caseId)).out.items.at(-1).notes, '')
	} finally { await t.close() }
})

test('Q2/Q6: two connections race receipts and CAS; rejected exact drafts survive replay and explicit review', async () => {
	const a = await setup(); const b = await setup(a.dir)
	try {
		const body = a.create()
		const raced = await Promise.all([a.post('/qa/cases', body), b.post('/qa/cases', body)])
		assert.deepEqual(raced.map((r) => r.status).sort(), [200, 201])
		const created = raced.find((r) => r.status === 201)!.body
		assert.equal((await a.run(qaCases({}))).items.length, 1)
		assert.deepEqual(a.open()!.events(1).filter((e) => e.kind.startsWith('qa-')).map((e) => e.seq), [created.receipt.event])
		const reordered = { instructions: Object.fromEntries(Object.entries(body.instructions).reverse()), enteredBy: { label: agent.label, kind: agent.kind }, workspace: body.workspace, workItem: 1, requestId: body.requestId }
		assert.deepEqual(accepted(await b.post('/qa/cases', reordered)).receipt, { ...created.receipt, replayed: true })
		problem(await b.post('/qa/cases', { ...body, instructions: instructions({ title: 'changed' }) }), 409, 'request_id_conflict')
		const caseId = created.receipt.id
		const run = accepted(await a.post('/qa/runs', a.start(caseId)), 201)
		const route = `/qa/runs/${run.receipt.id}/cases/${caseId}`
		const drafts = [note(0, { notes: '  writer α\n😀  ' }), verdict(0, 'failed', { actual: '  writer β failed\r\n  ' })]
		const results = await Promise.all([a.post(`${route}/observations`, drafts[0]), b.post(`${route}/verdicts`, drafts[1])])
		assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
		const loser = results.findIndex((r) => r.status === 409)
		const rejected = problem(results[loser]!, 409, 'stale_revision')
		const conflict = a.open()!.events(1).find((e) => e.seq === rejected.context.facts.conflictEvent)!
		assert.ok(conflict); assert.equal(conflict.kind, 'qa-conflict'); assert.ok(contains(conflict.data, drafts[loser]))
		assert.equal(rejected.context.facts.expected, 0); assert.equal(rejected.context.facts.actual, 1)
		const retryRoute = `${route}/${loser === 0 ? 'observations' : 'verdicts'}`
		const retry = problem(await a.post(retryRoute, drafts[loser]), 409, 'stale_revision')
		assert.equal(retry.context.facts.conflictEvent, conflict.seq)
		assert.equal((await a.run(qaObservations(run.receipt.id, {}))).items.length, 1)
		accepted(await a.post(retryRoute, { ...drafts[loser], requestId: randomUUID(), revision: 1 }))
		assert.equal((await a.run(qaObservations(run.receipt.id, {}))).items.length, 2)
		problem(await a.post(`${route}/observations`, { ...note(2), requestId: body.requestId }), 409, 'request_id_conflict')
		const revised = { requestId: randomUUID(), revision: 1, enteredBy: agent, instructions: instructions({ title: 'reviewed update' }) }
		accepted(await a.post(`/qa/cases/${caseId}/revisions`, revised))
		const stale = { ...revised, requestId: randomUUID(), instructions: instructions({ title: '  rejected exact title 😀  ' }) }
		const failure = problem(await a.post(`/qa/cases/${caseId}/revisions`, stale), 409, 'stale_revision')
		assert.ok(contains(a.open()!.events(1).find((e) => e.seq === failure.context.facts.conflictEvent)!.data, stale))
		assert.equal((await a.run(qaCase(caseId, {}))).case.currentRevision, 2)
		const reopened = await setup(a.dir)
		try {
			const replayedConflict = problem(await reopened.post(`/qa/cases/${caseId}/revisions`, stale), 409, 'stale_revision')
			assert.equal(replayedConflict.context.facts.conflictEvent, failure.context.facts.conflictEvent)
			assert.equal((await reopened.run(qaCase(caseId, {}))).case.currentRevision, 2)
		} finally { await reopened.close() }
	} finally { await a.close(); await b.close() }
})

test('Q3/Q6/Q11: ordered multi-case runs have independent entry counters and snapshots, not a run-wide CAS', async () => {
	const a = await setup(); const b = await setup(a.dir)
	try {
		const one = accepted(await a.post('/qa/cases', a.create()), 201).receipt.id
		const two = accepted(await a.post('/qa/cases', a.create({ instructions: instructions({ title: 'Second fixture' }) })), 201).receipt.id
		const body = a.start(two, 1, { cases: [{ caseId: two, caseRevision: 1 }, { caseId: one, caseRevision: 1 }] })
		const id = accepted(await a.post('/qa/runs', body), 201).receipt.id
		const results = await Promise.all([a.post(`/qa/runs/${id}/cases/${two}/observations`, note()), b.post(`/qa/runs/${id}/cases/${one}/verdicts`, verdict())])
		results.forEach((r) => accepted(r))
		const snapshot = await a.run(qaSnapshot(id))
		assert.deepEqual(snapshot.entries.map((e) => [e.caseId, e.entryRevision, e.status, e.observations.length]), [[two, 1, 'untested', 1], [one, 1, 'passed', 1]])
		assert.deepEqual((await a.run(qaRuns({ caseId: one, workItem: 1, workspace: a.workspace }))).items.map((r) => r.id), [id])
		assert.equal((await a.run(qaRuns({ caseId: one }))).items[0]!.caseCount, 2)
		const latest = await a.run(qaRun(id))
		assert.deepEqual(latest.entries.map((e) => e.caseId), [two, one])
		const pending = note(1, { notes: 'UI pending save; exact uncertain retry' })
		const first = accepted(await a.post(`/qa/runs/${id}/cases/${two}/observations`, pending))
		assert.deepEqual(accepted(await b.post(`/qa/runs/${id}/cases/${two}/observations`, pending)).receipt, { ...first.receipt, replayed: true })
		problem(await a.post(`/qa/runs/${id}/cases/${one}/observations`, pending), 409, 'request_id_conflict')
		const stale = note(1, { notes: 'UI dirty newer draft kept until explicit review' })
		problem(await b.post(`/qa/runs/${id}/cases/${two}/observations`, stale), 409, 'stale_revision')
		assert.equal((await a.run(qaRun(id))).entries[0]!.entryRevision, 2, 'no automatic rebase')
	} finally { await a.close(); await b.close() }
})

test('Q2/Q3/Q5: closed nested inputs, safe IDs, bounds, pin relationships and manual authority reject without partial saves', async () => {
	const t = await setup()
	try {
		const { caseId, runId, route } = await entry(t)
		const badCreates = [
			t.create({ surprise: true }), t.create({ requestId: 'short' }), t.create({ workItem: 0 }), t.create({ workItem: Number.MAX_SAFE_INTEGER + 1 }),
			t.create({ enteredBy: { ...agent, authenticated: true } }), t.create({ enteredBy: { kind: 'operator', label: ' ' } }),
			t.create({ instructions: instructions({ extra: true }) }), t.create({ instructions: instructions({ sourceRefs: [{ label: 'x', ref: 'fixture:x', pass: true }] }) }),
			t.create({ instructions: instructions({ actions: [] }) }), t.create({ instructions: instructions({ actions: [' '] }) }),
			t.create({ instructions: instructions({ actions: Array(101).fill('action') }) }), t.create({ instructions: instructions({ actions: ['x'.repeat(2001)] }) }),
			t.create({ instructions: instructions({ title: 'x'.repeat(301) }) }), t.create({ instructions: instructions({ area: '' }) }),
			t.create({ instructions: instructions({ expected: 'x'.repeat(8001) }) }), t.create({ instructions: instructions({ sourceRefs: Array(51).fill({ label: 'x', ref: 'fixture:x' }) }) }),
		]
		for (const body of badCreates) problem(await t.post('/qa/cases', body), 400, 'invalid_input')
		const invalid = await t.run(Effect.flip(qaCreateCase(t.create({ instructions: instructions({ extra: 'must not be silently stripped' }) }))))
		assert.ok(invalid instanceof MadeWellError)
		assert.equal(errorContext(invalid).reason, 'invalid_input')
		problem(await t.post('/qa/cases', t.create({ workspace: '/wrong-workspace' })), 409, 'workspace_mismatch')
		assert.equal((await t.post('/qa/cases', t.create({ workItem: 99999 }))).body.code, 'item_not_found')
		for (const version of [{ kind: 'known' }, { kind: 'known', value: ' ', source: { label: 'x', ref: 'fixture:x' } }, { kind: 'unknown', value: 'inferred' }, { kind: 'known', value: 'x', source: { label: 'x', ref: 'fixture:x', authority: true } }]) {
			problem(await t.post('/qa/runs', t.start(caseId, 1, { version })), 400, 'invalid_input')
		}
		for (const cases of [[], [{ caseId, caseRevision: 1 }, { caseId, caseRevision: 1 }], [{ caseId, caseRevision: 1, status: 'passed' }]]) problem(await t.post('/qa/runs', t.start(caseId, 1, { cases })), 400, 'invalid_input')
		problem(await t.post('/qa/runs', t.start(caseId, 999)), 404, 'not_found')
		const other = t.open()!.create({ title: 'Other workspace fixture', objective: 'Do not run', source: 'fixture', workspace: '/other-workspace' })
		const foreign = accepted(await t.post('/qa/cases', t.create({ workItem: other.id, workspace: other.workspace })), 201).receipt.id
		problem(await t.post('/qa/runs', t.start(foreign)), 409, 'workspace_mismatch')
		problem(await t.post(`/qa/runs/${runId}/cases/${foreign}/observations`, note()), 409, 'case_not_in_run')
		for (const body of [note(0, { verdict: 'passed' }), note(0, { attestation: 'operator-manual-verdict' }), note(0, { reportedResult: 'passed' }), note(0, { notes: '', evidence: [] }), note(0, { kind: 'historical', observedAt: '2025-02-30T12:00:00Z' }), note(0, { observedAt: 'yesterday' }), note(0, { evidence: [{ label: 'x', ref: 'fixture:x', extra: 1 }] }), note(0, { claimedVerifier: { ...operator, authenticated: true } }), note(-1), note(Number.MAX_SAFE_INTEGER + 1)]) {
			problem(await t.post(`${route}/observations`, body), 400, 'invalid_input')
		}
		for (const enteredBy of [agent, { kind: 'import', label: 'operator' }]) problem(await t.post(`${route}/verdicts`, verdict(0, 'passed', { enteredBy })), 403, 'manual_authority_required')
		for (const fields of [{ actual: ' ' }, { reportedResult: 'passed' }, { claimedVerifier: operator }, { observedAt: null }, { kind: 'manual-verdict' }, { unexpected: true }]) problem(await t.post(`${route}/verdicts`, verdict(0, 'passed', fields)), 400, 'invalid_input')
		assert.equal((await t.run(qaRun(runId))).entries[0]!.entryRevision, 0)
		assert.deepEqual((await t.run(qaObservations(runId, {}))).items, [])
		assert.equal((await t.run(qaCases({ workItem: 1 }))).items.length, 1)
		assert.equal((await t.run(qaRuns({}))).items.length, 1)
	} finally { await t.close() }
})

test('Q7: Clock drives accepted timestamps; retries preserve original receipt and observation times', async () => {
	const t = await setup()
	try {
		await Effect.runPromise(Effect.gen(function* () {
			yield* TestClock.setTime(Date.parse('2031-04-05T06:07:08.123Z'))
			const body = t.create()
			const c = yield* qaCreateCase(body)
			assert.equal(c.receipt.at, '2031-04-05T06:07:08.123Z')
			assert.equal((yield* qaCase(c.receipt.id, {})).case.createdAt, c.receipt.at)
			yield* TestClock.adjust(1234)
			const r = yield* qaStartRun(t.start(c.receipt.id))
			assert.equal((yield* qaRun(r.receipt.id)).run.startedAt, '2031-04-05T06:07:09.357Z')
			const pending = note()
			const saved = yield* qaObserve(r.receipt.id, c.receipt.id, pending)
			assert.equal((yield* qaObservations(r.receipt.id, {})).items[0]!.at, r.receipt.at)
			yield* TestClock.adjust(90_000)
			assert.deepEqual((yield* qaCreateCase(body)).receipt, { ...c.receipt, replayed: true })
			assert.deepEqual((yield* qaObserve(r.receipt.id, c.receipt.id, pending)).receipt, { ...saved.receipt, replayed: true })
		}).pipe(Effect.provideService(Store, t.open()!), Effect.provide(TestClock.layer())))
	} finally { await t.close() }
})

test('Q7: process death at the domain event rolls back every table; post-commit loss replays after restart', async () => {
	let t = await setup()
	try {
		const body = t.create()
		const qaUrl = new URL('../src/qa.ts', import.meta.url).href
		const storeUrl = new URL('../src/store.ts', import.meta.url).href
		// Test-only SQLite interception at the existing event insertion boundary. No production fault flag.
		const child = (crash: boolean, expression = `qa.qaCreateCase(${JSON.stringify(body)})`) => spawnSync(process.execPath, ['--input-type=module', '-e', `
import {DatabaseSync} from 'node:sqlite'; import {Effect} from 'effect';
import {openStore,Store} from ${JSON.stringify(storeUrl)}; import * as qa from ${JSON.stringify(qaUrl)};
const s=openStore(${JSON.stringify(t.path)});
${crash ? `const prepare=DatabaseSync.prototype.prepare; DatabaseSync.prototype.prepare=function(sql){ const statement=prepare.call(this,sql); if (/INSERT\\s+INTO\\s+events/i.test(sql)) { const run=statement.run.bind(statement); statement.run=(...args)=>{ const result=run(...args); if(args.some(v=>typeof v==='string'&&v.startsWith('qa-'))) process.exit(73); return result }; } return statement };` : ''}
await Effect.runPromise(${expression}.pipe(Effect.provideService(Store,s)));
process.exit(74);
`], { cwd: import.meta.dirname, encoding: 'utf8' })
		const crashed = child(true)
		assert.equal(crashed.status, 73, crashed.stderr)
		assert.deepEqual((await t.run(qaCases({}))).items, [])
		assert.equal(t.open()!.events(1).filter((e) => e.kind.startsWith('qa-')).length, 0)
		const db = new DatabaseSync(t.path)
		try {
			for (const table of ['qa_cases', 'qa_case_revisions', 'qa_runs', 'qa_observations', 'qa_requests']) assert.equal((db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n, 0, table)
		} finally { db.close() }
		const committed = child(false)
		assert.equal(committed.status, 74, committed.stderr)
		const event = t.open()!.events(1).find((e) => e.kind.startsWith('qa-'))!
		assert.ok(event)
		await t.close(); t = await setup(t.dir)
		const replay = accepted(await t.post('/qa/cases', body))
		assert.equal(replay.receipt.replayed, true); assert.equal(replay.receipt.event, event.seq)
		assert.equal((await t.run(qaCases({}))).items.length, 1)
		assert.equal(t.open()!.events(1).filter((e) => e.kind.startsWith('qa-')).length, 1)
		const caseId = replay.receipt.id
		const r = accepted(await t.post('/qa/runs', t.start(caseId)), 201)
		const operations: [string, string, unknown][] = [
			[`/qa/cases/${caseId}/revisions`, `qa.qaReviseCase(${caseId},`, { requestId: randomUUID(), revision: 1, enteredBy: operator, instructions: instructions({ title: 'Atomic fixture revision' }) }],
			['/qa/runs', 'qa.qaStartRun(', t.start(caseId)],
			[`/qa/runs/${r.receipt.id}/cases/${caseId}/observations`, `qa.qaObserve(${r.receipt.id},${caseId},`, note()],
			[`/qa/runs/${r.receipt.id}/cases/${caseId}/verdicts`, `qa.qaVerdict(${r.receipt.id},${caseId},`, verdict(1)],
		]
		for (const [route, expression, input] of operations) {
			const before = await t.run(qaSnapshot(r.receipt.id))
			const caseBefore = await t.run(qaCase(caseId, {}))
			const runsBefore = await t.run(qaRuns({}))
			const eventsBefore = t.open()!.events(1).filter((e) => e.kind.startsWith('qa-'))
			const aborted = child(true, `${expression}${JSON.stringify(input)})`)
			assert.equal(aborted.status, 73, aborted.stderr)
			assert.deepEqual(await t.run(qaSnapshot(r.receipt.id)), before)
			assert.deepEqual(await t.run(qaCase(caseId, {})), caseBefore)
			assert.deepEqual(await t.run(qaRuns({})), runsBefore)
			assert.deepEqual(t.open()!.events(1).filter((e) => e.kind.startsWith('qa-')), eventsBefore)
			const retried = accepted(await t.post(route, input), route === '/qa/runs' ? 201 : 200)
			assert.equal(retried.receipt.replayed, false, 'no success receipt survived rollback')
		}
	} finally { await t.close() }
})

test('Q7: real SQLite write rejection is a MadeWellError, never a leaked SQL error', async () => {
	const t = await setup()
	try {
		const db = new DatabaseSync(t.path)
		db.exec("CREATE TRIGGER fixture_reject_qa BEFORE INSERT ON qa_cases BEGIN SELECT RAISE(ABORT, 'fixture private SQL failure'); END")
		try {
			const error = await t.run(Effect.flip(qaCreateCase(t.create())))
			assert.ok(error instanceof MadeWellError)
			assert.equal(error.code, 'qa_request')
			assert.equal(errorContext(error).status, 500)
			assert.equal(errorContext(error).reason, 'storage_failed')
			assert.ok(error.next.length > 0)
			assert.deepEqual((await t.run(qaCases({}))).items, [])
			const r = problem(await t.post('/qa/cases', t.create()), 500, 'storage_failed')
			assert.ok(!JSON.stringify(r).includes('fixture private SQL failure'))
		} finally { db.exec('DROP TRIGGER fixture_reject_qa'); db.close() }
	} finally { await t.close() }
})

test('Q8/Q10/Q11: real CLI/API parity, cross-transport retries, discovery links and read-only context', async () => {
	const t = await setup()
	try {
		const beforeItem = t.open()!.get(1)!
		const body = t.create()
		const c = t.mw('qa-case-create', '--input-file', t.input(body))
		assert.equal(c.code, 0, JSON.stringify(c.err))
		const caseId = c.out.receipt.id
		assert.deepEqual(accepted(await t.post('/qa/cases', body)).receipt, { ...c.out.receipt, replayed: true })
		const r = t.start(caseId)
		const createdRun = accepted(await t.post('/qa/runs', r), 201)
		const runId = createdRun.receipt.id
		const replay = t.mw('qa-run-start', '--input-file', t.input(r))
		assert.equal(replay.code, 0, JSON.stringify(replay.err)); assert.deepEqual(replay.out.receipt, { ...createdRun.receipt, replayed: true })
		const observe = t.mw('qa-observe', String(runId), String(caseId), '--input-file', t.input(note()))
		assert.equal(observe.code, 0, JSON.stringify(observe.err))
		const manual = t.mw('qa-verdict', String(runId), String(caseId), '--input-file', t.input(verdict(1)))
		assert.equal(manual.code, 0, JSON.stringify(manual.err))
		const revision = t.mw('qa-case-revise', String(caseId), '--input-file', t.input({ requestId: randomUUID(), revision: 1, enteredBy: operator, instructions: instructions({ title: 'Revised via CLI' }) }))
		assert.equal(revision.code, 0, JSON.stringify(revision.err))
		const pairs: [string[], string][] = [
			[['qa-case', String(caseId)], `/qa/cases/${caseId}`], [['qa-case', String(caseId), '--revision', '1'], `/qa/cases/${caseId}?revision=1`],
			[['qa-cases', '--work-item', '1', '--limit', '1'], '/qa/cases?workItem=1&limit=1'], [['qa-runs', '--case-id', String(caseId)], `/qa/runs?caseId=${caseId}`],
			[['qa-run', String(runId)], `/qa/runs/${runId}`], [['qa-observations', String(runId), '--case-id', String(caseId), '--limit', '1'], `/qa/runs/${runId}/observations?caseId=${caseId}&limit=1`],
		]
		const mark = t.open()!.mark()
		for (const [command, route] of pairs) {
			const cli = t.mw(...command); assert.equal(cli.code, 0, JSON.stringify(cli.err))
			assert.deepEqual(cli.out, (await t.get(route)).body)
		}
		const discovery = (await t.get('')).body
		assert.equal(discovery.qaCases, '/api/v1/qa/cases'); assert.equal(discovery.qaRuns, '/api/v1/qa/runs')
		const context = contextOf(t.open()!, 1)
		assert.equal(context.evidence.qaCases, '/api/v1/qa/cases?workItem=1')
		assert.equal(context.evidence.qaRuns, '/api/v1/qa/runs?workItem=1')
		assert.equal(context.revision, revisionOf(beforeItem))
		assert.deepEqual(t.open()!.get(1), beforeItem)
		assert.deepEqual(t.open()!.mark(), mark)
		assert.equal(t.open()!.calls(1).length, 0); assert.equal(t.open()!.runner(), null); assert.equal(t.wakes(), 0)
		const missing = t.mw('qa-case-create', '--input-file', join(t.dir, 'absent.json'))
		assert.equal(missing.err.error, 'source_unreadable')
		for (const data of [Buffer.from([0xc3, 0x28]), Buffer.from('{'), Buffer.from(' '.repeat(65537))]) {
			const file = join(t.dir, 'invalid.json'); writeFileSync(file, data)
			assert.notEqual(t.mw('qa-case-create', '--input-file', file).code, 0)
		}
	} finally { await t.close() }
})

test('Q8: every POST family enforces existing security and body boundaries before revealing QA context', async () => {
	const t = await setup()
	try {
		const { caseId, route } = await entry(t)
		const routes: [string, unknown][] = [['/qa/cases', t.create()], [`/qa/cases/${caseId}/revisions`, { requestId: randomUUID(), revision: 1, enteredBy: agent, instructions: instructions() }], ['/qa/runs', t.start(caseId)], [`${route}/observations`, note()], [`${route}/verdicts`, verdict()], [`${route}/links`, { requestId: randomUUID(), revision: 0, enteredBy: agent, observationId: 1, target: { kind: 'reference', reference: { label: 'Fixture', ref: 'fixture:source' } } }]]
		for (const [path, body] of routes) {
			for (const [headers, status] of [
				[{ 'X-MW-CSRF': '' }, 403], [{ Origin: 'https://hostile.example' }, 403], [{ Origin: 'null' }, 403],
				[{ Host: 'hostile.example', 'X-Forwarded-Host': 'localhost' }, 403], [{ 'Sec-Fetch-Site': 'cross-site' }, 403],
				[{ 'Content-Type': 'text/plain' }, 415], [{ 'Content-Encoding': 'gzip' }, 415],
			] as [Record<string, string>, number][]) {
				const r = await t.post(path, body, headers)
				assert.equal(r.status, status, `${path}: ${JSON.stringify(r.body)}`)
				assert.equal(r.headers.get('content-type'), 'application/problem+json')
				assert.equal(r.body.task, null)
				assert.ok(!JSON.stringify(r.body).includes(instructions().title))
			}
			for (const body of ['{', Buffer.from([0xc3, 0x28])]) assert.equal((await t.raw(path, body)).status, 400, path)
			assert.equal((await t.raw(path, ' '.repeat(65537))).status, 413, path)
		}
		const before = t.open()!.mark()
		for (const route of ['/qa/cases?limit=1&limit=2', '/qa/cases?unknown=x', '/qa/cases?after=-1', '/qa/cases?limit=101', '/qa/cases?workItem=1.5', '/qa/cases?after=9007199254740992', '/qa/runs?caseId=1e0', '/qa/runs/1/observations?caseId=1&caseId=2', '/qa/cases/1?revision=1&revision=2']) problem(await t.get(route), 400, 'invalid_input')
		const method = await fetch(`${t.url}/api/v1/qa/cases`, { method: 'DELETE', headers: t.headers })
		assert.equal(method.status, 405)
		assert.deepEqual(method.headers.get('allow')!.split(',').map((s) => s.trim()).sort(), ['GET', 'POST'])
		assert.equal((await t.get('/qa/cases')).status, 200)
		assert.deepEqual(t.open()!.mark(), before)
	} finally { await t.close() }
})

test('Q8: each QA mutation route applies the ten-second streaming body deadline', { timeout: 20_000 }, async () => {
	const t = await setup()
	try {
		const routes = ['/qa/cases', '/qa/cases/1/revisions', '/qa/runs', '/qa/runs/1/cases/1/observations', '/qa/runs/1/cases/1/verdicts', '/qa/runs/1/cases/1/links']
		await Promise.all(routes.map((path) => new Promise<void>((resolve, reject) => {
			const req = request(`${t.url}/api/v1${path}`, { method: 'POST', headers: t.headers }, (res) => {
				res.resume(); res.on('end', () => { try { assert.equal(res.statusCode, 408, path); resolve() } catch (e) { reject(e) } finally { req.destroy() } })
			})
			req.on('error', reject); req.setTimeout(15_000, () => req.destroy(new Error('QA body deadline was not enforced')))
			req.write('{') // Deliberately no end; the server owns the bounded body deadline.
		})))
	} finally { await t.close() }
})

test('Q8/Q12: schemas and flat manual expose the same mutations and read projections', async () => {
	const t = await setup(undefined, false)
	try {
		const schemas = API_SCHEMAS as Record<string, any>
		for (const name of ['QaActor', 'QaRef', 'QaInstructions', 'QaVersion', 'QaCase', 'QaCaseRevision', 'QaRun', 'QaObservation', 'QaAccepted']) assert.ok(schemas[name], name)
		const manual = t.mw().out
		const outputs = { 'qa-case-create': 'QaAccepted', 'qa-case-revise': 'QaAccepted', 'qa-cases': 'QaCaseList', 'qa-case': 'QaCaseDetail', 'qa-run-start': 'QaAccepted', 'qa-runs': 'QaRunList', 'qa-run': 'QaRunDetail', 'qa-observe': 'QaAccepted', 'qa-verdict': 'QaAccepted', 'qa-observations': 'QaObservationList', 'qa-export': 'QaExportResult', 'qa-link': 'QaAccepted' }
		for (const [name, output] of Object.entries(outputs)) {
			const command = manual.commands.find((c: { name: string }) => c.name === name)
			assert.ok(command, name)
			assert.ok(schemas[output], output)
			assert.deepEqual(command.output, schemas[output], `${name} publishes its shared output schema`)
			if (['qa-case-create', 'qa-case-revise', 'qa-run-start', 'qa-observe', 'qa-verdict'].includes(name)) {
				assert.match(command.usage, /--input-file/)
				assert.ok(command.input.properties['input-file'])
			}
		}
		const paths = OPENAPI.paths as Record<string, any>
		for (const path of ['/cases', '/cases/{caseId}/revisions', '/runs', '/runs/{runId}/cases/{caseId}/observations', '/runs/{runId}/cases/{caseId}/verdicts']) {
			const operation = paths[`/api/v1/qa${path}`]?.post
			assert.ok(operation?.requestBody, path)
			for (const code of ['403', '409', '503']) assert.ok(operation.responses[code], `${path} documents ${code}`)
		}
		assert.equal(existsSync(t.path), false)
	} finally { await t.close() }
})

test('Q9: prune retains both QA anchors, their files/history/receipts, but still removes unrelated finished work', async () => {
	const t = await setup()
	try {
		const store = t.open()!
		const runAnchor = store.create({ title: 'Run anchor fixture', objective: 'Record run', source: 'fixture', workspace: t.workspace, status: 'dropped' })
		const unrelated = store.create({ title: 'Disposable fixture', objective: 'Unrelated', source: 'fixture', workspace: t.workspace, status: 'completed' })
		const body = t.create()
		const c = await t.run(qaCreateCase(body))
		const r = await t.run(qaStartRun(t.start(c.receipt.id, 1, { workItem: runAnchor.id })))
		await t.run(qaVerdict(r.receipt.id, c.receipt.id, verdict()))
		const snapshot = await t.run(qaSnapshot(r.receipt.id))
		const events = store.events(runAnchor.id)
		for (const id of [1, runAnchor.id, unrelated.id]) {
			const dir = join(t.dir, 'exports', String(id)); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'fixture.json'), `fixture ${id}`)
		}
		for (const flag of [['--dry-run'], []]) {
			const prune = t.mw('prune', '--before', '2999-01-01', ...flag)
			assert.equal(prune.code, 0, JSON.stringify(prune.err))
			assert.deepEqual(prune.out.items, [unrelated.id])
			assert.deepEqual(prune.out.kept.map((k: { id: number; why: string }) => [k.id, k.why]), [[1, 'retained by manual QA history'], [runAnchor.id, 'retained by manual QA history']])
			assert.match(prune.out.summary, /QA/)
			assert.equal(readFileSync(join(t.dir, 'exports/1/fixture.json'), 'utf8'), 'fixture 1')
			assert.equal(readFileSync(join(t.dir, `exports/${runAnchor.id}/fixture.json`), 'utf8'), `fixture ${runAnchor.id}`)
		}
		assert.equal(store.get(unrelated.id), undefined)
		assert.equal(existsSync(join(t.dir, 'exports', String(unrelated.id))), false)
		assert.deepEqual(await t.run(qaSnapshot(r.receipt.id)), snapshot)
		assert.deepEqual(store.events(runAnchor.id), events)
		assert.equal((await t.run(qaCreateCase(body))).receipt.replayed, true)
	} finally { await t.close() }
})

test('Q9: prune rechecks QA protection after selection and before file deletion; reverse order cannot dangle history', async () => {
	const a = await setup(); const b = await setup(a.dir)
	try {
		const selected = a.open()!.list().filter((i) => i.status === 'completed').map((i) => i.id)
		const file = join(a.dir, 'must-survive'); writeFileSync(file, 'fixture data')
		await b.run(qaCreateCase(b.create()))
		let called = false
		assert.throws(() => a.open()!.prune(selected, '2999-01-01T00:00:00Z', false, () => { called = true; rmSync(file) }), (error: unknown) => {
			assert.ok(error instanceof MadeWellError); assert.equal(error.code, 'qa_request'); assert.equal(errorContext(error).reason, 'retention_changed')
			assert.equal(errorContext(error).status, 409); assert.ok(contains(errorContext(error).facts, selected)); return true
		})
		assert.equal(called, false); assert.equal(existsSync(file), true)
		assert.throws(() => a.open()!.prune(selected, '2999-01-01T00:00:00Z', false), (error: unknown) => error instanceof MadeWellError && errorContext(error).reason === 'retention_changed')
		const other = a.open()!.create({ title: 'Prune first fixture', objective: 'No QA yet', source: 'fixture', workspace: a.workspace, status: 'completed' })
		a.open()!.prune([other.id], '2999-01-01T00:00:00Z', false)
		const rejected = await b.post('/qa/cases', b.create({ workItem: other.id }))
		assert.equal(rejected.body.code, 'item_not_found')
		assert.deepEqual((await b.run(qaCases({ workItem: other.id }))).items, [])
	} finally { await a.close(); await b.close() }
})

test('Q9: CLI stale prune selection cannot delete files when another connection adds QA history', async () => {
	const t = await setup()
	try {
		const exported = join(t.dir, 'exports/1')
		mkdirSync(exported, { recursive: true })
		const file = join(exported, 'fixture.json')
		writeFileSync(file, '  retained fixture export 😀  ')
		const input = t.input(t.create())
		const cli = join(import.meta.dirname, '../src/cli.ts')
		// A test-only filesystem interception inserts a real competing write while prune measures
		// its selected files. Assert outcomes, not private helpers or how often stat is called.
		const preload = `
import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; import {spawnSync} from 'node:child_process';
const original=fs.statSync; let inserted=false;
fs.statSync=function(path,...args) {
  if (!inserted && String(path)===${JSON.stringify(file)}) {
    inserted=true;
    const result=spawnSync(process.execPath,[${JSON.stringify(cli)},'qa-case-create','--input-file',${JSON.stringify(input)}],{env:process.env,encoding:'utf8'});
    if(result.status!==0) throw new Error('fixture competing QA write failed: '+result.stderr);
  }
  return original.call(this,path,...args);
};
syncBuiltinESMExports();
`
		const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('MW_'))), MW_HOME: t.dir, MW_AUTORUN: '0', NODE_NO_WARNINGS: '1' }
		const result = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, cli, 'prune', '--before', '2999-01-01'], { env, cwd: t.dir, encoding: 'utf8' })
		assert.ifError(result.error)
		assert.equal(result.signal, null)
		assert.notEqual(result.status, 0)
		const error = JSON.parse(result.stderr)
		assert.equal(error.error, 'qa_request'); assert.equal(error.context.reason, 'retention_changed')
		assert.equal(readFileSync(file, 'utf8'), '  retained fixture export 😀  ')
		assert.ok(t.open()!.get(1))
		assert.equal((await t.run(qaCases({ workItem: 1 }))).items.length, 1, 'the competing write really committed')
	} finally { await t.close() }
})

test('QA exports preserve pinned evidence and literal text; follow-ups mean current manual failures only', async () => {
	let t = await setup()
	try {
		const literal = '  Café 😀\r\n```\n<script>fixture-only</script>\n[unsafe](javascript:fixture)  '
		const ids: number[] = []
		for (let i = 0; i < 6; i++) ids.push((await t.run(qaCreateCase(t.create({ instructions: instructions({ title: `Fixture ${i}`, change: literal }) })))).receipt.id)
		const r = await t.run(qaStartRun(t.start(ids[0]!, 1, { cases: ids.map((caseId) => ({ caseId, caseRevision: 1 })) })))
		const runId = r.receipt.id
		for (const [index, state] of [[0, 'failed'], [1, 'needs-refinement'], [2, 'passed'], [5, 'failed']] as const) await t.run(qaVerdict(runId, ids[index]!, verdict(0, state, { actual: literal })))
		await t.run(qaObserve(runId, ids[3]!, note()))
		await t.run(qaObserve(runId, ids[4]!, note(0, { kind: 'historical', reportedResult: 'failed', claimedVerifier: operator, observedAt: '2020-01-02T03:04:05Z' })))
		await t.run(qaVerdict(runId, ids[5]!, verdict(1, 'untested')))
		await t.run(qaReviseCase(ids[0]!, { requestId: randomUUID(), revision: 1, enteredBy: agent, instructions: instructions({ title: 'New instructions not pinned by this run' }) }))
		const rejected = note(0, { notes: '  rejected draft preserved\n  ' })
		problem(await t.post(`/qa/runs/${runId}/cases/${ids[0]}/observations`, rejected), 409, 'stale_revision')
		const original = await t.run(qaSnapshot(runId))
		const mark = t.open()!.mark()
		const all = await t.run(qaExport(runId))
		assert.equal(all.format, 'json'); if (all.format !== 'json') assert.fail('JSON is the default')
		assert.equal(all.data.schemaVersion, 1)
		assert.equal(all.data.externalEvidence, 'unavailable-reference-only')
		assert.deepEqual(all.data.run, original.run)
		assert.deepEqual(all.data.entries.map((e) => e.caseId), ids)
		assert.deepEqual(all.data.entries.map((e) => e.status), ['failed', 'needs-refinement', 'passed', 'untested', 'untested', 'untested'])
		for (const [i, entry] of all.data.entries.entries()) {
			assert.deepEqual(entry.instructions, original.entries[i]!.instructions)
			assert.deepEqual(entry.observations, original.entries[i]!.observations)
			assert.deepEqual(entry.links, [])
		}
		assert.equal(all.data.entries[0]!.outdated, true)
		assert.equal(all.data.entries[0]!.currentCaseRevision, 2)
		assert.equal(all.data.entries[0]!.instructions.instructions.change, literal)
		assert.deepEqual(all.data.entries[0]!.conflicts.map((c) => c.input), [rejected])
		assert.ok(all.data.entries.slice(1).every((e) => e.conflicts.length === 0))
		const follow = await t.run(qaExport(runId, { selection: 'follow-ups' }))
		assert.equal(follow.format, 'json'); if (follow.format !== 'json') assert.fail()
		assert.deepEqual(follow.data.entries.map((e) => e.caseId), ids.slice(0, 2))
		assert.deepEqual(follow.data.run, original.run)
		const markdown = await t.run(qaExport(runId, { format: 'markdown' }))
		assert.equal(markdown.format, 'markdown'); if (markdown.format !== 'markdown') assert.fail()
		assert.ok(markdown.markdown.includes(literal))
		assert.ok(markdown.markdown.includes(JSON.stringify(rejected.notes)), 'rejected input is lossless structured JSON, not accepted note text')
		assert.ok(markdown.markdown.includes('2020-01-02T03:04:05Z'))
		assert.ok(markdown.markdown.endsWith('\n'))
		// Adversarial source stays inside a code fence, not active Markdown/HTML.
		let fence = 0
		for (const line of markdown.markdown.split('\n')) {
			const marker = /^(`{3,})[^`]*$/.exec(line)
			if (marker) { if (!fence) fence = marker[1]!.length; else if (marker[1]!.length >= fence) fence = 0 }
			if (line.includes('<script>') || line.includes('[unsafe]')) assert.ok(fence > 0)
		}
		assert.equal(fence, 0)
		for (const selection of ['all', 'follow-ups'] as const) for (const format of ['json', 'markdown'] as const) {
			const service = await t.run(qaExport(runId, { selection, format }))
			assert.deepEqual((await t.get(`/qa/runs/${runId}/export?selection=${selection}&format=${format}`)).body, service)
			const cli = t.mw('qa-export', String(runId), '--selection', selection, '--format', format)
			assert.equal(cli.code, 0, JSON.stringify(cli.err)); assert.deepEqual(cli.out, service)
		}
		assert.deepEqual(await t.run(qaSnapshot(runId)), original)
		assert.deepEqual(t.open()!.mark(), mark)
		await t.close(); t = await setup(t.dir)
		assert.deepEqual(await t.run(qaExport(runId, { format: 'markdown' })), markdown)
		for (const query of ['selection=wrong', 'format=html', 'format=json&format=markdown', 'unknown=1']) problem(await t.get(`/qa/runs/${runId}/export?${query}`), 400, 'invalid_input')
	} finally { await t.close() }
})

test('QA associations preserve failure and untested retest, replay exactly, and survive follow-up pruning', async () => {
	let t = await setup()
	try {
		const { caseId, runId, route } = await entry(t)
		await t.run(qaVerdict(runId, caseId, verdict(0, 'failed')))
		const original = await t.run(qaSnapshot(runId))
		const observationId = original.entries[0]!.observations[0]!.id
		const target = t.open()!.create({ title: 'Fixture follow-up', objective: 'Separate existing work only', source: '  Exact fix context 😀  ', workspace: t.workspace, status: 'completed' })
		const body = { requestId: randomUUID(), revision: 1, enteredBy: agent, observationId, target: { kind: 'work-item' as const, workItem: target.id } }
		const linked = await t.run(qaLink(runId, caseId, body))
		assert.equal(linked.receipt.operation, 'linkObservation'); assert.equal(linked.receipt.revision, 1)
		assert.deepEqual(accepted(await t.post(`${route}/links`, body)).receipt, { ...linked.receipt, replayed: true })
		const duplicate = { ...body, requestId: randomUUID() }
		const refused = problem(await t.post(`${route}/links`, duplicate), 409, 'link_exists')
		assert.equal(refused.context.facts.existingEvent, linked.receipt.event)
		problem(await t.post(`${route}/links`, { ...body, target: { kind: 'reference', reference: { label: 'Changed', ref: 'fixture:changed' } } }), 409, 'request_id_conflict')
		const later = await t.run(qaStartRun(t.start(caseId, 1, { environment: 'Explicit fixture retest', version: { kind: 'known', value: 'fixture-v2', source: { label: 'Supplied version', ref: 'fixture:build-v2' } } })))
		const retestBody = { ...body, requestId: randomUUID(), target: { kind: 'retest' as const, runId: later.receipt.id } }
		const retestLink = accepted(await t.post(`${route}/links`, retestBody))
		assert.deepEqual(await t.run(qaSnapshot(runId)), original, 'associations do not change source evidence or counters')
		const laterState = await t.run(qaRun(later.receipt.id))
		assert.equal(laterState.entries[0]!.status, 'untested'); assert.equal(laterState.entries[0]!.entryRevision, 0)
		const exported = await t.run(qaExport(runId))
		const incoming = await t.run(qaExport(later.receipt.id))
		assert.equal(exported.format, 'json'); assert.equal(incoming.format, 'json')
		if (exported.format !== 'json' || incoming.format !== 'json') assert.fail()
		const links = exported.data.entries[0]!.links
		assert.equal(links.length, 2)
		const savedWork = links.find((v) => v.link.target.kind === 'work-item')!
		assert.equal(savedWork.targetAvailability, 'present')
		assert.equal(savedWork.link.target.kind, 'work-item')
		if (savedWork.link.target.kind !== 'work-item') assert.fail()
		assert.deepEqual(savedWork.link.target.snapshot, { id: target.id, workspace: target.workspace, title: target.title, objective: target.objective, source: target.source, status: target.status, updated: target.updated })
		assert.deepEqual(incoming.data.entries[0]!.links.map((v) => v.link), [links.find((v) => v.link.event === retestLink.receipt.event)!.link])
		await t.run(qaVerdict(later.receipt.id, caseId, verdict(0, 'passed')))
		assert.equal((await t.run(qaRun(runId))).entries[0]!.status, 'failed')
		const reset = await t.run(qaExport(later.receipt.id, { selection: 'follow-ups' }))
		assert.equal(reset.format, 'json'); if (reset.format !== 'json') assert.fail()
		assert.deepEqual(reset.data.entries, [])
		const stale = { ...body, requestId: randomUUID(), target: { kind: 'reference' as const, reference: { label: 'Saved reference', ref: 'javascript:opaque-only' } } }
		await t.run(qaObserve(runId, caseId, note(1)))
		problem(await t.post(`${route}/links`, stale), 409, 'stale_revision')
		const reviewed = { ...stale, requestId: randomUUID(), revision: 2 }
		const fromCli = t.mw('qa-link', String(runId), String(caseId), '--input-file', t.input(reviewed))
		assert.equal(fromCli.code, 0, JSON.stringify(fromCli.err))
		assert.deepEqual(accepted(await t.post(`${route}/links`, reviewed)).receipt, { ...fromCli.out.receipt, replayed: true })
		t.open()!.prune([target.id], '2999-01-01T00:00:00Z', false)
		await t.close(); t = await setup(t.dir)
		assert.deepEqual((await t.run(qaLink(runId, caseId, body))).receipt, { ...linked.receipt, replayed: true })
		problem(await t.post(`${route}/links`, stale), 409, 'stale_revision')
		problem(await t.post(`${route}/links`, duplicate), 409, 'link_exists')
		const after = await t.run(qaExport(runId))
		assert.equal(after.format, 'json'); if (after.format !== 'json') assert.fail()
		const unavailable = after.data.entries[0]!.links.find((v) => v.link.event === linked.receipt.event)!
		assert.equal(unavailable.targetAvailability, 'unavailable'); assert.deepEqual(unavailable.link, savedWork.link)
		assert.deepEqual(after.data.entries[0]!.conflicts.map((c) => c.input), [stale])
		assert.equal(after.data.entries[0]!.status, 'failed')
		const invalid = { ...reviewed, requestId: randomUUID(), target: { kind: 'retest', runId } }
		problem(await t.post(`${route}/links`, invalid), 409, 'invalid_retest')
		problem(await t.post(`${route}/links`, { ...invalid, requestId: randomUUID(), target: { kind: 'work-item', workItem: target.id } }), 409, 'link_exists')
		// A previously associated target is a duplicate even after pruning. Test missing-target
		// behavior with a different target pruned before its first association, at the current CAS.
		const neverLinked = t.open()!.create({ title: 'Fixture pruned before linking', objective: 'Missing-target control', source: 'fixture', workspace: t.workspace, status: 'completed' })
		t.open()!.prune([neverLinked.id], '2999-01-01T00:00:00Z', false)
		const missing = problem(await t.post(`${route}/links`, { ...reviewed, requestId: randomUUID(), target: { kind: 'work-item', workItem: neverLinked.id } }), 404, 'item_not_found')
		assert.deepEqual(missing.context, { id: neverLinked.id })
		assert.ok(missing.next.some((next: { run: string }) => next.run === `mw qa-export ${runId} --selection all --format json`))
		assert.deepEqual(await t.run(qaExport(runId)), after, 'refused missing target changes no association, observation or counter')
		const wrongApp = await t.run(qaStartRun(t.start(caseId, 1, { application: 'Different fixture application' })))
		problem(await t.post(`${route}/links`, { ...invalid, requestId: randomUUID(), target: { kind: 'retest', runId: wrongApp.receipt.id } }), 409, 'invalid_retest')
		problem(await t.post(`${route}/links`, { ...reviewed, requestId: randomUUID(), target: { ...reviewed.target, extra: true } }), 400, 'invalid_input')
		assert.equal(t.wakes(), 0)
	} finally { await t.close() }
})
