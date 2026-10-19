import assert from 'node:assert/strict';
import { access, cp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { delimiter, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { machine, runCli, repo } from '../../harness-fakes.mjs';
import { renderDoctor } from '../../../doctor.mjs';
export const fixture = dirname(fileURLToPath(import.meta.url));
export const exec = promisify(execFile);
export const quote = s => `'${String(s).replaceAll("'", "'\\''")}'`;
export const canary = 'DOCTOR_TEST_RAW_ERROR_CANARY';
export async function fixtureChildren(tag, kill = false) {
  const lines = (await exec('/bin/ps', ['-axo', 'pid=,args='])).stdout.split('\n').filter(line => line.includes(`doctor-child-${tag}`));
  if (kill) for (const line of lines) { try { process.kill(Number(line.trim().split(/\s+/)[0]), 'SIGKILL'); } catch {} }
  return lines;
}

// The plan defines record semantics, not a JSON nesting layout. This projection
// accepts nested or flat records, retaining only ancestor identity metadata.
// It never turns prose, missing records, or a parent verdict into case evidence.
export function records(value, path = [], ancestors = []) {
  if (!value || typeof value !== 'object') return [];
  const metadata = Object.fromEntries(Object.entries(value).filter(([k, v]) =>
    !Array.isArray(v) && (v === null || typeof v !== 'object' || ['identity', 'source', 'case'].includes(k))));
  const own = typeof value.status === 'string' ? [{ ...value, context: JSON.stringify([path, ...ancestors, metadata]), original: value }] : [];
  return [...own, ...Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object' ? records(child, [...path, key], [...ancestors, metadata]) : [])];
}
export function matching(report, ...patterns) {
  return records(report).filter(r => patterns.every(p => typeof p === 'string' ? r.context.includes(p) : p.test(r.context)));
}
export function expectRecord(report, status, ...patterns) {
  const found = matching(report, ...patterns).filter(r => r.status === status);
  assert.ok(found.length, `missing ${status} record for ${patterns.join(', ')}; statuses: ${records(report).map(r => r.status).join(', ')}`);
  return found;
}
export function checkAgreement(result) {
  const { report, code } = result;
  assert.equal(typeof report.canAttemptWork, 'boolean');
  assert.equal(code, report.ok ? 0 : 1);
  const text = renderDoctor(report);
  assert.doesNotMatch(text, /cards can run here|Every job has a card that can run here|never mentions/);
  assert.match(text, /configured candidates/i);
  assert.equal(/^Check:/m.test(text), report.notes.length > 0);
  if (records(report).some(r => r.status === 'unknown')) {
    assert.equal(report.ok, false);
    assert.match(text, /Unknown/i);
  }
  return text;
}
export function hook(options, extra = {}) {
  return { type: 'command', command: `${quote(process.execPath)} ${quote(join(fixture, 'hook.mjs'))} ${quote(Buffer.from(JSON.stringify(options)).toString('base64url'))}`, ...extra };
}
export function directHook(options, extra = {}) {
  return { type: 'command', command: process.execPath,
    args: [join(fixture, 'hook.mjs'), Buffer.from(JSON.stringify(options)).toString('base64url')], ...extra };
}
export async function configure(m, harness, hooks) {
  const path = join(m.homes[harness], harness === 'codex' ? 'hooks.json' : 'settings.json');
  await writeFile(path, JSON.stringify({ hooks }));
  return path;
}
export async function listen(t) {
  const received = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    received.push(body ? JSON.parse(body) : { networkAttempt: true });
    response.end('ok');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { received, url: `http://127.0.0.1:${server.address().port}` };
}
// A loopback OpenAI-compatible fixture provider, reached through the installed
// pi runtime. Sources: installed docs/models.md and pi-ai api/openai-completions.js.
// This replaces an HTTP endpoint, never pi's loader, session, runner or model API.
export async function modelEndpoint(t, outcome = 'accepted') {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = { malformedRequest: true }; }
    requests.push({ body: parsed, url: request.url, authorization: request.headers.authorization });
    if (outcome !== 'accepted') {
      response.writeHead(outcome === 'quota' ? 429 : 400, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: outcome === 'quota' ? 'Rate limit exceeded' : 'The model fixture-default is not supported', type: 'invalid_request_error', code: outcome === 'quota' ? 'rate_limit_exceeded' : 'model_not_found' } }));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    const chunk = (delta, finish_reason = null) => ({ id: 'fixture-completion', object: 'chat.completion.chunk', created: 1, model: 'fixture-default', choices: [{ index: 0, delta, finish_reason }] });
    response.write(`data: ${JSON.stringify(chunk({ role: 'assistant', content: 'OK' }))}\n\n`);
    response.write(`data: ${JSON.stringify(chunk({}, 'stop'))}\n\n`);
    response.end('data: [DONE]\n\n');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { requests, url: `http://127.0.0.1:${server.address().port}/v1` };
}
export async function testMachine(t, harnesses = { claude: { model: 'accepted' } }) {
  const m = await machine(harnesses);
  t.after(() => rm(m.root, { recursive: true, force: true }));
  m.root = await realpath(m.root);
  m.home = await realpath(m.home);
  m.homes = { claude: join(m.home, '.claude'), codex: join(m.home, '.codex'), pi: join(m.home, '.pi', 'agent') };
  for (const home of Object.values(m.homes)) await mkdir(home, { recursive: true });
  await symlink(process.execPath, join(m.bin, 'node'));
  Object.assign(m.env, { HOME: m.home, CLAUDE_CONFIG_DIR: m.homes.claude, CODEX_HOME: m.homes.codex,
    PI_CODING_AGENT_DIR: m.homes.pi, PI_DURABLE_ALERT: 'none', DOCTOR_ACCOUNT_MARKER: 'synthetic-account',
    WORK: 'synthetic-parent-work', WORK_TOKEN: 'synthetic-parent-token', WORKER_ID: 'synthetic-worker',
    CONSTELLATION_PIECE: 'synthetic-piece' });
  await writeFile(join(m.home, 'readable-sentinel'), 'read permitted');
  const cards = Object.keys(harnesses).map(harness => ({ harness, provider: harness === 'claude' ? 'anthropic' : harness === 'codex' ? 'openai' : 'openai-codex',
    account: 'synthetic-account', model: `fixture-${harness}-card`, effort: 'low' }));
  m.env.PI_DURABLE_PRESCRIPTIONS = join(m.root, 'prescriptions.json');
  await writeFile(m.env.PI_DURABLE_PRESCRIPTIONS, JSON.stringify({ tiers: { diagnostic: cards }, jobs: { verify: { tier: 'diagnostic', access: 'run' } } }));
  const recorder = await listen(t);
  m.invocations = recorder.received;
  m.env.DOCTOR_FAKE_RECORD_URL = recorder.url;
  for (const args of [['provision'], ['provision', '--host']]) {
    const r = await runCli(args, m.env, { cwd: m.root });
    assert.equal(r.code, 0, r.stderr);
  }
  m.run = async () => {
    const before = performance.now();
    const r = await runCli(['doctor', '--json'], m.env, { cwd: m.root, timeout: 195_000 });
    assert.equal(r.stderr, '', 'doctor must return structured diagnostics, not raw child output');
    return { ...r, report: JSON.parse(r.stdout), elapsed: performance.now() - before };
  };
  return m;
}
let containment;
export async function requireContainment(t) {
  containment ??= (async () => {
    try {
      if (process.platform === 'darwin') await exec('/usr/bin/sandbox-exec', ['-p', '(version 1)(allow default)', '/usr/bin/true']);
      else if (process.platform === 'linux') await exec('bwrap', ['--ro-bind', '/', '/', '--unshare-net', '--', '/bin/true']);
      else return false;
      return true;
    } catch { return false; }
  })();
  if (await containment) return true;
  assert.notEqual(process.env.DOCTOR_REQUIRE_NATIVE, '1', 'required containment is unavailable; live gate remains open');
  t.skip('OS containment unavailable: positive execution coverage remains UNKNOWN');
  return false;
}
export async function nativeMachine(t) {
  if (!await requireContainment(t)) return null;
  const candidates = process.env.DOCTOR_TEST_PI ? [process.env.DOCTOR_TEST_PI] : (process.env.PATH ?? '').split(delimiter).map(p => join(p, 'pi'));
  let binary;
  for (const path of candidates) if (await access(path, constants.X_OK).then(() => true, () => false)) { binary = await realpath(path); break; }
  if (!binary) {
    assert.notEqual(process.env.DOCTOR_REQUIRE_NATIVE, '1', 'installed native pi runtime required');
    t.skip('No installed pi runtime: native coverage remains UNKNOWN');
    return null;
  }
  const m = await testMachine(t);
  m.env.PI_DURABLE_PI = binary;
  m.env.PI_OFFLINE = '1';
  m.extensions = join(m.homes.pi, 'extensions');
  await mkdir(m.extensions);
  m.settings = { packages: [repo], defaultProvider: 'openai-codex', defaultModel: 'fixture-unavailable-default' };
  m.saveSettings = () => writeFile(join(m.homes.pi, 'settings.json'), JSON.stringify(m.settings));
  await m.saveSettings();
  await runCli(['provision', '--host'], m.env, { cwd: m.root });
  m.install = async name => { const to = join(m.extensions, name); await cp(join(fixture, name), to); return to; };
  return m;
}
export async function homeSnapshot(path) {
  const out = {};
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const p = join(path, entry.name);
    out[entry.name] = entry.isDirectory() ? await homeSnapshot(p) : await readFile(p, 'utf8');
  }
  return out;
}
