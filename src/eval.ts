// Evals: replay a job's recorded calls (each call's brief and packet, as stored) on another card or with
// another brief, through the normal worker, and score the record and the replay by the same deterministic
// rules, never a model judge: whether the answer carries what its kind of call requires, the rule breaks
// telemetry flags, seconds and tokens. The report compares them call by call and in aggregate, and names
// the cheapest card that matches or beats the record, so prescriptions come from evidence.
//
// Every replay uses fresh scratch and fingerprints only its explicitly declared material. Results go only into Made Well's own store (the `evals`
// and `eval_calls` tables beside the calls they replay). No file is changed.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Clock, Effect, Schema } from 'effect'
import { AGENT_JOBS, Card, budgetFor, cardsFor, forLane, harnessOf, prescriptionOf, type Access, type Prescriptions } from './cards.ts'
import { MadeWellError, Next, quote } from './errors.ts'
import { HARNESSES } from './harness.ts'
import { decode, INTAKE, laneOf, lastJson, ORIGINATOR, validate, type Job, type Lane } from './lane.ts'
import { Store, type Call } from './store.ts'
import { flagsFor, telemetry, tokensOf, toolEvents, totalTokens, type Facts, type Flag } from './telemetry.ts'
import { Worker, type WorkerRequest, type WorkerResult } from './worker.ts'
import { scratch, fingerprint } from './workspace.ts'
import { stepOf } from './lane.ts'
import { assertWritable } from './migration.ts'

/** Every agent job. verify is Made Well's own code, so there is nothing to replay. */
export const JOBS = AGENT_JOBS satisfies ReadonlyArray<Job>

// The same quota rules as delivery: an account that hits its limit is out until its reset, at least five minutes.
const UNKNOWN_RESET_MS = 60 * 60_000
const MIN_OUT_MS = 5 * 60_000

const EvalCard = Card.annotate({ identifier: 'Card' })

const Score = Schema.Struct({
	outcome: Schema.String.annotate({ description: 'ok, error or rejected, as the call ended' }),
	valid: Schema.Boolean.annotate({ description: 'answered, and the engine would accept the answer' }),
	parses: Schema.Boolean.annotate({ description: 'whether the answer ends with a JSON object' }),
	reason: Schema.NullOr(Schema.String).annotate({ description: 'why the engine would refuse the answer; null when valid' }),
	flags: Schema.Array(Schema.String).annotate({ description: 'the rule-break flags telemetry computes' }),
	seconds: Schema.Number,
	tokens: Schema.NullOr(Schema.Number).annotate({ description: 'null when the harness reported none' }),
}).annotate({ identifier: 'Score' })
type Score = typeof Score.Type

const Totals = Schema.Struct({ calls: Schema.Int, valid: Schema.Int, flags: Schema.Int, seconds: Schema.Number, tokens: Schema.NullOr(Schema.Number) }).annotate({ identifier: 'Totals' })
type Totals = typeof Totals.Type

const CardResult = Schema.Struct({
	card: EvalCard,
	complete: Schema.Boolean.annotate({ description: 'every selected call was replayed on this card' }),
	limited: Schema.optionalKey(Schema.Struct({ account: Schema.String, resetsAt: Schema.String, message: Schema.String })),
	replay: Totals,
	recorded: Totals.annotate({ description: 'the same calls, as recorded' }),
	matches: Schema.Boolean.annotate({ description: 'complete, at least as many valid answers and no more rule breaks than the record' }),
	calls: Schema.Array(Schema.Struct({ call: Schema.Int, item: Schema.Int, kind: Schema.String, recorded: Score, replay: Score, verdict: Schema.Literals(['better', 'same', 'worse', 'unavailable']) })),
}).annotate({ identifier: 'CardResult' })
type CardResult = typeof CardResult.Type

