import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESSES, binaryFor, installed, loadPrescriptions } from './cards.mjs';

// What this machine can run of what Made Well prescribes. Every check is read-only and spends no quota.
export const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const NAMES = { claude: 'Claude Code', codex: 'Codex', pi: 'pi' };
const MIN_NODE = [22, 19];
const SKILL = 'made-well';
// Hooks that can stop a tool call or a turn; a Made Well worker must get through them.
const GATES = ['PreToolUse', 'UserPromptSubmit', 'Stop', 'SubagentStop'];

const userHome = env => env.HOME || homedir();
export function harnessHomes(env = process.env) {
  return {
    claude: env.CLAUDE_CONFIG_DIR || join(userHome(env), '.claude'),
    codex: env.CODEX_HOME || join(userHome(env), '.codex'),
    pi: env.PI_CODING_AGENT_DIR || join(userHome(env), '.pi', 'agent'),
  };
}

// The front door a person's agent drives Made Well through, per harness. Claude Code and Codex
// both load a skill folder (SKILL.md with name + description frontmatter) from their home's skills/.
export function frontDoors(env = process.env) {
  const homes = harnessHomes(env);
  return {
    claude: { kind: 'skill', source: join(root, 'harness', 'claude', SKILL), target: join(homes.claude, 'skills', SKILL) },
    codex: { kind: 'skill', source: join(root, 'harness', 'codex', SKILL), target: join(homes.codex, 'skills', SKILL) },
    pi: { kind: 'package', command: `pi install ${JSON.stringify(root)}`, settings: join(homes.pi, 'settings.json'), home: userHome(env) },
  };
}

// The skill as written for this checkout: {{cli}} becomes the command that reaches this cli.mjs.
export function renderSkill(text) { return text.replaceAll('{{cli}}', `node ${JSON.stringify(join(root, 'cli.mjs'))}`); }

const readText = path => { try { return readFileSync(path, 'utf8'); } catch { return null; } };

export function skillState(door) {
  const want = renderSkill(readFileSync(join(door.source, 'SKILL.md'), 'utf8'));
  const have = readText(join(door.target, 'SKILL.md'));
  return have === null ? 'missing' : have === want ? 'installed' : 'different';
}

// pi lists packages in its settings; a local path counts when it is a Made Well checkout.
export function piPackageState(door) {
  let settings;
  try { settings = JSON.parse(readFileSync(door.settings, 'utf8')); } catch { return 'missing'; }
  const sources = (settings.packages ?? []).map(p => typeof p === 'string' ? p : p?.source).filter(s => typeof s === 'string');
  for (const source of sources) {
    if (/^(npm:|git:|https?:|ssh:)/.test(source)) { if (/madewell/i.test(source)) return 'installed'; continue; }
    const path = source.startsWith('~/') ? join(door.home, source.slice(2)) : resolve(dirname(door.settings), source);
    const name = (() => { try { return JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).name; } catch { return null; } })();
    if (name === pkg.name) return 'installed';
  }
  return 'missing';
}

function run(command, args, { env = process.env, timeout = 10_000 } = {}) {
  return new Promise(done => execFile(command, args, { env, timeout, maxBuffer: 1 << 20 }, (error, stdout, stderr) =>
    done({ code: error ? (typeof error.code === 'number' ? error.code : -1) : 0, stdout: String(stdout), stderr: String(stderr) })));
}

// true / false / null (UNKNOWN). Only local status reads: no prompt, no model call, no token refresh.
async function signedIn(harness, command, env, providers) {
  if (harness === 'claude') {
    const r = await run(command, ['auth', 'status', '--json'], { env });
    try { const v = JSON.parse(r.stdout).loggedIn; return typeof v === 'boolean' ? { any: v } : { any: null }; } catch { return { any: null }; }
  }
  if (harness === 'codex') {
    const r = await run(command, ['login', 'status'], { env }), text = r.stdout + r.stderr;
    return { any: /not logged in/i.test(text) ? false : r.code === 0 && /logged in/i.test(text) ? true : null };
  }
  const byProvider = {};
  for (const provider of providers) {
    const r = await run(command, ['auth', 'check', '--provider', provider, '--json', '--no-refresh'], { env });
    let status;
    try { status = JSON.parse(r.stdout).status; } catch { status = undefined; }
    byProvider[provider] = status === 'ready' ? true : status === 'not_ready' ? false : null;
  }
  const values = Object.values(byProvider);
  return { any: values.includes(true) ? true : values.length && values.every(v => v === false) ? false : null, byProvider };
}

