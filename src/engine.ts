// Drives work items through the delivery lane.
//
// The item is the durable thing: every transition is saved before the next call, so killing the process
// at any point loses at most the call in flight, and `mw run` resumes it.
//
// Every agent-to-agent hand-off is an NQ exchange. The receiver states its understanding and either
// confirms or asks. The originator answers, and each answer is one turn. After three turns with
// questions still open, the item holds for the operator. Covered hand-offs:
//   dispatcher → first job · job → next job · failing job → arbiter · arbiter → the job it rules
//   responsible · operator → the job it routes to · a replacement agent after a usage-limit swap.
//
// Usage limits never stop the work. The call moves to the next card on another account, and when every
// account is out, the item waits for the earliest reset and carries on by itself.
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Clock, Effect } from 'effect'
import { cardsFor, pickCard, type Card, type Prescriptions } from './cards.ts'
import { MadeWellError, type Next } from './errors.ts'
import { DELIVERY, ENDS_WITH, lastJson, route, stepOf, type Cause, type Job } from './lane.ts'
import { Store, type Exchange, type Item, type Origin } from './store.ts'
import { Worker, type UsageLimit, type WorkerRequest } from './worker.ts'

export const MAX_LAUNCHES = 3
export const MAX_TURNS = 3
const UNKNOWN_RESET_MS = 60 * 60_000
const MIN_OUT_MS = 5 * 60_000
const NQ_HOLDS = ['nq_turns', 'question_for_operator', 'authority']
const CHECK_HOLDS = ['arbiter_undetermined', 'too_many_corrections']

export interface EngineConfig {
	readonly prescriptions: Prescriptions
	/** How long an idle `mw run --watch` waits before looking at the queue again. */
	readonly pollMs?: number
}

type Services = Store | Worker

const notFound = (id: number) =>
	new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item and its state' }] })

export const profileOf = (o: Origin) => (o.kind === 'job' ? stepOf(o.job).profile : o.kind)

/** What the originator hands over to the current job. */
function handoffOf(item: Item): string {
	if (item.job === 'arbitrate') return item.failure ?? ''
	if (item.from.kind === 'dispatcher') return `Objective: ${item.objective}\n\nThe operator's source:\n${item.source}`
	if (item.rework) return `Ruling (${item.rework.cause}): ${item.rework.answer}`
	return item.from.kind === 'job' ? (item.outputs[item.from.job] ?? '') : ''
}

/** Drives one item until it ships, holds for the operator, or waits on a prerequisite that holds. */
export const drive = Effect.fn('mw.drive')(function* (id: number, config: EngineConfig): Effect.fn.Return<Item, MadeWellError, Services> {
	const store = yield* Store
	yield* Effect.annotateCurrentSpan({ item: id })
	for (;;) {
		const item = store.get(id)
		if (!item) return yield* notFound(id)
		if (item.status === 'held' || item.status === 'shipped') return item

		if (item.waitsOn !== undefined) {
			const pre = yield* drive(item.waitsOn, config)
			if (pre.status !== 'shipped') return store.get(id)!
			// The prerequisite fix shipped: run this item's checks again, handed over afresh.
			store.save({ ...item, waitsOn: undefined, status: 'running', job: 'verify', exchange: undefined, launches: 0 }, 'prerequisite-shipped', { prerequisite: pre.id })
			continue
		}

		store.runnerOn(id)
		const x = item.exchange
		if (!x) {
			store.save({ ...item, exchange: { from: item.from, handoff: handoffOf(item), status: 'awaiting-receiver', turns: [] } }, 'handoff', { from: profileOf(item.from), to: stepOf(item.job).profile, job: item.job })
		} else if (x.status === 'awaiting-receiver') {
			yield* intake(item, x, config)
		} else if (x.status === 'awaiting-originator') {
			yield* originate(item, x, config)
		} else {
			yield* execute(item, x, config)
		}
	}
})

