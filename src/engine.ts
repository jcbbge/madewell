// Drives work items through the delivery lane.
//
// The item is the durable thing: every transition is saved before the next call, so killing the process
// at any point loses at most the call in flight, and `mw run` resumes it.
//
// Every agent-to-agent hand-off is an NQ exchange. The receiver judges its packet against the three NQ
// questions and either confirms or asks. The originator answers, and each answer is one turn. After three
// turns with questions still open, the item holds for the operator. Covered hand-offs:
//   dispatcher → first job · job → next job · planner → each maker · failing step → arbiter · arbiter → the
//   job it rules responsible · operator → the job it routes to · a replacement agent after a usage-limit swap.
//
// After planning the work splits (ruling 12): the implementer and the test architect run in parallel, each on
// its own track, in its own worktree, and neither sees the other's output. Made Well then runs the item's own
// checks against the implementer's change (ruling 14): a pass ships, a failure goes to the arbiter.
//
// Every call runs in its own worktree of the product repo, removed when the call ends. Read calls are proved
// read-only; after a making call the branch must not have moved, and the change must stay in the plan's scope;
// no call may leave files in the product repo; whatever a job provisioned is torn down once (ruling 13).
//
// Usage limits never stop the work. The call moves to the next card on another account, and when every
// account is out, the item waits for the earliest reset and carries on by itself.
import { execFile } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { Clock, Effect, Queue, Result, Semaphore } from 'effect'
import { budgetFor, cardsFor, DEFAULT_PARALLEL, harnessOf, INTAKE_ACCESS, prescriptionOf, pickCard, type Access, type Card, type Prescriptions } from './cards.ts'
import { applyPatch, bringOnto, branchOf, commit, itemHome, patchPath, removeHome, revParse, runChecks, takeChange, writePatch } from './change.ts'
import { MadeWellError, quote, type Next } from './errors.ts'
import { NEUTRAL_HOST } from './harness.ts'
import { projectFor, projectsPath, readProjects } from './project.ts'
import {
	DELIVERABLES, INTAKE, MAKERS, ORIGINATOR, RECEIVES, blockedOf, decode, isMaker, lastJson, requiredOf, route, shapeOf, stepOf, validate,
	type Cause, type Check, type Job, type Maker, type Plan,
} from './lane.ts'
import { Store, type Exchange, type Item, type Origin, type Track } from './store.ts'
import { capture, changes, headGuard, leftovers, readOnly, scopeCheck, snapshot, teardown, worktree, type Changes, type State, type TeardownRecord } from './workspace.ts'
import { killOrphans, Worker, type UsageLimit, type WorkerRequest, type WorkerResult } from './worker.ts'

const MAX_LAUNCHES = 3
const MAX_TURNS = 3
const UNKNOWN_RESET_MS = 60 * 60_000
const MIN_OUT_MS = 5 * 60_000
const NQ_HOLDS = ['nq_turns', 'question_for_operator', 'authority']
const CHECK_HOLDS = ['arbiter_undetermined', 'too_many_corrections']
const DONE: ReadonlyArray<Item['status']> = ['held', 'shipped', 'discovered', 'candidate']
const READY: ReadonlyArray<Item['status']> = ['queued', 'running', 'waiting-quota', 'waiting-prerequisite']
/** The prescribed tier intake runs on: the cheapest cards. Without it, intake uses the job's own tier. */
const INTAKE_TIER = 'intake'

interface EngineConfig {
	readonly prescriptions: Prescriptions
	/** How long an idle `mw run --watch` waits before looking at the queue again. */
	readonly pollMs?: number
}

type Services = Store | Worker
type StoreService = Store['Service']

const notFound = (id: number) =>
	new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item and its state' }] })

const profileOf = (o: Origin) => (o.kind === 'job' ? stepOf(o.job).profile : o.kind)

// ── Tracks: the item's one hand-off, or after planning one per maker ──────────────────────────────────

const trackOf = (item: Item, job: Job): Track =>
	(isMaker(job) && item.split?.[job]) || { from: item.from, exchange: item.exchange, launches: item.launches, pickingUp: item.pickingUp, rejected: item.rejected }

const withTrack = (item: Item, job: Job, t: Track): Item =>
	isMaker(job) && item.split?.[job]
		? { ...item, split: { ...item.split, [job]: t } }
		: { ...item, from: t.from, exchange: t.exchange, launches: t.launches, pickingUp: t.pickingUp, rejected: t.rejected }

/** Saves one track's change onto the item as it is now, so the two makers' tracks never overwrite each other. */
const saveTrack = (store: StoreService, id: number, job: Job, patch: Partial<Track>, kind: string, data: Record<string, unknown>, fields: Partial<Item> = {}) => {
	const now = store.get(id)!
	return store.save(withTrack({ ...now, ...fields }, job, { ...trackOf(now, job), ...patch }), kind, data)
}

const hold = (store: StoreService, item: Item, code: string, message: string, context: Record<string, unknown>, next?: ReadonlyArray<Next>) =>
	void store.save({ ...item, status: 'held', hold: { code, message, context, ...(next?.length ? { next } : {}) } }, 'held', { code, message })

/** A Made Well failure inside a step holds the item with the failure's own facts and next commands. */
const holdFor = (store: StoreService, id: number, e: MadeWellError, job?: Job) =>
	hold(store, store.get(id)!, e.code, e.message, { ...(job ? { job } : {}), ...(e.context as Record<string, unknown>) }, e.next)

const deliverableOf = (item: Item, job: Job) => {
	const out = item.outputs[job]
	return out === undefined ? undefined : (lastJson(out) ?? out)
}

const planOf = (item: Item): Plan | undefined => {
	const v = item.outputs.plan === undefined ? undefined : validate('plan', item.outputs.plan)
	return v?.ok ? (v.value as Plan) : undefined
}

/** What the originator hands over to a job. A job's deliverable already in the receiver's packet is pointed at, not repeated. */
function handoffOf(item: Item, job: Job, t: Track): string {
	if (job === 'arbitrate') return item.failure ?? ''
	if (t.from.kind === 'dispatcher') return 'The operator\'s objective and source, under item.'
	if (item.rework) return `Ruling (${item.rework.cause}): ${item.rework.answer}`
	return t.from.kind === 'job' ? (item.outputs[t.from.job] ?? '') : ''
}

// ── The drive loop ─────────────────────────────────────────────────────────────────────────────────────

/** Drives one item until it ships, holds for the operator, or waits on a prerequisite that holds. */
export const drive = Effect.fn('mw.drive')(function* (id: number, config: EngineConfig): Effect.fn.Return<Item, MadeWellError, Services> {
	const store = yield* Store
	yield* Effect.annotateCurrentSpan({ item: id })
	for (;;) {
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (DONE.includes(item.status) || unshipped(store, item).length) return item

		if (item.waitsOn !== undefined) {
			const pre = yield* drive(item.waitsOn, config)
			if (pre.status !== 'shipped') return store.get(id)!
			// The prerequisite fix shipped: run this item's checks again, on the main that now holds the fix.
			store.save({ ...item, waitsOn: undefined, status: 'running', job: 'verify', exchange: undefined, launches: 0, verification: undefined }, 'prerequisite-shipped', { prerequisite: pre.id })
			continue
		}

		store.runnerOn(id)
		yield* advance(item, config).pipe(Effect.catchTag('MadeWellError', (e) => Effect.sync(() => holdFor(store, id, e))))
	}
})

