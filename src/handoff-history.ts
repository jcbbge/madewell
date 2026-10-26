import type { Event } from './store.ts'

export interface SavedAnswer {
	id: string
	question: string
	answer: string
	by: string
	job: string
}

type Alias = Omit<SavedAnswer, 'answer'>
export type PacketAnswer = SavedAnswer & { aliases?: Alias[] }

export const answerReference = (ids: readonly string[]) => `See saved answers: ${[...new Set(ids)].join(', ')}.`

/** Project old and new records without rewriting the durable evidence. */
export function buildAnswerHistory(events: readonly Event[], job: string) {
	const answers: SavedAnswer[] = []
	const raw = new Map<string, string>()
	const pending = new Map<string, string[]>()
	const forms = new Map<string, Set<string>>()
	const remember = (text: string, ids: string[]) => {
		if (!text || !ids.length) return
		const refs = forms.get(text) ?? new Set<string>()
		for (const id of ids) refs.add(id)
		forms.set(text, refs)
	}
	for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
		const source = String(e.data.job ?? '')
		if ((job === 'implement' && source === 'test-plan') || (job === 'test-plan' && source === 'implement')) continue
		const key = `${e.item}:${source}`
		if (e.kind === 'nq-question') pending.set(key, e.data.questions as string[])
		if (!['nq-answer', 'nq-decided', 'nq-corrected', 'nq-reused'].includes(e.kind) || typeof e.data.answer !== 'string') continue
		const questions = (e.data.questions as string[] | undefined) ?? pending.get(key) ?? []
		const reuse = (e.data.reuse as { question: string; answerId: string }[] | undefined) ?? []
		const original = e.data.answer
		let fresh = original
		// Older versions appended each reused question and its complete, expanded answer.
		// Remove only that exact generated suffix; a reference in ordinary prose is not a suffix.
		if (e.data.answerFormat !== 'references' && reuse.length && reuse.every((r) => raw.has(r.answerId))) {
			const suffix = reuse.map((r) => `${r.question}\n${raw.get(r.answerId)!}`).join('\n\n')
			if (fresh === suffix) fresh = ''
			else if (fresh.endsWith(`\n\n${suffix}`)) fresh = fresh.slice(0, -suffix.length - 2)
		}
		const ids: string[] = []
		const freshIds: string[] = []
		questions.forEach((question, index) => {
			const ref = reuse.find((r) => r.question === question)
			const prior = ref && answers.find((a) => a.id === ref.answerId)
			if (ref && !prior) return
			const id = `${e.seq}:${index}`
			answers.push({ id, question, answer: prior ? prior.answer : fresh, by: prior ? prior.by : String(e.data.originator), job: source })
			raw.set(id, prior ? raw.get(prior.id)! : original)
			ids.push(id)
			if (!prior) freshIds.push(id)
		})
		if (e.kind !== 'nq-reused' && original !== fresh) remember(original, ids)
		remember(fresh, freshIds)
	}
	const grouped = new Map<string, PacketAnswer>()
	const canonical = new Map<string, string>()
	for (const row of answers) {
		const first = grouped.get(row.answer)
		if (first) {
			const { answer: _answer, ...alias } = row
			;(first.aliases ??= []).push(alias)
			canonical.set(row.id, first.id)
		} else {
			grouped.set(row.answer, { ...row })
			canonical.set(row.id, row.id)
		}
	}
	const replacements = [...forms].sort(([a], [b]) => b.length - a.length)
	const compactText = (text: string) => {
		for (const [body, ids] of replacements) {
			const reference = answerReference([...ids].map((id) => canonical.get(id)!))
			if (text === body) return reference
			// These are the two note formats used by the engine, not arbitrary substrings.
			for (const separator of ['\n', ': ']) {
				if (text.endsWith(`${separator}${body}`)) return text.slice(0, -body.length) + reference
			}
		}
		return text
	}
	const compactTurns = (value: unknown) => Array.isArray(value) ? value.map((turn) =>
		turn && typeof turn === 'object' && typeof turn.answer === 'string' ? { ...turn, answer: compactText(turn.answer) } : turn
	) : value
	return {
		answers,
		packetAnswers: () => [...grouped.values()],
		compact(parts: Record<string, unknown>): Record<string, unknown> {
			const result = { ...parts }
			if (Array.isArray(parts.earlierTurns)) result.earlierTurns = compactTurns(parts.earlierTurns)
			if (parts.exchange && typeof parts.exchange === 'object') {
				const exchange = parts.exchange as Record<string, unknown>
				result.exchange = { ...exchange,
					...(Array.isArray(exchange.turns) ? { turns: compactTurns(exchange.turns) } : {}),
					...(Array.isArray(exchange.notes) ? { notes: exchange.notes.map((note) => typeof note === 'string' ? compactText(note) : note) } : {}),
				}
			}
			return result
		},
	}
}
