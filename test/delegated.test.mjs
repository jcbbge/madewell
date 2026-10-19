import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../work.mjs';
import { observe, publishWork, render } from '../observe.mjs';
import { renderSidecar, sidecarSnapshot } from '../sidecar.mjs';
import { runView, stateAt } from '../view.mjs';

process.env.PI_DURABLE_ALERT = 'none';
const sender = { actor: 'coordinator', job: 'dispatch', harness: 'claude', provider: 'provider-a', model: 'model-a' };
const worker = { actor: 'worker', job: 'board', harness: 'pi', provider: 'provider-b', model: 'model-b' };
const assignment = workspace => ({ objective: 'Show delegated work truthfully', brief: 'Make the board show this work.', workspace, sender, worker, where: { tmux: 'team:board', machine: 'remote' } });

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'delegated-')), dir = join(root, 'data');
  let store = await openStore(dir);
  t.after(async () => { if (store) await store.close(); await rm(root, { recursive: true, force: true }); });
  const id = await store.openDelegated(assignment(root));
  return { dir, root, id, get store() { return store; },
    async reopen() { await store.close(); store = null; store = await openStore(dir); },
    act: (verb, actor, text = 'I understand this handoff.') => store.delegated(id, verb, { actor, text }),
    async view() { return (await observe(dir, id))[0]; },
    async frame(width = 120) { return renderSidecar(await sidecarSnapshot({ base: dir }), { width }); } };
}

test('delegated work uses the runner catalog and committed SQLite, with full provenance and rebuilt views', async t => {
  const s = await setup(t);
  assert.deepEqual(await s.store.list(), [s.id]);
  assert.equal((await s.view()).state, 'intake');
  await s.act('started', 'worker');
  const w = await s.store.get(s.id);
  assert.equal(w.calls.length, 1); assert.equal(w.calls[0].card.provider, worker.provider);
  assert.equal(w.calls[0].exchangeId, w.exchanges[0].id);
  assert.ok(w.calls[0].briefHash); assert.ok(w.calls[0].startedAt);
  await rm(join(s.dir, 'observability'), { recursive: true });
  await s.reopen();
  assert.equal((await s.view()).state, 'working');
  const frame = await s.frame();
  assert.match(frame, /NOW \(1\)/); assert.match(frame, /provider-b/); assert.match(frame, /team:board/);
  assert.doesNotMatch(frame, /Nothing is running|TO-DO|undefined/);
  assert.match(render([await s.view()]), /WORK.*WORKING/);
});

test('three answered question turns, fourth raise holds only this item; human release requires confirmation', async t => {
  const s = await setup(t);
  const second = await s.store.openDelegated({ ...assignment(s.root), objective: 'Other work' });
  await s.act('started', 'worker');
  for (let i = 1; i <= 3; i++) {
    await s.act('question', 'worker', `Question ${i}?`);
    assert.equal((await s.view()).state, 'question');
    await assert.rejects(s.act('answered', 'stranger'), /originating/);
    await s.act('answered', 'coordinator', `Answer ${i}`);
    if (i < 3) await s.act('started', 'worker');
  }
  await s.act('question', 'worker', 'Fourth question?');
  const held = await s.store.get(s.id);
  assert.equal(held.hold.cause, 'turns'); assert.equal(held.exchanges[0].rounds, 3);
  assert.equal((await s.store.get(second)).hold, null);
  assert.match(await s.frame(), /1 needs you/);
  assert.match(await s.frame(), /delegate human/);
  await assert.rejects(s.act('answered', 'coordinator'), /Human hold/);
  await s.act('human', 'human', 'Proceed with the original scope.');
  await assert.rejects(s.act('reported', 'worker'), /Clear/);
  await s.act('started', 'worker');
  assert.equal((await s.store.get(s.id)).calls.length, 1, 'confirmation does not invent another execution');
  assert.equal((await s.view()).state, 'working');
});

test('report return is another NQ exchange; questions, rejection, revised report, acceptance and closure stay distinct', async t => {
  const s = await setup(t);
  await s.act('started', 'worker'); await s.act('reported', 'worker', 'First report');
  assert.equal((await s.view()).done, false);
  await s.act('question', 'coordinator', 'Where is the evidence?');
  await s.act('answered', 'worker', 'In the test output.');
  await s.act('clear', 'coordinator');
  await s.act('sent-back', 'coordinator', 'Include the exact test result.');
  assert.equal((await s.view()).state, 'sent-back');
  await s.act('started', 'worker'); await s.act('reported', 'worker', 'Tests pass; attached result.');
  await s.act('accepted', 'coordinator', 'I checked the result against the brief.');
  assert.equal((await s.view()).done, true);
  await s.act('closed', 'coordinator');
  const w = await s.store.get(s.id);
  assert.equal(w.delegationState, 'closed'); assert.ok(w.closedAt);
  assert.equal(w.exchanges.length, 4); assert.equal(w.calls.length, 2);
  assert.ok(w.calls.every(c => c.endedAt && c.outcome === 'reported'));
  await assert.rejects(s.act('started', 'worker'), /closed/);
  for (const width of [60, 80, 120]) {
    const frame = await s.frame(width);
    assert.ok(frame.split('\n').every(line => line.length <= width));
    assert.match(frame, /closed/); assert.match(frame, /Accepted by coordinator/);
    assert.match(frame.replace(/\s+/g, ' '), /Where is the evidence/);
  }
  await s.reopen(); assert.equal((await s.view()).state, 'closed');
});

test('delegated present state equals replay and old discovery completion never ticks delivery stages', async t => {
  const s = await setup(t);
  await s.act('started', 'worker'); await s.act('reported', 'worker');
  const projected = await s.view(), snap = await sidecarSnapshot({ base: s.dir });
  assert.equal(stateAt(projected, snap.at).state, projected.state);
  assert.equal(runView(snap).items[0].kind, 'delegated');
  const w = await s.store.get(s.id);
  const discovery = { ...w, id: 99, kind: 'discovery', completion: 'discovered', delivery: false,
    events: [{ type: 'created', at: '2026-01-01T00:00:00Z' }, { type: 'discovered', at: '2026-01-01T00:01:00Z' }] };
  await publishWork(s.dir, discovery);
  const d = JSON.parse(await readFile(join(s.dir, 'observability/thread-99.json'), 'utf8'));
  assert.deepEqual(d.checklist.map(x => x.name), ['discover']);
  const v = runView({ at: Date.now(), stores: [{ dir: s.dir, threads: [d] }] });
  assert.equal(v.items[0].done, true);
  assert.ok(v.lanes.delivery.every(stage => stage.state === 'pending'));
});

test('invalid delegation and false closure are rejected before state is changed', async t => {
  const s = await setup(t);
  await assert.rejects(s.store.openDelegated({ ...assignment(s.root), worker: { actor: 'x' } }), /Worker.job/);
  await assert.rejects(s.act('closed', 'coordinator'), /accepted/);
  await assert.rejects(s.act('reported', 'worker'), /Clear/);
  await assert.rejects(s.act('started', 'coordinator'), /receiving/);
  assert.equal((await s.view()).state, 'intake');
});
