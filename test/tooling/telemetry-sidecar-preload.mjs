import assert from 'node:assert/strict'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { isAbsolute } from 'node:path'

// Test-only OS interleaving. Observe no product internals and leave stdout/stderr untouched.
// The parent arms this only after a real stdio initialization and catalog read.
const storeFlag = process.argv.indexOf('--store')
assert.ok(storeFlag >= 2, 'preload requires an explicit --store argument')
const store = process.argv[storeFlag + 1]
assert.ok(store && isAbsolute(store), 'preload requires the disposable explicit --store')
const sidecar = store + '-wal', arm = store + '.arm-sidecar-interleaving'
const observed = store + '.observed-sidecar-interleaving.json'
const content = 'TEST-OWNED REGULAR SIDECAR — 雪 / 🦉\r\nCreated after real ENOENT, before the following lookup.  \r\n'
let injectedThisTurn = false, owned = null
const interleavings = []

function interleave(original, lookup) {
	return function (path, ...options) {
		if (!injectedThisTurn && String(path) === sidecar && fs.existsSync(arm)) {
			assert.equal(fs.existsSync(store), false, 'never synthesize sidecar churn alongside a real SQLite database')
			if (owned) {
				const entry = fs.lstatSync(sidecar)
				assert.ok(entry.isFile() && !entry.isSymbolicLink())
				assert.equal(entry.dev, owned.dev)
				assert.equal(entry.ino, owned.ino)
				assert.equal(entry.nlink, 1, 'never unlink a sidecar with another hardlink')
				assert.equal(fs.readFileSync(sidecar, 'utf8'), content, 'only unlink the exact test-owned bytes and inode')
				fs.unlinkSync(sidecar)
				owned = null
			}
			injectedThisTurn = true
			// Immediate synchronous re-resolution sees the regular entry. The next async
			// opportunity gets a new interleaving, so a metric export cannot consume it forever.
			queueMicrotask(() => { injectedThisTurn = false })
			try { return original.call(this, path, ...options) } catch (error) {
				if (error.code !== 'ENOENT') throw error
				assert.equal(fs.existsSync(sidecar), false, 'the failed lookup must genuinely precede creation')
				fs.writeFileSync(sidecar, content, { flag: 'wx' })
				const entry = fs.lstatSync(sidecar)
				owned = { dev: entry.dev, ino: entry.ino }
				interleavings.push({ sequence: interleavings.length + 1, event: 'regular-sidecar-after-realpath-ENOENT', path: sidecar, lookup, originalError: error.code, regular: entry.isFile(), symlink: entry.isSymbolicLink() })
				fs.writeFileSync(observed, JSON.stringify({ count: interleavings.length, interleavings }) + '\n', { flag: interleavings.length === 1 ? 'wx' : 'w' })
				throw error // Return the real failed lookup, despite the now-present regular entry.
			}
		}
		return original.call(this, path, ...options)
	}
}

const original = fs.realpathSync
const wrapped = interleave(original, 'realpathSync')
wrapped.native = interleave(original.native, 'realpathSync.native')
fs.realpathSync = wrapped
syncBuiltinESMExports()
