import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSidecar, viewportBudgets } from '../demo-board.mjs';

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

test('106x53 overview with five live records fits without scrolling', () => {
  const frame = renderSidecar(viewportFixture(), { width: 106, height: 53, now });
  assert.ok(frame.split('\n').length <= 53); assert.match(frame.split('\n')[0], /5 running/);
  assert.doesNotMatch(frame, /Lines \d+-\d+\//);
});
