import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishWork } from '../observe.mjs';

const load = async () => (await import('../pi-extension.ts')).default;
const fakePi = () => {
  const handlers = {}, tools = [], commands = [];
  return { handlers, tools, commands, api: {
    on: (event, fn) => { (handlers[event] ??= []).push(fn); },
    registerTool: tool => tools.push(tool.name), registerCommand: name => commands.push(name),
    appendEntry() {}, sendMessage() {},
  } };
};

test('in your chat: durable_work and /work are added, and no tool is ever blocked', async () => {
  delete process.env.PI_DURABLE_WORKER;
  const pi = fakePi();
  (await load())(pi.api);
  assert.deepEqual(pi.tools, ['durable_work']);
  assert.deepEqual(pi.commands, ['work']);
  assert.equal(pi.handlers.tool_call, undefined, 'no tool_call gate');
});

test('inside a step worker the extension stays out of the way', async () => {
  process.env.PI_DURABLE_WORKER = '1';
  try {
    const pi = fakePi();
    (await load())(pi.api);
    assert.deepEqual(pi.tools, []);
    assert.deepEqual(Object.keys(pi.handlers), []);
  } finally { delete process.env.PI_DURABLE_WORKER; }
});

// Thread 17 plan, test 7m: what durable_work status hands the chat carries the hold, held items first.
test('durable_work status carries each hold (cause, reason, who handed over, who asked, the questions) and its alert, held first', async () => {
  delete process.env.PI_DURABLE_WORKER;
  const root = await mkdtemp(join(tmpdir(), 'mpd-ext-')), data = join(root, 'data'), ws = join(root, 'ws');
  await mkdir(ws);
  const cwd = await realpath(ws), at = new Date().toISOString(), before = process.env.WORK_DATA;
  const record = (id, extra) => ({ id, cwd, objective: `Unit ${id}`, position: 3, round: 0, attempts: [], exchanges: [], failures: [], notes: [],
    waitsOn: null, parentId: null, delivery: true, completion: null, hold: null, events: [{ at, type: 'created', pid: 1 }], ...extra });
  const hold = { kind: 'nq', ref: 'x2', at, cause: 'turns', originator: 'Polaris', receiver: 'Cassiopeia-1', questionId: null, refs: ['x2'],
    questions: ['What does fast mean?'], reason: "plan: questions remain after three turns on the handoff from Polaris: its spec or the receiver's scope is wrong or unclear" };
  await publishWork(data, record(1));
  await publishWork(data, record(2, { hold, events: [{ at, type: 'created', pid: 1 }, { at, type: 'alerted', pid: 1, holdAt: at, channel: 'none', ok: true }] }));
  process.env.WORK_DATA = data;
  const handlers = {}, tools = [];
  const api = { on: (e, fn) => { (handlers[e] ??= []).push(fn); }, registerTool: t => tools.push(t), registerCommand() {}, appendEntry() {}, sendMessage() {} };
  const ctx = { cwd, hasUI: false, ui: { setStatus() {} }, sessionManager: { getBranch: () => [], getSessionId: () => 'session' } };
  try {
    (await load())(api);
    for (const fn of handlers.session_start) await fn({}, ctx);
    const out = await tools.find(t => t.name === 'durable_work').execute('call-1', { action: 'status' }, undefined, undefined, ctx);
    const status = JSON.parse(out.content[0].text);
    assert.deepEqual(status.map(w => w.id), [2, 1], 'held first');
    assert.deepEqual(status[0].hold, { cause: 'turns', reason: hold.reason, originator: 'Polaris', receiver: 'Cassiopeia-1', questions: ['What does fast mean?'] });
    assert.deepEqual([status[0].alert?.channel, status[0].alert?.ok, status[0].alert?.holdAt], ['none', true, at]);
    assert.equal(status[1].hold, null);
  } finally {
    for (const fn of handlers.session_shutdown ?? []) await fn({}, ctx);
    if (before === undefined) delete process.env.WORK_DATA; else process.env.WORK_DATA = before;
    await rm(root, { recursive: true, force: true });
  }
});

