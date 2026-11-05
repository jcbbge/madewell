import { functionSteps, problemsOf } from './readiness.ts'
import { readFileSync } from 'node:fs'
import { Effect, Result, Schema } from 'effect'
import { Decision } from './decision.ts'
import { MadeWellError } from './errors.ts'
import { acceptanceProblem } from './acceptance-contract.ts'
import { DISCOVERY_CONTRIBUTION_SCHEMAS, discoveryContributionShape, validateDiscoveryContribution, type AcceptedDiscovery, type DiscoveryJob } from './discovery-contract.ts'

export type Job = string
export type Cause = 'pre-existing' | 'implementation' | 'test' | 'environment' | 'function-check'
/** The two jobs that run in parallel after planning. */
export type Maker = 'implement' | 'test-plan'
export const isMaker = (job: Job): job is Maker => job === 'implement' || job === 'test-plan'

/** A JSON Schema, as a cartridge writes it for a thinking step's deliverable. */
type JsonSchema = Readonly<Record<string, unknown>>

/** One job as the console runs it: a cartridge's step with its defaults filled in. */
export interface Step {
	readonly job: Job
	readonly run?: string
	readonly check?: string
	readonly input?: JsonSchema
	readonly args?: Readonly<Record<string, unknown>>
	readonly children?: ReadonlyArray<string>
	readonly parent?: string
 readonly track?: string
 readonly position?: number
 readonly mode?: 'sequence'|'parallel'
 readonly replay?: 'safe'|'explicit'
 readonly writes?: ReadonlyArray<string>
 readonly onFailure?: {readonly target:string;readonly maxCorrections?:number}
	readonly access?: 'none' | 'read' | 'make' | 'checks' | 'run'
	/** The cartridge it belongs to, shown as its stage. */
	readonly cartridge: string
	readonly loop: 'discovery' | 'delivery'
	readonly profile: string
	readonly duty: string
	/** Instructions beyond the duty; a slot's own task comes first. */
	readonly task?: string
	/** The earlier deliverables its packet carries. */
	readonly receives: ReadonlyArray<Job>
	/** A thinking step's deliverable. A slot's is the console's own. */
	readonly output?: JsonSchema
	/** The prescribed tier a thinking step runs on when the prescriptions do not name it. */
	readonly tier?: string
	readonly budget?: { readonly minutes: number; readonly tokens?: number | undefined }
}

// ── Cartridge packs ────────────────────────────────────────────────────────────────────────────────────

