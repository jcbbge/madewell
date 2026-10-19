import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPlainSidecar as renderSidecar, sidecarSnapshot, clock } from '../sidecar.mjs';
import { runView, terminalLines } from '../view.mjs';

// Local 14:00, so "today" is the same date in any time zone the tests run in.
const now = new Date(2026, 9, 16, 14, 0).getTime();
const ago = minutes => new Date(now - minutes * 60_000).toISOString();
const opus = { harness: 'claude', provider: 'anthropic', account: 'anthropic', model: 'claude-opus-5-5', effort: 'high' };
const sonnet = { harness: 'claude', provider: 'anthropic', account: 'anthropic', model: 'claude-sonnet-5-5', effort: 'low' };
const sol = { harness: 'codex', provider: 'openai', account: 'openai', model: 'gpt-6.1-sol', effort: 'low' };
const resetsAt = now + 2 * 3_600_000;

// The view files' shape (observe.mjs publishWork), as serve.mjs's snapshot returns them. The state is derived
// from the record's events (view.mjs stateAt), so each unit carries the events that put it where it is.
const ev = (minutes, type, extra = {}) => ({ at: ago(minutes), type, pid: 1, ...extra });
const turn = (minutes, type, questions = [], clear = null) => ({ type, at: ago(minutes), questions, clear, text: '' });
const unit = (threadId, extra = {}, record = {}) => {
  const events = [ev(240, 'created'), ...(record.events ?? [])];
  return { threadId, workspace: '/work/shop', objective: `Unit ${threadId}`, done: false, state: 'ready',
    current: null, round: 0, parentId: null, waitsOn: null, hold: null, failure: null, exchange: null, attempt: null, ...extra,
    lastEvent: events.at(-1),
    record: { createdAt: events[0].at, delivery: true, completion: null, attempts: [], exchanges: [], failures: [], notes: [], ...record, events } };
};
const sealed = (minutes, step) => ev(minutes, 'brief-sealed', { step, round: 0 });
const exchange = (id, step, status, turns) => ({ id, step, round: 0, status, answered: turns.filter(t => t.type !== 'worker').length, subject: { kind: 'step' }, turns });
// Held on an NQ question at `step`: the worker asked, then the hold (with or without an alert recorded).
const heldOn = (threadId, step, hold, { minutes = 3, alerted = false, extra = {} } = {}) => unit(threadId, { objective: `Unit ${threadId}`, state: 'human-hold', current: { name: step },
  hold: { kind: 'nq', ref: `x${threadId}`, at: ago(minutes), ...hold }, ...extra }, {
  exchanges: [exchange(`x${threadId}`, step, 'human-hold', [turn(minutes + 1, 'worker', hold.questions ?? [], false)])],
  events: [sealed(minutes + 5, step), ...(alerted ? [ev(minutes, 'alerted', { holdAt: ago(minutes), channel: 'none', ok: true })] : [])] });
const working = (threadId, step, attempt, extra = {}) => unit(threadId, { state: 'working', current: { name: step }, attempt: { id: attempt.id, role: attempt.role, state: 'running' }, ...extra }, {
  attempts: [{ round: 0, status: 'running', endedAt: null, runs: [], health: 'ok', swaps: [], ...attempt, step }],
  events: [sealed(14, step), ev(12, 'assigned', { attemptId: attempt.id, actor: `${attempt.role}-1`, step }), ev(12, 'started', { attemptId: attempt.id, step })] });

