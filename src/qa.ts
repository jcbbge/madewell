// Manual QA is evidence attached to existing work, never another delivery scheduler.
// The Store owns every row/transaction; CLI and HTTP share these exact boundaries.
import { Clock, Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { Store } from './store.ts'
import { observe } from './trace.ts'
import { formatQaMarkdown } from './export.ts'

export const QA_BODY_LIMIT = 65_536
export const QaId = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }))
export const QaCounter = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }))
const text = (max: number) => Schema.String.check(Schema.isMaxCodePoints(max))
const nonblank = (max: number) => text(max).check(Schema.isPattern(/\S/))
const requestId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{16,128}$/))
const timestamp = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/), Schema.makeFilter((value: string) => {
	const parts = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})/.exec(value)
	if (!parts || !Number.isFinite(Date.parse(value))) return false
	const [, y, m, d, h, min, s] = parts
	const days = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
	return Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= days && Number(h) < 24 && Number(min) < 60 && Number(s) < 60
}, { toJsonSchema: () => ({ format: 'date-time' }) }))
export const QaState = Schema.Literals(['untested', 'passed', 'failed', 'needs-refinement'])
export type QaState = typeof QaState.Type
export const QaActor = Schema.Struct({ kind: Schema.Literals(['operator', 'agent', 'import']), label: nonblank(300) })
export const QaRef = Schema.Struct({ label: nonblank(300), ref: nonblank(4096) })
const refs = Schema.Array(QaRef).check(Schema.isMaxLength(50))
export const QaInstructions = Schema.Struct({
	title: nonblank(300), area: nonblank(300), change: nonblank(8000), sourceRefs: refs,
	prerequisites: text(8000), testData: text(8000), actions: Schema.Array(nonblank(2000)).check(Schema.isBetweenLength(1, 100)), expected: nonblank(8000),
})
export const QaVersion = Schema.Union([Schema.Struct({ kind: Schema.Literal('unknown') }), Schema.Struct({ kind: Schema.Literal('known'), value: nonblank(300), source: QaRef })])
export const QaCase = Schema.Struct({ id: QaId, workItem: QaId, workspace: nonblank(4096), currentRevision: QaId, createdAt: timestamp })
export type QaCase = typeof QaCase.Type
export const QaCaseRevision = Schema.Struct({ caseId: QaId, revision: QaId, at: timestamp, enteredBy: QaActor, instructions: QaInstructions })
export type QaCaseRevision = typeof QaCaseRevision.Type
const pin = Schema.Struct({ caseId: QaId, caseRevision: QaId })
const pins = Schema.Array(pin).check(Schema.isBetweenLength(1, 100), Schema.makeFilter((value: readonly (typeof pin.Type)[]) => new Set(value.map((p) => p.caseId)).size === value.length, { toJsonSchema: () => [{}, true] }))
export const QaRun = Schema.Struct({ id: QaId, workItem: QaId, workspace: nonblank(4096), application: nonblank(2000), environment: nonblank(2000), version: QaVersion, startedAt: timestamp, enteredBy: QaActor, cases: pins })
export type QaRun = typeof QaRun.Type
export const QaObservation = Schema.Struct({
	id: QaId, runId: QaId, caseId: QaId, caseRevision: QaId, entryRevision: QaId, at: timestamp,
	kind: Schema.Literals(['note', 'technical', 'historical', 'manual-verdict']), enteredBy: QaActor, claimedVerifier: Schema.NullOr(QaActor), observedAt: Schema.NullOr(timestamp),
	actual: text(8000), reproduction: text(8000), notes: text(8000), evidence: refs, reportedResult: Schema.NullOr(QaState), verdict: Schema.NullOr(QaState),
})
export type QaObservation = typeof QaObservation.Type
export const QaCreateCaseInput = Schema.Struct({ requestId, workItem: QaId, workspace: nonblank(4096), enteredBy: QaActor, instructions: QaInstructions })
export const QaReviseCaseInput = Schema.Struct({ requestId, revision: QaId, enteredBy: QaActor, instructions: QaInstructions })
export const QaStartRunInput = Schema.Struct({ requestId, workItem: QaId, workspace: nonblank(4096), enteredBy: QaActor, application: nonblank(2000), environment: nonblank(2000), version: QaVersion, cases: pins })
const observationInput = { requestId, revision: QaCounter, enteredBy: QaActor, claimedVerifier: Schema.NullOr(QaActor), observedAt: Schema.NullOr(timestamp), actual: text(8000), reproduction: text(8000), notes: text(8000), evidence: refs }
export const QaObserveInput = Schema.Union([
	Schema.Struct({ ...observationInput, kind: Schema.Literal('note'), reportedResult: Schema.Null }),
	Schema.Struct({ ...observationInput, kind: Schema.Literals(['technical', 'historical']), reportedResult: Schema.NullOr(QaState) }),
]).check(Schema.makeFilter((value) => !!(value.actual.trim() || value.reproduction.trim() || value.notes.trim() || value.evidence.length || value.reportedResult) || (value.kind === 'note' && value.revision > 0 && value.notes === ''), { toJsonSchema: () => [{}, true] }))
const verdictInput = { requestId, revision: QaCounter, enteredBy: Schema.Struct({ kind: Schema.Literal('operator'), label: nonblank(300) }), attestation: Schema.Literal('operator-manual-verdict'), reproduction: text(8000), notes: text(8000), evidence: refs }
export const QaVerdictInput = Schema.Union([
	Schema.Struct({ ...verdictInput, verdict: Schema.Literal('untested'), actual: text(8000) }),
	Schema.Struct({ ...verdictInput, verdict: Schema.Literals(['passed', 'failed', 'needs-refinement']), actual: nonblank(8000) }),
])
export const QaLinkInput = Schema.Struct({ requestId, revision: QaCounter, enteredBy: QaActor, observationId: QaId, target: Schema.Union([
	Schema.Struct({ kind: Schema.Literal('work-item'), workItem: QaId }),
	Schema.Struct({ kind: Schema.Literal('reference'), reference: QaRef }),
	Schema.Struct({ kind: Schema.Literal('retest'), runId: QaId }),
]) })
export type QaLinkInput = typeof QaLinkInput.Type
export const QaLinkedWork = Schema.Struct({ id: QaId, workspace: Schema.String, title: Schema.String, objective: Schema.String, source: Schema.String, status: Schema.String, updated: Schema.String })
export type QaLinkedWork = typeof QaLinkedWork.Type
export const QaLink = Schema.Struct({ event: QaId, at: timestamp, requestId, enteredBy: QaActor,
	source: Schema.Struct({ runId: QaId, caseId: QaId, caseRevision: QaId, observationId: QaId }),
	target: Schema.Union([
		Schema.Struct({ kind: Schema.Literal('work-item'), workItem: QaId, snapshot: QaLinkedWork }),
		Schema.Struct({ kind: Schema.Literal('reference'), reference: QaRef }),
		Schema.Struct({ kind: Schema.Literal('retest'), run: QaRun, caseId: QaId, caseRevision: QaId }),
	]),
})
export type QaLink = typeof QaLink.Type
export const QaLinkView = Schema.Struct({ link: QaLink, targetAvailability: Schema.Literals(['present', 'unavailable', 'not-checked']) })
export type QaLinkView = typeof QaLinkView.Type
const conflictFields = { event: QaId, workItem: QaId, at: timestamp, requestId, caseId: QaId, expected: QaCounter, actual: QaCounter }
export const QaConflict = Schema.Union([
	Schema.Struct({ ...conflictFields, operation: Schema.Literal('reviseCase'), runId: Schema.Null, input: QaReviseCaseInput }),
	Schema.Struct({ ...conflictFields, operation: Schema.Literal('observeCase'), runId: QaId, input: QaObserveInput }),
	Schema.Struct({ ...conflictFields, operation: Schema.Literal('recordVerdict'), runId: QaId, input: QaVerdictInput }),
	Schema.Struct({ ...conflictFields, operation: Schema.Literal('linkObservation'), runId: QaId, input: QaLinkInput }),
])
export type QaConflict = typeof QaConflict.Type
const selection = Schema.Literals(['all', 'follow-ups'])
export const QaExportQuery = Schema.Struct({ selection: Schema.optionalKey(selection), format: Schema.optionalKey(Schema.Literals(['json', 'markdown'])) })
export type QaExportQuery = typeof QaExportQuery.Type
export const QaExportEntry = Schema.Struct({ caseId: QaId, caseRevision: QaId, case: QaCase, instructions: QaCaseRevision, entryRevision: QaCounter, status: QaState,
	currentCaseRevision: QaId, outdated: Schema.Boolean, latestVerdictId: Schema.NullOr(QaId), observations: Schema.Array(QaObservation), links: Schema.Array(QaLinkView), conflicts: Schema.Array(QaConflict),
})
export type QaExportEntry = typeof QaExportEntry.Type
export const QaExportDocument = Schema.Struct({ schemaVersion: Schema.Literal(1), selection, externalEvidence: Schema.Literal('unavailable-reference-only'), run: QaRun, entries: Schema.Array(QaExportEntry) })
export type QaExportDocument = typeof QaExportDocument.Type
export const QaExportResult = Schema.Union([
	Schema.Struct({ apiVersion: Schema.Literal('1'), format: Schema.Literal('json'), data: QaExportDocument }),
	Schema.Struct({ apiVersion: Schema.Literal('1'), format: Schema.Literal('markdown'), markdown: Schema.String }),
])
export type QaExportResult = typeof QaExportResult.Type
export const QaAccepted = Schema.Struct({
	apiVersion: Schema.Literal('1'), accepted: Schema.Literal(true), requestId,
	receipt: Schema.Struct({ operation: Schema.Literals(['createCase', 'reviseCase', 'startRun', 'observeCase', 'recordVerdict', 'linkObservation']), resource: Schema.Literals(['case', 'run', 'run-entry']), id: QaId, caseId: Schema.NullOr(QaId), revision: QaCounter, event: QaId, at: timestamp, replayed: Schema.Boolean }),
	links: Schema.Struct({ read: Schema.String, workItem: Schema.String }),
})
export type QaAccepted = typeof QaAccepted.Type
const page = <S extends Schema.Top>(schema: S) => Schema.Struct({ apiVersion: Schema.Literal('1'), items: Schema.Array(schema), nextAfter: Schema.NullOr(QaId), hasMore: Schema.Boolean })
export const QaCaseList = page(Schema.Struct({ ...QaCase.fields, title: nonblank(300), area: nonblank(300) }))
export const QaCaseDetail = Schema.Struct({ apiVersion: Schema.Literal('1'), case: QaCase, revision: QaCaseRevision })
export const QaRunList = page(Schema.Struct({ id: QaId, workItem: QaId, workspace: nonblank(4096), application: nonblank(2000), environment: nonblank(2000), version: QaVersion, startedAt: timestamp, caseCount: QaId }))
export const QaRunDetail = Schema.Struct({ apiVersion: Schema.Literal('1'), run: QaRun, entries: Schema.Array(Schema.Struct({
	caseId: QaId, caseRevision: QaId, title: nonblank(300), area: nonblank(300), entryRevision: QaCounter, status: QaState,
	currentCaseRevision: QaId, outdated: Schema.Boolean, latestVerdictId: Schema.NullOr(QaId), instructionsHref: Schema.String, observationsHref: Schema.String,
})) })
export const QaObservationList = page(QaObservation)
export const QaSnapshot = Schema.Struct({ schemaVersion: Schema.Literal(1), run: QaRun, entries: Schema.Array(Schema.Struct({ caseId: QaId, caseRevision: QaId, instructions: QaCaseRevision, entryRevision: QaCounter, status: QaState, observations: Schema.Array(QaObservation) })) })
export type QaSnapshot = typeof QaSnapshot.Type
const pagination = { after: Schema.optionalKey(QaCounter), limit: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))) }
export const QaCasesQuery = Schema.Struct({ workspace: Schema.optionalKey(nonblank(4096)), workItem: Schema.optionalKey(QaId), q: Schema.optionalKey(text(300)), area: Schema.optionalKey(text(300)), ...pagination })
export const QaCaseQuery = Schema.Struct({ revision: Schema.optionalKey(QaId) })
export const QaRunsQuery = Schema.Struct({ workspace: Schema.optionalKey(nonblank(4096)), workItem: Schema.optionalKey(QaId), caseId: Schema.optionalKey(QaId), ...pagination })
export const QaObservationsQuery = Schema.Struct({ caseId: Schema.optionalKey(QaId), ...pagination })

