// Optional Beta Skills serving only; the host owns activation, consent and tool grants.
import { isDeepStrictEqual } from 'node:util'
import { Effect } from 'effect'
import { memorySkillFiles, SkillCatalogError, SkillsExtension } from '@modelcontextprotocol/server/ext/skills'
import { brainstormMethods, brainstormSeedRoot } from './brainstorm-seed.ts'
import type { BrainstormPackage } from './brainstorm.ts'
import { MadeWellError, errorJson } from './errors.ts'

/**
 * Supply the shared brainstorm.ts pinning helper, not another provenance validator.
 * It must reject missing as well as changed/uninventoried runtime files against
 * PROVENANCE.json and return the complete SKILL.md/references/assets snapshot.
 * This adapter supplies only the shipped seed root and approved method names.
 */
export type PinBrainstormPackage = (seedDirectory: string, name: string) => BrainstormPackage

const failure = (cause: unknown): MadeWellError => {
	if (cause instanceof MadeWellError && cause.code === 'mcp_failed') return cause
	return new MadeWellError({
		code: 'mcp_failed', message: 'The optional approved Brainstorm Skills catalog could not be acquired. No partial catalog was attached.',
		context: {
			component: 'brainstorm-skills', seedDirectory: brainstormSeedRoot,
			...(cause instanceof SkillCatalogError ? { problems: cause.problems }
				: cause instanceof MadeWellError ? { problem: errorJson(cause) }
					: cause instanceof Error ? { reason: cause.message }
						: typeof cause === 'object' && cause !== null ? { facts: cause } : { reason: String(cause) }),
		},
		next: [{ run: 'mw', why: 'Inspect the command reference. Restore the approved shipped Brainstorm runtime files and PROVENANCE.json from the same distribution, then restart MCP with the original arguments; do not edit method bytes or bypass integrity validation. Leave optional Skills disabled until the shared pinning helper validates complete runtime inventories.' }],
	})
}

/**
 * Call only when optional Skills is selected, then attach the result before
 * connecting the server, inside the caller's Effect error/lifecycle boundary.
 * SDK attach is experimental in 2.4.0. No Store, root discovery, worker or host
 * consent service is acquired. The private memory snapshot needs no finalizer;
 * the caller owns server teardown. Disk changes require a fresh acquisition.
 *
 * skills/list and skills/get expose metadata, never instruction bodies. The
 * SDK serves exact file bytes via resources/read and publishes `digest`, not
 * `sha256`. Reading is not activation; nested activation needs fresh host
 * consent, and allowed-tools grants no authority here.
 */
export const acquireBrainstormSkills = Effect.fn('mw.acquireBrainstormSkills')(function*(pinApprovedPackage: PinBrainstormPackage) {
	const packages = yield* Effect.try({
		try: () => brainstormMethods.map(name => {
			const pkg = pinApprovedPackage(brainstormSeedRoot, name)
			if (pkg.name !== name) throw failure({ method: name, reason: 'The shared pinning helper returned another method.' })
			return pkg
		}),
		catch: failure,
	})
	const files = yield* Effect.try({
		try: () => {
			const files: Record<string, Uint8Array> = Object.create(null)
			for (const pkg of packages) {
				const paths = new Set<string>()
				for (const file of pkg.files) {
					const path = file.path
					if (!(path === 'SKILL.md' || path.startsWith('references/') || path.startsWith('assets/'))
						|| path.includes('\\') || path.includes('\0')
						|| path.split('/').some(segment => !segment || segment.startsWith('.')) || paths.has(path)) {
						throw failure({ method: pkg.name, path, reason: 'Only unique normalized runtime file paths are supported.' })
					}
					paths.add(path)
					// The shared loader decodes fatal, BOM-preserving UTF-8. The SDK
					// computes digests over this encoding; compare below to the pin.
					files[`${pkg.name}/${path}`] = Buffer.from(file.content, 'utf8')
				}
				if (!paths.has('SKILL.md') || paths.size !== pkg.manifest.length
					|| pkg.manifest.some(file => !paths.has(file.path))) {
					throw failure({ method: pkg.name, reason: 'The shared runtime manifest and retained files are incomplete or inconsistent.' })
				}
			}
			return files
		},
		catch: failure,
	})
	const catalog = yield* Effect.tryPromise({
		try: () => SkillsExtension.load(memorySkillFiles(files), {
			prefix: 'madewell/brainstorm', strict: true,
			cacheHint: { ttlMs: 0, cacheScope: 'private' },
			// Keep the SDK's 512-file / 16-MiB per-skill limits. Even warnings
			// outside strict validation fail closed without console output.
			onWarning: warning => { throw failure({ problems: [warning] }) },
		}),
		catch: failure,
	})
	return yield* Effect.try({
		try: (): SkillsExtension => {
			if (catalog.entries.length !== packages.length) throw failure({ reason: 'The SDK catalog does not contain exactly the approved methods.' })
			for (const pkg of packages) {
				const base = `skill://madewell/brainstorm/${pkg.name}/`
				const entry = catalog.entries.find(entry => entry.uri === `${base}SKILL.md`)
				// Compare JSON data, not the shared loader's null prototypes.
				if (!entry || !isDeepStrictEqual(entry.frontmatter, JSON.parse(JSON.stringify(pkg.frontmatter)))
					|| !Array.isArray(entry.resources) || entry.resources.length !== pkg.files.length) {
					throw failure({ method: pkg.name, reason: 'The SDK changed frontmatter or omitted runtime manifest entries.' })
				}
				for (const file of pkg.files) {
					const uri = base + file.path.split('/').map(encodeURIComponent).join('/')
					const resource = entry.resources.find(resource => resource.uri === uri)
					const manifested = pkg.manifest.find(manifested => manifested.path === file.path)
					if (!resource || resource.size !== file.bytes || resource.digest !== `sha256:${file.sha256}`
						|| !manifested || manifested.bytes !== file.bytes || manifested.sha256 !== file.sha256) {
						throw failure({ method: pkg.name, path: file.path, reason: 'The bytes offered by the SDK differ from the shared approved pin.' })
					}
				}
			}
			return catalog
		},
		catch: failure,
	})
})
