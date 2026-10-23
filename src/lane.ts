// The delivery lane: one work item in, one shipped change out.
// Four stages and six agent profiles, each job a separate call on its own card. After planning the work
// splits (ruling 12): the implementer and the test architect run in parallel from the same plan, and
// neither sees the other's output. Verification is Made Well's own code (ruling 14): it runs the item's
// checks against the implementer's change, and only a failure calls an agent, the arbiter.
//
// Every deliverable is schema-first JSON: the schemas below are what each job is told to answer with and
// what its answer is decoded against.
import { Result, Schema } from 'effect'

export type Job = 'discover' | 'ideate' | 'challenge' | 'plan' | 'test-plan' | 'implement' | 'verify' | 'arbitrate'
type Stage = 'discovery' | 'ideation' | 'planning' | 'implementation' | 'verification'
export type Cause = 'pre-existing' | 'implementation' | 'test'
/** The two jobs that run in parallel after planning. */
export type Maker = 'implement' | 'test-plan'
export const MAKERS: ReadonlyArray<Maker> = ['implement', 'test-plan']
export const isMaker = (job: Job): job is Maker => job === 'implement' || job === 'test-plan'

interface Step {
	readonly job: Job
	readonly stage: Stage
	readonly profile: string
	readonly duty: string
}

const DELIVERY: ReadonlyArray<Step> = [
	{ job: 'ideate', stage: 'ideation', profile: 'ideator', duty: 'Shape the outcome and the smallest useful approach, and settle every design decision it raises. Do not implement.' },
	{ job: 'challenge', stage: 'ideation', profile: 'ideation peer', duty: 'Challenge the idea against the actual workspace: defects, missing constraints, unnecessary scope. Settle each finding with a decision. Do not implement.' },
	{ job: 'plan', stage: 'planning', profile: 'planner', duty: 'Inspect the workspace and write the contract: what is made and not made, the files the change may touch, the exact steps, and the done-when items. Settle every design choice. Do not implement.' },
	{ job: 'test-plan', stage: 'planning', profile: 'test architect', duty: 'From the plan alone, write the checks for this work item: for each done-when item, at least one shell command that exits 0 only when that item is done. Do not write product code.' },
	{ job: 'implement', stage: 'implementation', profile: 'implementer', duty: 'Execute the plan exactly as written. Do not design, improvise or change the plan, and never write or run checks of your own work.' },
	{ job: 'verify', stage: 'verification', profile: 'made well', duty: 'Made Well runs the item\'s own check commands against the implementer\'s change; exit 0 ships.' },
]

/** Discovery: raw input in, candidate work items out. The ideator runs it. */
const DISCOVER: Step = {
	job: 'discover',
	stage: 'discovery',
	profile: 'ideator',
	duty: 'Turn the operator\'s raw input into separate candidate work items (features, bug fixes, chores), in the order they should be delivered; an item that builds on earlier ones names them under "after". Each item is one coherent piece of work that delivery can take alone; its text carries the purpose, scope and what done means, in the operator\'s terms. Surface uncertainty instead of guessing. Do not plan or implement.',
}

const ARBITER: Step = {
	job: 'arbitrate',
	stage: 'verification',
	profile: 'arbiter',
	duty: 'A check failed or a step could not be done as written. Decide from the evidence whose it is: a pre-existing defect, a bad implementation, or a bad test.',
}

export const stepOf = (job: Job): Step => (job === 'arbitrate' ? ARBITER : job === 'discover' ? DISCOVER : DELIVERY.find((s) => s.job === job)!)

/**
 * What each job receives of earlier deliverables: a static table, not every accepted output. The makers
 * receive the plan and nothing of each other; only the arbiter sees both. Lane order, so packets of later
 * jobs extend the prefix of earlier ones.
 */
export const RECEIVES: Readonly<Record<Job, ReadonlyArray<Job>>> = {
	discover: [],
	ideate: ['discover'],
	challenge: ['discover', 'ideate'],
	plan: ['discover', 'ideate', 'challenge'],
	'test-plan': ['plan'],
	implement: ['plan'],
	verify: [],
	arbitrate: ['plan', 'test-plan', 'implement'],
}

// ── Deliverables ───────────────────────────────────────────────────────────────────────────────────────

