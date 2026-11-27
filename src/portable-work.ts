// Host-driven method continuity in the existing ledger. No performer is invoked here.
import { randomUUID } from 'node:crypto'
import { Clock, Context, Effect, Layer } from 'effect'
import { z } from 'zod'
import { inspectComposition, type CompositionInspection, type ResolvedComponent } from './composition.ts'
import { discoveryContributionShape, validateDiscoveryContribution, type AcceptedDiscovery, type DiscoveryJob } from './discovery-contract.ts'
import { MadeWellError, errorJson } from './errors.ts'
import { revisionOf } from './legacy.ts'
import { conditionHashOf, quiescent } from './ledger.ts'
import { assertWritable } from './migration.ts'
import { defaultSettings } from './settings.ts'
import { readSkillFile, validateGrantedRoot, type SkillPackage } from './skill-package.ts'
import { Store, type Item } from './store.ts'
import { BrainstormActor } from './brainstorm.ts'
import { brainstormSeedRoot } from './brainstorm-seed.ts'

const text = z.string().refine(s => !!s.trim() && !s.includes('\0'), 'Nonblank text without NUL is required.')
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const revision = z.string().regex(/^[a-f0-9]{64}$/)
const target = { itemId: id }
const mutation = { ...target, requestId: text, revision, actor: BrainstormActor }
const selection = { config: text.optional(), override: text.optional() }
export const CapturePortableInput = z.object({ requestId: text, actor: BrainstormActor, source: text, title: text.optional(), objective: text.optional(), component: text, ...selection }).strict()
export const InspectPortableInput = z.object(target).strict()
export const PreparePortableInput = z.object({ ...mutation, context: z.string().refine(s => !s.includes('\0')).optional(), outputLength: text.optional(), effort: z.enum(['light', 'focused', 'deep']).optional() }).strict()
export const PortableResult = z.object({ artifact: text, sources: z.array(text), decisions: z.array(text), unknowns: z.array(text), contribution: z.unknown().optional(), performedEffort: z.literal('light') }).strict()
export const RecordPortableInput = z.object({ ...mutation, handoffId: text, result: PortableResult }).strict()
const ids = z.array(id).nonempty().refine(values => new Set(values).size === values.length, 'Selection must contain distinct explicit IDs.')
export const PreviewPortableInput = z.object({ ...target, ids }).strict()
export const PromotePortableInput = z.object({ ...mutation, ids, candidateRevisions: z.record(z.string(), revision) }).strict()
export const ReplacePortableInput = z.object({ ...mutation, reason: text, ...selection }).strict()

type Actor = z.infer<typeof BrainstormActor>
type RetainedFile = SkillPackage['manifest'][number] & { readonly encoding: 'utf8' | 'base64'; readonly content: string }
export interface PortableHandoff {
	readonly id: string; readonly at: string; readonly actor: Actor; readonly node: ResolvedComponent
	readonly source: string; readonly context: string | null
	readonly priorInputs: ReadonlyArray<{ readonly handoffId: string; readonly actor: Actor; readonly context: string }>
	readonly priorResults: ReadonlyArray<PortableRecordedResult>
	readonly packages: Readonly<Record<string, ReadonlyArray<RetainedFile>>>
	readonly requestedEffort: 'light' | null; readonly effectiveEffort: 'light'; readonly outputLength: string | null
	readonly contributionSchema: Readonly<Record<string, unknown>> | null
	readonly framing: string
}
export interface PortableRecordedResult {
	readonly id: string; readonly at: string; readonly actor: Actor; readonly handoffId: string; readonly address: string
	readonly output: string; readonly result: z.infer<typeof PortableResult>
	readonly validation: 'contract-accepted-not-independently-verified'
}
export interface PortableState {
	readonly version: 1; readonly root: string; readonly selection: CompositionInspection
	readonly packages: Readonly<Record<string, ReadonlyArray<RetainedFile>>>
	readonly handoffs: ReadonlyArray<PortableHandoff>; readonly results: ReadonlyArray<PortableRecordedResult>
	readonly candidates: ReadonlyArray<number>
}
type PortableItem = Item & { readonly portable: PortableState }
const recovery = [{ run: 'inspect_work', why: 'Inspect saved work before revising intent. Recover uncertain outcomes using the original requestId and exact body; never automatically choose a new ID.' }]
const fail = (message: string, context: Record<string, unknown> = {}) => new MadeWellError({ code: 'portable_invalid', message, context, next: recovery })
const asError = (cause: unknown): MadeWellError => cause instanceof MadeWellError
	// The error instance has already enforced the code/context constructor contract.
	? new MadeWellError({ code: cause.code, message: cause.message, context: cause.context, next: cause.next.length ? cause.next : recovery, ...(cause.cause ? { cause: cause.cause } : {}) } as ConstructorParameters<typeof MadeWellError>[0])
	: fail('Portable work operation failed.', { reason: String(cause) })
