import { resolve } from 'node:path'
import { Effect } from 'effect'
import { AUTONOMY_PACK } from './autonomy-pack.ts'
import { MadeWellError } from './errors.ts'
import { loadPack, type Pack } from './lane.ts'

/** Resolve public selectors above the pack definitions, preserving complete item pinning. */
export const resolvePackSelection = Effect.fn('mw.resolvePackSelection')(function* (selection?: string) {
	if (selection === undefined) return { source: 'default', pack: undefined as Pack | undefined }
	if (selection === 'builtin:grammar') return { source: selection, pack: AUTONOMY_PACK }
	if (selection.startsWith('builtin:')) return yield* new MadeWellError({
		code: 'cartridges_invalid', message: `Unknown built-in cartridge selector ${selection}.`,
		context: { path: selection, problems: ['Unknown built-in cartridge selector. Supported selector: builtin:grammar.'] },
		next: [{ run: 'mw cartridges --check builtin:grammar', why: 'inspect the supported built-in grammar pack' }],
	})
	const source = resolve(selection)
	return { source, pack: yield* loadPack(source) }
})
