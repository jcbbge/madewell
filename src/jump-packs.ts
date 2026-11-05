// Opt-in experiment: resolve domain contributions into the existing function runtime.
import { readFileSync } from 'node:fs'
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { problemsOf, type Pack } from './lane.ts'

export const JUMP_SLOTS = [
	{ id: 'declare', label: 'Declare()', loop: 'discovery', purpose: 'Establish the intended outcomes, their source and scope.' },
	{ id: 'look-first', label: 'lookFirst()', loop: 'discovery', purpose: 'Establish available evidence, existing work and missing context.' },
	{ id: 'classify', label: 'classify()', loop: 'discovery', purpose: 'Distinguish requests, observations, alternatives, constraints and assumptions.' },
	{ id: 'lenses', label: 'Lenses()', loop: 'discovery', purpose: 'Examine the relevant consequences and affected perspectives.' },
	{ id: 'one-thing', label: 'oneThing()', loop: 'discovery', purpose: 'Identify coherent candidate outcomes and their prerequisites.' },
	{ id: 'route', label: 'route()', loop: 'discovery', purpose: 'Establish dependencies, unresolved prerequisites and possible parallel work.' },
	{ id: 'confirm', label: 'confirm()', loop: 'discovery', purpose: 'Return candidate work that accounts for the intended outcomes.' },
	{ id: 'ideation', label: 'ideation()', loop: 'delivery', purpose: 'Establish what fulfilling this task means and an appropriate approach.' },
	{ id: 'planning', label: 'planning()', loop: 'delivery', purpose: 'Establish feasible actions and how their result will be checked.' },
	{ id: 'implementation', label: 'implementation()', loop: 'delivery', purpose: 'Carry out the agreed action and report its actual result.' },
	{ id: 'verification', label: 'verification()', loop: 'delivery', purpose: 'Compare the actual result with the agreed completion conditions.' },
] as const
export type JumpSlot = (typeof JUMP_SLOTS)[number]['id']

const JsonObject = Schema.Record(Schema.String, Schema.Unknown)
const Scalar = Schema.Union([Schema.String, Schema.Finite, Schema.Boolean])
const Positive = Schema.Finite.check(Schema.isGreaterThan(0))
export const JumpMethod = Schema.Struct({
	id: Schema.NonEmptyString,
	fallback: Schema.optionalKey(Schema.Boolean),
	profile: Schema.optionalKey(Schema.NonEmptyString),
	duty: Schema.optionalKey(Schema.NonEmptyString),
	task: Schema.optionalKey(Schema.NonEmptyString),
	run: Schema.optionalKey(Schema.NonEmptyString),
	check: Schema.optionalKey(Schema.NonEmptyString),
	input: Schema.optionalKey(JsonObject),
	output: Schema.optionalKey(JsonObject),
	args: Schema.optionalKey(JsonObject),
	access: Schema.optionalKey(Schema.Literals(['none', 'read', 'make', 'checks', 'run'])),
	tier: Schema.optionalKey(Schema.NonEmptyString),
	budget: Schema.optionalKey(Schema.Struct({ minutes: Positive, tokens: Schema.optionalKey(Positive) })),
})
export type JumpMethod = typeof JumpMethod.Type
export const JumpRequirement = Schema.Struct({
	id: Schema.NonEmptyString,
	text: Schema.NonEmptyString,
	constraints: Schema.optionalKey(Schema.Record(Schema.String, Scalar)),
})
export type JumpRequirement = typeof JumpRequirement.Type
export const JumpPack = Schema.Struct({
	name: Schema.NonEmptyString,
	version: Schema.NonEmptyString,
	description: Schema.optionalKey(Schema.String),
	methods: Schema.optionalKey(Schema.Record(Schema.String, JumpMethod)),
	requirements: Schema.optionalKey(Schema.Record(Schema.String, Schema.Array(JumpRequirement))),
})
export type JumpPack = typeof JumpPack.Type
export interface MethodOrigin { readonly pack: string; readonly version: string; readonly id: string }
export interface RequirementOrigin extends JumpRequirement { readonly pack: string; readonly version: string }
export interface JumpBinding {
	readonly slot: JumpSlot
	readonly label: string
	readonly loop: 'discovery' | 'delivery'
	readonly purpose: string
	readonly method: MethodOrigin
	readonly availableMethods: ReadonlyArray<MethodOrigin>
	readonly requirements: ReadonlyArray<RequirementOrigin>
	readonly constraints: Readonly<Record<string, string | number | boolean>>
}
export interface ResolvedJumpPacks {
	readonly pack: Pack
	readonly bindings: ReadonlyArray<JumpBinding>
	readonly selected: ReadonlyArray<{ readonly name: string; readonly version: string }>
}

