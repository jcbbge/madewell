// Every job runs on a card: harness + provider + model + effort. `account` is the quota pool
// a swap must leave (pi on openai-codex and Codex both draw on the same ChatGPT account).
import { readFileSync } from 'node:fs'
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import type { Job } from './lane.ts'

const Card = Schema.Struct({
	harness: Schema.Literals(['claude', 'codex', 'pi']),
	provider: Schema.NonEmptyString,
	account: Schema.NonEmptyString,
	model: Schema.NonEmptyString,
	effort: Schema.Literals(['low', 'medium', 'high', 'xhigh', 'max']),
})
export type Card = typeof Card.Type

const Access = Schema.Literals(['read', 'checks', 'make', 'run'])
export type Access = typeof Access.Type

const JOBS = ['ideate', 'challenge', 'plan', 'test-plan', 'implement', 'verify', 'arbitrate'] as const

const Prescriptions = Schema.Struct({
	tiers: Schema.Record(Schema.String, Schema.NonEmptyArray(Card)),
	jobs: Schema.Struct(Object.fromEntries(JOBS.map((job) => [job, Schema.Struct({ tier: Schema.String, access: Access })])) as Record<Job, Schema.Struct<{ tier: typeof Schema.String; access: typeof Access }>>),
})
export type Prescriptions = typeof Prescriptions.Type

export const loadPrescriptions = (path: string) =>
	Effect.gen(function* () {
		const text = yield* Effect.try({
			try: () => readFileSync(path, 'utf8'),
			catch: (e) => new MadeWellError({ code: 'prescriptions_unreadable', message: `Cannot read prescriptions file ${path}.`, context: { path, reason: String(e) }, next: [{ run: `ls -l ${path}`, why: 'check the file exists and is readable' }, { run: 'mw doctor', why: 'see which prescriptions file Made Well uses' }] }),
		})
		const value = yield* Effect.try({
			try: () => JSON.parse(text) as unknown,
			catch: (e) => new MadeWellError({ code: 'prescriptions_invalid', message: `Prescriptions file ${path} is not valid JSON.`, context: { path, reason: String(e) }, next: [{ run: `node -e "JSON.parse(require('fs').readFileSync('${path}','utf8'))"`, why: 'see the exact parse error position' }] }),
		})
		const p = yield* Schema.decodeUnknownEffect(Prescriptions)(value).pipe(
			Effect.mapError((e) => new MadeWellError({ code: 'prescriptions_invalid', message: `Prescriptions file ${path} does not match the expected shape.`, context: { path, problems: String(e) }, cause: 'Each job needs {tier, access}; each tier is a non-empty list of cards {harness, provider, account, model, effort}.', next: [{ run: `$EDITOR ${path}`, why: 'fix the fields listed in context.problems' }] })),
		)
		for (const job of JOBS) {
			const tier = p.jobs[job].tier
			if (!p.tiers[tier]) {
				return yield* new MadeWellError({ code: 'prescriptions_invalid', message: `Job "${job}" uses tier "${tier}", which is not defined.`, context: { path, job, tier, tiers: Object.keys(p.tiers) }, next: [{ run: `$EDITOR ${path}`, why: `define tier "${tier}" or point "${job}" at one of: ${Object.keys(p.tiers).join(', ')}` }] })
			}
		}
		return p
	})

export const cardsFor = (p: Prescriptions, job: Job): ReadonlyArray<Card> => p.tiers[p.jobs[job].tier]!

/** exhausted: account → epoch ms when its quota resets. Returns a card, or when the earliest account comes back. */
export function pickCard(cards: ReadonlyArray<Card>, exhausted: Readonly<Record<string, number>>, now: number) {
	const card = cards.find((c) => (exhausted[c.account] ?? 0) <= now)
	if (card) return { card } as const
	const resets = cards.map((c) => exhausted[c.account]).filter((t): t is number => t !== undefined && t > now)
	return { card: undefined, resetsAt: resets.length ? Math.min(...resets) : now } as const
}
