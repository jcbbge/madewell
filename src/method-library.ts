import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { MadeWellError } from './errors.ts'
import { loadSkillPackage, readGrantedFile } from './skill-package.ts'

/** A distribution-owned grant, never a path supplied by project configuration. */
export const methodLibraryRoot = fileURLToPath(new URL('../skills/method-library', import.meta.url))

const defaults: Readonly<Record<string, string>> = {
	'/discovery/declare': 'madewell-declaring-intent',
	'/discovery/look-first': 'madewell-looking-first',
	'/discovery/classify': 'madewell-classifying',
	'/discovery/lenses': 'madewell-applying-lenses',
	'/discovery/one-thing': 'madewell-shaping-candidates',
	'/discovery/route': 'madewell-routing',
	'/discovery/confirm': 'madewell-confirming',
	'/delivery/ideation': 'madewell-ideating',
	'/delivery/planning': 'madewell-planning',
	'/delivery/implementation': 'madewell-implementing',
	'/delivery/verification': 'madewell-verifying',
	'/landing': 'madewell-landing',
}
const provenance = z.object({
	kind: z.literal('pinned-source-inventory'), schemaVersion: z.literal(1),
	repository: z.literal('https://github.com/jcbbge/agent-core-public'),
	revision: z.string().regex(/^[a-f0-9]{40}$/), filesAreUnmodified: z.literal(true),
	files: z.array(z.object({ path: z.string(), sourcePath: z.string(), gitBlob: z.string().regex(/^[a-f0-9]{40}$/),
		bytes: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })),
})

/** Load only the selected default package, preserving its ordinary upstream bytes. */
export function loadDefaultMethod(address: string) {
	const name = defaults[address]
	if (!name) return undefined
	const inventory = provenance.parse(JSON.parse(readGrantedFile(methodLibraryRoot, resolve(methodLibraryRoot, 'PROVENANCE.json')).toString('utf8')))
	const snapshot = loadSkillPackage(methodLibraryRoot, name, 'runtime')
	const prefix = `${name}/`
	const expected = inventory.files.filter(file => file.path.startsWith(prefix))
	if (expected.length !== snapshot.manifest.length || snapshot.manifest.some(file => {
		const entries = expected.filter(entry => entry.path === prefix + file.path)
		return entries.length !== 1 || entries[0]!.bytes !== file.bytes || entries[0]!.sha256 !== file.sha256
	})) throw new MadeWellError({
		code: 'portable_stale', message: 'The selected default method does not match its pinned upstream inventory.',
		context: { address, name, revision: inventory.revision },
		next: [{ run: 'mw cartridges --inspect --root <directory>', why: 'Restore the intact distribution or explicitly bind a different ordinary skill; no builtin fallback was selected.' }],
	})
	return { snapshot, revision: inventory.revision }
}
