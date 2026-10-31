import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { Effect } from 'effect'
import { TestClock } from 'effect/testing'
import { MadeWellError } from '../src/errors.ts'
import { otlpOf } from '../src/otlp.ts'
import { openStore } from '../src/store.ts'
import { observe } from '../src/trace.ts'

function setup(t: TestContext) {
	const dir = mkdtempSync(join(tmpdir(), 'mw-otlp-'))
	const store = openStore(join(dir, 'mw.db'))
	const item = store.create({ title: 'PRIVATE_TITLE', objective: 'PRIVATE_OBJECTIVE', source: 'PRIVATE_SOURCE', workspace: dir })
	t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }) })
	return { store, item, dir }
}
const spansOf = (value: ReturnType<typeof otlpOf>) => value.resourceSpans.flatMap((r) => r.scopeSpans.flatMap((s) => s.spans))
const attrsOf = (span: ReturnType<typeof spansOf>[number]) => Object.fromEntries(span.attributes.map((a) => [a.key, a.value]))
const startAt = '2026-10-28T12:34:56.123Z'
const endAt = '2026-10-28T12:34:58.468Z'
const pair = (store: ReturnType<typeof openStore>, item: number, invocation: string, result: Record<string, unknown> = { ok: true }, status = 'returned') => {
	store.note(item, 'trace-started', { invocation, job: 'implement', kind: 'execute', parent: `item:${item}:round:1:job:implement`, args: {} }, startAt)
	store.note(item, 'trace-finished', { invocation, status, result, ms: 2345 }, endAt)
}

test('public export of actual observe calls has independent OTLP shape, timing and truthful status', async (t) => {
	const { store, item } = setup(t)
	await Effect.runPromise(Effect.gen(function* () {
		yield* TestClock.setTime(Date.parse(startAt))
		yield* observe(store, item.id, { job: 'implement', kind: 'execute', args: { prompt: 'PRIVATE_PROMPT' } }, (output) => Effect.gen(function* () {
			assert.deepEqual(otlpOf(store, item.id), { resourceSpans: [] }, 'no fabricated live span')
			output('stdout', 'PRIVATE_OUTPUT\n')
			yield* TestClock.adjust(2345)
			return { ok: true, output: 'PRIVATE_RESULT' }
		}))
		yield* observe(store, item.id, { job: 'implement', kind: 'execute', args: {} }, () => Effect.gen(function* () {
			yield* TestClock.adjust(17)
			return { ok: false, error: 'PRIVATE_ERROR' }
		}))
		yield* observe(store, item.id, { job: 'verify', kind: 'check', args: { command: 'PRIVATE_COMMAND' } }, () => Effect.succeed({ code: 7, stdout: 'PRIVATE_STDOUT', stderr: 'PRIVATE_STDERR' }))
		yield* observe(store, item.id, { job: 'verify', kind: 'check', args: {} }, () => Effect.succeed({ code: null }))
		yield* observe(store, item.id, { job: 'verify', kind: 'check', args: {} }, () => Effect.succeed({ code: 0, overBudget: { exceeded: ['ms'], ms: 3000 } }))
		yield* observe(store, item.id, { job: 'verify', kind: 'check', args: {} }, () => Effect.succeed({ code: 0 }))
		yield* observe(store, item.id, { job: 'implement', kind: 'execute', args: {} }, () => Effect.fail('PRIVATE_FAILURE')).pipe(Effect.exit)
		yield* observe(store, item.id, { job: 'implement', kind: 'execute', args: {} }, () => Effect.interrupt).pipe(Effect.exit)
	}).pipe(Effect.provide(TestClock.layer())))
	const before = { events: store.events(item.id), calls: store.calls(item.id), item: store.get(item.id) }
	const exported = otlpOf(store, item.id)
	const spans = spansOf(exported)
	assert.equal(spans.length, 7, 'interrupted invocation is not exported')
	assert.deepEqual(spans.map((s) => s.status.code), [1, 2, 2, 2, 2, 1, 2])
	assert.equal(new Set(spans.map((s) => s.traceId)).size, 1)
	assert.equal(new Set(spans.map((s) => s.spanId)).size, 7)
	for (const span of spans) {
		assert.match(span.traceId, /^[0-9a-f]{32}$/)
		assert.match(span.spanId, /^[0-9a-f]{16}$/)
		assert.notEqual(span.traceId, '0'.repeat(32))
		assert.notEqual(span.spanId, '0'.repeat(16))
		assert.equal('parentSpanId' in span, false, 'logical job parent is not an invocation')
		assert.ok(BigInt(span.endTimeUnixNano) >= BigInt(span.startTimeUnixNano))
		assert.equal(span.attributes.some((a) => a.key.startsWith('madewell.usage')), false)
	}
	assert.deepEqual(exported.resourceSpans[0]!.resource, { attributes: [{ key: 'service.name', value: { stringValue: 'madewell' } }] })
	assert.deepEqual(exported.resourceSpans[0]!.scopeSpans[0]!.scope, { name: 'madewell.invocations' })
	const { traceId: _trace, spanId: _span, ...first } = spans[0]!
	assert.deepEqual(first, {
		name: 'mw.implement.execute', kind: 1,
		startTimeUnixNano: '1793190896123000000', endTimeUnixNano: '1793190898468000000',
		status: { code: 1 }, attributes: [
			{ key: 'madewell.task.id', value: { intValue: String(item.id) } },
			{ key: 'madewell.outcome', value: { stringValue: 'ok' } },
			{ key: 'madewell.job', value: { stringValue: 'implement' } },
			{ key: 'madewell.kind', value: { stringValue: 'execute' } },
			{ key: 'madewell.duration_ms', value: { doubleValue: 2345 } },
		],
	})
	assert.doesNotMatch(JSON.stringify(exported), /PRIVATE_|parentSpanId|exception|prompt|stdout|stderr/)
	assert.deepEqual({ events: store.events(item.id), calls: store.calls(item.id), item: store.get(item.id) }, before, 'export does not mutate durable evidence')
})

