// An accepted hand-off is the step's complete deliverable, never a delta report; the verify packet names its tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, chmod, rm } from 'node:fs/promises';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, isAbsolute } from 'node:path';
import { drive } from '../drive.mjs';
import { restatePrompt } from '../work.mjs';
import { checkDeliverable, LABELS, FORMAT } from '../deliverable.mjs';
import { run, setup, quiet, calls, stepExchanges, waitFor, runCli, fake } from './drive-helpers.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/thread7-rewind.json', import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const packetOf = a => JSON.parse(a.packet);
// A hand-off refusal opens the receiving step's own exchange early, naming the refused attempt.
const refusals = w => w.exchanges.filter(x => x.subject?.kind === 'step' && x.subject.id);

const PLAN_FULL = 'Cassiopeia done\nMaking: it\nNot making: nothing else\nDone when: the checks pass\nWaits on: nothing';
const FULL = 'Orion done\n{"testPlan":{"scripts":[{"path":"checks/t1.sh","command":"sh checks/t1.sh","pass":"exit 0"}],"evidence":"stdout"}}';
const IMPL_FULL = 'Sirius done\nChanged paths: src/parser.js\nChecks run: none\nOpen items: none';
const DELTA = 'Orion done\nI changed only checks/t1.sh; the rest of the plan is as before.';
const testRuling = { cause: 'test', answer: 'Test t1 asserts the wrong value; fix it.', evidence: 'spec says ok' };

// A verify packet names every script of the accepted test plan it runs: real files, hashed when the plan was accepted.
function assertNamesScripts(w, verify) {
  const tp = packetOf(verify).testPlan;
  assert.ok(tp, `verify round ${verify.round}: the packet carries testPlan`);
  assert.ok(tp.scripts.length > 0, 'at least one script');
  for (const s of tp.scripts) {
    assert.ok(isAbsolute(s.path), `${s.path} is absolute`);
    assert.ok(statSync(s.path).isFile(), `${s.path} exists`);
    assert.equal(s.sha256, sha(s.path), `${s.path} is unchanged since its plan was accepted`);
    assert.ok(s.command.trim() && s.pass.trim(), 'each script has its command and PASS meaning');
  }
  const source = w.attempts.find(a => a.id === tp.attemptId);
  assert.equal(source?.step, 'test-plan');
  assert.equal(source.status, 'accepted');
  assert.equal(tp.round, source.round);
  assert.deepEqual(tp.scripts, source.testPlan.scripts);
  assert.equal(tp.evidence, source.testPlan.evidence);
  return tp;
}

test('handoff: plan and implement labels are found as headings, bold or plain, with or without a colon; a missing label is named', () => {
  const cwd = tmpdir();
  assert.deepEqual(LABELS, { plan: ['Making', 'Not making', 'Done when', 'Waits on'], implement: ['Changed paths', 'Checks run', 'Open items'] });
  assert.equal(FORMAT.plan, 'Label its parts at the start of a line: Making, Not making, Done when, Waits on.');
  assert.equal(FORMAT.implement, 'Label its parts at the start of a line: Changed paths (every path changed for this work unit, across all rounds), Checks run, Open items.');
  assert.equal(FORMAT['test-plan'], 'End with ONLY a JSON object on its own: {"testPlan":{"scripts":[{"path":string,"command":string,"pass":string}],"evidence":string}}. path: relative to the workspace or absolute; every file must exist. command: run from the workspace. pass: what a passing run shows. evidence: where results land.');

  const headings = '# Plan\n## Making\na parser\n**Not making:** a CLI\nDone when: npm test is green\n### __Waits on__\nnothing';
  assert.deepEqual(checkDeliverable('plan', headings, cwd).missing, []);
  const plain = 'making: x\nNOT MAKING x\n  ## Done when\n_Waits on_: y';
  assert.deepEqual(checkDeliverable('plan', plain, cwd).missing, [], 'any case, leading space, emphasis, no colon');
  assert.deepEqual(checkDeliverable('plan', 'Not making: a CLI\nDone when: green\nWaits on: nothing\nWe are Making progress', cwd).missing, ['Making'],
    '"Not making" and a mid-line word are not the Making label');
  assert.deepEqual(checkDeliverable('plan', 'Makings: x\nNot making\nDone when\nWaits on', cwd).missing, ['Making'], 'a longer word is not the label');
  assert.deepEqual(checkDeliverable('plan', 'Same as before; I changed step 3 only.', cwd).missing, LABELS.plan, 'every missing label is named');

  assert.deepEqual(checkDeliverable('implement', IMPL_FULL, cwd).missing, []);
  assert.deepEqual(checkDeliverable('implement', '## Changed paths\n- src/a.js\n**Checks run**: npm test', cwd).missing, ['Open items']);
  assert.deepEqual(checkDeliverable('implement', 'Sirius done\nI fixed the parser.', cwd).missing, LABELS.implement);

  for (const step of ['discover', 'ideate', 'challenge', 'verify']) assert.deepEqual(checkDeliverable(step, 'anything', cwd), { missing: [] }, `${step} has no required parts`);
});

