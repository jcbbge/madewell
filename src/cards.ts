// Every job runs on a card: harness + provider + model + effort. `account` is the quota pool
// a swap must leave (pi on openai-codex and Codex both draw on the same ChatGPT account).
import { readFileSync } from 'node:fs'
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { Harness, HARNESSES } from './harness.ts'
import type { Job, Lane } from './lane.ts'
import { DEFAULT_BUDGET, type Budget } from './worker.ts'

export const Card = Schema.Struct({
	/** A built-in harness entry (amp, claude, codex, pi) or one defined under "harnesses". */
	harness: Schema.NonEmptyString,
	provider: Schema.NonEmptyString,
	account: Schema.NonEmptyString,
	model: Schema.NonEmptyString,
	effort: Schema.Literals(['low', 'medium', 'high', 'xhigh', 'max']),
})
export type Card = typeof Card.Type

/** What a call may touch. `none`: no tools and no workspace, only the packet. */
const Access = Schema.Literals(['none', 'read', 'checks', 'make', 'run'])
export type Access = typeof Access.Type

/** NQ intake judges the packet alone, so a fact it lacks becomes a question to the sender. */
export const INTAKE_ACCESS = 'none' satisfies Access

/** The jobs an agent does. verify is Made Well's own run of the checks: it has a budget (each check's timeout) and no card. */
export const AGENT_JOBS = ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'implement', 'arbitrate'] as const
export type AgentJob = (typeof AGENT_JOBS)[number]

const Positive = Schema.Finite.check(Schema.isGreaterThan(0))
/** Wall time for every call of the job, and tokens where the harness reports them. Default: DEFAULT_BUDGET. */
const JobBudget = Schema.optional(Schema.Struct({ minutes: Positive, tokens: Schema.optional(Positive) }))
const Prescription = Schema.Struct({ tier: Schema.String, access: Access, budget: JobBudget })

const Prescriptions = Schema.Struct({
	tiers: Schema.Record(Schema.String, Schema.NonEmptyArray(Card)),
	jobs: Schema.Struct({
		...(Object.fromEntries(AGENT_JOBS.map((job) => [job, Prescription])) as Record<AgentJob, typeof Prescription>),
		verify: Schema.Struct({ budget: JobBudget }),
	}),
	/** Harness entries added to, or replacing, the built-in ones. */
	harnesses: Schema.optional(Schema.Record(Schema.String, Harness)),
	/** Environment variables every agent receives beyond BASE_ENV and its harness's own. */
	env: Schema.optional(Schema.Array(Schema.String)),
	/** Items `mw run` drives at once, each up to two agents. Default: DEFAULT_PARALLEL. */
	parallel: Schema.optional(Schema.Int.check(Schema.isGreaterThan(0))),
	/** Optional capability: malformed settings fall back per decision, never prevent the console from running. */
	decisionModel: Schema.optionalKey(Schema.Unknown),
})
export const DEFAULT_PARALLEL = 3
export type Prescriptions = typeof Prescriptions.Type

