// The run view (#78 plan §1, §7 a b c e g h): one derivation of state from the durable record, live and in
// replay, read from real records (#17, #31, #52, #78) copied into test/fixtures/run-view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stateAt, runView, terminalLines, renderPanels, timeline, ms, tilde, STAGES, STAGE_OF } from '../view.mjs';

const fixture = n => JSON.parse(readFileSync(new URL(`./fixtures/run-view/thread-${n}.json`, import.meta.url), 'utf8'));
const STORE = '/data/workspaces/w1';
const snapOf = (threads, at, { alive = false } = {}) => ({ at, base: '/data', home: '/home/op', silentMs: 300_000,
  stores: [{ dir: STORE, workspace: '/home/op/madewell', driver: { pid: alive ? 4242 : null, alive, since: null }, threads }], accounts: {} });
const sel = threadId => ({ storeDir: STORE, threadId });
const end = w => Math.max(...timeline(w));
const at = iso => Date.parse(iso);
const event = (w, type, pred = () => true) => { const e = w.record.events.find(e => e.type === type && pred(e)); assert.ok(e, `#${w.threadId} has a ${type} event`); return e; };
const all = () => [17, 31, 52, 78].map(fixture);
const latest = () => Math.max(...all().map(end));

// The view's nested parts are found by what they are, not by where the implementer keeps them.
function walk(x, out = []) {
  if (Array.isArray(x)) for (const y of x) walk(y, out);
  else if (x && typeof x === 'object') { out.push(x); for (const y of Object.values(x)) walk(y, out); }
  return out;
}
const node = (v, label) => { const n = walk(v.lanes).find(o => typeof o.label === 'string' && o.label.startsWith(label) && 'state' in o); assert.ok(n, `lane node ${label}`); return n; };
const stage = (v, name) => { const s = walk(v.lanes).find(o => typeof o.name === 'string' && o.name.toLowerCase() === name && Array.isArray(o.chips)); assert.ok(s, `stage ${name}`); return s; };
const tile = (v, key) => {
  const t = v.telemetry.tiles, found = Array.isArray(t) ? t.find(x => [x.key, x.id, x.name].includes(key)) : t?.[key];
  assert.ok(found && 'value' in found && 'label' in found && 'reason' in found, `tile ${key} is {value, label, reason}`);
  return found;
};
const item = (v, n) => { const i = v.items.find(i => i.threadId === n); assert.ok(i, `item #${n}`); return i; };
const chips = v => walk(v.lanes).flatMap(o => Array.isArray(o.chips) ? o.chips : []);

test('view: the stage map, the stage list, ms and tilde are as the plan names them', () => {
  assert.deepEqual(STAGES, ['ideation', 'planning', 'implementation', 'verification']);
  assert.deepEqual(STAGE_OF, { discover: 'discovery', ideate: 'ideation', challenge: 'ideation', plan: 'planning', 'test-plan': 'planning',
    implement: 'implementation', verify: 'verification', arbitrate: 'verification' });
  assert.equal(ms('2026-10-17T02:03:16.098Z'), Date.parse('2026-10-17T02:03:16.098Z'));
  assert.equal(ms(1792202596258), 1792202596258);
  assert.equal(tilde('/home/op/madewell', '/home/op'), '~/madewell');
  assert.equal(tilde('/data/workspaces/w1', '/home/op'), '/data/workspaces/w1');
});

test('timeline: sorted, without repeats, and holds every event, turn, attempt start and end, and call start', () => {
  for (const w of all()) {
    const tl = timeline(w);
    assert.deepEqual(tl, [...new Set(tl)].sort((a, b) => a - b), `#${w.threadId} sorted and unique`);
    const has = (t, what) => assert.ok(tl.includes(ms(t)), `#${w.threadId} timeline has ${what} ${t}`);
    for (const e of w.record.events) { has(e.at, e.type); if (e.type === 'call') has(e.startedAt, 'call start'); }
    for (const x of w.record.exchanges) for (const t of x.turns) has(t.at, `${t.type} turn`);
    for (const a of w.record.attempts) { if (a.startedAt != null) has(a.startedAt, 'attempt start'); if (a.endedAt != null) has(a.endedAt, 'attempt end'); }
  }
});

