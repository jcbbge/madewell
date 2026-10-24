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
// no call may leave files in the product repo; whatever a job provisioned is torn down once (ruling 13). The
// project's prepare command stocks each worktree before anything runs in it, and what it provisions comes down too.
//
// Usage limits never stop the work. The call moves to the next card on another account, and when every
// account is out, the item waits for the earliest reset and carries on by itself.
import { execFile } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { Clock, Effect, Queue, Result, Schema, Semaphore } from 'effect'
import { budgetFor, cardsFor, DEFAULT_PARALLEL, forLane, harnessOf, INTAKE_ACCESS, prescriptionOf, pickCard, type Access, type Card, type Prescriptions } from './cards.ts'
import { applyPatch, bringOnto, branchOf, commit, GATE, itemHome, patchPath, removeHome, revParse, runChecks, runGates, takeChange, writePatch } from './change.ts'
import { MadeWellError, quote, type Next } from './errors.ts'
import { NEUTRAL_HOST } from './harness.ts'
import { projectFor, projectsPath, readProjects } from './project.ts'
import {
	INTAKE, ORIGINATOR, Resource, blockedOf, decode, deliverableShape, hasJob, isMaker, lastJson, laneOf, malformed, requiredOf, route, shapeOf, stepOf, validate,
	type Cause, type Check, type Job, type Lane, type Maker, type Plan, type Step,
} from './lane.ts'
import { Store, type Exchange, type Item, type Origin, type Track } from './store.ts'
import { capture, changes, git, headGuard, leftovers, readOnly, scopeCheck, snapshot, teardown, worktree, type Changes, type State, type TeardownRecord } from './workspace.ts'
import { killOrphans, runGroup, Worker, type UsageLimit, type WorkerRequest, type WorkerResult } from './worker.ts'

const MAX_LAUNCHES = 3
/** A repair writes one JSON object it already has. */
const REPAIR_BUDGET = { minutes: 5 }
const MAX_TURNS = 3
const UNKNOWN_RESET_MS = 60 * 60_000
const MIN_OUT_MS = 5 * 60_000
const NQ_HOLDS = ['nq_turns', 'question_for_operator', 'authority']
const CHECK_HOLDS = ['arbiter_undetermined', 'too_many_corrections', 'prerequisite_too_deep']
/** How deep a chain of prerequisite fixes may go: a defect found in a fix of a fix holds for the operator. */
const MAX_DEPTH = 2
const DONE: ReadonlyArray<Item['status']> = ['held', 'paused', 'shipped', 'discovered', 'candidate', 'dropped']
const READY: ReadonlyArray<Item['status']> = ['queued', 'running', 'waiting-quota', 'waiting-prerequisite']
/** The prescribed tier intake runs on: the cheapest cards. Without it, intake uses the job's own tier. */
const INTAKE_TIER = 'intake'

interface EngineConfig {
	readonly prescriptions: Prescriptions
	/** How long an idle `mw run --watch` waits before looking at the queue again. */
	readonly pollMs?: number
	/** True once the runner should hand over to a new build: it starts no new work and returns when in-flight work settles. */
	readonly reloading?: () => boolean
}

type Services = Store | Worker
type StoreService = Store['Service']

/**
 * The file a long step's output streams to while it runs, beside the store under live/: emptied when the step
 * starts and removed once its result is saved, so whatever is in live/ is running now or was cut off. An
 * in-memory store has none.
 */
const liveFile = (store: StoreService, name: string) => {
	if (store.path === ':memory:') return undefined
	try {
		const dir = join(dirname(store.path), 'live')
		mkdirSync(dir, { recursive: true })
		const file = join(dir, `${name}.log`)
		writeFileSync(file, '')
		return file
	} catch {
		return undefined
	}
}
const endLive = (file: string | undefined) => file && rmSync(file, { force: true })
/** The live files an item's cut-off steps left behind, removed once the item will never run again. */
const endLiveOf = (store: StoreService, id: number) => {
	if (store.path === ':memory:') return
	const dir = join(dirname(store.path), 'live')
	try {
		for (const f of readdirSync(dir)) if (f.startsWith(`item-${id}-`)) rmSync(join(dir, f), { force: true })
	} catch {}
}

const notFound = (id: number) =>
	new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item and its state' }] })

/** The lane an item runs: its own cartridge pack, or the default software pack. */
const L = (item: Item) => laneOf(item.pack)

/** Full autonomy: nobody is there to answer, so what would go to the operator is decided by the delegating agent, by the rubric. */
const auto = (item: Item) => (item.autonomy ?? 'full') === 'full'

const profileOf = (item: Item, o: Origin) => (o.kind === 'job' ? stepOf(L(item), o.job).profile : o.kind)

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
	const v = item.outputs.plan === undefined ? undefined : validate(L(item), 'plan', item.outputs.plan)
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
export const drive = Effect.fn('mw.drive')(function* (id: number, given: EngineConfig): Effect.fn.Return<Item, MadeWellError, Services> {
	const store = yield* Store
	yield* Effect.annotateCurrentSpan({ item: id })
	const first = store.get(id)
	if (!first) return yield* notFound(id)
	// The item's cartridges add their own jobs to the prescriptions; a job no tier can run holds the item.
	const prescribed = yield* Effect.result(forLane(given.prescriptions, L(first)))
	if (Result.isFailure(prescribed)) return (holdFor(store, id, prescribed.failure), store.get(id)!)
	const config = { ...given, prescriptions: prescribed.success }
	for (;;) {
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (DONE.includes(item.status) || unshipped(store, item).length) return item

		if (item.waitsOn !== undefined) {
			const pre = yield* drive(item.waitsOn, config)
			if (pre.status !== 'shipped' && pre.status !== 'dropped') return store.get(id)!
			// The prerequisite fix shipped, or the operator dropped it: run this item's checks again, on the main as it is now.
			store.save({ ...item, waitsOn: undefined, status: 'running', job: 'verify', exchange: undefined, launches: 0, verification: undefined }, pre.status === 'shipped' ? 'prerequisite-shipped' : 'prerequisite-dropped', { prerequisite: pre.id })
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
		const conventions = projectFor(yield* readProjects(projectsPath(store.path)), item.workspace)?.conventions ?? []
		store.save({ ...item, base, conventions: conventions.length ? conventions : undefined }, 'base', { ref: base.ref, main: base.commit, ...(conventions.length ? { conventions } : {}) })
		return
	}
	if (pending(item).length) return yield* aftercare(item.id)
	if (!hasJob(L(item), item.job)) {
		return hold(store, item, 'cartridge_missing', `Item #${item.id} is at the ${item.job} job, which its cartridge pack no longer has.`, { job: item.job, pack: L(item).pack.name, jobs: [...L(item).discovery, ...L(item).delivery].map((s) => s.job) })
	}
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
		// The operator's word at the checkpoint before this step travels with its hand-off.
		const handoff = item.steer ? `${handoffOf(item, job, t)}\n\nThe operator's word at the checkpoint before this step: ${item.steer}` : handoffOf(item, job, t)
		saveTrack(store, id, job, { exchange: { from: t.from, handoff, status: 'awaiting-receiver', turns: [] } }, 'handoff', { from: profileOf(item, t.from), to: stepOf(L(item), job).profile, job })
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
	// The makers the plan was split to: the lane's, as it stood when the plan was accepted.
	const makers = Object.keys(store.get(id)!.split ?? {}) as Maker[]
	const track = (job: Maker) =>
		Effect.gen(function* () {
			for (;;) {
				const item = store.get(id)!
				if (item.status === 'held' || item.split?.[job]?.done) return
				yield* step(id, job, config).pipe(Effect.catchTag('MadeWellError', (e) => Effect.sync(() => holdFor(store, id, e, job))))
			}
		})
	yield* Effect.all(makers.map(track), { concurrency: 'unbounded' })
	const item = store.get(id)!
	if (item.status === 'held' || !makers.every((m) => item.split?.[m]?.done)) return
	const blocked = makers.flatMap((m) => {
		const failure = blockedOf(L(item), m, (deliverableOf(item, m) as Record<string, unknown>) ?? {})
		return failure ? [{ job: m, failure }] : []
	})
	const joined = { ...item, split: undefined, exchange: undefined, launches: 0, pickingUp: undefined, rejected: undefined }
	if (blocked.length) {
		store.save({ ...joined, job: 'arbitrate', from: { kind: 'job', job: blocked[0]!.job }, failure: blocked.map((b) => b.failure).join('\n\n') }, 'failure', { from: blocked.map((b) => b.job) })
		return
	}
	store.save({ ...joined, job: 'verify', from: { kind: 'job', job: 'implement' } }, 'handed-off', { from: makers, to: 'verify' })
	stopBetween(store, id, 'implement', 'verify')
})

/**
 * A checkpoint (ruling 17): the item stops, with nothing wrong, until the operator goes on, steers or drops it. `key` names it,
 * so once the operator lets it pass it does not stop there again.
 */
const pause = (store: StoreService, item: Item, key: string, message: string, context: Record<string, unknown>) =>
	void store.save({ ...item, status: 'paused', hold: { code: 'checkpoint', message, context: { ...context, key } } }, 'paused', { key, message })

/** At the "every step" level the item stops each time it crosses from one cartridge into the next. */
const stopBetween = (store: StoreService, id: number, from: Job, to: Job) => {
	const item = store.get(id)!
	if (item.autonomy !== 'steps' || item.status === 'held') return
	const [a, b] = [stepOf(L(item), from).cartridge, stepOf(L(item), to).cartridge]
	if (a === b) return
	pause(store, item, `${item.round}:${to}`, `Checkpoint: ${a} is done for #${id}; ${b} (${to}) is next.`, { after: a, next: to })
}

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
	// Intake judges the packet the job will get: the same tree under its snapshot, the same evidence.
	const call = yield* callAgent(id, job, config, {
		kind: 'intake', profile: stepOf(L(item), job).profile, access: INTAKE_ACCESS, card: cheap, required: requiredOf(INTAKE),
		...jobTree(item, job),
		packet: (dir) => packet(item, job, dir, receiverParts(item, job, x, 'intake')),
	})
	if (!call) return
	const reply = yield* decodeOrRepair(id, job, call, INTAKE)
	if (!reply.ok) return yield* refuse(id, job, call, reply.reason)
	const { understanding, unclear, ambiguous, missing, notes } = reply.value
	const questions = [...unclear, ...ambiguous, ...missing].filter((q) => q.trim() !== '')
	const receiver = stepOf(L(item), job).profile
	if (!questions.length) {
		saveTrack(store, id, job, { launches: 0, exchange: { ...x, status: 'clear', understanding, notes: [...notes], card } }, 'nq-clear', { job, profile: receiver, card, intakeCard: cheap })
		return
	}
	const asked: Exchange = { ...x, status: 'awaiting-originator', turns: [...x.turns, { understanding, questions }] }
	const answered = x.turns.filter((t) => t.answer !== undefined).length
	// The same question carried across hand-offs counts as one: raised MAX_TURNS times on this item already, the next raise holds.
	const raised = store.events(id).filter((e) => e.kind === 'nq-question').flatMap((e) => ((e.data.questions as string[] | undefined) ?? []).map(sameQuestion))
	const repeated = questions.filter((q) => raised.filter((r) => r === sameQuestion(q)).length >= MAX_TURNS)
	const context = { job, receiver, originator: profileOf(item, x.from), questions, turns: x.turns, ...(repeated.length ? { repeated } : {}) }
	const now = withTrack(store.get(id)!, job, { ...trackOf(store.get(id)!, job), exchange: asked })
	if (answered >= MAX_TURNS || repeated.length) return holdTurns(store, now, job, context)
	if (x.from.kind === 'operator' || x.turns.at(-1)?.by === 'operator') {
		return hold(store, now, 'question_for_operator', `The ${receiver} has questions about your answer before it can ${job}.`, context)
	}
	saveTrack(store, id, job, { launches: 0, exchange: asked }, 'nq-question', { job, receiver, originator: profileOf(item, x.from), questions })
})