export type QaActor = typeof QaActor.Type
export type QaRef = typeof QaRef.Type
export type QaInstructions = typeof QaInstructions.Type
export type QaVersion = typeof QaVersion.Type
export type QaCreateCaseInput = typeof QaCreateCaseInput.Type
export type QaReviseCaseInput = typeof QaReviseCaseInput.Type
export type QaStartRunInput = typeof QaStartRunInput.Type
export type QaObserveInput = typeof QaObserveInput.Type
export type QaVerdictInput = typeof QaVerdictInput.Type
export type QaCaseList = typeof QaCaseList.Type
export type QaCaseDetail = typeof QaCaseDetail.Type
export type QaRunList = typeof QaRunList.Type
export type QaRunDetail = typeof QaRunDetail.Type
export type QaObservationList = typeof QaObservationList.Type

export const QA_SCHEMAS = { QaActor, QaRef, QaInstructions, QaVersion, QaCase, QaCaseRevision, QaRun, QaObservation, QaAccepted, QaCreateCaseInput, QaReviseCaseInput, QaStartRunInput, QaObserveInput, QaVerdictInput, QaCaseList, QaCaseDetail, QaRunList, QaRunDetail, QaObservationList, QaSnapshot, QaCasesQuery, QaCaseQuery, QaRunsQuery, QaObservationsQuery, QaLinkInput, QaLinkedWork, QaLink, QaLinkView, QaConflict, QaExportQuery, QaExportEntry, QaExportDocument, QaExportResult }
export const QA_JSON_SCHEMAS = Object.fromEntries(Object.entries(QA_SCHEMAS).map(([name, schema]) => {
	// Inline non-recursive shapes so these schemas work both standalone in CLI and inside OpenAPI.
	const doc = Schema.toJsonSchemaDocument(schema, { onExcessProperty: 'error', referencePolicy: () => undefined })
	return [name, doc.schema]
})) as Record<keyof typeof QA_SCHEMAS, Record<string, unknown>>

