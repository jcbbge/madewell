// Run only by Aldebaran on the named host. This makes the authorized real model
// requests. It never edits installed hooks, credentials, prescriptions or skills.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { harnessHomes, renderDoctor } from '../../../doctor.mjs';
import { runCli } from '../../harness-fakes.mjs';
import { fixture, hook, expectRecord, records, exec } from './support.mjs';
const label = process.argv[2];
assert.ok(['M5', 'hive'].includes(label), 'supply M5 or hive; execute locally on that host');
const evidence = resolve('.madewell/doctor-thread70-live', label);
await mkdir(evidence, { recursive: true });
const root = await mkdtemp(join(tmpdir(), 'doctor-live-fixtures-'));
const homes = harnessHomes(process.env);
const installedPaths = [join(homes.claude, 'settings.json'), join(homes.codex, 'hooks.json'), join(homes.codex, 'config.toml'), join(homes.pi, 'settings.json')];
async function metadata() {
  return Promise.all(installedPaths.map(async path => {
    const s = await stat(path).catch(() => null);
    return { path, present: Boolean(s), size: s?.size, mtimeMs: s?.mtimeMs };
  }));
}
const before = await metadata();
const summary = { label, hostname: hostname(), revision: (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim(), reports: [], failures: [], cleaned: false };
async function run(name, env) {
  const result = await runCli(['doctor', '--json'], env, { cwd: root, timeout: 195_000 });
  const report = JSON.parse(result.stdout);
  await writeFile(join(evidence, `${name}.json`), JSON.stringify(report, null, 2));
  await writeFile(join(evidence, `${name}.txt`), renderDoctor(report));
  summary.reports.push({ name, exitCode: result.code, ok: report.ok, stderrBytes: Buffer.byteLength(result.stderr), versions: Object.fromEntries(Object.entries(report.harnesses).map(([k, v]) => [k, v.version])) });
  assert.equal(result.code, report.ok ? 0 : 1, `${name}: exit and JSON disagree`);
  return report;
}
try {
  const normal = await run('installed', process.env);
  if (!normal.ok) summary.failures.push('Installed preflight is incomplete or failed; inspect installed.json.');
  if (normal.notes.length) summary.failures.push('Installed hooks/extensions refused; inspect Check entries.');
  for (const name of ['claude', 'codex', 'pi']) assert.equal(normal.harnesses[name].installed, true, `${name} must be installed for this live gate`);
  const ch = join(root, 'claude'), co = join(root, 'codex'), pi = join(root, 'pi');
  for (const path of [ch, co, join(pi, 'extensions')]) await mkdir(path, { recursive: true });
  const piExtension = join(pi, 'extensions', 'pi-stateful.ts');
  await cp(join(fixture, 'pi-stateful.ts'), piExtension);
  const env = { ...process.env, CLAUDE_CONFIG_DIR: ch, CODEX_HOME: co, PI_CODING_AGENT_DIR: pi, PI_OFFLINE: '1', DOCTOR_FIXTURE_GUARDED: '1' };
  const configs = [join(ch, 'settings.json'), join(co, 'hooks.json')];
  for (const path of configs) await writeFile(path, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [hook({ mode: 'guarded' })] }] } }));
  await writeFile(join(pi, 'settings.json'), '{}');
  const passing = await run('passing-fixtures', env);
  assert.deepEqual(passing.notes, [], 'passing fixtures must produce no Check entries');
  for (const path of [...configs, piExtension]) expectRecord(passing, 'passed', path);
  const localEvidence = records(passing).filter(r => [...configs, piExtension].some(p => r.context.includes(p)));
  assert.ok(!localEvidence.some(r => r.status === 'unknown'), 'unknown fixture coverage is not a pass');

  delete env.DOCTOR_FIXTURE_GUARDED;
  for (const path of configs) await writeFile(path, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [hook({ mode: 'deny' })] }] } }));
  const pkg = join(root, 'pi-package');
  await cp(join(fixture, 'package'), pkg, { recursive: true });
  await writeFile(join(pi, 'settings.json'), JSON.stringify({ packages: [{ source: pkg, extensions: ['shim.ts'] }] }));
  const refusing = await run('refusing-fixtures', env);
  for (const path of [...configs, piExtension, pkg]) expectRecord(refusing, 'refused', path);
  assert.ok(refusing.notes.length >= 3, 'each installed harness must identify its deliberately refusing fixture');
  assert.equal(refusing.ok, false);
  // Temporary homes intentionally have no copied credentials. Their model/setup
  // limitations remain in the reports, not presented as failures of the fixtures.
} catch (error) {
  summary.failures.push(error instanceof assert.AssertionError ? error.message : 'Live command failed; inspect saved reports.');
} finally {
  await rm(root, { recursive: true, force: true });
  summary.cleaned = await stat(root).then(() => false, () => true);
  const after = await metadata();
  summary.installedConfigurationUnchanged = JSON.stringify(before) === JSON.stringify(after);
  if (!summary.installedConfigurationUnchanged) summary.failures.push('Installed configuration metadata changed.');
  await writeFile(join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
}
console.log(`Live evidence: ${evidence}`);
process.exitCode = summary.failures.length ? 1 : 0;
