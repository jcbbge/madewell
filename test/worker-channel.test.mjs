import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, appendFile, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { childEnvironment } from '../child-environment.mjs';
import { openWorkerChannel, readCheckIn, reportProgress, requestNested } from '../worker-channel.mjs';
import { bindNestedDispatch } from '../nested-protocol.mjs';
import durableProgress from '../work-progress.mjs';

async function scratch(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mw-channel-test-'));
  t.after(() => rm(directory, { recursive: true, force: true })); return directory;
}
function withEnv(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
}
function fakePi() {
  const handlers = {}, tools = {};
  return { handlers, tools, on(name, callback) { handlers[name] = callback; }, registerTool(tool) { tools[tool.name] = tool; } };
}

test('child environment never grants a new worker its parent progress or board authority', () => {
  const env = { PATH: '/test', WORK: 'parent', WORK_TOKEN: 'lease', PI_DURABLE_ATTEMPT: 'parent',
    PI_DURABLE_CHECKIN: '/parent/checkin', PI_DURABLE_PROGRESS: '/parent/progress', PI_DURABLE_NESTED: '1',
    PI_DURABLE_CHANNEL: '/parent/channel', PI_DURABLE_NODE: '/parent/node' };
  assert.deepEqual(childEnvironment(env), { PATH: '/test' });
  assert.deepEqual(childEnvironment(env, { PI_DURABLE_ATTEMPT: 'child', PI_DURABLE_WORKER: '1' }),
    { PATH: '/test', PI_DURABLE_ATTEMPT: 'child', PI_DURABLE_WORKER: '1' });
});

for (const harness of ['claude', 'codex', 'pi']) test(`${harness}: transport progress is the existing core event, never another record`, async t => {
  const directory = await scratch(t), entries = [];
  const channel = await openWorkerChannel({ record: join(directory, 'run'), attemptId: 'attempt', onLine: entry => entries.push(entry) });
  const env = { ...channel.env, PI_DURABLE_ATTEMPT: 'attempt' };
  assert.equal((await stat(channel.env.PI_DURABLE_PROGRESS)).mode & 0o777, 0o600);
  await reportProgress('Parser ready', 'src/parser.js', env);
  await channel.drain(); await channel.drain();
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], { type: 'tool_execution_end', toolName: 'durable_progress', isError: false,
    result: { details: { durableProgress: { attemptId: 'attempt', deliverable: 'Parser ready', evidence: 'src/parser.js' } } } });
  await channel.close();
  await assert.rejects(stat(channel.env.PI_DURABLE_PROGRESS), { code: 'ENOENT' });
});

test('progress validates attempt and nonempty deliverable/evidence, handles partial appends, flushes on close', async t => {
  const directory = await scratch(t), entries = [];
  const channel = await openWorkerChannel({ record: join(directory, 'run'), attemptId: 'right', onLine: entry => entries.push(entry) });
  const path = channel.env.PI_DURABLE_PROGRESS;
  await appendFile(path, 'not-json\n' + JSON.stringify({ attemptId: 'wrong', deliverable: 'x', evidence: 'y' }) + '\n');
  await appendFile(path, JSON.stringify({ attemptId: 'right', deliverable: 'x', evidence: '' }) + '\n');
  const valid = JSON.stringify({ attemptId: 'right', deliverable: 'last', evidence: 'file' });
  await appendFile(path, valid.slice(0, 10)); await channel.drain(); assert.equal(entries.length, 0);
  await appendFile(path, valid.slice(10) + '\n'); await channel.close(); assert.equal(entries.length, 1);
  await assert.rejects(reportProgress('', 'file', { PI_DURABLE_PROGRESS: path, PI_DURABLE_ATTEMPT: 'right' }), /required/);
  assert.equal(await openWorkerChannel({ record: 'unused', onLine: () => {} }), null);
});

test('all print/exec harnesses can read the same check-in, scoped to their own attempt', async t => {
  const directory = await scratch(t), path = join(directory, 'check-in.json');
  const env = { PI_DURABLE_CHECKIN: path, PI_DURABLE_ATTEMPT: 'a' };
  assert.equal(await readCheckIn(env), null);
  const question = { id: 'q', attemptId: 'a', text: 'What prevents the next deliverable?' };
  await writeFile(path, JSON.stringify(question)); assert.deepEqual(await readCheckIn(env), question);
  assert.equal(await readCheckIn({ ...env, PI_DURABLE_ATTEMPT: 'b' }), null);
});