export type QaCommand =
	| { operation: 'createCase'; input: typeof QaCreateCaseInput.Type }
	| { operation: 'reviseCase'; caseId: number; input: typeof QaReviseCaseInput.Type }
	| { operation: 'startRun'; input: typeof QaStartRunInput.Type }
	| { operation: 'observeCase'; runId: number; caseId: number; input: typeof QaObserveInput.Type }
	| { operation: 'recordVerdict'; runId: number; caseId: number; input: typeof QaVerdictInput.Type }
	| { operation: 'linkObservation'; runId: number; caseId: number; input: QaLinkInput }
export type QaRejection = { status: number; reason: string; facts: Record<string, unknown> }
export type QaOutcome = { accepted: true; value: QaAccepted } | { accepted: false; error: QaRejection }
export type QaQuery =
	| { kind: 'cases'; filters: typeof QaCasesQuery.Type }
	| { kind: 'case'; caseId: number; filters: typeof QaCaseQuery.Type }
	| { kind: 'runs'; filters: typeof QaRunsQuery.Type }
	| { kind: 'run' | 'snapshot'; runId: number }
	| { kind: 'observations'; runId: number; filters: typeof QaObservationsQuery.Type }
	| { kind: 'export'; runId: number; selection: 'all' | 'follow-ups' }
