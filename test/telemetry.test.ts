import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'
import { Effect } from 'effect'
import type { Card } from '../src/cards.ts'
import { openStore } from '../src/store.ts'
import type { Facts } from '../src/telemetry.ts'

const dir = mkdtempSync(join(tmpdir(), 'mw-telemetry-'))
after(() => rmSync(dir, { recursive: true, force: true }))
const lines = (...events: object[]) => events.map((e) => JSON.stringify(e)).join('\n')
const card = (harness: Card['harness']): Card => ({ harness, provider: 'p', account: 'a', model: 'm', effort: 'low' })
const bytes = (v: unknown) => Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v))

let stores = 0
function freshStore() {
	const store = openStore(join(dir, `s${++stores}`, 'mw.db'))
	const item = store.create({ title: 't', objective: 'o', source: 's', workspace: dir })
	const record = (harness: Card['harness'], raw: string | null, extra: { facts?: Facts; output?: string; ms?: number } = {}) => {
		const id = store.recordCall({ item: item.id, kind: 'execute', job: 'implement', profile: 'implementer', card: card(harness), system: 'brief', prompt: 'packet', outcome: 'ok', output: extra.output ?? 'done', error: null, raw, started: '2026-10-21T12:00:00.000Z', ms: extra.ms ?? 1000 }, extra.facts)
		return store.calls().find((c) => c.id === id)!
	}
	return { store, item, record }
}

// A real `amp -x --stream-json` run: one shell command, then the answer.
const AMP = lines(
	{ type: 'system', subtype: 'init', cwd: '/tmp/fmt', session_id: 'T-1', tools: ['shell_command'] },
	{ type: 'assistant', message: { type: 'message', role: 'assistant', content: [{ type: 'tool_use', id: 'TU-1', name: 'shell_command', input: { command: 'echo hi', workdir: '/tmp/fmt' } }], stop_reason: 'tool_use', usage: { input_tokens: 0, cache_creation_input_tokens: 21370, cache_read_input_tokens: 1280, output_tokens: 22 } }, parent_tool_use_id: null },
	{ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'TU-1', content: '{"output":"hi\\n","exitCode":0}', is_error: false }] }, parent_tool_use_id: null },
	{ type: 'assistant', message: { type: 'message', role: 'assistant', content: [{ type: 'text', text: 'done' }], stop_reason: 'end_turn', usage: { input_tokens: 0, cache_creation_input_tokens: 95, cache_read_input_tokens: 22592, output_tokens: 3 } }, parent_tool_use_id: null },
	{ type: 'result', subtype: 'success', duration_ms: 7323, is_error: false, num_turns: 2, result: 'done' },
)

// Claude Code repeats one message's usage on each of its content blocks.
const claude = (withTotal: boolean) => lines(
	{ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'a.ts' } }], usage: { input_tokens: 3, output_tokens: 40, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } } },
	{ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id: 't2', name: 'Grep', input: { pattern: 'x' } }], usage: { input_tokens: 3, output_tokens: 40, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } } },
	{ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: 'file body' }] }] } },
	{ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't2', content: 'no matches', is_error: true }] } },
	{ type: 'assistant', message: { id: 'm2', content: [{ type: 'text', text: 'done' }], usage: { input_tokens: 2, output_tokens: 5, cache_read_input_tokens: 140, cache_creation_input_tokens: 9 } } },
	{ type: 'result', subtype: 'success', is_error: false, result: 'done', ...(withTotal ? { usage: { input_tokens: 11, output_tokens: 50, cache_read_input_tokens: 7, cache_creation_input_tokens: 13 } } : {}) },
)

