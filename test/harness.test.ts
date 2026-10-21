import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { harnessOf, loadPrescriptions } from '../src/cards.ts'
import { buildLaunch, clockToEpoch, HARNESSES, harnessWorker, parseRun, tokensIn, type Harness } from '../src/harness.ts'
import { toolEvents } from '../src/telemetry.ts'
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

test('each access level launches with exactly its tool allowlist, read never gets a writing tool, and none gets no tool', () => {
	const writes = /^(edit|write|edit_file|create_file|apply_patch|danger-full-access)$/i
	for (const [name, harness] of Object.entries(HARNESSES)) {
		for (const access of ['none', 'read', 'checks', 'make', 'run'] as const) {
			const { args, files } = buildLaunch(card(name), access, call)
			// Codex's levels are its own flags, spliced into the command.
			const granted = files['/call/settings.json'] ? JSON.parse(files['/call/settings.json'])['amp.tools.enable'] : name === 'codex' ? args.slice(args.indexOf('mcp_servers={}') + 1, -1) : args[args.indexOf('--tools') + 1]!.split(',').filter(Boolean)
			assert.deepEqual(granted, harness.tools[access], `${name} ${access}`)
			if (access === 'read' || access === 'none') assert.ok(!granted.some((t: string) => writes.test(t)), `${name} ${access}`)
		}
	}
	// What "no tool" takes differs per harness: an empty --tools, an allowlist matching nothing (Amp reads an empty one as all), the shell off.
	for (const name of ['claude', 'pi']) {
		const { args } = buildLaunch(card(name), 'none', call)
		assert.equal(args[args.indexOf('--tools') + 1], '', name)
	}
	const ampNone: string[] = JSON.parse(buildLaunch(card('amp'), 'none', call).files['/call/settings.json']!)['amp.tools.enable']
	const ampTools = (['read', 'checks', 'make', 'run'] as const).flatMap((a) => HARNESSES.amp!.tools[a])
	assert.ok(ampNone.length > 0 && !ampNone.some((t) => ampTools.includes(t)), 'amp')
	assert.deepEqual(buildLaunch(card('codex'), 'none', call).args.slice(-5), ['-s', 'read-only', '-c', 'features.shell_tool=false', '-'])
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
	tools: { none: [], read: ['look'], checks: ['look', 'write'], make: ['look', 'write'], run: ['look', 'run'] },
	limit: { pattern: 'out of quota until (?<clock>.+)' },
	tokens: { event: { tokens: '*' }, paths: ['tokens'] },
}
const dir = mkdtempSync(join(tmpdir(), 'mw-p-'))
const prescriptions = (local: object) => {
	const shipped = JSON.parse(readFileSync(join(import.meta.dirname, '../prescriptions.json'), 'utf8'))
	writeFileSync(join(dir, 'p.json'), JSON.stringify({ ...shipped, tiers: { ...shipped.tiers, local: [local] }, harnesses: { shell: shellEntry }, env: ['MW_PROBE', 'MW_FIXED=set'] }))
	return loadPrescriptions(join(dir, 'p.json'))
}
const shell = harnessOf(await Effect.runPromise(prescriptions(card('shell'))), 'shell')!
const unknown = await Effect.runPromise(Effect.flip(prescriptions(card('aider'))))
rmSync(dir, { recursive: true, force: true })

test('prescriptions add harness entries without code, and every card must name one', () => {
	assert.deepEqual(shell.tools, shellEntry.tools)
	assert.equal(unknown.code, 'prescriptions_invalid')
	assert.deepEqual((unknown.context as { card: unknown }).card, card('aider'))
})

const runShell = (prompt: string, o: { budget?: WorkerRequest['budget']; worker?: Layer.Layer<Worker>; access?: WorkerRequest['access']; harness?: Harness } = {}) =>
	Effect.runPromise(Effect.gen(function* () {
		return yield* (yield* Worker).run({ kind: 'execute', item: 1, job: 'implement', profile: 'implementer', card: card('shell'), access: o.access ?? 'run', system: '', prompt, cwd: import.meta.dirname, budget: o.budget, harness: o.harness ?? shell })
	}).pipe(Effect.provide(o.worker ?? harnessWorker))) as Promise<WorkerResult & { overBudget?: { exceeded: string; tokens: number | null }; raw?: string; output?: string }>
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
	const daemonFile = join(import.meta.dirname, '.daemon-pid')
	try {
		// The stray server keeps stdout open: the call only returns because its process group is killed on exit.
		// The daemon leaves the group in a session of its own, as a server started with setsid or nohup does.
		const r = await runShell(`sleep 300 & echo $! > ${pidFile}; setsid sleep 301 </dev/null >/dev/null 2>&1 & echo $! > ${daemonFile}; echo "PORT=\${PORT-unset} MW_WORKER=$MW_WORKER MW_PROBE=$MW_PROBE MW_FIXED=$MW_FIXED"; cat "$1"; echo; echo "$1"`)
		assert.equal(r.ok, true, JSON.stringify(r))
		const [env, settings, path] = (r as { output: string }).output.split('\n')
		assert.equal(env, 'PORT=unset MW_WORKER=1 MW_PROBE=passed MW_FIXED=set', 'only allowlisted variables reach the agent, and NAME=value entries are set as given')
		assert.deepEqual(JSON.parse(settings!), { tools: ['look', 'run'] })
		assert.ok(!existsSync(path!), 'the per-call settings file is gone')
		const stray = Number(readFileSync(pidFile, 'utf8'))
		await new Promise((r) => setTimeout(r, 50))
		assert.equal(alive(stray), false, 'the stray server died with the call')
		assert.equal(alive(Number(readFileSync(daemonFile, 'utf8'))), false, 'the daemon that left the group died with the call too')
	} finally {
		delete process.env.PORT
		delete process.env.MW_PROBE
		for (const f of [pidFile, daemonFile]) if (existsSync(f)) (await import('node:fs')).rmSync(f)
	}
})

