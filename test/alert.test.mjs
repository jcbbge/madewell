// Every hold alerts the human once, through a real shell command; a hold stops only its own work item
// (thread 17 plan, tests 7i-k, and alert.mjs's channels).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openStore } from '../work.mjs';
import { drive } from '../drive.mjs';
import { run, setup, quiet, waitFor, runCli, results, killMarked } from './drive-helpers.mjs';

const sh = path => `'${path.replace(/'/g, `'\\''`)}'`;
// A real alert command: append the JSON it reads on stdin, one line per alert.
const appendTo = file => `cat >> ${sh(file)}; echo >> ${sh(file)}`;
const lines = async file => (await readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean).map(l => JSON.parse(l));
const settle = () => new Promise(r => setTimeout(r, 400));
const alerted = w => w.events.filter(e => e.type === 'alerted');

// Drives with alerts going to a file; restores the quiet channel after.
async function withAlerts(scenario, fn) {
  return run(scenario, async s => {
    const file = join(s.root, 'alerts.jsonl'), before = process.env.PI_DURABLE_ALERT;
    process.env.PI_DURABLE_ALERT = appendTo(file);
    try { await fn({ ...s, file, got: () => lines(file) }); } finally { process.env.PI_DURABLE_ALERT = before; }
  });
}

// One hold, one alert: the payload names the item and carries the hold; driving again sends nothing.
async function alertsOnce(store, id, got, cause) {
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const [line] = await waitFor(async () => { const l = await got(); return l.length ? l : null; }, 5000, 'the alert');
  const w = await store.get(line.threadId);
  assert.equal(line.hold.cause, cause);
  assert.equal(w.hold.cause, cause);
  assert.equal(line.hold.at, w.hold.at);
  assert.equal(line.workspace, w.cwd);
  assert.equal(line.objective, w.objective);
  const [event] = alerted(w);
  assert.equal(event?.holdAt, w.hold.at, 'the alert is on the record');
  assert.equal(event.ok, true);
  assert.ok(typeof event.channel === 'string' && event.channel !== 'none');
  assert.equal((await drive(store, id, quiet)).status, 'held');
  await settle();
  assert.equal((await got()).length, 1, 'driving a held item again does not alert again');
  assert.equal(alerted(await store.get(line.threadId)).length, 1);
  return w;
}

test('7i: a turns hold alerts once; after the human answers, an after-human hold alerts once more', () => withAlerts({
  intakeQuestions: [null, null, null, 'Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'],
}, async ({ store, cwd, got }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const first = await alertsOnce(store, id, got, 'turns');
  assert.equal(first.hold.originator, 'Polaris');
  await store.human(id, { text: 'Fast means p95 under 200 ms.' });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const all = await waitFor(async () => { const l = await got(); return l.length === 2 ? l : null; }, 5000, 'the second alert');
  assert.equal(all[1].hold.cause, 'after-human');
  const w = await store.get(id);
  assert.notEqual(all[1].hold.at, all[0].hold.at);
  assert.deepEqual(alerted(w).map(e => e.holdAt), [all[0].hold.at, all[1].hold.at]);
}));

test('7i: an authority hold alerts once', () => withAlerts({
  intakeQuestions: ['May I drop the table?'],
  originator: [{ answer: 'Only the operator can approve dropping data.', unresolvedAuthority: true }],
}, async ({ store, cwd, got }) => {
  const id = await store.create('Build it', 'source', cwd);
  await alertsOnce(store, id, got, 'authority');
}));

const failureHold = w => { assert.equal(w.hold.kind, 'failure'); assert.equal(w.hold.originator, null); assert.equal(w.hold.receiver, 'Arbiter'); assert.deepEqual(w.hold.refs, []); };

test('7i: a corrections hold alerts once', () => withAlerts({
  verify: ['fail', 'fail', 'fail', 'fail'], arbiter: [{ cause: 'test', answer: 'fix the test', evidence: '' }],
}, async ({ store, cwd, got }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  failureHold(await alertsOnce(store, id, got, 'corrections'));
}));

test('7i: an undetermined hold alerts once', () => withAlerts({
  verify: ['fail', 'pass'], arbiter: [{ cause: 'undetermined', answer: 'Could be the test or the fixture.', evidence: '' }],
}, async ({ store, cwd, got }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  failureHold(await alertsOnce(store, id, got, 'undetermined'));
}));

test('7i: a prerequisite-depth hold alerts once, for the item that holds', () => withAlerts({
  verify: ['fail'], arbiter: [{ cause: 'pre-existing', answer: 'older defect', evidence: '' }],
}, async ({ store, cwd, got }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const w = await alertsOnce(store, id, got, 'depth');
  failureHold(w);
  assert.equal(w.depth, 2, 'the nested prerequisite is the item that holds');
}));

test('7i: PI_DURABLE_ALERT=none records the hold as alerted on channel none', () => run({ intakeQuestions: ['May I drop the table?'],
  originator: [{ answer: 'Only the operator can approve dropping data.', unresolvedAuthority: true }] }, async ({ store, cwd }) => {
  const before = process.env.PI_DURABLE_ALERT;
  process.env.PI_DURABLE_ALERT = 'none';
  try {
    const id = await store.create('Build it', 'source', cwd);
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const w = await store.get(id), [event] = alerted(w);
    assert.deepEqual([event?.holdAt, event?.channel, event?.ok], [w.hold.at, 'none', true]);
  } finally { process.env.PI_DURABLE_ALERT = before; }
}));

// Two items in one store, driven together by the CLI: A asks the same question at every intake, B asks nothing.
async function twoItems(alert) {
  const s = await setup();
  const store = await openStore(s.dir);
  const a = await store.create('Item A', 'source', s.cwd, { kind: 'delivery' }), b = await store.create('Item B', 'source', s.cwd, { kind: 'delivery' });
  await store.close();
  await s.script({ askByThread: { [a]: 'Which database should the export use?' } });
  const env = { ...process.env, WORK_DATA: s.dir, PI_DURABLE_ALERT: alert };
  return { ...s, a, b, env };
}

test('7j: an alert command that takes 30 s never holds up the other item in drive-all', async () => {
  const marker = `mpd-alert-${randomUUID()}`;
  const s = await twoItems(`sleep 30; : ${marker}`);
  try {
    const r = await runCli(['drive-all', String(s.a), String(s.b), '--delivery'], s.env);
    assert.ok(r.ms < 9000, `drive-all took ${r.ms} ms with a 30 s alert command`);
    const out = results(r.stdout);
    assert.deepEqual(out.map(x => [x.threadId, x.status]), [[s.a, 'held'], [s.b, 'complete']], r.stderr);
    assert.equal(r.code, 2);
    const store = await openStore(s.dir);
    try {
      assert.equal((await store.get(s.b)).completion, 'verified');
      const held = await store.get(s.a), [event] = alerted(held);
      assert.equal(event?.holdAt, held.hold.at);
      assert.equal(event.ok, true, 'the alert was sent, not waited for');
    } finally { await store.close(); }
  } finally { killMarked(marker); await rm(s.root, { recursive: true, force: true }); }
});

test('7k: drive-all A B: A holds, B completes; a bad id is an error beside a good item, exit 1', async () => {
  const s = await twoItems('none');
  try {
    let r = await runCli(['drive-all', String(s.a), String(s.b), '--delivery'], s.env);
    assert.deepEqual(results(r.stdout).map(x => [x.threadId, x.status]), [[s.a, 'held'], [s.b, 'complete']], r.stderr);
    assert.equal(r.code, 2, 'something waits on the human');
    const store = await openStore(s.dir);
    const c = await store.create('Item C', 'source', s.cwd, { kind: 'delivery' });
    await store.close();
    r = await runCli(['drive-all', String(c), '999', '--delivery'], s.env);
    const out = results(r.stdout);
    assert.equal(out[0].status, 'complete');
    assert.deepEqual([out[1].threadId, out[1].status], [999, 'error']);
    assert.match(out[1].reason, /Unknown thread 999/);
    assert.equal(r.code, 1);
  } finally { await rm(s.root, { recursive: true, force: true }); }
});

// alert.mjs on its own: the channel picks the delivery; nothing is ever awaited.
const loadAlert = () => import('../alert.mjs');
const payload = { threadId: 7, workspace: '/work/shop', objective: 'Add CSV export', hold: { kind: 'nq', cause: 'turns', at: new Date().toISOString(), reason: 'plan: questions remain after three turns on the handoff from Polaris: its spec or the receiver\'s scope is wrong or unclear' } };

test('alert.mjs: none sends nothing and reports channel none', async () => {
  const { sendAlert } = await loadAlert();
  assert.deepEqual(await sendAlert(payload, { PI_DURABLE_ALERT: 'none' }), { channel: 'none', ok: true });
});

test('alert.mjs: any other value is a shell command that receives the payload as JSON on stdin', async () => {
  const s = await setup();
  try {
    const file = join(s.root, 'alert.jsonl'), { sendAlert } = await loadAlert();
    const sent = await sendAlert(payload, { ...process.env, PI_DURABLE_ALERT: appendTo(file) });
    assert.equal(sent.ok, true);
    assert.ok(sent.channel && sent.channel !== 'none');
    const [got] = await waitFor(async () => { const l = await lines(file); return l.length ? l : null; }, 5000, 'the payload');
    assert.deepEqual(got, payload);
  } finally { await rm(s.root, { recursive: true, force: true }); }
});

test('alert.mjs: a command that hangs is never waited for', async () => {
  const marker = `mpd-alert-${randomUUID()}`, { sendAlert } = await loadAlert();
  try {
    const startedAt = Date.now();
    const sent = await sendAlert(payload, { ...process.env, PI_DURABLE_ALERT: `sleep 30; : ${marker}` });
    assert.ok(Date.now() - startedAt < 1000, `sendAlert took ${Date.now() - startedAt} ms`);
    assert.equal(sent.ok, true);
  } finally { killMarked(marker); }
});

test('alert.mjs: desktop with no display on Linux falls back to the terminal', { skip: process.platform !== 'linux' && 'Linux only' }, async () => {
  const { sendAlert } = await loadAlert();
  const sent = await sendAlert(payload, { PATH: process.env.PATH, PI_DURABLE_ALERT: 'desktop' });
  assert.deepEqual(sent, { channel: 'terminal', ok: true });
});