const advance = Effect.fn('mw.advance')(function* (item: Item, config: EngineConfig) {
	const store = yield* Store
	if (!item.base) {
		// The branch the item starts from, and ships to. Only Made Well's ship may move it from here on.
		const base = yield* branchOf(item.workspace)
		store.save({ ...item, base }, 'base', { ref: base.ref, main: base.commit })
		return
	}
	if (pending(item).length) return yield* aftercare(item.id)
	if (item.job === 'verify') return yield* verifyAndShip(item.id, config)
	if (item.split) return yield* runSplit(item.id, config)
	return yield* step(item.id, item.job, config)
})

/** One move of one track: start its hand-off, take the receiver's intake, the originator's answer, or the job itself. */
const step = Effect.fn('mw.step')(function* (id: number, job: Job, config: EngineConfig) {
	const store = yield* Store
	const item = store.get(id)!
	const t = trackOf(item, job)
	const x = t.exchange
	if (!x) {
		saveTrack(store, id, job, { exchange: { from: t.from, handoff: handoffOf(item, job, t), status: 'awaiting-receiver', turns: [] } }, 'handoff', { from: profileOf(t.from), to: stepOf(job).profile, job })
	} else if (x.status === 'awaiting-receiver') {
		yield* intake(id, job, config)
	} else if (x.status === 'awaiting-originator') {
		yield* originate(id, job, config)
	} else {
		yield* execute(id, job, config)
	}
})

/** Ruling 12: both makers work from the plan at once, each on its own track. The item moves on when both are done. */
const runSplit = Effect.fn('mw.split')(function* (id: number, config: EngineConfig) {
	const store = yield* Store
	const track = (job: Maker) =>
		Effect.gen(function* () {
			for (;;) {
				const item = store.get(id)!
				if (item.status === 'held' || item.split?.[job]?.done) return
				yield* step(id, job, config).pipe(Effect.catchTag('MadeWellError', (e) => Effect.sync(() => holdFor(store, id, e, job))))
			}
		})
	yield* Effect.all(MAKERS.map(track), { concurrency: 'unbounded' })
	const item = store.get(id)!
	if (item.status === 'held' || !MAKERS.every((m) => item.split?.[m]?.done)) return
	const blocked = MAKERS.flatMap((m) => {
		const failure = blockedOf(m, (deliverableOf(item, m) as Record<string, unknown>) ?? {})
		return failure ? [{ job: m, failure }] : []
	})
	const joined = { ...item, split: undefined, exchange: undefined, launches: 0, pickingUp: undefined, rejected: undefined }
	if (blocked.length) {
		store.save({ ...joined, job: 'arbitrate', from: { kind: 'job', job: blocked[0]!.job }, failure: blocked.map((b) => b.failure).join('\n\n') }, 'failure', { from: blocked.map((b) => b.job) })
		return
	}
	store.save({ ...joined, job: 'verify', from: { kind: 'job', job: 'implement' } }, 'handed-off', { from: MAKERS, to: 'verify' })
})

// ── NQ ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The receiver judges its packet alone against the three NQ questions, with no tools, and either confirms or asks. On the cheapest card. */
const intake = Effect.fn('mw.intake')(function* (id: number, job: Job, config: EngineConfig) {
	const store = yield* Store
	const p = config.prescriptions
	// The card the job will execute on; a different card later is a different agent, and comes through intake again.
	const card = yield* pickOrWait(id, preferred(store, store.get(id)!, job, p, yield* Clock.currentTimeMillis))
	if (!card) return
	// Intake runs on the cheapest prescribed card; with every one of those out, on the job's own.
	const cheap = pickCard(p.tiers[INTAKE_TIER] ?? [], store.exhausted(), yield* Clock.currentTimeMillis).card ?? card
	const item = store.get(id)!
	const x = trackOf(item, job).exchange!
	const call = yield* callAgent(id, job, config, {
		kind: 'intake', profile: stepOf(job).profile, access: INTAKE_ACCESS, card: cheap, required: requiredOf(INTAKE),
		packet: (dir) => packet(item, job, dir, receiverParts(item, job, x, 'intake')),
	})
	if (!call) return
	const reply = decode(INTAKE, call.output)
	if (!reply.ok) return yield* refuse(id, job, call, reply.reason)
	const { understanding, unclear, ambiguous, missing, notes } = reply.value
	const questions = [...unclear, ...ambiguous, ...missing].filter((q) => q.trim() !== '')
	const receiver = stepOf(job).profile
	if (!questions.length) {
		saveTrack(store, id, job, { launches: 0, rejected: undefined, exchange: { ...x, status: 'clear', understanding, notes: [...notes], card } }, 'nq-clear', { job, profile: receiver, card, intakeCard: cheap })
		return
	}
	const asked: Exchange = { ...x, status: 'awaiting-originator', turns: [...x.turns, { understanding, questions }] }
	const answered = x.turns.filter((t) => t.answer !== undefined).length
	const context = { job, receiver, originator: profileOf(x.from), questions, turns: x.turns }
	const now = withTrack(store.get(id)!, job, { ...trackOf(store.get(id)!, job), exchange: asked })
	if (answered >= MAX_TURNS) return hold(store, now, 'nq_turns', `The ${receiver} still has questions after ${answered} answered turns: the hand-off or its scope is wrong.`, context)
	if (x.from.kind === 'operator' || x.turns.at(-1)?.by === 'operator') {
		return hold(store, now, 'question_for_operator', `The ${receiver} has questions about your answer before it can ${job}.`, context)
	}
	saveTrack(store, id, job, { launches: 0, rejected: undefined, exchange: asked }, 'nq-question', { job, receiver, originator: profileOf(x.from), questions })
})

/** The originator answers the receiver's questions from its own hand-off. Read-only. */
const originate = Effect.fn('mw.originate')(function* (id: number, job: Job, config: EngineConfig) {
	const store = yield* Store
	const item0 = store.get(id)!
	const x0 = trackOf(item0, job).exchange!
	const by: Job = x0.from.kind === 'job' ? x0.from.job : 'ideate'
	const card = yield* pickOrWait(id, cardsFor(config.prescriptions, by))
	if (!card) return
	const item = store.get(id)!
	const x = trackOf(item, job).exchange!
	const from = profileOf(x.from)
	const call = yield* callAgent(id, job, config, {
		kind: 'originator', profile: from, access: 'read', card, required: requiredOf(ORIGINATOR),
		packet: (dir) => packet(item, by, dir, originatorParts(item, job, x), x.from.kind === 'job'),
	})
	if (!call) return
	const reply = decode(ORIGINATOR, call.output)
	if (!reply.ok) return yield* refuse(id, job, call, reply.reason)
	const turns = x.turns.map((t, i) => (i === x.turns.length - 1 ? { ...t, answer: reply.value.answer, by: 'originator' as const } : t))
	if (reply.value.needsOperator) {
		const pendingQ = x.turns.at(-1)!
		return hold(store, store.get(id)!, 'authority', `Only the operator can settle what the ${stepOf(job).profile} asked.`, { job, receiver: stepOf(job).profile, originator: from, questions: pendingQ.questions, originatorSays: reply.value.answer })
	}
	saveTrack(store, id, job, { launches: 0, rejected: undefined, exchange: { ...x, status: 'awaiting-receiver', turns } }, 'nq-answer', { job, originator: from })
})

// ── The job itself ─────────────────────────────────────────────────────────────────────────────────────

