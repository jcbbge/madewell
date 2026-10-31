// Additive operator API. The engine owns answers; SQLite owns transitions and retry receipts.
// Context is a compact projection with evidence links, never a copy of the AX packet tree.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Effect } from 'effect'
import { answer, nextFor, promote } from './engine.ts'
import { ERRORS, MadeWellError } from './errors.ts'
import { laneOf, loadPack } from './lane.ts'
import { currentHandoffOf, displayPreview, evidenceDetailOf, evidenceUrl, messageReferencesOf, type AnswerReference } from './handoff-view.ts'
import { otlpOf } from './otlp.ts'
import { projectsPath, readProjects } from './project.ts'
import { QA_JSON_SCHEMAS, qaCase, qaCases, qaCreateCase, qaError, qaExport, qaLink, qaObservations, qaObserve, qaReviseCase, qaRun, qaRuns, qaStartRun, qaVerdict } from './qa.ts'
import { DEFAULT_AUTONOMY, Store, openStore, type Event, type Item } from './store.ts'

const ROOT = '/api/v1'
const BODY_LIMIT = 65_536
const TEXT_LIMIT = 32_768
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export const revisionOf = (item: Item) => hash(JSON.stringify(item))
const fail = (status: number, reason: string, message: string, facts: Record<string, unknown> = {}) => new MadeWellError({
	code: 'api_request', message, context: { status, reason, facts },
	next: [{ run: 'mw status', why: 'inspect the saved work; retain your draft and request ID until acceptance is known' }],
})
const found = (store: Store['Service'] | undefined, id: number) => {
	const item = store?.get(id)
	if (!item) throw new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list existing work' }] })
	return item
}
/** These effects must stay synchronous inside operatorRequest's SQLite transaction. */
const sync = <A>(effect: Effect.Effect<A, MadeWellError>) => {
	const result = Effect.runSync(effect.pipe(Effect.match({ onFailure: (error) => ({ ok: false as const, error }), onSuccess: (value) => ({ ok: true as const, value }) })))
	if (!result.ok) throw result.error
	return result.value
}

export const answerPolicy = (item: Item) => {
	const options = nextFor(item).filter((n) => n.run.startsWith(`mw answer ${item.id} `))
	const causes = options.flatMap((n) => /--cause ([\w-]+)/.exec(n.run)?.[1] ?? [])
	return {
		allowed: options.length > 0, causeRequired: causes.length > 0, causes,
		reason: options.length ? options.map((n) => n.why).join('; ') : item.hold?.message ?? `The item is ${item.status}; it is not waiting for an answer.`,
	}
}

interface Message { id: string; at: string; role: string; kind: string; text: string; event: number | null; truncated?: boolean; actor?: { role: string; job: string | null }; references?: AnswerReference[]; referencesTotal?: number; referencesOmitted?: number; evidence?: string }
const messagesOf = (item: Item, events: readonly Event[], store: Store['Service'], exact = false): Message[] => {
	const messages: Message[] = [{ id: `source:${item.id}`, at: item.created, role: 'operator', kind: 'source', text: item.source, event: events.find(e => e.kind === 'created')?.seq ?? null }]
	for (const e of events) {
		if (e.kind === 'nq-question' && Array.isArray(e.data.questions)) messages.push({ id: `event:${e.seq}`, at: e.at, role: String(e.data.receiver ?? 'unknown'), kind: 'question', text: e.data.questions.map(String).join('\n'), event: e.seq })
		const text = e.data.answer ?? (e.kind === 'ruling' && typeof e.data.prerequisite === 'number' ? store.get(e.data.prerequisite)?.objective : undefined)
		if (['nq-answer', 'nq-corrected', 'steered', 'ruling', 'nq-decided', 'nq-reused'].includes(e.kind) && (typeof text === 'string' || e.kind === 'nq-reused')) {
			const references = messageReferencesOf(store, item, e), role = String(e.data.originator ?? e.data.by ?? 'unknown')
			messages.push({ id: `event:${e.seq}`, at: e.at, role, actor: { role, job: typeof e.data.job === 'string' ? e.data.job : null }, kind: e.kind === 'nq-decided' ? 'decision' : e.kind === 'nq-reused' ? 'reuse' : 'answer', text: e.kind === 'nq-reused' ? 'Reused answer' + (references.length ? ': ' + references.slice(0, 5).map(r => r.answerId).join(', ') : ' (target unknown)') : String(text), event: e.seq, references: exact ? references : references.slice(0, 5).map(r => ({ ...r, question: displayPreview(r.question, 240) })), referencesTotal: references.length, referencesOmitted: exact ? 0 : Math.max(0, references.length - 5), evidence: evidenceUrl(item.id, 'event', e.seq) })
		}
	}
	return messages
}

