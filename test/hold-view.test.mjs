// What the human sees of a hold (thread 17 plan, test 7l): status lists holds first with the alert result,
// and the views speak in answered turns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observe, render } from '../observe.mjs';
import { drive } from '../drive.mjs';
import { run, quiet } from './drive-helpers.mjs';

test('7l: status puts a HOLD line first for each held item, with its alert result, and held items before the rest', () => run({}, async ({ store, cwd, script }) => {
  const done = await store.create('Show the order total', 'source', cwd, { delivery: true });
  assert.equal((await drive(store, done, quiet)).status, 'complete');
  const held = await store.create('Add CSV export', 'source', cwd, { delivery: true });
  await script({ askByThread: { [held]: 'Which database should the export use?' } });
  assert.equal((await drive(store, held, quiet)).status, 'held');
  const hold = (await store.get(held)).hold;

  const works = await observe(store.directory), h = works.find(w => w.threadId === held), d = works.find(w => w.threadId === done);
  assert.equal(h.alert?.holdAt, hold.at, 'the view carries the alert sent for this hold');
  assert.deepEqual([h.alert.channel, h.alert.ok], ['none', true]);
  assert.equal(d.alert, null);
  assert.equal(h.exchange.answered, 3, 'answered turns');
  assert.ok(!('rounds' in h.exchange));
  for (const x of h.record.exchanges) { assert.ok('answered' in x && 'subject' in x && !('rounds' in x), JSON.stringify(x)); }

  const text = render(works), lines = text.split('\n');
  assert.equal(lines[0], `HOLD #${held}: ${hold.reason} — alert: none ok`);
  assert.ok(text.indexOf(`WORK ${held}`) < text.indexOf(`WORK ${done}`), 'the held item comes first, ahead of thread order');
  assert.equal(lines.filter(l => l.startsWith('HOLD ')).length, 1, 'one line per held item, none for the finished one');
}));