/** The receiver, clear on its hand-off, does the job on the card it confirmed with, in its own worktree. */
const execute = Effect.fn('mw.execute')(function* (id: number, job: Job, config: EngineConfig) {
	const store = yield* Store
	const item = store.get(id)!
	const t = trackOf(item, job)
	const x = t.exchange!
	const now = yield* Clock.currentTimeMillis
	if (!x.card || (store.exhausted()[x.card.account] ?? 0) > now) {
		// A different card is a different agent: it receives the work through NQ too. A swap uses up no turn.
		saveTrack(store, id, job, { exchange: { ...x, status: 'awaiting-receiver', card: undefined } }, 'nq-replacement', { job, from: x.card ?? null })
		return
	}
	const home = itemHome(store.path, id)
	const plan = planOf(item)
	const maker = isMaker(job)
	yield* callAgent(id, job, config, {
		kind: 'execute', profile: stepOf(job).profile, access: prescriptionOf(config.prescriptions, job).access, card: x.card, required: requiredOf(DELIVERABLES[job as keyof typeof DELIVERABLES]),
		...(job === 'implement' && plan ? { scope: plan.scope } : {}),
		// The arbiter works on the candidate Made Well verified: the change committed on main, the checks applied.
		...(job === 'arbitrate' && item.verification ? { at: item.verification.on } : {}),
		prepare: (dir) => (maker ? applyPatch(dir, patchPath(home, `${job as Maker}.partial`)) : job === 'arbitrate' ? candidate(item, dir) : Effect.void),
		...(maker ? { onFail: (dir: string) => keepPartial(dir, item, job as Maker) } : {}),
		packet: (dir) => packet(item, job, dir, executeParts(item, job, t, x)),
	}, (dir, call) => accept(id, job, dir, call))
})

interface CallSpec {
	readonly kind: WorkerRequest['kind']
	readonly profile: string
	readonly access: Access
	readonly card: Card
	readonly required: ReadonlyArray<string>
	readonly scope?: ReadonlyArray<string>
	/** The commit the worktree starts at; the item's base by default. */
	readonly at?: string
	readonly prepare?: (dir: string) => Effect.Effect<void, MadeWellError, Store>
	readonly onFail?: (dir: string) => Effect.Effect<void, MadeWellError, Store>
	readonly packet: (dir: string) => Effect.Effect<string, MadeWellError>
}

interface Called {
	readonly output: string
	readonly callId: number
	readonly card: Card
	/** The worktree before the call, for a making call. */
	readonly before?: State
}

/**
 * One agent call in its own worktree, removed when the call ends. Read calls are proved read-only; nothing may
 * be left in the product repo. The call is recorded with its facts. A usage limit, a failed launch or a broken
 * rule is recorded and comes back as undefined: the drive loop re-reads the item and goes again, so every
 * recovery path is the same path. `after` runs inside the worktree before it is removed.
 */
const callAgent = <A = Called>(id: number, job: Job, config: EngineConfig, spec: CallSpec, after?: (dir: string, call: Called) => Effect.Effect<A, MadeWellError, Services>) =>
	Effect.scoped(Effect.gen(function* () {
		const store = yield* Store
		const worker = yield* Worker
		const item = store.get(id)!
		const p = config.prescriptions
		const wt = yield* worktree(item.workspace, spec.at ?? item.base!.commit, `item-${id}-${job}-${spec.kind}`)
		if (spec.prepare) yield* spec.prepare(wt.path)
		const prompt = yield* spec.packet(wt.path)
		const budget = budgetFor(p, job)
		const harness = harnessOf(p, spec.card.harness)
		// A call with no access runs in an empty directory of its own and touches nothing: there is nothing to prove.
		const none = spec.access === 'none'
		const read = spec.access === 'read'
		const product = none ? undefined : yield* capture(item.workspace)
		const before = read || none ? undefined : yield* capture(wt.path)
		const head = before?.head ?? (yield* revParse(wt.path, 'HEAD'))
		const started = new Date()
		let result: WorkerResult | undefined
		const run = worker
			.run({ kind: spec.kind, job, profile: spec.profile, card: spec.card, access: spec.access, system: BRIEF, prompt, item: id, cwd: wt.path, budget, ...(harness ? { harness } : {}) })
			.pipe(
				Effect.tap((r) => Effect.sync(() => (result = r))),
				Effect.withSpan(`mw.${spec.kind}.${job}`, { attributes: { item: id, job, kind: spec.kind, profile: spec.profile, harness: spec.card.harness, model: spec.card.model, account: spec.card.account } }),
			)
		let changed: Changes | undefined
		if (read) {
			const r = yield* Effect.result(readOnly(wt.path, run))
			if (Result.isFailure(r)) {
				if (r.failure.code !== 'workspace_written' || !result) return yield* r.failure
				changed = (r.failure.context as { changes: Changes }).changes
			}
		} else if (none) {
			yield* run
		} else {
			yield* run
			changed = changes(before!, yield* capture(wt.path))
		}
		const res = result!
		const call = {
			item: id, kind: spec.kind, job, profile: spec.profile, card: spec.card, system: BRIEF, prompt,
			outcome: res.ok ? 'ok' : 'limit' in res ? 'limit' : 'error', output: res.ok ? res.output : null,
			error: res.ok ? null : 'limit' in res ? res.limit.message : res.error, raw: res.raw ?? null, started: started.toISOString(), ms: Date.now() - started.getTime(),
			harnessVersion: res.version ?? null,
		} as const
		const callId = store.recordCall(call, {
			access: spec.access,
			head: { before: head, after: changed?.head?.to ?? head },
			changed: changed ? [...changed.added, ...changed.removed, ...changed.modified] : [],
			...(spec.scope ? { scope: spec.scope } : {}),
			budget: { ...(budget.tokens !== undefined ? { tokens: budget.tokens } : {}), ms: budget.minutes * 60_000 },
			...(harness ? { allowlist: harness.tools[spec.access] } : {}),
			required: spec.required,
		})
		if (!res.ok) {
			if (spec.onFail) yield* spec.onFail(wt.path)
			if ('limit' in res) yield* recordLimit(id, job, spec.card, res.limit, spec.kind)
			else yield* launchFailed(id, job, spec.card, res.error, res.overBudget ? { overBudget: res.overBudget } : {})
			return undefined
		}
		if (read && changed) {
			const reason = `The ${spec.kind} call changed its read-only checkout: ${[...changed.added, ...changed.removed, ...changed.modified].join(', ') || 'refs or HEAD'}.`
			store.rejectCall(callId, reason)
			yield* launchFailed(id, job, spec.card, reason, { changes: changed })
			return undefined
		}
		// Under the repo's lock: a parallel item's ship never shows its own files mid-merge as this call's leftovers.
		const left = product ? yield* Effect.result(withLock(item.workspace, leftovers(item.workspace, product))) : undefined
		if (left && Result.isFailure(left)) {
			store.rejectCall(callId, left.failure.message)
			holdFor(store, id, left.failure, job)
			return undefined
		}
		const called: Called = { output: res.output, callId, card: spec.card, ...(before ? { before } : {}) }
		return after ? yield* after(wt.path, called) : (called as A)
	}))

/** The answer broke its contract: the call is on the record as rejected, and the next call is told why. */
const refuse = Effect.fn('mw.refuse')(function* (id: number, job: Job, call: Called, reason: string) {
	const store = yield* Store
	store.rejectCall(call.callId, reason)
	yield* launchFailed(id, job, call.card, reason, {}, { rejected: reason })
})

/**
 * Accepts a job's deliverable once it holds to its contract: its schema, its done-when ids, its scope, and the
 * branch untouched. A maker's work leaves its worktree as a patch kept in Made Well's home.
 */
