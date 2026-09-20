// Exercise the real installed Pi extension loader and registered gate callbacks.
// Usage: node pi.t.mjs /absolute/path/to/@earendil-works/pi-coding-agent
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const host = process.argv[2];
assert(host, 'Pass the installed Pi package directory');
const { loadExtensions } = await import(pathToFileURL(join(resolve(host), 'dist/core/extensions/loader.js')).href);
const loaded = await loadExtensions([join(import.meta.dirname, 'pi.ts')], process.cwd());
assert.deepEqual(loaded.errors, []);
assert.equal(loaded.extensions.length, 1);
const extension = loaded.extensions[0];
assert(extension.tools.has('mw_session'));
assert(extension.commands.has('mw'));
const gates = extension.handlers.get('tool_call');
for (const toolName of ['bash', 'write', 'edit', 'unknown_mutating_tool']) {
  const results = await Promise.all(gates.map(gate => gate({ type: 'tool_call', toolName, input: {} })));
  assert(results.some(r => r?.block), `${toolName} must be refused`);
}
for (const toolName of ['read', 'grep', 'find', 'ls', 'mw_session']) {
  const results = await Promise.all(gates.map(gate => gate({ type: 'tool_call', toolName, input: {} })));
  assert(!results.some(r => r?.block), `${toolName} must remain available`);
}
for (const input of [
  { action: 'list' }, { action: 'list-cwd' }, { action: 'pending' }, { action: 'status' },
  { action: 'reply', replyTo: 'request-id', message: 'Evidence is on disk' },
]) {
  const results = await Promise.all(gates.map(gate => gate({ type: 'tool_call', toolName: 'intercom', input })));
  assert(!results.some(r => r?.block), JSON.stringify(input));
}
for (const input of [
  { action: 'send' }, { action: 'ask' }, { action: 'cancel' }, { action: 'reply' },
  { action: 'reply', replyTo: ' ' }, { action: 'list', openProjectPaneIfMissing: true },
  { action: 'reply', replyTo: 'id', openProjectPaneIfMissing: true },
  { action: 'reply', replyTo: 'id', retryOf: 'other' },
]) {
  const results = await Promise.all(gates.map(gate => gate({ type: 'tool_call', toolName: 'intercom', input })));
  assert(results.some(r => r?.block), JSON.stringify(input));
}
console.log('PASS: real Pi loader; 12 refused and 10 allowed callback paths, including narrow intercom policy');

// Invoke the real exported parser via the same installed transpiler, no fake host.
const { createRequire } = await import('node:module');
const requireHost = createRequire(join(resolve(host), 'package.json'));
const { createJiti } = await import(pathToFileURL(requireHost.resolve('jiti')).href);
const jiti = createJiti(import.meta.url, { alias: { typebox: requireHost.resolve('typebox') } });
const { parseRequest } = await jiti.import(join(import.meta.dirname, 'pi.ts'));
const request = { op: 'run', step: 'cut', argv: ['python3', '-c', 'print(42)'] };
assert.equal(parseRequest(request), request);
assert.deepEqual(parseRequest(JSON.stringify(request)), request);
for (const malformed of [null, [], 1, true, '', '{', 'null', '[]', '42', 'true']) {
  assert.throws(() => parseRequest(malformed));
}
const schema = extension.tools.get('mw_session').definition.parameters.properties.request;
assert.deepEqual(schema.anyOf.map(option => option.type), ['object', 'string']);
console.log('PASS: structured and legacy requests, 10 malformed inputs, object-first schema; live UI remains independent');
