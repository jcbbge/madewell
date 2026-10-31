import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'
import { API_SCHEMAS, createApi, OPENAPI, revisionOf, type ApiOptions } from '../src/api.ts'
import { conforms, laneOf, type Pack } from '../src/lane.ts'
import { openStore, type Item } from '../src/store.ts'

const root = mkdtempSync(join(tmpdir(), 'mw-browser-driver-'))
after(() => rmSync(root, { recursive: true, force: true }))
const output = { type: 'object', required: ['result'], properties: { result: { type: 'string' } } }
const pack: Pack = {
	name: 'browser-driver', version: 'fixture-1', runtime: 'functions',
	discovery: [{ cartridge: 'prepare', steps: [
		{ job: 'capture-notes', profile: 'ideator', duty: 'Read the original notes.', output },
		{ job: 'return-candidates', profile: 'ideator', duty: 'Return the candidate work.', output },
	] }],
	delivery: ['ideation', 'planning', 'implementation', 'verification'].map(job => ({ cartridge: job, steps: [{ job, profile: 'implementer', duty: `Perform ${job}.`, output, access: 'none' }] })),
}
const source = '  rough notes\r\nkeep this exact meaning and whitespace 😀\n  '

async function setup(extra: Partial<ApiOptions> = {}, existing?: string) {
	const dir = existing ?? mkdtempSync(join(root, 'case-')), path = join(dir, 'madewell.db')
	if (!existing) {
		writeFileSync(join(dir, 'pack.json'), JSON.stringify(pack))
		writeFileSync(join(dir, 'projects.json'), JSON.stringify([{ path: dir, cartridges: join(dir, 'pack.json'), autonomy: 'checkpoints' }]))
	}
	let store: ReturnType<typeof openStore> | undefined
	const open = (create = false) => {
		if (!store && (create || existsSync(path))) store = openStore(path)
		return store
	}
	const api = createApi({ path, open, ...extra })
	const server = createServer((req, res) => { void api(req, res) })
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
	const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
	const token = (await (await fetch(`${url}/api/v1/session`)).json()).csrfToken as string
	const headers = { Origin: url, 'Content-Type': 'application/json', 'X-MW-CSRF': token }
	const get = async (route: string) => { const response = await fetch(`${url}/api/v1${route}`); return { status: response.status, body: await response.json(), headers: response.headers } }
	const post = (route: string, body: unknown, overrides: Record<string, string> = {}) => new Promise<{ status: number; body: any; headers: Headers }>((resolve, reject) => {
		const req = request(`${url}/api/v1${route}`, { method: 'POST', headers: { ...headers, ...overrides } }, res => {
			let text = ''
			res.on('data', chunk => { text += String(chunk) })
			res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text), headers: new Headers(Object.entries(res.headers).map(([key, value]) => [key, String(value)])) }))
		})
		req.on('error', reject)
		req.end(JSON.stringify(body))
	})
	const submit = (fields = {}) => ({ requestId: randomUUID(), workspace: dir, objective: 'Prepare the raw input into candidate work.', source, ...fields })
	return { dir, path, open, get, post, submit, close: async () => { await new Promise<void>(resolve => server.close(() => resolve())); store?.close() } }
}

function seed(t: Awaited<ReturnType<typeof setup>>, status: Item['status'] = 'discovered') {
	const store = t.open(true)!
	const parent = store.create({ title: 'Prepared notes', objective: 'Generate candidate work.', source, workspace: t.dir, pack, status, job: '', flow: { loop: 'discovery', accepted: [] }, autonomy: 'checkpoints' })
	const candidate = (title: string, after?: number[]) => store.create({ title, objective: `Complete ${title}`, source: `  Exact brief: ${title}\n`, workspace: t.dir, pack, discovery: parent.id, status: 'candidate', flow: { loop: 'delivery', accepted: [] }, autonomy: 'checkpoints', ...(after ? { after } : {}) })
	const prerequisite = candidate('Prepare the local material')
	const middle = candidate('Use the prepared material', [prerequisite.id])
	const chosen = candidate('Finish the selected task', [middle.id])
	const sibling = candidate('Leave this proposed task unselected')
	return { store, parent, prerequisite, middle, chosen, sibling }
}

