import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { revisionOf } from '../src/legacy.ts'
import { openStore } from '../src/store.ts'
import { contentHash, ownArtifact, preserveArtifact, savedArtifacts } from '../src/artifact-evidence.ts'

test('maker evidence survives reopening, deduplicates exact bytes and never crosses role/base/plan', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mw-artifact-')), path = join(dir, 'work.db')
	let store = openStore(path)
	try {
		const item = store.create({ title: 'Photo', objective: 'saved', source: 'operator', workspace: dir })
		const fixed = store.transition(item.id,revisionOf(store.get(item.id)),'planned',{},current=>({ ...current, outputs: { plan: '{"scope":["photo.js"]}' } }))
		preserveArtifact(store, fixed, 'test-plan', 'independent checks\n', 'base')
		preserveArtifact(store, fixed, 'test-plan', 'independent checks\n', 'base')
		assert.equal(savedArtifacts(store.events(item.id)).length, 1)
		store.close(); store = openStore(path)
		assert.equal(ownArtifact(store, fixed, 'test-plan', 'base')!.patch, 'independent checks\n')
		assert.equal(ownArtifact(store, fixed, 'implement', 'base'), undefined)
		assert.equal(ownArtifact(store, fixed, 'test-plan', 'new-base'), undefined)
		preserveArtifact(store, fixed, 'test-plan', '', 'base', true)
		assert.equal(ownArtifact(store, fixed, 'test-plan', 'base')!.patch, '', 'An intentional empty partial supersedes earlier bytes')
		preserveArtifact(store, fixed, 'test-plan', 'accepted B', 'base')
		preserveArtifact(store, fixed, 'test-plan', '', 'base', true)
		assert.equal(ownArtifact(store, fixed, 'test-plan', 'base')!.patch, '', 'A repeated empty partial after accepted work must still supersede it')
		preserveArtifact(store, fixed, 'implement', 'partial A', 'base', true)
		preserveArtifact(store, fixed, 'implement', 'accepted B', 'base')
		preserveArtifact(store, fixed, 'implement', 'partial A', 'base', true)
		assert.equal(ownArtifact(store, fixed, 'implement', 'base')!.patch, 'partial A', 'Interleaved accepted work cannot suppress a later identical partial')
		assert.equal(ownArtifact(store, { ...fixed, outputs: { plan: 'changed' } }, 'test-plan', 'base'), undefined)
		const event = store.events(item.id).find(e => e.kind === 'artifact-saved')!
		assert.deepEqual(savedArtifacts([{ ...event, data: { ...event.data, patch: 'tampered' } }]), [])
		assert.equal(event.data.sha256, contentHash('independent checks\n'))
	} finally { store.close(); rmSync(dir, { recursive: true, force: true }) }
})
