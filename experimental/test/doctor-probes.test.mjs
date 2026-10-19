// Contract tests derived from ACCEPTED-3-plan.md, before product implementation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { cli, runCli } from './harness-fakes.mjs';
import { fixture, testMachine, nativeMachine, configure, hook, directHook, records, matching,
  expectRecord, checkAgreement, requireContainment, listen, modelEndpoint, homeSnapshot, fixtureChildren, canary } from './fixtures/doctor/support.mjs';

const group = (command, matcher = 'Bash') => [{ matcher, hooks: [command] }];
const noteFree = report => assert.deepEqual(report.notes, [], 'only observed refusals belong in Check');
const hasUnknown = report => assert.ok(records(report).some(r => r.status === 'unknown'), 'incomplete check must have structured unknown evidence');

for (const harness of ['claude', 'codex']) {
  test(`doctor probes: ${harness} worker guard and harmless denial text are exercised, never grepped`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    for (const command of [hook({ mode: 'guarded' }), hook({ mode: 'response', stdout: 'Do not deny or block workers. PI_DURABLE_WORKER is documentation.' }),
      hook({ mode: 'response', json: { systemMessage: 'deny/block are just advisory words' } })]) {
      const path = await configure(m, harness, { PreToolUse: group(command) });
      const result = await m.run();
      noteFree(result.report);
      expectRecord(result.report, 'passed', path, 'PreToolUse');
      checkAgreement(result);
    }
  });

  test(`doctor probes: ${harness} actual refusals win over a worker-flag comment`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    for (const command of [hook({ mode: 'deny' }), { type: 'command', command: ': PI_DURABLE_WORKER; exit 2' }]) {
      const path = await configure(m, harness, { PreToolUse: group(command) });
      const result = await m.run();
      expectRecord(result.report, 'refused', path, 'PreToolUse');
      assert.ok(result.report.notes.length);
      assert.equal(result.report.ok, false);
      assert.equal(result.report.canAttemptWork, true);
      assert.match(checkAgreement(result), /^Check:/m);
    }
  });

  for (const key of ['WORKER_ID', 'CONSTELLATION_PIECE']) {
    test(`doctor probes: ${harness} Stop wrapper preserves ${key} only when inherited`, async t => {
      if (!await requireContainment(t)) return;
      const m = await testMachine(t, { [harness]: { model: 'accepted' } });
      await configure(m, harness, { Stop: group(hook({ mode: 'conditional', key }), '') });
      delete m.env[key];
      const absent = await m.run();
      noteFree(absent.report);
      expectRecord(absent.report, 'passed', 'Stop');
      m.env[key] = 'synthetic-inherited-value';
      const present = await m.run();
      expectRecord(present.report, 'refused', 'Stop');
      assert.ok(present.report.notes.length);
    });
  }

  test(`doctor probes: ${harness} uses event envelopes, scratch transcripts and worker environment`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    const environment = { HOME: m.home, CLAUDE_CONFIG_DIR: m.homes.claude, CODEX_HOME: m.homes.codex,
      PI_CODING_AGENT_DIR: m.homes.pi, WORKER_ID: m.env.WORKER_ID, CONSTELLATION_PIECE: m.env.CONSTELLATION_PIECE };
    const hooks = {};
    for (const event of ['PreToolUse', 'UserPromptSubmit', 'Stop', 'SessionStart', 'SessionEnd', 'SubagentStart', 'SubagentStop', ...(harness === 'codex' ? ['Interrupt'] : [])]) {
      hooks[event] = (event === 'PreToolUse' ? ['Bash', 'Write'] : ['']).map(tool => ({
        matcher: tool || (event.startsWith('Subagent') ? 'tldraw-offline' : ''),
        hooks: [hook({ mode: 'validate', harness, event, tool, environment })],
      }));
    }
    const path = await configure(m, harness, hooks);
    const before = await homeSnapshot(m.home);
    const result = await m.run();
    noteFree(result.report);
    for (const event of Object.keys(hooks)) {
      const evidence = matching(result.report, path, event);
      assert.ok(evidence.some(r => ['passed', 'not-applicable'].includes(r.status)), `${event} must be exercised or documented nonblocking`);
      assert.ok(!evidence.some(r => r.status === 'unknown'), `${event} belongs to the finite catalogue`);
    }
    assert.deepEqual(await homeSnapshot(m.home), before, 'real harness homes must not change');
    checkAgreement(result);
  });

  test(`doctor probes: ${harness} exercises both Stop recursion states`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    for (const active of [false, true]) {
      await configure(m, harness, { Stop: group(hook({ mode: 'stop-active', active }), '') });
      const result = await m.run();
      expectRecord(result.report, 'refused', 'Stop');
      expectRecord(result.report, 'passed', 'Stop');
    }
  });

  test(`doctor probes: ${harness} absent, malformed, invalid, unreadable config are distinct`, async t => {
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    const path = join(m.homes[harness], harness === 'codex' ? 'hooks.json' : 'settings.json');
    await rm(path, { force: true });
    const absent = await m.run();
    assert.ok(!matching(absent.report, path).some(r => r.status === 'unknown'));
    for (const contents of ['{broken', '{"hooks":42}', '{"hooks":{"PreToolUse":"invalid"}}']) {
      await writeFile(path, contents);
      const result = await m.run();
      expectRecord(result.report, 'unknown', path);
      noteFree(result.report);
      checkAgreement(result);
    }
    await rm(path);
    await mkdir(path); // deterministic read error even with elevated test permissions
    const unreadable = await m.run();
    expectRecord(unreadable.report, 'unknown', path);
    noteFree(unreadable.report);
  });

  test(`doctor probes: ${harness} unmatched matcher and unsupported registration are unknown`, async t => {
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    for (const hooks of [
      { PreToolUse: group(hook({ mode: 'deny' }), '^mcp__not_in_catalogue__tool$') },
      { PreToolUse: group({ type: 'prompt', prompt: 'unexecuted fixture' }) },
      { PreToolUse: group(hook({ mode: 'deny' }, { shell: 'unsupported-fixture-shell' })) },
      { FutureUnrecognisedEvent: group(hook({ mode: 'deny' })) },
    ]) {
      const path = await configure(m, harness, hooks);
      const result = await m.run();
      expectRecord(result.report, 'unknown', path);
      noteFree(result.report);
      checkAgreement(result);
    }
  });
}

