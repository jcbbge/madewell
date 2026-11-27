// Portable selection is data, not an executable Pack or an accepted work record.
import { createHash } from 'node:crypto'
import { lstatSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Effect, Schema } from 'effect'
import { AUTONOMY_PACK } from './autonomy-pack.ts'
import { brainstormSeedRoot } from './brainstorm-seed.ts'
import { MadeWellError } from './errors.ts'
import type { Pack } from './lane.ts'
import { loadDefaultMethod } from './method-library.ts'
import { loadSkillPackage, readGrantedFile, validateGrantedRoot, type SkillPackage } from './skill-package.ts'

const Text = Schema.NonEmptyString.check(Schema.makeFilter(s => !!s.trim() && !s.includes('\0')))
const Id = Text.check(Schema.makeFilter(s => /^[a-z][a-z0-9-]*$/.test(s)))
const Binding = Schema.Struct({ skill: Text, input: Text, output: Text, args: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)) })
const Fields = { id: Id, purpose: Text, input: Text, output: Text }
export interface Component extends Schema.Struct.Type<typeof Fields> {
	readonly children?: ReadonlyArray<Component>
	readonly wiring?: { readonly inputs: Readonly<Record<string, string>>; readonly output: string }
}
const ComponentSchema: Schema.Codec<Component> = Schema.Struct({
	...Fields,
	children: Schema.optionalKey(Schema.Array(Schema.suspend((): Schema.Codec<Component> => ComponentSchema))),
	wiring: Schema.optionalKey(Schema.Struct({ inputs: Schema.Record(Schema.String, Text), output: Text })),
})
const Effort = Schema.Struct({
	default: Schema.Literal('light'), selected: Schema.optionalKey(Text),
	variants: Schema.Record(Text, Schema.Struct({ composition: ComponentSchema, bindings: Schema.optionalKey(Schema.Record(Schema.String, Binding)) })),
})
const Config = Schema.Struct({
	schemaVersion: Schema.Literal(1),
	uses: Schema.optionalKey(Schema.Array(Text)),
	composition: Schema.optionalKey(ComponentSchema),
	replacements: Schema.optionalKey(Schema.Record(Schema.String, ComponentSchema)),
	efforts: Schema.optionalKey(Schema.Record(Schema.String, Effort)),
	bindings: Schema.optionalKey(Schema.Record(Schema.String, Binding)),
	constraints: Schema.optionalKey(Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Finite, Schema.Boolean])))),
})
type Config = typeof Config.Type
type Located = { readonly path: string; readonly config: Config }
type SelectedBinding = { readonly origin: string; readonly binding: typeof Binding.Type; readonly precedence: number }
type Builtin = { readonly kind: 'builtin'; readonly origin: string; readonly identity: string; readonly definition: {
	readonly step: Pack['delivery'][number]['steps'][number]; readonly brief: Pack['brief']; readonly contracts: Pack['contracts']
} }
export interface ResolvedComponent extends Omit<Component, 'children'> {
	readonly address: string
	readonly origin: string
	readonly identity: string
	readonly constraints: Readonly<Record<string, { readonly value: string | number | boolean; readonly origins: ReadonlyArray<string> }>>
	readonly method?: Builtin | { readonly kind: 'skill'; readonly origin: string; readonly bindingOrigin: string; readonly identity: string; readonly package: SkillPackage; readonly companions?: ReadonlyArray<SkillPackage>; readonly args: Readonly<Record<string, unknown>> }
	readonly children?: ReadonlyArray<ResolvedComponent>
}
export interface CompositionInspection {
	readonly schemaVersion: 1
	readonly identity: string
	readonly complete: boolean
	readonly root: ResolvedComponent
	readonly effort?: ReadonlyArray<{
		readonly address: string; readonly origin: string; readonly requested: string | null; readonly effective: string
		readonly declaration: string; readonly declarationDigest: string; readonly expansionIdentity: string
	}>
	readonly diagnostics: ReadonlyArray<{ readonly code: 'method_unavailable'; readonly address: string; readonly message: string }>
}

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
	? Object.fromEntries(sorted(value as Record<string, unknown>).map(([key, child]) => [key, canonical(child)])) : value
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
function fail(message: string, facts: Record<string, unknown>): never { throw new MadeWellError({
	code: 'portable_invalid', message, context: facts,
	next: [{ run: 'mw cartridges --inspect --root <directory>', why: 'inspect the selected composition after correcting the named material' }],
}) }
const addressOf = (parent: string, id: string) => `${parent === '/' ? '' : parent}/${id}`
const validAddress = (address: string) => address === '/' || /^(\/[a-z][a-z0-9-]*)+$/.test(address)
const sorted = <T>(record: Readonly<Record<string, T>>): Array<[string, T]> => Object.entries(record).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)

