import { watch } from 'node:fs';
import { appendFile, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function progressEvent(value, attemptId) {
  if (value?.attemptId !== attemptId || typeof value.deliverable !== 'string' || !value.deliverable.trim()
    || typeof value.evidence !== 'string' || !value.evidence.trim()) return null;
  // The core already consumes this event and commits it on the same work record.
  return { type: 'tool_execution_end', toolName: 'durable_progress', isError: false,
    result: { details: { durableProgress: value } } };
}

// Disposable transport only. The existing onLine callback owns durable progress; this
// channel never opens SQLite or grants execution/acceptance. Works with any harness
// that can run a command; read-only harnesses need their native adapter instead.
export async function openWorkerChannel({ record, attemptId, onLine, nestedDispatch, onHold }) {
  if (!attemptId || (!onLine && !nestedDispatch)) return null;
  const directory = await mkdtemp(join(dirname(record), '.worker-channel-'));
  const path = join(directory, 'progress.jsonl');
  await writeFile(path, '', { mode: 0o600 });
  let consumed = 0, queue = Promise.resolve();
  const drain = () => (queue = queue.then(async () => {
    const text = await readFile(path, 'utf8');
    let end;
    while ((end = text.indexOf('\n', consumed)) !== -1) {
      const line = text.slice(consumed, end); consumed = end + 1;
      let value;
      try { value = JSON.parse(line); } catch { continue; }
      if (value?.kind === 'nested' && nestedDispatch && typeof value.request?.requestId === 'string' && typeof value.responseId === 'string') {
        let response;
        try { response = { result: await nestedDispatch(value.request) }; }
        catch (error) { response = { error: error.message }; }
        const resultPath = nestedResponsePath(path, value.responseId);
        await writeFile(resultPath + '.tmp', JSON.stringify(response), { mode: 0o600 });
        await rename(resultPath + '.tmp', resultPath);
        if (response.result?.status === 'held') onHold?.(response.result);
      } else {
        const entry = progressEvent(value, attemptId);
        if (entry) await onLine?.(entry);
      }
    }
  }));
  const watcher = watch(path, () => { void drain().catch(() => {}); });
  watcher.on('error', () => {});
  return { env: { PI_DURABLE_PROGRESS: path, PI_DURABLE_CHANNEL: fileURLToPath(import.meta.url), PI_DURABLE_NODE: process.execPath,
    ...(nestedDispatch ? { PI_DURABLE_NESTED: '1' } : {}) }, drain,
    async close() { watcher.close(); try { await drain(); } finally { await rm(directory, { recursive: true, force: true }); } } };
}

export async function reportProgress(deliverable, evidence, env = process.env) {
  const value = { attemptId: env.PI_DURABLE_ATTEMPT, deliverable, evidence };
  if (!env.PI_DURABLE_ATTEMPT || !env.PI_DURABLE_PROGRESS || !progressEvent(value, env.PI_DURABLE_ATTEMPT)) throw new Error('A worker progress channel, deliverable and evidence are required');
  await appendFile(env.PI_DURABLE_PROGRESS, JSON.stringify(value) + '\n');
}

// A cooperative channel for print/exec harnesses, not an unverified native steering
// API. The worker polls check-in at deliverable boundaries; pi still gets live steer.
export async function readCheckIn(env = process.env) {
  if (!env.PI_DURABLE_CHECKIN || !env.PI_DURABLE_ATTEMPT) return null;
  let question;
  try { question = JSON.parse(await readFile(env.PI_DURABLE_CHECKIN, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return question.attemptId === env.PI_DURABLE_ATTEMPT ? question : null;
}

const nestedResponsePath = (path, requestId) => join(dirname(path), 'nested-' + createHash('sha256').update(requestId).digest('hex') + '.json');

export async function requestNested(request, env = process.env, signal) {
  if (env.PI_DURABLE_NESTED !== '1' || !env.PI_DURABLE_PROGRESS || typeof request?.requestId !== 'string' || !request.requestId.trim()) {
    throw new Error('Sanctioned nested delegation needs an owner-bound channel and stable requestId');
  }
  signal?.throwIfAborted();
  // A transport nonce prevents a previous response file bypassing core's content
  // check on retry. The durable requestId itself never changes.
  const responseId = randomUUID();
  await appendFile(env.PI_DURABLE_PROGRESS, JSON.stringify({ kind: 'nested', request, responseId }) + '\n');
  const path = nestedResponsePath(env.PI_DURABLE_PROGRESS, responseId);
  for (;;) {
    signal?.throwIfAborted();
    try {
      const response = JSON.parse(await readFile(path, 'utf8'));
      if (response.error) throw new Error(response.error);
      return response.result;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await delay(100, undefined, { signal });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'progress') await reportProgress(process.argv[3], process.argv[4]);
    else if (process.argv[2] === 'check-in') console.log(JSON.stringify(await readCheckIn()));
    else if (process.argv[2] === 'dispatch') console.log(JSON.stringify(await requestNested(JSON.parse(await readFile(process.argv[3], 'utf8')))));
    else throw new Error('Use progress <deliverable> <evidence>, check-in, or dispatch <request.json>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