export const loadPrescriptions = (path: string) =>
	Effect.gen(function* () {
		const text = yield* Effect.try({
			try: () => readFileSync(path, 'utf8'),
			catch: (e) => new MadeWellError({ code: 'prescriptions_unreadable', message: `Cannot read prescriptions file ${path}.`, context: { path, reason: String(e) }, next: [{ run: `ls -l ${path}`, why: 'check the file exists and is readable' }, { run: `MW_PRESCRIPTIONS=<readable prescriptions file> mw run`, why: 'point Made Well at a prescriptions file it can read' }] }),
		})
		const value = yield* Effect.try({
			try: () => JSON.parse(text) as unknown,
			catch: (e) => new MadeWellError({ code: 'prescriptions_invalid', message: `Prescriptions file ${path} is not valid JSON.`, context: { path, reason: String(e) }, next: [{ run: `node -e "JSON.parse(require('fs').readFileSync('${path}','utf8'))"`, why: 'see the exact parse error position' }] }),
		})
		const p = yield* Schema.decodeUnknownEffect(Prescriptions)(value).pipe(
			Effect.mapError((e) => new MadeWellError({ code: 'prescriptions_invalid', message: `Prescriptions file ${path} does not match the expected shape.`, context: { path, problems: String(e) }, cause: 'Each job needs {tier, access, budget?: {minutes, tokens?}}; each tier is a non-empty list of cards {harness, provider, account, model, effort}; each entry under harnesses needs {command, output, answer (jsonl), limit, tools per access level}.', next: [{ run: `$EDITOR ${path}`, why: 'fix the fields listed in context.problems' }] })),
		)
		const harnesses = { ...HARNESSES, ...p.harnesses }
		for (const [tier, cards] of Object.entries(p.tiers)) {
			const unknown = cards.find((c) => !harnesses[c.harness])
			if (unknown) {
				return yield* new MadeWellError({ code: 'prescriptions_invalid', message: `Tier "${tier}" has a card on harness "${unknown.harness}", which has no entry.`, context: { path, tier, card: unknown, harnesses: Object.keys(harnesses) }, next: [{ run: `$EDITOR ${path}`, why: `use one of ${Object.keys(harnesses).join(', ')}, or add "${unknown.harness}" under "harnesses": command, output, answer, limit and tools per access level` }] })
			}
		}
		for (const job of AGENT_JOBS) {
			const tier = p.jobs[job].tier
			if (!p.tiers[tier]) {
				return yield* new MadeWellError({ code: 'prescriptions_invalid', message: `Job "${job}" uses tier "${tier}", which is not defined.`, context: { path, job, tier, tiers: Object.keys(p.tiers) }, next: [{ run: `$EDITOR ${path}`, why: `define tier "${tier}" or point "${job}" at one of: ${Object.keys(p.tiers).join(', ')}` }] })
			}
		}
		return p
	})

/**
 * The prescriptions with every thinking step of a lane that they do not name: read access, on the step's tier ("deep" by
 * default) and budget. A job whose tier is not defined cannot run, so it is an error before any work starts.
 */
export const forLane = (p: Prescriptions, lane: Lane) =>
	Effect.gen(function* () {
		const jobs: Record<string, unknown> = { ...p.jobs }
		for (const step of [...lane.discovery, ...lane.delivery]) {
			if (step.job === 'verify' || jobs[step.job]) continue
			const tier = step.tier ?? 'deep'
			if (!p.tiers[tier]) {
				return yield* new MadeWellError({
					code: 'prescriptions_invalid', message: `The ${step.job} step of the "${lane.pack.name}" cartridge pack runs on tier "${tier}", which the prescriptions do not define.`,
					context: { path: 'prescriptions', job: step.job, tier, tiers: Object.keys(p.tiers) },
					next: [{ run: '$EDITOR "$MW_PRESCRIPTIONS"', why: `define tier "${tier}", or prescribe "${step.job}" under jobs` }, { run: 'mw cartridges', why: 'see the pack and the tier each step asks for' }],
				})
			}
			jobs[step.job] = { tier, access: 'read', ...(step.budget ? { budget: step.budget } : {}) }
		}
		return { ...p, jobs: jobs as Prescriptions['jobs'] }
	})

/** An agent job's prescription. The engine runs verify itself before any agent path, so verify never comes here. */
export const prescriptionOf = (p: Prescriptions, job: Job) => p.jobs[job as AgentJob]

export const cardsFor = (p: Prescriptions, job: Job): ReadonlyArray<Card> => p.tiers[prescriptionOf(p, job).tier]!

export const budgetFor = (p: Prescriptions, job: Job): Budget => (p.jobs as Readonly<Record<string, { budget?: Budget } | undefined>>)[job]?.budget ?? DEFAULT_BUDGET

/** A card's harness entry: prescribed or built in, with the prescriptions' extra environment allowlisted. */
export const harnessOf = (p: Prescriptions, name: string): Harness | undefined => {
	const harness = p.harnesses?.[name] ?? HARNESSES[name]
	return harness && { ...harness, env: [...(harness.env ?? []), ...(p.env ?? [])] }
}

/** exhausted: account → epoch ms when its quota resets. Returns a card, or when the earliest account comes back. */
export function pickCard(cards: ReadonlyArray<Card>, exhausted: Readonly<Record<string, number>>, now: number) {
	const card = cards.find((c) => (exhausted[c.account] ?? 0) <= now)
	if (card) return { card } as const
	const resets = cards.map((c) => exhausted[c.account]).filter((t): t is number => t !== undefined && t > now)
	return { card: undefined, resetsAt: resets.length ? Math.min(...resets) : now } as const
}
