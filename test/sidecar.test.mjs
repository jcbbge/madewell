import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderSidecar, sidecarSnapshot, clock } from '../sidecar.mjs';

const now = Date.UTC(2026, 9, 16, 14, 0);
const ago = minutes => new Date(now - minutes * 60_000).toISOString();
const opus = { harness: 'claude', provider: 'anthropic', account: 'anthropic', model: 'claude-opus-5-5', effort: 'high' };
const sonnet = { harness: 'claude', provider: 'anthropic', account: 'anthropic', model: 'claude-sonnet-5-5', effort: 'low' };
const sol = { harness: 'codex', provider: 'openai', account: 'openai', model: 'gpt-6.1-sol', effort: 'low' };
const resetsAt = now + 2 * 3_600_000;

// The view files' shape (observe.mjs publishWork), as serve.mjs's snapshot returns them.
const unit = (threadId, extra) => ({ threadId, workspace: '/work/shop', objective: `Unit ${threadId}`, done: false, state: 'ready',
  current: null, round: 0, parentId: null, waitsOn: null, hold: null, failure: null, exchange: null, attempt: null,
  lastEvent: { at: ago(1), type: 'call' }, record: { attempts: [], exchanges: [], completion: null }, ...extra });

const fixture = () => ({ at: now, base: '/data', stores: [{ dir: '/data', workspace: '/work/shop', driver: { alive: true }, threads: [
  unit(1, { objective: 'Add CSV export to the reports page', state: 'human-hold', current: { name: 'plan' },
    hold: { kind: 'nq', ref: 'x1', at: ago(25), reason: 'The source does not say whether the old export may go. Recommend keeping it behind a flag for one release.',
      questions: ['May I remove the old spreadsheet export, or must it keep working for the finance team until they move over?'] } }),
  unit(2, { objective: 'Speed up the search results page', state: 'waiting-on-prerequisite', current: { name: 'verify' }, waitsOn: 4 }),
  unit(3, { objective: 'Rename the billing settings screen', state: 'question', current: { name: 'test-plan' },
    exchange: { id: 'x3', status: 'awaiting-originator', originator: 'Cassiopeia', answered: 1 },
    record: { attempts: [], exchanges: [{ id: 'x3', turns: [{ type: 'worker', at: ago(4) }, { type: 'originator', at: ago(3) }, { type: 'worker', at: ago(2) }] }] } }),
  unit(4, { objective: 'Fix the pre-existing defect blocking thread 2: the cache key ignores the locale', state: 'working', parentId: 2, depth: 1,
    current: { name: 'implement' }, attempt: { id: 'a4', role: 'Sirius', state: 'running' },
    record: { attempts: [{ id: 'a4', step: 'implement', status: 'running', startedAt: now - 12 * 60_000, createdAt: now - 13 * 60_000, card: sol, health: 'ok',
      swaps: [{ from: sonnet, to: sol, at: ago(9), account: 'anthropic', resetsAt }] }], exchanges: [] } }),
  unit(5, { objective: 'Show the order total on the receipt', done: true, state: 'done', lastEvent: { at: ago(90), type: 'complete' },
    record: { attempts: [{ id: 'a5', step: 'verify', card: opus, swaps: [] }], exchanges: [], completion: 'verified' } }),
] }], accounts: { anthropic: resetsAt, openai: now - 1000 } });

const ENGINE = /exchange|attempt|thread|\bstore\b|\bNQ\b|intake|originator|prerequisite|arbiter|handoff|test-plan|awaiting|human-hold|Sirius|Cassiopeia/i;