test('browser discovery enters the first pinned discovery function while legacy and explicit delivery keep their entrypoint', async () => {
	const wakes: { id: number; source: string; job: string; flow: Item['flow'] }[] = []
	const t = await setup({ wake: async (store, id) => { const saved = store.get(id)!; wakes.push({ id, source: saved.source, job: saved.job, flow: saved.flow }) } })
	try {
		for (const mode of ['discovery', undefined, 'delivery'] as const) {
			const body = t.submit(mode ? { mode } : {})
			const result = await t.post('/items', body)
			assert.equal(result.status, 201, JSON.stringify(result.body))
			const saved = t.open()!.get(result.body.receipt.item)!
			assert.equal(saved.source, source)
			assert.equal(saved.objective, body.objective)
			assert.equal(saved.workspace, t.dir)
			assert.deepEqual(saved.pack, pack)
			assert.equal(saved.autonomy, 'checkpoints', 'a browser mode does not grant full execution authority')
			assert.equal(saved.job, mode === 'discovery' ? 'capture-notes' : 'ideation')
			assert.deepEqual(saved.flow, mode === 'discovery' ? { loop: 'discovery', accepted: [] } : undefined)
			assert.equal(result.body.context.position.loop, mode === 'discovery' ? 'discovery' : 'delivery')
			assert.deepEqual(conforms(API_SCHEMAS.Context, result.body.context), [])
			assert.equal((await t.get(`/items/${saved.id}/conversation`)).body.messages[0].text, source)
			assert.deepEqual(wakes.at(-1), { id: saved.id, source, job: saved.job, flow: saved.flow }, 'wake sees saved state, never a reconstructed brief')
		}
		assert.equal(t.open()!.calls().length, 0, 'submission queues work rather than executing worker calls in the request')
	} finally { await t.close() }
})

test('browser discovery also starts a configured software workspace without inventing a function flow', async () => {
	const t = await setup()
	try {
		const workspace = join(t.dir, 'software')
		mkdirSync(workspace)
		writeFileSync(join(t.dir, 'projects.json'), JSON.stringify([{ path: workspace, autonomy: 'steps' }]))
		const result = await t.post('/items', t.submit({ workspace, mode: 'discovery' }))
		assert.equal(result.status, 201, JSON.stringify(result.body))
		const saved = t.open()!.get(result.body.receipt.item)!
		assert.equal(saved.job, laneOf().discovery[0]!.job)
		assert.equal(saved.flow, undefined)
		assert.equal(saved.pack, undefined)
		assert.equal(saved.autonomy, 'steps')
		assert.equal(saved.source, source)
	} finally { await t.close() }
})

test('mode participates in immutable submission identity and invalid modes never create work', async () => {
	let t = await setup()
	const body = t.submit({ mode: 'discovery' })
	try {
		for (const mode of ['', 'Discovery', 'anything', null, false, 1, [], {}]) {
			const rejected = await t.post('/items', t.submit({ mode }))
			assert.equal(rejected.status, 400, JSON.stringify({ mode, response: rejected.body }))
			assert.equal(rejected.body.reason, 'invalid_body')
		}
		assert.equal(existsSync(t.path), false)
		const accepted = await t.post('/items', body)
		assert.equal(accepted.status, 201)
		const receipt = accepted.body.receipt
		await t.close()
		t = await setup({}, t.dir)
		writeFileSync(join(t.dir, 'projects.json'), '[]')
		const replay = await t.post('/items', body)
		assert.equal(replay.status, 200)
		assert.deepEqual(replay.body.receipt, { ...receipt, replayed: true })
		const changed = await t.post('/items', { ...body, mode: 'delivery' })
		assert.equal(changed.status, 409)
		assert.equal(changed.body.reason, 'request_id_conflict')
		assert.equal(t.open()!.list().length, 1)
		assert.deepEqual(t.open()!.get(receipt.item)!.flow, { loop: 'discovery', accepted: [] })
	} finally { await t.close() }
})

test('starting one proposed task selects its transitive prerequisites, preserves the briefs and leaves siblings untouched', async () => {
	let wakeSeen = false
	const t = await setup({ wake: async (store, id) => {
		const read = openStore(t.path)
		try {
			const task = store.get(id)!
			assert.equal(task.status, 'queued')
			assert.ok(read.events(id).some(event => event.kind === 'operator-message' && event.data.kind === 'selection'), 'wake occurs after the transaction commits')
			assert.ok(task.after!.every(dependency => read.get(dependency)!.status === 'queued'))
			wakeSeen = true
		} finally { read.close() }
	} })
	try {
		const { store, parent, prerequisite, middle, chosen, sibling } = seed(t)
		const before = [prerequisite, middle, chosen].map(item => ({ ...item, status: 'queued' }))
		const context = (await t.get(`/items/${chosen.id}`)).body
		const start = context.next.find((action: { href?: string }) => action.href === `/api/v1/items/${chosen.id}/start`)
		assert.ok(start)
		assert.equal(start.owner, 'operator')
		assert.equal(start.authority, 'explicit-operator-action')
		assert.equal(start.transport, 'http')
		assert.equal(start.method, 'POST')
		assert.deepEqual(start.inputs, { revision: revisionOf(chosen), requestId: null })
		assert.equal(context.observation.authority, 'read-only')
		const result = await t.post(`/items/${chosen.id}/start`, { ...start.inputs, requestId: randomUUID() })
		assert.equal(result.status, 200, JSON.stringify(result.body))
		assert.equal(result.body.accepted, true)
		assert.deepEqual(result.body.warnings, [])
		assert.equal(wakeSeen, true)
		for (const expected of before) {
			const actual = store.get(expected.id)!
			assert.deepEqual({ ...actual, updated: expected.updated }, expected)
			assert.equal(store.events(actual.id).filter(event => event.kind === 'promoted').length, 1)
		}
		assert.deepEqual(store.get(sibling.id), sibling)
		assert.deepEqual(store.get(parent.id), parent)
		assert.equal(store.calls().length, 0)
		assert.equal(result.body.context.position.status, 'queued')
		assert.ok(!result.body.context.next.some((action: { href?: string }) => action.href?.endsWith('/start')))
	} finally { await t.close() }
})

