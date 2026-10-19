import { readFile, watch } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './config.mjs';
import { snapshot } from './serve.mjs';
import { runView, terminalLines, clock, span, ruleSet, stageMinutes, operatorWait, usage, checks } from './view.mjs';
import { renderSidecar as terminalBoard } from './demo-board.mjs';
import { machineSample } from './machine.mjs';
import { delegatedTelemetry } from './delegated-telemetry.mjs';

// The terminal sidecar: one plain program for a pane in any multiplexer. Read-only, like the dashboard:
// it reads the view files through serve.mjs's snapshot and the accounts files, never a store or its lock.
// The board and plain view share view.mjs's state derivation; live hints are disposable observations.
export { clock, span };

const PAINT = { h: ['\x1b[1m', '\x1b[0m'], bad: ['\x1b[31m', '\x1b[0m'] };

// One frame. Pure: the same snapshot, width and time give the same text.
export function renderPlainSidecar(snap, { width = 80, now = snap?.at ?? Date.now(), color = false } = {}) {
  const lines = terminalLines(runView(snap, { at: now }), { width });
  return lines.map(l => color && PAINT[l.cls] ? `${PAINT[l.cls][0]}${l.text}${PAINT[l.cls][1]}` : l.text).join('\n');
}

// Preserve the operator's terminal board, fed by the same state derivation as replay and the page.
export function renderBoard(snap, { width = 80, height, now = snap?.at ?? Date.now(), color = false, narration = null, selected = null, detail = false } = {}) {
  const v = runView(snap, { at: now });
  const stores = (snap?.stores ?? []).map(store => ({ ...store, threads: v.units.filter(u => u.storeDir === store.dir).map(u => {
    const s = u.s;
    return { ...u.w, state: s.state, done: s.done, hold: s.hold, waitsOn: s.waitsOn,
      current: { name: s.call?.step ?? s.step }, attempt: s.attempt ? { id: s.attempt.id } : null,
      exchange: s.exchange ? { ...s.exchange, rounds: s.answered } : null, lastEvent: s.lastEvent,
      _board: { state: s, rules: ruleSet(u, now), times: stageMinutes(u.w, now),
        wait: operatorWait(u.w, now), use: usage(u, now), checks: checks(u, now) } };
  }) }));
  return terminalBoard({ ...snap, at: now, stores }, { width, height, now, color, narration, selected, detail });
}
export const renderSidecar = renderBoard;