const fixture = () => ({ at: now, base: '/data', home: '/home/op', stores: [{ dir: '/data', workspace: '/work/shop', driver: { alive: true }, threads: [
  heldOn(1, 'plan', { reason: 'The source does not say whether the old export may go. Recommend keeping it behind a flag for one release.',
    questions: ['May I remove the old spreadsheet export, or must it keep working for the finance team until they move over?'] },
    { minutes: 25, alerted: true, extra: { objective: 'Add CSV export to the reports page' } }),
  unit(2, { objective: 'Speed up the search results page', state: 'waiting-on-prerequisite', current: { name: 'verify' }, waitsOn: 4 }, {
    failures: [{ id: 'f2', status: 'answered', at: ago(20), round: 0, ruling: { cause: 'pre-existing', answer: 'the cache key ignores the locale', by: 'Arbiter' }, prerequisite: 4, report: 'search test: wrong locale' }],
    events: [sealed(30, 'verify'), ev(20, 'test-failed', { failureId: 'f2', corrections: 0 }), ev(19, 'failure-routed', { failureId: 'f2', cause: 'pre-existing', by: 'Arbiter' })] }),
  unit(3, { objective: 'Rename the billing settings screen', state: 'question', current: { name: 'test-plan' },
    exchange: { id: 'x3', status: 'awaiting-originator', originator: 'Cassiopeia', answered: 1 } }, {
    exchanges: [exchange('x3', 'test-plan', 'awaiting-originator', [turn(4, 'worker', ['Which runner?'], false), turn(3, 'originator'), turn(2, 'worker', ['Which runner exactly?'], false)])],
    events: [sealed(5, 'test-plan')] }),
  working(4, 'implement', { id: 'a4', role: 'Sirius', actor: 'Sirius-1', startedAt: now - 12 * 60_000, createdAt: now - 13 * 60_000, card: sol,
    swaps: [{ from: sonnet, to: sol, at: ago(9), account: 'anthropic', resetsAt }] },
    { objective: 'Fix the pre-existing defect blocking thread 2: the cache key ignores the locale', parentId: 2, depth: 1 }),
  unit(5, { objective: 'Show the order total on the receipt', done: true, state: 'done' }, {
    completion: 'verified', attempts: [{ id: 'a5', step: 'verify', round: 0, status: 'accepted', card: opus, swaps: [], runs: [], createdAt: now - 100 * 60_000, startedAt: now - 100 * 60_000, endedAt: now - 90 * 60_000 }],
    events: [ev(91, 'handoff', { from: 'verify', to: 'complete' }), ev(90, 'complete')] }),
  unit(6, { objective: 'Archive the audit log', current: { name: 'discover' } }, { events: [sealed(1, 'discover')] }),
] }], accounts: { anthropic: resetsAt, openai: now - 1000 } });

const ENGINE = /exchange|attempt|thread|\bstore\b|\bNQ\b|intake|originator|prerequisite|arbiter|handoff|test-plan|awaiting|human-hold|Sirius|Cassiopeia/i;