/** The receiver states its understanding and either confirms or asks. Read-only. */
const intake = Effect.fn('mw.intake')(function* (item: Item, x: Exchange, config: EngineConfig) {
	const store = yield* Store
	const step = stepOf(item.job)
	const call = yield* callAgent(item.id, config, item.job, {
		kind: 'intake', job: item.job, profile: step.profile, access: 'read', system: INTAKE_SYSTEM(item.job), prompt: intakePacket(item, x),
	})
	const current = store.get(item.id)!
	if (call.retry) return
	const reply = lastJson(call.output)
	const questions = Array.isArray(reply?.questions) ? reply.questions.filter((q): q is string => typeof q === 'string' && q.trim() !== '') : undefined
	if (typeof reply?.understanding !== 'string' || !questions) {
		return yield* launchFailed(current, call.card, 'The intake did not end with {"understanding": string, "questions": string[], "notes": string[]}.')
	}
	const notes = Array.isArray(reply.notes) ? reply.notes.filter((n): n is string => typeof n === 'string') : []
	if (!questions.length) {
		store.save({ ...current, launches: 0, exchange: { ...x, status: 'clear', understanding: reply.understanding, notes, card: call.card } }, 'nq-clear', { job: item.job, profile: step.profile, card: call.card })
		return
	}
	const asked = { ...x, status: 'awaiting-originator' as const, turns: [...x.turns, { understanding: reply.understanding, questions }] }
	const answered = x.turns.filter((t) => t.answer !== undefined).length
	const context = { job: item.job, receiver: step.profile, originator: profileOf(x.from), questions, turns: x.turns }
	if (answered >= MAX_TURNS) {
		return hold(store, { ...current, exchange: asked }, 'nq_turns', `The ${step.profile} still has questions after ${answered} answered turns: the hand-off or its scope is wrong.`, context)
	}
	if (x.from.kind === 'operator' || x.turns.at(-1)?.by === 'operator') {
		return hold(store, { ...current, exchange: asked }, 'question_for_operator', `The ${step.profile} has questions about your answer before it can ${item.job}.`, context)
	}
	store.save({ ...current, launches: 0, exchange: asked }, 'nq-question', { job: item.job, receiver: step.profile, originator: profileOf(x.from), questions })
})

/** The originator answers the receiver's questions from its own hand-off. Read-only. */
const originate = Effect.fn('mw.originate')(function* (item: Item, x: Exchange, config: EngineConfig) {
	const store = yield* Store
	const from = profileOf(x.from)
	const call = yield* callAgent(item.id, config, x.from.kind === 'job' ? x.from.job : 'ideate', {
		kind: 'originator', job: item.job, profile: from, access: 'read', system: ORIGINATOR_SYSTEM(x.from), prompt: originatorPacket(item, x),
	})
	const current = store.get(item.id)!
	if (call.retry) return
	const reply = lastJson(call.output)
	if (typeof reply?.answer !== 'string' || !reply.answer.trim()) {
		return yield* launchFailed(current, call.card, 'The originator did not end with {"answer": string, "needsOperator": boolean}.')
	}
	const turns = x.turns.map((t, i) => (i === x.turns.length - 1 ? { ...t, answer: reply.answer as string, by: 'originator' as const } : t))
	if (reply.needsOperator === true) {
		const pending = x.turns.at(-1)!
		return hold(store, current, 'authority', `Only the operator can settle what the ${stepOf(item.job).profile} asked.`, { job: item.job, receiver: stepOf(item.job).profile, originator: from, questions: pending.questions, originatorSays: reply.answer })
	}
	store.save({ ...current, launches: 0, exchange: { ...x, status: 'awaiting-receiver', turns } }, 'nq-answer', { job: item.job, originator: from })
})