export const contextOf = (store: Store['Service'], id: number) => {
	const item = found(store, id)
	const events = store.events(id)
	const revision = revisionOf(item)
	const policy = answerPolicy(item)
	const history = messagesOf(item, events, store).filter((m) => m.kind !== 'source')
	const currentHandoff = currentHandoffOf(store, item)
	let remaining = 12_000 - JSON.stringify(currentHandoff).length - 2
	const selected: Message[] = []
	for (const m of history.slice(-20).reverse()) {
		const entry: Message = { ...m, at: displayPreview(m.at), role: displayPreview(m.role), text: displayPreview(m.text, 2000),
			...(m.actor ? { actor: { role: displayPreview(m.actor.role), job: m.actor.job === null ? null : displayPreview(m.actor.job) } } : {}),
			...(m.references ? { references: m.references.map(r => ({ ...r, question: displayPreview(r.question, 240), by: displayPreview(r.by), job: r.job === null ? null : displayPreview(r.job), source: r.source ? { ...r.source, at: displayPreview(r.source.at) } : null })) } : {}),
			truncated: Array.from(m.text).length > 2000 || [m.at, m.role, m.actor?.role ?? '', m.actor?.job ?? ''].some(v => Array.from(v).length > 120) || (m.referencesTotal ?? 0) > (m.references?.length ?? 0) || !!m.references?.some(r => Array.from(r.question).length >= 240 || [r.by, r.job ?? '', r.source?.at ?? ''].some(v => Array.from(v).length > 120)) }
		const size = JSON.stringify(entry).length + 1
		if (size > remaining) break
		remaining -= size; selected.unshift(entry)
	}
	const actions = nextFor(item).map((n) => {
		const command = n.run.split(' ')[1]!
		const cause = /--cause ([\w-]+)/.exec(n.run)?.[1]
		const read = n.run.startsWith('mw ') && ['context', 'trace', 'show', 'status', 'holds', 'next', 'stats', 'watch', 'export', 'replay'].includes(command)
		return {
			owner: read ? 'observer' : 'operator', authority: read ? 'read-only' : 'explicit-operator-action', reason: displayPreview(n.why, 240), command: n.run,
			transport: command === 'answer' ? 'http' : 'cli',
			...(command === 'answer' ? { method: 'POST', href: `${ROOT}/items/${id}/answers` } : {}),
			inputs: (command === 'answer' ? { revision, text: null, ...(cause ? { cause } : {}), requestId: null } : { id }) as Record<string, unknown>,
			preconditions: { revision, status: item.status, holdCode: item.hold?.code ?? null },
		}
	})
	if (item.status === 'candidate' && item.discovery !== undefined) actions.unshift({ owner: 'operator', authority: 'explicit-operator-action', reason: 'Start this task and its prerequisites through the configured delivery steps.', command: `mw promote ${item.discovery} ${id}`, transport: 'http', method: 'POST', href: `${ROOT}/items/${id}/start`, inputs: { revision, requestId: null }, preconditions: { revision, status: item.status, holdCode: null } })
	const context = {
		apiVersion: '1',
		item: { id, title: displayPreview(item.title), objective: displayPreview(item.objective, 240), source: displayPreview(item.source, 8000), sourceTruncated: Array.from(item.source).length > 8000, workspace: displayPreview(item.workspace) },
		position: { status: item.status, node: displayPreview(item.job), round: item.round, loop: item.flow?.loop ?? (laneOf(item.pack).discovery.some((s) => s.job === item.job) ? 'discovery' : 'delivery'), accepted: (item.flow?.accepted ?? []).slice(0, 20).map(v => displayPreview(v)), acceptedTotal: item.flow?.accepted.length ?? 0, acceptedOmitted: Math.max(0, (item.flow?.accepted.length ?? 0) - 20) },
		revision, evidence: { event: events.at(-1)?.seq ?? 0, record: `/api/item/${id}`, trace: `/api/trace/${id}?lens=ax`, conversation: `${ROOT}/items/${id}/conversation`, otlp: `${ROOT}/items/${id}/otlp`, qaCases: `${ROOT}/qa/cases?workItem=${id}`, qaRuns: `${ROOT}/qa/runs?workItem=${id}`, cli: { record: `mw show ${id}`, trace: `mw trace ${id} --lens ax`, context: `mw context ${id}` } },
		currentHandoff, answer: { ...policy, reason: displayPreview(policy.reason, 240) }, conversation: selected, conversationTruncated: selected.length < history.length || selected.some((m) => m.truncated),
		next: actions, actionsTotal: actions.length, actionsOmitted: 0, truncated: false,
		observation: { owner: 'observer', authority: 'read-only', reason: actions.length ? 'Relay the operator decision; do not answer on their behalf.' : 'Read saved evidence; no automatic retry, repair or steering is authorized.', method: 'GET', href: `${ROOT}/items/${id}`, command: `mw context ${id}` },
	}

	const account = () => {
		context.actionsOmitted = context.actionsTotal - actions.length
		context.position.acceptedOmitted = context.position.acceptedTotal - context.position.accepted.length
		context.conversationTruncated ||= selected.length < history.length || selected.some(m => m.truncated)
		context.truncated ||= context.item.sourceTruncated || context.currentHandoff.truncated || context.conversationTruncated || context.actionsOmitted > 0 || context.position.acceptedOmitted > 0 || context.answer.reason !== policy.reason || context.item.title !== item.title || context.item.objective !== item.objective || context.item.workspace !== item.workspace || context.position.node !== item.job || context.position.accepted.some((v, i) => v !== item.flow?.accepted[i]) || actions.some(a => Array.from(a.reason).length >= 240)
	}
	account()
	while (Buffer.byteLength(JSON.stringify(context), 'utf8') > 24576) {
		context.truncated = true
		if (selected.length) selected.shift()
		else if (context.item.source) { context.item.source = displayPreview(context.item.source, Math.floor(Array.from(context.item.source).length / 2)); context.item.sourceTruncated = true }
		else if (actions.length) actions.pop()
		else if (context.position.accepted.length) context.position.accepted.pop()
		else break // The fixed envelope and separately bounded handoff fit without optional bodies.
		account()
	}
	return context
}

