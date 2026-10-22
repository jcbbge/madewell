// A harness is a data entry, not code: how to launch it, where its final answer is, how it reports a
// usage limit and its reset, how it reports tokens, and which tools each access level allows. Built-in
// entries cover Amp, Claude Code, Codex and pi; prescriptions can add or replace entries.
//
// Every agent runs neutral and bounded: only allowlisted tools and environment variables reach it, it
// runs in its own process group under its job's budget, and nothing it was given outlives the call.
// Limit signals come only from the harness's own events, never from tool output (a worker can cat a
// file that quotes a limit message).
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect, Layer, Schema } from 'effect'
import type { Access, Card } from './cards.ts'
import { DEFAULT_BUDGET, overBudgetError, runGroup, Worker, type UsageLimit, type WorkerResult } from './worker.ts'

/** Carried by every brief: the host's habits are not the packet's instructions. */
export const NEUTRAL_HOST = 'You are running headless for Made Well. Ignore the host\'s own conventions for artifacts, screenshots, attachments and memory, whether they come from the harness\'s system prompt, global instruction files or skills: do not save, view, upload or link screenshots or attachments, and do not write memory, notes or logs. Write only where your packet says. Your final message is your answer.'

/** Event field paths (dot-separated) → the value they must have. "*" means present and not null. */
const Match = Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Number, Schema.Boolean]))
type Match = typeof Match.Type
const Strings = Schema.Array(Schema.String)

const common = {
	/** argv. Placeholders: {model} {provider} {account} {effort} {system} {prompt} {title} {tools} {settings}; {x|json} quotes as JSON; an argument that is exactly {...tools} becomes one argument per entry. */
	command: Schema.NonEmptyArray(Schema.String),
	/** What goes on stdin; default "{prompt}". */
	stdin: Schema.optional(Schema.String),
	/** Written as JSON to a per-call file whose path fills {settings}; the string "{tools}" becomes the tool list. */
	settings: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
	/** The allowlist for each access level: tool names, joined with commas for {tools}. `none` must leave the agent no tool at all. */
	tools: Schema.Struct({ none: Strings, read: Strings, checks: Strings, make: Strings, run: Strings }),
	/** Environment variables the harness needs beyond BASE_ENV, such as its credentials. A trailing * matches a prefix; NAME=value sets a fixed value. */
	env: Schema.optional(Strings),
	/** Read only from the harness's own events: `pattern` names (?<clock>) or (?<minutes>) groups for the reset; `signals` are machine-readable records. */
	limit: Schema.Struct({
		pattern: Schema.String,
		events: Schema.optional(Schema.Array(Match)),
		signals: Schema.optional(Schema.Array(Schema.Struct({ when: Match, resetsAt: Strings, message: Schema.String }))),
	}),
	/** Tokens summed over every matching event, for the token budget. */
	tokens: Schema.optional(Schema.Struct({ event: Match, paths: Strings })),
	/** The arguments that make the binary print its version, for telemetry; default ["--version"]. */
	version: Schema.optional(Strings),
}

export const Harness = Schema.Union([
	/** Plain text: stdout is the answer. */
	Schema.Struct({ ...common, output: Schema.Literal('text') }),
	/** JSON lines: the answer is `text` in the last `event`; it succeeded if that event matches `ok`, `done` occurred and no `failed` event did. */
	Schema.Struct({
		...common,
		output: Schema.Literal('jsonl'),
		answer: Schema.Struct({ event: Match, text: Schema.String, ok: Schema.optional(Match), done: Schema.optional(Match), failed: Schema.optional(Schema.Array(Match)) }),
	}),
])
export type Harness = typeof Harness.Type

/** What every agent may see of the runner's environment. Nothing else gets through. */
export const BASE_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TERM', 'LANG', 'LC_*', 'TZ', 'TMPDIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS']

