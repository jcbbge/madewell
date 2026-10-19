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
    hold: { kind: 'nq', ref: 'x1', at: ago(25), reason: 'plan: the handoff from Polaris is ambiguous or wrong: questions remain after three answers', recommendation: 'Keep it behind a flag for one release.',
      questions: ['May I remove the old spreadsheet export, or must it keep working for the finance team until they move over?'] } }),
  unit(2, { objective: 'Speed up the search results page', state: 'waiting-on-prerequisite', current: { name: 'verify' }, waitsOn: 4 }),
  unit(3, { objective: 'Rename the billing settings screen', state: 'question', current: { name: 'test-plan' },
    exchange: { id: 'x3', status: 'awaiting-originator', originator: 'Cassiopeia', rounds: 1 },
    record: { attempts: [], exchanges: [{ id: 'x3', turns: [{ type: 'worker', at: ago(4) }, { type: 'originator', at: ago(3) }, { type: 'worker', at: ago(2) }] }] } }),
  unit(4, { objective: 'Fix the pre-existing defect blocking thread 2: the cache key ignores the locale', state: 'working', parentId: 2, depth: 1,
    current: { name: 'implement' }, attempt: { id: 'a4', role: 'Sirius', state: 'running' },
    record: { attempts: [{ id: 'a4', step: 'implement', status: 'running', startedAt: now - 12 * 60_000, createdAt: now - 13 * 60_000, card: sol, health: 'ok',
      swaps: [{ from: sonnet, to: sol, at: ago(9), account: 'anthropic', resetsAt }] }], exchanges: [] } }),
  unit(5, { objective: 'Show the order total on the receipt', done: true, state: 'done', lastEvent: { at: ago(90), type: 'complete' },
    record: { attempts: [{ id: 'a5', step: 'verify', card: opus, swaps: [] }], exchanges: [], completion: 'verified' } }),
] }], accounts: { anthropic: resetsAt, openai: now - 1000 } });

const ENGINE = /exchange|attempt|thread|\bstore\b|\bNQ\b|intake|originator|prerequisite|arbiter|handoff|test-plan|awaiting|human-hold|Sirius|Cassiopeia/i;

