// Ground, Rumen and outgoing preparation belong to the work, never to a worker's lifetime.
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, normalize, relative, resolve, sep } from 'node:path'
import { Result, Schema } from 'effect'
import { isMaker, laneOf, lastJson, route, shapeOf, stepOf } from './lane.ts'
import { checkPrerequisites } from './prerequisites.ts'
import type { Project } from './project.ts'
import { hasFunctionFenceProof, rumenRules, type RumenRule } from './rumen.ts'
import type { Item, Store } from './store.ts'
import { invalidatedAt } from './work-boundary.ts'

type Reader = Pick<Store['Service'], 'events'>
type HandoffReader = Reader & Pick<Store['Service'], 'get'>
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const Text = Schema.NonEmptyString.check(Schema.makeFilter(value => !!value.trim() && !value.includes('\0'), { toJsonSchema: () => [{}, true] }))
const Preparation = Schema.Struct({
	ground: Schema.Struct({ intent: Text, sources: Schema.Array(Schema.Struct({ ref: Text, finding: Text })).check(Schema.isMinLength(1)) }),
	rumen: Schema.Array(Schema.Struct({ rule: Text, disposition: Schema.Literals(['addressed', 'not-applicable']), evidence: Text })),
	next: Schema.Array(Schema.Struct({ job: Text, brief: Text, requires: Schema.Array(Text).check(Schema.isMinLength(1)) })),
})
export type Preparation = typeof Preparation.Type
export interface GroundSource { readonly ref: string; readonly sha256: string; readonly path?: string; readonly paths?: ReadonlyArray<string>; readonly finding?: string }
export interface OrganReceipt {
	readonly version: '1'; readonly job: string; readonly round: number; readonly outputHash: string
	readonly ground: { readonly intent: string; readonly sources: ReadonlyArray<GroundSource> }
	readonly rumen: ReadonlyArray<RumenRule & { readonly disposition: 'addressed' | 'not-applicable'; readonly evidence: string }>
	readonly next: ReadonlyArray<{ readonly job: string; readonly brief: string; readonly requires: ReadonlyArray<GroundSource> }>
}

/** User-facing creation pins the obligation; raw persistence remains able to restore legacy documents. */
export const createWork = (store: Pick<Store['Service'], 'create'>, fields: Parameters<Store['Service']['create']>[0]) =>
	store.create({ ...fields, organs: { version: '1' } })

export const organsRequired = (item: Item) => item.organs?.version === '1'

export const childOrgans = (parent: Item, job: string, output: string, target: 'delivery' | 'prerequisite' = 'delivery'): Item['organs'] =>
	parent.organs ? { version: '1', origin: { item: parent.id, job, outputHash: hash(output), target } } : undefined

/** Advertise the same mandatory contract that acceptance enforces, including custom cartridges. */
export function organOutputShape(item: Item, original: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
	if (!organsRequired(item)) return original
	const add = (shape: Record<string, unknown>): Record<string, unknown> => {
		if (Array.isArray(shape.anyOf)) return { ...shape, anyOf: shape.anyOf.map(branch => add(branch as Record<string, unknown>)) }
		const properties = (shape.properties ?? {}) as Record<string, unknown>
		if ('blocked' in properties) return shape
		return { ...shape, type: 'object', properties: { ...properties, preparation: shapeOf(Preparation) }, required: [...new Set([...(shape.required as string[] ?? []), 'preparation'])] }
	}
	return add(original ?? { type: 'object' })
}

/** The consumer is configured by the lane, not invented by the producer. */
export function nextJobs(item: Item, job: string, output?: Record<string, unknown>): string[] {
	const lane = laneOf(item.pack), step = stepOf(lane, job)
	if (lane.pack.runtime === 'functions') {
		const steps = step.loop === 'discovery' ? lane.discovery : lane.delivery
		const next = steps[steps.findIndex(s => s.job === job) + 1]
		return next ? [next.job] : step.loop === 'discovery' && !(Array.isArray(output?.items) && output.items.length === 0) ? ['delivery'] : []
	}
	if (job === 'verify') return []
	if (job === 'arbitrate' && !output) return ['plan', ...(lane.makers.includes('test-plan') ? ['test-plan'] : []), 'verify']
	const target = route(lane, job, output ?? {}, item.corrections)
	if (target.to === 'discovered') return target.items?.length === 0 ? [] : ['delivery']
	if (target.to === 'split') return [...lane.makers]
	if (target.to === 'next' || target.to === 'rework') return [target.job]
	if (target.to === 'prerequisite') return ['prerequisite', 'verify']
	if (target.to === 'environment') return lane.makers.filter(m => typeof lastJson(item.outputs[m] ?? '')?.blocked === 'string').length
		? lane.makers.filter(m => typeof lastJson(item.outputs[m] ?? '')?.blocked === 'string') : ['verify']
	if (target.to === 'arbitrate') return ['arbitrate']
	return []
}

