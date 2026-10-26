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
	usage: {
		means: 'The command line is wrong: an unknown command or option, missing input, or a <placeholder> left unfilled. `mw` prints every command with its input schema.',
		context: Schema.Struct({ command: Schema.NullOr(Schema.String) }),
	},
	source_unreadable: { means: 'The file named by --source-file cannot be read.', context: Schema.Struct({ path: Schema.String }) },
	workspace_missing: { means: 'The workspace directory does not exist.', context: Schema.Struct({ workspace: Schema.String }) },
	project_not_found: {
		means: 'The workspace is not a registered project; `mw init` registers it with its ship command.',
		context: Schema.Struct({ workspace: Schema.String, projects: Schema.Array(Schema.String) }),
	},
	projects_invalid: { means: 'The project registry in Made Well\'s home is not valid.', context: Schema.Struct({ path: Schema.String, problems: Schema.String }) },
	item_not_found: { means: 'No work item has this number.', context: Schema.Struct({ id: Id }) },
	capture_failed: { means: 'Live process output could not be captured; its process group was stopped rather than continuing without evidence.', context: Schema.Struct({ command: Schema.String, channel: Schema.String, reason: Schema.String }) },
	not_held: { means: 'The item is not waiting on the operator, so there is nothing to answer or retry.', context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
	not_answerable: { means: 'The item holds on something an answer does not resolve; `next` names what does.', context: Schema.Struct({ id: Id, hold: Hold }) },
	cause_required: { means: 'The item holds on a failed check; the answer must name its cause with --cause.', context: Schema.Struct({ id: Id, hold: Hold }) },
	answer_required: { means: 'The item waits on the operator\'s answer, not a retry.', context: Schema.Struct({ id: Id, hold: Hold }) },
	not_discovered: { means: 'The item is not a finished discovery run, so it has no candidates to promote.', context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
	not_droppable: { means: 'The item has shipped: its change is on main, so there is nothing to abandon.', context: Schema.Struct({ id: Id, status: Schema.String }) },
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
	git_failed: { means: 'A git command Made Well ran in a workspace failed.', context: Schema.Struct({ dir: Schema.String, args: Schema.Array(Schema.String), exitCode: Schema.Int, stderr: Schema.String }) },
	bad_worktree_name: { means: 'A job worktree name holds characters other than letters, digits, ".", "_" or "-".', context: Schema.Struct({ name: Schema.String }) },
	worktree_root_unclean: {
		means: 'Job worktrees would sit inside the product repo or below a guidance file, so agents would read instructions that are not the product\'s.',
		context: Schema.Struct({ root: Schema.String, repo: Schema.String, guidanceAbove: Schema.Array(Schema.String), insideRepo: Schema.Boolean }),
	},
	base_not_found: { means: 'The commit an item starts from is not in the product repo.', context: Schema.Struct({ repo: Schema.String, base: Schema.String }) },
	no_branch: { means: 'The product repo has no branch checked out, so Made Well does not know which branch an item ships to.', context: Schema.Struct({ repo: Schema.String }) },
	path_outside_workspace: { means: 'A snapshot was asked for files outside the workspace.', context: Schema.Struct({ dir: Schema.String, outside: Schema.Array(Schema.String) }) },
	workspace_written: { means: 'A read-only call changed the workspace.', context: Schema.Struct({ dir: Schema.String, changes: Schema.Unknown }) },
	branch_moved: {
		means: 'A branch moved while an item was in flight; only ship may move it.',
		context: Schema.Struct({ repo: Schema.String, ref: Schema.String, recorded: Schema.String, now: Schema.String, landed: Schema.Array(Schema.String) }),
	},
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

/** What one error may put on stderr: the facts to act on, with long evidence summarised. The record holds it all. */
export const STDERR_CAP = 4096

/** The work item an error's context is about, when it names one. */
const itemOf = (context: Record<string, unknown>): number | undefined => {
	for (const key of ['id', 'item', 'discovery']) if (typeof context[key] === 'number') return context[key] as number
	const owner = context.owner as { item?: { id?: unknown } } | undefined
	return typeof owner?.item?.id === 'number' ? owner.item.id : undefined
}

/**
 * The error as the CLI prints it: its shape intact, and every long string or list in its context summarised (first
 * line, lines, bytes; the first entries and the count) until the whole fits near STDERR_CAP. A summarised error
 * points at `mw show <id>`, which prints the record in full; nothing is lost from the store.
 */
export function condense(e: ReturnType<typeof errorJson>): ReturnType<typeof errorJson> {
	const id = itemOf(e.context as Record<string, unknown>)
	const see = id === undefined ? '' : `; mw show ${id} has it in full`
	const shorten = (cap: number) => {
		let cut = false
		const walk = (v: unknown): unknown => {
			if (typeof v === 'string') {
				if (v.length <= cap) return v
				cut = true
				const lines = v.split('\n')
				return `${lines[0]!.slice(0, cap)}… [${lines.length} line${lines.length === 1 ? '' : 's'}, ${Buffer.byteLength(v)} bytes${see}]`
			}
			if (Array.isArray(v)) {
				const kept: unknown[] = v.slice(0, 10).map(walk)
				if (v.length > 10) (cut = true), kept.push(`… ${v.length - 10} more of ${v.length}${see}`)
				return kept
			}
			if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
			return v
		}
		return { context: walk(e.context) as object, cut }
	}
	let cap = 400
	let short = shorten(cap)
	while (Buffer.byteLength(JSON.stringify({ ...e, context: short.context })) > STDERR_CAP && cap > 40) short = shorten((cap = Math.floor(cap / 2)))
	const next = short.cut && id !== undefined && !e.next.some((n) => n.run === `mw show ${id}`)
		? [...e.next, { run: `mw show ${id}`, why: 'the error\'s context in full, as the record holds it' }]
		: e.next
	return { ...e, context: short.context, next }
}
