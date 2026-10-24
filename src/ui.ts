// The console: one live view of the work, read straight from the store. `mw ui` serves it as a web page on this
// machine (a browser, an orb portal, or an SSH tunnel reaches it); `mw watch` draws the same model in a terminal, or
// streams events as JSON lines when an agent reads it; `mw replay` writes the page with the model inside it.
// Everything here only reads: the store stays the one record, and nothing here is saved.
//
// The model answers the operator's questions first (FOUNDATION, work-level observability): is the work done, what
// proves it, what remains, what blocks it and who owes the next move. Each item carries its pipeline as steps with
// their time, cost and NQ questions; the agent calls are bars on one timeline; a running call shows what its agent
// is doing now, read from its live output.
import { execFileSync } from 'node:child_process'
import { closeSync, existsSync, fstatSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, dirname, join } from 'node:path'
import { Effect } from 'effect'
import { GATE, itemHome, patchPath } from './change.ts'
import { CONSOLE } from './console.ts'
import { MadeWellError, type Next } from './errors.ts'
import { isMaker, laneOf, lastJson, stepOf, type Lane } from './lane.ts'
import { openHolds } from './project.ts'
import { openStore, spansPath, type CallHead, type Event, type Item } from './store.ts'
import { totalTokens } from './telemetry.ts'
import { lensOf, renderTrace, type Lens, type TraceRenderer } from './trace.ts'

type StoreService = ReturnType<typeof openStore>
/** What moves a held item, from the engine, so the console offers exactly the commands the CLI prints. */
export type NextOf = (item: Item) => Next[]

export type Actor = 'operator' | 'agent' | 'made well' | 'runner'

/** Who moved: the operator's commands, an agent's call, the runner's lifecycle, or Made Well's own code. */
export const actorOf = (e: Event): Actor => {
	const d = e.data
	if (e.kind.startsWith('runner-')) return 'runner'
	if (['promoted', 'retried', 'dropped', 'nq-corrected'].includes(e.kind)) return 'operator'
	if (e.kind === 'nq-answer') return d.originator === 'operator' ? 'operator' : 'agent'
	if (e.kind === 'ruling') return d.by === 'operator' ? 'operator' : 'agent'
	if (e.kind === 'created') return d.discovery == null ? 'operator' : 'agent'
	if (['call-started', 'call-finished', 'nq-question', 'nq-clear', 'accepted'].includes(e.kind)) return 'agent'
	return 'made well'
}

const secs = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`)
const short = (s: unknown, n = 160) => {
	const t = String(s ?? '').replace(/\s+/g, ' ').trim()
	return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
const cardOf = (c: unknown) => {
	const card = c as { harness?: string; model?: string; effort?: string } | undefined
	return card ? [...new Set([card.harness, card.model, card.effort].filter(Boolean))].join(' · ') : ''
}
const jobs = (j: unknown) => (Array.isArray(j) ? j.join(' + ') : String(j ?? ''))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One plain sentence for an event: what happened, with the facts that matter. */
export const sayOf = (e: Event, title?: string): string => {
	const d = e.data as Record<string, any>
	switch (e.kind) {
		case 'created': return d.job === 'discover' ? `Discovery run started: ${title ?? ''}` : d.discovery != null ? `Candidate found by discovery #${d.discovery}: ${title ?? ''}` : `Work item created: ${title ?? ''}`
		case 'running': return `Running ${d.job}`
		case 'base': return `Starts from ${d.ref} at ${String(d.main).slice(0, 12)}`
		case 'handoff': return `The ${d.from} hands ${d.job} to the ${d.to}`
		case 'nq-question': return `The ${d.receiver} asks the ${d.originator} ${plural(d.questions?.length ?? 0, 'question')}${d.error ? ' about an error' : ''}: ${short((d.questions ?? []).join(' · '), 220)}`
		case 'nq-answer': return `The ${d.originator} answers the ${d.job} hand-off${d.answer ? `: ${short(d.answer, 200)}` : ''}`
		case 'nq-corrected': return `The operator corrects the ${d.job} hand-off: ${short(d.answer, 200)}`
		case 'nq-clear': return `The ${d.profile} is clear on ${d.job} and starts on ${cardOf(d.card)}`
		case 'nq-replacement': return `A new agent takes ${d.job}; it goes through intake again`
		case 'call-started': return `The ${d.profile} starts ${d.kind === 'execute' ? 'the job' : d.kind} for ${d.job} on ${cardOf(d.card)} (${d.access} access, ${d.budget?.minutes ?? '?'} min budget)`
		case 'call-finished': return `The ${d.profile}'s ${d.kind === 'execute' ? d.job : `${d.kind} for ${d.job}`} call ended ${d.outcome} after ${secs(d.ms ?? 0)}${d.error ? `: ${short(d.error, 200)}` : ''}`
		case 'accepted': return `Made Well accepts the ${e.data.job ?? ''} deliverable`
		case 'launch-failed': return `The ${d.job} call failed (${cardOf(d.card)}): ${short(d.error, 220)}`
		case 'repaired': return `The ${d.job} answer was malformed; its agent corrected the JSON in ${secs(d.ms ?? 0)}${d.ok ? '' : ', and it is still malformed'}`
		case 'quota-swap': return `${cardOf(d.from)} hit a usage limit; the ${d.job} call moves to another card`
		case 'waiting-quota': return `Every card for ${d.job} is out of quota; waits until ${d.resetsAt}`
		case 'handed-off': return `${jobs(d.from)} → ${jobs(d.to)}`
		case 'failure': return `${d.results ? `${(d.results as any[]).filter((r) => r.exitCode !== 0).length} of ${(d.results as any[]).length} checks failed` : `${jobs(d.from)} could not finish`}; the arbiter decides whose it is`
		case 'ruling': return d.prerequisite ? `The ${d.by} rules it a pre-existing defect; fix #${d.prerequisite} goes first` : `The ${d.by} rules the cause ${d.cause}; back to ${d.to}${d.answer ? `: ${short(d.answer, 160)}` : ''}`
		case 'prepare-started': return `The project's prepare command runs for ${d.job}: ${short(d.command, 120)}`
		case 'prepared': return `Prepare for ${d.job} exited ${d.exitCode}${d.provisioned?.length ? `, provisioned ${d.provisioned.map((p: any) => `${p.kind} ${p.id}`).join(', ')}` : ''}`
		case 'verify-started': return `Made Well runs ${plural(d.gates?.length ?? 0, 'gate')} and ${plural(d.checks?.length ?? 0, 'check')} on the change`
		case 'verified': {
			const gates = (d.results ?? []).filter((r: any) => r.doneWhen === GATE).length
			const checks = (d.results ?? []).length - gates
			return `All ${plural(checks, 'check')}${gates ? ` and ${plural(gates, 'gate')}` : ''} passed on ${String(d.on).slice(0, 12)}${d.fixed?.length ? ` (gates fixed ${plural(d.fixed.length, 'file')})` : ''}`
		}
		case 'main-moved': return 'The branch moved since the checks ran; they run again'
		case 'rebased': return `Another item shipped since this one started and its ${d.conflict === 'implement' ? 'change' : 'check files'} no longer apply; the planner plans again from ${String(d.ref).replace('refs/heads/', '')} as it is now`
		case 'merged': return `Merged onto ${d.ref} at ${String(d.main).slice(0, 12)}`
		case 'ship-started': return `The ship command runs: ${short(d.command, 120)}`
		case 'shipped': return `Shipped${String(d.output ?? '').trim() ? `: ${short(String(d.output).trim().split('\n').pop(), 160)}` : ''}`
		case 'held': return `Held for the operator: ${d.code}: ${short(d.message, 240)}`
		case 'alerted': return d.exitCode === 0 ? `Alert sent for ${d.code} (exit 0)` : `Alert delivery failed for ${d.code} (exit ${d.exitCode}); the hold still needs attention`
		case 'trace-signal': return `${d.active ? 'Observed' : 'Cleared'} ${d.code}${d.job ? ` in ${d.job}` : ''}; diagnostic only, no automatic action`
		case 'discovery-dropped': return `Discovery skipped ${plural(d.candidates?.length ?? 0, 'candidate')} missing required fields`
		case 'retried': return `The operator retries ${d.job}`
		case 'promoted': return 'The operator promotes it into delivery'
		case 'discovered': return `Discovery finished with ${plural(d.candidates?.length ?? 0, 'candidate')}`
		case 'dropped': return `The operator drops it (was ${d.from})`
		case 'prerequisite-shipped': return `Prerequisite #${d.prerequisite} shipped; verification runs again`
		case 'prerequisite-dropped': return `Prerequisite #${d.prerequisite} was dropped; verification runs again on the branch as it is now`
		case 'replan': return `Planned again: ${d.reason}`
		case 'torn-down': return `Torn down: ${(d.records ?? []).map((r: any) => `${r.kind} ${r.id} (exit ${r.exitCode})`).join(', ')}`
		case 'worktree-leftovers': return `The ${d.job} call left files behind: ${(d.files ?? []).join(', ')}`
		case 'runner-started': return `Runner started (pid ${d.pid}${d.replaced ? `, replacing ${d.replaced}` : ''})`
		case 'runner-reloaded': return `Runner swapped in a new build (pid ${d.pid})`
		case 'runner-stopped': return `Runner stopped (pid ${d.pid})`
		case 'runner-lost': return `Runner ${d.pid} died while on ${d.item ? `#${d.item}` : 'no item'}`
		case 'pruned': return `Pruned finished work before ${d.before}`
		default: return `${e.kind} ${short(JSON.stringify(d), 200)}`
	}
}

