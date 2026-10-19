import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { openStore } from '../work.mjs';
import { delegatedTelemetry, stepLedger } from '../delegated-telemetry.mjs';
import { delegatedFields, transitionDelegated, delegatedView } from '../delegated.mjs';
import { renderSidecar, sidecarSnapshot } from '../sidecar.mjs';
import { stateAt } from '../view.mjs';

const exec = promisify(execFile);
const now = Date.now() + 1000;
const assignment = { objective: 'Observe the delegated worker', brief: 'Show what is happening.',
  sender: { actor: 'coordinator', job: 'dispatch', harness: 'claude', provider: 'a', model: 'a' },
  worker: { actor: 'worker', job: 'implement', harness: 'pi', provider: 'b', model: 'b' },
  where: { tmux: 'team:worker' }, step: 'implement' };
const rootWork = () => ({ id: 1, cwd: '/work', events: [], ...delegatedFields(assignment) });
const listing = (name = 'worker', dead = '0', paneIndex = '0') => `team\t${name}\t1\t@7\t${paneIndex}\t%7\t${dead}\tzsh\t/dev/pts/1\n`;
function adapters({ panes = listing(), foreground = '1 1 zsh\n1 1 pi', fail } = {}) {
  const calls = [];
  return { calls, exec: async (file, args) => {
    calls.push([file, args]);
    if (file === fail) throw new Error('Unavailable');
    if (file === 'tmux' && args[0] === 'list-panes') return panes;
    if (file === 'ps') return foreground;
    throw new Error('Unexpected read');
  } };
}

test('exact tmux targets never fall back to an unrelated live pane', async () => {
  for (const target of ['team:worker', 'team:1', 'team:worker.0', '@7', '%7']) {
    const a = adapters();
    const result = await delegatedTelemetry({ ...assignment, where: { tmux: target } }, a);
    assert.equal(result.tmux.state, 'running'); assert.equal(result.tmux.command, 'pi');
    assert.deepEqual(a.calls.map(c => c[0]), ['tmux', 'ps']);
  }
  const absent = await delegatedTelemetry(assignment, adapters({ panes: listing('some-other-window') }));
  assert.equal(absent.tmux.state, 'dead');
  assert.equal((await delegatedTelemetry({ ...assignment, where: { tmux: 'other:worker' } }, adapters())).tmux.state, 'dead');
});

test('dead, shell-only, unrelated command and unavailable probes cannot count as agents', async () => {
  assert.equal((await delegatedTelemetry(assignment, adapters({ panes: listing('worker', '1') }))).tmux.state, 'dead');
  for (const foreground of ['1 1 zsh', '1 1 bun', '1 2 pi\n2 2 zsh']) {
    assert.equal((await delegatedTelemetry(assignment, adapters({ foreground }))).tmux.state, 'stale');
  }
  for (const fail of ['tmux', 'ps']) assert.equal((await delegatedTelemetry(assignment, adapters({ fail }))).tmux.state, 'unknown');
  const fail = () => { throw new Error('No hint, no read'); };
  assert.deepEqual(await delegatedTelemetry({}, { exec: fail }), {});
  assert.deepEqual(await delegatedTelemetry({ ...assignment, done: true }, { exec: fail }), {});
});

test('only live delegated agents count in the header, including pure/demo snapshots', () => {
  const w = rootWork(); transitionDelegated(w, 'started', { actor: 'worker', text: 'I understand.' });
  for (const state of ['dead', 'stale', 'unknown', 'running', null]) {
    const v = delegatedView('/data', w); v.telemetry = state ? { tmux: { state } } : {};
    for (const width of [60, 80, 110, 160]) {
      const frame = renderSidecar({ at: now, base: '/data', stores: [{ dir: '/data', threads: [v] }] }, { width, now });
      assert.match(frame.split('\n')[0], new RegExp(`${state === 'running' ? 1 : 0} running`));
      assert.ok(frame.split('\n').every(line => line.length <= width));
      if (state) assert.match(frame, new RegExp(`tmux: ${state}`));
    }
  }
});