const accept = Effect.fn('mw.accept')(function* (id: number, job: Job, dir: string, call: Called) {
	const store = yield* Store
	const item = store.get(id)!
	const plan = planOf(item)
	const home = itemHome(store.path, id)
	const v = validate(job, call.output, plan)
	const keep = isMaker(job) ? keepPartial(dir, item, job) : Effect.void
	const refused = (reason: string) => Effect.andThen(keep, refuse(id, job, call, reason))
	if (!v.ok) return yield* refused(v.reason)
	const value = v.value
	if (isMaker(job) || job === 'arbitrate') {
		yield* guardMain(store, item).pipe(Effect.tapError((e) => Effect.andThen(keep, Effect.sync(() => store.rejectCall(call.callId, e.message)))))
	}
	let artifacts: Partial<Item> = {}
	if (isMaker(job) && !blockedOf(job, value)) {
		const base = item.base!.commit
		if (job === 'implement') {
			const scoped = yield* Effect.result(scopeCheck(dir, base, plan!.scope))
			if (Result.isFailure(scoped)) {
				if (scoped.failure.code !== 'out_of_scope') return yield* scoped.failure
				const { outside } = scoped.failure.context as { outside: string[] }
				return yield* refused(`You changed files outside the plan's scope: ${outside.join(', ')}. Your checkout still holds them: revert them, or report {"blocked": ...} if the plan cannot be done within its scope.`)
			}
		}
		const { files, patch } = yield* takeChange(dir, base)
		if (job === 'implement' && !files.length) return yield* refused('You reported the plan done, but your checkout has no change.')
		const product = files.filter((f) => covers(plan!.scope, f))
		if (job === 'test-plan' && product.length) return yield* refused(`Checks may not touch the plan's scope, which is product code: ${product.join(', ')}. Write check files at other paths.`)
		writePatch(patchPath(home, job === 'implement' ? 'change' : 'checks'), patch)
		artifacts = job === 'implement' ? { change: { files } } : { checks: { checks: value.checks as Check[], files } }
		// Ignored files the maker made (build output, screenshots) never leave the worktree, which is removed: recorded, not shipped.
		const stray = yield* Effect.result(leftovers(dir, call.before!))
		if (Result.isFailure(stray)) store.save(store.get(id)!, 'worktree-leftovers', { job, files: (stray.failure.context as { files: string[] }).files })
	}
	if (isMaker(job)) rmSync(patchPath(home, `${job}.partial`), { force: true })

	const now = store.get(id)!
	const provisioned = [...(now.provisioned ?? []), ...((value.provisioned as Item['provisioned']) ?? []).map((r) => ({ kind: r.kind, id: r.id, teardown: r.teardown, job }))]
	const fields: Partial<Item> = { outputs: { ...now.outputs, [job]: call.output }, provisioned, ...artifacts }
	const settled = { launches: 0, pickingUp: undefined, rejected: undefined, exchange: undefined }
	if (isMaker(job) && now.split?.[job]) {
		saveTrack(store, id, job, { ...settled, done: true }, 'accepted', { job }, fields)
	} else {
		applyRoute(store, id, job, value, { ...fields, ...settled })
	}
	yield* aftercare(id, job)
})

/** Applies where a single-track job's accepted deliverable sends the work. */
function applyRoute(store: StoreService, id: number, job: Job, value: Record<string, unknown>, fields: Partial<Item>) {
	const current = { ...store.get(id)!, ...fields }
	const r = route(job, value, current.corrections)
	const by: Origin = { kind: 'job', job }
	switch (r.to) {
		case 'discovered': {
			// Each candidate waits for promotion; its originator is this discovery, answering from its report.
			const ids: number[] = []
			for (const { after, ...c } of r.items) {
				ids.push(store.create({
					title: c.title, objective: c.objective, kind: c.kind, workspace: current.workspace, status: 'candidate', discovery: current.id,
					source: current.source, from: by, outputs: { discover: JSON.stringify(c) }, ...(after ? { after: after.map((p) => ids[p - 1]!) } : {}),
				}).id)
			}
			store.save({ ...current, status: 'discovered' }, 'discovered', { candidates: ids })
			return
		}
		case 'next':
			store.save({ ...current, job: r.job, from: by, rework: undefined }, 'handed-off', { from: job, to: r.job })
			return
		case 'split':
			// Ruling 12: the plan goes to both makers at once, each on its own track; the planner answers both.
			store.save({
				...current, job: 'implement', from: by, rework: undefined, change: undefined, checks: undefined, verification: undefined, merged: undefined,
				split: { implement: { from: by, launches: 0 }, 'test-plan': { from: by, launches: 0 } },
			}, 'handed-off', { from: job, to: MAKERS })
			return
		case 'arbitrate':
			store.save({ ...current, job: 'arbitrate', from: by, failure: r.failure }, 'failure', { from: job })
			return
		case 'rework':
			// A replan starts from the branch as it is now: the base is recorded afresh.
			store.save({
				...current, job: r.job, from: by, rework: { cause: r.cause, answer: r.answer }, failure: undefined, round: current.round + 1, corrections: current.corrections + 1,
				...(r.job === 'plan' ? { base: undefined } : {}),
			}, 'ruling', { cause: r.cause, to: r.job, by: 'arbiter' })
			return
		case 'prerequisite':
			openPrerequisite(store, { ...current, from: by }, r.answer, by)
			return
		case 'hold':
			return hold(store, current, r.code, r.message, { job, failure: current.failure ?? null, ruling: value })
	}
}

/** A path covered by a declared scope: the path itself, or under a directory entry ("dir/" or "dir/**"). */
const covers = (scope: ReadonlyArray<string>, file: string) =>
	scope.some((d) => (d.endsWith('/') || d.endsWith('/**') ? file.startsWith(d.replace(/\*\*$/, '')) : file === d))

/** A maker's unfinished work leaves with it, so the next call picks up where it stopped. */
const keepPartial = (dir: string, item: Item, job: Maker) =>
	Effect.gen(function* () {
		const { patch } = yield* takeChange(dir, item.base!.commit)
		const path = patchPath(itemHome((yield* Store).path, item.id), `${job}.partial`)
		if (patch) writePatch(path, patch)
		else rmSync(path, { force: true })
	})

/** The candidate the checks ran on: the implementer's change committed on top, the checks applied, uncommitted. */
const candidate = (item: Item, dir: string) =>
	Effect.gen(function* () {
		const home = itemHome((yield* Store).path, item.id)
		// The arbiter needs the evidence even when the change no longer applies: what applies, applies.
		yield* Effect.ignore(Effect.andThen(applyPatch(dir, patchPath(home, 'change')), commit(dir, item.title)))
		yield* Effect.ignore(applyPatch(dir, patchPath(home, 'checks')))
	})

// ── Guards and aftercare ───────────────────────────────────────────────────────────────────────────────

// One runner drives the store, so an in-process lock per product repo orders every move of its branch
// against every check of it: another item's ship never lands between reading what to expect and checking.
const locks = new Map<string, Semaphore.Semaphore>()
const withLock = <A, E, R>(repo: string, effect: Effect.Effect<A, E, R>) => {
	let lock = locks.get(repo)
	if (!lock) locks.set(repo, (lock = Semaphore.makeUnsafe(1)))
	return lock.withPermit(effect)
}

/**
 * The branch commit this item may see: its own base, or the latest commit Made Well's ship put there since,
 * for this item or a parallel one. Refs are shared across worktrees, so another item's ship is expected.
 */
