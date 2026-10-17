import { readFile, watch } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDirectory } from './config.mjs';
import { snapshot } from './serve.mjs';
import { runView, terminalLines, clock, span } from './view.mjs';

// The terminal sidecar: one plain program for a pane in any multiplexer. Read-only, like the dashboard:
// it reads the view files through serve.mjs's snapshot and the accounts files, never a store or its lock.
// The frame is view.mjs's terminalLines, the same text the run view shows in the browser.
export { clock, span };

const PAINT = { h: ['\x1b[1m', '\x1b[0m'], bad: ['\x1b[31m', '\x1b[0m'] };

// One frame. Pure: the same snapshot, width and time give the same text.
export function renderSidecar(snap, { width = 80, now = snap?.at ?? Date.now(), color = false } = {}) {
  const lines = terminalLines(runView(snap, { at: now }), { width });
  return lines.map(l => color && PAINT[l.cls] ? `${PAINT[l.cls][0]}${l.text}${PAINT[l.cls][1]}` : l.text).join('\n');
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

export async function sidecarSnapshot({ base = dataDirectory(), now = Date.now(), workspace = null } = {}) {
  const snap = await snapshot({ base, now, workspace });
  return { ...snap, accounts: await readAccounts(base, snap.stores.map(s => s.dir)) };
}

// The live loop: clear-screen redraw on change, on resize, or every intervalMs; q or Ctrl-C quits.
export async function runSidecar({ base = dataDirectory(), output = process.stdout, input = process.stdin, width, intervalMs = 2000, env = process.env, workspace = null } = {}) {
  const tty = Boolean(output.isTTY), color = tty && !env.NO_COLOR;
  let previous = '', busy = false, again = false;
  const draw = async (force = false) => {
    if (busy) { again = true; return; }
    busy = true;
    try {
      let frame;
      try { frame = renderSidecar(await sidecarSnapshot({ base, workspace }), { width: width ?? output.columns ?? 80, color }); }
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
