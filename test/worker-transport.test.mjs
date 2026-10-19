import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { createConnection } from 'node:net';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findTmux, launchWorker, readableEvent, runVisibleWorker } from '../worker-transport.mjs';
import { callCard, runCard } from '../pi-call.mjs';
import { reportProgress, requestNested } from '../worker-channel.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
const lines = (...entries) => entries.map(e => JSON.stringify(e) + '\n').join('');
const output = harness => harness === 'pi'
  ? lines({ type: 'session', id: 'session' }, { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'résult' }], stopReason: 'stop' } })
  : harness === 'claude' ? lines({ type: 'result', subtype: 'success', is_error: false, result: 'résult', session_id: 'session' })
  : lines({ type: 'thread.started', thread_id: 'session' }, { type: 'item.completed', item: { type: 'agent_message', text: 'résult' } }, { type: 'turn.completed' });
const card = harness => ({ harness, provider: 'test', model: 'model', effort: 'low', account: 'test' });

function fakeWorker(raw, { code = 0, signal = null, wait = false } = {}) {
  const calls = [], children = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter(); child.pid = 424242 + children.length;
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.prompt = '';
    child.finish = (exitCode = code, exitSignal = signal) => {
      if (child.closed) return;
      child.closed = true; child.stdout.end(); child.stderr.end(); child.emit('close', exitCode, exitSignal);
    };
    child.stdin = new Writable({ write(chunk, _encoding, done) { child.prompt += chunk; done(); }, final(done) {
      done();
      if (!wait) setImmediate(() => { child.stdout.write(raw); child.stderr.write('diagnostic'); child.finish(); });
    } });
    calls.push({ command, args, options }); children.push(child); return child;
  };
  return { spawn, calls, children };
}
function fakeTmux(worker, { connect = true } = {}) {
  const calls = [], rendered = [], sockets = [], paths = [], kills = [];
  const tmux = async args => {
    calls.push(args);
    if (args.includes('list-sessions')) return '$4\tother\t/tmp/test-server\n$7\tselected\t/tmp/test-server\n';
    if (args.includes('display-message')) return '$7\n';
    if (args.includes('new-window')) {
      const path = /'([^']+)'$/.exec(args.at(-1))[1]; paths.push(path);
      if (connect) {
        const socket = createConnection(path); sockets.push(socket);
        runVisibleWorker(socket, { spawn: worker.spawn, render: text => rendered.push(text),
          kill: (pid, signal = 'SIGTERM') => { kills.push([pid, signal]); worker.children.find(c => c.pid === pid)?.finish(null, signal); } });
      }
      return '$7\t@9\t%13\n';
    }
    if (args.includes('kill-window')) { sockets.forEach(socket => socket.destroy()); return ''; }
    throw new Error(`Unexpected fake tmux call: ${args}`);
  };
  return { tmux, calls, rendered, paths, kills, sockets };
}
async function scratch(t) {
  const dir = await mkdtemp(join(tmpdir(), 'mw-launch-test-'));
  t.after(() => rm(dir, { recursive: true, force: true })); return dir;
}
const unavailable = async () => { throw Object.assign(new Error('no tmux'), { code: 'ENOENT' }); };

test('tmux discovery: no binary/unreachable server/disabled mode are ordinary headless', async () => {
  for (const code of ['ENOENT', 'ECONNREFUSED']) {
    assert.equal(await findTmux({}, async () => { throw Object.assign(new Error(code), { code }); }), null);
  }
  assert.equal(await findTmux({ PI_DURABLE_TMUX: 'off' }, () => assert.fail('must not probe')), null);
});

test('tmux discovery reuses current socket/session or explicit session; never starts a server', async () => {
  const fake = fakeTmux(fakeWorker(''));
  const location = await findTmux({ TMUX: '/tmp/existing,123,0', TMUX_PANE: '%8' }, fake.tmux);
  assert.deepEqual(location, { prefix: ['-N', '-S', '/tmp/existing'], session: '$7', server: '/tmp/test-server' });
  assert.equal((await findTmux({ PI_DURABLE_TMUX_SESSION: 'selected' }, fake.tmux)).session, '$7');
  assert.equal(await findTmux({ PI_DURABLE_TMUX_SESSION: 'absent' }, fake.tmux), null);
  assert.ok(fake.calls.every(args => args[0] === '-N' && !args.includes('-L') && !args.includes('new-session')));
});

