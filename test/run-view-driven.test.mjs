// The run view over records the real driver makes (#78 plan §7 a, d): a full lifecycle with a test ruling,
// a standing question hold, discovery only, and a corrections hold answered by the human.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observe } from '../observe.mjs';
import { drive } from '../drive.mjs';
import { stateAt, runView, terminalLines, timeline, ms } from '../view.mjs';
import { run, quiet } from './drive-helpers.mjs';

const end = w => Math.max(...timeline(w));
const viewOf = async (store, id) => (await observe(store.directory, id))[0];
const snapOf = (store, cwd, threads, at, { alive = true } = {}) => ({ at, base: store.directory, home: '/nowhere', silentMs: 300_000,
  stores: [{ dir: store.directory, workspace: cwd, driver: { pid: alive ? process.pid : null, alive, since: null }, threads }], accounts: {} });
const tile = (v, key) => { const t = v.telemetry.tiles; return Array.isArray(t) ? t.find(x => [x.key, x.id, x.name].includes(key)) : t[key]; };
const node = (v, label) => {
  const walk = (x, out = []) => { if (Array.isArray(x)) x.forEach(y => walk(y, out)); else if (x && typeof x === 'object') { out.push(x); Object.values(x).forEach(y => walk(y, out)); } return out; };
  return walk(v.lanes).find(o => typeof o.label === 'string' && o.label.startsWith(label) && 'state' in o);
};