const Text = Schema.String
const Decision = Schema.Struct({
	question: Text,
	decision: Text,
	why: Text.annotate({ description: 'how the three governing questions settle it' }),
})
const Decisions = Schema.Array(Decision).annotate({ description: 'every decision this job settled, and why' })
export const Resource = Schema.Struct({
	kind: Text.annotate({ description: 'for example database-branch, dev-clone, server' }),
	id: Text,
	teardown: Text.annotate({ description: 'shell command that removes it' }),
})
const Provisioned = Schema.optionalKey(Schema.Array(Resource).annotate({ description: 'anything you started or created that is still standing; Made Well tears each down' }))
const DoneWhen = Schema.Struct({ id: Text.annotate({ description: 'short and unique, for example D1' }), text: Text })
type DoneWhen = typeof DoneWhen.Type
export const Check = Schema.Struct({
	id: Text.annotate({ description: 'short and unique, for example C1' }),
	doneWhen: Text.annotate({ description: 'the id of the plan\'s done-when item this check proves' }),
	run: Text.annotate({ description: 'shell command run from the repo root; exit 0 means the item is done' }),
})
export type Check = typeof Check.Type
const Blocked = Schema.Struct({ blocked: Schema.NonEmptyString.annotate({ description: 'what stops you doing the step as written; only when something does' }) })
const Candidate = Schema.Struct({
	title: Text, kind: Schema.Literals(['feature', 'fix', 'chore']), objective: Text, text: Text,
	after: Schema.optionalKey(Schema.Array(Schema.Int).annotate({ description: 'positions (1 is the first) of earlier items in this list that must ship before this one starts, because it builds on them' })),
})
type Candidate = typeof Candidate.Type

export const PLAN = Schema.Struct({
	making: Text,
	notMaking: Schema.Array(Text),
	scope: Schema.Array(Text).annotate({ description: 'every file the change may touch, repo-relative; a directory ends in "/". A change outside it is refused.' }),
	steps: Schema.Array(Text).annotate({ description: 'exact instructions with paths; nothing left to decide' }),
	doneWhen: Schema.Array(DoneWhen),
	decisions: Decisions,
	follows: Schema.optionalKey(Schema.Array(Schema.Struct({
		path: Text.annotate({ description: 'a scope entry that does not exist yet' }),
		follows: Text.annotate({ description: 'the existing file (same extension) or directory it is modelled on' }),
	})).annotate({ description: 'for every new file or directory in scope, the existing one it follows; its makers receive that file. Required whenever the repo already has one of that kind.' })),
})
export type Plan = typeof PLAN.Type

export const DELIVERABLES = {
	discover: Schema.Struct({ items: Schema.Array(Candidate) }),
	ideate: Schema.Struct({ outcome: Text, approach: Text, decisions: Decisions }),
	challenge: Schema.Struct({ findings: Schema.Array(Schema.Struct({ finding: Text, resolution: Text })), decisions: Decisions }),
	plan: PLAN,
	'test-plan': Schema.Union([Schema.Struct({ checks: Schema.Array(Check), provisioned: Provisioned }), Blocked]),
	implement: Schema.Union([Schema.Struct({ summary: Text, provisioned: Provisioned }), Blocked]),
	arbitrate: Schema.Struct({ cause: Schema.Literals(['pre-existing', 'implementation', 'test', 'undetermined']), answer: Text, evidence: Text, provisioned: Provisioned }),
} as const

/** The receiver's reply at intake: the three NQ questions, each a list. */
export const INTAKE = Schema.Struct({
	understanding: Text,
	unclear: Schema.Array(Text).annotate({ description: 'What is unclear?' }),
	ambiguous: Schema.Array(Text).annotate({ description: 'What is ambiguous?' }),
	missing: Schema.Array(Text).annotate({ description: 'Do I have everything I need to proceed? What is missing.' }),
	notes: Schema.Array(Text).annotate({ description: 'points the packet already settles; never an assumption or a choice' }),
})
export const ORIGINATOR = Schema.Struct({ answer: Schema.NonEmptyString, needsOperator: Schema.Boolean })

/** A schema as compact JSON Schema, for a brief. */
export const shapeOf = (schema: Schema.Top) =>
	JSON.parse(JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, (k, v) => (k === 'additionalProperties' ? undefined : v)))

/** Fields an answer's JSON must carry, for the call's facts. */
export const requiredOf = (schema: Schema.Top): string[] => {
	const s = shapeOf(schema)
	return s.required ?? []
}

/**
 * The last JSON object in `output`, decoded against `schema`; or why it is refused. The packet names the
 * shape under `you.answer`, so an answer wrapped as {"answer": {...}} is unwrapped once when it does not
 * decode as given.
 */
