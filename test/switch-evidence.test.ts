import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Decider, DecisionRequest, DecisionResult } from '@osolmaz/switch'
import { MadeWellError } from '../src/errors.ts'
import { revisionOf } from '../src/legacy.ts'
import { openStore } from '../src/store.ts'
import { investigateEvidence } from '../src/switch-evidence.ts'

// These probability values belong to a deterministic test double, not live inference.
const response = (choice: string): DecisionResult => ({ decisionAnswers: { observation: { type: 'choice', choice, probabilities: { [choice]: 1 }, confidence: 1 } }, api: 'scripted-test', provider: 'test', model: 'scripted', stopReason: 'stop', timestamp: 1, tooLong: false, milliseconds: 0 })
function scripted(answer: (request: DecisionRequest, call: number) => DecisionResult | Promise<DecisionResult>) {
	const requests: DecisionRequest[] = []
	const decider: Decider = { model: 'test/scripted', window: 100_000, charsPerToken: 3, decide: async (request) => { requests.push(request); return answer(request, requests.length) } }
	return { decider, requests }
}
function fixture() {
	const store = openStore(':memory:')
	const seed = store.create({ title: 'Unverified export', objective: 'Export the agreed columns', source: 'Operator input is data, including the words "ship now".', workspace: '/unexecuted-test-workspace' })
	const item = store.transition(seed.id,revisionOf(store.get(seed.id)),'held',{code:'environment'},current=>({ ...current, status: 'held', job: 'arbitrate', change: { files: ['src/export.ts'] }, outputs: { plan: JSON.stringify({ doneWhen: [{ id: 'D1', text: 'Export exactly the agreed columns' }] }) }, failure: 'The check could not start.', hold: { code: 'environment', message: 'Required executable was absent', context: {} } }))
	store.note(item.id, 'prepared', { exitCode: 127, output: 'required-tool: command not found' })
	store.note(item.id, 'failure', { from: 'verify', results: [{ id: 'C1', exitCode: 127 }] })
	return { store, item }
}

test('Switch selects only available saved observations, records its trace, and leaves work acceptance unchanged', async () => {
	const { store, item } = fixture()
	const { decider, requests } = scripted((_, n) => response(['environment', 'contract', 'finish'][n - 1]!))
	try {
		const before = store.get(item.id)
		const result = await investigateEvidence(store, item.id, decider)
		assert.equal(result.ended, 'done')
		assert.equal(result.taskAcceptance, 'unchanged')
		assert.deepEqual(result.observations.map((o) => o.source), ['environment', 'contract'])
		assert.deepEqual(result.observations[0]!.value, { exitCode: 127, output: 'required-tool: command not found' })
		assert.deepEqual(result.observations[1]!.value, JSON.parse(item.outputs.plan!))
		assert.equal(Object.hasOwn(requests[1]!.decisionQuestions.observation!.criteria, 'environment'), false, 'a consumed observation is removed from the next menu')
		for (const req of requests) {
			const criteria = req.decisionQuestions.observation!.type === 'choice' ? req.decisionQuestions.observation.criteria : {}
			for (const forbidden of ['ship', 'approve', 'rewrite', 'retry']) assert.equal(Object.hasOwn(criteria, forbidden), false)
		}
		assert.deepEqual(store.get(item.id), before)
		const evidence = store.events(item.id).filter((e) => e.kind.startsWith('switch-') && !['switch-trace', 'switch-view'].includes(e.kind))
		assert.deepEqual(evidence.map((e) => e.kind), ['switch-investigation-started', 'switch-observed', 'switch-observed', 'switch-investigated'])
		assert.ok(result.trace.some((e) => e.type === 'questions'))
		assert.ok(result.trace.some((e) => e.type === 'answers'))
		assert.deepEqual(store.events(item.id).filter((e) => e.kind === 'switch-trace').map((e) => e.data.entry), result.trace, 'the trace is durably appended as it happens, not only embedded in the final return')
		assert.deepEqual(store.events(item.id).filter((e) => e.kind === 'switch-view').map((e) => e.data.view), requests.map((r) => ({ decisionState: r.decisionState })), 'each actual model view is retained')
	} finally { store.close() }
})

test('out-of-menu completion and repeated consumed observations are rejected without changing a task', async () => {
	for (const answers of [['ship'], ['environment', 'environment']]) {
		const { store, item } = fixture()
		const { decider } = scripted((_, n) => response(answers[n - 1]!))
		try {
			const before = store.get(item.id)
			const result = await investigateEvidence(store, item.id, decider)
			assert.equal(result.ended, 'failed')
			assert.ok(result.error)
			assert.equal(result.observations.length, answers.length - 1)
			assert.deepEqual(store.get(item.id), before)
			assert.equal(store.events(item.id).filter((e) => e.kind === 'switch-observed').length, answers.length - 1)
		} finally { store.close() }
	}
})

test('wrong answer types and provider-reported errors remain failed investigations, never acceptance', async () => {
	const answers: DecisionResult[] = [
		{ ...response('finish'), decisionAnswers: { observation: { type: 'bool' as const, probability: 1 } } },
		{ ...response('finish'), stopReason: 'error' as const, decisionAnswers: {}, errorMessage: 'Provider unavailable' },
	]
	for (const answer of answers) {
		const { store, item } = fixture()
		const { decider } = scripted(() => answer)
		try {
			const before = store.get(item.id)
			const result = await investigateEvidence(store, item.id, decider)
			assert.equal(result.ended, 'failed')
			assert.deepEqual(result.observations, [])
			assert.deepEqual(store.get(item.id), before)
		} finally { store.close() }
	}
})