test('doctor probes: Codex Write/Edit aliases both receive apply_patch', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t, { codex: { model: 'accepted' } });
  for (const matcher of ['^Write$', '^Edit$']) {
    await configure(m, 'codex', { PreToolUse: group(hook({ mode: 'deny' }), matcher) });
    expectRecord((await m.run()).report, 'refused', 'PreToolUse');
  }
});

test('doctor probes: Claude direct arguments preserve literal shell metacharacters', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t);
  const expectedArg = 'literal; $(exit 2) and spaces';
  const command = directHook({ mode: 'response', stdout: 'allow', expectedArg });
  command.args.push(expectedArg);
  await configure(m, 'claude', { PreToolUse: group(command) });
  const result = await m.run();
  expectRecord(result.report, 'passed', 'PreToolUse');
  noteFree(result.report);
});

test('doctor probes: exit and response meanings are event-specific', async t => {
  if (!await requireContainment(t)) return;
  const cases = [
    ['claude', 'PreToolUse', { code: 3, stdout: '' }, {}, 'unknown'],
    ['claude', 'PreToolUse', { code: 3, stdout: '' }, { onFailure: 'block' }, 'refused'],
    ['claude', 'Stop', { code: 3, stdout: '' }, { onFailure: 'block' }, 'unknown'],
    ['codex', 'PreToolUse', { json: { continue: false } }, {}, 'unknown'],
    ['codex', 'Stop', { stdout: 'not JSON' }, {}, 'unknown'],
    ['claude', 'PreToolUse', { json: { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' } } }, {}, 'refused'],
  ];
  for (const [harness, event, response, extra, status] of cases) {
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    await configure(m, harness, { [event]: group(hook({ mode: 'response', ...response }, extra)) });
    const result = await m.run();
    expectRecord(result.report, status, event);
    if (status !== 'refused') noteFree(result.report);
    checkAgreement(result);
  }
  const m = await testMachine(t);
  for (const event of ['SessionStart', 'SessionEnd', 'SubagentStart']) {
    await configure(m, 'claude', { [event]: group(hook({ mode: 'response', stdout: '', code: 2 }), event === 'SubagentStart' ? 'tldraw-offline' : '') });
    const result = await m.run();
    noteFree(result.report);
    assert.ok(matching(result.report, event).some(r => r.status === 'not-applicable' || r.status === 'passed'));
  }
});

test('doctor probes: crashes, output overflow, and timeout are unknown; raw output stays private', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t);
  const tag = `bounded-${process.pid}-${Date.now()}`;
  t.after(() => fixtureChildren(tag, true));
  for (const mode of ['signal', 'overflow', 'hang']) {
    await configure(m, 'claude', { PreToolUse: group(hook({ mode, tag }, { timeout: 1 })) });
    const result = await m.run();
    expectRecord(result.report, 'unknown', 'PreToolUse');
    noteFree(result.report);
    assert.ok(result.elapsed < 15_000, 'honour shorter hook timeout plus process cleanup');
    assert.ok(Buffer.byteLength(result.stdout) < 256 * 1024, 'report excludes unbounded raw child output');
    assert.deepEqual(await fixtureChildren(tag), [], 'timeout/overflow must leave no descendants');
    checkAgreement(result);
  }
  await configure(m, 'claude', { PreToolUse: group(hook({ mode: 'response', stdout: canary })) });
  const result = await m.run();
  assert.ok(!result.stdout.includes(canary));
  assert.ok(!checkAgreement(result).includes(canary));
});

test('doctor probes: OS containment denies outside writes/network and cleans scratch', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t), network = await listen(t), outside = join(m.home, 'must-not-exist');
  const path = await configure(m, 'claude', { PreToolUse: group(hook({ mode: 'containment', outside, url: network.url })) });
  const result = await m.run();
  expectRecord(result.report, 'passed', path, 'PreToolUse');
  noteFree(result.report);
  assert.equal(await access(outside).then(() => true, () => false), false);
  assert.equal(network.received.length, 0, 'hook networking must be prevented by the OS');
  // Metadata must disclose the scratch/environment change and permit cleanup verification.
  const scratchPaths = new Set();
  function find(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/^(scratch|scratchDir|scratchDirectory)$/.test(key) && typeof child === 'string') scratchPaths.add(child);
      else find(child);
    }
  }
  find(result.report);
  assert.ok(scratchPaths.size, 'scratch path belongs in containment metadata');
  for (const path of scratchPaths) assert.equal(await access(path).then(() => true, () => false), false, `scratch removed: ${path}`);
});

