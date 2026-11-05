// Explicit operator context, projected from the existing item events. Historical prose is never a grant.
import { createHash } from 'node:crypto'
import { Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { isMaker, laneOf } from './lane.ts'
import type { Event, Item, Store } from './store.ts'

const nonblank = (max: number) => Schema.String.check(Schema.isMaxLength(max), Schema.makeFilter((value) => !!value.trim(), { toJsonSchema: () => [{}, true] }))
const positive = Schema.Int.check(Schema.isGreaterThan(0))
const key = nonblank(120).check(Schema.makeFilter((value) => /^[a-z][a-z0-9._-]*$/.test(value), { toJsonSchema: () => [{ pattern: '^[a-z][a-z0-9._-]*$' }, true] }))
const actor = Schema.Union([
	Schema.Struct({ kind: Schema.Literal('operator'), label: nonblank(300) }),
	Schema.Struct({ kind: Schema.Literal('agent'), label: nonblank(300), authority: nonblank(4000) }),
])
const source = Schema.Struct({ reference: nonblank(4000), event: Schema.optionalKey(positive) })
const jobs = Schema.Array(nonblank(120)).check(Schema.isMinLength(1), Schema.isMaxLength(100), Schema.makeFilter((value) => new Set(value).size === value.length, { toJsonSchema: () => [{}, true] }))
const expiresAt = Schema.optionalKey(nonblank(100).check(Schema.makeFilter((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), { toJsonSchema: () => [{ format: 'date-time' }, true] })))
const common = { requestId: nonblank(200), key, enteredBy: actor, source, nonsecret: Schema.Literal(true) }
const value = { text: nonblank(16000), jobs, scope: Schema.Literals(['item', 'descendants']), expiresAt }

/** Trusted-local operator declaration, not authentication. Context is deliberately not a secret store. */
export const ContextFactCommand = Schema.Union([
	Schema.Struct({ ...common, operation: Schema.Literal('set'), revision: Schema.Literal(0), ...value }),
	Schema.Struct({ ...common, operation: Schema.Literal('update'), revision: positive, ...value }),
	Schema.Struct({ ...common, operation: Schema.Literal('revoke'), revision: positive, reason: nonblank(4000) }),
])
export type ContextFactCommand = typeof ContextFactCommand.Type

const StoredFact = Schema.Struct({
	key, revision: positive, ...value, enteredBy: actor, source,
	item: positive, workspace: Schema.optionalKey(Schema.String), sourceJob: Schema.optionalKey(nonblank(120)),
	status: Schema.Literals(['active', 'revoked']), previousEvent: Schema.optionalKey(positive),
	revocation: Schema.optionalKey(Schema.Struct({ enteredBy: actor, source, reason: nonblank(4000) })),
})
type StoredFact = typeof StoredFact.Type
export type ContextFact = StoredFact & { readonly event: number; readonly at: string }
export type PacketContextFact = Omit<ContextFact, 'text' | 'status'> & { readonly status: 'active' | 'revoked' | 'expired'; readonly text?: string }
type FactStore = Pick<Store['Service'], 'get' | 'events'>

const failure = (id: number, status: number, reason: string, facts: Record<string, unknown> = {}) => new MadeWellError({
	code: 'api_request', message: `Standing context refused: ${reason}. Inspect the current facts before submitting an explicit change.`,
	context: { status, reason, facts: { item: id, ...facts } }, next: [{ run: `mw context-fact ${id}`, why: 'read the current keys, revisions and provenance; use a new request ID for changed input' }],
})

export const decodeContextFactCommand = (input: unknown, id: number): ContextFactCommand => {
	try { return Schema.decodeUnknownSync(ContextFactCommand)(input, { onExcessProperty: 'error' }) }
	catch { throw failure(id, 400, 'invalid_context_fact') }
}

/** Only the versioned fact event is interpreted. Rulings and NQ prose stay exactly as recorded. */
export function contextFactRecords(store: FactStore, id: number, events: readonly Event[] = store.events(id)): ContextFact[] {
	const latest = new Map<string, ContextFact>()
	const bySequence = new Map(events.map(event => [event.seq, event]))
	for (const event of events) {
		if (event.kind !== 'context-fact' || event.data.version !== 1) continue
		try {
			const fact = Schema.decodeUnknownSync(StoredFact)(event.data.fact, { onExcessProperty: 'error' })
			if (fact.item === id) {
				const origin = sourceJobOf(event, bySequence)
				latest.set(fact.key, { ...fact, ...(origin ? { sourceJob: origin } : {}), event: event.seq, at: event.at })
			}
		} catch { /* Unknown or malformed evidence is not silently promoted to context. */ }
	}
	return [...latest.values()]
}

// Null means retained lineage is unavailable or combines private makers: grant neither maker access.
const opposing = (sourceJob: string | null | undefined, reader: string) => isMaker(reader) && (sourceJob === null || isMaker(sourceJob ?? '') && reader !== sourceJob)
const sourceJobOf = (event: Event | undefined, events: ReadonlyMap<number, Event>): string | null | undefined => {
	const pending = event ? [event] : [], visited = new Set<number>(), makers = new Set<string>()
	let job: string | undefined, unavailable = false
	const retain = (origin: string | undefined) => { if (origin) { job ??= origin; if (isMaker(origin)) makers.add(origin) } }
	while (pending.length) {
		const current = pending.pop()!
		if (visited.has(current.seq)) continue
		visited.add(current.seq)
		if (current.kind === 'artifact-saved' && (current.data.role === 'implement' || current.data.role === 'test-plan')) retain(current.data.role)
		if (typeof current.data.job === 'string') retain(current.data.job)
		if (current.kind === 'context-fact' && current.data.version === 1) {
			try {
				const fact = Schema.decodeUnknownSync(StoredFact)(current.data.fact)
				if (fact.item !== current.item) { unavailable = true; continue }
				retain(fact.sourceJob)
				for (const ref of [fact.source.event, fact.previousEvent, fact.revocation?.source.event]) if (ref !== undefined) {
					const source = ref < current.seq ? events.get(ref) : undefined
					if (source) pending.push(source)
					else unavailable = true
				}
			} catch { unavailable = true }
		} else if (typeof current.data.job !== 'string' && !(current.kind === 'artifact-saved' && (current.data.role === 'implement' || current.data.role === 'test-plan'))) unavailable = true
	}
	return unavailable || makers.size > 1 ? null : makers.values().next().value ?? job
}

/** Nearest explicit scope wins by key, including revocation/expiry. Unrelated work and private tracks are excluded. */
export function contextFactsFor(store: FactStore, item: Item, job: string, now: number, receiver = job): PacketContextFact[] {
	const ancestors = new Map<number, { item: Item; distance: number }>([[item.id, { item, distance: 0 }]])
	for (const current of ancestors.values()) {
		for (const id of [current.item.discovery, current.item.parent]) {
			if (id === undefined || ancestors.has(id)) continue
			const parent = store.get(id)
			if (parent) ancestors.set(id, { item: parent, distance: current.distance + 1 })
		}
	}
	const selected = new Map<string, { fact: ContextFact; distance: number }>()
	const origins = new Map<number, string | null | undefined>()
	for (const owner of ancestors.values()) {
		const history = store.events(owner.item.id), events = new Map(history.map(event => [event.seq, event]))
		for (const fact of contextFactRecords(store, owner.item.id, history)) {
			origins.set(fact.event, sourceJobOf(events.get(fact.event), events))
			if (owner.distance > 0 && fact.scope !== 'descendants') continue
			const prior = selected.get(fact.key)
			if (!prior || owner.distance < prior.distance || (owner.distance === prior.distance && fact.event > prior.fact.event)) selected.set(fact.key, { fact, distance: owner.distance })
		}
	}
	return [...selected.values()].map(({ fact }) => fact)
		.filter((fact)=>{const steps=[...laneOf(item.pack).discovery,...laneOf(item.pack).delivery],origin=steps.find(s=>s.job===fact.sourceJob)?.track,target=steps.find(s=>s.job===job)?.track;return !origin||origin==='main'||origin===target})
		.filter((fact) => fact.jobs.includes(job) && fact.jobs.includes(receiver) && !opposing(origins.get(fact.event), job) && !opposing(origins.get(fact.event), receiver))
		.map((fact) => {
			const status = fact.status === 'revoked' ? 'revoked' : fact.expiresAt !== undefined && Date.parse(fact.expiresAt) <= now ? 'expired' : 'active'
			if (status === 'active') return { ...fact, status }
			// A tombstone explicitly supersedes the former grant without re-supplying its text.
			const { text: _text, ...tombstone } = fact
			return { ...tombstone, status }
		})
}

/** CAS, event and retry receipt share the Store's existing synchronous transaction. */
export function changeContextFact(store: Store['Service'], id: number, input: ContextFactCommand) {
	const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
		? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)])) : value
	const fingerprint = createHash('sha256').update(JSON.stringify(canonical({ item: id, input }))).digest('hex')
	const receipt = store.operatorRequest(`context-fact:${input.requestId}`, fingerprint, () => {
		const item = store.get(id)
		if (!item) throw new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'select an existing work item' }] })
		const previous = contextFactRecords(store, id).find((fact) => fact.key === input.key)
		if (input.revision !== (previous?.revision ?? 0)) throw failure(id, 409, 'context_fact_revision', { key: input.key, expected: input.revision, actual: previous?.revision ?? 0 })
		if (!Number.isSafeInteger(input.revision + 1)) throw failure(id, 400, 'context_fact_revision_exhausted')
		const events = new Map(store.events(id).map(event => [event.seq, event]))
		const evidence = input.source.event === undefined ? undefined : events.get(input.source.event)
		if (input.source.event !== undefined && !evidence) throw failure(id, 400, 'context_fact_source_missing', { event: input.source.event })
		const incomingJob = sourceJobOf(evidence, events)
		const previousJob = previous ? sourceJobOf(events.get(previous.event), events) : undefined
		// A new citation cannot erase the private origin of an existing key.
		const sourceJob = isMaker(previous?.sourceJob ?? '') ? previous!.sourceJob : incomingJob ?? previous?.sourceJob
		const crossesMaker = (job: string) => opposing(previousJob, job) || opposing(sourceJob, job) || opposing(incomingJob, job)
		let fact: StoredFact
		if (input.operation === 'revoke') {
			if (!previous) throw failure(id, 409, 'context_fact_missing', { key: input.key })
			if (previous.jobs.some(crossesMaker)) throw failure(id, 400, 'context_fact_maker_isolation')
			const { event: _event, at: _at, ...value } = previous
			fact = { ...value, revision: input.revision + 1, previousEvent: previous.event, status: 'revoked', revocation: { enteredBy: input.enteredBy, source: input.source, reason: input.reason } }
		} else {
			const lane = laneOf(item.pack)
			const known = new Set([...lane.discovery, ...lane.delivery, lane.arbiter].filter((step) => step !== undefined).map((step) => step.job))
			if (input.jobs.some((job) => !known.has(job))) throw failure(id, 400, 'context_fact_unknown_job', { jobs: input.jobs.filter((job) => !known.has(job)) })
			if (input.jobs.some(crossesMaker)) throw failure(id, 400, 'context_fact_maker_isolation')
			fact = {
				key: input.key, revision: input.revision + 1, text: input.text, jobs: input.jobs, scope: input.scope,
				enteredBy: input.enteredBy, source: input.source, item: id, status: 'active',
				...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
				...(sourceJob === undefined ? {} : { sourceJob }), ...(previous ? { previousEvent: previous.event } : {}),
			}
		}
		store.note(id, 'context-fact', { version: 1, operation: input.operation, requestId: input.requestId, nonsecret: input.nonsecret, fact })
		return { item: id, revision: String(fact.revision), event: store.events(id).at(-1)!.seq }
	})
	return { ...receipt, key: input.key, revision: Number(receipt.revision) }
}
