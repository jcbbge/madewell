// The only thing Made Well asks of a harness: run one job on one card, headless, and say what came back.
// The built-in harness worker reads harness entries (src/harness.ts); tests use a scripted fake.
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, mkdtempSync, openSync, readSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context, Effect, Layer } from 'effect'
import type { Access, Card } from './cards.ts'
import type { MadeWellError } from './errors.ts'
import type { Harness } from './harness.ts'
import type { Job } from './lane.ts'

/** One call's caps: wall time always, tokens where the harness reports them. */
export interface Budget {
	readonly minutes: number
	readonly tokens?: number
}
export const DEFAULT_BUDGET: Budget = { minutes: 30 }

export interface WorkerRequest {
	/** intake: the receiver states its understanding and questions; originator: the sender answers; execute: the job itself. */
	readonly kind: 'intake' | 'originator' | 'execute'
	readonly item: number
	/** The job this hand-off is for. */
	readonly job: Job
	/** The profile speaking: the receiver for intake and execute, the sender for originator. */
	readonly profile: string
	readonly card: Card
	readonly access: Access
	readonly system: string
	readonly prompt: string
	/** The item's workspace. A `none` call never sees it: the harness worker runs it in an empty directory. */
	readonly cwd: string
	/** The job's budget from prescriptions; DEFAULT_BUDGET when absent. */
	readonly budget?: Budget
	/** The card's harness entry from prescriptions (harnessOf); the built-in entry when absent. */
	readonly harness?: Harness
}

export interface UsageLimit {
	readonly account: string
	/** Epoch ms when the account's quota resets, if the harness said. */
	readonly resetsAt: number | null
	readonly message: string
}

/** Evidence of a call stopped for going over its budget. `tokens` is null when the harness reports none. */
export interface OverBudget {
	readonly exceeded: 'minutes' | 'tokens'
	readonly budget: Budget
	readonly ms: number
	readonly tokens: number | null
}

/** `raw`: the harness's own transcript of the run, kept on the record for replay. */
export type WorkerResult =
	| { readonly ok: true; readonly output: string; readonly raw?: string }
	| { readonly ok: false; readonly limit: UsageLimit; readonly raw?: string }
	| { readonly ok: false; readonly error: string; readonly overBudget?: OverBudget; readonly raw?: string }

export class Worker extends Context.Service<Worker, {
	readonly run: (request: WorkerRequest) => Effect.Effect<WorkerResult, MadeWellError>
}>()('madewell/Worker') {}

export interface Exited {
	readonly code: number | null
	readonly stdout: string
	readonly stderr: string
	/** Set when the process exited without reading its input. */
	readonly stdinError?: string
	readonly overBudget?: OverBudget
}

// The process leads its own group. A watcher in the group holds fd 3, whose other end only the runner holds:
// if the runner dies, the read ends and the watcher removes the call's files and kills the group, so nothing
// outlives even a crashed runner.
const GROUP = 'd=$1; shift; ( exec </dev/null >/dev/null 2>&1; read _ <&3; [ -z "$d" ] || rm -rf "$d"; kill -9 0 ) & exec "$@" 3<&-'

/** A JSON object line with `"mw_at": <epoch ms>` first; any other line as it came. */
const stamped = (line: string, at: number) => {
	try {
		const v = JSON.parse(line)
		if (!v || typeof v !== 'object' || Array.isArray(v)) return line
		return Object.keys(v).length ? `{"mw_at":${at},${line.trimStart().slice(1)}` : `{"mw_at":${at}}`
	} catch {
		return line
	}
}

/**
 * Runs one process in its own process group, with `input` on stdin. The whole group is killed when the
 * process exits (stray servers die with it), when the budget runs out, or when the call is interrupted.
 * `tokensIn` counts tokens reported on one stdout line, for the token budget. `files` is the call's own
 * directory, removed if the runner dies mid-call (the caller removes it otherwise). `stamp` adds each
 * JSON line's arrival time as `mw_at`, so tool events get their timing even when the harness gives none.
 * `stdin`, an open file descriptor, replaces `input` as the process's stdin.
 */
