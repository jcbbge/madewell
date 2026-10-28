// The open cartridge runtime. The engine still owns NQ, quota, scheduling and saved-state recovery.
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { conforms, laneOf, lastJson, problemsOf, validate, type Pack, type Step } from './lane.ts'
import { Store, type Item } from './store.ts'
import { observe } from './trace.ts'
import { runGroup } from './worker.ts'

export const functionInput = (item: Item, step: Step) => ({
	item: { id: item.id, title: item.title, objective: item.objective, source: item.source },
	args: step.args ?? {},
	...(item.steer ? { operatorNote: item.steer } : {}),
	received: Object.fromEntries(step.receives.map((job) => [job, lastJson(item.outputs[job] ?? '')])),
})

const failed = (item: Item, job: string, reason: string) => new MadeWellError({
	code: 'function_failed', message: `Function ${job || '(empty flow)'} could not complete: ${reason}`,
	context: { id: item.id, job, reason },
	next: [{ run: `mw trace ${item.id} --lens ax`, why: 'inspect the recorded input, output and failure before retrying' }, { run: `mw retry ${item.id}`, why: 'after fixing the cause, resume without repeating accepted nodes' }],
})

const flowOf = (item: Item) => item.flow ?? { loop: 'delivery' as const, accepted: [] }

