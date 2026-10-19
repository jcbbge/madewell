import { mkdir, readdir, readFile, rename, unlink, open, link, stat, rmdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { openStore } from './work.mjs';
import { drive as driveThread } from './drive.mjs';

// The filesystem is an intake mailbox, not a second work authority. The store atomically applies
// each request and saves its result by requestId. Only then may its mailbox entry disappear.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const owned = error => /^Store is owned by live process/.test(error?.message ?? '');
const alive = pid => { if (!Number.isSafeInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const digest = text => createHash('sha256').update(text).digest('hex');
const mailbox = directory => join(directory, 'requests');

export async function applyRequest(store, request) {
  if (typeof request.requestId !== 'string' || !request.requestId.trim()) throw new Error('A stable requestId is required');
  return store.applyRequest(request);
}

async function enqueue(directory, request) {
  const folder = mailbox(directory), path = join(folder, `${digest(request.requestId)}.json`);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`, file = await open(temp, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify({ queuedAt: Date.now(), request })); await file.sync(); }
  finally { await file.close(); }
  try {
    // Hard linking publishes without replacing a concurrent retry's entry.
    try { await link(temp, path); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = JSON.parse(await readFile(path, 'utf8'));
      if (JSON.stringify(previous.request) !== JSON.stringify(request)) throw new Error('requestId already names a different request');
    }
  } finally { await unlink(temp).catch(() => {}); }
  return path;
}

export async function pendingRequests(directory) {
  let names;
  try { names = await readdir(mailbox(directory)); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const entries = [];
  for (const name of names.filter(n => n.endsWith('.json'))) {
    const path = join(mailbox(directory), name);
    try {
      const entry = JSON.parse(await readFile(path, 'utf8'));
      // Old pending files did not have an ID. Their existing filename is a stable migration ID.
      entries.push({ path, queuedAt: entry.queuedAt ?? (Number(name.split('-')[0]) || 0),
        request: entry.request ?? { ...entry, requestId: entry.requestId ?? `legacy:${name}` } });
    } catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot read queued request ${name}: ${error.message}`); }
  }
  return entries.sort((a, b) => a.queuedAt - b.queuedAt || a.path.localeCompare(b.path));
}

// Hooks let crash tests stop at the actual read/commit/ack boundaries, without a second queue model.
export async function drainRequests(directory, store, { afterRead, afterApply, onApplied = () => {}, onError, skip = new Map() } = {}) {
  const results = [];
  for (const { path, request } of await pendingRequests(directory)) {
    if (skip.has(path)) continue;
    try {
      await afterRead?.(request);
      const result = await applyRequest(store, request);
      await afterApply?.(request, result);
      await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
      await onApplied(request, result);
      results.push({ requestId: request.requestId, ...result });
    } catch (error) {
      if (!onError) throw error;
      await onError(error, { path, request });
    }
  }
  return results;
}

