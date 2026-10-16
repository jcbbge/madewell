import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { childEnvironment } from './child-environment.mjs';
import { buildPiArgs } from './pi-runtime.mjs';
import { summarizePi } from './pi-stream.mjs';

export const piBinary = () => process.env.PI_DURABLE_PI || 'pi';

// One pi process. Raw JSON events go to <record>.jsonl; onLine sees each parsed event.
export async function runPi({ cwd, args, prompt, record, env = {}, onLine, onSpawn, signal }) {
  if (typeof record !== 'string' || !isAbsolute(record)) throw new TypeError('Absolute record prefix required');
  await mkdir(dirname(record), { recursive: true });
  const out = createWriteStream(record + '.jsonl', { flags: 'a' }), err = createWriteStream(record + '.stderr', { flags: 'a' });
  const child = spawn(piBinary(), args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
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
  const summary = summarizePi(raw);
  return { ...result, summary, ok: result.code === 0 && summary.finalStopReason === 'stop' && summary.output.trim() !== '' };
}

// A bounded judgment call (intake, originator, arbiter): read the answer, keep the receipt.
export async function callPi({ cwd, prompt, system, model, step, record }) {
  const args = buildPiArgs({ step, system, model, sessionDir: record + '-session' });
  const result = await runPi({ cwd, args, prompt, record });
  await writeFile(record + '.result.json', JSON.stringify({ step, exitCode: result.code, signal: result.signal, ...result.summary }, null, 2));
  if (!result.ok) throw new Error(`pi ${step} call failed (${result.signal ?? `exit ${result.code}`}): ${result.summary.error || result.error || 'no answer'}; receipt ${record}.result.json`);
  return result.summary.output;
}