const Positive = Schema.Finite.check(Schema.isGreaterThan(0))
const StepFields = {
	job: Schema.String.annotate({ description: 'the job\'s name, lowercase letters, digits and "-"; names carry no behavior' }),
	profile: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'the agent profile that does it, never a personal name' })),
	duty: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'what the job is for and what it must not do, in one or two sentences' })),
	task: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'further instructions for the job itself' })),
	receives: Schema.optionalKey(Schema.Array(Schema.String).annotate({ description: 'earlier jobs of the same loop whose deliverables it gets ("discover" in delivery: the candidate); default: every earlier one' })),
	output: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown).annotate({ description: 'a thinking step\'s deliverable as JSON Schema, {"type": "object", ...}: Made Well checks type, properties, required, items, enum and anyOf' })),
	tier: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'a thinking step\'s prescribed tier when the prescriptions do not name its job; default "deep"' })),
	budget: Schema.optionalKey(Schema.Struct({ minutes: Positive, tokens: Schema.optional(Positive) }).annotate({ description: 'a thinking step\'s budget when the prescriptions do not name its job' })),
	run: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'functions runtime: trusted command, JSON input on stdin, JSON object output on stdout; stderr carries logs' })),
	check: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'functions runtime: trusted preaccept command; receives {input, output} JSON on stdin, exit 0 accepts the original output' })),
	input: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
	args: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
	mode: Schema.optionalKey(Schema.Literals(['sequence','parallel'])),
	replay: Schema.optionalKey(Schema.Literals(['safe','explicit'])),
	writes: Schema.optionalKey(Schema.Array(Schema.NonEmptyString)),
	onFailure: Schema.optionalKey(Schema.Struct({target:Schema.NonEmptyString,maxCorrections:Schema.optionalKey(Schema.Int)})),
	access: Schema.optionalKey(Schema.Literals(['none', 'read', 'make', 'checks', 'run'])),
}
interface NodeSpec extends Schema.Struct.Type<typeof StepFields> {
	readonly children?: ReadonlyArray<NodeSpec>
}
const StepSpec: Schema.Codec<NodeSpec> = Schema.Struct({
	...StepFields,
	children: Schema.optionalKey(Schema.Array(Schema.suspend((): Schema.Codec<NodeSpec> => StepSpec))),
}).annotate({ identifier: 'Step' })
const CartridgeSpec = Schema.Struct({
	cartridge: Schema.NonEmptyString.annotate({ description: 'its name, shown as the stage of its steps' }),
	steps: Schema.Array(StepSpec),
}).annotate({ identifier: 'Cartridge' })
export const Pack = Schema.Struct({
	name: Schema.NonEmptyString,
	runtime: Schema.optionalKey(Schema.Literals(['software', 'functions']).annotate({ description: 'functions runs explicit node contracts; software is a historical decoding value only' })),
	version: Schema.optionalKey(Schema.NonEmptyString),
	contracts: Schema.optionalKey(Schema.Struct({ execution:Schema.optionalKey(Schema.Literals(['1','2'])),discovery: Schema.optionalKey(Schema.Literals(['1','2'])), acceptance: Schema.optionalKey(Schema.Literals(['1','2'])), handoff: Schema.optionalKey(Schema.Literals(['1','2'])) })),
	completion:Schema.optionalKey(Schema.Struct({resultJob:Schema.NonEmptyString,acceptanceJob:Schema.NonEmptyString})),
	brief: Schema.optionalKey(Schema.String.annotate({ description: 'what every call of this kind of work should know, added to the shared brief' })),
	discovery: Schema.Array(CartridgeSpec).annotate({ description: 'raw input in, candidates out' }),
	delivery: Schema.Array(CartridgeSpec).annotate({ description: 'ordered cartridges; functions may have zero, one or many nodes, including nested children' }),
}).annotate({ identifier: 'Pack' })
export type Pack = typeof Pack.Type

export { functionSteps, problemsOf, rewindJobs } from './readiness.ts'
/** A pack with its defaults filled in, ready for the console. */
export interface Lane {
	readonly pack: Pack
	readonly discovery: ReadonlyArray<Step>
	readonly delivery: ReadonlyArray<Step>
	/** The makers this lane runs after its plan: "implement", with "test-plan" when it is plugged in. */
	readonly makers: ReadonlyArray<Maker>
	readonly arbiter: Step
}

const compile=(pack:Pack):Lane=>({pack,discovery:functionSteps(pack,'discovery'),delivery:functionSteps(pack,'delivery'),makers:[],arbiter:{job:'arbitrate',profile:'arbiter',duty:'',cartridge:'unspecified',loop:'delivery',receives:[]}})
export const UNSPECIFIED:Pack={name:'unspecified',runtime:'functions',discovery:[],delivery:[]}

const lanes = new Map<string, Lane>()
/** The lane an item runs: its own pack, or the unspecified inert lane. */
export const laneOf = (pack?: Pack): Lane => {
	const key = pack ? JSON.stringify(pack) : ''
	let lane = lanes.get(key)
	if (!lane) lanes.set(key, (lane = compile(pack ?? UNSPECIFIED)))
	return lane
}

/** A job of the lane, or a bare step for a job it does not have (an item recorded under another pack). */
export const stepOf = (lane: Lane, job: Job): Step =>
	job === 'arbitrate' && lane.pack.runtime !== 'functions' ? lane.arbiter : [...lane.discovery, ...lane.delivery].find((s) => s.job === job) ?? { job, cartridge: job, loop: 'delivery', profile: job, duty: '', receives: [] }