const expectedMain = (store: StoreService, item: Item) => {
	let best = store.events(item.id).findLast((e) => e.kind === 'base' || e.kind === 'merged')
	for (const other of store.list()) {
		if (other.id === item.id || other.workspace !== item.workspace || !other.merged) continue
		const e = store.events(other.id).findLast((e) => e.kind === 'merged')
		if (e && (!best || e.seq > best.seq)) best = e
	}
	return (best?.data.main as string | undefined) ?? item.base!.commit
}

/** Only ship moves the branch: after a making job it must be where Made Well last left it. */
const guardMain = (store: StoreService, item: Item) =>
	withLock(item.workspace, Effect.suspend(() => headGuard(item.workspace, item.base!.ref, expectedMain(store, item))))

const pending = (item: Item, job?: Job) => (item.provisioned ?? []).filter((r) => (!job || r.job === job) && r.torn?.exitCode !== 0)

/** Ruling 13: tears down what a job provisioned, each once. The records are saved, so a redrive never repeats one. */
const aftercare = Effect.fn('mw.aftercare')(function* (id: number, job?: Job) {
	const store = yield* Store
	const todo = pending(store.get(id)!, job)
	if (!todo.length) return
	const home = itemHome(store.path, id)
	mkdirSync(home, { recursive: true })
	const r = yield* Effect.result(teardown(todo, home))
	const records = Result.isSuccess(r) ? r.success : ((r.failure.context as { records: TeardownRecord[] }).records)
	const now = store.get(id)!
	const provisioned = (now.provisioned ?? []).map((p) => {
		const torn = todo.some((t) => t.kind === p.kind && t.id === p.id && t.job === p.job) ? records.find((x) => x.kind === p.kind && x.id === p.id) : undefined
		return torn ? { ...p, torn } : p
	})
	store.save({ ...now, provisioned }, 'torn-down', { job: job ?? null, records: records.map((x) => ({ kind: x.kind, id: x.id, exitCode: x.exitCode })) })
	if (Result.isFailure(r)) holdFor(store, id, r.failure, job)
})

// ── Verification and ship: Made Well's own code ────────────────────────────────────────────────────────

/** Ruling 14: Made Well runs the item's own checks against the implementer's change; exit 0 ships. */
const verifyAndShip = Effect.fn('mw.verifyAndShip')(function* (id: number, config: EngineConfig) {
	const store = yield* Store
	let item = store.get(id)!
	if (!item.merged) {
		const main = yield* revParse(item.workspace, item.base!.ref)
		if (!item.verification?.passed || item.verification.on !== main) {
			yield* verify(id, config)
			item = store.get(id)!
			if (item.job !== 'verify' || !item.verification?.passed) return
		}
		const projects = projectsPath(store.path)
		if (!projectFor(yield* readProjects(projects), item.workspace)?.ship) {
			return hold(store, item, 'no_ship_command', `Item #${id} passed its checks, but its project has no ship command.`, { workspace: item.workspace, projects })
		}
		const verified = item.verification
		const merged = yield* withLock(item.workspace, Effect.gen(function* () {
			const now = yield* revParse(item.workspace, item.base!.ref)
			if (now !== verified.on) return false
			yield* bringOnto(item.workspace, item.base!.ref, now, verified.commit)
			store.save({ ...store.get(id)!, merged: { ref: item.base!.ref, commit: verified.commit } }, 'merged', { ref: item.base!.ref, main: verified.commit, from: now })
			return true
		}))
		// Another item shipped since the checks ran: they run again on the branch as it is now.
		if (!merged) return void store.save(store.get(id)!, 'main-moved', { verifiedOn: verified.on })
	}
	yield* shipCommand(id)
})

const verify = Effect.fn('mw.verify')(function* (id: number, config: EngineConfig) {
	const store = yield* Store
	const item = store.get(id)!
	const home = itemHome(store.path, id)
	const checks = item.checks?.checks ?? []
	if (!checks.length || !item.change) {
		// Nothing to run means nothing proved (an item left mid-flight by an older store): it is planned again.
		store.save({ ...item, job: 'plan', from: { kind: 'dispatcher' }, base: undefined, exchange: undefined, launches: 0 }, 'replan', { reason: 'no checks or change on record to verify' })
		return
	}
	const run = yield* Effect.scoped(Effect.gen(function* () {
		const wt = yield* worktree(item.workspace, item.base!.ref, `item-${id}-verify`)
		const change = yield* Effect.result(applyPatch(wt.path, patchPath(home, 'change')))
		if (Result.isFailure(change)) return { kind: 'conflict', by: 'implement', on: wt.base, error: change.failure } as const
		const built = yield* commit(wt.path, item.title)
		const applied = yield* Effect.result(applyPatch(wt.path, patchPath(home, 'checks')))
		if (Result.isFailure(applied)) return { kind: 'conflict', by: 'test-plan', on: wt.base, error: applied.failure } as const
		return { kind: 'ran', on: wt.base, commit: built, results: yield* runChecks(wt.path, checks, budgetFor(config.prescriptions, 'verify'), { ...process.env, MW_ITEM: String(id) }) } as const
	}))
	const now = store.get(id)!
	if (run.kind === 'conflict') {
		const what = run.by === 'implement' ? 'The implementer\'s change' : 'The test architect\'s check files'
		const failure = `${what} no longer apply to ${now.base!.ref} at ${run.on.slice(0, 12)}, which moved since the item started.\n${(run.error.context as { stderr?: string }).stderr ?? run.error.message}`
		store.save({ ...now, job: 'arbitrate', from: { kind: 'job', job: run.by }, failure, exchange: undefined, launches: 0 }, 'failure', { from: 'verify', conflict: run.by })
		return
	}
	const passed = run.results.every((r) => r.exitCode === 0)
	const verification = { on: run.on, commit: run.commit, results: run.results, passed }
	const summary = run.results.map((r) => ({ id: r.id, doneWhen: r.doneWhen, exitCode: r.exitCode, ms: r.ms }))
	if (passed) {
		store.save({ ...now, verification }, 'verified', { on: run.on, results: summary })
		return
	}
	const failed = run.results.filter((r) => r.exitCode !== 0)
	const failure = [
		`${failed.length} of ${run.results.length} checks failed when Made Well ran them on ${now.base!.ref} at ${run.on.slice(0, 12)} with the implementer's change.`,
		...failed.map((r) => `Check ${r.id} (done-when ${r.doneWhen}) exited ${r.exitCode}: ${r.run}\n${r.output}`),
	].join('\n\n')
	// The checks' author answers the arbiter's questions about them.
	store.save({ ...now, verification, job: 'arbitrate', from: { kind: 'job', job: 'test-plan' }, failure, exchange: undefined, launches: 0 }, 'failure', { from: 'verify', results: summary })
})

/** The change is on the branch: the project's own ship command deploys it. Then the item's checks are gone (ruling 11). */
const shipCommand = Effect.fn('mw.ship')(function* (id: number) {
	const store = yield* Store
	const item = store.get(id)!
	const projects = projectsPath(store.path)
	const command = projectFor(yield* readProjects(projects), item.workspace)?.ship
	if (!command) return hold(store, item, 'no_ship_command', `Item #${id} is on ${item.merged!.ref}, but its project has no ship command.`, { workspace: item.workspace, projects })
	const env = { ...process.env, MW_ITEM: String(id), MW_TITLE: item.title, MW_KIND: item.kind ?? 'feature', MW_COMMIT: item.merged!.commit }
	const { code, stdout, stderr } = yield* Effect.promise(
		() => new Promise<{ code: number; stdout: string; stderr: string }>((done) => execFile('sh', ['-c', command], { cwd: item.workspace, maxBuffer: 16 * 1024 * 1024, env }, (error, stdout, stderr) => done({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr }))),
	)
	const tail = (s: string) => s.slice(-4000)
	if (code !== 0) return hold(store, item, 'ship_failed', `Item #${id} is on ${item.merged!.ref}, but its ship command failed with exit code ${code}.`, { workspace: item.workspace, command, exitCode: code, stdout: tail(stdout), stderr: tail(stderr) })
	removeHome(itemHome(store.path, id))
	store.save({ ...item, status: 'shipped', shipped: { command, output: tail(stdout), main: item.merged!.commit } }, 'shipped', { command, output: tail(stdout), main: item.merged!.commit })
})

