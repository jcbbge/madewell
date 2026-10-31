import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAnswerHistory } from '../src/handoff-history.ts'
import type { Event } from '../src/store.ts'

const event = (seq: number, data: Record<string, unknown>, kind = 'nq-answer', item = 1): Event => ({ seq, item, at: '2026-10-25T00:00:00.000Z', kind, data })
const reference = (...ids: string[]) => `See saved answers: ${ids.join(', ')}.`

test('identical texts are carried once with every question, stable id and original authorship preserved', () => {
	const text = '  Keep the exact bytes.\n\nIncluding the final newline.\n'
	const events = [
		event(1, { job: 'ideate', questions: ['Format?', 'Encoding?'], answer: text, originator: 'dispatcher' }),
		event(2, { job: 'plan', questions: ['Another independently answered question?'], answer: text, originator: 'planner' }),
		event(3, { job: 'challenge', questions: ['Reworded format?'], answer: 'Saved answers', reuse: [{ question: 'Reworded format?', answerId: '1:0' }] }, 'nq-reused'),
		event(4, { job: 'plan', questions: ['Alias of alias?'], answer: 'Saved answers', reuse: [{ question: 'Alias of alias?', answerId: '3:0' }] }, 'nq-reused'),
	]
	const history = buildAnswerHistory(events, 'implement')
	assert.deepEqual(history.answers, [
		{ id: '1:0', question: 'Format?', answer: text, by: 'dispatcher', job: 'ideate' },
		{ id: '1:1', question: 'Encoding?', answer: text, by: 'dispatcher', job: 'ideate' },
		{ id: '2:0', question: 'Another independently answered question?', answer: text, by: 'planner', job: 'plan' },
		{ id: '3:0', question: 'Reworded format?', answer: text, by: 'dispatcher', job: 'challenge' },
		{ id: '4:0', question: 'Alias of alias?', answer: text, by: 'dispatcher', job: 'plan' },
	])
	const packets = history.packetAnswers()
	assert.deepEqual(packets, [{ ...history.answers[0], aliases: history.answers.slice(1).map(({ id, question, by, job }) => ({ id, question, by, job })) }])
	assert.deepEqual(history.packetAnswers(), packets, 'repeated projections have stable targets')
})

test('legacy nested generated suffixes use raw previous answers and preserve all fresh and reused decisions', () => {
	const a = 'Keep CSV.\nPreserve Unicode: λ.'
	const b = 'Use commas.'
	const rawB = `${b}\n\nFormat again?\n${a}`
	const c = 'Use UTF-8.'
	const rawC = `${c}\n\nDelimiter again?\n${rawB}\n\nFormat once more?\n${a}`
	const events = [
		event(10, { job: 'ideate', questions: ['Format?'], answer: a, originator: 'dispatcher' }),
		event(20, { job: 'challenge', questions: ['Delimiter?', 'Format again?'], answer: rawB, originator: 'ideator', reuse: [{ question: 'Format again?', answerId: '10:0' }] }),
		event(30, { job: 'plan', questions: ['Encoding?', 'Delimiter again?', 'Format once more?'], answer: rawC, originator: 'planner', reuse: [{ question: 'Delimiter again?', answerId: '20:0' }, { question: 'Format once more?', answerId: '10:0' }] }),
	]
	const before = JSON.stringify(events)
	const history = buildAnswerHistory(events, 'implement')
	assert.deepEqual(history.packetAnswers().map((a) => a.answer), [a, b, c])
	assert.deepEqual(history.answers.map((a) => [a.id, a.answer]), [['10:0', a], ['20:0', b], ['20:1', a], ['30:0', c], ['30:1', b], ['30:2', a]])
	const compact = history.compact({ earlierTurns: [{ answer: rawB }, { answer: rawC }] }) as { earlierTurns: { answer: string }[] }
	assert.equal(compact.earlierTurns[0]!.answer, reference('20:0', '10:0'))
	assert.equal(compact.earlierTurns[1]!.answer, reference('30:0', '20:0', '10:0'))
	assert.equal(JSON.stringify(events), before, 'reading and compaction never rewrite durable events')
})

test('suffix-shaped authored prose is not stripped without exact reuse metadata and bytes', () => {
	const a = 'Original decision.'
	const authored = `My own prose.\n\nRepeated?\n${a}`
	const near = `${authored}\nThis sentence was authored too.`
	const history = buildAnswerHistory([
		event(1, { job: 'ideate', questions: ['First?'], answer: a, originator: 'dispatcher' }),
		event(2, { job: 'plan', questions: ['Authored?'], answer: authored, originator: 'planner' }),
		event(3, { job: 'plan', questions: ['New?', 'Repeated?'], answer: near, originator: 'planner', reuse: [{ question: 'Repeated?', answerId: '1:0' }] }),
	], 'implement')
	assert.equal(history.answers.find((a) => a.id === '2:0')!.answer, authored)
	assert.equal(history.answers.find((a) => a.id === '3:0')!.answer, near)
})

test('marked fresh answers preserve authored legacy-looking suffixes alongside reused decisions', () => {
	const prior = 'Keep the original decision verbatim.'
	const authored = `Fresh explanation.\n\nFormat again?\n${prior}`
	const events = [
		event(1, { job: 'ideate', questions: ['Format?'], answer: prior, originator: 'dispatcher' }),
		event(2, { job: 'plan', questions: ['Fresh question?', 'Format again?'], answer: authored, answerFormat: 'references', originator: 'planner', reuse: [{ question: 'Format again?', answerId: '1:0' }] }),
	]
	const before = JSON.stringify(events)
	const history = buildAnswerHistory(events, 'implement')
	assert.deepEqual(history.answers.map(({ id, answer }) => ({ id, answer })), [
		{ id: '1:0', answer: prior },
		{ id: '2:0', answer: authored },
		{ id: '2:1', answer: prior },
	])
	assert.deepEqual(history.packetAnswers().map((row) => row.answer), [prior, authored])
	const compact = history.compact({ earlierTurns: [{ answer: authored }] }) as { earlierTurns: { answer: string }[] }
	assert.equal(compact.earlierTurns[0]!.answer, reference('2:0'), 'authored suffix bytes belong to the fresh answer, not a generated mixed body')
	assert.equal(JSON.stringify(events), before)
})