export const hasJob = (lane: Lane, job: Job) => job === 'arbitrate' || [...lane.discovery, ...lane.delivery].some((s) => s.job === job)

/** Reads and checks a cartridge pack file. */
export const loadPack = (path: string) =>
	Effect.gen(function* () {
		const text = yield* Effect.try({
			try: () => readFileSync(path, 'utf8'),
			catch: (e) => new MadeWellError({ code: 'cartridges_unreadable', message: `Cannot read the cartridge pack ${path}.`, context: { path, reason: String(e) }, next: [{ run: `ls -l ${path}`, why: 'check the file exists and is readable' }, { run: 'mw cartridges', why: 'print the default pack to start one from' }] }),
		})
		const invalid = (problems: string[]) => new MadeWellError({
			code: 'cartridges_invalid', message: `The cartridge pack ${path} does not plug into the console.`, context: { path, problems },
			cause: 'A pack is {name, runtime?, version?, brief?, discovery: [cartridge], delivery: [cartridge]}. Each cartridge has steps. Historical software packs remain read-only. runtime "functions" has no required nodes: use agent profiles, trusted commands, or nested children with input/output contracts.',
			next: [{ run: `$EDITOR ${path}`, why: 'fix each problem in context.problems' }, { run: 'mw cartridges', why: 'compare with the unspecified inert lane' }],
		})
		const json = yield* Effect.try({ try: () => JSON.parse(text) as unknown, catch: (e) => invalid([`It is not valid JSON: ${String(e)}`]) })
		const pack = yield* Schema.decodeUnknownEffect(Pack)(json).pipe(Effect.mapError((e) => invalid([String(e)])))
		const problems = problemsOf(pack)
		if (problems.length) return yield* invalid(problems)
		return pack
	})

// ── Deliverables ───────────────────────────────────────────────────────────────────────────────────────

const Text = Schema.String
const Decisions = Schema.Array(Decision).annotate({ description: 'every decision this job settled, and why' })
export const Resource = Schema.Struct({
	kind: Text.annotate({ description: 'for example database-branch, dev-clone, server' }),
	id: Text,
	teardown: Text.annotate({ description: 'shell command that removes it' }),
})
const Provisioned = Schema.optionalKey(Schema.Array(Resource).annotate({ description: 'anything you started or created that is still standing; Made Well tears each down' }))
const DoneWhen = Schema.Struct({ id: Text.annotate({ description: 'short and unique, for example D1' }), text: Text,
	evidence: Schema.optionalKey(Schema.Unknown),
})
type DoneWhen = typeof DoneWhen.Type
export const Check = Schema.Struct({
	id: Text.annotate({ description: 'short and unique, for example C1' }),
	doneWhen: Text.annotate({ description: 'the id of the plan\'s done-when item this check proves' }),
	run: Text.annotate({ description: 'shell command run from the repo root; exit 0 means the item is done' }),
})
export type Check = typeof Check.Type
const Candidate = Schema.Struct({
	title: Text, kind: Schema.optionalKey(Schema.NonEmptyString), objective: Text, text: Text,conditions:Schema.Array(Schema.Struct({id:Schema.NonEmptyString,text:Schema.NonEmptyString})),
	after: Schema.optionalKey(Schema.Array(Schema.Int).annotate({ description: 'positions (1 is the first) of earlier items in this list that must ship before this one starts, because it builds on them' })),
})
type Candidate = typeof Candidate.Type

