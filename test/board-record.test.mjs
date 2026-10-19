import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter, once } from 'node:events';
import { publishWork, observe } from '../observe.mjs';
import { snapshot } from '../serve.mjs';
import { runView, stateAt, renderPanels, timeline, recordDetails, coverageOf } from '../view.mjs';
import { renderPlainSidecar as renderSidecar, renderBoard, sidecarPage, runSidecar } from '../sidecar.mjs';

const start = Date.UTC(2026, 0, 1), now = start + 120_000;
const card = { harness: 'pi', provider: 'provider-b', model: 'model-b', account: 'account-b', effort: 'high' };
const sender = { actor: 'sender', job: 'verify', card: { ...card, harness: 'claude', provider: 'provider-a' }, sessionId: 'sender-session' };
const receiver = { actor: 'receiver', job: 'arbitrate', card, sessionId: 'receiver-session' };
const where = { transport: 'tmux', server: 'existing', session: '$1', window: '@2', pane: '%3', pid: 123 };
const exchange = (kind = 'failure') => ({ id: 'x1', step: 'arbitrate', round: 0, originator: 'sender', worker: 'receiver', subject: { kind, id: 'f1' },
  createdAt: start, status: 'clear', rounds: 0, parent: 'previous', handoffId: 'artifact-1', briefHash: 'sealed-brief', brief: 'Inspect this failed check.', sender, receiver,
  turns: [{ type: 'worker', actor: 'receiver', at: start + 1000, intent: 'I understand the failure report.', clear: true, questions: [], callId: 'intake-1' }] });
const call = (extra = {}) => ({ id: 'c1', key: 'stable-key', taskId: 'task-1', parent: 'previous', source: 'artifact-1', subject: { kind: 'failure', id: 'f1' },
  exchangeId: 'x1', turn: 1, kind: 'arbiter', step: 'arbitrate', job: 'arbitrate', actor: 'receiver', card, sessionId: 'receiver-session', briefHash: 'sealed-brief',
  startedAt: start + 10_000, endedAt: null, outcome: 'running', result: null, record: null, where, runs: [], appliedAt: null, ...extra });
const work = (extra = {}) => ({ id: 1, cwd: '/workspace', kind: 'delivery', from: 10, objective: 'Correct the failed check', position: 6, round: 0,
  attempts: [], calls: [call()], activeCall: 'c1', operations: [], exchanges: [exchange()], notes: [], completion: null, hold: null, waitsOn: null, parentId: null,
  failures: [{ id: 'f1', at: start + 2000, status: 'open', report: 'Expected the current price; got the old one.' }],
  events: [{ type: 'created', at: start }, { type: 'brief-sealed', step: 'verify', round: 0, at: start + 1000 }, { type: 'test-failed', failureId: 'f1', at: start + 2000 }], ...extra });