/** A step in flight: started and not yet finished. With no live runner, it was cut off. */
interface Flight { readonly item: number; readonly kind: string; readonly job: string; readonly who: string; readonly since: string; readonly seq: number; readonly live?: string; readonly card?: string }

const ENDS: Record<string, ReadonlyArray<string>> = {
	'call-started': ['call-finished'],
	'prepare-started': ['prepared'],
	'verify-started': ['verified', 'failure', 'held', 'rebased'],
	'ship-started': ['shipped', 'held'],
}

/** Every step started and not yet finished, read from the events alone. `kind`: intake, originator, execute, prepare, verify or ship. */
export const inFlight = (events: ReadonlyArray<Event>): Flight[] => {
	const open = new Map<string, Flight>()
	const key = (e: Event, start: string) => {
		const d = e.data as Record<string, any>
		return `${e.item}:${start}:${start === 'call-started' ? `${d.job}:${d.kind}` : start === 'prepare-started' ? d.name : ''}`
	}
	for (const e of events) {
		const d = e.data as Record<string, any>
		if (ENDS[e.kind]) {
			const kind = e.kind === 'call-started' ? String(d.kind) : e.kind.replace('-started', '')
			open.set(key(e, e.kind), { item: e.item, kind, job: d.job ?? kind, who: e.kind === 'call-started' ? d.profile : 'made well', since: e.at, seq: e.seq, ...(d.live ? { live: d.live } : {}), ...(d.card ? { card: cardOf(d.card) } : {}) })
		}
		for (const [start, ends] of Object.entries(ENDS)) if (ends.includes(e.kind)) open.delete(key(e, start))
		// A runner that stopped or died took its steps with it; the next one starts them again.
		if (e.kind === 'runner-started' || e.kind === 'runner-lost' || e.kind === 'runner-stopped') open.clear()
	}
	return [...open.values()]
}

const liveDir = (path: string) => join(dirname(path), 'live')

/** The live output files of steps running now (or cut off). */
const liveFiles = (path: string) => {
	try {
		return readdirSync(liveDir(path)).filter((f) => f.endsWith('.log')).map((f) => ({ name: f, bytes: statSync(join(liveDir(path), f)).size }))
	} catch {
		return []
	}
}

/** Up to `max` bytes of a file from `from`, and where the next read starts. A file that shrank is read from the start. */
export const readFrom = (file: string, from: number, max = 256 * 1024) => {
	try {
		const fd = openSync(file, 'r')
		try {
			const size = fstatSync(fd).size
			const start = from > size ? 0 : Math.max(from, size - max)
			const buf = Buffer.alloc(size - start)
			readSync(fd, buf, 0, buf.length, start)
			return { text: buf.toString('utf8'), next: size, skipped: start > from ? start - from : 0 }
		} finally {
			closeSync(fd)
		}
	} catch {
		return { text: '', next: 0, skipped: 0, gone: true }
	}
}

// ── What an agent is doing, read from its stream ───────────────────────────────────────────────────────