test('selection receipt replays after restart and subsequent progress before stale revision is considered', async () => {
	let t = await setup()
	try {
		const { store, prerequisite, middle, chosen } = seed(t)
		const body = { requestId: randomUUID(), revision: revisionOf(chosen) }
		const first = await t.post(`/items/${chosen.id}/start`, body)
		assert.equal(first.status, 200)
		store.save({ ...store.get(chosen.id)!, status: 'running', outputs: { ideation: '{"result":"saved work"}' } }, 'running')
		const after = store.get(chosen.id)!
		await t.close()
		t = await setup({}, t.dir)
		writeFileSync(join(t.dir, 'projects.json'), '[]')
		const replay = await t.post(`/items/${chosen.id}/start`, body)
		assert.equal(replay.status, 200)
		assert.deepEqual(replay.body.receipt, { ...first.body.receipt, replayed: true })
		assert.deepEqual(t.open()!.get(chosen.id), after)
		for (const id of [prerequisite.id, middle.id, chosen.id]) assert.equal(t.open()!.events(id).filter(event => event.kind === 'promoted').length, 1)
		assert.equal(t.open()!.events(chosen.id).filter(event => event.kind === 'operator-message' && event.data.kind === 'selection').length, 1)
		const stale = await t.post(`/items/${chosen.id}/start`, { ...body, requestId: randomUUID() })
		assert.equal(stale.status, 409)
		assert.equal(stale.body.reason, 'stale_revision')
		assert.equal((await t.post(`/items/${chosen.id}/start`, { ...body, revision: revisionOf(after) })).body.reason, 'request_id_conflict')
		assert.equal((await t.post(`/items/${middle.id}/start`, body)).body.reason, 'request_id_conflict', 'path is part of the request identity')
	} finally { await t.close() }
})

test('selection and its prerequisites roll back together if the receipt transaction cannot finish', async () => {
	const t = await setup()
	try {
		const { store, prerequisite, middle, chosen } = seed(t)
		const before = store.allEvents()
		const body = { requestId: randomUUID(), revision: revisionOf(chosen) }
		const database = new DatabaseSync(t.path)
		try {
			database.exec("CREATE TRIGGER fail_browser_selection BEFORE INSERT ON events WHEN NEW.kind = 'operator-message' AND json_extract(NEW.data, '$.kind') = 'selection' BEGIN SELECT RAISE(ABORT, 'selection interrupted'); END")
			const failed = await t.post(`/items/${chosen.id}/start`, body)
			assert.equal(failed.status, 500)
			assert.equal(failed.body.reason, 'internal_error')
			for (const original of [prerequisite, middle, chosen]) assert.deepEqual(store.get(original.id), original)
			assert.deepEqual(store.allEvents(), before)
			database.exec('DROP TRIGGER fail_browser_selection')
			const retried = await t.post(`/items/${chosen.id}/start`, body)
			assert.equal(retried.status, 200)
			assert.equal(retried.body.receipt.replayed, false, 'the rolled-back request did not leave a false acceptance receipt')
			for (const original of [prerequisite, middle, chosen]) assert.equal(store.get(original.id)!.status, 'queued')
		} finally { database.close() }
	} finally { await t.close() }
})

test('a failed wake leaves selection accepted and the exact retry can wake the already selected work', async () => {
	let attempts = 0
	const t = await setup({ wake: async (_store, _id) => { attempts++; if (attempts === 1) throw new Error('Foreground runner temporarily unavailable') } })
	try {
		const { store, chosen } = seed(t)
		const body = { requestId: randomUUID(), revision: revisionOf(chosen) }
		const accepted = await t.post(`/items/${chosen.id}/start`, body)
		assert.equal(accepted.status, 200)
		assert.equal(accepted.body.accepted, true)
		assert.equal(accepted.body.warnings.length, 1)
		assert.match(accepted.body.warnings[0], /durably accepted.*wake failed/)
		assert.equal(store.get(chosen.id)!.status, 'queued')
		const replay = await t.post(`/items/${chosen.id}/start`, body)
		assert.equal(replay.status, 200)
		assert.equal(replay.body.receipt.replayed, true)
		assert.deepEqual(replay.body.warnings, [])
		assert.equal(attempts, 2)
		assert.equal(store.events(chosen.id).filter(event => event.kind === 'promoted').length, 1)
	} finally { await t.close() }
})

