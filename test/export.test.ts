import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { MadeWellError } from '../src/errors.ts'
import { exportItem } from '../src/export.ts'
import { openStore } from '../src/store.ts'

test('an export destination belongs to one durable task; conflicts write nothing and same-task refresh preserves unrelated files', async () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-export-owner-'))
	const store = openStore(join(root, 'work.db'))
	try {
		const first = store.create({ title: 'First task', objective: 'Keep the first evidence.', source: 'first', workspace: root })
		const second = store.create({ title: 'Second task', objective: 'Keep the second evidence.', source: 'second', workspace: root })
		store.recordCall({ item: first.id, kind: 'execute', job: 'ideate', profile: 'ideator', card: { harness: 'claude', provider: 'fixture', account: 'fixture', model: 'fixture', effort: 'low' }, system: 'First brief.', prompt: 'First packet.', output: 'First answer.', raw: null, error: null, outcome: 'ok', started: first.created, ms: 1 })
		const dir = join(root, 'export')
		assert.deepEqual(await Effect.runPromise(exportItem(store, first.id, dir)), { dir, calls: 1 })
		writeFileSync(join(dir, 'operator-note.txt'), 'Keep this unrelated file exactly.')
		const snapshot = () => Object.fromEntries(readdirSync(dir, { recursive: true }).map(file => String(file)).filter(file => statSync(join(dir, file)).isFile()).sort().map(file => [file, readFileSync(join(dir, file))]))
		const before = snapshot()
		const rejected = await Effect.runPromise(Effect.flip(exportItem(store, second.id, dir)))
		assert.ok(rejected instanceof MadeWellError)
		assert.equal(rejected.code, 'export_failed')
		assert.deepEqual(rejected.context, { id: second.id, dir, reason: 'Existing item.json belongs to a different task or has no matching task identity.' })
		assert.equal(rejected.next[0]!.run, `mw export ${second.id} --out <fresh dir>`)
		assert.deepEqual(snapshot(), before, 'the original task, call packets, artifact history and unrelated file are byte-for-byte intact')

		store.note(first.id, 'fixture-refreshed', { evidence: 'A new event on the same task.' })
		assert.deepEqual(await Effect.runPromise(exportItem(store, first.id, dir)), { dir, calls: 1 })
		assert.equal(readFileSync(join(dir, 'operator-note.txt'), 'utf8'), 'Keep this unrelated file exactly.')
		assert.equal(readFileSync(join(dir, '001-execute-ideate/packet.txt'), 'utf8'), 'First packet.')
		assert.equal(JSON.parse(readFileSync(join(dir, 'item.json'), 'utf8')).events.at(-1).kind, 'fixture-refreshed')

		const fresh = join(root, 'second-export')
		assert.deepEqual(await Effect.runPromise(exportItem(store, second.id, fresh)), { dir: fresh, calls: 0 })
		assert.equal(JSON.parse(readFileSync(join(fresh, 'item.json'), 'utf8')).item.id, second.id)
		assert.deepEqual(readdirSync(fresh).sort(), ['artifacts', 'item.json'])
		writeFileSync(join(dir, 'item.json'), '{broken')
		const malformedBefore = snapshot()
		const malformed = await Effect.runPromise(Effect.flip(exportItem(store, first.id, dir)))
		assert.equal(malformed.code, 'export_failed')
		assert.deepEqual(snapshot(), malformedBefore, 'unknown ownership also refuses before writing')
	} finally { store.close(); rmSync(root, { recursive: true, force: true }) }
})