const rel = (p: unknown) => String(p ?? '').replace(/^.*\/worktrees\/[^/]+\//, '')
/** A tool call as a person would say it: the file it reads or edits, the command it runs. */
const toolSay = (name: string, input: Record<string, any> = {}) => {
	const path = input.path ?? input.file_path ?? input.filePath
	if (input.command ?? input.cmd) return `$ ${short(input.command ?? input.cmd, 180)}`
	if (path) return `${name} ${rel(path)}`
	if (input.pattern ?? input.query) return `${name} ${short(input.pattern ?? input.query, 120)}`
	return `${name} ${short(JSON.stringify(input), 140)}`
}

export interface Activity { readonly kind: 'tool' | 'say' | 'error'; readonly text: string }

/** One stream line as what the agent did: its words or a tool it called. Prompt echoes and tool results say nothing. */
export const activityOf = (line: string): Activity | undefined => {
	const t = line.trim()
	if (!t) return undefined
	if (t[0] !== '{') return { kind: 'say', text: short(t, 300) }
	try {
		const v = JSON.parse(t)
		if (v.type === 'user' || v.type === 'system') return undefined
		if (v.type === 'result') return v.is_error ? { kind: 'error', text: short(v.result ?? v.error, 300) } : undefined
		const parts: { type: string; text?: string; name?: string; input?: Record<string, any> }[] = Array.isArray(v.message?.content) ? v.message.content : []
		for (const p of parts.toReversed()) {
			if (p.type === 'tool_use') return { kind: 'tool', text: toolSay(p.name ?? 'tool', p.input) }
			if (p.type === 'toolCall') return { kind: 'tool', text: toolSay((p as any).name ?? 'tool', (p as any).arguments) }
			if (p.type === 'text' && p.text?.trim()) return { kind: 'say', text: short(p.text, 300) }
		}
		if (v.type === 'tool_execution_start') return { kind: 'tool', text: toolSay(v.toolName, v.args) }
		if (v.item?.type === 'command_execution' && v.type === 'item.started') return { kind: 'tool', text: `$ ${short(v.item.command, 180)}` }
		if (v.item?.type === 'agent_message' && v.item.text) return { kind: 'say', text: short(v.item.text, 300) }
		return undefined
	} catch {
		return { kind: 'say', text: short(t, 300) }
	}
}

/** The last `n` things a running step did, from its live file. */
const activityIn = (file: string | undefined, n = 6): Activity[] => {
	if (!file) return []
	const out: Activity[] = []
	for (const l of readFrom(file, 0, 64 * 1024).text.split('\n').reverse()) {
		const a = activityOf(l)
		if (a) out.unshift(a)
		if (out.length >= n) break
	}
	return out
}

// ── The model ──────────────────────────────────────────────────────────────────────────────────────────

/** A job's name as the console shows it. */
const labelOf = (job: string) => (job === 'test-plan' ? 'Checks' : job === 'arbitrate' ? 'Arbiter' : job.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' '))
/** Whether an item is a discovery run: it is at a step of its lane's discovery. */
export const isDiscovery = (item: Item) => laneOf(item.pack).discovery.some((s) => s.job === item.job)
/** Each job's place in its lane: the two makers share one, the arbiter shares verify's, and ship is Made Well's last step. */
const orderOf = (lane: Lane) => {
	const order: Record<string, number> = {}
	lane.discovery.forEach((s, i) => (order[s.job] = i))
	let n = 0
	let maker: number | undefined
	for (const s of lane.delivery) order[s.job] = isMaker(s.job) ? (maker ??= ++n) : ++n
	order.arbitrate = order.verify!
	order.ship = n + 1
	return order
}
const DOING: Record<string, string> = {
	discover: 'turning the notes into work items', ideate: 'shaping the idea', challenge: 'challenging the idea', plan: 'writing the plan',
	'test-plan': 'writing the checks', implement: 'making the change', arbitrate: 'ruling on the failed check',
}

type StepState = 'done' | 'active' | 'held' | 'failed' | 'waiting' | 'todo' | 'skipped'
export interface StepView { readonly job: string; readonly label: string; readonly cartridge: string; readonly who: string; readonly state: StepState; readonly agentMs: number; readonly calls: number; readonly tokens: number; readonly questions: number; readonly ms: number }

export interface ItemView {
	readonly id: number
	readonly title: string
	readonly kind: string
	readonly status: Item['status']
	readonly discovery?: number
	readonly parent?: number
	readonly after: ReadonlyArray<{ id: number; status: string }>
	readonly waitsOn?: number
	readonly round: number
	readonly steps: ReadonlyArray<StepView>
	/** One sentence: what is happening to it now, or why nothing is. */
	readonly doing: string
	/** Who owes the next move: the operator, an agent profile, made well, an item it waits for, or nobody. */
	readonly owes: string
	readonly since: string
	readonly started: string
	readonly ended?: string
	readonly agentMs: number
	readonly tokens: number
	readonly calls: number
	readonly questions: number
	readonly hold?: Item['hold']
	readonly next: ReadonlyArray<Next>
	readonly commit?: string
	readonly checks?: { readonly passed: number; readonly total: number }
	readonly files?: number
}

/** Cost of a set of calls. */
const tally = (calls: ReadonlyArray<CallHead>) => ({ agentMs: calls.reduce((n, c) => n + c.ms, 0), tokens: calls.reduce((n, c) => n + totalTokens(c.tokens), 0), calls: calls.length })

