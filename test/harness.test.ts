import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { harnessOf, loadPrescriptions } from '../src/cards.ts'
import { buildLaunch, clockToEpoch, HARNESSES, harnessWorker, parseRun, tokensIn, type Harness } from '../src/harness.ts'
import { commandWorker, Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const NOW = Date.UTC(2026, 9, 16, 12, 0)
const lines = (...events: object[]) => events.map((e) => JSON.stringify(e)).join('\n')
const card = (harness: string) => ({ harness, provider: 'p', account: 'acct', model: 'm', effort: 'low' as const })
const call = { system: 'the brief', prompt: 'the packet', title: 't', dir: '/call' }

// One recorded transcript per harness entry. Amp's is a real `amp -x --stream-json` run on read access (asked
// for its tools and $PORT); the others reproduce their harness's documented event shapes.
const RECORDED: Record<string, { stdout: string; output: string; tokens: number }> = {
	amp: { stdout: readFileSync(join(import.meta.dirname, 'fixtures/amp-transcript.jsonl'), 'utf8'), output: 'shell_command, shell_command_kill, shell_command_status\nPORT=', tokens: 670 + 60 + 106 + 15 },
	claude: { stdout: lines({ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } }, { type: 'result', subtype: 'success', is_error: false, result: 'ok', usage: { input_tokens: 3, cache_creation_input_tokens: 40, cache_read_input_tokens: 900, output_tokens: 7 } }), output: 'ok', tokens: 50 },
	codex: { stdout: lines({ type: 'thread.started', thread_id: 't' }, { type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }, { type: 'turn.completed', usage: { input_tokens: 20, cached_input_tokens: 10, output_tokens: 5 } }), output: 'ok', tokens: 25 },
	pi: { stdout: lines({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'stop', usage: { input: 11, output: 4 } } }), output: 'ok', tokens: 15 },
}

test('every built-in harness entry reads its final answer and token count from a recorded transcript', () => {
	assert.deepEqual(Object.keys(RECORDED).sort(), Object.keys(HARNESSES).sort(), 'each entry has a recorded transcript')
	for (const [name, r] of Object.entries(RECORDED)) {
		assert.deepEqual(parseRun(HARNESSES[name]!, r.stdout, 'acct', NOW), { output: r.output, ok: true, limit: null, error: '' }, name)
		assert.equal(r.stdout.split('\n').reduce((n, l) => n + tokensIn(HARNESSES[name]!, l), 0), r.tokens, name)
	}
	assert.equal(parseRun(HARNESSES.codex!, lines({ type: 'item.completed', item: { type: 'agent_message', text: 'half' } }, { type: 'turn.failed', error: { message: 'boom' } }), 'acct', NOW).ok, false)
})