const CLAUDE_LIMIT = 'You[\'’]ve hit your [^\\n"]*?limit · resets (?<clock>[^\\n"]+)'
const CLAUDE_EVENTS = {
	output: 'jsonl',
	answer: { event: { type: 'result' }, text: 'result', ok: { subtype: 'success', is_error: false } },
	limit: {
		pattern: CLAUDE_LIMIT,
		events: [{ type: 'result' }, { error: '*' }, { type: 'rate_limit_event' }, { type: 'assistant', 'message.model': '<synthetic>' }],
		signals: [
			{ when: { error: 'rate_limit', quotaLimits: '*' }, resetsAt: ['quotaLimits.resetsAt'], message: 'rate limit {quotaLimits.rateLimitType}' },
			{ when: { type: 'rate_limit_event', 'rate_limit_info.status': 'rejected' }, resetsAt: ['rate_limit_info.resetsAt'], message: 'rate limit {rate_limit_info.rateLimitType}' },
		],
	},
	tokens: { event: { type: 'result' }, paths: ['usage.input_tokens', 'usage.cache_creation_input_tokens', 'usage.output_tokens'] },
} as const

// Amp checks shell_command under its internal name too.
const AMP_SHELL = ['shell_command', 'async_shell_command', 'shell_command_status', 'shell_command_kill']
const FULL = ['-s', 'danger-full-access']

export const HARNESSES: Readonly<Record<string, Harness>> = {
	// card.model is the Amp agent mode. Amp has no system-prompt flag: the brief goes on stdin before the packet.
	amp: {
		command: ['amp', '-x', '--stream-json', '-m', '{model}', '--no-notifications', '--no-ide', '--title', '{title}', '-l', 'madewell', '--settings-file', '{settings}'],
		stdin: '{system}\n\n---\n\nYour packet:\n{prompt}',
		settings: { 'amp.tools.enable': '{tools}', 'amp.git.commit.ampThread.enabled': false, 'amp.git.commit.coauthor.enabled': false },
		tools: {
			// Amp reads an empty allowlist as every tool, so none enables only a name no tool has.
			none: ['none'],
			read: ['Read', ...AMP_SHELL],
			checks: ['Read', ...AMP_SHELL, 'edit_file', 'create_file', 'apply_patch'],
			make: ['Read', ...AMP_SHELL, 'edit_file', 'create_file', 'apply_patch'],
			run: ['Read', ...AMP_SHELL],
		},
		// PLUGINS=off: the operator's own Amp plugins never load into an agent.
		env: ['AMP_API_KEY', 'AMP_URL', 'PLUGINS=off'],
		...CLAUDE_EVENTS,
		// Amp's result event carries no usage; each assistant message does.
		tokens: { event: { type: 'assistant' }, paths: ['message.usage.input_tokens', 'message.usage.cache_creation_input_tokens', 'message.usage.output_tokens'] },
	},
	claude: {
		command: ['claude', '-p', '--verbose', '--output-format', 'stream-json', '--model', '{model}', '--effort', '{effort}', '--permission-mode', 'bypassPermissions', '--strict-mcp-config', '--tools', '{tools}', '--append-system-prompt', '{system}'],
		tools: {
			none: [],
			read: ['Read', 'Grep', 'Glob'],
			checks: ['Read', 'Grep', 'Glob', 'Bash', 'Edit', 'Write'],
			make: ['Read', 'Grep', 'Glob', 'Bash', 'Edit', 'Write'],
			run: ['Read', 'Grep', 'Glob', 'Bash'],
		},
		env: ['ANTHROPIC_*', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CONFIG_DIR'],
		...CLAUDE_EVENTS,
	},
	// Codex has no tool allowlist: its sandbox is the boundary, and the optional tools (images, MCP) are off.
	// No setting removes every tool, so none also turns the shell off; what remains cannot read or write.
	codex: {
		command: ['codex', 'exec', '--json', '--skip-git-repo-check', '-m', '{model}', '-c', 'model_reasoning_effort="{effort}"', '-c', 'approval_policy="never"', '-c', 'developer_instructions={system|json}', '-c', 'tools.view_image=false', '-c', 'mcp_servers={}', '{...tools}', '-'],
		tools: { none: ['-s', 'read-only', '-c', 'features.shell_tool=false'], read: ['-s', 'read-only'], checks: FULL, make: FULL, run: FULL },
		env: ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODEX_HOME'],
		output: 'jsonl',
		answer: { event: { type: 'item.completed', 'item.type': 'agent_message' }, text: 'item.text', done: { type: 'turn.completed' }, failed: [{ type: 'turn.failed' }, { type: 'error' }] },
		limit: {
			pattern: '[Yy]ou[\'’]ve hit your usage limit(?:[^\\n"]*?try again at\\s+(?<clock>[^\\n"]+)|[^\\n"]*)|usage_limit_reached|usage_not_included|quota_exceeded',
			events: [{ type: 'turn.failed' }, { type: 'error' }],
			signals: [{ when: { 'payload.rate_limits.rate_limit_reached_type': '*' }, resetsAt: ['payload.rate_limits.primary.resets_at', 'payload.rate_limits.secondary.resets_at'], message: 'usage limit reached ({payload.rate_limits.rate_limit_reached_type})' }],
		},
		tokens: { event: { type: 'turn.completed' }, paths: ['usage.input_tokens', 'usage.output_tokens'] },
	},
	pi: {
		command: ['pi', '--print', '--mode', 'json', '--offline', '--no-session', '--model', '{provider}/{model}', '--thinking', '{effort}', '--append-system-prompt', '{system}', '--tools', '{tools}'],
		tools: {
			none: [],
			read: ['read', 'grep', 'find', 'ls'],
			checks: ['read', 'grep', 'find', 'ls', 'bash', 'edit', 'write'],
			make: ['read', 'grep', 'find', 'ls', 'bash', 'edit', 'write'],
			run: ['read', 'grep', 'find', 'ls', 'bash'],
		},
		env: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'PI_CODING_AGENT_DIR'],
		output: 'jsonl',
		answer: { event: { type: 'message_end', 'message.role': 'assistant' }, text: 'message.content', ok: { 'message.stopReason': 'stop' } },
		limit: {
			pattern: 'You have hit your ChatGPT usage limit(?: \\([^)]*\\))?\\.(?: Try again in ~(?<minutes>\\d+) min\\.)?',
			events: [{ type: 'message_end', 'message.role': 'assistant', 'message.stopReason': 'error' }, { type: 'auto_retry_end', success: false }, { type: 'error' }],
		},
		tokens: { event: { type: 'message_end', 'message.role': 'assistant' }, paths: ['message.usage.input', 'message.usage.output'] },
	},
}