test('handoff: a test plan needs its JSON ending with existing script paths, relative or absolute; "same as before" is refused', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mpd-plan-')), cwd = join(root, 'ws'), packet = join(root, 'packet', 'tests');
  try {
    await mkdir(join(cwd, 'checks'), { recursive: true }); await mkdir(packet, { recursive: true });
    await writeFile(join(cwd, 'checks', 't1.sh'), '#!/bin/sh\nexit 0\n');
    await writeFile(join(packet, 't2.sh'), '#!/bin/sh\necho ok\n');
    const plan = (scripts, evidence = 'stdout') => `Orion plan\n${JSON.stringify({ testPlan: { scripts, evidence } })}`;
    const t1 = { path: 'checks/t1.sh', command: 'sh checks/t1.sh', pass: 'exit 0' }, t2 = { path: join(packet, 't2.sh'), command: `sh ${join(packet, 't2.sh')}`, pass: 'prints ok' };

    const ok = checkDeliverable('test-plan', plan([t1, t2]), cwd);
    assert.deepEqual(ok.missing, []);
    assert.deepEqual(ok.testPlan, { evidence: 'stdout', scripts: [
      { path: resolve(cwd, 'checks/t1.sh'), command: t1.command, pass: t1.pass, sha256: sha(join(cwd, 'checks', 't1.sh')) },
      { path: t2.path, command: t2.command, pass: t2.pass, sha256: sha(t2.path) },
    ] }, 'paths become absolute and each script is hashed');

    const refused = text => checkDeliverable('test-plan', text, cwd);
    assert.deepEqual(refused('Same as before; I changed only checks/t1.sh.').missing, ['the testPlan JSON ending']);
    assert.equal(refused('Same as before.').testPlan, undefined);
    assert.deepEqual(refused('Orion stopped\n{"blocked":"no shell"}').missing, ['the testPlan JSON ending']);
    assert.deepEqual(refused(plan([])).missing, ['testPlan.scripts: at least one script']);
    const partial = refused(plan([{ path: 'checks/t1.sh', pass: ' ' }])).missing;
    assert.ok(partial.includes('testPlan.scripts[0].command') && partial.includes('testPlan.scripts[0].pass'), partial.join(' | '));
    assert.ok(refused(plan([t1, { ...t1, path: 'nope.sh' }])).missing.some(m => /^testPlan\.scripts\[1\]\.path does not exist: .*nope\.sh$/.test(m)));
    assert.ok(refused(plan([{ ...t1, path: 'checks' }])).missing.some(m => /^testPlan\.scripts\[0\]\.path does not exist: .*checks$/.test(m)), 'a folder is not a script');
    assert.ok(refused(plan([t1], ' ')).missing.some(m => /evidence/.test(m)));

    // Thread 7's real reports: each delta after a test rewind is refused; the full plan with its scripts is not.
    for (const r of fixture.rewinds) {
      assert.ok(refused(r.delta).missing.includes('the testPlan JSON ending'), `thread 7 round ${r.threadRounds[1]} delta`);
      const scripts = join(root, `scripts-${r.threadRounds[0]}`);
      await mkdir(scripts);
      for (const s of r.scripts) await writeFile(join(scripts, s.name), '#!/bin/sh\nexit 0\n');
      const full = checkDeliverable('test-plan', r.fullPlan.replaceAll('{{scripts}}', scripts), cwd);
      assert.deepEqual(full.missing, []);
      assert.deepEqual(full.testPlan.scripts.map(s => [s.path, s.command, s.pass]), r.scripts.map(s => [join(scripts, s.name), s.command, s.pass]));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('handoff: thread 7 replay: each delta after a test rewind is refused as the receiver\'s question, restated in full, and every verify packet names the scripts', async () => {
  assert.ok(fixture.rewinds.length === 2 || fixture.provenance.gap, 'both rewinds are replayed, or the fixture says what it could not source');
  assert.ok(fixture.rewinds.length >= 1, 'at least one rewind to replay');
  const scripts = await mkdtemp(join(tmpdir(), 'mpd-scripts-'));
  try {
    for (const name of new Set(fixture.rewinds.flatMap(r => r.scripts.map(s => s.name)))) {
      await writeFile(join(scripts, name), '#!/bin/sh\nexit 0\n'); await chmod(join(scripts, name), 0o755);
    }
    const rooted = r => r.fullPlan.replaceAll('{{scripts}}', scripts);
    // Per rewind: the full plan is accepted, the check fails and is ruled "test", the delta comes back and is refused, the full plan is restated.
    const scenario = {
      'out:Orion': fixture.rewinds.flatMap(r => [rooted(r), r.delta, rooted(r)]),
      verify: [...fixture.rewinds.flatMap((r, i) => i === 0 ? ['fail'] : ['fail', 'fail']), 'pass'],
      arbiter: fixture.rewinds.flatMap((r, i) => i === 0 ? [r.ruling] : [r.ruling, r.ruling]),
    };
    await run(scenario, async ({ store, cwd, log }) => {
      const id = await store.create('Replay thread 7 rounds 3-4 and 6-7', 'source', cwd, { delivery: true });
      const result = await drive(store, id, quiet);
      assert.equal(result.status, 'complete', JSON.stringify(result));
      const w = await store.get(id), verifies = w.attempts.filter(a => a.step === 'verify');
      assert.equal(verifies.length, scenario.verify.length);
      for (const r of fixture.rewinds) {
        const restated = w.attempts.filter(a => a.step === 'test-plan' && (a.revisions ?? []).some(v => v.output === r.delta));
        assert.equal(restated.length, 1, `round ${r.threadRounds[1]}: the delta was refused at hand-off`);
        const [a] = restated;
        assert.deepEqual(a.revisions.map(v => v.output), [r.delta]);
        assert.ok(a.revisions[0].missing.includes('the testPlan JSON ending'));
        assert.equal(a.status, 'accepted');
        assert.equal(a.output, rooted(r), 'the restated full plan is the hand-off, not the delta');
        const rx = refusals(w).filter(x => x.subject.id === a.id);
        assert.equal(rx.length, 1, 'one exchange per refused hand-off');
        assert.deepEqual([rx[0].step, rx[0].round, rx[0].originator], ['implement', a.round, 'Orion']);
        assert.match(rx[0].worker, /^Sirius-/, 'the receiving step asks');
        assert.ok(rx[0].turns[0].questions.length > 0, 'the refusal is a question');
        assert.equal(w.attempts.find(i => i.step === 'implement' && i.round === a.round).actor, rx[0].worker, 'the receiver executes under the same exchange');
        const v = verifies.find(v => packetOf(v).testPlan?.attemptId === a.id);
        assert.ok(v, 'a verify ran on the restated plan');
        assert.deepEqual(packetOf(v).testPlan.scripts.map(s => [s.path, s.command, s.pass]), r.scripts.map(s => [join(scripts, s.name), s.command, s.pass]));
      }
      for (const v of verifies) {
        assertNamesScripts(w, v);
        const handed = packetOf(v).accepted.find(c => c.step === 'test-plan').output;
        assert.match(handed, /"testPlan"/);
        assert.ok(fixture.rewinds.every(r => handed !== r.delta), 'no verify packet hands over a delta');
      }
      assert.equal(w.events.filter(e => e.type === 'handoff-refused').length, fixture.rewinds.length);
      assert.equal(calls(log, 'refusal').length, fixture.rewinds.length);
      assert.equal(calls(log, 'Orion').filter(c => c.restate).length, fixture.rewinds.length);
      for (const c of calls(log, 'arbiter')) assert.ok(JSON.parse(c.prompt).testScripts?.scripts?.length > 0, 'the Arbiter sees the scripts too');
      assert.match(w.briefs.verify.text, /testPlan\.scripts/);
      assert.match(w.briefs.verify.text, /sha256/);
    });
  } finally { await rm(scripts, { recursive: true, force: true }); }
});

test('handoff: refusal and the receiving step\'s intake share one exchange and one three-turn count; deltas past three turns hold naming Orion and Sirius', async () => {
  // One refusal, then the receiver's own intake questions: the restate was the first answered turn, so the third intake question holds.
  await run({ 'out:Orion': [DELTA, FULL], intakeQuestions: [null, null, null, null, null, 'Which runner?', 'Which folder?', 'Which shell?'] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const w = await store.get(id), [rx] = refusals(w);
    assert.equal(refusals(w).length, 1);
    assert.equal(stepExchanges(w).filter(x => x.step === 'implement').length, 1, 'no second exchange for the receiving step');
    assert.equal(w.hold.ref, rx.id);
    assert.equal(rx.rounds, 3);
    assert.deepEqual(rx.turns.map(t => t.type), ['worker', 'originator', 'worker', 'originator', 'worker', 'originator', 'worker']);
    assert.equal(calls(log, 'originator').length, 2, 'two intake answers after the restate make three turns');
    assert.match(w.hold.reason, /questions remain after three turns on the handoff from Orion/);
    assert.equal(w.attempts.filter(a => a.step === 'implement').length, 0, 'nothing executed');
  });

  // Deltas forever: three restates, then the fourth refusal holds for the human.
  await run({ 'out:Orion': [DELTA] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const w = await store.get(id), [rx] = refusals(w);
    assert.equal(refusals(w).length, 1, 'every refusal of this hand-off is one exchange');
    assert.equal(rx.rounds, 3);
    assert.equal(w.hold.kind, 'nq');
    assert.equal(w.hold.ref, rx.id);
    assert.equal(w.hold.originator, 'Orion');
    assert.match(w.hold.receiver, /^Sirius-/);
    assert.match(w.hold.reason, /^implement: questions remain after three turns on the handoff from Orion/);
    assert.equal(calls(log, 'Orion').length, 4);
    assert.equal(calls(log, 'Orion').filter(c => c.restate).length, 3);
    assert.equal(calls(log, 'refusal').length, 4);
    const plans = w.attempts.filter(a => a.step === 'test-plan');
    assert.equal(plans.length, 1, 'the step is never re-run');
    assert.equal(plans[0].status, 'reported');
    assert.equal(plans[0].revisions.length, 3);
    assert.equal((await drive(store, id, quiet)).status, 'held', 'driving again does not bypass the hold');
    assert.equal(calls(log, 'Orion').length, 4);
  });

  // Each reporting step's refusal is its receiver's exchange, and the receiver executes under it.
  const cases = [
    ['plan', 'Cassiopeia', 'Cassiopeia done\nI changed step 3 only.', PLAN_FULL, 'test-plan', 'Orion', LABELS.plan],
    ['test-plan', 'Orion', DELTA, FULL, 'implement', 'Sirius', ['the testPlan JSON ending']],
    ['implement', 'Sirius', 'Sirius done\nI fixed the parser as before.', IMPL_FULL, 'verify', 'Aldebaran', LABELS.implement],
  ];
  for (const [step, role, delta, full, next, receiver, missing] of cases) {
    await run({ [`out:${role}`]: [delta, full] }, async ({ store, cwd }) => {
      const id = await store.create('Build it', 'source', cwd, { delivery: true });
      assert.equal((await drive(store, id, quiet)).status, 'complete', step);
      const w = await store.get(id), a = w.attempts.find(a => a.step === step);
      assert.equal(a.output, full);
      assert.deepEqual(a.revisions.map(v => [v.output, v.missing]), [[delta, missing]]);
      const rx = refusals(w);
      assert.equal(rx.length, 1);
      assert.deepEqual([rx[0].subject.id, rx[0].step, rx[0].originator], [a.id, next, role]);
      assert.match(rx[0].worker, new RegExp(`^${receiver}-`));
      assert.equal(stepExchanges(w).filter(x => x.step === next).length, 1);
      assert.deepEqual(rx[0].turns.map(t => t.type), ['worker', 'originator', 'worker']);
      assert.equal(rx[0].turns.at(-1).clear, true);
      assert.equal(w.attempts.find(b => b.step === next).actor, rx[0].worker);
    });
  }
});

test('handoff: the restate continues the same session read-only and never re-runs the step; a session that cannot continue gets the restate prompt with its report', async () => {
  await run({ 'out:Orion': [DELTA, FULL] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'complete');
    const [first, again, ...more] = calls(log, 'Orion');
    assert.equal(more.length, 0);
    assert.deepEqual([first.restate, again.restate], [false, true]);
    assert.equal(again.sessionId, first.sessionId, 'the same session continues');
    assert.ok(first.tools.split(',').includes('write'));
    assert.ok(!again.tools.split(',').some(t => ['write', 'edit'].includes(t)), 'the restate runs read-only');
    assert.equal(again.continued, false);
    assert.match(again.prompt, /^Your report was refused at hand-off: it lacks required parts \(the testPlan JSON ending\)\./);
    assert.match(again.prompt, /The receiving step asks:\n- Restate it with the testPlan JSON ending/);
    assert.match(again.prompt, /Do not run, write or change anything: reply only\./);
    assert.ok(again.prompt.includes(FORMAT['test-plan']));
    assert.doesNotMatch(again.prompt, /Your refused report:/, 'a continuing session already has its report');
    assert.doesNotMatch(again.prompt, /"purpose"/, 'the restate is not the step\'s packet');
    const w = await store.get(id), plans = w.attempts.filter(a => a.step === 'test-plan');
    assert.equal(plans.length, 1, 'one attempt: the step is not re-run');
    assert.equal(plans[0].launches, 2);
    assert.equal(plans[0].access, 'checks', 'the step keeps its own access');
    assert.equal(plans[0].askRestate, null);
    assert.equal(w.events.filter(e => e.type === 'restate-asked').length, 1);
  });

  const ask = { exchangeId: 'x', questions: ['Which scripts?'], human: null, missing: ['the testPlan JSON ending'] };
  const cold = restatePrompt('test-plan', ask, { continuing: false, output: DELTA });
  assert.match(cold, /^Your report was refused at hand-off: it lacks required parts \(the testPlan JSON ending\)\./);
  assert.match(cold, /The receiving step asks:\n- Which scripts\?/);
  assert.ok(cold.includes('Do not run, write or change anything: reply only. Restate your complete deliverable in full, with the changes you already made applied, never a report of what changed.'));
  assert.ok(cold.includes(FORMAT['test-plan']));
  assert.ok(cold.endsWith(`\n\nYour refused report:\n${DELTA}`), 'a fresh session gets its refused report');
  const warm = restatePrompt('test-plan', ask, { continuing: true, output: DELTA });
  assert.ok(!warm.includes('Your refused report:') && !warm.includes(DELTA));
  const human = restatePrompt('implement', { ...ask, questions: [], human: 'List every changed path.', missing: ['Changed paths', 'Open items'] }, { continuing: false, output: 'Sirius done' });
  assert.match(human, /^Your report was refused at hand-off: it lacks required parts \(Changed paths; Open items\)\./);
  assert.match(human, /The operator answered: List every changed path\./);
  assert.doesNotMatch(human, /The receiving step asks/);
  assert.ok(human.includes(FORMAT.implement));
});

test('handoff: a rewound step\'s packet carries its own previous accepted deliverable', async () => {
  await run({ verify: ['fail', 'pass'], arbiter: [testRuling] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'complete');
    const w = await store.get(id), at = (step, round) => w.attempts.find(a => a.step === step && a.round === round);
    for (const step of ['test-plan', 'implement']) {
      const p = packetOf(at(step, 1));
      assert.deepEqual(p.previous, { round: 0, output: at(step, 0).output }, `${step} round 1`);
      assert.match(p.instruction, /Your previous accepted deliverable is in "previous"/);
      assert.equal(packetOf(at(step, 0)).previous, undefined, `${step} round 0 has nothing before it`);
    }
    assert.equal(packetOf(at('verify', 1)).previous, undefined, 'verify has no deliverable to restate');
    // What the worker reads: its previous deliverable as a file.
    const [r0, r1] = calls(log, 'Orion').map(c => JSON.parse(c.prompt));
    assert.equal(r0.previous, undefined);
    assert.equal(r1.previousRound, 0);
    assert.equal(readFileSync(r1.previous, 'utf8'), at('test-plan', 0).output);
    assert.match(r1.read, /previous/);
    const briefs = [...w.briefHistory, ...Object.entries(w.briefs).map(([step, b]) => ({ step, ...b }))];
    for (const step of ['plan', 'test-plan', 'implement']) {
      const text = briefs.find(b => b.step === step).text;
      assert.ok(text.includes(`Your answer is your complete current deliverable every time, never a report of what changed: if your packet has a previous deliverable, restate it in full with the changes applied. ${FORMAT[step]}`), step);
    }
    assert.match(briefs.find(b => b.step === 'test-plan').text, /files in the workspace, or at absolute paths outside it such as your packet folder; list every one/);
  });
  await run({ verify: ['fail', 'pass'], arbiter: [{ cause: 'implementation', answer: 'The parser drops the last field.', evidence: 'x' }] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'complete');
    const w = await store.get(id), plans = w.attempts.filter(a => a.step === 'plan');
    assert.deepEqual(packetOf(plans[1]).previous, { round: 0, output: plans[0].output });
    const sent = JSON.parse(calls(log, 'Cassiopeia').at(-1).prompt);
    assert.equal(readFileSync(sent.previous, 'utf8'), plans[0].output);
  });
});

