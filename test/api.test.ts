import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { API_SCHEMAS, contextOf, createApi, OPENAPI, revisionOf, type ApiOptions } from '../src/api.ts'
import { conforms, type Pack } from '../src/lane.ts'
import { openStore, type Item } from '../src/store.ts'

const root = mkdtempSync(join(tmpdir(), 'mw-api-'))
after(() => rmSync(root, { recursive: true, force: true }))
const pack: Pack = { name: 'plain', runtime: 'functions', version: '1', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'first', profile: 'implementer', duty: 'Return a result', output: { type: 'object', required: ['result'] }, access: 'none' }] }] }

async function setup(extra: Partial<ApiOptions> = {}, existing?: string) {
	const dir = existing ?? mkdtempSync(join(root, 'case-'))
	const path = join(dir, 'madewell.db')
	if (!existing) {
		writeFileSync(join(dir, 'pack.json'), JSON.stringify(pack))
		writeFileSync(join(dir, 'projects.json'), JSON.stringify([{ path: dir, cartridges: join(dir, 'pack.json'), autonomy: 'steps' }]))
	}
	let store: ReturnType<typeof openStore> | undefined
	const open = (create = false) => {
		if (!store && (create || existsSync(path))) store = openStore(path)
		return store
	}
	const api = createApi({ path, open, ...extra })
	const server = createServer((req, res) => { void api(req, res) })
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
	const token = (await (await fetch(`${url}/api/v1/session`)).json()).csrfToken as string
	const headers = { Origin: url, 'Content-Type': 'application/json', 'X-MW-CSRF': token }
	const get = async (route: string) => { const r = await fetch(`${url}/api/v1${route}`); return { status: r.status, body: await r.json(), headers: r.headers } }
	// Node fetch replaces Host, so use the HTTP client to actually exercise hostile/proxy Host headers.
	const post = (route: string, value: unknown, override: Record<string, string> = {}) => new Promise<{ status: number; body: any; headers: Headers }>((resolve, reject) => {
		const req = request(`${url}/api/v1${route}`, { method: 'POST', headers: { ...headers, ...override } }, (res) => {
			let text = ''
			res.on('data', (chunk) => { text += String(chunk) })
			res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text), headers: new Headers(Object.entries(res.headers).map(([k, v]) => [k, String(v)])) }))
		})
		req.on('error', reject)
		req.end(JSON.stringify(value))
	})
	const submit = (fields = {}) => ({ requestId: randomUUID(), workspace: dir, objective: 'Return an inspectable result', source: '  exact\noperator text 😀  ', ...fields })
	return { dir, path, open, url, headers, get, post, submit, close: async () => { await new Promise<void>((resolve) => server.close(() => resolve())); store?.close() } }
}

const held = (store: ReturnType<typeof openStore>, id: number, code = 'question_for_operator', fields: Partial<Item> = {}) => store.save({
	...store.get(id)!, status: 'held', hold: { code, message: 'Which format?', context: { questions: ['Which format?'], job: 'first' } },
	exchange: { from: { kind: 'dispatcher' }, handoff: 'Return the requested result', status: 'awaiting-originator', turns: [{ understanding: 'Need format', questions: ['Which format?'] }] }, ...fields,
}, 'held', { code })

test('discovery is additive, reads do not create a store, and schemas name only explicit versioned operations', async () => {
	const t = await setup()
	try {
		assert.equal((await t.get('')).body.openapi, '/api/v1/openapi.json')
		assert.deepEqual((await t.get('/openapi.json')).body, OPENAPI)
		assert.equal((await t.get('/projects')).body.projects[0].workspace, t.dir)
		assert.equal((await t.get('/items/999')).status, 404)
		assert.equal((await t.get('/items')).status, 405)
		assert.equal(existsSync(t.path), false)
		assert.equal((await t.post('/items', t.submit({ workspace: '/unregistered' }))).status, 400)
		assert.equal(existsSync(t.path), false)
		assert.ok(Object.keys(OPENAPI.paths).every((p) => p.startsWith('/api/v1')))
	} finally { await t.close() }
})

