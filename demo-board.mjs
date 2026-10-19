import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { columns, fit, panel, row, theme, visible, wrapText } from './tui.mjs';
import { terminalText } from './view.mjs';

// The original terminal-board presentation. Live work and the demo enter through sidecar.mjs,
// which supplies the shared, read-only state derivation; this file keeps the established layout.

const STAGES = ['ideation', 'planning', 'implementation', 'verification'];
const STAGE_OF = { discover: 0, ideate: 0, challenge: 0, plan: 1, 'test-plan': 1, implement: 2, verify: 3, arbitrate: 3 };
const JOB = { discover: 'Discover', ideate: 'Ideate', challenge: 'Challenge', plan: 'Plan', 'test-plan': 'Design the check',
  implement: 'Make', verify: 'Run the check', arbitrate: 'Rule on a failure' };
const HARNESS = { claude: 'Claude Code', codex: 'Codex', pi: 'pi' };
const CAUSES = 'pre-existing, implementation or test';
const RECENT = 5;

const ms = v => typeof v === 'number' ? v : v ? Date.parse(v) : NaN;
export const clock = (t, now = Date.now()) => {
  const d = new Date(t), pad = n => String(n).padStart(2, '0'), hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return new Date(now).toDateString() === d.toDateString() ? hm : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${hm}`;
};
export const span = delta => {
  const m = Math.max(0, Math.floor(delta / 60_000));
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
};
const cardLabel = c => c ? `${HARNESS[c.harness] ?? c.harness} · ${c.model}` : '';
// Objectives are the operator's words; only the record's own name for a unit is made plain.
const plain = text => terminalText(text).replace(/\bthread (\d+)/gi, '#$1').replace(/\s+/g, ' ').trim();
const clip = (text, n) => text.length <= n ? text : `${text.slice(0, Math.max(0, n - 1))}…`;
const latestLine = text => text.trim().split('\n').findLast(line => line.trim()) ?? '';



const tilde = path => { const home = homedir(); return home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path; };
// The CLI answers in the data directory's own store; another workspace's store is named by its workspace.
const cli = (unit, verb) => unit.storeDir === unit.base ? `pi-durable ${verb}` : unit.workspace ? `pi-durable ${verb} --workspace ${tilde(unit.workspace)}` : `WORK_DATA=${tilde(unit.storeDir)} pi-durable ${verb}`;

// What the operator is being asked, in plain words, from the hold the record carries.
function decision(w) {
  const hold = w.hold, reason = String(hold?.reason ?? '');
  const card = { asks: hold.questions ?? [], suggests: hold.recommendation ?? null, said: null };
  if (hold.kind === 'nq') {
    if (/three answers/.test(reason)) card.stopped = `Questions still open after three rounds of answers (${JOB[w.current?.name] ?? 'this job'}).`;
    else if (/after the human answer/.test(reason)) card.stopped = `Still unclear after your answer (${JOB[w.current?.name] ?? 'this job'}).`;
    else { card.stopped = reason; }
  } else {
    const corrections = reason.match(/after (\d+) corrections/);
    if (corrections) card.stopped = `The checks still fail after ${corrections[1]} fixes.`;
    else if (/could not determine/.test(reason)) { card.stopped = 'A check failed and the cause is unclear.'; card.suggests ??= reason.replace(/^[^:]*:\s*/, '') || null; }
    else if (/prerequisites deep/.test(reason)) { card.stopped = 'An older defect turned up inside a fix, too deep to open another.'; card.said = reason.replace(/^.*?wrong\.\s*/, '') || null; }
    else card.stopped = reason;
    if (!card.asks.length && w.failure?.report) card.said ??= w.failure.report;
  }
  card.answer = w.kind === 'delegated' ? [`delegate human ${w.threadId} reply.txt --actor human`] : [`answer ${w.threadId} reply.txt${hold.kind === 'failure' ? ' <cause>' : ''}`];
  card.note = hold.kind === 'failure' ? `Write your answer in reply.txt; the cause is ${CAUSES}.` : 'Write your answer in reply.txt.';
  return card;
}



// The job being done right now, and since when, from the view's own state.
function now_(w) {
  if (w._board?.state.call) { const c = w._board.state.call; return { job: c.job ?? c.kind, card: c.card, since: ms(c.startedAt), detail: `${c.card?.provider ?? 'UNKNOWN'} · ${JSON.stringify(c.where ?? 'location UNKNOWN')}` }; }
  if (w.state === 'quota-wait' || w.state === 'limited') return { paused: 'Waiting for quota or a replacement card; no human answer needed.' };
  if (w.state === 'queued' || w.state === 'selected') return { paused: w.state === 'queued' ? 'Waiting its turn in the delivery queue.' : 'Selected; worker start not yet recorded.' };
  const attempts = w.record?.attempts ?? [];
  const live = w.attempt && attempts.find(a => a.id === w.attempt.id);
  const step = w.current?.name;
  const lastTurn = w.record?.exchanges?.findLast(x => x.id === w.exchange?.id)?.turns?.at(-1)?.at;
  const since = w.state === 'working' && live ? (live.startedAt ?? live.createdAt) : ms(lastTurn ?? w.lastEvent?.at);
  if (w.state === 'waiting-on-prerequisite') return { paused: `Paused until fix #${w.waitsOn} is done, then ${JOB[step] ?? 'the next job'} again.` };
  if (w.state === 'test-failed') return { job: JOB.arbitrate, since: ms(w.lastEvent?.at), detail: 'A check failed; deciding whose question it is.' };
  if (w.state === 'working' && live) return { job: JOB[step], card: live.card, since, health: live.health, silentFor: live.silentFor };
  return { job: JOB[step] ?? 'Next job', since };
}


