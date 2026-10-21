// Built-in workers: Amp, Claude Code, Codex and pi, each run headless with the prompt on stdin.
// Each run is read back from the harness's own JSON event stream: the answer, success, and any usage
// limit with its reset time. Limit signals come only from the harness's own error and result events,
// never from tool output (a worker can cat a file that quotes a limit message).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect, Layer } from 'effect'
import type { Access, Card } from './cards.ts'
import { Worker, type UsageLimit, type WorkerResult } from './worker.ts'

export const binaryFor = (harness: Card['harness']) =>
	({ amp: process.env.MW_AMP ?? 'amp', claude: process.env.MW_CLAUDE ?? 'claude', codex: process.env.MW_CODEX ?? 'codex', pi: process.env.MW_PI ?? 'pi' })[harness]

const CLAUDE_ACCESS: Record<Access, string[]> = {
	read: ['--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob'],
	checks: ['--permission-mode', 'acceptEdits', '--tools', 'Read,Grep,Glob,Bash,Edit,Write', '--allowedTools', 'Bash'],
	make: ['--dangerously-skip-permissions'],
	run: ['--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', 'Bash'],
}
// Writing jobs run without an OS sandbox in every harness; the brief bounds them. Read stays read-only.
const CODEX_SANDBOX: Record<Access, string> = { read: 'read-only', checks: 'danger-full-access', make: 'danger-full-access', run: 'danger-full-access' }
const PI_TOOLS: Record<Access, string | null> = { read: 'read,grep,find,ls', checks: 'read,grep,find,ls,bash,write,edit', make: null, run: 'read,grep,find,ls,bash' }

// Amp: sub-agent tools and code_exec (which can start threads) are always off, so no agent-to-agent call bypasses NQ.
// Read access also turns off the editing tools. The shell stays, because it is Amp's only way to read the
// workspace; as with shell access on the other harnesses, the brief forbids writes, not the tool set.
const AMP_ALWAYS_OFF = ['Task', 'oracle', 'librarian', 'finder', 'create_thread', 'send_thread_message', 'code_exec']
const AMP_EDITS = ['edit_file', 'create_file']
const ampSettings = (access: Access) => {
	const dir = join(tmpdir(), 'madewell-amp')
	mkdirSync(dir, { recursive: true })
	const path = join(dir, `${access}.json`)
	writeFileSync(path, JSON.stringify({ 'amp.tools.disable': access === 'read' ? [...AMP_ALWAYS_OFF, ...AMP_EDITS] : AMP_ALWAYS_OFF }))
	return path
}

/** The command line for one headless run of a card. `prefix` goes on stdin before the packet, for harnesses without a system-prompt flag. */
export function buildLaunch(card: Card, access: Access, system: string, title = 'Made Well job'): { command: string; args: string[]; prefix?: string } {
	const command = binaryFor(card.harness)
	if (card.harness === 'amp') {
		// card.model is the Amp agent mode: low, medium, high or ultra.
		return { command, args: ['-x', '--stream-json', '-m', card.model, '--no-notifications', '--no-ide', '--title', title, '-l', 'madewell', '--settings-file', ampSettings(access)], prefix: system }
	}
	if (card.harness === 'claude') {
		// Native sub-agents would bypass Made Well's NQ exchange.
		return { command, args: ['-p', '--verbose', '--output-format', 'stream-json', '--model', card.model, '--effort', card.effort, '--permission-prompts', 'none', '--disallowedTools', 'Agent,Task', ...CLAUDE_ACCESS[access], '--append-system-prompt', system] }
	}
	if (card.harness === 'codex') {
		// codex exec has no system-prompt flag; developer_instructions is the config key it reads.
		return { command, args: ['exec', '--json', '--skip-git-repo-check', '-m', card.model, '-c', `model_reasoning_effort="${card.effort}"`, '-c', 'approval_policy="never"', '-c', `developer_instructions=${JSON.stringify(system)}`, '-s', CODEX_SANDBOX[access], '-'] }
	}
	const tools = PI_TOOLS[access]
	return { command, args: ['--print', '--mode', 'json', '--offline', '--no-session', '--model', `${card.provider}/${card.model}`, '--thinking', card.effort, '--append-system-prompt', system, ...(tools ? ['--tools', tools] : [])] }
}

const events = (text: string) => text.split('\n').filter((l) => l.trim()).flatMap((l) => {
	try {
		return [JSON.parse(l) as Record<string, any>]
	} catch {
		return []
	}
})
const strings = (value: unknown): string[] => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [])
const seconds = (s: unknown) => (typeof s === 'number' && Number.isFinite(s) ? s * 1000 : null)

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