const strip = text => text.replace(/\x1b\[[0-9;]*m/g, '');
// Panel borders are layout; reading the text means taking them out and undoing the wrapping.
const words = frame => strip(frame).replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');

test('sidecar: happening now carries the decision, the running jobs, the pause, the swap and the account', () => {
  const frame = renderSidecar(fixture(), { width: 160, now });
  const flat = words(frame);
  const at = text => { const i = flat.indexOf(text); assert.ok(i >= 0, `frame has ${JSON.stringify(text)}\n${frame}`); return i; };
  const order = ['HAPPENING NOW', 'WHERE THE WORK IS', 'THE ONE LIST', 'RULES, CHECKED ON THE RECORD', 'TELEMETRY', 'MINUTES PER STAGE', 'LOG'];
  order.reduce((prev, head) => { assert.ok(at(head) > prev, `${head} comes after the section before it`); return at(head); }, -1);
  at('? #1 Add CSV export to the reports page');
  at('May I remove the old spreadsheet export');
  at('Suggested: Keep it behind a flag for one release.');
  at('$ pi-durable answer 1 reply.txt');
  assert.ok(!flat.includes('drive 1 --background'), 'the runner continues answered work; no drive to type');
  at('waiting 25m');
  at('Make · maker on Codex · gpt-6.1-sol · 12m');
  at('Paused until fix #4 is done, then Run the check again.');
  at('Questions: round 2 of 3');
  at('Switched Make from Claude Code · claude-sonnet-5-5 to Codex · gpt-6.1-sol (anthropic out of quota until');
  at(`anthropic: out of quota until ${clock(resetsAt, now)}`);
  at('(in 2h 00m)');
  assert.ok(!flat.includes('Quiet.'), 'a board with running work is never called quiet');
  assert.ok(!/openai: out/.test(flat), 'an account past its reset is not shown');
  at('3 running');
  at('1 needs you');
});

test('sidecar: every line fits the window at every width, with and without color, and never speaks in engine words', () => {
  for (const width of [60, 80, 107, 120, 180, 241]) for (const color of [false, true]) {
    const frame = renderSidecar(fixture(), { width, now, color, height: 53 });
    for (const line of frame.split('\n')) assert.ok(strip(line).length <= width, `${width}: ${JSON.stringify(strip(line))} is ${strip(line).length}`);
    assert.ok(!ENGINE.test(words(frame).replace(/the pre-existing defect/g, '')), `engine word at ${width}:\n${strip(frame)}`);
  }
});

test('sidecar: where the work is, the rules and the telemetry come from the record', () => {
  const snap = fixture();
  const w5 = snap.stores[0].threads[4];
  w5.record = { delivery: true, completion: 'verified', failures: [{ id: 'f9', status: 'answered', ruling: { cause: 'implementation' } }], exchanges: [],
    events: [{ at: ago(200), type: 'created' }, { at: ago(150), type: 'handoff', from: 'discover', to: 'ideate' }, { at: ago(140), type: 'delivery-authorized' }, { at: ago(90), type: 'complete' }],
    attempts: [
      { id: 'd', step: 'discover', actor: 'a1', status: 'accepted', startedAt: now - 200 * 60_000, endedAt: now - 190 * 60_000, stats: [{ tokens: 400_000, cost: 1.25 }] },
      { id: 'm', step: 'implement', actor: 'a2', status: 'accepted', startedAt: now - 130 * 60_000, endedAt: now - 100 * 60_000, stats: [{ tokens: 600_000, cost: 0.75 }] },
      { id: 'v', step: 'verify', actor: 'a3', status: 'accepted', startedAt: now - 99 * 60_000, endedAt: now - 91 * 60_000, card: opus, stats: [] }] };
  for (const i of [0, 1, 2]) snap.stores[0].threads[i].record = { ...snap.stores[0].threads[i].record, delivery: true };
  const frame = renderSidecar(snap, { width: 241, now }), flat = words(frame);
  // The lanes: #1 waits on you in planning, #3 is in planning, #4 is being made, #2 is paused in verification.
  // Lanes sit side by side, so each lane is read as its own column of the frame.
  const lane = title => { const lines = strip(frame).split('\n'), r = lines.findIndex(l => l.includes(`─ ${title} `));
    const c = lines[r].indexOf(`─ ${title} `) - 1, end = lines[r].indexOf('╮', c);
    return lines.slice(r + 1).map(l => l.slice(c, end)).filter(l => l.startsWith('│')).join(' ').replace(/[│]/g, ' ').replace(/\s+/g, ' ').trim(); };
  assert.match(lane('PLANNING'), /contract · checks \? #1 ▸ #3/);
  assert.match(lane('IMPLEMENTATION'), /make ▸ #4 12m/);
  assert.match(lane('VERIFICATION'), /check · rule ‖ #2 waits #4/);
  assert.match(lane('DONE'), /1 1 today ✓ #5/);
  for (const rule of ['No one checked their own work', 'A failed check was routed, not ignored', 'Delivery finished only on passing checks', 'Questions settled within three rounds'])
    assert.match(flat, new RegExp(`✓ ${rule}`));
  assert.match(flat, /0\/1 checks passed|1\/1 .*checks passed/);
  assert.match(flat, /1\.0M .*\$2\.00/);
  assert.match(strip(frame), /discovery +█+░* +10m/);
  assert.match(strip(frame), /implementation +█+░* +42m/, 'the running fix counts its 12 minutes so far');
  assert.match(flat, /you +#5 go-ahead to build/);
  assert.match(flat, /#5 Show the order total on the receipt done/);
  assert.match(flat, /#1 Add CSV export to the reports page needs you/);
});

test('sidecar: another workspace is named by its folder, failures name the cause, and an empty data directory is a quiet frame', async () => {
  const snap = fixture();
  snap.stores.push({ dir: '/data/workspaces/ab12', workspace: '/work/api', driver: { alive: false }, threads: [
    unit(1, { objective: 'Retry failed webhooks', workspace: '/work/api', state: 'human-hold', current: { name: 'verify' },
      failure: { id: 'f1', status: 'held', report: 'webhook retry test: expected 3 calls, saw 1' },
      hold: { kind: 'failure', ref: 'f1', at: ago(5), reason: 'Tests still failing after 3 corrections' } }),
    unit(2, { objective: 'Archive old invoices', workspace: '/work/api', state: 'queued', current: { name: 'ideate' } }) ] });
  const flat = words(renderSidecar(snap, { width: 160, now }));
  assert.match(flat, /\? #1 \(api\) Retry failed webhooks/);
  assert.match(flat, /The checks still fail after 3 fixes\./);
  assert.match(flat, /“webhook retry test: expected 3 calls, saw 1”/);
  assert.match(flat, /\$ pi-durable answer 1 reply\.txt <cause> --workspace \/work\/api/);
  assert.ok(!/--delivery/.test(flat), 'nothing asks for a go-ahead');
  assert.match(flat, /2 need you/);

  const base = await mkdtemp(join(tmpdir(), 'mpd-sidecar-'));
  const empty = words(renderSidecar(await sidecarSnapshot({ base: join(base, 'missing'), now }), { now, width: 120 }));
  for (const text of ['Quiet. Nothing is running and nothing is waiting on you.', 'The list is empty.', 'No events yet.', '0 running', 'nothing needs you', '0 done today'])
    assert.ok(empty.includes(text), `empty frame has ${JSON.stringify(text)}\n${empty}`);
  await mkdir(join(base, 'workspaces', 'w1', 'observability'), { recursive: true });
  await writeFile(join(base, 'accounts.json'), JSON.stringify({ anthropic: resetsAt }));
  await writeFile(join(base, 'workspaces', 'w1', 'accounts.json'), JSON.stringify({ openai: resetsAt + 60_000 }));
  const s = await sidecarSnapshot({ base, now });
  assert.deepEqual(s.accounts, { anthropic: resetsAt, openai: resetsAt + 60_000 });
  const accountsFrame = words(renderSidecar(s, { now, width: 160 }));
  assert.match(accountsFrame, /! anthropic: out of quota until/);
  assert.match(accountsFrame, /! openai: out of quota until/);
});

test('sidecar: the machine panel shows cpu, memory, swap, disk, load and the busiest processes, inside the window', () => {
  const machine = { host: 'hive', cores: 8, load: [1.25, 1.5, 1.54], uptime: 2 * 86400 + 5 * 3600, cpu: 37, mem: { used: 9 * 2 ** 30, total: 16 * 2 ** 30 },
    swap: { used: 0, total: 2 * 2 ** 30 }, disk: { used: 140 * 2 ** 30, total: 155 * 2 ** 30 }, top: [{ name: 'node', cpu: 23, mem: 2 ** 30 }, { name: 'claude', cpu: 8, mem: 2 ** 29 }],
    history: [10, 20, 37, 90].map((cpu, i) => ({ at: i, cpu, mem: 56 })) };
  for (const width of [80, 107, 241]) {
    const frame = renderSidecar({ ...fixture(), machine }, { width, now, color: true });
    for (const line of frame.split('\n')) assert.ok(strip(line).length <= width, `${width}: ${strip(line)}`);
    const flat = words(frame);
    assert.match(flat, /MACHINE · hive/);
    assert.match(flat, /cpu █+░+ 37%/);
    assert.match(flat, /mem █+░+ 9\.0G \/ 16\.0G 56%/);
    assert.match(flat, /disk █+░* 140\.0G \/ 155\.0G 90%/);
    assert.match(flat, /load 1\.25 1\.50 1\.54 · 8 cores · up 2d 5h/);
    assert.match(flat, /busy node 23% 1\.0G · claude 8% 0\.5G/);
  }
  assert.match(strip(renderSidecar({ ...fixture(), machine }, { width: 241, now })), /37% ▁▂▃█/, 'the cpu history is a graph at full width');
});