const WAITING = new Set(['human-hold']);

// The board's sections follow the Made Well run view: happening now, where the work is, the one list,
// the rules checked on the record, and telemetry. Every figure comes from the record; nothing is example data.
const LANES = [['discovery', ['discover']], ['ideation', ['ideate', 'challenge']], ['planning', ['plan', 'test-plan']],
  ['implementation', ['implement']], ['verification', ['verify', 'arbitrate']]];
const LANE_OF = Object.fromEntries(LANES.flatMap(([lane, steps]) => steps.map(s => [s, lane])));
const ROLE = { discover: 'discoverer', ideate: 'shaper', challenge: 'challenger', plan: 'planner', 'test-plan': 'check writer',
  implement: 'maker', verify: 'checker', arbitrate: 'judge' };
const LOG_LINES = 10;

const attemptsOf = w => w.record?.attempts ?? [];
const eventsOf = w => w.record?.events ?? [];
const dropped = w => eventsOf(w).some(e => e.type === 'operator-cancelled');
const itemState = w => w.kind === 'delegated' ? w.done ? 'done' : 'task' : w.state === 'queued' ? 'to-do' : w.done ? (dropped(w) ? 'dropped' : 'done') : w.state === 'ready' && !attemptsOf(w).length ? 'to-do' : 'task';
const kindOf = w => w.kind ?? (w.parentId ? 'fix' : w.record?.delivery ? 'delivery' : 'discovery');
const runMs = (a, now) => Number.isFinite(a.startedAt) ? (a.endedAt ?? (['queued', 'running'].includes(a.status) ? now : a.startedAt)) - a.startedAt : 0;
const minutes = v => v < 3_600_000 ? `${Math.round(v / 60_000)}m` : span(v);
const count = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
const usage = a => (a.stats ?? []).filter(Boolean).reduce((t, s) => ({ tokens: t.tokens + (s.tokens ?? 0), cost: t.cost + (s.cost ?? 0) }), { tokens: 0, cost: 0 });

// Minutes each lane took for one unit, from the jobs' own start and end times.
function laneMinutes(w, now) {
  if (w._board) return Object.fromEntries(Object.entries(w._board.times.minutes).map(([k, v]) => [k, v * 60_000]));
  const out = {};
  for (const a of attemptsOf(w)) { const lane = LANE_OF[a.step]; if (lane) out[lane] = (out[lane] ?? 0) + runMs(a, now); }
  return out;
}

// What the operator was asked and how long the work waited for the answer.
function operatorStops(w, now) {
  const stops = [];
  for (const x of w.record?.exchanges ?? []) (x.turns ?? []).forEach((t, i) => {
    if (t.type === 'human') stops.push({ at: ms(t.at), waited: i ? ms(t.at) - ms(x.turns[i - 1].at) : 0 });
  });
  const ev = eventsOf(w);
  ev.forEach((e, i) => { if (e.type === 'delivery-authorized' && i > 1) stops.push({ at: ms(e.at), waited: ms(e.at) - ms(ev[i - 1].at) }); });
  if (!w.done && w.hold?.at) stops.push({ at: ms(w.hold.at), waited: now - ms(w.hold.at), open: true });
  return stops.map(s => ({ ...s, waited: Number.isFinite(s.waited) ? Math.max(0, s.waited) : 0 }));
}



// The rules a run is held to, each checked against the record; · until the record holds a case of it.
function rules(units) {
  if (units.some(u => u.w._board)) {
    const labels = ['No one checked their own work', 'Each step had its own agent', 'A failed check was routed, not ignored', 'Delivery finished only on passing checks', 'Questions settled within three rounds'];
    return labels.map((label, i) => { const states = units.map(u => u.w._board?.rules[i + 1]?.status ?? 'pend');
      return [label, states.includes('bad') || states.length > 0 && states.every(s => s === 'ok'), !states.includes('bad')]; });
  }
  const ws = units.map(u => u.w);
  const delivered = ws.filter(w => attemptsOf(w).some(a => !['discover'].includes(a.step)));
  const checked = ws.filter(w => attemptsOf(w).some(a => a.step === 'verify'));
  const failures = ws.flatMap(w => (w.record?.failures ?? []).map(f => ({ f, w })));
  const finished = ws.filter(w => w.done && w.record?.delivery && !dropped(w));
  const asked = ws.flatMap(w => w.record?.exchanges ?? []);
  const actors = w => { const by = {}; for (const a of attemptsOf(w)) if (a.actor) (by[a.actor] ??= new Set()).add(a.step); return by; };
  return [
    ['No one checked their own work', checked.length > 0, checked.every(w => {
      const makers = new Set(attemptsOf(w).filter(a => a.step === 'implement').map(a => a.actor));
      return attemptsOf(w).filter(a => a.step === 'verify').every(a => !makers.has(a.actor)); })],
    ['Each step had its own agent', delivered.length > 0, delivered.every(w => Object.values(actors(w)).every(s => s.size === 1))],
    ['A failed check was routed, not ignored', failures.length > 0, failures.every(({ f, w }) => f.ruling || f.status !== 'open' || w.hold?.kind === 'failure' || w.state === 'test-failed')],
    ['Delivery finished only on passing checks', finished.length > 0, finished.every(w => w.record.completion === 'verified')],
    ['Questions settled within three rounds', asked.length > 0, asked.every(x => (x.rounds ?? 0) <= 3)],
  ];
}