// Claude Code hook commands that gate tool calls or turns and never mention the worker flag
// (neither in the command nor in the script it runs).
const INTERPRETER = /\/(ba|z)?sh$|\/(node|bun|deno|python3?)$/;
function claudeGuards(home) {
  let settings;
  try { settings = JSON.parse(readFileSync(join(home, 'settings.json'), 'utf8')); } catch { return []; }
  const found = new Set();
  for (const event of GATES) for (const matcher of settings.hooks?.[event] ?? []) for (const hook of matcher?.hooks ?? []) {
    const command = typeof hook?.command === 'string' ? hook.command : '';
    if (!command || command.includes('PI_DURABLE_WORKER')) continue;
    const scripts = command.split(/\s+/).filter(word => isAbsolute(word) && !INTERPRETER.test(word) && existsSync(word) && statSync(word).isFile());
    if (scripts.some(script => readText(script)?.includes('PI_DURABLE_WORKER'))) continue;
    found.add(`${event}: ${scripts[0] ?? command.slice(0, 120)}`);
  }
  return [...found];
}

export async function doctor({ env = process.env } = {}) {
  const problems = [], notes = [];
  const problem = (what, fix) => problems.push({ what, fix });
  const [major, minor] = process.versions.node.split('.').map(Number);
  const nodeOk = major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1]);
  if (!nodeOk) problem(`Node ${process.versions.node} is older than ${MIN_NODE.join('.')}`, 'Install Node 22.19 or newer, then run npm install again.');

  const wanted = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];
  const missing = wanted.filter(name => !existsSync(join(root, 'node_modules', ...name.split('/'), 'package.json')));
  if (missing.length) problem(`Packages not installed: ${missing.join(', ')}`, `Run npm install in ${root}.`);

  let prescriptions = null;
  try { prescriptions = loadPrescriptions(env.PI_DURABLE_PRESCRIPTIONS || undefined); }
  catch (error) { problem(error.message, 'Fix prescriptions.json (or PI_DURABLE_PRESCRIPTIONS) so it loads.'); }
  const cards = prescriptions ? Object.values(prescriptions.tiers).flat() : [];

  const doors = frontDoors(env), homes = harnessHomes(env), harnesses = {};
  for (const harness of HARNESSES) {
    const command = binaryFor(harness), here = installed({ harness }, { env });
    const h = { name: NAMES[harness], command, installed: here, version: null, signedIn: null, frontDoor: null };
    if (here) {
      const v = await run(command, ['--version'], { env });
      h.version = v.code === 0 ? v.stdout.trim().split('\n')[0] || null : null;
      const providers = [...new Set(cards.filter(c => c.harness === harness).map(c => c.provider))];
      const auth = await signedIn(harness, command, env, providers);
      h.signedIn = auth.any;
      if (auth.byProvider) h.providers = auth.byProvider;
      const door = doors[harness];
      h.frontDoor = door.kind === 'skill' ? skillState(door) : piPackageState(door);
      if (h.signedIn === false) problem(`${h.name} is installed but not signed in`, harness === 'claude' ? 'Run: claude auth login'
        : harness === 'codex' ? 'Run: codex login' : `Run pi and sign in (/login) to one of: ${providers.join(', ')}`);
      if (h.frontDoor === 'missing') problem(`${h.name} has no Made Well front door`, door.kind === 'skill' ? 'Run: pi-durable provision' : `Run: ${door.command}`);
      if (h.frontDoor === 'different') problem(`${h.name}'s Made Well skill differs from this checkout`, 'Run: pi-durable provision --yes');
    }
    harnesses[harness] = h;
  }
  if (!HARNESSES.some(h => harnesses[h].installed)) problem('No harness is installed', 'Install Claude Code (claude), Codex (codex) or pi (pi), and sign in.');

  const guards = harnesses.claude.installed ? claudeGuards(homes.claude) : [];
  for (const guard of guards) notes.push(`Claude Code hook ${guard} never mentions PI_DURABLE_WORKER; it must let Made Well's workers (PI_DURABLE_WORKER=1) through.`);
  if (harnesses.codex.installed && existsSync(join(homes.codex, 'hooks.json'))) notes.push(`Codex has hooks (${join(homes.codex, 'hooks.json')}): each must let PI_DURABLE_WORKER=1 through.`);

  const usable = card => {
    const h = harnesses[card.harness];
    if (!h.installed) return false;
    const signed = h.providers ? h.providers[card.provider] : h.signedIn;
    return signed !== false;
  };
  const tiers = {};
  for (const [tier, list] of Object.entries(prescriptions?.tiers ?? {})) {
    const jobs = Object.entries(prescriptions.jobs).filter(([, rx]) => rx.tier === tier).map(([job]) => job);
    tiers[tier] = { jobs, cards: list.map(c => ({ card: `${c.harness} · ${c.provider} · ${c.model} · ${c.effort}`, account: c.account, usable: usable(c),
      signedIn: harnesses[c.harness].providers ? harnesses[c.harness].providers[c.provider] ?? null : harnesses[c.harness].signedIn })) };
    tiers[tier].usable = tiers[tier].cards.filter(c => c.usable).length;
    if (jobs.length && !tiers[tier].usable) problem(`No card for the ${tier} tier (${jobs.join(', ')}) can run here`, `Install and sign in to one of: ${[...new Set(list.map(c => NAMES[c.harness]))].join(', ')}; or edit prescriptions.json.`);
  }
  const blocked = Object.values(tiers).some(t => t.jobs.length && !t.usable);
  return { ok: prescriptions !== null && nodeOk && !missing.length && !blocked, node: process.versions.node, nodeOk, missing, prescriptions: prescriptions !== null, harnesses, tiers, problems, notes };
}