function sequence(id: string, purpose: string, children: Component[]): Component {
	return { id, purpose, input: children[0]!.input, output: children.at(-1)!.output, children,
		wiring: { inputs: Object.fromEntries(children.map((child, i) => [child.id, i ? children[i - 1]!.id : '$input'])), output: children.at(-1)!.id } }
}

/** Preserve the established tree and nominal contracts independently of method packaging. */
function defaults() {
	const fromSteps = (loop: 'discovery' | 'delivery', input: string, output: string) => {
		const steps = AUTONOMY_PACK[loop].flatMap(c => c.steps)
		return sequence(loop, `${loop} default composition`, steps.map((step, i): Component => {
			const id = step.job === 'discover' ? 'confirm' : step.job
			return { id, purpose: step.duty!, input: i ? `madewell.${loop}.${steps[i - 1]!.job}.output.v1` : input,
				output: i === steps.length - 1 ? output : `madewell.${loop}.${step.job}.output.v1` }
		}))
	}
	const tree = sequence('work', 'The established default grammar for work', [
		{ id: 'brainstorm', purpose: 'Brainstorm possible work', input: 'madewell.material.v1', output: 'madewell.material.v1' },
		fromSteps('discovery', 'madewell.material.v1', 'madewell.candidates.v1'),
		fromSteps('delivery', 'madewell.candidates.v1', 'madewell.result.v1'),
		{ id: 'landing', purpose: 'Land the work using the selected method', input: 'madewell.result.v1', output: 'madewell.result.v1' },
	])
	return { tree }
}

function indexTree(tree: Component): Map<string, Component> {
	const index = new Map<string, Component>()
	const ancestors = new Set<Component>()
	const visit = (node: Component, address: string) => {
		if (ancestors.has(node)) fail('Composition contains a cycle.', { address })
		ancestors.add(node)
		index.set(address, node)
		if (node.children) {
			if (!node.children.length || !node.wiring) fail('A group needs children and explicit wiring.', { address })
			const outputs = new Map<string, string>([['$input', node.input]])
			for (const child of node.children) {
				if (outputs.has(child.id)) fail('Duplicate sibling occurrence identity.', { address, id: child.id })
				const source = node.wiring.inputs[child.id]
				if (!source || outputs.get(source) !== child.input) fail('Child input must bind to a compatible earlier output or $input.', { address, child: child.id, source, expected: child.input })
				visit(child, addressOf(address, child.id))
				outputs.set(child.id, child.output)
			}
			if (Object.keys(node.wiring.inputs).some(id => !node.children!.some(child => child.id === id))) fail('Wiring names an unknown child.', { address })
			if (node.wiring.output === '$input' || outputs.get(node.wiring.output) !== node.output) fail('Group output must bind to a compatible child output.', { address })
		} else if (node.wiring) fail('A leaf cannot declare child wiring.', { address })
		ancestors.delete(node)
	}
	visit(tree, '/')
	return index
}

function decodeConfig(root: string, path: string): Located {
	try {
		const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readGrantedFile(root, path)))
		return { path, config: Schema.decodeUnknownSync(Config, { onExcessProperty: 'error' })(value) }
	} catch (cause) {
		if (cause instanceof MadeWellError) throw cause
		return fail('Portable configuration is invalid or unsupported.', { path, reason: String(cause) })
	}
}

/** Same-level imports compete; only their importing configuration can settle a binding. */
function configLayers(root: string, file: string, ancestors: ReadonlyArray<string> = []): Located[][] {
	const { config, path } = decodeConfig(root, file)
	if (ancestors.includes(path)) fail('Configuration imports contain a cycle.', { paths: [...ancestors, path] })
	const imported = (config.uses ?? []).map(ref => configLayers(root, resolve(dirname(path), ref), [...ancestors, path]))
	const width = Math.max(0, ...imported.map(layers => layers.length))
	const layers: Located[][] = Array.from({ length: width }, (_, i) => imported.flatMap(branch => branch[i - (width - branch.length)] ?? []))
	return [...layers, [{ path, config }]]
}