// The record's events in plain words, newest last.
function logLines(units, label) {
  const lines = [];
  for (const u of units) {
    const w = u.w, id = label(u), role = step => ROLE[step] ?? 'agent', byAttempt = {};
    for (const a of attemptsOf(w)) byAttempt[a.id] = a;
    for (const e of eventsOf(w)) {
      const a = byAttempt[e.attemptId], step = e.step ?? a?.step;
      const said = {
        created: ['record', `${id} added`],
        'delivery-authorized': ['you', `${id} go-ahead to build`],
        started: ['agent', `${id} ${role(step)} started ${JOB[step] ?? ''}`.trim()],
        reported: ['agent', `${id} ${role(step)} reported back`],
        handoff: ['record', `${id} ${JOB[e.from] ?? e.from} done, next ${JOB[e.to] ?? e.to}`],
        progress: ['agent', `${id} ${role(step)}: ${plain(e.deliverable ?? '')}`],
        'delegated-progress': ['agent', `${id} ${e.actor}: ${plain(latestLine(e.text ?? ''))}`],
        'delegated-dead': ['record', `${id} worker death recorded by ${e.actor}`],
        'test-failed': ['agent', `${id} a check failed`],
        'failure-routed': ['agent', `${id} failed check ruled: ${e.cause}`],
        'failure-undetermined': ['record', `${id} failed check, cause unclear`],
        redriven: ['record', `${id} ${JOB[step] ?? 'job'} run again`],
        complete: ['record', `${id} done`],
        'operator-cancelled': ['you', `${id} dropped`],
      }[e.type];
      if (said) lines.push({ at: ms(e.at), who: said[0], text: said[1] });
    }
    for (const x of w.record?.exchanges ?? []) for (const t of x.turns ?? []) if (t.type === 'human') lines.push({ at: ms(t.at), who: 'you', text: `${id} answered` });
  }
  return lines.filter(l => Number.isFinite(l.at)).sort((a, b) => a.at - b.at);
}

const SUB = { ideation: 'shape · challenge', planning: 'contract · checks', implementation: 'make', verification: 'check · rule' };
const WHO = { you: 'you', agent: 'agent', record: 'record', operator: 'you' };

// What a waiting item asks, as a highlighted band: the item, the question, the suggestion, the way to answer.
function decisionLines(t, unit, label, w, now, action) {
  const d = decision(unit.w), band = t.band('opSoft', 'ink'), bandTitle = t.band('opSoft', 'op'), bandMuted = t.band('opSoft', 'muted');
  const lines = [bandTitle(fit(` ? ${label} ${plain(unit.w.objective)}`, w))];
  const say = (text, style, lead = '   ', max = 3) => wrapText(text, w - lead.length - 1).slice(0, max).forEach((l, i, all) =>
    lines.push(style(fit(`${lead}${l}${i === max - 1 && all.length === max && wrapText(text, w - lead.length - 1).length > max ? '…' : ''}`, w))));
  for (const q of d.asks.slice(0, 2)) say(q, band);
  if (!d.asks.length) say(d.stopped, band);
  if (d.said) say(`“${d.said}”`, bandMuted, '   ', 2);
  if (d.suggests) say(`Suggested: ${d.suggests}`, bandMuted, '   ', 2);
  if (action) lines.push(bandTitle(fit(`   press enter  ▸ ${action}`, w)));
  else {
    for (const verb of d.answer) lines.push(bandTitle(fit(`   $ ${cli(unit, verb)}`, w)));
  }
  if (unit.w.hold?.at) lines.push(bandMuted(fit(`   waiting ${span(now - ms(unit.w.hold.at))}`, w)));
  if (unit.w.kind === 'delegated') lines.push(...delegatedLines(t, unit.w, w, now));
  return lines;
}

const age = (at, now) => !Number.isFinite(ms(at)) ? 'UNKNOWN' : `${Math.max(0, Math.floor((now - ms(at)) / 1000))}s`;

