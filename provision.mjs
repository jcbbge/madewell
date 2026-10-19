import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { HARNESSES, installed } from './cards.mjs';
import { commandState, frontDoors, madeWellPackage, piPackageState, renderSkill, harnessHomes, root } from './doctor.mjs';

const NAMES = { claude: 'Claude Code', codex: 'Codex', pi: 'pi' };

// Put each installed harness's front door in place. Safe to repeat: identical files are left
// alone, missing ones are written, and a different existing file is replaced only with yes.
// pi's local package is loaded in place, without another physical runtime tree.
export async function provision({ env = process.env, yes = false } = {}) {
  const doors = frontDoors(env), actions = [];
  for (const harness of HARNESSES) {
    const door = doors[harness], name = NAMES[harness];
    if (!installed({ harness }, { env })) { actions.push({ harness, action: 'skipped', detail: `${name} is not installed here` }); continue; }
    if (door.kind === 'package') {
      actions.push(await registerPi(door, { yes }));
      continue;
    }
    for (const file of await readdir(door.source)) {
      const want = file === 'SKILL.md' ? renderSkill(await readFile(join(door.source, file), 'utf8')) : await readFile(join(door.source, file), 'utf8');
      const target = join(door.target, file);
      const have = await readFile(target, 'utf8').catch(() => null);
      if (have === want) { actions.push({ harness, action: 'present', path: target }); continue; }
      if (have !== null && !yes) { actions.push({ harness, action: 'differs', path: target, detail: 'left as it is; pi-durable provision --yes replaces it' }); continue; }
      await mkdir(door.target, { recursive: true });
      await writeFile(target, want);
      actions.push({ harness, action: have === null ? 'wrote' : 'replaced', path: target });
    }
  }
  return actions;
}

export async function registerPi(door, { yes = false } = {}) {
  const state = piPackageState(door);
  if (state === 'installed') return { harness: 'pi', action: 'present', path: door.settings };
  if (state === 'invalid') throw new Error(`Invalid pi settings: ${door.settings}; repair them before provisioning.`);
  if (state !== 'missing' && !yes) return { harness: 'pi', action: 'differs', path: door.settings,
    detail: `Made Well package is ${state}; pi-durable provision --yes replaces only its entries` };
  const before = await readFile(door.settings, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const settings = before === null ? {} : JSON.parse(before);
  settings.packages = [...(settings.packages ?? []).filter(entry => !madeWellPackage(entry, door)), door.root ?? root];
  await mkdir(dirname(door.settings), { recursive: true });
  const temp = `${door.settings}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, door.settings);
  return { harness: 'pi', action: state === 'missing' ? 'wrote' : 'replaced', path: door.settings,
    detail: 'one local package; /reload any open pi session' };
}

// A source-backed install: dependencies stay in this checkout; npm supplies the command link.
// No model calls, queue start, listener, service or shell-profile edits.
const runCommand = (command, args, options) => new Promise((done, reject) => {
  execFile(command, args, { ...options, maxBuffer: 4 << 20 }, (error, stdout) => {
    if (error) reject(new Error(`${command} ${args[0]} failed (${error.code ?? 'unknown'}); inspect the package manager locally.`));
    else done(String(stdout).trim());
  });
});
export async function setup({ env = process.env, prefix = null, yes = false, run = runCommand } = {}) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 19)) throw new Error('Made Well needs Node 22.19 or newer.');
  const options = { cwd: root, env };
  prefix = resolve(prefix || await run('npm', ['prefix', '--global'], options));
  await run('npm', ['install', '--no-save', '--package-lock=false', '--ignore-scripts'], options);
  await run('npm', ['link', '--prefix', prefix, '--ignore-scripts'], options);
  const installation = commandState(env);
  if (installation.state !== 'installed') throw new Error(`Linked command in ${join(prefix, 'bin')}, but pi-durable on PATH is ${installation.state}. Put that bin first on PATH, then repeat setup; no absolute skill fallback was installed.`);
  const actions = [...await provision({ env, yes }), ...await provisionHost({ env })];
  const unfinished = actions.filter(a => a.action === 'differs' || a.action === 'check');
  return { ok: !unfinished.length, root, prefix, installation, actions };
}

export function renderProvision(actions) {
  return actions.map(a => `${NAMES[a.harness]}: ${a.action}${a.path ? ` ${a.path}` : ''}${a.detail ? ` — ${a.detail}` : ''}`).join('\n');
}

// The host directive: every agent session on this machine works through Made Well. It goes into each
// installed harness's global instruction file, between markers, so repeating it replaces only its own
// block and never touches the person's other instructions.
export const BEGIN = '<!-- made-well:begin (written by pi-durable provision --host; edit DISPATCH.md in Made Well, not this block) -->';
export const END = '<!-- made-well:end -->';
export const globalFiles = (env = process.env) => {
  const homes = harnessHomes(env);
  return { claude: join(homes.claude, 'CLAUDE.md'), codex: join(homes.codex, 'AGENTS.md'), pi: join(homes.pi, 'AGENTS.md') };
};
export async function dispatchBlock() {
  const text = await readFile(new URL('./DISPATCH.md', import.meta.url), 'utf8');
  return `${BEGIN}\n${text.trim()}\n${END}\n`;
}
export function withBlock(have, block) {
  const start = have.indexOf(BEGIN), end = have.indexOf(END);
  if (start >= 0 && end > start) return have.slice(0, start) + block + have.slice(end + END.length).replace(/^\n/, '');
  return have.trim() ? `${have.replace(/\s*$/, '')}\n\n${block}` : block;
}
export async function provisionHost({ env = process.env } = {}) {
  const files = globalFiles(env), block = await dispatchBlock(), actions = [];
  for (const harness of HARNESSES) {
    if (!installed({ harness }, { env })) { actions.push({ harness, action: 'skipped', detail: `${NAMES[harness]} is not installed here` }); continue; }
    const target = files[harness], have = await readFile(target, 'utf8').catch(() => null), want = withBlock(have ?? '', block);
    if (have === want) { actions.push({ harness, action: 'present', path: target }); continue; }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, want);
    actions.push({ harness, action: have === null ? 'wrote' : 'updated', path: target });
    if (harness === 'codex' && await readFile(join(dirname(target), 'AGENTS.override.md'), 'utf8').then(() => true, () => false))
      actions.push({ harness, action: 'check', path: join(dirname(target), 'AGENTS.override.md'), detail: 'this file shadows AGENTS.md for Codex; add the same block there or remove it' });
  }
  return actions;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let prefix = null, yes = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--yes') yes = true;
      else if (args[i] === '--prefix' && args[i + 1] && !args[i + 1].startsWith('--')) prefix = args[++i];
      else throw new Error('Usage: npm run setup -- [--prefix <writable npm prefix>] [--yes]');
    }
    const result = await setup({ prefix, yes });
    console.log(renderProvision(result.actions));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
