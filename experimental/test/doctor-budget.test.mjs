// Slow real-clock acceptance checks. Required separately; not silently included
// in every npm test. See fixtures/doctor/checks.md for the exact verification gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testMachine, nativeMachine, configure, hook, records, expectRecord, requireContainment, fixtureChildren } from './fixtures/doctor/support.mjs';
const enabled = process.env.DOCTOR_TEST_BUDGETS === '1';
const options = { skip: enabled ? false : 'run run-checks.mjs budget: fixed wall-clock budgets remain unverified', timeout: 210_000 };

test('doctor budget: hook default is ten seconds and descendants are gone', options, async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t), tag = `budget-${process.pid}-${Date.now()}`;
  t.after(() => fixtureChildren(tag, true));
  await configure(m, 'claude', { PreToolUse: [{ matcher: 'Bash', hooks: [hook({ mode: 'hang', tag })] }] });
  const result = await m.run();
  expectRecord(result.report, 'unknown', /timeout|deadline/);
  assert.ok(result.elapsed >= 9_000 && result.elapsed < 15_000, `ten-second budget: ${result.elapsed}ms`);
  const children = await fixtureChildren(tag);
  assert.deepEqual(children, []);
});

test('doctor budget: model request is bounded at forty-five seconds', options, async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t, { claude: { model: 'timeout' } });
  const result = await m.run();
  expectRecord(result.report, 'unknown', /timeout|deadline/);
  assert.equal(m.invocations.length, 1);
  assert.ok(result.elapsed >= 44_000 && result.elapsed < 50_000, `45-second budget: ${result.elapsed}ms`);
});

test('doctor budget: each native pi scenario is bounded at thirty seconds', options, async t => {
  const m = await nativeMachine(t); if (!m) return;
  const path = await m.install('pi-hang.ts');
  const result = await m.run();
  const evidence = expectRecord(result.report, 'unknown', path);
  const timed = evidence.filter(r => /timeout|deadline/.test(r.context));
  assert.ok(timed.length >= 4, 'each fresh scenario must have a timed result');
  for (const record of timed) {
    const ms = record.elapsedMs ?? record.elapsed;
    assert.ok(typeof ms === 'number' && ms >= 29_000 && ms < 35_000, 'per-scenario elapsed milliseconds');
  }
  assert.ok(result.elapsed < 135_000);
});

test('doctor budget: overall bound and incomplete registration coverage', options, async t => {
  if (!await requireContainment(t)) return;
  const m = await testMachine(t);
  const tag = `overall-${process.pid}-${Date.now()}`;
  t.after(() => fixtureChildren(tag, true));
  await configure(m, 'claude', { PreToolUse: [{ matcher: 'Bash', hooks: Array.from({ length: 24 }, (_, i) =>
    hook({ mode: 'hang', tag: `${tag}-${i}` })) }] });
  const result = await m.run();
  assert.ok(result.elapsed < 185_000, `180-second overall bound: ${result.elapsed}ms`);
  assert.equal(result.report.ok, false);
  const unknown = records(result.report).filter(r => r.status === 'unknown' && /PreToolUse/.test(r.context));
  assert.ok(unknown.length >= 24, 'every timed-out or unstarted registration remains visible');
  if (result.elapsed >= 175_000) {
    assert.ok(unknown.some(r => /unstarted|not.started|deadline/.test(r.context)));
  } else {
    t.diagnostic('Concurrent probes finished before the overall deadline; inspect the unstarted-check deadline branch separately.');
  }
  assert.deepEqual(result.report.notes, []);
  assert.deepEqual(await fixtureChildren(tag), []);
});
