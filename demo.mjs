import { renderSidecar } from './sidecar.mjs';
import { panel, visible } from './tui.mjs';
import { machineSample } from './machine.mjs';

// The demo: one run end to end, stepped through the real board. A discovery run turns a voice memo into
// to-dos; the operator confirms, orders and starts one; it goes through the four delivery stages, a check
// fails, the failure is ruled pre-existing, its fix runs, and the item finishes. Every step builds the same
// view-file shape the board reads from a real store, so what renders is the board itself. Example data only.

const opus = { harness: 'claude', provider: 'anthropic', model: 'claude-opus-5-5', effort: 'high' };
const astra = { harness: 'codex', provider: 'openai', model: 'gpt-6-astra', effort: 'high' };
const sonnet = { harness: 'claude', provider: 'anthropic', model: 'claude-sonnet-5-5', effort: 'low' };
const luna = { harness: 'codex', provider: 'openai', model: 'gpt-6-luna', effort: 'low' };
const WORKSPACE = '/demo/bakery';

function fresh(base) {
  return { base, m: 0, units: new Map(), seq: 0 };
}
const at = (s, m = s.m) => s.base + m * 60_000;
const iso = (s, m) => new Date(at(s, m)).toISOString();
function add(s, id, objective, extra = {}) {
  const u = { threadId: id, workspace: WORKSPACE, objective, done: false, state: 'ready', current: null, round: 0, parentId: null, waitsOn: null,
    hold: null, failure: null, exchange: null, attempt: null, checklist: [], lastEvent: null,
    record: { delivery: false, completion: null, attempts: [], exchanges: [], failures: [], events: [] }, ...extra };
  s.units.set(id, u); ev(s, id, 'created'); return u;
}
const get = (s, id) => s.units.get(id);
function ev(s, id, type, extra = {}) {
  const u = get(s, id), e = { at: iso(s, s.m), type, ...extra };
  u.record.events.push(e); u.lastEvent = e;
}
function check(u, step, state) {
  const c = u.checklist.find(x => x.name === step);
  if (c) c.state = state; else u.checklist.push({ name: step, state });
}
function start(s, id, step, card) {
  const u = get(s, id), a = { id: `a${++s.seq}`, step, actor: `agent-${s.seq}`, status: 'running', startedAt: at(s), createdAt: at(s), card, health: 'ok', stats: [] };
  u.record.attempts.push(a); u.attempt = { id: a.id }; u.current = { name: step }; u.state = 'working'; check(u, step, 'current');
  ev(s, id, 'started', { attemptId: a.id, step });
}
function progress(s, id, text) { const u = get(s, id); ev(s, id, 'progress', { attemptId: u.attempt?.id, deliverable: text }); }
function finish(s, id, tokens, cost, { status = 'accepted', to } = {}) {
  const u = get(s, id), a = u.record.attempts.find(x => x.id === u.attempt.id);
  Object.assign(a, { status, endedAt: at(s), stats: [{ tokens, cost }] }); delete a.health;
  ev(s, id, 'reported', { attemptId: a.id, step: a.step });
  if (status !== 'accepted') return;
  check(u, a.step, 'done');
  if (to) { ev(s, id, 'handoff', { attemptId: a.id, from: a.step, to }); u.current = { name: to }; u.attempt = null; u.state = 'ready-next'; }
}
function hold(s, id, question, recommendation) {
  const u = get(s, id);
  u.state = 'human-hold';
  u.hold = { kind: 'nq', ref: `h${id}`, at: iso(s, s.m), reason: recommendation, questions: [question], recommendation };
  u.exchange = { id: `x${id}`, rounds: 0 }; u.record.exchanges.push({ id: `x${id}`, rounds: 0, turns: [{ type: 'worker', at: iso(s, s.m) }] });
}
function answer(s, id, text) {
  const u = get(s, id), x = u.record.exchanges.find(e => e.id === `x${id}`);
  x.turns.push({ type: 'human', at: iso(s, s.m), text }); x.rounds = 1; u.hold = null; u.exchange = null;
}
function complete(s, id, completion = 'verified') {
  const u = get(s, id);
  Object.assign(u, { done: true, state: 'done', current: null, attempt: null }); u.record.completion = completion; ev(s, id, 'complete');
}

