// The run view from the CLI (#78 plan §5, §7 j): serve opens no browser unless asked from a terminal,
// reuses a dashboard already on its port, and is scoped to a workspace; sidecar --once is terminalLines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, realpath, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { openStore } from '../work.mjs';
import { workspaceDataDirectory } from '../config.mjs';
import { serve } from '../serve.mjs';
import { renderSidecar, sidecarSnapshot } from '../sidecar.mjs';
import { cli, runCli } from './drive-helpers.mjs';

// A machine with a fake browser opener on PATH: any launch of it leaves a mark.
async function machine() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mpd-cli-'))), bin = join(root, 'bin'), mark = join(root, 'opened');
  await mkdir(bin);
  for (const name of ['open', 'xdg-open']) { await writeFile(join(bin, name), `#!/bin/sh\necho "$@" >> "${mark}"\n`); await chmod(join(bin, name), 0o755); }
  const env = { ...process.env, XDG_DATA_HOME: root, PATH: `${bin}${delimiter}${process.env.PATH}`, PI_DURABLE_ALERT: 'none' };
  delete env.WORK_DATA;
  return { root, base: join(root, 'pi-durable'), mark, env, done: () => rm(root, { recursive: true, force: true }) };
}
const freePort = () => new Promise(resolve => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

// Runs `serve` until it prints `until`, waits a moment more for any browser launch, then stops it.
function serveUntil(args, { env, cwd, until }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--no-warnings', cli, 'serve', ...args], { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', seen = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`serve never printed ${until}\n${stdout}\n${stderr}`)); }, 15_000);
    child.stdout.on('data', c => {
      stdout += c;
      if (!seen && stdout.includes(until)) { seen = true; setTimeout(() => child.kill('SIGTERM'), 800); }
    });
    child.stderr.on('data', c => { stderr += c; });
    child.on('close', () => { clearTimeout(timer); if (seen) resolve({ stdout, stderr }); });
    child.on('error', reject);
  });
}
const within = (promise, ms, what) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not finish in ${ms} ms`)), ms))]);

test('7j: serve --no-open, and serve on a non-terminal stdout, never launch a browser; the URL carries the workspace', async () => {
  const m = await machine();
  try {
    const ws = join(m.root, 'shop'); await mkdir(ws);
    let port = await freePort();
    const scoped = `http://127.0.0.1:${port}/?workspace=${encodeURIComponent(ws)}`;
    const a = await serveUntil(['--workspace', ws, '--no-open', '--port', String(port)], { env: m.env, cwd: m.root, until: scoped });
    assert.ok(a.stdout.includes(scoped), a.stdout);
    port = await freePort();
    // No --no-open, but stdout is a pipe: still no browser. With no --workspace, the scope is the current folder.
    const here = `http://127.0.0.1:${port}/?workspace=${encodeURIComponent(ws)}`;
    await serveUntil(['--port', String(port)], { env: m.env, cwd: ws, until: here });
    port = await freePort();
    const everything = `http://127.0.0.1:${port}/`;
    const c = await serveUntil(['--all', '--no-open', '--port', String(port)], { env: m.env, cwd: ws, until: everything });
    assert.ok(!c.stdout.includes(`${everything}?workspace=`), '--all is not scoped');
    assert.equal(existsSync(m.mark), false, 'no browser was launched');
  } finally { await m.done(); }
});

test('7j: serve on a port where the dashboard already runs uses it; on a port held by something else it fails', async () => {
  const m = await machine();
  const running = await serve({ port: 0, base: m.base, log: () => {} }), port = running.address().port;
  const other = createServer((req, res) => { res.writeHead(404); res.end('not a dashboard'); });
  await new Promise(resolve => other.listen(0, '127.0.0.1', resolve));
  try {
    const reused = await within(runCli(['serve', '--no-open', '--port', String(port)], m.env), 15_000, 'serve on a busy dashboard port');
    assert.equal(reused.code, 0, reused.stderr);
    assert.match(reused.stdout, new RegExp(`Using the dashboard already running on :${port}`));
    const taken = other.address().port;
    const failed = await within(runCli(['serve', '--no-open', '--port', String(taken)], m.env), 15_000, 'serve on a taken port');
    assert.notEqual(failed.code, 0);
    assert.ok(`${failed.stdout}${failed.stderr}`.includes(String(taken)), 'the message names the port');
    assert.equal(existsSync(m.mark), false);
  } finally { running.close(); other.close(); await m.done(); }
});

test('sidecar --once prints the frame of one workspace with --workspace, and of every store without it', async () => {
  const m = await machine();
  try {
    const env = { XDG_DATA_HOME: m.root };
    for (const [name, objective] of [['alpha', 'Alpha objective'], ['beta', 'Beta objective']]) {
      const ws = join(m.root, name); await mkdir(ws);
      const store = await openStore(workspaceDataDirectory(ws, env)); await store.create(objective, 'source', ws, { delivery: true }); await store.close();
    }
    const alpha = join(m.root, 'alpha');
    const one = await runCli(['sidecar', '--once', '--width', '80', '--workspace', alpha], m.env);
    assert.equal(one.code, 0, one.stderr);
    assert.match(one.stdout, /Alpha objective/);
    assert.doesNotMatch(one.stdout, /Beta objective/);
    const expected = renderSidecar(await sidecarSnapshot({ base: m.base, workspace: alpha }), { width: 80 });
    assert.equal(one.stdout, `${expected}\n`, 'exactly the frame for that scope');
    const both = await runCli(['sidecar', '--once', '--width', '80'], m.env);
    assert.equal(both.code, 0, both.stderr);
    assert.match(both.stdout, /Alpha objective/);
    assert.match(both.stdout, /Beta objective/);
    assert.match((await runCli(['sidecar', '--once', '--all', '--width', '80'], m.env)).stdout, /Beta objective/, '--all changes nothing');
    const help = await runCli(['help'], m.env);
    assert.match(help.stdout, /serve \[--workspace <dir> \| --all\] \[--no-open\] \[--port 7788\] \[--host 127\.0\.0\.1\]/);
    assert.match(help.stdout, /sidecar \[--workspace <dir>\] \[--once\] \[--width N\]/);
  } finally { await m.done(); }
});
