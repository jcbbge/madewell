// Real Pi Durable storage; injected launchers and the scripted harness only. No models or listeners.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, unlink, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { openStore, STEPS } from '../work.mjs';
import { drive } from '../drive.mjs';
import { loadPrescriptions } from '../cards.mjs';
import { setup, run, quiet, waitFor } from './drive-helpers.mjs';

const card = { harness: 'pi', provider: 'a', account: 'a', model: 'deep', effort: 'high' };
const receiver = { actor: 'researcher-1', job: 'research', card, harness: card.harness, provider: card.provider, model: card.model, sessionId: null };
async function fixture(t, scenario = {}) {
  const s = await setup(scenario);
  let store = await openStore(s.dir, { resume: true });
  t.after(async () => { await store.close(); await rm(s.root, { recursive: true, force: true }); });
  return { ...s, get store() { return store; }, async reopen(resume = true) { await store.close(); store = await openStore(s.dir, { resume }); return store; } };
}
const input = (exchangeId, key, kind = 'intake', actor = 'worker') => ({ exchangeId, key, kind, step: 'discover', job: kind,
  actor, card, options: { access: 'read', system: 'A bounded test call', prompt: '{}' } });
const clear = { intent: 'I understand.', questions: [] };
async function interruptedCall(t) {
  const s = await setup();
  const module = new URL('../work.mjs', import.meta.url).href;
  const code = `import { openStore } from ${JSON.stringify(module)};
    const store = await openStore(${JSON.stringify(s.dir)}, {resume:true});
    const id = await store.create('Build', 'source', ${JSON.stringify(s.cwd)});
    await store.brief(id, 'Inspect'); const x = await store.delegate(id, 'worker');
    await store.call(id, {exchangeId:x,key:'crash-intake',kind:'intake',step:'discover',job:'intake',actor:'worker',card:${JSON.stringify(card)},
      options:{access:'read',system:'You are the assigned worker in read-only intake before you execute.',packet:JSON.stringify({threadId:id,source:'source',workspace:${JSON.stringify(s.cwd)},brief:'Inspect'})}}, async options => {
        const w = await store.get(id), c = w.calls.find(c=>c.id===w.activeCall);
        process.send({id,exchangeId:x,callId:c.id,taskId:c.taskId,sessionId:options.sessionId});
        setInterval(()=>{},1000); await new Promise(()=>{});
      });`;
  const child = spawn(process.execPath, ['--no-warnings', '--input-type=module', '-e', code], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let stderr = ''; child.stderr.on('data', c => { stderr += c; });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await once(child, 'exit'); } });
  const [saved] = await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error(stderr || 'child exited before checkpoint'); })]);
  child.kill('SIGKILL'); await once(child, 'exit');
  return { ...s, ...saved };
}
const rawTask = (dir, taskId) => {
  const db = new DatabaseSync(join(dir, 'work.sqlite'), { readOnly: true });
  try { return JSON.parse(db.prepare('SELECT record FROM tasks WHERE id = ?').get(taskId).record); } finally { db.close(); }
};

test('call results cannot be applied to another exchange, and rule/begin cannot bypass readiness', async t => {
  const s = await fixture(t), id = await s.store.create('Build', 'source', s.cwd);
  await s.store.brief(id, 'Inspect'); const x = await s.store.delegate(id, 'worker');
  await assert.rejects(s.store.begin(id, 'worker', card, 'read'), /NQ must clear/);
  await assert.rejects(s.store.call(id, input(x, 'illegal', 'arbiter'), () => ({ output: 'ruling' })), /NQ must clear/);
  const c = await s.store.call(id, input(x, 'clear'), () => ({ output: JSON.stringify(clear) }));
  const other = await s.store.create('Other', 'source', s.cwd); await s.store.brief(other, 'Inspect');
  const y = await s.store.delegate(other, 'worker');
  await assert.rejects(s.store.nq(other, y, clear, 'worker', c.callId), /does not match/);
  await s.store.nq(id, x, clear, 'worker', c.callId);
  const changed = { ...card, model: 'other' };
  await assert.rejects(s.store.begin(id, 'worker', changed, 'read'), /replacement card must confirm/);
});