export const PLAN = Schema.Struct({
	making: Text,
	notMaking: Schema.Array(Text),
	scope: Schema.Array(Text).annotate({ description: 'every file the change may touch, repo-relative; a directory ends in "/". A change outside it is refused.' }),
	steps: Schema.Array(Text).annotate({ description: 'exact instructions with paths; nothing left to decide' }),
	doneWhen: Schema.Array(DoneWhen),
	resume: Schema.optionalKey(Schema.Array(Schema.Struct({ role: Schema.Literals(['implement', 'test-plan']), sha256: Schema.String }))),
	decisions: Decisions,
	follows: Schema.optionalKey(Schema.Array(Schema.Struct({
		path: Text.annotate({ description: 'a scope entry that does not exist yet' }),
		follows: Text.annotate({ description: 'the existing file (same extension) or directory it is modelled on' }),
	})).annotate({ description: 'for every new file or directory in scope, the existing one it follows; its makers receive that file. Required whenever the repo already has one of that kind.' })),
	conventions: Schema.optionalKey(Schema.Array(Schema.Struct({
		convention: Text.annotate({ description: 'one of item.conventions, word for word' }),
		doneWhen: Schema.optionalKey(Text.annotate({ description: 'the id of the done-when item that proves the change keeps it' })),
		doesNotApply: Schema.optionalKey(Text.annotate({ description: 'instead of doneWhen: why this change cannot touch it' })),
	})).annotate({ description: 'every one of item.conventions, held to a done-when item or said not to apply. Required whenever the item has conventions.' })),
})
export type Plan = typeof PLAN.Type

/**
 * The arbiter's ruling. Its causes follow the lane: "test" only when the lane writes checks; "undetermined" only when an
 * operator is there to name the cause, so in full autonomy the arbiter names the one the evidence best supports.
 */
export const arbiterSchema = (lane: Lane, autonomous: boolean) =>
	Schema.Struct({
		cause: Schema.Literals(['pre-existing', 'implementation', ...(lane.makers.includes('test-plan') ? ['test'] : []), 'environment', ...(autonomous ? [] : ['undetermined'])]),
		answer: Text, evidence: Text, provisioned: Provisioned,
		dispositions: Schema.optionalKey(Schema.Array(Schema.Struct({ doneWhen: Text, cause: Schema.Literals(['implementation', 'test', 'pre-existing', 'environment']), answer: Text }))),
	})

/** A slot's deliverable schema, or undefined for a thinking step (its JSON Schema is the cartridge's). */
const slotSchema = (_lane: Lane, _job: Job, _autonomous: boolean): Schema.Top & Schema.ConstraintDecoder<unknown> | undefined =>
	undefined

/** The JSON Schema a job's answer must match, as its packet shows it. */
export const deliverableShape = (lane: Lane, job: Job, autonomous = false): Record<string, unknown> | undefined => {
	if (['1','2'].includes(lane.pack.contracts?.discovery??'') && job in DISCOVERY_CONTRIBUTION_SCHEMAS) return discoveryContributionShape(job as DiscoveryJob, { handoff: ['1','2'].includes(lane.pack.contracts?.handoff??'') })
	const schema = slotSchema(lane, job, autonomous)
	const shape = schema ? shapeOf(schema) : (stepOf(lane, job).output as Record<string, unknown> | undefined)
	if (shape && job === 'plan' && lane.pack.contracts?.acceptance === '1') {
		const properties = shape.properties as Record<string, Record<string, unknown>>
		const condition = properties.doneWhen!.items as Record<string, unknown>
		condition.required = [...new Set([...(condition.required as string[]), 'evidence'])]
		;(condition.properties as Record<string, unknown>).evidence = shapeOf(Schema.Struct({ evaluator: Schema.Literal('candidate-check'), availableAfter: Schema.Literal('implementation'), inputs: Schema.Array(Schema.Struct({ kind: Schema.Literals(['candidate', 'plan', 'environment']), ref: Text })) }))
	}
	return shape
}