const attempt = <A>(run: () => A) => Effect.try({ try: run, catch: asError })
const decode = <S extends z.ZodType>(schema: S, input: unknown): z.output<S> => {
	const parsed = schema.safeParse(input)
	if (!parsed.success) throw fail('Input does not match the portable operation contract.', { problems: parsed.error.issues })
	return parsed.data
}
const leaves = (node: ResolvedComponent): ResolvedComponent[] => node.method ? [node] : (node.children ?? []).flatMap(leaves)
const discoveryContracts: Readonly<Record<string, DiscoveryJob>> = {
	'madewell.discovery.declare.output.v1': 'declare', 'madewell.discovery.look-first.output.v1': 'look-first',
	'madewell.discovery.classify.output.v1': 'classify', 'madewell.discovery.lenses.output.v1': 'lenses',
	'madewell.discovery.one-thing.output.v1': 'one-thing', 'madewell.discovery.route.output.v1': 'route', 'madewell.candidates.v1': 'discover',
}
function scoped(store: Store['Service'], root: string, itemId: number): PortableItem {
	const item = store.get(itemId)
	if (!item) throw new MadeWellError({ code: 'item_not_found', message: 'No work item has this number.', context: { id: itemId }, next: recovery })
	if (item.workspace !== root || item.portable?.root !== root || item.portable.version !== 1) throw fail('This is not portable work in the explicitly granted root.', { itemId, root })
	return item as PortableItem
}
function mutable(item: PortableItem): void {
	if (item.status !== 'open' || item.execution.mode !== 'external' || !quiescent(item) || item.pack || item.job || item.hold || item.completion || item.blockers.some(b => !b.resolvedAt)) {
		throw fail('Only open, unblocked, quiescent external work can change.', { itemId: item.id, status: item.status })
	}
}
function snapshot(item: PortableItem) {
	const nodes = leaves(item.portable.selection.root), next = nodes[item.portable.results.length]
	const pending = item.portable.handoffs.find(handoff => !item.portable.results.some(result => result.handoffId === handoff.id))
	return { itemId: item.id, revision: revisionOf(item), root: item.workspace!, source: item.source, title: item.title, objective: item.objective, status: item.status,
		portable: item.portable, executionAuthorized: false as const, independentlyVerified: false as const,
		owner: item.execution.owner, activity: 'not-running', nextAction: pending ? `Recover saved handoff ${pending.id}; no performer is running.` : next ? `Prepare ${next.address}` : 'Inspect recorded contributions; no execution or independent completion is implied.',
		resources: ['source', 'handoffs', 'results', 'packages', 'selection'].map(kind => ({ uri: `madewell://work/items/${item.id}/${kind}`, mimeType: 'application/json' })),
	}
}
type Snapshot = ReturnType<typeof snapshot>
type SavedOutcome<A extends Snapshot> = { readonly root: string; readonly itemId: number; readonly value?: A; readonly error?: ReturnType<typeof errorJson> }
function request<A extends Snapshot>(store: Store['Service'], root: string, requestId: string, operation: string, itemId: number | null, input: unknown, at: string, run: () => A): A {
	const outcome = store.atomic(() => {
		const saved = store.request<SavedOutcome<A>>(requestId, operation, itemId, { root, input }, () => {
			// Receipt recovery precedes current-item existence, including after pruning.
			if (itemId !== null) scoped(store, root, itemId)
			try { const value = store.atomic(run); return { root, itemId: value.itemId, value } }
			catch (cause) {
				const error = asError(cause)
				if (itemId === null) throw error
				// The scope was authorized above. Refused drafts are evidence, never a new accepted prefix.
				store.note(itemId, 'portable-refused', { requestId, operation, input, error: errorJson(error) }, at)
				return { root, itemId, error: errorJson(error) }
			}
		})
		if (saved.root !== root) throw fail('Receipt belongs to a different material scope.', { root })
		if (store.get(saved.itemId)) scoped(store, root, saved.itemId)
		return saved
	})
	// Only errorJson of a MadeWellError above is saved in this private receipt field.
	if (outcome.error) throw asError(new MadeWellError({ code: outcome.error.error, message: outcome.error.message, context: outcome.error.context, next: outcome.error.next,
		...(outcome.error.cause ? { cause: outcome.error.cause } : {}),
	} as ConstructorParameters<typeof MadeWellError>[0]))
	return outcome.value!
}
function external(root: string, source: string, title: string, objective: string, actor: Actor, at: string) {
	const conditions = [{ id: 'A1', text: objective }]
	return { schemaVersion: 2 as const, workspace: root, source, title, objective, kind: 'portable',
		settings: { ...defaultSettings(), deliveryPack: null, alert: null, inputs: [], destinations: [] },
		execution: { mode: 'external' as const, owner: actor.label }, conditions, conditionHash: conditionHashOf(conditions),
		relationships: { after: [] as number[] }, progress: { remaining: objective, nextAction: 'Prepare the selected method', owner: actor.label }, blockers: [],
		status: 'open' as const, job: '', outputs: {}, from: { kind: 'dispatcher' as const }, autonomy: 'checkpoints' as const, created: at, updated: at,
	}
}
function pin(selection: CompositionInspection, root: string): PortableState['packages'] {
	if (!selection.complete) throw fail('Selected composition has unavailable methods; no successful placeholder was saved.', { diagnostics: selection.diagnostics })
	// This host boundary supports one shared linear lineage, not private/fan-out tracks.
	const sequence = (node: ResolvedComponent): void => {
		if (!node.children) return
		if (node.wiring?.output !== node.children.at(-1)!.id || node.children.some((child, index) => node.wiring?.inputs[child.id] !== (index ? node.children![index - 1]!.id : '$input'))) {
			throw fail('Durable handoffs require linear predecessor wiring; independent sibling inputs need a scoped-track adapter. Read-only resolution remains available.', { address: node.address })
		}
		for (const child of node.children) sequence(child)
	}
	sequence(selection.root)
	const recognized = leaves(selection.root).map(node => discoveryContracts[node.output]).filter(job => job !== undefined)
	const expected = Object.values(discoveryContracts)
	if (recognized.some((job, index) => job !== expected[index])) throw fail('Durable Discovery requires one ordered contribution prefix beginning with Declare. Repeated contracts and standalone later consumers need explicit scoped predecessor input, which this adapter does not yet support. Ordinary standalone skill use remains available.', { recognized, expected })
	const packages: Record<string, RetainedFile[]> = {}
	for (const node of leaves(selection.root)) {
		const method = node.method!
		if (method.kind !== 'skill') continue
		if (Object.keys(method.args).some(key => key !== 'effort') || (method.args.effort !== undefined && method.args.effort !== 'light')) throw fail('Only the free Light recipe without custom method arguments is supported by this service.', { address: node.address, args: method.args })
		for (const pkg of [method.package, ...(method.companions ?? [])]) {
			// Shipped Brainstorm companions have their own explicit read-only package grant.
			const grant = pkg.origin === root || pkg.origin.startsWith(root.endsWith('/') ? root : root + '/') ? root : brainstormSeedRoot
			// Retain ordinary runtime support, not eval/review/development payloads. Script bytes grant no execution authority.
			packages[pkg.identity] = pkg.manifest.filter(f => f.path === 'SKILL.md'
				|| f.path.startsWith('references/') || f.path.startsWith('assets/') || f.path.startsWith('scripts/')
				|| /^(LICENSE|NOTICE)(\.(txt|md))?$/.test(f.path)).map(file => {
				const bytes = readSkillFile(grant, pkg, file.path)
				try { return { ...file, encoding: 'utf8' as const, content: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) } }
				catch { return { ...file, encoding: 'base64' as const, content: bytes.toString('base64') } }
			})
		}
	}
	return packages
}
function retainSelection(selection: CompositionInspection, packages: PortableState['packages']): CompositionInspection {
	// Identities retain original source provenance; these manifests describe only retained runtime material, not intact loader snapshots.
	const retainPackage = (pkg: SkillPackage) => ({ ...pkg, scope: undefined, manifestScope: 'retained-runtime' as const,
		manifest: packages[pkg.identity]!.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
	})
	const retainNode = (node: ResolvedComponent): ResolvedComponent => ({ ...node,
		...(node.method?.kind === 'skill' ? { method: { ...node.method, package: retainPackage(node.method.package),
			...(node.method.companions ? { companions: node.method.companions.map(retainPackage) } : {}),
		} } : {}),
		...(node.children ? { children: node.children.map(retainNode) } : {}),
	})
	return { ...selection, root: retainNode(selection.root) }
}
function acceptedDiscovery(state: PortableState): AcceptedDiscovery {
	const prefix: Partial<Record<DiscoveryJob, unknown>> = {}
	for (const result of state.results) {
		const job = discoveryContracts[result.output]
		if (job) prefix[job] = result.result.contribution
	}
	return prefix
}
function candidates(store: Store['Service'], parent: PortableItem, contribution: unknown, actor: Actor, at: string): number[] {
	const items = (contribution as { items: Array<{ key: string; title: string; objective: string; text: string; conditions: Item['conditions']; after: number[] }> }).items
	const created = items.map(candidate => store.create({ ...external(parent.workspace!, parent.source, candidate.title, candidate.objective, actor, at),
		status: 'candidate', discovery: parent.id, parent: parent.id, conditions: candidate.conditions, conditionHash: conditionHashOf(candidate.conditions),
		progress: { remaining: candidate.text, nextAction: 'Await explicit selection; this is not execution permission.', owner: actor.label },
		relationships: { discovery: parent.id, parent: parent.id, after: [] },
	}))
	for (const [index, item] of created.entries()) store.transition(item.id, revisionOf(item), 'portable-candidate', { discovery: parent.id, key: items[index]!.key }, current => ({ ...current,
		after: items[index]!.after.map(position => created[position - 1]!.id), relationships: { ...current.relationships, after: items[index]!.after.map(position => created[position - 1]!.id) },
	}))
	return created.map(item => item.id)
}
function preview(store: Store['Service'], parent: PortableItem, chosen: number[]) {
	const selected = chosen.map(itemId => {
		if (!parent.portable.candidates.includes(itemId)) throw fail('Selection names an item outside this discovery.', { itemId })
		const candidate = store.get(itemId)!
		if (candidate.workspace !== parent.workspace || candidate.discovery !== parent.id || candidate.status !== 'candidate') throw fail('Selection requires current unpromoted candidates in this scope.', { itemId })
		return { itemId, revision: revisionOf(candidate), title: candidate.title, prerequisites: candidate.relationships.after.map(itemId => ({ itemId, selected: chosen.includes(itemId), completed: store.get(itemId)?.status === 'completed' })) }
	})
	return { selected, executionAuthorized: false as const, implicitPrerequisites: false as const }
}