/** A question's identity across hand-offs: its words, ignoring case, spacing and punctuation. */
const sameQuestion = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** The originator answers the receiver's questions from its own hand-off. Read-only. */
const originate = Effect.fn('mw.originate')(function* (id: number, job: Job, config: EngineConfig) {
	const store = yield* Store
	const item0 = store.get(id)!
	const x0 = trackOf(item0, job).exchange!
	// The dispatcher and the operator answer on the cards of the lane's first job.
	const by: Job = x0.from.kind === 'job' ? x0.from.job : L(item0).delivery[0]!.job
	const card = yield* pickOrWait(id, cardsFor(config.prescriptions, by))
	if (!card) return
	const item = store.get(id)!
	const x = trackOf(item, job).exchange!
	const from = profileOf(item, x.from)
	const call = yield* callAgent(id, job, config, {
		kind: 'originator', profile: from, access: 'read', card, required: requiredOf(ORIGINATOR),
		packet: (dir) => packet(item, by, dir, originatorParts(item, job, x), x.from.kind === 'job'),
	})
	if (!call) return
	const reply = yield* decodeOrRepair(id, job, call, ORIGINATOR)
	if (!reply.ok) return yield* refuse(id, job, call, reply.reason)
	let answer = reply.value.answer
	if (x.deciding) {
		// Full autonomy, out of turns: the delegating agent's decision corrects the hand-off, and a new exchange judges it from turn one.
		const open = x.turns.at(-1)?.questions ?? []
		const handoff = `${x.handoff}\n\nThe ${from} decided these by the rubric, under full autonomy, after the exchange on this hand-off ran out of turns with them open:\n${open.map((q) => `- ${q}`).join('\n')}\n\n${answer}`
		saveTrack(store, id, job, { launches: 0, exchange: { from: x.from, handoff, status: 'awaiting-receiver', turns: [], decided: true } }, 'nq-decided', { job, originator: from, questions: open, answer })
		return
	}
	if (reply.value.needsOperator) {
		const pendingQ = x.turns.at(-1)!
		// Authority: the dispatcher reads the operator's own source first. It holds only when the source leaves the question open
		// and the action is the kind only the operator can authorize. The dispatcher as originator has already read it.
		const ruled = x.from.kind === 'dispatcher' ? undefined : yield* dispatch(id, job, config, from, pendingQ.questions, reply.value.answer)
		if (ruled === null) return
		if (!ruled || ruled.needsOperator) {
			const why = auto(item) ? 'it needs something only the operator has' : 'the operator\'s source leaves it open'
			return hold(store, store.get(id)!, 'authority', `Only the operator can settle what the ${stepOf(L(item), job).profile} asked: ${why}.`, { job, receiver: stepOf(L(item), job).profile, originator: from, questions: pendingQ.questions, originatorSays: reply.value.answer, ...(ruled ? { dispatcherSays: ruled.answer } : {}) })
		}
		answer = ruled.answer
	}
	const turns = x.turns.map((t, i) => (i === x.turns.length - 1 ? { ...t, answer, by: 'originator' as const } : t))
	saveTrack(store, id, job, { launches: 0, exchange: { ...x, status: 'awaiting-receiver', turns } }, 'nq-answer', { job, originator: from, answer, ...(reply.value.needsOperator ? { dispatcher: true } : {}) })
})

/**
 * An originator's "only the operator can authorize this", handed to the dispatcher, who holds the operator's source. It
 * answers when the source authorizes or forbids it, and says needsOperator only when the source leaves it open and it is
 * destructive, irreversible, production beyond this item's ship, money, credentials or outside the workspace. Null when the
 * call did not complete: the drive loop goes again.
 */
const dispatch = (id: number, job: Job, config: EngineConfig, originator: string, questions: ReadonlyArray<string>, originatorSays: string) =>
	Effect.gen(function* () {
		const item0 = (yield* Store).get(id)!
		const card = yield* pickOrWait(id, cardsFor(config.prescriptions, L(item0).delivery[0]!.job))
		if (!card) return null
		const item = (yield* Store).get(id)!
		const call = yield* callAgent(id, job, config, {
			kind: 'originator', profile: 'dispatcher', access: 'read', card, required: requiredOf(ORIGINATOR),
			packet: (dir) => packet(item, job, dir, {
				you: {
					profile: 'dispatcher', call: 'authority',
					task: `The ${originator} says only the operator can settle what the ${stepOf(L(item), job).profile} asked before the ${job} job. You hold the operator's own source (item.source). Read it first. If it authorizes the thing, explicitly or as a necessary part of what it asks for, or forbids it, answer the questions from it and the work goes on. A question about a design decision is never the operator's: it is settled by the three governing questions; say what they decide and why. ${auto(item) ? FULL_AUTHORITY : 'Set needsOperator only when the source leaves it open and it is destructive or irreversible, production beyond this item\'s own ship, money, credentials, or anything outside the workspace.'} Shipping this item, its deploy included, is already authorized.`,
					replyFormat: shapeOf(ORIGINATOR),
				},
				receiver: stepOf(L(item), job).profile,
				questions,
				originator: { profile: originator, says: originatorSays },
			}, false),
		})
		if (!call) return null
		const reply = yield* decodeOrRepair(id, job, call, ORIGINATOR)
		if (!reply.ok) return (yield* refuse(id, job, call, reply.reason), null)
		return reply.value
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
	const plan = planOf(item)
	const maker = isMaker(job)
	yield* callAgent(id, job, config, {
		kind: 'execute', profile: stepOf(L(item), job).profile, access: prescriptionOf(config.prescriptions, job).access, card: x.card, required: (deliverableShape(L(item), job, auto(item))?.required as string[] | undefined) ?? [],
		...(job === 'implement' && plan ? { scope: plan.scope } : {}),
		...jobTree(item, job),
		...(maker ? { onFail: (dir: string) => keepPartial(dir, item, job as Maker) } : {}),
		packet: (dir) => packet(item, job, dir, executeParts(item, job, t, x)),
	}, (dir, call) => accept(id, job, dir, call))
})