test('IDs survive reopen and added attempts, separate tasks/stores, and never imply parentage', (t) => {
	const { store, item, dir } = setup(t)
	pair(store, item.id, 'attempt-1')
	const initial = otlpOf(store, item.id)
	const reopened = openStore(store.path)
	try {
		assert.deepEqual(otlpOf(reopened, item.id), initial)
		pair(reopened, item.id, 'attempt-2')
		const later = spansOf(otlpOf(reopened, item.id))
		assert.deepEqual(later[0], spansOf(initial)[0])
		assert.notEqual(later[0]!.spanId, later[1]!.spanId)
		const other = reopened.create({ title: 'other', objective: 'other', source: 'other', workspace: dir })
		pair(reopened, other.id, 'attempt-1')
		assert.notEqual(spansOf(otlpOf(reopened, other.id))[0]!.traceId, later[0]!.traceId)
	} finally { reopened.close() }
	const second = openStore(join(dir, 'other.db'))
	try {
		const other = second.create({ title: 'other', objective: 'other', source: 'other', workspace: dir })
		pair(second, other.id, 'attempt-1')
		assert.notEqual(spansOf(otlpOf(second, other.id))[0]!.traceId, spansOf(initial)[0]!.traceId)
	} finally { second.close() }
})

test('linked calls provide bounded metadata, positive structured usage and rejected/limited outcomes only', (t) => {
	const { store, item, dir } = setup(t)
	for (const outcome of ['ok', 'error', 'limit', 'rejected'] as const) {
		pair(store, item.id, outcome)
		const call = store.recordCall({
			item: item.id, kind: 'execute', job: 'implement', profile: 'implementer',
			card: { harness: 'amp', provider: 'provider-id', model: 'model-id', account: 'PRIVATE_ACCOUNT', effort: 'low' },
			system: 'PRIVATE_SYSTEM', prompt: 'PRIVATE_PROMPT', output: 'PRIVATE_OUTPUT', error: 'PRIVATE_ERROR', outcome,
			raw: JSON.stringify({ type: 'result', usage: { input_tokens: 123, output_tokens: 45 }, result: 'PRIVATE_RAW' }),
			started: startAt, ms: 2345,
		})
		store.note(item.id, 'trace-call', { invocation: outcome, call })
	}
	const exported = otlpOf(store, item.id)
	const spans = spansOf(exported)
	assert.deepEqual(spans.map((s) => s.status.code), [1, 2, 2, 2])
	assert.deepEqual(spans.map((s) => attrsOf(s)['madewell.outcome']), ['ok', 'error', 'limit', 'rejected'].map((stringValue) => ({ stringValue })))
	for (const span of spans) {
		const attrs = attrsOf(span)
		assert.deepEqual(attrs['madewell.provider'], { stringValue: 'provider-id' })
		assert.deepEqual(attrs['madewell.model'], { stringValue: 'model-id' })
		assert.deepEqual(attrs['madewell.usage.tokens.input'], { intValue: '123' })
		assert.deepEqual(attrs['madewell.usage.tokens.output'], { intValue: '45' })
		assert.equal(attrs['madewell.usage.tokens.cacheRead'], undefined, 'unknown upstream counters normalized to zero stay absent')
		assert.equal(attrs['madewell.usage.tokens.cacheWrite'], undefined)
		assert.equal(new Set(span.attributes.map((a) => a.key)).size, span.attributes.length)
	}
	assert.doesNotMatch(JSON.stringify(exported), /PRIVATE_|prompt|account|raw/)
	assert.equal(JSON.stringify(exported).includes(dir), false)
})

