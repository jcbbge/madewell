// Connections to the existing NQ record. The task, its phase and its authorized outcome stay the same.
import { laneOf, lastJson, stepOf, type Job } from './lane.ts'
import { buildAnswerHistory } from './handoff-history.ts'
import type { Item, Store } from './store.ts'

type Reader = Pick<Store['Service'], 'get' | 'events'>
export interface WorkQuestion { readonly id: string; readonly text: string; readonly ownerRole: string; readonly blockingRole: string | null }
export interface PhaseDecision { readonly question: string; readonly questionId?: string; readonly decision: string; readonly why: string }
export const questionKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const isQuestion = (value: unknown): value is WorkQuestion => {
	if (!value || typeof value !== 'object') return false
	const q = value as Record<string, unknown>
	return ['id', 'text', 'ownerRole'].every(key => typeof q[key] === 'string' && !!(q[key] as string).trim()) && (q.blockingRole === null || typeof q.blockingRole === 'string' && !!q.blockingRole.trim())
}

export function answerHistory(store: Reader, item: Item, job: Job) {
	const events = store.events(item.id)
	for (let owner: Item | undefined = item; owner?.discovery !== undefined || owner?.parent !== undefined;) {
		owner = store.get((owner.discovery ?? owner.parent)!)
		if (owner) events.push(...store.events(owner.id))
	}
	return buildAnswerHistory(events, job)
}

const owed = (item: Item, job: Job, questions: ReadonlyArray<WorkQuestion>) => {
	const step = stepOf(laneOf(item.pack), job)
	const names = [job, step.profile].map(name => name.trim().toLowerCase())
	return questions.filter(q => q.blockingRole !== null && names.includes(q.blockingRole.trim().toLowerCase()))
}

/** A task receives only the discovery questions actually assigned to that task. */
export function workQuestions(store: Reader, item: Item): WorkQuestion[] {
	if (item.pack?.contracts?.handoff !== '1') return []
	const owner = item.discovery === undefined ? item : store.get(item.discovery)
	if (!owner) return []
	const candidate = lastJson(item.outputs.discover ?? '')
	const refs = item.discovery === undefined ? undefined : Array.isArray(candidate?.questionRefs) ? candidate.questionRefs : []
	const questions = new Map<string, WorkQuestion>()
	for (const step of laneOf(owner.pack).discovery) {
		const raw = owner.outputs[step.job]
		const value = lastJson(raw ?? '')
		if (!Array.isArray(value?.questions)) continue
		for (const q of value.questions) {
			if (isQuestion(q) && (refs === undefined || refs.includes(q.id))) questions.set(q.id, q)
		}
	}
	return [...questions.values()]
}

export function questionsOwedBy(store: Reader, item: Item, job: Job): WorkQuestion[] {
	return owed(item, job, workQuestions(store, item))
}

export function questionResolved(question: WorkQuestion, answers: ReadonlyArray<{ readonly question: string }>, decisions: ReadonlyArray<PhaseDecision> = []): boolean {
	return answers.some(answer => questionKey(answer.question) === questionKey(question.text)) || decisions.some(decision => decision.questionId === undefined ? questionKey(decision.question) === questionKey(question.text) : decision.questionId === question.id)
}

