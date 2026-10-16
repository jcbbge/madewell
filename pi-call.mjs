import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { childEnvironment } from './child-environment.mjs';
import { summarizePi } from './pi-stream.mjs';
import { buildLaunch, parseRun } from './cards.mjs';

// One harness process. Raw JSON events go to <record>.jsonl; onLine sees each parsed event.
async function runProcess({ command, cwd, args, prompt, record, env = {}, onLine, onSpawn, signal }) {
  if (typeof record !== 'string' || !isAbsolute(record)) throw new TypeError('Absolute record prefix required');
  await mkdir(dirname(record), { recursive: true });
  const out = createWriteStream(record + '.jsonl', { flags: 'a' }), err = createWriteStream(record + '.stderr', { flags: 'a' });
  const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
    env: childEnvironment(process.env, { PI_DURABLE_WORKER: '1', ...env }) });
  const stop = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch {} };
  signal?.addEventListener('abort', stop, { once: true });
  let raw = '', buffered = '';
  child.stdout.on('data', chunk => {
    out.write(chunk); raw += chunk; buffered += chunk;
    let newline;
    while ((newline = buffered.indexOf('\n')) !== -1) {
      const line = buffered.slice(0, newline); buffered = buffered.slice(newline + 1);
      if (onLine) { try { onLine(JSON.parse(line)); } catch {} }
    }
  });
  child.stderr.on('data', chunk => err.write(chunk));
  const exited = new Promise(resolve => {
    child.on('error', error => resolve({ code: -1, signal: null, error: error.message }));
    child.on('close', (code, sig) => resolve({ code: code ?? -1, signal: sig, error: '' }));
  });
  await onSpawn?.(child.pid);
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const result = await exited;
  signal?.removeEventListener('abort', stop);
  await Promise.all([out, err].map(s => new Promise(r => s.end(r))));
  return { ...result, raw };
}

// One run of a card (harness + provider + model). A usage limit comes back as `limit`, never as success.
export async function runCard({ card, launch, ...options }) {
  const result = await runProcess({ ...options, command: launch.command, args: launch.args, env: { ...launch.env, ...options.env } });
  const run = parseRun(card.harness, result.raw, { account: card.account });
  const pi = card.harness === 'pi' ? summarizePi(result.raw) : null;
  return { code: result.code, signal: result.signal, error: result.error || pi?.error || '', toolCalls: pi?.toolCalls ?? null, ...run,
    ok: run.ok && result.code === 0 && !result.signal };
}

// A bounded judgment call (intake, originator, arbiter) on one card: read the answer, keep the receipt.
// Returns { output } or { limit }; any other failure throws.
export async function callCard({ cwd, prompt, system, card, access, record, readDirs = [] }) {
  const launch = buildLaunch(card, { access, system, sessionDir: record + '-session', readDirs });
  const result = await runCard({ card, launch, cwd, prompt, record });
  await writeFile(record + '.result.json', JSON.stringify({ card, access, exitCode: result.code, signal: result.signal,
    ok: result.ok, output: result.output, sessionId: result.sessionId, limit: result.limit }, null, 2));
  if (result.limit) return { limit: result.limit };
  if (!result.ok) throw new Error(`${card.harness} ${card.model} call failed (${result.signal ?? `exit ${result.code}`}): ${result.error || 'no answer'}; receipt ${record}.result.json`);
  return { output: result.output };
}
