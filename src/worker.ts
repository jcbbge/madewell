// The only thing Made Well asks of a harness: run one job on one card, headless, and say what came back.
// The built-in harness worker reads harness entries (src/harness.ts); tests use a scripted fake.
import { spawn } from 'node:child_process'
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

/**
 * Runs one process in its own process group, with `input` on stdin. The whole group is killed when the
 * process exits (stray servers die with it), when the budget runs out, or when the call is interrupted.
 * `tokensIn` counts tokens reported on one stdout line, for the token budget. `files` is the call's own
 * directory, removed if the runner dies mid-call (the caller removes it otherwise).
 */
export const runGroup = (o: { command: string; args: ReadonlyArray<string>; cwd: string; env: NodeJS.ProcessEnv; input: string; budget: Budget; tokensIn?: (line: string) => number; files?: string }) =>
	Effect.callback<Exited>((resume) => {
		const started = Date.now()
		const child = spawn('sh', ['-c', GROUP, 'mw-agent', o.files ?? '', o.command, ...o.args], { cwd: o.cwd, env: o.env, detached: true, stdio: ['pipe', 'pipe', 'pipe', 'pipe'] })
		const kill = () => {
			try {
				process.kill(-child.pid!, 'SIGKILL')
			} catch {}
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
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
			stdout += chunk
			if (!o.tokensIn) return
			const lines = (partial + chunk).split('\n')
			partial = lines.pop()!
			for (const line of lines) {
				const n = o.tokensIn(line)
				if (n) tokens = (tokens ?? 0) + n
			}
			if (o.budget.tokens !== undefined && tokens !== null && tokens > o.budget.tokens) over('tokens')
		})
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
		child.stdin.on('error', (e) => (stdinError = e.message))
		child.on('exit', kill)
		child.on('close', (code) => {
			clearTimeout(timer)
			resume(Effect.succeed({ code, stdout, stderr, stdinError, overBudget }))
		})
		child.stdin.end(o.input)
		return Effect.sync(() => {
			clearTimeout(timer)
			kill()
		})
	})

export const overBudgetError = (who: string, o: OverBudget) =>
	`${who} went over its budget: ${o.exceeded === 'minutes' ? `ran ${(o.ms / 60_000).toFixed(1)} of ${o.budget.minutes} minutes` : `used ${o.tokens} of ${o.budget.tokens} tokens`}; its process group was killed.`

/**
 * A worker that hands each job to an external command: the request as JSON on stdin, a WorkerResult
 * as JSON on stdout. Any harness can be plugged in this way with a small script. The command runs in
 * its own process group under the job's wall-time budget.
 */
export const commandWorker = (command: string) =>
	Layer.succeed(Worker, {
		run: (request) =>
			runGroup({ command: 'sh', args: ['-c', command], cwd: request.cwd, env: process.env, input: JSON.stringify(request), budget: request.budget ?? DEFAULT_BUDGET }).pipe(
				Effect.map(({ code, stdout, stderr, stdinError, overBudget }): WorkerResult => {
					if (overBudget) return { ok: false, error: overBudgetError('The worker command', overBudget), overBudget, raw: stdout }
					try {
						return JSON.parse(stdout) as WorkerResult
					} catch {
						const unread = stdinError ? ` without reading its request on stdin (${stdinError})` : ''
						return { ok: false, error: `Worker command exited ${code}${unread} and printed no JSON result. stderr: ${stderr.slice(-2000)}` }
					}
				}),
			),
	})