/** The receiver, clear on its hand-off, does the job on the card it confirmed with. */
const execute = Effect.fn('mw.execute')(function* (item: Item, x: Exchange, config: EngineConfig) {
	const store = yield* Store
	const step = stepOf(item.job)
	const now = yield* Clock.currentTimeMillis
	if (!x.card || (store.exhausted()[x.card.account] ?? 0) > now) {
		// A different card is a different agent: it receives the work through NQ too. A swap uses up no turn.
		store.save({ ...item, exchange: { ...x, status: 'awaiting-receiver', card: undefined } }, 'nq-replacement', { job: item.job, from: x.card ?? null })
		return
	}
	const call = yield* callAgent(item.id, config, item.job, {
		kind: 'execute', job: item.job, profile: step.profile, access: config.prescriptions.jobs[item.job].access, system: EXECUTE_SYSTEM(item.job), prompt: executePacket(item, x),
	}, x.card)
	if (call.retry) return
	const current = store.get(item.id)!
	const r = route(item.job, call.output, current.corrections)
	const accepted = { outputs: { ...current.outputs, [item.job]: call.output }, launches: 0, pickingUp: undefined, exchange: undefined } as const
	const by: Origin = { kind: 'job', job: item.job }
	switch (r.to) {
		case 'next': {
			// A bad test is corrected and run again; the valid implementation is not rebuilt.
			const job = item.job === 'test-plan' && current.rework?.cause === 'test' ? 'verify' : r.job
			store.save({ ...current, ...accepted, job, from: by, rework: undefined }, 'handed-off', { from: item.job, to: job })
			return
		}
		case 'arbitrate':
			store.save({ ...current, ...accepted, job: 'arbitrate', from: by, failure: r.failure }, 'failure', { from: item.job })
			return
		case 'rework':
			store.save({ ...current, ...accepted, job: r.job, from: by, rework: { cause: r.cause, answer: r.answer }, failure: undefined, round: current.round + 1, corrections: current.corrections + 1 }, 'ruling', { cause: r.cause, to: r.job, by: 'arbiter' })
			return
		case 'prerequisite':
			openPrerequisite(store, { ...current, ...accepted, from: by }, r.answer, by)
			return
		case 'hold':
			return hold(store, { ...current, ...accepted }, r.code, r.message, { job: item.job, failure: current.failure ?? null, ruling: call.output })
		case 'malformed':
			return yield* launchFailed(current, x.card!, `The answer did not end with the required JSON: ${r.expected}`)
		case 'ship':
			return yield* ship(store.save({ ...current, ...accepted, from: by }, 'verified', {}))
	}
})

/**
 * One agent call on a card of `tierJob`'s tier, preferring `pinned`. Waits when every account is out.
 * A usage limit or a failed launch is recorded and comes back as { retry: true }: the drive loop
 * re-reads the item and goes again, so every recovery path is the same path.
 */
const callAgent = Effect.fn('mw.call')(function* (id: number, config: EngineConfig, tierJob: Job, request: Omit<WorkerRequest, 'item' | 'card' | 'cwd'>, pinned?: Card) {
	const store = yield* Store
	const worker = yield* Worker
	const card = pinned ?? (yield* pickOrWait(id, config, tierJob))
	const item = store.get(id)!
	const result = yield* worker
		.run({ ...request, item: id, card, cwd: item.workspace })
		.pipe(Effect.withSpan(`mw.${request.kind}.${request.job}`, { attributes: { item: id, job: request.job, kind: request.kind, profile: request.profile, harness: card.harness, model: card.model, account: card.account } }))
	if (result.ok) return { retry: false, output: result.output, card } as const
	if ('limit' in result) yield* recordLimit(store.get(id)!, card, result.limit, request)
	else yield* launchFailed(store.get(id)!, card, result.error)
	return { retry: true } as const
})