const permittedOutputs = (item: Item, job: string) => {
	const from = isMaker(job) ? item.split?.[job]?.from ?? item.from : item.from
	// A correction carries its originator's public ruling, never the sibling maker's private return.
	const originator = from.kind === 'job' && (!isMaker(job) || !isMaker(from.job)) ? [from.job] : []
	return new Set([...stepOf(laneOf(item.pack), job).receives, ...originator])
}

/** Retain every link needed to resolve a reference, not merely its two endpoints. */
function fileMaterial(root: string, file: string, links: string[] = []): { file: string; paths: string[] } {
	if (links.length >= 40) throw new Error('Ground file reference has a cyclic or excessive symlink chain.')
	const inside = relative(root, file)
	if (isAbsolute(inside) || inside === '..' || inside.startsWith('..' + sep)) throw new Error('Ground file reference leaves the workspace; declare a permitted project input.')
	const segments = inside.split(sep)
	let current = root
	for (const [index, segment] of segments.entries()) {
		current = resolve(current, segment)
		if (lstatSync(current).isSymbolicLink()) {
			const target = readlinkSync(current)
			if (normalize(target) !== target) throw new Error('Ground needs a canonical symlink target; cite the actual file or a declared prepared input instead of a path that cancels intermediate components.')
			return fileMaterial(root, resolve(dirname(current), target, ...segments.slice(index + 1)), [...links, relative(root, current)])
		}
	}
	return { file: current, paths: [...new Set([...links, relative(root, current)])] }
}

function material(item: Item, job: string, ref: string, dir: string, project: Project | undefined, own?: { job: string; output: string }, inputJob = job): GroundSource {
	if (ref === 'source') return { ref, sha256: hash(item.source) }
	if (ref.startsWith('output:')) {
		const name = ref.slice(7)
		const raw = own?.job === name ? own.output : permittedOutputs(item, job).has(name) ? item.outputs[name] : undefined
		if (typeof raw !== 'string') throw new Error(`Ground reference ${ref} is not an available output permitted to ${job}.`)
		return { ref, sha256: hash(raw) }
	}
	if (ref.startsWith('input:')) {
		const id = ref.slice(6), checked = checkPrerequisites(project?.inputs, inputJob, dir).find(input => input.id === id)
		if (!checked?.ok) throw new Error(`Ground reference ${ref} is not a ready declared input for ${job}${checked?.reason ? `: ${checked.reason}` : '.'}`)
		const stat = statSync(checked.path)
		// Directory readiness proves the declared location/type, not recursive contents.
		const binding = project!.inputs!.find(input => input.id === id)!
		return { ref, sha256: hash(stat.isDirectory() ? JSON.stringify({ binding: binding.path, kind: 'directory' }) : readFileSync(checked.path)) }
	}
	if (!ref.startsWith('file:')) throw new Error(`Unknown Ground reference ${ref}; use source, output:<job>, file:<relative path>, or input:<id>.`)
	const path = ref.slice(5), root = realpathSync(dir)
	if (!path || isAbsolute(path)) throw new Error(`Ground file reference ${ref} must be relative to the receiving workspace.`)
	if (normalize(path) !== path) throw new Error(`Ground file reference ${ref} must use its canonical relative path.`)
	const file = resolve(root, path), lexical = relative(root, file)
	if (lexical === '..' || lexical.startsWith('..' + sep)) throw new Error(`Ground file reference ${ref} leaves the workspace.`)
	const resolved = fileMaterial(root, file), physical = resolved.file, inside = relative(root, physical)
	if (!statSync(physical).isFile()) throw new Error(`Ground file reference ${ref} must name a readable file.`)
	return { ref, sha256: hash(readFileSync(physical)), path: inside, paths: resolved.paths }
}