const get = (value: unknown, path: string): unknown => path.split('.').reduce<any>((v, k) => (v && typeof v === 'object' ? v[k] : undefined), value)
const matches = (event: unknown, match: Match) => Object.entries(match).every(([path, want]) => (want === '*' ? get(event, path) != null : get(event, path) === want))
/** Fills {path} and {path|json} placeholders from `vars`; unknown placeholders stay as written. */
const fill = (template: string, vars: unknown) =>
	template.replace(/\{([\w.]+)(\|json)?\}/g, (whole, path: string, json?: string) => {
		const v = get(vars, path)
		if (v === undefined || v === null) return whole
		const s = Array.isArray(v) ? v.join(',') : String(v)
		return json ? JSON.stringify(s) : s
	})
const glob = (names: ReadonlyArray<string>) => (name: string) => names.some((n) => (n.endsWith('*') ? name.startsWith(n.slice(0, -1)) : name === n))

/** The agent's whole environment: the allowlisted variables of the runner's, and MW_WORKER=1. */
const agentEnv = (allow: ReadonlyArray<string>, from: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv => ({
	...Object.fromEntries(Object.entries(from).filter(([name]) => glob(allow)(name))),
	...Object.fromEntries(allow.filter((a) => a.includes('=')).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)])),
	MW_WORKER: '1',
})

