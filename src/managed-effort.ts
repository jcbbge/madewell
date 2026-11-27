// Managed preparation policy is host authority, never package or client authority.
import { createHash } from 'node:crypto'
import { Context, Effect, Layer, Option } from 'effect'
import { z } from 'zod'
import { MadeWellError } from './errors.ts'

const text = z.string().refine(value => !!value.trim() && !value.includes('\0'))
const variant = z.object({ instructions: text, stopping: text, evidence: text }).strict()
/** Explicit binding args.effortRecipes data, not ordinary skill frontmatter. */
export const EffortDeclaration = z.object({
	version: z.literal(1), default: text, variants: z.record(text, variant),
}).strict()
export const ResolvedEffort = z.object({
	version: z.literal(1), requested: z.unknown(), bindingSelection: z.unknown(), effective: text,
	methodIdentity: text, occurrence: text, sourceIdentity: text,
	declaration: z.string().nullable(), declarationDigest: text.nullable(),
	instructionBytes: z.string(), instructions: text, stopping: text, evidence: text,
	expansions: z.array(z.object({ address: text, origin: text, requested: text.nullable(), effective: text,
		declaration: text, declarationDigest: text, expansionIdentity: text,
	})).optional(),
	classification: z.enum(['free-light', 'protected']), digest: text,
})
export type ResolvedEffort = z.infer<typeof ResolvedEffort>
export interface EffortBinding {
	readonly root: string
	readonly storeScope: string
	readonly revision: string
	readonly occurrence: string
	readonly methodIdentity: string
	readonly sourceIdentity: string
	readonly recipeDigest: string
}
export type EffortDecision = { readonly allowed: true; readonly provenance: string; readonly binding: EffortBinding }
	| { readonly allowed: false; readonly reason: string }
export interface ManagedEffortPolicy {
	/** Must be synchronous, side-effect-free, and based only on trusted host facts. */
	readonly decide: (binding: Readonly<EffortBinding>, recipe: Readonly<ResolvedEffort>) => EffortDecision
}
export class ManagedEffortAccess extends Context.Service<ManagedEffortAccess, ManagedEffortPolicy>()('madewell/ManagedEffortAccess') {}
export const defaultManagedEffortAccess: ManagedEffortPolicy = {
	decide: (binding, recipe) => recipe.effective === 'light' && !recipe.expansions?.some(choice => choice.effective !== 'light')
		? { allowed: true, provenance: 'builtin:free-light/1', binding }
		: { allowed: false, reason: 'Protected managed preparation is unavailable without trusted host access.' },
}
export const managedEffortAccessLayer = Layer.succeed(ManagedEffortAccess, defaultManagedEffortAccess)
/** Optional host Effect provision; adapters do not accept a policy in client configuration. */
export const currentManagedEffortAccess = Effect.serviceOption(ManagedEffortAccess).pipe(
	Effect.map(value => Option.getOrElse(value, () => defaultManagedEffortAccess)),
)
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const fail = (message: string, context: Record<string, unknown>) => new MadeWellError({
	code: 'portable_invalid', message, context,
	next: [{ run: 'inspect_work', why: 'Inspect the pinned method and exact requested effort; no substitution or execution occurred.' }],
})

/** The only effort resolver. No inference from skill names, prose, constraints or model settings. */
export function resolveManagedEffort(input: {
	readonly requested?: unknown; readonly bindingSelection?: unknown; readonly declaration?: unknown
	readonly methodIdentity: string; readonly occurrence: string; readonly sourceIdentity: string
	readonly instructionBytes: string
	readonly expansions?: ResolvedEffort['expansions']
}): ResolvedEffort {
	let declaration: z.infer<typeof EffortDeclaration> | undefined
	if (input.declaration !== undefined) {
		let data = input.declaration
		if (typeof data === 'string') {
			try { data = JSON.parse(data) }
			catch { throw fail('The explicit effort recipe declaration is not JSON.', { requestedEffort: input.requested ?? null, declaration: input.declaration }) }
		}
		const parsed = EffortDeclaration.safeParse(data)
		if (!parsed.success) throw fail('The explicit effort recipe declaration is unsupported.', { requestedEffort: input.requested ?? null, declaration: input.declaration, problems: parsed.error.issues })
		declaration = parsed.data
		if (!Object.hasOwn(declaration.variants, declaration.default)) throw fail('The authored default has no recipe.', { declaration: input.declaration })
	}
	const requested = input.requested === undefined ? null : input.requested
	const bindingSelection = input.bindingSelection === undefined ? null : input.bindingSelection
	const selected = input.requested !== undefined ? input.requested : input.bindingSelection !== undefined ? input.bindingSelection : declaration?.default ?? 'light'
	// A request-level cosmetic Light must not erase a protected nested binding.
	if (input.requested !== undefined && input.bindingSelection !== undefined && input.bindingSelection !== 'light' && input.requested !== input.bindingSelection) {
		throw fail('Requested effort conflicts with an explicitly selected nested recipe.', { requestedEffort: requested, bindingSelection, occurrence: input.occurrence })
	}
	if (typeof selected !== 'string' || (declaration ? !Object.hasOwn(declaration.variants, selected) : selected !== 'light')) {
		throw fail('This pinned method does not author the requested effort. No universal recipe or downgrade was substituted.', {
			requestedEffort: requested, bindingSelection, occurrence: input.occurrence, availableEffort: declaration ? Object.keys(declaration.variants) : ['light'],
		})
	}
	const recipe = declaration?.variants[selected]
	// A string declaration retains original JSON whitespace/Unicode bytes as well
	// as each instruction string. Object declarations retain their JSON data bytes.
	const declarationBytes = input.declaration === undefined ? null : typeof input.declaration === 'string' ? input.declaration : JSON.stringify(input.declaration)
	const body = {
		version: 1 as const, requested, bindingSelection, effective: selected,
		methodIdentity: input.methodIdentity, occurrence: input.occurrence, sourceIdentity: input.sourceIdentity,
		declaration: declarationBytes, declarationDigest: declarationBytes === null ? null : hash(declarationBytes),
		instructionBytes: input.instructionBytes,
		instructions: recipe?.instructions ?? input.instructionBytes,
		stopping: recipe?.stopping ?? 'As defined by the pinned method; no additional effort variant is declared.',
		evidence: recipe?.evidence ?? 'Report only work actually performed under the pinned method; missing evidence remains explicit.',
		...(input.expansions?.length ? { expansions: input.expansions } : {}),
		classification: selected === 'light' && !input.expansions?.some(choice => choice.effective !== 'light') ? 'free-light' as const : 'protected' as const,
	}
	return { ...body, digest: hash(JSON.stringify(body)) }
}

