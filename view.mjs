// The run view: one derivation of a work item's state from its durable record, for the live page, the replay
// and the terminal sidecar. Pure and dependency-free (no node: imports), so the same file runs in node and in
// the browser. The record is only read; nothing here writes.

export const STAGES = ['ideation', 'planning', 'implementation', 'verification'];
export const STAGE_OF = { discover: 'discovery', ideate: 'ideation', challenge: 'ideation', plan: 'planning', 'test-plan': 'planning',
  implement: 'implementation', verify: 'verification', arbitrate: 'verification' };
export const JOB = { discover: 'Discover', ideate: 'Ideate', challenge: 'Challenge', plan: 'Plan', 'test-plan': 'Design the check',
  implement: 'Make', verify: 'Run the check', arbitrate: 'Rule on a failure' };
export const HARNESS = { claude: 'Claude Code', codex: 'Codex', pi: 'pi' };
export const CAUSES = 'pre-existing, implementation or test';
const ROLE = { discover: 'Vega', ideate: 'Vega', challenge: 'Polaris', plan: 'Cassiopeia', 'test-plan': 'Orion', implement: 'Sirius', verify: 'Aldebaran', arbitrate: 'Arbiter' };
const STAGE_NAME = { discovery: 'Discovery', ideation: 'Ideation', planning: 'Planning', implementation: 'Implementation', verification: 'Verification' };
const STAGE_SUB = { ideation: 'shape·challenge', planning: 'contract·checks', implementation: 'make', verification: 'check' };
const CAUSE_LIST = ['pre-existing', 'implementation', 'test'];
const PILL_WORDS = { who: { op: 'you', agent: 'agent', sys: 'system' } };

export const ms = v => typeof v === 'number' ? v : v ? Date.parse(v) : NaN;
const pad2 = n => String(n).padStart(2, '0');
const hhmm = t => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const clock = (t, now = Date.now()) => {
  if (!Number.isFinite(ms(t))) return 'UNKNOWN';
  const d = new Date(t);
  return new Date(now).toDateString() === d.toDateString() ? hhmm(t) : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hhmm(t)}`;
};
export const span = delta => {
  const m = Math.max(0, Math.floor(delta / 60_000));
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
};
export const cardLabel = c => c ? `${HARNESS[c.harness] ?? c.harness} · ${c.model}` : '';
// Objectives are the operator's words; only the record's own name for a unit is made plain.
export const terminalText = text => String(text ?? '').replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
export const plain = text => terminalText(text).replace(/\bthread (\d+)/gi, '#$1').replace(/\s+/g, ' ').trim();
export const clip = (text, n) => text.length <= n ? text : `${text.slice(0, Math.max(0, n - 1))}…`;
const folder = path => String(path ?? '').split('/').filter(Boolean).pop() ?? '';

// Word wrap to the pane, hard-breaking anything longer than a line. maxLines trims with an ellipsis.
export function wrap(text, width, indent = '', { first = indent, maxLines = Infinity } = {}) {
  const lines = [];
  let line = first;
  const room = () => width - line.length;
  for (let word of plain(text).split(' ').filter(Boolean)) {
    while (word.length > width - indent.length) {
      if (line.trim()) { lines.push(line); line = indent; }
      lines.push(indent + word.slice(0, width - indent.length)); word = word.slice(width - indent.length);
    }
    if (line.trim() && word.length + 1 > room()) { lines.push(line); line = indent; }
    line += (line.trim() && !line.endsWith(' ') ? ' ' : '') + word;
  }
  if (line.trim()) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = clip(lines[maxLines - 1], width - 1) + (lines[maxLines - 1].length >= width ? '' : '…'); }
  return lines;
}

// An exact shell command that never exceeds the pane, continued with backslash-newline so it pastes as
// one command. It breaks between words (the next line indented); a word longer than the line breaks
// inside itself, and then the next line has no indent, since spaces there would split the word.
export function command(text, width, indent) {
  const lines = []; let rest = text, prefix = indent;
  while (prefix.length + rest.length > width) {
    const room = width - prefix.length - 1, space = rest.lastIndexOf(' ', room - 1);
    if (space > 0) { lines.push(`${prefix}${rest.slice(0, space + 1)}\\`); rest = rest.slice(space + 1); prefix = `${' '.repeat(indent.length)}  `; }
    else { lines.push(`${prefix}${rest.slice(0, room)}\\`); rest = rest.slice(room); prefix = ''; }
  }
  return [...lines, prefix + rest];
}

export const tilde = (path, home) => home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
// The CLI answers in the data directory's own store; any other store is named with WORK_DATA.
const cli = (unit, verb) => `${unit.storeDir === unit.base ? '' : `WORK_DATA=${tilde(unit.storeDir, unit.home)} `}pi-durable ${verb}`;

export function timeline(w) {
  const r = w.record ?? {}, times = new Set();
  const add = v => { const m = ms(v); if (Number.isFinite(m)) times.add(m); };
  for (const e of r.events ?? []) { add(e.at); if (e.type === 'call') add(e.startedAt); }
  for (const x of r.exchanges ?? []) for (const t of x.turns ?? []) add(t.at);
  for (const a of [...(r.attempts ?? []), ...(r.calls ?? []), ...(r.operations ?? [])]) { add(a.createdAt); add(a.startedAt); add(a.endedAt); add(a.start); add(a.end); }
  return [...times].sort((a, b) => a - b);
}

const createdAtOf = a => ms(a.createdAt ?? a.startedAt);
const isStepExchange = x => !x.subject || x.subject.kind === 'step';
const sessionsOf = a => new Set([...(a.stats ?? []).map(s => s?.sessionId), ...(a.runs ?? []).map(r => r.sessionId)].filter(Boolean));
const delivered = r => { const auth = (r.events ?? []).find(e => e.type === 'delivery-authorized'); return { auth, atCreation: r.delivery === true && !auth }; };

// Every interval in which the work waited on the human: [start, end), end Infinity while it stands.
function holdIntervals(w) {
  const r = w.record ?? {}, events = r.events ?? [], failures = r.failures ?? [];
  const turns = (r.exchanges ?? []).flatMap(x => x.turns ?? []);
  const out = [];
  const routedAfter = (failureId, start) => { const e = events.find(e => e.type === 'failure-routed' && e.failureId === failureId && ms(e.at) >= start); return e ? ms(e.at) : Infinity; };
  const failureHold = (failureId, start) => out.push({ kind: 'failure', start, end: routedAfter(failureId, start), failureId });
  for (const e of events) {
    if (e.type === 'test-failed' && e.corrections >= 3) failureHold(e.failureId, ms(failures.find(f => f.id === e.failureId)?.at ?? e.at));
    else if (e.type === 'failure-undetermined' || e.type === 'prerequisite-depth') failureHold(e.failureId, ms(e.at));
  }
  const nq = (start, ref) => {
    const candidates = (r.exchanges ?? []).flatMap(x => (x.turns ?? []).filter(t => t.type === 'worker' && ms(t.at) <= start).map(t => ({ x, t })));
    const latest = candidates.sort((a, b) => ms(a.t.at) - ms(b.t.at)).at(-1), x = latest?.x, asked = latest?.t;
    const exchangeTurns = x?.turns ?? turns;
    const answered = exchangeTurns.find(t => t.type === 'human' && ms(t.at) >= start);
    const count = exchangeTurns.filter(t => t.type !== 'worker' && ms(t.at) < start).length;
    out.push({ kind: 'nq', start, end: answered ? ms(answered.at) : Infinity, questions: asked?.questions ?? [], ref: x?.id ?? ref,
      originator: x?.originator ?? null, receiver: x?.worker ?? null, cause: count >= 3 ? 'turns' : 'unknown' });
  };
  // Every hold is alerted, a failure hold too: an alert that opens within seconds of a failure hold is that one's.
  for (const e of events) if (e.type === 'alerted' && !out.some(h => Math.abs(h.start - ms(e.holdAt)) < 2000)) nq(ms(e.holdAt), e.holdAt);
  if (w.hold?.kind === 'nq' && !events.some(e => e.type === 'alerted' && e.holdAt === w.hold.at)) nq(ms(w.hold.at), w.hold.at);
  return out.filter(h => Number.isFinite(h.start)).sort((a, b) => a.start - b.start);
}

const participantLabel = p => {
  const c = p?.card ?? p;
  return [p?.job, p?.actor, HARNESS[c?.harness] ?? c?.harness, c?.provider, c?.model].map(v => v ?? 'UNKNOWN').join(' · ');
};
const locationLabel = where => typeof where === 'string' ? where : where ? JSON.stringify(where) : 'UNKNOWN (not supplied)';

function delegatedStateAt(w, at) {
  const r = w.record, events = (r.events ?? []).filter(e => ms(e.at) <= at);
  const e = events.findLast(e => e.type.startsWith('delegated-')), delegationState = e?.state ?? 'intake';
  const exchange = (r.exchanges ?? []).find(x => x.id === (e?.exchange?.id ?? e?.exchangeId)) ?? null;
  const turns = (exchange?.turns ?? []).filter(t => ms(t.at) <= at);
  const done = ['accepted', 'closed'].includes(delegationState), hold = e?.hold ?? null;
  const intervals = [];
  for (const ev of events) if (ev.hold && !intervals.some(i => i.start === ms(ev.hold.at))) {
    const start = ms(ev.hold.at), released = events.find(v => v.type === 'delegated-human' && ms(v.at) >= start);
    intervals.push({ start, end: released ? ms(released.at) : Infinity, kind: 'nq' });
  }
  return { state: done ? 'done' : hold ? 'human-hold' : delegationState, delegationState,
    step: e?.step ?? r.step, round: 0, done, hold, exchange, answered: turns.filter(t => t.type !== 'worker').length,
    completedAt: done ? ms(events.find(v => v.state === 'accepted')?.at) : null,
    since: ms(e?.at), lastEvent: e, delivery: false, intervals, report: e?.report, acceptance: e?.acceptance };
}

function delegatedBlock(unit, width, now, label) {
  const { w, s, at } = unit, r = w.record, lines = [];
  const add = value => lines.push(...wrap(value, width, '   '));
  add(`${label} ${w.objective}`);
  add(`State: ${s.delegationState} · step: ${s.step} · updated ${clock(s.lastEvent?.at, now)}`);
  add(`Worker: ${participantLabel(w.worker)}`);
  add(`From: ${participantLabel(w.sender)}`);
  add(`Where: ${locationLabel(w.where)}`);
  if (w.parentId) add(`Parent: #${w.parentId}`);
  if (s.hold) {
    add(`Stopped: ${s.hold.reason}`);
    for (const q of s.hold.questions ?? []) add(`? ${q}`);
    lines.push(...command(cli(unit, `delegate human ${w.threadId} reply.txt --actor human`), width, '   $ '));
    add('Then the receiving agent confirms understanding; no automatic execution.');
  }
  for (const x of r.exchanges ?? []) {
    if (ms(x.createdAt) > at) continue;
    add(`Hand-off: ${x.originator} → ${x.worker} (${x.subject?.handoff ?? x.subject?.kind ?? 'UNKNOWN'})`);
    for (const t of x.turns ?? []) {
      if (ms(t.at) > at) continue;
      const content = t.type === 'worker' ? [t.intent, ...(t.questions ?? []).map(q => '? ' + q)].filter(Boolean).join(' · ') : t.text;
      add(`${clock(t.at, now)} ${t.actor ?? t.type}: ${content ?? 'UNKNOWN'}`);
    }
  }
  const update = (r.events ?? []).findLast(e => e.type === 'delegated-progress' && ms(e.at) <= at);
  if (update) add(`${clock(update.at, now)} ${update.actor}: ${update.text}`);
  if (s.report) { add(`Reported: ${s.report.text}`); if (s.report.evidence) add(`Evidence: ${s.report.evidence}`); }
  if (s.acceptance) add(`Accepted by ${s.acceptance.actor}: ${s.acceptance.text}`);
  add(`Details: pi-durable show ${w.threadId} (same workspace/store)`);
  return lines;
}