/** One headless run of a card: the command, its stdin, and per-call files to write under `call.dir`. */
export function buildLaunch(card: Card, access: Access, call: { system: string; prompt: string; title: string; dir: string }, harness: Harness = HARNESSES[card.harness]!) {
	const settings = join(call.dir, 'settings.json')
	const vars = { ...card, ...call, tools: harness.tools[access], settings }
	const [binary, ...args] = harness.command.flatMap((a) => (a === '{...tools}' ? vars.tools : [fill(a, vars)]))
	const files: Record<string, string> = harness.settings
		? { [settings]: JSON.stringify(Object.fromEntries(Object.entries(harness.settings).map(([k, v]) => [k, v === '{tools}' ? harness.tools[access] : typeof v === 'string' ? fill(v, vars) : v]))) }
		: {}
	// MW_<HARNESS> points a harness at another binary without editing its entry.
	return { command: process.env[`MW_${card.harness.toUpperCase()}`] ?? binary!, args, input: fill(harness.stdin ?? '{prompt}', vars), files }
}

const events = (text: string) => text.split('\n').flatMap((l) => {
	try {
		const e = JSON.parse(l)
		return e && typeof e === 'object' ? [e as Record<string, unknown>] : []
	} catch {
		return []
	}
})
const strings = (value: unknown): string[] => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [])
const textOf = (value: unknown): string =>
	typeof value === 'string' ? value : Array.isArray(value) ? value.map((c) => (typeof c === 'string' ? c : c?.type === 'text' ? String(c.text ?? '') : '')).filter(Boolean).join('\n') : ''