/** Queue an explicit update, never mutate a call already executing or rewrite accepted evidence. */
export const requestPackUpdate = Effect.fn('mw.requestPackUpdate')(function* (id: number, pack: Pack) {
	const store = yield* Store
	const item = store.get(id)
	if (!item) return yield* new MadeWellError({ code: 'item_not_found', message: `No item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'find the work item' }] })
	const problems = problemsOf(pack)
	if (item.pack?.runtime !== 'functions' || pack.runtime !== 'functions') problems.push('Live updates require function packs on both sides; software runs retain their pinned pack.')
	if (['completed', 'shipped', 'discovered', 'dropped'].includes(item.status)) problems.push('This run has ended. Start a new run with the new pack.')
	const flow = flowOf(item)
	const before = laneOf(item.pack)[flow.loop]
	const after = laneOf(pack)[flow.loop]
	const inFlight = item.exchange || store.events(id).some((e) => e.kind === 'trace-started' && e.data.job === item.job && !flow.accepted.includes(item.job))
	const frozen = flow.accepted.length + (inFlight ? 1 : 0)
	for (let i = 0; i < frozen; i++) if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) problems.push(`Keep accepted/in-flight node ${before[i]?.job} unchanged and in place.`)
	if (problems.length) return yield* new MadeWellError({ code: 'cartridges_invalid', message: 'This cartridge update cannot be applied.', context: { path: `item:${id}`, problems }, next: [{ run: `mw trace ${id} --lens ax`, why: 'inspect the pinned pack and accepted calls' }] })
	store.note(id, 'cartridges-requested', { pack })
	return { item: id, state: 'pending', applies: 'at the next node boundary; accepted and in-flight nodes stay unchanged' }
})

/** Save each accepted output before choosing or invoking the next node. */
export function acceptFunction(store: Store['Service'], id: number, step: Step, output: string) {
	const item = store.get(id)!
	const flow = flowOf(item)
	const accepted = [...flow.accepted, step.job]
	const next = laneOf(item.pack)[flow.loop][accepted.length]
	store.save({ ...item, status: 'running', outputs: { ...item.outputs, [step.job]: output },
		flow: { ...flow, accepted }, job: next?.job ?? '', from: { kind: 'job', job: step.job },
		exchange: undefined, launches: 0, rejected: undefined, pickingUp: undefined, steer: undefined,
	}, 'accepted', { job: step.job, output: lastJson(output), next: next?.job ?? null })
}

const Candidates = Schema.Struct({ items: Schema.Array(Schema.Struct({ title: Schema.NonEmptyString, objective: Schema.NonEmptyString, text: Schema.optionalKey(Schema.String) })) })

/** Returns an agent step for the existing NQ machinery, or executes one deterministic function. */
export const advanceFunctions = Effect.fn('mw.advanceFunctions')(function* (given: Item) {
	const store = yield* Store
	let item = given
	let flow = flowOf(item)
	const update = store.events(item.id).findLast((e) => e.kind === 'cartridges-requested' && e.seq > (flow.update ?? 0))
	if (update && !item.exchange) {
		const pack = update.data.pack as Pack
		// Requests were validated against the completed/in-flight prefix. A boundary may have advanced since then.
		const before = laneOf(item.pack)[flow.loop]
		const after = laneOf(pack)[flow.loop]
		const attempted = store.events(item.id).some((e) => e.kind === 'trace-started' && e.data.job === item.job && !flow.accepted.includes(item.job))
		const frozen = flow.accepted.length + (attempted ? 1 : 0)
		if (before.slice(0, frozen).every((node, i) => JSON.stringify(node) === JSON.stringify(after[i]))) {
			flow = { ...flow, update: update.seq }
			item = store.save({ ...item, pack, flow, job: after[flow.accepted.length]?.job ?? '' }, 'cartridges-applied', { request: update.seq, from: item.pack, to: pack })
		} else {
			flow = { ...flow, update: update.seq }
			item = store.save({ ...item, flow }, 'cartridges-rejected', { request: update.seq, reason: 'The accepted prefix advanced; submit an update preserving it.' })
		}
	}
	const steps = laneOf(item.pack)[flow.loop]
	const step = steps[flow.accepted.length]
	if (!step) {
		const output = lastJson(item.outputs[flow.accepted.at(-1) ?? ''] ?? '') ?? { source: item.source }
		if (flow.loop === 'discovery' && steps.length) {
			const candidates = yield* Schema.decodeUnknownEffect(Candidates)(output).pipe(Effect.mapError((e) => failed(item, 'discovery', String(e))))
			// Creation is durable in order: redrive reuses any prefix saved before interruption.
			const existing = store.list().filter((i) => i.discovery === item.id)
			const ids = candidates.items.map((c, index) => existing[index]?.id ?? store.create({ title: c.title, objective: c.objective, source: c.text ?? item.source, workspace: item.workspace,
				pack: item.pack, autonomy: item.autonomy, discovery: item.id, status: item.autonomy === 'full' ? 'queued' : 'candidate',
				from: { kind: 'dispatcher' }, flow: { loop: 'delivery', accepted: [] },
			}).id)
			store.save({ ...item, status: 'discovered', completion: { output, nodes: flow.accepted.length } }, 'discovered', { candidates: ids })
		} else store.save({ ...item, status: 'completed', completion: { output, nodes: flow.accepted.length } }, 'completed', { output, nodes: flow.accepted.length, acceptance: 'configured contracts; no implicit verification or shipping' })
		return
	}
	const previous = steps[flow.accepted.length - 1]
	const checkpoint = `functions:${flow.loop}:${step.job}`
	if (item.autonomy === 'steps' && previous && previous.cartridge !== step.cartridge && item.passed !== checkpoint) {
		const message = `Checkpoint: ${previous.cartridge} is done; ${step.cartridge} (${step.job}) is next.`
		store.save({ ...item, status: 'paused', hold: { code: 'checkpoint', message, context: { key: checkpoint, after: previous.cartridge, next: step.job } } }, 'paused', { key: checkpoint, message })
		return
	}
	if (item.job !== step.job || item.status === 'queued') item = store.save({ ...item, flow, job: step.job, status: 'running' }, 'running', { job: step.job })
	const input = functionInput(item, step)
	const problems = step.input ? conforms(step.input, input, 'input') : []
	if (!problems.length && !step.run && !step.children) return step
	const { result } = yield* observe(store, item.id, { job: step.job, kind: step.children ? 'compose' : 'function', args: { input, node: step, pack: { name: item.pack!.name, version: item.pack!.version ?? null } } }, (onOutput) => Effect.gen(function* () {
		if (problems.length) return yield* failed(item, step.job, problems.join('; '))
		const result = step.children ? { code: 0, stdout: JSON.stringify(input.received), stderr: '' }
			: yield* runGroup({ command: 'sh', args: ['-c', step.run!], cwd: item.workspace, env: process.env, input: JSON.stringify(input), budget: step.budget ?? { minutes: 30 }, onOutput })
		if (result.code !== 0) return yield* failed(item, step.job, `exit ${result.code}: ${result.stderr}`)
		const checked = validate(laneOf(item.pack), step.job, result.stdout)
		if (!checked.ok) return yield* failed(item, step.job, checked.reason)
		if (typeof checked.value.blocked === 'string') return yield* failed(item, step.job, checked.value.blocked)
		return { output: JSON.stringify(checked.value) }
	}))
	acceptFunction(store, item.id, step, result.output)
})