/** Each job's steps for one item, in lane order, from the item as saved and its calls and events. */
const stepsOf = (item: Item, calls: ReadonlyArray<CallHead>, events: ReadonlyArray<Event>, flying: ReadonlyArray<Flight>): StepView[] => {
	const questions = (job: string) => events.filter((e) => e.kind === 'nq-question' && e.data.job === job).reduce((n, e) => n + ((e.data.questions as unknown[])?.length ?? 0), 0)
	const lane = laneOf(item.pack)
	const ORDER = orderOf(lane)
	const discovery = isDiscovery(item)
	const jobs = discovery ? lane.discovery.map((s) => s.job) : [...lane.delivery.map((s) => s.job), 'ship']
	const arbiter = calls.some((c) => c.job === 'arbitrate') || item.job === 'arbitrate'
	const steps = (arbiter ? [...jobs.slice(0, -1), 'arbitrate', 'ship'] : jobs).map((job) => ({ job, label: labelOf(job), cartridge: job === 'ship' ? stepOf(lane, 'verify').cartridge : stepOf(lane, job).cartridge }))
	const at = ORDER[item.job] ?? 0
	const done = item.status === 'shipped' || item.status === 'discovered'
	return steps.map(({ job, label, cartridge }) => {
		const mine = calls.filter((c) => c.job === job)
		const span = mine.length ? Date.parse(mine.at(-1)!.started) + mine.at(-1)!.ms - Date.parse(mine[0]!.started) : 0
		let state: StepState
		const track = item.split?.[job as 'implement' | 'test-plan']
		if (done) state = mine.length || job === 'verify' || job === 'ship' || discovery ? 'done' : 'skipped'
		else if (item.status === 'dropped') state = mine.length ? 'done' : 'todo'
		else if (item.parent !== undefined && ORDER[job]! < ORDER.plan!) state = 'skipped'
		else if (job === 'arbitrate') state = item.job === 'arbitrate' ? (item.status === 'held' ? 'held' : 'active') : 'done'
		else if (job === 'verify' && item.job === 'arbitrate') state = 'failed'
		else if (job === 'verify' && item.status === 'waiting-prerequisite') state = 'waiting'
		else if (item.status === 'paused' && item.hold?.context.next === 'ship') state = job === 'ship' ? 'waiting' : 'done'
		else if (item.status === 'paused' && (job === item.job || track)) state = 'waiting'
		else if (track) state = track.done ? 'done' : item.status === 'held' ? 'held' : 'active'
		else if (job === 'ship') state = item.merged ? (item.status === 'held' ? 'held' : 'active') : 'todo'
		else if (ORDER[job]! < at) state = 'done'
		else if (job === item.job || (job === 'verify' && item.merged)) state = item.status === 'held' ? 'held' : ['candidate', 'queued'].includes(item.status) && !flying.length ? 'todo' : 'active'
		else state = 'todo'
		if (job === 'verify' && state === 'done' && item.merged && !done) state = 'done'
		return { job, label, cartridge, who: job === 'verify' || job === 'ship' ? 'made well' : stepOf(lane, job).profile, state, ...tally(mine), questions: questions(job), ms: span }
	})
}

/** What is happening to an item now and who owes the next move. */
const doingOf = (store: StoreService, item: Item, flying: ReadonlyArray<Flight>, driven: boolean, nextOf: NextOf, events: ReadonlyArray<Event>) => {
	const title = (id: number) => `#${id}`
	const unshipped = (item.after ?? []).filter((id) => store.get(id)?.status !== 'shipped')
	switch (item.status) {
		case 'shipped': return { doing: `Shipped${item.shipped?.main ? ` at ${item.shipped.main.slice(0, 10)}` : ''}`, owes: '' }
		case 'discovered': {
			const waiting = store.list().filter((c) => c.discovery === item.id && c.status === 'candidate').length
			return { doing: waiting ? `Found candidates; ${plural(waiting, 'candidate')} wait for you to promote` : 'Found its candidates', owes: waiting ? 'operator' : '' }
		}
		case 'dropped': return { doing: 'Dropped by the operator', owes: '' }
		case 'candidate': return { doing: 'Candidate: waits for you to promote it into delivery', owes: 'operator' }
		case 'held': return { doing: item.hold?.message ?? 'Held for the operator', owes: 'operator', next: nextOf(item) }
		case 'paused': return { doing: item.hold?.message ?? 'Stopped at a checkpoint for you', owes: 'operator', next: nextOf(item) }
		case 'waiting-quota': return { doing: `Every card is out of quota; resumes by itself at ${item.resetsAt ? new Date(item.resetsAt).toISOString().slice(11, 16) : 'the earliest reset'} UTC`, owes: 'quota reset' }
		case 'waiting-prerequisite': return { doing: `Its check failed on a pre-existing defect; waits for fix ${title(item.waitsOn!)} to ship, then runs its checks again`, owes: title(item.waitsOn!) }
	}
	if (unshipped.length) return { doing: `Starts once ${unshipped.map(title).join(', ')} ${unshipped.length === 1 ? 'ships' : 'ship'}`, owes: unshipped.map(title).join(' ') }
	if (!driven) return { doing: 'Nothing moves it: no runner is driving the store. Run `mw run`.', owes: 'runner' }
	const mine = flying.filter((f) => f.item === item.id)
	if (mine.length) {
		const say = (f: Flight) => {
			if (f.kind === 'verify') {
				const v = events.findLast((e) => e.kind === 'verify-started')?.data as { gates?: unknown[]; checks?: unknown[] } | undefined
				return `Made Well is running ${plural(v?.gates?.length ?? 0, 'gate')} and ${plural(v?.checks?.length ?? 0, 'check')}`
			}
			if (f.kind === 'ship') return 'Made Well is running the ship command'
			if (f.kind === 'prepare') return `Made Well is preparing a worktree for ${f.job}`
			const receiver = stepOf(laneOf(item.pack), f.job).profile
			if (f.kind === 'intake') return `The ${receiver} is reading its hand-off for ${f.job} (NQ intake)`
			if (f.kind === 'originator') {
				const q = events.findLast((e) => e.kind === 'nq-question' && e.data.job === f.job)?.data.questions as unknown[] | undefined
				return `The ${f.who} is answering the ${receiver}'s ${plural(q?.length ?? 0, 'question')}`
			}
			return `The ${receiver} is ${DOING[f.job] ?? `doing ${labelOf(f.job).toLowerCase()}`}`
		}
		return { doing: mine.map(say).join(' · '), owes: [...new Set(mine.map((f) => (f.kind === 'originator' ? f.who : f.kind === 'intake' || f.kind === 'execute' ? stepOf(laneOf(item.pack), f.job).profile : 'made well')))].join(' + ') }
	}
	if (item.status === 'queued') return { doing: 'Queued: starts when a slot frees', owes: 'runner' }
	return { doing: `Between steps: ${item.job} is next`, owes: 'made well' }
}