test('submission pins the registered pack, preserves exact text, and retries survive server/store restart and registry changes', async () => {
	let t = await setup()
	const body = t.submit()
	try {
		const result = await t.post('/items', body)
		assert.equal(result.status, 201, JSON.stringify(result.body))
		const store = t.open()!
		assert.equal(store.get(1)!.source, body.source)
		assert.deepEqual(store.get(1)!.pack, pack)
		assert.equal(store.get(1)!.autonomy, 'steps')
		assert.deepEqual(conforms(API_SCHEMAS.Context, result.body.context), [])
		const receipt = result.body.receipt
		await t.close()
		t = await setup({}, t.dir)
		writeFileSync(join(t.dir, 'projects.json'), '[]')
		const replay = await t.post('/items', body)
		assert.equal(replay.status, 200)
		assert.deepEqual(replay.body.receipt, { ...receipt, replayed: true })
		assert.equal(t.open()!.list().length, 1)
		assert.equal(t.open()!.events(1).filter((e) => e.kind === 'operator-message').length, 1)
		assert.equal((await t.post('/items', { ...body, source: 'different' })).body.reason, 'request_id_conflict')
		assert.equal((await t.get('/items/1/conversation')).body.messages[0].text, body.source)
	} finally { await t.close() }
})

test('NQ answers use the engine, preserve exact words, reject stale requests, and replay once after restart', async () => {
	let t = await setup()
	try {
		await t.post('/items', t.submit())
		const store = t.open()!
		store.note(1, 'nq-question', { job: 'first', receiver: 'implementer', questions: ['Which format?'] })
		const item = held(store, 1)
		const context = (await t.get('/items/1')).body
		assert.equal(context.answer.allowed, true)
		assert.equal(context.next[0].inputs.revision, revisionOf(item))
		assert.equal(context.next[0].authority, 'explicit-operator-action')
		assert.equal(context.next[0].inputs.id, undefined, 'path ID is not an undocumented body field')
		const body = { ...context.next[0].inputs, requestId: randomUUID(), text: '  CSV\nonly 😀  ' }
		const result = await t.post(context.next[0].href.replace('/api/v1', ''), body)
		assert.equal(result.status, 200, JSON.stringify(result.body))
		assert.equal(store.get(1)!.exchange!.turns[0]!.answer, body.text)
		assert.equal(store.get(1)!.exchange!.status, 'awaiting-receiver', 'answer does not bypass receiver confirmation')
		assert.equal(store.get(1)!.status, 'queued')
		assert.equal((await t.post('/items/1/answers', { ...body, requestId: randomUUID() })).body.reason, 'stale_revision')
		await t.close()
		t = await setup({}, t.dir)
		assert.equal((await t.post('/items/1/answers', body)).body.receipt.replayed, true)
		const conversation = (await t.get('/items/1/conversation')).body.messages
		assert.deepEqual(conversation.map((m: { kind: string }) => m.kind), ['source', 'question', 'answer'])
		assert.equal(conversation[2].text, body.text)
		assert.equal(t.open()!.events(1).filter((e) => e.kind === 'nq-answer').length, 1)
	} finally { await t.close() }
})

