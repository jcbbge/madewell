import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, chmod, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openStore, STEPS } from '../work.mjs';
import { drive } from '../drive.mjs';

const fake = fileURLToPath(new URL('./fake-pi.mjs', import.meta.url));
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
await chmod(fake, 0o755);

async function setup(scenario = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mpd-')), dir = join(root, 'store'), cwd = join(root, 'ws'), state = join(root, 'fake.json');
  await mkdir(cwd);
  await writeFile(state, JSON.stringify(scenario));
  process.env.PI_DURABLE_PI = fake; process.env.FAKE_PI_STATE = state;
  process.env.PI_DURABLE_PRESCRIPTIONS = fileURLToPath(new URL('./fixtures/two-accounts.json', import.meta.url));
  const log = () => readFileSync(state + '.log', 'utf8').trim().split('\n').map(l => JSON.parse(l));
  return { root, dir, cwd, state, log };
}
const quiet = { log: () => {} };
async function run(t, scenario, fn) {
  const s = await setup(scenario);
  const store = await openStore(s.dir, { resume: true });
  try { await fn({ ...s, store }); } finally { await store.close(); }
}

test('happy path: seven phases, seven different agents, handoff is acceptance', t => run(t, {}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const result = await drive(store, id, quiet);
  assert.equal(result.status, 'complete');
  const w = await store.get(id);
  assert.equal(w.completion, 'verified');
  assert.deepEqual(w.attempts.map(a => a.step), STEPS.map(s => s.name));
  assert.ok(w.attempts.every(a => a.status === 'accepted'));
  assert.equal(new Set(w.attempts.map(a => a.actor)).size, STEPS.length);
  assert.ok(log().every(c => c.worker === '1'), 'every pi process is marked as a worker');
  assert.equal(log().find(c => c.role === 'Orion').tools, 'read,grep,find,ls,bash,write,edit,durable_progress',
    'test author can record the NOW step required by the write guard and demonstrate a red run');
  assert.equal(log().find(c => c.role === 'Sirius').tools, null, 'implementer gets the full pi toolset');
  assert.equal(log().find(c => c.role === 'Aldebaran').tools, 'read,grep,find,ls,bash,durable_progress');
  const impl = w.attempts.find(a => a.step === 'implement');
  assert.deepEqual(impl.progress.map(p => p.deliverable), ['parser'], 'deliverables land on the work record');
  assert.equal(impl.runs.length, 1);
  assert.ok(impl.runs[0].pid > 0 && impl.runs[0].endedAt >= impl.runs[0].startedAt, 'each launch is timed');
  const calls = w.events.filter(e => e.type === 'call');
  assert.equal(calls.filter(c => c.kind === 'intake').length, STEPS.length, 'every intake call is on the timeline');
  assert.ok(calls.every(c => c.ok && c.ms >= 0));
}));

test('discovery never authorizes delivery', t => run(t, {}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd);
  assert.equal((await drive(store, id, quiet)).status, 'delivery-authorization-required');
  assert.equal((await store.get(id)).position, 1);
  assert.equal((await drive(store, id, { ...quiet, delivery: true })).status, 'complete');
  assert.equal((await store.get(id)).delivery, true, 'authorization is recorded on the work');
}));

test('failed test → Arbiter rules "test" → the test architect answers, then tests re-run', t => run(t, {
  verify: ['fail', 'pass'], arbiter: [{ cause: 'test', answer: 'Test t1 asserts the wrong value; fix it.', evidence: 'spec says ok' }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id);
  assert.equal(w.failures.length, 1);
  assert.equal(w.failures[0].ruling.cause, 'test');
  assert.equal(w.round, 1);
  assert.deepEqual(w.attempts.filter(a => a.round === 1).map(a => a.step), ['test-plan', 'implement', 'verify']);
  assert.equal(w.notes[0].to, 'Orion');
  assert.equal(log().filter(c => c.role === 'Cassiopeia').length, 1, 'plan is not redone for a bad test');
}));

