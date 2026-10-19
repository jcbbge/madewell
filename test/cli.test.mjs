import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pendingRequests, submit, relocateStore } from '../queue.mjs';
import { restoreWorkLink } from '../pi-bridge.mjs';

const exec = promisify(execFile), cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const busy = async () => { throw new Error('Store is owned by live process 123'); };
const present = path => access(path).then(() => true, () => false);
async function scratch(t) {
  const root = await mkdtemp(join(tmpdir(), 'mw-doors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('CLI busy start/answer/first/return preserve stable IDs and provenance without launching another runner', async t => {
  const root = await scratch(t), directory = join(root, 'data');
  await mkdir(directory);
  for (const file of ['owner.lock', 'runner.json']) await writeFile(join(directory, file), JSON.stringify({ pid: process.pid }));
  const source = 'Exact operator source.\n\n', sender = { actor: 'chat', harness: 'codex', provider: 'vendor', model: 'dispatch-model', sessionId: 'chat-1', card: { account: 'subscription', effort: 'medium' } };
  const sourceFile = join(root, 'source.txt'), senderFile = join(root, 'sender.json'), textFile = join(root, 'response.txt');
  await writeFile(sourceFile, source); await writeFile(senderFile, JSON.stringify(sender)); await writeFile(textFile, 'Human answer.');
  const env = { ...process.env, WORK_DATA: directory, PI_DURABLE_ALERT: 'none' };
  const run = async args => JSON.parse((await exec(process.execPath, [cli, ...args], { env })).stdout);
  const args = ['start', '--objective', 'Work', '--source-file', sourceFile, '--dispatcher-file', senderFile, '--request-id', 'create-1', '--workspace', root];
  const a = await run(args), b = await run(args);
  assert.equal(a.queued, true); assert.equal(b.requestId, a.requestId); assert.deepEqual(a.runner, { running: true });
  for (const command of [['first', '7'], ['answer', '7', textFile], ['return', 'question', '7', textFile, '--actor', 'chat']]) {
    const out = await run([...command, '--request-id', `id-${command[0]}`]);
    assert.equal(out.queued, true); assert.deepEqual(out.runner, { running: true });
  }
  const entries = await pendingRequests(directory), creation = entries.find(e => e.request.type === 'create').request;
  assert.equal(entries.length, 4);
  assert.equal(creation.source, source);
  assert.deepEqual(creation.dispatcher, { ...sender, job: 'dispatcher' });
  assert.equal(entries.find(e => e.request.type === 'return').request.actor, 'chat');
  assert.deepEqual(new Set(entries.map(e => e.request.requestId)), new Set(['create-1', 'id-first', 'id-answer', 'id-return']));
});

test('CLI show inspects held calls while the runner owns the store, without taking ownership', async t => {
  const root = await scratch(t), directory = join(root, 'data');
  await mkdir(join(directory, 'observability'), { recursive: true });
  await writeFile(join(directory, 'owner.lock'), JSON.stringify({ pid: process.pid }));
  const view = { threadId: 7, state: 'human-hold', done: false, projectedAt: '2026-01-01T00:00:00Z',
    hold: { originator: 'sender', receiver: 'consult', questions: ['Which permission?'] },
    record: { activeCall: 'call-1', calls: [{ id: 'call-1', job: 'authority', actor: 'consult', card: { harness: 'pi', provider: 'vendor', model: 'model' } }] } };
  await writeFile(join(directory, 'observability', 'thread-7.json'), JSON.stringify(view));
  const result = JSON.parse((await exec(process.execPath, [cli, 'show', '7'], { env: { ...process.env, WORK_DATA: directory } })).stdout);
  assert.equal(result.readOnly, true);
  assert.equal(result.record.activeCall, 'call-1');
  assert.deepEqual(result.hold, view.hold);
});

async function relocationFixture(t, { explicit = false } = {}) {
  const root = await scratch(t), from = join(root, 'missing-old-workspace'), to = join(root, 'new-user', 'workspace');
  const sourceDirectory = join(root, 'stores', 'old'), directory = explicit ? sourceDirectory : join(root, 'stores', 'new');
  await mkdir(from); await mkdir(join(root, 'new-user'));
  await rename(from, to); // the real workspace moved; its saved old path no longer resolves
  await mkdir(sourceDirectory, { recursive: true });
  const binding = { from, to, sourceDirectory, directory }, aliases = new Map(), receipts = new Map();
  const config = {
    async workspaceRelocation(a, b) { assert.equal(a, from); assert.equal(b, to); return binding; },
    async recordWorkspaceRelocation(b) { aliases.set(b.from, b); },
    async resolveWorkspaceBinding(link) { const b = aliases.get(link.workspace); return b && b.sourceDirectory === link.directory ? { workspace: b.to, directory: b.directory } : link; },
  };
  const source = `Historical source names ${from}; never replace it.`;
  await writeFile(join(sourceDirectory, 'work.sqlite'), JSON.stringify([{ id: 7, cwd: from, source, events: [], packet: { workspace: from, source } }]));
  await mkdir(join(sourceDirectory, 'sessions'));
  await writeFile(join(sourceDirectory, 'sessions', 'worker.jsonl'), `Original worker evidence at ${from}`);
  const open = async path => {
    const file = join(path, 'work.sqlite');
    const records = JSON.parse(await readFile(file, 'utf8'));
    return {
      async requestReceipt(id) { return receipts.get(id) ?? null; },
      async relocateWorkspace(a, b) {
        const ids = [];
        for (const w of records) if (w.cwd === a) { w.cwd = b; w.packet.workspace = b; w.events.push({ type: 'workspace-relocated', from: a, to: b }); ids.push(w.id); }
        await writeFile(file, JSON.stringify(records)); return { ids };
      }, async close() {},
    };
  };
  await submit(sourceDirectory, { type: 'create', cwd: from, source, objective: 'Queued', requestId: 'pending-create' }, { open: busy });
  return { root, binding, config, source, open, aliases, receipts };
}

for (const boundary of ['afterCommit', 'afterMove']) {
  test(`relocation retries ${boundary}, retains the whole store and rebinds queued cwd without changing source`, async t => {
    const f = await relocationFixture(t), { from, to, sourceDirectory, directory } = f.binding;
    await assert.rejects(relocateStore(from, to, { config: f.config, open: f.open, [boundary]() { throw new Error('interrupted'); } }), /interrupted/);
    assert.equal(f.aliases.size, 0, 'no alias before committed rebinding and closed-store move complete');
    await assert.rejects(submit(directory, { type: 'first', id: 7 }, { open: f.open }), /being relocated/);
    await relocateStore(from, to, { config: f.config, open: f.open });
    assert.equal(await present(sourceDirectory), false);
    const records = JSON.parse(await readFile(join(directory, 'work.sqlite'), 'utf8'));
    assert.equal(records[0].cwd, to); assert.equal(records[0].packet.workspace, to); assert.equal(records[0].source, f.source);
    assert.equal(records[0].events.length, 1, 'retry does not replay the work mutation');
    assert.equal(await readFile(join(directory, 'sessions', 'worker.jsonl'), 'utf8'), `Original worker evidence at ${from}`);
    const queued = (await pendingRequests(directory))[0].request;
    assert.equal(queued.requestId, 'pending-create'); assert.equal(queued.cwd, to); assert.equal(queued.source, f.source);
    assert.equal(f.aliases.get(from).directory, directory);
    assert.equal((await relocateStore(from, to, { config: f.config, open: f.open })).reused, true);
    const restored = await restoreWorkLink({ id: 7, workspace: from, directory: sourceDirectory }, to,
      { resolveBinding: f.config.resolveWorkspaceBinding, dataFor: () => directory });
    assert.deepEqual(restored, { id: 7, workspace: to, directory, relocated: true });
    await assert.rejects(restoreWorkLink({ id: 7, workspace: from, directory: 'unrelated-store' }, to,
      { resolveBinding: f.config.resolveWorkspaceBinding, dataFor: () => directory }), /ENOENT/);
  });
}

test('relocation acknowledges committed-but-unremoved requests before rebinding unapplied create cwd', async t => {
  const f = await relocationFixture(t), { sourceDirectory, directory, from, to } = f.binding;
  await submit(sourceDirectory, { type: 'create', cwd: from, source: f.source, objective: 'Already committed', requestId: 'committed-create' }, { open: busy });
  await submit(sourceDirectory, { type: 'first', id: 7, requestId: 'committed-priority' }, { open: busy });
  f.receipts.set('committed-create', { id: 12 }); f.receipts.set('committed-priority', { first: 7 });
  const result = await relocateStore(from, to, { config: f.config, open: f.open });
  assert.equal(result.pending, 1);
  assert.deepEqual((await pendingRequests(directory)).map(e => [e.request.requestId, e.request.cwd]), [['pending-create', to]]);
  assert.equal(JSON.parse(await readFile(join(directory, 'work.sqlite'))).length, 1, 'relocation starts no pending work');
});

test('explicit WORK_DATA rebinds in place; collision and live-owner checks happen before mutation', async t => {
  const f = await relocationFixture(t, { explicit: true });
  const { from, to, sourceDirectory } = f.binding;
  await writeFile(join(sourceDirectory, 'runner.json'), JSON.stringify({ pid: process.pid }));
  await assert.rejects(relocateStore(from, to, { config: f.config, open: f.open }), /live runner/);
  assert.equal(JSON.parse(await readFile(join(sourceDirectory, 'work.sqlite')))[0].cwd, from);
  await rm(join(sourceDirectory, 'runner.json'));
  await relocateStore(from, to, { config: f.config, open: f.open });
  assert.equal(JSON.parse(await readFile(join(sourceDirectory, 'work.sqlite')))[0].cwd, to);
  const g = await relocationFixture(t);
  await mkdir(g.binding.directory); await writeFile(join(g.binding.directory, 'other-work'), 'unrelated');
  await assert.rejects(relocateStore(g.binding.from, g.binding.to, { config: g.config, open: g.open }), /not empty/);
  assert.equal(JSON.parse(await readFile(join(g.binding.sourceDirectory, 'work.sqlite')))[0].cwd, g.binding.from);
});

test('saved numeric work ID cannot silently bind to an unrelated store', async t => {
  const root = await scratch(t);
  await assert.rejects(restoreWorkLink({ id: 7, workspace: root, directory: join(root, 'old-data') }, root,
    { resolveBinding: async b => b, dataFor: () => join(root, 'other-data') }), /another store/);
});

test('skills use PATH, provision the sender and explain NQ in both directions without go-ahead', async () => {
  for (const harness of ['claude', 'codex']) {
    const text = await readFile(new URL(`../harness/${harness}/made-well/SKILL.md`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /\{\{cli\}\}|node \/|\/(home|Users)\//);
    for (const required of ['PATH', '--dispatcher-file', '--request-id', 'dispatcher → first worker', 'return clear', 'return question', 'Three']) assert.ok(text.includes(required));
    assert.doesNotMatch(text, /--delivery/);
  }
});
