// The prescribed demo grammar and a read-only view of its existing work record.
import { Schema } from 'effect'
import { readiness } from './readiness.ts'
import { Decision } from './decision.ts'
import { isMaker, laneOf, lastJson, shapeOf, stepOf, type Pack } from './lane.ts'
import { workEvidenceOf, type WorkEvidence } from './work-evidence.ts'
import { currentHandoffOf } from './handoff-view.ts'
import { organSummary } from './organs.ts'
import type { CallHead, Item, Store } from './store.ts'
import { totalTokens } from './telemetry.ts'

type WorkStore = Pick<Store['Service'], 'get' | 'list' | 'events' | 'callHeads' | 'call' | 'runner'>
export const DISCOVERY_FUNCTIONS = [
	['declare', 'Declare()'], ['look-first', 'lookFirst()'], ['classify', 'classify()'],
	['lenses', 'Lenses()'], ['one-thing', 'oneThing()'], ['route', 'route()'], ['discover', 'confirm()'],
] as const
const finding = shapeOf(Schema.Struct({ result: Schema.NonEmptyString, sources: Schema.Array(Schema.String), unknowns: Schema.Array(Schema.String), decisions: Schema.Array(Decision) }))

/** An explicit general work demonstration with independently accepted structured results. */
export const GRAMMAR_PACK: Pack = {
	name: 'made-well-grammar-demo', version: '2', runtime: 'functions', contracts:{execution:'2',discovery:'2',acceptance:'2',handoff:'2'},
	brief: 'Run the prescribed grammar without skipping obligations. Discovery functions investigate and return their own concrete result, source references and genuine unknowns; preserve earlier accepted outputs. The discovery report generates coherent tasks, not an implementation plan. Every task subsequently owes ideation, planning, implementation and independent verification. Keep outputs concise but complete, and use the existing NQ and rubric for actual decisions.',
	discovery: [{ cartridge: 'discovery', steps: [
		{ job: 'declare', profile: 'ideator', duty: 'Declare the intended outcome, source, scope and authority in the operator\'s words. Separate explicit instructions from your interpretation; do not implement.', output: finding },
		{ job: 'look-first', profile: 'ideator', duty: 'Inspect declared material, its instructions and relevant artifacts. Report what already exists, its exact locations and constraints; do not change it.', output: finding },
		{ job: 'classify', profile: 'ideator', duty: 'Classify the source into requested changes, observations, constraints and unresolved questions. Preserve source references and distinguish facts from proposed work; do not implement.', output: finding },
		{ job: 'lenses', profile: 'ideator', duty: 'Examine the proposed work through relevant user, developer and agentic concerns for this task. Record concrete tradeoffs and risks without inventing requirements or implementing.', output: finding },
		{ job: 'one-thing', profile: 'ideator', duty: 'Separate the grounded work into individual coherent candidate tasks, each with its purpose, boundaries and observable completion conditions. Reconcile existing work rather than duplicating it; do not plan code changes.', output: finding },
		{ job: 'route', profile: 'ideator', duty: 'Determine which candidate tasks are independent and which depend on another candidate or an unresolved external prerequisite. Preserve the reason for each dependency and allow independent tasks to proceed in parallel.', output: finding },
		{ job: 'discover', profile: 'ideator', duty:'Confirm candidates with exact conditions and dependencies.', output:{type:'object',required:['items'],properties:{items:{type:'array',items:{type:'object',required:['title','objective','text','conditions'],properties:{title:{type:'string'},objective:{type:'string'},text:{type:'string'},kind:{type:'string'},conditions:{type:'array',items:{type:'object',required:['id','text'],properties:{id:{type:'string'},text:{type:'string'}}}},after:{type:'array',items:{type:'integer'}}}}}}},task: 'This is confirm(). Use all six accepted discovery outputs and the exact original source to return the final task list. Each candidate text preserves its own purpose, constraints, source references and done-when conditions. Use after only for genuine dependencies, as 1-based positions of earlier candidates. Do not invent work, implement it, or omit an unsettled prerequisite.' },
	].map(s=>({...s,replay:'safe' as const,writes:[]})) }],
	delivery: [],
}

