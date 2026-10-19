import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

// Installation is replaceable; the user's work must not live inside an npm package.
export function dataDirectory(env = process.env, home = homedir()) {
  if (env.WORK_DATA !== undefined) {
    if (!env.WORK_DATA.trim()) throw new Error('WORK_DATA must not be empty');
    return resolve(env.WORK_DATA);
  }
  if (env.XDG_DATA_HOME && !isAbsolute(env.XDG_DATA_HOME)) throw new Error('XDG_DATA_HOME must be an absolute path');
  return join(env.XDG_DATA_HOME || join(env.HOME || home, '.local', 'share'), 'pi-durable');
}

// Pi sessions use one owner domain per canonical workspace. An explicit store
// remains explicit; never evade its lock by selecting another directory.
export function workspaceDataDirectory(canonicalWorkspace, env = process.env) {
  const base = dataDirectory(env);
  return env.WORK_DATA !== undefined ? base : join(base, 'workspaces', workspaceKey(canonicalWorkspace));
}

const workspaceKey = workspace => createHash('sha256').update(workspace).digest('hex');

// Source may already be gone; use the previously canonical absolute path in that case.
// This only plans identity changes. The caller owns stopped-runner/owner guards and invokes
// store.relocateWorkspace before moving the whole closed store; never patch SQLite with SQL.
export async function workspaceRelocation(from, to, env = process.env) {
  if (!isAbsolute(from) || !isAbsolute(to)) throw new Error('Workspace relocation paths must be absolute');
  from = await realpath(from).catch(error => { if (error.code === 'ENOENT') return resolve(from); throw error; });
  to = await realpath(to);
  if (!(await stat(to)).isDirectory()) throw new Error('Workspace relocation destination must be a directory');
  if (from === to) throw new Error('Workspace relocation source and destination are the same');
  return { from, to, sourceDirectory: workspaceDataDirectory(from, env), directory: workspaceDataDirectory(to, env) };
}

const relocationFile = (workspace, env) => join(dataDirectory(env), 'relocations', `${workspaceKey(workspace)}.json`);

// Publish an alias only AFTER the committed record change and whole-store move succeed.
// Each old identity has its own atomic file; unrelated relocations cannot overwrite each other.
export async function recordWorkspaceRelocation(binding, env = process.env) {
  const { from, to, sourceDirectory, directory } = binding;
  if (![from, to, sourceDirectory, directory].every(isAbsolute)) throw new Error('Relocation bindings must be absolute');
  const file = relocationFile(from, env);
  const previous = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const text = JSON.stringify(binding);
  if (previous !== null) {
    if (previous !== text) throw new Error('Workspace already has a different relocation');
    return;
  }
  await mkdir(join(dataDirectory(env), 'relocations'), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, text, { mode: 0o600 });
  try {
    // Publish complete bytes without replacing a competing relocation for this same identity.
    await link(temporary, file).catch(async error => {
      if (error.code !== 'EEXIST') throw error;
      if (await readFile(file, 'utf8') !== text) throw new Error('Workspace already has a different relocation');
    });
  } finally { await unlink(temporary); }
}

// Match BOTH workspace and store, never just a thread number. This can run before realpath
// when a pi session's saved workspace no longer exists, including repeated moves.
export async function resolveWorkspaceBinding({ workspace, directory }, env = process.env) {
  const seen = new Set();
  for (;;) {
    if (seen.has(workspace)) throw new Error('Workspace relocation cycle');
    seen.add(workspace);
    const text = await readFile(relocationFile(workspace, env), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (text === null) return { workspace, directory };
    const binding = JSON.parse(text);
    if (binding.from !== workspace || binding.sourceDirectory !== directory) return { workspace, directory };
    if (!isAbsolute(binding.to) || !isAbsolute(binding.directory)) throw new Error('Invalid workspace relocation binding');
    workspace = binding.to; directory = binding.directory;
  }
}