/** Validate real materials and producer responsibility; no receipt claims semantic understanding was proven. */
export function inspectPreparation(item: Item, job: string, output: Record<string, unknown>, raw: string, dir: string, project?: Project, tracked: ReadonlyArray<string> = [], selectedRules?: ReadonlyArray<RumenRule>):
	{ ok: true; receipt?: OrganReceipt } | { ok: false; reason: string } {
	if (!organsRequired(item) || typeof output.blocked === 'string') return { ok: true }
	const decoded = Schema.decodeUnknownResult(Preparation)(output.preparation)
	if (Result.isFailure(decoded)) return { ok: false, reason: `Ground, Rumen and next-step preparation are mandatory: ${decoded.failure.message}` }
	const p = decoded.success, rules = rumenRules(project, job), expected = nextJobs(item, job, output)
	const definitions = (inventory: ReadonlyArray<RumenRule>) => JSON.stringify(inventory.map(rule => [rule.id, rule.definitionHash]))
	if (selectedRules === undefined || definitions(selectedRules) !== definitions(rules)) return { ok: false, reason: 'Rumen definitions changed or are unavailable since this execution was prepared. Re-ground against the actual selected rules before accepting the output.' }
	const unique = (values: ReadonlyArray<string>) => new Set(values).size === values.length
	if (!unique(p.ground.sources.map(s => s.ref))) return { ok: false, reason: 'Ground source references must be unique.' }
	if (!unique(p.rumen.map(r => r.rule)) || p.rumen.length !== rules.length || rules.some(rule => !p.rumen.some(r => r.rule === rule.id))) return { ok: false, reason: 'Rumen must account for every selected rule exactly once, without invented rule identities.' }
	if (p.rumen.some(r => r.disposition === 'not-applicable' && rules.find(rule => rule.id === r.rule)?.kind === 'fence')) return { ok: false, reason: 'Only engine verification determines mechanical fence applicability; carry the fence forward as addressed, without awarding it a pass.' }
	if (!unique(p.next.map(n => n.job)) || p.next.length !== expected.length || expected.some(job => !p.next.some(n => n.job === job))) return { ok: false, reason: `Next-step preparation must supply exactly these consumers: ${expected.join(', ') || '(terminal: empty next list)'}.` }
	if (laneOf(item.pack).pack.runtime !== 'functions' && ['plan', 'implement', 'test-plan', 'arbitrate'].includes(job) && tracked.length && !p.ground.sources.some(s => s.ref.startsWith('file:'))) return { ok: false, reason: 'Ground must cite at least one actual repository file for this software phase; task prose alone does not ground the implementation.' }
	try {
		const sources = p.ground.sources.map(s => ({ ...material(item, job, s.ref, dir, project), finding: s.finding }))
		const next = p.next.map(n => {
			if (!unique(n.requires)) throw new Error(`Preparation for ${n.job} repeats a required reference.`)
			if (!n.requires.includes(`output:${job}`)) throw new Error(`Preparation for ${n.job} must carry output:${job}, the producer's actual deliverable.`)
			for (const ref of n.requires) {
				if (ref.startsWith('output:') && ref !== `output:${job}` && (n.job === 'delivery' || n.job === 'prerequisite' || !stepOf(laneOf(item.pack), n.job).receives.includes(ref.slice(7)))) throw new Error(`Preparation for ${n.job} cannot supply ${ref}: that output is outside the consumer's permitted inputs.`)
			}
			const consumer = n.job === 'delivery' ? laneOf(item.pack).delivery[0]?.job ?? job : n.job === 'prerequisite' ? 'plan' : n.job
			return { job: n.job, brief: n.brief, requires: n.requires.map(ref => material(item, job, ref, dir, project, { job, output: raw }, consumer)) }
		})
		return { ok: true, receipt: { version: '1', job, round: item.round, outputHash: hash(raw), ground: { intent: p.ground.intent, sources }, rumen: rules.map(rule => ({ ...rule, ...p.rumen.find(r => r.rule === rule.id)! })), next } }
	} catch (error) { return { ok: false, reason: `Ground could not prepare the work: ${error instanceof Error ? error.message : String(error)}` } }
}

