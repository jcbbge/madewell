// Compact read surface over existing NQ records. Nothing here establishes fresh environment readiness.
import { buildAnswerHistory } from './handoff-history.ts'
import { deliverableShape, laneOf, lastJson, stepOf } from './lane.ts'
import { questionKey, workQuestions } from './nq-obligations.ts'
import type { Event, Item, Store } from './store.ts'

type Reader = Pick<Store['Service'], 'get' | 'events' | 'call'>
export const evidenceUrl = (item: number, kind: string, ref: string | number) => `/api/v1/items/${item}/evidence?kind=${kind}&ref=${encodeURIComponent(ref)}`
export function ancestryEvents(store: Pick<Reader, 'get' | 'events'>, item: Item): Event[] {
	const visited = new Set<number>(), events: Event[] = []
	const visit = (owner: Item | undefined) => {
		if (!owner || visited.has(owner.id)) return
		visited.add(owner.id); events.push(...store.events(owner.id))
		if (owner.discovery !== undefined) visit(store.get(owner.discovery))
		if (owner.parent !== undefined) visit(store.get(owner.parent))
	}
	visit(item)
	return events.sort((a, b) => a.seq - b.seq)
}
export function answerReferenceOf(store: Pick<Reader, 'get' | 'events'>, item: Item, ref: string, job = '') {
	const events = ancestryEvents(store, item), history = buildAnswerHistory(events, job)
	const answer = history.answers.find(a => a.id === ref)
	if (!answer) return null
	const canonical = history.packetAnswers().find(a => a.id === ref || a.aliases?.some(alias => alias.id === ref))!
	const event = events.find(e => e.seq === Number(ref.split(':')[0]))
	return { requestedId: ref, canonicalId: canonical.id, question: answer.question, answer: answer.answer, by: ['undefined', 'null'].includes(answer.by) ? 'unknown' : answer.by, job: answer.job, source: event ? { item: event.item, event: event.seq, at: event.at } : null }
}
export function messageReferencesOf(store: Reader, item: Item, event: Event) {
	const reuse = Array.isArray(event.data.reuse) ? event.data.reuse as Array<{ question: string; answerId: string }> : typeof event.data.answerId === 'string' ? [{ question: String(event.data.question ?? ''), answerId: event.data.answerId }] : []
	const refs = reuse.length ? reuse : event.kind === 'nq-decided' && Array.isArray(event.data.questions) ? event.data.questions.map((q, i) => ({ question: String(q), answerId: `${event.seq}:${i}` })) : []
	return refs.map(r => {
		const saved = answerReferenceOf(store, item, r.answerId)
		return { question: r.question, answerId: r.answerId, canonicalId: saved?.canonicalId ?? null, resolved: !!saved, by: saved?.by ?? 'unknown', job: saved?.job ?? null, source: saved?.source ?? null, detail: evidenceUrl(item.id, 'answer', r.answerId) }
	})
}
export type AnswerReference = ReturnType<typeof messageReferencesOf>[number]
export interface HandoffQuestion {
	id: string; text: string; textTruncated: boolean; ownerRole: string; blockingRole: string | null; resolution: 'resolved' | 'unresolved'; resolutions: AnswerReference[]; resolutionsTotal: number; resolutionsOmitted: number
}
export interface HandoffInput {
	id: string; state: 'recorded-available' | 'recorded-unavailable' | 'not-checked' | 'unknown'; currentAvailability: 'unknown'; declaration: Record<string, unknown> | null; observation: Record<string, unknown> | null; evidence: string
}
export interface HandoffEntry {
	id: string; job: string; profile: string; duty: string; dutyTruncated: boolean; kind: 'agent' | 'command' | 'group' | 'engine'; mode: 'current' | 'configured-next'; exchangeStatus: string; round: number; questionIds: string[]; unresolvedCount: number
	expectedOutput: { state: 'configured' | 'unspecified'; detail: string; pointer: string }
	inputs: HandoffInput[]; inputsTotal: number; inputsOmitted: number; declarationsKnown: boolean; evidence: { detail: string; eventSeqs: number[] }; truncated: boolean
}
function fullHandoffOf(store: Reader, item: Item, job: string) {
	const lane = laneOf(item.pack), step = stepOf(lane, job), track = item.split?.[job as 'implement' | 'test-plan'], exchange = track?.exchange ?? (item.job === job ? item.exchange : undefined)
	const events = ancestryEvents(store, item), own = events.filter(e => e.item === item.id && e.data.job === job)
	const boundary = own.findLast(e => e.kind === 'handoff'), history = buildAnswerHistory(events, job)
	const questions: HandoffQuestion[] = workQuestions(store, item).map(q => {
		const answers = history.answers.filter(a => {
			const e = events.find(e => e.seq === Number(a.id.split(':')[0]))
			return Array.isArray(e?.data.questionIds) && e.data.questionIds.includes(q.id) || questionKey(a.question) === questionKey(q.text)
		})
		const resolutions = answers.map(a => ({ question: a.question, answerId: a.id, canonicalId: answerReferenceOf(store, item, a.id, job)?.canonicalId ?? null, resolved: true, by: ['undefined', 'null'].includes(a.by) ? 'unknown' : a.by, job: a.job, source: (() => { const e = events.find(e => e.seq === Number(a.id.split(':')[0])); return e ? { item: e.item, event: e.seq, at: e.at } : null })(), detail: evidenceUrl(item.id, 'answer', a.id) }))
		return { ...q, textTruncated: false, resolution: resolutions.length ? 'resolved' : 'unresolved', resolutions, resolutionsTotal: resolutions.length, resolutionsOmitted: 0 }
	})
	const declarations: Array<{ call: number; scope: string; projectInputs: unknown }> = []
	for (const e of own.filter(e => e.kind === 'call-finished' && ['intake', 'execute'].includes(String(e.data.kind)))) {
		const call = typeof e.data.call === 'number' ? store.call(e.data.call) : undefined
		if (!call || call.item !== item.id || call.job !== job) continue
		const packet = lastJson(call.prompt)
		if (packet && 'projectInputs' in packet) declarations.push({ call: call.id, scope: packet.round === item.round && (!boundary || e.seq > boundary.seq) ? 'current-round' : 'historical', projectInputs: packet.projectInputs })
	}
	const observations = own.filter(e => e.kind === 'inputs-checked').flatMap(e => Array.isArray(e.data.inputs) ? e.data.inputs.map((input): Record<string, unknown> & { event: number } => ({ ...(input as Record<string, unknown>), job, name: e.data.name ?? null, dir: e.data.dir ?? null, at: e.at, event: e.seq, item: e.item })) : [])
	const declaration = declarations.findLast(d => d.scope === 'current-round') ?? declarations.at(-1)
	const declared = Array.isArray(declaration?.projectInputs) ? declaration.projectInputs as Array<Record<string, unknown>> : []
	const inputs: HandoffInput[] = observations.toReversed().map(o => ({ id: String(o.id), state: o.ok === true ? 'recorded-available' : 'recorded-unavailable', currentAvailability: 'unknown', declaration: declared.find(d => d.id === o.id) ? { ...declared.find(d => d.id === o.id), call: declaration!.call, scope: declaration!.scope } : null, observation: o, evidence: evidenceUrl(item.id, 'event', o.event) }))
	for (const d of declared) if (!observations.some(o => o.id === d.id)) inputs.push({ id: String(d.id), state: 'not-checked', currentAvailability: 'unknown', declaration: { ...d, call: declaration!.call, scope: declaration!.scope }, observation: null, evidence: evidenceUrl(item.id, 'handoff', job) })
	const names = [job, step.profile].map(s => s.toLowerCase().trim()), assigned = questions.filter(q => names.includes(q.ownerRole.toLowerCase().trim()) || q.blockingRole !== null && names.includes(q.blockingRole.toLowerCase().trim()))
	const kind = step.children ? 'group' : step.run ? 'command' : job === 'verify' && lane.pack.runtime !== 'functions' ? 'engine' : 'agent'
	const entry: HandoffEntry = { id: `item:${item.id}:job:${job}:round:${item.round}:handoff:${boundary?.seq ?? 'configured'}`, job, profile: step.profile, duty: step.duty, dutyTruncated: false, kind, mode: item.status === 'candidate' || kind === 'agent' && !exchange ? 'configured-next' : 'current', exchangeStatus: kind === 'agent' ? exchange?.status ?? 'not-established' : 'not-applicable', round: item.round, questionIds: assigned.map(q => q.id), unresolvedCount: assigned.filter(q => q.resolution === 'unresolved').length, expectedOutput: { state: deliverableShape(lane, job, item.autonomy === 'full') ? 'configured' : 'unspecified', detail: evidenceUrl(item.id, 'handoff', job), pointer: '/data/outputSchema' }, inputs, inputsTotal: inputs.length, inputsOmitted: 0, declarationsKnown: !!declaration, evidence: { detail: evidenceUrl(item.id, 'handoff', job), eventSeqs: own.filter(e => ['handoff', 'nq-clear'].includes(e.kind)).map(e => e.seq) }, truncated: false }
	return { entry, questions, declarations, observations, outputSchema: deliverableShape(lane, job, item.autonomy === 'full') ?? null }
}
export function currentHandoffOf(store: Reader, item: Item) {
	const lane = laneOf(item.pack), terminal = ['shipped', 'completed', 'discovered', 'dropped'].includes(item.status)
	const tracks = lane.delivery.filter(s => item.split?.[s.job as 'implement' | 'test-plan'] && !item.split[s.job as 'implement' | 'test-plan']!.done).map(s => s.job)
	const jobs = terminal ? [] : tracks.length ? tracks : [...lane.discovery, ...lane.delivery, ...(lane.arbiter ? [lane.arbiter] : [])].some(s => s.job === item.job) ? [item.job] : []
	const full = jobs.map(job => fullHandoffOf(store, item, job))
	const entries = full.map(({ entry }) => ({ ...entry, duty: entry.duty.slice(0, 240), dutyTruncated: entry.duty.length > 240, inputs: entry.inputs.slice(0, 5), inputsOmitted: Math.max(0, entry.inputsTotal - 5), evidence: { ...entry.evidence, eventSeqs: entry.evidence.eventSeqs.slice(-2) }, truncated: entry.duty.length > 240 || entry.inputsTotal > 5 }))
	// Per-maker filtering is applied before combining questions; never borrow the other maker's private history.
	const questions: HandoffQuestion[] = (full[0]?.questions ?? []).map(q => {
		const variants = full.map(f => f.questions.find(other => other.id === q.id)!).filter(Boolean)
		const resolutions = q.resolutions.filter(r => variants.every(other => other.resolutions.some(saved => saved.answerId === r.answerId)))
		return { ...q, resolutions, resolutionsTotal: resolutions.length, resolution: resolutions.length ? 'resolved' : 'unresolved' }
	})
	const summary = { entries, questions: questions.slice(0, 10).map(q => ({ ...q, text: q.text.slice(0, 240), textTruncated: q.text.length > 240, resolutions: q.resolutions.slice(0, 2).map(r => ({ ...r, question: r.question.slice(0, 240) })), resolutionsOmitted: Math.max(0, q.resolutionsTotal - 2) })), questionsTotal: questions.length, questionsOmitted: Math.max(0, questions.length - 10), evidence: { detail: `/api/trace/${item.id}?lens=ax` }, truncated: false }
	while (JSON.stringify(summary).length > 6000) {
		const input = entries.toReversed().find(e => e.inputs.length)
		if (input) { input.inputs.pop(); input.inputsOmitted++; input.truncated = true }
		else if (summary.questions.length) { summary.questions.pop(); summary.questionsOmitted++ }
		else { for (const e of entries) { e.duty = ''; e.dutyTruncated = true; e.questionIds = []; e.evidence.eventSeqs = [] }; break }
		summary.truncated = true
	}
	summary.truncated ||= summary.questionsOmitted > 0 || entries.some(e => e.truncated) || summary.questions.some(q => q.textTruncated || q.resolutionsOmitted > 0)
	return summary
}
export function evidenceDetailOf(store: Reader, item: Item, kind: 'event' | 'answer' | 'handoff', ref: string) {
	if (kind === 'answer') return answerReferenceOf(store, item, ref)
	if (kind === 'event') { const event = ancestryEvents(store, item).find(e => e.seq === Number(ref)); return event ? { event, references: messageReferencesOf(store, item, event) } : null }
	const lane = laneOf(item.pack)
	return [...lane.discovery, ...lane.delivery, ...(lane.arbiter ? [lane.arbiter] : [])].some(s => s.job === ref) ? fullHandoffOf(store, item, ref) : null
}