export const runGroup = (o: { command: string; args: ReadonlyArray<string>; cwd: string; env: NodeJS.ProcessEnv; input: string; budget: Budget; tokensIn?: (line: string) => number; files?: string; stamp?: boolean; stdin?: number }) =>
	Effect.clockWith((clock) => Effect.callback<Exited>((resume) => {
		const started = Date.now()
		// The marker names the runner that owns the call, so a later runner can tell its strays from a live runner's agents.
		const call = `${process.pid}-${randomUUID()}`
		const child = spawn('sh', ['-c', GROUP, 'mw-agent', o.files ?? '', o.command, ...o.args], { cwd: o.cwd, env: { ...o.env, MW_CALL: call }, detached: true, stdio: [o.stdin ?? 'pipe', 'pipe', 'pipe', 'pipe'] })
		const kill = () => {
			try {
				process.kill(-child.pid!, 'SIGKILL')
			} catch {}
			// A process that left the group (setsid, nohup, a server that daemonizes) still carries the call's marker.
			killMarked((c) => c === call)
		}
		let stdout = ''
		let stderr = ''
		let partial = ''
		let tokens: number | null = null
		let stdinError: string | undefined
		let overBudget: OverBudget | undefined
		const over = (exceeded: OverBudget['exceeded']) => {
			overBudget ??= { exceeded, budget: o.budget, ms: Date.now() - started, tokens }
			kill()
		}
		const timer = setTimeout(() => over('minutes'), o.budget.minutes * 60_000)
		const take = (raw: string, end: string) => {
			const line = o.stamp ? stamped(raw, clock.currentTimeMillisUnsafe()) : raw
			stdout += line + end
			const n = o.tokensIn?.(line)
			if (n) tokens = (tokens ?? 0) + n
		}
		child.stdout!.setEncoding('utf8').on('data', (chunk: string) => {
			const lines = (partial + chunk).split('\n')
			partial = lines.pop()!
			for (const line of lines) take(line, '\n')
			if (o.budget.tokens !== undefined && tokens !== null && tokens > o.budget.tokens) over('tokens')
		})
		child.stderr!.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
		child.stdin?.on('error', (e) => (stdinError = e.message))
		child.on('exit', kill)
		child.on('close', (code) => {
			clearTimeout(timer)
			if (partial) take(partial, '')
			resume(Effect.succeed({ code, stdout, stderr, stdinError, overBudget }))
		})
		child.stdin?.end(o.input)
		return Effect.sync(() => {
			clearTimeout(timer)
			kill()
		})
	}))

/** Kills every process whose MW_CALL marker `match` accepts. */
function killMarked(match: (call: string) => boolean) {
	try {
		const ps = execFileSync('ps', ['axeww', '-o', 'pid=,command='], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
		for (const line of ps.split('\n')) {
			const call = / MW_CALL=(\S+)/.exec(line)?.[1]
			if (!call || !match(call)) continue
			try {
				process.kill(Number(line.trim().split(' ')[0]), 'SIGKILL')
			} catch {}
		}
	} catch {}
}

const alive = (pid: number) => {
	try {
		return process.kill(pid, 0)
	} catch (e) {
		return (e as NodeJS.ErrnoException).code === 'EPERM'
	}
}

/** Kills what calls of runners that are gone left running, such as a daemon of a runner that was SIGKILLed. */
export const killOrphans = () => killMarked((call) => !alive(Number(call.split('-')[0])))

export const overBudgetError = (who: string, o: OverBudget) =>
	`${who} went over its budget: ${o.exceeded === 'minutes' ? `ran ${(o.ms / 60_000).toFixed(1)} of ${o.budget.minutes} minutes` : `used ${o.tokens} of ${o.budget.tokens} tokens`}; its process group was killed.`

/**
 * A worker that hands each job to an external command: the request as JSON on stdin, a WorkerResult
 * as JSON on stdout. Any harness can be plugged in this way with a small script. The command runs in
 * its own process group under the job's wall-time budget.
 *
 * The request is a file on stdin, not a pipe: whether a pipe's write fails depends on how much the kernel
 * buffered before the command exited, but a file's read offset is shared with the command, so what is
 * left past it afterwards is exactly what the command never read.
 */
export const commandWorker = (command: string) =>
	Layer.succeed(Worker, {
		run: (request) =>
			Effect.acquireUseRelease(
				Effect.sync(() => {
					const dir = mkdtempSync(join(tmpdir(), 'madewell-'))
					const input = Buffer.from(JSON.stringify(request))
					writeFileSync(join(dir, 'request.json'), input)
					return { dir, size: input.length, fd: openSync(join(dir, 'request.json'), 'r') }
				}),
				({ dir, size, fd }) =>
					runGroup({ command: 'sh', args: ['-c', command], cwd: request.cwd, env: process.env, input: '', stdin: fd, files: dir, budget: request.budget ?? DEFAULT_BUDGET }).pipe(
						Effect.map(({ code, stdout, stderr, overBudget }): WorkerResult => {
							if (overBudget) return { ok: false, error: overBudgetError('The worker command', overBudget), overBudget, raw: stdout }
							try {
								return JSON.parse(stdout) as WorkerResult
							} catch {
								const left = readSync(fd, Buffer.alloc(size), 0, size, null)
								const unread = left ? ` without reading its request on stdin (read ${size - left} of ${size} bytes)` : ''
								return { ok: false, error: `Worker command exited ${code}${unread} and printed no JSON result. stderr: ${stderr.slice(-2000)}` }
							}
						}),
					),
				({ dir, fd }) => Effect.sync(() => (closeSync(fd), rmSync(dir, { recursive: true, force: true }))),
			),
	})
