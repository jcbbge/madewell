// Every job runs on a card: harness + provider + model + effort. `account` is the quota pool
// a swap must leave (pi on openai-codex and Codex both draw on the same ChatGPT account).
import { readFileSync } from 'node:fs'
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { Harness, HARNESSES } from './harness.ts'
import type { Job } from './lane.ts'
import { DEFAULT_BUDGET, type Budget } from './worker.ts'

const Card = Schema.Struct({
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

const JOBS = ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'implement', 'verify', 'arbitrate'] as const

const Positive = Schema.Finite.check(Schema.isGreaterThan(0))
/** Wall time for every call of the job, and tokens where the harness reports them. Default: DEFAULT_BUDGET. */
const JobBudget = Schema.optional(Schema.Struct({ minutes: Positive, tokens: Schema.optional(Positive) }))
const Prescription = Schema.Struct({ tier: Schema.String, access: Access, budget: JobBudget })

const Prescriptions = Schema.Struct({
	tiers: Schema.Record(Schema.String, Schema.NonEmptyArray(Card)),
	jobs: Schema.Struct(Object.fromEntries(JOBS.map((job) => [job, Prescription])) as Record<Job, typeof Prescription>),
	/** Harness entries added to, or replacing, the built-in ones. */
	harnesses: Schema.optional(Schema.Record(Schema.String, Harness)),
	/** Environment variables every agent receives beyond BASE_ENV and its harness's own. */
	env: Schema.optional(Schema.Array(Schema.String)),
	/** Items `mw run` drives at once, each up to two agents. Default: DEFAULT_PARALLEL. */
	parallel: Schema.optional(Schema.Int.check(Schema.isGreaterThan(0))),
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
		for (const job of JOBS) {
			const tier = p.jobs[job].tier
			if (!p.tiers[tier]) {
				return yield* new MadeWellError({ code: 'prescriptions_invalid', message: `Job "${job}" uses tier "${tier}", which is not defined.`, context: { path, job, tier, tiers: Object.keys(p.tiers) }, next: [{ run: `$EDITOR ${path}`, why: `define tier "${tier}" or point "${job}" at one of: ${Object.keys(p.tiers).join(', ')}` }] })
			}
		}
		return p
	})

export const cardsFor = (p: Prescriptions, job: Job): ReadonlyArray<Card> => p.tiers[p.jobs[job].tier]!

export const budgetFor = (p: Prescriptions, job: Job): Budget => p.jobs[job].budget ?? DEFAULT_BUDGET

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
