// Read-only OTLP/JSON ExportTraceServiceRequest, not an exporter transport or another trace store.
// Encoding: https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
// Schema: opentelemetry-proto/opentelemetry/proto/{collector/trace,trace}/v1/*.proto
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { MadeWellError } from './errors.ts'
import type { Event, Store } from './store.ts'

type Attribute = { key: string; value: { stringValue: string } | { intValue: string } | { doubleValue: number } }
interface Span {
	traceId: string
	spanId: string
	name: string
	kind: number
	startTimeUnixNano: string
	endTimeUnixNano: string
	attributes: Attribute[]
	status: { code: number }
}

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
// Metadata identifiers, not free text. Omit unsafe/oversized values rather than leaking a prefix.
const label = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:@+-]{0,127}$/.test(value) ? value : undefined
const text = (key: string, value: string): Attribute => ({ key, value: { stringValue: value } })
const integer = (key: string, value: number): Attribute => ({ key, value: { intValue: String(value) } })
const identifier = (parts: unknown[], length: number) => {
	const hex = createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, length)
	return /^0+$/.test(hex) ? `${hex.slice(0, -1)}1` : hex
}
const unixNano = (at: string) => {
	const ms = Date.parse(at)
	if (!Number.isSafeInteger(ms) || ms < 0) return undefined
	const ns = BigInt(ms) * 1_000_000n
	return ns <= 18_446_744_073_709_551_615n ? ns : undefined
}

/**
 * Completed invocations only; live, lost, interrupted, unpaired and invalid-time records stay in
 * the native trace, not in this export. Timestamps retain the source's millisecond precision.
 * IDs are deterministic hashes of the absolute store path, task identity and invocation identity:
 * reopening is stable; moving/copying a store to a different path changes its trace namespace.
 * All spans are INTERNAL roots: trace parent/group is not proof of an invocation parent.
 * Only identifier-shaped metadata and known numeric measurements are exported. No free text,
 * exception messages, payloads, paths, accounts, tool events or raw stream parsing. Identifier
 * fields must not contain secrets; this allowlist is not a general secret detector. Slash-qualified
 * model names are omitted along with path-like labels. Usage comes only from linked saved calls;
 * zero token fields are omitted because the existing parser conflates missing counts with zero.
 * No synthetic usage, aggregate token total, costs, delivery, retries or collector state.
 */
export function otlpOf(store: Store['Service'], id: number) {
	const item = store.get(id)
	if (!item) throw new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list existing work' }] })
	const events = store.events(id)
	const starts = new Map<string, Event>()
	const finishes = new Map<string, Event>()
	const links = new Map<string, number>()
	for (const event of events) {
		const invocation = event.data.invocation
		if (typeof invocation !== 'string' || !invocation) continue
		if (event.kind === 'trace-started' && !starts.has(invocation)) starts.set(invocation, event)
		if (event.kind === 'trace-finished' && !finishes.has(invocation)) finishes.set(invocation, event)
		if (event.kind === 'trace-call' && typeof event.data.call === 'number') links.set(invocation, event.data.call)
	}
	const calls = new Map(store.calls(id).map((call) => [call.id, call]))
	const traceId = identifier(['madewell.otlp.trace.v1', resolve(store.path), id, item.created], 32)
	const spans: Span[] = []
	for (const [invocation, start] of starts) {
		const finish = finishes.get(invocation)
		if (!finish || finish.seq <= start.seq || !['returned', 'failed'].includes(String(finish.data.status))) continue
		const from = unixNano(start.at)
		const to = unixNano(finish.at)
		if (from === undefined || to === undefined || to < from) continue
		const call = calls.get(links.get(invocation) ?? -1)
		const result = record(finish.data.result)
		const failed = finish.data.status === 'failed' || result.ok === false ||
			result.code === null || (typeof result.code === 'number' && result.code !== 0) ||
			(result.overBudget !== undefined && result.overBudget !== null) ||
			(call !== undefined && call.outcome !== 'ok')
		const outcome = failed ? call?.outcome === 'limit' || call?.outcome === 'rejected' ? call.outcome : 'error' : 'ok'
		const attributes: Attribute[] = [integer('madewell.task.id', id), text('madewell.outcome', outcome)]
		const card = call?.card ?? record(record(start.data.args).card)
		for (const [key, value] of [
			['madewell.job', start.data.job], ['madewell.kind', start.data.kind],
			['madewell.provider', card.provider], ['madewell.model', card.model],
		]) {
			const safe = label(value)
			if (safe) attributes.push(text(key as string, safe))
		}
		const ms = finish.data.ms
		if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0) attributes.push({ key: 'madewell.duration_ms', value: { doubleValue: ms } })
		for (const key of ['input', 'output', 'cacheRead', 'cacheWrite'] as const) {
			const count = call?.tokens?.[key]
			if (typeof count === 'number' && Number.isSafeInteger(count) && count > 0) attributes.push(integer(`madewell.usage.tokens.${key}`, count))
		}
		spans.push({
			traceId, spanId: identifier(['madewell.otlp.span.v1', traceId, invocation], 16),
			name: `mw.${label(start.data.job) ?? 'invocation'}.${label(start.data.kind) ?? 'call'}`,
			kind: 1, startTimeUnixNano: String(from), endTimeUnixNano: String(to), attributes,
			status: { code: failed ? 2 : 1 },
		})
	}
	return { resourceSpans: spans.length ? [{
		resource: { attributes: [text('service.name', 'madewell')] },
		scopeSpans: [{ scope: { name: 'madewell.invocations' }, spans }],
	}] : [] }
}