/** Why a value breaks a JSON Schema (type, properties, required, items, enum, anyOf): one line per problem. Extra keys are allowed. */
export function conforms(schema: Readonly<Record<string, unknown>>, value: unknown, at = 'answer'): string[] {
	if (Array.isArray(schema.anyOf)) {
		const tries = (schema.anyOf as Record<string, unknown>[]).map((s) => conforms(s, value, at))
		return tries.some((t) => !t.length) ? [] : [`${at} matches none of its allowed shapes: ${tries.map((t) => t[0]).join('; ')}`]
	}
	const is = (t: unknown) =>
		t === 'object' ? typeof value === 'object' && value !== null && !Array.isArray(value)
		: t === 'array' ? Array.isArray(value)
		: t === 'integer' ? Number.isInteger(value)
		: t === 'null' ? value === null
		: typeof value === t
	const types = schema.type === undefined ? [] : [schema.type].flat()
	if (types.length && !types.some(is)) return [`${at} must be ${types.join(' or ')}`]
	const out: string[] = []
	if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === value)) out.push(`${at} must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`)
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const v = value as Record<string, unknown>
		for (const k of (schema.required as string[] | undefined) ?? []) if (v[k] === undefined) out.push(`${at}.${k} is missing`)
		for (const [k, s] of Object.entries((schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {})) if (v[k] !== undefined) out.push(...conforms(s, v[k], `${at}.${k}`))
	}
	if (Array.isArray(value) && schema.items && typeof schema.items === 'object') value.forEach((x, i) => out.push(...conforms(schema.items as Record<string, unknown>, x, `${at}[${i}]`)))
	return out
}

/** Why an answer's JSON fails its shape, as opposed to a rule about its content: only that is re-asked. Undefined when it fits. */
export function malformed(lane: Lane, job: Job, output: string, autonomous = false): string | undefined {
	if (lane.pack.runtime !== 'functions' && job === 'discover') return Array.isArray(lastJson(output)?.items) ? undefined : 'The answer did not end with {"items": [...]}.'
	const schema = slotSchema(lane, job, autonomous)
	if (schema) {
		const r = decode(schema, output)
		return r.ok ? undefined : r.reason
	}
	const shape = stepOf(lane, job).output
	if (!shape) return undefined
	const json = lastJson(output)
	if (!json) return 'The answer did not end with a JSON object.'
	const problems = conforms(shape, json)
	return problems.length ? `The answer's JSON does not match its schema: ${problems.join('; ')}.` : undefined
}

const Reuse = Schema.optionalKey(Schema.Array(Schema.Struct({
	question: Text.annotate({ description: 'the current question, word for word, that an earlier answer already settles, even if phrased differently' }),
	answerId: Text.annotate({ description: 'the id in answeredBefore of the saved answer to reuse; never invent one' }),
})))

/** The receiver's reply at intake: the three NQ questions, each a list. */
export const INTAKE = Schema.Struct({
	understanding: Text,
	unclear: Schema.Array(Text).annotate({ description: 'What is unclear?' }),
	ambiguous: Schema.Array(Text).annotate({ description: 'What is ambiguous?' }),
	missing: Schema.Array(Text).annotate({ description: 'Do I have everything I need to proceed? What is missing.' }),
	notes: Schema.Array(Text).annotate({ description: 'points the packet already settles; never an assumption or a choice' }),
	reuse: Reuse,
})
export const ORIGINATOR = Schema.Struct({
	answer: Schema.NonEmptyString,
	needsOperator: Schema.Boolean,
	decisions: Schema.optionalKey(Decisions.annotate({ description: 'every new choice settled in this answer, with the triple gate; omit only for factual clarification or saved-answer reuse' })),
	reuse: Reuse,
})

/** A schema as compact JSON Schema, for a brief. */
export const shapeOf = (schema: Schema.Top) =>
	JSON.parse(JSON.stringify(Schema.toJsonSchemaDocument(schema).schema, (k, v) => (k === 'additionalProperties' ? undefined : v)))

/** Fields an answer's JSON must carry, for the call's facts. */
export const requiredOf = (schema: Schema.Top): string[] => {
	const s = shapeOf(schema)
	return s.required ?? []
}