const reached = (value, at) => Number.isFinite(ms(value)) && ms(value) <= at;
const endOf = x => x.endedAt ?? x.end;
const startOf = x => x.startedAt ?? x.start ?? x.createdAt;

// Cut mutable call/operation fields to the observation time; current result/card must not leak into replay.
export function callAt(call, at) {
  if (!reached(startOf(call), at)) return null;
  const runs = (call.runs ?? []).filter(run => reached(startOf(run), at));
  const run = runs.at(-1), ended = reached(endOf(call), at);
  return { ...call, card: run?.card && typeof run.card === 'object' ? run.card : call.card,
    sessionId: run?.sessionId ?? call.sessionId, where: run?.where ?? call.where,
    outcome: ended ? call.outcome : 'running', result: ended ? call.result : null,
    endedAt: ended ? endOf(call) : null, runs };
}

export function operationsAt(w, at) {
  return (w.record?.operations ?? []).filter(op => reached(startOf(op), at)).map(op => ({
    ...op, startedAt: startOf(op), endedAt: reached(endOf(op), at) ? endOf(op) : null,
    outcome: reached(endOf(op), at) ? op.outcome : 'running',
    evidence: reached(endOf(op), at) ? op.evidence : null
  }));
}

// The one derivation. Inputs are cut to at (ms); the rules follow publishWork's order.
export function stateAt(w, at) {
  if (w.kind === 'delegated' || w.record?.kind === 'delegated') return delegatedStateAt(w, at);
  const r = w.record ?? {}, all = r.events ?? [], events = all.filter(e => ms(e.at) <= at);
  const failures = r.failures ?? [];
  let step = w.kind === 'delivery' && w.from ? 'ideate' : 'discover', round = 0, waitsOn = null, quota = null, selected = false;
  const open = [];
  for (const e of events) {
    if (e.type === 'quota-wait') quota = e;
    else if (['quota-resumed', 'queue-selected'].includes(e.type)) { quota = null; selected = e.type === 'queue-selected'; }
    if (e.type === 'brief-sealed') { step = e.step; round = e.round ?? 0; }
    else if (e.type === 'handoff') step = e.to === 'complete' ? null : e.to;
    else if (e.type === 'test-failed') open.push(e.failureId);
    else if (e.type === 'failure-routed' || e.type === 'failure-undetermined') {
      const i = open.indexOf(e.failureId); if (i >= 0) open.splice(i, 1);
      if (e.type === 'failure-routed' && e.cause === 'pre-existing') waitsOn = failures.find(f => f.id === e.failureId)?.prerequisite ?? null;
    } else if (e.type === 'prerequisite-done') waitsOn = null;
  }
  const completeEvent = events.find(e => e.type === 'complete' || e.type === 'discovered');
  const done = Boolean(completeEvent);
  const { auth, atCreation } = delivered(r);
  const delivery = ['delivery', 'fix'].includes(w.kind) || Boolean(auth && ms(auth.at) <= at) || atCreation;
  const intervals = holdIntervals(w), standing = intervals.filter(h => h.start <= at && at < h.end).at(-1) ?? null;
  let hold = null;
  if (standing) {
    const match = w.hold && (standing.kind === 'failure' ? w.hold.ref === standing.failureId : ms(w.hold.at) === standing.start);
    const failure = standing.kind === 'failure' ? failures.find(f => f.id === standing.failureId) ?? null : null;
    hold = { ...(match ? w.hold : {}), originator: match ? w.hold.originator : standing.originator, receiver: match ? w.hold.receiver : standing.receiver, cause: match ? w.hold.cause : standing.cause, kind: standing.kind, at: new Date(standing.start).toISOString(), start: standing.start,
      reason: match ? String(w.hold.reason ?? '') : '', questions: standing.kind === 'nq' ? (standing.questions.length ? standing.questions : match ? w.hold.questions ?? [] : []) : [],
      failureId: standing.failureId ?? null, failureReport: failure?.report ?? w.failure?.report ?? null };
  }
  const failure = open.length ? failures.find(f => f.id === open.at(-1)) ?? { id: open.at(-1), report: '' } : null;
  const attempt = step ? (r.attempts ?? []).filter(a => a.step === step && (a.round ?? 0) === round && !(createdAtOf(a) > at)).at(-1) ?? null : null;
  const last = attempt && events.filter(e => e.attemptId === attempt.id && ['started', 'redriven', 'reported', 'failed', 'failed-test', 'blocked'].includes(e.type)).at(-1)?.type;
  const running = last === 'started' || last === 'redriven', failed = last === 'failed';
  const calls = (r.calls ?? []).map(c => callAt(c, at)).filter(Boolean);
  const call = calls.filter(c => !c.endedAt).at(-1) ?? null;
  const lastCall = calls.at(-1), lastFailure = events.findLast(e => e.type === 'failed');
  const limited = lastCall?.outcome === 'limited' ? lastCall.result?.limit ?? { message: 'Usage limit recorded' }
    : failed && lastFailure?.limit ? lastFailure.limit : null;
  const exchanges = (r.exchanges ?? []).filter(x => !x.createdAt || reached(x.createdAt, at));
  const pending = exchanges.filter(x => !isStepExchange(x)).map(x => ({ x, last: (x.turns ?? []).filter(t => reached(t.at, at)).at(-1) }))
    .filter(({ x, last }) => last ? last.type !== 'worker' || last.questions?.length && last.clear !== true : reached(x.createdAt, at))
    .sort((a, b) => ms(a.last?.at ?? a.x.createdAt) - ms(b.last?.at ?? b.x.createdAt)).at(-1)?.x;
  const exchange = call?.exchangeId ? exchanges.find(x => x.id === call.exchangeId) ?? null
    : pending ?? (step ? exchanges.filter(x => isStepExchange(x) && x.step === step && (x.round ?? 0) === round).at(-1) ?? null : null);
  const turns = (exchange?.turns ?? []).filter(t => ms(t.at) <= at), lastTurn = turns.at(-1);
  const exchangeState = !exchange ? null
    : lastTurn?.type === 'worker' ? (lastTurn.questions?.length && lastTurn.clear !== true ? 'question' : null) : 'intake';
  const answered = turns.filter(t => t.type !== 'worker').length;
  let state;
  if (done) state = 'done';
  else if (hold) state = 'human-hold';
  else if (waitsOn) state = 'waiting-on-prerequisite';
  else if (quota) state = 'quota-wait';
  else if (call) state = 'working';
  else if (pending && exchangeState) state = exchangeState;
  else if (limited) state = 'limited';
  else if (failure) state = 'test-failed';
  else if (running) state = 'working';
  else if (failed) state = 'worker-failed';
  else if (exchangeState === 'question') state = 'question';
  else if (exchangeState === 'intake') state = 'intake';
  else if (w.kind === 'delivery' && w.from && !attempt) state = selected ? 'selected' : 'queued';
  else if (!w.kind && step && step !== 'discover' && !delivery) state = 'delivery-authorization-required';
  else state = 'ready';
  const lastEvent = events.at(-1) ?? null;
  const since = call ? ms(startOf(call)) : state === 'working' && attempt ? ms(attempt.startedAt ?? attempt.createdAt) : ms(lastTurn?.at ?? lastEvent?.at);
  return { state, step, round, done, completedAt: completeEvent ? ms(completeEvent.at) : null, hold, waitsOn, failure, attempt, call, limited, quota, running, exchange, exchangeState,
    answered, delivery, lastEvent, since, intervals: intervals.filter(h => h.start <= at) };
}