test('sidecar: decision card, rail, card label, question round, nested fix, swap and account reset, in that order', () => {
  const frame = renderSidecar(fixture(), { width: 80, now });
  // Text checks read the frame with its wrapping undone; layout checks read the lines.
  const flat = frame.replace(/ *\n */g, ' ');
  const at = text => { const i = flat.indexOf(text); assert.ok(i >= 0, `frame has ${JSON.stringify(text)}\n${frame}`); return i; };
  // 1. The decision card: the unit, what stopped it, the question, the recommendation, the exact command.
  assert.ok(at('WAITING ON YOU (1)') < at('IN PROGRESS') && at('IN PROGRESS') < at('ACCOUNTS') && at('ACCOUNTS') < at('RECENT'));
  at('#1 Add CSV export to the reports page');
  at('Stopped: Only you can authorize this.');
  at('? May I remove the old spreadsheet export');
  at('Suggested: The source does not say');
  at('$ pi-durable answer 1 reply.txt');
  at('Then continue it: $ pi-durable drive 1 --background');
  // 2. In progress: the stage rail, the job and its card, the round, the nested fix item, the last swap.
  at('ideation · planning · implementation · [verification]');
  at('ideation · [planning] · implementation · verification');
  at('ideation · planning · [implementation] · verification');
  at('Now: Make on Codex · gpt-6.1-sol, for 12m');
  at('Questions: turn 2 of 3');
  assert.ok(at('#2 Speed up the search results page') < at('Paused until fix #4 is done, then Run the check again.') && at('Paused until fix #4') < at('#4 Fix the pre-existing'));
  assert.match(frame, /\n {5}#4 Fix the pre-existing defect blocking #2/, 'the fix item is nested under the unit that waits on it');
  at('Switched Make from Claude Code · claude-sonnet-5-5 to Codex · gpt-6.1-sol (anthropic');
  // 3. Accounts: only the one still out, with its reset time. 4. Recent: the finished unit.
  at(`anthropic: out of quota until ${clock(resetsAt, now)} (in 2h 00m)`);
  assert.ok(!/openai: out/.test(frame), 'an account past its reset is not shown');
  at('#5 done · 1h 30m ago · Show the order total on the receipt');
});

test('sidecar: fits the pane at 60 and 120 columns and never speaks in engine words', () => {
  for (const width of [60, 80, 120]) {
    const frame = renderSidecar(fixture(), { width, now });
    for (const line of frame.split('\n')) assert.ok(line.length <= width, `${width}: ${JSON.stringify(line)} is ${line.length}`);
    // The objective is the operator's text; only "thread N" in it is the record's name for a unit.
    assert.ok(!ENGINE.test(frame.replace(/the pre-existing defect/g, '')), `engine word at ${width}:\n${frame}`);
  }
});

test('sidecar: failure holds name the cause, other stores carry WORK_DATA, and an empty data directory is a plain frame', async () => {
  const snap = fixture();
  snap.stores.push({ dir: '/data/workspaces/ab12', workspace: '/work/api', driver: { alive: false }, threads: [
    unit(1, { objective: 'Retry failed webhooks', workspace: '/work/api', state: 'human-hold', current: { name: 'verify' },
      failure: { id: 'f1', status: 'held', report: 'webhook retry test: expected 3 calls, saw 1' },
      hold: { kind: 'failure', ref: 'f1', at: ago(5), reason: 'Tests still failing after 3 corrections' } }),
    unit(2, { objective: 'Archive old invoices', workspace: '/work/api', state: 'delivery-authorization-required', current: { name: 'ideate' } }) ] });
  const frame = renderSidecar(snap, { width: 60, now });
  assert.match(frame, /#1 \(api\) Retry failed webhooks/);
  const flat = frame.replace(/ *\n */g, ' ');
  assert.match(flat, /Stopped: The checks still fail after 3 fixes\./);
  assert.match(flat, /" webhook retry test: expected 3 calls, saw 1/);
  assert.match(flat, /the cause is pre-existing, implementation or test/);
  assert.match(flat, /#2 \(api\) Archive old invoices Stopped: Discovery is done\. Building needs your go-ahead\..*\$ WORK_DATA=\/data\/workspaces\/ab12 pi-durable drive 2 \\? ?--delivery --background/);
  assert.match(frame, /WAITING ON YOU \(3\)/);
  // The exact command, continued with backslash-newline so it pastes whole yet fits the pane.
  const command = frame.slice(frame.indexOf('$ WORK_DATA=/data/workspaces/ab12')).split('\n');
  assert.ok(command[0].endsWith('\\'), 'the command continues on the next line');
  assert.equal(command.slice(0, 2).join('\n').replace(/\\\n */g, ''), '$ WORK_DATA=/data/workspaces/ab12 pi-durable answer 1 reply.txt <cause>');
  for (const line of frame.split('\n')) assert.ok(line.length <= 60, line);

  const base = await mkdtemp(join(tmpdir(), 'mpd-sidecar-'));
  assert.equal(renderSidecar(await sidecarSnapshot({ base: join(base, 'missing'), now }), { now }), 'Nothing is waiting on you.\n\nNothing in progress.');
  // Accounts are read from the shared file at the data root and from each store.
  await mkdir(join(base, 'workspaces', 'w1', 'observability'), { recursive: true });
  await writeFile(join(base, 'accounts.json'), JSON.stringify({ anthropic: resetsAt }));
  await writeFile(join(base, 'workspaces', 'w1', 'accounts.json'), JSON.stringify({ openai: resetsAt + 60_000 }));
  const s = await sidecarSnapshot({ base, now });
  assert.deepEqual(s.accounts, { anthropic: resetsAt, openai: resetsAt + 60_000 });
  assert.match(renderSidecar(s, { now }), /ACCOUNTS\n {2}anthropic: out of quota until .*\n {2}openai: out of quota/);
});

// Thread 17 plan, test 7l: a hold is the first thing in the pane, in red, and its card says why in turns.
const heldOn = (threadId, step, hold) => unit(threadId, { objective: `Unit ${threadId}`, state: 'human-hold', current: { name: step }, hold: { kind: 'nq', ref: `x${threadId}`, at: ago(3), ...hold } });
const holds = () => ({ at: now, base: '/data', stores: [{ dir: '/data', workspace: '/work/shop', driver: { alive: true }, threads: [
  heldOn(1, 'plan', { cause: 'turns', originator: 'Polaris', receiver: 'Cassiopeia-1', questionId: null, refs: ['x1'], questions: ['What does fast mean?'],
    reason: "plan: questions remain after three turns on the handoff from Polaris: its spec or the receiver's scope is wrong or unclear" }),
  heldOn(2, 'test-plan', { cause: 'after-human', originator: 'Cassiopeia', receiver: 'Orion-1', questionId: null, refs: ['x2'], questions: ['Which runner?'],
    reason: "test-plan: questions remain after the human's answer" }),
  heldOn(3, 'implement', { cause: 'authority', originator: 'Orion', receiver: 'Sirius-1', refs: ['x3'], questions: ['May I edit package.json?'],
    reason: 'The source does not say whether package.json may change. Recommend allowing the test script only.' }),
  unit(4, { objective: 'Rename the billing screen', state: 'working', current: { name: 'implement' }, attempt: { id: 'a4', role: 'Sirius', state: 'running' } }),
] }], accounts: {} });

test('sidecar: any hold puts "N HELD" on the top line, red when color is on; nothing held, no such line', () => {
  assert.equal(renderSidecar(holds(), { width: 80, now }).split('\n')[0], '3 HELD: #1, #2, #3');
  assert.equal(renderSidecar(holds(), { width: 80, now, color: true }).split('\n')[0], '\x1b[31m3 HELD: #1, #2, #3\x1b[0m');
  assert.equal(renderSidecar(fixture(), { width: 80, now }).split('\n')[0], '1 HELD: #1', 'an older hold with no cause still counts');
  const calm = holds(); calm.stores[0].threads = calm.stores[0].threads.filter(u => !u.hold);
  assert.doesNotMatch(renderSidecar(calm, { width: 80, now, color: true }), /HELD|\x1b\[31m/);
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