export const EvalReport = Schema.Struct({
	eval: Schema.Int.annotate({ description: 'this run in the store\'s evals and eval_calls tables' }),
	job: Schema.String,
	brief: Schema.NullOr(Schema.String),
	recorded: Schema.Struct({ ...Totals.fields, cards: Schema.Array(EvalCard) }),
	cards: Schema.Array(CardResult),
	recommendation: Schema.NullOr(Schema.Struct({ card: EvalCard, tier: Schema.NullOr(Schema.String), prescribed: Schema.NullOr(Schema.String), why: Schema.String })),
	next: Schema.Array(Next),
}).annotate({ identifier: 'EvalReport' })
type EvalReport = typeof EvalReport.Type

type Kind = WorkerRequest['kind']
const score = (kind: Kind, lane: Lane, job: Job, r: { outcome: string; output: string | null; ms: number; tokens: Call['tokens']; flags: ReadonlyArray<Flag> }): Score => {
	// Held to exactly what the engine accepts. A plan's done-when threading needs the item's plan, so it is not checked here.
	const accepted = r.output === null ? { ok: false as const, reason: `The call ended ${r.outcome} with no answer.` } : kind === 'intake' ? decode(INTAKE, r.output) : kind === 'originator' ? decode(ORIGINATOR, r.output) : validate(lane, job, r.output)
	return {
		outcome: r.outcome,
		valid: accepted.ok,
		parses: r.output !== null && lastJson(r.output) !== undefined,
		reason: accepted.ok ? null : accepted.reason,
		flags: r.flags.map((f) => f.rule),
		seconds: r.ms / 1000,
		tokens: r.tokens ? totalTokens(r.tokens) : null,
	}
}

const round = (n: number) => Math.round(n * 1000) / 1000
const totals = (scores: ReadonlyArray<Score>): Totals => ({
	calls: scores.length,
	valid: scores.filter((s) => s.valid).length,
	flags: scores.reduce((n, s) => n + s.flags.length, 0),
	seconds: round(scores.reduce((n, s) => n + s.seconds, 0)),
	tokens: scores.some((s) => s.tokens === null) ? null : scores.reduce((n, s) => n + s.tokens!, 0),
})
const verdict = (recorded: Score, replay: Score) => {
	const d = Number(replay.valid) - Number(recorded.valid) || recorded.flags.length - replay.flags.length
	return d > 0 ? 'better' : d < 0 ? 'worse' : 'same'
}

const sameCard = (a: Card, b: Card) => a.harness === b.harness && a.provider === b.provider && a.account === b.account && a.model === b.model && a.effort === b.effort
const label = (c: Card) => `${c.harness} · ${c.model} · ${c.effort}`
const usage = (message: string) => new MadeWellError({ code: 'usage', message, context: { command: 'eval' }, next: [{ run: 'mw', why: 'read the manual: every command and its input schema' }] })

/** --card: one card as JSON, or a tier name for every card in it. */
const candidates = (arg: string, p: Prescriptions) =>
	Effect.gen(function* () {
		const tiers = Object.keys(p.tiers)
		const harnesses = Object.keys({ ...HARNESSES, ...p.harnesses })
		const invalid = (message: string, problems?: string) => new MadeWellError({
			code: 'eval_card_invalid', message, context: { card: arg, tiers, harnesses, ...(problems ? { problems } : {}) },
			next: [
				...tiers.map((t) => ({ run: `mw eval <job> --card ${t}`, why: `replay on every card of tier "${t}"` })),
				{ run: `mw eval <job> --card '{"harness":"${harnesses[0]}","provider":"<provider>","account":"<quota account>","model":"<model>","effort":"low"}'`, why: 'replay on one card' },
			],
		})
		if (!arg.trim().startsWith('{')) {
			const tier = p.tiers[arg]
			return tier ? [...tier] : yield* invalid(`--card "${arg}" is neither a card as JSON nor a tier in prescriptions.`)
		}
		const card = yield* Effect.try({ try: () => JSON.parse(arg) as unknown, catch: (e) => invalid('--card is not valid JSON.', String(e)) }).pipe(
			Effect.flatMap((v) => Schema.decodeUnknownEffect(EvalCard)(v).pipe(Effect.mapError((e) => invalid('--card does not match the card shape {harness, provider, account, model, effort}.', e.message)))),
		)
		if (!harnessOf(p, card.harness)) return yield* invalid(`--card names harness "${card.harness}", which has no entry.`)
		return [card as Card]
	})