test('sidecar: decision card, rail, card label, question turn, nested fix, swap, to-do, accounts and done today, in that order', () => {
  const frame = renderSidecar(fixture(), { width: 80, now });
  // Text checks read the frame with its wrapping undone; layout checks read the lines.
  const flat = frame.replace(/ *\n */g, ' ');
  const at = text => { const i = flat.indexOf(text); assert.ok(i >= 0, `frame has ${JSON.stringify(text)}\n${frame}`); return i; };
  const lines = frame.split('\n');
  // 1. Who needs you, then the decision card: the unit, what stopped it, the question, the recommendation, the exact command.
  assert.equal(lines[0], '1 needs you: #1');
  at('#1 Add CSV export to the reports page');
  at('Stopped: Only you can authorize this.');
  at('? May I remove the old spreadsheet export');
  at('Suggested: The source does not say');
  at('$ pi-durable answer 1 reply.txt');
  at('Then continue it: $ pi-durable drive 1 --background');
  const head = re => { const i = lines.findIndex(l => re.test(l)); assert.ok(i >= 0, `${re}\n${frame}`); return i; };
  const card = head(/^ *#1 Add CSV export/), nowAt = head(/^NOW \(\d+\)$/), todo = head(/^TO-DO \(1\)$/), accounts = head(/^ACCOUNTS$/), today = head(/^DONE TODAY: /);
  assert.ok(0 < card && card < nowAt && nowAt < todo && todo < accounts && accounts < today, frame);
  // 2. Now: the stage rail, the job and its card, the turn, the nested fix item, the last swap.
  const rail = stage => lines.find(l => l.includes(`▸${stage}`)) ?? assert.fail(`a rail at ${stage}\n${frame}`);
  assert.equal((rail('verification').match(/✓/g) ?? []).length, 3, 'verification: three stages done');
  assert.equal((rail('planning').match(/✓/g) ?? []).length, 1, 'planning: ideation done');
  at('idea ✓ plan ✓ ▸implementation · verification ·');
  at('Now: Make on Codex · gpt-6.1-sol, for 12m');
  at('Questions: turn 2 of 3');
  assert.ok(at('#2 Speed up the search results page') < at('Paused until fix #4 is done, then Run the check again.') && at('Paused until fix #4') < at('#4 Fix the pre-existing'));
  assert.match(frame, /\n {5}#4 Fix the pre-existing defect blocking #2/, 'the fix item is nested under the unit that waits on it');
  at('Switched Make from Claude Code · claude-sonnet-5-5 to Codex · gpt-6.1-sol (anthropic');
  // 3. To-do: the item nobody started, and how to start it.
  at('#6 Archive the audit log');
  at('$ pi-durable drive 6 --background');
  // 4. Accounts: only the one still out, with its reset time. 5. Done today: the finished unit.
  at(`anthropic: out of quota until ${clock(resetsAt, now)} (in 2h 00m)`);
  assert.ok(!/openai: out/.test(frame), 'an account past its reset is not shown');
  assert.equal(lines[today], 'DONE TODAY: #5');
});

test('sidecar: is terminalLines joined, with each line\'s kind; fits the pane at 60 and 120 columns and never speaks in engine words', () => {
  for (const width of [60, 80, 120]) {
    const frame = renderSidecar(fixture(), { width, now }), lines = terminalLines(runView(fixture(), { at: now }), { width });
    assert.equal(frame, lines.map(l => l.text).join('\n'), `${width}: the sidecar prints exactly terminalLines`);
    assert.equal(lines[0].cls, 'bad', 'who needs you is in the bad colour');
    assert.ok(lines.filter(l => /^(NOW|TO-DO) \(\d+\)$/.test(l.text)).every(l => l.cls === 'h'), 'headings');
    assert.ok(lines.filter(l => l.text.startsWith('   ? ')).every(l => l.cls === 'q'), 'questions');
    for (const line of frame.split('\n')) assert.ok(line.length <= width, `${width}: ${JSON.stringify(line)} is ${line.length}`);
    // The objective is the operator's text; only "thread N" in it is the record's name for a unit.
    assert.ok(!ENGINE.test(frame.replace(/the pre-existing defect/g, '')), `engine word at ${width}:\n${frame}`);
  }
  // Narrow: the rail falls back to marks and the current stage.
  assert.ok(renderSidecar(fixture(), { width: 30, now }).includes('✓ ✓ ▸implementation ·'));
});

test('sidecar: failure holds name the cause, other stores carry WORK_DATA, and an empty data directory is a plain frame', async () => {
  const snap = fixture();
  snap.stores.push({ dir: '/data/workspaces/ab12', workspace: '/work/api', driver: { alive: false }, threads: [
    unit(1, { objective: 'Retry failed webhooks', workspace: '/work/api', state: 'human-hold', current: { name: 'verify' },
      failure: { id: 'f1', status: 'held', report: 'webhook retry test: expected 3 calls, saw 1' },
      hold: { kind: 'failure', ref: 'f1', at: ago(5), reason: 'Tests still failing after 3 corrections' } }, {
      failures: [{ id: 'f1', status: 'held', at: ago(5), round: 0, ruling: null, prerequisite: null, report: 'webhook retry test: expected 3 calls, saw 1' }],
      events: [sealed(10, 'verify'), ev(5, 'test-failed', { failureId: 'f1', corrections: 3 })] }),
    unit(2, { objective: 'Archive old invoices', workspace: '/work/api', state: 'delivery-authorization-required', current: { name: 'ideate' } }, {
      delivery: false, events: [sealed(30, 'discover'), ev(20, 'handoff', { from: 'discover', to: 'ideate' }), sealed(20, 'ideate')] }) ] });
  const frame = renderSidecar(snap, { width: 60, now });
  assert.match(frame, /#1 \(api\) Retry failed webhooks/);
  const flat = frame.replace(/ *\n */g, ' ');
  assert.match(flat, /Stopped: The checks still fail after 3 fixes\./);
  assert.match(flat, /" webhook retry test: expected 3 calls, saw 1/);
  assert.match(flat, /the cause is pre-existing, implementation or test/);
  assert.match(flat, /#2 \(api\) Archive old invoices Stopped: Discovery is done\. Building needs your go-ahead\..*\$ WORK_DATA=\/data\/workspaces\/ab12 pi-durable drive 2 \\? ?--delivery --background/);
  assert.match(frame.split('\n')[0], /^3 needs you: /);
  // The exact command, continued with backslash-newline so it pastes whole yet fits the pane.
  const command = frame.slice(frame.indexOf('$ WORK_DATA=/data/workspaces/ab12')).split('\n');
  assert.ok(command[0].endsWith('\\'), 'the command continues on the next line');
  assert.equal(command.slice(0, 2).join('\n').replace(/\\\n */g, ''), '$ WORK_DATA=/data/workspaces/ab12 pi-durable answer 1 reply.txt <cause>');
  for (const line of frame.split('\n')) assert.ok(line.length <= 60, line);

  const base = await mkdtemp(join(tmpdir(), 'mpd-sidecar-'));
  const empty = renderSidecar(await sidecarSnapshot({ base: join(base, 'missing'), now }), { now });
  assert.deepEqual(empty.split('\n').filter(Boolean), ['Nothing needs you.', 'NOW: nothing running.', 'DONE TODAY: none']);
  // Accounts are read from the shared file at the data root and from each store.
  await mkdir(join(base, 'workspaces', 'w1', 'observability'), { recursive: true });
  await writeFile(join(base, 'accounts.json'), JSON.stringify({ anthropic: resetsAt }));
  await writeFile(join(base, 'workspaces', 'w1', 'accounts.json'), JSON.stringify({ openai: resetsAt + 60_000 }));
  const s = await sidecarSnapshot({ base, now });
  assert.deepEqual(s.accounts, { anthropic: resetsAt, openai: resetsAt + 60_000 });
  assert.match(renderSidecar(s, { now }), /ACCOUNTS\n {2}anthropic: out of quota until .*\n {2}openai: out of quota/);
});

// Thread 17 plan, test 7l: a hold is the first thing in the pane, in red, and its card says why in turns.
const holds = () => ({ at: now, base: '/data', home: '/home/op', stores: [{ dir: '/data', workspace: '/work/shop', driver: { alive: true }, threads: [
  heldOn(1, 'plan', { cause: 'turns', originator: 'Polaris', receiver: 'Cassiopeia-1', questionId: null, refs: ['x1'], questions: ['What does fast mean?'],
    reason: "plan: questions remain after three turns on the handoff from Polaris: its spec or the receiver's scope is wrong or unclear" }),
  heldOn(2, 'test-plan', { cause: 'after-human', originator: 'Cassiopeia', receiver: 'Orion-1', questionId: null, refs: ['x2'], questions: ['Which runner?'],
    reason: "test-plan: questions remain after the human's answer" }),
  heldOn(3, 'implement', { cause: 'authority', originator: 'Orion', receiver: 'Sirius-1', refs: ['x3'], questions: ['May I edit package.json?'],
    reason: 'The source does not say whether package.json may change. Recommend allowing the test script only.' }),
  working(4, 'implement', { id: 'a4', role: 'Sirius', actor: 'Sirius-1', startedAt: now - 12 * 60_000, createdAt: now - 13 * 60_000, card: sonnet },
    { objective: 'Rename the billing screen' }),
] }], accounts: {} });

test('sidecar: anything that needs you is the top line, red when color is on; nothing needs you, no red', () => {
  assert.equal(renderSidecar(holds(), { width: 80, now }).split('\n')[0], '3 needs you: #1, #2, #3');
  assert.equal(renderSidecar(holds(), { width: 80, now, color: true }).split('\n')[0], '\x1b[31m3 needs you: #1, #2, #3\x1b[0m');
  assert.match(renderSidecar(holds(), { width: 80, now, color: true }), /\x1b\[1mNOW \(\d+\)\x1b\[0m/, 'headings are bold');
  assert.equal(renderSidecar(fixture(), { width: 80, now }).split('\n')[0], '1 needs you: #1', 'an older hold with no cause still counts');
  const calm = holds(); calm.stores[0].threads = calm.stores[0].threads.filter(u => !u.hold);
  assert.equal(renderSidecar(calm, { width: 80, now, color: true }).split('\n')[0].replace(/\x1b\[[0-9;]*m/g, ''), 'Nothing needs you.');
  assert.doesNotMatch(renderSidecar(calm, { width: 80, now, color: true }), /needs you:|\x1b\[31m/);
});

test('sidecar: the decision card says why from the hold cause', () => {
  const flat = renderSidecar(holds(), { width: 80, now }).replace(/ *\n */g, ' ');
  assert.match(flat, /#1 Unit 1 Stopped: Questions still open after three turns/);
  assert.match(flat, /#2 Unit 2 Stopped: Still unclear after your answer/);
  assert.match(flat, /#3 Unit 3 Stopped: Only you can authorize this\./);
  assert.match(flat, /Suggested: The source does not say whether package\.json may change/);
  assert.doesNotMatch(flat, /rounds? of answers/, 'turns, not rounds');
  for (const width of [60, 80, 120]) for (const line of renderSidecar(holds(), { width, now }).split('\n')) assert.ok(line.length <= width, line);
});

test('sidecar: to-do lists four items not yet started, then how many more; a stopped item with work says how to continue it', () => {
  const snap = fixture();
  snap.stores[0].threads.push(...[7, 8, 9, 10, 11].map(n => unit(n, { objective: `Queued item ${n}`, current: { name: 'discover' } }, { events: [sealed(1, 'discover')] })));
  const lines = renderSidecar(snap, { width: 80, now }).split('\n');
  const todo = lines.findIndex(l => l === 'TO-DO (6)');
  assert.ok(todo > 0, lines.join('\n'));
  const listed = lines.slice(todo + 1).filter(l => /^ {2}#\d+ /.test(l));
  assert.equal(listed.length, 4);
  assert.ok(lines.includes('  (2 more)'));

  const ready = fixture();
  ready.stores[0].threads.push(unit(12, { objective: 'Half-built item', current: { name: 'plan' } }, {
    attempts: [{ id: 'a12', step: 'challenge', round: 0, role: 'Polaris', actor: 'Polaris-1', status: 'accepted', runs: [], swaps: [], createdAt: now - 40 * 60_000, startedAt: now - 40 * 60_000, endedAt: now - 30 * 60_000 }],
    events: [ev(40, 'started', { attemptId: 'a12', step: 'challenge' }), ev(30, 'reported', { attemptId: 'a12', step: 'challenge' }), ev(30, 'handoff', { attemptId: 'a12', from: 'challenge', to: 'plan' }), sealed(30, 'plan')] }));
  const flat = renderSidecar(ready, { width: 80, now }).replace(/ *\n */g, ' ');
  assert.match(flat, /#12 Half-built item.*Nothing is running it\. Continue it with: \$ pi-durable drive 12 --background/);
});
