import { test } from 'node:test';
import assert from 'node:assert/strict';

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