// Observations never replace lifecycle state, and absent hints never imply death or completion.
function delegatedLines(t, v, w, now) {
  const out = [], obs = v.telemetry ?? {};
  const add = text => wrapText(plain(text), w - 2).slice(0, 2).forEach(l => out.push('  ' + t.muted(l)));
  add(`Step: ${v.current?.name ?? v.record?.step ?? 'UNKNOWN'}`);
  if (obs.tmux) {
    add(`tmux: ${obs.tmux.state} · ${obs.tmux.command ?? obs.tmux.reason ?? 'pane unavailable'}`);
    if (obs.tmux.outputScope) add(`Activity: ${obs.tmux.outputScope} ${age(obs.tmux.outputAt, now)} ago`);
  }
  if (obs.steps) add(obs.steps.unavailable ? 'Steps: ledger unavailable' : `Steps: ${obs.steps.done} done recorded · NOW ${obs.steps.now.slice(0, 2).join('; ') || 'none recorded'}`);
  const update = eventsOf(v).findLast(e => e.actor === v.worker?.actor && ms(e.at) <= now && typeof e.text === 'string' && e.text.trim());
  if (update) add(`Update ${age(update.at, now)} ago · ${update.actor}: ${latestLine(update.text)}`);
  const tokens = v._board?.use.tokens.value;
  if (obs.usage || obs.tmux || Number.isFinite(tokens)) add(`Usage: context ${obs.usage?.context ?? 'UNKNOWN'} · tokens ${obs.usage?.tokens ?? (Number.isFinite(tokens) ? count(tokens) : 'UNKNOWN')} · cost ${obs.usage?.cost ?? 'UNKNOWN'}`);
  if (obs.repo) add(obs.repo.unavailable ? 'Repo: unavailable' : `Commit: ${obs.repo.hash} · ${age(obs.repo.at, now)} ago · ${obs.repo.changed} uncommitted · ${obs.repo.subject}`);
  return out;
}

// One running item: what it is, which job, on which card, for how long.
function runningLines(t, unit, label, w, now) {
  if (unit.w.kind === 'delegated') {
    const v = unit.w, ev = v.lastEvent ?? {}, card = v.worker ? `${HARNESS[v.worker.harness] ?? v.worker.harness} · ${v.worker.model}` : '';
    const out = [t.accentBold('▸ ') + t.inkBold(fit(`${label} ${plain(v.objective)}`, w - 2))];
    out.push('  ' + t.muted(fit(`${v.worker?.actor ?? 'worker'} on ${card}${v.worker?.provider ? ` · ${v.worker.provider}` : ''} · ${ev.state ?? v.state}${ev.at ? ` · ${span(now - ms(ev.at))}` : ''}`, w - 2)));
    if (v.where?.tmux) out.push('  ' + t.muted(fit(`Watch it: tmux window ${v.where.tmux}`, w - 2)));
    out.push(...delegatedLines(t, v, w, now));
    return out;
  }
  const x = now_(unit.w), lines = [t.accentBold('▸ ') + t.inkBold(fit(`${label} ${plain(unit.w.objective)}`, w - 2))];
  const role = ROLE[unit.w.state === 'test-failed' ? 'arbitrate' : unit.w.current?.name] ?? '', job = x.paused ?? `${x.job}${role ? ` · ${role}` : ''}${x.card ? ` on ${cardLabel(x.card)}` : ''}${Number.isFinite(x.since) ? ` · ${span(now - x.since)}` : ''}`;
  lines.push('  ' + (x.paused ? t.warn(fit(job, w - 2)) : t.muted(fit(job, w - 2))));
  if (x.detail) lines.push('  ' + t.bad(fit(x.detail, w - 2)));
  if (x.health === 'silent') lines.push('  ' + t.warn(fit(`No output for ${span(x.silentFor)}.`, w - 2)));
  if (x.health === 'worker-dead') lines.push('  ' + t.bad(fit('Its process is gone; drive it again.', w - 2)));
  const xc = unit.w.exchange;
  if (unit.w.state === 'question' && xc) lines.push('  ' + t.op(fit(`Questions: round ${Math.min(xc.rounds + 1, 3)} of 3, waiting for an answer from whoever handed it over.`, w - 2)));
  else if (unit.w.state === 'intake') lines.push('  ' + t.muted(fit(xc?.rounds > 0 ? `Questions: round ${xc.rounds} of 3 answered; reading the answer.` : 'Reading its brief before starting.', w - 2)));
  const restart = { stopped: 'Nothing is running it. Continue it:', 'worker-failed': 'The job stopped with an error. Drive it again:', ready: 'Not started. Start it:' }[unit.w.state];
  if (restart) lines.push('  ' + t.warn(fit(restart, w - 2)), '  ' + t.ink(fit(`$ ${cli(unit, `drive ${unit.w.threadId} --background`)}`, w - 2)));
  const swap = attemptsOf(unit.w).flatMap(a => (a.swaps ?? []).map(sw => ({ ...sw, step: a.step }))).sort((a, b) => ms(a.at) - ms(b.at)).at(-1);
  if (swap) {
    const why = swap.account ? ` (${swap.account} out of quota${Number.isFinite(swap.resetsAt) ? ` until ${clock(swap.resetsAt, now)}` : ''})` : '';
    for (const l of wrapText(`Switched ${JOB[swap.step] ?? ''} from ${cardLabel(swap.from)} to ${cardLabel(swap.to)}${why}, ${span(now - ms(swap.at))} ago.`, w - 2).slice(0, 2)) lines.push('  ' + t.warn(l));
  }
  return lines;
}

const SPARK = '▁▂▃▄▅▆▇█';
const gib = b => `${(b / 2 ** 30).toFixed(1)}G`;
const toneOf = pct => pct == null ? 'faint' : pct < 60 ? 'ok' : pct < 85 ? 'warn' : 'bad';