test('sender can terminate an unreported dead worker, never accept it or bypass a report exchange', () => {
  const w = rootWork(); transitionDelegated(w, 'started', { actor: 'worker', text: 'I understand.' });
  const exchange = JSON.stringify(w.exchanges);
  assert.throws(() => transitionDelegated(w, 'dead', { actor: 'worker', text: 'No.' }), /assigning agent/);
  assert.throws(() => transitionDelegated(w, 'dead', { actor: 'coordinator', text: '' }), /nonempty/);
  transitionDelegated(w, 'dead', { actor: 'coordinator', text: 'Worker window died; replacement owns the remaining work.' });
  assert.equal(w.delegationState, 'dead'); assert.ok(w.closedAt); assert.equal(w.activeCall, null);
  assert.equal(w.calls[0].outcome, 'dead'); assert.ok(w.calls[0].endedAt);
  assert.equal(w.acceptance, null); assert.equal(w.completion, undefined);
  assert.equal(JSON.stringify(w.exchanges), exchange);
  assert.equal(delegatedView('/data', w).done, false);
  assert.equal(delegatedView('/data', w).owner, 'coordinator');
  assert.equal(stateAt(delegatedView('/data', w), Date.now() + 1).state, 'dead');
  assert.throws(() => transitionDelegated(w, 'started', { actor: 'worker', text: 'Restart' }), /closed/);
  const reported = rootWork(); transitionDelegated(reported, 'started', { actor: 'worker', text: 'Understood.' });
  transitionDelegated(reported, 'reported', { actor: 'worker', text: 'A result.' });
  assert.throws(() => transitionDelegated(reported, 'dead', { actor: 'coordinator', text: 'No.' }), /return exchange/);
});

test('activity uses pane time or single-pane window time, never a different pane output', async () => {
  const at = Math.floor((now - 5000) / 1000);
  const sample = async (activity, count) => (await delegatedTelemetry(assignment, { ...adapters({ panes: listing().trimEnd() + `\t${activity}\t${at}\t${count}\n` }), now })).tmux;
  assert.equal((await sample('', 1)).outputAt, at * 1000);
  assert.equal((await sample('', 2)).outputAt, null);
  assert.equal((await sample(at - 5, 2)).outputAt, (at - 5) * 1000);
  assert.equal((await sample(Math.floor(now / 1000) + 60, 2)).outputAt, null);
});

test('TASKS hints and workspace fallback show NOW plus only retained checked completions', async () => {
  const paths = [], read = async path => { paths.push(path); return '# Tasks (next #100)\n## NOW\n- [ ] #99 Add activity\n## LATER\n- [ ] #100 Later\n## DONE\n- [x] #1 Shipped\n'; };
  const fallback = await delegatedTelemetry({ workspace: '/work' }, { read });
  assert.deepEqual(fallback.steps, { now: ['#99 Add activity'], done: 1 });
  await delegatedTelemetry({ workspace: '/work', where: { steps: 'ledgers/TASKS.md' } }, { read });
  assert.deepEqual(paths, ['/work/TASKS.md', '/work/ledgers/TASKS.md']);
  assert.deepEqual(stepLedger('# Tasks (next #100)\n## NOW\n- [ ] #99 Work'), { now: ['#99 Work'], done: 0 });
  const missing = await delegatedTelemetry({ workspace: '/work' }, { read: async () => { throw new Error('gone'); } });
  assert.deepEqual(missing.steps, { unavailable: true });
});

test('locate is sender-only, validates hints and persists through the CLI without changing NQ or lifecycle', async t => {
  const root = await mkdtemp(join(tmpdir(), 'delegated-locate-')), data = join(root, 'data'), file = join(root, 'where.json');
  t.after(() => rm(root, { recursive: true, force: true }));
  let store = await openStore(data);
  const id = await store.openDelegated({ ...assignment, workspace: root });
  await store.delegated(id, 'started', { actor: 'worker', text: 'Understood.' });
  const before = await store.get(id);
  await assert.rejects(store.delegated(id, 'locate', { actor: 'worker', where: { steps: 'TASKS.md' } }), /assigning agent/);
  await assert.rejects(store.delegated(id, 'locate', { actor: 'coordinator', where: { steps: 1 } }), /nonempty/);
  await store.close();
  await writeFile(file, JSON.stringify({ steps: 'ledger/TASKS.md', repo: '.' }));
  await exec(process.execPath, ['cli.mjs', 'delegate', 'locate', String(id), file, '--actor', 'coordinator'], { env: { ...process.env, WORK_DATA: data, PI_DURABLE_ALERT: 'none' } });
  store = await openStore(data);
  try {
    const saved = await store.get(id);
    assert.deepEqual(saved.where, { tmux: 'team:worker', steps: 'ledger/TASKS.md', repo: '.' });
    assert.deepEqual(saved.calls[0].where, saved.where);
    assert.equal(saved.delegationState, 'working'); assert.deepEqual(saved.exchanges, before.exchanges);
    assert.equal(saved.events.at(-1).type, 'delegated-locate');
  } finally { await store.close(); }
});

