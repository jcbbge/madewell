import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { machine, runCli, repo } from './harness-fakes.mjs';

const doctor = async (env, ...more) => {
  const r = await runCli(['doctor', '--json', ...more], env);
  return { ...r, report: JSON.parse(r.stdout) };
};

test('doctor: no harness installed means nothing can run, and it says how to fix that', async () => {
  const m = await machine();
  const { code, report } = await doctor(m.env);
  assert.equal(code, 1);
  assert.equal(report.ok, false);
  assert.equal(report.prescriptions, true);
  assert.deepEqual(report.missing, [], 'this checkout has its packages');
  for (const h of Object.values(report.harnesses)) assert.equal(h.installed, false);
  for (const t of Object.values(report.tiers)) assert.equal(t.usable, 0);
  assert.ok(report.problems.some(p => /No harness is installed/.test(p.what) && /Install Claude Code/.test(p.fix)));
  assert.ok(report.problems.some(p => /No card for the deep tier/.test(p.what)));
});

test('doctor: versions, sign-in per harness, usable cards per tier, missing front doors', async () => {
  const m = await machine({ claude: { signedIn: true }, codex: { signedIn: false }, pi: { ready: ['openai-codex'] } });
  const { code, report } = await doctor(m.env);
  assert.equal(code, 1, 'candidates exist, but setup problems prevent a clean preflight');
  assert.equal(report.canAttemptWork, true);
  assert.equal(report.ok, false);
  const { claude, codex, pi } = report.harnesses;
  assert.deepEqual([claude.version, claude.signedIn, claude.frontDoor], ['9.9.9 (Claude Code)', true, 'missing']);
  assert.deepEqual([codex.version, codex.signedIn, codex.frontDoor], ['codex-cli 9.9.9', false, 'missing']);
  assert.deepEqual([pi.version, pi.signedIn, pi.providers, pi.frontDoor], ['9.9.9', true, { 'openai-codex': true }, 'missing']);
  assert.deepEqual(report.tiers.deep.cards.map(c => c.usable), [true, false, true], 'codex is not signed in');
  assert.deepEqual(report.tiers.deep.jobs, ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'arbitrate']);
  assert.ok(report.problems.some(p => p.what === 'Codex is installed but not signed in' && p.fix === 'Run: codex login'));
  assert.ok(report.problems.some(p => /Claude Code has no Made Well front door/.test(p.what) && /pi-durable provision/.test(p.fix)));
  assert.ok(report.problems.some(p => /pi has no Made Well front door/.test(p.what) && p.fix.startsWith('Run: pi install ')));
});

test('doctor: sign-in it cannot read is UNKNOWN, and the card still counts', async () => {
  const m = await machine({ claude: { auth: 'garbled' } });
  const { report } = await doctor(m.env);
  assert.equal(report.harnesses.claude.signedIn, null);
  assert.equal(report.tiers.fast.cards[0].usable, true);
  const text = await runCli(['doctor'], m.env);
  assert.match(text.stdout, /Claude Code: 9\.9\.9 \(Claude Code\) · signed in UNKNOWN/);
  assert.match(text.stdout, /✓ claude · anthropic · claude-haiku-5-5 · low \(sign-in UNKNOWN\)/);
});

test('doctor: a pi provider that is not signed in leaves its cards out', async () => {
  const m = await machine({ pi: { ready: [] } });
  const { code, report } = await doctor(m.env);
  assert.equal(code, 1);
  assert.equal(report.harnesses.pi.signedIn, false);
  assert.ok(report.problems.some(p => /pi is installed but not signed in/.test(p.what) && /openai-codex/.test(p.fix)));
});

test('doctor: invalid prescriptions are a problem with a fix', async () => {
  const m = await machine({ pi: {} }), bad = join(m.root, 'rx.json');
  await writeFile(bad, '{"tiers": {}, "jobs": {"verify": {"tier": "nope", "access": "run"}}}');
  const { code, report } = await doctor({ ...m.env, PI_DURABLE_PRESCRIPTIONS: bad });
  assert.equal(code, 1);
  assert.equal(report.prescriptions, false);
  assert.ok(report.problems.some(p => /unknown tier "nope"/.test(p.what) && /Fix prescriptions\.json/.test(p.fix)));
});

test('doctor: pi counts the front door installed when its settings list this checkout', async () => {
  const m = await machine({ pi: {} }), agent = join(m.home, '.pi', 'agent');
  await mkdir(agent, { recursive: true });
  await writeFile(join(agent, 'settings.json'), JSON.stringify({ packages: ['npm:other', relative(agent, repo)] }));
  assert.equal((await doctor(m.env)).report.harnesses.pi.frontDoor, 'installed');
  await writeFile(join(agent, 'settings.json'), JSON.stringify({ packages: ['git:github.com/someone/madewell'] }));
  assert.equal((await doctor(m.env)).report.harnesses.pi.frontDoor, 'installed');
  const elsewhere = join(m.root, 'pi-home');
  await mkdir(elsewhere);
  await writeFile(join(elsewhere, 'settings.json'), JSON.stringify({ packages: [repo] }));
  assert.equal((await doctor({ ...m.env, PI_CODING_AGENT_DIR: elsewhere })).report.harnesses.pi.frontDoor, 'installed', 'PI_CODING_AGENT_DIR is pi\'s home');
});

// Behaviour/protocol coverage lives in doctor-probes.test.mjs. Merely mentioning
// PI_DURABLE_WORKER in a hook is deliberately no longer an acceptance condition.