/** Every item as the console shows it. */
const itemViews = (store: StoreService, items: ReadonlyArray<Item>, events: ReadonlyArray<Event>, calls: ReadonlyArray<CallHead>, flying: ReadonlyArray<Flight>, driven: boolean, nextOf: NextOf): ItemView[] =>
	items.map((item) => {
		const evs = events.filter((e) => e.item === item.id)
		const mine = calls.filter((c) => c.item === item.id)
		const fl = flying.filter((f) => f.item === item.id)
		const { doing, owes } = doingOf(store, item, fl, driven, nextOf, evs)
		const start = evs.findLast((e) => e.kind === 'promoted')?.at ?? item.created
		const end = evs.findLast((e) => ['shipped', 'dropped', 'discovered'].includes(e.kind))?.at
		const results = item.verification?.results.filter((r) => r.doneWhen !== GATE) ?? []
		return {
			id: item.id, title: item.title, kind: isDiscovery(item) ? 'discovery' : item.parent !== undefined ? 'prerequisite' : item.kind ?? 'feature', status: item.status,
			...(item.discovery !== undefined ? { discovery: item.discovery } : {}), ...(item.parent !== undefined ? { parent: item.parent } : {}),
			after: (item.after ?? []).map((id) => ({ id, status: store.get(id)?.status ?? 'missing' })), ...(item.waitsOn !== undefined ? { waitsOn: item.waitsOn } : {}),
			round: item.round, steps: stepsOf(item, mine, evs, fl), doing, owes, since: evs.at(-1)?.at ?? item.updated, started: start, ...(end ? { ended: end } : {}),
			...tally(mine), questions: evs.filter((e) => e.kind === 'nq-question').reduce((n, e) => n + ((e.data.questions as unknown[])?.length ?? 0), 0),
			...(item.hold ? { hold: item.hold } : {}), next: item.status === 'held' || item.status === 'paused' ? nextOf(item) : [],
			...(item.shipped?.main ?? item.merged?.commit ? { commit: item.shipped?.main ?? item.merged?.commit } : {}),
			...(results.length ? { checks: { passed: results.filter((r) => r.exitCode === 0).length, total: results.length } } : {}),
			...(item.change ? { files: item.change.files.length } : {}),
		}
	})

/** One bar on the timeline: an agent call, or a step of Made Well's own (prepare, verify, ship). `end` null: still running. */
interface Bar { readonly item: number; readonly kind: string; readonly job: string; readonly start: string; readonly end: string | null; readonly outcome?: string; readonly call?: number; readonly lane: number }

/** The timeline: every agent call and Made Well step, as bars on lanes per item (the two makers side by side). */
const barsOf = (events: ReadonlyArray<Event>, calls: ReadonlyArray<CallHead>, flying: ReadonlyArray<Flight>): Bar[] => {
	const laneOf = (job: string) => (job === 'test-plan' ? 1 : 0)
	const bars: Bar[] = calls.map((c) => ({ item: c.item, kind: c.kind, job: c.job, start: c.started, end: new Date(Date.parse(c.started) + c.ms).toISOString(), outcome: c.outcome, call: c.id, lane: laneOf(c.job) }))
	const open = new Map<string, Event>()
	for (const e of events) {
		if (e.kind === 'verify-started' || e.kind === 'ship-started') open.set(`${e.item}:${e.kind}`, e)
		const end = (start: string, outcome: string) => {
			const s = open.get(`${e.item}:${start}`)
			if (!s) return
			bars.push({ item: e.item, kind: start.replace('-started', ''), job: start.replace('-started', ''), start: s.at, end: e.at, outcome, lane: 0 })
			open.delete(`${e.item}:${start}`)
		}
		if (e.kind === 'verified') end('verify-started', 'ok')
		if (e.kind === 'failure' || e.kind === 'rebased') end('verify-started', 'failed')
		if (e.kind === 'shipped') end('ship-started', 'ok')
		if (e.kind === 'held') (end('verify-started', 'held'), end('ship-started', 'held'))
	}
	for (const f of flying) if (f.kind !== 'prepare') bars.push({ item: f.item, kind: f.kind, job: f.job, start: f.since, end: null, lane: laneOf(f.job) })
	return bars
}

// Machine-granularity fragments remain on the AX read surface and in replay, not in the ordinary timeline.
const timelineEvent = (e: Event) => !e.kind.startsWith('trace-') || e.kind === 'trace-signal'

/** Everything the console shows, at one moment. Long texts stay out; `itemDetail` and `callOf` return them one at a time. */
export const modelOf = (store: StoreService, nextOf: NextOf) => {
	const now = Date.now()
	const items = store.list()
	const events = store.allEvents()
	const calls = store.callHeads()
	const runner = store.runner()
	const titles = new Map(items.map((i) => [i.id, i.title]))
	const flying = runner ? inFlight(events) : []
	const cutOff = runner ? [] : inFlight(events)
	const views = itemViews(store, items, events, calls, flying, runner !== null, nextOf)
	const count = (...s: Item['status'][]) => items.filter((i) => s.includes(i.status)).length
	const delivery = items.filter((i) => !isDiscovery(i))
	const nq = calls.filter((c) => c.kind !== 'execute')
	const byJob: Record<string, Record<string, { ms: number; tokens: number; calls: number }>> = {}
	for (const c of calls) {
		const k = ((byJob[c.job] ??= {})[c.kind] ??= { ms: 0, tokens: 0, calls: 0 })
		k.ms += c.ms
		k.tokens += totalTokens(c.tokens)
		k.calls++
	}
	const holds = openHolds(store)
	const promote = items.filter((i) => i.status === 'discovered' && items.some((c) => c.discovery === i.id && c.status === 'candidate'))
	const movable = items.filter((i) => ['queued', 'running', 'waiting-quota', 'waiting-prerequisite'].includes(i.status))
	return {
		at: new Date(now).toISOString(),
		store: store.path,
		projects: [...new Set(items.map((i) => i.workspace))],
		runner,
		summary: {
			shipped: count('shipped'), moving: count('running', 'waiting-quota', 'waiting-prerequisite'), queued: count('queued'), held: count('held', 'paused'), candidates: count('candidate'), dropped: count('dropped'),
			items: delivery.length,
			...tally(calls), nqMs: nq.reduce((n, c) => n + c.ms, 0), intakes: calls.filter((c) => c.kind === 'intake').length,
			questions: events.filter((e) => e.kind === 'nq-question').reduce((n, e) => n + ((e.data.questions as unknown[])?.length ?? 0), 0),
			refused: calls.filter((c) => c.outcome !== 'ok').length, breaks: calls.reduce((n, c) => n + c.flags.length, 0),
			first: events.find((e) => e.item)?.at ?? null, last: events.at(-1)?.at ?? null,
		},
		needs: [
			...holds.map((h) => ({ item: h.item, title: h.title, what: 'hold' as const, code: h.code, message: h.message, questions: Array.isArray(h.context.questions) ? (h.context.questions as string[]) : [], since: h.since, next: nextOf(store.get(h.item)!) })),
			...promote.map((d) => ({ item: d.id, title: d.title, what: 'promote' as const, code: 'candidates', message: `Discovery #${d.id} found ${plural(items.filter((c) => c.discovery === d.id && c.status === 'candidate').length, 'candidate')}. Promote the ones to deliver.`, questions: items.filter((c) => c.discovery === d.id && c.status === 'candidate').map((c) => `#${c.id} ${c.title}`), since: d.updated, next: [{ run: `mw promote ${d.id}`, why: 'deliver every candidate' }, { run: `mw promote ${d.id} <ids>`, why: 'deliver only the ones named' }] })),
			...(!runner && movable.length ? [{ item: 0, title: 'No runner', what: 'runner' as const, code: 'no_runner', message: `${plural(movable.length, 'item')} can move, but no runner is driving the store.`, questions: [], since: events.at(-1)?.at ?? '', next: [{ run: 'mw run --watch', why: 'drive every item; each resumes where it stopped' }] }] : []),
		],
		items: views,
		bars: barsOf(events, calls, flying),
		running: flying.map((f) => ({ ...f, title: titles.get(f.item) ?? '', activity: activityIn(f.live) })),
		cutOff,
		cost: byJob,
		/** Every job the items' lanes have, with the label and profile the page shows for it. */
		jobs: Object.fromEntries([...new Map(items.flatMap((i) => {
			const lane = laneOf(i.pack)
			return [...lane.discovery, ...lane.delivery, lane.arbiter].map((s) => [s.job, { label: labelOf(s.job), profile: s.job === 'verify' ? 'made well' : s.profile, cartridge: s.cartridge }] as const)
		})).entries(), ['ship', { label: 'Ship', profile: 'made well', cartridge: 'verification' }]]),
		rules: calls.flatMap((c) => c.flags.map((f) => ({ call: c.id, item: c.item, job: c.job, kind: c.kind, rule: f.rule }))),
		events: events.filter(timelineEvent).slice(-400).map((e) => ({ ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) })),
		eventCount: events.length,
	}
}
export type Model = ReturnType<typeof modelOf>