test('usage limits are read from each harness\'s own events, with their reset time', () => {
	const claude = parseRun(HARNESSES.claude!, lines({ type: 'result', subtype: 'success', is_error: false, result: "You've hit your session limit · resets 7:10am (UTC)" }), 'anthropic', NOW)
	assert.equal(claude.ok, false)
	assert.deepEqual(claude.limit, { account: 'anthropic', resetsAt: Date.UTC(2026, 9, 17, 7, 10), message: "You've hit your session limit · resets 7:10am (UTC)" })
	const record = parseRun(HARNESSES.claude!, lines({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1791046824, rateLimitType: 'five_hour' } }, { type: 'result', subtype: 'error_during_execution', is_error: true, result: '' }), 'anthropic', NOW)
	assert.deepEqual(record.limit, { account: 'anthropic', resetsAt: 1791046824 * 1000, message: 'rate limit five_hour' })
	const machine = parseRun(HARNESSES.codex!, lines({ type: 'event_msg', payload: { rate_limits: { primary: { resets_at: 1791046824 }, rate_limit_reached_type: 'primary' } } }), 'openai', NOW)
	assert.deepEqual(machine.limit, { account: 'openai', resetsAt: 1791046824 * 1000, message: 'usage limit reached (primary)' })
	const said = parseRun(HARNESSES.codex!, lines({ type: 'error', message: "You've hit your usage limit. Upgrade to Pro or try again at 9:45 PM (UTC)." }, { type: 'turn.failed', error: { message: 'usage limit' } }), 'openai', NOW)
	assert.equal(said.limit?.resetsAt, Date.UTC(2026, 9, 16, 21, 45))
	const fine = parseRun(HARNESSES.codex!, lines({ type: 'event_msg', payload: { rate_limits: { primary: { resets_at: 1791046824 }, rate_limit_reached_type: null } } }, { type: 'item.completed', item: { type: 'agent_message', text: 'ok' } }, { type: 'turn.completed' }), 'openai', NOW)
	assert.equal(fine.limit, null, 'a rate-limit report with nothing reached is not a limit')
	const message = 'You have hit your ChatGPT usage limit (pro plan). Try again in ~42 min.'
	const pi = parseRun(HARNESSES.pi!, lines({ type: 'message_end', message: { role: 'assistant', content: [], stopReason: 'error', errorMessage: message } }), 'openai', NOW)
	assert.deepEqual(pi.limit, { account: 'openai', resetsAt: NOW + 42 * 60_000, message })
	const quoted = parseRun(HARNESSES.claude!, lines({ type: 'user', message: { content: [{ type: 'tool_result', content: "You've hit your weekly limit · resets 4pm (UTC)" }] } }, { type: 'result', subtype: 'error_max_turns', is_error: true, result: '' }), 'anthropic', NOW)
	assert.equal(quoted.limit, null, 'a limit message quoted in tool output is not a limit')
	assert.equal(clockToEpoch('Mon 12:00am (UTC)', NOW), Date.UTC(2026, 9, 19, 0, 0))
})

test('each access level launches with exactly its tool allowlist, and read never gets a writing tool', () => {
	const writes = /^(edit|write|edit_file|create_file|apply_patch|danger-full-access)$/i
	for (const [name, harness] of Object.entries(HARNESSES)) {
		for (const access of ['read', 'checks', 'make', 'run'] as const) {
			const { args, files } = buildLaunch(card(name), access, call)
			const granted = files['/call/settings.json'] ? JSON.parse(files['/call/settings.json'])['amp.tools.enable'] : args[args.indexOf(name === 'codex' ? '-s' : '--tools') + 1]!.split(',')
			assert.deepEqual(granted, harness.tools[access], `${name} ${access}`)
			if (access === 'read') assert.ok(!granted.some((t: string) => writes.test(t)), `${name} read`)
		}
	}
	const amp = buildLaunch(card('amp'), 'make', call)
	assert.equal(amp.input, 'the brief\n\n---\n\nYour packet:\nthe packet', 'Amp has no system-prompt flag: the brief goes on stdin')
	for (const tool of ['Task', 'oracle', 'create_thread', 'code_exec', 'web_search', 'painter', 'view_media', 'ask_user_choice', 'read_thread', 'manage_amp']) assert.ok(!HARNESSES.amp!.tools.make.includes(tool), tool)
	assert.ok(buildLaunch(card('codex'), 'read', { ...call, system: 'say "hi"' }).args.includes('developer_instructions="say \\"hi\\""'))
})

// An operator-defined entry, added in prescriptions: plain text out, the packet is a shell script.
const shellEntry: Harness = {
	command: ['sh', '-c', '{prompt}', 'agent', '{settings}'],
	stdin: '',
	settings: { tools: '{tools}' },
	output: 'text',
	tools: { read: ['look'], checks: ['look', 'write'], make: ['look', 'write'], run: ['look', 'run'] },
	limit: { pattern: 'out of quota until (?<clock>.+)' },
	tokens: { event: { tokens: '*' }, paths: ['tokens'] },
}
const dir = mkdtempSync(join(tmpdir(), 'mw-p-'))
const prescriptions = (local: object) => {
	const shipped = JSON.parse(readFileSync(join(import.meta.dirname, '../prescriptions.json'), 'utf8'))
	writeFileSync(join(dir, 'p.json'), JSON.stringify({ ...shipped, tiers: { ...shipped.tiers, local: [local] }, harnesses: { shell: shellEntry }, env: ['MW_PROBE'] }))
	return loadPrescriptions(join(dir, 'p.json'))
}
const shell = harnessOf(await Effect.runPromise(prescriptions(card('shell'))), 'shell')!
const unknown = await Effect.runPromise(Effect.flip(prescriptions(card('aider'))))
rmSync(dir, { recursive: true, force: true })

