// node:sqlite, loaded without Node 22's "SQLite is an experimental feature" warning: every command's stderr
// is JSON an agent parses, and that line broke it. Only that one warning is silenced.
import { createRequire } from 'node:module'
import type * as Sqlite from 'node:sqlite'

const load = (): typeof Sqlite => {
	const emit = process.emitWarning
	process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
		if (!String(warning instanceof Error ? warning.message : warning).includes('SQLite')) (emit as (...a: unknown[]) => void).call(process, warning, ...rest)
	}) as typeof process.emitWarning
	try {
		return createRequire(import.meta.url)('node:sqlite')
	} finally {
		process.emitWarning = emit
	}
}

export const { DatabaseSync } = load()
export type DatabaseSync = Sqlite.DatabaseSync
