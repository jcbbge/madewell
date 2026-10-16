import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResponse } from '../pi-stream.mjs';

test('the verdict is the last JSON object, even after quoted code with braces', () => {
  const report = 'slug.js now reads:\n```js\nexport function slugify(text) { return text.toLowerCase(); }\n```\nAll 9 checks passed.\n{"outcome":"pass","summary":"9 of 9","failures":[]}';
  assert.equal(parseResponse(report).outcome, 'pass');
});
test('a fenced json verdict after prose and code is read', () => {
  const report = 'Ran `npm test`: { "ok": 9 } in the log.\n```json\n{"outcome":"pass","summary":"ok","failures":[]}\n```';
  assert.equal(parseResponse(report).outcome, 'pass');
});
test('plain JSON and fenced-only answers still parse; no JSON still throws', () => {
  assert.deepEqual(parseResponse('{"a":1}'), { a: 1 });
  assert.deepEqual(parseResponse('```json\n{"a":2}\n```'), { a: 2 });
  assert.throws(() => parseResponse('done, no verdict'));
});
