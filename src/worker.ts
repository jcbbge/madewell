// The only thing Made Well asks of a harness: run one job on one card, headless, and say what came back.
// Claude Code, Codex and pi adapters implement this; tests use a scripted fake.
import { execFile } from 'node:child_process'
import { Context, Effect, Layer } from 'effect'
import type { Access, Card } from './cards.ts'
import type { MadeWellError } from './errors.ts'
import type { Job } from './lane.ts'

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
}

export interface UsageLimit {
	readonly account: string
	/** Epoch ms when the account's quota resets, if the harness said. */
	readonly resetsAt: number | null
	readonly message: string
}

export type WorkerResult =
	| { readonly ok: true; readonly output: string }
	| { readonly ok: false; readonly limit: UsageLimit }
	| { readonly ok: false; readonly error: string }

export class Worker extends Context.Service<Worker, {
	readonly run: (request: WorkerRequest) => Effect.Effect<WorkerResult, MadeWellError>
}>()('madewell/Worker') {}

/**
 * A worker that hands each job to an external command: the request as JSON on stdin, a WorkerResult
 * as JSON on stdout. Any harness can be plugged in this way with a small script.
 */
export const commandWorker = (command: string) =>
	Layer.succeed(Worker, {
		run: (request) =>
			Effect.promise(() => new Promise<{ code: number; stdout: string; stderr: string }>((done) => {
				const child = execFile('sh', ['-c', command], { cwd: request.cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => done({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr }))
				child.stdin?.end(JSON.stringify(request))
			})).pipe(
				Effect.flatMap(({ code, stdout, stderr }) => {
					try {
						return Effect.succeed(JSON.parse(stdout) as WorkerResult)
					} catch {
						return Effect.succeed<WorkerResult>({ ok: false, error: `Worker command exited ${code} without a JSON result. stderr: ${stderr.slice(-2000)}` })
					}
				}),
			),
	})
