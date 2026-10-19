import { spawn, execFile } from 'node:child_process';
import { mkdtemp, chmod, rm } from 'node:fs/promises';
import { createServer, createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const tmuxCommand = async args => (await exec('tmux', args, { timeout: 5000 })).stdout;
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const pending = () => Promise.withResolvers();
const failure = error => ({ code: -1, signal: null, error: error.message });

// -N forbids creating another server. A current socket wins over the default socket.
export async function findTmux(env = process.env, tmux = tmuxCommand) {
  if (env.PI_DURABLE_TMUX === 'off') return null;
  const prefix = ['-N', ...(env.TMUX ? ['-S', env.TMUX.split(',')[0]] : [])];
  try {
    const rows = (await tmux([...prefix, 'list-sessions', '-F', '#{session_id}\t#{session_name}\t#{socket_path}']))
      .trim().split('\n').filter(Boolean).map(line => line.split('\t'));
    let target = env.PI_DURABLE_TMUX_SESSION;
    if (!target && env.TMUX_PANE) {
      target = (await tmux([...prefix, 'display-message', '-p', '-t', env.TMUX_PANE, '#{session_id}'])).trim();
    }
    const row = target ? rows.find(([id, name]) => id === target || name === target) : rows[0];
    return row?.[0] && row[2] ? { prefix, session: row[0], server: row[2] } : null;
  } catch { return null; } // Missing executable and unreachable server are normal headless operation.
}

function frames(socket, receive) {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', chunk => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      try { receive(JSON.parse(line)); } catch (error) { socket.destroy(error); }
    }
  });
}
const send = (socket, message) => { if (!socket.destroyed) socket.write(JSON.stringify(message) + '\n'); };