test('each harness\'s raw stream becomes tool events and tokens on the call', () => {
	const { record } = freshStore()

	const amp = record('amp', AMP)
	assert.deepEqual(amp.tools.map(({ digest, ...t }) => t), [{ seq: 1, tool: 'shell_command', inputBytes: bytes({ command: 'echo hi', workdir: '/tmp/fmt' }), outputBytes: bytes('{"output":"hi\\n","exitCode":0}'), tokens: 22, at: null, ms: null, error: false }])
	assert.deepEqual(amp.tokens, { input: 0, output: 25, cacheRead: 23872, cacheWrite: 21465 }, 'Amp reports no total: its steps are summed')

	const total = record('claude', claude(true))
	assert.deepEqual(total.tools.map((t) => [t.tool, t.tokens, t.outputBytes, t.error]), [['Read', 40, bytes([{ type: 'text', text: 'file body' }]), false], ['Grep', null, bytes('no matches'), true]], 'a step\'s tokens go on its first tool only')
	assert.deepEqual(total.tokens, { input: 11, output: 50, cacheRead: 7, cacheWrite: 13 }, 'the result\'s own total wins')
	assert.deepEqual(record('claude', claude(false)).tokens, { input: 5, output: 45, cacheRead: 240, cacheWrite: 9 }, 'without a total, each message counts once')

	const codex = record('codex', lines(
		{ type: 'thread.started', thread_id: 't' },
		{ type: 'item.started', mw_at: Date.UTC(2026, 9, 21, 12, 0, 1), item: { id: 'i1', type: 'command_execution', command: 'npm test', aggregated_output: '', status: 'in_progress' } },
		{ type: 'item.completed', mw_at: Date.UTC(2026, 9, 21, 12, 0, 1, 600), item: { id: 'i1', type: 'command_execution', command: 'npm test', aggregated_output: '1 failing', exit_code: 1, status: 'completed' } },
		{ type: 'item.completed', item: { id: 'i2', type: 'reasoning', text: 'hm' } },
		{ type: 'item.completed', mw_at: Date.UTC(2026, 9, 21, 12, 0, 2), item: { id: 'i3', type: 'file_change', changes: [{ path: 'src/a.ts', kind: 'update' }], status: 'completed' } },
		{ type: 'item.completed', item: { id: 'i4', type: 'command_execution', command: 'npm test', aggregated_output: 'ok', exit_code: 0, status: 'completed' } },
		{ type: 'item.completed', item: { id: 'i5', type: 'agent_message', text: 'done' } },
		{ type: 'turn.completed', usage: { input_tokens: 100, cached_input_tokens: 60, cache_write_input_tokens: 0, output_tokens: 9, reasoning_output_tokens: 4 } },
	))
	assert.deepEqual(codex.tools.map((t) => [t.tool, t.at, t.ms, t.error]), [['command_execution', '2026-10-21T12:00:01.000Z', 600, true], ['file_change', '2026-10-21T12:00:02.000Z', null, false], ['command_execution', null, null, false]])
	assert.equal(codex.tools[0]!.digest, codex.tools[2]!.digest, 'the same input has the same digest')
	assert.notEqual(codex.tools[0]!.digest, codex.tools[1]!.digest)
	assert.deepEqual(codex.tokens, { input: 40, output: 9, cacheRead: 60, cacheWrite: 0 }, 'Codex input counts cached tokens; the record keeps them apart')

	const pi = record('pi', lines(
		{ type: 'message_end', message: { role: 'assistant', content: [{ type: 'toolCall', id: 'c1', name: 'read', arguments: { path: 'a' } }, { type: 'toolCall', id: 'c2', name: 'bash', arguments: { command: 'ls' } }], usage: { input: 5, output: 12, cacheRead: 3, cacheWrite: 0 }, stopReason: 'toolUse', timestamp: 1 } },
		{ type: 'tool_execution_start', toolCallId: 'c1', toolName: 'read', args: { path: 'a' } },
		{ type: 'tool_execution_start', toolCallId: 'c2', toolName: 'bash', args: { command: 'ls' } },
		{ type: 'tool_execution_end', toolCallId: 'c2', toolName: 'bash', result: { content: [{ type: 'text', text: 'boom' }] }, isError: true },
		{ type: 'tool_execution_end', toolCallId: 'c1', toolName: 'read', result: { content: [{ type: 'text', text: 'body' }] }, isError: false },
		{ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }], usage: { input: 2, output: 4, cacheRead: 8, cacheWrite: 1 }, stopReason: 'stop', timestamp: 2 } },
	))
	assert.deepEqual(pi.tools.map((t) => [t.seq, t.tool, t.tokens, t.inputBytes, t.error]), [[1, 'read', 12, bytes({ path: 'a' }), false], [2, 'bash', null, bytes({ command: 'ls' }), true]])
	assert.deepEqual(pi.tokens, { input: 7, output: 16, cacheRead: 11, cacheWrite: 1 })

	const none = record('claude', null)
	assert.deepEqual([none.tools, none.tokens, none.flags, none.facts], [[], null, [], null])
})

