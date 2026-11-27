// Pure, non-executing NQ state. The caller owns atomic persistence and request receipts.
import { z } from 'zod'
import { MadeWellError } from './errors.ts'
import type { Actor } from './ledger.ts'

const text = z.string().refine(value => !!value.trim() && !value.includes('\0'), 'Nonblank text without NUL is required.')
const actor = z.object({ kind: z.enum(['operator', 'agent']), label: text }).strict().readonly()
const question = z.object({ id: text, text, owner: actor }).strict().readonly()
const answer = z.object({ questionId: text, text }).strict().readonly()

export const ExchangeAction = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('question'), understanding: text, questions: z.array(question).nonempty().readonly() }).strict(),
	z.object({ kind: z.literal('answer'), answers: z.array(answer).nonempty().readonly() }).strict(),
	z.object({ kind: z.literal('confirm'), understanding: text }).strict(),
	z.object({ kind: z.literal('resolve'), reason: text, answers: z.array(answer).nonempty().readonly() }).strict(),
])
export type ExchangeAction = z.infer<typeof ExchangeAction>
export type ExchangeQuestion = z.infer<typeof question>

const hold = z.object({
	kind: z.literal('hold'), reason: z.literal('specification-defect'),
	questionIds: z.array(text).nonempty().readonly(), responsibleSender: actor,
	operatorAction: text,
}).strict().readonly()
const message = z.object({
	at: text, actor, action: z.union([ExchangeAction, hold]).readonly(),
}).strict().readonly()
export type ExchangeMessage = z.infer<typeof message>

export const Exchange = z.object({
	version: z.literal(1), handoffId: text, recipient: actor, originator: actor,
	answeredTurns: z.number().int().min(0).max(3),
	status: z.enum(['waiting-answer', 'waiting-confirmation', 'ready', 'held']),
	questions: z.array(question).readonly(), pendingQuestionIds: z.array(text).readonly(),
	messages: z.array(message).readonly(),
}).strict().readonly()
export type Exchange = z.infer<typeof Exchange>
export interface ExchangeContext {
	readonly handoffId: string
	readonly originator: Actor
	readonly actor: Actor
	readonly at: string
	// Reserved for a separately constrained reuse contract; no action here accepts aliases.
	readonly allowedAnswerIds?: ReadonlyArray<string>
}
const contextSchema = z.object({ handoffId: text, originator: actor, actor, at: text, allowedAnswerIds: z.array(text).readonly().optional() }).strict()
const sameActor = (left: Actor, right: Actor) => left.kind === right.kind && left.label === right.label
const fail = (message: string, context: Record<string, unknown> = {}) => new MadeWellError({
	code: 'portable_invalid', message, context,
	next: [{ run: 'inspect_work', why: 'Recover the saved handoff and exchange. Preserve the exact request ID/body for an uncertain retry; a new submission must follow the saved exchange state.' }],
})
function decode<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
	const parsed = schema.safeParse(value)
	if (!parsed.success) throw fail('Invalid portable exchange data.', { problems: parsed.error.issues })
	return parsed.data
}
function distinct(ids: ReadonlyArray<string>): void {
	if (new Set(ids).size !== ids.length) throw fail('Exchange question identities must be distinct within a message.', { ids })
}

