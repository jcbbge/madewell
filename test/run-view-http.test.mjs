// The run view over HTTP (#78 plan §2 routes, §7 i): the page and view.mjs, workspace scope, and the two
// POST routes, which only a same-origin JSON request from this machine may use, and which act only through
// the CLI. Temp stores only: base is <tmp>/pi-durable and each store is its workspace's own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openStore } from '../work.mjs';
import { drive } from '../drive.mjs';
import { observe } from '../observe.mjs';
import { workspaceDataDirectory } from '../config.mjs';
import { serve } from '../serve.mjs';
import { fake, quiet, waitFor, killMarked } from './drive-helpers.mjs';

async function world() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mpd-http-'))), base = join(root, 'pi-durable'), state = join(root, 'fake.json');
  await writeFile(state, '{}');
  process.env.PI_DURABLE_PI = fake; process.env.FAKE_PI_STATE = state;
  process.env.PI_DURABLE_PRESCRIPTIONS = fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url));
  const workspace = async name => { const ws = join(root, name); await mkdir(ws); return { ws, storeDir: workspaceDataDirectory(ws, { XDG_DATA_HOME: root }) }; };
  const script = scenario => writeFile(state, JSON.stringify(scenario));
  const server = await serve({ port: 0, base, log: () => {} });
  const port = server.address().port;
  const close = async () => { server.close(); killMarked(root); await rm(root, { recursive: true, force: true }); };
  return { root, base, workspace, script, port, close };
}

function post(port, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req = request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'content-length': Buffer.byteLength(data), ...headers } }, res => {
      let text = '';
      res.on('data', c => { text += c; });
      res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch {} resolve({ status: res.statusCode, json, text }); });
    });
    req.on('error', reject);
    req.end(data);
  });
}
const same = port => ({ host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`, 'content-type': 'application/json' });
const view = async (storeDir, id) => (await observe(storeDir, id))[0];

test('7i: the page names Made Well and loads /view.mjs; view.mjs is served as JavaScript; ?workspace= scopes state and stream', async () => {
  const w = await world();
  try {
    const a = await w.workspace('alpha'), b = await w.workspace('beta');
    for (const [{ ws, storeDir }, objective] of [[a, 'Alpha objective'], [b, 'Beta objective']]) {
      const store = await openStore(storeDir); await store.create(objective, 'source', ws, { delivery: true }); await store.close();
    }
    const url = path => `http://127.0.0.1:${w.port}${path}`;
    const page = await (await fetch(url('/'))).text();
    assert.match(page, /Made Well/);
    assert.match(page, /\/view\.mjs/);
    const js = await fetch(url('/view.mjs'));
    assert.equal(js.status, 200);
    assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8');
    assert.equal(js.headers.get('cache-control'), 'no-store');
    assert.equal(await js.text(), await readFile(fileURLToPath(new URL('../view.mjs', import.meta.url)), 'utf8'));

    const all = await (await fetch(url('/api/state'))).json();
    assert.deepEqual(all.stores.map(s => s.workspace).sort(), [a.ws, b.ws].sort());
    const scoped = await (await fetch(url(`/api/state?workspace=${encodeURIComponent(a.ws)}`))).json();
    assert.deepEqual(scoped.stores.map(s => s.workspace), [a.ws]);
    assert.equal(scoped.stores[0].threads[0].objective, 'Alpha objective');

    const stop = new AbortController(), res = await fetch(url(`/api/stream?workspace=${encodeURIComponent(b.ws)}`), { signal: stop.signal });
    const reader = res.body.getReader(), decoder = new TextDecoder();
    let text = '';
    while (!/data: .*\n\n/.test(text)) { const { value, done } = await reader.read(); if (done) break; text += decoder.decode(value); }
    stop.abort();
    const first = JSON.parse(text.match(/data: (.*)\n\n/)[1]);
    assert.deepEqual(first.stores.map(s => s.workspace), [b.ws], 'the stream is scoped the same way');
  } finally { await w.close(); }
});

