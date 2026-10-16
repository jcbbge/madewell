import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../work.mjs';
import { drive } from '../drive.mjs';
import { serve, snapshot } from '../serve.mjs';

test('dashboard: snapshot carries states, transitions, every agent run with timing and tool stats; HTTP serves it read-only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mpd-serve-')), base = join(root, 'data'), dir = join(base, 'workspaces', 'abc'), cwd = join(root, 'ws');
  await mkdir(cwd, { recursive: true });
  const fake = fileURLToPath(new URL('./fake-pi.mjs', import.meta.url)); await chmod(fake, 0o755);
  await writeFile(join(root, 'f.json'), JSON.stringify({ verify: ['fail', 'pass'], arbiter: [{ cause: 'test', answer: 'fix t1', evidence: '' }] }));
  process.env.PI_DURABLE_PI = fake; process.env.FAKE_PI_STATE = join(root, 'f.json');
  process.env.PI_DURABLE_PRESCRIPTIONS = fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url));
  const store = await openStore(dir, { resume: true });
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const result = await drive(store, id, { log: () => {} });
  assert.equal(result.status, 'complete', JSON.stringify(result));
  await store.close();

  const s = await snapshot({ base });
  assert.equal(s.stores.length, 1);
  assert.equal(s.stores[0].driver.alive, false, 'no driver after close');
  const w = s.stores[0].threads[0];
  assert.equal(w.done, true);
  assert.ok(w.record.events.some(e => e.type === 'failure-routed' && e.cause === 'test'), 'transition to the test architect is visible');
  assert.ok(w.record.events.some(e => e.type === 'call' && e.kind === 'arbiter' && e.ms >= 0), 'arbiter latency is visible');
  const impl = w.record.attempts.find(a => a.step === 'implement');
  assert.equal(impl.stats[0].tools, 1, 'tool calls are counted from the pi stream');
  assert.equal(impl.stats[0].byTool.durable_progress.count, 1);

  const server = await serve({ port: 0, base, log: () => {} });
  try {
    const port = server.address().port;
    const api = await (await fetch(`http://127.0.0.1:${port}/api/state`)).json();
    assert.equal(api.stores[0].threads[0].threadId, id);
    const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert.match(html, /Pi Durable · Live/);
  } finally { server.close(); }
});
