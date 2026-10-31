// One append-only trace in the existing event store. Lenses and renderers never move work.
import { randomUUID } from 'node:crypto'
import { Cause, Effect, Exit } from 'effect'
import { laneOf, stepOf } from './lane.ts'
import type { Next } from './errors.ts'
import type { Store } from './store.ts'
import { toolTracker, totalTokens } from './telemetry.ts'
import type { WorkerRequest } from './worker.ts'

type Source = typeof Store.Service
export type Lens = 'ux' | 'dx' | 'ax'

/** Evidence thresholds, not deadlines or permission to retry. Checked every five seconds. */
export const TRACE_INTERVAL = 5_000
export const SILENCE_INTERVAL = 60_000
export const TOOL_RESULT_INTERVAL = 120_000

interface Invocation {
	readonly job: string
	readonly kind: string
	readonly profile?: string
	readonly harness?: string
	readonly args: Record<string, unknown>
}

/** Persist before invoking and before handing each fragment to any other consumer. */
export const observe = <A extends object, E, R>(store: Source, item: number, spec: Invocation, run: (onOutput: NonNullable<WorkerRequest['onOutput']>) => Effect.Effect<A, E, R>) =>
	Effect.scoped(Effect.clockWith((clock) => Effect.gen(function* () {
		const invocation = randomUUID()
		const started = clock.currentTimeMillisUnsafe()
		const current = store.get(item)!
		const parent = `item:${item}:round:${current.round}:job:${spec.job}`
		const note = (kind: string, data: Record<string, unknown>) => store.note(item, kind, { invocation, ...data }, new Date(clock.currentTimeMillisUnsafe()).toISOString())
		const history = store.events(item).filter((e) => e.kind === 'trace-finished' && e.data.job === spec.job && e.data.kind === spec.kind && e.data.status === 'returned').map((e) => Number(e.data.ms)).sort((a, b) => a - b)
		const typical = history.length >= 3 ? history[Math.floor(history.length / 2)]! : null
		const durationThreshold = typical === null ? (spec.kind === 'intake' || spec.kind === 'repair' ? 60_000 : 180_000) : Math.max(30_000, typical * 3)
		note('trace-started', { parent, round: current.round, pid: process.pid, ...spec, durationThreshold, typical })
		let lastOutput = started
		let lastResult = started
		const pending = new Set<number>()
		let partial = ''
		let pattern = ''
		let repetitions = 0
		let previousLine = ''
		let repeatedLines = 0
		const tracker = toolTracker(spec.harness ?? '')
		const active = new Set<string>()
		const signal = (code: string, present: boolean, facts: Record<string, unknown>) => {
			if (active.has(code) === present) return
			if (present) active.add(code)
			else active.delete(code)
			note('trace-signal', { code, active: present, ...facts })
		}
		const consume = (line: string) => {
			if (spec.harness && line.trimStart().startsWith('{')) {
				try {
					JSON.parse(line)
					signal('stream-parse', false, {})
				} catch (cause) {
					note('trace-parse', { ok: false, reason: String(cause), bytes: Buffer.byteLength(line) })
					signal('stream-parse', true, {})
				}
			}
			if (line.trim()) {
				repeatedLines = line === previousLine ? repeatedLines + 1 : 1
				previousLine = line
				signal('repeated-output', repeatedLines >= 3, { repetitions: repeatedLines })
			}
			let updates: ReturnType<typeof tracker.append>
			try { updates = tracker.append(line, clock.currentTimeMillisUnsafe()) } catch (cause) {
				note('trace-parse', { ok: false, decoder: 'tools', reason: String(cause) })
				signal('stream-parse', true, {})
				return
			}
			for (const { event, state } of updates) {
				note('trace-tool', { parent: invocation, id: `${invocation}:tool:${event.seq}`, state, ...event })
				if (state === 'returned') {
					lastResult = clock.currentTimeMillisUnsafe()
					pending.delete(event.seq)
					signal('no-tool-result', false, { pending: pending.size, toolIdleMs: 0 })
					signal('no-progress', false, { toolIdleMs: 0 })
				} else {
					if (pending.size === 0) lastResult = clock.currentTimeMillisUnsafe()
					pending.add(event.seq)
					const key = `${event.tool}:${event.digest}`
					repetitions = key === pattern ? repetitions + 1 : 1
					pattern = key
					signal('repeated-operation', repetitions >= 3, { tool: event.tool, digest: event.digest, repetitions })
				}
			}
		}
		const onOutput: NonNullable<WorkerRequest['onOutput']> = (channel, text) => {
			note('trace-output', { channel, text })
			lastOutput = clock.currentTimeMillisUnsafe()
			signal('no-output', false, { idleMs: 0 })
			if (channel !== 'stdout') return
			const lines = (partial + text).split('\n')
			partial = lines.pop()!
			for (const line of lines) consume(line)
		}
		yield* Effect.forkScoped(Effect.forever(Effect.gen(function* () {
			yield* Effect.sleep(TRACE_INTERVAL)
			const now = clock.currentTimeMillisUnsafe()
			const facts = { ms: now - started, idleMs: now - lastOutput, toolIdleMs: now - lastResult, pending: pending.size }
			signal('no-output', facts.idleMs >= SILENCE_INTERVAL, facts)
			signal('no-tool-result', pending.size > 0 && facts.toolIdleMs >= TOOL_RESULT_INTERVAL, facts)
			signal('no-progress', !!spec.harness && spec.args.access !== 'none' && facts.toolIdleMs >= TOOL_RESULT_INTERVAL, { ...facts, basis: 'no reported tool result; not proof of useless work' })
			signal('unusual-duration', facts.ms >= durationThreshold, { ...facts, threshold: durationThreshold, typical })
			note('trace-heartbeat', { ...facts, signals: [...active] })
		})).pipe(Effect.interruptible))
		const result = yield* run(onOutput).pipe(Effect.onExit((exit) => Effect.sync(() => {
			if (partial) consume(partial)
			// Raw stdout/stderr already live durably in fragments; completed calls retain their existing full record.
			const returned = Exit.isSuccess(exit) ? Object.fromEntries(Object.entries(exit.value).filter(([k]) => !['raw', 'stdout', 'stderr'].includes(k))) : null
			note('trace-finished', { job: spec.job, kind: spec.kind, status: Exit.isSuccess(exit) ? 'returned' : Exit.hasInterrupts(exit) ? 'interrupted' : 'failed', ms: clock.currentTimeMillisUnsafe() - started, result: returned, error: Exit.isFailure(exit) ? Cause.pretty(exit.cause) : null })
		})))
		return { invocation, result }
	})))