test('doctor probes: cancellation kills a TERM-resistant descendant', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t), tag = `cancel-${process.pid}-${Date.now()}`, cancelFile = join(m.root, 'cancel.pid');
  t.after(() => fixtureChildren(tag, true));
  await configure(m, 'claude', { PreToolUse: group(hook({ mode: 'hang', tag, cancelFile })) });
  const child = spawn(process.execPath, ['--no-warnings', cli, 'doctor', '--json'], { env: m.env, cwd: m.root, stdio: ['ignore', 'pipe', 'pipe'] });
  await writeFile(cancelFile, String(child.pid));
  let stdout = '';
  child.stdout.on('data', c => { stdout += c; });
  child.stderr.resume();
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 15_000);
  t.after(() => clearTimeout(watchdog));
  const code = await new Promise(resolve => child.on('close', resolve));
  clearTimeout(watchdog);
  const report = JSON.parse(stdout);
  assert.equal(code, 1);
  hasUnknown(report);
  noteFree(report);
  const processes = await fixtureChildren(tag);
  assert.deepEqual(processes, [], 'cancelled probe descendants must be reaped');
});

test('doctor probes: missing containment is explicit and never a refusal', async t => {
  // This case runs on every host. A launcher refusal is injected only through
  // executable lookup, never by replacing the OS sandbox with an allow-all fake.
  const m = await testMachine(t);
  for (const name of ['sandbox-exec', 'bwrap']) {
    await writeFile(join(m.bin, name), '#!/bin/sh\nexit 73\n', { mode: 0o755 });
  }
  await configure(m, 'claude', { PreToolUse: group(hook({ mode: 'deny' })) });
  const result = await m.run();
  if (matching(result.report, 'PreToolUse').some(r => r.status === 'refused')) {
    t.skip('Trusted absolute containment launcher bypassed PATH injection; failure-path coverage remains UNKNOWN and requires launch-seam inspection');
    return;
  }
  expectRecord(result.report, 'unknown', /containment-unavailable/);
  noteFree(result.report);
  assert.equal(result.report.ok, false);
});