// Each step: minutes after 09:00, who, the headline, the detail, and what it does to the record.
// A step with `ask` waits for the operator: Enter takes the action.
export const RUN = [
  { m: 0, who: 'operator', t: 'Adds a voice memo for discovery', d: 'pi-durable start --objective "voice memo, 14 min, after the Tuesday wholesale calls"',
    a: s => add(s, 101, 'Voice memo: Tuesday wholesale calls', { kind: 'discovery' }) },
  { m: 1, who: 'operator', t: 'Starts the discovery run', d: 'Discovery runs at once; what it finds joins the delivery queue.',
    a: s => start(s, 101, 'discover', opus) },
  { m: 4, who: 'agent', t: 'Looks before adding', d: 'Reads the project purpose, 23 existing items and 4 past operator answers, so nothing is added twice.',
    a: s => progress(s, 101, 'read purpose, 23 items, 4 past answers') },
  { m: 6, who: 'agent', t: 'Classifies the input', d: 'Voice memo · one speaker, talking to themself · thinking still early · high density.',
    a: s => progress(s, 101, 'classified: solo memo, early thinking, high density') },
  { m: 13, who: 'agent', t: 'Reads it through the lenses: 9 findings', d: 'What the work must be · who it is for · how it really gets done · what is missing · what is meant but not said.',
    a: s => progress(s, 101, 'lenses done: 9 findings') },
  { m: 15, who: 'agent', t: 'Names the one thing', d: '“Wholesale customers phone again to re-confirm because nobody confirms their order in writing.”',
    a: s => progress(s, 101, 'one thing: nobody confirms wholesale orders in writing') },
  { m: 17, who: 'agent', t: 'Routes every finding exactly once, then asks you', d: '6 keep (become to-dos) · 2 decide (questions for you) · 1 let go, named: “move to a bigger oven”, out of scope for now.',
    a: s => { finish(s, 101, 412_000, 1.38); hold(s, 101, 'Here are 6 to-dos and 2 questions from the memo: do Saturday pickups change, and are invoices in scope? Does that match?',
      'Confirm all 6. Keep Saturday pickups as they are; leave invoices out of scope.'); } },
  { m: 58, who: 'operator', ask: 'Confirm the findings', opt: 'Confirm all 6, answer the 2 questions', t: 'You confirm the findings',
    d: 'Answer recorded word for word: “Yes. Saturday pickups stay as they are. Invoices are not in scope.”',
    a: s => { answer(s, 101, 'Yes. Saturday pickups stay as they are. Invoices are not in scope.'); complete(s, 101, 'discovered');
      [[102, 'Seasonal price list card', 'delivery'], [103, 'Written order confirmation for wholesale', 'delivery'], [104, 'Fix the pickup-time typo on the website', 'quick'],
       [105, 'Wholesale re-order reminder', 'delivery'], [106, 'Label allergens on display trays', 'delivery'], [107, 'Answer the flour supplier email', 'quick']]
        .forEach(([id, title, kind], i) => { const u = add(s, id, title, { kind, order: 10 + i, parentId: null }); u.checklist = [{ name: 'discover', state: 'done' }]; u.from = 101; }); } },
  { m: 62, who: 'operator', ask: 'Put this run first', opt: 'pi-durable first 101', t: 'You put this run first',
    d: 'Another run was waiting. This one goes next instead; its items keep the order discovery found, wholesale leading.',
    a: s => { get(s, 103).order = 1; get(s, 105).order = 2; } },
  { m: 63, who: 'agent', t: 'Delivery starts on its own: #103',
    d: 'The runner takes the first item in line. Nobody approves it: the order is the only say you have, and you used it.',
    a: s => { const u = get(s, 103); u.record.delivery = true; start(s, 103, 'ideate', opus); } },
  { m: 71, who: 'agent', t: 'Ideation: the approach is shaped', d: 'Shaper: two options, an emailed confirmation or a text message. Recommends email, because wholesale customers already order by email.',
    a: s => { progress(s, 103, 'two options; recommends email'); finish(s, 103, 186_000, 0.61, { to: 'challenge' }); start(s, 103, 'challenge', astra); } },
  { m: 76, who: 'agent', t: 'Ideation: the approach is challenged', d: 'Challenger, a different agent: the confirmation is only as good as the price list it quotes. The approach holds: go ahead.',
    a: s => { progress(s, 103, 'holds; risk: quoted prices'); finish(s, 103, 121_000, 0.33, { to: 'plan' }); start(s, 103, 'plan', opus); } },
  { m: 88, who: 'agent', t: 'Planning: the contract', d: 'Making: an order confirmation email for every wholesale order. Not making: online ordering. Done when: each wholesale order gets a written confirmation with items, prices and pickup time within one hour.',
    a: s => { progress(s, 103, 'contract written: making, not making, done when'); finish(s, 103, 232_000, 0.74, { to: 'test-plan' }); start(s, 103, 'test-plan', astra); } },
  { m: 94, who: 'agent', t: 'Planning: how it will be checked', d: 'Three checks: every sample order gets a confirmation · the items match the order · the prices match the current price list.',
    a: s => { progress(s, 103, '3 checks written'); finish(s, 103, 98_000, 0.27, { to: 'implement' }); start(s, 103, 'implement', sonnet); } },
  { m: 101, who: 'operator', t: 'Something noticed in passing goes on the list', d: 'pi-durable start --objective "Shop sign says Satruday" · captured as a quick to-do; work goes straight back to #103.',
    a: s => add(s, 108, 'Fix “Satruday” on the shop sign', { kind: 'quick', order: 50 }) },
  { m: 131, who: 'agent', t: 'Implementation done, with proof', d: 'Maker: template written; 5 confirmations sent to sample orders; copies attached as proof.',
    a: s => { progress(s, 103, 'template + 5 sent copies'); finish(s, 103, 540_000, 0.92, { to: 'verify' }); start(s, 103, 'verify', luna); } },
  { m: 139, who: 'agent', t: 'Verification: check 3 fails', d: 'Checker, who did not make it: 2 of 5 confirmations quote prices that do not match the price list. Checks 1 and 2 pass.',
    a: s => { const u = get(s, 103); finish(s, 103, 144_000, 0.11, { status: 'failed-test' });
      u.state = 'test-failed'; u.current = { name: 'verify' }; u.failure = { id: 'f1', status: 'open', report: '2 of 5 confirmations quote prices that do not match the price list' };
      u.record.failures.push({ id: 'f1', status: 'open', at: iso(s, s.m) }); ev(s, 103, 'test-failed', { failureId: 'f1' }); } },
  { m: 143, who: 'agent', t: 'Whose problem is it? It was already there', d: 'The judge rules the failure pre-existing: the wholesale price list is out of date. A fix item #109 is made, and #103 waits on it, keeping its place.',
    a: s => { const u = get(s, 103), f = u.record.failures[0];
      Object.assign(f, { status: 'answered', ruling: { cause: 'pre-existing' } }); u.failure.status = 'answered'; ev(s, 103, 'failure-routed', { failureId: 'f1', cause: 'pre-existing' });
      Object.assign(u, { state: 'waiting-on-prerequisite', waitsOn: 109 });
      const fix = add(s, 109, 'Update the wholesale price list', { kind: 'fix', parentId: 103 }); fix.record.delivery = true;
      hold(s, 109, 'The wholesale price list is out of date: 14 October prices are missing. Can you send the current prices so the fix can apply them?',
        'Send this month\'s supplier sheet; the fix applies it and a checker compares every price.'); } },
  { m: 150, who: 'operator', ask: 'Unblock it', opt: 'pi-durable answer 109 prices-october.txt', t: 'You answer #109 with the October prices',
    d: 'Your answer goes to the fix item. A maker applies it; a different agent checks it.',
    a: s => { answer(s, 109, 'October supplier sheet attached: 14 prices changed.'); start(s, 109, 'implement', sonnet); } },
  { m: 158, who: 'agent', t: 'The fix is made and checked', d: 'Maker updates 14 prices; checker compares every line against the supplier sheet: all match. #109 finishes itself.',
    a: s => { finish(s, 109, 88_000, 0.14, { to: 'verify' }); start(s, 109, 'verify', luna); s.m += 4; finish(s, 109, 52_000, 0.04); complete(s, 109); } },
  { m: 162, who: 'record', t: '#103 is released and checked again', d: 'With its blocker done, #103 goes back to verification with a fresh checker.',
    a: s => { const u = get(s, 103); Object.assign(u, { waitsOn: null }); ev(s, 103, 'redriven', { step: 'verify' }); start(s, 103, 'verify', luna); } },
  { m: 168, who: 'agent', t: 'Verification: all 3 checks pass', d: 'Checker re-runs all three checks against the 5 sample orders: all pass.',
    a: s => finish(s, 103, 131_000, 0.10) },
  { m: 168, who: 'record', t: '#103 finishes itself', d: 'A delivery item is done only when its checks pass. Nobody marks it done by hand.',
    a: s => complete(s, 103) },
];

