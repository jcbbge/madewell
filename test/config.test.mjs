import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rename, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dataDirectory, workspaceDataDirectory, workspaceRelocation, recordWorkspaceRelocation, resolveWorkspaceBinding } from '../config.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'workspace-move-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { HOME: join(root, 'another-person') };
  const old = join(root, 'old'), moved = join(root, 'new');
  await mkdir(old);
  return { root, env, old, moved };
}

test('workspace identity: HOME, XDG and explicit store remain external to installation', () => {
  assert.equal(dataDirectory({ HOME: '/different-person' }), '/different-person/.local/share/pi-durable');
  assert.equal(dataDirectory({ XDG_DATA_HOME: '/data' }), '/data/pi-durable');
  assert.equal(workspaceDataDirectory('/work/a', { WORK_DATA: '/one-store' }), '/one-store');
  assert.throws(() => dataDirectory({ WORK_DATA: ' ' }), /must not be empty/);
  assert.throws(() => dataDirectory({ XDG_DATA_HOME: 'relative' }), /absolute/);
});

test('workspace relocation: actual rename, old path absent, alias preserves exact store identity', async t => {
  const { env, old, moved } = await fixture(t);
  const sourceDirectory = workspaceDataDirectory(old, env);
  await rename(old, moved);
  const binding = await workspaceRelocation(old, moved, env);
  assert.equal(binding.sourceDirectory, sourceDirectory);
  assert.equal(binding.directory, workspaceDataDirectory(moved, env));
  assert.notEqual(binding.sourceDirectory, binding.directory);
  await recordWorkspaceRelocation(binding, env);
  await recordWorkspaceRelocation(binding, env); // retry after committed migration
  assert.deepEqual(await resolveWorkspaceBinding({ workspace: old, directory: sourceDirectory }, env), { workspace: moved, directory: binding.directory });
  assert.deepEqual(await resolveWorkspaceBinding({ workspace: old, directory: '/unrelated-store' }, env), { workspace: old, directory: '/unrelated-store' }, 'never attach the same numeric ID from a different store');
});

test('workspace relocation: canonical symlink destination and explicit WORK_DATA', async t => {
  const { root, env, old, moved } = await fixture(t);
  await rename(old, moved);
  const alias = join(root, 'alias');
  await symlink(moved, alias, 'dir');
  const explicit = { ...env, WORK_DATA: join(root, 'explicit') };
  const binding = await workspaceRelocation(old, alias, explicit);
  assert.equal(binding.to, moved);
  assert.equal(binding.directory, explicit.WORK_DATA);
  assert.equal(binding.sourceDirectory, explicit.WORK_DATA);
  await recordWorkspaceRelocation(binding, explicit);
  assert.deepEqual(await resolveWorkspaceBinding({ workspace: old, directory: explicit.WORK_DATA }, explicit), { workspace: moved, directory: explicit.WORK_DATA });
});

test('workspace relocation: validation, conflicts, repeated moves and cycles', async t => {
  const { root, env, old, moved } = await fixture(t);
  await mkdir(moved);
  await assert.rejects(workspaceRelocation('relative', moved, env), /absolute/);
  await assert.rejects(workspaceRelocation(old, old, env), /same/);
  await assert.rejects(workspaceRelocation(old, join(root, 'absent'), env), /ENOENT/);
  const file = join(root, 'file');
  await writeFile(file, 'not a directory');
  await assert.rejects(workspaceRelocation(old, file, env), /directory/);
  const a = await workspaceRelocation(old, moved, env);
  await recordWorkspaceRelocation(a, env);
  const third = join(root, 'third');
  await mkdir(third);
  await assert.rejects(recordWorkspaceRelocation({ ...a, to: third }, env), /different relocation/);
  const b = await workspaceRelocation(moved, third, env);
  await recordWorkspaceRelocation(b, env);
  assert.deepEqual(await resolveWorkspaceBinding({ workspace: old, directory: a.sourceDirectory }, env), { workspace: third, directory: b.directory });
  await recordWorkspaceRelocation(await workspaceRelocation(third, old, env), env);
  await assert.rejects(resolveWorkspaceBinding({ workspace: old, directory: a.sourceDirectory }, env), /cycle/);
});