test('progress is worker-authored evidence, not a state change, turn, clearance, acceptance or release', () => {
  const w = rootWork(); transitionDelegated(w, 'started', { actor: 'worker', text: 'I understand.' });
  const previous = { state: w.delegationState, calls: w.calls.length, exchange: JSON.stringify(w.exchanges) };
  transitionDelegated(w, 'progress', { actor: 'worker', text: 'I merged the branch; checking the gate.' });
  assert.equal(w.delegationState, previous.state); assert.equal(w.calls.length, previous.calls);
  assert.equal(JSON.stringify(w.exchanges), previous.exchange);
  assert.equal(w.events.at(-1).type, 'delegated-progress');
  assert.throws(() => transitionDelegated(w, 'progress', { actor: 'coordinator', text: 'Fake worker update' }), /assigned worker/);
  assert.throws(() => transitionDelegated(w, 'progress', { actor: 'worker', text: ' ' }), /nonempty/);
  for (let n = 0; n < 3; n++) {
    transitionDelegated(w, 'question', { actor: 'worker', text: 'Question?' });
    transitionDelegated(w, 'answered', { actor: 'coordinator', text: 'Answer.' });
  }
  transitionDelegated(w, 'question', { actor: 'worker', text: 'Still unclear?' });
  const hold = JSON.stringify(w.hold), state = w.delegationState;
  transitionDelegated(w, 'progress', { actor: 'worker', text: 'Waiting for the scope decision.' });
  assert.equal(JSON.stringify(w.hold), hold); assert.equal(w.delegationState, state);
  assert.equal(stateAt(delegatedView('/data', w), Date.now() + 1).state, 'human-hold');
});

test('latest worker line and age survive newer sender location events at narrow widths', () => {
  const w = rootWork(); transitionDelegated(w, 'started', { actor: 'worker', text: 'Understood.' });
  transitionDelegated(w, 'progress', { actor: 'worker', text: 'First line\nMy latest deliverable is recorded.\n' });
  const at = Date.now() + 1000; w.events.at(-1).at = new Date(at - 12000).toISOString();
  transitionDelegated(w, 'locate', { actor: 'coordinator', text: 'not the worker update', where: { steps: 'TASKS.md' } });
  const projected = delegatedView('/data', w);
  for (const width of [60, 80, 110, 160]) {
    const frame = renderSidecar({ at, base: '/data', stores: [{ dir: '/data', threads: [projected] }] }, { width, now: at });
    const happening = frame.split('HAPPENING NOW')[1].split('WHERE THE WORK IS')[0].replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');
    assert.match(happening, /Update 12s ago/); assert.match(happening, /My latest deliverable is recorded\./);
    assert.doesNotMatch(happening, /not the worker update|First line/);
  }
});

test('CLI progress commits to SQLite, survives reopen, and refreshes sidecar hints each time', async t => {
  const root = await mkdtemp(join(tmpdir(), 'delegated-live-')), data = join(root, 'data'), file = join(root, 'update.txt');
  t.after(() => rm(root, { recursive: true, force: true }));
  let store = await openStore(data);
  const id = await store.openDelegated({ ...assignment, workspace: root });
  await store.delegated(id, 'started', { actor: 'worker', text: 'I understand.' }); await store.close();
  await writeFile(file, 'My next deliverable is the telemetry proof.');
  await exec(process.execPath, ['cli.mjs', 'delegate', 'progress', String(id), file, '--actor', 'worker'], { env: { ...process.env, WORK_DATA: data, PI_DURABLE_ALERT: 'none' } });
  store = await openStore(data);
  try {
    const saved = await store.get(id);
    assert.equal(saved.delegationState, 'working'); assert.equal(saved.events.at(-1).text, 'My next deliverable is the telemetry proof.');
  } finally { await store.close(); }
  let reads = 0;
  const telemetry = async () => ({ steps: { now: [`refresh ${++reads}`], done: reads } });
  const first = await sidecarSnapshot({ base: data, telemetry }), second = await sidecarSnapshot({ base: data, telemetry });
  assert.equal(reads, 2); assert.equal(first.stores[0].threads[0].telemetry.steps.done, 1);
  assert.equal(second.stores[0].threads[0].telemetry.steps.done, 2);
  assert.match(renderSidecar(second, { width: 110 }), /My next deliverable is the telemetry proof/);
});
