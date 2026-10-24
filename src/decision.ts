// A decision renderer, not a worker or pipeline authority. No providers ship with the console.
import { Effect, Result, Schema } from 'effect'

const Leg = Schema.Struct({
	leg: Schema.Literals(['DX', 'UX', 'AX']),
	pass: Schema.Boolean,
	cell: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 9 }))),
	gets: Schema.NonEmptyString,
	costs: Schema.NonEmptyString,
	why: Schema.NonEmptyString,
})
const Verdict = Schema.Literals(['all-three', 'at-least-two', 'below-bar', 'stop'])
const Judgments = Schema.Struct({ verdict: Verdict, legs: Schema.Array(Leg) }).check(
	Schema.makeFilter((v) => {
		if (v.legs.length !== 3 || new Set(v.legs.map((l) => l.leg)).size !== 3) return 'Judge exactly one DX, UX and AX leg.'
		const hits = v.legs.filter((l) => l.pass).length
		return v.verdict === (hits === 3 ? 'all-three' : hits === 2 ? 'at-least-two' : hits === 1 ? 'below-bar' : 'stop') || 'The verdict must match the judged legs: 3 → all-three, 2 → at-least-two, 1 → below-bar, 0 → stop.'
	}),
)
export const DecisionResult = Schema.Struct({
	recommendation: Schema.NonEmptyString,
	verdict: Verdict,
	legs: Schema.Array(Leg),
	reasoning: Schema.NonEmptyString,
	operatorRequest: Schema.optionalKey(Schema.Struct({
		question: Schema.NonEmptyString,
		candidates: Schema.Array(Schema.Struct({ path: Schema.NonEmptyString, legs: Schema.Array(Leg) })),
		ifUndecided: Schema.NonEmptyString,
		recommendation: Schema.NonEmptyString,
		reasoning: Schema.NonEmptyString,
		mentalModelRequest: Schema.NonEmptyString,
	})),
	uncertainty: Schema.optionalKey(Schema.String),
}).check(Schema.makeFilter((v) => {
	const result = Schema.decodeUnknownResult(Judgments)(v)
	return Result.isSuccess(result) || String(result.failure)
}))
export type DecisionResult = typeof DecisionResult.Type

/** Every recorded choice uses the same gate, with or without an optional cartridge. */
export const Decision = Schema.Struct({
	question: Schema.NonEmptyString,
	decision: Schema.NonEmptyString,
	why: Schema.NonEmptyString,
	verdict: Verdict,
	legs: Schema.Array(Leg),
}).check(Schema.makeFilter((v) => {
	const result = Schema.decodeUnknownResult(Judgments)(v)
	if (Result.isFailure(result)) return String(result.failure)
	return v.verdict === 'all-three' || v.verdict === 'at-least-two' || 'Below two hits: reshape the choice or stop; do not advance it as a settled decision.'
}))

// Rows high/med/low value; columns low/med/high cost. The pass is a judgment, not a cell lookup.
export const RUBRIC = [
	'Before every choice, resolve in order: your context → repository intent and purpose → this rubric. Judge all three legs through their 3×3 matrices, recording pass, cell (1–9), gets, costs and why. No leg has priority. All three hits: all-three, build with conviction; two: at-least-two, proceed; one: below-bar, reshape or stop; zero: stop, do not build. Never skip this gate.',
	'DX — What leads to a world-class developer experience? Leverage × friction-to-adopt. Rows high/med/low leverage, columns low/med/high friction: 1 Ship now — flagship DX win; 2 Do it — smooth rough edges; 3 Worth it — cut friction first or sequence it; 4 Easy yes — batch in; 5 Default backlog — on the path; 6 Defer — needs real justification; 7 Cheap polish — only idle; 8 Skip unless unblocking; 9 The trap — do not build.',
	'UX — What makes a memorable and lovable user experience? Delight × cognitive load (steps, decisions, visual clutter). Beauty and visual craft belong here. Same row/column order: 1 The magic moment — beautiful and effortless; 2 Strong — ship, then quiet noise; 3 Locked treasure — cut load; 4 Easy goodwill — clean and simple; 5 Standard — on the path; 6 Reconsider — declutter before committing; 7 Invisible plumbing — fine if near-free; 8 Skip — not worth attention; 9 The cluttered wall — never ship.',
	'AX — What gives an efficient, optimized agentic experience? Capability (act and verify) × ambiguity. Same row/column order: 1 The dream slice — full power and clarity, act and prove; 2 Strong — tighten brief/context; 3 Powerful but blind — resolve ambiguity; 4 Clear but limited — better tools/feedback; 5 Workable middle — on the path; 6 Shaky — do not rely on result; 7 Clear but hamstrung — low stakes only; 8 Weak — avoid; 9 Blind guessing — never operate here.',
	'Waste of tokens, time, money, effort or resources is a symptom: fix upstream ambiguity, defective specs, improvisation or over-complication, not the symptom. All intelligence is front-loaded. Implementation and test-writing are deterministic functions: execute the fixed brief and report; never improvise, guess, redesign or negotiate with the operator mid-stream. If impossible, stop and report through the existing contingency path. NQ is bounded to three answered turns; unresolved questions then mean a spec/plan/dossier defect, at every autonomy level.',
].join('\n')

export interface DecisionRequest {
	readonly item: { readonly id: number; readonly title: string; readonly objective: string; readonly source: string; readonly kind?: string }
	readonly mode: 'forward' | 'nq' | 'operator-hold-shape'
	readonly job: string
	readonly stage: string
	readonly profile: string
	readonly question: string
	readonly candidates?: ReadonlyArray<string>
	readonly context: Readonly<Record<string, unknown>>
	readonly repoIntent: Readonly<Record<string, unknown>>
	readonly rubric: string
	readonly constraints: { readonly scope: ReadonlyArray<string>; readonly authority: string; readonly nonGoals: ReadonlyArray<string>; readonly operatorEscalationPermitted: boolean }
}
export type DecisionProvider = (request: DecisionRequest, options: Readonly<Record<string, unknown>>) => Effect.Effect<unknown, unknown>
export type DecisionProviders = Readonly<Record<string, DecisionProvider>>
const DecisionModel = Schema.Struct({ enabled: Schema.Boolean, provider: Schema.NonEmptyString, options: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)) })

/** Undefined guidance means the agent applies the in-process rubric. All optional extension faults degrade to it. */
export const resolveDecision = Effect.fn('mw.resolveDecision')(function* (request: DecisionRequest, setting: unknown, providers: DecisionProviders = {}) {
	const fallback = (reason: string) => ({ path: 'default-rubric' as const, reason })
	if (setting === undefined) return fallback('absent')
	const config = Schema.decodeUnknownResult(DecisionModel)(setting)
	if (Result.isFailure(config)) return fallback('invalid-config')
	if (!config.success.enabled) return fallback('disabled')
	const provider = Object.hasOwn(providers, config.success.provider) ? providers[config.success.provider] : undefined
	if (!provider) return fallback('unknown-provider')
	const result = yield* Effect.suspend(() => provider(request, config.success.options ?? {})).pipe(
		Effect.timeout('5 seconds'),
		Effect.flatMap(Schema.decodeUnknownEffect(DecisionResult)),
		Effect.map((guidance) => {
			if (guidance.operatorRequest && (request.mode !== 'operator-hold-shape' || !request.constraints.operatorEscalationPermitted)) return fallback('outside-authority')
			return { path: 'cartridge-assisted' as const, provider: config.success.provider, guidance }
		}),
		Effect.catchCause(() => Effect.succeed(fallback('provider-failed-or-invalid'))),
	)
	return result
})