export type QaReadResult = typeof QaCaseList.Type | typeof QaCaseDetail.Type | typeof QaRunList.Type | typeof QaRunDetail.Type | typeof QaObservationList.Type | QaSnapshot | QaExportDocument

export const qaError = (status: number, reason: string, facts: Record<string, unknown> = {}) => new MadeWellError({
	code: 'qa_request', message: `Manual QA request refused: ${reason}. Retain your draft and request ID; refresh and review before submitting changed input.`, context: { status, reason, facts },
	next: [{ run: typeof facts.refresh === 'string' ? facts.refresh : 'mw qa-cases', why: 'inspect saved QA history; reuse exact input/ID for an uncertain retry, or a new ID after explicit conflict review' }],
})
export const qaStorageError = (cause: unknown): MadeWellError => {
	if (cause instanceof MadeWellError) return cause
	const message = cause instanceof Error ? cause.message : ''
	return /(?:SQLITE_BUSY|database is locked|database table is locked)/i.test(message) ? qaError(503, 'store_busy') : qaError(500, 'storage_failed')
}
const decode = <S extends Schema.Top>(schema: S, input: unknown) => Schema.decodeUnknownEffect(schema)(input, { onExcessProperty: 'error' }).pipe(Effect.mapError(() => qaError(400, 'invalid_input')))
/** Fatal UTF-8, no normalization, shared CLI byte boundary. HTTP enforces the same cap while streaming. */
export const qaParseJson = (bytes: Uint8Array): unknown => {
	if (bytes.byteLength > QA_BODY_LIMIT) throw qaError(400, 'invalid_input', { maxBodyBytes: QA_BODY_LIMIT })
	try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
	catch { throw qaError(400, 'invalid_input', { expected: 'UTF-8 JSON' }) }
}

