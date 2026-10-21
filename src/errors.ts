import { Data } from 'effect'

/** A command an agent (or person) can run next, and why. */
export interface Next {
	readonly run: string
	readonly why: string
}

/**
 * The one error shape Made Well returns. It is written for the agent reading it: what happened,
 * the facts needed to act without re-investigating, why it happened, and the exact next commands.
 */
export class MadeWellError extends Data.TaggedError('MadeWellError')<{
	readonly code: string
	readonly message: string
	readonly context: Record<string, unknown>
	readonly cause?: string
	readonly next: ReadonlyArray<Next>
}> {}

export const errorJson = (e: MadeWellError) => ({
	error: e.code,
	message: e.message,
	context: e.context,
	...(e.cause ? { cause: e.cause } : {}),
	next: e.next,
})