// ── Cards, limits and failed launches ──────────────────────────────────────────────────────────────────

/** The cards a job executes on. The test architect prefers a runtime other than the implementer's (ruling 12). */
const preferred = (store: StoreService, item: Item, job: Job, p: Prescriptions, now: number): ReadonlyArray<Card> => {
	const cards = cardsFor(p, job)
	if (job !== 'test-plan' || !item.split) return cards
	const other = item.split.implement?.exchange?.card ?? pickCard(cardsFor(p, 'implement'), store.exhausted(), now).card
	return other ? [...cards.filter((c) => c.harness !== other.harness), ...cards.filter((c) => c.harness === other.harness)] : cards
}

/** A card from `cards`, waiting while every account is out. Undefined when the item holds meanwhile. */
const pickOrWait = Effect.fn('mw.pickOrWait')(function* (id: number, cards: ReadonlyArray<Card>) {
	const store = yield* Store
	for (;;) {
		const item = store.get(id)!
		if (item.status === 'held') return undefined
		const now = yield* Clock.currentTimeMillis
		const picked = pickCard(cards, store.exhausted(), now)
		if (picked.card) {
			if (item.status !== 'running') store.save({ ...item, status: 'running', resetsAt: undefined }, 'running', { job: item.job })
			return picked.card
		}
		if (item.status !== 'waiting-quota' || item.resetsAt !== picked.resetsAt) {
			store.save({ ...item, status: 'waiting-quota', resetsAt: picked.resetsAt }, 'waiting-quota', { job: item.job, resetsAt: new Date(picked.resetsAt).toISOString() })
		}
		yield* Effect.sleep(Math.max(0, picked.resetsAt - now))
	}
})

const recordLimit = Effect.fn('mw.recordLimit')(function* (id: number, job: Job, card: Card, limit: UsageLimit, kind: WorkerRequest['kind']) {
	const store = yield* Store
	const at = yield* Clock.currentTimeMillis
	const resetsAt = Math.max(limit.resetsAt ?? at + UNKNOWN_RESET_MS, at + MIN_OUT_MS)
	for (const account of new Set([limit.account, card.account])) store.markExhausted(account, resetsAt)
	const t = trackOf(store.get(id)!, job)
	const profile = stepOf(job).profile
	const pickingUp = kind === 'execute'
		? `The ${profile}'s previous run of this job, on ${card.harness} · ${card.model}, stopped at a usage limit (${limit.message}). You are picking up the same job${isMaker(job) ? ': your checkout holds the work it had done. Continue from there; do not repeat it.' : '.'}`
		: t.pickingUp
	saveTrack(store, id, job, { pickingUp }, 'quota-swap', { kind, job, from: card, account: limit.account, resetsAt: new Date(resetsAt).toISOString(), message: limit.message })
})

const launchFailed = Effect.fn('mw.launchFailed')(function* (id: number, job: Job, card: Card, error: string, evidence: Record<string, unknown> = {}, patch: Partial<Track> = {}) {
	const store = yield* Store
	const item = store.get(id)!
	const t = trackOf(item, job)
	const launches = t.launches + 1
	if (launches < MAX_LAUNCHES) {
		saveTrack(store, id, job, { ...patch, launches }, 'launch-failed', { job, card, error, ...evidence })
		return
	}
	hold(store, withTrack(item, job, { ...t, ...patch, launches }), 'worker_failing', `A call for the ${job} job failed ${launches} times in a row on ${card.harness} · ${card.model}.`, { job, card, lastError: error, ...evidence })
})

/** The items this one builds on that have not shipped; it starts once they have. */
const unshipped = (store: StoreService, item: Item) => (item.after ?? []).filter((id) => store.get(id)?.status !== 'shipped')

/** Whether an item cannot move until the operator acts: something it waits on is held, or was never promoted. */
export const stuck = (store: StoreService, item: Item): boolean => {
	const blocked = (id: number) => ((p) => !p || p.status === 'held' || p.status === 'candidate' || stuck(store, p))(store.get(id))
	return (item.waitsOn !== undefined && blocked(item.waitsOn)) || unshipped(store, item).some(blocked)
}

const openPrerequisite = (store: StoreService, item: Item, answer: string, by: Origin) => {
	const pre = store.create({
		title: `Pre-existing defect blocking #${item.id}`, objective: answer, workspace: item.workspace, job: 'plan', parent: item.id, from: by,
		source: `Found while verifying #${item.id} (${item.title}). The ${profileOf(by)}'s ruling: ${answer}\n\nFailure:\n${item.failure ?? ''}`,
		rework: { cause: 'pre-existing', answer },
	})
	store.save({ ...item, status: 'waiting-prerequisite', waitsOn: pre.id, failure: undefined, exchange: undefined, corrections: item.corrections + 1 }, 'ruling', { cause: 'pre-existing', prerequisite: pre.id, by: profileOf(by) })
}

// ── The operator's commands ────────────────────────────────────────────────────────────────────────────

/** The commands that move a held item, for the agent reading its status. */
export function nextFor(item: Item): Next[] {
	if (item.status !== 'held') return []
	const id = item.id
	const code = item.hold!.code
	if (NQ_HOLDS.includes(code)) {
		return [{ run: `mw answer ${id} "<your answer to context.questions>"`, why: 'your answer goes to the receiving agent, which confirms it understands or asks again' }]
	}
	if (CHECK_HOLDS.includes(code)) {
		return (['implementation', 'test', 'pre-existing'] as const).map((cause) => ({ run: `mw answer ${id} --cause ${cause} "<what the responsible party must do>"`, why: { implementation: 'the new code or its plan is wrong: the planner replans', test: 'the check is wrong: the test architect rewrites it', 'pre-existing': 'the defect predates this work: it gets its own fix first' }[cause] }))
	}
	if (code === 'no_ship_command') {
		return [{ run: `mw init --workspace ${quote(item.workspace)} --ship "<the operator's command that deploys what is on main>"`, why: 'register how this project ships; the item then ships' }]
	}
	if (code === 'leftovers') {
		// Made Well cannot tell an agent's stray files from ones the operator made while the call ran: the operator says which.
		return [...(item.hold!.next ?? []), { run: `mw retry ${id}`, why: 'go on: once the files in context.files are dealt with, or at once if the operator made them while the call ran' }]
	}
	if (code === 'ship_failed') return [{ run: `mw retry ${id}`, why: 'after fixing what context.stderr shows: run the ship command again; the change is already on main' }]
	return [
		...(item.hold!.next ?? []),
		{ run: `mw show ${id}`, why: 'read the failing call\'s last error and the events before it' },
		{ run: `mw retry ${id}`, why: 'run the held step again from where it stopped' },
	]
}

