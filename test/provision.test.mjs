import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, access, symlink, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { machine, runCli, repo } from './harness-fakes.mjs';

const exists = path => access(path).then(() => true, () => false);
const skill = harness => readFile(join(repo, 'harness', harness, 'made-well', 'SKILL.md'), 'utf8');

test('front doors: each skill is a native SKILL.md with name and description, teaching every verb', async () => {
  for (const harness of ['claude', 'codex']) {
    const text = await skill(harness), front = /^---\n([\s\S]*?)\n---\n/.exec(text);
    assert.ok(front, `${harness}: frontmatter`);
    const keys = front[1].split('\n').map(l => /^([\w-]+):/.exec(l)?.[1]).filter(Boolean);
    assert.deepEqual(keys, ['name', 'description'], `${harness}: only keys both harnesses accept`);
    assert.match(front[1], /^name: made-well$/m);
    for (const verb of ['start --objective', '--source-file', '--delivery', 'status <id>', 'answer <id>', 'pre-existing', 'implementation', 'test', 'drive <id> --background', 'show <id>', 'doctor'])
      assert.ok(text.includes(verb), `${harness}: teaches ${verb}`);
    assert.ok(text.includes('{{cli}}'), `${harness}: the fallback command is filled in at install`);
    assert.doesNotMatch(text, /\/(home|Users)\/\w/, `${harness}: no machine paths`);
  }
  assert.match(await readFile(join(repo, 'harness', 'pi', 'README.md'), 'utf8'), /pi install/);
});

test('provision: writes each installed harness\'s skill, prints pi\'s install command, and is safe to repeat', async () => {
  const m = await machine({ claude: {}, codex: {}, pi: {} });
  const first = await runCli(['provision'], m.env);
  assert.equal(first.code, 0, first.stderr);
  const claudeSkill = join(m.home, '.claude', 'skills', 'made-well', 'SKILL.md'), codexSkill = join(m.home, '.codex', 'skills', 'made-well', 'SKILL.md');
  assert.match(first.stdout, new RegExp(`Claude Code: wrote ${claudeSkill}`));
  assert.match(first.stdout, new RegExp(`Codex: wrote ${codexSkill}`));
  assert.match(first.stdout, /pi: run — Run: pi install ".+"/);
  const written = await readFile(claudeSkill, 'utf8');
  assert.ok(written.includes(`node ${JSON.stringify(join(repo, 'cli.mjs'))}`), 'the fallback names this checkout\'s cli');
  assert.ok(!written.includes('{{cli}}'));
  assert.equal(await exists(join(m.home, '.pi')), false, 'pi\'s settings are never touched');

  const again = await runCli(['provision'], m.env);
  assert.match(again.stdout, /Claude Code: present/);
  assert.match(again.stdout, /Codex: present/);
  const report = JSON.parse((await runCli(['doctor', '--json'], m.env)).stdout);
  assert.equal(report.harnesses.claude.frontDoor, 'installed');
  assert.equal(report.harnesses.codex.frontDoor, 'installed');
});

test('provision: a different existing skill is left alone without --yes and replaced with it', async () => {
  const m = await machine({ claude: {} });
  const target = join(m.home, '.claude', 'skills', 'made-well', 'SKILL.md');
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, 'mine');
  const dry = await runCli(['provision'], m.env);
  assert.match(dry.stdout, /Claude Code: differs .* left as it is; pi-durable provision --yes replaces it/);
  assert.equal(await readFile(target, 'utf8'), 'mine');
  assert.equal(JSON.parse((await runCli(['doctor', '--json'], m.env)).stdout).harnesses.claude.frontDoor, 'different');
  const yes = await runCli(['provision', '--yes'], m.env);
  assert.match(yes.stdout, /Claude Code: replaced /);
  assert.notEqual(await readFile(target, 'utf8'), 'mine');
});

test('provision: harnesses that are not installed are skipped; harness homes follow their own variables', async () => {
  const none = await machine();
  const skipped = await runCli(['provision'], none.env);
  assert.match(skipped.stdout, /Claude Code: skipped — Claude Code is not installed here/);
  assert.match(skipped.stdout, /Codex: skipped/);
  assert.match(skipped.stdout, /pi: skipped/);
  assert.deepEqual(await readdir(none.home), [], 'nothing written');

  const m = await machine({ claude: {}, codex: {} }), claudeHome = join(m.root, 'claude-home'), codexHome = join(m.root, 'codex-home');
  await runCli(['provision'], { ...m.env, CLAUDE_CONFIG_DIR: claudeHome, CODEX_HOME: codexHome });
  assert.ok(await exists(join(claudeHome, 'skills', 'made-well', 'SKILL.md')));
  assert.ok(await exists(join(codexHome, 'skills', 'made-well', 'SKILL.md')));
  assert.equal(await exists(join(m.home, '.claude')), false);
});