const CLAUDE_LIMIT = /You['’]ve hit your [^\n"]*?limit · resets [^\n"]+/
const CODEX_LIMIT = /[Yy]ou['’]ve hit your usage limit[^\n"]*/
const PI_LIMIT = /You have hit your ChatGPT usage limit(?: \([^)]*\))?\.(?: Try again in ~(\d+) min\.)?/

export interface Run {
	readonly output: string
	readonly ok: boolean
	readonly limit: UsageLimit | null
	readonly error: string
}

/** One harness run's stdout → its answer, success, and any usage limit. */
export function parseRun(harness: Card['harness'], stdout: string, account: string, now: number): Run {
	const evs = events(stdout)
	if (harness === 'claude' || harness === 'amp') {
		const result = evs.findLast((e) => e.type === 'result')
		const output = typeof result?.result === 'string' ? result.result : ''
		const succeeded = result?.subtype === 'success' && result.is_error === false && output.trim() !== '' && !new RegExp(`^\\s*${CLAUDE_LIMIT.source}`).test(output)
		let limit: UsageLimit | null = null
		if (!succeeded) {
			const own = evs.filter((e) => e.type === 'result' || e.error || e.type === 'rate_limit_event' || (e.type === 'assistant' && e.message?.model === '<synthetic>'))
			const record = own.find((e) => e.error === 'rate_limit' && e.quotaLimits) ?? own.find((e) => e.type === 'rate_limit_event' && e.rate_limit_info?.status === 'rejected')
			const text = own.flatMap(strings).find((s) => CLAUDE_LIMIT.test(s))
			const message = text ? CLAUDE_LIMIT.exec(text)![0] : null
			if (record || message) {
				const machine = seconds(record?.quotaLimits?.resetsAt ?? record?.rate_limit_info?.resetsAt)
				limit = { account, resetsAt: machine ?? (message ? clockToEpoch(message.split('resets')[1]!, now) : null), message: message ?? `rate limit ${record?.quotaLimits?.rateLimitType ?? record?.rate_limit_info?.rateLimitType ?? ''}`.trim() }
			}
		}
		return { output, ok: succeeded && !limit, limit, error: succeeded ? '' : output || String(result?.subtype ?? 'no result event') }
	}
	if (harness === 'codex') {
		const output = evs.filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message').map((e) => e.item.text as string).at(-1) ?? ''
		const own = evs.filter((e) => e.type === 'turn.failed' || e.type === 'error')
		const succeeded = evs.some((e) => e.type === 'turn.completed') && own.length === 0 && output.trim() !== ''
		const find = (o: unknown): Record<string, any> | null => {
			if (!o || typeof o !== 'object') return null
			if ('rate_limits' in o && (o as any).rate_limits && typeof (o as any).rate_limits === 'object') return (o as any).rate_limits
			for (const v of Object.values(o)) {
				const r = find(v)
				if (r) return r
			}
			return null
		}
		const rateLimits = evs.map(find).filter(Boolean).at(-1)
		let limit: UsageLimit | null = null
		if (!succeeded) {
			const ownText = own.flatMap(strings)
			const text = ownText.find((s) => CODEX_LIMIT.test(s))
			const message = text ? CODEX_LIMIT.exec(text)![0] : null
			const reached = rateLimits?.rate_limit_reached_type != null || ownText.some((s) => /usage_limit_reached|usage_not_included|quota_exceeded/.test(s))
			if (message || reached) {
				const machine = seconds(rateLimits?.primary?.resets_at) ?? seconds(rateLimits?.secondary?.resets_at)
				const at = message && /try again at\s+(.+)/i.exec(message)
				limit = { account, resetsAt: machine ?? (at ? clockToEpoch(at[1]!, now) : null), message: message ?? `usage limit reached (${rateLimits?.rate_limit_reached_type ?? 'usage_limit_reached'})` }
			}
		}
		return { output, ok: succeeded && !limit, limit, error: succeeded ? '' : own.flatMap(strings).join(' ').slice(0, 2000) || 'no completed turn' }
	}
	const messages = evs.filter((e) => e.type === 'message_end' && e.message?.role === 'assistant').map((e) => e.message)
	const last = messages.at(-1)
	const output = ((last?.content ?? []) as { type: string; text?: string }[]).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
	const succeeded = last?.stopReason === 'stop' && output.trim() !== ''
	let limit: UsageLimit | null = null
	if (!succeeded) {
		const own = evs.filter((e) => (e.type === 'message_end' && e.message?.role === 'assistant' && e.message?.stopReason === 'error') || (e.type === 'auto_retry_end' && e.success === false) || e.type === 'error')
		const text = own.flatMap(strings).find((s) => PI_LIMIT.test(s))
		if (text) {
			const [message, minutes] = PI_LIMIT.exec(text)!
			limit = { account, resetsAt: minutes == null ? null : now + Number(minutes) * 60_000, message: message! }
		}
	}
	return { output, ok: succeeded && !limit, limit, error: succeeded ? '' : String(last?.errorMessage ?? 'no final assistant message') }
}

/** The built-in worker: launches the card's harness in the item's workspace. */
export const harnessWorker = Layer.succeed(Worker, {
	run: (request) =>
		Effect.promise(() => new Promise<{ code: number | null; stdout: string; stderr: string; spawnError?: string }>((done) => {
			const { command, args, prefix } = buildLaunch(request.card, request.access, request.system, `mw #${request.item} ${request.job} · ${request.profile} · ${request.kind}`)
			const child = spawn(command, args, { cwd: request.cwd, env: { ...process.env, MW_WORKER: '1' }, stdio: ['pipe', 'pipe', 'pipe'] })
			let stdout = ''
			let stderr = ''
			child.stdout.setEncoding('utf8').on('data', (c) => (stdout += c))
			child.stderr.setEncoding('utf8').on('data', (c) => (stderr += c))
			child.on('error', (e) => done({ code: null, stdout, stderr, spawnError: `${command}: ${e.message}` }))
			child.on('close', (code) => done({ code, stdout, stderr }))
			child.stdin.on('error', () => {})
			child.stdin.end(prefix ? `${prefix}\n\n---\n\nYour packet:\n${request.prompt}` : request.prompt)
		})).pipe(
			Effect.map(({ code, stdout, stderr, spawnError }): WorkerResult & { raw?: string } => {
				if (spawnError) return { ok: false, error: `${spawnError}. Is ${request.card.harness} installed and on PATH?` }
				const run = parseRun(request.card.harness, stdout, request.card.account, Date.now())
				if (run.limit) return { ok: false, limit: run.limit, raw: stdout }
				if (run.ok && code === 0) return { ok: true, output: run.output, raw: stdout }
				return { ok: false, error: `${request.card.harness} exited ${code}: ${run.error || stderr.slice(-2000)}`, raw: stdout }
			}),
		),
})