const snap = (w, alive = true, at = now) => ({ at, base: '/data', stores: [{ dir: '/data', driver: { alive }, threads: [w] }], accounts: {} });
async function project(t, w) {
  const dir = await mkdtemp(join(tmpdir(), 'board-record-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await publishWork(dir, w);
  return { dir, view: JSON.parse(await readFile(join(dir, 'observability/thread-1.json'), 'utf8')) };
}

test('row 0: in-flight Arbiter judgment has full provenance, subject, timing, task and tmux location; stopped is not done', async t => {
  const { view } = await project(t, work());
  assert.equal(view.state, 'working'); assert.equal(stateAt(view, now).state, view.state);
  const v = runView(snap(view));
  assert.equal(v.units[0].s.call.id, 'c1'); assert.equal(v.items[0].who, 'arbitrate · receiver');
  assert.match(v.now.headline, /provider-b/); assert.match(v.now.headline, /%3/);
  const before = JSON.stringify(view);
  for (const width of [60, 80, 120]) for (const color of [false, true]) {
    const frame = renderBoard(snap(view), { width, color });
    assert.ok(frame.replace(/\x1b\[[0-9;]*m/g, '').split('\n').every(line => line.length <= width));
    const flat = frame.replace(/[│╭╮╰╯─]/g, '').replace(/\s+/g, ' ');
    for (const value of ['task-1', 'provider-a', 'provider-b', 'sealed-brief', 'artifact-1', 'receiver-session', '%3']) assert.ok(v.details.join(' ').includes(value), value);
    assert.match(flat, /MADE WELL/); assert.match(flat, /MACHINE/); assert.match(flat, /HAPPENING NOW/);
  }
  assert.equal(JSON.stringify(view), before, 'rendering is read-only');
  const stopped = runView(snap(view, false));
  assert.equal(stopped.items[0].state, 'stopped'); assert.equal(stopped.items[0].done, false);
  assert.match(renderSidecar(snap(view, false)), /recorded evidence, not process proof/);
});

test('replay cuts future call results, operation evidence, sender questions and rulings at their actual times', async t => {
  const longAnswer = 'evidence '.repeat(90) + 'ANSWER-AFTER-400';
  const x = exchange('authority');
  x.turns.push({ type: 'worker', at: start + 20_000, actor: 'receiver', intent: 'Authority unclear', questions: ['May scope expand?'] },
    { type: 'originator', at: start + 40_000, actor: 'sender', text: longAnswer, callId: 'c1' });
  const w = work({ exchanges: [x], calls: [call({ endedAt: start + 50_000, outcome: 'reported', result: { decision: '<script>FUTURE-DECISION</script>', evidence: 'ruling.txt' } })],
    operations: [{ id: 'op1', name: 'Distill items', start, end: start + 60_000, outcome: 'reported', evidence: 'FUTURE-OP-EVIDENCE' }],
    events: [...work().events, { type: 'failure-routed', at: start + 70_000, failureId: 'f1', cause: 'implementation' }],
    failures: [{ ...work().failures[0], ruling: { cause: 'implementation', answer: 'FUTURE-RULING' } }] });
  const { view } = await project(t, w);
  const early = recordDetails(view, start + 30_000).join('\n');
  assert.doesNotMatch(early, /FUTURE-|ANSWER-AFTER-400/);
  assert.match(early, /Authority unclear/); assert.match(early, /Operation Distill items: running/);
  const later = runView(snap(view, true, now));
  assert.match(later.details.join('\n'), /ANSWER-AFTER-400/); assert.match(later.details.join('\n'), /FUTURE-RULING/);
  assert.match(renderPanels(later).details, /&lt;script&gt;/); assert.doesNotMatch(renderPanels(later).details, /<script>/);
  for (const value of [start, start + 10_000, start + 50_000, start + 60_000]) assert.ok(timeline(view).includes(value));
});

test('discovery operations and split are separate from delivery; queued children inherit discovery without being shown running', async t => {
  const { view: d } = await project(t, work({ kind: 'discovery', from: null, position: 1, completion: 'discovered', items: [2, 3], calls: [], failures: [], exchanges: [],
    operations: [{ id: 'source', name: 'Preserve source', startedAt: start, endedAt: start + 10, outcome: 'reported', evidence: 'source.txt' },
      { id: 'split', name: 'Split items', startedAt: start + 20, endedAt: start + 30, outcome: 'reported', evidence: [2, 3] }],
    events: [{ type: 'created', at: start }, { type: 'discovered', at: start + 30, items: [2, 3] }] }));
  assert.equal(stateAt(d, now).done, true); assert.deepEqual(d.checklist.map(c => c.name), ['discover']);
  const dv = runView(snap(d));
  assert.deepEqual(dv.lanes.discovery.nodes.map(n => n.label), ['Preserve source', 'Split items']);
  assert.ok(dv.lanes.delivery.every(s => s.state === 'pending'));
  const child = { ...d, threadId: 2, kind: 'delivery', from: 1, items: null, done: false,
    record: { ...d.record, completion: null, discovered: { output: 'Inherited discovery report' }, operations: [], events: [{ type: 'created', at: start + 30, from: 1 }] } };
  const cv = runView(snap(child));
  assert.equal(cv.items[0].state, 'queued'); assert.equal(cv.items[0].kind, 'delivery');
  assert.match(cv.lanes.discovery.nodes[0].label, /Inherited from discovery #1/);
  const frame = renderSidecar(snap(child));
  assert.match(frame, /QUEUED \(1\)/); assert.doesNotMatch(frame, /NOW \(1\)|drive 2/);
  assert.match(frame, /Inherited discovery report/);
});

test('mixed Claude to pi launches parse their own historical cards and cumulative runtime excludes retry gaps', async t => {
  const a = { id: 'a1', callId: 'c1', actor: 'maker', role: 'Sirius', step: 'implement', round: 0, status: 'reported', card,
    createdAt: start, startedAt: start, endedAt: start + 90_000, runs: [
      { n: 1, startedAt: start, endedAt: start + 10_000, record: 'claude', card: { ...card, harness: 'claude' } },
      { n: 2, startedAt: start + 80_000, endedAt: start + 90_000, record: 'pi', card }
    ] };
  const { dir, view } = await project(t, work({ attempts: [a], calls: [call({ source: 'a1', step: 'implement', startedAt: start, endedAt: start + 90_000, outcome: 'reported' })] }));
  for (const harness of ['claude', 'pi']) await writeFile(join(dir, `${harness}.jsonl`), await readFile(new URL(`./fixtures/run-view/launch-${harness}.jsonl`, import.meta.url)));
  view.record.attempts[0].runs.push({ n: 3, card: null, record: null, startedAt: now, endedAt: now });
  await writeFile(join(dir, 'observability/thread-1.json'), JSON.stringify(view));
  const data = await snapshot({ base: dir, now });
  const stats = data.stores[0].threads[0].record.attempts[0].stats;
  assert.ok(stats[0].tokens > 1_000_000); assert.equal(stats[1].tokens, 1530); assert.equal(stats[2], null, 'missing legacy launch metadata stays unknown');
  const v = runView(snap(view));
  assert.equal(v.telemetry.bars.find(b => b.key === 'implementation').minutes, 0.33, '20 recorded seconds, not 90 seconds or double-counted call span');
  const interrupted = structuredClone(view); interrupted.record.attempts[0].runs[0].endedAt = null;
  assert.equal(runView(snap(interrupted)).telemetry.bars.find(b => b.key === 'implementation').minutes, 1.5, 'interrupted interval capped by next launch, never counted twice');
});

test('missing NQ and missing usage are unknown, never a green zero; nested/refusal/fix return remains inspectable', async t => {
  const x = exchange('return'); x.parent = 'refused-handoff'; x.brief = 'Fix #22 completed; verifier evidence in fix-result.txt';
  const { view } = await project(t, work({ parentId: 20, exchanges: [x], calls: [call({ exchangeId: 'MISSING' }), call({ id: 'c2', subject: { kind: 'authority', parent: 'x1' } })] }));
  const v = runView(snap(view));
  assert.deepEqual(coverageOf(view, now), { expected: 2, recorded: 1, matched: 1, missing: 1, scope: 'recorded calls and attempts only; unrecorded dispatch coverage UNKNOWN' });
  assert.equal(v.rules[5].status, 'pend'); assert.match(v.rules[5].evidence, /no recorded intake/);
  assert.equal(v.telemetry.tiles.tokens.value, null); assert.equal(v.telemetry.tiles.cost.value, null);
  assert.match(v.details.join('\n'), /fix-result.txt/); assert.match(v.details.join('\n'), /Fix of #20/);
});

test('human release is intake, not execution; replacement retains identity and historical card/location', async t => {
  const x = exchange();
  x.rounds = 4; x.status = 'clear';
  x.turns = [
    { type: 'worker', actor: 'receiver', at: start + 25_000, intent: 'Still unclear', questions: ['Fourth question?'] },
    { type: 'human', actor: 'human', at: start + 50_000, text: 'Keep the original scope.' },
    { type: 'worker', actor: 'receiver', at: start + 55_000, intent: 'Understood', questions: [], clear: true }
  ];
  const replacement = { harness: 'codex', provider: 'provider-c', model: 'model-c', account: 'account-c' };
  const c = call({ startedAt: start + 60_000, card: replacement, runs: [
    { n: 1, card, startedAt: start + 60_000, endedAt: start + 70_000, sessionId: 'old-session', where },
    { n: 2, card: replacement, startedAt: start + 90_000, endedAt: null, sessionId: 'new-session', where: { ...where, pane: '%4' } }
  ] });
  const { view } = await project(t, work({ exchanges: [x], calls: [c], failures: [], events: [
    ...work().events.filter(e => e.type !== 'test-failed'),
    { type: 'alerted', at: start + 30_000, holdAt: new Date(start + 30_000).toISOString(), channel: 'none', ok: true }
  ] }));
  assert.equal(stateAt(view, start + 40_000).state, 'human-hold');
  assert.equal(stateAt(view, start + 40_000).hold.originator, 'sender');
  assert.equal(stateAt(view, start + 40_000).hold.receiver, 'receiver');
  assert.equal(stateAt(view, start + 50_000).state, 'intake', 'human reply cannot fabricate a running call');
  const old = stateAt(view, start + 65_000).call, next = stateAt(view, start + 95_000).call;
  assert.equal(old.id, next.id); assert.equal(old.card.provider, 'provider-b'); assert.equal(next.card.provider, 'provider-c');
  assert.equal(old.where.pane, '%3'); assert.equal(next.where.pane, '%4');
  assert.equal(old.sessionId, 'old-session'); assert.equal(next.sessionId, 'new-session');
  assert.match(recordDetails(view, now).join('\n'), /Fourth question/);
});

test('worker terminal controls are text, never panel escapes or crashes', async t => {
  const x = exchange(); x.brief = 'safe\x1b]52;c;clipboard\x07 brief\x1b[31m text';
  const { view } = await project(t, work({ exchanges: [x], objective: x.brief }));
  const frame = renderBoard(snap(view), { width: 60 });
  assert.doesNotMatch(frame, /\x1b/); assert.match(frame.replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' '), /safe brief text/);
});

test('quota outcomes do not become human holds or fabricated execution; an actual replacement resumes working', async t => {
  const limited = call({ endedAt: start + 20_000, outcome: 'limited', result: { limit: { account: 'account-b', message: 'usage limit', resetsAt: now + 60_000 } } });
  const { view } = await project(t, work({ calls: [limited], failures: [], exchanges: [], events: [{ type: 'created', at: start }] }));
  const v = runView({ ...snap(view), accounts: { 'account-b': now + 60_000 } });
  assert.equal(v.items[0].state, 'limited'); assert.equal(v.items[0].needs, false);
  assert.match(v.now.headline, /Usage limit recorded/);
  assert.match(renderSidecar({ ...snap(view), accounts: { 'account-b': now + 60_000 } }), /ACCOUNTS/);
  const resting = structuredClone(view);
  resting.record.events.push({ type: 'quota-wait', at: start + 30_000, resetsAt: now + 60_000 });
  assert.equal(runView(snap(resting)).items[0].state, 'quota-wait');
  assert.equal(runView(snap(resting)).items[0].needs, false);
  resting.record.events.push({ type: 'quota-resumed', at: start + 70_000 });
  assert.notEqual(stateAt(resting, now).state, 'quota-wait');
  const replacement = structuredClone(view);
  replacement.record.calls.push(call({ id: 'replacement', startedAt: start + 80_000, card: { ...card, account: 'account-c' } }));
  assert.equal(runView(snap(replacement)).items[0].state, 'working');
  const unborn = structuredClone(view); unborn.record.createdAt = now + 1000;
  assert.equal(runView(snap(unborn)).items.length, 0, 'replay does not show future work');
});

test('archiving removes only the disposable view; replay never borrows future usage', async t => {
  const w = work();
  const { dir, view } = await project(t, w);
  await publishWork(dir, { ...w, archived: true });
  assert.deepEqual(await observe(dir), []);
  assert.equal(runView(snap({ ...view, archived: true })).items.length, 0);
  const priced = structuredClone(view);
  priced.record.calls[0].endedAt = start + 100_000; priced.record.calls[0].outcome = 'reported';
  priced.record.calls[0].stats = [{ tokens: 1000, cost: 2 }];
  const past = runView(snap(priced), { at: start + 50_000 });
  assert.equal(past.telemetry.tiles.tokens.value, null); assert.equal(past.telemetry.tiles.cost.value, null);
  assert.equal(runView(snap(priced)).telemetry.tiles.tokens.value, 1000);
});

test('detail paging reaches every evidence line; overview fits and quitting restores raw mode and listeners', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'board-page-')); t.after(() => rm(dir, { recursive: true, force: true }));
  for (const width of [60, 80, 120]) {
    const frame = Array.from({ length: 100 }, (_, i) => `evidence-${i}`).join('\n');
    const last = sidecarPage(frame, { rows: 10, width, offset: Infinity });
    assert.match(last.text, /evidence-99/); assert.equal(last.text.split('\n').length, 10);
    assert.ok(last.text.split('\n').every(line => line.length <= width));
  }
  const input = new EventEmitter(), output = new EventEmitter();
  Object.assign(input, { isTTY: true, isRaw: false, resume() {}, pause() {}, setRawMode(raw) { this.isRaw = raw; } });
  Object.assign(output, { isTTY: true, columns: 60, rows: 10, write(text) { if (text.includes('MADE WELL')) this.emit('frame', text); } });
  const before = process.listenerCount('SIGINT'), first = once(output, 'frame');
  const running = runSidecar({ base: dir, input, output, intervalMs: 60_000, env: { NO_COLOR: '1' } });
  const [overview] = await first;
  assert.ok(overview.trimEnd().split('\n').length <= 10);
  assert.doesNotMatch(overview, /Lines /);
  const resized = once(output, 'frame'); output.rows = 12; output.emit('resize'); await resized;
  input.emit('data', Buffer.from('q')); await running;
  assert.equal(input.isRaw, false); assert.equal(input.listenerCount('data'), 0); assert.equal(output.listenerCount('resize'), 0);
  assert.equal(process.listenerCount('SIGINT'), before);
});