/** Actor labels are trusted-local attribution, not authentication or execution authority. */
export function transitionExchange(previous: Exchange | undefined, action: ExchangeAction, context: ExchangeContext): Exchange {
	const input = decode(ExchangeAction, action), c = decode(contextSchema, context)
	let saved: Exchange
	if (previous === undefined) {
		if (input.kind !== 'question' && input.kind !== 'confirm') throw fail('Only recipient questions or clear confirmation can start an exchange.', { handoffId: c.handoffId })
		saved = { version: 1, handoffId: c.handoffId, recipient: c.actor, originator: c.originator,
			answeredTurns: 0, status: 'waiting-confirmation', questions: [], pendingQuestionIds: [], messages: [] }
	} else {
		saved = decode(Exchange, previous)
		if (saved.handoffId !== c.handoffId || !sameActor(saved.originator, c.originator)) throw fail('An exchange cannot change its handoff or originator.', { handoffId: c.handoffId, savedHandoffId: saved.handoffId })
	}
	distinct(saved.questions.map(q => q.id))
	distinct(saved.pendingQuestionIds)
	const pending = saved.pendingQuestionIds.map(id => {
		const q = saved.questions.find(q => q.id === id)
		if (!q) throw fail('Saved exchange names an unknown pending question.', { handoffId: c.handoffId, questionId: id })
		return q
	})
	if (saved.status === 'ready') throw fail('Recipient confirmation is already saved; this fixed exchange cannot restart.', { handoffId: c.handoffId })
	if (saved.status === 'held' && input.kind !== 'resolve') throw fail('This exchange is held for an explicit operator resolution; no fourth ordinary answer or reset is permitted.', { handoffId: c.handoffId, answeredTurns: saved.answeredTurns })
	let status: Exchange['status'] = saved.status
	let answeredTurns = saved.answeredTurns
	let questions = saved.questions, pendingQuestionIds = saved.pendingQuestionIds
	const messages: ExchangeMessage[] = [...saved.messages, { at: c.at, actor: c.actor, action: input }]
	const holdForOperator = (ids: ReadonlyArray<string>) => {
		status = 'held'
		messages.push({ at: c.at, actor: c.actor, action: {
			kind: 'hold', reason: 'specification-defect', questionIds: [...ids], responsibleSender: saved.originator,
			operatorAction: 'The operator must resolve the named questions with an explicit reason and answers. The same recipient must then confirm understanding; no execution or other blocker release is authorized.',
		} })
	}
	if (input.kind === 'question' || input.kind === 'confirm') {
		if (!sameActor(c.actor, saved.recipient)) throw fail('Only the fixed recipient can question or confirm this handoff.', { handoffId: c.handoffId, recipient: saved.recipient, actor: c.actor })
		if (pending.length) throw fail('Current questions must be answered before recipient confirmation or a further question message.', { handoffId: c.handoffId, pendingQuestionIds: saved.pendingQuestionIds })
		if (input.kind === 'confirm') status = 'ready'
		else {
			distinct(input.questions.map(q => q.id))
			for (const q of input.questions) {
				if (!sameActor(q.owner, saved.originator) && q.owner.kind !== 'operator') throw fail('A question owner must be this handoff originator or an operator.', { handoffId: c.handoffId, questionId: q.id, owner: q.owner, originator: saved.originator })
				const prior = saved.questions.find(previous => previous.id === q.id)
				if (prior && (prior.text !== q.text || !sameActor(prior.owner, q.owner))) throw fail('A question identity cannot change its text or owner.', { handoffId: c.handoffId, questionId: q.id })
				if (prior) throw fail('This question identity is already answered. Recover its saved answer instead of reopening it or spending another clarification turn.', { handoffId: c.handoffId, questionId: q.id })
			}
			questions = [...saved.questions, ...input.questions.filter(q => !saved.questions.some(previous => previous.id === q.id))]
			pendingQuestionIds = input.questions.map(q => q.id)
			status = 'waiting-answer'
			if (answeredTurns === 3) holdForOperator(pendingQuestionIds)
		}
	} else {
		const resolving = input.kind === 'resolve'
		if (resolving ? saved.status !== 'held' || c.actor.kind !== 'operator' : saved.status !== 'waiting-answer' || answeredTurns === 3) {
			throw fail(resolving ? 'Only an operator can explicitly resolve a held exchange.' : 'An ordinary answer requires current unanswered questions and fewer than three answered turns.', { handoffId: c.handoffId, status: saved.status, answeredTurns })
		}
		distinct(input.answers.map(a => a.questionId))
		const owned = resolving ? pending : pending.filter(q => sameActor(q.owner, c.actor))
		if (!owned.length || input.answers.length !== owned.length || input.answers.some(a => !owned.some(q => q.id === a.questionId))) {
			throw fail('An answer batch must answer exactly every current question owned by its sender; resolution must answer every held question. Unknown, already answered or differently owned identities are refused.', { handoffId: c.handoffId, actor: c.actor, expectedQuestionIds: owned.map(q => q.id), suppliedQuestionIds: input.answers.map(a => a.questionId) })
		}
		pendingQuestionIds = saved.pendingQuestionIds.filter(id => !input.answers.some(a => a.questionId === id))
		if (!resolving) answeredTurns++
		status = pendingQuestionIds.length ? 'waiting-answer' : 'waiting-confirmation'
		if (answeredTurns === 3 && pendingQuestionIds.length) holdForOperator(pendingQuestionIds)
	}
	return decode(Exchange, { ...saved, status, answeredTurns, questions, pendingQuestionIds, messages })
}