export type GrammarState = 'yes' | 'no' | 'unknown' | 'running' | 'blocked'
export interface GrammarStep {
	readonly job: string
	readonly label: string
	readonly state: GrammarState
	readonly complete: boolean
	readonly configured: boolean
	readonly input: unknown | null
	readonly output: unknown | null
	readonly evidence: { readonly eventSeqs: ReadonlyArray<number>; readonly trace: string; readonly provenance?: unknown; readonly laterAttempts?: unknown; readonly acceptedOutput?: unknown; readonly invocation?: unknown }
	readonly reason: string | null
	readonly metrics: { readonly calls: number; readonly durationMs: number | null; readonly tokens: number | null; readonly unreportedUsage: number }
}
export interface GrammarReadiness {
	readonly state: 'delivered' | 'held' | 'dependency-held' | 'dependency-unshipped' | 'waiting-selection' | 'waiting-quota' | 'ready-waiting-runner' | 'running' | 'ready' | 'incomplete'
	readonly ready: boolean
	readonly reason: string
	readonly ownerId: number
	readonly waitingOn: ReadonlyArray<number>
}
export interface GrammarTask {
 readonly objective:string
 readonly owner:string
 readonly nextAction:string
 readonly blockers:Item['blockers']
 readonly completion:Item['completion']|null
	readonly currentHandoff: ReturnType<typeof currentHandoffOf>
	readonly organs: ReturnType<typeof organSummary>
	readonly organJobs: ReadonlyArray<string>
	readonly id: number
	readonly title: string
	readonly status: Item['status']
	readonly currentJob: string
	readonly currentPhase: string
	readonly enteredDelivery: boolean
	readonly phases: ReadonlyArray<GrammarStep>
	readonly testsCreated: boolean
	readonly testCount: number
	readonly verification: { readonly passed: boolean | null; readonly on: string | null; readonly commit: string | null; readonly results: ReadonlyArray<import('./store.ts').CheckResult> }
	readonly delivered: boolean
	readonly shipment: Item['shipped'] | null
	readonly blocker: Item['hold'] | null
	readonly readiness: GrammarReadiness
	readonly after: ReadonlyArray<number>
	readonly updated: string
}
export interface GrammarView {
	readonly discovery: { readonly currentHandoff: ReturnType<typeof currentHandoffOf>; readonly organs: ReturnType<typeof organSummary>; readonly organJobs: ReadonlyArray<string>; readonly id: number; readonly title: string; readonly source: string; readonly status: Item['status']; readonly currentJob: string; readonly steps: ReadonlyArray<GrammarStep>; readonly complete: boolean; readonly completedStepCount: number; readonly requiredStepCount: number; readonly taskListProduced: boolean; readonly candidateIds: ReadonlyArray<number>; readonly updated: string }
	readonly tasks: ReadonlyArray<GrammarTask>
	readonly runner: { readonly active: boolean; readonly pid: number | null }
	readonly observedAt: string
	readonly lastEventAt: string | null
	readonly allDelivered: boolean
	readonly parallel: { readonly observed: boolean; readonly pairs: ReadonlyArray<ReadonlyArray<number>> }
}

const parsed = (raw: string | undefined): unknown | null => raw === undefined || !raw.trim() ? null : lastJson(raw) ?? { text: raw }

function metricsFor(heads: ReadonlyArray<CallHead>, item: number, jobs: ReadonlyArray<string>): GrammarStep['metrics'] {
	const calls = heads.filter((c) => c.item === item && jobs.includes(c.job))
	return { calls: calls.length, durationMs: calls.length ? calls.reduce((n, c) => n + c.ms, 0) : null,
		tokens: calls.length && calls.every((c) => c.tokens !== null) ? calls.reduce((n, c) => n + totalTokens(c.tokens), 0) : null,
		unreportedUsage: calls.filter((c) => c.tokens === null).length }
}

