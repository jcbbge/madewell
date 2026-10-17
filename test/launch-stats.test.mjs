// What a launch cost (#78 plan §2, §7 f): tokens, price and session from each harness's own stream, read
// whole and incrementally; and the snapshot's home, call stats and workspace scope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, appendFile, realpath, stat, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../work.mjs';
import { drive } from '../drive.mjs';
import { workspaceDataDirectory } from '../config.mjs';
import { launchStats, snapshot } from '../serve.mjs';
import { fake, quiet } from './drive-helpers.mjs';

const stream = name => fileURLToPath(new URL(`./fixtures/run-view/launch-${name}.jsonl`, import.meta.url));
const lines = (...events) => events.map(e => JSON.stringify(e)).join('\n') + '\n';
const temp = async () => mkdtemp(join(tmpdir(), 'mpd-stats-'));

test('7f: claude tokens and price come from its result line; without one the run is not finished', async () => {
  const s = await launchStats(stream('claude'), { harness: 'claude' });
  assert.equal(s.tokens, 62 + 190797 + 6509936 + 66904);
  assert.ok(Math.abs(s.cost - 4.1666912) < 1e-9, `cost ${s.cost}`);
  assert.equal(s.sessionId, 'ebeb5dc4-3c6b-4cdc-958b-dc847a1b21d3');
  const dir = await temp(), path = join(dir, 'launch-1.jsonl');
  await writeFile(path, lines({ type: 'system', subtype: 'init', session_id: 'abc', model: 'claude-opus-5-5' }));
  const open = await launchStats(path, { harness: 'claude' });
  assert.equal(open.tokens, null);
  assert.equal(open.cost, null);
  assert.equal(open.costReason, 'run not finished');
  assert.equal(open.sessionId, 'abc');
  await rm(dir, { recursive: true, force: true });
});

test('7f: codex sums its turns\' tokens and reports no price; pi reports what it recorded', async () => {
  const c = await launchStats(stream('codex'), { harness: 'codex' });
  assert.equal(c.tokens, 19267 + 7);
  assert.equal(c.cost, null);
  assert.equal(c.costReason, 'codex reports no price');
  assert.equal(c.sessionId, '01a145d5-c83d-7200-b2ce-14f19c1ec0b2');
  const p = await launchStats(stream('pi'), { harness: 'pi' });
  assert.equal(p.tokens, 1530);
  assert.ok(Math.abs(p.cost - 0.0042) < 1e-12);
  assert.equal(p.sessionId, '01a145d5-f88b-7022-8c17-ee76c55ae802');

  const dir = await temp();
  await writeFile(join(dir, 'codex.jsonl'), lines({ type: 'thread.started', thread_id: 't' },
    { type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 5 } }, { type: 'turn.completed', usage: { input_tokens: 200, output_tokens: 7 } }));
  assert.equal((await launchStats(join(dir, 'codex.jsonl'), { harness: 'codex' })).tokens, 312, 'every turn counts');
  await writeFile(join(dir, 'pi.jsonl'), lines({ type: 'session', id: 's' },
    { type: 'message_end', message: { role: 'assistant', content: [], usage: { totalTokens: 40 } } }));
  const unpriced = await launchStats(join(dir, 'pi.jsonl'), { harness: 'pi' });
  assert.equal(unpriced.tokens, 40);
  assert.equal(unpriced.cost, null);
  assert.equal(unpriced.costReason, 'pi reported no price');
  await rm(dir, { recursive: true, force: true });
});

const tool = (i, pad = '') => ({ type: 'tool_execution_end', toolCallId: `c${i}`, toolName: 'read', isError: false, durationMs: 1, result: { pad } });