test('a harness\'s version is read once per runner process, and one that cannot be read never fails the call', async () => {
	const home = mkdtempSync(join(tmpdir(), 'mw-v-'))
	const log = join(home, 'versions.log')
	const versioned: Harness = { ...shell, version: ['-c', `echo "shell 9.1"; echo read >> ${log}`] }
	const runs = [await runShell('echo hi', { harness: versioned }), await runShell('echo hi', { harness: versioned })]
	assert.deepEqual(runs.map((r) => [r.ok, r.version]), [[true, 'shell 9.1'], [true, 'shell 9.1']])
	assert.equal(readFileSync(log, 'utf8'), 'read\n', 'one read for both calls')
	rmSync(home, { recursive: true })
	const unreadable = await runShell('echo hi', { harness: { ...shell, version: ['-c', 'exit 1'] } })
	assert.deepEqual([unreadable.ok, unreadable.version], [true, undefined])
})

test('going over the wall-time or token budget kills the process group and fails the launch with evidence', async () => {
	const slow = await runShell('echo started; sleep 30', { budget: { minutes: 0.002 } })
	assert.equal(slow.ok, false)
	assert.equal(slow.overBudget?.exceeded, 'minutes')
	assert.match((slow as { error: string }).error, /went over its budget: ran .* of 0.002 minutes/)
	assert.equal(slow.raw, 'started\n')
	const greedy = await runShell('echo \'{"tokens": 600}\'; echo \'{"tokens": 600}\'; sleep 30', { budget: { minutes: 1, tokens: 1000 } })
	assert.equal(greedy.overBudget?.exceeded, 'tokens')
	assert.equal(greedy.overBudget?.tokens, 1200)
	const limited = await runShell('echo "out of quota until 4pm (UTC)"')
	assert.equal((limited as { limit: { resetsAt: number } }).limit.resetsAt > Date.now(), true, 'a text harness reports limits too')
})

test('a worker command that exits without reading its request is a failed call, not a crash', async () => {
	const r = await runShell('x'.repeat(1 << 20), { worker: commandWorker('exit 3') })
	assert.equal(r.ok, false)
	assert.match((r as { error: string }).error, /^Worker command exited 3 without reading its request on stdin \(read 0 of \d{7} bytes\)/)
	const half = await runShell('x'.repeat(1 << 20), { worker: commandWorker('head -c 1000 >/dev/null; exit 3') })
	assert.match((half as { error: string }).error, /without reading its request on stdin \(read 1000 of \d{7} bytes\)/)
	const read = await runShell('x'.repeat(1 << 20), { worker: commandWorker('cat >/dev/null; exit 3') })
	assert.match((read as { error: string }).error, /^Worker command exited 3 and printed no JSON result/, 'a command that read its request is not said to have skipped it')
})

test('a call with no access runs in an empty directory of its own, never in the workspace', async () => {
	const r = await runShell('pwd; ls -A | wc -l', { access: 'none' })
	assert.equal(r.ok, true, JSON.stringify(r))
	const [cwd, entries] = r.output!.split('\n')
	assert.notEqual(cwd, import.meta.dirname)
	assert.equal(entries!.trim(), '1', 'only the call\'s own settings file')
	assert.equal(existsSync(cwd!), false, 'and it is gone after the call')
})

