import { Data, Schema } from 'effect'

/** A command an agent (or person) can run next, and why. */
export const Next = Schema.Struct({ run: Schema.String, why: Schema.String }).annotate({ identifier: 'Next' })
export type Next = typeof Next.Type

/** A path or value quoted for a shell, so a `next` command runs as written. */
export const quote = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`)

const Id = Schema.Int
const Hold = Schema.Struct({ code: Schema.String, message: Schema.String, context: Schema.Record(Schema.String, Schema.Unknown) })

/**
 * Every error code Made Well returns, what it means, and the fixed shape of its `context`. The set is
 * closed: a MadeWellError cannot be built with a code or context that is not listed here, and `mw`
 * prints this table in its manual.
 */
export const ERRORS = {
	settings_invalid: {means: 'Settings failed validation.', context: Schema.Record(Schema.String,Schema.Unknown)},
	work_invalid: {means: 'Work input failed validation.', context: Schema.Record(Schema.String,Schema.Unknown)},
	revision_conflict: {means: 'The work changed concurrently.', context: Schema.Record(Schema.String,Schema.Unknown)},
	request_id_conflict: {means: 'Request identity was reused with different input.', context: Schema.Record(Schema.String,Schema.Unknown)},
	discovery_dependency_invalid: {means: 'A candidate dependency is invalid.', context: Schema.Record(Schema.String,Schema.Unknown)},
	work_terminal: {means: 'Terminal work cannot be changed.', context: Schema.Record(Schema.String,Schema.Unknown)},
	work_busy: {means: 'Work is not quiescent.', context: Schema.Record(Schema.String,Schema.Unknown)},
	blocker_exists: {means: 'The active blocker already exists.', context: Schema.Record(Schema.String,Schema.Unknown)},
	blocker_not_found: {means: 'The active blocker does not exist.', context: Schema.Record(Schema.String,Schema.Unknown)},
	completion_invalid: {means: 'Completion evidence is invalid.', context: Schema.Record(Schema.String,Schema.Unknown)},
	file_result_invalid: {means: 'A file reference is invalid.', context: Schema.Record(Schema.String,Schema.Unknown)},
	execution_uncertain: {means: 'An interrupted side effect needs an explicit resolution.', context: Schema.Record(Schema.String,Schema.Unknown)},
	function_corrections_exhausted: {means: 'The correction allowance is exhausted.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_required: {means: 'Historical storage needs migration.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_in_progress: {means: 'Migration is unfinished.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_attestation_missing: {means: 'Writers must be stopped before migration.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_token_stale: {means: 'The preview token is stale.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_not_required: {means: 'No migration is required.', context: Schema.Record(Schema.String,Schema.Unknown)},
	migration_conflict: {means: 'Registry or migration state changed.', context: Schema.Record(Schema.String,Schema.Unknown)},

	prepared_input_failed: { means: 'A prepared resource could not be captured or safely extracted.', context: Schema.Struct({ dir: Schema.String, phase: Schema.Literals(['capture', 'assess', 'extract']), paths: Schema.Array(Schema.String), reason: Schema.String }) },
	replan_unavailable: { means: 'Technical replanning is unavailable for this item state.', context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String, reason: Schema.String }) },
	usage: {
		means: 'The command line is wrong: an unknown command or option, missing input, or a <placeholder> left unfilled. `mw` prints every command with its input schema.',
		context: Schema.Struct({ command: Schema.NullOr(Schema.String) }),
	},
	source_unreadable: { means: 'The file named by --source-file cannot be read.', context: Schema.Struct({ path: Schema.String }) },
	item_not_found: { means: 'No work item has this number.', context: Schema.Struct({ id: Id }) },
	api_request: {
		means: 'A versioned API request failed validation, security, concurrency or transport checks; context names the HTTP status and reason.',
		context: Schema.Struct({ status: Schema.Int, reason: Schema.String, facts: Schema.Record(Schema.String, Schema.Unknown) }),
	},
	qa_request: {
		means: 'A manual QA request was refused; retain the exact draft and request ID, and follow the refresh command before rebasing a conflict.',
		context: Schema.Struct({ status: Schema.Int, reason: Schema.String, facts: Schema.Record(Schema.String, Schema.Unknown) }),
	},
	capture_failed: { means: 'Live process output could not be captured; its process group was stopped rather than continuing without evidence.', context: Schema.Struct({ command: Schema.String, channel: Schema.String, reason: Schema.String }) },
	not_held: { means: 'The item is not waiting on the operator, so there is nothing to answer or retry.', context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
	not_answerable: { means: 'The item holds on something an answer does not resolve; `next` names what does.', context: Schema.Struct({ id: Id, hold: Hold }) },
	cause_required: { means: 'The item holds on a failed check; the answer must name its cause with --cause.', context: Schema.Struct({ id: Id, hold: Hold }) },
	answer_required: { means: 'The item waits on the operator\'s answer, not a retry.', context: Schema.Struct({ id: Id, hold: Hold }) },
	not_discovered: { means: 'The item is not a finished discovery run, so it has no candidates to promote.', context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
	not_droppable: { means: 'The work is terminal and cannot be dropped.', context: Schema.Struct({ id: Id, status: Schema.String }) },
	not_a_candidate: {
		means: 'Some named items are not candidates of this discovery run.',
		context: Schema.Struct({ discovery: Id, unknown: Schema.Array(Id), candidates: Schema.Array(Schema.Struct({ id: Id, title: Schema.String })) }),
	},
	store_locked: {
		means: 'Another live runner is delivering from this store; queued work reaches it by itself.',
		context: Schema.Struct({
			store: Schema.String,
			owner: Schema.Struct({ pid: Schema.Int, since: Schema.String, item: Schema.NullOr(Schema.Struct({ id: Id, title: Schema.String, job: Schema.String, status: Schema.String })) }),
		}),
	},
	prescriptions_unreadable: { means: 'The prescriptions file cannot be read.', context: Schema.Struct({ path: Schema.String, reason: Schema.String }) },
	prescriptions_invalid: {
		means: 'The prescriptions file is not valid JSON, does not match its shape, or names an undefined tier.',
		context: Schema.Struct({
			path: Schema.String,
			reason: Schema.optionalKey(Schema.String),
			problems: Schema.optionalKey(Schema.String),
			job: Schema.optionalKey(Schema.String),
			tier: Schema.optionalKey(Schema.String),
			tiers: Schema.optionalKey(Schema.Array(Schema.String)),
			card: Schema.optionalKey(Schema.Unknown),
			harnesses: Schema.optionalKey(Schema.Array(Schema.String)),
		}),
	},
	cartridges_unreadable: { means: 'The cartridge pack file cannot be read.', context: Schema.Struct({ path: Schema.String, reason: Schema.String }) },
	function_failed: {
		means: 'A function failed its input, execution or output contract. Accepted earlier nodes remain saved.',
		context: Schema.Struct({ id: Id, job: Schema.String, reason: Schema.String }),
	},
	cartridges_invalid: {
		means: 'The cartridge pack does not plug into the console: it is not valid JSON, does not match the pack shape, or breaks the console\'s contract (`problems` lists each).',
		context: Schema.Struct({ path: Schema.String, problems: Schema.Array(Schema.String) }),
	},
	eval_card_invalid: {
		means: 'The --card of `mw eval` is neither a tier in prescriptions nor a card as JSON {harness, provider, account, model, effort} on a known harness.',
		context: Schema.Struct({ card: Schema.String, tiers: Schema.Array(Schema.String), harnesses: Schema.Array(Schema.String), problems: Schema.optionalKey(Schema.String) }),
	},
	eval_no_calls: {
		means: 'The store holds no recorded calls of that job (for those items) to replay; `recorded` counts the calls of each job it does hold.',
		context: Schema.Struct({ store: Schema.String, job: Schema.String, items: Schema.Array(Id), recorded: Schema.Record(Schema.String, Schema.Int) }),
	},
	brief_unreadable: { means: 'The file named by --brief cannot be read.', context: Schema.Struct({ path: Schema.String }) },
	export_failed: { means: 'The export folder cannot be written.', context: Schema.Struct({ id: Id, dir: Schema.String, reason: Schema.String }) },
	ui_unavailable: { means: 'The console cannot listen on the address asked for: the port is taken or not allowed.', context: Schema.Struct({ host: Schema.String, port: Schema.Int, reason: Schema.String }) },
	ui_unsupported: { means: 'The web interface cannot be provisioned as a background service on this platform: only Linux (systemd user units) and macOS (LaunchAgents) are supported.', context: Schema.Struct({ platform: Schema.String, supported: Schema.Array(Schema.String) }) },
	ui_service_failed: { means: 'The service manager (systemctl or launchctl) refused a step of installing, removing or inspecting the web interface service.', context: Schema.Struct({ platform: Schema.String, command: Schema.String, exitCode: Schema.Int, stderr: Schema.String }) },
	workspace_written: { means: 'A read-only call changed scratch or declared material.', context: Schema.Struct({ dir: Schema.String, changes: Schema.Unknown }) },
	out_of_scope: {
		means: 'The change touches files outside the plan\'s declared scope.',
		context: Schema.Struct({ dir: Schema.String, base: Schema.String, declared: Schema.Array(Schema.String), outside: Schema.Array(Schema.String), changed: Schema.Array(Schema.String) }),
	},
	leftovers: { means: 'A job left untracked or ignored files behind.', context: Schema.Struct({ dir: Schema.String, files: Schema.Array(Schema.String) }) },
	teardown_failed: {
		means: 'Some resources an agent provisioned could not be torn down.',
		context: Schema.Struct({ cwd: Schema.String, failed: Schema.Array(Schema.Unknown), records: Schema.Array(Schema.Unknown) }),
	},
} as const

export type ErrorCode = keyof typeof ERRORS

type Fields = {
	[C in ErrorCode]: {
		readonly code: C
		readonly message: string
		readonly context: (typeof ERRORS)[C]['context']['Type']
		readonly cause?: string
		readonly next: ReadonlyArray<Next>
	}
}[ErrorCode]

/**
 * The one error shape Made Well returns. It is written for the agent reading it: what happened,
 * the facts needed to act without re-investigating, why it happened, and the exact next commands.
 */
export class MadeWellError extends Data.TaggedError('MadeWellError')<{
	readonly code: ErrorCode
	readonly message: string
	readonly context: object
	readonly cause?: string
	readonly next: ReadonlyArray<Next>
}> {
	constructor(fields: Fields) {
		super(fields)
	}
}

export const errorJson = (e: MadeWellError) => ({
	error: e.code,
	message: e.message,
	context: e.context,
	...(e.cause ? { cause: e.cause } : {}),
	next: e.next,
})