// What the operator is being asked, in plain words, from the hold the record carries.
function decision(unit) {
  const { w, s } = unit, hold = s.hold, reason = String(hold?.reason ?? '');
  if (s.state === 'delivery-authorization-required') return {
    stopped: 'Discovery is done. Building needs your go-ahead.', asks: [], suggests: null,
    answer: [`drive ${w.threadId} --delivery --background`], note: 'Run it to authorize building.' };
  const card = { asks: hold.questions ?? [], suggests: hold.recommendation ?? null, said: null };
  if (hold.kind === 'nq') {
    const cause = hold.cause ?? (/three (answers|turns)/.test(reason) ? 'turns' : /after the human('s)? answer/.test(reason) ? 'after-human' : 'authority');
    if (cause === 'turns') card.stopped = `Questions still open after three turns (${JOB[s.step] ?? 'this job'}).`;
    else if (cause === 'after-human') card.stopped = `Still unclear after your answer (${JOB[s.step] ?? 'this job'}).`;
    else if (cause === 'unknown') card.stopped = 'Questions are held for you; the cause was not recorded.';
    else { card.stopped = 'Only you can authorize this.'; card.suggests ??= reason; }
  } else {
    const corrections = reason.match(/after (\d+) corrections/);
    if (corrections) card.stopped = `The checks still fail after ${corrections[1]} fixes.`;
    else if (/could not determine/.test(reason)) { card.stopped = 'A check failed and the cause is unclear.'; card.suggests ??= reason.replace(/^[^:]*:\s*/, '') || null; }
    else if (/prerequisites deep/.test(reason)) { card.stopped = 'An older defect turned up inside a fix, too deep to open another.'; card.said = reason.replace(/^.*?wrong\.\s*/, '') || null; }
    else card.stopped = reason || 'A check failed and the cause is unclear.';
    if (!card.asks.length && hold.failureReport) card.said ??= hold.failureReport;
  }
  card.answer = [`answer ${w.threadId} reply.txt${hold.kind === 'failure' ? ' <cause>' : ''}`];
  card.note = hold.kind === 'failure' ? `Write your answer in reply.txt; the cause is ${CAUSES}.` : 'Write your answer in reply.txt.';
  return card;
}

function decisionCard(unit, width, now, label) {
  if (unit.w.kind === 'delegated') return delegatedBlock(unit, width, now, label);
  const { w, s } = unit, d = decision(unit), out = [];
  out.push(...wrap(`${label} ${plain(w.objective)}`, width, '   ', { maxLines: 2 }));
  out.push(...wrap(d.stopped, width, '   ', { first: '   Stopped: ', maxLines: 3 }));
  for (const q of d.asks.slice(0, 3)) out.push(...wrap(q, width, '     ', { first: '   ? ', maxLines: 4 }));
  if (d.asks.length > 3) out.push(`   (${d.asks.length - 3} more questions)`);
  if (d.said) out.push(...wrap(d.said, width, '     ', { first: '   " ', maxLines: 4 }));
  if (d.suggests) out.push(...wrap(d.suggests, width, '   ', { first: '   Suggested: ', maxLines: 4 }));
  out.push(...wrap(d.note, width, '   ', { maxLines: 2 }));
  for (const verb of d.answer) out.push(...command(cli(unit, verb), width, '   $ '));
  if (s.hold) out.push('   Then continue it:', ...command(cli(unit, `drive ${w.threadId} --background`), width, '   $ '));
  if (s.hold?.start) out.push(`   waiting ${span(now - s.hold.start)}`);
  return out;
}

function rail(position, width, indent) {
  const at = STAGES.indexOf(STAGE_OF[position]);
  if (at < 0) return clip(`${indent}▸discovery`, width);
  const short = { ideation: 'idea', planning: 'plan' };
  const full = STAGES.map((s, i) => i < at ? `${short[s] ?? s} ✓` : `${i === at ? '▸' : ''}${s} ·`).join(' ');
  if (indent.length + full.length <= width) return indent + full;
  // Narrow: done ✓, to come ·, the current stage by name.
  return clip(indent + STAGES.map((s, i) => i === at ? `▸${s} ·` : i < at ? '✓' : '·').join(' '), width);
}

// The job being done right now, and since when, from the derived state.
function jobNow(unit, live) {
  const { s } = unit, step = s.step;
  if (s.state === 'waiting-on-prerequisite') return { paused: `Paused until fix #${s.waitsOn} is done, then ${JOB[step] ?? 'the next job'} again.` };
  if (s.state === 'selected') return { paused: 'Selected by the runner; no worker start recorded yet.' };
  if (s.state === 'quota-wait') return { paused: `Waiting for provider quota${Number.isFinite(ms(s.quota?.resetsAt)) ? ` until ${clock(ms(s.quota.resetsAt), unit.at)}` : '; reset time UNKNOWN'}.` };
  if (s.state === 'limited') return { paused: 'Usage limit recorded. The runner selects another card or waits for an account reset.' };
  if (s.state === 'test-failed') return { job: JOB.arbitrate, since: ms(s.lastEvent?.at), detail: 'A check failed; deciding whose question it is.' };
  if (s.call) return { job: s.call.job ?? s.call.kind ?? 'Agent call', card: s.call.card, since: s.since,
    detail: `${s.call.actor ?? 'UNKNOWN'} · ${s.call.card?.provider ?? 'UNKNOWN'} · ${locationLabel(s.call.where)}` };
  if (s.state === 'working' && s.attempt) return { job: JOB[step], card: s.attempt.card, since: s.since, health: live ? s.attempt.health : undefined, silentFor: s.attempt.silentFor };
  return { job: JOB[s.exchange?.step ?? step] ?? 'Next job', since: s.since };
}

function unitBlock(unit, all, width, now, indent, label) {
  if (unit.w.kind === 'delegated') return delegatedBlock(unit, width, now, label);
  const { w, s } = unit, out = [], live = unit.live;
  out.push(...wrap(`${label} ${plain(w.objective)}`, width, indent + '   ', { first: indent, maxLines: 1 }));
  const pad = indent + '   ';
  out.push(rail(s.state === 'test-failed' ? 'arbitrate' : s.step, width, pad));
  const j = jobNow(unit, live);
  const head = j.paused ?? `Now: ${j.job}${j.card ? ` on ${cardLabel(j.card)}` : ''}${Number.isFinite(j.since) ? `, for ${span(now - j.since)}` : ''}`;
  out.push(...wrap(head, width, pad + '  ', { first: pad, maxLines: 2 }));
  if (s.limited) out.push(...wrap(`Quota: ${describe(s.limited)}`, width, pad));
  if (j.detail) out.push(...wrap(j.detail, width, pad, { maxLines: 2 }));
  if (j.health === 'silent') out.push(...wrap(`No output for ${span(j.silentFor)}.`, width, pad));
  if (j.health === 'worker-dead') out.push(...wrap('Its process is gone; drive it again.', width, pad));
  if (s.state === 'question' && s.exchange) out.push(...wrap(`Questions: turn ${Math.min(s.answered + 1, 3)} of 3, waiting for an answer from whoever handed it over.`, width, pad, { maxLines: 2 }));
  else if (s.state === 'intake' && s.answered > 0) out.push(...wrap(`Questions: turn ${s.answered} of 3 answered; reading the answer.`, width, pad, { maxLines: 2 }));
  else if (s.state === 'intake') out.push(...wrap('Reading its brief before starting.', width, pad));
  const redrive = () => command(cli(unit, `drive ${w.threadId} --background`), width, pad + '$ ');
  if (s.state === 'stopped' || (s.state === 'ready' && unit.started)) { out.push(...wrap('Nothing is running it. Continue it with:', width, pad)); out.push(...redrive()); }
  if (s.state === 'worker-failed') { out.push(...wrap('The job stopped with an error. Drive it again:', width, pad)); out.push(...redrive()); }
  if (s.state === 'ready' && !unit.started) { out.push(...wrap('Not started. Start it with:', width, pad)); out.push(...redrive()); }
  const swap = (w.record?.attempts ?? []).flatMap(a => (a.swaps ?? []).map(x => ({ ...x, step: a.step }))).filter(x => ms(x.at) <= unit.at).sort((a, b) => ms(a.at) - ms(b.at)).at(-1);
  if (swap) {
    const why = swap.account ? ` (${swap.account} out of quota${Number.isFinite(swap.resetsAt) ? ` until ${clock(swap.resetsAt, now)}` : ''})` : '';
    out.push(...wrap(`Switched ${JOB[swap.step] ?? ''} from ${cardLabel(swap.from)} to ${cardLabel(swap.to)}${why}, ${span(now - ms(swap.at))} ago.`, width, pad + '  ', { first: pad, maxLines: 3 }));
  }
  // Fix items this unit waits on, nested under it.
  for (const child of all.filter(c => c.storeDir === unit.storeDir && c.w.parentId === w.threadId && !c.s.done)) {
    out.push(...unitBlock(child, all, width, now, pad + '  ', `#${child.w.threadId}`));
  }
  return out;
}

const NEEDS = new Set(['human-hold', 'delivery-authorization-required']);

// ---- rules, tiles, bars, log -------------------------------------------------------------------------

export function ruleSet(unit, at) {
  const { w } = unit, r = w.record ?? {}, events = (r.events ?? []).filter(e => ms(e.at) <= at);
  const atts = (r.attempts ?? []).filter(a => !(createdAtOf(a) > at));
  const { auth, atCreation } = delivered(r);
  const rules = [];
  const startReason = startNote(unit, at);
  // 1. Nothing started without the operator.
  {
    const authAt = auth ? ms(auth.at) : Infinity;
    const early = !atCreation && atts.some(a => a.step !== 'discover' && ms(a.startedAt ?? a.createdAt) < authAt);
    if (early) rules.push({ label: 'Nothing started without the operator', status: 'bad', evidence: 'A job after discovery started before the go-ahead.' });
    else if (auth && ms(auth.at) <= at) rules.push({ label: 'Nothing started without the operator', status: 'ok', evidence: startReason });
    else if (w.kind === 'delivery' && w.from) rules.push({ label: 'Delivery follows discovery without a go-ahead', status: 'ok', evidence: `Inherited from discovery #${w.from}.` });
    else if (w.parentId) rules.push({ label: 'Nothing started without the operator', status: 'ok', evidence: startReason });
    else if (atCreation) rules.push({ label: 'Nothing started without the operator', status: 'pend', evidence: 'Delivery was set when the item was created; the record does not say who asked.' });
    else rules.push({ label: 'Nothing started without the operator', status: 'ok', evidence: 'Discovery only so far; nothing built.' });
  }
  // 2. No one checked their own work.
  {
    const verifies = atts.filter(a => a.step === 'verify');
    let bad = null, labelsOnly = false;
    for (const v of verifies) {
      const maker = atts.slice(0, atts.indexOf(v)).findLast(a => a.step === 'implement');
      if (!maker) continue;
      const vs = sessionsOf(v), ms_ = sessionsOf(maker);
      if (!vs.size || !ms_.size) labelsOnly = true;
      if (v.actor === maker.actor) bad ??= `${v.actor} checked its own work.`;
      else if ([...vs].some(x => ms_.has(x))) bad ??= `A check shared a session with the maker (${[...vs].find(x => ms_.has(x))}).`;
    }
    if (bad) rules.push({ label: 'No one checked their own work', status: 'bad', evidence: bad });
    else if (!verifies.length) rules.push({ label: 'No one checked their own work', status: 'pend', evidence: 'No check has run yet.' });
    else rules.push({ label: 'No one checked their own work', status: 'ok',
      evidence: `${verifies.length} verify run${verifies.length === 1 ? '' : 's'}, each a different session from its maker${labelsOnly ? ' — labels only' : ''}` });
  }
  // 3. Each step had a different agent.
  {
    const actors = new Set(atts.map(a => a.actor)), owner = new Map();
    let shared = null;
    for (const a of atts) for (const id of sessionsOf(a)) { if (owner.has(id) && owner.get(id) !== a.id) shared ??= id; owner.set(id, a.id); }
    if (!atts.length) rules.push({ label: 'Each step had a different agent', status: 'pend', evidence: 'No step has run yet.' });
    else if (actors.size < atts.length) rules.push({ label: 'Each step had a different agent', status: 'bad', evidence: `${atts.length} steps, ${actors.size} agents.` });
    else if (shared) rules.push({ label: 'Each step had a different agent', status: 'bad', evidence: `Two steps shared session ${shared}.` });
    else rules.push({ label: 'Each step had a different agent', status: 'ok',
      evidence: owner.size ? `${new Set(owner.keys()).size} sessions, ${actors.size} actors` : `${actors.size} actors, session ids not in the snapshot — labels only` });
  }
  // 4. A failed check was routed, not ignored.
  {
    const failedAt = events.map((e, i) => [e, i]).filter(([e]) => e.type === 'test-failed');
    let bad = false, waiting = false;
    for (const [e, i] of failedAt) {
      if (events.some((x, j) => j > i && x.type === 'failure-routed' && x.failureId === e.failureId)) continue;
      const next = events.findIndex((x, j) => j > i && (x.type === 'brief-sealed' || x.type === 'complete'));
      if (next >= 0) bad = true; else waiting = true;
    }
    if (bad) rules.push({ label: 'A failed check was routed, not ignored', status: 'bad', evidence: 'Work went on past a failed check that was never routed.' });
    else if (!failedAt.length) rules.push({ label: 'A failed check was routed, not ignored', status: 'pend', evidence: 'no check failed' });
    else if (waiting) rules.push({ label: 'A failed check was routed, not ignored', status: 'pend', evidence: 'A failed check is open or held for a ruling.' });
    else rules.push({ label: 'A failed check was routed, not ignored', status: 'ok', evidence: `${failedAt.length} failed check${failedAt.length === 1 ? '' : 's'}, each routed.` });
  }
  // 5. Done only on passing checks.
  {
    const complete = events.find(e => e.type === 'complete');
    if (!complete) rules.push({ label: 'Done only on passing checks', status: 'pend', evidence: 'Not finished yet.' });
    else {
      const lastVerify = atts.findLast(a => a.step === 'verify');
      const reported = lastVerify && events.some(e => e.type === 'reported' && e.attemptId === lastVerify.id && ms(e.at) <= ms(complete.at));
      rules.push(reported ? { label: 'Done only on passing checks', status: 'ok', evidence: 'The last check passed, then the item finished.' }
        : { label: 'Done only on passing checks', status: 'bad', evidence: 'The item finished without a passing last check.' });
    }
  }
  // 6. NQ turns <= 3 before a hold.
  {
    const coverage = coverageOf(w, at), missing = Array(coverage.missing).fill(null);
    const counts = (r.exchanges ?? []).map(x => (x.turns ?? []).filter(t => ms(t.at) <= at && t.type === 'originator').length), max = Math.max(0, ...counts);
    rules.push({ label: 'Questions settle in three turns or hold', status: max > 3 ? 'bad' : missing.length || !(r.exchanges ?? []).length ? 'pend' : 'ok', evidence: max > 3 ? `An exchange took ${max} answers; the limit is 3.` : missing.length ? `${missing.length} calls/steps have no recorded intake exchange; coverage unknown` : !(r.exchanges ?? []).length ? 'No exchanges recorded; coverage unknown' : `max ${max} of 3` });
  }
  return rules;
}

function startNote(unit, at) {
  const { w } = unit, { auth } = delivered(w.record ?? {});
  if (auth && ms(auth.at) <= at) return `authorized ${hhmm(ms(auth.at))}`;
  if (w.from) return `discovered by #${w.from}; delivery follows automatically`;
  if (w.parentId) return `authorized by the Arbiter's pre-existing ruling on #${w.parentId}`;
  return 'set when the item was created';
}

function intervalMs(record, at) {
  const runs = record.runs?.length ? record.runs : [record];
  return runs.reduce((total, run, i) => {
    const start = ms(startOf(run)), end = ms(endOf(run)), next = ms(startOf(runs[i + 1] ?? {}));
    const stop = Math.min(Number.isFinite(end) ? end : at, Number.isFinite(next) ? next : at, at);
    return total + (start <= at ? Math.max(0, stop - start) : 0);
  }, 0);
}

export function stageMinutes(w, at) {
  const r = w.record ?? {}, minutes = { discovery: 0, ideation: 0, planning: 0, implementation: 0, verification: 0 }, has = {};
  for (const a of r.attempts ?? []) {
    const start = ms(a.startedAt ?? a.createdAt), stage = STAGE_OF[a.step];
    if (!stage || !(start <= at)) continue;
    // Runs are distinct intervals; gaps between retries are not execution time.
    minutes[stage] += intervalMs(a, at) / 60_000;
    has[stage] = true;
  }
  for (const c of r.calls ?? []) {
    const stage = STAGE_OF[c.step], start = ms(startOf(c));
    if (!stage || !(start <= at) || (r.attempts ?? []).some(a => a.callId === c.id || a.id === c.source)) continue;
    minutes[stage] += intervalMs(c, at) / 60_000; has[stage] = true;
  }
  for (const e of r.events ?? []) {
    if ((r.calls ?? []).some(c => c.id === e.callId || c.record && c.record === e.record)) continue;
    if (e.type !== 'call' || !(ms(e.startedAt) <= at) || !Number.isFinite(e.ms)) continue;
    const stage = e.kind === 'arbiter' ? 'verification' : STAGE_OF[e.step];
    if (stage) { minutes[stage] += e.ms / 60_000; has[stage] = true; }
  }
  return { minutes, has };
}

export function operatorWait(w, at) {
  const r = w.record ?? {}, { auth, atCreation } = delivered(r);
  const holds = stateAt(w, at).intervals;
  let waited = holds.reduce((sum, h) => sum + (Math.min(h.end, at) - h.start), 0), stops = holds.length;
  const handoff = (r.events ?? []).find(e => e.type === 'handoff' && e.from === 'discover' && ms(e.at) <= at);
  if (handoff && !atCreation) { stops++; waited += (auth && ms(auth.at) <= at ? ms(auth.at) : at) - ms(handoff.at); }
  return { stops, minutes: Math.round(waited / 600) / 100 };
}

const round2 = n => Math.round(n * 100) / 100;

export function usage(unit, at) {
  const { w } = unit, r = w.record ?? {}, runs = [];
  const unknown = { tokens: null, cost: null, costReason: 'usage at this replay moment is not recorded' };
  const addStats = record => (record.stats ?? []).forEach((st, i) => {
    if (!st) return;
    const run = record.runs?.[i] ?? record;
    if (ms(startOf(run)) > at) return;
    runs.push(!unit.live && !reached(endOf(run), at) ? unknown : st);
  });
  for (const a of r.attempts ?? []) if (!(createdAtOf(a) > at)) addStats(a);
  for (const c of r.calls ?? []) if (reached(startOf(c), at) && !(r.attempts ?? []).some(a => a.callId === c.id || a.id === c.source)) addStats(c);
  for (const e of r.events ?? []) if (e.type === 'call' && e.record && ms(e.startedAt) <= at && w.callStats?.[e.record] && !(r.calls ?? []).some(c => c.record === e.record || (c.runs ?? []).some(run => run.record === e.record))) runs.push(!unit.live && !reached(e.at, at) ? unknown : w.callStats[e.record]);
  const tokens = runs.filter(s => Number.isFinite(s.tokens)), priced = runs.filter(s => Number.isFinite(s.cost));
  const costReason = runs.find(s => !Number.isFinite(s.cost) && s.costReason)?.costReason;
  const tokenReason = runs.find(s => !Number.isFinite(s.tokens) && s.costReason)?.costReason;
  return {
    tokens: tokens.length ? { value: tokens.reduce((n, s) => n + s.tokens, 0), reason: runs.length > tokens.length ? 'some runs are not finished or report no count' : '' }
      : { value: null, reason: runs.length ? tokenReason ?? 'the launch streams carry no token count' : 'the record holds no launch stream for this item' },
    cost: priced.length ? { value: Math.round(priced.reduce((n, s) => n + s.cost, 0) * 1e6) / 1e6, reason: runs.length > priced.length ? 'some runs report no price' : '' }
      : { value: null, reason: runs.length ? costReason ?? 'the harness reported no price' : 'the record holds no launch stream for this item' },
  };
}

export function checks(unit, at) {
  const r = unit.w.record ?? {}, events = (r.events ?? []).filter(e => ms(e.at) <= at);
  const verifies = (r.attempts ?? []).filter(a => a.step === 'verify' && ms(a.startedAt ?? a.createdAt) <= at);
  let passed = 0, failed = 0;
  for (const a of verifies) {
    const reported = events.findIndex(e => e.type === 'reported' && e.attemptId === a.id);
    if (reported < 0) continue;
    if (events.some((e, i) => i > reported && e.type === 'handoff' && e.attemptId === a.id && e.from === 'verify')) passed++;
    else if (a.status === 'failed-test' && events.some((e, i) => i > reported && e.type === 'test-failed')) failed++;
  }
  return { passed: `${passed}/${verifies.length}`, failed };
}

function logOf(w, at) {
  const r = w.record ?? {}, rows = [];
  const job = step => JOB[step] ?? step ?? '';
  for (const e of r.events ?? []) {
    const t = ms(e.at); if (!(t <= at)) continue;
    let who = 'sys', text;
    switch (e.type) {
      case 'created': text = 'Created'; break;
      case 'brief-sealed': text = `Brief sealed: ${job(e.step)}`; break;
      case 'assigned': case 'started': case 'redriven': who = 'agent'; text = `${job(e.step)} started`; break;
      case 'reported': who = 'agent'; text = `${job(e.step)} reported`; break;
      case 'failed': who = 'agent'; text = `${job(e.step)} stopped with an error`; break;
      case 'call': who = 'agent'; text = `${e.kind} ${job(e.step)} ${(e.ms / 1000).toFixed(1)}s`; break;
      case 'handoff': text = `Handed ${e.from} → ${e.to}`; break;
      case 'test-failed': who = 'agent'; text = 'A check failed'; break;
      case 'failure-undetermined': text = 'Cause undetermined: held for you'; break;
      case 'failure-routed': who = e.by !== 'Arbiter' ? 'op' : 'agent'; text = `Routed: ${e.cause}`; break;
      case 'alerted': text = `Alert sent (${e.channel} ${e.ok ? 'ok' : 'failed'})`; break;
      case 'delivery-authorized': who = 'op'; text = 'Delivery authorized'; break;
      case 'prerequisite-done': text = `Fix #${e.child} done`; break;
      case 'complete': text = 'Done, verified'; break;
      default: text = e.type;
    }
    rows.push({ t, who, text });
  }
  for (const x of r.exchanges ?? []) for (const turn of x.turns ?? []) {
    const t = ms(turn.at); if (!(t <= at)) continue;
    if (turn.type === 'worker') rows.push({ t, who: 'agent', text: turn.questions?.length ? `Asked: ${turn.questions[0]}` : 'Clear' });
    else if (turn.type === 'originator') rows.push({ t, who: 'agent', text: 'Answered' });
    else if (turn.type === 'human') rows.push({ t, who: 'op', text: 'You answered' });
  }
  return rows.map((row, i) => ({ row, i })).sort((a, b) => a.row.t - b.row.t || a.i - b.i).map(x => x.row);
}

// ---- lanes -------------------------------------------------------------------------------------------

function lanesOf(unit, items, at) {
  const { w, s } = unit, r = w?.record ?? {};
  const events = (r.events ?? []).filter(e => ms(e.at) <= at);
  const awaiting = s?.state === 'delivery-authorization-required';
  // Discovery nodes.
  const turnsAsked = (r.exchanges ?? []).filter(x => isStepExchange(x) && x.step === 'discover').flatMap(x => x.turns ?? [])
    .filter(t => t.type === 'worker' && t.questions?.length && ms(t.at) <= at).length;
  const intake = events.some(e => e.type === 'call' && e.kind === 'intake' && e.step === 'discover');
  const report = events.some(e => e.type === 'reported' && e.step === 'discover');
  const handoff = events.some(e => e.type === 'handoff' && e.from === 'discover');
  let nodes = [
    { label: 'Intake', state: intake ? 'done' : 'pending', reason: '' },
    { label: 'Questions', state: turnsAsked ? 'done' : (report || handoff) ? 'na' : 'pending', reason: turnsAsked ? `${turnsAsked} asked` : (report || handoff) ? 'none asked' : '' },
    { label: 'Report', state: report ? 'done' : 'pending', reason: '' },
    { label: 'Hand-off', state: handoff ? 'done' : 'pending', reason: '' } ];
  const operations = operationsAt(w ?? {}, at);
  if (operations.length) nodes = operations.map(op => ({ label: op.name ?? op.id, state: op.endedAt ? op.outcome === 'failed' ? 'fail' : 'done' : 'on', reason: op.evidence ? JSON.stringify(op.evidence) : 'no evidence recorded' }));
  else if (w?.from) nodes = [{ label: `Inherited from discovery #${w.from}`, state: 'done', reason: r.discovered?.output ? 'discovery handoff preserved' : 'see originating discovery for evidence' }];
  if (s && s.step === 'discover' && !s.done) { const first = nodes.find(n => n.state === 'pending'); if (first) first.state = 'on'; }
  const { auth, atCreation } = delivered(r);
  const started = s?.delivery;
  const operator = [
    { label: 'Confirm findings', state: 'na', reason: 'not recorded' },
    { label: 'Set order', state: 'na', reason: 'not recorded' },
    { label: 'Start', state: w?.kind === 'discovery' ? 'na' : awaiting ? 'on' : started ? 'done' : 'pending', reason: w?.kind === 'discovery' ? 'discovery items enter delivery automatically' : started ? startNote(unit, at) : awaiting ? 'waiting for your go-ahead' : '' } ];
  const { minutes, has } = w ? stageMinutes(w, at) : { minutes: {}, has: {} };
  const failing = Boolean(s && (s.failure || s.hold?.kind === 'failure'));
  const at_ = s ? (s.done && s.delivery && w?.kind !== 'delegated' ? STAGES.length : awaiting || s.step === 'discover' || !s.step ? -1 : STAGES.indexOf(STAGE_OF[s.step])) : -1;
  const delivery = STAGES.map((name, i) => {
    const chips = items.filter(it => !it.done && !it.awaiting && it.stageKey === name).flatMap(it => [`#${it.threadId}`, ...(it.waitsOn?.startsWith('#') ? [`waits ${it.waitsOn}`] : [])]);
    const state = s ? (i < at_ ? 'done' : i === at_ ? (name === 'verification' && failing ? 'fail' : 'on') : 'pending') : 'pending';
    return { name: STAGE_NAME[name], sub: STAGE_SUB[name], minutes: has[name] ? round2(minutes[name]) : null, state, chips };
  });
  const chipsAt = pred => items.filter(it => !it.done && pred(it)).map(it => `#${it.threadId}`);
  return { discovery: { nodes, chips: chipsAt(it => !it.awaiting && it.stageKey === 'discovery') },
    operator: { nodes: operator, chips: chipsAt(it => it.awaiting) }, delivery, done: items.filter(it => it.done).length };
}

// Coverage is bounded to the calls/attempts the record says should have a handoff.
// A zero count is not proof that no unrecorded dispatch occurred.
export function coverageOf(w, at) {
  const r = w.record ?? {}, exchanges = (r.exchanges ?? []).filter(x => !x.createdAt || reached(x.createdAt, at));
  const attempts = (r.attempts ?? []).filter(a => reached(startOf(a), at));
  const calls = (r.calls ?? []).filter(c => reached(startOf(c), at) && !attempts.some(a => a.callId === c.id || a.id === c.source));
  const required = [...attempts, ...calls];
  let matched = 0;
  for (const c of required) {
    const x = c.exchangeId ? exchanges.find(x => x.id === c.exchangeId)
      : attempts.includes(c) ? exchanges.find(x => isStepExchange(x) && x.step === c.step && (x.round ?? 0) === (c.round ?? 0)) : null;
    if (x) matched++;
  }
  return { expected: required.length, recorded: exchanges.length, matched, missing: required.length - matched,
    scope: 'recorded calls and attempts only; unrecorded dispatch coverage UNKNOWN' };
}

const describe = value => typeof value === 'string' ? value : value == null ? 'UNKNOWN' : JSON.stringify(value);
export function recordDetails(w, at) {
  const r = w.record ?? {}, out = [];
  const coverage = coverageOf(w, at);
  if (w.kind === 'delegated') {
    const state = delegatedStateAt(w, at);
    out.push(`State: ${state.delegationState}`);
    if (state.report) out.push(`Report: ${describe(state.report)}`);
    if (state.acceptance) out.push(`Acceptance: ${describe(state.acceptance)}`);
  }
  out.push(`Handoffs: ${coverage.matched}/${coverage.expected} recorded calls/attempts linked; ${coverage.missing} missing. ${coverage.scope}`);
  if (w.from) out.push(`Inherited discovery: #${w.from}; evidence: ${describe(r.discovered)}`);
  if (w.parentId) out.push(`Fix of #${w.parentId}`);
  if ((w.items?.length || r.items?.length) && (r.events ?? []).some(e => e.type === 'discovered' && reached(e.at, at))) out.push(`Discovered items: ${(w.items ?? r.items).map(id => '#' + id).join(', ')}`);
  for (const op of operationsAt(w, at)) out.push(`Operation ${op.name ?? op.id}: ${op.outcome ?? 'UNKNOWN'} · ${clock(op.startedAt, at)} → ${op.endedAt ? clock(op.endedAt, at) : 'open'} · evidence: ${describe(op.evidence)}`);
  for (const raw of r.calls ?? []) {
    const c = callAt(raw, at); if (!c) continue;
    out.push(`Call ${c.id} · ${c.kind ?? c.job ?? 'UNKNOWN'} · ${c.outcome ?? 'UNKNOWN'} · task ${c.taskId ?? 'UNKNOWN'}`);
    out.push(`Who: ${participantLabel({ actor: c.actor, job: c.job, card: c.card })} · session ${c.sessionId ?? 'UNKNOWN'}`);
    out.push(`When: ${clock(startOf(c), at)} → ${c.endedAt ? clock(c.endedAt, at) : 'open'} · where: ${locationLabel(c.where)}`);
    out.push(`Subject: ${describe(c.subject)} · sender handoff ${c.source ?? 'UNKNOWN'} · exchange ${c.exchangeId ?? 'UNKNOWN'} · turn ${c.turn ?? 'UNKNOWN'} · brief ${c.briefHash ?? 'UNKNOWN'}`);
    if (c.endedAt) out.push(`Result/evidence: ${describe(c.result)}`);
    for (const run of c.runs ?? []) out.push(`Launch ${run.n ?? '?'}: ${describe(run.card)} · session ${run.sessionId ?? 'UNKNOWN'} · ${clock(startOf(run), at)} → ${reached(endOf(run), at) ? clock(endOf(run), at) : 'open'} · ${locationLabel(run.where)}`);
  }
  for (const x of r.exchanges ?? []) {
    if (x.createdAt && !reached(x.createdAt, at)) continue;
    const turns = (x.turns ?? []).filter(t => reached(t.at, at));
    out.push(`Handoff ${x.id}: ${x.originator ?? 'UNKNOWN'} → ${x.worker ?? 'UNKNOWN'} · parent ${x.parent ?? 'UNKNOWN'} · subject ${describe(x.subject)} · ${turns.filter(t => t.type !== 'worker').length} answered`);
    out.push(`Sender: ${participantLabel(x.sender)}; receiver: ${participantLabel(x.receiver)}`);
    out.push(`Brief ${x.briefHash ?? 'UNKNOWN'} · artifact ${x.handoffId ?? 'UNKNOWN'}: ${x.brief ?? 'UNKNOWN (legacy brief not projected)'}`);
    for (const t of turns) out.push(`${clock(t.at, at)} ${t.actor ?? t.type}: ${t.intent ?? t.text ?? ''}${t.questions?.length ? ' · questions: ' + t.questions.join('; ') : ''}${t.ruling ? ' · decision: ' + describe(t.ruling) : ''} · call ${t.callId ?? 'UNKNOWN'}`);
  }
  for (const e of r.events ?? []) if (['queue-selected', 'quota-wait', 'quota-resumed', 'queue-settled'].includes(e.type) && reached(e.at, at)) out.push(`Queue: ${describe(e)}`);
  for (const f of r.failures ?? []) if (reached(f.at, at)) {
    const ruled = (r.events ?? []).some(e => e.failureId === f.id && ['failure-routed', 'failure-undetermined'].includes(e.type) && reached(e.at, at));
    out.push(`Failure ${f.id}: ${f.report ?? 'UNKNOWN'} · ruling: ${ruled ? describe(f.ruling) : 'not recorded at this time'} · fix: ${ruled && f.prerequisite ? '#' + f.prerequisite : 'none recorded'}`);
  }
  return out;
}

// ---- the view ----------------------------------------------------------------------------------------

export function runView(snap, { at = snap?.at ?? Date.now(), select = null } = {}) {
  const live = at === snap?.at, home = snap?.home ?? '';
  const units = [];
  for (const store of snap?.stores ?? []) for (const w of store.threads ?? []) {
    if (w.archived || w.record?.archived) continue;
    const created = w.record?.createdAt ?? w.record?.events?.find(e => e.type === 'created')?.at;
    // A parent can name its newly created fix a few milliseconds before the child's own timestamp,
    // within the same committed transition. Keep that explicit link, but never show unrelated future work.
    const referenced = w.parentId && store.threads.some(p => p.threadId === w.parentId && stateAt(p, at).waitsOn === w.threadId);
    if (ms(created) > at && !referenced) continue;
    const s = stateAt(w, at);
    if (w.kind !== 'delegated' && live && !store.driver?.alive && ['working', 'intake', 'question', 'test-failed', 'limited', 'quota-wait'].includes(s.state)) s.state = 'stopped';
    const started = w.kind === 'delegated' || [...(w.record?.attempts ?? []), ...(w.record?.calls ?? [])].some(a => !(createdAtOf(a) > at));
    units.push({ w, s, storeDir: store.dir, base: snap.base, home, workspace: w.workspace ?? store.workspace, driver: store.driver ?? {}, live, at, started });
  }
  const many = (snap?.stores ?? []).filter(st => st.threads?.length).length > 1;
  for (const u of units) u.label = `#${u.w.threadId}${many && u.workspace ? ` (${folder(u.workspace)})` : ''}`;

  const items = units.map(u => {
    const { w, s } = u, needs = NEEDS.has(s.state), awaiting = s.state === 'delivery-authorization-required';
    const stageKey = STAGE_OF[s.state === 'test-failed' ? 'arbitrate' : s.step] ?? 'discovery';
    const who = needs ? 'you' : s.done ? '' : s.call ? `${s.call.job ?? s.call.kind} · ${s.call.actor ?? 'UNKNOWN'}` : s.state === 'test-failed' ? 'Arbiter' : s.state === 'waiting-on-prerequisite' ? `#${s.waitsOn}`
      : ['working', 'intake', 'question'].includes(s.state) ? s.attempt?.role && s.state === 'working' ? s.attempt.role : ROLE[s.step] ?? '' : '';
    return { threadId: w.threadId, storeDir: u.storeDir, workspace: u.workspace, objective: plain(w.objective), state: s.state, done: s.done, awaiting, needs,
      kind: w.kind ?? (w.parentId ? 'fix' : s.delivery ? 'delivery' : 'discovery'), pill: s.done ? 'done' : w.kind === 'delegated' || s.delivery ? 'task' : 'todo', who: w.kind === 'delegated' ? participantLabel(w.worker) : who,
      stage: w.kind === 'delegated' ? s.delegationState : s.done ? 'Done' : awaiting ? 'Operator' : STAGE_NAME[stageKey] ?? 'Discovery', stageKey,
      waitsOn: needs ? 'you' : s.state === 'waiting-on-prerequisite' ? `#${s.waitsOn}` : '', from: w.parentId ? `#${w.parentId}` : w.from ? `discovery #${w.from}` : '', lastAt: ms(s.lastEvent?.at) || 0 };
  });

  const pick = select && units.findIndex(u => u.storeDir === select.storeDir && u.w.threadId === select.threadId);
  const index = pick >= 0 && pick != null ? pick
    : items.findIndex(i => i.needs && !i.done) >= 0 ? items.findIndex(i => i.needs && !i.done)
    : items.findIndex(i => i.state === 'working') >= 0 ? items.findIndex(i => i.state === 'working')
    : items.reduce((best, it, i) => best < 0 || it.lastAt > items[best].lastAt ? i : best, -1);
  const unit = index >= 0 ? units[index] : null, selected = index >= 0 ? items[index] : null;

  const view = { at, live, units, items, selected, accounts: snap?.accounts ?? {}, home };
  view.now = nowOf(unit, view);
  view.lanes = lanesOf(unit ?? {}, items, at);
  const wait = unit ? operatorWait(unit.w, at) : { stops: 0, minutes: 0 };
  const stats = unit ? stageMinutes(unit.w, at) : { minutes: {} };
  const barKeys = [['discovery', 'Discovery'], ['ideation', 'Ideation'], ['planning', 'Planning'], ['implementation', 'Implementation'], ['verification', 'Verification']];
  const bars = [...barKeys.map(([key, label]) => ({ key, label, minutes: round2(stats.minutes[key] ?? 0), op: false })), { key: 'operator', label: 'Operator wait', minutes: wait.minutes, op: true }];
  const count = pill => items.filter(i => i.pill === pill).length;
  const use = unit ? usage(unit, at) : { tokens: { value: null, reason: 'nothing selected' }, cost: { value: null, reason: 'nothing selected' } };
  const chk = unit ? checks(unit, at) : { passed: '0/0', failed: 0 };
  view.telemetry = { tiles: {
    todo: { value: count('todo'), label: 'to-do', reason: '' }, task: { value: count('task'), label: 'task', reason: '' }, done: { value: count('done'), label: 'done', reason: '' },
    stops: { value: wait.stops, label: 'operator stops', reason: '' }, waitedMin: { value: wait.minutes, label: 'minutes waited on you', reason: '' },
    checksPassed: { value: chk.passed, label: 'checks passed', reason: '' }, checksFailed: { value: chk.failed, label: 'checks failed', reason: '' },
    tokens: { ...use.tokens, label: 'tokens' }, cost: { ...use.cost, label: 'cost at API prices, as the harness reports it' } }, bars };
  view.rules = unit ? ruleSet(unit, at) : [];
  view.log = unit ? logOf(unit.w, at) : [];
  view.coverage = unit ? coverageOf(unit.w, at) : null;
  view.details = unit ? recordDetails(unit.w, at) : [];
  const times = unit ? timeline(unit.w) : [];
  view.step = { k: times.filter(t => t <= at).length, n: times.length, first: times[0] ?? null, last: times.at(-1) ?? null };
  view.terminal = terminalLines(view, { width: 80 });
  return view;
}

function nowOf(unit, view) {
  if (!unit) return { who: 'sys', headline: 'Nothing here yet', detail: '', decide: null };
  const { w, s } = unit, step = s.step;
  if (w.kind === 'delegated') return { who: s.hold ? 'op' : s.done ? 'sys' : 'agent',
    headline: `${s.delegationState}: ${w.objective}`, detail: participantLabel(w.worker) + (w.where ? ` · ${locationLabel(w.where)}` : ''), decide: null };
  const decide = NEEDS.has(s.state) ? decideOf(unit, view) : null;
  switch (s.state) {
    case 'human-hold': return { who: 'op', headline: 'Waiting on you', detail: decision(unit).stopped, decide };
    case 'delivery-authorization-required': return { who: 'op', headline: 'Discovery is done. Building needs your go-ahead.', detail: '', decide };
    case 'working': return { who: 'agent', headline: s.call ? `${s.call.job ?? s.call.kind} on ${cardLabel(s.call.card) || 'UNKNOWN'} · ${s.call.card?.provider ?? 'UNKNOWN'} · ${locationLabel(s.call.where)}` : `${JOB[step]}${s.attempt?.card ? ` on ${cardLabel(s.attempt.card)}` : ''}`, detail: Number.isFinite(s.since) ? `for ${span(view.at - s.since)}` : '', decide: null };
    case 'test-failed': return { who: 'agent', headline: JOB.arbitrate, detail: 'A check failed; deciding whose question it is.', decide: null };
    case 'question': return { who: 'agent', headline: `Questions: turn ${Math.min(s.answered + 1, 3)} of 3, waiting for an answer from whoever handed it over.`, detail: JOB[step] ?? '', decide: null };
    case 'intake': return { who: 'agent', headline: s.answered > 0 ? `Questions: turn ${s.answered} of 3 answered; reading the answer.` : 'Reading its brief before starting.', detail: JOB[step] ?? '', decide: null };
    case 'waiting-on-prerequisite': return { who: 'sys', headline: `Paused until fix #${s.waitsOn} is done`, detail: `then ${JOB[step] ?? 'the next job'} again`, decide: null };
    case 'done': return { who: 'sys', headline: 'Done', detail: `${w.record?.completion ?? 'verified'} ${hhmm(s.completedAt)}`, decide: null };
    case 'selected': return { who: 'sys', headline: 'Selected by the runner; no worker start recorded yet', detail: '', decide: null };
    case 'quota-wait': return { who: 'sys', headline: 'Waiting for provider quota', detail: Number.isFinite(ms(s.quota?.resetsAt)) ? `Reset ${clock(ms(s.quota.resetsAt), view.at)}; the runner resumes it.` : 'Reset time UNKNOWN; no human answer is needed.', decide: null };
    case 'limited': return { who: 'sys', headline: 'Usage limit recorded', detail: 'The runner selects another card or waits for an account reset; no human answer is needed.', decide: null };
    case 'queued': return { who: 'sys', headline: 'Waiting its turn in the delivery queue', detail: w.from ? `From discovery #${w.from}; no go-ahead is needed.` : '', decide: null };
    case 'worker-failed': return { who: 'sys', headline: 'The job stopped with an error. Drive it again:', detail: cli(unit, `drive ${w.threadId} --background`), decide: null };
    default: return { who: 'sys', headline: unit.started || s.state === 'stopped' ? 'Nothing is running it. Continue it with:' : 'Not started. Start it with:', detail: cli(unit, `drive ${w.threadId} --background`), decide: null };
  }
}

function decideOf(unit, view) {
  const { w, s } = unit;
  const kind = s.state === 'delivery-authorization-required' ? 'delivery' : s.hold?.kind;
  const d = decision(unit);
  const question = kind === 'delivery' ? d.stopped : (s.hold.questions ?? []).join('\n') || s.hold.reason || d.stopped;
  const options = kind === 'nq' ? ['Send answer'] : kind === 'failure' ? [...CAUSE_LIST] : ['Start building'];
  const verb = d.answer[0];
  const out = { kind, question, options, disabled: false, reason: '', storeDir: unit.storeDir, threadId: w.threadId };
  if (!view.live) return { ...out, disabled: true, reason: 'replaying: answers are sent only from the live view' };
  if (unit.driver.alive) return { ...out, disabled: true, reason: `Another item's driver owns this store (pid ${unit.driver.pid}); answer when it stops, or run: ${cli(unit, verb)}` };
  return out;
}

// ---- the terminal ------------------------------------------------------------------------------------

export function terminalLines(view, { width = 80 } = {}) {
  width = Math.max(30, Math.floor(width));
  const { units, at } = view, out = [];
  const section = (cls, text) => { if (out.length) out.push({ cls: '', text: '' }); out.push({ cls, text }); };
  const push = (lines, cls = '') => { for (const text of lines) out.push({ cls: cls || (/^ {3}\? /.test(text) ? 'q' : /^ {3}waiting /.test(text) ? 'dim' : ''), text }); };

  const needing = units.filter(u => !u.s.done && NEEDS.has(u.s.state));
  if (needing.length) out.push({ cls: 'bad', text: `${needing.length} needs you: ${needing.map(u => u.label).join(', ')}` });
  else out.push({ cls: 'ok', text: 'Nothing needs you.' });
  needing.forEach((u, i) => { out.push({ cls: '', text: '' }); push(decisionCard(u, width, at, u.label)); });

  const todo = units.filter(u => !u.s.done && u.s.state === 'ready' && !u.started);
  const queued = units.filter(u => !u.s.done && u.s.state === 'queued');
  const active = units.filter(u => !u.s.done && !NEEDS.has(u.s.state) && !todo.includes(u) && !queued.includes(u));
  const nested = u => u.w.parentId && active.some(p => p.storeDir === u.storeDir && p.w.threadId === u.w.parentId);
  const top = active.filter(u => !nested(u));
  if (active.length) {
    section('h', `NOW (${active.length})`);
    top.forEach((u, i) => { if (i) out.push({ cls: '', text: '' }); push(unitBlock(u, active, width, at, '', u.label)); });
  } else section('', 'NOW: nothing running.');

  if (todo.length) {
    section('h', `TO-DO (${todo.length})`);
    for (const u of todo.slice(0, 4)) {
      push([`  ${clip(`${u.label} ${plain(u.w.objective)}`, width - 2)}`]);
      push(command(cli(u, `drive ${u.w.threadId} --background`), width, '   $ '));
    }
    if (todo.length > 4) push([`  (${todo.length - 4} more)`], 'dim');
  }

  if (queued.length) {
    section('h', `QUEUED (${queued.length})`);
    for (const u of queued) push(wrap(`${u.label} ${plain(u.w.objective)}${u.w.from ? ` · from discovery #${u.w.from}` : ''} · waits its turn; no go-ahead`, width, '  '));
  }
  const accounts = Object.entries(view.accounts ?? {}).filter(([, reset]) => reset == null || reset > at).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
  if (accounts.length) {
    section('h', 'ACCOUNTS');
    push(accounts.flatMap(([account, reset]) => wrap(reset == null
      ? `${account}: out of quota, reset time unknown`
      : `${account}: out of quota until ${clock(reset, at)} (in ${span(reset - at)})`, width, '    ', { first: '  ', maxLines: 2 })));
  }

  const recorded = units.filter(u => u.w.kind || (u.w.record?.calls ?? []).length || (u.w.record?.operations ?? []).length);
  if (recorded.length) {
    section('h', 'THE ONE LIST');
    for (const u of units) push(wrap(`${u.label} ${plain(u.w.objective)} · ${u.w.kind ?? (u.s.delivery ? 'delivery' : 'discovery')} · ${u.s.state}${u.w.from ? ` · from discovery #${u.w.from}` : ''}`, width, '  '));
    for (const u of recorded.filter(u => u.w.kind !== 'delegated')) {
      section('h', `RECORD ${u.label} (recorded evidence, not process proof)`);
      for (const line of recordDetails(u.w, at)) push(wrap(line, width, '  '));
      push(command(cli(u, `export ${u.w.threadId}`), width, '  $ '));
    }
  }
  const today = units.filter(u => u.s.done && Number.isFinite(u.s.completedAt) && new Date(u.s.completedAt).toDateString() === new Date(at).toDateString());
  if (out.at(-1)?.text !== '') out.push({ cls: '', text: '' });
  push(today.length ? wrap(`DONE TODAY: ${today.map(u => u.label).join(', ')}`, width, '  ', { first: '' }) : ['DONE TODAY: none']);
  for (const u of units.filter(u => u.w.kind === 'delegated' && u.s.done)) push(delegatedBlock(u, width, at, u.label));
  return out.map(l => ({ cls: l.cls, text: clip(l.text, width) }));
}

// ---- the panels --------------------------------------------------------------------------------------

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dash = (reason, text = '—') => `<span title="${esc(reason)}">${text}</span>`;

export function renderPanels(view, { termWidth = 80 } = {}) {
  const sel = view.selected, hasUnit = Boolean(sel);
  const mins = m => m == null ? '—' : m < 1 ? `${Math.round(m * 60)}s` : `${round2(m)}m`;
  const nodeHtml = (n, op) => {
    const cls = n.state === 'done' ? 'node done' : n.state === 'on' ? `node on${op ? ' opn' : ''}` : n.state === 'fail' ? 'node fail' : 'node';
    return n.state === 'na' ? `<span class="${cls}" title="${esc(n.reason)}">${esc(n.label)} · —</span>`
      : `<span class="${cls}"${n.reason ? ` title="${esc(n.reason)}"` : ''}>${esc(n.label)}</span>`;
  };
  const chipRow = (chips, empty) => chips.length ? chips.map(c => `<span class="chip">${esc(c)}</span>`).join(' ') : `<span class="note">${esc(empty)}</span>`;
  const who = view.now.who;
  const decide = view.now.decide, d = decide;
  const decideHtml = !d ? '' : `<div class="decide" data-store="${esc(d.storeDir)}" data-thread="${esc(d.threadId)}" data-kind="${esc(d.kind)}"><b>${esc(d.question).replace(/\n/g, '<br>')}</b>`
    + (d.kind === 'nq' ? `<textarea id="answer" rows="3" style="flex-basis:100%" ${d.disabled ? 'disabled' : ''}></textarea><button type="button" class="go" data-act="answer" ${d.disabled ? 'disabled' : ''}>${esc(d.options[0])}</button>`
      : d.kind === 'failure' ? `<textarea id="answer" rows="3" style="flex-basis:100%" ${d.disabled ? 'disabled' : ''}></textarea>${d.options.map(c => `<button type="button" class="go" data-act="answer" data-cause="${esc(c)}" ${d.disabled ? 'disabled' : ''}>${esc(c)}</button>`).join('')}`
      : `<button type="button" class="go" data-act="authorize" ${d.disabled ? 'disabled' : ''}>${esc(d.options[0])}</button>`)
    + (d.disabled ? `<span class="note" style="flex-basis:100%;margin:0">${esc(d.reason)}</span>` : '') + '</div>';
  const tileOrder = ['todo', 'task', 'done', 'stops', 'waitedMin', 'checksPassed', 'checksFailed', 'tokens', 'cost'];
  const top = Math.max(1, ...view.telemetry.bars.map(b => b.minutes));
  const n = view.step?.n ?? 0, k = view.step?.k ?? 0;
  return {
    now: `<span class="who ${who}">${PILL_WORDS.who[who]}</span><div class="nowtext">${esc(view.now.headline)}</div>${view.now.detail ? `<div class="nowdetail">${esc(view.now.detail)}</div>` : ''}${decideHtml}`,
    dnodes: view.lanes.discovery.nodes.map(x => nodeHtml(x, false)).join(''),
    dchip: chipRow(view.lanes.discovery.chips, 'nothing in discovery'),
    onodes: view.lanes.operator.nodes.map(x => nodeHtml(x, true)).join(''),
    ochip: chipRow(view.lanes.operator.chips, 'nothing waits on you'),
    stages: view.lanes.delivery.map(s => `<div class="stage ${s.state === 'pending' ? '' : s.state}"><div class="nm">${esc(s.name)}</div><div class="st">${esc(s.sub)} · ${s.minutes == null ? dash('the record holds no time for this stage') : mins(s.minutes)}</div>${s.chips.map(c => `<span class="chip">${esc(c)}</span>`).join(' ')}</div>`).join(''),
    donecount: String(view.lanes.done),
    view: terminalLines(view, { width: termWidth }).map(l => l.cls ? `<span class="${l.cls}">${esc(l.text)}</span>` : esc(l.text)).join('\n'),
    details: (view.details ?? []).map(line => esc(line)).join('\n'),
    rules: hasUnit ? view.rules.map(r => `<div class="rule"><span class="s ${r.status}">${r.status === 'ok' ? '✓' : r.status === 'bad' ? '✗' : '·'}</span><div>${esc(r.label)}<div class="note" style="margin:0">${esc(r.evidence)}</div></div></div>`).join('') : '<div class="note">Nothing selected.</div>',
    list: view.items.map(i => `<tr data-store="${esc(i.storeDir)}" data-thread="${esc(i.threadId)}"${sel && i.threadId === sel.threadId && i.storeDir === sel.storeDir ? ' aria-selected="true" style="background:var(--accent-soft)"' : ''}><td class="id">#${esc(i.threadId)}</td><td>${esc(i.objective)}<div class="kind">${esc([i.kind, i.who, i.stage, i.waitsOn ? `waits ${i.waitsOn}` : '', i.from ? `from ${i.from}` : ''].filter(Boolean).join(' · '))}</div></td><td><span class="pill p-${i.pill}">${esc(i.pill)}</span></td></tr>`).join('') || '<tr><td colspan="3" class="note">No work yet.</td></tr>',
    metrics: tileOrder.map(key => { const t = view.telemetry.tiles[key]; return `<div class="m"><div class="v">${t.value == null ? dash(t.reason) : esc(t.value)}</div><div class="l">${esc(t.label)}${t.value == null || t.reason ? ` <span title="${esc(t.reason)}">· ${esc(t.reason)}</span>` : ''}</div></div>`; }).join(''),
    bars: view.telemetry.bars.map(b => `<div class="bar"><span>${esc(b.label)}</span><div class="t"><i${b.op ? ' class="opw"' : ''} style="width:${Math.round(b.minutes / top * 100)}%"></i></div><span class="n">${mins(b.minutes)}</span></div>`).join(''),
    log: view.log.map(l => `<div><span class="t">${hhmm(l.t)}</span><span class="w ${l.who}">${PILL_WORDS.who[l.who]}</span><span>${esc(l.text)}</span></div>`).join('') || '<div><span class="t"></span><span class="w sys">system</span><span>Nothing recorded yet.</span></div>',
    clock: esc(view.live ? `live · ${hhmm(view.at)}` : `${hhmm(view.at)} · event ${k} of ${n}`),
    prog: `${view.live ? 100 : n ? Math.round(k / n * 100) : 0}%`,
  };
}