/** Tokens a harness reports on one line of its output. */
export const tokensIn = (harness: Harness, line: string) => {
	const e = harness.tokens && events(line)[0]
	if (!e || !matches(e, harness.tokens!.event)) return 0
	return harness.tokens!.paths.reduce((sum, p) => sum + (Number(get(e, p)) || 0), 0)
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
/** "resets 4pm (UTC)", "resets Mon 12:00am", "try again at 9:45 PM" → the next such moment after now. No zone means local time. */
export function clockToEpoch(text: string, now: number): number | null {
	const m = /(?:\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s+)?\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(\s*\(UTC\))?/i.exec(text)
	if (!m) return null
	const [, day, h, min = '0', ap, utc] = m
	const hour = (Number(h) % 12) + (ap!.toLowerCase() === 'p' ? 12 : 0)
	const d = new Date(now)
	const dayOf = () => (utc ? d.getUTCDay() : d.getDay())
	if (utc) d.setUTCHours(hour, Number(min), 0, 0)
	else d.setHours(hour, Number(min), 0, 0)
	const want = day ? DAYS.indexOf(day.toLowerCase()) : null
	for (let i = 0; i < 8 && (d.getTime() <= now || (want !== null && dayOf() !== want)); i++) {
		if (utc) d.setUTCDate(d.getUTCDate() + 1)
		else d.setDate(d.getDate() + 1)
	}
	return d.getTime()
}

export interface Run {
	readonly output: string
	readonly ok: boolean
	readonly limit: UsageLimit | null
	readonly error: string
}

/** One harness run's stdout → its answer, success, and any usage limit. */
export function parseRun(harness: Harness, stdout: string, account: string, now: number): Run {
	const evs = harness.output === 'jsonl' ? events(stdout) : []
	let output = stdout.trim()
	let succeeded = output !== ''
	let failed: Record<string, unknown>[] = []
	if (harness.output === 'jsonl') {
		const a = harness.answer
		const last = evs.findLast((e) => matches(e, a.event))
		failed = evs.filter((e) => a.failed?.some((m) => matches(e, m)))
		output = textOf(get(last, a.text))
		succeeded = last !== undefined && output.trim() !== '' && (!a.ok || matches(last, a.ok)) && (!a.done || evs.some((e) => matches(e, a.done!))) && failed.length === 0
	}
	const pattern = new RegExp(harness.limit.pattern)
	// An answer that is itself the limit message is a limit, not an answer.
	const answeredLimit = new RegExp(`^\\s*(?:${harness.limit.pattern})`).test(output)
	const own = evs.filter((e) => harness.limit.events?.some((m) => matches(e, m)))
	let limit: UsageLimit | null = null
	if (!succeeded || answeredLimit) {
		const text = answeredLimit ? output : own.flatMap(strings).find((s) => pattern.test(s))
		const said = text ? pattern.exec(text) : null
		const signal = harness.limit.signals?.map((s) => ({ s, e: evs.findLast((e) => matches(e, s.when)) })).find((x) => x.e)
		if (said || signal) {
			const machine = signal?.s.resetsAt.map((p) => get(signal.e, p)).find((v): v is number => typeof v === 'number' && Number.isFinite(v))
			const { clock, minutes } = said?.groups ?? {}
			const resetsAt = machine !== undefined ? machine * 1000 : clock ? clockToEpoch(clock, now) : minutes ? now + Number(minutes) * 60_000 : null
			limit = { account, resetsAt, message: said?.[0] ?? fill(signal!.s.message, signal!.e) }
		}
	}
	const ok = succeeded && !limit
	return { output, ok, limit, error: ok ? '' : [...new Set([...failed, ...own].flatMap(strings))].join(' ').slice(-2000) || output }
}

const versions = new Map<string, Promise<string | null>>()
/** A harness binary's first line of version output, read once per runner process. One that cannot be read is null and never fails the call. */
const versionOf = (command: string, args: ReadonlyArray<string>, env: NodeJS.ProcessEnv) => {
	const key = JSON.stringify([command, ...args])
	if (!versions.has(key)) versions.set(key, new Promise<string | null>((done) => execFile(command, args, { env, timeout: 10_000 }, (e, stdout, stderr) => done(e ? null : (stdout.trim() || stderr.trim()).split('\n')[0]!.slice(0, 200) || null))).catch(() => null))
	return Effect.promise(() => versions.get(key)!)
}

/** The built-in worker: launches the card's harness entry in the item's workspace. */
export const harnessWorker = Layer.succeed(Worker, {
	run: (request) => {
		const name = request.card.harness
		const harness = request.harness ?? HARNESSES[name]
		if (!harness) return Effect.succeed<WorkerResult>({ ok: false, error: `No harness entry "${name}". Built in: ${Object.keys(HARNESSES).join(', ')}; add others under "harnesses" in prescriptions.` })
		const budget = request.budget ?? DEFAULT_BUDGET
		return Effect.acquireUseRelease(
			// Per-call files (settings) live in a directory removed when the call ends.
			Effect.sync(() => mkdtempSync(join(tmpdir(), 'madewell-'))),
			(dir) => {
				const launch = buildLaunch(request.card, request.access, { system: request.system, prompt: request.prompt, title: `mw #${request.item} ${request.job} · ${request.profile} · ${request.kind}`, dir }, harness)
				for (const [path, content] of Object.entries(launch.files)) writeFileSync(path, content)
				// With no access, the call runs in its own empty directory: no workspace, and none of its instruction files.
				const cwd = request.access === 'none' ? dir : request.cwd
				const env = agentEnv([...BASE_ENV, ...(harness.env ?? [])])
				return Effect.zip(
					runGroup({ command: launch.command, args: launch.args, cwd, env, input: launch.input, budget, tokensIn: (line) => tokensIn(harness, line), files: dir, stamp: harness.output === 'jsonl' }),
					versionOf(launch.command, harness.version ?? ['--version'], env),
					{ concurrent: true },
				)
			},
			(dir) => Effect.sync(() => rmSync(dir, { recursive: true, force: true })),
		).pipe(
			Effect.map(([{ code, stdout, stderr, overBudget }, version]): WorkerResult => {
				const v = version === null ? {} : { version }
				if (overBudget) return { ok: false, error: overBudgetError(`${name} (${request.card.model})`, overBudget), overBudget, raw: stdout, ...v }
				if (code === 127 && !stdout) return { ok: false, error: `${stderr.trim()}. Is ${name} installed and on PATH?` }
				const run = parseRun(harness, stdout, request.card.account, Date.now())
				if (run.limit) return { ok: false, limit: run.limit, raw: stdout, ...v }
				if (run.ok && code === 0) return { ok: true, output: run.output, raw: stdout, ...v }
				return { ok: false, error: `${name} exited ${code}: ${run.error || stderr.slice(-2000) || 'no final answer'}`, raw: stdout, ...v }
			}),
		)
	},
})
