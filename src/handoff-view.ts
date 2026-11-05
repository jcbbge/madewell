// Compact read surface over existing NQ records. Nothing here establishes fresh environment readiness.
import { createHash } from 'node:crypto'
import { buildAnswerHistory } from './handoff-history.ts'
import { deliverableShape, laneOf, lastJson, stepOf } from './lane.ts'
import { organOutputShape } from './organs.ts'
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
export function fullHandoffOf(store: Reader, item: Item, job: string) {
	const lane = laneOf(item.pack), step = stepOf(lane, job), track = item.flow?.tracks?.[step.track??'main']??item.split?.[job as 'implement' | 'test-plan'], exchange = track?.exchange ?? (item.job === job ? item.exchange : undefined)
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
	for(const e of own.filter(e=>e.kind==='function-started')){const input=e.data.input as {bindings?:{inputs?:unknown}}|undefined;if(input?.bindings)declarations.push({call:0,scope:'current-round',projectInputs:input.bindings.inputs??[]})}
	const observations = own.filter(e => e.kind === 'inputs-checked').flatMap(e => Array.isArray(e.data.inputs) ? e.data.inputs.map((input): Record<string, unknown> & { event: number } => ({ ...(input as Record<string, unknown>), job, name: e.data.name ?? null, dir: e.data.dir ?? null, at: e.at, event: e.seq, item: e.item })) : [])
	const declaration = declarations.findLast(d => d.scope === 'current-round') ?? declarations.at(-1)
	const declared = Array.isArray(declaration?.projectInputs) ? declaration.projectInputs as Array<Record<string, unknown>> : []
	const inputs: HandoffInput[] = observations.toReversed().map(o => ({ id: String(o.id), state: o.ok === true ? 'recorded-available' : 'recorded-unavailable', currentAvailability: 'unknown', declaration: declared.find(d => d.id === o.id) ? { ...declared.find(d => d.id === o.id), call: declaration!.call, scope: declaration!.scope } : null, observation: o, evidence: evidenceUrl(item.id, 'event', o.event) }))
	for (const d of declared) if (!observations.some(o => o.id === d.id)) inputs.push({ id: String(d.id), state: 'not-checked', currentAvailability: 'unknown', declaration: { ...d, call: declaration!.call, scope: declaration!.scope }, observation: null, evidence: evidenceUrl(item.id, 'handoff', job) })
	const names = [job, step.profile].map(s => s.toLowerCase().trim()), assigned = questions.filter(q => names.includes(q.ownerRole.toLowerCase().trim()) || q.blockingRole !== null && names.includes(q.blockingRole.toLowerCase().trim()))
	const kind = step.children ? 'group' : step.run ? 'command' : job === 'verify' && lane.pack.runtime !== 'functions' ? 'engine' : 'agent'
	const entry: HandoffEntry = { id: `item:${item.id}:job:${job}:round:${item.round}:handoff:${boundary?.seq ?? 'configured'}`, job, profile: step.profile, duty: step.duty, dutyTruncated: false, kind, mode: item.status === 'candidate' || kind === 'agent' && !exchange ? 'configured-next' : 'current', exchangeStatus: kind === 'agent' ? exchange?.status ?? 'not-established' : 'not-applicable', round: item.round, questionIds: assigned.map(q => q.id), unresolvedCount: assigned.filter(q => q.resolution === 'unresolved').length, expectedOutput: { state: organOutputShape(item, deliverableShape(lane, job, item.autonomy === 'full')) ? 'configured' : 'unspecified', detail: evidenceUrl(item.id, 'handoff', job), pointer: '/data/outputSchema' }, inputs, inputsTotal: inputs.length, inputsOmitted: 0, declarationsKnown: !!declaration, evidence: { detail: evidenceUrl(item.id, 'handoff', job), eventSeqs: own.filter(e => ['handoff', 'nq-clear'].includes(e.kind)).map(e => e.seq) }, truncated: false }
	return { entry, questions, declarations, observations, outputSchema: organOutputShape(item, deliverableShape(lane, job, item.autonomy === 'full')) ?? null }
}
// Display strings are previews; keys and digest-checked links carry identity.
export const displayPreview = (value: string, limit = 120) => Array.from(value).slice(0, limit).join('')
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const configuredSteps = (item: Item) => { const lane = laneOf(item.pack); return [...lane.discovery, ...lane.delivery, ...(lane.arbiter ? [lane.arbiter] : [])] }
export interface CompactQuestion {
 key: string; id: string; text: string; textTruncated: boolean; ownerRole: string; blockingRole: string | null; truncated: boolean
}
export interface CompactQuestionState {
 key: string; resolution: 'resolved' | 'unresolved'; resolutions: AnswerReference[]; resolutionsTotal: number; resolutionsOmitted: number; truncated: boolean
}
export interface CompactInput {
 key: string; id: string; state: HandoffInput['state']; currentAvailability: 'unknown';
 observation: { event: number; item: number | null; ok: boolean; at: string; job: string; name: string | null; dir: string | null } | null;
 evidence: string; truncated: boolean
}
export interface CompactEntry {
 key: string; id: string; job: string; profile: string; duty: string; dutyTruncated: boolean;
 kind: HandoffEntry['kind']; mode: HandoffEntry['mode']; exchangeStatus: string; round: number;
 questionStates: CompactQuestionState[]; questionsTotal: number; questionsOmitted: number; unresolvedCount: number;
 expectedOutput: HandoffEntry['expectedOutput']; inputs: CompactInput[]; inputsTotal: number; inputsOmitted: number;
 declarationsKnown: boolean; evidence: HandoffEntry['evidence']; truncated: boolean
}
export function currentHandoffOf(store: Reader, item: Item) {
 const lane = laneOf(item.pack), terminal = ['shipped', 'completed', 'discovered', 'dropped'].includes(item.status)
 const steps = configuredSteps(item)
 const tracks = [...new Set(Object.values(item.flow?.tracks??{}).flatMap(t=>t.pending?[t.pending.job]:[]))]
 if(!tracks.length)tracks.push(...lane.delivery.filter(s => item.split?.[s.job as 'implement' | 'test-plan'] && !item.split[s.job as 'implement' | 'test-plan']!.done).map(s => s.job))
 const jobs = terminal ? [] : tracks.length ? tracks : steps.some(s => s.job === item.job) ? [item.job] : []
 const full = jobs.map(job => fullHandoffOf(store, item, job))
 const allQuestions = full[0]?.questions ?? fullHandoffOf(store, item, item.job).questions
 const questionKeys = new Map(allQuestions.map((q, i) => [q.id, `q:${i}:${digest(q.id)}`]))
 const questions: CompactQuestion[] = allQuestions.slice(0, 10).map(q => ({ key: questionKeys.get(q.id)!, id: displayPreview(q.id), text: displayPreview(q.text, 240), textTruncated: Array.from(q.text).length > 240, ownerRole: displayPreview(q.ownerRole), blockingRole: q.blockingRole === null ? null : displayPreview(q.blockingRole), truncated: [q.id, q.ownerRole, q.blockingRole ?? ''].some(v => Array.from(v).length > 120) || Array.from(q.text).length > 240 }))
 const entries: CompactEntry[] = full.map(f => {
  const e = f.entry, slot = steps.findIndex(s => s.job === e.job), detail = evidenceUrl(item.id, 'handoff-slot', `${slot}:${digest(f)}`)
  const retained = new Set(questions.map(q => q.key))
  const assigned = f.questions.filter(q => e.questionIds.includes(q.id))
  const questionStates: CompactQuestionState[] = assigned.filter(q => retained.has(questionKeys.get(q.id)!)).map(q => ({ key: questionKeys.get(q.id)!, resolution: q.resolution, resolutions: q.resolutions.slice(0, 2).map(r => ({ question: displayPreview(r.question, 240), answerId: displayPreview(r.answerId), canonicalId: r.canonicalId === null ? null : displayPreview(r.canonicalId), resolved: r.resolved, by: displayPreview(r.by), job: r.job === null ? null : displayPreview(r.job), source: r.source ? { item: r.source.item, event: r.source.event, at: displayPreview(r.source.at) } : null, detail })), resolutionsTotal: q.resolutionsTotal, resolutionsOmitted: Math.max(0, q.resolutionsTotal - 2), truncated: q.resolutionsTotal > 2 || q.resolutions.some(r => Array.from(r.question).length > 240 || [r.answerId, r.canonicalId ?? '', r.by, r.job ?? '', r.source?.at ?? ''].some(v => Array.from(v).length > 120)) }))
  const inputs: CompactInput[] = e.inputs.slice(0, 5).map((input, i) => {
   const o = input.observation
   const text = (key: string) => o?.[key] === null || o?.[key] === undefined ? null : displayPreview(String(o[key]))
   return { key: `i:${i}:${digest([input.id, o?.event ?? null, input.declaration?.call ?? null])}`, id: displayPreview(input.id), state: input.state, currentAvailability: 'unknown', observation: o ? { event: Number(o.event), item: typeof o.item === 'number' ? o.item : null, ok: o.ok === true, at: text('at') ?? '', job: text('job') ?? '', name: text('name'), dir: text('dir') } : null, evidence: o ? evidenceUrl(item.id, 'event', Number(o.event)) : detail, truncated: Array.from(input.id).length > 120 || !!input.declaration || !!o }
  })
  return { key: `h:${slot}:${digest(e.id)}`, id: displayPreview(e.id), job: displayPreview(e.job), profile: displayPreview(e.profile), duty: displayPreview(e.duty, 240), dutyTruncated: Array.from(e.duty).length > 240, kind: e.kind, mode: e.mode, exchangeStatus: displayPreview(e.exchangeStatus), round: e.round, questionStates, questionsTotal: assigned.length, questionsOmitted: assigned.length - questionStates.length, unresolvedCount: e.unresolvedCount, expectedOutput: { state: e.expectedOutput.state, detail, pointer: '/data/outputSchema' }, inputs, inputsTotal: e.inputsTotal, inputsOmitted: e.inputsTotal - inputs.length, declarationsKnown: e.declarationsKnown, evidence: { detail, eventSeqs: e.evidence.eventSeqs.slice(-2) }, truncated: e.evidence.eventSeqs.length > 2 || [e.id, e.job, e.profile, e.exchangeStatus].some(v => Array.from(v).length > 120) || Array.from(e.duty).length > 240 }
 })
 const summary = { entries, entriesTotal: entries.length, entriesOmitted: 0, questions, questionsTotal: allQuestions.length, questionsOmitted: allQuestions.length - questions.length, evidence: { detail: `/api/trace/${item.id}?lens=ax` }, truncated: false }
 const account = () => {
  summary.entriesOmitted = summary.entriesTotal - entries.length
  summary.questionsOmitted = summary.questionsTotal - questions.length
  const visible = new Set(questions.map(q => q.key))
  for (const e of entries) {
   e.questionStates = e.questionStates.filter(q => visible.has(q.key))
   e.questionsOmitted = e.questionsTotal - e.questionStates.length
   e.inputsOmitted = e.inputsTotal - e.inputs.length
   e.truncated ||= e.questionsOmitted > 0 || e.inputsOmitted > 0 || e.inputs.some(i => i.truncated) || e.questionStates.some(q => q.truncated)
  }
  summary.truncated ||= summary.entriesOmitted > 0 || summary.questionsOmitted > 0 || entries.some(e => e.truncated) || questions.some(q => q.truncated)
 }
 const oversized = () => { const json = JSON.stringify(summary); return json.length > 6000 || Buffer.byteLength(json, 'utf8') > 6000 }
 account()
 while (oversized()) {
  summary.truncated = true
  const withInput = entries.toReversed().find(e => e.inputs.length)
  if (withInput) { withInput.inputs.pop(); withInput.truncated = true }
  else if (questions.length) questions.pop()
  else {
   const verbose = entries.toReversed().find(e => e.duty || e.id || e.evidence.eventSeqs.length)
   if (verbose) { verbose.duty = ''; verbose.dutyTruncated = true; verbose.id = ''; verbose.evidence.eventSeqs = []; verbose.truncated = true }
   else entries.pop()
  }
  account()
 }
 return summary
}
export function evidenceDetailOf(store: Reader, item: Item, kind: 'event' | 'answer' | 'handoff' | 'handoff-slot', ref: string) {
 if (kind === 'answer') return answerReferenceOf(store, item, ref)
 if (kind === 'event') { const event = ancestryEvents(store, item).find(e => e.seq === Number(ref)); return event ? { event, references: messageReferencesOf(store, item, event) } : null }
 const steps = configuredSteps(item)
 if (kind === 'handoff-slot') {
  if (!/^(0|[1-9]\d*):[a-f0-9]{64}$/.test(ref)) return null
  const [rawSlot, hash] = ref.split(':'), slot = Number(rawSlot)
  if (!Number.isSafeInteger(slot) || !steps[slot]) return null
  const full = fullHandoffOf(store, item, steps[slot]!.job)
  return digest(full) === hash ? full : null
 }
 return steps.some(s => s.job === ref) ? fullHandoffOf(store, item, ref) : null
}