test('7a: stateAt at the end of each real record equals the state its view file holds', () => {
  for (const w of all()) assert.equal(stateAt(w, end(w)).state, w.state, `#${w.threadId}`);
  // Later, with nothing new recorded, replay still says the same: replay never shows "stopped".
  for (const w of all()) assert.equal(stateAt(w, end(w) + 3_600_000).state, w.state, `#${w.threadId} an hour on`);
});

test('7b: replay of #17 steps through the failed check, the wait on fix #31, and done', () => {
  const w17 = fixture(17), threads = all(), snap = snapOf(threads, latest() + 60_000);
  const failed = at(event(w17, 'test-failed').at), routed = at(event(w17, 'failure-routed').at);
  const released = at(event(w17, 'prerequisite-done').at), complete = at(event(w17, 'complete').at);
  const discover = event(w17, 'brief-sealed', e => e.step === 'discover'), started = event(w17, 'started', e => e.step === 'discover');
  assert.equal(stateAt(w17, at(discover.at)).state, 'intake', 'a sealed brief whose exchange has no turn yet is intake');
  assert.equal(stateAt(w17, at(started.at) + 1).state, 'working');

  for (const t of [failed, routed - 1]) {
    assert.equal(stateAt(w17, t).state, 'test-failed', `at ${new Date(t).toISOString()}`);
    const v = runView(snap, { at: t, select: sel(17) });
    assert.equal(stage(v, 'verification').state, 'fail', 'Verification fails while the failure is open');
    assert.equal(v.now.who, 'agent');
    assert.equal(v.now.headline, 'Rule on a failure');
    assert.equal(item(v, 17).who, 'Arbiter');
  }
  for (const t of [routed, released - 1]) {
    const s = stateAt(w17, t);
    assert.equal(s.state, 'waiting-on-prerequisite', `at ${new Date(t).toISOString()}`);
    const v = runView(snap, { at: t, select: sel(17) });
    assert.ok(chips(v).includes('waits #31'), `a stage carries the chip "waits #31": ${JSON.stringify(chips(v))}`);
    assert.equal(v.now.who, 'sys');
    assert.match(v.now.headline, /Paused until fix #31 is done/);
    assert.equal(item(v, 17).who, '#31');
    assert.equal(item(v, 17).waitsOn, '#31');
    assert.equal(item(v, 31).kind, 'fix');
    assert.equal(item(v, 31).from, '#17');
  }
  assert.equal(item(runView(snap, { at: released - 1, select: sel(17) }), 31).pill, 'done', '#31 is done before #17 is released');
  const v = runView(snap, { at: complete, select: sel(17) });
  assert.equal(stateAt(w17, complete).state, 'done');
  assert.equal(v.rules[4].status, 'ok', 'rule 5: done only on passing checks');
  assert.equal(v.now.who, 'sys');
  assert.equal(v.now.headline, 'Done');
  assert.match(v.now.detail, /^verified \d\d:\d\d$/);
  assert.equal(item(v, 17).who, '');
  assert.equal(item(v, 17).stage, 'Done');

  // Stepping the whole timeline reaches the wait on #31 and then done, and never shows "stopped".
  const steps = timeline(w17), states = steps.map(t => stateAt(w17, t).state);
  assert.ok(!states.includes('stopped'));
  const i = states.indexOf('test-failed'), j = states.indexOf('waiting-on-prerequisite'), k = states.lastIndexOf('done');
  assert.ok(i >= 0 && i < j && j < k && k === states.length - 1, states.join(' '));
  assert.ok(steps.some(t => chips(runView(snap, { at: t, select: sel(17) })).includes('waits #31')));
});

test('7c: #78 one millisecond after its hold is waiting on you; at your answer it is not', () => {
  const w78 = fixture(78), snap = snapOf(all(), latest() + 60_000);
  const holdAt = at(event(w78, 'alerted').holdAt), answered = at(w78.record.exchanges.flatMap(x => x.turns).find(t => t.type === 'human').at);
  const asked = w78.record.exchanges.flatMap(x => x.turns).filter(t => t.type === 'worker' && at(t.at) < holdAt).at(-1);
  assert.equal(holdAt, at('2026-10-17T03:54:30.733Z'));
  assert.ok(asked.questions.length > 0, 'the fixture asked before the hold');

  assert.equal(stateAt(w78, holdAt - 1).state, 'question', 'before the hold: a worker turn with questions');
  const s = stateAt(w78, holdAt + 1);
  assert.equal(s.state, 'human-hold');
  assert.equal(s.hold.kind, 'nq');
  assert.deepEqual(s.hold.questions, asked.questions, 'the questions of the last worker turn before the hold');

  const v = runView(snap, { at: holdAt + 1, select: sel(78) });
  assert.equal(v.live, false);
  assert.equal(v.now.who, 'op');
  assert.equal(v.now.headline, 'Waiting on you');
  assert.ok(v.now.decide, 'a decision is offered');
  assert.equal(v.now.decide.kind, 'nq');
  assert.equal(v.now.decide.question, asked.questions.join('\n'));
  assert.deepEqual(v.now.decide.options, ['Send answer']);
  assert.equal(v.now.decide.disabled, true, 'replay never answers');
  assert.match(v.now.decide.reason, /replaying/);
  assert.equal(item(v, 78).who, 'you');
  assert.equal(item(v, 78).waitsOn, 'you');

  assert.notEqual(stateAt(w78, answered).state, 'human-hold', 'the hold ends at the human turn (end not included)');
  assert.equal(stateAt(w78, answered).state, 'intake', 'the last turn is the human one');
  assert.equal(runView(snap, { at: answered, select: sel(78) }).now.decide, null);

  // The wait is counted: no stop before the hold, one after, and the minutes cover the 11 s it lasted.
  const stops = t => tile(runView(snap, { at: t, select: sel(78) }), 'stops').value;
  const waited = t => tile(runView(snap, { at: t, select: sel(78) }), 'waitedMin').value;
  assert.equal(stops(holdAt - 1), 0);
  assert.equal(stops(answered), 1);
  assert.equal(stops(end(w78)), 1);
  assert.equal(waited(holdAt - 1), 0);
  const minutes = (answered - holdAt) / 60_000;
  assert.ok(Number.isFinite(waited(end(w78))) && Math.abs(waited(end(w78)) - minutes) < 1, `waitedMin ${waited(end(w78))} covers ${minutes}`);
  assert.ok(waited(answered) >= waited(holdAt + 1));

  const log = runView(snap, { at: end(w78), select: sel(78) }).log;
  assert.ok(log.some(l => l.who === 'op' && l.text === 'You answered'), 'the human turn is in the log');
  assert.ok(log.some(l => l.who === 'sys' && l.text === 'Alert sent (desktop ok)'));
  assert.ok(log.some(l => l.who === 'agent' && l.text === `Asked: ${asked.questions[0]}`));
});

test('live: #78 working names its job and card; with no driver it is stopped; replay never says stopped', () => {
  const w78 = fixture(78), a = w78.record.attempts.find(a => a.step === 'test-plan' && a.status === 'running');
  const later = a.startedAt + 5 * 60_000;
  let v = runView(snapOf(all(), later, { alive: true }));
  assert.equal(v.live, true);
  assert.equal(v.selected?.threadId, 78, 'the working item is selected when nothing is held');
  assert.equal(v.now.who, 'agent');
  assert.equal(v.now.headline, 'Design the check on Claude Code · claude-opus-5-5');
  assert.equal(v.now.detail, 'for 5m');
  assert.equal(item(v, 78).who, 'Orion');
  v = runView(snapOf(all(), later, { alive: false }), { select: sel(78) });
  assert.equal(v.now.who, 'sys', 'live with no driver: stopped');
  v = runView(snapOf(all(), later + 1, { alive: false }), { at: later, select: sel(78) });
  assert.equal(v.live, false);
  assert.equal(v.now.who, 'agent', 'replay shows the work, not "stopped"');
});

test('lanes: discovery and operator nodes say done, on, pending or — with the reason', () => {
  const snap = snapOf(all(), latest() + 60_000);
  const v17 = runView(snap, { select: sel(17) }), v78 = runView(snap, { select: sel(78) }), v31 = runView(snap, { select: sel(31) });
  for (const label of ['Intake', 'Report', 'Hand-off']) assert.equal(node(v17, label).state, 'done', label);
  assert.equal(node(v17, 'Questions').state, 'na');
  assert.equal(node(v17, 'Questions').reason, 'none asked');
  assert.notEqual(node(v78, 'Questions').state, 'na', '#78 asked one question in discovery');
  for (const label of ['Confirm findings', 'Set order']) { assert.equal(node(v17, label).state, 'na'); assert.equal(node(v17, label).reason, 'not recorded'); }
  assert.equal(node(v17, 'Start').state, 'done');
  assert.equal(node(v17, 'Start').reason, 'set when the item was created');
  assert.equal(node(v31, 'Start').reason, "authorized by the Arbiter's pre-existing ruling on #17");
  for (const name of ['ideation', 'planning', 'implementation', 'verification']) {
    const s = stage(v17, name);
    assert.equal(s.state, 'done', name);
    assert.ok(['minutes', 'sub', 'chips'].every(k => k in s), JSON.stringify(s));
  }
  assert.deepEqual(['ideation', 'planning', 'implementation', 'verification'].map(n => stage(v17, n).sub), ['shape·challenge', 'contract·checks', 'make', 'check']);
  assert.equal(stage(v78, 'planning').state, 'on');
  assert.equal(stage(v78, 'implementation').state, 'pending');
});

test('items, tiles and the log come from the record', () => {
  const snap = snapOf(all(), latest() + 60_000, { alive: true });
  const v = runView(snap, { select: sel(17) });
  assert.deepEqual(v.items.map(i => i.threadId).sort((a, b) => a - b), [17, 31, 52, 78]);
  assert.deepEqual([17, 31, 52, 78].map(n => item(v, n).pill), ['done', 'done', 'done', 'task']);
  assert.deepEqual([17, 31, 52, 78].map(n => item(v, n).kind), ['delivery', 'fix', 'delivery', 'delivery']);
  assert.equal(item(v, 17).from ?? '', '', 'only fix items say where they came from');
  assert.equal(item(v, 78).who, 'Orion');
  assert.deepEqual(['todo', 'task', 'done'].map(k => tile(v, k).value), [0, 1, 3]);
  assert.equal(tile(v, 'checksPassed').value, '1/2', '#17: two verify runs, the second passed');
  assert.equal(tile(v, 'checksFailed').value, 1);
  assert.equal(tile(v, 'stops').value, 0);
  assert.equal(tile(runView(snap, { select: sel(31) }), 'checksPassed').value, '1/3');
  assert.equal(tile(runView(snap, { select: sel(31) }), 'checksFailed').value, 2);
  assert.equal(tile(runView(snap, { select: sel(52) }), 'checksPassed').value, '1/1');
  for (const key of ['tokens', 'cost']) {
    const t = tile(v, key);
    assert.equal(t.value, null, `${key}: the fixture carries no launch streams`);
    assert.ok(typeof t.reason === 'string' && t.reason.length > 0, `${key} says why it is —`);
  }
  assert.ok(Array.isArray(v.telemetry.bars) && v.telemetry.bars.length >= 6, 'five stages plus the operator wait');

  const log = v.log;
  assert.ok(log.length > 0);
  for (let i = 1; i < log.length; i++) assert.ok(ms(log[i].t) >= ms(log[i - 1].t), 'time order');
  assert.deepEqual(log[0], { t: log[0].t, who: 'sys', text: 'Created' });
  const has = (who, text) => assert.ok(log.some(l => l.who === who && (text instanceof RegExp ? text.test(l.text) : l.text === text)), `${who}: ${text}`);
  has('sys', 'Brief sealed: Discover');
  has('agent', 'Discover started');
  has('agent', 'Discover reported');
  has('agent', /^intake Discover 35(\.\d+)?s$/);
  has('sys', 'Handed discover → ideate');
  has('agent', 'A check failed');
  has('agent', 'Routed: pre-existing');
  has('sys', 'Fix #31 done');
  has('sys', 'Done, verified');
  has('agent', 'Clear');
});

test('7e: the six rules on #17 and #52 are ok or pending, each with its evidence; doctored records break them', () => {
  const snap = threads => snapOf(threads, latest() + 60_000);
  for (const n of [17, 52]) {
    const v = runView(snap(all()), { select: sel(n) });
    assert.equal(v.rules.length, 6);
    for (const r of v.rules) {
      assert.ok(['ok', 'pend'].includes(r.status), `#${n} ${r.label}: ${r.status} ${r.evidence}`);
      assert.ok(typeof r.label === 'string' && r.label && typeof r.evidence === 'string' && r.evidence, `#${n} rule has label and evidence`);
    }
    assert.equal(v.rules[0].status, 'pend', 'delivery set at creation');
    assert.match(v.rules[0].evidence, /the record does not say who asked/);
    assert.equal(v.rules[1].status, 'ok');
    assert.match(v.rules[1].evidence, /labels only$/, 'the fixtures carry no session ids');
    assert.equal(v.rules[3].status, 'ok', 'the failed check was routed');
    assert.equal(v.rules[4].status, 'ok');
    assert.equal(v.rules[5].status, 'ok');
    assert.match(v.rules[5].evidence, /max \d of 3/);
  }
  assert.match(runView(snap(all()), { select: sel(17) }).rules[1].evidence, /^2 verify runs, each a different session from its maker/);
  const v78 = runView(snap(all()), { select: sel(78) });
  assert.equal(v78.rules[1].status, 'pend', 'no verify yet');
  assert.equal(v78.rules[3].status, 'pend');
  assert.match(v78.rules[3].evidence, /no check failed/);
  assert.equal(v78.rules[4].status, 'pend', 'not done');

  // Session ids, when the snapshot has them, come from each launch's stats.
  const sessions = (w, of) => { for (const a of w.record.attempts) { const id = of(a); a.runs = a.runs.map(r => ({ ...r, sessionId: id })); a.stats = a.runs.map(() => ({ sessionId: id })); } return w; };
  const own = sessions(fixture(17), a => `s-${a.id}`), vOwn = runView(snap([own]), { select: sel(17) });
  assert.equal(vOwn.rules[1].status, 'ok');
  assert.doesNotMatch(vOwn.rules[1].evidence, /labels only/);
  assert.equal(vOwn.rules[2].status, 'ok');
  assert.match(vOwn.rules[2].evidence, /8 sessions, 8 actors/);
  const impl = own.record.attempts.find(a => a.step === 'implement');
  const shared = sessions(fixture(17), a => a.step === 'verify' || a.id === impl.id ? 'one-session' : `s-${a.id}`);
  assert.equal(runView(snap([shared]), { select: sel(17) }).rules[1].status, 'bad', 'a verifier sharing its maker\'s session checked its own work');
  const same = fixture(17);
  for (const a of same.record.attempts) if (a.step === 'verify') a.actor = same.record.attempts.find(b => b.step === 'implement').actor;
  assert.equal(runView(snap([same]), { select: sel(17) }).rules[1].status, 'bad', 'same actor');

  // Rule 1: building began with no delivery set and no authorization.
  const unasked = fixture(52); unasked.record.delivery = false;
  assert.equal(runView(snap([unasked]), { select: sel(52) }).rules[0].status, 'bad');
  // Rule 6: four originator turns in one exchange.
  const talky = fixture(52), x = talky.record.exchanges[0], t0 = at(x.turns[0].at);
  x.turns = [x.turns[0], ...[1, 2, 3, 4].flatMap(i => [{ type: 'originator', at: new Date(t0 + i * 2).toISOString(), questions: [], clear: null, text: 'answer' },
    { type: 'worker', at: new Date(t0 + i * 2 + 1).toISOString(), questions: i < 4 ? ['still?'] : [], clear: i === 4, text: '' }])];
  assert.equal(runView(snap([talky]), { select: sel(52) }).rules[5].status, 'bad');
});

test('7g: terminalLines fit 60, 80 and 120 columns and come in the plan\'s order', () => {
  const snap = snapOf(all(), latest() + 60_000, { alive: true });
  for (const width of [60, 80, 120]) {
    const lines = terminalLines(runView(snap), { width });
    for (const l of lines) {
      assert.ok(['', 'h', 'q', 'ok', 'bad', 'dim'].includes(l.cls), `cls ${l.cls}`);
      assert.ok(l.text.length <= width, `${width}: ${JSON.stringify(l.text)}`);
    }
    const texts = lines.map(l => l.text);
    assert.equal(texts[0], 'Nothing needs you.');
    const iNow = texts.findIndex(t => /^NOW \(\d+\)$/.test(t)), iDone = texts.findIndex(t => t.startsWith('DONE TODAY: '));
    assert.ok(iNow > 0 && iDone > iNow, texts.join('\n'));
    assert.equal(lines[iNow].cls, 'h');
  }
  // In replay at #78's hold, it needs you: first line, in the bad colour.
  const holdAt = at(event(fixture(78), 'alerted').holdAt);
  const held = terminalLines(runView(snapOf(all(), latest() + 60_000), { at: holdAt + 1 }), { width: 80 });
  assert.equal(held[0].text, '1 needs you: #78');
  assert.equal(held[0].cls, 'bad');
  assert.ok(held.some(l => l.cls === 'q' && l.text.startsWith('   ? ')), 'the question line');
});

test('7h: renderPanels fills every panel of the design and escapes what the record says', () => {
  const KEYS = ['now', 'dnodes', 'dchip', 'onodes', 'ochip', 'stages', 'donecount', 'view', 'rules', 'list', 'metrics', 'bars', 'log', 'clock', 'prog'];
  const snap = snapOf(all(), latest() + 60_000, { alive: true });
  for (const n of [17, 31, 52, 78]) {
    const p = renderPanels(runView(snap, { select: sel(n) }), { termWidth: 80 });
    for (const k of KEYS) assert.ok(String(p[k] ?? '').trim().length > 0, `#${n}: panel ${k} is empty`);
  }
  const p17 = renderPanels(runView(snap, { select: sel(17) }), { termWidth: 80 });
  assert.match(p17.dnodes, /class="[^"]*\bnode\b[^"]*\bdone\b/);
  assert.match(p17.list, /p-done/);
  assert.match(p17.rules, /\bs\b[^"]*\b(ok|pend)\b/);
  assert.match(p17.onodes, /—/, 'a node the record does not hold is —');
  assert.match(p17.onodes, /title="not recorded"/);
  assert.match(p17.metrics, /—/);
  assert.match(renderPanels(runView(snapOf(all(), latest() + 60_000), { at: at(event(fixture(17), 'test-failed').at), select: sel(17) }), { termWidth: 80 }).stages, /\bfail\b/);

  const evil = fixture(78);
  evil.objective = `<script>alert(1)</script> & "quoted" 'single'`;
  const p = renderPanels(runView(snapOf([evil], end(evil) + 60_000, { alive: true }), { select: sel(78) }), { termWidth: 80 });
  const html = KEYS.map(k => String(p[k])).join('\n');
  assert.ok(!html.includes('<script>alert(1)'), 'no raw script from the record');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'the objective is shown, escaped');
  assert.ok(!html.includes(`"quoted" 'single'`), 'quotes are escaped too');
});