/** A phase may start to make its own decisions. It cannot claim completion while those decisions are absent. */
export function decisionProblem(store: Reader, item: Item, job: Job, value: Record<string, unknown>, answers: ReadonlyArray<{ readonly question: string }>): string | undefined {
	if (item.pack?.contracts?.handoff !== '1') return undefined
	const decisions = Array.isArray(value.decisions) ? value.decisions as PhaseDecision[] : []
	const known = workQuestions(store, item)
	if (item.discovery === undefined && laneOf(item.pack).discovery.some(step => step.job === job) && value.questions !== undefined) {
		if (!Array.isArray(value.questions) || !value.questions.every(isQuestion)) return 'Discovery questions need an ID, text, owning role and explicit blocking role or null. Repair the handoff through NQ.'
		known.push(...value.questions)
	}
	const lane = laneOf(item.pack)
	const deliveryRoles = new Set([...lane.delivery, ...(lane.arbiter ? [lane.arbiter] : [])].flatMap(step => [step.job, step.profile]).map(role => role.trim().toLowerCase()))
	const roles = item.discovery === undefined ? new Set([...deliveryRoles, ...lane.discovery.flatMap(step => [step.job, step.profile]).map(role => role.trim().toLowerCase())]) : deliveryRoles
	const unowned = known.filter(q => q.blockingRole !== null && !roles.has(q.blockingRole.trim().toLowerCase()) && !questionResolved(q, answers, decisions))
	if (unowned.length) return `Questions name an unconfigured receiving phase: ${unowned.map(q => `${q.id}: ${q.blockingRole}`).join(', ')}. Bind each to an existing phase job or profile so its NQ obligation has an actual recipient.`
	if (item.discovery === undefined && lane.discovery.at(-1)?.job === job && Array.isArray(value.items)) {
		const assigned = new Set<string>()
		for (const candidate of value.items) {
			if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return 'Discovery candidates must be objects with their own handoff; repair the malformed item through NQ.'
			if (candidate.questionRefs !== undefined && (!Array.isArray(candidate.questionRefs) || candidate.questionRefs.some((id: unknown) => typeof id !== 'string'))) return 'Candidate questionRefs must contain question identities; repair the handoff through NQ.'
			const refs = (candidate.questionRefs ?? []) as string[]
			if (refs.some(id => !known.some(q => q.id === id))) return 'A candidate references a question absent from this discovery; preserve the actual question identity.'
			refs.forEach(id => assigned.add(id))
			const stranded = known.filter(q => refs.includes(q.id) && q.blockingRole !== null && !deliveryRoles.has(q.blockingRole.trim().toLowerCase()) && !questionResolved(q, answers, decisions))
			if (stranded.length) return `Candidate ${candidate.key ?? candidate.title} carries unresolved questions for a phase outside its delivery: ${stranded.map(q => `${q.id}: ${q.blockingRole}`).join(', ')}. Resolve them through this task's existing NQ/decision work before handing the candidate to delivery.`
		}
		const lost = known.filter(q => q.blockingRole !== null && !assigned.has(q.id) && !questionResolved(q, answers, decisions))
		if (lost.length) return `Unresolved questions have no receiving task: ${lost.map(q => q.id).join(', ')}. Bind them to the task whose phase must resolve them before completing discovery.`
	}
	const unknown = decisions.filter(d => d.questionId !== undefined && !known.some(q => q.id === d.questionId))
	if (unknown.length) return `Decisions reference questions not assigned to this task: ${unknown.map(d => d.questionId).join(', ')}.`
	const missing = owed(item, job, known).filter(q => !questionResolved(q, answers, decisions))
	return missing.length ? `The ${job} output has not settled its assigned questions: ${missing.map(q => `${q.id}: ${q.text}`).join(' ')} Resolve them in this phase through decisions[]; use the existing NQ exchange only for missing sender-owned input.` : undefined
}

/** Accepted choices enter the answer history already used at every subsequent NQ handoff. */
export function recordPhaseDecisions(store: Reader & Pick<Store['Service'], 'note'>, item: Item, job: Job, call: number | string, value: Record<string, unknown>): void {
	if (item.pack?.contracts?.handoff !== '1' || !Array.isArray(value.decisions)) return
	const known = workQuestions(store, item)
	for (const [index, decision] of (value.decisions as PhaseDecision[]).entries()) {
		const key = typeof call === 'number' ? 'call' : 'invocation'
		if (store.events(item.id).some(e => e.kind === 'nq-decided' && e.data[key] === call && e.data.index === index)) continue
		const question = known.find(q => decision.questionId === undefined ? questionKey(q.text) === questionKey(decision.question) : q.id === decision.questionId)
		store.note(item.id, 'nq-decided', { job, [key]: call, index, originator: stepOf(laneOf(item.pack), job).profile, questions: [question?.text ?? decision.question], ...(question ? { questionIds: [question.id] } : {}), answer: `${decision.decision}\n\n${decision.why}`, decision })
	}
}