const pickOrWait = Effect.fn('mw.pickOrWait')(function* (id: number, config: EngineConfig, job: Job) {
	const store = yield* Store
	for (;;) {
		const item = store.get(id)!
		const now = yield* Clock.currentTimeMillis
		const picked = pickCard(cardsFor(config.prescriptions, job), store.exhausted(), now)
		if (picked.card) {
			if (item.status !== 'running') store.save({ ...item, status: 'running', resetsAt: undefined }, 'running', { job: item.job })
			return picked.card
		}
		if (item.status !== 'waiting-quota' || item.resetsAt !== picked.resetsAt) {
			store.save({ ...item, status: 'waiting-quota', resetsAt: picked.resetsAt }, 'waiting-quota', { job, resetsAt: new Date(picked.resetsAt).toISOString() })
		}
		yield* Effect.sleep(Math.max(0, picked.resetsAt - now))
	}
})

const recordLimit = Effect.fn('mw.recordLimit')(function* (item: Item, card: Card, limit: UsageLimit, request: Omit<WorkerRequest, 'item' | 'card' | 'cwd'>) {
	const store = yield* Store
	const at = yield* Clock.currentTimeMillis
	const resetsAt = Math.max(limit.resetsAt ?? at + UNKNOWN_RESET_MS, at + MIN_OUT_MS)
	for (const account of new Set([limit.account, card.account])) store.markExhausted(account, resetsAt)
	const pickingUp = request.kind === 'execute'
		? `The ${request.profile}'s previous run of this job, on ${card.harness} · ${card.model}, stopped at a usage limit (${limit.message}). You are picking up the same job: inspect the workspace for work already done before repeating any of it.`
		: item.pickingUp
	store.save({ ...item, pickingUp }, 'quota-swap', { kind: request.kind, job: request.job, from: card, account: limit.account, resetsAt: new Date(resetsAt).toISOString(), message: limit.message })
})

const launchFailed = Effect.fn('mw.launchFailed')(function* (item: Item, card: Card, error: string) {
	const store = yield* Store
	const launches = item.launches + 1
	if (launches < MAX_LAUNCHES) {
		store.save({ ...item, launches }, 'launch-failed', { job: item.job, card, error })
		return
	}
	hold(store, { ...item, launches }, 'worker_failing', `A call for the ${item.job} job failed ${launches} times in a row on ${card.harness} · ${card.model}.`, { job: item.job, card, lastError: error })
})

const openPrerequisite = (store: Store['Service'], item: Item, answer: string, by: Origin) => {
	const pre = store.create({
		title: `Pre-existing defect blocking #${item.id}`, objective: answer, workspace: item.workspace, job: 'plan', parent: item.id, from: by,
		source: `Found while verifying #${item.id} (${item.title}). The ${profileOf(by)}'s ruling: ${answer}\n\nFailure:\n${item.failure ?? ''}`,
		rework: { cause: 'pre-existing', answer },
	})
	store.save({ ...item, status: 'waiting-prerequisite', waitsOn: pre.id, failure: undefined, exchange: undefined, corrections: item.corrections + 1 }, 'ruling', { cause: 'pre-existing', prerequisite: pre.id, by: profileOf(by) })
}

const hold = (store: Store['Service'], item: Item, code: string, message: string, context: Record<string, unknown>) =>
	void store.save({ ...item, status: 'held', hold: { code, message, context } }, 'held', { code, message })

