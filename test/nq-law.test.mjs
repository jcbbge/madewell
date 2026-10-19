// NQ on every agent-to-agent hand-off (thread 17 plan, tests 7a-e and 7n): turns, structured holds,
// the Arbiter's intake, the dispatcher's authority intake, and the worker's sub-agent rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEPS } from '../work.mjs';
import { drive } from '../drive.mjs';
import { run, quiet, calls, originatorCalls, stepExchanges } from './drive-helpers.mjs';

const handoffText = call => { const p = JSON.parse(call.prompt); return p.handoff ? readFileSync(p.handoff, 'utf8') : undefined; };
const turnsReason = (step, from) => `${step}: questions remain after three turns on the handoff from ${from}: its spec or the receiver's scope is wrong or unclear`;

test('7a: three answered turns with questions open → a structured hold on that hand-off: cause, originator, receiver, refs', () => run({
  intakeQuestions: [null, null, null, 'What does "fast" mean?', 'Fast for whom?', 'Measured where?', 'Under what load?'],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await store.get(id), x = stepExchanges(w).find(x => x.step === 'plan');
  assert.equal(x.rounds, 3, 'three answered turns');
  assert.deepEqual(x.turns.map(t => t.type), ['worker', 'originator', 'worker', 'originator', 'worker', 'originator', 'worker']);
  assert.equal(x.status, 'human-hold');
  const { at, ...hold } = w.hold;
  assert.ok(Number.isFinite(Date.parse(at)));
  assert.deepEqual(hold, { kind: 'nq', ref: x.id, cause: 'turns', originator: 'Polaris', receiver: x.worker, questionId: null,
    refs: [x.id], questions: ['Under what load?'], reason: turnsReason('plan', 'Polaris') });
  assert.doesNotMatch(w.hold.reason, /ambiguous or wrong/, 'the hold does not claim the spec caused it');
  assert.equal(originatorCalls(log).length, 3, 'no fourth answer');
  assert.equal(w.attempts.filter(a => a.step === 'plan').length, 0, 'nothing executed');
}));

test('7b: unresolved authority gets three originator answers before a human hold; the human answer still needs confirmation', () => run({
  intakeQuestions: ['May I drop the table?', 'Can I delete its rows?', 'Can I remove the data?', 'Still need authorization?', null],
  originator: [{ answer: 'Only the operator can approve dropping data; do not drop it.', unresolvedAuthority: true }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd);
  assert.equal((await drive(store, id, quiet)).status, 'held');
  let w = await store.get(id);
  const x = stepExchanges(w)[0];
  assert.equal(w.hold.cause, 'turns');
  assert.equal(w.hold.ref, x.id);
  assert.equal(w.hold.originator, 'dispatcher');
  assert.equal(w.hold.receiver, x.worker);
  assert.ok(Array.isArray(w.hold.refs) && w.hold.refs.includes(x.id));
  await store.human(id, { text: 'No dropping. Migrate in place.' });
  assert.equal((await drive(store, id, quiet)).status, 'discovered');
  w = await store.get(id);
  const after = w.exchanges.find(e => e.id === x.id);
  assert.deepEqual(after.turns.map(t => t.type), ['worker', 'originator', 'worker', 'originator', 'worker', 'originator', 'worker', 'human', 'worker']);
  assert.equal(after.turns[7].round, 4, 'the human answer is a turn');
  assert.equal(after.rounds, 4, 'human and originator answers both count');
  assert.equal(originatorCalls(log).length, 3, 'three originator answers come before the human');
  assert.equal(w.hold, null);
}));