test('unsafe metadata, arbitrary result fields and unrelated calls do not leak or create usage', (t) => {
	const { store, item } = setup(t)
	store.note(item.id, 'trace-started', { invocation: 'safe', job: '/private/command', kind: 'x'.repeat(129), args: { card: { provider: 'safe-provider', model: '/secret/model', apiKey: 'PRIVATE_KEY' }, prompt: 'PRIVATE_PROMPT' } }, startAt)
	store.note(item.id, 'trace-output', { invocation: 'safe', text: 'PRIVATE_LOG' }, startAt)
	store.note(item.id, 'trace-finished', { invocation: 'safe', status: 'returned', result: { output: 'PRIVATE_OUTPUT', tokens: 999, duration: 999 }, error: 'PRIVATE_ERROR' }, endAt)
	const span = spansOf(otlpOf(store, item.id))[0]!
	assert.equal(span.name, 'mw.invocation.call')
	assert.deepEqual(attrsOf(span), {
		'madewell.task.id': { intValue: String(item.id) }, 'madewell.outcome': { stringValue: 'ok' }, 'madewell.provider': { stringValue: 'safe-provider' },
	})
	assert.doesNotMatch(JSON.stringify(span), /PRIVATE_|secret|private|999/)
	const other = store.create({ title: 'other', objective: 'other', source: 'other', workspace: '.' })
	const call = store.recordCall({ item: other.id, job: 'implement', kind: 'execute', profile: 'implementer', card: { harness: 'amp', provider: 'wrong', account: 'wrong', model: 'wrong', effort: 'low' }, system: '', prompt: '', outcome: 'error', output: null, error: null, raw: null, started: startAt, ms: 1 })
	store.note(item.id, 'trace-call', { invocation: 'safe', call })
	assert.deepEqual(spansOf(otlpOf(store, item.id))[0], span, 'cross-item call cannot contaminate the projection')
})

test('empty, live, lost, interrupted, orphaned and invalid-time evidence never fabricates completed spans', (t) => {
	const { store, item } = setup(t)
	assert.deepEqual(otlpOf(store, item.id), { resourceSpans: [] })
	store.note(item.id, 'trace-started', { invocation: 'live', pid: process.pid }, startAt)
	store.note(item.id, 'trace-started', { invocation: 'lost', pid: -1 }, startAt)
	pair(store, item.id, 'interrupted', {}, 'interrupted')
	pair(store, item.id, 'unknown', {}, 'mystery')
	store.note(item.id, 'trace-finished', { invocation: 'orphan', status: 'returned' }, endAt)
	for (const [name, start, end] of [
		['bad-start', 'not a date', endAt], ['bad-end', startAt, 'not a date'],
		['backwards', endAt, startAt], ['negative', '1969-12-31T23:59:59.000Z', endAt],
		['overflow', startAt, '9999-12-31T23:59:59.000Z'],
	]) {
		store.note(item.id, 'trace-started', { invocation: name }, start)
		store.note(item.id, 'trace-finished', { invocation: name, status: 'returned' }, end)
	}
	assert.deepEqual(otlpOf(store, item.id), { resourceSpans: [] })
	pair(store, item.id, 'real-failure', {}, 'failed')
	assert.deepEqual(spansOf(otlpOf(store, item.id)).map((s) => s.status), [{ code: 2 }])
})

test('missing task has an actionable MadeWellError', (t) => {
	const { store } = setup(t)
	assert.throws(() => otlpOf(store, 999), (error) => {
		assert.ok(error instanceof MadeWellError)
		assert.equal(error.code, 'item_not_found')
		assert.deepEqual(error.context, { id: 999 })
		assert.ok(error.next.length > 0)
		return true
	})
})