test('start refuses noncandidates, unfinished discoveries and stale selections without changing work', async () => {
	const t = await setup()
	try {
		const { store, parent, chosen, prerequisite } = seed(t, 'held')
		const standalone = store.create({ title: 'Not generated', objective: 'No parent.', source, workspace: t.dir, pack, status: 'candidate' })
		const send = (item: Item) => t.post(`/items/${item.id}/start`, { requestId: randomUUID(), revision: revisionOf(item) })
		assert.equal((await send(standalone)).body.reason, 'not_a_candidate')
		assert.equal((await send(parent)).body.reason, 'not_a_candidate')
		assert.equal((await send(chosen)).body.reason, 'not_discovered')
		assert.deepEqual(store.get(chosen.id), chosen)
		assert.deepEqual(store.get(prerequisite.id), prerequisite)
		store.save({ ...parent, status: 'discovered' }, 'discovered')
		store.save({ ...chosen, objective: 'Revised by the operator' }, 'steered')
		const stale = await send(chosen)
		assert.equal(stale.status, 409)
		assert.equal(stale.body.reason, 'stale_revision')
		assert.equal(store.get(chosen.id)!.status, 'candidate')
		assert.equal(store.events(chosen.id).filter(event => event.kind === 'promoted').length, 0)
		const missing = await t.post('/items/999/start', { requestId: randomUUID(), revision: revisionOf(chosen) })
		assert.equal(missing.status, 404)
	} finally { await t.close() }
})

test('start uses the same authenticated-origin, CSRF, body and method boundaries as other operator writes', async () => {
	const t = await setup()
	try {
		const { store, chosen } = seed(t)
		const route = `/items/${chosen.id}/start`, body = { requestId: randomUUID(), revision: revisionOf(chosen) }, before = store.allEvents()
		for (const [headers, status, reason] of [
			[{ Origin: 'https://evil.example' }, 403, 'origin_forbidden'],
			[{ Host: 'evil.example', 'X-Forwarded-Host': '127.0.0.1' }, 403, 'origin_forbidden'],
			[{ 'Sec-Fetch-Site': 'cross-site' }, 403, 'origin_forbidden'],
			[{ 'X-MW-CSRF': '' }, 403, 'csrf_required'],
			[{ 'Content-Type': 'text/plain' }, 415, 'content_type'],
		] as [Record<string, string>, number, string][]) {
			const rejected = await t.post(route, body, headers)
			assert.equal(rejected.status, status)
			assert.equal(rejected.body.reason, reason)
			assert.equal(rejected.body.task, null, 'rejected authority must not disclose the task')
		}
		for (const invalid of [null, [], {}, { ...body, revision: 'bad' }, { ...body, requestId: 'short' }, { ...body, id: chosen.id }, { ...body, text: 'start' }]) assert.equal((await t.post(route, invalid)).status, 400)
		const read = await t.get(route)
		assert.equal(read.status, 405)
		assert.equal(read.headers.get('allow'), 'POST')
		assert.deepEqual(store.allEvents(), before)
		assert.deepEqual(store.get(chosen.id), chosen)
		assert.equal((await t.post(route, body)).status, 200)
	} finally { await t.close() }
})

test('OpenAPI describes discovery mode and candidate start using the actual request and response contracts', async () => {
	const t = await setup()
	try {
		const api = (await t.get('/openapi.json')).body
		assert.deepEqual(api, OPENAPI)
		const submission = api.components.schemas.Submit as { properties: { mode: { enum: string[] } }; required: string[] }
		assert.deepEqual(submission.properties.mode.enum, ['discovery', 'delivery'])
		assert.ok(!submission.required.includes('mode'))
		const operation = api.paths['/api/v1/items/{id}/start'].post
		assert.ok(operation.requestBody)
		assert.ok(operation.security)
		assert.equal(operation.requestBody.content['application/json'].schema.$ref, '#/components/schemas/Start')
		assert.ok(operation.security.some((security: { csrf?: unknown }) => 'csrf' in security))
		assert.deepEqual(api.components.schemas.Start.required, ['requestId', 'revision'])
		const { chosen } = seed(t)
		const result = await t.post(`/items/${chosen.id}/start`, { requestId: randomUUID(), revision: revisionOf(chosen) })
		assert.deepEqual(conforms(API_SCHEMAS.Context, result.body.context), [])
		assert.equal(result.body.context.item.source, chosen.source)
	} finally { await t.close() }
})