const held = (id: number) =>
	Effect.gen(function* () {
		const store = yield* Store
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (item.status !== 'held') {
			return yield* new MadeWellError({ code: 'not_held', message: `Item #${id} is ${item.status}, not waiting on you.`, context: { id, status: item.status, job: item.job }, next: [{ run: `mw status ${id}`, why: 'see what it is doing now' }] })
		}
		return { store, item: item as Item & { hold: NonNullable<Item['hold']> } }
	})

/** Releases a hold: every track's failed launches start again from zero. */
const released = (item: Item): Item => ({
	...item, status: 'queued', hold: undefined, launches: 0,
	...(item.split ? { split: Object.fromEntries(Object.entries(item.split).map(([k, t]) => [k, { ...t, launches: 0 }])) } : {}),
})

/**
 * The operator answers a hold: a question goes back to the receiving agent; a failed check is routed by its cause.
 * Repeating the answer that released the item's last hold changes nothing.
 */
export const answer = (id: number, text: string, cause?: Cause) =>
	Effect.gen(function* () {
		const store = yield* Store
		const events = store.events(id)
		const repeat = events.slice(events.findLastIndex((e) => e.kind === 'held') + 1).some((e) =>
			(e.data.by === 'operator' || e.data.originator === 'operator') && e.data.cause === cause
			&& (e.data.answer ?? store.get(e.data.prerequisite as number)?.objective) === text)
		if (repeat) return
		const { item } = yield* held(id)
		const free = released(item)
		if (NQ_HOLDS.includes(item.hold.code)) {
			const job = (item.hold.context.job as Job | undefined) ?? item.job
			const t = trackOf(free, job)
			const x = t.exchange!
			const turns = x.turns.map((turn, i) => (i === x.turns.length - 1 ? { ...turn, answer: text, by: 'operator' as const } : turn))
			store.save(withTrack(free, job, { ...t, exchange: { ...x, status: 'awaiting-receiver', turns } }), 'nq-answer', { job, originator: 'operator', answer: text })
			return
		}
		if (!CHECK_HOLDS.includes(item.hold.code)) {
			return yield* new MadeWellError({ code: 'not_answerable', message: `Item #${id} holds on ${item.hold.code}, which an answer does not resolve.`, context: { id, hold: item.hold }, next: nextFor(item) })
		}
		if (!cause) return yield* new MadeWellError({ code: 'cause_required', message: `Item #${id} holds on a failed check; the answer must name its cause.`, context: { id, hold: item.hold }, next: nextFor(item) })
		const operator: Origin = { kind: 'operator' }
		if (cause === 'pre-existing') return openPrerequisite(store, { ...free, from: operator }, text, operator)
		const job: Job = cause === 'test' ? 'test-plan' : 'plan'
		store.save({
			...free, job, from: operator, exchange: undefined, rework: { cause, answer: text }, failure: undefined, round: item.round + 1, corrections: item.corrections + 1,
			...(job === 'plan' ? { base: undefined } : {}),
		}, 'ruling', { cause, to: job, by: 'operator', answer: text })
	})

/**
 * The operator promotes candidates from a discovery run into the delivery queue: all of them, or the ones named and what they build on.
 * Returns every such item of the run that is now promoted, so a repeat returns the same items.
 */
export const promote = (discovery: number, ids: ReadonlyArray<number> = []) =>
	Effect.gen(function* () {
		const store = yield* Store
		const run = store.get(discovery)
		if (!run) return yield* notFound(discovery)
		const found = store.list().filter((i) => i.discovery === discovery)
		const candidates = found.filter((i) => i.status === 'candidate')
		if (run.status !== 'discovered') {
			return yield* new MadeWellError({ code: 'not_discovered', message: `Item #${discovery} is not a finished discovery run (it is ${run.status}).`, context: { id: discovery, status: run.status, job: run.job }, next: [{ run: 'mw status', why: 'find the discovery run and its candidates' }] })
		}
		const unknown = ids.filter((id) => !found.some((c) => c.id === id))
		if (unknown.length) {
			return yield* new MadeWellError({ code: 'not_a_candidate', message: `Not candidates of discovery #${discovery}: ${unknown.join(', ')}.`, context: { discovery, unknown, candidates: candidates.map((c) => ({ id: c.id, title: c.title })) }, next: [{ run: `mw promote ${discovery}`, why: 'promote every waiting candidate' }] })
		}
		// A candidate cannot ship without the items it builds on, so naming it promotes them too.
		const named = new Set<number>()
		const add = (id: number) => {
			if (named.has(id)) return
			named.add(id)
			for (const p of found.find((c) => c.id === id)?.after ?? []) add(p)
		}
		for (const id of ids.length ? ids : found.map((c) => c.id)) add(id)
		const chosen = found.filter((c) => named.has(c.id))
		for (const c of chosen) if (c.status === 'candidate') store.save({ ...c, status: 'queued' }, 'promoted', { discovery })
		return chosen.map((c) => store.get(c.id)!)
	})

/** Releases a held item to run again from where it stopped. Repeating it before the item holds again changes nothing. */
export const retry = (id: number) =>
	Effect.gen(function* () {
		const events = (yield* Store).events(id)
		if (events.slice(events.findLastIndex((e) => e.kind === 'held') + 1).some((e) => e.kind === 'retried')) return
		const { store, item } = yield* held(id)
		if (NQ_HOLDS.includes(item.hold.code) || CHECK_HOLDS.includes(item.hold.code)) {
			return yield* new MadeWellError({ code: 'answer_required', message: `Item #${id} is waiting on your answer, not a retry.`, context: { id, hold: item.hold }, next: nextFor(item) })
		}
		store.save(released(item), 'retried', { job: item.job })
	})

/** Runs the queue: every item that can move, up to `parallel` at once. A held item never stops the others. */
export const runQueue = (config: EngineConfig, options: { watch?: boolean } = {}) =>
	Effect.gen(function* () {
		const store = yield* Store
		yield* store.claimRunner()
		yield* Effect.addFinalizer(() => Effect.sync(() => store.releaseRunner()))
		yield* Effect.sync(killOrphans)
		const finished = yield* Queue.unbounded<Item>()
		const running = new Set<number>()
		const results: Item[] = []
		const parallel = config.prescriptions.parallel ?? DEFAULT_PARALLEL
		for (;;) {
			for (const i of store.list()) {
				if (running.size >= parallel) break
				if (i.parent !== undefined || !READY.includes(i.status) || running.has(i.id) || stuck(store, i) || unshipped(store, i).length) continue
				running.add(i.id)
				yield* Effect.forkScoped(drive(i.id, config).pipe(
					Effect.catchTag('MadeWellError', () => Effect.sync(() => store.get(i.id)!)),
					Effect.flatMap((item) => Queue.offer(finished, item)),
				))
			}
			if (!running.size) {
				store.runnerOn(null)
				if (!options.watch) return results
				yield* Effect.sleep(config.pollMs ?? 2000)
				continue
			}
			const done = options.watch ? yield* Effect.raceFirst(Queue.take(finished), Effect.as(Effect.sleep(config.pollMs ?? 2000), undefined)) : yield* Queue.take(finished)
			if (done) {
				running.delete(done.id)
				results.push(done)
			}
		}
	}).pipe(Effect.scoped)

// ── Briefs and packets ─────────────────────────────────────────────────────────────────────────────────

const SUBAGENT_RULE = 'If your tools can start another agent, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.'