// The machine: a meter, the figure and a short history graph for each resource; then load and the busiest processes.
function machineLines(t, m, w, { split = false } = {}) {
  if (!m) return [t.muted('Machine figures are not available here.')];
  const sparkW = split ? 0 : Math.min(30, Math.max(0, Math.floor(w / 4))), valueW = 20;
  const spark = key => {
    const vals = (m.history ?? []).map(h => h[key]).filter(v => v != null).slice(-sparkW);
    return vals.length ? ' ' + t[toneOf(vals.at(-1))](vals.map(v => SPARK[Math.min(7, Math.floor(v / 12.5))]).join('')).padStart(0) : '';
  };
  const meter = (label, pct, value, key, cw) => {
    // Every bar is the same length; a row without a history graph keeps its place empty.
    const room = Math.max(4, cw - 6 - valueW - (sparkW ? sparkW + 1 : 0)), fill = pct == null ? 0 : Math.round(room * Math.min(100, pct) / 100);
    return t.muted(label.padEnd(6)) + t[toneOf(pct)]('█'.repeat(fill)) + t.line('░'.repeat(room - fill)) + t.ink(value.padStart(valueW)) + (key && sparkW ? spark(key) : '');
  };
  const pct = x => x && x.total ? 100 * x.used / x.total : null;
  const cpuText = m.cpu == null ? '…' : `${Math.round(m.cpu)}%`;
  const rows = [
    cw => meter('cpu', m.cpu, cpuText, 'cpu', cw),
    cw => meter('mem', pct(m.mem), m.mem ? `${gib(m.mem.used)} / ${gib(m.mem.total)} ${Math.round(pct(m.mem))}%` : '?', 'mem', cw),
    ...(m.swap ? [cw => meter('swap', pct(m.swap), `${gib(m.swap.used)} / ${gib(m.swap.total)}`, null, cw)] : []),
    cw => meter('disk', pct(m.disk), m.disk ? `${gib(m.disk.used)} / ${gib(m.disk.total)} ${Math.round(pct(m.disk))}%` : '?', null, cw),
  ];
  const up = m.uptime >= 86400 ? `${Math.floor(m.uptime / 86400)}d ${Math.floor(m.uptime % 86400 / 3600)}h` : `${Math.floor(m.uptime / 3600)}h ${Math.floor(m.uptime % 3600 / 60)}m`;
  const facts = [t.muted('load  ') + t.ink(m.load.map(x => x.toFixed(2)).join(' ')) + t.muted(` · ${m.cores} cores · up ${up}`),
    t.muted('busy  ') + m.top.map(p => t.ink(p.name) + t.muted(` ${Math.round(p.cpu)}% ${gib(p.mem)}`)).join(t.faint('  ·  '))];
  if (!split) return [...rows.map(r => r(w)), ...facts.map(f => fit(f, w))];
  const half = Math.floor((w - 3) / 2);
  return columns([rows.slice(0, 2).map(r => r(half)), [...rows.slice(2).map(r => r(half)), fit(facts[0], half)]], [half, half], 3).concat(fit(facts[1], w));
}

