import { spawn } from 'node:child_process';
// The one place a hold reaches the human outside the record: PI_DURABLE_ALERT = desktop (default) | none | a shell command.
// A command receives the payload as JSON on stdin. Delivery is never awaited: a slow channel cannot hold up any work item.
const KILL_AFTER_MS = 10_000;

const detach = (command, args, input, env) => {
  const child = spawn(command, args, { detached: true, stdio: [input === undefined ? 'ignore' : 'pipe', 'ignore', 'ignore'], env });
  child.on('error', () => {});
  if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
  const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} } }, KILL_AFTER_MS);
  timer.unref();
  child.on('exit', () => clearTimeout(timer));
  child.unref();
};

export async function sendAlert(payload, env = process.env) {
  const channel = (env.PI_DURABLE_ALERT ?? 'desktop').trim() || 'desktop';
  if (channel === 'none') return { channel: 'none', ok: true };
  try {
    if (channel !== 'desktop') { detach('/bin/sh', ['-c', channel], JSON.stringify(payload), env); return { channel: 'command', ok: true }; }
    const message = `#${payload.threadId} holds: ${payload.hold?.reason ?? ''}`.slice(0, 200);
    if (process.platform === 'darwin') {
      detach('osascript', ['-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title "Made Well"', '-e', 'end run', message], undefined, env);
      return { channel: 'desktop', ok: true };
    }
    if (process.platform === 'linux' && (env.DISPLAY || env.WAYLAND_DISPLAY)) {
      detach('notify-send', ['Made Well', message], undefined, env);
      return { channel: 'desktop', ok: true };
    }
    process.stderr.write(`\x07Made Well: ${message}\n`);
    return { channel: 'terminal', ok: true };
  } catch { return { channel: channel === 'desktop' ? 'desktop' : 'command', ok: false }; }
}