// Explicit schemas for this version only; the legacy routes and CLI keep their existing contracts.
type JsonSchema = Record<string, unknown>
const str = { type: 'string' }
const integer = { type: 'integer', minimum: 0 }
const bool = { type: 'boolean' }
const nullable = (schema: JsonSchema) => ({ anyOf: [schema, { type: 'null' }] })
const array = (items: JsonSchema) => ({ type: 'array', items })
const object = (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchema => ({ type: 'object', properties, required, additionalProperties: false })
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const textInput = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength, pattern: '\\S' })
const requestIdSchema = { type: 'string', pattern: '^[A-Za-z0-9_-]{16,128}$' }
const revisionSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' }
const arbitrary = { type: 'object', additionalProperties: true }
const sourceSchema = object({ item: integer, event: integer, at: str })
const answerReferenceSchema = object({ question: str, answerId: str, canonicalId: nullable(str), resolved: bool, by: str, job: nullable(str), source: nullable(sourceSchema), detail: str })
const fullHandoffInputSchema = object({ id: str, state: { enum: ['recorded-available', 'recorded-unavailable', 'not-checked', 'unknown'] }, currentAvailability: { const: 'unknown' }, declaration: nullable(arbitrary), observation: nullable(arbitrary), evidence: str })
const fullHandoffQuestionSchema = object({ id: str, text: str, textTruncated: bool, ownerRole: str, blockingRole: nullable(str), resolution: { enum: ['resolved', 'unresolved'] }, resolutions: array(answerReferenceSchema), resolutionsTotal: integer, resolutionsOmitted: integer })
const fullHandoffEntrySchema = object({ id: str, job: str, profile: str, duty: str, dutyTruncated: bool, kind: { enum: ['agent', 'command', 'group', 'engine'] }, mode: { enum: ['current', 'configured-next'] }, exchangeStatus: str, round: integer, questionIds: array(str), unresolvedCount: integer, expectedOutput: object({ state: { enum: ['configured', 'unspecified'] }, detail: str, pointer: str }), inputs: array(fullHandoffInputSchema), inputsTotal: integer, inputsOmitted: integer, declarationsKnown: bool, evidence: object({ detail: str, eventSeqs: array(integer) }), truncated: bool })
const compactQuestionSchema = object({ key: str, id: str, text: str, textTruncated: bool, ownerRole: str, blockingRole: nullable(str), truncated: bool })
const compactQuestionStateSchema = object({ key: str, resolution: { enum: ['resolved', 'unresolved'] }, resolutions: array(answerReferenceSchema), resolutionsTotal: integer, resolutionsOmitted: integer, truncated: bool })
const compactInputSchema = object({ key: str, id: str, state: { enum: ['recorded-available', 'recorded-unavailable', 'not-checked', 'unknown'] }, currentAvailability: { const: 'unknown' }, observation: nullable(object({ event: integer, item: nullable(integer), ok: bool, at: str, job: str, name: nullable(str), dir: nullable(str) })), evidence: str, truncated: bool })
const compactEntrySchema = object({ key: str, id: str, job: str, profile: str, duty: str, dutyTruncated: bool, kind: { enum: ['agent', 'command', 'group', 'engine'] }, mode: { enum: ['current', 'configured-next'] }, exchangeStatus: str, round: integer, questionStates: array(compactQuestionStateSchema), questionsTotal: integer, questionsOmitted: integer, unresolvedCount: integer, expectedOutput: object({ state: { enum: ['configured', 'unspecified'] }, detail: str, pointer: str }), inputs: array(compactInputSchema), inputsTotal: integer, inputsOmitted: integer, declarationsKnown: bool, evidence: object({ detail: str, eventSeqs: array(integer) }), truncated: bool })
const handoffSchema = object({ entries: array(compactEntrySchema), entriesTotal: integer, entriesOmitted: integer, questions: array(compactQuestionSchema), questionsTotal: integer, questionsOmitted: integer, evidence: object({ detail: str }), truncated: bool })
const messageSchema = object({ id: str, at: str, role: str, kind: str, text: str, event: nullable(integer), truncated: bool, actor: object({ role: str, job: nullable(str) }), references: array(answerReferenceSchema), referencesTotal: integer, referencesOmitted: integer, evidence: str }, ['id', 'at', 'role', 'kind', 'text', 'event'])
const eventDetailSchema = object({ event: object({ seq: integer, item: integer, at: str, kind: str, data: arbitrary }), references: array(answerReferenceSchema), messages: array(messageSchema) })
const answerDetailSchema = object({ requestedId: str, canonicalId: str, question: str, answer: str, by: str, job: str, source: nullable(sourceSchema) })
const handoffDetailSchema = object({ entry: fullHandoffEntrySchema, questions: array(fullHandoffQuestionSchema), declarations: array(object({ call: integer, scope: str, projectInputs: {} })), observations: array(arbitrary), outputSchema: nullable(arbitrary) })