export function build(n, base) {
  const s = fresh(base);
  for (let i = 0; i < n; i++) { s.m = RUN[i].m; RUN[i].a(s); }
  const last = n ? RUN[n - 1].m : 0;
  // States between jobs read as the next job being ready.
  for (const u of s.units.values()) if (u.state === 'ready-next') u.state = 'ready';
  return { at: at(s, last), base: '/demo', stores: [{ dir: '/demo', workspace: WORKSPACE, driver: { alive: true }, threads: [...s.units.values()] }], accounts: {} };
}

const pad2 = n => String(n).padStart(2, '0');
const hhmm = m => `${pad2(9 + Math.floor(m / 60))}:${pad2(m % 60)}`;

// The demo's step drives the board's own narration: what just happened, what waits on you, the controls.
export function demoFrame(pos, { width = 120, height, base = Date.UTC(2026, 9, 18, 9, 0), color = false, machine = null } = {}) {
  pos = Math.max(0, Math.min(RUN.length, pos));
  const cur = RUN[pos], last = pos ? RUN[pos - 1] : null;
  const narration = {
    title: 'demo · bakery · example data',
    step: last ? { who: last.who === 'operator' ? 'you' : last.who, t: last.t, d: last.d }
      : { who: 'record', t: 'Press → to begin', d: 'Steps that need you stop and wait for Enter. p plays the run, ← steps back, r starts over.' },
    ask: cur?.ask ?? null, opt: cur?.opt ?? null,
    controls: (t, w) => {
      // A key that does nothing at this step is shown dimmed.
      const keys = [['→', 'step', cur && !cur.ask], ['enter', 'decide', Boolean(cur?.ask)], ['←', 'back', pos > 0], ['p', 'play', cur && !cur.ask], ['r', 'start over', true], ['q', 'quit', true]]
        .map(([k, l, live]) => live ? `${t.key(k)} ${t.ink(l)}` : t.faint(` ${k}  ${l}`)).join('   ');
      const state = !cur ? t.okBold('Run complete · every rule held') : cur.ask ? t.opBold(`Waiting on you: ${cur.ask}`) : t.muted('Running');
      const right = `${state}   ${t.muted(`${hhmm(last ? last.m : 0)} · step ${pos} of ${RUN.length}`)}`;
      const inner = w - 4, done = Math.round(inner * pos / RUN.length);
      return panel(t, 'RUN', [keys + ' '.repeat(Math.max(2, inner - visible(keys) - visible(right))) + right, t.accent('█'.repeat(done)) + t.line('░'.repeat(inner - done))], w,
        { tone: cur?.ask ? 'op' : 'line', titleTone: 'inkBold' });
    },
  };
  return renderSidecar({ ...build(pos, base), machine }, { width, height, color, narration });
}

