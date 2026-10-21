import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildLaunch, clockToEpoch, parseRun } from '../src/harness.ts'

const NOW = Date.UTC(2026, 9, 16, 12, 0)
const lines = (...events: object[]) => events.map((e) => JSON.stringify(e)).join('\n')
const card = (harness: 'claude' | 'codex' | 'pi') => ({ harness, provider: harness === 'claude' ? 'anthropic' : 'openai', account: harness === 'claude' ? 'anthropic' : 'openai', model: 'm', effort: 'low' as const })

test('a successful run of each harness yields its final answer', () => {
	assert.deepEqual(parseRun('claude', lines({ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } }, { type: 'result', subtype: 'success', is_error: false, result: 'ok' }), 'anthropic', NOW), { output: 'ok', ok: true, limit: null, error: '' })
	assert.deepEqual(parseRun('codex', lines({ type: 'thread.started', thread_id: 't' }, { type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }, { type: 'turn.completed' }), 'openai', NOW), { output: 'ok', ok: true, limit: null, error: '' })
	assert.deepEqual(parseRun('pi', lines({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'stop' } }), 'openai', NOW), { output: 'ok', ok: true, limit: null, error: '' })
	assert.equal(parseRun('codex', lines({ type: 'turn.failed', error: { message: 'boom' } }), 'openai', NOW).ok, false)
})

test('usage limits are read from each harness\'s own events, with their reset time', () => {
	const claude = parseRun('claude', lines({ type: 'result', subtype: 'success', is_error: false, result: "You've hit your session limit · resets 7:10am (UTC)" }), 'anthropic', NOW)
	assert.equal(claude.ok, false)
	assert.deepEqual(claude.limit, { account: 'anthropic', resetsAt: Date.UTC(2026, 9, 17, 7, 10), message: "You've hit your session limit · resets 7:10am (UTC)" })
	const machine = parseRun('codex', lines({ type: 'event_msg', payload: { rate_limits: { primary: { resets_at: 1791046824 }, rate_limit_reached_type: 'primary' } } }), 'openai', NOW)
	assert.deepEqual(machine.limit, { account: 'openai', resetsAt: 1791046824 * 1000, message: 'usage limit reached (primary)' })
	const fine = parseRun('codex', lines({ type: 'event_msg', payload: { rate_limits: { primary: { resets_at: 1791046824 }, rate_limit_reached_type: null } } }, { type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }, { type: 'turn.completed' }), 'openai', NOW)
	assert.equal(fine.limit, null, 'a rate-limit report with nothing reached is not a limit')
	const message = 'You have hit your ChatGPT usage limit (pro plan). Try again in ~42 min.'
	const pi = parseRun('pi', lines({ type: 'message_end', message: { role: 'assistant', content: [], stopReason: 'error', errorMessage: message } }), 'openai', NOW)
	assert.deepEqual(pi.limit, { account: 'openai', resetsAt: NOW + 42 * 60_000, message })
	const quoted = parseRun('claude', lines({ type: 'user', message: { content: [{ type: 'tool_result', content: "You've hit your weekly limit · resets 4pm (UTC)" }] } }, { type: 'result', subtype: 'success', is_error: false, result: 'done' }), 'anthropic', NOW)
	assert.equal(quoted.limit, null, 'a limit message quoted in tool output is not a limit')
	assert.equal(clockToEpoch('Mon 12:00am (UTC)', NOW), Date.UTC(2026, 9, 19, 0, 0))
})

test('read access never grants writing tools', () => {
	assert.ok(buildLaunch(card('claude'), 'read', 's').args.join(' ').includes('--tools Read,Grep,Glob'))
	assert.ok(buildLaunch(card('codex'), 'read', 's').args.includes('read-only'))
	assert.ok(buildLaunch(card('pi'), 'read', 's').args.join(' ').includes('--tools read,grep,find,ls'))
	assert.ok(!buildLaunch(card('claude'), 'make', 's').args.includes('--tools'))
})

test('Amp jobs never get sub-agent tools, and read access also loses the editing tools', async () => {
	const { readFileSync } = await import('node:fs')
	const amp = { harness: 'amp' as const, provider: 'amp', account: 'amp', model: 'low', effort: 'low' as const }
	const disabled = (access: 'read' | 'make') => {
		const { args, prefix } = buildLaunch(amp, access, 'system brief', 'title')
		assert.equal(prefix, 'system brief', 'Amp has no system-prompt flag: the brief goes on stdin')
		return JSON.parse(readFileSync(args[args.indexOf('--settings-file') + 1]!, 'utf8'))['amp.tools.disable'] as string[]
	}
	for (const access of ['read', 'make'] as const) for (const tool of ['Task', 'oracle', 'librarian', 'finder', 'create_thread', 'code_exec']) assert.ok(disabled(access).includes(tool), `${access}: ${tool}`)
	assert.ok(disabled('read').includes('edit_file') && disabled('read').includes('create_file'))
	assert.ok(!disabled('make').includes('edit_file'))
})