test('known native pi delegation is blocked at tool_call, including nested executeTool calls, before any dispatch', async t => {
  withEnv(t, { PI_DURABLE_WORKER: '1', PI_DURABLE_ATTEMPT: undefined, PI_DURABLE_CHECKIN: undefined });
  const pi = fakePi(); durableProgress(pi);
  let executions = 0;
  const execute = async (toolName, input, parentToolCallId) => {
    const decision = await pi.handlers.tool_call({ toolName, input, parentToolCallId });
    if (!decision?.block) executions++;
    return decision;
  };
  for (const tool of ['subagent', 'durable_work']) for (const parent of [undefined, 'codemode/1']) {
    assert.equal((await execute(tool, { action: 'start' }, parent)).block, true);
  }
  assert.equal(executions, 0, 'no agent can execute through these routes without a sanctioned exchange');
  assert.equal(await execute('durable_work', { action: 'status' }), undefined);
  assert.equal(await execute('read', { path: 'source' }), undefined);
  // Bash is deliberately not classified by a brittle command regex. Aliases/scripts
  // require isolation to enforce; this path is UNKNOWN, not counted as NQ coverage.
  assert.equal(await execute('bash', { command: 'some-wrapper-that-launches-an-agent' }), undefined);
});

test('normal pi sessions are not constrained by worker-only delegation policy', t => {
  withEnv(t, { PI_DURABLE_WORKER: undefined, PI_DURABLE_ATTEMPT: undefined, PI_DURABLE_CHECKIN: undefined });
  const pi = fakePi(); durableProgress(pi); assert.equal(pi.handlers.tool_call, undefined);
});

test('pi keeps its progress tool and native live check-in steering', async t => {
  const directory = await scratch(t), inbox = join(directory, 'check-in.json');
  withEnv(t, { PI_DURABLE_WORKER: '1', PI_DURABLE_ATTEMPT: 'a', PI_DURABLE_CHECKIN: inbox });
  const pi = fakePi(), received = Promise.withResolvers();
  pi.sendMessage = (message, options) => { received.resolve({ message, options }); };
  durableProgress(pi);
  const report = await pi.tools.durable_progress.execute('p', { deliverable: 'Parser', evidence: 'src/parser.js' });
  assert.deepEqual(report.details.durableProgress, { attemptId: 'a', deliverable: 'Parser', evidence: 'src/parser.js' });
  await assert.rejects(pi.tools.durable_progress.execute('p', { deliverable: '', evidence: 'file' }), /Name a deliverable/);
  await writeFile(inbox, JSON.stringify({ id: 'q', attemptId: 'a', text: 'What prevents completion?' }));
  t.after(() => pi.handlers.session_shutdown());
  await pi.handlers.session_start();
  const result = await received.promise;
  assert.match(result.message.content, /What prevents completion/);
  assert.deepEqual(result.options, { triggerTurn: true, deliverAs: 'steer' });
  assert.equal(JSON.parse(await readFile(inbox, 'utf8')).id, 'q');
});

const receiver = { actor: 'child', job: 'consult', card: { harness: 'pi', provider: 'test', model: 'model', effort: 'low', account: 'test' } };
const nestedRequest = { requestId: 'stable-consult', brief: 'Inspect the named contract. Do not change files.', receiver };