test('a store from before the trace gains tool events and tokens for its recorded calls', () => {
	const path = join(mkdtempSync(join(dir, 'old-')), 'mw.db')
	const db = new DatabaseSync(path)
	db.exec('CREATE TABLE calls (id INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, kind TEXT NOT NULL, job TEXT NOT NULL, profile TEXT NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL)')
	db.prepare("INSERT INTO calls (item, kind, job, profile, card, system, prompt, outcome, output, error, raw, started, ms) VALUES (1, 'execute', 'plan', 'planner', ?, 's', 'p', 'ok', 'done', NULL, ?, '2026-10-21T12:00:00Z', 5)").run(JSON.stringify(card('amp')), AMP)
	db.close()
	for (let open = 0; open < 2; open++) {
		const store = openStore(path)
		const [call] = store.calls()
		assert.deepEqual([call!.tools.map((t) => t.tool), call!.tokens?.output, call!.flags], [['shell_command'], 25, []], `opened ${open + 1} time(s)`)
		store.close()
	}
})

test('rule breaks are computed from the engine\'s facts and the stream, and stored on the call', () => {
	const { record } = freshStore()
	const edit = lines({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'e', name: 'Edit', input: {} }, { type: 'tool_use', id: 'r', name: 'Read', input: {} }], usage: { input_tokens: 10, output_tokens: 5 } } })
	const rules = (raw: string | null, facts: Facts, extra: { output?: string; ms?: number } = {}) => record('claude', raw, { facts, ...extra }).flags

	assert.deepEqual(rules(edit, { access: 'read' }), [{ rule: 'write-under-read', evidence: { tools: ['Edit'], files: [] } }])
	assert.deepEqual(rules(edit, { access: 'make' }), [])
	assert.deepEqual(rules(null, { access: 'read', changed: ['x.ts'] }), [{ rule: 'write-under-read', evidence: { tools: [], files: ['x.ts'] } }], 'a shell write shows up as a changed file')

	assert.deepEqual(rules(null, { head: { before: 'abc', after: 'abc' } }), [])
	assert.deepEqual(rules(null, { head: { before: 'abc', after: 'def' } }), [{ rule: 'head-moved', evidence: { before: 'abc', after: 'def' } }])

	const scope = ['src/', 'test/*.ts', 'README']
	assert.deepEqual(rules(null, { scope, changed: ['src/a.ts', './src/deep/b.ts', 'srcx/c.ts', 'test/a.ts', 'test/sub/b.ts', 'README', 'README.md'] }), [{ rule: 'out-of-scope', evidence: { files: ['srcx/c.ts', 'test/sub/b.ts', 'README.md'], scope } }])

	assert.deepEqual(rules(edit, { budget: { tokens: 15, ms: 1000 } }, { ms: 1000 }), [], 'exactly on budget is within it')
	assert.deepEqual(rules(edit, { budget: { tokens: 14, ms: 999 } }, { ms: 1000 }), [{ rule: 'over-budget', evidence: { tokens: 15, ms: 1000, budget: { tokens: 14, ms: 999 } } }])

	assert.deepEqual(rules(edit, { allowlist: ['Read'] }), [{ rule: 'tool-not-allowed', evidence: { tools: ['Edit'], allowlist: ['Read'] } }])

	const required = ['understanding', 'questions']
	assert.deepEqual(rules(null, { required }, { output: 'Clear.\n{"understanding":"x","questions":[]}' }), [])
	assert.deepEqual(rules(null, { required }, { output: 'Clear.\n{"understanding":"x"}' }), [{ rule: 'missing-fields', evidence: { fields: ['questions'] } }])
	assert.deepEqual(rules(null, { required }, { output: 'no JSON at all' }), [{ rule: 'missing-fields', evidence: { fields: required } }])

	const all = record('claude', edit, { facts: { access: 'read', allowlist: ['Read'] } })
	assert.deepEqual(all.flags.map((f) => f.rule), ['write-under-read', 'tool-not-allowed'])
	assert.deepEqual(all.facts, { access: 'read', allowlist: ['Read'] }, 'the facts stay on the record, so the flags can be recomputed')
})