const ITEM_IDS = /^\d+$/

/** Replays a job's recorded calls on the given card(s) or brief, records the results in the store, and reports. */
export const evaluate = Effect.fn('mw.eval')(function* (o: { job: Job; card?: string; brief?: string; item?: string; limit?: number; prescriptions: Prescriptions; prescriptionsPath: string }) {
	yield* assertWritable()
	const store = yield* Store
	const worker = yield* Worker
	const items = (o.item ?? '').split(/[\s,]+/).filter(Boolean)
	if (items.some((i) => !ITEM_IDS.test(i) || Number(i) < 1)) return yield* usage(`--item takes work item numbers separated by commas, such as --item 3,5; got "${o.item}".`)
	const ids = items.map(Number)
	const owner = (ids.length ? ids.map(id => store.get(id)).filter(item => item !== undefined) : store.list()).find(item => [...laneOf(item.pack).discovery, ...laneOf(item.pack).delivery].some(step => step.job === o.job && !step.run && !step.children))
	const resolved = owner ? yield* Effect.result(forLane(o.prescriptions, laneOf(owner.pack))) : undefined
	const p = resolved?._tag === 'Success' ? resolved.success : o.prescriptions
	const cards = o.card === undefined ? undefined : yield* candidates(o.card, p)
	const briefPath = o.brief === undefined ? undefined : resolve(o.brief)
	const brief = briefPath === undefined ? undefined : yield* Effect.try({
		try: () => readFileSync(briefPath, 'utf8'),
		catch: () => new MadeWellError({ code: 'brief_unreadable', message: `Cannot read --brief ${briefPath}.`, context: { path: briefPath }, next: [{ run: `ls -l ${quote(briefPath)}`, why: 'check the file exists and is readable' }] }),
	})

	// A call stopped at a usage limit was never run, so it has no result to compare. A new brief replaces the
	// job's own brief, which only its execute calls carry; intake and originator calls keep theirs.
	const all = store.calls()
	const calls = all.filter((c) => c.job === o.job && c.outcome !== 'limit' && (!ids.length || ids.includes(c.item)) && (brief === undefined || c.kind === 'execute') && c.kind !== 'repair').slice(-(o.limit ?? 0))
	if (!calls.length) {
		const recorded: Record<string, number> = {}
		for (const c of all) if (c.outcome !== 'limit') recorded[c.job] = (recorded[c.job] ?? 0) + 1
		const best = Object.entries(recorded).sort((a, b) => b[1] - a[1])[0]
		return yield* new MadeWellError({
			code: 'eval_no_calls', message: `The store holds no recorded ${brief === undefined ? '' : 'execute '}calls of the ${o.job} job${ids.length ? ` for item(s) ${ids.join(', ')}` : ''} to replay.`,
			context: { store: store.path, job: o.job, items: ids, recorded },
			next: best ? [{ run: `mw eval ${best[0]}`, why: `the ${best[0]} job has ${best[1]} recorded calls` }] : [{ run: 'mw next', why: 'deliver work first: every call it makes is recorded for evals' }],
		})
	}

	const db = yield* Effect.acquireRelease(Effect.sync(() => {
		const db = new DatabaseSync(store.path)
		db.exec(`PRAGMA busy_timeout = 5000;
			CREATE TABLE IF NOT EXISTS evals (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, job TEXT NOT NULL, card TEXT, brief TEXT, items TEXT NOT NULL, calls TEXT NOT NULL, report TEXT);
			CREATE TABLE IF NOT EXISTS eval_calls (id INTEGER PRIMARY KEY AUTOINCREMENT, eval INTEGER NOT NULL, call INTEGER NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL, tokens TEXT, facts TEXT NOT NULL, flags TEXT NOT NULL, score TEXT NOT NULL);`)
		return db
	}), (db) => Effect.sync(() => db.close()))
	const at = new Date(yield* Clock.currentTimeMillis).toISOString()
	const run = Number(db.prepare('INSERT INTO evals (at, job, card, brief, items, calls) VALUES (?, ?, ?, ?, ?, ?)').run(at, o.job, o.card ?? null, briefPath ?? null, JSON.stringify(ids), JSON.stringify(calls.map((c) => c.id))).lastInsertRowid)
	const insert = db.prepare('INSERT INTO eval_calls (eval, call, card, system, prompt, outcome, output, error, raw, started, ms, tokens, facts, flags, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

	const accessOf = (c: Call): Access => (c.kind === 'execute' ? (prescriptionOf(p, o.job)?.access ?? 'read') : 'read')
	const budget = budgetFor(p, o.job)
	/** The rules both sides are held to: the recorded facts, else the job's access and budget. Head and changed files are per run. */
	const rulesOf = (c: Call): Facts => {
		const { head: _, changed: __, ...recorded } = c.facts ?? {}
		return { budget: { ms: budget.minutes * 60_000, ...(budget.tokens !== undefined ? { tokens: budget.tokens } : {}) }, ...recorded, access: accessOf(c) }
	}
	const recordedScore = (c: Call) => {
		const facts = { ...rulesOf(c), ...(c.facts?.head ? { head: c.facts.head } : {}), ...(c.facts?.changed ? { changed: c.facts.changed } : {}) }
		return score(c.kind as Kind, laneOf(store.get(c.item)?.pack), o.job, { ...c, flags: flagsFor(facts, c) })
	}

	/** Replay saved input in fresh scratch, refusing side effects and unavailable legacy context. */
 const replay=(c:Call,card:Card,n:number)=>Effect.scoped(Effect.gen(function*(){
  const item=store.get(c.item),step=item?stepOf(laneOf(item.pack),o.job):undefined
  const saved=lastJson(c.prompt)
  const received=saved?.received&&typeof saved.received==='object'&&!Array.isArray(saved.received)?saved.received as Record<string,unknown>:undefined
  const unavailable=!item||item.pack?.contracts?.execution!=='2'||!step||step.replay!=='safe'||step.writes?.length||!saved?.item||!saved.bindings||!received||step.receives.some(job=>!(job in received)||received[job]===undefined||received[job]===null)
  if(unavailable) return {unavailable:'Replay unavailable: saved input/context and a current execution-2 safe leaf are required. Side effects need separate authorization and isolated destinations.'}
  const dir=yield* scratch(store.path,c.item,o.job,`eval-${run}-${c.id}-${n}`),before=fingerprint([dir,...item.settings.inputs.filter(i=>!i.jobs||i.jobs.includes(o.job)).map(i=>i.path)])
  const system=c.kind==='execute'&&brief!==undefined?brief:c.system,prompt=c.prompt,started=yield* Clock.currentTimeMillis
  const result:WorkerResult=yield* worker.run({kind:c.kind as Kind,item:c.item,job:o.job,profile:c.profile,card,access:accessOf(c),system,prompt,cwd:dir,budget,harness:harnessOf(p,card.harness)})
  const after=fingerprint([dir,...item.settings.inputs.filter(i=>!i.jobs||i.jobs.includes(o.job)).map(i=>i.path)])
  return {result,system,prompt,ms:(yield* Clock.currentTimeMillis)-started,started,changed:before===after?[]:['declared material'],head:undefined}
 }))

	const groups = cards ? cards.map((card) => ({ card, calls })) : calls.reduce<{ card: Card; calls: Call[] }[]>((gs, c) => {
		const g = gs.find((g) => sameCard(g.card, c.card))
		if (g) g.calls.push(c)
		else gs.push({ card: c.card, calls: [c] })
		return gs
	}, [])
	const results: CardResult[] = []
	for (const [n, g] of groups.entries()) {
		const scored: CardResult['calls'][number][] = []
		let limited: CardResult['limited']
		for (const c of g.calls) {
			const now = yield* Clock.currentTimeMillis
			const out = store.exhausted()[g.card.account] ?? 0
			if (out > now) {
				limited = { account: g.card.account, resetsAt: new Date(out).toISOString(), message: 'the account was already at its usage limit' }
				break
			}
			const r = yield* replay(c, g.card, n)
			if (r.unavailable !== undefined) {
				const s: Score = { outcome: 'unavailable', valid: false, parses: false, reason: r.unavailable, flags: [], seconds: 0, tokens: null }
				const facts: Facts = { ...rulesOf(c), head: undefined, changed: [] }
				insert.run(run, c.id, JSON.stringify(g.card), c.system, c.prompt, 'unavailable', null, r.unavailable, null, new Date(yield* Clock.currentTimeMillis).toISOString(), 0, null, JSON.stringify(facts), JSON.stringify([]), JSON.stringify(s))
				scored.push({ call: c.id, item: c.item, kind: c.kind, recorded: recordedScore(c), replay: s, verdict: 'unavailable' })
				continue
			}
			const raw = r.result.raw ?? null
			const output = r.result.ok ? r.result.output : null
			const tokens = tokensOf(g.card.harness, raw)
			const facts: Facts = { ...rulesOf(c), head: r.head, changed: r.changed }
			const flags = flagsFor(facts, { tools: toolEvents(g.card.harness, raw), tokens, ms: r.ms, output })
			const outcome = r.result.ok ? 'ok' : 'limit' in r.result ? 'limit' : 'error'
			const s = score(c.kind as Kind, laneOf(store.get(c.item)?.pack), o.job, { outcome, output, ms: r.ms, tokens, flags })
			const error = r.result.ok ? null : 'limit' in r.result ? r.result.limit.message : r.result.error
			insert.run(run, c.id, JSON.stringify(g.card), r.system, r.prompt, outcome, output, error, raw, new Date(r.started).toISOString(), r.ms, tokens && JSON.stringify(tokens), JSON.stringify(facts), JSON.stringify(flags), JSON.stringify(s))
			if (!r.result.ok && 'limit' in r.result) {
				// Delivery is told too: the account stays out until its reset.
				const resetsAt = Math.max(r.result.limit.resetsAt ?? now + UNKNOWN_RESET_MS, now + MIN_OUT_MS)
				for (const account of new Set([r.result.limit.account, g.card.account])) store.markExhausted(account, resetsAt)
				limited = { account: g.card.account, resetsAt: new Date(resetsAt).toISOString(), message: r.result.limit.message }
				break
			}
			const recorded = recordedScore(c)
			scored.push({ call: c.id, item: c.item, kind: c.kind, recorded, replay: s, verdict: verdict(recorded, s) })
		}
		const available = scored.filter((s) => s.verdict !== 'unavailable')
		const replayed = totals(available.map((s) => s.replay))
		const recorded = totals(available.map((s) => s.recorded))
		const complete = scored.length === g.calls.length && available.length === scored.length
		results.push({
			card: g.card, complete, ...(limited ? { limited } : {}), replay: replayed, recorded,
			matches: complete && replayed.valid >= recorded.valid && replayed.flags <= recorded.flags, calls: scored,
		})
	}

	// Original-card groups may contain different jobs/kinds or different numbers of calls.
	// A prescription recommendation needs the same selected call IDs on every compared card.
	const comparable = groups.every(group => group.calls.length === calls.length && group.calls.every((call, index) => call.id === calls[index]!.id))
	// Cheapest by the evidence: fewest tokens (a card whose harness reports none comes last), then fewest seconds.
	const cost = (r: CardResult) => [r.replay.tokens === null ? 1 : 0, r.replay.tokens ?? 0, r.replay.seconds]
	const best = (comparable ? results : []).filter((r) => r.matches).sort((a, b) => {
		const [x, y] = [cost(a), cost(b)]
		return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!
	})[0]
	const prescription = p.jobs[o.job]
	const requestedTier = prescription && typeof prescription === 'object' && 'tier' in prescription && typeof prescription.tier === 'string' ? prescription.tier : null
	const prescribed = requestedTier && p.tiers[requestedTier] ? requestedTier : null
	const tierOf = (card: Card) => (prescribed && p.tiers[prescribed]!.some((c) => sameCard(c, card)) ? prescribed : Object.keys(p.tiers).find((t) => p.tiers[t]!.some((c) => sameCard(c, card))) ?? null)
	const overall = totals(calls.map(recordedScore))
	const tokens = (t: Totals) => (t.tokens === null ? 'unreported tokens' : `${t.tokens} tokens`)
	const recommendation = best ? {
		card: best.card,
		tier: tierOf(best.card),
		prescribed,
		why: `${label(best.card)} matched the record on ${best.replay.calls} call(s): ${best.replay.valid} valid vs ${best.recorded.valid} recorded, ${best.replay.flags} rule break(s) vs ${best.recorded.flags}, ${tokens(best.replay)} and ${best.replay.seconds}s vs ${tokens(best.recorded)} and ${best.recorded.seconds}s recorded. It is the cheapest of ${results.filter((r) => r.matches).length} matching card(s), by tokens and then seconds.`,
	} : null

	const command = ['mw eval', o.job, ...(o.card !== undefined ? ['--card', quote(o.card)] : []), ...(briefPath ? ['--brief', quote(briefPath)] : []), ...(ids.length ? ['--item', ids.join(',')] : []), ...(o.limit ? ['--limit', String(o.limit)] : [])].join(' ')
	const lead = prescribed ? cardsFor(p, o.job)[0] : undefined
	const unavailable = results.flatMap((r) => r.calls.filter((c) => c.verdict === 'unavailable'))
	const next: Next[] = [
		...(best && (!lead || !sameCard(best.card, lead)) ? [{ run: `$EDITOR ${quote(o.prescriptionsPath)}`, why: prescribed ? `to prescribe ${label(best.card)} for ${o.job}: put it first in tier "${prescribed}", or point ${o.job} at a tier led by it. Made Well changes no file itself.` : `to prescribe ${label(best.card)} for ${o.job}, point the job at a tier led by it. Made Well changes no file itself.` }] : []),
		...(!best && !unavailable.length ? [{ run: `mw eval ${o.job} --card <a tier, or a card as JSON>`, why: comparable ? 'no evaluated card matched the record: keep the prescription, or try other cards' : 'recorded cards replayed different call IDs; use --card to compare every card on the same selected calls before changing the prescription' }] : []),
		...[...new Set(unavailable.map((c) => c.item))].sort((a, b) => a - b).map((item) => {
			const entries = unavailable.filter((c) => c.item === item)
			return { run: `mw trace ${item} --lens ax`, why: `Replay unavailable for call(s) ${[...new Set(entries.map((c) => c.call))].join(',')}: ${entries[0]!.replay.reason} No card ran these calls, so this is not a card result.` }
		}),
		...results.filter((r) => r.limited).map((r) => ({ run: command, why: `${label(r.card)} stopped at a usage limit; run again after ${r.limited!.resetsAt} to complete it` })),
		{ run: `sqlite3 ${quote(store.path)} "SELECT call, card, outcome, score, output FROM eval_calls WHERE eval = ${run}"`, why: 'read each replayed answer; raw streams, facts and flags are on the same rows' },
	]
	const recordedCards = calls.reduce<Card[]>((cs, c) => (cs.some((x) => sameCard(x, c.card)) ? cs : [...cs, c.card]), [])
	const report: EvalReport = { eval: run, job: o.job, brief: briefPath ?? null, recorded: { ...overall, cards: recordedCards }, cards: results, recommendation, next }
	db.prepare('UPDATE evals SET report = ? WHERE id = ?').run(JSON.stringify(report), run)
	telemetry(store.path)?.write('eval', { at, ...report })
	return report
}, Effect.scoped)