const slots = new Set<string>(JUMP_SLOTS.map((s) => s.id))
const invalid = (path: string, problems: string[]): never => {
	throw new MadeWellError({ code: 'cartridges_invalid', message: 'The jump packs do not resolve into one valid work contract.', context: { path, problems }, next: [{ run: 'mw cartridges', why: 'inspect the cartridge contract and resolve the named jump-pack problems before running' }] })
}
const decode = (value: unknown, path: string): JumpPack => {
	try { return Schema.decodeUnknownSync(JumpPack, { onExcessProperty: 'error' })(value) }
	catch (cause) { return invalid(path, [String(cause)]) }
}

type JsonSchema = Record<string, unknown>
const string = { type: 'string' }
const strings = { type: 'array', items: string }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)): JsonSchema => ({ type: 'object', properties, required })
const outcomes = { type: 'array', items: object({ id: string, description: string }) }
const ordinary = object({ result: string, evidence: strings, unknowns: strings })
const confirmation = object({
	result: string, unknowns: strings,
	items: { type: 'array', items: object({
		id: string, title: string, objective: string, text: string,
		kind: { type: 'string', enum: ['outcome', 'prerequisite', 'research', 'decision'] },
		outcomeRefs: strings, after: { type: 'array', items: { type: 'integer' } },
	}) },
	outcomes,
	intentChanges: { type: 'array', items: object({ id: string, sourceRefs: strings, rationale: string }) },
	coverage: { type: 'array', items: object({
		outcome: string, candidates: strings,
		disposition: { type: 'string', enum: ['represented', 'unresolved', 'declined'] }, reason: string,
	}) },
}, ['result', 'unknowns', 'items', 'outcomes', 'coverage'])

/** Only the schema vocabulary the current function runtime actually checks is accepted. */
function schemaProblems(schema: JsonSchema, path: string, root = true): string[] {
	const problems: string[] = []
	const allowed = new Set(['type', 'properties', 'required', 'items', 'enum', 'anyOf', 'description'])
	for (const key of Object.keys(schema)) if (!allowed.has(key)) problems.push(`${path}: unsupported schema keyword ${key}.`)
	if (root && schema.type !== 'object') problems.push(`${path}: a method schema must declare type object.`)
	if (root && schema.anyOf !== undefined) problems.push(`${path}: root anyOf would bypass the common output contract.`)
	if (schema.anyOf !== undefined && Object.keys(schema).some((key) => key !== 'anyOf' && key !== 'description')) problems.push(`${path}: anyOf cannot have sibling validation keywords in this runtime.`)
	if (schema.type !== undefined && ![schema.type].flat().every((t) => ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(String(t)))) problems.push(`${path}: invalid schema type.`)
	if (schema.required !== undefined && (!Array.isArray(schema.required) || !schema.required.every((k) => typeof k === 'string'))) problems.push(`${path}: required must be an array of property names.`)
	if (schema.enum !== undefined && !Array.isArray(schema.enum)) problems.push(`${path}: enum must be an array.`)
	const child = (value: unknown, at: string) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) problems.push(`${at}: a schema must be an object.`)
		else problems.push(...schemaProblems(value as JsonSchema, at, false))
	}
	if (schema.properties !== undefined) {
		if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) problems.push(`${path}: properties must be an object.`)
		else for (const [key, value] of Object.entries(schema.properties)) child(value, `${path}.${key}`)
	}
	if (schema.items !== undefined) child(schema.items, `${path}.items`)
	if (schema.anyOf !== undefined) {
		if (!Array.isArray(schema.anyOf) || !schema.anyOf.length) problems.push(`${path}: anyOf must contain schemas.`)
		else schema.anyOf.forEach((value, i) => child(value, `${path}.anyOf[${i}]`))
	}
	return problems
}