test('pi start sends full source and actual dispatcher provenance, every mutation has its stable call ID', async t => {
  const root = await mkdtemp(join(tmpdir(), 'mw-extension-')), previous = process.env.WORK_DATA;
  process.env.WORK_DATA = join(root, 'data');
  const calls = [], handlers = {}, tools = [];
  const api = { on: (e, fn) => { (handlers[e] ??= []).push(fn); }, registerTool: tool => tools.push(tool), registerCommand() {},
    appendEntry() {}, sendMessage() {}, getThinkingLevel: () => 'high' };
  const turns = [{ type: 'message', message: { role: 'user', content: 'Keep this exact wording.\n' } },
    { type: 'message', message: { role: 'assistant', content: 'Not operator source' } },
    { type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'And this second turn.' }] } }];
  const ctx = { cwd: root, hasUI: false, model: { provider: 'vendor', id: 'dispatch-model' },
    sessionManager: { getBranch: () => turns, getSessionId: () => 'dispatch-session' } };
  const call = async (file, args, input, directory) => { calls.push({ file, args, input, directory }); return file === 'cli.mjs' ? { running: true } : { queued: true, requestId: input.requestId }; };
  t.after(async () => {
    for (const fn of handlers.session_shutdown ?? []) await fn({}, ctx);
    if (previous === undefined) delete process.env.WORK_DATA; else process.env.WORK_DATA = previous;
    await rm(root, { recursive: true, force: true });
  });
  (await load())(api, { call });
  for (const fn of handlers.session_start) await fn({}, ctx);
  const tool = tools[0];
  for (let i = 0; i < 2; i++) {
    const out = await tool.execute('create-call', { action: 'start', objective: 'Work', context: 'Exact context.' }, undefined, undefined, ctx);
    assert.equal(JSON.parse(out.content[0].text).queued, true);
    assert.match(JSON.parse(out.content[0].text).note, /busy/);
  }
  const starts = calls.filter(c => c.input?.action === 'create');
  assert.deepEqual(starts[0], starts[1]);
  assert.equal(starts[0].input.requestId, 'dispatch-session:create-call');
  assert.equal(starts[0].input.source, 'User conversation (verbatim):\n[User turn 1]\nKeep this exact wording.\n\n\n[User turn 2]\nAnd this second turn.\n\nContext:\nExact context.');
  assert.deepEqual(starts[0].input.dispatcher, { actor: 'pi:dispatch-session', job: 'dispatcher', harness: 'pi', provider: 'vendor', model: 'dispatch-model',
    sessionId: 'dispatch-session', card: { harness: 'pi', provider: 'vendor', model: 'dispatch-model', effort: 'high', account: null }, effort: 'high', account: null });
  for (const action of ['first', 'answer', 'return']) await tool.execute(`${action}-call`, { action, id: 7, text: 'Response', response: 'question', questions: ['Which evidence?'] }, undefined, undefined, ctx);
  const changes = calls.filter(c => ['first', 'answer', 'return'].includes(c.input?.action));
  assert.deepEqual(changes.map(c => c.input.requestId), ['dispatch-session:first-call', 'dispatch-session:answer-call', 'dispatch-session:return-call']);
  assert.equal(changes.at(-1).input.actor, 'pi:dispatch-session');
  assert.equal(changes.at(-1).input.response, 'question');
  assert.equal(calls.filter(c => c.file === 'cli.mjs').length, 5, 'all starts, answers, priority and report returns continue the runner');
});

test('session startup never opens a web listener or installs a keep-alive server timer', async t => {
  const { Server } = await import('node:net');
  const listen = Server.prototype.listen;
  let listeners = 0;
  Server.prototype.listen = function () { listeners++; throw new Error('test refuses listeners'); };
  const root = await mkdtemp(join(tmpdir(), 'mw-no-web-')), previous = process.env.WORK_DATA;
  process.env.WORK_DATA = join(root, 'data');
  const pi = fakePi(), ctx = { cwd: root, hasUI: false, sessionManager: { getBranch: () => [] } };
  t.after(async () => {
    for (const fn of pi.handlers.session_shutdown ?? []) await fn({}, ctx);
    Server.prototype.listen = listen;
    if (previous === undefined) delete process.env.WORK_DATA; else process.env.WORK_DATA = previous;
    await rm(root, { recursive: true, force: true });
  });
  (await load())(pi.api);
  for (const fn of pi.handlers.session_start) await fn({}, ctx);
  assert.equal(listeners, 0);
});