test('handoff: a blocked report goes to the Arbiter before any section check', async () => {
  for (const [role, step] of [['Orion', 'test-plan'], ['Sirius', 'implement']]) {
    await run({ blockedOnce: { [role]: 1 }, arbiter: [{ cause: 'pre-existing', answer: 'fix the test script', evidence: 'first commit' }] }, async ({ store, cwd, log }) => {
      const id = await store.create('Build it', 'source', cwd, { delivery: true });
      assert.equal((await drive(store, id, quiet)).status, 'complete');
      const w = await store.get(id);
      assert.equal(w.failures[0].step, step);
      assert.match(w.failures[0].report, /could not do the step as written: npm test cannot load the test folder/);
      assert.ok(!(w.attempts.find(a => a.status === 'blocked').revisions?.length), 'a blocked report is not asked to restate');
      for (const tid of await store.list()) {
        const t = await store.get(tid);
        assert.ok(stepExchanges(t).every(x => x.subject?.id === undefined), `${role}: no hand-off refusal was opened`);
        assert.equal(t.events.filter(e => e.type === 'handoff-refused').length, 0);
      }
      assert.equal(calls(log, 'refusal').length, 0);
    });
  }
});

test('handoff: a human answer on a refusal hold goes to the reporting worker as a restate, and the receiver still confirms', async () => {
  const answer = 'Write the whole plan: every script with its command and PASS meaning, ending in the testPlan JSON.';
  await run({ 'out:Orion': [DELTA, DELTA, DELTA, DELTA, FULL] }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const held = await store.get(id), [rx] = refusals(held);
    assert.equal(held.hold.ref, rx.id);
    await store.human(id, { text: answer });
    assert.equal((await drive(store, id, quiet)).status, 'complete');
    const w = await store.get(id), x = refusals(w)[0];
    const orion = calls(log, 'Orion'), last = orion.at(-1);
    assert.equal(orion.length, 5);
    assert.equal(last.restate, true, 'the human answer goes to the reporting worker');
    assert.ok(last.prompt.includes(`The operator answered: ${answer}`));
    assert.doesNotMatch(last.prompt, /The receiving step asks/);
    assert.equal(calls(log, 'originator').length, 0, 'nobody answers in the operator\'s place');
    assert.equal(calls(log, 'refusal').length, 4, 'the restated plan passed: no further refusal');
    assert.deepEqual(x.turns.slice(-2).map(t => t.type), ['human', 'worker']);
    assert.equal(x.turns.at(-1).intent, 'understood', 'the receiver\'s own intake confirms');
    assert.equal(x.turns.at(-1).clear, true);
    assert.equal(x.status, 'clear');
    const plan = w.attempts.find(a => a.step === 'test-plan');
    assert.deepEqual([plan.status, plan.output, plan.revisions.length], ['accepted', FULL, 4]);
    assert.equal(w.attempts.find(a => a.step === 'implement').actor, x.worker);
    assert.equal(w.completion, 'verified');
  });
});

