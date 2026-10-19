import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openStore } from './work.mjs';
import { drive as driveThread } from './drive.mjs';

// The runner: one per store. Discoveries run as they arrive; delivery items run one at a time, in queue
// order. The order is read again before every item, so `first` changes what runs next, never what runs now.
// Requests (start, answer, first) made while the runner owns the store wait in requests/ and are applied
// between steps.

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms)); // ref'd: a waiting runner must stay alive
const owned = error => /^Store is owned by live process/.test(error?.message ?? '');
const alive = pid => { if (!Number.isSafeInteger(pid)) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

export async function applyRequest(store, request) {
  if (request.type === 'create') return { id: await store.create(request.objective, request.source, request.cwd, { kind: request.kind ?? 'discovery' }) };
  if (request.type === 'first') return { first: await store.first(request.id) };
  if (request.type === 'answer') return { answered: await store.human(request.id, { actor: request.actor ?? 'operator', text: request.text, cause: request.cause ?? null }) };
  throw new Error(`Unknown request ${request.type}`);
}

// Apply now when no one owns the store; otherwise leave it for the runner.
export async function submit(directory, request, { accountsFile = null } = {}) {
  let store;
  try { store = await openStore(directory, { accountsFile }); }
  catch (error) {
    if (!owned(error)) throw error;
    const folder = join(directory, 'requests'), name = `${Date.now()}-${randomUUID()}.json`;
    await mkdir(folder, { recursive: true, mode: 0o700 });
    await writeFile(join(folder, `${name}.tmp`), JSON.stringify(request), { mode: 0o600 });
    await rename(join(folder, `${name}.tmp`), join(folder, name));
    return { queued: true, request: name };
  }
  try { return { queued: false, ...await applyRequest(store, request) }; } finally { await store.close(); }
}

async function takeRequests(directory) {
  const folder = join(directory, 'requests');
  const names = (await readdir(folder).catch(() => [])).filter(n => n.endsWith('.json')).sort();
  const out = [];
  for (const name of names) {
    try { out.push(JSON.parse(await readFile(join(folder, name), 'utf8'))); } catch {}
    await unlink(join(folder, name)).catch(() => {});
  }
  return out;
}

export async function runnerAlive(directory) {
  try { return alive(JSON.parse(await readFile(join(directory, 'runner.json'), 'utf8')).pid); } catch { return false; }
}

// Settled outcomes: a thread that ends any other way (held, failing) is not picked again until something
// changes it, such as an answer. Out of quota is not an end: every account out means waiting for the first
// reset, then carrying on.
const SETTLED = new Set(['discovered', 'complete']);
const NO_RESET_MS = 60 * 60_000;

export async function runQueue(directory, { accountsFile = null, drive = driveThread, driveOptions = {}, log = console.log, poll = 2000 } = {}) {
  const marker = join(directory, 'runner.json');
  if (await runnerAlive(directory)) { log('a runner is already working this store'); return { status: 'already-running' }; }
  await mkdir(directory, { recursive: true });
  await writeFile(marker, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  let store;
  try {
    // A drive started by hand may own the store: wait for it, then take over.
    for (;;) {
      try { store = await openStore(directory, { resume: true, accountsFile }); break; }
      catch (error) { if (!owned(error)) throw error; await sleep(poll); }
    }
    const running = new Map(), stalled = new Set(), resting = new Map(); // resting: id → when quota returns
    let delivering = null;
    const waiting = id => running.has(id) || stalled.has(id) || (resting.get(id) ?? 0) > Date.now();
    const start = id => {
      resting.delete(id);
      running.set(id, drive(store, id, { ...driveOptions, log: text => log(`[${id}] ${text}`) })
        .then(result => {
          if (result.status === 'out-of-quota') resting.set(id, Number.isFinite(result.resetsAt) ? result.resetsAt : Date.now() + NO_RESET_MS);
          else if (!SETTLED.has(result.status)) stalled.add(id);
          return result;
        })
        .catch(error => { stalled.add(id); log(`[${id}] ${error.stack ?? error.message}`); })
        .finally(() => { running.delete(id); if (delivering === id) delivering = null; }));
    };
    for (;;) {
      for (const request of await takeRequests(directory)) {
        try {
          const result = await applyRequest(store, request);
          if (request.type === 'answer') stalled.delete(request.id);
          log(`request ${request.type}: ${JSON.stringify(result)}`);
        } catch (error) { log(`request ${request.type} refused: ${error.message}`); }
      }
      for (const id of await store.list()) {
        if (waiting(id)) continue;
        const w = await store.get(id);
        if (w.kind === 'discovery' && !w.completion && !w.hold) start(id);
      }
      if (!delivering) {
        for (const id of await store.queue()) {
          if (waiting(id) || (await store.get(id)).hold) continue;
          delivering = id; log(`delivering ${id}`); start(id); break;
        }
      }
      if (!running.size && ![...resting.values()].some(at => at > Date.now())
        && !(await readdir(join(directory, 'requests')).catch(() => [])).some(n => n.endsWith('.json'))) break;
      await Promise.race([...running.values(), sleep(poll)]);
    }
    log('queue empty: nothing left to run');
    return { status: 'idle' };
  } finally {
    if (store) await store.close();
    await unlink(marker).catch(() => {});
  }
}