test('prescriptions add harness entries without code, and every card must name one', () => {
	assert.deepEqual(shell.tools, shellEntry.tools)
	assert.equal(unknown.code, 'prescriptions_invalid')
	assert.deepEqual(unknown.context.card, card('aider'))
})

const runShell = (prompt: string, budget?: WorkerRequest['budget'], worker: Layer.Layer<Worker> = harnessWorker) =>
	Effect.runPromise(Effect.gen(function* () {
		return yield* (yield* Worker).run({ kind: 'execute', item: 1, job: 'implement', profile: 'implementer', card: card('shell'), access: 'run', system: '', prompt, cwd: import.meta.dirname, budget, harness: shell })
	}).pipe(Effect.provide(worker))) as Promise<WorkerResult & { overBudget?: { exceeded: string; tokens: number | null }; raw?: string }>
const alive = (pid: number) => {
	try {
		return process.kill(pid, 0)
	} catch {
		return false
	}
}

test('a prescribed harness entry runs neutral: allowlisted environment, per-call files removed, and its stray processes killed', async () => {
	process.env.PORT = '31435'
	process.env.MW_PROBE = 'passed'
	const pidFile = join(import.meta.dirname, '.stray-pid')
	try {
		// The stray server keeps stdout open: the call only returns because its process group is killed on exit.
		const r = await runShell(`sleep 300 & echo $! > ${pidFile}; echo "PORT=\${PORT-unset} MW_WORKER=$MW_WORKER MW_PROBE=$MW_PROBE"; cat "$1"; echo; echo "$1"`)
		assert.equal(r.ok, true, JSON.stringify(r))
		const [env, settings, path] = (r as { output: string }).output.split('\n')
		assert.equal(env, 'PORT=unset MW_WORKER=1 MW_PROBE=passed', 'only allowlisted variables, including the prescriptions\' own, reach the agent')
		assert.deepEqual(JSON.parse(settings!), { tools: ['look', 'run'] })
		assert.ok(!existsSync(path!), 'the per-call settings file is gone')
		const stray = Number(readFileSync(pidFile, 'utf8'))
		await new Promise((r) => setTimeout(r, 50))
		assert.equal(alive(stray), false, 'the stray server died with the call')
	} finally {
		delete process.env.PORT
		delete process.env.MW_PROBE
		if (existsSync(pidFile)) (await import('node:fs')).rmSync(pidFile)
	}
})

test('going over the wall-time or token budget kills the process group and fails the launch with evidence', async () => {
	const slow = await runShell('echo started; sleep 30', { minutes: 0.002 })
	assert.equal(slow.ok, false)
	assert.equal(slow.overBudget?.exceeded, 'minutes')
	assert.match((slow as { error: string }).error, /went over its budget: ran .* of 0.002 minutes/)
	assert.equal(slow.raw, 'started\n')
	const greedy = await runShell('echo \'{"tokens": 600}\'; echo \'{"tokens": 600}\'; sleep 30', { minutes: 1, tokens: 1000 })
	assert.equal(greedy.overBudget?.exceeded, 'tokens')
	assert.equal(greedy.overBudget?.tokens, 1200)
	const limited = await runShell('echo "out of quota until 4pm (UTC)"')
	assert.equal((limited as { limit: { resetsAt: number } }).limit.resetsAt > Date.now(), true, 'a text harness reports limits too')
})

test('a worker command that exits without reading its request is a failed call, not a crash', async () => {
	const r = await runShell('x'.repeat(1 << 20), undefined, commandWorker('exit 3'))
	assert.equal(r.ok, false)
	assert.match((r as { error: string }).error, /exited 3 without reading its request on stdin \(.*EPIPE.*\)/)
})