for (const harness of ['claude', 'codex']) {
  test(`doctor models: ${harness} uses default once, preserves account, bounds tools`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'accepted' } });
    const result = await m.run();
    assert.equal(m.invocations.length, 1, 'one model launch, no card fallback/retry');
    const call = m.invocations[0];
    assert.equal(call.prompt, 'Reply with OK.');
    assert.equal(call.env.DOCTOR_ACCOUNT_MARKER, 'synthetic-account');
    assert.equal(call.env.HOME, m.home);
    assert.equal(call.env.WORK, null);
    assert.equal(call.env.WORK_TOKEN, null);
    assert.ok(!call.args.some(arg => /^(--model(?:=|$)|-m$|model=|model_provider=|--resume$|resume$)/.test(arg)));
    if (harness === 'claude') {
      assert.ok(call.args.includes('--safe-mode'));
      assert.ok(!call.args.includes('--bare'));
      assert.ok(call.args.includes('--no-session-persistence'));
      assert.equal(call.args[call.args.indexOf('--max-turns') + 1], '1');
      assert.equal(call.args[call.args.indexOf('--tools') + 1], '');
      assert.equal(call.args[call.args.indexOf('--output-format') + 1], 'json');
    } else {
      for (const flag of ['exec', '--json', '--ephemeral', '--skip-git-repo-check']) assert.ok(call.args.includes(flag));
      const controls = call.args.join(' ');
      assert.match(controls, /read-only/);
      assert.match(controls, /never/);
      for (const control of ['hooks', 'shell', 'apps', 'multi_agent']) assert.match(controls, new RegExp(`${control}[^ ]*=false`), `missing disabled ${control} control`);
      for (const control of ['request_max_retries', 'stream_max_retries']) assert.match(controls, new RegExp(`${control}=0`));
    }
    expectRecord(result.report, 'accepted', harness);
    noteFree(result.report);
    checkAgreement(result);
  });

  test(`doctor models: ${harness} rejection leaves explicit alternatives eligible and hooks still run`, async t => {
    if (!await requireContainment(t)) return;
    const m = await testMachine(t, { [harness]: { model: 'rejected' } });
    await configure(m, harness, { PreToolUse: group(hook({ mode: 'deny' })) });
    const result = await m.run();
    expectRecord(result.report, 'refused', 'PreToolUse');
    assert.ok(matching(result.report, harness, /reject/).length, 'explicit default rejection has separate model evidence');
    assert.equal(result.report.canAttemptWork, true);
    assert.equal(result.report.tiers.diagnostic.cards[0].usable, true);
    assert.equal(m.invocations.length, 1);
    const text = checkAgreement(result);
    assert.match(text, /Default models/i);
    assert.match(text, /configured alternatives.*not tested/i);
    assert.ok(text.includes(`fixture-${harness}-card`));
    assert.equal(result.report.ok, false);
  });
}

test('doctor models: authentication, quota, transport, interference are not model rejection', async t => {
  if (!await requireContainment(t)) return;
  for (const outcome of ['authentication', 'quota', 'transport', 'interference']) {
    const m = await testMachine(t, { claude: { model: outcome } });
    const result = await m.run();
    assert.ok(matching(result.report, new RegExp(outcome)).length, `missing ${outcome} classification`);
    assert.ok(!records(result.report).some(r => /reject/.test(r.status)));
    noteFree(result.report);
    assert.equal(result.report.ok, false);
    assert.equal(m.invocations.length, 1);
    checkAgreement(result);
  }
});

test('doctor models: native credential writes stay contained and inconclusive', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t, { claude: { model: 'credential-write' } });
  const before = await homeSnapshot(m.home);
  const result = await m.run();
  hasUnknown(result.report);
  noteFree(result.report);
  assert.deepEqual(await homeSnapshot(m.home), before);
  assert.equal(result.report.ok, false);
});

test('doctor native pi: all four stateful scenarios expose blind/repeated writes', async t => {
  const m = await nativeMachine(t); if (!m) return;
  const path = await m.install('pi-stateful.ts');
  const before = await homeSnapshot(m.home);
  const result = await m.run();
  const refused = expectRecord(result.report, 'refused', path);
  assert.ok(refused.length >= 2, 'blind write and repeated write must each be observed');
  const evidence = matching(result.report, path);
  const cases = new Set(evidence.map(r => JSON.stringify(r.case ?? r.scenario)).filter(c => c !== undefined));
  assert.ok(cases.size >= 4, 'four independent scenarios, with case identities');
  expectRecord(result.report, 'passed', path, /bash/);
  expectRecord(result.report, 'passed', path, /read/);
  assert.ok(result.report.notes.length);
  assert.equal(result.report.ok, false);
  assert.deepEqual(await homeSnapshot(m.home), before);
  assert.ok(records(result.report).some(r => /model|default/i.test(r.context) && r.status !== 'accepted'), 'unavailable default must not hide extension checks');
});

