import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HARNESSES, installed } from './cards.mjs';
import { frontDoors, piPackageState, renderSkill } from './doctor.mjs';

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