test('holds and checkpoints keep engine authority; causes and nonanswerable cases are actionable', async () => {
	const t = await setup()
	try {
		await t.post('/items', t.submit())
		const store = t.open()!
		const send = (fields = {}) => t.post('/items/1/answers', { requestId: randomUUID(), revision: revisionOf(store.get(1)!), text: 'Use CSV', ...fields })
		assert.equal((await send()).body.code, 'not_held')
		held(store, 1, 'ship_failed')
		assert.equal((await t.get('/items/1')).body.answer.allowed, false)
		assert.equal((await send()).body.code, 'not_answerable')
		held(store, 1, 'worker_failing')
		const actions = (await t.get('/items/1')).body.next
		assert.equal(actions.find((a: { command: string }) => a.command === 'mw show 1').authority, 'read-only')
		assert.equal(actions.find((a: { command: string }) => a.command === 'mw show 1').owner, 'observer')
		assert.equal(actions.find((a: { command: string }) => a.command === 'mw retry 1').authority, 'explicit-operator-action')
		held(store, 1, 'environment')
		assert.equal((await send()).body.code, 'cause_required')
		assert.equal((await send({ cause: 'environment' })).status, 400)
		const before = store.list().length
		const routed = await send({ cause: 'pre-existing', text: '  Fix prerequisite\nexactly  ' })
		assert.equal(routed.status, 200, JSON.stringify(routed.body))
		assert.equal(store.list().length, before + 1)
		assert.equal(store.get(1)!.status, 'waiting-prerequisite')
		assert.equal((await t.get('/items/1/conversation')).body.messages.at(-1).text, '  Fix prerequisite\nexactly  ')
		store.save({ ...store.get(1)!, status: 'paused', hold: { code: 'checkpoint', message: 'Next node', context: { key: 'first', next: 'second' } } }, 'paused')
		assert.equal((await send({ text: '  checkpoint words  ' })).status, 200)
		assert.equal(store.get(1)!.steer, '  checkpoint words  ')
		assert.equal(store.get(1)!.passed, 'first')
		store.save({ ...store.get(1)!, status: 'paused', hold: { code: 'checkpoint', message: 'Another node', context: { key: 'second', next: 'third' } } }, 'paused')
		const receipts = store.events(1).filter((e) => e.kind === 'operator-message').length
		assert.equal((await send({ text: '  checkpoint words  ' })).status, 200, 'the same text at a new checkpoint is a new instruction')
		assert.equal(store.get(1)!.passed, 'second')
		assert.equal(store.events(1).filter((e) => e.kind === 'operator-message').length, receipts + 1)
	} finally { await t.close() }
})

test('same request and competing answers across two server connections commit at most once', async () => {
	const a = await setup()
	const b = await setup({}, a.dir)
	try {
		const body = a.submit()
		const submits = await Promise.all([a.post('/items', body), b.post('/items', body)])
		assert.deepEqual(submits.map((r) => r.status).sort(), [200, 201])
		assert.equal(a.open()!.list().length, 1)
		const item = held(a.open()!, 1)
		const results = await Promise.all([a.post('/items/1/answers', { requestId: randomUUID(), revision: revisionOf(item), text: 'one' }), b.post('/items/1/answers', { requestId: randomUUID(), revision: revisionOf(item), text: 'two' })])
		assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
		assert.equal(a.open()!.events(1).filter((e) => e.kind === 'nq-answer').length, 1)
	} finally { await a.close(); await b.close() }
})

