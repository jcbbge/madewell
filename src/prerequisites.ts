// Explicit provisioned inputs. Logical discovery citations are never interpreted as filesystem paths.
import { createHash } from 'node:crypto'
import { accessSync, constants, readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { Schema } from 'effect'

const Text = Schema.NonEmptyString.check(Schema.makeFilter(value => !!value.trim() && !value.includes('\0'), { toJsonSchema: () => [{}, true] }))
export const Prerequisite = Schema.Struct({
	id: Text.annotate({ description: 'a unique declared input identity, referenced by environment evidence as input:<id>' }),
	path: Text.annotate({ description: 'an explicit absolute host path or a path relative to the scratch; relative paths cannot leave that scratch' }),
	kind: Schema.Literals(['file', 'dir', 'exec']),
	jobs: Schema.optionalKey(Schema.Array(Text).check(Schema.isMinLength(1), Schema.makeFilter(values => new Set(values).size === values.length, { toJsonSchema: () => [{}, true] })).annotate({ description: 'only these receiving jobs require this input; absent means every job' })),
	sha256: Schema.optionalKey(Schema.String.check(Schema.makeFilter(value => /^[a-f0-9]{64}$/i.test(value), { toJsonSchema: () => [{ pattern: '^[a-fA-F0-9]{64}$' }, true] }))),
}).check(Schema.makeFilter(input => input.kind !== 'dir' || input.sha256 === undefined || 'A directory prerequisite cannot declare a file checksum.', { toJsonSchema: () => [{}, true] }))
export type Prerequisite = typeof Prerequisite.Type

export interface PrerequisiteCheck {
	readonly id: string
	readonly path: string
	readonly kind: Prerequisite['kind']
	readonly ok: boolean
	readonly reason: string | null
	readonly sha256?: string
}

const applies = (input: Prerequisite, job: string) => input.jobs === undefined || input.jobs.includes(job)
const duplicate = (inputs: ReadonlyArray<Prerequisite>, id: string) => inputs.filter(input => input.id === id).length !== 1

/** Resolve a declared environment input, without pretending that a name proves its availability. */
export function prerequisiteForReference(inputs: ReadonlyArray<Prerequisite> | undefined, ref: string, job = 'verify'):
	{ readonly ok: true; readonly input: Prerequisite } | { readonly ok: false; readonly reason: string } {
	if (!ref.startsWith('input:') || !ref.slice(6)) return { ok: false, reason: 'Environment evidence must use input:<id> for an explicitly declared input.' }
	const id = ref.slice(6), registered = inputs ?? []
	const input = registered.find(entry => entry.id === id)
	if (!input) return { ok: false, reason: `Environment input ${id} has no declared binding. Supply its expected path and kind through settings.inputs.` }
	if (duplicate(registered, id)) return { ok: false, reason: `Environment input ${id} has multiple bindings; declared input IDs must be unique.` }
	if (!applies(input, job)) return { ok: false, reason: `Environment input ${id} is not supplied to the ${job} job.` }
	return { ok: true, input }
}

/** Actual filesystem checks after preparation, before the receiving job. Missing inputs return NQ evidence. */
export function checkPrerequisites(inputs: ReadonlyArray<Prerequisite> | undefined, job: string, dir: string): PrerequisiteCheck[] {
	const registered = inputs ?? [], root = resolve(dir)
	return registered.filter(input => applies(input, job)).map(input => {
		const path = resolve(root, input.path)
		const failed = (reason: string, sha256?: string): PrerequisiteCheck => ({ id: input.id, path, kind: input.kind, ok: false, reason, ...(sha256 === undefined ? {} : { sha256 }) })
		if (duplicate(registered, input.id)) return failed('Declared input IDs must be unique; this input has multiple bindings.')
		const inside = relative(root, path)
		if (!isAbsolute(input.path) && (inside === '..' || inside.startsWith('..' + sep))) return failed('The relative input path leaves the receiving scratch; supply an explicit permitted host binding instead.')
		if (input.sha256 !== undefined && (input.kind === 'dir' || !/^[a-f0-9]{64}$/i.test(input.sha256))) return failed('A checksum must be 64 hexadecimal characters and apply to a file or executable.')
		try {
			if (!isAbsolute(input.path)) {
				const target = relative(realpathSync(root), realpathSync(path))
				if (target === '..' || target.startsWith('..' + sep) || isAbsolute(target)) return failed('The relative input resolves outside the receiving scratch; supply an explicit permitted host binding instead.')
			}
			const stat = statSync(path)
			if (input.kind === 'dir' ? !stat.isDirectory() : !stat.isFile()) return failed(`Expected ${input.kind}; the available path has a different type.`)
			accessSync(path, constants.R_OK | (input.kind === 'file' ? 0 : constants.X_OK))
			const sha256 = input.sha256 === undefined ? undefined : createHash('sha256').update(readFileSync(path)).digest('hex')
			if (sha256 !== undefined && sha256 !== input.sha256!.toLowerCase()) return failed('The input bytes do not match the declared SHA-256.', sha256)
			return { id: input.id, path, kind: input.kind, ok: true, reason: null, ...(sha256 === undefined ? {} : { sha256 }) }
		} catch (error) {
			const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unavailable'
			return failed(`The ${job} job cannot read the required ${input.kind} (${code}).`)
		}
	})
}