function stepView(item: Item, job: string, label: string, active: boolean, heads: ReadonlyArray<CallHead>, evidence: WorkEvidence | undefined): GrammarStep {
	const current = item.job === job || !!item.split?.[job as 'implement' | 'test-plan'] && !item.split[job as 'implement' | 'test-plan']!.done
	let state: GrammarState = evidence?.state ?? 'unknown', reason = evidence?.reason ?? 'This function is not separately configured in the pinned pack.'
	if (evidence && !evidence.complete && current) {
		if (item.status === 'held') { state = 'blocked'; reason = item.hold?.message ?? 'The item is held.' }
		else if (active && ['running', 'waiting-quota'].includes(item.status)) state = 'running'
	}
	if (evidence && !evidence.complete && current && !active) reason = (reason ?? '') + ' The runner is stopped.'
	const step = stepOf(laneOf(item.pack), job), invocation = evidence?.input ?? null
	let input = invocation
	if (!step.run && !step.children && invocation && typeof invocation === 'object') {
		const captured = invocation as Record<string, unknown>
		input = Object.fromEntries(['call', 'started', 'outcome', 'packet', 'returnedOutput', 'record'].map(key => [key, captured[key]]))
	}
	return { job, label, state, complete: evidence?.complete ?? false, configured: !!evidence, input, output: evidence?.output ?? null, evidence: { eventSeqs: evidence?.eventSeqs ?? [], trace: `/api/trace/${item.id}?lens=ax`, provenance: evidence?.provenance ?? null, laterAttempts: evidence?.laterAttempts ?? null, acceptedOutput: evidence?.acceptedOutput ?? null, invocation }, reason, metrics: metricsFor(heads, item.id, [job]) }
}