/** Call only inside a new Store.request callback, after ordinary work/material authorization. */
export function authorizeManagedEffort(policy: ManagedEffortPolicy, recipe: ResolvedEffort, scope: Pick<EffortBinding, 'root' | 'storeScope' | 'revision'>) {
	const binding: EffortBinding = { ...scope, occurrence: recipe.occurrence, methodIdentity: recipe.methodIdentity, sourceIdentity: recipe.sourceIdentity, recipeDigest: recipe.digest }
	// Classification is service-owned even if a caller supplies a fabricated
	// resolved object to this public seam. Package data cannot mark Deep free.
	if (recipe.effective === 'light' && !recipe.expansions?.some(choice => choice.effective !== 'light')) return { allowed: true as const, provenance: 'builtin:free-light/1', binding }
	const decision = policy.decide(Object.freeze({ ...binding }), Object.freeze({ ...recipe }))
	if (!decision || decision.allowed !== true || typeof decision.provenance !== 'string' || !decision.provenance.trim()
		|| !decision.binding || Object.keys(binding).some(key => decision.binding[key as keyof EffortBinding] !== binding[key as keyof EffortBinding])) {
		throw new MadeWellError({ code: 'brainstorm_entitlement_unavailable',
			message: 'The selected protected managed recipe requires current trusted host access. No downgrade or purchase occurred.',
			context: { ...binding, requestedEffort: recipe.requested, effectiveEffort: recipe.effective, entitlement: 'unavailable', reason: decision?.allowed === false ? decision.reason : 'No matching synchronous trusted grant.', availableEffort: ['light'] },
			next: [{ run: 'inspect_work', why: 'Preserve the draft; inspect available authored Light recipes or obtain access through the trusted host.' }],
		})
	}
	return { allowed: true as const, provenance: decision.provenance, binding }
}
export type ManagedEffortAuthorization = ReturnType<typeof authorizeManagedEffort>

/** Versioned adapter for the shipped, pinned Brainstorm effort table, not prose-based access detection. */
export function brainstormEffortDeclaration(content: string) {
	const labels = { light: '| **Light** — default |', focused: '| **Focused** |', deep: '| **Deep** |' }
	const variants = Object.fromEntries(Object.entries(labels).map(([name, prefix]) => {
		const row = content.split('\n').find(line => line.startsWith(prefix))
		const cells = row?.split('|')
		if (!cells || cells.length !== 5) throw fail('The pinned Brainstorm effort table does not match its versioned adapter.', { name })
		return [name, { instructions: cells[2]!.trim(), stopping: cells[3]!.trim(), evidence: content }]
	}))
	return { version: 1 as const, default: 'light', variants }
}

/** Performed labels are attributed reports, never entitlement or independent verification. */
export function assertPerformedEffort(performed: string, effective: string, recipe?: ResolvedEffort): void {
	if (performed === effective) return
	// Only Brainstorm's authored presets have this known partial-work ordering.
	const authored = recipe?.sourceIdentity === 'brainstorm:references/effort.md/1'
	const presets = ['light', 'focused', 'deep']
	if (authored && presets.includes(performed) && presets.includes(effective) && presets.indexOf(performed) < presets.indexOf(effective)) return
	throw fail('Reported performed effort is not supported by the prepared recipe; describe limitations without claiming stronger work.', { performedEffort: performed, effectiveEffort: effective, recipeDigest: recipe?.digest ?? null })
}