const deliverable = (out: string | undefined) => (out === undefined ? undefined : (lastJson(out) ?? { text: out }))

/** A turn of an NQ exchange as the console shows it: the receiver's questions and the answer it got. */
interface TurnView { readonly at: string; readonly understanding?: string; readonly questions: ReadonlyArray<string>; readonly error?: boolean; readonly answer?: string; readonly by?: string }
interface ExchangeView { readonly job: string; readonly from: string; readonly to: string; readonly turns: TurnView[]; readonly clear?: { readonly at: string; readonly understanding?: string; readonly notes: ReadonlyArray<string> } }

/** Every NQ exchange of an item, in order, rebuilt from its events and the calls they point to. */
const exchangesOf = (store: StoreService, events: ReadonlyArray<Event>): ExchangeView[] => {
	const out: ExchangeView[] = []
	const outputOf = (seq: number) => {
		const finished = events.findLast((e) => e.seq < seq && e.kind === 'call-finished')
		const call = finished && store.call(finished.data.call as number)
		return call?.output ? lastJson(call.output) : undefined
	}
	const current = (job: string) => out.findLast((x) => x.job === job && !x.clear)
	for (const e of events) {
		const d = e.data as Record<string, any>
		if (e.kind === 'handoff') out.push({ job: d.job, from: d.from, to: d.to, turns: [] })
		const x = current(d.job)
		if (!x) continue
		if (e.kind === 'nq-question') {
			const intake = d.error ? undefined : outputOf(e.seq)
			x.turns.push({ at: e.at, questions: d.questions ?? [], ...(d.error ? { error: true } : {}), ...(intake?.understanding ? { understanding: String(intake.understanding) } : {}) })
		} else if (e.kind === 'nq-answer' || e.kind === 'nq-corrected') {
			const t = x.turns.at(-1)
			const answer = d.answer ?? (d.originator === 'operator' ? undefined : outputOf(e.seq)?.answer)
			if (t) x.turns[x.turns.length - 1] = { ...t, ...(answer ? { answer: String(answer) } : {}), by: d.originator }
		} else if (e.kind === 'nq-clear') {
			const intake = outputOf(e.seq)
			Object.assign(x, { clear: { at: e.at, ...(intake?.understanding ? { understanding: String(intake.understanding) } : {}), notes: Array.isArray(intake?.notes) ? intake.notes : [] } })
		}
	}
	return out
}