for (const harness of ['claude', 'codex', 'pi']) for (const visible of [false, true]) {
  test(`${harness}: ${visible ? 'visible' : 'headless'} argv/cwd/environment/stdin, raw streams and actual PID/exit`, async t => {
    const cwd = await scratch(t), raw = output(harness), worker = fakeWorker(raw), fake = fakeTmux(worker);
    const record = join(cwd, 'record'), prompt = 'PRIVATE packet\n$(do not execute)', args = ['literal space', "quote'", 'session-id', 'secret-system'];
    const env = { PI_DURABLE_TMUX: '', TMUX: '', TMUX_PANE: '', PI_DURABLE_TMUX_SESSION: '', TEST_KEY: 'private-value' };
    const events = []; let location, spawned;
    const result = await runCard({ card: card(harness), launch: { command: 'fake-harness', args, env: {} },
      cwd, prompt, record, env, unit: 17, job: 'intake', onLine: e => events.push(e),
      onLocation: async where => { location = where; }, onSpawn: async (pid, where) => {
        assert.equal(worker.children[0].prompt, '', 'PID/location committed before packet delivery'); spawned = [pid, where];
      }, transport: { spawn: worker.spawn, tmux: visible ? fake.tmux : unavailable } });
    assert.equal(result.ok, true); assert.equal(result.output, 'résult'); assert.equal(result.sessionId, 'session');
    assert.equal(result.code, 0); assert.equal(spawned[0], 424242); assert.equal(result.where, location);
    assert.equal(location.transport, visible ? 'tmux' : 'headless');
    assert.equal(worker.children[0].prompt, prompt);
    assert.deepEqual(worker.calls[0], { command: 'fake-harness', args, options: { cwd, detached: true,
      stdio: ['pipe', 'pipe', 'pipe'], env: { ...worker.calls[0].options.env, ...env, PI_DURABLE_WORKER: '1' } } });
    assert.equal(worker.calls[0].options.env.WORK_TOKEN, undefined);
    assert.equal(await readFile(record + '.jsonl', 'utf8'), raw);
    assert.equal(await readFile(record + '.stderr', 'utf8'), 'diagnostic'); assert.ok(events.length);
    if (visible) {
      assert.deepEqual(location, { transport: 'tmux', server: '/tmp/test-server', session: '$7', window: '@9', pane: '%13', pid: 424242 });
      assert.equal(fake.calls.find(args => args.includes('new-window')).at(-2), 'mw-17-intake');
      const argv = JSON.stringify(fake.calls); assert.ok(!argv.includes(prompt) && !argv.includes('private-value') && !argv.includes('secret-system'));
      assert.match(fake.rendered.join(''), /résult/);
      assert.ok(fake.calls.some(args => args.includes('kill-window')));
      await assert.rejects(stat(fake.paths[0]), { code: 'ENOENT' });
    }
  });
}

test('tmux success is not harness success; nonzero, signal and quota are preserved', async t => {
  const cwd = await scratch(t);
  for (const variant of [{ code: 9 }, { signal: 'SIGINT', code: null }, { code: 0, quota: true }]) {
    const raw = variant.quota ? lines({ type: 'result', result: "You've hit your weekly limit · resets 4pm (UTC)", is_error: true }) : output('claude');
    const worker = fakeWorker(raw, variant), fake = fakeTmux(worker);
    const result = await runCard({ card: card('claude'), launch: { command: 'fake', args: [] }, cwd,
      prompt: 'packet', record: join(cwd, `r-${variant.code}-${variant.quota}`), env: { PI_DURABLE_TMUX: '' }, transport: fake });
    assert.equal(result.ok, false); assert.equal(result.code, variant.code ?? -1); assert.equal(result.signal, variant.signal ?? null);
    if (variant.quota) assert.ok(result.limit);
  }
});

