import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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

// Read-only, disposable observations, never lifecycle transitions or completion evidence.
export async function delegatedTelemetry(w, { exec = run } = {}) {
  if (w.state === 'dead' || w.delegationState === 'dead') return { tmux: { state: 'dead', reason: 'worker death recorded' } };
  const target = w.where?.tmux;
  if (typeof target !== 'string' || !target || w.done) return {};
  try {
    const format = '#{session_name}\t#{window_name}\t#{window_index}\t#{window_id}\t#{pane_index}\t#{pane_id}\t#{pane_dead}\t#{pane_current_command}\t#{pane_tty}';
    const listing = await exec('tmux', ['list-panes', '-a', '-F', format]);
    const panes = listing.trimEnd().split('\n').filter(Boolean).map(line => {
      const [session, name, index, window, paneIndex, pane, dead, command, tty] = line.split('\t');
      if (!/^%\d+$/.test(pane ?? '') || !['0', '1'].includes(dead)) throw new Error('Invalid pane observation');
      return { session, name, index, window, paneIndex, pane, dead, command, tty };
    }).filter(p => matches(target, p));
    if (!panes.length) return { tmux: { state: 'dead', reason: 'recorded tmux target is gone' } };
    const observations = await Promise.all(panes.map(async p => {
      if (p.dead === '1') return { pane: p.pane, state: 'dead', reason: 'pane exited' };
      try {
        // ps reads /proc on Linux; it also works on macOS. No process arguments
        // or arbitrary pane content are retained, logged, or displayed.
        const groups = await exec('ps', ['-t', p.tty, '-o', 'pgid=,tpgid=,comm=']);
        const names = groups.split('\n').map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/))
          .filter(m => m && m[1] === m[2]).map(m => m[3].split('/').at(-1));
        const harness = w.worker?.harness;
        const expected = harness === 'claude-code' ? 'claude' : harness;
        const agent = expected && names.find(name => name === expected);
        return { pane: p.pane, state: agent ? 'running' : names.length ? 'stale' : 'unknown',
          command: agent ?? p.command, reason: agent ? null : 'no foreground agent process observed' };
      } catch { return { pane: p.pane, state: 'unknown', reason: 'process observation unavailable' }; }
    }));
    return { tmux: observations.find(p => p.state === 'running') ?? observations.find(p => p.state === 'unknown') ?? observations[0] };
  } catch { return { tmux: { state: 'unknown', unavailable: true } }; }
}