test('7b: a turns hold answered by the human → the worker still asks → hold with cause after-human', () => run({
  intakeQuestions: [null, null, null, 'Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  assert.equal((await store.get(id)).hold.cause, 'turns');
  await store.human(id, { text: 'Fast means p95 under 200 ms on the reports page.' });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await store.get(id), x = stepExchanges(w).find(x => x.step === 'plan');
  assert.equal(w.hold.cause, 'after-human');
  assert.equal(w.hold.reason, "plan: questions remain after the human's answer");
  assert.deepEqual(w.hold.questions, ['Q5?']);
  assert.equal(w.hold.originator, 'Polaris');
  assert.equal(w.hold.receiver, x.worker);
  assert.equal(x.rounds, 4);
  assert.equal(originatorCalls(log).length, 3, 'no originator call after the human answer');
}));

const arbiterExchange = w => w.exchanges.find(x => x.subject?.kind === 'failure');

test('7c: the Arbiter asks before ruling → the failing check runner answers → the Arbiter rules → complete', () => run({
  verify: ['fail', 'pass'],
  arbiter: [{ questions: ['Which fixture did t1 load when it failed?'] }, { cause: 'test', answer: 'Test t1 loads the stale fixture; fix it.', evidence: 'run log' }],
  originator: [{ answer: 't1 loaded fixtures/old.json.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), f = w.failures[0], fx = arbiterExchange(w);
  assert.ok(fx, 'the failure hand-off to the Arbiter is an exchange');
  assert.equal(fx.step, 'arbitrate');
  assert.equal(fx.subject.id, f.id);
  assert.equal(fx.originator, 'Aldebaran', 'the failing check runner handed the Arbiter its question');
  assert.match(fx.worker, /^Arbiter-/);
  assert.equal(fx.status, 'clear');
  assert.deepEqual(fx.turns.map(t => t.type), ['worker', 'originator', 'worker']);
  assert.deepEqual(fx.turns[0].questions, ['Which fixture did t1 load when it failed?']);
  assert.equal(fx.turns[1].text, 't1 loaded fixtures/old.json.');
  assert.equal(fx.decision.cause, 'test', 'the ruling is separate from the Arbiter\'s readiness turn');
  assert.equal(fx.turns[2].ruling, undefined, 'readiness is not retroactively relabelled execution');
  const [o] = originatorCalls(log);
  assert.equal(originatorCalls(log).length, 1);
  assert.equal(o.as, 'Aldebaran');
  assert.match(handoffText(o), /"outcome":"fail"/, 'the check runner answers from its own report');
  const rulings = calls(log, 'arbiter');
  assert.equal(rulings.length, 1, 'ruling execution is separate from readiness');
  assert.equal(calls(log, 'arbiter-intake').length, 2);
  assert.ok(JSON.parse(rulings[0].prompt).exchange.some(t => t.type === 'originator' && t.text === 't1 loaded fixtures/old.json.'), 'the Arbiter rules with the answer in hand');
  assert.equal(f.ruling.cause, 'test');
  assert.ok(!w.events.some(e => e.type === 'failure-undetermined'), 'questions are never an undetermined ruling');
  assert.equal(stepExchanges(w).find(x => x.step === 'test-plan' && x.round === 1).originator, 'Arbiter');
}));

test('7c: a blocked maker\'s question to the Arbiter is answered by the maker', () => run({
  blockedOnce: { Sirius: 1 },
  arbiter: [{ questions: ['Which folder does npm test load?'] }, { cause: 'implementation', answer: 'The plan names the wrong test folder.', evidence: '' }],
  originator: [{ answer: 'It loads test/, which is empty.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), fx = arbiterExchange(w);
  assert.equal(fx.originator, 'Sirius');
  assert.deepEqual(originatorCalls(log).map(c => c.as), ['Sirius']);
  assert.equal(w.failures[0].step, 'implement');
  assert.equal(w.failures[0].ruling.cause, 'implementation');
}));

test('7d: the Arbiter still asking after three turns → a nq hold on the failure exchange; the human answers → a ruling', () => run({
  verify: ['fail', 'pass'],
  arbiter: [{ questions: ['A1?'] }, { questions: ['A2?'] }, { questions: ['A3?'] }, { questions: ['A4?'] }, { cause: 'test', answer: 'Fix t1.', evidence: '' }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  let w = await store.get(id);
  const fx = arbiterExchange(w);
  const { at, ...hold } = w.hold;
  assert.deepEqual(hold, { kind: 'nq', ref: fx.id, cause: 'turns', originator: 'Aldebaran', receiver: fx.worker, questionId: null,
    refs: [fx.id], questions: ['A4?'], reason: turnsReason('arbitrate', 'Aldebaran') });
  assert.equal(originatorCalls(log).length, 3);
  assert.equal(w.failures[0].status, 'open', 'not ruled, not undetermined');
  assert.ok(!w.events.some(e => e.type === 'failure-undetermined'));
  await store.human(id, { text: 'It is the test: t1 expects the old total.' });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  w = await store.get(id);
  assert.equal(w.failures[0].ruling.cause, 'test');
  assert.equal(w.failures[0].ruling.by, 'Arbiter');
  assert.deepEqual(w.exchanges.find(x => x.id === fx.id).turns.slice(-2).map(t => t.type), ['human', 'worker']);
  assert.equal(calls(log, 'arbiter-intake').length, 5);
  assert.equal(calls(log, 'arbiter').length, 1, 'no ruling executed before readiness');
}));

const askAtPlan = [null, null, null, 'May I edit package.json to fix the test script?', null];

test('7e: the dispatcher asks the originator before ruling on authority → answer → its ruling settles the parent hand-off', () => run({
  intakeQuestions: askAtPlan,
  originator: [{ answer: 'Only the operator can approve editing package.json.', unresolvedAuthority: true }, { answer: 'I meant only the "test" script line.', unresolvedAuthority: false }],
  authority: [{ questions: ['Does the handoff mean the whole package.json or only its test script?'] },
    { answer: 'The source asks for tests that run with npm test, so fixing the test script is part of the request.', unresolvedAuthority: false }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), x = stepExchanges(w).find(x => x.step === 'plan'), ax = w.exchanges.find(e => e.subject?.kind === 'authority');
  assert.ok(ax, 'the consult to the dispatcher is an exchange');
  assert.equal(ax.step, 'authority');
  assert.equal(ax.subject.parent, x.id);
  assert.equal(ax.subject.handoff, 'Only the operator can approve editing package.json.');
  assert.equal(ax.originator, 'Polaris');
  assert.match(ax.worker, /^dispatcher-/);
  assert.equal(ax.status, 'clear');
  assert.deepEqual(ax.turns.map(t => t.type), ['worker', 'originator', 'worker']);
  assert.deepEqual(ax.turns[0].questions, ['Does the handoff mean the whole package.json or only its test script?']);
  assert.equal(ax.turns[1].text, 'I meant only the "test" script line.');
  assert.match(ax.decision.answer, /part of the request/);
  assert.equal(calls(log, 'authority-intake').length, 2);
  assert.equal(calls(log, 'authority').length, 1, 'authority is decided only after readiness');
  const os = originatorCalls(log);
  assert.deepEqual(os.map(c => c.as), ['Polaris', 'Polaris']);
  assert.equal(handoffText(os[1]), 'Only the operator can approve editing package.json.', 'the originator answers the dispatcher from what it said');
  assert.match(x.turns.find(t => t.type === 'originator').text,
    /settled by the dispatcher from the operator's source: The source asks for tests that run with npm test/);
  assert.equal(w.hold, null);
}));

test('7e: the originator answering the dispatcher gets three turns before the authority consult holds, no recursive consult', () => run({
  intakeQuestions: askAtPlan,
  originator: [{ answer: 'Only the operator can approve this.', unresolvedAuthority: true }],
  authority: [{ questions: ['What exactly did you hand over about package.json?'] }],
}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await store.get(id), ax = w.exchanges.find(x => x.subject?.kind === 'authority');
  assert.equal(w.hold.kind, 'nq');
  assert.equal(w.hold.cause, 'turns');
  assert.equal(w.hold.ref, ax.id, 'only the unresolved consult holds');
  assert.equal(ax.rounds, 3);
  assert.equal(calls(log, 'authority').length, 0, 'no authority decision before readiness');
  assert.equal(calls(log, 'authority-intake').length, 4);
  assert.equal(originatorCalls(log).length, 4, 'initial handoff plus three consult answers');
  assert.equal((await drive(store, id, quiet)).status, 'held');
  assert.equal(calls(log, 'authority').length, 0, 'nothing escalates further');
  assert.equal(originatorCalls(log).length, 4);
}));

const SUBAGENT = 'Do not delegate or change scope. If your tools can start another agent anyway, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.';

test('7n: every step worker is told a sub-agent it starts is an NQ exchange it originates; "Do not delegate" stays', () => run({}, async ({ store, cwd, log }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  for (const s of STEPS) {
    const c = log().find(c => c.role === s.role);
    assert.ok(c, `${s.role} ran`);
    assert.ok(c.system.includes(SUBAGENT), `${s.role}'s system prompt carries the sub-agent rule:\n${c.system}`);
  }
  const w = await store.get(id);
  for (const s of STEPS) assert.match(w.briefs[s.name].text, /If your tools can start another agent anyway, that is an NQ exchange you originate and answer for/, `${s.name} brief`);
}));
