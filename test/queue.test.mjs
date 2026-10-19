import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { submit, drainRequests, pendingRequests, runQueue } from '../queue.mjs';
import { request, dispatcherProvenance } from '../pi-bridge.mjs';

const busy = async () => { throw new Error('Store is owned by live process 123'); };
async function scratch(t) {
  const root = await mkdtemp(join(tmpdir(), 'mw-queue-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
// Fixture for the core's atomic applyRequest contract. A commit contains the effect AND receipt.
function fixture() {
  const receipts = new Map(), effects = [], records = new Map();
  return { receipts, effects, records, async close() {}, async list() { return [...records.keys()]; },
    async get(id) { return records.get(id); },
    async note(id, type, details) { records.get(id).events.push({ type, ...details }); },
    async queue() { return [...records.values()].filter(w => w.kind === 'delivery' && !w.completion).map(w => w.id); },
    async applyRequest(r) {
      const old = receipts.get(r.requestId);
      if (old) { assert.equal(old.input, JSON.stringify(r)); return { ...old.result, reused: true }; }
      let result;
      if (r.type === 'create') result = { id: effects.length + 1 };
      else if (r.type === 'first') result = { first: r.id };
      else if (r.type === 'answer') result = { answered: true };
      else if (r.type === 'return') result = { state: 'clear' };
      else throw new Error('Unknown request');
      effects.push(structuredClone(r));
      receipts.set(r.requestId, { input: JSON.stringify(r), result });
      return result;
    } };
}

for (const type of ['create', 'answer', 'first', 'return']) {
  test(`${type}: crash after read and after commit before ack loses/duplicates no request`, async t => {
    const root = await scratch(t), store = fixture();
    const input = { type, id: 7, requestId: `retry-${type}`, objective: 'A job', source: 'Verbatim source', cwd: root,
      text: 'Exact answer', action: 'clear', actor: 'sender' };
    const queued = await submit(root, input, { open: busy });
    assert.equal(queued.requestId, input.requestId);
    assert.equal((await pendingRequests(root)).length, 1);
    await assert.rejects(drainRequests(root, store, { afterRead() { throw new Error('crash before apply'); } }), /crash before apply/);
    assert.equal(store.effects.length, 0);
    assert.equal((await pendingRequests(root)).length, 1);
    await assert.rejects(drainRequests(root, store, { afterApply() { throw new Error('crash before ack'); } }), /crash before ack/);
    assert.equal(store.effects.length, 1);
    assert.equal((await pendingRequests(root)).length, 1);
    const replay = await drainRequests(root, store);
    assert.equal(replay[0].reused, true);
    assert.equal(store.effects.length, 1);
    assert.equal((await pendingRequests(root)).length, 0);
    const idle = await submit(root, input, { open: async () => store });
    assert.equal(idle.reused, true, 'the idle path uses the same committed identity');
    assert.equal(store.effects.length, 1);
  });
}

test('busy retries publish one entry, reject conflicting payloads and retain refused/malformed intake', async t => {
  const root = await scratch(t), store = fixture(), r = { type: 'first', id: 4, requestId: 'one' };
  await Promise.all(Array.from({ length: 4 }, () => submit(root, r, { open: busy })));
  assert.equal((await pendingRequests(root)).length, 1);
  await assert.rejects(submit(root, { ...r, id: 5 }, { open: busy }), /different request/);
  await assert.rejects(drainRequests(root, { applyRequest() { throw new Error('refused'); } }), /refused/);
  assert.equal((await pendingRequests(root)).length, 1);
  await drainRequests(root, store);
  await writeFile(join(root, 'requests', 'broken.json'), '{broken');
  await assert.rejects(pendingRequests(root), /Cannot read queued request/);
  assert.equal(await readFile(join(root, 'requests', 'broken.json'), 'utf8'), '{broken');
  assert.deepEqual((await readdir(join(root, 'requests'))).filter(n => n.endsWith('.tmp')), []);
});

test('legacy pending intake gets a stable filename identity, and unexpected open failures retain intake', async t => {
  const root = await scratch(t);
  await assert.rejects(submit(root, { type: 'first', id: 2, requestId: 'open-error' }, { open: async () => { throw new Error('disk failure'); } }), /disk failure/);
  await drainRequests(root, fixture());
  await writeFile(join(root, 'requests', '100-old.json'), JSON.stringify({ type: 'first', id: 2 }));
  const a = await pendingRequests(root), b = await pendingRequests(root);
  assert.equal(a[0].request.requestId, 'legacy:100-old.json');
  assert.equal(a[0].request.requestId, b[0].request.requestId);
});

test('pi bridge preserves verbatim source and sender card and shares mutation request IDs', async t => {
  const root = await scratch(t), calls = [], dispatcher = { actor: 'sender', harness: 'pi', provider: 'vendor', model: 'chosen', sessionId: 'session', card: { harness: 'pi', provider: 'vendor', model: 'chosen', account: 'sub', effort: 'high' } };
  const submitRequest = async (directory, input) => { calls.push({ directory, input }); return { queued: true, requestId: input.requestId }; };
  const source = 'The person said: keep every byte.\n\n';
  for (let i = 0; i < 2; i++) await request({ action: 'create', objective: 'Work', workspace: root, source, dispatcher, requestId: 'same-call' }, root, { submitRequest });
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].input.source, source, 'no retry marker appended to the operator source');
  assert.deepEqual(calls[0].input.dispatcher, { ...dispatcher, job: 'dispatcher' });
  for (const action of ['first', 'answer', 'return']) await request({ action, id: 7, text: 'Exact response', response: 'question', actor: 'sender', requestId: `call-${action}` }, root, { submitRequest });
  assert.deepEqual(calls.slice(2).map(c => [c.input.type, c.input.requestId]), [['first', 'call-first'], ['answer', 'call-answer'], ['return', 'call-return']]);
  assert.equal(calls.at(-1).input.actor, 'sender');
  assert.deepEqual(dispatcherProvenance(), { actor: 'dispatcher', job: 'dispatcher', harness: null, provider: null, model: null, card: null, sessionId: null });
});

test('runner keeps automatic delivery, rereads priority between items and records selection', async t => {
  const root = await scratch(t), store = fixture(), driven = [], order = [2, 3, 4];
  store.records.set(1, { id: 1, kind: 'discovery', events: [] });
  store.queue = async () => order.filter(id => !store.records.get(id)?.completion);
  const apply = store.applyRequest.bind(store);
  store.applyRequest = async r => { const out = await apply(r); if (r.type === 'first') order.reverse(); return out; };
  let activeDelivery = 0;
  const result = await runQueue(root, { open: async () => store, log() {}, poll: 1,
    drive: async (_store, id) => {
      driven.push(id);
      if (id === 1) {
        for (const child of [2, 3, 4]) store.records.set(child, { id: child, kind: 'delivery', events: [] });
        store.records.get(id).completion = 'discovered';
        return { status: 'discovered' };
      }
      activeDelivery++; assert.equal(activeDelivery, 1);
      if (id === 2) await submit(root, { type: 'first', id: 4, requestId: 'priority' }, { open: busy });
      await new Promise(resolve => setImmediate(resolve));
      store.records.get(id).completion = 'complete'; activeDelivery--;
      return { status: 'complete' };
    } });
  assert.equal(result.status, 'idle');
  assert.deepEqual(driven, [1, 2, 4, 3]);
  assert.deepEqual(store.records.get(3).events.map(e => e.type), ['queue-selected', 'queue-settled']);
  assert.equal((await pendingRequests(root)).length, 0);
});

test('quota waits, reset and resumption are committed and restored on runner restart', async t => {
  const root = await scratch(t), store = fixture();
  store.records.set(1, { id: 1, kind: 'discovery', events: [{ type: 'quota-wait', resetsAt: 30 }] });
  let time = 0, calls = 0;
  const wait = async () => { time += 10; await new Promise(resolve => setImmediate(resolve)); };
  await runQueue(root, { open: async () => store, now: () => time, wait, log() {}, poll: 1,
    drive: async () => {
      calls++; assert.ok(time >= 30);
      if (calls === 1) return { status: 'out-of-quota', resetsAt: time + 20 };
      store.records.get(1).completion = 'discovered'; return { status: 'discovered' };
    } });
  assert.equal(calls, 2);
  assert.deepEqual(store.records.get(1).events.map(e => e.type), ['quota-wait', 'quota-resumed', 'queue-selected', 'quota-wait', 'quota-resumed', 'queue-selected', 'queue-settled']);
});

test('runner claim never overwrites another live runner; refused intake survives without blocking independent work', async t => {
  const root = await scratch(t), store = fixture();
  await writeFile(join(root, 'runner.json'), JSON.stringify({ pid: process.pid }));
  assert.equal((await runQueue(root, { open: async () => { throw new Error('must not open'); } })).status, 'already-running');
  await rm(join(root, 'runner.json'));
  await submit(root, { type: 'invalid', requestId: 'bad' }, { open: busy });
  store.records.set(1, { id: 1, kind: 'discovery', events: [] });
  const result = await runQueue(root, { open: async () => store, log() {}, poll: 1, drive: async () => {
    store.records.get(1).completion = 'discovered'; return { status: 'discovered' };
  } });
  assert.equal(result.status, 'intake-blocked');
  assert.equal(result.requests[0].requestId, 'bad');
  assert.equal(store.records.get(1).completion, 'discovered');
  assert.equal((await pendingRequests(root)).length, 1);
  await assert.rejects(readFile(join(root, 'runner.json')), { code: 'ENOENT' });
});
