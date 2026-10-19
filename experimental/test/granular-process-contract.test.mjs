import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../work.mjs';

// Independently derived from thread 104's accepted plan, requirements 1 and 6.
// Contract seam: processVersion is the persisted discriminator; unversioned
// records are legacy v1. No worker, fake worker, or shared workspace is used.
// This is a real SQLite close/reopen test, NOT crash or live-worker proof.
for (const delivery of [false, true]) {
  test(`new work persists its process version and exact authority (delivery=${delivery})`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'madewell-process-contract-'));
    const workspace = join(root, 'workspace');
    const directory = join(root, 'store');
    let store;
    try {
      await mkdir(workspace);
      store = await openStore(directory);
      const source = 'Keep this source verbatim.\nOnly the stated objective is authorized.\n';
      const id = await store.create('Inspect one bounded objective', source, workspace, { delivery });
      const before = await store.get(id);
      assert.ok(Number.isInteger(before.processVersion) && before.processVersion > 1,
        'new work must opt into a persisted non-legacy process definition');
      assert.equal(before.source, source);
      assert.equal(before.delivery, delivery);
      assert.notEqual(before.completion, 'verified', 'creation is not independent verification');
      await store.close();
      store = null;
      store = await openStore(directory);
      const after = await store.get(id);
      assert.equal(after.processVersion, before.processVersion);
      assert.equal(after.source, source);
      assert.equal(after.delivery, delivery);
      assert.deepEqual(after.attempts, before.attempts, 'opening a store does not synthesize execution');
      assert.equal(after.completion, before.completion);
      assert.deepEqual(await store.list(), [id], 'reopening does not create duplicate work');
    } finally {
      try { if (store) await store.close(); }
      finally { await rm(root, { recursive: true, force: true }); }
    }
  });
}
