import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

// Installation is replaceable; the user's work must not live inside an npm package.
export function dataDirectory(env = process.env, home = homedir()) {
  if (env.WORK_DATA !== undefined) {
    if (!env.WORK_DATA.trim()) throw new Error('WORK_DATA must not be empty');
    return resolve(env.WORK_DATA);
  }
  if (env.XDG_DATA_HOME && !isAbsolute(env.XDG_DATA_HOME)) throw new Error('XDG_DATA_HOME must be an absolute path');
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'pi-durable');
}

// Pi sessions use one owner domain per canonical workspace. An explicit store
// remains explicit; never evade its lock by selecting another directory.
export function workspaceDataDirectory(canonicalWorkspace, env = process.env) {
  const base = dataDirectory(env);
  return env.WORK_DATA !== undefined ? base : join(base, 'workspaces', createHash('sha256').update(canonicalWorkspace).digest('hex'));
}