/**
 * The tree a job works on, which its intake's snapshot shows too. A maker resumes its kept partial work; the
 * arbiter works on the candidate Made Well verified: the change committed on main, the checks applied.
 */
const jobTree = (item: Item, job: Job): Pick<CallSpec, 'at' | 'prepare'> => ({
	...(job === 'arbitrate' && item.verification ? { at: item.verification.on } : {}),
	prepare: (dir) =>
		Effect.gen(function* () {
			const home = itemHome((yield* Store).path, item.id)
			if (isMaker(job)) return yield* applyPatch(dir, patchPath(home, `${job as Maker}.partial`))
			if (job === 'arbitrate') return yield* candidate(item, dir)
		}),
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
	readonly kind: WorkerRequest['kind']
	readonly profile: string
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
		// A call with no access never sees its worktree, so it gets nothing prepared.
		if (spec.access !== 'none') {
			const failed = yield* prepareWorktree(id, job, wt.path, `item-${id}-${job}-${spec.kind}`, wt.base)
			// The receiver's broken worktree is its question to the originator; the originator's has nobody above it.
			if (failed && spec.kind === 'originator') return void hold(store, store.get(id)!, 'prepare_failed', failed.message, failed.context)
			if (failed) return void (yield* launchFailed(id, job, spec.kind, spec.card, failed.message, failed.context))
		}
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
		const live = liveFile(store, `item-${id}-${job}-${spec.kind}`)
		store.note(id, 'call-started', { job, kind: spec.kind, profile: spec.profile, card: spec.card, access: spec.access, budget, packetBytes: prompt.length, ...(live ? { live } : {}) })
		const started = new Date()
		let result: WorkerResult | undefined
		const run = worker
			.run({ kind: spec.kind, job, profile: spec.profile, card: spec.card, access: spec.access, system: briefOf(L(item)), prompt, item: id, cwd: wt.path, budget, ...(harness ? { harness } : {}), ...(live ? { live } : {}) })
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
			item: id, kind: spec.kind, job, profile: spec.profile, card: spec.card, system: briefOf(L(item)), prompt,
			outcome: res.ok ? 'ok' : 'limit' in res ? 'limit' : 'error', output: res.ok ? res.output : null,
			error: res.ok ? null : 'limit' in res ? res.limit.message : res.error, raw: res.raw ?? null, started: started.toISOString(), ms: Date.now() - started.getTime(),
			harnessVersion: res.version ?? null,
		} as const
		const callId = store.recordCall(call, {
			access: spec.access,
			head: { before: head, after: changed?.head?.to ?? head },
			// The worktree's own files: git settings are shared with every session in the repo, and leftovers guards them.
			changed: changed ? [...changed.added, ...changed.removed, ...changed.modified].filter((f) => !f.startsWith('.git/')) : [],
			...(spec.scope ? { scope: spec.scope } : {}),
			budget: { ...(budget.tokens !== undefined ? { tokens: budget.tokens } : {}), ms: budget.minutes * 60_000 },
			// A harness that takes launch arguments in place of tool names ({...tools}, Codex's sandbox flags) has no allowlist to judge tools by.
			...(harness && !harness.command.includes('{...tools}') ? { allowlist: harness.tools[spec.access] } : {}),
			required: spec.required,
		})
		store.note(id, 'call-finished', { call: callId, job, kind: spec.kind, profile: spec.profile, outcome: call.outcome, ms: call.ms, ...(call.error ? { error: call.error.slice(0, 2000) } : {}) })
		endLive(live)
		if (!res.ok) {
			if (spec.onFail) yield* spec.onFail(wt.path)
			if ('limit' in res) yield* recordLimit(id, job, spec.card, res.limit, spec.kind)
			else yield* launchFailed(id, job, spec.kind, spec.card, res.error, res.overBudget ? { overBudget: res.overBudget } : {})
			return undefined
		}
		if (read && changed) {
			const reason = `The ${spec.kind} call changed its read-only checkout: ${[...changed.added, ...changed.removed, ...changed.modified].join(', ') || 'refs or HEAD'}.`
			store.rejectCall(callId, reason)
			yield* launchFailed(id, job, spec.kind, spec.card, reason, { changes: changed })
			return undefined
		}
		// Under the repo's lock: a parallel item's ship never shows its own files mid-merge as this call's leftovers.
		const left = product ? yield* Effect.result(withLock(item.workspace, leftovers(item.workspace, product))) : undefined
		if (left && Result.isFailure(left)) {
			store.rejectCall(callId, left.failure.message)
			holdFor(store, id, left.failure, job)
			return undefined
		}
		const called: Called = { kind: spec.kind, profile: spec.profile, output: res.output, callId, card: spec.card, ...(before ? { before } : {}) }
		return after ? yield* after(wt.path, called) : (called as A)
	}))

const REPAIR_TASK = 'Your last answer could not be read: its JSON is malformed or does not match your reply format. Under yourAnswer is what you sent and under problem what is wrong with it. Reply with only that answer as one JSON object matching you.replyFormat: the same content, corrected, nothing added or dropped. Your work is done; this call only corrects the reply.'

/** An NQ reply decoded against its schema, after one repair if it does not parse. */
const decodeOrRepair = <S extends typeof INTAKE | typeof ORIGINATOR>(id: number, job: Job, call: Called, schema: S) =>
	Effect.gen(function* () {
		const first = decode(schema, call.output)
		if (first.ok) return first
		const fixed = yield* repair(id, job, call, shapeOf(schema), first.reason)
		return fixed ? decode(schema, fixed.output) : first
	})

/**
 * Made Well's own re-ask of a worker whose answer does not parse: not an agent hand-off, so no NQ turn. The same card, no
 * tools, its answer and the parse error; one try. Returns the call with the corrected answer, or undefined. The malformed
 * call stays on the record, refused, and the repair is a call of its own.
 */
const repair = (id: number, job: Job, call: Called, shape: unknown, problem: string) =>
	Effect.gen(function* () {
		const store = yield* Store
		const worker = yield* Worker
		const profile = call.profile
		const prompt = JSON.stringify({ you: { profile, job, call: 'repair', task: REPAIR_TASK, replyFormat: shape }, yourAnswer: call.output, problem: problem.slice(0, 4000) }, null, 2)
		const started = new Date()
		const brief = briefOf(L(store.get(id)!))
		const res = yield* worker.run({ kind: 'repair', job, profile, card: call.card, access: 'none', system: brief, prompt, item: id, cwd: store.path === ':memory:' ? tmpdir() : dirname(store.path), budget: REPAIR_BUDGET }).pipe(
			Effect.withSpan(`mw.repair.${job}`, { attributes: { item: id, job, harness: call.card.harness, model: call.card.model } }),
		)
		const ms = Date.now() - started.getTime()
		const repairId = store.recordCall({
			item: id, kind: 'repair', job, profile, card: call.card, system: brief, prompt, outcome: res.ok ? 'ok' : 'limit' in res ? 'limit' : 'error',
			output: res.ok ? res.output : null, error: res.ok ? null : 'limit' in res ? res.limit.message : res.error, raw: res.raw ?? null, started: started.toISOString(), ms, harnessVersion: res.version ?? null,
		}, { access: 'none' })
		store.rejectCall(call.callId, `${problem} Made Well re-asked for the corrected JSON in call ${repairId}.`)
		const ok = res.ok && (call.kind === 'execute' ? !malformed(L(store.get(id)!), job, res.output, auto(store.get(id)!)) : lastJson(res.output) !== undefined)
		store.note(id, 'repaired', { job, kind: call.kind, call: call.callId, repair: repairId, ms, ok })
		return ok && res.ok ? { ...call, output: res.output } : undefined
	})

/** The answer broke its contract: the call is on the record as rejected, and the next call is told why. */
const refuse = Effect.fn('mw.refuse')(function* (id: number, job: Job, call: Called, reason: string) {
	const store = yield* Store
	store.rejectCall(call.callId, reason)
	yield* launchFailed(id, job, call.kind, call.card, reason, {}, { rejected: reason })
})

/**
 * Accepts a job's deliverable once it holds to its contract: its schema, its done-when ids, its scope, and the
 * branch untouched. A maker's work leaves its worktree as a patch kept in Made Well's home.
 */