// Paging belongs only to a selected record's expanded evidence, never the overview.
export function sidecarPage(frame, { rows, width = 80, offset = 0 } = {}) {
  const lines = frame.split('\n');
  if (!Number.isSafeInteger(rows) || rows < 2 || lines.length <= rows) return { text: frame, offset: 0, max: 0 };
  const height = rows - 1, max = Math.max(0, lines.length - height);
  offset = Math.min(max, Math.max(0, offset));
  const footer = `Lines ${offset + 1}-${Math.min(lines.length, offset + height)}/${lines.length} · j/k ↑/↓ PgUp/PgDn Home/End · q quits`;
  return { text: [...lines.slice(offset, offset + height), footer.slice(0, width)].join('\n'), offset, max };
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

export async function sidecarSnapshot({ base = dataDirectory(), now = Date.now(), workspace = null, telemetry = delegatedTelemetry } = {}) {
  const snap = await snapshot({ base, now, workspace });
  await Promise.all(snap.stores.flatMap(s => s.threads.filter(w => w.kind === 'delegated').map(async w => {
    w.telemetry = await telemetry(w, { now });
  })));
  return { ...snap, accounts: await readAccounts(base, snap.stores.map(s => s.dir)), machine: await machineSample().catch(() => null) };
}

// The live loop: clear-screen redraw on change, on resize, or every intervalMs; q or Ctrl-C quits.
export async function runSidecar({ base = dataDirectory(), output = process.stdout, input = process.stdin, width, height, intervalMs = 2000, env = process.env, workspace = null, signal } = {}) {
  const tty = Boolean(output.isTTY), color = tty && !env.NO_COLOR, watcher = new AbortController();
  let previous = '', busy = false, again = false, ended = false, offset = 0, max = 0, pending;
  let records = [], selectedIndex = -1, expanded = false;
  const draw = async (force = false) => {
    if (ended) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      const columns = width ?? output.columns ?? 80;
      let frame;
      try {
        const snap = await sidecarSnapshot({ base, workspace });
        const old = records[selectedIndex];
        records = snap.stores.flatMap(store => store.threads.map(w => ({ storeDir: store.dir, threadId: w.threadId })));
        if (old) selectedIndex = records.findIndex(r => r.storeDir === old.storeDir && r.threadId === old.threadId);
        if (selectedIndex < 0) expanded = false;
        frame = renderSidecar(snap, { width: columns, height: height ?? output.rows ?? 53, color, selected: records[selectedIndex], detail: expanded });
      } catch (e) { frame = `Cannot read the work right now: ${e.message}`; }
      if (ended) return;
      const page = expanded ? sidecarPage(frame, { rows: height ?? output.rows ?? 53, width: columns, offset }) : { text: frame, offset: 0, max: 0 };
      offset = page.offset; max = page.max;
      if (force || page.text !== previous) { previous = page.text; output.write((tty ? '\x1b[H\x1b[2J' : '') + page.text + '\n'); }
    } finally { busy = false; if (again && !ended) { again = false; draw(); } }
  };
  (async () => {
    try { for await (const _ of watch(base, { recursive: true, signal: watcher.signal })) { clearTimeout(pending); pending = setTimeout(() => draw(), 150); } }
    catch {} // no directory or recursive watch: the interval still redraws
  })();
  let stop;
  const done = new Promise(resolve => { stop = resolve; });
  const key = bytes => {
    const value = bytes.toString(), page = Math.max(1, (output.rows ?? 24) - 2);
    if (['q', 'Q', '\x03'].includes(value)) return stop();
    if (['\r', '\n'].includes(value) && records.length) {
      if (selectedIndex < 0) selectedIndex = 0;
      expanded = !expanded; offset = 0;
    } else if (value === '\x1b') { expanded = false; offset = 0; }
    else if (!expanded && ['j', 'k', '\x1b[B', '\x1b[A'].includes(value) && records.length) {
      const down = ['j', '\x1b[B'].includes(value);
      selectedIndex = selectedIndex < 0 ? down ? 0 : records.length - 1 : (selectedIndex + (down ? 1 : -1) + records.length) % records.length;
    }
    else if (['j', '\x1b[B'].includes(value)) offset++;
    else if (['k', '\x1b[A'].includes(value)) offset--;
    else if ([' ', '\x1b[6~'].includes(value)) offset += page;
    else if (value === '\x1b[5~') offset -= page;
    else if (['g', '\x1b[H', '\x1b[1~'].includes(value)) offset = 0;
    else if (['G', '\x1b[F', '\x1b[4~'].includes(value)) offset = max;
    else return;
    draw(true);
  };
  const resize = () => draw(true), raw = input?.isRaw ?? false;
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  signal?.addEventListener('abort', stop, { once: true });
  output.on?.('resize', resize);
  if (tty) output.write('\x1b[?1049h\x1b[?25l');
  if (input?.isTTY) { input.setRawMode(true); input.resume(); input.on('data', key); }
  const timer = setInterval(() => draw(), intervalMs);
  try { await draw(true); if (signal?.aborted) stop(); await done; }
  finally {
    ended = true; clearInterval(timer); clearTimeout(pending); watcher.abort();
    output.off?.('resize', resize);
    process.off('SIGINT', stop); process.off('SIGTERM', stop); signal?.removeEventListener('abort', stop);
    if (input?.isTTY) { input.off('data', key); input.setRawMode(raw); input.pause(); }
    if (tty) output.write('\x1b[?25h\x1b[?1049l');
  }
}