// One frame. Pure: the same snapshot, size and time give the same text. `narration` is the demo's step.
export function renderSidecar(snap, { width = 80, height, now = snap?.at ?? Date.now(), color = false, narration = null } = {}) {
  width = Math.max(40, Math.floor(width));
  const t = theme(color);
  const many = (snap?.stores ?? []).filter(s => s.threads?.length).length > 1;
  const units = (snap?.stores ?? []).flatMap(s => (s.threads ?? []).map(w => ({ w, storeDir: s.dir, base: snap.base, workspace: w.workspace ?? s.workspace })));
  const label = u => `#${u.w.threadId}${many && u.workspace ? ` (${basename(u.workspace)})` : ''}`;
  const waiting = units.filter(u => !u.w.done && WAITING.has(u.w.state) && (u.w.hold || u.w.state !== 'human-hold'));
  const active = units.filter(u => !u.w.done && !WAITING.has(u.w.state) && itemState(u.w) !== 'to-do');
  const running = active.filter(u => u.w.kind === 'delegated' ? u.w.telemetry?.tmux?.state === 'running' : u.w._board ? u.w.state === 'working' : true);
  const open = units.filter(u => !u.w.done && itemState(u.w) !== 'to-do');
  const todos = units.filter(u => itemState(u.w) === 'to-do');
  const finished = units.filter(u => itemState(u.w) === 'done');
  const today = finished.filter(u => new Date(ms(u.w.lastEvent?.at)).toDateString() === new Date(now).toDateString());
  const log = logLines(units, label);
  const out = [];

  // The title bar: the name, the counts that matter, the time.
  const left = t.inkBold(' MADE WELL') + (narration?.title ? t.muted(`  ${narration.title}`) : '');
  const right = [t.pill(running.length ? 'agent' : 'record', `${running.length} running`),
    t.pill(waiting.length ? 'you' : 'record', waiting.length ? `${waiting.length} need${waiting.length === 1 ? 's' : ''} you` : 'nothing needs you'),
    t.pill('done', `${today.length} done today`), t.muted(clock(now, now) + ' ')].join(' ');
  out.push(fit(left + ' '.repeat(Math.max(1, width - visible(left) - visible(right))) + right, width));
  if (narration?.controls) out.push(...narration.controls(t, width));

  // Happening now: the latest thing that happened, what waits on you, what is running.
  const nowPanel = w => {
    const body = [];
    const latest = narration?.step ?? (log.length ? { who: log.at(-1).who, t: log.at(-1).text, d: `${clock(log.at(-1).at, now)}` } : null);
    if (latest) {
      const who = WHO[latest.who] ?? latest.who, badge = t.pill(who === 'you' ? 'you' : who, who.toUpperCase()), indent = visible(badge) + 1;
      body.push(badge + ' ' + t.inkBold(fit(latest.t, w - indent)));
      for (const l of wrapText(latest.d, w - indent).slice(0, 3)) body.push(' '.repeat(indent) + t.muted(l));
    } else if (!waiting.length && !active.length) body.push(t.muted('Quiet. Nothing is running and nothing is waiting on you.'));
    if (narration?.ask && !waiting.length) { body.push(''); body.push(t.band('opSoft', 'op')(fit(` ? WAITING ON YOU  ${narration.ask}`, w)), t.band('opSoft', 'op')(fit(`   press enter  ▸ ${narration.opt}`, w))); }
    for (const u of waiting) { if (body.length) body.push(''); body.push(...decisionLines(t, u, label(u), w, now, narration?.ask ? `${narration.ask}: ${narration.opt}` : null)); }
    for (const u of active) { if (body.length) body.push(''); body.push(...runningLines(t, u, label(u), w, now)); }
    return body;
  };
  const nowTone = waiting.length || narration?.ask ? 'op' : 'line', nowTitle = waiting.length || narration?.ask ? 'opBold' : 'mutedBold';
  const machineTitle = `MACHINE${snap?.machine?.host ? ` · ${snap.machine.host}` : ''}`;
  if (width >= 150) out.push(...row(t, [{ title: 'HAPPENING NOW', weight: 2.4, body: nowPanel, tone: nowTone, titleTone: nowTitle },
    { title: machineTitle, weight: 1, body: w => machineLines(t, snap?.machine, w) }], width));
  else {
    out.push(...panel(t, machineTitle, machineLines(t, snap?.machine, width - 4, { split: width >= 90 }), width));
    out.push(...panel(t, 'HAPPENING NOW', nowPanel(width - 4), width, { tone: nowTone, titleTone: nowTitle }));
  }

  // Where the work is: discovery, you, the four delivery stages, done; each item a chip in its lane.
  const chip = (u, mark, tone, extra = '') => t[`${tone}Bold`](`${mark} ${label(u)}`) + (extra ? t.muted(` ${extra}`) : '');
  const discoveryLane = w => {
    const body = [];
    for (const u of open.filter(u => u.w.current?.name === 'discover' && !WAITING.has(u.w.state))) {
      body.push(chip(u, '▸', 'accent', ROLE.discover));
      const said = eventsOf(u.w).findLast(e => e.type === 'progress');
      if (said) wrapText(said.deliverable, w - 2).slice(0, 2).forEach(l => body.push('  ' + t.muted(l)));
    }
    for (const u of units.filter(u => u.w.done && kindOf(u.w) === 'discovery').slice(-3)) {
      const born = units.filter(c => c.w.from === u.w.threadId).length;
      body.push(chip(u, '✓', 'ok', born ? `→ ${born} to-dos` : 'done'));
    }
    return body.length ? body : [t.faint('—')];
  };
  const youLane = w => {
    const body = waiting.map(u => chip(u, '?', 'op', 'answer'));
    if (narration?.ask && !waiting.length) body.push(t.opBold(`? ${narration.ask.toLowerCase()}`));
    if (todos.length) body.push(t.muted(`${todos.length} to-do to start`));
    return body.length ? body.map(l => fit(l, w)) : [t.faint('—')];
  };
  const stageBox = stage => {
    const here = open.filter(u => LANE_OF[u.w.current?.name] === stage || (stage === 'verification' && u.w.state === 'test-failed'));
    const passed = open.filter(u => !here.includes(u) && laneMinutes(u.w, now)[stage]);
    const failing = here.some(u => u.w.state === 'test-failed' || (u.w.failure && u.w.failure.status !== 'answered'));
    const asking = here.some(u => u.w.state === 'human-hold');
    const tone = failing ? 'bad' : asking ? 'op' : here.length ? 'accent' : passed.length ? 'ok' : 'line';
    return { title: stage.toUpperCase(), tone, titleTone: tone === 'line' ? 'mutedBold' : `${tone}Bold`, body: w => {
      const body = [t.faint(fit(SUB[stage], w))];
      for (const u of here) {
        const st = u.w.state, mins = laneMinutes(u.w, now)[stage];
        const [mark, tn] = st === 'test-failed' ? ['✗', 'bad'] : st === 'human-hold' ? ['?', 'op'] : st === 'waiting-on-prerequisite' ? ['‖', 'warn'] : ['▸', 'accent'];
        body.push(fit(chip(u, mark, tn, [mins ? minutes(mins) : '', st === 'waiting-on-prerequisite' ? `waits #${u.w.waitsOn}` : u.w.kind === 'delegated' ? u.w._board?.state.delegationState ?? st : ''].filter(Boolean).join(' ')), w));
      }
      for (const u of passed) body.push(fit(chip(u, '✓', 'ok', minutes(laneMinutes(u.w, now)[stage])), w));
      return body;
    } };
  };
  const doneLane = w => [t.okBold(String(finished.length)), t.muted(`${today.length} today`), ...today.slice(-3).map(u => t.ok(fit(`✓ ${label(u)}`, w)))];
  // One row of lanes: discovery, you, the four delivery stages, done. Narrow panes take two rows.
  const lanes = [
    { title: 'DISCOVERY', weight: 1.6, body: discoveryLane, tone: open.some(u => u.w.current?.name === 'discover' && !WAITING.has(u.w.state)) ? 'accent' : 'line', titleTone: 'inkBold' },
    { title: 'YOU', weight: 1.2, body: youLane, tone: waiting.length || narration?.ask ? 'op' : 'line', titleTone: 'opBold' }];
  const stages = LANES.slice(1).map(([s]) => stageBox(s));
  const doneSpec = { title: 'DONE', weight: 0.8, body: doneLane, tone: finished.length ? 'ok' : 'line', titleTone: 'okBold' };
  const flow = w => [...(w >= 120 ? row(t, [...lanes, ...stages, doneSpec], w) : [...row(t, [...lanes, doneSpec], w), ...row(t, stages, w)]),
    ...open.filter(u => u.w.kind === 'delegated' && !LANE_OF[u.w.current?.name]).flatMap(u => wrapText(`Delegated · stage not supplied: ${label(u)} ${u.w._board?.state.delegationState ?? u.w.state}`, w))];
  out.push(...panel(t, 'WHERE THE WORK IS', flow(width - 4), width));

  // The one list, the rules, the telemetry.
  const listBody = (w, max = Infinity) => {
    const rank = u => ({ task: 0, 'to-do': 1, done: 2, dropped: 3 })[itemState(u.w)] * 1e6 + (u.w.done ? -ms(u.w.lastEvent?.at) / 1e6 : u.w.order ?? u.w.threadId);
    const rows = [...units].sort((a, b) => rank(a) - rank(b));
    const body = [t.faint(fit('#     ITEM', w - 9) + '    STATE')];
    if (!rows.length) body.push(t.muted('The list is empty.'));
    const room = Math.max(1, Math.floor((max - 2) / 2));
    for (const u of rows.slice(0, room)) {
      const st = itemState(u.w), stateWord = u.w.kind === 'delegated' ? u.w._board?.state.delegationState ?? u.w.state : st, asks = WAITING.has(u.w.state) && !u.w.done;
      const pill = asks ? t.pill('you', 'needs you') : t.pill({ 'to-do': 'todo', task: 'task', done: 'done', dropped: 'dropped' }[st], stateWord);
      const name = t.muted(label(u).padEnd(6)) + (u.w.done ? t.muted(plain(u.w.objective)) : t.ink(plain(u.w.objective)));
      body.push(fit(name, w - visible(pill) - 1) + ' ' + pill);
      const who = u.w.kind === 'delegated' ? `${u.w.worker?.job ?? 'UNKNOWN'} · ${typeof u.w.where === 'string' ? u.w.where : u.w.where?.tmux ?? u.w.where?.window ?? 'location UNKNOWN'} · ${stateWord}` : !u.w.done && u.w.current?.name ? ROLE[u.w.current.name] : '', lane = !u.w.done && u.w.current?.name ? LANE_OF[u.w.current.name] : '';
      const observed = u.w.kind === 'delegated' ? u.w.telemetry?.tmux?.state : null;
      body.push(t.faint(fit(`      ${[observed ? `${stateWord} · ${observed}` : kindOf(u.w), who, lane, u.w.waitsOn ? `waits on #${u.w.waitsOn}` : '', u.w.parentId || u.w.from ? `from #${u.w.parentId ?? u.w.from}` : ''].filter(Boolean).join(' · ')}`, w)));
    }
    if (rows.length > room) body.push(t.faint(`      … ${rows.length - room} more`));
    return body;
  };
  const rulesBody = w => rules(units).flatMap(([text, seen, ok]) => {
    const mark = !seen ? t.faint('·') : ok ? t.okBold('✓') : t.badBold('✗');
    return wrapText(text, w - 2).slice(0, 2).map((l, i) => (i ? '  ' : mark + ' ') + (seen ? t.ink(l) : t.faint(l)));
  });
  const accounts = Object.entries(snap?.accounts ?? {}).filter(([, reset]) => reset == null || reset > now).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
  const accountLines = w => accounts.flatMap(([account, reset]) => wrapText(reset == null ? `${account}: out of quota, reset time unknown`
    : `${account}: out of quota until ${clock(reset, now)} (in ${span(reset - now)})`, w - 2).map((l, i) => t.warn(`${i ? ' ' : '!'} ${l}`)));
  const by = st => units.filter(u => itemState(u.w) === st).length;
  const stops = units.flatMap(u => operatorStops(u.w, now));
  const stopCount = units.reduce((n, u) => n + (u.w._board?.wait.stops ?? operatorStops(u.w, now).length), 0);
  const waited = units.reduce((n, u) => n + (u.w._board ? u.w._board.wait.minutes * 60_000 : operatorStops(u.w, now).reduce((sum, s) => sum + s.waited, 0)), 0);
  const tilesBody = w => {
    const verify = units.flatMap(u => attemptsOf(u.w).filter(a => a.step === 'verify' && ['accepted', 'failed-test'].includes(a.status)));
    const failed = units.reduce((n, u) => n + (u.w.record?.failures?.length ?? 0), 0);
    const use = units.flatMap(u => attemptsOf(u.w)).map(usage).reduce((a, x) => ({ tokens: a.tokens + x.tokens, cost: a.cost + x.cost }), { tokens: 0, cost: 0 });
    if (units.some(u => u.w._board)) {
      for (const key of ['tokens', 'cost']) { const known = units.map(u => u.w._board?.use[key]?.value).filter(Number.isFinite); use[key] = known.length ? known.reduce((n, v) => n + v, 0) : null; }
    }
    const tiles = [[by('to-do'), 'to-do', 'ink'], [by('task'), 'task', 'accent'], [by('done'), 'done', 'ok'],
      [stopCount, 'stops for you', 'op'], [minutes(waited), 'waited on you', 'op'], [`${verify.filter(a => a.status === 'accepted').length}/${verify.length}`, 'checks passed', 'ok'],
      [failed, 'checks failed', failed ? 'bad' : 'ink'], [use.tokens == null ? 'UNKNOWN' : count(use.tokens), 'tokens', 'ink'], [use.cost == null ? 'UNKNOWN' : `$${use.cost.toFixed(2)}`, 'spend', 'ink']];
    // Three tiles a row when the labels fit, two when they would be cut.
    const per = w >= 48 ? 3 : 2, tw = Math.floor((w - 2 * (per - 1)) / per), widths = Array(per).fill(tw), body = [];
    for (let i = 0; i < tiles.length; i += per) {
      const set = tiles.slice(i, i + per);
      body.push(columns(set.map(([v, , tone]) => [t[`${tone}Bold`](String(v))]), widths)[0], columns(set.map(([, l]) => [t.muted(l)]), widths)[0]);
    }
    return body;
  };
  const barsBody = w => {
    const lanesMin = {};
    for (const u of units) for (const [k, v] of Object.entries(laneMinutes(u.w, now))) lanesMin[k] = (lanesMin[k] ?? 0) + v;
    const series = [...LANES.map(([k]) => [k, lanesMin[k] ?? 0, 'accent']), ['waited on you', waited, 'op']];
    const top = Math.max(...series.slice(0, -1).map(x => x[1])) || waited || 1, room = Math.max(4, w - 15 - 8);
    return series.map(([k, v, tone]) => {
      const fill = Math.min(room, Math.round(room * v / top)), over = v > top;
      return t.muted(k.padEnd(15)) + t[tone]('█'.repeat(over ? fill - 1 : fill) + (over ? '▶' : '')) + t.line('░'.repeat(room - fill)) + t.muted(minutes(v).padStart(8));
    });
  };
  const logBody = (w, max) => {
    const stamp = Math.max(5, ...log.map(l => clock(l.at, now).length)), lead = stamp + 9;
    if (!log.length) return [t.muted('No events yet.')];
    return log.slice(-Math.max(1, max)).map((l, i, all) => {
      const who = WHO[l.who] ?? l.who, tone = who === 'you' ? 'op' : who === 'agent' ? 'accent' : 'muted', text = fit(l.text, w - lead);
      return t.faint(clock(l.at, now).padEnd(stamp)) + '  ' + t[tone](who.padEnd(7)) + (i === all.length - 1 ? t.inkBold(text) : t.ink(text));
    });
  };
  const rulesPanel = w => [...rulesBody(w), ...(accounts.length ? ['', ...accountLines(w)] : [])];

  // Below the lanes: the list, the rules and the numbers; then time per stage and the log, which takes what is left.
  const rest = height ? height - out.length : Infinity;
  if (width >= 100) {
    const listRows = Number.isFinite(rest) ? Math.max(8, rest - 8 - 2 - 2) : 24;
    out.push(...row(t, [
      { title: 'THE ONE LIST', weight: 1.3, body: w => listBody(w, listRows) },
      { title: 'RULES, CHECKED ON THE RECORD', weight: 0.9, body: rulesPanel },
      { title: 'TELEMETRY', weight: 1.1, body: tilesBody }], width));
    const logRows = height ? Math.max(6, height - out.length - 2) : LOG_LINES;
    out.push(...row(t, [
      { title: 'MINUTES PER STAGE', weight: width >= 150 ? 1 : 1.5, body: barsBody },
      { title: 'LOG', weight: width >= 150 ? 2 : 1.5, body: w => logBody(w, logRows) }], width, { maxBody: logRows }));
  } else {
    out.push(...panel(t, 'THE ONE LIST', listBody(width - 4, 14), width));
    out.push(...panel(t, 'RULES, CHECKED ON THE RECORD', rulesPanel(width - 4), width));
    out.push(...panel(t, 'TELEMETRY', tilesBody(width - 4), width));
    out.push(...panel(t, 'MINUTES PER STAGE', barsBody(width - 4), width));
    out.push(...panel(t, 'LOG', logBody(width - 4, LOG_LINES), width));
  }
  return out.map(l => fit(l, width).replace(/ +$/, '')).join('\n');
}
