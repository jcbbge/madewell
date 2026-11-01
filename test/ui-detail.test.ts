import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { openStore } from '../src/store.ts'
import { itemDetail, staticPage } from '../src/ui.ts'

function setup() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-item-detail-')))
	const path = join(root, 'work.db')
	const store = openStore(path)
	const item = store.create({ title: 'Saved evidence fixture', objective: 'Inspect exact saved evidence.', source: 'Scripted local regression only.', workspace: root })
	return { root, path, store, item, cleanup() { store.close(); rmSync(root, { recursive: true, force: true }) } }
}

async function server(path: string, broken = false) {
	const entry = pathToFileURL(join(import.meta.dirname, '../src/ui.ts')).href
	const program = `import { Effect } from 'effect'; import { serve } from ${JSON.stringify(entry)}; process.on('SIGTERM', () => process.exit(0)); await Effect.runPromise(serve(process.argv[1], () => ${broken ? "[{run:1n,why:'Unserializable fixture.'}]" : '[]'}, '127.0.0.1', 0));`
	const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('MW_')))
	const child = spawn(process.execPath, ['--input-type=module', '-e', program, path], { cwd: join(import.meta.dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] })
	const stopped = new Promise<void>(resolve => child.once('close', () => resolve()))
	let stderr = ''
	child.stderr.on('data', data => { stderr += data })
	try {
		const url = await new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('The fixture UI did not start.')), 10_000)
			let stdout = ''
			child.stdout.on('data', data => {
				stdout += data
				if (!stdout.includes('\n')) return
				clearTimeout(timer)
				try { resolve(JSON.parse(stdout.split('\n')[0]!).ui) } catch (error) { reject(error) }
			})
			child.once('error', error => { clearTimeout(timer); reject(error) })
			child.once('exit', () => { clearTimeout(timer); reject(new Error(`The fixture UI exited: ${stderr}`)) })
		})
		return { url, async stop() { child.kill('SIGTERM'); await stopped; assert.doesNotMatch(stderr, /ERR_HTTP_HEADERS_SENT|UnhandledPromiseRejection/) } }
	} catch (error) { child.kill('SIGKILL'); await stopped; throw error }
}

test('large legacy details load without repeated traces, and call/trace evidence and offline replay remain available', { timeout: 30_000 }, async () => {
	const t = setup()
	try {
		const prompt = `Complete saved packet: ${'fixture '.repeat(4096)}`
		const card = { harness: 'claude', provider: 'fixture', account: 'fixture', model: 'fixture', effort: 'low' as const }
		for (let index = 0; index < 68; index++) {
			const invocation = `fixture-${index}`
			const call = t.store.recordCall({ item: t.item.id, kind: 'execute', job: 'ideate', profile: 'ideator', card, system: 'Fixture brief.', prompt, output: 'Saved output.', raw: 'Saved transcript.', error: null, outcome: 'ok', started: new Date().toISOString(), ms: 1 })
			t.store.note(t.item.id, 'trace-started', { invocation, parent: `item:${t.item.id}:round:1:job:ideate`, pid: process.pid, job: 'ideate', kind: 'execute', args: { prompt, system: 'Fixture brief.' } })
			for (let fragment = 0; fragment < 64; fragment++) t.store.note(t.item.id, 'trace-output', { invocation, channel: 'stdout', text: 'Saved fragment. '.repeat(64) })
			t.store.note(t.item.id, 'trace-call', { invocation, call })
			t.store.note(t.item.id, 'trace-finished', { invocation, status: 'returned', result: { ok: true, output: 'Saved output.' }, ms: 1 })
		}
		assert.ok(t.store.events(t.item.id).length > 4487)
		const detail = itemDetail(t.store, () => [], t.item.id)!
		assert.ok(!('trace' in detail) && !('traces' in detail), 'live details leave selected lenses to the trace route')
		assert.ok(JSON.stringify(detail).length < 200_000, 'legacy details stay below one saved deep trace')
		const ui = await server(t.path)
		try {
			const response = await fetch(`${ui.url}api/item/${t.item.id}`, { signal: AbortSignal.timeout(10_000) })
			assert.equal(response.status, 200)
			const body = await response.json()
			assert.equal(body.calls.length, 68)
			assert.equal(body.trace, undefined)
			assert.equal(body.traces, undefined)
			const call = await (await fetch(`${ui.url}api/call/${body.calls[0].id}`, { signal: AbortSignal.timeout(10_000) })).json()
			assert.equal(call.prompt, prompt)
			assert.equal(call.raw, 'Saved transcript.')
			const trace = await (await fetch(`${ui.url}api/trace/${t.item.id}?lens=ax`, { signal: AbortSignal.timeout(10_000) })).json()
			assert.equal(trace.invocations.length, 68)
			assert.equal(trace.invocations[0].args.prompt, prompt)
			assert.equal(trace.invocations[0].call.prompt, prompt)
			assert.equal(trace.invocations[0].entries.filter((e: { kind: string }) => e.kind === 'trace-output').length, 64)
			assert.equal((await fetch(`${ui.url}api/mark`, { signal: AbortSignal.timeout(10_000) })).status, 200, 'the next request still succeeds')
		} finally { await ui.stop() }
		const page = staticPage(t.store, () => [])
		const data = JSON.parse(/<script>var STATIC = (.*?);<\/script>/s.exec(page)![1]!.replaceAll('<\\/', '</'))
		const replay = data.details[t.item.id]
		assert.equal(replay.trace, undefined, 'replay does not duplicate AX through its old alias')
		assert.deepEqual(Object.keys(replay.traces), ['ux', 'dx', 'ax'])
		for (const lens of ['ux', 'dx', 'ax']) assert.equal(replay.traces[lens].lens, lens)
		assert.equal(replay.traces.ax.invocations[0].args.prompt, prompt)
		assert.equal(data.calls[replay.calls[0].id].prompt, prompt)
	} finally { t.cleanup() }
})

test('serialization failures return JSON errors before headers and preserve synchronous and asynchronous read routes', { timeout: 20_000 }, async () => {
	const t = setup()
	try {
		t.store.save({ ...t.item, status: 'paused' }, 'fixture-paused')
		const ui = await server(t.path, true)
		try {
			for (const route of [`api/item/${t.item.id}`, `api/trace/${t.item.id}?lens=ux`]) {
				const response = await fetch(ui.url + route, { signal: AbortSignal.timeout(10_000) })
				assert.equal(response.status, 500)
				assert.match(response.headers.get('content-type')!, /application\/json/)
				assert.equal((await response.json()).error, 'console_failed')
				assert.equal((await fetch(ui.url + 'api/mark', { signal: AbortSignal.timeout(10_000) })).status, 200)
			}
		} finally { await ui.stop() }
	} finally { t.cleanup() }
})
