import { createServer } from 'node:http';
import { readFile, readdir, stat, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirectory } from './config.mjs';
import { observe } from './observe.mjs';

// Read-only observability. Never opens the store, never takes the lock, never acts.
const page = fileURLToPath(new URL('./dashboard.html', import.meta.url));
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

// One worker launch, summarized from pi's own JSON event stream.
const cache = new Map();
export async function launchStats(path, { tail = 0 } = {}) {
  const info = await stat(path).catch(() => null);
  if (!info) return null;
  const key = `${path}:${info.size}:${info.mtimeMs}:${tail}`;
  if (cache.has(key)) return cache.get(key);
  const handle = await open(path, 'r');
  let text;
  try { const start = Math.max(0, info.size - 4 * 1024 * 1024); const buf = Buffer.alloc(info.size - start); await handle.read(buf, 0, buf.length, start); text = buf.toString('utf8'); }
  finally { await handle.close(); }
  const s = { lastActivity: info.mtimeMs, tools: 0, toolErrors: 0, toolMs: 0, turns: 0, tokens: 0, cost: 0, byTool: {}, recent: [] };
  const open_ = new Map();
  for (const line of text.split('\n')) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'turn_end') s.turns++;
    if (e.type === 'tool_execution_start') {
      open_.set(e.toolCallId, e);
      if (tail) s.recent.push({ kind: 'tool', tool: e.toolName, args: summarize(e.args), state: 'running' });
    }
    if (e.type === 'tool_execution_end') {
      s.tools++; if (e.isError) s.toolErrors++;
      const ms = Number.isFinite(e.durationMs) ? e.durationMs : 0; s.toolMs += ms;
      const t = (s.byTool[e.toolName] ??= { count: 0, ms: 0, errors: 0 }); t.count++; t.ms += ms; if (e.isError) t.errors++;
      if (tail) {
        const r = s.recent.findLast(r => r.kind === 'tool' && r.tool === e.toolName && r.state === 'running');
        if (r) Object.assign(r, { state: e.isError ? 'error' : 'done', ms });
        open_.delete(e.toolCallId);
      }
    }
    if (e.type === 'message_end' && e.message?.role === 'assistant') {
      const u = e.message.usage; if (u) { s.tokens += u.totalTokens ?? 0; s.cost += u.cost?.total ?? 0; }
      const said = (e.message.content ?? []).filter(c => c.type === 'text').map(c => c.text).join(' ').trim();
      if (tail && said) s.recent.push({ kind: 'say', text: said.slice(0, 280) });
      if (e.message.errorMessage && tail) s.recent.push({ kind: 'error', text: e.message.errorMessage.slice(0, 280) });
    }
    if (e.type === 'auto_retry_start' && tail) s.recent.push({ kind: 'retry', text: `retry ${e.attempt}/${e.maxAttempts}: ${(e.errorMessage ?? '').slice(0, 200)}` });
  }
  s.inFlightTools = [...open_.values()].map(e => e.toolName);
  if (tail) s.recent = s.recent.slice(-tail);
  cache.set(key, s);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return s;
}
const summarize = args => {
  if (!args || typeof args !== 'object') return '';
  const v = args.command ?? args.path ?? args.pattern ?? args.query ?? args.deliverable ?? JSON.stringify(args);
  return String(v).replace(/\s+/g, ' ').slice(0, 160);
};

export async function snapshot({ base = dataDirectory(), now = Date.now() } = {}) {
  const result = { at: now, base, silentMs: SILENT_MS, stores: [] };
  for (const dir of await stores(base)) {
    const lock = await readFile(join(dir, 'owner.lock'), 'utf8').then(JSON.parse).catch(() => null);
    const driver = { pid: lock?.pid ?? null, alive: alive(lock?.pid), since: lock?.at ?? null };
    const threads = [];
    for (const w of await observe(dir)) {
      for (const a of w.record?.attempts ?? []) {
        a.stats = [];
        for (const run of a.runs ?? []) {
          const live = !run.endedAt;
          const st = await launchStats(join(dir, `${run.record}.jsonl`), { tail: live ? 30 : 0 });
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
      threads.push(w);
    }
    result.stores.push({ dir, workspace: threads[0]?.workspace ?? null, driver, threads });
  }
  return result;
}

export async function serve({ port = 7788, host = '127.0.0.1', base = dataDirectory(), log = console.log } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(await readFile(page)); return; }
      if (url.pathname === '/api/state') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(await snapshot({ base }))); return; }
      if (url.pathname === '/api/stream') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        let last = '', busy = false;
        const push = async () => {
          if (busy) return; busy = true;
          try {
            const state = await snapshot({ base }), body = JSON.stringify(state);
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
  log(`pi-durable dashboard: http://${host}:${server.address().port}  (stores under ${base}; read-only)`);
  return server;
}