function inspect(options: { root: string; config?: string; override?: string; component?: string }): CompositionInspection {
	const root = validateGrantedRoot(resolve(options.root))
	let layers: Located[][] = []
	if (options.config === undefined) {
		const directory = resolve(root, '.madewell')
		try {
			const stat = lstatSync(directory)
			if (stat.isSymbolicLink() || !stat.isDirectory()) fail('The optional configuration directory must be a regular directory inside the granted root.', { path: directory })
		} catch (cause) {
			if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause
		}
	}
	const project = options.config === undefined ? resolve(root, '.madewell/config.json') : resolve(root, options.config)
	let projectExists = true
	try { lstatSync(project) } catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === 'ENOENT' && options.config === undefined) projectExists = false
		else readGrantedFile(root, project)
	}
	if (projectExists) layers = configLayers(root, project)
	if (options.override !== undefined) layers.push(...configLayers(root, resolve(root, options.override)))
	const initial = defaults()
	let tree = initial.tree
	const origins = new Map([...indexTree(tree).keys()].map(address => [address, 'builtin:grammar']))
	const bindings = new Map<string, SelectedBinding>()
	const selectedReplacements = new Map<string, { origin: string; node: Component }>()
	const efforts = new Map<string, { origin: string; declaration: typeof Effort.Type; precedence: number }>()
	const constraints = new Map<string, Map<string, { value: string | number | boolean; origins: string[] }>>()
	// Retain conflicting equal-level choices until a higher layer explicitly settles them.
	const conflicts = new Map<string, string[]>()
	for (const [precedence, layer] of layers.entries()) {
		const compositions = layer.filter(entry => entry.config.composition)
		if (compositions.length) {
			if (new Set(compositions.map(entry => hash(entry.config.composition))).size > 1) conflicts.set('composition', compositions.map(entry => entry.path))
			else {
				const selected = compositions.toSorted((a, b) => a.path.localeCompare(b.path))[0]!
				tree = structuredClone(selected.config.composition!)
				origins.clear()
				for (const address of indexTree(tree).keys()) origins.set(address, selected.path)
				conflicts.delete('composition')
			}
		}
		const replacements = new Map<string, Array<{ origin: string; node: Component }>>()
		const chosen = new Map<string, SelectedBinding[]>()
		const effortChoices = new Map<string, Array<{ origin: string; declaration: typeof Effort.Type }>>()
		for (const { path, config } of layer) {
			for (const [address, node] of sorted(config.replacements ?? {})) replacements.set(address, [...replacements.get(address) ?? [], { origin: path, node }])
			for (const [address, binding] of sorted(config.bindings ?? {})) chosen.set(address, [...chosen.get(address) ?? [], { origin: path, binding, precedence }])
			for (const [address, declaration] of sorted(config.efforts ?? {})) effortChoices.set(address, [...effortChoices.get(address) ?? [], { origin: path, declaration }])
			for (const [address, values] of sorted(config.constraints ?? {})) {
				const valuesAt = constraints.get(address) ?? new Map()
				for (const [key, value] of sorted(values)) {
					const before = valuesAt.get(key)
					if (before && before.value !== value) fail('Contributing constraints conflict.', { address, key, origins: [...before.origins, path] })
					valuesAt.set(key, { value, origins: [...new Set([...(before?.origins ?? []), path])].sort() })
				}
				constraints.set(address, valuesAt)
			}
		}
		for (const [address, candidates] of replacements) {
			if (new Set(candidates.map(candidate => hash(candidate.node))).size > 1) { conflicts.set(`replacement:${address}`, candidates.map(candidate => candidate.origin)); continue }
			conflicts.delete(`replacement:${address}`)
			selectedReplacements.set(address, candidates.toSorted((a, b) => a.origin.localeCompare(b.origin))[0]!)
		}
		for (const [address, candidates] of chosen) {
			const identities = candidates.map(({ origin, binding }) => hash({ ...binding, skill: resolve(dirname(origin), binding.skill) }))
			if (new Set(identities).size > 1) { conflicts.set(`binding:${address}`, candidates.map(candidate => candidate.origin)); continue }
			conflicts.delete(`binding:${address}`)
			bindings.set(address, candidates.toSorted((a, b) => a.origin.localeCompare(b.origin))[0]!)
		}
		for (const [address, candidates] of effortChoices) {
			// Relative package paths belong to the declaring file, not the caller's cwd.
			const identities = candidates.map(({ origin, declaration }) => hash({ ...declaration,
				variants: Object.fromEntries(sorted(declaration.variants).map(([name, variant]) => [name, { ...variant,
					bindings: Object.fromEntries(sorted(variant.bindings ?? {}).map(([address, binding]) => [address, { ...binding, skill: resolve(dirname(origin), binding.skill) }])),
				}])),
			}))
			if (new Set(identities).size > 1) { conflicts.set(`effort:${address}`, candidates.map(candidate => candidate.origin)); continue }
			conflicts.delete(`effort:${address}`)
			efforts.set(address, { ...candidates.toSorted((a, b) => a.origin.localeCompare(b.origin))[0]!, precedence })
		}
	}
	if (conflicts.size) fail('Equal-precedence selections need an explicit higher-layer choice.', { conflicts: Object.fromEntries(conflicts) })
	// Resolve all structural choices first, then apply parent replacements before their children.
	for (const [address, selected] of [...selectedReplacements].sort(([a], [b]) => a.split('/').length - b.split('/').length || a.localeCompare(b))) {
		const index = indexTree(tree), previous = index.get(address), next = selected.node
		if (!validAddress(address) || !previous) fail('Replacement names an unknown occurrence.', { address })
		if (previous.id !== next.id || previous.input !== next.input || previous.output !== next.output) fail('Replacement must preserve occurrence and external contracts.', { address })
		if (address === '/') tree = structuredClone(next)
		else {
			const parentAddress = address.slice(0, address.lastIndexOf('/')) || '/'
			const parent = index.get(parentAddress)!
			Object.assign(parent, { children: parent.children!.map(child => child.id === previous.id ? structuredClone(next) : child) })
		}
		for (const childAddress of indexTree(next).keys()) origins.set(childAddress === '/' ? address : `${address === '/' ? '' : address}${childAddress}`, selected.origin)
	}
	const resolvedEffort: NonNullable<CompositionInspection['effort']>[number][] = []
	for (const [address, { origin, declaration, precedence }] of [...efforts].sort(([a], [b]) => a.split('/').length - b.split('/').length || a.localeCompare(b))) {
		const index = indexTree(tree), previous = index.get(address)
		const effective = declaration.selected ?? declaration.default
		if (!Object.hasOwn(declaration.variants, 'light') || !Object.hasOwn(declaration.variants, effective)) fail('Effort requires an authored Light variant and the exact selected variant.', { address, effective })
		const variant = declaration.variants[effective]!, next = variant.composition
		if (!validAddress(address) || !previous || previous.id !== next.id || previous.input !== next.input || previous.output !== next.output) fail('Effort expansion must preserve its occurrence and external contracts.', { address, effective })
		if (address === '/') tree = structuredClone(next)
		else {
			const parent = index.get(address.slice(0, address.lastIndexOf('/')) || '/')!
			Object.assign(parent, { children: parent.children!.map(child => child.id === previous.id ? structuredClone(next) : child) })
		}
		const inside = (child: string) => address === '/' || child === address || child.startsWith(address + '/')
		for (const [bound, selected] of bindings) if (inside(bound) && selected.precedence <= precedence) bindings.delete(bound)
		for (const [bound, binding] of sorted(variant.bindings ?? {})) {
			if (!inside(bound)) fail('An effort variant cannot bind methods outside its subtree.', { address, binding: bound })
			if ((bindings.get(bound)?.precedence ?? -1) <= precedence) bindings.set(bound, { origin, binding, precedence })
		}
		for (const childAddress of indexTree(next).keys()) origins.set(childAddress === '/' ? address : `${address === '/' ? '' : address}${childAddress}`, origin)
		resolvedEffort.push({ address, origin, requested: declaration.selected ?? null, effective,
			declaration: JSON.stringify(canonical(declaration)), declarationDigest: hash(declaration), expansionIdentity: hash(variant) })
	}
	const index = indexTree(tree)
	for (const [address, { binding }] of bindings) {
		const node = index.get(address)
		if (!validAddress(address) || !node) fail('Binding names an unknown occurrence.', { address })
		if (binding.input !== node.input || binding.output !== node.output) fail('Method binding does not match the occurrence contracts.', { address, expected: { input: node.input, output: node.output } })
		for (const parent of bindings.keys()) if (address !== parent && (parent === '/' || address.startsWith(parent + '/'))) fail('Binding is shadowed by a method at an enclosing occurrence.', { address, parent })
	}
	for (const [address, values] of constraints) {
		if (!validAddress(address) || !index.has(address)) fail('Constraints name an unknown occurrence.', { address })
		for (const parent of bindings.keys()) if (values.size && address !== parent && (parent === '/' || address.startsWith(parent + '/'))) {
			fail('A method binding cannot hide descendant constraints.', { address, parent, origins: [...new Set([...values.values()].flatMap(value => value.origins))].sort() })
		}
	}
	const selectedAddress = options.component ?? '/'
	const selected = index.get(selectedAddress)
	if (!validAddress(selectedAddress) || !selected) fail('Selected component does not exist.', { address: selectedAddress })
	for (const parent of bindings.keys()) if (parent !== selectedAddress && (parent === '/' || selectedAddress.startsWith(parent + '/'))) fail('Selected component is shadowed by an enclosing method.', { address: selectedAddress, parent })
	for (const effort of resolvedEffort) for (const parent of bindings.keys()) if (parent !== effort.address && (parent === '/' || effort.address.startsWith(parent + '/'))) fail('Effort expansion is shadowed by an enclosing method.', { address: effort.address, parent })
	const diagnostics: Array<CompositionInspection['diagnostics'][number]> = []
	const visit = (node: Component, address: string): ResolvedComponent => {
		const chosen = bindings.get(address)
		const effective = new Map<string, { value: string | number | boolean; origins: string[] }>()
		for (const [ancestor, additions] of [...constraints].sort(([a], [b]) => a.localeCompare(b))) {
			if (ancestor !== '/' && ancestor !== address && !address.startsWith(ancestor + '/')) continue
			for (const [key, value] of additions) {
				const previous = effective.get(key)
				if (previous && previous.value !== value.value) fail('Enclosing and local constraints conflict.', { address, ancestor, key, origins: [...previous.origins, ...value.origins] })
				effective.set(key, { value: value.value, origins: [...new Set([...(previous?.origins ?? []), ...value.origins])].sort() })
			}
		}
		const values = Object.fromEntries([...effective].sort(([a], [b]) => a.localeCompare(b)))
		let method: ResolvedComponent['method']
		if (chosen) {
			const skill = loadSkillPackage(root, resolve(dirname(chosen.origin), chosen.binding.skill))
			method = { kind: 'skill', origin: skill.origin, bindingOrigin: chosen.origin, identity: skill.identity, package: skill, args: chosen.binding.args ?? {} }
		} else if (!node.children && origins.get(address) === 'builtin:grammar') {
			if (address === '/brainstorm') {
				const skill = loadSkillPackage(brainstormSeedRoot, 'skills/brainstorm')
				const posture = loadSkillPackage(brainstormSeedRoot, 'skills/ambitious-collaboration')
				method = { kind: 'skill', origin: skill.origin, bindingOrigin: 'builtin:brainstorm-seed',
					identity: hash({ method: skill.identity, posture: posture.identity }), package: skill, companions: [posture], args: { effort: 'light' } }
			} else {
				const selected = loadDefaultMethod(address)
				if (selected) method = { kind: 'skill', origin: selected.snapshot.origin,
					bindingOrigin: `builtin:method-library@${selected.revision}`, identity: selected.snapshot.identity,
					package: selected.snapshot, args: { effort: 'light' } }
			}
		}
		const children = !chosen && node.children ? node.children.map(child => visit(child, addressOf(address, child.id))) : undefined
		if (!method && !children) diagnostics.push({ code: 'method_unavailable', address, message: 'No canonical method content is available for this occurrence. Supply a compatible skill binding.' })
		const { children: _children, wiring, ...fields } = node
		const result = { ...fields, address, origin: origins.get(address)!, constraints: values, ...(children ? { children, wiring } : {}), ...(method ? { method } : {}) }
		return { ...result, identity: hash(result) }
	}
	const resolved = visit(selected, selectedAddress)
	const effort = resolvedEffort.filter(choice => choice.address === '/' || selectedAddress === '/' || choice.address === selectedAddress || choice.address.startsWith(selectedAddress + '/') || selectedAddress.startsWith(choice.address + '/'))
	return { schemaVersion: 1, identity: effort.length ? hash({ root: resolved, effort }) : hash(resolved), complete: diagnostics.length === 0, root: resolved,
		...(effort.length ? { effort } : {}), diagnostics }
}

/** Resolve explicit local material without opening storage, loading a worker or executing a method. */
export const inspectComposition = Effect.fn('mw.inspectComposition')(function* (options: { root: string; config?: string; override?: string; component?: string }) {
	return yield* Effect.try({ try: () => inspect(options), catch: cause => cause instanceof MadeWellError ? cause : new MadeWellError({
		code: 'portable_invalid', message: 'Cannot resolve the portable composition.', context: { reason: String(cause) },
		next: [{ run: 'mw cartridges --inspect --root <directory>', why: 'correct the selected material and inspect again' }],
	}) })
})
