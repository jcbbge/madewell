// Shared set-up for tests that drive work through the scripted fake pi. Real store, real driver, temp dirs.
import { mkdtemp, writeFile, chmod, mkdir, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openStore } from '../work.mjs';

export const fake = fileURLToPath(new URL('./fake-pi.mjs', import.meta.url));
export const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
await chmod(fake, 0o755);
// No desktop notification from a test run, whoever runs it; a test that checks alerts sets its own channel.
process.env.PI_DURABLE_ALERT ??= 'none';

export const quiet = { log: () => {} };

export async function setup(scenario = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mpd-')), dir = join(root, 'store'), cwd = join(root, 'ws'), state = join(root, 'fake.json');
  await mkdir(cwd);
  await writeFile(state, JSON.stringify(scenario));
  process.env.PI_DURABLE_PI = fake; process.env.FAKE_PI_STATE = state;
  process.env.PI_DURABLE_PRESCRIPTIONS = fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url));
  const log = () => { try { return readFileSync(state + '.log', 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };
  // The scenario can be changed between drives (e.g. a per-item question set after the items exist).
  const script = async patch => writeFile(state, JSON.stringify({ ...JSON.parse(await readFile(state, 'utf8')), ...patch }));
  return { root, dir, cwd, state, log, script };
}

export async function run(scenario, fn) {
  const s = await setup(scenario);
  const store = await openStore(s.dir, { resume: true });
  try { await fn({ ...s, store }); } finally { await store.close(); await rm(s.root, { recursive: true, force: true }); }
}

export const calls = (log, role) => log().filter(c => c.role === role);
export const originatorCalls = log => calls(log, 'originator');
export const stepExchanges = w => w.exchanges.filter(x => !x.subject || x.subject.kind === 'step');

// Polls until fn returns a truthy value, or fails after ms.
export async function waitFor(fn, ms = 5000, what = 'condition') {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise(r => setTimeout(r, 50));
  }
}

// The CLI as the operator runs it, against an explicit store.
export function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, ['--no-warnings', cli, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr, ms: Date.now() - startedAt }));
  });
}
// drive-all prints its log lines, then the results array.
export const results = stdout => JSON.parse(stdout.slice(stdout.indexOf('[\n  {')));

// Kills any process whose command line carries the marker, with its process group.
export function killMarked(marker) {
  const r = spawnSync('pgrep', ['-f', marker], { encoding: 'utf8' });
  for (const pid of (r.stdout ?? '').split('\n').filter(Boolean).map(Number)) {
    try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} }
  }
}
