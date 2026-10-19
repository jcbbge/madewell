import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSidecar, viewportBudgets, humanAge } from '../demo-board.mjs';

const now = Date.UTC(2026, 9, 20, 12);
const before = new Date(now - 3_811_000).toISOString();
const strip = text => text.replace(/\x1b\[[0-9;]*m/g, '');
export function viewportFixture(count = 5) {
  const threads = Array.from({ length: count }, (_, i) => {
    const worker = { actor: `worker-${i + 1}`, job: 'implement', harness: 'pi', provider: 'example', model: 'example-model' };
    const update = { type: 'delegated-progress', at: before, state: 'working', actor: worker.actor, text: `Delivered item ${i + 1}; the independent check is next.` };
    return { kind: 'delegated', threadId: i + 1, objective: `Work item ${i + 1}`, state: 'working', done: false, worker,
      sender: { actor: 'coordinator', job: 'dispatch' }, current: { name: 'implement' }, where: { tmux: `team:worker-${i + 1}` }, lastEvent: update,
      telemetry: { tmux: { state: 'running', command: 'pi', outputAt: now - 7000, outputScope: 'pane output' },
        steps: { now: [`#3 Finish item ${i + 1}`], done: 2 }, usage: { context: '25.3%/500k', tokens: '↑12k ↓2.3k', cost: '$0.042' },
        repo: { hash: 'abc1234', at: now - 120000, changed: 3, subject: 'Example change' } },
      record: { kind: 'delegated', step: 'implement', attempts: [], exchanges: [], events: [update] } };
  });
  return { at: now, base: '/data', stores: [{ dir: '/data', threads }] };
}

test('overview budgets keep all sections visible and NOW below forty percent', () => {
  for (const height of [24, 40, 53, 80]) for (const width of [60, 106, 160]) for (const color of [false, true]) {
    const frame = strip(renderSidecar(viewportFixture(12), { width, height, now, color }));
    const lines = frame.split('\n');
    assert.ok(lines.length <= height, `${width}x${height}: ${lines.length}`);
    assert.ok(lines.every(line => line.length <= width));
    for (const title of ['MADE WELL', 'MACHINE', 'HAPPENING NOW', 'WHERE THE WORK IS', 'THE ONE LIST', 'MINUTES PER STAGE']) assert.ok(frame.includes(title), title);
    assert.ok(viewportBudgets(height).now <= Math.floor(height * 0.4));
    assert.match(frame, /\+\d+ more/);
  }
});

test('five records use two lines each; selection alone expands one record', () => {
  const fixture = viewportFixture();
  const frame = renderSidecar(fixture, { width: 106, height: 53, now });
  const happening = frame.split('HAPPENING NOW')[1].split('WHERE THE WORK IS')[0];
  const bodies = happening.split('\n').filter(line => line.startsWith('│ '));
  assert.equal(bodies.length, 10);
  for (let id = 1; id <= 5; id++) {
    assert.ok(happening.includes(`#${id} Work item ${id}`));
    assert.ok(happening.includes(`team:worker-${id}`));
  }
  assert.match(happening, /NOW #3 Finish item/); assert.match(happening, /ctx 25.3%/);
  const detail = renderSidecar(fixture, { width: 106, height: 53, now, selected: { storeDir: '/data', threadId: 3 }, detail: true });
  assert.match(detail, /#3 · DETAILS/); assert.match(detail, /Delivered item 3/);
  assert.doesNotMatch(detail, /Work item [1245]|WHERE THE WORK IS|MACHINE/);
});

test('dead records leave the live section and remain unaccepted in the one list', () => {
  const fixture = viewportFixture(7);
  for (const w of fixture.stores[0].threads.slice(0, 2)) {
    w.state = 'dead'; w.telemetry.tmux.state = 'dead'; w.objective = `Dead task ${w.threadId}`;
  }
  const frame = renderSidecar(fixture, { width: 106, height: 53, now });
  const happening = frame.split('HAPPENING NOW')[1].split('WHERE THE WORK IS')[0];
  assert.doesNotMatch(happening, /Dead task|tmux: dead|Recorded location/);
  assert.match(frame.split('\n')[0], /5 running/);
  const list = frame.split('THE ONE LIST')[1]; assert.match(list, /Dead task 1/); assert.match(list, /dead/);
  assert.equal(fixture.stores[0].threads[0].done, false);
});

test('ages are human and unavailable-only detail lines disappear without inventing metrics', () => {
  assert.equal(humanAge(before, now), '1h 03m');
  assert.equal(humanAge(now - 7000, now), '7s');
  assert.equal(humanAge(null, now), null);
  const fixture = viewportFixture(1), w = fixture.stores[0].threads[0];
  w.current.name = w.worker.actor;
  w.telemetry = { tmux: { state: 'unknown', outputAt: null }, steps: { unavailable: true },
    repo: { unavailable: true }, usage: { context: '?/500k', tokens: null, cost: null } };
  const frame = renderSidecar(fixture, { width: 106, height: 53, now });
  const happening = frame.split('HAPPENING NOW')[1].split('WHERE THE WORK IS')[0];
  assert.match(happening, /Update 1h 03m ago/);
  assert.doesNotMatch(happening, /UNKNOWN|3811s|Usage:|Commit:|Activity:|Steps:|Step: worker-1|Watch it:|Recorded location:/);
  const headline = happening.split('\n').find(line => line.includes('▸ #1'));
  assert.match(headline, /team:worker-1/);
});

test('106x53 overview with five live records fits without scrolling', () => {
  const frame = renderSidecar(viewportFixture(), { width: 106, height: 53, now });
  assert.ok(frame.split('\n').length <= 53); assert.match(frame.split('\n')[0], /5 running/);
  assert.doesNotMatch(frame, /Lines \d+-\d+\//);
});