export function saveOrganReceipt(store: Pick<Store['Service'], 'note'>, item: Item, receipt: OrganReceipt | undefined, call: number | string) {
	if (receipt) store.note(item.id, 'organs-accepted', { job: receipt.job, receipt, call })
}

export function organReceipts(store: Reader, item: Item) {
	const events = store.events(item.id)
	return events.flatMap(event => {
		const r = event.kind === 'organs-accepted' ? event.data.receipt as OrganReceipt | undefined : undefined
		return r?.version === '1' && event.seq > invalidatedAt(events, r.job) && typeof item.outputs[r.job] === 'string' && r.outputHash === hash(item.outputs[r.job]!) ? [{ ...r, event: event.seq }] : []
	})
}

/** Only accepted shared predecessors and this role's own output are visible, never the other maker. */
function originPreparation(store: HandoffReader, item: Item, job: string) {
	const origin = item.organs?.origin
	const first = origin?.target === 'prerequisite' ? 'plan' : laneOf(item.pack).delivery[0]?.job
	if (!origin || job !== first) return undefined
	const parent = store.get(origin.item)
	const receipt = parent && organReceipts(store, parent).findLast(r => r.job === origin.job && r.outputHash === origin.outputHash)
	const outgoing = receipt?.next.find(next => next.job === origin.target)
	return { origin, parent, receipt, outgoing }
}

export function organPacket(store: HandoffReader, item: Item, job: string, project?: Project) {
	if (!organsRequired(item)) return undefined
	const permitted = permittedOutputs(item, job), receipts = organReceipts(store, item)
	const incoming = receipts.filter(r => permitted.has(r.job)).flatMap(r => r.next.filter(n => n.job === job).map(n => ({ from: r.job, event: r.event, ...n })))
	const origin = originPreparation(store, item, job)
	const inherited = origin?.outgoing ? [{ ...origin.outgoing, job, from: origin.origin.job, fromItem: origin.origin.item, event: origin.receipt!.event }] : []
	return { version: '1', required: true, rules: rumenRules(project, job), nextJobs: nextJobs(item, job), incoming: [...inherited, ...incoming],
		instruction: 'The work is durable; you are a disposable tool. Complete only this phase, ground its findings in actual material, account for every selected Rumen rule, and prepare every configured next consumer in preparation. Never self-certify a mechanical gate. Source hashes prove material identity, not semantic correctness. Intake has no tools; inspect sources during execution. Missing sender-owned material returns through this same NQ exchange.' }
}