test('7f: a stream over 4 MiB is read whole: the first line counts as much as the last', async () => {
  const dir = await temp(), path = join(dir, 'big.jsonl'), pad = 'x'.repeat(1000);
  const head = lines({ type: 'session', id: 'big' }, { type: 'message_end', message: { role: 'assistant', content: [], usage: { totalTokens: 100, cost: { total: 0.5 } } } });
  await writeFile(path, head + Array.from({ length: 5000 }, (_, i) => JSON.stringify(tool(i, pad))).join('\n') + '\n');
  assert.ok((await stat(path)).size > 4 * 1024 * 1024);
  const s = await launchStats(path, { harness: 'pi' });
  assert.equal(s.tools, 5000);
  assert.equal(s.tokens, 100, 'the usage at the head of the file');
  assert.equal(s.cost, 0.5);
  await rm(dir, { recursive: true, force: true });
});

test('7f: a grown stream adds only what was appended, a half-written line counts once whole, a shrunk one is read again', async () => {
  const dir = await temp(), path = join(dir, 'live.jsonl');
  await writeFile(path, lines({ type: 'session', id: 'live' }, tool(1), tool(2)));
  assert.equal((await launchStats(path, { harness: 'pi' })).tools, 2);
  await appendFile(path, lines(tool(3)));
  assert.equal((await launchStats(path, { harness: 'pi' })).tools, 3);
  const half = JSON.stringify(tool(4));
  await appendFile(path, half.slice(0, 20));
  assert.equal((await launchStats(path, { harness: 'pi' })).tools, 3, 'a line still being written is not counted yet');
  await appendFile(path, half.slice(20) + '\n');
  assert.equal((await launchStats(path, { harness: 'pi' })).tools, 4, 'and is counted once it is whole');
  await appendFile(path, lines({ type: 'message_end', message: { role: 'assistant', content: [], usage: { totalTokens: 9, cost: { total: 0.01 } } } }));
  assert.equal((await launchStats(path, { harness: 'pi' })).tokens, 9);
  await writeFile(path, lines({ type: 'session', id: 'live' }, tool(1)));
  const again = await launchStats(path, { harness: 'pi' });
  assert.equal(again.tools, 1, 'a shrunk file is parsed from the start');
  assert.notEqual(again.tokens, 9, 'nothing carried over from before it shrank');
  await rm(dir, { recursive: true, force: true });
});

test('snapshot: carries home, the stats of every call stream, and keeps only the asked workspace', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mpd-snap-'))), base = join(root, 'pi-durable'), env = { XDG_DATA_HOME: root };
  const wsA = join(root, 'alpha'), wsB = join(root, 'beta');
  await mkdir(wsA); await mkdir(wsB);
  await writeFile(join(root, 'f.json'), '{}');
  process.env.PI_DURABLE_PI = fake; process.env.FAKE_PI_STATE = join(root, 'f.json');
  process.env.PI_DURABLE_PRESCRIPTIONS = fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url));
  const a = await openStore(workspaceDataDirectory(wsA, env), { resume: true });
  const id = await a.create('Alpha objective', 'source', wsA, { delivery: true });
  assert.equal((await drive(a, id, quiet)).status, 'complete');
  await a.close();
  const b = await openStore(workspaceDataDirectory(wsB, env));
  await b.create('Beta objective', 'source', wsB, { delivery: true });
  await b.close();
  try {
    const all = await snapshot({ base });
    assert.equal(all.home, homedir());
    assert.equal(all.stores.length, 2);
    const w = all.stores.find(s => s.workspace === wsA).threads[0];
    const calls = w.record.events.filter(e => e.type === 'call' && e.record);
    assert.ok(calls.length > 0, 'the driver recorded its calls');
    for (const e of calls) {
      const st = w.callStats?.[e.record];
      assert.ok(st && typeof st === 'object', `stats for ${e.record}`);
      assert.equal(typeof st.sessionId, 'string');
      assert.ok('tokens' in st && 'cost' in st && 'costReason' in st);
    }
    const scoped = await snapshot({ base, workspace: wsA });
    assert.deepEqual(scoped.stores.map(s => s.workspace), [wsA], 'only the asked workspace; the other store is dropped');
    assert.deepEqual((await snapshot({ base, workspace: join(root, 'nowhere') })).stores, [], 'stores left empty are dropped');
  } finally { await rm(root, { recursive: true, force: true }); }
});