function outputFor(slot: JumpSlot, extension?: JsonSchema): JsonSchema {
 if(slot==='verification') return object({acceptance:object({verdict:{enum:['passed','failed']},conditionHash:string,evidence:{type:'array',items:object({conditionId:string,detail:string,refs:strings})}}),result:string,evidence:strings,unknowns:strings})
	const base = slot === 'confirm' ? confirmation : slot === 'declare' ? object({ result: string, evidence: strings, unknowns: strings, outcomes }) : ordinary
	if (!extension) return structuredClone(base)
	const original = base.properties as Record<string, unknown>
	const extra = extension.properties as Record<string, unknown> | undefined ?? {}
	const changed = Object.keys(extra).filter((key) => Object.hasOwn(original, key) && JSON.stringify(extra[key]) !== JSON.stringify(original[key]))
	if (changed.length) invalid(`jump-pack:${slot}`, changed.map((key) => `${slot}: output extension cannot redefine common property ${key}.`))
	return { ...extension, ...base, properties: { ...extra, ...original }, required: [...new Set([...(base.required as string[]), ...((extension.required as string[] | undefined) ?? [])])] }
}

/** One effective method per obligation; added requirements retain their own domain provenance. */
export function resolveJumpPacks(given: ReadonlyArray<JumpPack>, selections: Readonly<Partial<Record<JumpSlot, string>>> = {}): ResolvedJumpPacks {
	if (!Array.isArray(given)) invalid('jump-packs', ['Select an array of jump packs.'])
	try { Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.NonEmptyString))(selections) }
	catch (cause) { invalid('jump-packs:selections', [String(cause)]) }
	const packs = given.map((p, i) => decode(p, `jump-pack:${i}`)).sort((a, b) => a.name.localeCompare(b.name))
	const problems: string[] = []
	const names = new Set<string>()
	for (const pack of packs) {
		if (names.has(pack.name)) problems.push(`Duplicate selected pack ${pack.name}; select exactly one version.`)
		names.add(pack.name)
		for (const key of [...Object.keys(pack.methods ?? {}), ...Object.keys(pack.requirements ?? {})]) if (!slots.has(key)) problems.push(`${pack.name}: unknown function ${key}.`)
		for (const [slot, method] of Object.entries(pack.methods ?? {})) {
			if (method.run ? !!method.profile : !method.profile || !method.duty) problems.push(`${pack.name}/${slot}: provide either a trusted run command or an agent profile and duty.`)
			if (method.args && Object.hasOwn(method.args, 'contract')) problems.push(`${pack.name}/${slot}: args.contract is reserved for resolved provenance.`)
			for (const [kind, schema] of [['input', method.input], ['output', method.output]] as const) if (schema) problems.push(...schemaProblems(schema, `${pack.name}/${slot}.${kind}`))
		}
		for (const [slot, requirements] of Object.entries(pack.requirements ?? {})) {
			const ids = new Set<string>()
			for (const r of requirements) {
				if (ids.has(r.id)) problems.push(`${pack.name}/${slot}: duplicate requirement ${r.id}.`)
				ids.add(r.id)
			}
		}
	}
	for (const slot of Object.keys(selections)) if (!slots.has(slot)) problems.push(`Selection names unknown function ${slot}.`)
	if (problems.length) invalid('jump-packs', problems)
	const bindings: JumpBinding[] = []
	const nodes: Record<'discovery' | 'delivery', Pack['delivery'][number]['steps'][number][]> = { discovery: [], delivery: [] }
	for (const slot of JUMP_SLOTS) {
		const available = packs.flatMap((pack) => pack.methods?.[slot.id] ? [{ pack, method: pack.methods[slot.id]! }] : [])
		const specialized = available.filter((m) => !m.method.fallback)
		const eligible = selections[slot.id] ? available.filter((m) => m.pack.name === selections[slot.id]) : specialized.length ? specialized : available
		if (eligible.length !== 1) {
			problems.push(`${slot.id}: ${eligible.length ? `choose one method explicitly from ${eligible.map((m) => m.pack.name).join(', ')}` : selections[slot.id] ? `selected pack ${selections[slot.id]} provides no method` : 'no method supplies this required obligation'}.`)
			continue
		}
		const chosen = eligible[0]!
		const origin = ({ pack, method }: typeof chosen): MethodOrigin => ({ pack: pack.name, version: pack.version, id: method.id })
		const requirements = packs.flatMap((pack) => (pack.requirements?.[slot.id] ?? []).map((r) => ({ ...r, pack: pack.name, version: pack.version })))
		const constraints = new Map<string, string | number | boolean>()
		const owners = new Map<string, string>()
		for (const r of requirements) for (const [key, value] of Object.entries(r.constraints ?? {})) {
			if (constraints.has(key) && constraints.get(key) !== value) problems.push(`${slot.id}: constraint ${key} conflicts between ${owners.get(key)} and ${r.pack}/${r.id}.`)
			else { constraints.set(key, value); owners.set(key, `${r.pack}/${r.id}`) }
		}
		const binding: JumpBinding = { slot: slot.id, label: slot.label, loop: slot.loop, purpose: slot.purpose, method: origin(chosen), availableMethods: available.map(origin), requirements, constraints: Object.fromEntries(constraints) }
		bindings.push(binding)
		const { id: _id, fallback: _fallback, output, args, ...method } = chosen.method
		// Available alternatives are console metadata, not an execution input to unrelated accepted work.
		const { availableMethods: _alternatives, ...contract } = binding
		nodes[slot.loop].push({ ...method,replay:'safe',writes:[], job: slot.id, receives: nodes[slot.loop].map((n) => n.job), output: outputFor(slot.id, output), args: { ...args, contract } })
	}
	if (problems.length) invalid('jump-packs', problems)
	const selected = packs.map(({ name, version }) => ({ name, version }))
	const pack: Pack = {
		name: 'jump-pack-lab', version: selected.map((p) => `${p.name}@${p.version}`).join('+'), runtime:'functions',contracts:{execution:'2'},completion:{resultJob:'implementation',acceptanceJob:'verification'},
		brief: 'This is an opt-in jump-pack experiment. Read args.contract for the effective function, method and every contributing requirement. Discovery prepares raw notes and discussion into usable intent; it is not literal extraction of a predetermined task list. Early outcomes are provisional anchors: clarify their meaning as evidence accumulates, retain their identities for traceability, and explain consequential clarifications using source references and the DX, UX and AX rubric already supplied. Preserve uncertainty and distinguish a sourced clarification from an unsupported assumption. Candidate proposals are distinct from execution authority: missing permission never means silently removing a potential outcome. Preparatory tasks retain the outcome they support. Return concise concrete findings, actual evidence and explicit unknowns; do not invent industry rules, project bindings or completed actions. Follow the declared output schema. Declare stable outcome ids. Clarify descriptions as evidence develops; include new outcomes with sourceRefs and rationale in intentChanges, and account for original and added outcomes in coverage. Silent renaming is invalid. Confirm references those ids from candidate outcomeRefs and coverage, names candidates by stable ids, and uses after only for genuine dependencies as 1-based positions of earlier items. Candidate text carries its scope, completion conditions and unresolved inputs so delivery can understand it. Coverage links are inspectable claims, not proof of semantic completeness. Verification must report actual checks and honest failure or uncertainty; accepted JSON shape alone never establishes a successful outcome.',
		discovery: [{ cartridge: 'discovery', steps: nodes.discovery }],
		delivery: nodes.delivery.map((step) => ({ cartridge: step.job, steps: [step] })),
	}
	const errors = problemsOf(pack)
	if (errors.length) invalid('jump-packs:resolved', errors)
	return { pack, bindings, selected }
}

/** Read explicit local files only; loading never installs a pack or grants execution authority. */
export const loadJumpPack = (path: string) => Effect.try({
	try: () => readFileSync(path, 'utf8'),
	catch: (cause) => new MadeWellError({ code: 'cartridges_unreadable', message: `Cannot read jump pack ${path}.`, context: { path, reason: String(cause) }, next: [{ run: 'mw cartridges', why: 'inspect available cartridge contracts before selecting another local pack' }] }),
}).pipe(Effect.flatMap((text) => Effect.try({
	try: () => decode(JSON.parse(text), path),
	catch: (cause) => cause instanceof MadeWellError ? cause : new MadeWellError({ code: 'cartridges_invalid', message: `Jump pack ${path} is not valid JSON.`, context: { path, problems: [String(cause)] }, next: [{ run: 'mw cartridges', why: 'inspect the contract and correct the selected pack file' }] }),
})))

export const loadJumpPacks = (paths: ReadonlyArray<string>) => Effect.all(paths.map(loadJumpPack))