/** Recheck the actual requirements the producer supplied, after preparation and artifact restoration. */
export function checkIncomingPreparation(store: HandoffReader, item: Item, job: string, dir: string, project?: Project, producers?: ReadonlyArray<string>) {
	if (!organsRequired(item)) return { ok: true as const, checked: [] }
	const allowed = new Set(producers ?? permittedOutputs(item, job)), checked: Array<{ ref: string; producer: string; ok: boolean; reason: string | null }> = []
	const receipts = organReceipts(store, item), events = store.events(item.id)
	const loop = stepOf(laneOf(item.pack), job).loop, steps = laneOf(item.pack)[loop]
	const inherited = originPreparation(store, item, job)
	if (inherited) {
		if (!inherited.parent || !inherited.receipt || !inherited.outgoing) checked.push({ ref: `item:${inherited.origin.item}:output:${inherited.origin.job}`, producer: inherited.origin.job, ok: false, reason: 'The parent preparation is unavailable, changed or missing its actual next consumer.' })
		else for (const expected of inherited.outgoing.requires) {
			try {
				const actual = material(inherited.parent, inherited.origin.job, expected.ref, dir, project, { job: inherited.origin.job, output: inherited.parent.outputs[inherited.origin.job]! }, job)
				const ok = actual.sha256 === expected.sha256 && actual.path === expected.path && JSON.stringify(actual.paths) === JSON.stringify(expected.paths)
				checked.push({ ref: expected.ref, producer: inherited.origin.job, ok, reason: ok ? null : 'Required parent material changed since discovery or prerequisite preparation.' })
			} catch (error) { checked.push({ ref: expected.ref, producer: inherited.origin.job, ok: false, reason: error instanceof Error ? error.message : String(error) }) }
		}
	}
	for (const producer of allowed) {
		const configured = steps.some(step => step.job === producer) || laneOf(item.pack).arbiter?.job === producer
		const accepted = events.some(event => event.kind === 'organs-accepted' && event.data.job === producer || event.kind === 'accepted' && event.data.job === producer || event.kind === 'handed-off' && event.data.from === producer || producer === 'arbitrate' && event.kind === 'ruling' && event.data.by === 'arbiter')
		const blocked = typeof lastJson(item.outputs[producer] ?? '')?.blocked === 'string'
		if (configured && accepted && !blocked && item.outputs[producer] !== undefined && !receipts.some(r => r.job === producer)) checked.push({ ref: `output:${producer}`, producer, ok: false, reason: 'The accepted predecessor has no current matching Ground/Rumen/preparation receipt.' })
	}
	for (const receipt of receipts.filter(r => allowed.has(r.job))) {
		const from = isMaker(job) ? item.split?.[job]?.from ?? item.from : item.from
		if (from.kind === 'job' && from.job === receipt.job && !receipt.next.some(next => next.job === job)) checked.push({ ref: `output:${receipt.job}`, producer: receipt.job, ok: false, reason: 'The actual originator did not prepare this configured consumer.' })
		for (const next of receipt.next.filter(n => n.job === job)) for (const expected of next.requires) {
			try {
				const actual = material(item, receipt.job, expected.ref, dir, project, { job: receipt.job, output: item.outputs[receipt.job]! }, job)
				const ok = actual.sha256 === expected.sha256 && actual.path === expected.path && JSON.stringify(actual.paths) === JSON.stringify(expected.paths)
				checked.push({ ref: expected.ref, producer: receipt.job, ok, reason: ok ? null : 'Required material changed since the producer prepared this handoff.' })
			} catch (error) { checked.push({ ref: expected.ref, producer: receipt.job, ok: false, reason: error instanceof Error ? error.message : String(error) }) }
		}
	}
	return { ok: checked.every(c => c.ok), checked }
}

/** Composition accounts for accepted child references; it never invents an agent's semantic judgment. */
export function compositionPreparation(item: Item, job: string, project?: Project): Preparation {
	const step = stepOf(laneOf(item.pack), job), refs = step.receives.map(name => `output:${name}`)
	return { ground: { intent: item.objective, sources: (refs.length ? refs : ['source']).map(ref => ({ ref, finding: 'Engine composition retains this actual input; semantic claims remain in the accepted child outputs.' })) },
		rumen: rumenRules(project, job).map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: 'Carried through engine composition; mechanical proof remains engine-owned, and judgment remains attributable to child evidence.' })),
		next: nextJobs(item, job).map(next => ({ job: next, brief: `Use the accepted ${job} composition for ${item.objective}.`, requires: [`output:${job}`] })) }
}

/** A bounded read-only conclusion. Historical receipts never imply present resource availability. */
export function organSummary(store: Reader, item: Item) {
	const receipts = organReceipts(store, item), current = receipts.filter((r, index) => receipts.findLastIndex(other => other.job === r.job) === index)
	const terminal = item.pack?.runtime === 'functions' && item.flow?.loop !== 'discovery' ? laneOf(item.pack).delivery.at(-1)?.job : undefined
	return { required: organsRequired(item), version: item.organs?.version ?? null, legacy: !organsRequired(item),
		phases: current.slice(-12).map(r => ({ job: r.job.slice(0, 120), ground: true, rumen: r.job !== terminal || hasFunctionFenceProof(store.events(item.id), r.job, item.outputs[r.job]!, r.rumen), nextPrepared: true, event: r.event, rules: r.rumen.length, next: r.next.slice(0, 4).map(n => n.job.slice(0, 120)), currentAvailability: 'unknown' as const })),
		total: current.length, omitted: Math.max(0, current.length - 12), detail: `/api/trace/${item.id}?lens=ax` }
}
