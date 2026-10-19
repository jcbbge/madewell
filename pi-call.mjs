import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { finished } from 'node:stream/promises';
import { childEnvironment } from './child-environment.mjs';
import { summarizePi } from './pi-stream.mjs';
import { buildLaunch, parseRun } from './cards.mjs';
import { launchWorker } from './worker-transport.mjs';
import { openWorkerChannel } from './worker-channel.mjs';

// One harness process. Raw JSON events go to <record>.jsonl; onLine sees each parsed event.
async function runProcess({ command, cwd, args, prompt, record, env = {}, onLine, onSpawn, onLocation, signal,
  unit, job, transport, nestedDispatch }) {
  if (typeof record !== 'string' || !isAbsolute(record)) throw new TypeError('Absolute record prefix required');
  signal?.throwIfAborted();
  await mkdir(dirname(record), { recursive: true });
  const out = createWriteStream(record + '.jsonl', { flags: 'a' }), err = createWriteStream(record + '.stderr', { flags: 'a' });
  let worker, channel, stop, completed = false, raw = '', buffered = '';
  try {
    channel = await openWorkerChannel({ record, attemptId: env.PI_DURABLE_ATTEMPT, onLine, nestedDispatch,
      onHold: () => worker?.stop() });
    worker = await launchWorker({ command, args, cwd, unit, job, signal,
      env: childEnvironment(process.env, { PI_DURABLE_WORKER: '1', ...env, ...channel?.env }) }, transport);
    stop = worker.stop;
    signal?.addEventListener('abort', stop, { once: true });
    worker.stdout.setEncoding('utf8');
    worker.stdout.on('data', chunk => {
      out.write(chunk); raw += chunk; buffered += chunk;
      let newline;
      while ((newline = buffered.indexOf('\n')) !== -1) {
        const line = buffered.slice(0, newline); buffered = buffered.slice(newline + 1);
        if (onLine) { try { onLine(JSON.parse(line)); } catch {} }
      }
    });
    worker.stderr.on('data', chunk => err.write(chunk));
    await onLocation?.(worker.where);
    if (Number.isSafeInteger(worker.pid)) await onSpawn?.(worker.pid, worker.where);
    worker.stdin.on('error', () => {});
    if (signal?.aborted) stop();
    else worker.stdin.end(prompt);
    const result = await worker.completion;
    await Promise.all([worker.stdout, worker.stderr].map(stream => finished(stream, { writable: false })));
    completed = true;
    return { ...result, raw, where: worker.where };
  } finally {
    signal?.removeEventListener('abort', stop);
    try {
      if (worker) {
        if (!completed) { worker.stop(); await worker.completion; }
        await worker.cleanup();
      }
    } finally {
      try { await channel?.close(); }
      finally { await Promise.all([out, err].map(s => new Promise(r => s.end(r)))); }
    }
  }
}

// One run of a card (harness + provider + model). A usage limit comes back as `limit`, never as success.
export async function runCard({ card, launch, ...options }) {
  const result = await runProcess({ ...options, command: launch.command, args: launch.args, env: { ...launch.env, ...options.env } });
  const run = parseRun(card.harness, result.raw, { account: card.account });
  const pi = card.harness === 'pi' ? summarizePi(result.raw) : null;
  return { code: result.code, signal: result.signal, where: result.where, error: result.error || pi?.error || '', toolCalls: pi?.toolCalls ?? null, ...run,
    ok: run.ok && result.code === 0 && !result.signal };
}

// A bounded judgment call (intake, originator, arbiter) on one card: read the answer, keep the receipt.
// Returns { output } or { limit }; any other failure throws.
export async function callCard({ cwd, prompt, system, card, access, record, readDirs = [],
  sessionId, sessionDir = record + '-session', resume, ...options }) {
  const launch = buildLaunch(card, { access, system, sessionDir, sessionId, resume, readDirs });
  const result = await runCard({ ...options, card, launch, cwd, prompt, record });
  await writeFile(record + '.result.json', JSON.stringify({ card, access, exitCode: result.code, signal: result.signal,
    ok: result.ok, output: result.output, sessionId: result.sessionId, limit: result.limit, where: result.where }, null, 2));
  if (result.limit) return { ...result, limit: result.limit };
  if (!result.ok) throw new Error(`${card.harness} ${card.model} call failed (${result.signal ?? `exit ${result.code}`}): ${result.error || 'no answer'}; receipt ${record}.result.json`);
  return result;
}