test('every runner call is a durable task; all seams bind cards/briefs and final return is confirmed', () => run({
  verify: ['fail', 'pass'], arbiter: [{ cause: 'implementation', answer: 'Fix the plan.', evidence: 'test output' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build', 'source', cwd, { kind: 'delivery', dispatcher: { actor: 'operator-agent', job: 'dispatcher', card, sessionId: 'front-session' } });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id);
  assert.ok(w.calls.length > w.attempts.length);
  assert.ok(w.calls.every(c => c.taskId && c.startedAt && c.endedAt && c.runs.length && c.exchangeId));
  assert.ok(w.calls.every(c => c.runs.every(r => typeof r.card === 'object')));
  for (const step of STEPS) {
    const a = w.attempts.find(a => a.step === step.name), x = w.exchanges.find(x => x.step === step.name);
    assert.equal(x.briefHash, w.briefHistory.find(b => b.step === step.name)?.hash ?? w.briefs[step.name].hash);
    assert.ok(x.handoffId); assert.ok(x.sender); assert.ok(x.receiver.card);
    assert.equal(JSON.parse(a.packet).exchange.at(-1).clear, true);
    assert.equal(JSON.parse(a.packet).exchangeId, x.id);
  }
  const failed = w.failures[0], fx = w.exchanges.find(x => x.subject?.kind === 'failure');
  assert.equal(fx.status, 'clear'); assert.ok(failed.exchange); assert.ok(failed.sender.card);
  const intake = w.calls.find(c => c.kind === 'arbiter-intake'), ruling = w.calls.find(c => c.kind === 'arbiter');
  assert.ok(intake.endedAt <= ruling.startedAt); assert.ok(ruling.appliedAt);
  const routed = w.attempts.find(a => a.round === 1);
  assert.equal(JSON.parse(routed.packet).originator.exchange.id, fx.id);
  assert.equal(w.returnAccepted.exchangeId, w.exchanges.find(x => x.subject?.kind === 'return').id);
  await assert.rejects(store.brief(id, 'More work'), /Thread is complete/);
}));

test('final dispatcher return uses three sender answers and human confirmation, without rerunning discovery', () => run({
  returnQuestions: [['Which format?'], ['Which file?'], ['Which evidence?'], ['Still need clarification?'], []],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build', 'source', cwd);
  assert.equal((await drive(store, id, quiet)).status, 'held');
  let w = await store.get(id), x = w.exchanges.find(x => x.subject?.kind === 'return');
  assert.equal(w.hold.ref, x.id); assert.equal(x.rounds, 3); assert.equal(x.originator, 'Vega');
  assert.equal(w.returnAccepted, undefined);
  await store.human(id, { text: 'The report is clear; keep its named scope.' });
  w = await store.get(id); assert.equal(w.returnAccepted, undefined, 'human release is not receiver confirmation');
  assert.equal((await drive(store, id, quiet)).status, 'discovered');
  w = await store.get(id); x = w.exchanges.find(e => e.id === x.id);
  assert.equal(x.rounds, 4); assert.equal(x.status, 'clear'); assert.ok(w.returnAccepted);
  assert.deepEqual(w.attempts.map(a => a.step), ['discover']);
  assert.equal(log().filter(c => c.role === 'originator').length, 3);
}));

test('discovery saves meaningful operations, preserved source, inherited provenance and linked prerequisite return', () => run({
  items: [{ title: 'Only item', objective: 'Build', text: 'Bounded work' }],
  verify: ['fail', 'pass', 'pass'], arbiter: [{ cause: 'pre-existing', answer: 'Fix utility.', evidence: 'history' }],
}, async ({ store, cwd }) => {
  const id = await store.create('Build', 'exact source bytes\n', cwd);
  await drive(store, id, quiet);
  const w = await store.get(id);
  assert.deepEqual(w.operations.map(o => o.name), ['source-preserved', 'understanding', 'scope-and-items', 'split']);
  assert.ok(w.operations.every(o => o.startedAt <= o.endedAt && o.evidence));
  assert.deepEqual(w.attempts.map(a => a.step), ['discover']);
  const child = w.items[0]; await drive(store, child, quiet);
  const item = await store.get(child);
  assert.equal(item.source, 'exact source bytes\n');
  assert.deepEqual(item.discovered.card, w.attempts[0].card);
  assert.equal(item.discovered.exchange.id, w.exchanges[0].id);
  const returned = item.exchanges.find(x => x.round === 1 && x.step === 'verify');
  assert.equal(returned.sender.job, 'verify'); assert.equal(returned.sourceWork, item.failures[0].prerequisite);
  assert.ok(Array.isArray(returned.priorExchange));
  const packet = JSON.parse(item.attempts.findLast(a => a.step === 'verify').packet);
  assert.match(packet.originator.handoff ?? item.prerequisiteReturn.handoff, /Verified result/);
  assert.ok(packet.questionsForYou.some(n => n.failureId));
}));

test('crash before spawn redrives the same Pi Durable call and session, without spending a question turn', { timeout: 15000 }, async t => {
  const s = await interruptedCall(t), store = await openStore(s.dir, { resume: true });
  t.after(async () => { await store.close(); await rm(s.root, { recursive: true, force: true }); });
  const result = await store.call(s.id, input(s.exchangeId, 'crash-intake'));
  const c = (await store.get(s.id)).calls[0];
  assert.equal(result.callId, s.callId); assert.equal(c.taskId, s.taskId); assert.equal(c.sessionId, s.sessionId);
  assert.equal(c.runs.length, 2); assert.equal(c.runs[0].outcome, 'interrupted');
  assert.equal((await store.get(s.id)).exchanges[0].rounds, 0);
  assert.equal(s.log().filter(c => c.role === 'intake').length, 1);
  assert.equal(s.log()[0].sessionId, s.sessionId);
});

test('call start is committed before spawn; saved output survives reopen and applies once at the bound turn', async t => {
  const s = await fixture(t), id = await s.store.create('Build', 'verbatim source', s.cwd);
  await s.store.brief(id, 'Inspect only');
  const x = await s.store.delegate(id, 'worker');
  let launches = 0;
  const result = await s.store.call(id, input(x, 'intake'), async options => {
    launches++;
    const w = await s.store.get(id), c = w.calls.find(c => c.id === w.activeCall);
    assert.equal(c.outcome, 'running'); assert.ok(c.taskId); assert.ok(c.startedAt);
    assert.equal(c.sessionId, options.sessionId); assert.equal(c.exchangeId, x);
    await options.onSpawn(123456789, { transport: 'tmux', session: '$1', window: '@2', pane: '%3' });
    return { output: JSON.stringify({ intent: 'Need a delimiter', questions: ['Which delimiter?'] }) };
  });
  const session = (await s.store.get(id)).calls[0].sessionId;
  await unlink(join(s.dir, 'observability', `thread-${id}.json`));
  await s.reopen();
  const replay = await s.store.call(id, input(x, 'intake'), () => { throw new Error('Must not respawn committed output'); });
  assert.equal(replay.callId, result.callId); assert.equal(launches, 1);
  assert.equal((await s.store.get(id)).calls[0].sessionId, session);
  assert.equal(JSON.parse(await readFile(join(s.dir, 'observability', `thread-${id}.json`), 'utf8')).threadId, id, 'reopen repairs a missing view');
  await s.store.nq(id, x, JSON.parse(result.output), 'worker', result.callId);
  await s.store.nq(id, x, JSON.parse(result.output), 'worker', result.callId);
  const a = await s.store.call(id, input(x, 'answer', 'originator', 'dispatcher'), () => ({ output: JSON.stringify({ answer: 'CSV comma.' }) }));
  await s.reopen(); // output committed, turn not yet applied
  await s.store.answer(id, x, 'dispatcher', JSON.parse(a.output).answer, [], a.callId);
  await s.reopen(); // turn committed, caller did not see acknowledgement
  await s.store.answer(id, x, 'dispatcher', 'CSV comma.', [], a.callId);
  const w = await s.store.get(id);
  assert.equal(w.exchanges[0].rounds, 1); assert.equal(w.exchanges[0].turns.length, 2);
  assert.ok(w.calls.every(c => c.appliedAt));
  assert.deepEqual(w.calls[0].runs[0].card, card);
  assert.equal(w.calls[0].runs[0].where.pane, '%3');
});

test('transport retries keep one call/session and record each launch separately without spending NQ turns', async t => {
  const s = await fixture(t), id = await s.store.create('Build', 'source', s.cwd);
  await s.store.brief(id, 'Inspect'); const x = await s.store.delegate(id, 'worker');
  const sessions = []; let n = 0;
  const result = await s.store.call(id, input(x, 'retry'), options => {
    sessions.push(options.sessionId);
    if (n++ < 2) throw new Error('Transient transport failure');
    assert.equal(options.resume, true); return { output: JSON.stringify(clear) };
  });
  const w = await s.store.get(id), c = w.calls[0];
  assert.equal(w.calls.length, 1); assert.equal(c.runs.length, 3); assert.equal(new Set(sessions).size, 1);
  assert.equal(new Set(c.runs.map(r => r.record)).size, 3);
  assert.equal(w.exchanges[0].rounds, 0);
  await s.store.nq(id, x, clear, 'worker', result.callId);
  assert.equal((await s.store.get(id)).exchanges[0].turns.length, 1);
});

test('sender answers stay on the actual historical card after prescription ordering changes', () => run({}, async ({ store, cwd }) => {
  const prescriptions = loadPrescriptions(); let asked = false, sender;
  const id = await store.create('Build', 'source', cwd, { kind: 'delivery' });
  await drive(store, id, { ...quiet, prescriptions, call: async options => {
    const packet = JSON.parse(options.prompt);
    if (/who handed over this work/.test(options.system)) { sender = options.card; return { output: JSON.stringify({ answer: 'From the accepted discovery.' }) }; }
    if (packet.step?.name === 'ideate' && !asked) {
      asked = true; prescriptions.tiers.deep.reverse();
      return { output: JSON.stringify({ intent: 'Need one detail', questions: ['Which source?'] }) };
    }
    return { output: JSON.stringify(clear) };
  } });
  const w = await store.get(id), original = w.attempts.find(a => a.step === 'discover');
  assert.deepEqual(sender, original.card);
  assert.equal(sender.account, 'a'); assert.equal(prescriptions.tiers.deep[0].account, 'b');
  const x = w.exchanges.find(x => x.step === 'ideate');
  assert.equal(x.sender.card.account, 'a'); assert.equal(x.senderReplacements, undefined);
}));

test('quota successor confirms the pickup dossier and retains answered turns before execution', () => run({
  limitOnce: { Sirius: 1 },
  intakeQuestions: [null, null, null, null, null, 'Which path?', null, 'Which test?', null, null],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build', 'source', cwd, { kind: 'delivery' });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), a = w.attempts.find(a => a.step === 'implement'), x = w.exchanges.find(x => x.step === 'implement');
  assert.equal(x.rounds, 2); assert.equal(x.replacements.length, 1);
  assert.notEqual(x.replacements[0].actor, x.worker);
  assert.deepEqual(x.turns.filter(t => t.type === 'originator').map(t => t.round), [1, 2]);
  const replacementIntake = log().filter(c => c.role === 'intake').map(c => JSON.parse(c.prompt)).find(p => p.pickup);
  assert.equal(replacementIntake.pickup.from.account, 'a');
  assert.equal(replacementIntake.pickup.lastOutputIsFile, true);
  assert.match(await readFile(replacementIntake.pickup.lastOutput, 'utf8'), /usage limit/);
  assert.ok(replacementIntake.exchange.some(t => t.questions?.includes('Which path?')));
  assert.ok(replacementIntake.pickup.workspace);
  const execution = w.calls.find(c => c.kind === 'replacement');
  assert.equal(execution.actor, x.worker); assert.equal(execution.card.account, 'b');
  assert.ok(JSON.parse(a.packet).exchange.at(-1).clear);
  assert.ok(x.senderReplacements.some(r => r.reason === 'quota'), 'sender account substitution is explicit too');
}));

test('a quota-replaced Arbiter has its own readiness before issuing the ruling', () => run({
  verify: ['fail', 'pass'], limitOnce: { arbiter: 1 }, arbiter: [{ cause: 'test', answer: 'Fix expectation', evidence: 'contract' }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build', 'source', cwd, { kind: 'delivery' });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), x = w.exchanges.find(x => x.subject?.kind === 'failure');
  assert.equal(x.replacements.length, 1); assert.equal(x.rounds, 0);
  assert.deepEqual(log().filter(c => ['arbiter-intake', 'arbiter'].includes(c.role)).map(c => [c.role, c.limited]),
    [['arbiter-intake', false], ['arbiter', true], ['arbiter-intake', false], ['arbiter', false]]);
  assert.equal(x.receiver.card.account, 'b');
}));

test('fresh Codex calls never resume an invented UUID; a lost execution session requires new intake', async t => {
  const s = await fixture(t), id = await s.store.create('Build', 'source', s.cwd);
  await s.store.brief(id, 'Inspect'); const x = await s.store.delegate(id, 'worker');
  const codex = { ...card, harness: 'codex' };
  const c = await s.store.call(id, { ...input(x, 'codex-intake'), card: codex }, async options => {
    assert.equal(options.sessionId, undefined); assert.equal(options.resume, false);
    options.onLine({ type: 'thread.started', thread_id: 'real-thread' });
    return { output: JSON.stringify(clear), sessionId: 'real-thread' };
  });
  await s.store.nq(id, x, clear, 'worker', c.callId);
  const result = await s.store.call(id, { ...input(x, 'codex-execution', 'arbiter'), card: codex }, options => {
    assert.equal(options.sessionId, undefined); throw new Error('Lost before thread.started');
  });
  assert.equal(result.needsIntake, true);
  const after = (await s.store.get(id)).exchanges[0];
  assert.equal(after.status, 'awaiting-worker'); assert.equal(after.rounds, 0);
  assert.notEqual(after.worker, 'worker'); assert.equal(after.pickup.reason, 'session-unavailable');
  await assert.rejects(s.store.call(id, { ...input(x, 'illegal-codex-execution', 'arbiter'), card: codex, actor: after.worker }, () => ({ output: 'Must not run' })), /NQ must clear/);
});
