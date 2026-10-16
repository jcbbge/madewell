import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { HARNESSES, installed } from './cards.mjs';
import { frontDoors, piPackageState, renderSkill, harnessHomes } from './doctor.mjs';

const NAMES = { claude: 'Claude Code', codex: 'Codex', pi: 'pi' };

// Put each installed harness's front door in place. Safe to repeat: identical files are left
// alone, missing ones are written, and a different existing file is replaced only with yes.
// pi's front door is the package itself; its settings are pi's own, so the command is printed.
export async function provision({ env = process.env, yes = false } = {}) {
  const doors = frontDoors(env), actions = [];
  for (const harness of HARNESSES) {
    const door = doors[harness], name = NAMES[harness];
    if (!installed({ harness }, { env })) { actions.push({ harness, action: 'skipped', detail: `${name} is not installed here` }); continue; }
    if (door.kind === 'package') {
      actions.push(piPackageState(door) === 'installed'
        ? { harness, action: 'present', detail: 'Made Well is already a pi package' }
        : { harness, action: 'run', detail: `Run: ${door.command}   (then /reload any open pi session)` });
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