const actionSchema = object({ owner: str, authority: str, reason: str, command: str, transport: str, method: str, href: str, inputs: { type: 'object', additionalProperties: true }, preconditions: object({ revision: revisionSchema, status: str, holdCode: nullable(str) }) }, ['owner', 'authority', 'reason', 'command', 'transport', 'inputs', 'preconditions'])
const attributesSchema = array(object({ key: str, value: { oneOf: [object({ stringValue: str }), object({ intValue: { type: 'string', pattern: '^-?[0-9]+$' } }), object({ doubleValue: { type: 'number' } })] } }))
export const API_SCHEMAS = {
	...QA_JSON_SCHEMAS,
	CurrentHandoff: handoffSchema,
	Evidence: { anyOf: [object({ apiVersion: { const: '1' }, item: integer, kind: { enum: ['event', 'answer', 'handoff', 'handoff-slot'] }, ref: str, available: { const: false }, data: { type: 'null' } }), ...(['event', 'answer', 'handoff', 'handoff-slot'] as const).map(kind => object({ apiVersion: { const: '1' }, item: integer, kind: { const: kind }, ref: str, available: { const: true }, data: kind === 'event' ? eventDetailSchema : kind === 'answer' ? answerDetailSchema : handoffDetailSchema }))] },
	Submit: object({ requestId: requestIdSchema, workspace: textInput(4096), title: textInput(300), objective: textInput(2000), source: textInput(TEXT_LIMIT), mode: { enum: ['discovery', 'delivery'] } }, ['requestId', 'workspace', 'objective', 'source']),
	Answer: object({ requestId: requestIdSchema, revision: revisionSchema, text: textInput(TEXT_LIMIT), cause: { enum: ['implementation', 'test', 'pre-existing'] } }, ['requestId', 'revision', 'text']),
	Start: object({ requestId: requestIdSchema, revision: revisionSchema }),
	Context: object({
		apiVersion: { const: '1' }, item: object({ id: integer, title: str, objective: str, source: str, sourceTruncated: bool, workspace: str }),
		position: object({ status: str, node: str, round: integer, loop: str, accepted: array(str), acceptedTotal: integer, acceptedOmitted: integer }), revision: revisionSchema,
		evidence: object({ event: integer, record: str, trace: str, conversation: str, otlp: str, qaCases: str, qaRuns: str, cli: object({ record: str, trace: str, context: str }) }), answer: object({ allowed: bool, causeRequired: bool, causes: array(str), reason: str }),
		currentHandoff: ref('CurrentHandoff'), conversation: array(messageSchema), conversationTruncated: bool, next: array(actionSchema), actionsTotal: integer, actionsOmitted: integer, truncated: bool, observation: object({ owner: str, authority: str, reason: str, method: str, href: str, command: str }),
	}),
	Conversation: object({ apiVersion: { const: '1' }, item: integer, revision: revisionSchema, messages: array(messageSchema), nextAfter: nullable(integer), hasMore: bool }),
	Accepted: object({ apiVersion: { const: '1' }, accepted: { const: true }, requestId: requestIdSchema, receipt: object({ item: integer, revision: revisionSchema, event: integer, replayed: bool }), context: nullable(ref('Context')), warnings: array(str) }),
	Problem: object({ type: str, title: str, status: integer, detail: str, instance: str, code: str, reason: str, context: { type: 'object', additionalProperties: true }, task: nullable(ref('Context')), next: array(object({ run: str, why: str })), recovery: object({ preserveDraft: { const: true }, retry: str }) }),
	Projects: object({ apiVersion: { const: '1' }, projects: array(object({ workspace: str, autonomy: str, pack: str })) }),
	Session: object({ apiVersion: { const: '1' }, csrfToken: str, header: { const: 'X-MW-CSRF' }, maxBodyBytes: integer }),
	Discovery: object({ apiVersion: { const: '1' }, openapi: str, session: str, projects: str, submit: str, qaCases: str, qaRuns: str, authority: str, telemetry: object({ format: str, exported: str, unavailable: array(str) }) }),
	Otlp: object({ resourceSpans: array(object({ resource: object({ attributes: attributesSchema }), scopeSpans: array(object({ scope: object({ name: str }), spans: array(object({ traceId: { type: 'string', pattern: '^[a-f0-9]{32}$' }, spanId: { type: 'string', pattern: '^[a-f0-9]{16}$' }, name: str, kind: { const: 1 }, startTimeUnixNano: { type: 'string', pattern: '^[0-9]+$' }, endTimeUnixNano: { type: 'string', pattern: '^[0-9]+$' }, attributes: attributesSchema, status: object({ code: { enum: [1, 2] } }) })) })) })) }),
}
const discovery = {
	apiVersion: '1', openapi: `${ROOT}/openapi.json`, session: `${ROOT}/session`, projects: `${ROOT}/projects`, submit: `${ROOT}/items`, qaCases: `${ROOT}/qa/cases`, qaRuns: `${ROOT}/qa/runs`, authority: 'Local single operator. Observing agents remain read-only; writes require explicit operator input.',
	telemetry: { format: 'OTLP/HTTP JSON ExportTraceServiceRequest', exported: 'Saved, finished invocation spans with bounded metadata; GET /api/v1/items/{id}/otlp. Millisecond source precision, deterministic IDs within the same store path, no invented parent spans.', unavailable: ['Running/lost/interrupted invocations stay on the legacy trace, not fabricated as finished spans.', 'No OTel SDK, collector delivery, logs/metrics export, raw bodies, tool events or model internals.', 'External transports may capture only dispatch/result and heartbeat without tool-by-tool streams.'] },
}
const response = (schema: JsonSchema, description = 'Success') => ({ description, content: { 'application/json': { schema } } })
const operation = (operationId: string, schema: JsonSchema, input?: string) => ({
	operationId, responses: { '200': response(schema), ...(input === 'Submit' ? { '201': response(schema, 'Created and durably accepted') } : {}), default: { description: 'RFC9457 problem; retain the draft. See reason, task and recovery.', content: { 'application/problem+json': { schema: ref('Problem') } } } },
	...(input ? { security: [{ csrf: [] }], parameters: [{ name: 'Origin', in: 'header', required: true, schema: str, description: 'An exact allowed UI origin. MW_UI_ORIGINS adds trusted proxy origins; forwarded headers are not trusted.' }], requestBody: { required: true, content: { 'application/json': { schema: ref(input) } } } } : {}),
})
const qaOperation = (id: string, output: string, input?: string, query?: keyof typeof QA_JSON_SCHEMAS, path: string[] = []) => {
	const base = operation(id, ref(output), input)
	const properties = query ? QA_JSON_SCHEMAS[query].properties as Record<string, JsonSchema> : {}
	const problem = { description: 'RFC9457 QA problem; keep the exact draft. A saved stale_revision includes conflictEvent and a refresh command; link_exists includes existingEvent. Invalid retests return invalid_retest; missing work targets retain item_not_found. Storage failures are storage_failed or store_busy.', content: { 'application/problem+json': { schema: ref('Problem') } } }
	return { ...base,
		parameters: [...(base.parameters ?? []), ...path.map((name) => ({ name, in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } })), ...Object.entries(properties).map(([name, schema]) => ({ name, in: 'query', required: false, schema, description: query === 'QaExportQuery' ? 'Unknown/repeated parameters are refused. selection defaults to all; follow-ups selects current manual failed/needs-refinement only. format defaults to json; markdown is a string inside the JSON response, never text/plain or a file.' : 'Unknown/repeated parameters are refused. Lists are ascending by ID; after defaults to 0, limit to 50 (maximum 100).' }))],
		responses: { ...base.responses, ...(['qaCreateCase', 'qaStartRun'].includes(id) ? { '201': response(ref(output), 'Created; replays return 200') } : {}), '400': problem, '403': problem, '404': problem, '405': problem, '408': problem, '409': problem, '413': problem, '415': problem, '500': problem, '503': problem },
	}
}
export const OPENAPI = {
	openapi: '3.1.1', info: { title: 'Made Well operator and agent context API', version: '1', description: 'Additive contract only; legacy /api routes are not described by this document. CSRF is not multi-tenant authentication. Never expose the local UI to untrusted users.' },
	paths: {
		[ROOT]: { get: operation('discoverApi', ref('Discovery')) },
		[`${ROOT}/openapi.json`]: { get: operation('readOpenApi', { type: 'object', description: 'OpenAPI 3.1.1 document', required: ['openapi', 'info', 'paths', 'components'] }) },
		[`${ROOT}/session`]: { get: operation('readSession', ref('Session')) },
		[`${ROOT}/projects`]: { get: operation('listProjects', ref('Projects')) },
		[`${ROOT}/items`]: { post: operation('submitWork', ref('Accepted'), 'Submit') },
		[`${ROOT}/items/{id}`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], get: operation('readContext', ref('Context')) },
		[`${ROOT}/items/{id}/answers`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], post: operation('answerWork', ref('Accepted'), 'Answer') },
		[`${ROOT}/items/{id}/start`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], post: operation('startSelectedTask', ref('Accepted'), 'Start') },
		[`${ROOT}/items/{id}/conversation`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], get: { ...operation('readConversation', ref('Conversation')), parameters: [{ name: 'after', in: 'query', schema: integer, description: 'Last seen event seq; absent starts with source. Pages contain up to 50 messages.' }] } },
		[`${ROOT}/items/{id}/evidence`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], get: { ...operation('readEvidence', ref('Evidence')), parameters: [{ name: 'kind', in: 'query', required: true, schema: { enum: ['event', 'answer', 'handoff', 'handoff-slot'] } }, { name: 'ref', in: 'query', required: true, schema: str, description: 'Exact event sequence, sequence:index answer identity, configured job, or handoff-slot zero-based slot:SHA-256 digest of the complete current handoff JSON. A changed slot/digest is unavailable. Unknown/repeated selectors are refused; unavailable saved targets return available:false.' }] } },
		[`${ROOT}/items/{id}/otlp`]: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }], get: operation('exportOtlp', ref('Otlp')) },
		[`${ROOT}/qa/cases`]: { get: qaOperation('qaCases', 'QaCaseList', undefined, 'QaCasesQuery'), post: qaOperation('qaCreateCase', 'QaAccepted', 'QaCreateCaseInput') },
		[`${ROOT}/qa/cases/{caseId}`]: { get: qaOperation('qaCase', 'QaCaseDetail', undefined, 'QaCaseQuery', ['caseId']) },
		[`${ROOT}/qa/cases/{caseId}/revisions`]: { post: qaOperation('qaReviseCase', 'QaAccepted', 'QaReviseCaseInput', undefined, ['caseId']) },
		[`${ROOT}/qa/runs`]: { get: qaOperation('qaRuns', 'QaRunList', undefined, 'QaRunsQuery'), post: qaOperation('qaStartRun', 'QaAccepted', 'QaStartRunInput') },
		[`${ROOT}/qa/runs/{runId}`]: { get: qaOperation('qaRun', 'QaRunDetail', undefined, undefined, ['runId']) },
		[`${ROOT}/qa/runs/{runId}/export`]: { get: qaOperation('qaExport', 'QaExportResult', undefined, 'QaExportQuery', ['runId']) },
		[`${ROOT}/qa/runs/{runId}/observations`]: { get: qaOperation('qaObservations', 'QaObservationList', undefined, 'QaObservationsQuery', ['runId']) },
		[`${ROOT}/qa/runs/{runId}/cases/{caseId}/observations`]: { post: qaOperation('qaObserve', 'QaAccepted', 'QaObserveInput', undefined, ['runId', 'caseId']) },
		[`${ROOT}/qa/runs/{runId}/cases/{caseId}/verdicts`]: { post: qaOperation('qaVerdict', 'QaAccepted', 'QaVerdictInput', undefined, ['runId', 'caseId']) },
		[`${ROOT}/qa/runs/{runId}/cases/{caseId}/links`]: { post: qaOperation('qaLink', 'QaAccepted', 'QaLinkInput', undefined, ['runId', 'caseId']) },
	}, components: { schemas: API_SCHEMAS, securitySchemes: { csrf: { type: 'apiKey', in: 'header', name: 'X-MW-CSRF', description: 'Read /api/v1/session from the same origin. Token rotates on server restart; it is CSRF protection, not user authentication.' } } },
}