/** Three collapses of the same saved facts, including unfinished invocations from dead runners. */
export function lensOf(store: Source, id: number, lens: Lens, next: ReadonlyArray<Next>, now = Date.now()) {
	const item = store.get(id)!
	const events = store.events(id)
	const calls = store.calls(id)
	const runner = store.runner()
	const starts = events.filter((e) => e.kind === 'trace-started')
	const byInvocation = new Map<unknown, typeof events>()
	for (const e of events) {
		const group = byInvocation.get(e.data.invocation) ?? []
		group.push(e)
		byInvocation.set(e.data.invocation, group)
	}
	const invocations = starts.map((start) => {
		const entries = byInvocation.get(start.data.invocation)!
		const finished = entries.find((e) => e.kind === 'trace-finished')
		const heartbeat = entries.findLast((e) => e.kind === 'trace-heartbeat')
		const signals = new Map<string, typeof entries[number]>()
		for (const e of entries.filter((e) => e.kind === 'trace-signal')) {
			if (e.data.active) signals.set(String(e.data.code), e)
			else signals.delete(String(e.data.code))
		}
		const pid = Number(start.data.pid)
		let alive = false
		try { alive = process.kill(pid, 0) } catch (e) { alive = (e as NodeJS.ErrnoException).code === 'EPERM' }
		const linked = entries.find((e) => e.kind === 'trace-call')?.data.call
		const tools = new Map<unknown, typeof entries[number]['data']>()
		for (const e of entries.filter((e) => e.kind === 'trace-tool')) tools.set(e.data.id, { ...e.data, at: e.at })
		const args = start.data.args as Record<string, unknown>
		return {
			id: String(start.data.invocation), parent: String(start.data.parent), started: start.at,
			...start.data, args, card: args.card ?? null, budget: args.budget ?? null, access: args.access ?? null,
			status: String(finished?.data.status ?? (alive ? 'running' : 'lost')),
			ms: Number(finished?.data.ms ?? Math.max(0, now - Date.parse(start.at))), heartbeat: heartbeat ? { at: heartbeat.at, ...heartbeat.data } : null,
			stale: !finished && now - Date.parse(heartbeat?.at ?? start.at) > TRACE_INTERVAL * 3,
			signals: [...signals.values()], call: linked ? calls.find((c) => c.id === linked) ?? null : null,
			result: finished?.data.result ?? null, error: finished?.data.error ?? null, tools: [...tools.values()], entries,
		}
	})
	const done = item.status === 'shipped' || item.status === 'discovered' || item.status === 'completed'
	const needsYou = item.status === 'held' || item.status === 'paused' || item.status === 'candidate'
	const live = invocations.filter((i) => i.status === 'running')
	const state = done ? item.status : needsYou ? 'needs-you' : item.status.startsWith('waiting-') ? 'waiting' : live.length ? 'working' : item.status === 'dropped' ? 'stopped' : runner ? 'queued' : 'not-running'
	const ux = {
		item: id, title: item.title, objective: item.objective, done, needsYou, state,
		next, proof: { completion: item.completion ?? null, shipped: item.shipped ?? null, verification: item.verification ? { passed: item.verification.passed, results: item.verification.results.map(({ id, doneWhen, exitCode }) => ({ id, doneWhen, exitCode })) } : null, candidates: store.list().filter((i) => i.discovery === id).map((i) => ({ id: i.id, title: i.title })), hold: item.hold ? { code: item.hold.code, message: item.hold.message } : null },
	}
	if (lens === 'ux') return { lens, depth: 30_000, ...ux }
	const lane = laneOf(item.pack)
	const step = stepOf(lane, item.job)
	const dx = {
		...ux, phase: item.flow?.loop ?? (lane.discovery.some((s) => s.job === item.job) ? 'discovery' : 'delivery'), lane: lane.pack.name,
		pack: lane.pack, flow: item.flow ?? null,
		updates: events.filter((e) => e.kind.startsWith('cartridges-')),
		metrics: { invocations: invocations.length, failed: invocations.filter((i) => i.status === 'failed' || i.call?.outcome === 'error').length, ms: invocations.reduce((n, i) => n + i.ms, 0), tokens: calls.some((c) => c.tokens) ? calls.reduce((n, c) => n + totalTokens(c.tokens), 0) : null, unreportedUsage: calls.filter((c) => !c.tokens).length },
		stage: step.cartridge, job: item.job, profile: step.profile, round: item.round, corrections: item.corrections,
		hold: item.hold ?? null, verification: item.verification ?? null,
		nq: item.exchange ?? null, tracks: item.split ?? null, quota: store.exhausted(), runner,
		runnerEvents: store.allEvents().filter((e) => e.kind.startsWith('runner-') && (e.item === id || e.item === 0)),
		invocations: invocations.map(({ entries: _, args: _args, result: _result, call, ...i }) => ({ ...i, call: call ? { id: call.id, outcome: call.outcome, flags: call.flags, error: call.error, tokens: call.tokens } : null })),
		calls: calls.map(({ system: _, prompt: _p, output: _o, raw: _r, ...c }) => c),
		diagnostics: events.filter((e) => ['trace-decode', 'trace-parse', 'discovery-dropped', 'alerted', 'trace-signal', 'nq-question', 'repaired', 'launch-failed'].includes(e.kind)),
		entryPoints: { export: `mw export ${id}`, replay: 'mw replay', trace: `mw trace ${id} --lens ax` },
	}
	if (lens === 'dx') return { lens, depth: 15_000, ...dx }
	const jobs = [...new Set(invocations.map((i) => i.parent))].map((parent) => ({
		id: parent, parent: `item:${id}`, function: 'job',
		children: invocations.filter((i) => i.parent === parent).map((i) => ({ ...i, function: 'invocation', children: i.tools })),
	}))
	return { lens, depth: 0, ...dx, tree: { id: `item:${id}`, function: 'work', input: { title: item.title, objective: item.objective }, output: ux.proof, children: jobs }, itemRecord: item, invocations, calls, events }
}

/** Optional read-side render cartridge. Its absence, failure or timeout cannot damage the trace or pipeline. */
export type TraceRenderer = (view: ReturnType<typeof lensOf>) => Effect.Effect<unknown, unknown>
export const renderTrace = (view: ReturnType<typeof lensOf>, renderer?: TraceRenderer) =>
	typeof renderer !== 'function' ? Effect.succeed(view) : Effect.suspend(() => renderer(view)).pipe(
		Effect.timeoutOption('5 seconds'),
		Effect.map((rendered) => rendered._tag === 'Some' && JSON.stringify(rendered.value) !== undefined ? rendered.value : view),
		Effect.catchCause(() => Effect.succeed(view)),
	)