/** Verification passed: ship it with the project's own command. */
const ship = Effect.fn('mw.ship')(function* (item: Item) {
	const store = yield* Store
	const config = join(item.workspace, 'madewell.json')
	let command: string | undefined
	try {
		command = (JSON.parse(readFileSync(config, 'utf8')) as { ship?: string }).ship
	} catch {}
	if (!command) return hold(store, item, 'no_ship_command', `Item #${item.id} passed verification, but its workspace has no ship command.`, { workspace: item.workspace, config })
	const { code, stdout, stderr } = yield* Effect.promise(
		() => new Promise<{ code: number; stdout: string; stderr: string }>((done) => execFile('sh', ['-c', command], { cwd: item.workspace, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => done({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr }))),
	)
	const tail = (s: string) => s.slice(-4000)
	if (code !== 0) return hold(store, item, 'ship_failed', `Item #${item.id} passed verification, but its ship command failed with exit code ${code}.`, { workspace: item.workspace, command, exitCode: code, stdout: tail(stdout), stderr: tail(stderr) })
	store.save({ ...item, status: 'shipped', shipped: { command, output: tail(stdout) } }, 'shipped', { command })
})

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
		return [
			{ run: `printf '{"ship": "git push origin HEAD:main"}\\n' > ${join(item.workspace, 'madewell.json')}`, why: 'tell Made Well how this project ships (merge to main, deploy, or both)' },
			{ run: `mw retry ${id}`, why: 'verify again and ship' },
		]
	}
	if (code === 'ship_failed') return [{ run: `mw retry ${id}`, why: 'after fixing what context.stderr shows: verify again and ship' }]
	return [
		{ run: `mw show ${id}`, why: 'read the failing call\'s last error and the events before it' },
		{ run: `mw retry ${id}`, why: 'run the held call again from where it stopped' },
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

/** The operator answers a hold: a question goes back to the receiving agent; a failed check is routed by its cause. */
export const answer = (id: number, text: string, cause?: Cause) =>
	Effect.gen(function* () {
		const { store, item } = yield* held(id)
		const released = { ...item, status: 'queued' as const, hold: undefined, launches: 0 }
		if (NQ_HOLDS.includes(item.hold.code)) {
			const x = item.exchange!
			const turns = x.turns.map((t, i) => (i === x.turns.length - 1 ? { ...t, answer: text, by: 'operator' as const } : t))
			store.save({ ...released, exchange: { ...x, status: 'awaiting-receiver', turns } }, 'nq-answer', { job: item.job, originator: 'operator' })
			return
		}
		if (!CHECK_HOLDS.includes(item.hold.code)) {
			return yield* new MadeWellError({ code: 'not_answerable', message: `Item #${id} holds on ${item.hold.code}, which an answer does not resolve.`, context: { id, hold: item.hold }, next: nextFor(item) })
		}
		if (!cause) return yield* new MadeWellError({ code: 'cause_required', message: `Item #${id} holds on a failed check; the answer must name its cause.`, context: { id, hold: item.hold }, next: nextFor(item) })
		const operator: Origin = { kind: 'operator' }
		if (cause === 'pre-existing') return openPrerequisite(store, { ...released, from: operator }, text, operator)
		const job: Job = cause === 'test' ? 'test-plan' : 'plan'
		store.save({ ...released, job, from: operator, exchange: undefined, rework: { cause, answer: text }, failure: undefined, round: item.round + 1, corrections: item.corrections + 1 }, 'ruling', { cause, to: job, by: 'operator' })
	})

export const retry = (id: number) =>
	Effect.gen(function* () {
		const { store, item } = yield* held(id)
		if (NQ_HOLDS.includes(item.hold.code) || CHECK_HOLDS.includes(item.hold.code)) {
			return yield* new MadeWellError({ code: 'answer_required', message: `Item #${id} is waiting on your answer, not a retry.`, context: { id, hold: item.hold }, next: nextFor(item) })
		}
		store.save({ ...item, status: 'queued', hold: undefined, launches: 0 }, 'retried', { job: item.job })
	})

/** Runs the queue: oldest first. A held item never stops the others. */
export const runQueue = (config: EngineConfig, options: { watch?: boolean } = {}) =>
	Effect.gen(function* () {
		const store = yield* Store
		yield* store.claimRunner()
		yield* Effect.addFinalizer(() => Effect.sync(() => store.releaseRunner()))
		const results: Item[] = []
		for (;;) {
			const ready = store.list().find((i) => i.parent === undefined && i.status !== 'held' && i.status !== 'shipped')
			if (ready) {
				results.push(yield* drive(ready.id, config))
				continue
			}
			store.runnerOn(null)
			if (!options.watch) return results
			yield* Effect.sleep(config.pollMs ?? 2000)
		}
	}).pipe(Effect.scoped)

const SUBAGENT_RULE = 'If your tools can start another agent, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.'

const INTAKE_SYSTEM = (job: Job) => {
	const step = stepOf(job)
	return `You are the ${step.profile}, about to do the ${job} job in Made Well's delivery lane (${step.stage}): ${step.duty}
This is read-only intake before you execute: change nothing yet. State your understanding of what was handed to you and what you must deliver. Ask only questions that block you and that the packet, the workspace and earlier answers cannot settle; never repeat an answered question. Assumptions and settled points are notes; notes never block.
Return ONLY a JSON object: {"understanding": string, "questions": string[], "notes": string[]}. An empty questions array confirms you are ready.`
}

const ORIGINATOR_SYSTEM = (from: Origin) =>
	`${from.kind === 'dispatcher'
		? 'You are the dispatcher, who handed this work item to Made Well for the operator. Answer from the objective and the operator\'s source only.'
		: `You are the ${profileOf(from)}, who handed over this work. Answer from your hand-off and the source.`}
The receiving agent asked questions before executing. Clarify what you handed over; never change your hand-off or the work, and never invent operator authority. If only the operator can answer, set needsOperator to true and say exactly what they must decide.
Return ONLY a JSON object: {"answer": string, "needsOperator": boolean}.`

const EXECUTE_SYSTEM = (job: Job) => {
	const step = stepOf(job)
	const ends = ENDS_WITH[job]
	return [
		`You are the ${step.profile}, doing the ${job} job in Made Well's delivery lane (${step.stage}). ${step.duty}`,
		'Your packet holds the work item, the deliverables accepted from earlier jobs, and the NQ exchange of your hand-off: what was handed to you, your questions and their answers. Honor the workspace\'s own instructions. Report tangible results and evidence.',
		SUBAGENT_RULE,
		ends ? `End your answer with ONLY a JSON object on its own line: ${ends}.` : '',
	].filter(Boolean).join('\n\n')
}

const itemFacts = (item: Item) => ({ id: item.id, title: item.title, objective: item.objective, source: item.source, workspace: item.workspace, round: item.round })

const acceptedBefore = (item: Item) => {
	const before = item.job === 'arbitrate' ? DELIVERY : DELIVERY.slice(0, DELIVERY.findIndex((s) => s.job === item.job))
	return Object.fromEntries(before.filter((s) => item.outputs[s.job] !== undefined).map((s) => [s.job, item.outputs[s.job]]))
}

const intakePacket = (item: Item, x: Exchange) =>
	JSON.stringify({ item: itemFacts(item), handoff: { from: profileOf(x.from), content: x.handoff }, accepted: acceptedBefore(item), earlierTurns: x.turns, ...(item.pickingUp ? { pickingUp: item.pickingUp } : {}) }, null, 2)

const originatorPacket = (item: Item, x: Exchange) =>
	JSON.stringify({ item: itemFacts(item), yourHandoff: x.handoff, receiver: stepOf(item.job).profile, questions: x.turns.at(-1)!.questions, receiverUnderstanding: x.turns.at(-1)!.understanding, earlierTurns: x.turns.slice(0, -1) }, null, 2)

const executePacket = (item: Item, x: Exchange) =>
	JSON.stringify({
		item: itemFacts(item),
		accepted: acceptedBefore(item),
		exchange: { from: profileOf(x.from), handoff: x.handoff, turns: x.turns, understanding: x.understanding, notes: x.notes },
		...(item.outputs[item.job] !== undefined && item.rework ? { yourPreviousDeliverable: item.outputs[item.job] } : {}),
		...(item.pickingUp ? { pickingUp: item.pickingUp } : {}),
	}, null, 2)