const validateBody = (value: unknown, kind: 'Submit' | 'Answer' | 'Start'): Record<string, string> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'invalid_body', 'The JSON body must be an object.')
	const body = value as Record<string, unknown>
	const schema = API_SCHEMAS[kind] as { properties: Record<string, { maxLength?: number; pattern?: string; enum?: string[] }>; required: string[] }
	for (const key of Object.keys(body)) if (!Object.hasOwn(schema.properties, key)) throw fail(400, 'invalid_body', `Unknown field: ${key}.`, { field: key })
	for (const [key, field] of Object.entries(schema.properties)) {
		const v = body[key]
		if (v === undefined && !schema.required.includes(key)) continue
		if (typeof v !== 'string' || !v.trim() || (field.maxLength && [...v].length > field.maxLength) || (field.pattern && !new RegExp(field.pattern).test(v)) || (field.enum && !field.enum.includes(v))) throw fail(400, 'invalid_body', `Invalid ${key}; see its schema in ${ROOT}/openapi.json.`, { field: key })
	}
	return body as Record<string, string>
}

const readBody = (req: IncomingMessage) => new Promise<unknown>((resolve, reject) => {
	let size = 0
	const chunks: Buffer[] = []
	const timer = setTimeout(() => finish(fail(408, 'body_timeout', 'Request body did not arrive within 10 seconds.')), 10_000)
	const finish = (error?: MadeWellError, value?: unknown) => {
		clearTimeout(timer)
		req.off('data', data); req.off('end', end); req.off('error', broken); req.off('aborted', broken)
		if (error) { req.resume(); reject(error) } else resolve(value)
	}
	const broken = () => finish(fail(400, 'body_interrupted', 'Request body was interrupted; retry the same request ID and exact input.'))
	const data = (chunk: Buffer) => {
		size += chunk.length
		if (size > BODY_LIMIT) return finish(fail(413, 'body_too_large', `JSON body exceeds ${BODY_LIMIT} bytes.`))
		chunks.push(chunk)
	}
	const end = () => {
		try { finish(undefined, JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))) }
		catch { finish(fail(400, 'invalid_json', 'Expected valid UTF-8 JSON.')) }
	}
	req.on('data', data); req.once('end', end); req.once('error', broken); req.once('aborted', broken)
})