/** The item's change as a diff: its patch while it waits in Made Well's home, or the commit it shipped as. */
const diffOf = (storePath: string, item: Item) => {
	const cap = (s: string) => (s.length > 200_000 ? `${s.slice(0, 200_000)}\n… (cut at 200 KB)` : s)
	const home = itemHome(storePath, item.id)
	const read = (name: 'change' | 'checks') => (existsSync(patchPath(home, name)) ? readFileSync(patchPath(home, name), 'utf8') : '')
	const shipped = item.merged?.commit ?? item.shipped?.main
	let change = read('change')
	if (!change && shipped) {
		try {
			change = execFileSync('git', ['-C', item.workspace, 'show', '--format=%H %s%n', '--no-color', shipped], { encoding: 'utf8', maxBuffer: 16 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
		} catch {}
	}
	return { change: cap(change), checks: cap(read('checks')) }
}

/** Everything about one item: its view, the deliverable of each job, its NQ exchanges, calls, checks, diff and events. */
export const itemDetail = (store: StoreService, nextOf: NextOf, id: number) => {
	const item = store.get(id)
	if (!item) return undefined
	const m = modelOf(store, nextOf)
	const events = store.events(id)
	const titles = new Map(store.list().map((i) => [i.id, i.title]))
	return {
		view: m.items.find((i) => i.id === id)!,
		item: { id: item.id, title: item.title, objective: item.objective, source: item.source, workspace: item.workspace, base: item.base, merged: item.merged, round: item.round, corrections: item.corrections, failure: item.failure, rework: item.rework, change: item.change, provisioned: item.provisioned ?? [] },
		deliverables: Object.fromEntries(Object.entries(item.outputs).map(([job, out]) => [job, deliverable(out)])),
		checks: item.checks?.checks ?? [],
		verification: item.verification ?? null,
		exchanges: exchangesOf(store, events),
		calls: store.callHeads().filter((c) => c.item === id),
		related: store.list().filter((i) => i.discovery === id || i.parent === id || (item.after ?? []).includes(i.id) || i.id === item.waitsOn || i.id === item.parent || i.id === item.discovery).map((i) => ({ id: i.id, title: i.title, status: i.status })),
		diff: diffOf(store.path, item),
		events: events.filter(timelineEvent).map((e) => ({ ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) })),
		trace: lensOf(store, id, 'ax', nextOf(item)),
		traces: { ux: lensOf(store, id, 'ux', nextOf(item)), dx: lensOf(store, id, 'dx', nextOf(item)), ax: lensOf(store, id, 'ax', nextOf(item)) },
	}
}

/** The spans of one item's steps, from the spans file. */
const spansOf = (path: string, item: number) => {
	const file = spansPath(path)
	if (!existsSync(file)) return []
	const all = readFileSync(file, 'utf8').split('\n').flatMap((l) => {
		try {
			return l ? [JSON.parse(l) as { trace: string; span: string; parent: string | null; name: string; start: string; ms: number; outcome: string; attributes: Record<string, unknown> }] : []
		} catch {
			return []
		}
	})
	const keep = new Set(all.filter((s) => s.attributes.item === item).map((s) => s.span))
	// Spans under the item's own (worktrees, git, gates) belong to it too.
	for (let grew = true; grew;) {
		grew = false
		for (const s of all) if (!keep.has(s.span) && s.parent && keep.has(s.parent)) (keep.add(s.span), (grew = true))
	}
	return all.filter((s) => keep.has(s.span)).slice(-3000)
}

/** Opens the store when it exists, and again whenever it was created since; a console never creates one. */
const storeWatcher = (path: string) => {
	let store: StoreService | undefined
	return () => {
		if (!store && existsSync(path)) store = openStore(path)
		return store
	}
}

const json = (res: import('node:http').ServerResponse, body: unknown, code = 200) => {
	res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
	res.end(JSON.stringify(body))
}

/** The console page with a model inside it, for reading without a server: `mw replay`. */
export const staticPage = (store: StoreService, nextOf: NextOf) => {
	const model = modelOf(store, nextOf)
	const details = Object.fromEntries(store.list().map((i) => [i.id, itemDetail(store, nextOf, i.id)]))
	const calls = Object.fromEntries(store.calls().map(({ raw, ...c }) => [c.id, { ...c, raw: raw && raw.length > 400_000 ? raw.slice(-400_000) : raw }]))
	// `</` inside the data would end the script element.
	const data = JSON.stringify({ model, details, calls }).replaceAll('</', '<\\/')
	return CONSOLE.replace('<script>', `<script>var STATIC = ${data};</script><script>`)
}

/** Serves the console until interrupted. Prints one JSON line with its address first, so an agent can hand it on. */
export const serve = (path: string, nextOf: NextOf, host: string, port: number, renderer?: TraceRenderer) =>
	Effect.callback<never, MadeWellError>((resume) => {
		const open = storeWatcher(path)
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? '/', 'http://console')
			const store = open()
			try {
				if (url.pathname === '/') {
					res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
					return res.end(CONSOLE)
				}
				if (!store) return json(res, { store: null, path, at: new Date().toISOString() })
				// The page asks again only when the record or a running step's output moved.
				if (url.pathname === '/api/mark') return json(res, { ...store.mark(), runner: store.runner()?.pid ?? null, live: liveFiles(path).map((f) => `${f.name}:${f.bytes}`).join(',') })
				if (url.pathname === '/api/model') return json(res, modelOf(store, nextOf))
				const trace = /^\/api\/trace\/(\d+)$/.exec(url.pathname)
				if (trace) {
					const lens = url.searchParams.get('lens') ?? 'ux'
					if (!['ux', 'dx', 'ax'].includes(lens)) return json(res, { error: 'usage', message: 'lens must be ux, dx or ax', context: { command: 'trace' }, next: [{ run: 'mw', why: 'read the command schemas' }] }, 400)
					const target = store.get(Number(trace[1]))
					if (!target) return json(res, null, 404)
					const view = lensOf(store, target.id, lens as Lens, nextOf(target))
					void Effect.runPromise(renderTrace(view, renderer)).then((rendered) => json(res, rendered))
					return
				}
				const item = /^\/api\/item\/(\d+)$/.exec(url.pathname)
				if (item) return ((d) => json(res, d ?? null, d ? 200 : 404))(itemDetail(store, nextOf, Number(item[1])))
				const call = /^\/api\/call\/(\d+)$/.exec(url.pathname)
				if (call) return ((c) => json(res, c ?? null, c ? 200 : 404))(store.call(Number(call[1])))
				const live = /^\/api\/live\/([\w.-]+\.log)$/.exec(url.pathname)
				if (live) return json(res, readFrom(join(liveDir(path), basename(live[1]!)), Number(url.searchParams.get('from') ?? 0)))
				const spans = /^\/api\/spans\/(\d+)$/.exec(url.pathname)
				if (spans) return json(res, spansOf(path, Number(spans[1])))
				json(res, { error: 'not_found', path: url.pathname }, 404)
			} catch (e) {
				json(res, { error: 'console_failed', message: String(e) }, 500)
			}
		})
		server.on('error', (e) => resume(Effect.fail(new MadeWellError({
			code: 'ui_unavailable', message: `The console cannot listen on ${host}:${port}: ${e.message}`, context: { host, port, reason: e.message },
			next: [{ run: `mw ui --port ${port + 1}`, why: 'serve it on another port' }],
		}))))
		server.listen(port, host, () => {
			const bound = (server.address() as import('node:net').AddressInfo).port
			const url = `http://${host.includes(':') ? `[${host}]` : host}:${bound}/`
			process.stdout.write(JSON.stringify({
				ui: url, store: path,
				next: [
					{ run: `open ${url}`, why: 'watch the work live: what needs you, every item\'s pipeline, what each agent is doing, and where the time and tokens go' },
					{ run: `ssh -L ${bound}:localhost:${bound} <this machine>`, why: 'from another computer, then open the same address there' },
					{ run: 'mw watch', why: 'the same view in a terminal' },
				],
			}) + '\n')
		})
		return Effect.sync(() => void server.close())
	})

// ── The terminal ───────────────────────────────────────────────────────────────────────────────────────

