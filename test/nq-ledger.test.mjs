// The same question carried across consecutive hand-offs counts as one question (thread 17 plan, tests 7f-h).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drive } from '../drive.mjs';
import { run, quiet, calls, originatorCalls, stepExchanges } from './drive-helpers.mjs';

const unit7 = JSON.parse(readFileSync(new URL('./fixtures/unit7-replay.json', import.meta.url), 'utf8'));
const Q = unit7.question;
// Raise `asks[i]` at the i-th consecutive hand-off from discover; each is answered once, then the worker is clear.
const raising = asks => asks.flatMap((q, i) => i === asks.length - 1 ? [q] : q === null ? [null] : [q, null]);

test('7f: unit-7 replay: the same access question at four consecutive hand-offs holds at the fourth raise, naming who handed the spec over', () => run({
  intakeQuestions: raising(unit7.handoffs.map(() => Q)),
}, async ({ store, cwd, log }) => {
  assert.deepEqual(unit7.handoffs.map(h => h.step), ['discover', 'ideate', 'challenge', 'plan']);
  const id = await store.create('Let Made Well workers through every harness hook', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await store.get(id), xs = stepExchanges(w), by = step => xs.find(x => x.step === step);
  const plan = by('plan'), entry = w.asked.find(e => e.id === w.hold.questionId);
  assert.ok(entry, 'the hold names the carried question');
  assert.equal(entry.text, Q);
  assert.equal(entry.turns, 3);
  assert.equal(w.hold.kind, 'nq');
  assert.equal(w.hold.cause, 'turns');
  assert.deepEqual(w.hold.refs, ['discover', 'ideate', 'challenge'].map(s => by(s).id), 'every hand-off that carried it');
  assert.deepEqual(w.hold.questions, [Q]);
  assert.equal(w.hold.originator, unit7.handoffs[3].originator, 'Polaris handed over the spec that still leaves it open');
  assert.match(w.hold.reason, /Polaris/);
  assert.equal(w.hold.receiver, plan.worker);
  assert.ok(plan.worker.startsWith(`${unit7.handoffs[3].receiver}-`));
  assert.deepEqual(originatorCalls(log).map(c => c.as), unit7.handoffs.slice(0, 3).map(h => h.originator), 'one answer per earlier hand-off');
  assert.deepEqual(plan.turns.map(t => t.type), ['worker'], 'the fourth raise holds at once: no originator call');
  assert.deepEqual(plan.turns[0].asked, [entry.id]);
  assert.deepEqual(by('discover').turns[0].asked, [null], 'first raise: not yet on the ledger');
  assert.deepEqual(by('ideate').turns[0].asked, [entry.id]);
  assert.equal((await drive(store, id, quiet)).status, 'held');
  assert.equal(originatorCalls(log).length, 3, 'no further originator call');
}));

test('7g: a reworded re-raise the originator tags as the same question counts; the fourth raise holds and its answer is not recorded', () => {
  const R = ['Can this step read the graze gate, the Codex hooks and the doctor code, and reach hive?',
    'Do I have read access to circadian-graze-gate, ~/.codex/hooks.json, doctor and ssh to hive?',
    'Is the access problem (graze gate, Codex hooks, doctor, hive) fixed for this phase?'];
  return run({
    intakeQuestions: raising([Q, ...R]),
    same: Object.fromEntries(R.map(r => [r, Q])),
  }, async ({ store, cwd, log }) => {
    const id = await store.create('Build it', 'source', cwd, { delivery: true });
    assert.equal((await drive(store, id, quiet)).status, 'held');
    const w = await store.get(id), xs = stepExchanges(w), plan = xs.find(x => x.step === 'plan');
    const entry = w.asked.find(e => e.id === w.hold.questionId);
    assert.ok(entry);
    assert.equal(entry.text, Q, 'the ledger keeps the first wording');
    assert.equal(entry.turns, 3, 'the held answer is not counted');
    assert.equal(w.hold.cause, 'turns');
    assert.deepEqual(w.hold.refs, ['discover', 'ideate', 'challenge'].map(s => xs.find(x => x.step === s).id));
    assert.deepEqual(w.hold.questions, [R[2]]);
    assert.equal(originatorCalls(log).length, 4, 'a reworded fourth raise is only recognised by its originator');
    assert.equal(plan.rounds, 0);
    assert.ok(!plan.turns.some(t => t.type === 'originator'), 'the answer at the hold is not recorded');
    const saw = log().filter(l => l.originatorSaw);
    assert.equal(saw.length, 4);
    assert.deepEqual(saw[0].originatorSaw.carried, [], 'nothing carried at the first hand-off');
    assert.deepEqual(saw[3].originatorSaw.carried.map(c => [c.text, c.turns]), [[Q, 3]], 'the originator packet carries id, text and turns');
    assert.deepEqual(Object.keys(saw[3].originatorSaw.carried[0]).sort(), ['id', 'text', 'turns']);
    assert.equal(log().filter(l => l.same).length, 3);
    for (const c of calls(log, 'intake')) assert.equal(JSON.parse(c.prompt).carried, undefined, 'a worker\'s own packet never carries the ledger');
  });
});

test('7g: invalid same tags are ignored: an unknown id, or a known id under a question not asked this turn', () => run({
  intakeQuestions: raising(['Which port?', 'What port number?', 'Port to bind?', 'Listen on which port?', null]),
  sameInvalid: true,
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id);
  assert.equal(w.hold, null, 'four differently worded questions with bad tags never become one question');
  assert.ok(stepExchanges(w).filter(x => x.round === 0).slice(0, 4).every(x => x.rounds === 1), 'each was answered once');
}));