const write = Effect.fn('mw.qaWrite')(function* (command: QaCommand) {
	const store = yield* Store
	// This read only locates trace ownership. All authority/link/CAS checks repeat under the write lock.
	const itemId = yield* Effect.try({ try: () => {
		if (command.operation === 'createCase' || command.operation === 'startRun') return command.input.workItem
		if (command.operation === 'reviseCase') return (store.qaRead({ kind: 'case', caseId: command.caseId, filters: {} }) as typeof QaCaseDetail.Type).case.workItem
		return (store.qaRead({ kind: 'run', runId: command.runId }) as typeof QaRunDetail.Type).run.workItem
	}, catch: qaStorageError }).pipe(Effect.catchIf((error) => error.code === 'qa_request' && (error.context as { reason: string }).reason === 'not_found', () => Effect.succeed(null)))
	const attempt = Effect.gen(function* () {
		const at = new Date(yield* Clock.currentTimeMillis).toISOString()
		return yield* Effect.try({ try: () => store.qaWrite(command, at), catch: qaStorageError })
	})
	const exists = yield* Effect.try({ try: () => itemId !== null && !!store.get(itemId), catch: qaStorageError })
	const outcome = yield* (itemId !== null && exists
		? observe(store, itemId, { job: `qa-${command.operation}`, kind: 'function', args: { apiVersion: '1', ...command } }, () => attempt).pipe(Effect.map(({ result }) => result))
		: attempt).pipe(Effect.catchDefect((cause) => Effect.fail(qaStorageError(cause))))
	if (!outcome.accepted) return yield* qaError(outcome.error.status, outcome.error.reason, outcome.error.facts)
	return outcome.value
})
export const qaCreateCase = Effect.fn('mw.qaCreateCase')(function* (input: unknown) { return yield* write({ operation: 'createCase', input: yield* decode(QaCreateCaseInput, input) }) })
export const qaReviseCase = Effect.fn('mw.qaReviseCase')(function* (caseId: number, input: unknown) { return yield* write({ operation: 'reviseCase', caseId: yield* decode(QaId, caseId), input: yield* decode(QaReviseCaseInput, input) }) })
export const qaStartRun = Effect.fn('mw.qaStartRun')(function* (input: unknown) { return yield* write({ operation: 'startRun', input: yield* decode(QaStartRunInput, input) }) })
export const qaLink = Effect.fn('mw.qaLink')(function* (runId: number, caseId: number, input: unknown) { return yield* write({ operation: 'linkObservation', runId: yield* decode(QaId, runId), caseId: yield* decode(QaId, caseId), input: yield* decode(QaLinkInput, input) }) })
export const qaObserve = Effect.fn('mw.qaObserve')(function* (runId: number, caseId: number, input: unknown) { return yield* write({ operation: 'observeCase', runId: yield* decode(QaId, runId), caseId: yield* decode(QaId, caseId), input: yield* decode(QaObserveInput, input) }) })
export const qaVerdict = Effect.fn('mw.qaVerdict')(function* (runId: number, caseId: number, input: unknown) {
	if (input && typeof input === 'object') {
		const body = input as { enteredBy?: { kind?: unknown }; attestation?: unknown }
		if (body.enteredBy?.kind !== 'operator' || body.attestation !== 'operator-manual-verdict') return yield* qaError(403, 'manual_authority_required')
	}
	return yield* write({ operation: 'recordVerdict', runId: yield* decode(QaId, runId), caseId: yield* decode(QaId, caseId), input: yield* decode(QaVerdictInput, input) })
})
const read = Effect.fn('mw.qaRead')(function* (query: QaQuery) { const store = yield* Store; return yield* Effect.try({ try: () => store.qaRead(query), catch: qaStorageError }) })
export const qaCases = Effect.fn('mw.qaCases')(function* (filters: typeof QaCasesQuery.Type = {}) { return (yield* read({ kind: 'cases', filters: yield* decode(QaCasesQuery, filters) })) as typeof QaCaseList.Type })
export const qaCase = Effect.fn('mw.qaCase')(function* (caseId: number, filters: typeof QaCaseQuery.Type = {}) { return (yield* read({ kind: 'case', caseId: yield* decode(QaId, caseId), filters: yield* decode(QaCaseQuery, filters) })) as typeof QaCaseDetail.Type })
export const qaRuns = Effect.fn('mw.qaRuns')(function* (filters: typeof QaRunsQuery.Type = {}) { return (yield* read({ kind: 'runs', filters: yield* decode(QaRunsQuery, filters) })) as typeof QaRunList.Type })
export const qaRun = Effect.fn('mw.qaRun')(function* (runId: number) { return (yield* read({ kind: 'run', runId: yield* decode(QaId, runId) })) as typeof QaRunDetail.Type })
export const qaObservations = Effect.fn('mw.qaObservations')(function* (runId: number, filters: typeof QaObservationsQuery.Type = {}) { return (yield* read({ kind: 'observations', runId: yield* decode(QaId, runId), filters: yield* decode(QaObservationsQuery, filters) })) as typeof QaObservationList.Type })
export const qaSnapshot = Effect.fn('mw.qaSnapshot')(function* (runId: number) { return (yield* read({ kind: 'snapshot', runId: yield* decode(QaId, runId) })) as QaSnapshot })
export const qaExport = Effect.fn('mw.qaExport')(function* (runId: number, query: QaExportQuery = {}) {
	const resolved = yield* decode(QaExportQuery, query)
	const data = (yield* read({ kind: 'export', runId: yield* decode(QaId, runId), selection: resolved.selection ?? 'all' })) as QaExportDocument
	return (resolved.format === 'markdown' ? { apiVersion: '1', format: 'markdown', markdown: formatQaMarkdown(data) } : { apiVersion: '1', format: 'json', data }) as QaExportResult
})
