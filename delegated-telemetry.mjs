import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const execute = promisify(execFile);
const run = async (file, args) => (await execute(file, args, { timeout: 1500, maxBuffer: 256 * 1024, encoding: 'utf8' })).stdout;

// tmux target lookup is deliberately exact. display-message -t can silently fall back
// to the active window when the recorded window no longer exists.
function matches(target, p) {
  if (target.startsWith('%')) return target === p.pane;
  if (target.startsWith('@')) return target === p.window;
  const [session, location] = target.includes(':') ? target.split(':') : [null, target];
  if (session !== null && session !== p.session) return false;
  if (location === p.name || location === p.index) return true;
  const dot = location.lastIndexOf('.');
  return dot > 0 && [p.name, p.index].includes(location.slice(0, dot)) && location.slice(dot + 1) === p.paneIndex;
}

const pathAt = (path, cwd) => resolve(cwd ?? process.cwd(), path.startsWith('~/') ? resolve(homedir(), path.slice(2)) : path);

// Only recognize the numeric pi footer, never retain or display arbitrary pane content.
// Source: pi's interactive/components/footer.js (input/output/cache totals and context percent/window).
export function paneUsage(capture) {
  for (const line of capture.replace(/\x1b\[[0-9;]*m/g, '').split('\n').reverse()) {
    if (!/^\s*(?:[↑↓RW]\d|\$\d|(?:\d+(?:\.\d+)?%|\?)\/)/.test(line)) continue;
    const context = line.match(/(?:\d+(?:\.\d+)?%|\?)\/\d+(?:\.\d+)?[kM]?\b/);
    if (!context) continue;
    const tokens = line.match(/(?:↑|↓|\bR|\bW)\d+(?:\.\d+)?[kM]?\b/g) ?? [];
    const cost = line.match(/\$\d+(?:\.\d+)?(?: \(sub\))?/);
    return { context: context[0], tokens: tokens.length ? tokens.join(' ') : null, cost: cost?.[0] ?? null };
  }
  return null;
}

export function changedFiles(porcelain) {
  const entries = porcelain.split('\0');
  let count = 0;
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i]) continue;
    count++;
    if (/[RC]/.test(entries[i].slice(0, 2))) i++;
  }
  return count;
}

export function stepLedger(text) {
  let section = ''; const now = [];
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) section = heading[1].toUpperCase();
    if (section === 'NOW' && /^\s*- \[ \]/.test(line)) now.push(line.replace(/^\s*- \[ \]\s*/, ''));
  }
  // Removed tasks are not proof of completion. Count only checked entries still present.
  return { now, done: (text.match(/^\s*- \[[xX]\]/gm) ?? []).length };
}

// Read-only, disposable observations, never lifecycle transitions or completion evidence.
async function tmuxTelemetry(w, { exec, now }) {
  if (w.state === 'dead' || w.delegationState === 'dead') return { tmux: { state: 'dead', reason: 'worker death recorded' } };
  const target = w.where?.tmux;
  if (typeof target !== 'string' || !target || w.done) return {};
  try {
    const format = '#{session_name}\t#{window_name}\t#{window_index}\t#{window_id}\t#{pane_index}\t#{pane_id}\t#{pane_dead}\t#{pane_current_command}\t#{pane_tty}\t#{pane_activity}\t#{window_activity}\t#{window_panes}';
    const listing = await exec('tmux', ['list-panes', '-a', '-F', format]);
    const panes = listing.trimEnd().split('\n').filter(Boolean).map(line => {
      const [session, name, index, window, paneIndex, pane, dead, command, tty, activity, windowActivity, paneCount] = line.split('\t');
      if (!/^%\d+$/.test(pane ?? '') || !['0', '1'].includes(dead)) throw new Error('Invalid pane observation');
      const output = Number(activity) > 0 ? activity : Number(paneCount) === 1 ? windowActivity : null;
      const outputAt = Number(output) > 0 && Number(output) * 1000 <= now ? Number(output) * 1000 : null;
      return { session, name, index, window, paneIndex, pane, dead, command, tty, outputAt,
        outputScope: Number(activity) > 0 ? 'pane output' : Number(paneCount) === 1 ? 'output (single-pane window)' : 'pane output unavailable' };
    }).filter(p => matches(target, p));
    if (!panes.length) return { tmux: { state: 'dead', reason: 'recorded tmux target is gone' } };
    const observations = await Promise.all(panes.map(async p => {
      const observed = { pane: p.pane, outputAt: p.outputAt, outputScope: p.outputScope };
      if (p.dead === '1') return { ...observed, state: 'dead', reason: 'pane exited' };
      try {
        // ps reads /proc on Linux; it also works on macOS. No process arguments
        // or arbitrary pane content are retained, logged, or displayed.
        const groups = await exec('ps', ['-t', p.tty, '-o', 'pgid=,tpgid=,comm=']);
        const names = groups.split('\n').map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/))
          .filter(m => m && m[1] === m[2]).map(m => m[3].split('/').at(-1));
        const harness = w.worker?.harness;
        const expected = harness === 'claude-code' ? 'claude' : harness;
        const agent = expected && names.find(name => name === expected);
        return { ...observed, state: agent ? 'running' : names.length ? 'stale' : 'unknown',
          command: agent ?? p.command, reason: agent ? null : 'no foreground agent process observed' };
      } catch { return { ...observed, state: 'unknown', reason: 'process observation unavailable' }; }
    }));
    return { tmux: observations.find(p => p.state === 'running') ?? observations.find(p => p.state === 'unknown') ?? observations[0] };
  } catch { return { tmux: { state: 'unknown', unavailable: true } }; }
}

export async function delegatedTelemetry(w, { exec = run, read = readFile, now = Date.now() } = {}) {
  const out = await tmuxTelemetry(w, { exec, now });
  if (w.done || w.state === 'dead' || w.delegationState === 'dead') return out;
  await Promise.all([
    (async () => {
      const steps = w.where?.steps ?? (w.workspace ? 'TASKS.md' : null);
      if (typeof steps !== 'string' || !steps) return;
      try { out.steps = stepLedger(await read(pathAt(steps, w.workspace), 'utf8')); }
      catch { out.steps = { unavailable: true }; }
    })(),
    (async () => {
      if (out.tmux?.state !== 'running' || w.worker?.harness !== 'pi') return;
      try { out.usage = paneUsage(await exec('tmux', ['capture-pane', '-p', '-t', out.tmux.pane, '-S', '-15'])); } catch {}
    })(),
    (async () => {
      const repo = w.where?.repo ?? w.workspace;
      if (typeof repo !== 'string' || !repo) return;
      try {
        const [log, status] = await Promise.all([
          exec('git', ['--no-optional-locks', '-C', pathAt(repo, w.workspace), 'log', '-1', '--no-show-signature', '--format=%h%x00%ct%x00%s']),
          exec('git', ['--no-optional-locks', '-C', pathAt(repo, w.workspace), 'status', '--porcelain=v1', '--untracked-files=all', '-z'])
        ]);
        const [hash, timestamp, subject] = log.trimEnd().split('\0');
        if (!/^[0-9a-f]+$/.test(hash) || !(Number(timestamp) > 0)) throw new Error('Invalid commit observation');
        out.repo = { hash, at: Number(timestamp) * 1000, subject, changed: changedFiles(status) };
      } catch { out.repo = { unavailable: true }; }
    })()
  ]);
  return out;
}