// Both transports expose the actual harness PID and streams, never tmux's launcher PID/exit.
export async function launchWorker({ command, args, cwd, env, unit = 'work', job = 'worker', signal },
  { spawn: spawnProcess = spawn, tmux = tmuxCommand, startupMs = 10000 } = {}) {
  signal?.throwIfAborted();
  const target = await findTmux(env, tmux);
  signal?.throwIfAborted();
  if (!target) {
    const child = spawnProcess(command, args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const completion = new Promise(resolve => {
      child.on('error', error => resolve(failure(error)));
      child.on('close', (code, signal) => resolve({ code: code ?? -1, signal, error: '' }));
    });
    let escalation;
    return { ...Object.fromEntries(['pid', 'stdin', 'stdout', 'stderr'].map(key => [key, child[key]])),
      where: { transport: 'headless', pid: child.pid ?? null }, completion,
      stop: () => { killGroup(child.pid); escalation ??= setTimeout(() => killGroup(child.pid, 'SIGKILL'), 2000); escalation.unref?.(); },
      cleanup: async () => { if (escalation) killGroup(child.pid, 'SIGKILL'); clearTimeout(escalation); } };
  }

  // Only a private local control socket crosses tmux's command line. The packet, argv and
  // environment travel over it, never via tmux's global environment, titles or a disk packet.
  const directory = await mkdtemp(join(tmpdir(), 'mw-'));
  await chmod(directory, 0o700);
  const path = join(directory, 'control');
  const ready = pending(), connected = pending(), finished = pending();
  const stdout = new PassThrough(), stderr = new PassThrough();
  let socket, where, ended = false, timer, abort;
  const complete = result => {
    if (ended) return;
    ended = true; stdout.end(); stderr.end(); finished.resolve(result); ready.resolve(null);
  };
  const server = createServer(connection => {
    if (socket) { connection.destroy(); return; }
    socket = connection; connected.resolve();
    connection.on('error', error => complete(failure(error)));
    connection.on('close', () => complete(failure(new Error('Visible worker control disconnected'))));
    frames(connection, message => {
      if (message.type === 'spawn') ready.resolve(message.pid);
      if (message.type === 'stdout') stdout.write(Buffer.from(message.data, 'base64'));
      if (message.type === 'stderr') stderr.write(Buffer.from(message.data, 'base64'));
      if (message.type === 'exit') complete(message.result);
    });
    send(connection, { type: 'launch', command, args, cwd, env });
  });
  const cleanup = async () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    socket?.destroy();
    await new Promise(resolve => server.close(resolve));
    if (where?.window) await tmux([...target.prefix, 'kill-window', '-t', where.window]).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  };
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject); server.listen(path, resolve);
    });
    await chmod(path, 0o600);
    const wrapper = [process.execPath, fileURLToPath(import.meta.url), path].map(quote).join(' ');
    // Titles are identifiers supplied by the owner, never source text or prompts.
    const title = `mw-${unit}-${job}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    const ids = (await tmux([...target.prefix, 'new-window', '-d', '-P', '-F', '#{session_id}\t#{window_id}\t#{pane_id}',
      '-t', target.session + ':', '-n', title, wrapper])).trim().split('\t');
    where = { transport: 'tmux', server: target.server, session: ids[0], window: ids[1], pane: ids[2] };
    const timeout = pending();
    timer = setTimeout(() => timeout.reject(new Error('Visible worker did not connect')), startupMs);
    abort = () => timeout.reject(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    await Promise.race([connected.promise.then(() => ready.promise), timeout.promise]);
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    const pid = await ready.promise;
    where.pid = pid;
    const stdin = new Writable({ write(chunk, _encoding, done) { send(socket, { type: 'stdin', data: chunk.toString('base64') }); done(); },
      final(done) { send(socket, { type: 'end' }); done(); } });
    return { pid, where, stdin, stdout, stderr, completion: finished.promise,
      stop: () => send(socket, { type: 'stop' }), cleanup };
  } catch (error) { await cleanup(); throw error; }
}

function killGroup(pid, signal = 'SIGTERM') {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  try { process.kill(-pid, signal); } catch {}
}

// Render public work/tool messages, not hidden reasoning or terminal control sequences.
export function readableEvent(line) {
  let event;
  try { event = JSON.parse(line); } catch { return ''; }
  const message = event.message ?? event;
  const text = event.type === 'tool_execution_start' ? `Tool: ${event.toolName}`
    : event.type === 'item.completed' && event.item?.type === 'agent_message' ? event.item.text
    : ['item.started', 'item.completed'].includes(event.type) && event.item?.type === 'command_execution' ? 'Tool: command_execution'
    : (event.type === 'message_end' && message.role === 'assistant') || event.type === 'assistant'
      ? (Array.isArray(message.content) ? message.content : []).map(c => c.type === 'text' ? c.text : c.type === 'tool_use' ? `Tool: ${c.name}` : '').filter(Boolean).join('\n')
    : typeof event.result === 'string' ? event.result : '';
  return typeof text === 'string' ? text.replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, '') : '';
}

// The wrapper is the pane's foreground process; the worker runs here, not in a log viewer.
// Losing its owner or pane terminates the worker process group, including descendants.
export function runVisibleWorker(socket, { spawn: spawnProcess = spawn, render = text => process.stdout.write(text), kill = killGroup } = {}) {
  let child, stopping = false, escalation, buffered = '';
  const stop = () => {
    if (!child || stopping) return;
    stopping = true; kill(child.pid);
    escalation = setTimeout(() => kill(child.pid, 'SIGKILL'), 2000);
    escalation.unref?.();
  };
  socket.on('error', stop); socket.on('close', stop);
  frames(socket, message => {
    if (message.type === 'launch' && !child) {
      child = spawnProcess(message.command, message.args, { cwd: message.cwd, env: message.env,
        detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
      child.stdin.on('error', () => {});
      send(socket, { type: 'spawn', pid: child.pid ?? null });
      render('Made Well worker\n');
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        send(socket, { type: 'stdout', data: Buffer.from(chunk).toString('base64') });
        buffered += chunk;
        let end;
        while ((end = buffered.indexOf('\n')) !== -1) {
          const text = readableEvent(buffered.slice(0, end)); buffered = buffered.slice(end + 1);
          if (text) render(text + '\n');
        }
      });
      child.stderr.on('data', chunk => send(socket, { type: 'stderr', data: chunk.toString('base64') }));
      let error = '';
      child.on('error', e => { error = e.message; });
      child.on('close', (code, signal) => {
        clearTimeout(escalation);
        // The worker has exited; any remaining group members are orphaned descendants.
        kill(child.pid, 'SIGKILL');
        const tail = readableEvent(buffered);
        if (tail) render(tail + '\n');
        send(socket, { type: 'exit', result: { code: code ?? -1, signal, error } });
        render(`Worker ended: ${signal ?? code ?? error}\n`);
        socket.end();
      });
    } else if (message.type === 'stdin') child?.stdin.write(Buffer.from(message.data, 'base64'));
    else if (message.type === 'end') child?.stdin.end();
    else if (message.type === 'stop') stop();
  });
  return stop;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const socket = createConnection(process.argv[2]);
  const stop = runVisibleWorker(socket);
  for (const event of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(event, () => { stop(); socket.destroy(); });
}