test('7i: /api/answer refuses each failed guard on its own with 403, refuses while a live process owns the lock with 409, then answers', async () => {
  const w = await world();
  try {
    const { ws, storeDir } = await w.workspace('ws');
    let store = await openStore(storeDir, { resume: true });
    const id = await store.create('Add CSV export', 'source', ws, { delivery: true });
    await w.script({ askByThread: { [id]: 'Which database should the export use?' } });
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const hold = (await view(storeDir, id)).hold;
    assert.ok(hold, 'held');
    const body = { storeDir, threadId: id, text: 'Use SQLite, as the source says.' };
    const port = w.port, ok = same(port);

    const refused = [
      ['wrong Origin', { ...ok, origin: 'http://evil.test' }],
      ['no Origin', Object.fromEntries(Object.entries(ok).filter(([k]) => k !== 'origin'))],
      ['Host evil.test', { ...ok, host: `evil.test:${port}`, origin: `http://evil.test:${port}` }],
      ['text/plain', { ...ok, 'content-type': 'text/plain' }],
    ];
    for (const [why, headers] of refused) {
      const r = await post(port, '/api/answer', body, headers);
      assert.equal(r.status, 403, `${why}: ${r.text}`);
      assert.equal(r.json?.ok, false);
      assert.equal(typeof r.json?.error, 'string');
    }
    for (const bad of [{ ...body, storeDir: join(w.root, 'elsewhere') }, { ...body, threadId: 999 }]) {
      const r = await post(port, '/api/answer', bad, ok);
      assert.notEqual(r.status, 200, JSON.stringify(bad));
      assert.equal(r.json?.ok, false);
    }
    assert.deepEqual((await view(storeDir, id)).hold, hold, 'nothing refused touched the store');

    // This process owns the store: the CLI cannot open it, and the reply says who owns it and what to run.
    let r = await post(port, '/api/answer', body, ok);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.ok, false);
    assert.ok(r.json.error.includes(String(process.pid)), `the error names the owner: ${r.json.error}`);
    assert.match(`${r.json.error}\n${r.json.command ?? ''}`, new RegExp(`pi-durable answer ${id}\\b`), 'and gives the command');
    assert.deepEqual((await view(storeDir, id)).hold, hold);

    await store.close(); store = null;
    await w.script({});  // the redrive started after the answer asks nothing more
    r = await post(port, '/api/answer', body, ok);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.ok('answered' in r.json && 'driver' in r.json, r.text);
    assert.equal((await view(storeDir, id)).hold, null, 'no longer held');
    await waitFor(async () => (await view(storeDir, id))?.state === 'done', 60_000, 'the redriven item to finish');
    assert.ok((await view(storeDir, id)).record.exchanges.some(x => x.turns.some(t => t.type === 'human' && t.text.startsWith('Use SQLite'))), 'the answer is the human turn');
    r = await post(port, '/api/answer', body, ok);
    assert.notEqual(r.status, 200, 'nothing is held now');
    assert.equal(r.json?.ok, false);
  } finally { await w.close(); }
});

test('7i: /api/authorize gives the go-ahead through the CLI, only to an item that waits for it', async () => {
  const w = await world();
  try {
    const { ws, storeDir } = await w.workspace('ws');
    const store = await openStore(storeDir, { resume: true });
    const id = await store.create('Archive old invoices', 'source', ws, { delivery: false });
    assert.equal((await drive(store, id, quiet)).status, 'delivery-authorization-required');
    await store.close();
    const ok = same(w.port);
    assert.equal((await post(w.port, '/api/authorize', { storeDir, threadId: id }, { ...ok, origin: 'http://evil.test' })).status, 403);
    const r = await post(w.port, '/api/authorize', { storeDir, threadId: id }, ok);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    await waitFor(async () => (await view(storeDir, id))?.record.events.some(e => e.type === 'delivery-authorized'), 30_000, 'the yes on the record');
    await waitFor(async () => (await view(storeDir, id))?.state === 'done', 60_000, 'the built item to finish');
    const again = await post(w.port, '/api/authorize', { storeDir, threadId: id }, ok);
    assert.notEqual(again.status, 200, 'a finished item waits for no go-ahead');
    assert.equal(again.json?.ok, false);
  } finally { await w.close(); }
});
