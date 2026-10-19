import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUN, demoFrame, runDemo } from '../demo.mjs';
import { EventEmitter, once } from 'node:events';

const base = Date.UTC(2026, 9, 18, 9, 0);

test('demo: every step uses the shared board inside the window; missing protocol evidence stays unknown', () => {
  const strip = text => text.replace(/\x1b\[[0-9;]*m/g, '');
  for (const width of [80, 107, 120, 241]) for (let pos = 0; pos <= RUN.length; pos++) {
    for (const line of demoFrame(pos, { width, height: 53, base, color: true }).split('\n')) assert.ok(strip(line).length <= width, `${width} step ${pos}: ${JSON.stringify(strip(line))}`);
  }
  const end = demoFrame(RUN.length, { width: 241, base }).replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');
  assert.match(end, /Example complete · missing evidence stays unknown/);
  assert.match(end, /RULES, CHECKED ON THE RECORD/);
  assert.match(end, /· Questions settled within three rounds/);
  assert.match(end, /Written order confirmation for wholesale/);
  assert.match(end, /THE ONE LIST/);
});

test('demo: paging reaches the bottom and quitting removes its listeners', async () => {
  const input = new EventEmitter(), output = new EventEmitter();
  Object.assign(input, { isTTY: true, setRawMode() {}, resume() {}, pause() {} });
  Object.assign(output, { columns: 80, rows: 12, write(text) { this.emit('frame', text); } });
  const before = process.listenerCount('SIGINT'), first = once(output, 'frame');
  const running = runDemo({ input, output });
  await first; const next = once(output, 'frame'); input.emit('data', Buffer.from('G')); const [frame] = await next;
  assert.match(frame, /Lines/);
  input.emit('data', Buffer.from('q')); await running;
  assert.equal(input.listenerCount('data'), 0); assert.equal(output.listenerCount('resize'), 0);
  assert.equal(process.listenerCount('SIGINT'), before);
});

test('demo: a step that needs the operator says so and names the action', () => {
  const asks = RUN.map((s, i) => [s, i]).filter(([s]) => s.ask);
  assert.ok(asks.length >= 3);
  for (const [s, i] of asks) {
    const frame = demoFrame(i, { width: 160, base });
    assert.match(frame, new RegExp(`Waiting on you: ${s.ask}`));
    const flat = frame.replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');
    assert.ok(flat.includes('press enter ▸ ') && flat.includes(s.opt), `step ${i} names its action`);
  }
});