test('7a: a full lifecycle with a failed check and a test ruling ends where its view file says', () => run({
  verify: ['fail', 'pass'], arbiter: [{ cause: 'test', answer: 'fix t1', evidence: '' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await viewOf(store, id);
  assert.equal(stateAt(w, end(w)).state, w.state);
  assert.equal(w.state, 'done');
  const states = timeline(w).map(t => stateAt(w, t).state);
  assert.ok(states.includes('test-failed'), 'replay passes through the failed check');
  assert.ok(!states.includes('stopped'));
  const v = runView(snapOf(store, cwd, [w], end(w) + 1000), { select: { storeDir: store.directory, threadId: id } });
  assert.ok(v.log.some(l => l.who === 'agent' && l.text === 'Routed: test'));
  assert.equal(v.rules[3].status, 'ok', 'the failed check was routed');
  assert.equal(v.rules[4].status, 'ok', 'done on a passing check');
  assert.equal(tile(v, 'checksPassed').value, '1/2');
  assert.equal(tile(v, 'checksFailed').value, 1);
}));

test('7a: a standing question hold is waiting on you; 30 minutes on, it has waited 30 minutes', () => run({}, async ({ store, cwd, script }) => {
  const id = await store.create('Add CSV export', 'source', cwd, { delivery: true });
  await script({ askByThread: { [id]: 'Which database should the export use?' } });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await viewOf(store, id);
  assert.equal(w.state, 'human-hold');
  const s = stateAt(w, end(w));
  assert.equal(s.state, w.state);
  assert.equal(s.hold.kind, 'nq');
  assert.deepEqual(s.hold.questions, w.hold.questions);

  const holdAt = ms(w.hold.at), select = { storeDir: store.directory, threadId: id };
  let v = runView(snapOf(store, cwd, [w], holdAt + 30 * 60_000), { select });
  assert.equal(v.live, true);
  assert.equal(v.now.who, 'op');
  assert.equal(v.now.decide.kind, 'nq');
  assert.equal(v.now.decide.disabled, true, 'a live driver owns the store');
  assert.match(v.now.decide.reason, new RegExp(`Another item's driver owns this store \\(pid ${process.pid}\\)`));
  assert.match(v.now.decide.reason, new RegExp(`pi-durable answer ${id} reply\\.txt`));
  assert.equal(Math.round(tile(v, 'waitedMin').value), 30, 'an open hold counts up to now');
  assert.equal(tile(v, 'stops').value, 1);
  v = runView(snapOf(store, cwd, [w], holdAt + 30 * 60_000, { alive: false }), { select });
  assert.equal(v.now.decide.disabled, false, 'no driver: the answer can be sent from here');
  const lines = terminalLines(v, { width: 80 });
  assert.equal(lines[0].text, `1 needs you: #${id}`);
  assert.equal(lines[0].cls, 'bad');
}));

test('7a: discovery only waits for the go-ahead; authorizing it is one stop, counted until the yes', () => run({}, async ({ store, cwd }) => {
  const id = await store.create('Archive old invoices', 'source', cwd, { delivery: false });
  assert.equal((await drive(store, id, quiet)).status, 'delivery-authorization-required');
  let w = await viewOf(store, id);
  assert.equal(stateAt(w, end(w)).state, w.state);
  assert.equal(w.state, 'delivery-authorization-required');
  const select = { storeDir: store.directory, threadId: id };
  let v = runView(snapOf(store, cwd, [w], end(w) + 1000), { select });
  const it = v.items.find(i => i.threadId === id);
  assert.deepEqual([it.kind, it.pill, it.who, it.stage, it.waitsOn], ['discovery', 'todo', 'you', 'Operator', 'you']);
  assert.equal(v.now.who, 'op');
  assert.equal(v.now.headline, 'Discovery is done. Building needs your go-ahead.');
  assert.equal(v.now.decide.kind, 'delivery');
  assert.deepEqual(v.now.decide.options, ['Start building']);
  assert.equal(node(v, 'Start').state, 'on');
  assert.equal(v.rules[0].status, 'ok', 'discovery only started nothing without the operator');
  assert.equal(terminalLines(v, { width: 80 })[0].text, `1 needs you: #${id}`);

  await store.authorize(id);
  w = await viewOf(store, id);
  const yes = w.record.events.find(e => e.type === 'delivery-authorized'), handed = w.record.events.find(e => e.type === 'handoff' && e.from === 'discover');
  v = runView(snapOf(store, cwd, [w], end(w) + 1000), { select });
  assert.equal(node(v, 'Start').state, 'done');
  assert.match(node(v, 'Start').reason, /^authorized \d\d:\d\d$/);
  assert.equal(v.rules[0].status, 'ok');
  assert.equal(v.rules[0].evidence, node(v, 'Start').reason, 'the evidence is the Start reason');
  assert.equal(tile(v, 'stops').value, 1, 'the delivery stop');
  const waited = (ms(yes.at) - ms(handed.at)) / 60_000;
  assert.ok(Math.abs(tile(v, 'waitedMin').value - waited) < 1, 'the wait from the hand-off to the yes');
}));

test('7a + 7d: a corrections hold is a failure hold; the human\'s ruling ends it, and the wait is its interval', () => run({
  verify: ['fail', 'fail', 'fail', 'fail', 'pass'], arbiter: [{ cause: 'implementation', answer: 'fix the parser', evidence: '' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  let w = await viewOf(store, id);
  assert.equal(w.hold.kind, 'failure');
  assert.match(w.hold.reason, /after 3 corrections/);
  const s = stateAt(w, end(w));
  assert.equal(s.state, w.state);
  assert.equal(s.state, 'human-hold');
  assert.equal(s.hold.kind, 'failure');
  const holdAt = ms(w.hold.at), select = { storeDir: store.directory, threadId: id };
  const failed = w.record.events.findLast(e => e.type === 'test-failed');
  assert.ok(failed.corrections >= 3);
  assert.equal(holdAt, ms(w.record.failures.find(f => f.id === failed.failureId).at), 'the hold starts at the failure');
  let v = runView(snapOf(store, cwd, [w], holdAt + 30 * 60_000, { alive: false }), { select });
  assert.equal(v.now.decide.kind, 'failure');
  for (const cause of ['pre-existing', 'implementation', 'test']) assert.ok(v.now.decide.options.includes(cause), cause);
  assert.equal(Math.round(tile(v, 'waitedMin').value), 30);
  assert.ok(v.rules[3].status !== 'bad', 'a held failure is not ignored');

  await store.human(id, { text: 'The test is wrong; fix t1.', cause: 'test' });
  w = await viewOf(store, id);
  const routed = w.record.events.findLast(e => e.type === 'failure-routed' && e.failureId === failed.failureId);
  assert.ok(routed, 'the human ruling routes the failure');
  assert.equal(stateAt(w, ms(routed.at) - 1).state, 'human-hold', 'held until the ruling');
  assert.notEqual(stateAt(w, ms(routed.at)).state, 'human-hold', 'not held from the ruling on');
  v = runView(snapOf(store, cwd, [w], end(w) + 1000, { alive: false }), { select });
  assert.equal(tile(v, 'stops').value, 1);
  const minutes = (ms(routed.at) - holdAt) / 60_000;
  assert.ok(Math.abs(tile(v, 'waitedMin').value - minutes) < 1, `waitedMin ${tile(v, 'waitedMin').value} covers ${minutes}`);
  assert.ok(v.log.some(l => l.who === 'op' && l.text === 'Routed: test'), 'the operator\'s ruling');
  assert.equal(v.rules[3].status, 'ok');
}));
