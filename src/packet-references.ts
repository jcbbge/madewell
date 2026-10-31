import { createHash } from 'node:crypto'

/** Exact duplicates become self-contained JSON-pointer references; no source is summarized or discarded. */
export function referenceDiscovery(context: Record<string, unknown>, source: string, received?: Record<string, unknown>) {
	const out = { ...context }
	const reference = (pointer: string, value: unknown) => ({ pointer, sha256: createHash('sha256').update(JSON.stringify(value)).digest('hex'), encoding: 'JSON.stringify UTF-8' })
	if (out.source === source) { delete out.source; out.sourceReference = reference('/item/source', source) }
	if (received?.discover !== undefined && JSON.stringify(out.candidate) === JSON.stringify(received.discover)) {
		delete out.candidate; out.candidateReference = reference('/received/discover', received.discover)
	}
	return out
}
