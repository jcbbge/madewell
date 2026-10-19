import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { machine, repo, runCli } from './harness-fakes.mjs';
import { setup, registerPi } from '../provision.mjs';
import { frontDoors, piPackageState, commandState } from '../doctor.mjs';

async function fixture(t, harnesses = {}) {
  const m = await machine(harnesses);
  t.after(() => rm(m.root, { recursive: true, force: true }));
  return m;
}

test('setup: source-backed npm link from any working directory, explicit writable prefix, PATH required', async t => {
  const m = await fixture(t), prefix = join(m.root, 'prefix with spaces'), bin = join(prefix, 'bin');
  await mkdir(bin, { recursive: true });
  const env = { ...m.env, PATH: `${bin}:${m.env.PATH}` }, calls = [];
  const run = async (command, args, options) => {
    calls.push({ command, args, options });
    if (args[0] === 'link') await symlink(join(repo, 'cli.mjs'), join(bin, 'pi-durable'));
    return '';
  };
  const result = await setup({ env, prefix, run });
  assert.equal(result.ok, true);
  assert.equal(result.installation.state, 'installed');
  assert.deepEqual(calls.map(c => c.args), [
    ['install', '--no-save', '--package-lock=false', '--ignore-scripts'],
    ['link', '--prefix', prefix, '--ignore-scripts'],
  ]);
  assert.ok(calls.every(c => c.command === 'npm' && c.options.cwd === repo && c.options.env === env));
  assert.equal(commandState(m.env).state, 'missing');
  await assert.rejects(setup({ env: m.env, prefix, run: async () => '' }), /Put that bin first on PATH/);
  assert.equal(await readFile(join(bin, 'pi-durable'), 'utf8'), await readFile(join(repo, 'cli.mjs'), 'utf8'), 'command is a source link, not another runtime copy');
});

test('setup: selected npm prefix queried when absent, npm failures stop before registration', async t => {
  const m = await fixture(t), calls = [];
  await assert.rejects(setup({ env: m.env, run: async (command, args) => {
    calls.push([command, args]);
    if (args[0] === 'prefix') return join(m.root, 'prefix');
    throw new Error('read-only prefix');
  } }), /read-only prefix/);
  assert.deepEqual(calls.map(c => c[1][0]), ['prefix', 'install']);
});

test('pi registration: replaces only known Made Well sources, preserves unrelated settings and packages', async t => {
  const m = await fixture(t), door = frontDoors({ ...m.env, PI_CODING_AGENT_DIR: join(m.root, 'custom-pi-home') }).pi;
  await mkdir(join(door.settings, '..'), { recursive: true });
  const other = { source: 'npm:unrelated', extensions: [] };
  await writeFile(door.settings, JSON.stringify({ theme: 'personal', packages: [other, '../../madewell-pi-durable', 'npm:madewell-pi-durable', repo] }));
  assert.equal(piPackageState(door), 'duplicate');
  assert.equal((await registerPi(door)).action, 'differs');
  await registerPi(door, { yes: true });
  assert.deepEqual(JSON.parse(await readFile(door.settings, 'utf8')), { theme: 'personal', packages: [other, repo] });
  assert.equal(piPackageState(door), 'installed');
  assert.equal((await registerPi(door)).action, 'present');
  for (const invalid of ['{bad', 'null', '[]', '{"packages":{}}']) {
    await writeFile(door.settings, invalid);
    await assert.rejects(registerPi(door, { yes: true }), /Invalid pi settings/);
    assert.equal(await readFile(door.settings, 'utf8'), invalid, 'never destroy malformed user settings');
  }
});

test('doctor: exact command, duplicate/stale pi sources and filtered extension are not a clean install', async t => {
  const m = await fixture(t, { claude: {}, codex: {}, pi: {} });
  await symlink(join(repo, 'cli.mjs'), join(m.bin, 'pi-durable'));
  assert.equal((await runCli(['provision'], m.env)).code, 0);
  assert.equal((await runCli(['provision', '--host'], m.env)).code, 0);
  const clean = await runCli(['doctor', '--json'], m.env);
  const report = JSON.parse(clean.stdout);
  assert.equal(report.ok, true, JSON.stringify(report.problems));
  assert.equal(clean.code, 0);
  const settings = join(m.home, '.pi', 'agent', 'settings.json');
  for (const [packages, state] of [
    [[repo, repo], 'duplicate'],
    [['../../madewell-pi-durable'], 'different'],
    [[{ source: repo, extensions: [] }], 'filtered'],
  ]) {
    await writeFile(settings, JSON.stringify({ packages }));
    const r = await runCli(['doctor', '--json'], m.env), value = JSON.parse(r.stdout);
    assert.equal(r.code, 1);
    assert.equal(value.runnable, true);
    assert.equal(value.harnesses.pi.frontDoor, state);
    assert.equal(value.ok, false);
  }
});
