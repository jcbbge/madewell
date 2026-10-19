import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delegatedFields, transitionDelegated, delegatedView } from '../delegated.mjs';
import { renderSidecar } from '../sidecar.mjs';

const sender = { actor: 'coordinator', job: 'dispatch', harness: 'claude', provider: 'provider-a', model: 'model-a' };
const worker = { actor: 'board-worker', job: 'board', harness: 'pi', provider: 'provider-b', model: 'model-b' };
const machine = { host: 'test-machine', cpu: 25, cores: 4, load: [1, 2, 3], uptime: 3600,
  mem: { used: 2 ** 30, total: 4 * 2 ** 30 }, swap: { used: 0, total: 2 ** 30 }, disk: { used: 20 * 2 ** 30, total: 100 * 2 ** 30 }, top: [], history: [] };
const clean = frame => frame.replace(/\x1b\[[0-9;]*m/g, '').replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');
function setup(step = 'implement') {
  const w = { ...delegatedFields({ objective: 'Show this delegated work', brief: 'Restore the terminal board.', sender, worker, where: { tmux: 'team:board-worker' }, step }),
    id: 1, cwd: '/workspace', events: [{ type: 'delegated-opened', state: 'intake', at: new Date().toISOString() }] };
  const act = (verb, actor, text = 'I understand the assignment.') => transitionDelegated(w, verb, { actor, text });
  const frame = (width = 110, color = false) => {
    const now = Date.now() + 1;
    const view = delegatedView('/data', w);
    view.telemetry = { tmux: { state: w.delegationState === 'working' ? 'running' : 'stale', command: 'pi' } };
    return renderSidecar({ at: now, base: '/data', machine, stores: [{ dir: '/data', threads: [view], driver: { alive: false } }], accounts: {} }, { width, color });
  };
  return { w, act, frame };
}

test('live sidecar keeps the original header, machine meters and panel layout at 110 columns', () => {
  const s = setup(); s.act('started', worker.actor);
  const frame = s.frame(), flat = clean(frame);
  assert.match(frame.split('\n')[0], /MADE WELL.*1 running.*nothing needs you.*0 done today/);
  const headers = ['MACHINE', 'HAPPENING NOW', 'WHERE THE WORK IS', 'THE ONE LIST', 'TELEMETRY', 'MINUTES PER STAGE', 'LOG'];
  let previous = -1;
  for (const title of headers) { const at = frame.indexOf(title); assert.ok(at > previous, title); previous = at; }
  for (const title of ['DISCOVERY', 'YOU', 'DONE', 'IDEATION', 'PLANNING', 'IMPLEMENTATION', 'VERIFICATION']) assert.ok(frame.includes(title), title);
  for (const value of ['cpu', 'mem', 'swap', 'disk', 'load', 'busy', 'provider-b', 'model-b', 'team:board-worker', 'working', 'I understand the assignment.']) assert.ok(flat.includes(value), value);
  assert.doesNotMatch(frame, /Nothing is running it|drive 1|^NOW \(/m);
  for (const width of [60, 80, 110, 120, 160]) for (const color of [false, true]) assert.ok(s.frame(width, color).replace(/\x1b\[[0-9;]*m/g, '').split('\n').every(l => l.length <= width));
});

test('delegated question, returned report, acceptance and closure keep their real states in the old layout', () => {
  const s = setup(); s.act('started', worker.actor);
  s.act('question', worker.actor, 'Which evidence should be preserved?');
  assert.match(clean(s.frame()), /question.*Watch it: tmux window team:board-worker/);
  assert.match(clean(s.frame()), /Which evidence should be preserved/);
  s.act('answered', sender.actor, 'Keep the terminal output.'); s.act('clear', worker.actor);
  s.act('reported', worker.actor, 'The terminal output is attached.');
  assert.match(clean(s.frame()), /reported/); assert.match(clean(s.frame()), /The terminal output is attached/);
  assert.match(s.frame().split('\n')[0], /0 running/);
  s.act('accepted', sender.actor, 'I checked the result.'); s.act('closed', sender.actor);
  assert.match(clean(s.frame()), /closed/); assert.match(s.frame().split('\n')[0], /1 done today/);
  assert.doesNotMatch(s.frame(), /Nothing is running it|drive 1/);
});

test('delegated holds keep the old needs-you band; missing stage stays explicitly unplaced', () => {
  const s = setup('board');
  for (let n = 0; n < 3; n++) { s.act('question', worker.actor, `Question ${n}?`); s.act('answered', sender.actor, `Answer ${n}`); }
  s.act('question', worker.actor, 'Fourth question?');
  const frame = s.frame();
  assert.match(frame.split('\n')[0], /1 needs you/); assert.match(clean(frame), /Fourth question/);
  assert.match(clean(frame), /delegate human 1 reply.txt --actor human/);
  s.act('human', 'human', 'Keep the original scope.'); s.act('clear', worker.actor);
  assert.match(clean(s.frame()), /Delegated · stage not supplied: #1 working/);
  assert.doesNotMatch(s.frame(), /Nothing is running it|drive 1/);
});