test('doctor native pi: worker-guarded equivalent passes named cases', async t => {
  const m = await nativeMachine(t); if (!m) return;
  const path = await m.install('pi-stateful.ts');
  m.env.DOCTOR_FIXTURE_GUARDED = '1';
  const result = await m.run();
  noteFree(result.report);
  const evidence = expectRecord(result.report, 'passed', path);
  assert.ok(evidence.length >= 4);
  assert.ok(!matching(result.report, path).some(r => ['refused', 'unknown'].includes(r.status)));
});

test('doctor native pi: native short circuit attributes first blocker and marks later handler unreached', async t => {
  const m = await nativeMachine(t); if (!m) return;
  const path = await m.install('pi-two-blockers.ts');
  const result = await m.run();
  expectRecord(result.report, 'refused', path);
  const unreached = matching(result.report, path, /unreached/);
  assert.ok(unreached.length);
  assert.ok(unreached.every(r => r.status === 'unknown' || r.status === 'unreached'));
  assert.ok(!matching(result.report, path, /second blocker/).some(r => r.status === 'refused'), 'never force execution past a blocker');
});

test('doctor native pi: startup handlers and package re-export/filter provenance are visible', async t => {
  const late = await nativeMachine(t); if (!late) return;
  const path = await late.install('pi-late.ts');
  expectRecord((await late.run()).report, 'refused', path);
  const m = await nativeMachine(t);
  const pkg = join(m.root, 'native-package');
  await cp(join(fixture, 'package'), pkg, { recursive: true });
  m.settings.packages.push({ source: pkg, extensions: ['shim.ts'], skills: [], prompts: [], themes: [] });
  await m.saveSettings();
  const result = await m.run();
  expectRecord(result.report, 'refused', pkg, /shim/);
  assert.ok(!matching(result.report, /excluded\.ts/).some(r => r.status === 'refused' || r.status === 'unknown'));
});

test('doctor native pi: no handler, load error, missing package are never universal passes', async t => {
  const m = await nativeMachine(t); if (!m) return;
  const harmless = await m.install('pi-no-handler.ts');
  const noHandler = await m.run();
  assert.ok(matching(noHandler.report, harmless, /no.applicable.handler/i).length);
  noteFree(noHandler.report);
  const broken = await m.install('pi-load-error.ts');
  const failed = await m.run();
  expectRecord(failed.report, 'unknown', broken);
  assert.ok(!failed.stdout.includes(canary));
  noteFree(failed.report);
  await rm(broken);
  m.settings.packages.push('npm:@doctor-fixture/not-installed');
  await m.saveSettings();
  const missing = await m.run();
  expectRecord(missing.report, 'unknown', /not-installed/);
  noteFree(missing.report);
  assert.equal(missing.report.ok, false);
});

test('doctor native pi: rewritten arbitrary commands are never executed', async t => {
  const m = await nativeMachine(t); if (!m) return;
  const path = await m.install('pi-rewrite.ts');
  // Inside the overall fixture root, but outside doctor's scratch directory.
  m.env.DOCTOR_REWRITE_PATH = join(m.root, 'must-not-execute-rewrite');
  const result = await m.run();
  assert.ok(matching(result.report, path).length, 'native handler was inventoried');
  assert.equal(await access(m.env.DOCTOR_REWRITE_PATH).then(() => true, () => false), false);
});

for (const outcome of ['accepted', 'rejected', 'quota']) {
  test(`doctor native pi model: ${outcome}, one request independent of extensions`, async t => {
    const m = await nativeMachine(t); if (!m) return;
    const endpoint = await modelEndpoint(t, outcome);
    await writeFile(join(m.homes.pi, 'models.json'), JSON.stringify({ providers: { 'doctor-fixture': {
      baseUrl: endpoint.url, api: 'openai-completions', apiKey: 'synthetic-fixture-key', models: [{ id: 'fixture-default' }],
    } } }));
    m.settings.defaultProvider = 'doctor-fixture';
    m.settings.defaultModel = 'fixture-default';
    await m.saveSettings();
    await m.install('pi-model-trap.ts');
    const blocker = await m.install('pi-stateful.ts');
    const before = await homeSnapshot(m.home);
    const result = await m.run();
    expectRecord(result.report, 'refused', blocker);
    assert.equal(endpoint.requests.length, 1, 'four extension scenarios must make no provider calls; model probe must not retry');
    const request = endpoint.requests[0];
    assert.equal(request.body.model, 'fixture-default');
    assert.ok(!request.body.tools?.length);
    assert.equal(request.body.max_tokens ?? request.body.max_completion_tokens, 64);
    assert.equal(request.authorization, 'Bearer synthetic-fixture-key');
    assert.ok(request.body.messages.some(m => m.role === 'user' && m.content === 'Reply with OK.'));
    if (outcome === 'accepted') expectRecord(result.report, 'accepted', /pi/);
    else assert.ok(matching(result.report, /pi/, new RegExp(outcome === 'quota' ? 'quota' : 'reject')).length);
    assert.deepEqual(await homeSnapshot(m.home), before);
  });
}