/** The one brief every call carries, identical for every job and kind, so calls share a cached prefix. Packets say who you are. */
export const BRIEF = [
	'You are an agent in Made Well, a delivery pipeline that takes one software work item from ideation through planning and implementation to a verified, shipped change. Your packet says which profile you are, the job you do, and the JSON answer it needs. It runs from what every call of this work item shares to what is yours alone.',
	NEUTRAL_HOST,
	[
		'Settle every decision by the experience rubric. Its three governing questions have equal standing:',
		'- Developer experience: What moves us toward a 10× better experience of developing, understanding, inspecting, and recovering the work?',
		'- User experience: What moves us toward a 10× better experience for the person the resulting system serves?',
		'- Agentic experience: What makes agent execution clearer, more efficient, better grounded, and more reliably bounded?',
		'The answer they give is the decision. Ideation and planning settle every decision and record it with why; no decision is left for the operator.',
	].join('\n'),
	'Leave no trace. Your working directory is a disposable worktree of the product repo, removed when your call ends: write only there, never in the product repo\'s own checkout or anywhere else on the machine. Stop every process you start. Tear down whatever you provision (database branches, dev clones, servers); report anything still standing under "provisioned" as {"kind", "id", "teardown"} and Made Well tears it down. Never commit, branch or push: Made Well alone brings work onto main.',
	'Honor the product repo\'s coding conventions.',
	SUBAGENT_RULE,
	'Your final message is ONLY the JSON object your packet asks for.',
].join('\n\n')

const itemFacts = (item: Item) => ({ id: item.id, title: item.title, ...(item.kind ? { kind: item.kind } : {}), objective: item.objective, source: item.source })

/** The deliverables a job receives, by the static table, in lane order. */
const receivedBy = (item: Item, job: Job) =>
	Object.fromEntries(RECEIVES[job].flatMap((j) => {
		const d = deliverableOf(item, j)
		return d === undefined ? [] : [[j, d]]
	}))

/** The files the plan names, as they are in the call's checkout. */
const snapshotFor = (item: Item, job: Job, dir: string) => {
	const plan = planOf(item)
	if (!plan || !RECEIVES[job].includes('plan')) return Effect.succeed(undefined)
	return snapshot(dir, plan.scope.filter((f) => !f.endsWith('/') && !/[*?[{]/.test(f)))
}

/**
 * A call's packet, stable to volatile: the item, the deliverables the job receives, the snapshot of the plan's
 * files, then what is this call's alone. `withReceived` is false for an originator that received nothing.
 */
const packet = (item: Item, job: Job, dir: string, parts: Record<string, unknown>, withReceived = true) =>
	Effect.map(snapshotFor(item, job, dir), (snap) => JSON.stringify({
		item: itemFacts(item),
		...(withReceived ? { received: receivedBy(item, job) } : {}),
		...(snap ? { snapshot: snap } : {}),
		...parts,
	}, null, 2))

const whereYouAre = (job: Job) => {
	const step = stepOf(job)
	return step.stage === 'discovery' ? 'Made Well\'s discovery' : `Made Well's delivery lane (${step.stage})`
}

const TASKS: Partial<Record<Job, string>> = {
	plan: 'Declare the scope: every file the change may touch. Made Well refuses a change outside it, and the test architect may not touch it. Give each done-when item a short unique id; the checks prove them by id.',
	'test-plan': 'Write each check\'s files in your checkout, at paths outside the plan\'s scope. Made Well keeps them outside the product repo and runs each check\'s command itself, from the repo root, against the implementer\'s change. Each check proves one done-when item by its id, and every done-when item needs at least one. Your checkout has no implementation; never build one, here or anywhere else, to try your checks.',
	implement: 'Change only the files in the plan\'s scope; Made Well takes your change from your checkout. Never write or run checks of your own work: Made Well runs this item\'s checks itself.',
	arbitrate: 'Your checkout holds the implementer\'s change as its last commit, with the test architect\'s check files applied on top, uncommitted. Reproduce the failure if you need to.',
}

const you = (job: Job, kind: WorkerRequest['kind']) => {
	const step = stepOf(job)
	return { profile: step.profile, job, call: kind, where: whereYouAre(job), duty: step.duty }
}

const INTAKE_TASK = (job: Job, originator: string) =>
	`This is intake, before you do the ${job} job: judge this packet alone, and change nothing. State your understanding of what was handed to you and what you must deliver, then answer the three questions. What is unclear? What is ambiguous? Do I have everything I need to proceed? Put each thing that is unclear, ambiguous or missing in its list: each becomes a question to the ${originator}, who answers from its hand-off. A note records a point the packet already settles; anything you would have to assume, choose or guess is a question, not a note. Never repeat a question already answered in earlier turns. Empty lists confirm you are ready. Reply with the shape under "answer", even after your questions are answered: you do the ${job} job, and return what is under "laterDeliverable", in a later call.`

const handoffView = (item: Item, job: Job, x: Exchange) =>
	x.from.kind === 'job' && RECEIVES[job].includes(x.from.job) && x.handoff === item.outputs[x.from.job]
		? `The ${profileOf(x.from)}'s deliverable, under received.${x.from.job}.`
		: x.handoff

const receiverParts = (item: Item, job: Job, x: Exchange, kind: 'intake') => ({
	you: { ...you(job, kind), task: INTAKE_TASK(job, profileOf(x.from)), laterDeliverable: deliverableShape(job), answer: shapeOf(INTAKE) },
	handoff: { from: profileOf(x.from), content: handoffView(item, job, x) },
	earlierTurns: x.turns,
	round: item.round,
	...(trackOf(item, job).rejected ? { yourLastAnswerWasRefused: trackOf(item, job).rejected } : {}),
})

const deliverableShape = (job: Job) => (job in DELIVERABLES ? shapeOf(DELIVERABLES[job as keyof typeof DELIVERABLES]) : undefined)

const originatorParts = (item: Item, job: Job, x: Exchange) => ({
	you: {
		profile: profileOf(x.from), call: 'originator',
		task: `You handed this work over as the ${profileOf(x.from)}. The ${stepOf(job).profile} asked questions before it does the ${job} job. Answer each from your hand-off and the source: clarify what you handed over; never change your hand-off or the work. A question about a decision is settled by the three governing questions; say what they decide and why. Set needsOperator only for authority the source leaves open: destructive or irreversible actions, production beyond this item's own ship, money, credentials, or anything outside the workspace. Shipping this item, its deploy included, is already authorized.`,
		answer: shapeOf(ORIGINATOR),
	},
	yourHandoff: x.from.kind === 'job' && x.handoff === item.outputs[x.from.job] ? deliverableOf(item, x.from.job) : x.handoff,
	receiver: stepOf(job).profile,
	receiverUnderstanding: x.turns.at(-1)!.understanding,
	questions: x.turns.at(-1)!.questions,
	earlierTurns: x.turns.slice(0, -1),
})

const executeParts = (item: Item, job: Job, t: Track, x: Exchange) => ({
	you: { ...you(job, 'execute'), ...(TASKS[job] ? { task: TASKS[job] } : {}), answer: deliverableShape(job) },
	...(job === 'arbitrate' && item.verification ? { verification: { on: item.verification.on, results: item.verification.results }, change: item.change, checks: item.checks } : {}),
	exchange: { from: profileOf(x.from), handoff: handoffView(item, job, x), turns: x.turns, understanding: x.understanding, notes: x.notes },
	...(item.outputs[job] !== undefined && item.rework ? { yourPreviousDeliverable: deliverableOf(item, job) } : {}),
	round: item.round,
	...(t.rejected ? { yourLastAnswerWasRefused: t.rejected } : {}),
	...(t.pickingUp ? { pickingUp: t.pickingUp } : {}),
})
