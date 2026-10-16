import { readFile, watch } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { dataDirectory } from './config.mjs';
import { snapshot } from './serve.mjs';

// The terminal sidecar: one plain program for a pane in any multiplexer. Read-only, like the dashboard:
// it reads the view files through serve.mjs's snapshot and the accounts files, never a store or its lock.

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
const plain = text => String(text ?? '').replace(/\bthread (\d+)/gi, '#$1').replace(/\s+/g, ' ').trim();
const clip = (text, n) => text.length <= n ? text : `${text.slice(0, Math.max(0, n - 1))}…`;

// Word wrap to the pane, hard-breaking anything longer than a line. maxLines trims with an ellipsis.
function wrap(text, width, indent = '', { first = indent, maxLines = Infinity } = {}) {
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
function command(text, width, indent) {
  const lines = []; let rest = text, prefix = indent;
  while (prefix.length + rest.length > width) {
    const room = width - prefix.length - 1, space = rest.lastIndexOf(' ', room - 1);
    if (space > 0) { lines.push(`${prefix}${rest.slice(0, space + 1)}\\`); rest = rest.slice(space + 1); prefix = `${' '.repeat(indent.length)}  `; }
    else { lines.push(`${prefix}${rest.slice(0, room)}\\`); rest = rest.slice(room); prefix = ''; }
  }
  return [...lines, prefix + rest];
}

const tilde = path => { const home = homedir(); return home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path; };
// The CLI answers in the data directory's own store; any other store is named with WORK_DATA.
const cli = (unit, verb) => `${unit.storeDir === unit.base ? '' : `WORK_DATA=${tilde(unit.storeDir)} `}pi-durable ${verb}`;

// What the operator is being asked, in plain words, from the hold the record carries.
function decision(w) {
  const hold = w.hold, reason = String(hold?.reason ?? '');
  if (w.state === 'delivery-authorization-required') return {
    stopped: 'Discovery is done. Building needs your go-ahead.', asks: [], suggests: null,
    answer: [`drive ${w.threadId} --delivery --background`], note: 'Run it to authorize building.' };
  const card = { asks: hold.questions ?? [], suggests: hold.recommendation ?? null, said: null };
  if (hold.kind === 'nq') {
    if (/three answers/.test(reason)) card.stopped = `Questions still open after three rounds of answers (${JOB[w.current?.name] ?? 'this job'}).`;
    else if (/after the human answer/.test(reason)) card.stopped = `Still unclear after your answer (${JOB[w.current?.name] ?? 'this job'}).`;
    else { card.stopped = 'Only you can authorize this.'; card.suggests ??= reason; }
  } else {
    const corrections = reason.match(/after (\d+) corrections/);
    if (corrections) card.stopped = `The checks still fail after ${corrections[1]} fixes.`;
    else if (/could not determine/.test(reason)) { card.stopped = 'A check failed and the cause is unclear.'; card.suggests ??= reason.replace(/^[^:]*:\s*/, '') || null; }
    else if (/prerequisites deep/.test(reason)) { card.stopped = 'An older defect turned up inside a fix, too deep to open another.'; card.said = reason.replace(/^.*?wrong\.\s*/, '') || null; }
    else card.stopped = reason;
    if (!card.asks.length && w.failure?.report) card.said ??= w.failure.report;
  }
  card.answer = [`answer ${w.threadId} reply.txt${hold.kind === 'failure' ? ' <cause>' : ''}`];
  card.note = hold.kind === 'failure' ? `Write your answer in reply.txt; the cause is ${CAUSES}.` : 'Write your answer in reply.txt.';
  return card;
}

function decisionCard(unit, width, now, label) {
  const w = unit.w, d = decision(w), out = [];
  out.push(...wrap(`${label} ${plain(w.objective)}`, width, '   ', { maxLines: 2 }));
  out.push(...wrap(d.stopped, width, '   ', { first: '   Stopped: ', maxLines: 3 }));
  for (const q of d.asks.slice(0, 3)) out.push(...wrap(q, width, '     ', { first: '   ? ', maxLines: 4 }));
  if (d.asks.length > 3) out.push(`   (${d.asks.length - 3} more questions)`);
  if (d.said) out.push(...wrap(d.said, width, '     ', { first: '   " ', maxLines: 4 }));
  if (d.suggests) out.push(...wrap(d.suggests, width, '   ', { first: '   Suggested: ', maxLines: 4 }));
  out.push(...wrap(d.note, width, '   ', { maxLines: 2 }));
  for (const verb of d.answer) out.push(...command(cli(unit, verb), width, '   $ '));
  if (w.hold) out.push('   Then continue it:', ...command(cli(unit, `drive ${w.threadId} --background`), width, '   $ '));
  if (w.hold?.at) out.push(`   waiting ${span(now - ms(w.hold.at))}`);
  return out;
}

function rail(position, width, indent) {
  const at = STAGE_OF[position] ?? 0;
  const full = STAGES.map((s, i) => i === at ? `[${s}]` : s).join(' · ');
  if (indent.length + full.length <= width) return indent + full;
  // Narrow: done ✓, to come ○, the current stage by name.
  return clip(indent + STAGES.map((s, i) => i === at ? `[${s}]` : i < at ? '✓' : '○').join(' '), width);
}

// The job being done right now, and since when, from the view's own state.
function now_(w) {
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

function unitBlock(unit, all, width, now, indent, label) {
  const w = unit.w, out = [];
  out.push(...wrap(`${label} ${plain(w.objective)}`, width, indent + '   ', { first: indent, maxLines: 1 }));
  const pad = indent + '   ';
  out.push(rail(w.current?.name ?? (w.state === 'test-failed' ? 'arbitrate' : null), width, pad));
  const j = now_(w);
  const head = j.paused ?? `Now: ${j.job}${j.card ? ` on ${cardLabel(j.card)}` : ''}${Number.isFinite(j.since) ? `, for ${span(now - j.since)}` : ''}`;
  out.push(...wrap(head, width, pad + '  ', { first: pad, maxLines: 2 }));
  if (j.detail) out.push(...wrap(j.detail, width, pad, { maxLines: 2 }));
  if (j.health === 'silent') out.push(...wrap(`No output for ${span(j.silentFor)}.`, width, pad));
  if (j.health === 'worker-dead') out.push(...wrap('Its process is gone; drive it again.', width, pad));
  const x = w.exchange;
  if (w.state === 'question' && x) out.push(...wrap(`Questions: round ${Math.min(x.rounds + 1, 3)} of 3, waiting for an answer from whoever handed it over.`, width, pad, { maxLines: 2 }));
  else if (w.state === 'intake' && x?.rounds > 0) out.push(...wrap(`Questions: round ${x.rounds} of 3 answered; reading the answer.`, width, pad, { maxLines: 2 }));
  else if (w.state === 'intake') out.push(...wrap('Reading its brief before starting.', width, pad));
  if (w.state === 'stopped') { out.push(...wrap('Nothing is running it. Continue it with:', width, pad)); out.push(...command(cli(unit, `drive ${w.threadId} --background`), width, pad + '$ ')); }
  if (w.state === 'worker-failed') { out.push(...wrap('The job stopped with an error. Drive it again:', width, pad)); out.push(...command(cli(unit, `drive ${w.threadId} --background`), width, pad + '$ ')); }
  if (w.state === 'ready') { out.push(...wrap('Not started. Start it with:', width, pad)); out.push(...command(cli(unit, `drive ${w.threadId} --background`), width, pad + '$ ')); }
  const swap = (w.record?.attempts ?? []).flatMap(a => (a.swaps ?? []).map(s => ({ ...s, step: a.step }))).sort((a, b) => ms(a.at) - ms(b.at)).at(-1);
  if (swap) {
    const why = swap.account ? ` (${swap.account} out of quota${Number.isFinite(swap.resetsAt) ? ` until ${clock(swap.resetsAt, now)}` : ''})` : '';
    out.push(...wrap(`Switched ${JOB[swap.step] ?? ''} from ${cardLabel(swap.from)} to ${cardLabel(swap.to)}${why}, ${span(now - ms(swap.at))} ago.`, width, pad + '  ', { first: pad, maxLines: 3 }));
  }
  // Fix items this unit waits on, nested under it.
  for (const child of all.filter(c => c.storeDir === unit.storeDir && c.w.parentId === w.threadId && !c.w.done)) {
    out.push(...unitBlock(child, all, width, now, pad + '  ', `#${child.w.threadId}`));
  }
  return out;
}

const WAITING = new Set(['human-hold', 'delivery-authorization-required']);

// One frame. Pure: the same snapshot, width and time give the same text.
export function renderSidecar(snap, { width = 80, now = snap?.at ?? Date.now(), color = false } = {}) {
  width = Math.max(30, Math.floor(width));
  const many = (snap?.stores ?? []).filter(s => s.threads?.length).length > 1;
  const units = (snap?.stores ?? []).flatMap(s => (s.threads ?? []).map(w => ({ w, storeDir: s.dir, base: snap.base, workspace: w.workspace ?? s.workspace })));
  const label = u => `#${u.w.threadId}${many && u.workspace ? ` (${basename(u.workspace)})` : ''}`;
  const lines = [], heads = new Set();
  const section = (title, body) => { if (lines.length) lines.push(''); heads.add(lines.length); lines.push(title, ...body); };

  const waiting = units.filter(u => !u.w.done && WAITING.has(u.w.state) && (u.w.hold || u.w.state !== 'human-hold'));
  if (waiting.length) section(`WAITING ON YOU (${waiting.length})`, waiting.flatMap((u, i) => [...(i ? [''] : []), ...decisionCard(u, width, now, label(u))]));
  else lines.push('Nothing is waiting on you.');

  const active = units.filter(u => !u.w.done && !WAITING.has(u.w.state));
  const nested = u => u.w.parentId && active.some(p => p.storeDir === u.storeDir && p.w.threadId === u.w.parentId);
  const top = active.filter(u => !nested(u));
  if (top.length) section('IN PROGRESS', top.flatMap((u, i) => [...(i ? [''] : []), ...unitBlock(u, active, width, now, '', label(u))]));
  else { lines.push(''); lines.push('Nothing in progress.'); }

  const accounts = Object.entries(snap?.accounts ?? {}).filter(([, reset]) => reset == null || reset > now).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
  if (accounts.length) section('ACCOUNTS', accounts.flatMap(([account, reset]) => wrap(reset == null
    ? `${account}: out of quota, reset time unknown`
    : `${account}: out of quota until ${clock(reset, now)} (in ${span(reset - now)})`, width, '    ', { first: '  ', maxLines: 2 })));

  const done = units.filter(u => u.w.done).sort((a, b) => ms(b.w.lastEvent?.at) - ms(a.w.lastEvent?.at)).slice(0, RECENT);
  if (done.length) section('RECENT', done.map(u => {
    const when = Number.isFinite(ms(u.w.lastEvent?.at)) ? ` · ${span(now - ms(u.w.lastEvent.at))} ago` : '';
    const mark = u.w.record?.completion && u.w.record.completion !== 'verified' ? `${u.w.record.completion}` : 'done';
    return `  ${clip(`${label(u)} ${mark}${when} · ${plain(u.w.objective)}`, width - 2)}`;
  }));
  return lines.map((l, i) => { l = clip(l, width); return color && heads.has(i) ? `\x1b[1m${l}\x1b[0m` : l; }).join('\n');
}

// Quota belongs to provider accounts: the shared accounts.json at the data root, plus any store's own.
export async function readAccounts(base, dirs) {
  const all = {};
  for (const dir of new Set([base, ...dirs])) {
    const marks = await readFile(join(dir, 'accounts.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (!marks || typeof marks !== 'object') continue;
    for (const [account, reset] of Object.entries(marks)) all[account] = reset == null || all[account] === null ? null : Math.max(all[account] ?? 0, reset);
  }
  return all;
}

export async function sidecarSnapshot({ base = dataDirectory(), now = Date.now() } = {}) {
  const snap = await snapshot({ base, now });
  return { ...snap, accounts: await readAccounts(base, snap.stores.map(s => s.dir)) };
}

// The live loop: clear-screen redraw on change, on resize, or every intervalMs; q or Ctrl-C quits.
export async function runSidecar({ base = dataDirectory(), output = process.stdout, input = process.stdin, width, intervalMs = 2000, env = process.env } = {}) {
  const tty = Boolean(output.isTTY), color = tty && !env.NO_COLOR;
  let previous = '', busy = false, again = false;
  const draw = async (force = false) => {
    if (busy) { again = true; return; }
    busy = true;
    try {
      let frame;
      try { frame = renderSidecar(await sidecarSnapshot({ base }), { width: width ?? output.columns ?? 80, color }); }
      catch (e) { frame = `Cannot read the work right now: ${e.message}`; }
      const rows = output.rows;
      if (rows && frame.split('\n').length > rows) frame = [...frame.split('\n').slice(0, rows - 1), '… more below: make the pane taller'].join('\n');
      if (force || frame !== previous) { previous = frame; output.write((tty ? '\x1b[H\x1b[2J' : '') + frame + '\n'); }
    } finally { busy = false; if (again) { again = false; draw(); } }
  };
  const watcher = new AbortController();
  let pending;
  (async () => {
    try { for await (const _ of watch(base, { recursive: true, signal: watcher.signal })) { clearTimeout(pending); pending = setTimeout(() => draw(), 150); } }
    catch {} // no data directory yet, or no recursive watch: the timer still redraws
  })();
  if (tty) output.write('\x1b[?1049h\x1b[?25l');
  const resize = () => draw(true);
  output.on?.('resize', resize);
  await draw(true);
  const timer = setInterval(() => draw(), intervalMs);
  await new Promise(resolve => {
    const stop = () => resolve();
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    if (input?.isTTY) {
      input.setRawMode(true); input.resume();
      input.on('data', key => { const k = key.toString(); if (k === 'q' || k === 'Q' || k === '\x03') stop(); });
    }
  });
  clearInterval(timer); clearTimeout(pending); watcher.abort();
  output.off?.('resize', resize);
  if (input?.isTTY) { input.setRawMode(false); input.pause(); }
  if (tty) output.write('\x1b[?25h\x1b[?1049l');
}
