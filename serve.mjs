import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { readFile, readdir, stat, open, mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { join, isAbsolute, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirectory, workspaceDataDirectory } from './config.mjs';
import { observe } from './observe.mjs';
import { parseRun } from './cards.mjs';
import { CAUSES } from './work.mjs';

// Observability, and the operator's two answers. Never opens a store or takes a lock: it reads the view files,
// and acts only by running the CLI as a child process.
const page = fileURLToPath(new URL('./dashboard.html', import.meta.url));
const viewFile = fileURLToPath(new URL('./view.mjs', import.meta.url));
export const SILENT_MS = 5 * 60_000;
const alive = pid => { if (!Number.isSafeInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

export async function stores(base = dataDirectory()) {
  const found = [];
  const has = async dir => stat(join(dir, 'observability')).then(() => true, () => false);
  if (await has(base)) found.push(base);
  for (const name of await readdir(join(base, 'workspaces')).catch(() => [])) {
    const dir = join(base, 'workspaces', name);
    if (await has(dir)) found.push(dir);
  }
  return found;
}

// One worker launch, summarized from its harness's own JSON event stream. The whole file is read, once and then
// incrementally: a grown file parses only the complete lines after the offset, a shrunk one is read again.
const cache = new Map(), chains = new Map();
const fresh = harness => ({ harness, sessionId: null, tools: 0, toolErrors: 0, toolMs: 0, turns: 0, byTool: {}, recent: [], open: new Map(),
  piTokens: 0, piCost: 0, piPriced: false, codexTokens: null, claudeResult: null });
const RECENT = 30;

function ingest(st, line) {
  let e; try { e = JSON.parse(line); } catch { return; }
  if (!e || typeof e !== 'object') return;
  if (e.type === 'turn_end') st.turns++;
  if (e.type === 'tool_execution_start') {
    st.open.set(e.toolCallId, e);
    st.recent.push({ kind: 'tool', tool: e.toolName, args: summarize(e.args), state: 'running' });
  }
  if (e.type === 'tool_execution_end') {
    st.tools++; if (e.isError) st.toolErrors++;
    const ms = Number.isFinite(e.durationMs) ? e.durationMs : 0; st.toolMs += ms;
    const t = (st.byTool[e.toolName] ??= { count: 0, ms: 0, errors: 0 }); t.count++; t.ms += ms; if (e.isError) t.errors++;
    const r = st.recent.findLast(r => r.kind === 'tool' && r.tool === e.toolName && r.state === 'running');
    if (r) Object.assign(r, { state: e.isError ? 'error' : 'done', ms });
    st.open.delete(e.toolCallId);
  }
  if (e.type === 'message_end' && e.message?.role === 'assistant') {
    const u = e.message.usage;
    if (u) { st.piTokens += u.totalTokens ?? 0; if (u.cost?.total !== undefined) { st.piPriced = true; st.piCost += u.cost.total ?? 0; } }
    const said = (e.message.content ?? []).filter(c => c.type === 'text').map(c => c.text).join(' ').trim();
    if (said) st.recent.push({ kind: 'say', text: said.slice(0, 280) });
    if (e.message.errorMessage) st.recent.push({ kind: 'error', text: e.message.errorMessage.slice(0, 280) });
  }
  if (e.type === 'auto_retry_start') st.recent.push({ kind: 'retry', text: `retry ${e.attempt}/${e.maxAttempts}: ${(e.errorMessage ?? '').slice(0, 200)}` });
  if (e.type === 'result') st.claudeResult = e;
  if (e.type === 'turn.completed' && e.usage) st.codexTokens = (st.codexTokens ?? 0) + (e.usage.input_tokens ?? 0) + (e.usage.output_tokens ?? 0);
  if (st.recent.length > RECENT * 4) st.recent = st.recent.slice(-RECENT);
}

function summary(st, info, tail) {
  const s = { lastActivity: info.mtimeMs, tools: st.tools, toolErrors: st.toolErrors, toolMs: st.toolMs, turns: st.turns, byTool: st.byTool,
    recent: tail ? st.recent.slice(-tail) : [], inFlightTools: [...st.open.values()].map(e => e.toolName), sessionId: st.sessionId };
  if (st.harness === 'claude') {
    const u = st.claudeResult?.usage;
    if (!st.claudeResult) Object.assign(s, { tokens: null, cost: null, costReason: 'run not finished' });
    else Object.assign(s, { tokens: u ? (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0) : null,
      cost: Number.isFinite(st.claudeResult.total_cost_usd) ? st.claudeResult.total_cost_usd : null, costReason: Number.isFinite(st.claudeResult.total_cost_usd) ? null : 'claude reported no price' });
  } else if (st.harness === 'codex') Object.assign(s, { tokens: st.codexTokens, cost: null, costReason: 'codex reports no price' });
  else Object.assign(s, { tokens: st.piTokens, cost: st.piPriced ? st.piCost : null, costReason: st.piPriced ? null : 'pi reported no price' });
  return s;
}

async function head(path, size, harness) {
  const handle = await open(path, 'r');
  try {
    const buf = Buffer.alloc(Math.min(size, 64 * 1024)); await handle.read(buf, 0, buf.length, 0);
    return parseRun(harness, buf.toString('utf8')).sessionId ?? null;
  } catch { return null; } finally { await handle.close(); }
}

async function parse(path, harness, tail) {
  const info = await stat(path).catch(() => null);
  if (!info) return null;
  let entry = cache.get(path);
  if (entry && (entry.harness !== harness || info.size < entry.offset || info.size < entry.size)) entry = null;
  if (entry && entry.size === info.size && entry.mtimeMs === info.mtimeMs) return summary(entry.st, info, tail);
  if (!entry) entry = { harness, size: 0, mtimeMs: 0, offset: 0, st: fresh(harness) };
  if (info.size > entry.offset) {
    const handle = await open(path, 'r');
    let endsWithNewline;
    try { const b = Buffer.alloc(1); await handle.read(b, 0, 1, info.size - 1); endsWithNewline = b[0] === 0x0a; } finally { await handle.close(); }
    const rl = createInterface({ input: createReadStream(path, { start: entry.offset, end: info.size - 1, encoding: 'utf8' }), crlfDelay: Infinity });
    let pending = null;
    for await (const line of rl) { if (pending !== null) ingest(entry.st, pending); pending = line; }
    if (pending === null) entry.offset = info.size;
    else if (endsWithNewline) { ingest(entry.st, pending); entry.offset = info.size; }
    else entry.offset = info.size - Buffer.byteLength(pending);
  }
  if (!entry.st.sessionId) entry.st.sessionId = await head(path, info.size, harness);
  entry.size = info.size; entry.mtimeMs = info.mtimeMs;
  cache.delete(path); cache.set(path, entry);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return summary(entry.st, info, tail);
}

export function launchStats(path, { tail = 0, harness = 'pi' } = {}) {
  const run = (chains.get(path) ?? Promise.resolve()).then(() => parse(path, harness, tail));
  const next = run.catch(() => {});
  chains.set(path, next);
  next.then(() => { if (chains.get(path) === next) chains.delete(path); });
  return run;
}
const summarize = args => {
  if (!args || typeof args !== 'object') return '';
  const v = args.command ?? args.path ?? args.pattern ?? args.query ?? args.deliverable ?? JSON.stringify(args);
  return String(v).replace(/\s+/g, ' ').slice(0, 160);
};

export async function snapshot({ base = dataDirectory(), now = Date.now(), workspace = null } = {}) {
  const result = { at: now, base, home: homedir(), silentMs: SILENT_MS, stores: [] };
  for (const dir of await stores(base)) {
    const lock = await readFile(join(dir, 'owner.lock'), 'utf8').then(JSON.parse).catch(() => null);
    const driver = { pid: lock?.pid ?? null, alive: alive(lock?.pid), since: lock?.at ?? null };
    const threads = [];
    for (const w of await observe(dir)) {
      if (workspace !== null && w.workspace !== workspace) continue;
      for (const a of w.record?.attempts ?? []) {
        a.stats = [];
        for (const run of a.runs ?? []) {
          const live = !run.endedAt;
          const st = await launchStats(join(dir, `${run.record}.jsonl`), { tail: live ? 30 : 0, harness: typeof run.card === 'object' ? run.card.harness : typeof run.card === 'string' ? run.card.split(' · ')[0] : a.card?.harness });
          a.stats.push(st && { ...st, live, pidAlive: live && run.pid ? alive(run.pid) : null });
        }
        const last = a.stats.at(-1);
        if (['queued', 'running'].includes(a.status)) {
          const silentFor = last ? now - last.lastActivity : now - (a.startedAt ?? a.createdAt);
          const pid = a.runs?.at(-1)?.pid;
          a.health = !driver.alive ? 'no-driver' : pid && !alive(pid) ? 'worker-dead' : silentFor > SILENT_MS ? 'silent' : 'ok';
          a.silentFor = silentFor;
        }
      }
      w.callStats = {};
      for (const e of w.record?.events ?? []) {
        if (e.type !== 'call' || !e.record) continue;
        const st = await launchStats(`${isAbsolute(e.record) ? e.record : join(dir, e.record)}.jsonl`, { harness: (typeof e.card === 'object' ? e.card.harness : String(e.card ?? '').split(' · ')[0]) || 'pi' });
        if (st) w.callStats[e.record] = st;
      }
      threads.push(w);
    }
    if (workspace !== null && !threads.length) continue;
    result.stores.push({ dir, workspace: threads[0]?.workspace ?? null, driver, threads });
  }
  return result;
}

// The two POST routes act only through the CLI, as a child process: the server never opens a store. A POST is
// accepted only from this machine, same-origin, as JSON.
const LOOPBACK = /^(127(\.\d+){3}|::1|::ffff:127(\.\d+){3})$/;
const HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const hostname = host => String(host ?? '').replace(/:\d+$/, '');
function refuse(req) {
  if (!LOOPBACK.test(req.socket.remoteAddress ?? '')) return 'Only this machine may send this.';
  if (!HOSTS.has(hostname(req.headers.host))) return 'The Host is not this machine.';
  if (req.headers.origin !== `http://${req.headers.host}`) return 'The Origin is not this page.';
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return 'The request must be JSON.';
  return null;
}
const BODY_LIMIT = 64 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > BODY_LIMIT) { reject(Object.assign(new Error('The body is over 64 KiB.'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const fail = (status, error, extra = {}) => Object.assign(new Error(error), { status, extra });
const cliPath = fileURLToPath(new URL('./cli.mjs', import.meta.url));
function runCli(args, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--no-warnings', cliPath, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });
    child.on('error', e => { clearTimeout(timer); resolve({ code: 1, stdout, stderr: e.message }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}
// The item the body names, and the environment under which the CLI finds that item's own store.
async function target(base, body) {
  if (!body || typeof body !== 'object') throw fail(400, 'The body must be a JSON object.');
  const { storeDir, threadId } = body;
  if (typeof storeDir !== 'string' || !Number.isSafeInteger(threadId)) throw fail(400, 'The body needs storeDir and threadId.');
  if (!(await stores(base)).includes(storeDir)) throw fail(404, 'That store is not one of this dashboard\'s.');
  const w = (await observe(storeDir, threadId))[0];
  if (!w) throw fail(404, `No item #${threadId} in that store.`);
  return { w, storeDir, base };
}
async function childEnvFor({ w, storeDir, base }, command) {
  const env = { ...process.env, XDG_DATA_HOME: dirname(base) };
  delete env.WORK_DATA;
  const own = basename(base) === 'pi-durable' && await realpath(w.workspace).then(ws => workspaceDataDirectory(ws, env) === storeDir, () => false);
  if (!own) throw fail(409, 'This store is not the workspace\'s own; answer in a terminal:', { command });
  return env;
}
const unitCommand = (t, verb) => `${t.storeDir === t.base ? '' : `WORK_DATA=${t.storeDir} `}pi-durable ${verb}`;

async function answer(base, body) {
  const t = await target(base, body), { w } = t;
  if (!w.hold) throw fail(409, 'Nothing is waiting on an answer.');
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw fail(400, 'The answer is empty.');
  const failure = w.hold.kind === 'failure';
  if (failure && !CAUSES.includes(body.cause)) throw fail(400, `A failed check needs the cause: ${CAUSES.join(' | ')}.`);
  const command = unitCommand(t, `answer ${w.threadId} reply.txt${failure ? ` ${body.cause}` : ''}`);
  const env = await childEnvFor(t, command);
  const dir = await mkdtemp(join(tmpdir(), 'mpd-answer-'));
  try {
    const file = join(dir, 'reply.txt');
    await writeFile(file, text, { mode: 0o600 });
    const done = await runCli(['answer', String(w.threadId), file, ...(failure ? [body.cause] : []), '--workspace', w.workspace], env);
    if (done.code !== 0) throw fail(409, (done.stderr || done.stdout).trim() || 'The answer was not taken.', { command });
    const driven = await runCli(['drive', String(w.threadId), '--background', '--workspace', w.workspace], env);
    let driver = null; try { driver = JSON.parse(driven.stdout); } catch {}
    return { ok: true, answered: (() => { try { return JSON.parse(done.stdout); } catch { return done.stdout.trim(); } })(), driver,
      ...(driven.code === 0 ? {} : { driveError: driven.stderr.trim() }) };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

async function authorize(base, body) {
  const t = await target(base, body), { w } = t;
  if (w.state !== 'delivery-authorization-required') throw fail(409, 'This item is not waiting for the go-ahead.');
  const command = unitCommand(t, `drive ${w.threadId} --delivery --background`);
  const env = await childEnvFor(t, command);
  const done = await runCli(['drive', String(w.threadId), '--delivery', '--background', '--workspace', w.workspace], env);
  if (done.code !== 0) throw fail(409, (done.stderr || done.stdout).trim() || 'The go-ahead was not taken.', { command });
  let driver = null; try { driver = JSON.parse(done.stdout); } catch {}
  return { ok: true, driver };
}

export async function serve({ port = 7788, host = '127.0.0.1', base = dataDirectory(), log = console.log } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x'), workspace = url.searchParams.get('workspace');
      const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
      if (req.method === 'POST' && ['/api/answer', '/api/authorize'].includes(url.pathname)) {
        const why = refuse(req);
        if (why) return json(403, { ok: false, error: why });
        try {
          let body; try { body = JSON.parse(await readBody(req)); } catch (e) { throw e.status ? e : fail(400, 'The body is not JSON.'); }
          return json(200, await (url.pathname === '/api/answer' ? answer : authorize)(base, body));
        } catch (e) { return json(e.status ?? 500, { ok: false, error: e.message, ...(e.extra ?? {}) }); }
      }
      if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(await readFile(page)); return; }
      if (url.pathname === '/view.mjs') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(await readFile(viewFile)); return; }
      if (url.pathname === '/api/state') return json(200, await snapshot({ base, workspace }));
      if (url.pathname === '/api/stream') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        let last = '', busy = false;
        const push = async () => {
          if (busy) return; busy = true;
          try {
            const state = await snapshot({ base, workspace }), body = JSON.stringify(state);
            const digest = createHash('sha1').update(body.replace(/"at":\d+,/, '')).digest('hex');
            if (digest !== last) { last = digest; res.write(`data: ${body}\n\n`); } else res.write(`: ${Date.now()}\n\n`);
          } catch (e) { res.write(`event: problem\ndata: ${JSON.stringify(e.message)}\n\n`); }
          finally { busy = false; }
        };
        await push();
        const timer = setInterval(push, 1000);
        req.on('close', () => clearInterval(timer));
        return;
      }
      res.writeHead(404); res.end('not found');
    } catch (e) { res.writeHead(500); res.end(e.message); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  log(`pi-durable dashboard: http://${host}:${server.address().port}  (stores under ${base}; answers go through the CLI)`);
  return server;
}