/** The last JSON object in `output`, decoded against `schema`; or why it is refused. */
export function decode<S extends Schema.Top & Schema.ConstraintDecoder<unknown>>(schema: S, output: string): { ok: true; value: S['Type'] } | { ok: false; reason: string } {
	const json = lastJson(output)
	if (!json) return { ok: false, reason: 'The answer did not end with a JSON object.' }
	const r = Schema.decodeUnknownResult(schema)(json, { errors: 'all' })
	return Result.isSuccess(r) ? { ok: true, value: r.success } : { ok: false, reason: `The answer's JSON does not match its schema: ${r.failure.message}` }
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
export function validate(lane: Lane, job: Job, output: string, plan?: Plan, tracked?: ReadonlyArray<string>, autonomous = false, conventions: ReadonlyArray<string> = [], accepted: AcceptedDiscovery = {}): { ok: true; value: Record<string, unknown>; dropped?: ReadonlyArray<{ position: number; missing: string[] }> } | { ok: false; reason: string } {
	if (['1','2'].includes(lane.pack.contracts?.discovery??'') && job in DISCOVERY_CONTRIBUTION_SCHEMAS) {
		const result = validateDiscoveryContribution(job as DiscoveryJob, lastJson(output), accepted, { handoff: ['1','2'].includes(lane.pack.contracts?.handoff??'') })
		return result.ok ? { ok: true, value: result.value as unknown as Record<string, unknown> } : { ok: false, reason: result.reason }
	}
	if (lane.pack.runtime !== 'functions' && job === 'discover') {
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
			return { title: text(i.title), objective: text(i.objective), text: text(i.text), kind: i.kind === 'fix' || i.kind === 'chore' ? i.kind : 'feature', conditions: (i.conditions as Candidate['conditions'] | undefined) ?? [{id:'A1',text:text(i.objective)}], ...(after.length ? { after } : {}) }
		})
		const dropped = all.flatMap((i, n) => kept.includes(n) ? [] : [{ position: n + 1, missing: ['title', 'objective'].filter((key) => !text(i?.[key])) }])
		return { ok: true, value: { items }, ...(dropped.length ? { dropped } : {}) }
	}
	if (lane.pack.runtime !== 'functions' && job === 'verify') return { ok: false, reason: 'verify is Made Well\'s own code, not an agent job.' }
	// Custom thinking steps use the same gate even when their output schema is supplied by a pack.
	const decisions = lastJson(output)?.decisions
	if (decisions !== undefined) {
		const judged = Schema.decodeUnknownResult(Decisions)(decisions)
		if (Result.isFailure(judged)) return { ok: false, reason: String(judged.failure) }
	}
	const schema = slotSchema(lane, job, autonomous)
	if (!schema) {
		const problem = malformed(lane, job, output)
		return problem ? { ok: false, reason: problem } : { ok: true, value: lastJson(output) ?? {} }
	}
	const decoded = decode(schema, output)
	if (!decoded.ok) return decoded
	const value = decoded.value as Record<string, unknown>
	if (job === 'plan') {
		const p = value as Plan
		const evidenceProblem = lane.pack.contracts?.acceptance === '1' ? acceptanceProblem(p, true) : undefined
		if (evidenceProblem) return { ok: false, reason: evidenceProblem }
		if (p.resume && (dupes(p.resume.map(r => r.role)).length || p.resume.some(r => !/^[a-f0-9]{64}$/.test(r.sha256)))) return { ok: false, reason: 'Continuation needs one existing content hash per maker role.' }
		if (!p.scope.length) return { ok: false, reason: 'The plan declares no scope: name every file the change may touch.' }
		const outside = p.scope.filter((f) => f.startsWith('/') || f.split('/').includes('..'))
		if (outside.length) return { ok: false, reason: `Scope entries must be repo-relative paths inside the repo: ${outside.join(', ')}.` }
		if (!p.doneWhen.length) return { ok: false, reason: 'The plan has no done-when items.' }
		if (dupes(p.doneWhen.map((d) => d.id)).length) return { ok: false, reason: `Done-when ids repeat: ${dupes(p.doneWhen.map((d) => d.id)).join(', ')}.` }
		const missed = tracked && unfollowed(p, tracked)
		if (missed) return { ok: false, reason: missed }
		const ids = p.doneWhen.map((d) => d.id)
		const loose = conventions.filter((c) => {
			const held = p.conventions?.find((e) => e.convention.trim() === c.trim())
			return !held || (held.doneWhen === undefined ? !held.doesNotApply?.trim() : !ids.includes(held.doneWhen))
		})
		if (loose.length) return { ok: false, reason: `The plan does not hold the change to the project's conventions. Under "conventions", copy each one word for word with the id of a done-when item in this plan that proves the change keeps it, or say why it does not apply: ${loose.map((c) => JSON.stringify(c)).join(', ')}.` }
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
	if (job === 'arbitrate' && Array.isArray(value.dispositions) && plan) {
		const dispositions = value.dispositions as { doneWhen: string }[]
		if (dispositions.some(d => !plan.doneWhen.some(p => p.id === d.doneWhen)) || dupes(dispositions.map(d => d.doneWhen)).length) return { ok: false, reason: 'Repair dispositions must name distinct conditions from this plan.' }
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
	| { readonly to: 'environment'; readonly answer: string }
	| { readonly to: 'hold'; readonly code: string; readonly message: string }

const MAX_CORRECTIONS = 3

export const blockedOf = (lane: Lane, job: Job, value: Record<string, unknown>) =>
	typeof value.blocked === 'string' ? `The ${stepOf(lane, job).profile} (${job}) could not do the step as written: ${value.blocked}` : undefined

export function route(lane: Lane, job: Job, value: Record<string, unknown>, corrections: number): Route {
	if (job === 'discover') return { to: 'discovered', items: value.items as Candidate[] }
	const blocked = blockedOf(lane, job, value)
	if (blocked) return { to: 'arbitrate', failure: blocked }
	if (job === 'plan') return { to: 'split' }
	// A corrected test is run again; the valid implementation is not rebuilt.
	if (job === 'test-plan' || job === 'implement') return { to: 'next', job: 'verify' }
	if (job === 'arbitrate') {
		const cause = value.cause as Cause | 'environment' | 'undetermined'
		const answer = value.answer as string
		// The environment is not a correction of the work: Made Well prepares afresh and runs the checks again.
		if (cause === 'environment') return { to: 'environment', answer }
		if (cause === 'undetermined') return { to: 'hold', code: 'arbiter_undetermined', message: `The arbiter could not decide whose failure this is: ${answer}` }
		if (corrections >= MAX_CORRECTIONS) return { to: 'hold', code: 'too_many_corrections', message: `${corrections} corrections have not made the checks pass. Last ruling: ${cause}: ${answer}` }
		if (cause === 'pre-existing') return { to: 'prerequisite', answer }
		return { to: 'rework', job: cause === 'test' ? 'test-plan' : 'plan', cause, answer }
	}
	const steps = stepOf(lane, job).loop === 'discovery' ? lane.discovery : lane.delivery
	const i = steps.findIndex((s) => s.job === job)
	return { to: 'next', job: steps[i + 1]!.job }
}

/** The last top-level JSON object in a worker's answer, or undefined. A closing code fence after it is allowed. */
export function lastJson(text: string): Record<string, unknown> | undefined {
	text = text.replace(/\s*```\s*$/, '')
	// lastIndexOf with a negative start searches from 0 again, so the walk stops by itself at the first character.
	for (let start = text.lastIndexOf('{'); start !== -1; start = start === 0 ? -1 : text.lastIndexOf('{', start - 1)) {
		try {
			const value = JSON.parse(text.slice(start).trim())
			if (value && typeof value === 'object' && !Array.isArray(value)) return value
		} catch {}
	}
	return undefined
}