export function decode<S extends Schema.Top & Schema.ConstraintDecoder<unknown>>(schema: S, output: string): { ok: true; value: S['Type'] } | { ok: false; reason: string } {
	const json = lastJson(output)
	if (!json) return { ok: false, reason: 'The answer did not end with a JSON object.' }
	const r = Schema.decodeUnknownResult(schema)(json, { errors: 'all' })
	if (Result.isSuccess(r)) return { ok: true, value: r.success }
	const inner = Object.keys(json).length === 1 ? json.answer : undefined
	const wrapped = inner !== null && typeof inner === 'object' && !Array.isArray(inner)
	if (wrapped) {
		const u = Schema.decodeUnknownResult(schema)(inner, { errors: 'all' })
		if (Result.isSuccess(u)) return { ok: true, value: u.success }
	}
	return { ok: false, reason: `The answer's JSON does not match its schema: ${r.failure.message}${wrapped ? '\nPut the fields at the top level of the JSON object, not under "answer".' : ''}` }
}

const dupes = (ids: ReadonlyArray<string>) => ids.filter((id, i) => ids.indexOf(id) !== i)

/** A scope entry as a path: a directory entry loses its "/" or "/**"; undefined for a glob, which names no one path. */
const entryOf = (entry: string) => {
	const dir = entry.endsWith('/') || entry.endsWith('/**')
	const path = entry.replace(/\/(\*\*)?$/, '')
	return /[*?[{]/.test(path) ? undefined : { path, dir }
}

/** Why the plan breaks the follows rule against the files tracked at its base, or undefined. A kind the repo has none of yet needs nothing to follow. */
function unfollowed(p: Plan, tracked: ReadonlyArray<string>): string | undefined {
	const isDir = (d: string) => tracked.some((f) => f.startsWith(d + '/'))
	const ext = (f: string) => /\.[^./]+$/.exec(f)?.[0] ?? ''
	const misses: string[] = []
	for (const entry of p.scope) {
		const e = entryOf(entry)
		if (!e || (e.dir ? isDir(e.path) : tracked.includes(e.path))) continue
		const settled = e.dir ? tracked.some((f) => f.includes('/')) : tracked.some((f) => ext(f) === ext(e.path))
		if (!settled) continue
		const named = p.follows?.find((f) => entryOf(f.path)?.path === e.path)?.follows
		const target = named === undefined ? undefined : entryOf(named)?.path
		if (named === undefined) misses.push(`${entry} is new: name the existing ${e.dir ? 'directory' : `${ext(e.path) || 'extensionless'} file`} it follows.`)
		else if (!target || !(e.dir ? isDir(target) : tracked.includes(target))) misses.push(`${entry} follows ${named}, which is not ${e.dir ? 'a directory' : 'a file'} in the repo.`)
		else if (!e.dir && ext(target) !== ext(e.path)) misses.push(`${entry} follows ${named}, which is a different kind of file: name an existing ${ext(e.path) || 'extensionless'} file.`)
	}
	return misses.length ? `The plan creates files without following what the repo already settled. ${misses.join(' ')}` : undefined
}

/**
 * Checks a job's deliverable beyond its schema. Pure: the plan carries the done-when ids the checks must thread.
 * `tracked`, the files at the plan's base, enables the follows rule; without it (re-reading a stored plan) the rule is not applied.
 */
export function validate(job: Job, output: string, plan?: Plan, tracked?: ReadonlyArray<string>): { ok: true; value: Record<string, unknown> } | { ok: false; reason: string } {
	if (job === 'discover') {
		// Discovery keeps what it can: an item without a title or objective is dropped, not the whole run.
		const report = lastJson(output)
		if (!Array.isArray(report?.items)) return { ok: false, reason: 'The answer did not end with {"items": [...]}.' }
		const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
		const all = report.items as Record<string, unknown>[]
		const kept = all.flatMap((i, n) => (text(i?.title) && text(i?.objective) ? [n] : []))
		const items = kept.map((n, k): Candidate => {
			const i = all[n]!
			// "after" may name only earlier kept items; positions are renumbered past any dropped item.
			const after = [...new Set((Array.isArray(i.after) ? i.after : []).map((p) => kept.indexOf(Number(p) - 1)).filter((m) => m >= 0 && m < k))].map((m) => m + 1)
			return { title: text(i.title), objective: text(i.objective), text: text(i.text), kind: i.kind === 'fix' || i.kind === 'chore' ? i.kind : 'feature', ...(after.length ? { after } : {}) }
		})
		return { ok: true, value: { items } }
	}
	if (job === 'verify') return { ok: false, reason: 'verify is Made Well\'s own code, not an agent job.' }
	const decoded = decode(DELIVERABLES[job], output)
	if (!decoded.ok) return decoded
	const value = decoded.value as Record<string, unknown>
	if (job === 'plan') {
		const p = value as Plan
		if (!p.scope.length) return { ok: false, reason: 'The plan declares no scope: name every file the change may touch.' }
		const outside = p.scope.filter((f) => f.startsWith('/') || f.split('/').includes('..'))
		if (outside.length) return { ok: false, reason: `Scope entries must be repo-relative paths inside the repo: ${outside.join(', ')}.` }
		if (!p.doneWhen.length) return { ok: false, reason: 'The plan has no done-when items.' }
		if (dupes(p.doneWhen.map((d) => d.id)).length) return { ok: false, reason: `Done-when ids repeat: ${dupes(p.doneWhen.map((d) => d.id)).join(', ')}.` }
		const missed = tracked && unfollowed(p, tracked)
		if (missed) return { ok: false, reason: missed }
	}
	if (job === 'test-plan' && 'checks' in value && plan) {
		const checks = value.checks as Check[]
		const ids = plan.doneWhen.map((d) => d.id)
		const unknown = checks.filter((c) => !ids.includes(c.doneWhen)).map((c) => `${c.id} → ${c.doneWhen}`)
		const uncovered = ids.filter((id) => !checks.some((c) => c.doneWhen === id))
		const repeated = dupes(checks.map((c) => c.id))
		if (unknown.length || uncovered.length || repeated.length) {
			return { ok: false, reason: [unknown.length && `Checks name done-when ids the plan does not have: ${unknown.join(', ')}.`, uncovered.length && `Done-when items without a check: ${uncovered.join(', ')}.`, repeated.length && `Check ids repeat: ${repeated.join(', ')}.`].filter(Boolean).join(' ') }
		}
	}
	return { ok: true, value }
}

/** Where the work goes after a single-track job's deliverable is accepted. Pure: the engine applies it. */
type Route =
	| { readonly to: 'discovered'; readonly items: ReadonlyArray<Candidate> }
	| { readonly to: 'next'; readonly job: Job }
	| { readonly to: 'split' }
	| { readonly to: 'arbitrate'; readonly failure: string }
	| { readonly to: 'rework'; readonly job: Job; readonly cause: Cause; readonly answer: string }
	| { readonly to: 'prerequisite'; readonly answer: string }
	| { readonly to: 'hold'; readonly code: string; readonly message: string }

const MAX_CORRECTIONS = 3

export const blockedOf = (job: Job, value: Record<string, unknown>) =>
	typeof value.blocked === 'string' ? `The ${stepOf(job).profile} (${job}) could not do the step as written: ${value.blocked}` : undefined

export function route(job: Job, value: Record<string, unknown>, corrections: number): Route {
	if (job === 'discover') return { to: 'discovered', items: value.items as Candidate[] }
	const blocked = blockedOf(job, value)
	if (blocked) return { to: 'arbitrate', failure: blocked }
	if (job === 'plan') return { to: 'split' }
	// A corrected test is run again; the valid implementation is not rebuilt.
	if (job === 'test-plan' || job === 'implement') return { to: 'next', job: 'verify' }
	if (job === 'arbitrate') {
		const cause = value.cause as Cause | 'undetermined'
		const answer = value.answer as string
		if (cause === 'undetermined') return { to: 'hold', code: 'arbiter_undetermined', message: `The arbiter could not decide whose failure this is: ${answer}` }
		if (corrections >= MAX_CORRECTIONS) return { to: 'hold', code: 'too_many_corrections', message: `${corrections} corrections have not made the checks pass. Last ruling: ${cause}: ${answer}` }
		if (cause === 'pre-existing') return { to: 'prerequisite', answer }
		return { to: 'rework', job: cause === 'test' ? 'test-plan' : 'plan', cause, answer }
	}
	const i = DELIVERY.findIndex((s) => s.job === job)
	return { to: 'next', job: DELIVERY[i + 1]!.job }
}

/** The last top-level JSON object in a worker's answer, or undefined. A closing code fence after it is allowed. */
export function lastJson(text: string): Record<string, unknown> | undefined {
	text = text.replace(/\s*```\s*$/, '')
	for (let start = text.lastIndexOf('{'); start !== -1; start = text.lastIndexOf('{', start - 1)) {
		try {
			const value = JSON.parse(text.slice(start).trim())
			if (value && typeof value === 'object' && !Array.isArray(value)) return value
		} catch {}
	}
	return undefined
}