function operations(root: string) {
	const capture = Effect.fn('mw.capturePortableWork')(function*(input: unknown) {
		const i = yield* attempt(() => decode(CapturePortableInput, input))
		yield* assertWritable()
		const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
		// Resolve only for a new logical capture, so receipt recovery survives changed/deleted local files.
		return yield* attempt(() => request(store, root, i.requestId, 'capture_work', null, i, at, () => {
			const selected = Effect.runSync(inspectComposition({ root, component: i.component, config: i.config, override: i.override }).pipe(Effect.match({ onSuccess: value => value, onFailure: error => { throw error } })))
			const packages = pin(selected, root)
			const item = store.create({ ...external(root, i.source, i.title ?? 'Work', i.objective ?? i.source, i.actor, at),
				portable: { version: 1, root, selection: retainSelection(selected, packages), packages, handoffs: [], results: [], candidates: [] },
			}) as PortableItem
			store.note(item.id, 'portable-captured', { requestId: i.requestId, actor: i.actor, selection: selected.identity }, at)
			return snapshot(item)
		}))
	})
	const inspect = Effect.fn('mw.inspectPortableWork')(function*(input: unknown) {
		const i = yield* attempt(() => decode(InspectPortableInput, input)), store = yield* Store
		return yield* attempt(() => snapshot(scoped(store, root, i.itemId)))
	})
	const prepare = Effect.fn('mw.preparePortableWork')(function*(input: unknown) {
		const i = yield* attempt(() => decode(PreparePortableInput, input))
		yield* assertWritable()
		const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
		return yield* attempt(() => request(store, root, i.requestId, 'prepare_work', i.itemId, i, at, () => {
			const item = store.transition(i.itemId, i.revision, 'portable-prepared', { input: i }, current => {
				const item = current as PortableItem; mutable(item)
				if (i.effort && i.effort !== 'light') throw fail('Managed Focused/Deep preparation is unavailable. Explicitly select Light; no downgrade or purchase occurred.', { requestedEffort: i.effort })
				const saved = item.portable, node = leaves(retainSelection(saved.selection, saved.packages).root)[saved.results.length]
				if (!node) throw fail('Every selected occurrence already has a recorded result.', { itemId: i.itemId })
				if (saved.handoffs.some(h => !saved.results.some(r => r.handoffId === h.id))) throw fail('Recover the pending handoff instead of preparing another attempt.', { itemId: i.itemId })
				const method = node.method!, selected = method.kind === 'skill' ? [method.package, ...(method.companions ?? [])] : []
				const discoveryJob = discoveryContracts[node.output]
				const handoff: PortableHandoff = { id: randomUUID(), at, actor: i.actor, node, source: item.source, context: i.context ?? null,
					priorInputs: saved.handoffs.flatMap(h => h.context === null ? [] : [{ handoffId: h.id, actor: h.actor, context: h.context }]), priorResults: saved.results,
					packages: Object.fromEntries(selected.map(pkg => [pkg.identity, saved.packages[pkg.identity]!])),
					requestedEffort: i.effort ?? null, effectiveEffort: 'light', outputLength: i.outputLength ?? saved.handoffs.at(-1)?.outputLength ?? null,
					contributionSchema: discoveryJob ? discoveryContributionShape(discoveryJob, { handoff: true }) : null,
					framing: 'Apply the selected ordinary instructions under actual host authority. Preserve natural output in result.artifact. When contributionSchema is present, provide the separately structured contract-2 adapter output in result.contribution using its declared evidence/intent/requirement/candidate identities and priorResults. The artifact is not replaced by JSON. Recording validates the declared contract only, never independent acceptance, completion, promotion or execution.',
				}
				return { ...item, portable: { ...saved, handoffs: [...saved.handoffs, handoff] }, updated: at }
			}) as PortableItem
			return { ...snapshot(item), handoff: item.portable.handoffs.at(-1)! }
		}))
	})
	const record = Effect.fn('mw.recordPortableWork')(function*(input: unknown) {
		const i = yield* attempt(() => decode(RecordPortableInput, input))
		yield* assertWritable()
		const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
		return yield* attempt(() => request(store, root, i.requestId, 'record_work', i.itemId, i, at, () => {
			const item = store.transition(i.itemId, i.revision, 'portable-recorded', { input: i }, current => {
				const item = current as PortableItem; mutable(item)
				const saved = item.portable, handoff = saved.handoffs.at(-1)
				if (!handoff || handoff.id !== i.handoffId || saved.results.some(r => r.handoffId === i.handoffId)) throw fail('Result must name the current unrecorded saved handoff.', { handoffId: i.handoffId })
				const job = discoveryContracts[handoff.node.output]
				if (job) {
					if ((i.result.contribution as { discoveryContract?: unknown } | undefined)?.discoveryContract !== '2') throw fail('Portable discovery requires contribution contract 2.', { output: handoff.node.output })
					const validation = validateDiscoveryContribution(job, i.result.contribution, acceptedDiscovery(saved), { handoff: true })
					if (!validation.ok) throw fail('Discovery contribution does not conserve its accepted inputs.', { issues: validation.issues })
				}
				const recorded: PortableRecordedResult = { id: randomUUID(), at, actor: i.actor, handoffId: handoff.id, address: handoff.node.address, output: handoff.node.output, result: i.result, validation: 'contract-accepted-not-independently-verified' }
				return { ...item, portable: { ...saved, results: [...saved.results, recorded], candidates: job === 'discover' ? candidates(store, item, i.result.contribution, i.actor, at) : saved.candidates }, updated: at }
			}) as PortableItem
			return { ...snapshot(item), recorded: item.portable.results.at(-1)! }
		}))
	})
	const previewSelection = Effect.fn('mw.previewPortablePromotion')(function*(input: unknown) {
		const i = yield* attempt(() => decode(PreviewPortableInput, input)), store = yield* Store
		return yield* attempt(() => ({ ...snapshot(scoped(store, root, i.itemId)), promotion: preview(store, scoped(store, root, i.itemId), i.ids) }))
	})
	const promote = Effect.fn('mw.promotePortableSelection')(function*(input: unknown) {
		const i = yield* attempt(() => decode(PromotePortableInput, input))
		yield* assertWritable()
		const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
		return yield* attempt(() => request(store, root, i.requestId, 'promote_work', i.itemId, i, at, () => {
			const parent = scoped(store, root, i.itemId); mutable(parent)
			const selected = preview(store, parent, i.ids)
			if (Object.keys(i.candidateRevisions).length !== i.ids.length || selected.selected.some(c => i.candidateRevisions[String(c.itemId)] !== c.revision)) throw fail('Promotion requires exactly the current revision of every selected candidate.', { selected })
			const updated = store.transition(parent.id, i.revision, 'portable-promoted', { input: i }, current => ({ ...current, updated: at })) as PortableItem
			for (const candidate of selected.selected) store.transition(candidate.itemId, candidate.revision, 'portable-selected', { discovery: parent.id, actor: i.actor }, item => ({
				...item, status: 'open', execution: { mode: 'external', owner: i.actor.label }, pack: undefined, job: '', updated: at,
			}))
			return { ...snapshot(updated), promotion: selected }
		}))
	})
	const replace = Effect.fn('mw.replacePortableFuture')(function*(input: unknown) {
		const i = yield* attempt(() => decode(ReplacePortableInput, input))
		yield* assertWritable()
		const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
		return yield* attempt(() => request(store, root, i.requestId, 'replace_work', i.itemId, i, at, () => {
			const current = scoped(store, root, i.itemId); mutable(current)
			const selected = Effect.runSync(inspectComposition({ root, component: current.portable.selection.root.address, config: i.config, override: i.override }).pipe(Effect.match({ onSuccess: value => value, onFailure: error => { throw error } })))
			const old = leaves(current.portable.selection.root), next = leaves(selected.root)
			const attempted = new Set(current.portable.handoffs.map(h => h.node.address))
			const enclosing = (node: ResolvedComponent): unknown => ({ address: node.address, input: node.input, output: node.output, constraints: node.constraints,
				...(attempted.has(node.address) ? { identity: node.identity } : attempted.size ? { wiring: node.wiring, children: node.children?.filter(child => [...attempted].some(address => address === child.address || address.startsWith(child.address + '/'))).map(enclosing) } : {}),
			})
			if (JSON.stringify(enclosing(selected.root)) !== JSON.stringify(enclosing(current.portable.selection.root)) || old.some((node, index) => attempted.has(node.address) && (next[index]?.identity !== node.identity || next[index]?.address !== node.address))) throw fail('Replacement changes an attempted occurrence or enclosing contract/wiring; historical inputs remain pinned.', { attempted: [...attempted] })
			const packages = pin(selected, root)
			return snapshot(store.transition(i.itemId, i.revision, 'portable-replaced', { input: i }, item => ({ ...item, portable: { ...current.portable, selection: retainSelection(selected, packages), packages: { ...current.portable.packages, ...packages } }, updated: at })) as PortableItem)
		}))
	})
	const readResource = Effect.fn('mw.readPortableResource')(function*(uri: string) {
		const match = /^madewell:\/\/work\/items\/([1-9][0-9]*)\/(source|handoffs|results|packages|selection)$/.exec(uri)
		if (!match) return yield* Effect.fail(fail('Unknown saved work resource.', { uri }))
		const store = yield* Store
		return yield* attempt(() => {
			const item = scoped(store, root, decode(InspectPortableInput, { itemId: Number(match[1]) }).itemId), kind = match[2]!
			return { itemId: item.id, [kind]: kind === 'source' ? item.source : item.portable[kind as keyof PortableState] }
		})
	})
	return { capture, inspect, prepare, record, preview: previewSelection, promote, replace, readResource }
}
export class PortableWork extends Context.Service<PortableWork, ReturnType<typeof operations>>()('madewell/PortableWork') {}
export const portableWorkLayer = (configuration: { readonly root: string }) => Layer.effect(PortableWork, attempt(() => operations(validateGrantedRoot(configuration.root))))