export async function assertNotRelocating(directory) {
  try { await stat(`${directory}.relocation.json`); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error('This store is being relocated; finish workspace relocate before starting or changing work');
}

// Both idle and busy paths use exactly the same durable application identity.
export async function submit(directory, input, { accountsFile = null, open = openStore } = {}) {
  await assertNotRelocating(directory);
  const request = { ...input, requestId: input.requestId ?? randomUUID() };
  const path = await enqueue(directory, request);
  let store;
  try { store = await open(directory, { accountsFile }); }
  catch (error) {
    if (!owned(error)) throw error; // retain the request even on an unexpected owner/open failure
    return { queued: true, requestId: request.requestId };
  }
  try {
    const result = await applyRequest(store, request);
    await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
    return { queued: false, requestId: request.requestId, ...result };
  } finally { await store.close(); }
}

export async function runnerAlive(directory) {
  try { return alive(JSON.parse(await readFile(join(directory, 'runner.json'), 'utf8')).pid); } catch { return false; }
}

async function claimRunner(directory) {
  await mkdir(directory, { recursive: true });
  const path = join(directory, 'runner.json');
  for (;;) {
    try {
      const temp = `${path}.${randomUUID()}.tmp`;
      await writeAtomic(temp, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      try { await link(temp, path); } finally { await unlink(temp).catch(() => {}); }
      return path;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // New markers publish atomically. An indeterminate legacy marker is not proof of a dead owner.
      let marker;
      try { marker = JSON.parse(await readFile(path, 'utf8')); } catch { throw new Error('Runner marker is unreadable; establish its owner before removing it'); }
      if (alive(marker.pid)) return null;
      await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
}

const SETTLED = new Set(['discovered', 'complete']);
const NO_RESET_MS = 60 * 60_000;

// Discoveries run as they arrive; one delivery item at a time. Read priority before every item.
export async function runQueue(directory, { accountsFile = null, drive = driveThread, driveOptions = {}, log = console.log,
  poll = 2000, open = openStore, now = Date.now, wait = sleep } = {}) {
  await assertNotRelocating(directory);
  const marker = await claimRunner(directory);
  if (!marker) return { status: 'already-running' };
  let store;
  const running = new Map(), stalled = new Set(), resting = new Map(), refused = new Map();
  let delivering = null;
  try {
    for (;;) {
      try { store = await open(directory, { resume: true, accountsFile }); break; }
      catch (error) { if (!owned(error)) throw error; await wait(poll); }
    }
    // Quota waits are committed work events. Restarting the runner must not erase a reset time.
    for (const id of await store.list()) {
      const w = await store.get(id), event = (w.events ?? []).findLast(e => ['quota-wait', 'quota-resumed', 'queue-settled'].includes(e.type));
      if (event?.type === 'quota-wait') resting.set(id, event.resetsAt);
    }
    const waiting = id => running.has(id) || stalled.has(id) || (resting.get(id) ?? 0) > now();
    const start = (id, lane) => {
      const task = (async () => {
        if (resting.has(id)) await store.note(id, 'quota-resumed', { resetsAt: resting.get(id) });
        resting.delete(id);
        await store.note(id, 'queue-selected', { lane, reason: lane === 'discovery' ? 'pending-discovery' : 'delivery-priority' });
        const result = await drive(store, id, { ...driveOptions, log: text => log(`[${id}] ${text}`) });
        if (result.status === 'out-of-quota') {
          const resetsAt = Number.isFinite(result.resetsAt) ? result.resetsAt : now() + NO_RESET_MS;
          await store.note(id, 'quota-wait', { resetsAt, reason: result.reason ?? 'all-accounts-unavailable' });
          resting.set(id, resetsAt);
        } else {
          await store.note(id, 'queue-settled', { outcome: result.status });
          if (!SETTLED.has(result.status)) stalled.add(id);
        }
        return result;
      })().catch(error => { stalled.add(id); log(`[${id}] ${error.stack ?? error.message}`); })
        .finally(() => { running.delete(id); if (delivering === id) delivering = null; });
      running.set(id, task);
    };
    for (;;) {
      await drainRequests(directory, store, { skip: refused, onError: (error, { path, request }) => {
        refused.set(path, { requestId: request.requestId, error: error.message, path });
        log(`request ${request.requestId} retained: ${error.message}`);
      }, onApplied: (request, result) => {
        if (request.type === 'answer' || request.type === 'return') stalled.delete(request.id);
        log(`request ${request.type}: ${JSON.stringify(result)}`);
      } });
      for (const id of await store.list()) {
        if (waiting(id)) continue;
        const w = await store.get(id);
        if (w.kind === 'discovery' && !w.completion && !w.hold) start(id, 'discovery');
      }
      if (!delivering) {
        for (const id of await store.queue()) {
          if (waiting(id) || (await store.get(id)).hold) continue;
          delivering = id; start(id, 'delivery'); break;
        }
      }
      if (!running.size && ![...resting.values()].some(at => at > now()) && !(await pendingRequests(directory)).some(entry => !refused.has(entry.path))) break;
      await Promise.race([...running.values(), wait(poll)]);
    }
    log('nothing else runnable');
    return { status: refused.size ? 'intake-blocked' : 'idle', ...(refused.size ? { requests: [...refused.values()] } : {}), stalled: [...stalled] };
  } finally {
    // Do not close the store underneath an in-flight discovery when intake fails.
    await Promise.allSettled(running.values());
    if (store) await store.close();
    await unlink(marker).catch(() => {});
  }
}

// Only operational cwd is rebound. Historical source, answers and report bytes are evidence.
export async function relocateQueuedRequests(directory, from, to, { requestReceipt } = {}) {
  let count = 0;
  for (const entry of await pendingRequests(directory)) {
    const receipt = requestReceipt ? await requestReceipt(entry.request.requestId) : null;
    if (receipt !== null && receipt !== undefined) {
      await unlink(entry.path); // the existing committed receipt is the acknowledgement
      continue;
    }
    if (entry.request.type !== 'create' || entry.request.cwd !== from) continue;
    const raw = JSON.parse(await readFile(entry.path, 'utf8'));
    if (raw.request) raw.request.cwd = to; else raw.cwd = to;
    const temporary = `${entry.path}.${randomUUID()}.tmp`;
    await writeAtomic(temporary, JSON.stringify(raw));
    await rename(temporary, entry.path);
    count++;
  }
  return count;
}

async function writeAtomic(path, content) {
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(content); await file.sync(); } finally { await file.close(); }
}
const exists = async path => { try { return await stat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
async function stopped(directory) {
  for (const file of ['owner.lock', 'runner.json']) {
    const text = await readFile(join(directory, file), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (text !== null) {
      let marker;
      try { marker = JSON.parse(text); } catch { throw new Error(`Cannot establish stopped owner: ${file}`); }
      if (alive(marker.pid)) throw new Error(`Store has a live ${file === 'owner.lock' ? 'owner' : 'runner'}; stop it before relocation`);
    }
  }
}

// The small journal protects a closed whole-store rename, not work execution or a second catalog.
// A retry derives progress from the two directories and repeats only idempotent committed rebinding.
export async function relocateStore(from, to, { env = process.env, open = openStore, config, afterCommit, afterMove } = {}) {
  config ??= await import('./config.mjs');
  const binding = await config.workspaceRelocation(from, to, env);
  const { sourceDirectory, directory } = binding;
  const resolved = await config.resolveWorkspaceBinding({ workspace: binding.from, directory: sourceDirectory }, env);
  if (resolved.workspace !== binding.from && (resolved.workspace !== binding.to || resolved.directory !== directory)) throw new Error('Source workspace already points elsewhere; relocate its current binding instead');
  const journals = [...new Set([sourceDirectory, directory])].map(path => `${path}.relocation.json`);
  const priorJournals = await Promise.all(journals.map(path => readFile(path, 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; })));
  const existing = priorJournals.find(Boolean);
  for (const prior of priorJournals.filter(Boolean)) {
    if (JSON.stringify(prior.binding) !== JSON.stringify(binding)) throw new Error('A different workspace relocation is pending');
    if (alive(prior.pid)) throw new Error('Workspace relocation is already running');
  }
  await stopped(sourceDirectory);
  if (directory !== sourceDirectory) await stopped(directory);
  const source = await exists(join(sourceDirectory, 'work.sqlite')), destination = await exists(join(directory, 'work.sqlite'));
  if (!source && !existing && destination) {
    const resolved = await config.resolveWorkspaceBinding({ workspace: binding.from, directory: sourceDirectory }, env);
    if (resolved.workspace === binding.to && resolved.directory === directory) return { ...binding, ids: [], pending: 0, reused: true };
  }
  if (!source && !(existing && destination)) throw new Error('Source store is absent; refusing to create a new empty store');
  if (directory !== sourceDirectory && source && (await readdir(directory).catch(error => { if (error.code === 'ENOENT') return []; throw error; })).length) throw new Error('Destination store is not empty; refusing to merge stores');
  const journal = JSON.stringify({ binding, pid: process.pid });
  const claimed = [];
  try {
    for (const path of journals) {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      if (await exists(path)) {
        const prior = JSON.parse(await readFile(path, 'utf8'));
        if (JSON.stringify(prior.binding) !== JSON.stringify(binding) || alive(prior.pid)) throw new Error('Another relocation owns this store');
        await unlink(path);
      }
      const temp = `${path}.${randomUUID()}.tmp`;
      await writeAtomic(temp, journal);
      try { await link(temp, path); claimed.push(path); }
      finally { await unlink(temp).catch(() => {}); }
    }
    let result = { ids: [] }, pending = 0, store;
    const activeDirectory = source ? sourceDirectory : directory;
    try {
      store = await open(activeDirectory);
      result = await store.relocateWorkspace(binding.from, binding.to);
      pending = await relocateQueuedRequests(activeDirectory, binding.from, binding.to, { requestReceipt: id => store.requestReceipt(id) });
    } finally { if (store) await store.close(); }
    await afterCommit?.(binding);
    if (source && directory !== sourceDirectory) {
      await stopped(sourceDirectory); await stopped(directory);
      if (await exists(directory)) await rmdir(directory); // nonempty races refuse, never overwrite
      await rename(sourceDirectory, directory);
    }
    await afterMove?.(binding);
    // Reopening regenerates destination evidence paths from the committed Work rows.
    const reopened = await open(directory);
    await reopened.close();
    await config.recordWorkspaceRelocation(binding, env);
    for (const path of claimed) await unlink(path);
    return { ...binding, ...result, pending };
  } catch (error) {
    // Keep the binding as a retry journal, but release this invocation's live claim.
    for (const path of claimed) {
      const temp = `${path}.${randomUUID()}.tmp`;
      await writeAtomic(temp, JSON.stringify({ binding, pid: null }));
      await rename(temp, path);
    }
    throw error;
  }
}