test('abort terminates actual worker group and removes visible window', async t => {
  const cwd = await scratch(t), controller = new AbortController();
  const worker = fakeWorker('', { wait: true }), fake = fakeTmux(worker);
  const result = await runCard({ card: card('pi'), launch: { command: 'fake', args: [] }, cwd, prompt: 'packet',
    record: join(cwd, 'abort'), env: { PI_DURABLE_TMUX: '' }, transport: fake, signal: controller.signal,
    onSpawn: () => controller.abort() });
  assert.equal(result.ok, false); assert.equal(result.signal, 'SIGTERM');
  assert.deepEqual(fake.kills[0], [424242, 'SIGTERM']);
  assert.ok(fake.calls.some(args => args.includes('kill-window')));
});

test('owner control disconnect kills worker; viewer/pane loss cannot produce success', async () => {
  const worker = fakeWorker('', { wait: true }), fake = fakeTmux(worker);
  const launch = await launchWorker({ command: 'fake', args: [], cwd: tmpdir(), env: {} }, fake);
  await launch.cleanup(); await tick();
  assert.deepEqual(fake.kills[0], [424242, 'SIGTERM']);
  assert.equal((await launch.completion).code, -1);
});

test('closing a pane while worker runs is recorded as failure, not tmux exit 0', async () => {
  const worker = fakeWorker('', { wait: true }), fake = fakeTmux(worker);
  const launch = await launchWorker({ command: 'fake', args: [], cwd: tmpdir(), env: {} }, fake);
  fake.sockets[0].destroy();
  assert.equal((await launch.completion).code, -1); await launch.cleanup();
});

test('startup failure/timeout cleans private control directory and window, never silently launches duplicate', async () => {
  const worker = fakeWorker(''), fake = fakeTmux(worker, { connect: false });
  await assert.rejects(launchWorker({ command: 'fake', args: [], env: {} }, { ...fake, startupMs: 10 }), /did not connect/);
  assert.equal(worker.calls.length, 0); assert.ok(fake.calls.some(args => args.includes('kill-window')));
  await assert.rejects(stat(fake.paths[0]), { code: 'ENOENT' });
});

test('already aborted call starts nothing', async t => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runCard({ card: card('pi'), launch: { command: 'fake', args: [] },
    record: join(await scratch(t), 'abort'), signal: controller.signal, transport: { tmux: () => assert.fail('must not probe') } }), /abort/i);
});

for (const harness of ['pi', 'claude', 'codex']) test(`${harness}: judgment calls preserve saved session, callbacks, and receipt location on redrive`, async t => {
  const cwd = await scratch(t);
  for (let n = 0; n < 2; n++) {
    const worker = fakeWorker(output(harness)), fake = fakeTmux(worker); let pid;
    const record = join(cwd, `call-${n}`);
    const result = await callCard({ card: card(harness), access: 'read', cwd, prompt: 'packet', record,
      sessionDir: join(cwd, 'same-session-dir'), sessionId: 'same-session', resume: Boolean(n),
      env: { PI_DURABLE_TMUX: '' }, unit: 17, job: 'originator', onSpawn: value => { pid = value; }, transport: fake });
    const args = worker.calls[0].args;
    if (harness === 'pi') {
      assert.equal(args[args.indexOf('--session-id') + 1], 'same-session');
      assert.equal(args[args.indexOf('--session-dir') + 1], join(cwd, 'same-session-dir'));
    } else if (harness === 'claude') {
      assert.equal(args[args.indexOf(n ? '--resume' : '--session-id') + 1], 'same-session');
    } else {
      assert.deepEqual(args.slice(0, 2), ['exec', 'resume']);
      assert.deepEqual(args.slice(-2), ['same-session', '-']);
    }
    assert.equal(pid, 424242); assert.equal(result.where.transport, 'tmux');
    assert.deepEqual(JSON.parse(await readFile(record + '.result.json', 'utf8')).where, result.where);
  }
});