test('handoff: scratch unit through the CLI: test-plan → verify → test ruling → test-plan → verify; both verify packets carry the full plan and the script paths', async () => {
  const s = await setup({ verify: ['fail', 'pass'], arbiter: [testRuling], 'out:Orion': [FULL, DELTA, FULL] });
  const env = { ...process.env, WORK_DATA: s.dir, PI_DURABLE_PI: fake, FAKE_PI_STATE: s.state, PI_DURABLE_PRESCRIPTIONS: process.env.PI_DURABLE_PRESCRIPTIONS, PI_DURABLE_ALERT: 'none' };
  try {
    const started = await runCli(['start', '--objective', 'Scratch unit', '--source', 'Write a parser with its checks.', '--workspace', s.cwd, '--delivery'], env);
    assert.equal(started.code, 0, started.stderr);
    const { id } = JSON.parse(started.stdout);
    const exported = join(s.dir, 'exports', `thread-${id}.json`);
    const w = await waitFor(async () => { try { return JSON.parse(await readFile(exported, 'utf8')); } catch { return null; } }, 120_000, 'the unit to finish');
    await waitFor(() => !existsSync(join(s.dir, 'owner.lock')), 30_000, 'the driver to release the store');
    assert.equal(w.completion, 'verified', JSON.stringify(w.hold ?? w.events.at(-1)));
    assert.equal(w.failures[0].ruling.cause, 'test');
    const path = w.attempts.filter(a => ['test-plan', 'verify'].includes(a.step));
    assert.deepEqual(path.map(a => [a.step, a.round, a.status]), [['test-plan', 0, 'accepted'], ['verify', 0, 'failed-test'], ['test-plan', 1, 'accepted'], ['verify', 1, 'accepted']]);
    assert.deepEqual(path[2].revisions.map(v => v.output), [DELTA], 'the delta was refused');
    assert.equal(path[2].output, FULL);
    for (const v of path.filter(a => a.step === 'verify')) {
      const tp = assertNamesScripts(w, v);
      assert.equal(tp.attemptId, path.find(a => a.step === 'test-plan' && a.round === v.round).id);
      assert.deepEqual(tp.scripts.map(s => s.path), [join(w.cwd, 'checks', 't1.sh')]);
      const folder = join(s.dir, 'packets', v.id), files = (await readdir(folder)).filter(f => /^ACCEPTED-\d+-test-plan\.md$/.test(f));
      assert.equal(files.length, 1, `verify round ${v.round}: one accepted test plan in its packet folder`);
      const text = await readFile(join(folder, files[0]), 'utf8');
      assert.ok(text.includes('"testPlan"'), 'the full plan');
      assert.notEqual(text, DELTA);
    }
  } finally { await rm(s.root, { recursive: true, force: true }); }
});