test('process death inside a request rolls back item and events; receipts survive pruning', async () => {
	const t = await setup()
	try {
		const storeUrl = new URL('../src/store.ts', import.meta.url).href
		const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import {openStore} from ${JSON.stringify(storeUrl)}; const s=openStore(${JSON.stringify(t.path)}); s.operatorRequest('crash-request-00001','fingerprint',()=>{s.create({title:'never committed',objective:'none',source:'none',workspace:${JSON.stringify(t.dir)}}); process.exit(7)});`])
		assert.equal(result.status, 7)
		assert.equal(t.open()!.list().length, 0)
		assert.equal(t.open()!.allEvents().length, 0)
		const body = t.submit()
		assert.equal((await t.post('/items', body)).status, 201)
		t.open()!.prune([1], new Date().toISOString(), false)
		const replay = await t.post('/items', body)
		assert.equal(replay.status, 200)
		assert.equal(replay.body.receipt.replayed, true)
		assert.equal(replay.body.context, null)
		assert.equal(t.open()!.list().length, 0, 'an old request never recreates pruned work')
	} finally { await t.close() }
})

test('security and input bounds reject cross-origin, DNS rebinding, forged forwarding, missing tokens and malformed bodies', async () => {
	const t = await setup({ origins: ['https://trusted.example'] })
	try {
		const cases: [Record<string, string>, number, string][] = [
			[{ Origin: 'https://evil.example' }, 403, 'origin_forbidden'], [{ Origin: 'null' }, 403, 'origin_forbidden'],
			[{ 'X-MW-CSRF': '' }, 403, 'csrf_required'], [{ 'Content-Type': 'text/plain' }, 415, 'content_type'],
			[{ 'Content-Encoding': 'gzip' }, 415, 'content_type'], [{ 'Sec-Fetch-Site': 'cross-site' }, 403, 'origin_forbidden'],
			[{ Host: 'evil.example', 'X-Forwarded-Host': 'trusted.example' }, 403, 'origin_forbidden'],
		]
		for (const [headers, status, reason] of cases) {
			const r = await t.post('/items', t.submit(), headers)
			assert.equal(r.status, status, JSON.stringify(headers))
			assert.equal(r.body.reason, reason)
			assert.equal(r.headers.get('content-type'), 'application/problem+json')
			assert.equal(r.body.recovery.preserveDraft, true)
		}
		assert.equal(existsSync(t.path), false)
		for (const value of [[], null, t.submit({ objective: '  ' }), t.submit({ requestId: 'short' }), t.submit({ source: 'x'.repeat(32769) }), t.submit({ command: 'rm -rf anything' }), { ...t.submit(), ['__proto__']: {} }]) assert.equal((await t.post('/items', value)).status, 400)
		assert.equal((await t.post('/items', t.submit({ source: 'x'.repeat(70000) }))).status, 413)
		const malformed = await fetch(`${t.url}/api/v1/items`, { method: 'POST', headers: t.headers, body: '{' })
		assert.equal(malformed.status, 400)
		assert.equal((await malformed.json()).reason, 'invalid_json')
		assert.equal(existsSync(t.path), false)
		assert.equal((await t.post('/items', t.submit(), { Origin: 'https://trusted.example', Host: 'trusted.example' })).status, 201, 'explicit trusted reverse proxy origin works')
		const forbidden = await t.post('/items/1/answers', {}, { Host: 'evil.example' })
		assert.equal(forbidden.status, 403)
		assert.equal(forbidden.body.task, null, 'security errors must not leak the task through contextual extensions')
	} finally { await t.close() }
})

test('JSON Schema maxLength counts Unicode code points rather than UTF-16 units', async () => {
	const t = await setup()
	try {
		const atBoundary = '😀'.repeat(2000)
		assert.equal(atBoundary.length, 4000)
		const accepted = await t.post('/items', t.submit({ objective: atBoundary }))
		assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
		assert.equal(t.open()!.get(1)!.objective, atBoundary)
		const rejected = await t.post('/items', t.submit({ objective: `${atBoundary}😀` }))
		assert.equal(rejected.status, 400)
		assert.equal(rejected.body.context.facts.field, 'objective')
		assert.equal(t.open()!.list().length, 1)
	} finally { await t.close() }
})

test('streaming bodies are bounded even without Content-Length', async () => {
	const t = await setup()
	try {
		const status = await new Promise<number>((resolve, reject) => {
			const req = request(`${t.url}/api/v1/items`, { method: 'POST', headers: t.headers }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode!)) })
			req.on('error', reject)
			req.write('x'.repeat(40_000)); req.end('x'.repeat(40_000))
		})
		assert.equal(status, 413)
		assert.equal(existsSync(t.path), false)
	} finally { await t.close() }
})

test('default context excludes huge raw packets, conversation pages preserve exact evidence and wake failure never hides acceptance', async () => {
	const t = await setup({ wake: async () => { throw new Error('scripted wake failure') } })
	try {
		const body = t.submit({ source: 's'.repeat(16000) })
		const accepted = await t.post('/items', body)
		assert.equal(accepted.status, 201)
		assert.equal(accepted.body.accepted, true)
		assert.equal(accepted.body.warnings.length, 1)
		const store = t.open()!
		store.note(1, 'trace-started', { invocation: randomUUID(), job: 'first', kind: 'execute', args: { prompt: 'packet'.repeat(100000) } })
		for (let i = 0; i < 60; i++) store.note(1, 'nq-answer', { originator: 'operator', answer: `answer ${i}: ${'a'.repeat(10000)}` })
		const context = contextOf(store, 1)
		assert.ok(JSON.stringify(context).length < 25_000)
		assert.equal(context.item.sourceTruncated, true)
		assert.equal(context.conversationTruncated, true)
		assert.ok(!JSON.stringify(context).includes('packet'))
		const first = (await t.get('/items/1/conversation')).body
		assert.equal(first.messages.length, 50)
		assert.equal(first.messages[0].text, body.source)
		assert.equal(first.hasMore, true)
		const second = (await t.get(`/items/1/conversation?after=${first.nextAfter}`)).body
		assert.equal(second.messages.length, 11)
		assert.equal(second.hasMore, false)
		assert.equal((await t.post('/items', body)).body.receipt.replayed, true)
	} finally { await t.close() }
})
