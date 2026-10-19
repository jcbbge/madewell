import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUN, demoFrame } from '../demo.mjs';

const base = Date.UTC(2026, 9, 18, 9, 0);

test('demo: every step renders inside the window, and the finished run holds every rule', () => {
  const strip = text => text.replace(/\x1b\[[0-9;]*m/g, '');
  for (const width of [80, 107, 120, 241]) for (let pos = 0; pos <= RUN.length; pos++) {
    for (const line of demoFrame(pos, { width, height: 53, base, color: true }).split('\n')) assert.ok(strip(line).length <= width, `${width} step ${pos}: ${JSON.stringify(strip(line))}`);
  }
  const end = demoFrame(RUN.length, { width: 241, base }).replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');
  assert.match(end, /Run complete · every rule held/);
  for (const rule of ['No one checked their own work', 'Each step had its own agent', 'A failed check was routed, not ignored', 'Delivery finished only on passing checks', 'Questions settled within three rounds'])
    assert.match(end, new RegExp(`✓ ${rule}`), rule);
  assert.match(end, /#103 Written order confirmation for wholesale done/);
  assert.match(end, /2\/3 1 1\.9M|2\/3/);
});

test('demo: a step that needs the operator says so and names the action', () => {
  const asks = RUN.map((s, i) => [s, i]).filter(([s]) => s.ask);
  assert.ok(asks.length >= 3);
  for (const [s, i] of asks) {
    const frame = demoFrame(i, { width: 160, base });
    assert.match(frame, new RegExp(`Waiting on you: ${s.ask}`));
    assert.ok(frame.includes(`press enter  ▸ `) && frame.includes(s.opt), `step ${i} names its action`);
  }
});