function readinessOf(store: Pick<WorkStore, 'get'>, item: Item, active: boolean, delivered: boolean): GrammarReadiness {
	const waitingOn = readiness(store,item).waitingOn
	const result = (state: GrammarReadiness['state'], ready: boolean, reason: string, ownerId = item.id): GrammarReadiness => ({ state, ready, reason, ownerId, waitingOn })
	if (delivered) return result('delivered', false, 'The task has saved completion evidence with its declared provenance.')
	if(item.execution?.mode==='external') return result('incomplete',false,item.progress?.nextAction??'Record progress or completion.')
	if (item.hold || ['held', 'paused'].includes(item.status)) return result('held', false, item.hold?.message ?? 'The task is held for an answer or release.')
	if (waitingOn.length) {
		const held = waitingOn.find((id) => !store.get(id) || ['held', 'paused', 'candidate', 'dropped'].includes(store.get(id)!.status))
		return result(held === undefined ? 'dependency-unshipped' : 'dependency-held', false,
			`Waiting for ${waitingOn.map((id) => `#${id}`).join(', ')} to complete${held === undefined ? '.' : '; a prerequisite is held, unavailable or awaiting selection.'}`, held ?? waitingOn[0]!)
	}
	if (item.status === 'candidate') return result('waiting-selection', false, 'The task awaits selection for delivery.')
	if (item.status === 'waiting-quota') return result('waiting-quota', false, 'Waiting for a prescribed account to reset.')
	if (['shipped', 'completed', 'dropped', 'discovered'].includes(item.status)) return result('incomplete', false, 'The saved end state does not establish all required delivery evidence.')
	const ready=readiness(store,item);if(!ready.ready)return result('incomplete',false,ready.reasons.join('; '))
	if (!active) return result('ready-waiting-runner', true, 'Ready to continue from the saved step; waiting for a runner.')
	return result(item.status === 'running' ? 'running' : 'ready', true, item.status === 'running' ? 'A runner is active; this task is at its saved step.' : 'Dependencies are complete; ready for the active runner.')
}

/** Parent discovery is resolved at the handoff, never copied into a competing work record. Makers stay plan-only. */
export function discoveryContextFor(store: Pick<WorkStore, 'get'>, item: Item, job: string) {
	const step = stepOf(laneOf(item.pack), job)
	if (item.discovery === undefined || isMaker(job) || step.loop !== 'delivery' || !step.receives.includes('discover')) return undefined
	const parent = store.get(item.discovery)
	return {
		id: item.discovery, record: `mw show ${item.discovery}`, available: !!parent,
		...(parent ? { source: parent.source, candidate: parsed(item.outputs.discover), outputs: Object.fromEntries(laneOf(parent.pack).discovery.flatMap((s) => parent.outputs[s.job] === undefined ? [] : [[s.job, { output: parent.outputs[s.job], record: `mw show ${parent.id}` }]])) } : {}),
	}
}

/** Discovery runs in the existing store, including records made before this demo pack existed. */
export function grammarRuns(store: Pick<WorkStore, 'list'>) {
	return store.list().filter((i) => i.discovery === undefined && (i.flow?.loop === 'discovery' || laneOf(i.pack).discovery.some((s) => s.job === i.job)))
		.map((i) => ({ id: i.id, title: i.title, status: i.status, updated: i.updated }))
}

/** Every green value has explicit accepted evidence; job ordering is never completion evidence. */
export function grammarOf(store: WorkStore, id: number): GrammarView | undefined {
	const selected = store.get(id)
	if (!selected) return undefined
	const item = selected.discovery === undefined ? selected : store.get(selected.discovery)
	if (!item) return undefined
	const events = store.events(item.id)
	const discovery = item.flow?.loop === 'discovery' || laneOf(item.pack).discovery.some((s) => s.job === item.job)
	if (!discovery) return undefined
	const runner = store.runner()
	const heads = store.callHeads()
	const children = store.list().filter((c) => c.discovery === item.id)
	const tasks = children.map((child): GrammarTask => {
		const history = store.events(child.id), workEvidence = workEvidenceOf(store, child)
		const phases = [
			['ideation', 'ideation()', ['ideate', 'challenge']], ['planning', 'planning()', ['plan']],
			['implementation', 'implementation()', ['implement']],
		] as const
		const viewed = phases.map(([job, label, jobs]): GrammarStep => {
			const nodes = jobs.map((j) => stepView(child, j, j, !!runner, heads, workEvidence.jobs[j]))
			const state = nodes.every((n) => n.state === 'yes') ? 'yes' : nodes.find((n) => n.state === 'blocked')?.state ?? nodes.find((n) => n.state === 'running')?.state ?? (nodes.some((n) => n.state === 'unknown') ? 'unknown' : 'no')
			return { job, label, state, complete: state === 'yes', configured: nodes.every((n) => n.configured), input: Object.fromEntries(nodes.map((n) => [n.job, n.input])), output: Object.fromEntries(nodes.map((n) => [n.job, n.output])), evidence: { eventSeqs: nodes.flatMap((n) => n.evidence.eventSeqs), trace: `/api/trace/${child.id}?lens=ax`, provenance: Object.fromEntries(nodes.map(n => [n.job, n.evidence.provenance])), laterAttempts: Object.fromEntries(nodes.map(n => [n.job, n.evidence.laterAttempts])), acceptedOutput: Object.fromEntries(nodes.map(n => [n.job, n.evidence.acceptedOutput])), invocation: Object.fromEntries(nodes.map(n => [n.job, n.evidence.invocation ?? null])) }, reason: nodes.find((n) => n.state !== 'yes')?.reason ?? null, metrics: metricsFor(heads, child.id, jobs) }
		})
		const checks = child.checks?.checks ?? []
		const verification = child.verification
		const verifyProof = history.filter((e) => e.kind === 'verified')
		const testsCreated = !!workEvidence.jobs['test-plan']?.complete && checks.length > 0
		const verified = workEvidence.verificationCurrent
		viewed.push({ job: 'verification', label: 'verification()', state: verified ? 'yes' : child.status === 'held' && ['verify', 'arbitrate'].includes(child.job) ? 'blocked' : !!runner && child.job === 'verify' && child.status === 'running' ? 'running' : 'no', complete: verified, configured: laneOf(child.pack).delivery.some((s) => s.job === 'verify'), input: history.findLast((e) => e.kind === 'verify-started')?.data ?? null, output: verification ?? null, evidence: { eventSeqs: verifyProof.map((e) => e.seq), trace: `/api/trace/${child.id}?lens=ax` }, reason: verified ? 'Saved verification applies to the recorded candidate; current deployment has not been rechecked.' : child.hold?.message ?? 'No current passing verification is recorded.', metrics: metricsFor(heads, child.id, ['verify']) })
		if (child.pack?.runtime === 'functions') viewed.splice(0, viewed.length, ...laneOf(child.pack)[child.flow?.loop ?? 'delivery'].map(s => stepView(child, s.job, s.job, !!runner, heads, workEvidence.jobs[s.job])))
		const delivered = workEvidence.delivered
		return { currentHandoff: currentHandoffOf(store, child), organs: organSummary(store, child), organJobs: laneOf(child.pack)[child.flow?.loop ?? 'delivery'].map(step => step.job), id: child.id, title: child.title,objective:child.objective,owner:child.progress.owner,nextAction:child.progress.nextAction,blockers:child.blockers,completion:child.completion??null,status: child.status, currentJob: child.job, currentPhase: child.job === 'arbitrate' ? 'verification' : stepOf(laneOf(child.pack), child.job).cartridge, enteredDelivery: history.some((e) => e.kind === 'handoff' || e.kind === 'call-started'), phases: viewed, testsCreated, testCount: checks.length,
			verification: { passed: verification ? verified ? true : verification.passed ? null : false : null, on: verification?.on ?? null, commit: verification?.commit ?? null, results: verification?.results ?? [] },
			delivered, shipment: child.shipped ?? null, blocker: child.hold ?? null, readiness: readinessOf(store, child, !!runner, delivered), after: child.after ?? [], updated: child.updated }
	})
	const childIds = new Set(children.map((c) => c.id))
	const calls = heads.filter((c) => childIds.has(c.item) && c.kind === 'execute')
	const overlaps = new Set<string>()
	for (let a = 0; a < calls.length; a++) for (let b = a + 1; b < calls.length; b++) {
		const x = calls[a]!, y = calls[b]!
		if (x.item !== y.item && Date.parse(x.started) < Date.parse(y.started) + y.ms && Date.parse(y.started) < Date.parse(x.started) + x.ms) overlaps.add([x.item, y.item].sort((l, r) => l - r).join(':'))
	}
	const allEvents = [...events, ...children.flatMap((c) => store.events(c.id))].sort((a, b) => a.seq - b.seq)
	const workEvidence = workEvidenceOf(store, item)
	const discoverySteps = DISCOVERY_FUNCTIONS.map(([job, label]) => stepView(item, job, label, !!runner, heads, workEvidence.jobs[job]))
	const completedStepCount = discoverySteps.filter((step) => step.complete).length
	const candidates = parsed(item.outputs.discover)
	return { discovery: { currentHandoff: currentHandoffOf(store, item), organs: organSummary(store, item), organJobs: laneOf(item.pack).discovery.map(step => step.job), id: item.id, title: item.title, source: item.source, status: item.status, currentJob: item.job,
		steps: discoverySteps, complete: completedStepCount === DISCOVERY_FUNCTIONS.length, completedStepCount, requiredStepCount: DISCOVERY_FUNCTIONS.length,
		taskListProduced: events.some((e) => e.kind === 'discovered') && discoverySteps.find((step) => step.job === 'discover')!.complete && !!candidates && typeof candidates === 'object' && 'items' in candidates && Array.isArray(candidates.items), candidateIds: children.map((c) => c.id), updated: item.updated },
		tasks, runner: { active: !!runner, pid: runner?.pid ?? null }, observedAt: new Date().toISOString(), lastEventAt: allEvents.at(-1)?.at ?? null,
		allDelivered: tasks.length > 0 && tasks.every((t) => t.delivered), parallel: { observed: overlaps.size > 0, pairs: [...overlaps].map((pair) => pair.split(':').map(Number)) } }
}