// The interactive loop: arrows step, Enter decides, p plays (stopping at every decision), r restarts.
export async function runDemo({ output = process.stdout, input = process.stdin, start = 0 } = {}) {
  const d = new Date(); d.setHours(9, 0, 0, 0);
  const base = d.getTime(), tty = Boolean(output.isTTY), color = tty && !process.env.NO_COLOR;
  let pos = start, timer = null, machine = await machineSample().catch(() => null);
  // The machine panel is the real box, sampled every two seconds while the demo runs.
  const meters = setInterval(async () => { machine = await machineSample().catch(() => machine); draw(); }, 2000);
  const draw = () => {
    let frame = demoFrame(pos, { width: output.columns ?? 120, height: output.rows, base, color, machine });
    const rows = output.rows;
    if (rows && frame.split('\n').length > rows) frame = frame.split('\n').slice(0, rows).join('\n');
    output.write((tty ? '\x1b[H\x1b[2J' : '') + frame);
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const go = n => { pos = Math.max(0, Math.min(RUN.length, pos + n)); draw(); };
  if (tty) output.write('\x1b[?1049h\x1b[?25l');
  output.on?.('resize', draw);
  draw();
  await new Promise(resolve => {
    const quit = () => resolve();
    process.once('SIGINT', quit); process.once('SIGTERM', quit);
    if (!input?.isTTY) return;
    input.setRawMode(true); input.resume();
    // Keys typed quickly arrive together; each one counts. An arrow is three characters.
    input.on('data', chunk => { const text = chunk.toString(); for (let i = 0; i < text.length;) { const n = text.startsWith('\x1b[', i) ? 3 : 1; press(text.slice(i, i + n)); i += n; } });
    const press = k => {
      const cur = RUN[pos];
      if (k === 'q' || k === 'Q' || k === '\x03') return quit();
      if (k === '\x1b[C' || k === 'l' || k === 'n') { stop(); if (cur && !cur.ask) go(1); }
      else if (k === '\r' || k === '\n') { stop(); if (cur) go(1); }
      else if (k === '\x1b[D' || k === 'h' || k === 'b') { stop(); go(-1); }
      else if (k === 'r' || k === 'R') { stop(); pos = 0; draw(); }
      else if (k === 'p' || k === 'P' || k === ' ') {
        if (timer) return stop();
        timer = setInterval(() => { const c = RUN[pos]; if (!c || c.ask) return stop(); go(1); }, 1100);
      }
    };
  });
  stop(); clearInterval(meters); output.off?.('resize', draw);
  if (input?.isTTY) { input.setRawMode(false); input.pause(); }
  if (tty) output.write('\x1b[?25h\x1b[?1049l');
}