test('a refused answer stays on the record as rejected, with the reason', () => {
	const { store, record } = freshStore()
	const call = record('claude', null)
	store.rejectCall(call.id, 'The intake did not end with {"understanding": string, "questions": string[], "notes": string[]}.')
	const [stored] = store.calls()
	assert.equal(stored!.outcome, 'rejected')
	assert.match(stored!.error!, /did not end with/)
	assert.equal(stored!.output, 'done', 'the refused answer is kept')
})

test('runner start, stop, and a lost runner are events; the loss is on the item it was driving', async () => {
	const { store, item } = freshStore()
	const dead = spawnSync(process.execPath, ['-e', '']).pid!
	const db = new DatabaseSync(store.path)
	db.prepare('INSERT INTO runner (id, pid, since, item) VALUES (1, ?, ?, ?)').run(dead, '2026-10-21T14:02:11Z', item.id)
	db.close()

	await Effect.runPromise(store.claimRunner())
	store.releaseRunner()
	assert.deepEqual(store.events(item.id).filter((e) => e.kind === 'runner-lost').map((e) => e.data), [{ pid: dead, since: '2026-10-21T14:02:11Z', item: item.id }])
	assert.deepEqual(store.allEvents().filter((e) => e.item === 0).map((e) => [e.kind, e.data]), [['runner-started', { pid: process.pid, replaced: dead }], ['runner-stopped', { pid: process.pid }]])
})

test('the glass beside the store is rewritten after each saved transition and shows tools, tokens and flags', () => {
	const { store, item, record } = freshStore()
	const glass = () => JSON.parse(/const DATA = (.*);\n/.exec(readFileSync(store.glass, 'utf8'))![1]!)
	assert.equal(glass().items.length, 1, 'written on create')
	record('amp', AMP, { facts: { access: 'read', allowlist: ['Read'] } })
	assert.equal(glass().calls.length, 0, 'a call alone is not a transition')
	store.save(item, 'handed-off', { from: 'ideate', to: 'challenge' })
	const [call] = glass().calls
	assert.deepEqual([call.tools[0].tool, call.tokens.output, call.flags.map((f: { rule: string }) => f.rule)], ['shell_command', 25, ['tool-not-allowed']])
	assert.equal(call.raw, undefined, 'raw streams stay out of the glass')
	assert.equal(call.rawBytes, AMP.length)
	assert.deepEqual(readdirSync(join(store.glass, '..')).filter((f) => f.startsWith('glass')), ['glass.html'], 'no temp file left behind')
})

const cli = join(import.meta.dirname, '../src/cli.ts')
const mwIn = (home: string, extra: Record<string, string> = {}) => (...args: string[]) => {
	const { MW_DEBUG: _, ...env } = process.env
	const r = spawnSync(process.execPath, [cli, ...args], { env: { ...env, MW_STORE: join(home, 'mw.db'), MW_WORKER_COMMAND: `${process.execPath} ${join(import.meta.dirname, 'fixtures/scripted-worker.ts')}`, FAKE_LOG: join(home, 'calls.log'), ...extra }, cwd: home, encoding: 'utf8' })
	return { code: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr ? JSON.parse(r.stderr) : null }
}