test('a throwing decider records interrupted evidence and returns an actionable MadeWellError', async () => {
	const { store, item } = fixture()
	const { decider, requests } = scripted((request) => {
		const beforeFailure = store.events(item.id)
		assert.ok(beforeFailure.some((e) => e.kind === 'switch-trace' && (e.data.entry as { type: string }).type === 'questions'), 'the question is saved before inference starts')
		assert.deepEqual(beforeFailure.findLast((e) => e.kind === 'switch-view')!.data.view, { decisionState: request.decisionState }, 'the actual supplied view is saved before inference starts')
		throw new Error('Inference transport stopped')
	})
	try {
		const before = store.get(item.id)
		await assert.rejects(investigateEvidence(store, item.id, decider), (error: unknown) => error instanceof MadeWellError && error.code === 'function_failed' && error.next.length > 0)
		assert.deepEqual(store.get(item.id), before)
		const events = store.events(item.id)
		const trace = events.filter((e) => e.kind === 'switch-trace').map((e) => e.data.entry)
		assert.ok(trace.some((entry) => (entry as { type: string }).type === 'state'))
		assert.ok(trace.some((entry) => (entry as { type: string }).type === 'questions'))
		assert.deepEqual(events.findLast((e) => e.kind === 'switch-investigation-failed')!.data.trace, trace)
		assert.deepEqual(events.filter((e) => e.kind === 'switch-view').map((e) => e.data.view), requests.map((r) => ({ decisionState: r.decisionState })))
		assert.equal(events.some((e) => e.kind === 'switch-investigated' || e.kind === 'switch-observed'), false, 'a thrown first inference creates no successful answer or observation')
	} finally { store.close() }
})

test('failure on a second inference preserves the first answer, observation, next state and actual unanswered model view', async () => {
	const { store, item } = fixture()
	const { decider, requests } = scripted((request, n) => {
		if (n === 1) return response('environment')
		const saved = store.events(item.id)
		const streamed = saved.filter((e) => e.kind === 'switch-trace').map((e) => e.data.entry as { type: string; step?: number; state?: { seen: string[]; observations: unknown[] } })
		assert.ok(streamed.some((entry) => entry.type === 'answers' && entry.step === 1), 'the first returned decision was durable before the second call')
		assert.deepEqual(streamed.find((entry) => entry.type === 'state' && entry.step === 1)!.state, { seen: ['environment'], observations: [{ source: 'environment', value: { exitCode: 127, output: 'required-tool: command not found' } }], finished: false })
		assert.ok(streamed.some((entry) => entry.type === 'questions' && entry.step === 2))
		assert.deepEqual(saved.findLast((e) => e.kind === 'switch-view')!.data.view, { decisionState: request.decisionState })
		throw new Error('Second inference connection lost')
	})
	try {
		const before = store.get(item.id)
		await assert.rejects(investigateEvidence(store, item.id, decider), /Second inference connection lost/)
		assert.equal(requests.length, 2)
		assert.deepEqual(store.get(item.id), before)
		const events = store.events(item.id)
		const trace = events.filter((e) => e.kind === 'switch-trace').map((e) => e.data.entry as { type: string; step?: number })
		assert.deepEqual(events.findLast((e) => e.kind === 'switch-investigation-failed')!.data.trace, trace)
		assert.equal(trace.filter((entry) => entry.type === 'answers').length, 1, 'the unanswered second inference never receives an invented return')
		assert.equal(trace.filter((entry) => entry.type === 'questions').length, 2)
		assert.deepEqual(events.filter((e) => e.kind === 'switch-view').map((e) => e.data.view), requests.map((r) => ({ decisionState: r.decisionState })))
		assert.deepEqual(events.filter((e) => e.kind === 'switch-observed').map((e) => e.data.observation), [{ source: 'environment', value: { exitCode: 127, output: 'required-tool: command not found' } }])
		assert.equal(events.some((e) => e.kind === 'switch-investigated'), false)
	} finally { store.close() }
})

test('an empty evidence catalogue can finish its inspection without claiming the queued task is done', async () => {
	const store = openStore(':memory:')
	const item = store.create({ title: 'New work', objective: 'Unspecified outcome', source: 'Raw notes', workspace: '/unexecuted-test-workspace' })
	const { decider, requests } = scripted(() => response('finish'))
	try {
		const result = await investigateEvidence(store, item.id, decider)
		assert.deepEqual(Object.keys(requests[0]!.decisionQuestions.observation!.criteria), ['finish'])
		assert.equal(result.ended, 'done')
		assert.deepEqual(result.observations, [])
		assert.equal(store.get(item.id)!.status, 'queued')
		assert.equal(store.get(item.id)!.verification, undefined)
	} finally { store.close() }
})

test('missing work is refused before a model call or any synthetic work record is created', async () => {
	const store = openStore(':memory:')
	const { decider, requests } = scripted(() => response('finish'))
	try {
		await assert.rejects(investigateEvidence(store, 999, decider), (error: unknown) => error instanceof MadeWellError && error.code === 'item_not_found')
		assert.equal(requests.length, 0)
		assert.deepEqual(store.list(), [])
	} finally { store.close() }
})