test('start: creates the unit in the workspace\'s store and drives it in the background', async () => {
  const m = await machine(), workspace = join(m.root, 'ws'), state = join(m.root, 'fake.json');
  await mkdir(workspace);
  await writeFile(state, '{}');
  await symlink(process.execPath, join(m.bin, 'node')); // the fake pi runs on node
  const env = { ...m.env, PI_DURABLE_PI: fileURLToPath(new URL('./fake-pi.mjs', import.meta.url)), FAKE_PI_STATE: state,
    PI_DURABLE_PRESCRIPTIONS: fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url)) };
  const bad = await runCli(['start', '--objective', 'x'], env, { cwd: workspace });
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /exactly one of --source <text> or --source-file <path>/);

  const started = await runCli(['start', '--objective', 'Look into it', '--source', 'The person said: look into it.', '--workspace', workspace], env);
  assert.equal(started.code, 0, started.stderr);
  const out = JSON.parse(started.stdout);
  assert.ok(Number.isSafeInteger(out.id) && out.id > 0);
  assert.equal(out.delivery, false);
  assert.match(out.store, /pi-durable\/workspaces\/[0-9a-f]{64}$/, 'the same per-workspace store pi uses');
  // start resolves the workspace's real path (macOS temp dirs are /var → /private/var)
  assert.equal(out.status, `pi-durable status ${out.id} --workspace ${JSON.stringify(await realpath(workspace))}`);
  assert.ok(out.launched.pid > 0);

  let view;
  for (let i = 0; i < 300; i++) {
    const r = await runCli(['status', String(out.id), '--json', '--workspace', workspace], env);
    view = JSON.parse(r.stdout)[0];
    if (view?.state === 'delivery-authorization-required' || await exists(join(out.store, 'runs', `${out.launched.runId}.exit.json`))) break;
    await new Promise(r => setTimeout(r, 100));
  }
  assert.equal(view.state, 'delivery-authorization-required', 'discovery ran; building waits for authorization');
  assert.equal(view.objective, 'Look into it');
  const exit = JSON.parse(await readFile(join(out.store, 'runs', `${out.launched.runId}.exit.json`), 'utf8'));
  assert.equal(exit.exitCode, 0);
  assert.equal(JSON.parse((await runCli(['list'], env)).stdout).length, 0, 'the shared store is not where it went');
});

test('provision --host: puts the Made Well directive into each installed harness\'s global instructions, once, and keeps the rest', async () => {
  const { provisionHost, BEGIN, END, globalFiles } = await import('../provision.mjs');
  const m = await machine({ claude: {}, codex: {}, pi: {} });
  const saved = Object.fromEntries(['PI_DURABLE_CLAUDE', 'PI_DURABLE_CODEX', 'PI_DURABLE_PI'].map(k => [k, process.env[k]]));
  // binaryFor reads PI_DURABLE_* from process.env, not m.env; npm test sets them, so clear them to let m.env's PATH decide.
  for (const k of Object.keys(saved)) delete process.env[k];
  try {
    const files = globalFiles(m.env);
    await mkdir(dirname(files.claude), { recursive: true });
    await writeFile(files.claude, '# My own rules\n\nBe kind.\n');
    const first = await provisionHost({ env: m.env });
    const claude = await readFile(files.claude, 'utf8');
    assert.match(claude, /^# My own rules\n\nBe kind\.\n/, 'the person\'s own instructions stay first and untouched');
    assert.equal(claude.split(BEGIN).length, 2, 'exactly one block');
    assert.match(claude, /you are the \*\*dispatcher\*\*/);
    const again = await provisionHost({ env: m.env });
    assert.ok(again.filter(a => a.action !== 'skipped').every(a => a.action === 'present'), 'repeating changes nothing');
    assert.equal((await readFile(files.claude, 'utf8')).split(END).length, 2);
    assert.ok(first.some(a => a.harness === 'codex'));
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