const accept = Effect.fn('mw.accept')(function* (id: number, job: Job, dir: string, answered: Called) {
	const store = yield* Store
	const item = store.get(id)!
	const plan = planOf(item)
	const home = itemHome(store.path, id)
	// A malformed answer is re-asked as it is, by Made Well's own code: the work in the checkout stands.
	const problem = malformed(L(item), job, answered.output, auto(item))
	const call = problem ? ((yield* repair(id, job, answered, deliverableShape(L(item), job, auto(item)), problem)) ?? answered) : answered
	// A plan is held to what its base already holds: the files tracked in its own checkout.
	const v = validate(L(item), job, call.output, plan, job === 'plan' ? (yield* snapshot(dir, [])).files : undefined, auto(item), item.conventions)
	const keep = isMaker(job) ? keepPartial(dir, item, job) : Effect.void
	const refused = (reason: string) => Effect.andThen(keep, refuse(id, job, call, reason))
	if (!v.ok) return yield* refused(v.reason)
	const value = v.value
	if (isMaker(job) || job === 'arbitrate') {
		yield* guardMain(store, item).pipe(Effect.tapError((e) => Effect.andThen(keep, Effect.sync(() => store.rejectCall(call.callId, e.message)))))
	}
	let artifacts: Partial<Item> = {}
	if (isMaker(job) && !blockedOf(L(item), job, value)) {
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
	// The operator's word at a checkpoint has reached every hand-off of the step it preceded once one of them delivers.
	const fields: Partial<Item> = { outputs: { ...now.outputs, [job]: call.output }, provisioned, ...artifacts, steer: undefined }
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
	const r = route(L(current), job, value, current.corrections)
	const by: Origin = { kind: 'job', job }
	switch (r.to) {
		case 'discovered': {
			// Each candidate waits for promotion; in full autonomy every one goes straight into delivery. Its originator is this
			// discovery, answering from its report.
			const ids: number[] = []
			for (const { after, ...c } of r.items) {
				ids.push(store.create({
					title: c.title, objective: c.objective, kind: c.kind, workspace: current.workspace, status: auto(current) ? 'queued' : 'candidate', discovery: current.id,
					source: current.source, from: by, outputs: { discover: JSON.stringify(c) }, ...(after ? { after: after.map((p) => ids[p - 1]!) } : {}),
					...(current.pack ? { pack: current.pack } : {}), ...(current.autonomy ? { autonomy: current.autonomy } : {}),
				}).id)
			}
			store.save({ ...current, status: 'discovered' }, 'discovered', { candidates: ids, ...(auto(current) ? { promoted: true } : {}) })
			return
		}
		case 'next':
			// The plan is the first job that reads the code to change it: it starts from the branch as it is now, not as it was at ideation.
			store.save({ ...current, job: r.job, from: by, rework: undefined, ...(r.job === 'plan' ? { base: undefined } : {}) }, 'handed-off', { from: job, to: r.job })
			return stopBetween(store, id, job, r.job)
		case 'split':
			// Ruling 12: the plan goes to both makers at once, each on its own track; the planner answers both.
			store.save({
				...current, job: 'implement', from: by, rework: undefined, change: undefined, checks: undefined, verification: undefined, merged: undefined,
				split: Object.fromEntries(L(current).makers.map((m) => [m, { from: by, launches: 0 }])),
			}, 'handed-off', { from: job, to: L(current).makers })
			return stopBetween(store, id, job, 'implement')
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
		case 'prerequisite': {
			let depth = 0
			for (let p = current.parent; p !== undefined; p = store.get(p)?.parent) depth++
			if (depth >= MAX_DEPTH) {
				return hold(store, current, 'prerequisite_too_deep', `The arbiter ruled a pre-existing defect inside a fix that is already ${depth} prerequisites deep. A chain this long means the ground under the work is not what the plans assumed: you decide what happens. ${r.answer}`, { job, depth, failure: current.failure ?? null, ruling: value })
			}
			openPrerequisite(store, { ...current, from: by }, r.answer, by)
			return
		}
		case 'environment':
			// Twice in a row: the project's environment is the operator's configuration, which no step of the work can fix.
			if (current.rework?.cause === 'environment') {
				return hold(store, current, 'environment', `The arbiter ruled the environment twice in a row: the project's worktree, its preparation or a service it needs keeps failing, not the work. ${r.answer}`, { job, failure: current.failure ?? null, ruling: value })
			}
			store.save({ ...current, job: 'verify', from: by, rework: { cause: 'environment', answer: r.answer }, failure: undefined, verification: undefined, exchange: undefined, launches: 0 }, 'ruling', { cause: 'environment', to: 'verify', by: 'arbiter' })
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

// ── Prepare: the project makes each fresh worktree usable ──────────────────────────────────────────────

const PREPARE_BUDGET = { minutes: 10 }
const Prepared = Schema.Struct({ provisioned: Schema.Array(Resource) })

/**
 * Ruling 13's first half. A git worktree has none of the repo's ignored files (dependencies, env, a database), so the
 * project's prepare command stocks each fresh one before anything runs in it, and before its baseline is taken, so
 * its files are never leftovers. What it reports as provisioned is saved on the item before the job starts and torn
 * down like an agent's. When it fails, the failure comes back and nothing runs in the worktree.
 */
const prepareWorktree = Effect.fn('mw.prepare')(function* (id: number, job: Job, dir: string, name: string, base: string) {
	const store = yield* Store
	const item = store.get(id)!
	const project = projectFor(yield* readProjects(projectsPath(store.path)), item.workspace)
	if (!project?.prepare) return undefined
	const env = { ...process.env, MW_ITEM: String(id), MW_JOB: job, MW_NAME: name, MW_WORKTREE: dir, MW_PROJECT: project.path, MW_BASE: base }
	const live = liveFile(store, `${name}-prepare`)
	store.note(id, 'prepare-started', { job, name, command: project.prepare, ...(live ? { live } : {}) })
	const r = yield* runGroup({ command: 'sh', args: ['-c', project.prepare], cwd: dir, env, input: '', budget: PREPARE_BUDGET, ...(live ? { live } : {}) })
	endLive(live)
	const reported = Schema.decodeUnknownResult(Prepared)(lastJson(r.stdout) ?? {})
	const resources = Result.isSuccess(reported) ? reported.success.provisioned : []
	const now = store.get(id)!
	store.save({ ...now, provisioned: [...(now.provisioned ?? []), ...resources.map((x) => ({ kind: x.kind, id: x.id, teardown: x.teardown, job }))] }, 'prepared', { job, name, exitCode: r.code, provisioned: resources.map((x) => ({ kind: x.kind, id: x.id })) })
	if (r.code === 0 && !r.overBudget) return undefined
	const why = r.overBudget ? `ran past its ${PREPARE_BUDGET.minutes} minutes` : `exited ${r.code}`
	const said = (r.stderr.trim() || r.stdout.trim()).slice(-1500)
	return { message: `The project's prepare command ${why} in ${name}, so the ${job} job did not run.${said ? ` It said:\n${said}` : ''}`, context: { job, workspace: item.workspace, name, command: project.prepare, exitCode: r.code, stdout: r.stdout.slice(-4000), stderr: r.stderr.slice(-4000) } }
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
		const verified = item.verification
		// Checkpoints and every step: the operator sees the verified change before it merges and ships.
		const key = `ship:${verified.commit}`
		if ((item.autonomy ?? 'full') !== 'full' && item.passed !== key) {
			return pause(store, item, key, `Checkpoint: #${id} passed its ${item.verification.results.length ? 'checks' : 'verification'} and waits for you before it merges and ships.`, { after: 'verification', next: 'ship', commit: verified.commit, files: item.change?.files ?? [] })
		}
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
	if (!item.change || (L(item).makers.includes('test-plan') && !checks.length)) {
		// Nothing to run means nothing proved (an item left mid-flight by an older store): it is planned again.
		store.save({ ...item, job: 'plan', from: { kind: 'dispatcher' }, base: undefined, exchange: undefined, launches: 0 }, 'replan', { reason: 'no checks or change on record to verify' })
		return
	}
	const project = projectFor(yield* readProjects(projectsPath(store.path)), item.workspace)
	const gates = project?.gates ?? []
	const budget = budgetFor(config.prescriptions, 'verify')
	const env = { ...process.env, MW_ITEM: String(id) }
	const live = liveFile(store, `item-${id}-verify`)
	store.note(id, 'verify-started', { gates: gates.map((g) => g.run), checks: checks.map((c) => ({ id: c.id, doneWhen: c.doneWhen, run: c.run })), ...(live ? { live } : {}) })
	const run = yield* Effect.scoped(Effect.gen(function* () {
		const wt = yield* worktree(item.workspace, item.base!.ref, `item-${id}-verify`)
		const failed = yield* prepareWorktree(id, 'verify', wt.path, `item-${id}-verify`, wt.base)
		if (failed) return { kind: 'unprepared', ...failed } as const
		const change = yield* Effect.result(applyPatch(wt.path, patchPath(home, 'change')))
		if (Result.isFailure(change)) return { kind: 'conflict', by: 'implement', on: wt.base, error: change.failure } as const
		// The project's gates run on the change alone, before the check files are applied; their fixes join the change.
		const gated = yield* runGates(wt.path, wt.base, gates, patchPath(home, 'change'), budget, env, live)
		const built = yield* commit(wt.path, commitMessage(item))
		const applied = yield* Effect.result(applyPatch(wt.path, patchPath(home, 'checks')))
		if (Result.isFailure(applied)) return { kind: 'conflict', by: 'test-plan', on: wt.base, error: applied.failure } as const
		// A failing check runs once more on the same candidate, so a flaky check never reaches the arbiter.
		const first = yield* runChecks(wt.path, checks, budget, env, live)
		const again = yield* runChecks(wt.path, checks.filter((c) => first.some((r) => r.id === c.id && r.exitCode !== 0)), budget, env, live)
		const results = first.map((r) => {
			const r2 = again.find((x) => x.id === r.id)
			return !r2 ? r : r2.exitCode === 0 ? r2 : { ...r, output: `${r.output}\n[made well] ran it again on the same candidate: exited ${r2.exitCode}\n${r2.output}` }
		})
		const flaky = again.filter((r) => r.exitCode === 0).map((r) => r.id)
		return { kind: 'ran', on: wt.base, commit: built, fixed: gated.fixed, flaky, results: [...gated.results, ...results] } as const
	})).pipe(Effect.ensuring(Effect.sync(() => endLive(live))))
	// Verify is Made Well's own step, not an agent's: a worktree it cannot prepare holds for the operator.
	if (run.kind === 'unprepared') return hold(store, store.get(id)!, 'prepare_failed', run.message, run.context)
	// What prepare stood up for the check run comes down now: a pass merges and ships in this same step.
	yield* aftercare(id, 'verify')
	if (store.get(id)!.status === 'held') return
	const now = store.get(id)!
	if (run.kind === 'conflict') {
		// Only Made Well's ship moves the branch, so another item shipped since this one started and its work no longer applies.
		// No check failed and nobody erred, so no arbiter: the plan was grounded on a branch that is gone, so the planner plans
		// again from the branch as it is now, and both makers work from that plan.
		const why = (run.error.context as { stderr?: string }).stderr?.trim() || run.error.message
		for (const m of L(now).makers) rmSync(patchPath(home, `${m}.partial`), { force: true })
		const steps = L(now).delivery
		const beforePlan = steps[steps.findIndex((s) => s.job === 'plan') - 1]
		store.save({
			...now, job: 'plan', from: beforePlan ? { kind: 'job', job: beforePlan.job } : { kind: 'dispatcher' }, base: undefined, split: undefined, change: undefined, checks: undefined, verification: undefined,
			exchange: undefined, launches: 0, round: now.round + 1,
			pickingUp: `Made Well shipped other work onto ${now.base!.ref} after this item was planned, and its ${run.by === 'implement' ? 'change' : 'check files'} no longer apply there:\n${why}\nPlan again from the branch as it is now.`,
		}, 'rebased', { conflict: run.by, from: now.base!.commit, ref: now.base!.ref, reason: why.slice(0, 2000) })
		return
	}
	const passed = run.results.every((r) => r.exitCode === 0)
	const verification = { on: run.on, commit: run.commit, results: run.results, passed }
	const summary = run.results.map((r) => ({ id: r.id, doneWhen: r.doneWhen, exitCode: r.exitCode, ms: r.ms }))
	const fixed = { ...(run.fixed.length ? { fixed: run.fixed } : {}), ...(run.flaky.length ? { flaky: run.flaky } : {}) }
	if (passed) {
		store.save({ ...now, verification }, 'verified', { on: run.on, results: summary, ...fixed })
		return
	}
	// The environment's evidence, so the arbiter can tell a failure of the work from a failure of the machine it ran on.
	const prepared = store.events(id).findLast((e) => e.kind === 'prepared' && e.data.job === 'verify')
	const torn = store.events(id).findLast((e) => e.kind === 'torn-down' && e.data.job === 'verify')
	const listed = (xs: unknown) => ((xs as { kind: string; id: string; exitCode?: number }[] | undefined) ?? []).map((x) => `${x.kind} ${x.id}${x.exitCode === undefined ? '' : ` (exit ${x.exitCode})`}`).join(', ')
	const head = yield* Effect.result(revParse(item.workspace, now.base!.ref))
	const environment = [
		`Environment: the checks ran in a fresh worktree of ${now.base!.ref} at ${run.on.slice(0, 12)}; each failing check was run a second time on the same candidate.`,
		!project?.prepare ? 'The project has no prepare command.' : `The prepare command \`${project.prepare}\` exited ${prepared?.data.exitCode ?? 'unknown'}${listed(prepared?.data.provisioned) ? ` and provisioned ${listed(prepared?.data.provisioned)}` : ''}.`,
		torn ? `Torn down after the run: ${listed(torn.data.records)}.` : 'Nothing was provisioned, so nothing was torn down.',
		Result.isFailure(head) ? `${now.base!.ref} could not be read now: ${head.failure.message}` : head.success === run.on ? `${now.base!.ref} has not moved since.` : `${now.base!.ref} has moved since, to ${head.success.slice(0, 12)}.`,
	].join(' ')
	const failed = run.results.filter((r) => r.exitCode !== 0)
	const failure = [
		`${failed.length} of ${run.results.length} ${run.results.some((r) => r.doneWhen === GATE) ? 'gates and checks' : 'checks'} failed when Made Well ran them on ${now.base!.ref} at ${run.on.slice(0, 12)} with the implementer's change.`,
		...failed.map((r) => (r.doneWhen === GATE ? `The project's gate ${r.id} exited ${r.exitCode}: ${r.run}\n${r.output}` : `Check ${r.id} (done-when ${r.doneWhen}) exited ${r.exitCode}: ${r.run}\n${r.output}`)),
		environment,
	].join('\n\n')
	// A failed check's author answers the arbiter's questions about it; the gates are the operator's, so the dispatcher answers for them.
	const from: Origin = failed.some((r) => r.doneWhen !== GATE) ? { kind: 'job', job: 'test-plan' } : { kind: 'dispatcher' }
	store.save({ ...now, verification, job: 'arbitrate', from, failure, exchange: undefined, launches: 0 }, 'failure', { from: 'verify', results: summary, ...fixed })
})

/**
 * The commit that ships (ruling 19): the item's title, its objective, what done means and the decisions that shaped it, so the
 * repository's history says why each change was made. It is the work's own record; nothing in it names an agent or Made Well.
 */
const commitMessage = (item: Item) => {
	const plan = planOf(item)
	const decisions = [...stepsBefore(item), 'plan'].flatMap((job) => {
		const d = deliverableOf(item, job) as { decisions?: unknown } | undefined
		return Array.isArray(d?.decisions) ? (d.decisions as { question?: unknown; decision?: unknown; why?: unknown }[]) : []
	}).filter((d) => typeof d.decision === 'string')
	return [
		item.title,
		item.objective !== item.title ? item.objective : '',
		plan?.doneWhen.length ? `Done when:\n${plan.doneWhen.map((d) => `- ${d.text}`).join('\n')}` : '',
		decisions.length ? `Decisions:\n${decisions.map((d) => `- ${typeof d.question === 'string' ? `${d.question} ` : ''}${d.decision}${typeof d.why === 'string' ? ` (${d.why})` : ''}`).join('\n')}` : '',
	].filter(Boolean).join('\n\n')
}

/** The thinking steps an item's lane runs before its plan. */
const stepsBefore = (item: Item) => {
	const steps = L(item).delivery.map((s) => s.job)
	return steps.slice(0, steps.indexOf('plan'))
}

/** The change is on the branch: the project's own ship command deploys it. Then the item's checks are gone (ruling 11). */
/** `git push` to the branch's upstream, or undefined when it has none. */
const pushCommand = (repo: string, ref: string) =>
	Effect.map(Effect.result(git(repo, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', `${ref.replace('refs/heads/', '')}@{upstream}`)), (r) => {
		const upstream = Result.isSuccess(r) ? r.success.trim() : ''
		const slash = upstream.indexOf('/')
		return slash > 0 ? `git push ${quote(upstream.slice(0, slash))} ${quote(`${ref}:refs/heads/${upstream.slice(slash + 1)}`)}` : undefined
	})

const shipCommand = Effect.fn('mw.ship')(function* (id: number) {
	const store = yield* Store
	const item = store.get(id)!
	const projects = projectsPath(store.path)
	// Ruling 19: without a ship command of its own, the project ships by pushing the branch to its upstream, or once it is on main.
	const command = projectFor(yield* readProjects(projects), item.workspace)?.ship ?? (yield* pushCommand(item.workspace, item.merged!.ref))
	if (!command) {
		removeHome(itemHome(store.path, id))
		const output = `On ${item.merged!.ref.replace('refs/heads/', '')}; the project has no ship command and the branch no upstream to push to.`
		return void store.save({ ...item, status: 'shipped', shipped: { command: '', output, main: item.merged!.commit } }, 'shipped', { command: '', output, main: item.merged!.commit })
	}
	const env = { ...process.env, MW_ITEM: String(id), MW_TITLE: item.title, MW_KIND: item.kind ?? 'feature', MW_COMMIT: item.merged!.commit }
	store.note(id, 'ship-started', { command, main: item.merged!.commit })
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
	const profile = stepOf(L(store.get(id)!), job).profile
	const pickingUp = kind === 'execute'
		? `The ${profile}'s previous run of this job, on ${card.harness} · ${card.model}, stopped at a usage limit (${limit.message}). You are picking up the same job${isMaker(job) ? ': your checkout holds the work it had done. Continue from there; do not repeat it.' : '.'}`
		: t.pickingUp
	saveTrack(store, id, job, { pickingUp }, 'quota-swap', { kind, job, from: card, account: limit.account, resetsAt: new Date(resetsAt).toISOString(), message: limit.message })
})

/**
 * Every error in a receiver's call (a failed launch, a refused answer, a broken rule, a prepare that failed) is
 * the receiver's question to whoever handed it the work, and counts as one NQ turn: the originator answers, the
 * receiver confirms or asks, and a third answered turn that still leaves an error or a question holds the item.
 * An originator's own failed call has nobody above it in the exchange: it is retried, and holds after three.
 */
const launchFailed = Effect.fn('mw.launchFailed')(function* (id: number, job: Job, kind: WorkerRequest['kind'], card: Card, error: string, evidence: Record<string, unknown> = {}, patch: Partial<Track> = {}) {
	const store = yield* Store
	const item = store.get(id)!
	const t = trackOf(item, job)
	const x = t.exchange
	if (kind !== 'originator' && x) {
		const receiver = stepOf(L(item), job).profile
		const question = `My ${kind === 'intake' ? 'intake' : job} call failed, so I could not ${kind === 'intake' ? 'confirm the hand-off' : `do the ${job} job`}: ${error}`
		const answered = x.turns.filter((turn) => turn.answer !== undefined).length
		const asked: Exchange = { ...x, status: 'awaiting-originator', turns: [...x.turns, { understanding: x.understanding ?? '', questions: [question] }] }
		const context = { job, receiver, originator: profileOf(item, x.from), questions: [question], turns: x.turns, card, ...evidence }
		if (answered >= MAX_TURNS) return holdTurns(store, withTrack(item, job, { ...t, ...patch, exchange: asked }), job, context)
		saveTrack(store, id, job, { ...patch, launches: 0, exchange: asked }, 'nq-question', { job, receiver, originator: profileOf(item, x.from), questions: [question], error: true, card, ...evidence })
		return
	}
	const launches = t.launches + 1
	if (launches < MAX_LAUNCHES) {
		saveTrack(store, id, job, { ...patch, launches }, 'launch-failed', { job, card, error, ...evidence })
		return
	}
	hold(store, withTrack(item, job, { ...t, ...patch, launches }), 'worker_failing', `A call for the ${job} job failed ${launches} times in a row on ${card.harness} · ${card.model}.`, { job, card, lastError: error, ...evidence })
})

/**
 * Three answered turns and the receiver still asks: the hand-off, its scope or its provisioning is wrong. The operator decides;
 * in full autonomy the delegating agent decides once by the rubric instead, and running out of turns again holds.
 */
const holdTurns = (store: StoreService, item: Item, job: Job, context: Record<string, unknown>) => {
	const x = trackOf(item, job).exchange
	if (auto(item) && x && !x.decided) {
		return void store.save(withTrack(item, job, { ...trackOf(item, job), launches: 0, exchange: { ...x, status: 'awaiting-originator', deciding: true } }), 'nq-deciding', { job, originator: profileOf(item, x.from), questions: x.turns.at(-1)?.questions ?? [] })
	}
	const why = context.repeated ? `asks again what was already asked ${MAX_TURNS} times across hand-offs` : `still has questions after ${MAX_TURNS} answered turns`
	return hold(store, item, 'nq_turns', `The ${stepOf(L(item), job).profile} ${why}: the hand-off, its scope or its provisioning is wrong.`, context)
}

/** The items this one builds on that have not shipped; it starts once they have. */
const unshipped = (store: StoreService, item: Item) => (item.after ?? []).filter((id) => store.get(id)?.status !== 'shipped')

/** Whether an item cannot move until the operator acts: something it waits on is held, or was never promoted. */
export const stuck = (store: StoreService, item: Item): boolean => {
	const blocked = (id: number) => ((p) => !p || p.status === 'held' || p.status === 'paused' || p.status === 'candidate' || p.status === 'dropped' || stuck(store, p))(store.get(id))
	// A dropped prerequisite fix releases the item waiting on it (drive runs its checks again); dropped work it builds on does not.
	const fixBlocked = (id: number) => store.get(id)?.status !== 'dropped' && blocked(id)
	return (item.waitsOn !== undefined && fixBlocked(item.waitsOn)) || unshipped(store, item).some(blocked)
}

const openPrerequisite = (store: StoreService, item: Item, answer: string, by: Origin) => {
	const pre = store.create({
		title: `Pre-existing defect blocking #${item.id}`, objective: answer, workspace: item.workspace, job: 'plan', parent: item.id, from: by,
		source: `Found while verifying #${item.id} (${item.title}). The ${profileOf(item, by)}'s ruling: ${answer}\n\nFailure:\n${item.failure ?? ''}`,
		rework: { cause: 'pre-existing', answer }, ...(item.pack ? { pack: item.pack } : {}), ...(item.autonomy ? { autonomy: item.autonomy } : {}),
	})
	store.save({ ...item, status: 'waiting-prerequisite', waitsOn: pre.id, failure: undefined, exchange: undefined, corrections: item.corrections + 1 }, 'ruling', { cause: 'pre-existing', prerequisite: pre.id, by: profileOf(item, by) })
}

// ── The operator's commands ────────────────────────────────────────────────────────────────────────────

/** The commands that move a held item, for the agent reading its status. */
export function nextFor(item: Item): Next[] {
	const id = item.id
	if (item.status === 'paused') {
		const ship = item.hold?.context.next === 'ship'
		return [
			{ run: `mw go ${id}`, why: ship ? 'it merges onto main and ships' : `it goes on to ${String(item.hold?.context.next ?? 'the next step')}` },
			{ run: `mw answer ${id} "<what should change>"`, why: ship ? 'the planner plans again from your words, the change is made again and checked, and it stops here again' : 'it goes on, and the next step receives your words as the operator\'s' },
			{ run: `mw drop ${id}`, why: 'abandon it; nothing of it ships' },
		]
	}
	if (item.status !== 'held') return []
	const code = item.hold!.code
	if (NQ_HOLDS.includes(code)) {
		return [{ run: `mw answer ${id} "<your answer to context.questions>"`, why: 'your answer goes to the receiving agent, which confirms it understands or asks again' }]
	}
	if (CHECK_HOLDS.includes(code)) {
		return (['implementation', 'test', 'pre-existing'] as const).map((cause) => ({ run: `mw answer ${id} --cause ${cause} "<what the responsible party must do>"`, why: { implementation: 'the new code or its plan is wrong: the planner replans', test: 'the check is wrong: the test architect rewrites it', 'pre-existing': 'the defect predates this work: it gets its own fix first' }[cause] }))
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
		if (item.status !== 'held' && item.status !== 'paused') {
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
		if (item.status === 'paused') {
			// Steering at a checkpoint: before the ship, the change itself is what changes; between steps, the next one hears it.
			if (item.hold.context.next === 'ship') {
				store.save({ ...free, job: 'plan', from: { kind: 'operator' }, exchange: undefined, rework: { cause: 'implementation', answer: text }, round: item.round + 1, base: undefined, verification: undefined }, 'ruling', { cause: 'implementation', to: 'plan', by: 'operator', answer: text })
			} else {
				store.save({ ...free, passed: String(item.hold.context.key), steer: text }, 'steered', { job: item.job, answer: text, by: 'operator' })
			}
			return
		}
		if (NQ_HOLDS.includes(item.hold.code)) {
			const job = (item.hold.context.job as Job | undefined) ?? item.job
			const t = trackOf(free, job)
			const x = t.exchange!
			if (item.hold.code === 'nq_turns') {
				// Three turns are spent: the operator's answer corrects the hand-off, and a new exchange judges it from turn one.
				const open = x.turns.at(-1)?.questions ?? []
				const handoff = `${x.handoff}\n\nThe operator's correction, after the exchange on this hand-off ran out of turns with these questions open:\n${open.map((q) => `- ${q}`).join('\n')}\n\n${text}`
				store.save(withTrack(free, job, { ...t, exchange: { from: x.from, handoff, status: 'awaiting-receiver', turns: [] } }), 'nq-corrected', { job, originator: 'operator', answer: text })
				return
			}
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

/**
 * The operator lets an item past its checkpoint (ruling 17), or sends every waiting candidate of a discovery run into delivery.
 * Repeating it before the item stops again changes nothing.
 */
export const go = (id: number) =>
	Effect.gen(function* () {
		const store = yield* Store
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (item.status === 'discovered') return void (yield* promote(id))
		if (item.status !== 'paused') {
			if (store.events(id).findLast((e) => e.kind === 'paused' || e.kind === 'go')?.kind === 'go') return
			return yield* new MadeWellError({ code: 'not_held', message: `Item #${id} is ${item.status}, not stopped at a checkpoint.`, context: { id, status: item.status, job: item.job }, next: [{ run: `mw status ${id}`, why: 'see what it is doing now' }] })
		}
		store.save({ ...released(item), passed: String(item.hold!.context.key) }, 'go', { job: item.job, at: item.hold!.context.key })
	})

/** Releases a held item to run again from where it stopped. Repeating it before the item holds again changes nothing. */
export const retry = (id: number) =>
	Effect.gen(function* () {
		const events = (yield* Store).events(id)
		if (events.slice(events.findLastIndex((e) => e.kind === 'held') + 1).some((e) => e.kind === 'retried')) return
		const { store, item } = yield* held(id)
		if (item.status === 'paused' || NQ_HOLDS.includes(item.hold.code) || CHECK_HOLDS.includes(item.hold.code)) {
			return yield* new MadeWellError({ code: 'answer_required', message: `Item #${id} is waiting on your answer, not a retry.`, context: { id, hold: item.hold }, next: nextFor(item) })
		}
		store.save(released(item), 'retried', { job: item.job })
	})

/**
 * Abandons an item that will never ship: a duplicate, a mistake, work done another way. What it provisioned is torn
 * down, its patches and checks leave Made Well's home, an open prerequisite fix goes with it, and its record stays.
 * The caller holds the runner claim, so no call is in flight on it. Repeating it changes nothing.
 */
export const drop = (id: number): Effect.Effect<void, MadeWellError, Store> =>
	Effect.gen(function* () {
		const store = yield* Store
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (item.status === 'dropped') return
		if (item.status === 'shipped') {
			return yield* new MadeWellError({ code: 'not_droppable', message: `Item #${id} has shipped; its change is on main.`, context: { id, status: item.status }, next: [{ run: `mw start --objective "Revert #${id}: ${item.title}" --source "<why it should go>"`, why: 'take the change back out through the pipeline' }] })
		}
		if (item.waitsOn !== undefined && store.get(item.waitsOn)?.status !== 'shipped') yield* drop(item.waitsOn)
		yield* aftercare(id)
		const now = store.get(id)!
		if (pending(now).length) {
			const h = now.hold!
			return yield* new MadeWellError({ code: 'teardown_failed', message: `Item #${id} was not dropped: ${h.message}`, context: h.context as { cwd: string; failed: unknown[]; records: unknown[] }, next: [...(h.next ?? []), { run: `mw drop ${id}`, why: 'drop it once its resources are torn down' }] })
		}
		removeHome(itemHome(store.path, id))
		endLiveOf(store, id)
		store.save({ ...now, status: 'dropped', hold: undefined }, 'dropped', { from: item.status })
	})

/** Runs the queue: every item that can move, up to `parallel` at once. A held item never stops the others. */
/**
 * Drives every item that can move. With `config.reloading`, once it turns true no new item starts, and the queue
 * returns `reload: true` as soon as the items in flight have each settled, keeping the runner claim for the next build.
 */
export const runQueue = (config: EngineConfig, options: { watch?: boolean; keepClaim?: () => boolean } = {}) =>
	Effect.gen(function* () {
		const store = yield* Store
		yield* store.claimRunner()
		yield* Effect.addFinalizer(() => Effect.sync(() => (options.keepClaim?.() ? undefined : store.releaseRunner())))
		yield* Effect.sync(killOrphans)
		const finished = yield* Queue.unbounded<Item>()
		const running = new Set<number>()
		const results: Item[] = []
		const parallel = config.prescriptions.parallel ?? DEFAULT_PARALLEL
		for (;;) {
			const reloading = config.reloading?.() ?? false
			for (const i of reloading ? [] : store.list()) {
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
				if (reloading) return { items: results, reload: true }
				if (!options.watch) return { items: results, reload: false }
				yield* Effect.sleep(config.pollMs ?? 2000)
				continue
			}
			const done = options.watch || config.reloading ? yield* Effect.raceFirst(Queue.take(finished), Effect.as(Effect.sleep(config.pollMs ?? 2000), undefined)) : yield* Queue.take(finished)
			if (done) {
				running.delete(done.id)
				results.push(done)
			}
		}
	}).pipe(Effect.scoped)

// ── Briefs and packets ─────────────────────────────────────────────────────────────────────────────────

/** What a question of authority needs in full autonomy: only what the machine cannot supply holds. */
const FULL_AUTHORITY = 'Made Well runs in full autonomy: nobody is there to decide, so decide even what the operator\'s source leaves open, by the rubric (a choice that satisfies two of the three governing questions is the answer). Set needsOperator only when the work needs something only the operator has and Made Well cannot supply: a credential, an account, or money.'

const SUBAGENT_RULE = 'If your tools can start another agent, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.'

/**
 * The one brief every call of a cartridge pack carries, identical for every job and kind, so calls share a cached prefix.
 * Packets say who you are. The pack's own brief says what this kind of work needs every agent to know.
 */
const briefOf = (lane: Lane) => [
	'You are an agent in Made Well, a pipeline that takes one work item from ideation through planning and making to a verified, shipped change. Your packet says which profile you are, the job you do, and, under you.replyFormat, the JSON Schema your reply must match. It runs from what every call of this work item shares to what is yours alone.',
	NEUTRAL_HOST,
	[
		'Settle every decision by the experience rubric. Its three governing questions have equal standing:',
		'- Developer experience: What moves us toward a 10× better experience of developing, understanding, inspecting, and recovering the work?',
		'- User experience: What moves us toward a 10× better experience for the person the resulting system serves?',
		'- Agentic experience: What makes agent execution clearer, more efficient, better grounded, and more reliably bounded?',
		'A choice that satisfies two of the three is the answer, and it is what is done. Ideation and planning settle every decision and record it with why; no decision is left for the operator.',
	].join('\n'),
	'Leave no trace. Your working directory is a disposable worktree of the project\'s repository, removed when your call ends: write only there, never in the repository\'s own checkout or anywhere else on the machine. Stop every process you start. Tear down whatever you provision (database branches, dev clones, servers); report anything still standing under "provisioned" as {"kind", "id", "teardown"} and Made Well tears it down. Never commit, branch or push: Made Well alone brings work onto main.',
	'Honor the conventions the project\'s repository already has.',
	...(lane.pack.brief ? [lane.pack.brief] : []),
	'Write in proportion to the work. A small change gets a short deliverable: record a decision only where a real choice was open, in a sentence or two, and never restate what your packet already says.',
	SUBAGENT_RULE,
	'Your final message is ONLY one JSON object that matches you.replyFormat, with that schema\'s properties as its own top-level keys.',
].join('\n\n')

/** The default software pack's brief. */
export const BRIEF = briefOf(laneOf())

const itemFacts = (item: Item) => ({ id: item.id, title: item.title, ...(item.kind ? { kind: item.kind } : {}), objective: item.objective, source: item.source, ...(item.conventions?.length ? { conventions: item.conventions } : {}) })

/** The deliverables a job receives, as its cartridge declares, in lane order. */
const receivedBy = (item: Item, job: Job) =>
	Object.fromEntries(stepOf(L(item), job).receives.flatMap((j) => {
		const d = deliverableOf(item, j)
		return d === undefined ? [] : [[j, d]]
	}))

/** The files the plan names, as they are in the call's checkout: its scope, and the existing files its new ones follow. */
const snapshotFor = (item: Item, job: Job, dir: string) => {
	const plan = planOf(item)
	if (!plan || !stepOf(L(item), job).receives.includes('plan')) return Effect.succeed(undefined)
	const files = [...new Set([...plan.scope, ...(plan.follows ?? []).map((f) => f.follows)])]
	return snapshot(dir, files.filter((f) => !f.endsWith('/') && !/[*?[{]/.test(f) && !f.startsWith('/') && !f.split('/').includes('..')))
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

const whereYouAre = (step: Step) => (step.loop === 'discovery' ? `Made Well's discovery (${step.cartridge})` : `Made Well's delivery lane (${step.cartridge})`)

/** The console's own instructions for its slots: what its machinery does with their deliverables. A cartridge's task follows. */
const TASKS: Partial<Record<Job, string>> = {
	plan: 'Declare the scope: every file the change may touch. Made Well refuses a change outside it, and the test architect may not touch it. For every new file or directory in scope, name under "follows" the existing one in this repo it is modelled on, the same kind of file: the makers receive that file and build in its image, using what it uses. Made Well refuses a plan that creates a kind of file the repo already has without one. The rules this repo\'s work follows are under item.conventions: hold the change to each one with a done-when item its checks prove, and list it under "conventions" with that id, or say why this change cannot touch it. Made Well refuses a plan that leaves one out. Give each done-when item a short unique id; the checks prove them by id. Every done-when item is about this item\'s own change and is provable from it alone: never one that runs or counts the whole test suite, or that pins files outside the scope. Other items ship onto the same branch while this one is in flight, and only this item\'s own checks gate it.',
	'test-plan': 'Write each check\'s files in your checkout, at paths outside the plan\'s scope. Made Well keeps them outside the product repo and runs each check\'s command itself, from the repo root, against the implementer\'s change. Each check proves one done-when item by its id, and every done-when item needs at least one. Your checkout has no implementation; never build one, here or anywhere else, to try your checks. When they run, the implementer\'s change is the last commit (HEAD) on top of the branch the item started from, and your check files sit uncommitted in the working tree beside it: a check that inspects what changed compares HEAD~1 with HEAD, never the working tree. A check proves its done-when item from this item\'s change alone: never run or count the whole test suite, and never pin anything outside the plan\'s scope; other items ship onto the same branch while this one is in flight.',
	implement: 'Change only the files in the plan\'s scope; Made Well takes your change from your checkout. Never write or run checks of your own work: Made Well runs this item\'s checks itself.',
}

/** The arbiter's task: what Made Well does with each cause this lane allows. */
const arbiterTask = (lane: Lane, autonomous: boolean) => [
	`Your checkout holds the implementer's change as its last commit${lane.makers.includes('test-plan') ? ', with the test architect\'s check files applied on top, uncommitted' : ''}. Reproduce the failure if you need to. You rule and change nothing; Made Well routes the work by your cause.`,
	...(lane.makers.includes('test-plan') ? ['test: the test architect corrects the checks from your answer and Made Well runs every check again on the same change.'] : []),
	`implementation: the planner plans again from your answer, ${lane.makers.length > 1 ? 'both makers redo their work' : 'the implementer redoes the change'}, and verification follows.`,
	'pre-existing: a fix item for the defect ships first, then this item\'s checks run again.',
	'environment: the work is not at fault; the worktree, its preparation, a service it needs or the machine failed. Made Well prepares a fresh worktree and runs the checks again.',
	autonomous ? 'Nobody is there to decide for you: name the cause the evidence best supports.' : 'undetermined: the operator decides.',
].join(' ')

const taskOf = (item: Item, job: Job) => {
	const own = job === 'arbitrate' ? arbiterTask(L(item), auto(item)) : TASKS[job]
	const extra = stepOf(L(item), job).task
	return own && extra ? `${own} ${extra}` : own ?? extra
}

const you = (item: Item, job: Job, kind: WorkerRequest['kind']) => {
	const step = stepOf(L(item), job)
	return { profile: step.profile, job, call: kind, where: whereYouAre(step), duty: step.duty }
}

const INTAKE_TASK = (job: Job, originator: string) =>
	`This is intake, before you do the ${job} job: judge this packet alone, and change nothing. You have no tools and no checkout in this call, by design: the ${job} job itself runs later in your own checkout of the repo, with your tools. State your understanding in one or two sentences: what was handed to you and what you must deliver. Then answer the three questions. What is unclear? What is ambiguous? Do I have everything I need to proceed? A question is only what the ${originator} must answer from its hand-off before you can do the job: the hand-off contradicts itself, leaves out something only its sender knows, or asks for something your job cannot decide. Each one goes to the ${originator}. Never a question: a decision your own job settles (your duty says what you decide: settle it in the job by the three governing questions), anything you will read in the repo yourself, file access or a checkout, a reading you can state and act on, or a request to confirm. An assumption you will act on is a note, one line each: notes travel with the work and do not block it. Never repeat a question already answered in earlier turns. Empty lists confirm you are ready. Reply now with the intake object described by you.replyFormat, even after your questions are answered. The ${job} job's own deliverable, described by you.laterDeliverable, is for a later call: do not return it now.`

const handoffView = (item: Item, job: Job, x: Exchange) =>
	x.from.kind === 'job' && stepOf(L(item), job).receives.includes(x.from.job) && x.handoff === item.outputs[x.from.job]
		? `The ${profileOf(item, x.from)}'s deliverable, under received.${x.from.job}.`
		: x.handoff

const receiverParts = (item: Item, job: Job, x: Exchange, kind: 'intake') => ({
	you: { ...you(item, job, kind), task: INTAKE_TASK(job, profileOf(item, x.from)), laterDeliverable: deliverableShape(L(item), job, auto(item)), replyFormat: shapeOf(INTAKE) },
	...jobEvidence(item, job),
	handoff: { from: profileOf(item, x.from), content: handoffView(item, job, x) },
	earlierTurns: x.turns,
	round: item.round,
	...(trackOf(item, job).rejected ? { yourLastAnswerWasRefused: trackOf(item, job).rejected } : {}),
})

/** What a job judges beyond its hand-off, the same at intake and in the job: the arbiter gets Made Well's whole run of the checks. */
const jobEvidence = (item: Item, job: Job) =>
	job === 'arbitrate' && item.verification ? { verification: { on: item.verification.on, results: item.verification.results }, change: item.change, checks: item.checks } : {}

const originatorParts = (item: Item, job: Job, x: Exchange) => ({
	you: {
		profile: profileOf(item, x.from), call: 'originator',
		task: x.deciding
			? `You handed this work over as the ${profileOf(item, x.from)}. The ${stepOf(L(item), job).profile} still has the questions below after ${MAX_TURNS} answered turns, and Made Well runs in full autonomy: nobody else will answer. You hold the context, so you decide. Settle each question by the standing rubric: what gets us closer to a 10× developer experience, a 10× user experience and a 10× agentic experience; a choice that satisfies two of the three is the answer. Say each decision and why, plainly enough that the ${stepOf(L(item), job).profile} can act on it without asking again. Never change the work's objective. Leave needsOperator false.`
			: `You handed this work over as the ${profileOf(item, x.from)}. The ${stepOf(L(item), job).profile} asked questions before it does the ${job} job. Answer each from your hand-off and the source: clarify what you handed over; never change your hand-off or the work. A question about a decision is settled by the three governing questions; say what they decide and why. ${auto(item) ? FULL_AUTHORITY : 'Set needsOperator only for authority the source leaves open: destructive or irreversible actions, production beyond this item\'s own ship, money, credentials, or anything outside the workspace.'} Shipping this item, its deploy included, is already authorized.`,
		replyFormat: shapeOf(ORIGINATOR),
	},
	yourHandoff: x.from.kind === 'job' && x.handoff === item.outputs[x.from.job] ? deliverableOf(item, x.from.job) : x.handoff,
	receiver: stepOf(L(item), job).profile,
	receiverUnderstanding: x.turns.at(-1)!.understanding,
	questions: x.turns.at(-1)!.questions,
	earlierTurns: x.turns.slice(0, -1),
})

const executeParts = (item: Item, job: Job, t: Track, x: Exchange) => ({
	you: { ...you(item, job, 'execute'), ...(taskOf(item, job) ? { task: taskOf(item, job) } : {}), replyFormat: deliverableShape(L(item), job, auto(item)) },
	...jobEvidence(item, job),
	exchange: { from: profileOf(item, x.from), handoff: handoffView(item, job, x), turns: x.turns, understanding: x.understanding, notes: x.notes },
	...(item.outputs[job] !== undefined && item.rework ? { yourPreviousDeliverable: deliverableOf(item, job) } : {}),
	round: item.round,
	...(t.rejected ? { yourLastAnswerWasRefused: t.rejected } : {}),
	...(t.pickingUp ? { pickingUp: t.pickingUp } : {}),
})
