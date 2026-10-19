import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delegatedTelemetry } from '../delegated-telemetry.mjs';
import { delegatedFields, transitionDelegated, delegatedView } from '../delegated.mjs';
import { renderSidecar } from '../sidecar.mjs';
import { stateAt } from '../view.mjs';

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