test('mw export writes one folder per call: brief, packet, answer, raw stream, tool events and flags', () => {
	const home = mkdtempSync(join(dir, 'export-'))
	writeFileSync(join(home, 'madewell.json'), JSON.stringify({ ship: 'true' }))
	const mw = mwIn(home)
	mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')
	assert.equal(mw('run').code, 0)

	const out = join(home, 'out')
	const exported = mw('export', '1', '--out', out)
	assert.equal(exported.code, 0, JSON.stringify(exported.err))
	assert.deepEqual([exported.out.export, exported.out.calls], [out, 12])
	const folders = readdirSync(out).filter((f) => f !== 'item.json')
	assert.deepEqual(folders.slice(0, 3), ['001-intake-ideate', '002-execute-ideate', '003-intake-challenge'])
	assert.equal(folders.length, 12)
	for (const f of folders) assert.deepEqual(readdirSync(join(out, f)).sort(), ['answer.txt', 'brief.txt', 'call.json', 'flags.json', 'packet.txt', 'raw.jsonl', 'tools.json'])
	assert.equal(readFileSync(join(out, '002-execute-ideate', 'answer.txt'), 'utf8'), 'ideate deliverable')
	assert.match(readFileSync(join(out, '002-execute-ideate', 'packet.txt'), 'utf8'), /operator: add CSV export/)
	assert.match(readFileSync(join(out, '002-execute-ideate', 'brief.txt'), 'utf8'), /You are the ideator/)
	assert.deepEqual(JSON.parse(readFileSync(join(out, '002-execute-ideate', 'call.json'), 'utf8')).outcome, 'ok')
	const record = JSON.parse(readFileSync(join(out, 'item.json'), 'utf8'))
	assert.equal(record.item.status, 'shipped')
	assert.equal(record.events.at(-1).kind, 'shipped')

	const missing = mw('export', '9')
	assert.equal(missing.code, 1)
	assert.equal(missing.err.error, 'item_not_found')
})

test('debug mode writes every span to a JSONL file beside the store, only when MW_DEBUG=1, and never to the output', () => {
	const quiet = mkdtempSync(join(dir, 'quiet-'))
	writeFileSync(join(quiet, 'madewell.json'), JSON.stringify({ ship: 'true' }))
	mwIn(quiet)('start', '--objective', 'x', '--source', 'y')
	assert.equal(mwIn(quiet)('run').code, 0)
	assert.equal(existsSync(join(quiet, 'debug.jsonl')), false)

	const home = mkdtempSync(join(dir, 'debug-'))
	writeFileSync(join(home, 'madewell.json'), JSON.stringify({ ship: 'true' }))
	const mw = mwIn(home, { MW_DEBUG: '1' })
	mw('start', '--objective', 'x', '--source', 'y')
	const ran = mw('run')
	assert.equal(ran.code, 0)
	assert.equal(ran.out.items[0].status, 'shipped', 'stdout is still only the JSON answer')
	const spans = readFileSync(join(home, 'debug.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
	const drive = spans.find((s) => s.name === 'mw.drive')
	assert.equal(drive.attributes.item, 1)
	const execute = spans.find((s) => s.name === 'mw.execute.implement')
	assert.deepEqual([execute.attributes.job, execute.attributes.profile, execute.outcome], ['implement', 'implementer', 'ok'])
	assert.equal(execute.trace, drive.trace, 'one trace per run')
	assert.ok(spans.find((s) => s.span === execute.parent), 'each span names its parent')

	const glass = readFileSync(join(home, 'glass.html'), 'utf8')
	assert.match(glass, /"kind":"runner-started"/)
	assert.match(glass, /"kind":"runner-stopped"/)
})