export interface ApiOptions {
	path: string
	open: (create?: boolean) => Store['Service'] | undefined
	/** The CLI's existing wake owner; called only after commit, also on an accepted retry. */
	wake?: (store: Store['Service'], id: number) => Promise<unknown>
	/** Exact external UI origins trusted by the local operator; never infer trust from forwarded headers. */
	origins?: readonly string[]
}

export const createApi = (options: ApiOptions) => {
	const token = randomBytes(32).toString('hex')
	const configured = options.origins ?? (process.env.MW_UI_ORIGINS ?? '').split(',').filter(Boolean)
	const send = (res: ServerResponse, body: unknown, status = 200, problem = false) => {
		res.writeHead(status, { 'content-type': problem ? 'application/problem+json' : 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' })
		res.end(JSON.stringify(body))
	}
	const security = (req: IncomingMessage, write: boolean) => {
		const port = req.socket.localPort!
		const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`, ...configured]
		const hosts = origins.map((origin) => { try { return new URL(origin).host } catch { return '' } })
		if (!req.headers.host || !hosts.includes(req.headers.host) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(req.headers['sec-fetch-site'])))) throw fail(403, 'origin_forbidden', 'This is a local single-operator API. Use the UI origin, or configure its exact trusted proxy origin in MW_UI_ORIGINS.')
		const origin = req.headers.origin
		if ((write || origin) && (typeof origin !== 'string' || !origins.includes(origin))) throw fail(403, 'origin_forbidden', 'Origin must exactly match a trusted UI origin.')
		if (write) {
			const supplied = req.headers['x-mw-csrf']
			if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) throw fail(403, 'csrf_required', 'Refresh /api/v1/session, retain the draft and resend the same request ID with X-MW-CSRF.')
			if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '') || req.headers['content-encoding']) throw fail(415, 'content_type', 'Use application/json UTF-8 with no Content-Encoding.')
			if (Number(req.headers['content-length'] ?? 0) > BODY_LIMIT) throw fail(413, 'body_too_large', `JSON body exceeds ${BODY_LIMIT} bytes.`)
		}
	}
	return async (req: IncomingMessage, res: ServerResponse) => {
		let target: number | undefined
		let authorized = false
		try {
			const url = new URL(req.url ?? ROOT, 'http://console')
			if (url.pathname === `${ROOT}/qa` || url.pathname.startsWith(`${ROOT}/qa/`)) {
				// QA has its own domain IDs. Never use them as Item IDs or call the work wake owner.
				security(req, false)
				const collection = /^\/api\/v1\/qa\/(cases|runs)$/.exec(url.pathname)
				const caseRoute = /^\/api\/v1\/qa\/cases\/([^/]+)(?:\/(revisions))?$/.exec(url.pathname)
				const runRoute = /^\/api\/v1\/qa\/runs\/([^/]+)(?:\/(observations|export)|\/cases\/([^/]+)\/(observations|verdicts|links))?$/.exec(url.pathname)
				if (!collection && !caseRoute && !runRoute) throw fail(404, 'route_not_found', 'No QA operation matches this path.')
				const allowed = collection ? ['GET', 'POST'] : caseRoute?.[2] || runRoute?.[4] ? ['POST'] : ['GET']
				if (!allowed.includes(req.method ?? '')) { res.setHeader('Allow', allowed.join(', ')); throw fail(405, 'method_not_allowed', `Use ${allowed.join(' or ')} for this resource.`) }
				const writing = req.method === 'POST'
				if (writing) security(req, true)
				authorized = true
				const numeric = (value: string, key: string, zero = false) => {
					if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < (zero ? 0 : 1)) throw qaError(400, 'invalid_input', { field: key })
					return Number(value)
				}
				const caseId = caseRoute ? numeric(caseRoute[1]!, 'caseId') : runRoute?.[3] ? numeric(runRoute[3], 'caseId') : undefined
				const runId = runRoute ? numeric(runRoute[1]!, 'runId') : undefined
				const keys = writing ? [] : collection?.[1] === 'cases' ? ['workspace', 'workItem', 'q', 'area', 'after', 'limit'] : collection?.[1] === 'runs' ? ['workspace', 'workItem', 'caseId', 'after', 'limit'] : caseRoute ? ['revision'] : runRoute?.[2] === 'export' ? ['selection', 'format'] : runRoute?.[2] ? ['caseId', 'after', 'limit'] : []
				const query: Record<string, string | number> = {}
				for (const [key, value] of url.searchParams) {
					if (!keys.includes(key) || Object.hasOwn(query, key)) throw qaError(400, 'invalid_input', { field: key, reason: 'unknown_or_repeated_parameter' })
					query[key] = ['workItem', 'caseId', 'after', 'limit', 'revision'].includes(key) ? numeric(value, key, key === 'after') : value
				}
				const body = writing ? await readBody(req) : undefined
				let effect: Effect.Effect<unknown, MadeWellError, Store>
				if (collection?.[1] === 'cases') effect = writing ? qaCreateCase(body) : qaCases(query)
				else if (collection?.[1] === 'runs') effect = writing ? qaStartRun(body) : qaRuns(query)
				else if (caseRoute) effect = writing ? qaReviseCase(caseId!, body) : qaCase(caseId!, query)
				else if (runRoute?.[4]) effect = runRoute[4] === 'links' ? qaLink(runId!, caseId!, body) : runRoute[4] === 'verdicts' ? qaVerdict(runId!, caseId!, body) : qaObserve(runId!, caseId!, body)
				else if (runRoute?.[2] === 'export') effect = qaExport(runId!, query)
				else effect = runRoute?.[2] ? qaObservations(runId!, query) : qaRun(runId!)
				const existing = options.open()
				// No disk is initialized by QA, including rejected writes with missing anchors.
				const store = existing ?? openStore(':memory:')
				try {
					const result = await Effect.runPromise(effect.pipe(Effect.provideService(Store, store), Effect.match({ onFailure: (error) => ({ ok: false as const, error }), onSuccess: (value) => ({ ok: true as const, value }) })))
					if (!result.ok) throw result.error
					const value = result.value as { receipt?: { replayed: boolean } }
					return send(res, result.value, writing && collection && !value.receipt?.replayed ? 201 : 200)
				} finally { if (!existing) store.close() }
			}
			const match = /^\/api\/v1\/items\/([1-9]\d*)(?:\/(answers|start|conversation|otlp|evidence))?$/.exec(url.pathname)
			target = match ? Number(match[1]) : undefined
			if (target !== undefined && !Number.isSafeInteger(target)) throw fail(400, 'invalid_id', 'Item ID must be a positive safe integer.')
			const write = url.pathname === `${ROOT}/items` || match?.[2] === 'answers' || match?.[2] === 'start'
			security(req, false)
			if (req.method !== (write ? 'POST' : 'GET')) { res.setHeader('Allow', write ? 'POST' : 'GET'); throw fail(405, 'method_not_allowed', `Use ${write ? 'POST' : 'GET'} for this resource.`) }
			if (write) security(req, true)
			authorized = true
			if (url.pathname === ROOT) return send(res, discovery)
			if (url.pathname === `${ROOT}/openapi.json`) return send(res, OPENAPI)
			if (url.pathname === `${ROOT}/session`) return send(res, { apiVersion: '1', csrfToken: token, header: 'X-MW-CSRF', maxBodyBytes: BODY_LIMIT })
			if (url.pathname === `${ROOT}/projects`) return send(res, { apiVersion: '1', projects: sync(readProjects(projectsPath(options.path))).map((p) => ({ workspace: p.path, autonomy: p.autonomy ?? DEFAULT_AUTONOMY, pack: p.cartridges ?? 'default' })) })
			if (write) {
				const bodyKind = target === undefined ? 'Submit' : match?.[2] === 'start' ? 'Start' : 'Answer'
				const body = validateBody(await readBody(req), bodyKind)
				// Fingerprint explicit schema fields in fixed order; JSON key order is not request identity.
				const fingerprint = hash(JSON.stringify([url.pathname, ...Object.keys((API_SCHEMAS[bodyKind] as { properties: object }).properties).map((key) => [key, body[key] ?? null])]))
				const registered = () => {
					const projects = sync(readProjects(projectsPath(options.path)))
					const project = projects.find((p) => p.path === body.workspace)
					if (!project) throw new MadeWellError({ code: 'project_not_found', message: 'Select an exactly registered workspace.', context: { workspace: body.workspace!, projects: projects.map((p) => p.path) }, next: [{ run: 'mw init', why: 'register the project locally before submitting browser work' }] })
					return project
				}
				// Reject bad submissions before creating a database. Existing receipts are independent of registry changes.
				if (target === undefined && !options.open()) registered()
				const store = options.open(target === undefined)
				if (!store) found(undefined, target!)
				const receipt = store!.operatorRequest(body.requestId!, fingerprint, () => {
					let item: Item
					if (target === undefined) {
						const project = registered()
						const pack = project.cartridges ? sync(loadPack(project.cartridges)) : undefined
						const discovery = body.mode === 'discovery'
						item = store!.create({ title: body.title ?? body.objective!, objective: body.objective!, source: body.source!, workspace: project.path, autonomy: project.autonomy ?? DEFAULT_AUTONOMY, ...(pack ? { pack } : {}), ...(discovery ? { job: laneOf(pack).discovery[0]?.job ?? '', ...(pack?.runtime === 'functions' ? { flow: { loop: 'discovery', accepted: [] } } : {}) } : {}) })
					} else {
						item = found(store, target)
						if (revisionOf(item) !== body.revision) throw fail(409, 'stale_revision', 'The saved task changed. Refresh its context and review the question before sending a new request; your draft is not discarded.', { id: target, expected: body.revision, actual: revisionOf(item) })
						if (bodyKind === 'Start') {
							if (item.status !== 'candidate' || item.discovery === undefined) throw fail(409, 'not_a_candidate', 'Only a proposed discovery task can be selected here.', { id: target, status: item.status })
							sync(promote(item.discovery, [item.id]).pipe(Effect.provideService(Store, store!)))
							item = found(store, target)
						} else {
						const policy = answerPolicy(item)
						if (body.cause && !policy.causes.includes(body.cause)) throw fail(400, 'invalid_cause', 'This hold does not accept that cause.', { allowed: policy.causes })
						sync(answer(target, body.text!, body.cause as 'implementation' | 'test' | 'pre-existing' | undefined).pipe(Effect.provideService(Store, store!)))
						item = found(store, target)
						if (revisionOf(item) === body.revision) throw fail(409, 'answer_not_applied', 'The engine treated this text as an earlier answer, not a new transition. Inspect the current hold; no new message was accepted.', { id: target })
						}
					}
					store!.note(item.id, 'operator-message', { requestId: body.requestId, kind: target === undefined ? 'submission' : bodyKind === 'Start' ? 'selection' : 'answer', inputEvent: store!.events(item.id).at(-1)!.seq, ...(body.revision ? { expectedRevision: body.revision } : {}) })
					return { item: item.id, revision: revisionOf(item), event: store!.events(item.id).at(-1)!.seq }
				})
				const warnings: string[] = []
				try { if (options.wake && store!.get(receipt.item)) await options.wake(store!, receipt.item) }
				catch { warnings.push('Input is durably accepted, but runner wake failed. Retry this same request ID/input or inspect mw status; do not submit a duplicate.') }
				return send(res, { apiVersion: '1', accepted: true, requestId: body.requestId, receipt, context: store!.get(receipt.item) ? contextOf(store!, receipt.item) : null, warnings }, target === undefined && !receipt.replayed ? 201 : 200)
			}
			if (match) {
				const store = options.open()
				const item = found(store, target!)
				if (match[2] === 'evidence') {
					const params = url.searchParams, kind = params.get('kind'), ref = params.get('ref')
					if ([...params.keys()].some(k => !['kind', 'ref'].includes(k)) || params.getAll('kind').length !== 1 || params.getAll('ref').length !== 1 || !['event', 'answer', 'handoff', 'handoff-slot'].includes(kind ?? '') || !ref || kind === 'event' && (!/^[1-9]\d*$/.test(ref) || !Number.isSafeInteger(Number(ref))) || kind === 'answer' && (!/^[1-9]\d*:(0|[1-9]\d*)$/.test(ref) || ref.split(':').some(n => !Number.isSafeInteger(Number(n)))) || kind === 'handoff' && !/^[a-z0-9][a-z0-9-]*$/.test(ref) || kind === 'handoff-slot' && (!/^(0|[1-9]\d*):[a-f0-9]{64}$/.test(ref) || !Number.isSafeInteger(Number(ref.split(':')[0])))) throw fail(400, 'invalid_selector', 'Provide exactly one valid kind and ref; unknown or repeated parameters are refused.')
					const data = evidenceDetailOf(store!, item, kind as 'event' | 'answer' | 'handoff' | 'handoff-slot', ref)
					if (kind === 'event' && data && 'event' in data) Object.assign(data, { messages: messagesOf(item, [data.event], store!, true).filter(m => m.kind !== 'source') })
					return send(res, { apiVersion: '1', item: item.id, kind, ref, available: data !== null, data })
				}
				if (match[2] === 'otlp') return send(res, otlpOf(store!, item.id))
				if (match[2] === 'conversation') {
					const after = url.searchParams.has('after') ? Number(url.searchParams.get('after')) : -1
					if (!Number.isSafeInteger(after) || after < -1) throw fail(400, 'invalid_cursor', 'after must be an event sequence number.')
					const messages = messagesOf(item, store!.events(item.id), store!, true).filter((m) => after < 0 || (m.event ?? 0) > after)
					const page = messages.slice(0, 50)
					return send(res, { apiVersion: '1', item: item.id, revision: revisionOf(item), messages: page, nextAfter: page.at(-1)?.event ?? null, hasMore: messages.length > page.length })
				}
				return send(res, contextOf(store!, item.id))
			}
			throw fail(404, 'route_not_found', 'No versioned API operation matches this path.')
		} catch (cause) {
			const error = cause instanceof MadeWellError ? cause : fail(500, 'internal_error', 'The request could not be completed. Retain the draft and retry the same request ID; inspect the saved state before making a new request.')
			const details = error.context as { status?: number; reason?: string }
			const status = error.code === 'api_request' || error.code === 'qa_request' ? details.status! : error.code === 'item_not_found' ? 404 : ['not_held', 'not_answerable', 'cause_required'].includes(error.code) ? 409 : 400
			let task: ReturnType<typeof contextOf> | null = null
			try { const store = authorized ? options.open() : undefined; if (target && store?.get(target)) task = contextOf(store, target) } catch {}
			send(res, { type: `urn:madewell:problem:${details.reason ?? error.code}`, title: error.code === 'api_request' ? details.reason! : ERRORS[error.code].means, status, detail: error.message, instance: `urn:uuid:${randomUUID()}`, code: error.code, reason: details.reason ?? error.code, context: error.context, task, next: error.next, recovery: { preserveDraft: true, retry: 'For an uncertain outcome resend the same request ID and exact input. For stale state, refresh and review before creating a new request.' } }, status, true)
		}
	}
}