test('doctor native pi: a complete clean preflight exits zero; fallback cannot certify a missing default', async t => {
  const m = await nativeMachine(t); if (!m) return;
  await rm(join(m.bin, 'claude'));
  const endpoint = await modelEndpoint(t);
  await writeFile(join(m.homes.pi, 'models.json'), JSON.stringify({ providers: { 'doctor-fixture': {
    baseUrl: endpoint.url, api: 'openai-completions', apiKey: 'synthetic-fixture-key', models: [{ id: 'fixture-default' }],
  } } }));
  await writeFile(m.env.PI_DURABLE_PRESCRIPTIONS, JSON.stringify({ tiers: { diagnostic: [{ harness: 'pi', provider: 'doctor-fixture',
    account: 'synthetic-account', model: 'fixture-default', effort: 'low' }] }, jobs: { verify: { tier: 'diagnostic', access: 'run' } } }));
  m.settings.defaultProvider = 'doctor-fixture';
  m.settings.defaultModel = 'fixture-default';
  await m.saveSettings();
  const clean = await m.run();
  assert.equal(endpoint.requests.length, 1);
  assert.equal(clean.report.canAttemptWork, true);
  assert.deepEqual(clean.report.problems, []);
  noteFree(clean.report);
  assert.ok(!records(clean.report).some(r => ['unknown', 'refused'].includes(r.status)));
  assert.equal(clean.report.ok, true);
  assert.equal(clean.code, 0);
  checkAgreement(clean);

  m.settings.defaultModel = 'fixture-missing-default';
  await m.saveSettings();
  const fallback = await m.run();
  assert.equal(fallback.report.ok, false, 'a fallback or no selection cannot prove the configured default works');
  assert.equal(fallback.code, 1);
  assert.equal(fallback.report.canAttemptWork, true);
  assert.ok(matching(fallback.report, /fixture-missing-default/).length, 'configured default remains visible');
  if (endpoint.requests.length === 2) {
    assert.equal(endpoint.requests[1].body.model, 'fixture-default');
    assert.ok(matching(fallback.report, /fallback/i).length, 'native fallback must be explicitly recorded');
  } else assert.equal(endpoint.requests.length, 1, 'no retry or alternative benchmark');
  checkAgreement(fallback);
});

test('doctor models: alternatives follow custom prescriptions, preserving tier/provider order', async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t, { claude: { model: 'rejected' } });
  const card = model => ({ harness: 'claude', provider: 'anthropic', model, account: 'synthetic-account', effort: 'low' });
  await writeFile(m.env.PI_DURABLE_PRESCRIPTIONS, JSON.stringify({ tiers: {
    first: [card('fixture-first'), card('fixture-second')], second: [card('fixture-third')],
  }, jobs: { plan: { tier: 'first', access: 'read' }, verify: { tier: 'second', access: 'run' } } }));
  const result = await m.run();
  const text = checkAgreement(result);
  assert.ok(text.indexOf('fixture-first') < text.indexOf('fixture-second'));
  assert.ok(text.indexOf('fixture-second') < text.indexOf('fixture-third'));
  assert.match(text, /configured alternatives.*not tested/i);
  assert.equal(m.invocations.length, 1);
  assert.equal(result.report.canAttemptWork, true);
});

test('doctor report: actual JSON and text CLI exit statuses agree for incomplete checks', async t => {
  const m = await testMachine(t);
  await configure(m, 'claude', { PreToolUse: group(hook({ mode: 'deny' }), '^NoCatalogueCase$') });
  const result = await m.run();
  const text = await runCli(['doctor'], m.env, { cwd: m.root });
  assert.equal(result.report.ok, false);
  assert.equal(result.code, 1);
  assert.equal(text.code, 1);
  assert.match(text.stdout, /Unknown/i);
  assert.doesNotMatch(text.stdout, /^Check:/m);
  assert.match(text.stdout, /configured candidates/i);
  assert.doesNotMatch(text.stdout, /Every job has a card that can run here/);
});