const yes = v => v === true ? 'yes' : v === false ? 'no' : 'UNKNOWN';
export function renderDoctor(r) {
  const lines = [`Node ${r.node}${r.nodeOk ? '' : ' (too old)'} · packages ${r.missing.length ? `missing ${r.missing.join(', ')}` : 'installed'} · prescriptions ${r.prescriptions ? 'valid' : 'INVALID'}`, ''];
  for (const h of Object.values(r.harnesses)) {
    if (!h.installed) { lines.push(`${h.name}: not installed (${h.command})`); continue; }
    const providers = h.providers ? ` (${Object.entries(h.providers).map(([p, v]) => `${p} ${yes(v)}`).join(', ')})` : '';
    lines.push(`${h.name}: ${h.version ?? 'version UNKNOWN'} · signed in ${yes(h.signedIn)}${providers} · front door ${h.frontDoor}`);
  }
  lines.push('');
  for (const [tier, t] of Object.entries(r.tiers)) {
    lines.push(`${tier}${t.jobs.length ? ` (${t.jobs.join(', ')})` : ' (no job uses it)'}: ${t.usable} of ${t.cards.length} cards can run here`);
    for (const c of t.cards) lines.push(`  ${c.usable ? '✓' : '✗'} ${c.card}${c.usable && c.signedIn === null ? ' (sign-in UNKNOWN)' : ''}`);
  }
  if (r.problems.length) lines.push('', 'Problems:', ...r.problems.map(p => `  - ${p.what}. ${p.fix}`));
  if (r.notes.length) lines.push('', 'Check:', ...r.notes.map(n => `  - ${n}`));
  lines.push('', r.ok ? `Every job has a card that can run here.${r.problems.length ? ' Fix the problems above to finish setting up.' : ''}` : 'Not ready: fix the problems above.');
  return lines.join('\n');
}