test('compaction touches only named history fields and preserves prefixes, unknown text and unrelated bytes', () => {
	const text = 'Preserve this decision.\nAnd this line.'
	const history = buildAnswerHistory([event(5, { job: 'plan', questions: ['Keep?'], answer: text, originator: 'planner' })], 'implement')
	const unrelated = { source: text, answer: text, turns: [{ answer: text }], notes: [text] }
	const parts = {
		item: unrelated, source: text, received: unrelated, snapshot: unrelated, handoff: text,
		exchange: { handoff: text, turns: [{ question: text, answer: text }, { answer: 'Unknown answer.' }], notes: [text, `Keep? Answered before by the planner: ${text}`, `Keep?\n${text}`, 'Unknown note.'] },
		earlierTurns: [{ answer: text, questions: [text] }], other: unrelated,
	}
	const before = JSON.stringify(parts)
	const compact = history.compact(parts) as typeof parts
	assert.equal(compact.exchange.turns[0]!.answer, reference('5:0'))
	assert.equal(compact.earlierTurns[0]!.answer, reference('5:0'))
	assert.deepEqual(compact.exchange.notes, [reference('5:0'), `Keep? Answered before by the planner: ${reference('5:0')}`, `Keep?\n${reference('5:0')}`, 'Unknown note.'])
	for (const key of ['item', 'source', 'received', 'snapshot', 'handoff', 'other'] as const) assert.equal(JSON.stringify(compact[key]), JSON.stringify(parts[key]), key)
	assert.equal(compact.exchange.handoff, text)
	assert.equal(compact.exchange.turns[0]!.question, text)
	assert.equal(compact.exchange.turns[1]!.answer, 'Unknown answer.')
	assert.deepEqual(compact.earlierTurns[0]!.questions, [text])
	assert.equal(JSON.stringify(parts), before, 'the caller retains its original packet')
	assert.deepEqual(history.compact(compact), compact, 'compaction is idempotent')
	assert.deepEqual(history.compact({}), {})
})

test('legacy questions are paired by both item and job, including decided and corrected answers', () => {
	const history = buildAnswerHistory([
		event(1, { job: 'discover', questions: ['Discovery?'] }, 'nq-question', 11),
		event(2, { job: 'plan', questions: ['Plan?'] }, 'nq-question', 12),
		event(3, { job: 'discover', questions: ['Other discovery?'] }, 'nq-question', 12),
		event(4, { job: 'discover', answer: 'Inherited.', originator: 'operator' }, 'nq-answer', 11),
		event(5, { job: 'plan', answer: 'Decided.', originator: 'dispatcher' }, 'nq-decided', 12),
		event(6, { job: 'discover', answer: 'Corrected.', originator: 'operator' }, 'nq-corrected', 12),
	], 'implement')
	assert.deepEqual(history.answers.map(({ id, question, answer }) => ({ id, question, answer })), [
		{ id: '4:0', question: 'Discovery?', answer: 'Inherited.' },
		{ id: '5:0', question: 'Plan?', answer: 'Decided.' },
		{ id: '6:0', question: 'Other discovery?', answer: 'Corrected.' },
	])
})

test('maker histories cannot recover private answers through public aliases or alias chains', () => {
	for (const [job, hidden] of [['implement', 'test-plan'], ['test-plan', 'implement']] as const) {
		const events = [
			event(1, { job: hidden, questions: ['PRIVATE QUESTION'], answer: 'PRIVATE DECISION', originator: 'planner' }),
			event(2, { job: 'plan', questions: ['Public wording?'], answer: 'Saved answers', reuse: [{ question: 'Public wording?', answerId: '1:0' }] }, 'nq-reused'),
			event(3, { job: job, questions: ['Another wording?'], answer: '', reuse: [{ question: 'Another wording?', answerId: '2:0' }] }),
			event(4, { job: 'plan', questions: ['Shared?'], answer: 'Visible.', originator: 'planner' }),
		]
		const history = buildAnswerHistory(events, job)
		assert.deepEqual(history.answers.map((a) => a.id), ['4:0'])
		assert.ok(!JSON.stringify(history.packetAnswers()).includes('PRIVATE'))
	}
})

test('empty and unknown references create no fabricated answers; equal text means exact bytes', () => {
	assert.deepEqual(buildAnswerHistory([], 'plan').packetAnswers(), [])
	const history = buildAnswerHistory([
		event(1, { job: 'plan', questions: ['Missing?'], answer: 'Saved answers', reuse: [{ question: 'Missing?', answerId: 'unknown' }] }, 'nq-reused'),
		event(2, { job: 'plan', questions: ['A?'], answer: 'Yes', originator: 'planner' }),
		event(3, { job: 'plan', questions: ['B?'], answer: 'Yes\n', originator: 'planner' }),
		event(4, { job: 'plan', questions: ['C?'], answer: 'yes', originator: 'planner' }),
	], 'implement')
	assert.deepEqual(history.packetAnswers().map((a) => a.answer), ['Yes', 'Yes\n', 'yes'])
})