test('nested adapter binds the actual parent; child cannot supply a sender/work/parent, and every retry reaches core', async () => {
  const calls = [], records = new Map();
  // Contract fixture, not another NQ implementation: core's saved answer is the
  // only result this adapter can return. Core tests own the law/durability proof.
  const store = { async nestedDispatch(workId, request, callbacks) {
    calls.push({ workId, request, callbacks });
    const prior = records.get(request.requestId), fingerprint = JSON.stringify(request);
    if (prior && prior.fingerprint !== fingerprint) throw new Error('Nested request ID has different content');
    const result = prior?.result ?? { status: 'reported', exchangeId: 'x', callId: 'nested-call', output: 'consulted report' };
    records.set(request.requestId, { fingerprint, result }); return result;
  } };
  const callbacks = { intake: () => {}, answer: () => {}, execute: () => {}, receive: () => {} };
  const dispatch = bindNestedDispatch(store, 17, 'running-parent', callbacks);
  const response = await dispatch({ ...nestedRequest, sender: 'impostor', parentCallId: 'other', workId: 99 });
  assert.deepEqual(calls[0], { workId: 17, request: { ...nestedRequest, access: 'read', parentCallId: 'running-parent' }, callbacks });
  assert.deepEqual(await bindNestedDispatch(store, 17, 'running-parent')(nestedRequest), response);
  assert.equal(calls.length, 2, 'redriven adapter asks core; it never invents/cache-clears NQ');
  await assert.rejects(dispatch({ ...nestedRequest, brief: 'different' }), /different content/);
  assert.throws(() => bindNestedDispatch({}, 17, 'parent'), /core nestedDispatch/);
  assert.throws(() => bindNestedDispatch(store, 17, null), /running parent/);
  assert.throws(() => dispatch({ ...nestedRequest, access: 'unknown' }), /access/);
});

for (const harness of ['claude', 'codex', 'pi']) test(`${harness}: sanctioned channel forwards hold/report/limit from owner, never launches an agent itself`, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mw-nested-test-')), calls = [], held = [];
  let status = 'held';
  const store = { async nestedDispatch(id, request) {
    calls.push({ id, request });
    return { status, exchangeId: 'exchange', ...(status === 'reported' ? { output: 'accepted return report' } : {}) };
  } };
  const channel = await openWorkerChannel({ record: join(directory, 'run'), attemptId: 'parent-attempt',
    nestedDispatch: bindNestedDispatch(store, 17, 'parent-call'), onHold: result => held.push(result) });
  t.after(() => channel.close());
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const next of ['held', 'limited', 'reported']) {
    status = next;
    const result = await requestNested(nestedRequest, channel.env);
    assert.equal(result.status, next, 'transport cannot turn a hold/limit into execution clearance');
  }
  assert.equal(held.length, 1);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(c => c.id === 17 && c.request.parentCallId === 'parent-call' && c.request.requestId === 'stable-consult'));
});

test('nested transport rechecks retries with core instead of accepting a stale response file', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mw-nested-test-')); let prior;
  const channel = await openWorkerChannel({ record: join(directory, 'run'), attemptId: 'a', nestedDispatch: async request => {
    if (prior && prior !== request.brief) throw new Error('fixed brief mismatch');
    prior = request.brief; return { status: 'reported', output: 'original' };
  } });
  t.after(() => channel.close());
  t.after(() => rm(directory, { recursive: true, force: true }));
  assert.equal((await requestNested(nestedRequest, channel.env)).output, 'original');
  await assert.rejects(requestNested({ ...nestedRequest, brief: 'changed' }, channel.env), /fixed brief mismatch/);
  await assert.rejects(requestNested(nestedRequest, {}), /owner-bound channel/);
});

test('pi sanctioned tool uses the owner channel; native tool remains blocked even when sanctioned dispatch is available', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mw-nested-test-')), calls = [];
  const channel = await openWorkerChannel({ record: join(directory, 'run'), attemptId: 'a', nestedDispatch: async request => {
    calls.push(request); return { status: 'reported', exchangeId: 'x', output: 'report' };
  } });
  t.after(() => channel.close());
  t.after(() => rm(directory, { recursive: true, force: true }));
  withEnv(t, { ...channel.env, PI_DURABLE_WORKER: '1', PI_DURABLE_ATTEMPT: undefined, PI_DURABLE_CHECKIN: undefined });
  const pi = fakePi(); durableProgress(pi);
  assert.equal(pi.handlers.tool_call({ toolName: 'subagent' }).block, true);
  const result = await pi.tools.durable_dispatch.execute('tool', nestedRequest, new AbortController().signal);
  assert.equal(result.details.durableNested.output, 'report'); assert.deepEqual(calls, [nestedRequest]);
});