test('failed test → Arbiter rules "implementation" → back to planning', t => run(t, {
  verify: ['fail', 'pass'], arbiter: [{ cause: 'implementation', answer: 'The parser drops the last field.', evidence: 'x' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id);
  assert.deepEqual(w.attempts.filter(a => a.round === 1).map(a => a.step), ['plan', 'test-plan', 'implement', 'verify']);
  assert.equal(w.notes[0].to, 'Cassiopeia');
}));

test('failed test → Arbiter rules "pre-existing" → linked prerequisite thread, then original tests re-run', t => run(t, {
  verify: ['fail', 'pass', 'pass'], arbiter: [{ cause: 'pre-existing', answer: 'The date util was already broken.', evidence: 'git blame' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), child = await store.get(w.failures[0].prerequisite);
  assert.equal(child.parentId, id);
  assert.equal(child.completion, 'verified');
  assert.deepEqual(child.attempts.map(a => a.step), ['plan', 'test-plan', 'implement', 'verify']);
  assert.equal(w.waitsOn, null);
  assert.deepEqual(w.attempts.filter(a => a.round === 1).map(a => a.step), ['verify'], 'original work is not rebuilt');
}));

test('Arbiter cannot decide → human hold; the human names the cause and work continues', t => run(t, {
  verify: ['fail', 'pass'], arbiter: [{ cause: 'undetermined', answer: 'Could be the test or the fixture.', evidence: '' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const held = await drive(store, id, quiet);
  assert.equal(held.status, 'held');
  assert.equal((await store.get(id)).hold.kind, 'failure');
  await assert.rejects(store.human(id, { text: 'it is the test' }), /needs the cause/);
  await store.human(id, { text: 'The fixture is stale; regenerate it.', cause: 'test' });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  assert.equal((await store.get(id)).failures[0].ruling.by, 'operator');
}));

test('three corrections still failing → human hold', t => run(t, {
  verify: ['fail', 'fail', 'fail', 'fail'], arbiter: [{ cause: 'test', answer: 'fix the test', evidence: '' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const result = await drive(store, id, quiet);
  assert.equal(result.status, 'held');
  const w = await store.get(id);
  assert.equal(w.failures.length, 4);
  assert.match(w.hold.reason, /after 3 corrections/);
}));

test('NQ: questions get originator answers', t => run(t, {
  intakeQuestions: ['Which database?', null],
  originator: [{ answer: 'Postgres, per the source.', unresolvedAuthority: false }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd);
  await drive(store, id, quiet);
  const x = (await store.get(id)).exchanges[0];
  assert.deepEqual(x.turns.map(t => t.type), ['worker', 'originator', 'worker']);
  assert.equal(x.status, 'clear');
}));

test('NQ: unresolved authority → human answers → worker confirms → continues', t => run(t, {
  intakeQuestions: ['May I drop the table?', null],
  originator: [{ answer: 'Only the operator can approve dropping data.', unresolvedAuthority: true }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd);
  assert.equal((await drive(store, id, quiet)).status, 'held');
  assert.equal((await store.get(id)).hold.kind, 'nq');
  await store.human(id, { text: 'No dropping. Migrate in place.' });
  const packet = JSON.parse(await store.packet(id, 'nq'));
  assert.deepEqual(packet.exchange.map(t => t.type), ['worker', 'human']);
  assert.equal(packet.exchange.at(-1).text, 'No dropping. Migrate in place.', 'the resumed worker receives the human answer');
  assert.equal((await drive(store, id, quiet)).status, 'delivery-authorization-required');
  assert.deepEqual((await store.get(id)).exchanges[0].turns.map(t => t.type), ['worker', 'human', 'worker']);
}));

// NQ: the originating agent answers. Who that is depends on who made the handoff.
const originatorCalls = log => log().filter(c => c.role === 'originator');
const handoffOf = call => { const p = JSON.parse(call.prompt); return { packet: p, text: p.handoff ? readFileSync(p.handoff, 'utf8') : undefined }; };

test('NQ: a mid-pipeline question is answered by the previous role, from its accepted output', t => run(t, {
  intakeQuestions: [null, null, null, null, 'Which test runner?', null],
  originator: [{ answer: 'node:test, as the plan says.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), x = w.exchanges.find(x => x.step === 'test-plan');
  assert.equal(x.originator, 'Cassiopeia', 'the planner handed test design its work');
  assert.notEqual(x.originator, x.worker);
  const calls = originatorCalls(log);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].as, 'Cassiopeia');
  const { packet, text } = handoffOf(calls[0]);
  assert.equal(text, w.attempts.find(a => a.step === 'plan' && a.status === 'accepted').output, 'the originator answers from its own accepted output');
  assert.equal(text, 'Cassiopeia done');
  assert.deepEqual(packet.questions, ['Which test runner?']);
  assert.equal(packet.brief, undefined, 'the originator does not get the receiving step\'s brief');
  assert.deepEqual(x.turns.map(t => [t.type, t.actor]).slice(0, 2), [['worker', x.worker], ['originator', 'Cassiopeia']]);
  assert.equal(w.events.filter(e => e.type === 'call' && e.kind === 'originator').length, 1, 'the originator call is on the timeline');
  assert.equal(w.events.filter(e => e.type === 'call' && e.kind === 'manager').length, 0);
}));

test('NQ: discovery questions are answered by the dispatcher, from objective and source only', t => run(t, {
  intakeQuestions: ['Which file format?', null],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'CSV only, please.', cwd);
  assert.equal((await drive(store, id, quiet)).status, 'delivery-authorization-required');
  const x = (await store.get(id)).exchanges[0];
  assert.equal(x.step, 'discover');
  assert.equal(x.originator, 'dispatcher');
  const [call] = originatorCalls(log);
  assert.equal(call.as, 'dispatcher');
  const { packet, text } = handoffOf(call);
  assert.equal(text, undefined, 'no phase handoff exists yet');
  assert.deepEqual(packet.accepted, []);
  assert.equal(packet.originator.basis, 'source');
  assert.equal(readFileSync(packet.source, 'utf8'), 'CSV only, please.');
}));

test('NQ: after a failure rewind, the Arbiter answers from its ruling', t => run(t, {
  verify: ['fail', 'pass'], arbiter: [{ cause: 'test', answer: 'Test t1 asserts the wrong value; fix it.', evidence: 'spec says ok' }],
  intakeQuestions: [null, null, null, null, null, null, null, 'Which assertion is wrong?', null],
  originator: [{ answer: 'The expected value in t1.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), x = w.exchanges.find(x => x.step === 'test-plan' && x.round === 1);
  assert.equal(x.originator, 'Arbiter');
  const [call] = originatorCalls(log);
  assert.equal(call.as, 'Arbiter');
  const { packet, text } = handoffOf(call);
  assert.equal(packet.originator.basis, 'ruling');
  assert.match(text, /Test t1 asserts the wrong value; fix it\./);
  assert.match(text, /spec says ok/);
  assert.equal(w.exchanges.find(x => x.step === 'implement' && x.round === 1).originator, 'Orion', 'later steps in the round are handed over normally');
}));

test('NQ: the executing worker receives the whole exchange, including the originator\'s answer', t => run(t, {
  intakeQuestions: ['Which database?', null],
  originator: [{ answer: 'Postgres, per the source.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd);
  await drive(store, id, quiet);
  const discover = (await store.get(id)).attempts.find(a => a.step === 'discover');
  const prompt = JSON.parse(log().find(c => c.role === 'Vega').prompt);
  for (const packet of [JSON.parse(discover.packet), prompt]) {
    assert.equal(packet.purpose, 'execute');
    assert.deepEqual(packet.exchange.map(t => t.type), ['worker', 'originator', 'worker']);
    assert.deepEqual(packet.exchange[0].questions, ['Which database?']);
    assert.equal(packet.exchange[1].actor, 'dispatcher');
    assert.equal(packet.exchange[1].text, 'Postgres, per the source.');
  }
}));

test('NQ: three answered rounds with questions open → human hold naming the originator, no fourth round', t => run(t, {
  intakeQuestions: [null, null, null, 'What does "fast" mean?'],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const result = await drive(store, id, quiet);
  assert.equal(result.status, 'held');
  const w = await store.get(id), x = w.exchanges.find(x => x.step === 'plan');
  assert.equal(x.originator, 'Polaris');
  assert.equal(x.rounds, 3);
  assert.equal(x.status, 'human-hold');
  assert.equal(w.hold.kind, 'nq');
  assert.match(w.hold.reason, /handoff from Polaris is ambiguous or wrong/);
  assert.equal(originatorCalls(log).length, 3);
  assert.ok(originatorCalls(log).every(c => c.as === 'Polaris'), 'no actor switch');
  assert.equal((await drive(store, id, quiet)).status, 'held', 'driving again does not bypass the hold');
  assert.equal(originatorCalls(log).length, 3, 'no fourth originator call');
  assert.equal(w.attempts.filter(a => a.step === 'plan').length, 0, 'nothing executed');
}));

test('NQ: a clear intake executes immediately with zero originator calls', t => run(t, {}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id);
  assert.equal(originatorCalls(log).length, 0);
  assert.ok(w.exchanges.every(x => x.rounds === 0 && x.turns.length === 1 && x.status === 'clear'));
  assert.equal(w.events.filter(e => e.type === 'call' && e.kind === 'originator').length, 0);
}));

test('crash: kill -9 the driver mid-implementation; driving again continues the same pi session', async () => {
  const s = await setup({ hang: { Sirius: 1 } });
  const env = { ...process.env, WORK_DATA: s.dir };
  let store = await openStore(s.dir);
  const id = await store.create('Build it', 'source', s.cwd, { delivery: true });
  await store.close();
  const first = spawn(process.execPath, [cli, 'drive', String(id)], { env, stdio: 'ignore' });
  let hung;
  for (let i = 0; i < 200 && !hung; i++) {
    await new Promise(r => setTimeout(r, 100));
    hung = (await readFile(s.state + '.log', 'utf8').catch(() => '')).split('\n').filter(Boolean).map(l => JSON.parse(l)).find(e => e.hanging === 'Sirius');
  }
  assert.ok(hung, 'implementer started');
  first.kill('SIGKILL'); process.kill(hung.pid, 'SIGKILL');
  await new Promise(r => first.once('exit', r));
  const second = spawn(process.execPath, [cli, 'drive', String(id)], { env, stdio: 'ignore' });
  const code = await new Promise(r => second.once('exit', r));
  assert.equal(code, 0);
  store = await openStore(s.dir);
  try {
    const w = await store.get(id), impl = w.attempts.find(a => a.step === 'implement');
    assert.equal(w.completion, 'verified');
    assert.equal(impl.launches, 2);
    assert.equal(impl.output, 'Sirius done (continued)');
    const sirius = s.log().filter(c => c.role === 'Sirius');
    assert.equal(sirius.length, 2);
    assert.equal(sirius[0].sessionId, sirius[1].sessionId, 'same pi session');
    assert.equal(sirius[1].continued, true);
    assert.equal(w.attempts.filter(a => a.step === 'implement').length, 1, 'no duplicate attempt');
  } finally { await store.close(); }
});

test('a live owner keeps a second process out of the store', async () => {
  const s = await setup();
  const store = await openStore(s.dir);
  try { await assert.rejects(openStore(s.dir), /owned by live process/); } finally { await store.close(); }
});

test('prescriptions: each job runs on its own tier card and effort', t => run(t, {}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const by = role => log().find(c => c.role === role);
  assert.deepEqual([by('Cassiopeia').model, by('Cassiopeia').thinking], ['a/deep-a', 'high'], 'planning is deep');
  assert.deepEqual([by('Orion').model, by('Orion').thinking], ['a/deep-a', 'high'], 'check design is deep');
  assert.deepEqual([by('Sirius').model, by('Sirius').thinking], ['a/code-a', 'low'], 'the maker only executes: coding tier, low effort');
  assert.deepEqual([by('Aldebaran').model, by('Aldebaran').thinking], ['a/fast-a', 'low'], 'the runner only executes: fast tier');
  assert.equal(by('intake').model, 'a/fast-a');
  const impl = (await store.get(id)).attempts.find(a => a.step === 'implement');
  assert.equal(impl.card.model, 'code-a');
  assert.equal(impl.access, 'make');
}));

test('a usage limit mid-step swaps to another provider account and the work finishes, no human', t => run(t, { limitOnce: { Sirius: 1 } }, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const result = await drive(store, id, quiet);
  assert.equal(result.status, 'complete', JSON.stringify(result));
  const w = await store.get(id), impl = w.attempts.find(a => a.step === 'implement');
  assert.equal(impl.swaps.length, 1);
  assert.equal(impl.swaps[0].from.model, 'code-a');
  assert.equal(impl.swaps[0].to.model, 'code-b');
  assert.equal(impl.swaps[0].limit.account, 'a');
  assert.equal(impl.card.account, 'b', 'the step finished on the other account');
  assert.ok(w.events.some(e => e.type === 'swapped'), 'the swap is on the record');
  assert.equal(w.hold, null);
  const sirius = log().filter(c => c.role === 'Sirius');
  assert.deepEqual(sirius.map(c => [c.model, c.limited]), [['a/code-a', true], ['b/code-b', false]]);
  assert.match(sirius[1].prompt, /Picking up/, 'the new card is told it is picking the step up');
  assert.ok(Number.isFinite((await store.exhausted()).a), 'account a is out until its reset');
  assert.equal(log().find(c => c.role === 'Aldebaran').model, 'b/fast-b', 'later jobs skip the exhausted account');
}));

test('a usage limit on a judgment call swaps too', t => run(t, { limitOnce: { intake: 1 } }, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const intakes = log().filter(c => c.role === 'intake');
  assert.deepEqual(intakes.slice(0, 2).map(c => c.model), ['a/fast-a', 'b/fast-b']);
  assert.ok((await store.get(id)).events.some(e => e.type === 'quota' && e.account === 'a'));
}));

test('every account out: the drive stops as out-of-quota, nothing is held for a human', t => run(t, {}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  const later = Date.now() + 3_600_000;
  await store.markExhausted('a', later); await store.markExhausted('b', later + 60_000);
  const result = await drive(store, id, quiet);
  assert.equal(result.status, 'out-of-quota');
  assert.match(result.reason, new RegExp(new Date(later).toISOString()), 'it says when the first account resets');
  assert.equal((await store.get(id)).hold, null);
}));