const runner = 'Which test runner should the checks use?';

test('7h: a question not raised at the middle hand-off starts a fresh count', () => run({
  // discover, ideate: raised; challenge: not; plan, test-plan, implement: raised; verify: not.
  intakeQuestions: [...raising([runner, runner, null]), runner, null, runner, null, runner, null, null],
}, async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete', 'five raises, never four in a row');
  const w = await store.get(id), xs = stepExchanges(w), by = s => xs.find(x => x.step === s);
  assert.deepEqual(by('plan').turns[0].asked, [null], 'the count restarted after the gap');
  assert.equal(w.asked.length, 1);
  assert.equal(w.asked[0].turns, 3);
  assert.deepEqual(w.asked[0].exchanges, ['plan', 'test-plan', 'implement'].map(s => by(s).id));
}));

// test-plan, implement, verify raise it (three turns), verify fails, the Arbiter rules "test", test-plan asks again.
const acrossRewind = answer => ({
  verify: ['fail', 'pass'], arbiter: [{ cause: 'test', answer, evidence: '' }],
  intakeQuestions: [null, null, null, null, runner, null, runner, null, runner, null, runner, null, null],
});

test('7h: a rewind clears the ledger of questions the ruling does not carry', () => run(acrossRewind('Fix the expected value in t1.'), async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'complete');
  const w = await store.get(id), again = stepExchanges(w).find(x => x.step === 'test-plan' && x.round === 1);
  assert.deepEqual(again.turns[0].asked, [null], 'after the rewind it is a new question');
  assert.equal(w.hold, null);
}));

test('7h: a question the ruling carries survives the rewind and still counts', () => run(acrossRewind(`Fix t1. Still open from before: ${runner}`), async ({ store, cwd }) => {
  const id = await store.create('Build it', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, id, quiet)).status, 'held');
  const w = await store.get(id), xs = stepExchanges(w).filter(x => x.round === 0);
  assert.equal(w.hold.cause, 'turns');
  assert.equal(w.asked.find(e => e.id === w.hold.questionId)?.text, runner);
  assert.deepEqual(w.hold.refs, ['test-plan', 'implement', 'verify'].map(s => xs.find(x => x.step === s).id));
}));