test('readable rendering omits thinking and strips terminal controls', () => {
  assert.equal(readableEvent(lines({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'hello\u001b[2J' }] } })), 'hello[2J');
  assert.equal(readableEvent(lines({ type: 'item.completed', item: { type: 'reasoning', text: 'private' } })), '');
  assert.equal(readableEvent(lines({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read' }] } })), 'Tool: Read');
  assert.equal(readableEvent(lines({ type: 'message_update', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } })), '');
  assert.equal(readableEvent('not json'), '');
  assert.equal(readableEvent(lines({ type: 'tool_execution_start', toolName: 'read' })), 'Tool: read');
});

for (const harness of ['claude', 'codex', 'pi']) for (const visible of [false, true]) test(`${harness}: launcher drains cooperative progress on ${visible ? 'tmux' : 'headless'} exit`, async t => {
  const cwd = await scratch(t), worker = fakeWorker(output(harness)), fake = fakeTmux(worker), events = [];
  await runCard({ card: card(harness), launch: { command: 'fake', args: [] }, cwd, prompt: 'packet',
    record: join(cwd, 'progress'), env: { PI_DURABLE_TMUX: '', PI_DURABLE_ATTEMPT: 'a' }, onLine: e => events.push(e),
    onSpawn: () => reportProgress('Parser ready', 'src/parser.js', worker.calls[0].options.env),
    transport: { spawn: worker.spawn, tmux: visible ? fake.tmux : unavailable } });
  assert.equal(events.filter(e => e.result?.details?.durableProgress?.deliverable === 'Parser ready').length, 1);
});

test('nested hold terminates only its parent worker through the real launcher channel', async t => {
  const cwd = await scratch(t), worker = fakeWorker('', { wait: true }), fake = fakeTmux(worker), controller = new AbortController();
  let requested, calls = 0;
  const result = await runCard({ card: card('pi'), launch: { command: 'fake', args: [] }, cwd, prompt: 'packet',
    record: join(cwd, 'nested-hold'), env: { PI_DURABLE_TMUX: '', PI_DURABLE_ATTEMPT: 'parent-attempt' }, transport: fake,
    nestedDispatch: async () => { calls++; return { status: 'held', exchangeId: 'x', hold: { reason: 'Questions remain' } }; },
    onSpawn: () => { requested = requestNested({ requestId: 'stable', brief: 'consult' }, worker.calls[0].options.env, controller.signal).catch(() => null); } });
  controller.abort(); await requested;
  assert.equal(calls, 1); assert.equal(result.ok, false); assert.equal(result.signal, 'SIGTERM');
  assert.deepEqual(fake.kills[0], [424242, 'SIGTERM']);
});

test('failure to persist launcher callback stops the worker and cleans its window', async t => {
  const cwd = await scratch(t), worker = fakeWorker('', { wait: true }), fake = fakeTmux(worker);
  await assert.rejects(runCard({ card: card('pi'), launch: { command: 'fake', args: [] }, cwd, prompt: 'packet',
    record: join(cwd, 'callback-error'), env: { PI_DURABLE_TMUX: '' }, transport: fake,
    onSpawn: () => { throw new Error('checkpoint failed'); } }), /checkpoint failed/);
  assert.equal(worker.children[0].prompt, '');
  assert.deepEqual(fake.kills[0], [424242, 'SIGTERM']);
  assert.ok(fake.calls.some(args => args.includes('kill-window')));
});

test('abort during tmux startup cleans the waiting window, before packet delivery', async () => {
  const worker = fakeWorker(''), fake = fakeTmux(worker, { connect: false }), controller = new AbortController();
  const start = launchWorker({ command: 'fake', args: [], env: {}, signal: controller.signal }, { ...fake, startupMs: 1000 });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(start, /abort/i);
  assert.equal(worker.calls.length, 0); assert.ok(fake.calls.some(args => args.includes('kill-window')));
});

test('headless spawn error has no invented worker PID or successful completion', async t => {
  const cwd = await scratch(t);
  const result = await runCard({ card: card('pi'), launch: { command: '/missing-made-well-test-command', args: [] }, cwd,
    prompt: 'packet', record: join(cwd, 'missing'), env: { PI_DURABLE_TMUX: 'off' }, onSpawn: () => assert.fail('no worker was spawned') });
  assert.equal(result.code, -1); assert.equal(result.ok, false); assert.equal(result.where.pid, null);
  assert.match(result.error, /ENOENT/);
});
