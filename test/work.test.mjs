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

test('NQ: questions get manager answers; missing authority holds for the human', t => run(t, {
  intakeQuestions: ['Which database?', null],
  manager: [{ answer: 'Postgres, per the source.', unresolvedAuthority: false }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd);
  await drive(store, id, quiet);
  const x = (await store.get(id)).exchanges[0];
  assert.deepEqual(x.turns.map(t => t.type), ['worker', 'manager', 'worker']);
  assert.equal(x.status, 'clear');
}));

test('NQ: unresolved authority → human answers → worker confirms → continues', t => run(t, {
  intakeQuestions: ['May I drop the table?', null],
  manager: [{ answer: 'Only the operator can approve dropping data.', unresolvedAuthority: true }],
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