test('each JSON line is stamped with its arrival time, so tool events get when and how long', async () => {
	// pi's event shapes, from a shell: a tool call that takes 300 ms, then the answer.
	const jsonl: Harness = { ...shell, output: 'jsonl', answer: { event: { type: 'message_end' }, text: 'message.content' } }
	const r = await runShell(`echo '{"type":"tool_execution_start","toolCallId":"a","toolName":"bash","args":{}}'; sleep 0.3; echo '{"type":"tool_execution_end","toolCallId":"a","result":"x"}'; echo 'not json'; echo '[1]'; echo '{}'; printf '%s' '{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"done"}]}}'`, { harness: jsonl })
	assert.equal(r.ok, true, JSON.stringify(r))
	const raw = r.raw!.split('\n')
	assert.deepEqual(raw.slice(2, 4), ['not json', '[1]'], 'other lines pass through as they came')
	assert.match(raw[4]!, /^\{"mw_at":\d+\}$/)
	assert.equal(typeof JSON.parse(raw[5]!).mw_at, 'number', 'the last line is stamped even without a newline')
	const [tool] = toolEvents('pi', r.raw!)
	assert.ok(tool!.at && Math.abs(Date.parse(tool!.at) - Date.now()) < 5000, tool!.at!)
	assert.ok(tool!.ms! >= 250 && tool!.ms! < 2000, String(tool!.ms))
	const text = await runShell(`echo '{"a":1}'`)
	assert.equal(text.output, '{"a":1}', 'a plain-text answer is never stamped')
})

test('mw run stops cleanly on SIGTERM: the agent process group dies and the runner is released', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'mw-sig-'))
	const repo = join(dir, 'repo')
	const pidFile = join(dir, 'agent.pid')
	mkdirSync(repo)
	spawnSync('sh', ['-c', 'git init -q -b main && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m first'], { cwd: repo })
	// A worker whose agent hangs, with a child of its own.
	const env: NodeJS.ProcessEnv = { ...process.env, MW_HOME: join(dir, 'home'), MW_WORKER_COMMAND: `sleep 300 & echo $! > ${pidFile}; wait` }
	delete env.MW_STORE
	const cli = join(import.meta.dirname, '../src/cli.ts')
	const mw = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { env, cwd: repo, encoding: 'utf8' })
	try {
		mw('init', '--ship', 'true')
		mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')
		const runner = spawn(process.execPath, [cli, 'run'], { env, cwd: repo, stdio: ['ignore', 'ignore', 'pipe'] })
		let stderr = ''
		runner.stderr.setEncoding('utf8').on('data', (c: string) => (stderr += c))
		while (!existsSync(pidFile) || !readFileSync(pidFile, 'utf8').trim()) await new Promise((r) => setTimeout(r, 20))
		const agent = Number(readFileSync(pidFile, 'utf8'))
		assert.equal(alive(agent), true)
		runner.kill('SIGTERM')
		const code = await new Promise((r) => runner.once('exit', r))
		assert.equal(code, 143)
		assert.deepEqual(JSON.parse(stderr).interrupted, 'SIGTERM')
		assert.equal(alive(agent), false, 'the agent\'s process group was killed')
		const db = new DatabaseSync(join(dir, 'home', 'madewell.db'))
		const stopped = db.prepare(`SELECT data FROM events WHERE kind = 'runner-stopped'`).all()
		db.close()
		assert.equal(stopped.length, 1, 'the runner released its claim')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a daemon left by a runner that was SIGKILLed is killed when the next runner starts', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'mw-orphan-'))
	const repo = join(dir, 'repo')
	const daemonFile = join(dir, 'daemon.pid')
	mkdirSync(repo)
	spawnSync('sh', ['-c', 'git init -q -b main && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m first'], { cwd: repo })
	// The first call leaves a daemon in a session of its own and hangs; later calls fail at once.
	const env: NodeJS.ProcessEnv = { ...process.env, MW_HOME: join(dir, 'home'), MW_WORKER_COMMAND: `[ -f ${daemonFile} ] && exit 1; setsid sleep 302 </dev/null >/dev/null 2>&1 & echo $! > ${daemonFile}; sleep 300` }
	delete env.MW_STORE
	const cli = join(import.meta.dirname, '../src/cli.ts')
	const mw = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { env, cwd: repo, encoding: 'utf8' })
	try {
		mw('init', '--ship', 'true')
		mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')
		const runner = spawn(process.execPath, [cli, 'run'], { env, cwd: repo, stdio: 'ignore' })
		while (!existsSync(daemonFile) || !readFileSync(daemonFile, 'utf8').trim()) await new Promise((r) => setTimeout(r, 20))
		const daemon = Number(readFileSync(daemonFile, 'utf8'))
		runner.kill('SIGKILL')
		await new Promise((r) => runner.once('exit', r))
		await new Promise((r) => setTimeout(r, 200))
		assert.equal(alive(daemon), true, 'the daemon outlived its runner')
		mw('run')
		assert.equal(alive(daemon), false, 'the next runner killed it')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