const ESC = '\x1b['
const paint = (code: string, s: string) => `${ESC}${code}m${s}${ESC}0m`
const dim = (s: string) => paint('2', s)
const bold = (s: string) => paint('1', s)
const ACTOR: Record<Actor, string> = { operator: '35', agent: '34', 'made well': '32', runner: '2' }
const GLYPH: Record<StepState, string> = { done: paint('32', '●'), active: paint('34', '◉'), held: paint('31', '◉'), failed: paint('31', '✕'), waiting: paint('33', '◌'), todo: dim('○'), skipped: dim('·') }
const visible = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')
const fit = (s: string, w: number) => {
	if (visible(s).length <= w) return s
	let out = ''
	let n = 0
	for (const part of s.split(/(\x1b\[[0-9;]*m)/)) {
		if (part.startsWith('\x1b[')) out += part
		else for (const ch of part) {
			if (n === w - 1) return `${out}…${ESC}0m`
			out += ch
			n++
		}
	}
	return out
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour12: false })
const tokensText = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n))
const STATUS: Partial<Record<Item['status'], string>> = { held: '31', shipped: '32', candidate: '33', 'waiting-quota': '33', 'waiting-prerequisite': '33', dropped: '2', discovered: '32' }

/** One screen of the console for a terminal `cols` wide and `rows` high. */
export const frame = (m: Model, cols: number, rows: number) => {
	const out: string[] = []
	const s = m.summary
	const now = Date.parse(m.at)
	const project = m.projects.length === 1 ? basename(m.projects[0]!) : `${m.projects.length} projects`
	out.push(`${bold('MADE WELL')}  ${project}  ${m.runner ? paint('32', `● runner ${m.runner.pid}`) : paint('33', '○ no runner')}  ${dim(clock(m.at))}`)
	out.push(`${paint('32', `${s.shipped} shipped`)} · ${s.moving} moving · ${s.queued} queued · ${s.held ? paint('31', `${s.held} need you`) : '0 need you'} · ${s.candidates} candidates   ${dim(`${secs(s.agentMs)} agent time · ${tokensText(s.tokens)} tokens · ${s.calls} calls · NQ ${s.agentMs ? Math.round((s.nqMs / s.agentMs) * 100) : 0}%`)}`)
	if (m.needs.length) {
		out.push('')
		out.push(paint('31', bold('NEEDS YOU')))
		for (const n of m.needs) {
			out.push(`  ${paint('31', n.item ? `#${n.item}` : '•')} ${n.message}`)
			for (const q of n.questions.slice(0, 4)) out.push(dim(`     – ${q}`))
			for (const c of n.next.slice(0, 3)) out.push(`    ${paint('36', c.run)}  ${dim(c.why)}`)
		}
	}
	out.push('')
	out.push(bold('WORK'))
	for (const i of m.items.filter((i) => i.status !== 'dropped')) {
		const steps = i.steps.map((st) => GLYPH[st.state]).join('') + ' '.repeat(Math.max(0, 8 - i.steps.length))
		const word = ({ discovered: 'found', 'waiting-quota': 'quota', 'waiting-prerequisite': 'waits' } as Record<string, string>)[i.status] ?? i.status
		out.push(`  ${bold(`#${String(i.id).padEnd(3)}`)} ${steps} ${paint(STATUS[i.status] ?? '0', word.padEnd(9))} ${short(i.title, 48).padEnd(48)} ${dim(short(i.doing, 120))}`)
	}
	if (m.running.length) {
		out.push('')
		out.push(bold('NOW'))
		for (const r of m.running) {
			out.push(`  ${bold(`#${r.item}`)} ${r.kind === 'execute' ? r.job : `${r.kind} · ${r.job}`} · ${r.who}${r.card ? dim(` · ${r.card}`) : ''}  ${paint('34', secs(now - Date.parse(r.since)))}`)
			for (const a of r.activity.slice(-2)) out.push(dim(`     │ ${a.text}`))
		}
	}
	out.push('')
	out.push(bold('LOG'))
	const room = Math.max(3, rows - out.length - 2)
	for (const e of m.events.slice(-room)) out.push(`  ${dim(clock(e.at))}  ${paint(ACTOR[e.actor], e.actor.padEnd(9))} ${e.item ? `#${e.item}`.padEnd(5) : '     '}${e.say}`)
	out.push(dim('Ctrl-C quits · mw ui opens the full console · mw show <id> for one item\'s record'))
	return out.map((l) => fit(l, cols)).join('\n')
}

/**
 * `mw watch`: in a terminal, the console redrawn every second; read by a program, every event as one JSON line
 * from `since` on, with each call's record once it ends, then every new one as it happens.
 */
export const watch = (path: string, nextOf: NextOf, opts: { tty: boolean; since: number; once: boolean }) =>
	Effect.callback<{ watched: string; next: { run: string; why: string }[] }>((resume) => {
		const open = storeWatcher(path)
		let seq = opts.since
		// Carrying on from an event carries on from the calls recorded by then too.
		let calls = opts.since > 0 ? (open()?.mark().calls ?? 0) : 0
		let lastFrame = ''
		const tick = () => {
			const store = open()
			if (opts.tty) {
				const text = store ? frame(modelOf(store, nextOf), process.stdout.columns || 120, process.stdout.rows || 40) : `${bold('MADE WELL')}  no store yet at ${path}; it appears with the first \`mw discover\` or \`mw start\`.`
				if (text !== lastFrame) process.stdout.write(`${ESC}H${ESC}2J${text}\n`)
				lastFrame = text
				return
			}
			if (!store) return
			const titles = new Map(store.list().map((i) => [i.id, i.title]))
			for (const e of store.allEvents().filter((e) => e.seq > seq)) {
				process.stdout.write(JSON.stringify({ event: { ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) } }) + '\n')
				seq = e.seq
			}
			for (const c of store.callHeads().filter((c) => c.id > calls)) {
				process.stdout.write(JSON.stringify({ call: c }) + '\n')
				calls = c.id
			}
		}
		const done = () => resume(Effect.succeed({ watched: path, next: [{ run: `mw watch --since ${seq}`, why: 'carry on from here' }] }))
		tick()
		if (opts.once) {
			if (opts.tty) process.stdout.write('\n')
			done()
			return
		}
		if (opts.tty) process.stdout.write(`${ESC}?25l`)
		const timer = setInterval(tick, 1000)
		return Effect.sync(() => {
			clearInterval(timer)
			if (opts.tty) process.stdout.write(`${ESC}?25h`)
		})
	})
