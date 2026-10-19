import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishWork } from '../observe.mjs';

process.env.PI_DURABLE_PORT = '0'; // the session's dashboard takes any free port, never the operator's

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
