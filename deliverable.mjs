import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseResponse } from './pi-stream.mjs';

// What each hand-off must carry to be the step's complete deliverable. Plan and implement are checked by labels, test-plan by its JSON ending.
export const LABELS = { plan: ['Making', 'Not making', 'Done when', 'Waits on'], implement: ['Changed paths', 'Checks run', 'Open items'] };
export const FORMAT = {
  plan: 'Label its parts at the start of a line: Making, Not making, Done when, Waits on.',
  implement: 'Label its parts at the start of a line: Changed paths (every path changed for this work unit, across all rounds), Checks run, Open items.',
  'test-plan': 'End with ONLY a JSON object on its own: {"testPlan":{"scripts":[{"path":string,"command":string,"pass":string}],"evidence":string}}. path: relative to the workspace or absolute; every file must exist. command: run from the workspace. pass: what a passing run shows. evidence: where results land.',
};

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const filled = v => typeof v === 'string' && v.trim() !== '';
const isFile = path => { try { return statSync(path).isFile(); } catch { return false; } };

// The parts of a hand-off that are missing or invalid. Nothing missing: the step's deliverable is complete.
export function checkDeliverable(step, output, cwd) {
  if (LABELS[step]) {
    const text = String(output ?? '');
    return { missing: LABELS[step].filter(label => !new RegExp(`^[ \\t]*(?:#{1,6}[ \\t]*)?(?:[*_]{1,2}[ \\t]*)?${escape(label)}(?![A-Za-z0-9])`, 'im').test(text)) };
  }
  if (step !== 'test-plan') return { missing: [] };
  let plan;
  try { plan = parseResponse(String(output ?? '')).testPlan; } catch {}
  if (!plan || typeof plan !== 'object') return { missing: ['the testPlan JSON ending'] };
  const missing = [], scripts = Array.isArray(plan.scripts) ? plan.scripts : [];
  if (!scripts.length) missing.push('testPlan.scripts: at least one script');
  const hashed = [];
  for (const [i, s] of scripts.entries()) {
    const fields = ['path', 'command', 'pass'].filter(k => !filled(s?.[k]));
    for (const k of fields) missing.push(`testPlan.scripts[${i}].${k}`);
    if (fields.includes('path')) continue;
    const path = resolve(cwd, s.path);
    if (!isFile(path)) { missing.push(`testPlan.scripts[${i}].path does not exist: ${path}`); continue; }
    if (!fields.length) hashed.push({ path, command: s.command, pass: s.pass, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
  }
  if (!filled(plan.evidence)) missing.push('testPlan.evidence');
  return missing.length ? { missing } : { missing, testPlan: { scripts: hashed, evidence: plan.evidence } };
}
