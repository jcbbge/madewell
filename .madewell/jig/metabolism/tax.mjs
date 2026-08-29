#!/usr/bin/env node
/**
 * Live tax — proposed − accepted in, promote / keep / drop out.
 *
 * Reads .madewell/jig/corrections.jsonl and firings.jsonl.
 * Decision functions: metabolism.mjs (lab math, unchanged).
 *
 *   node .madewell/jig/metabolism/tax.mjs
 *
 * Exit 0 always (report). Ratification and take-down are printed, not auto-built.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  shouldAbsorb,
  shouldSlough,
  shouldRuminate,
  taxPrevented,
  maintenanceCost,
  DEFAULT_CONFIG,
} from './metabolism.mjs';

function repoRoot() {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line, i) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`${path}:${i + 1} not JSON`);
    }
  });
}

function correctionGroups(lines, config) {
  const groups = new Map();
  for (const line of lines) {
    if (line.proposed == null) continue;
    const p = line.proposed;
    const id =
      (typeof p === 'object' && (p.convention || p.summary)) ||
      (typeof p === 'string' ? p : null) ||
      'ungrouped';
    const tax =
      typeof p === 'object' && typeof p.tax === 'number'
        ? p.tax
        : config.avg_tax_per_violation;
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        recurrences: [],
        fence_build_cost: config.amortized_build_cost,
        fence_maintenance: config.churn_cost,
      });
    }
    groups.get(id).recurrences.push({ tax, sha: line.sha, ts: line.ts });
  }
  return [...groups.values()];
}

function jigIds(firings, registryPath) {
  const ids = new Set(firings.map((f) => f.jig).filter(Boolean));
  if (existsSync(registryPath)) {
    const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
    for (const j of reg.jigs || []) {
      if (j.id) ids.add(j.id);
    }
  }
  return [...ids];
}

function historyFor(firings, jigId, window, periodMs) {
  const mine = firings
    .filter((f) => f.jig === jigId)
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  if (mine.length === 0) return null;
  const t1 = new Date(mine[mine.length - 1].ts).getTime();
  if (Number.isNaN(t1)) return null;
  const history = [];
  for (let i = window - 1; i >= 0; i--) {
    const start = t1 - (i + 1) * periodMs;
    const end = t1 - i * periodMs;
    const inP = mine.filter((f) => {
      const t = new Date(f.ts).getTime();
      return t > start && t <= end;
    });
    history.push({
      violations_caught: inP.filter((f) => Number(f.violations_caught) > 0 || Number(f.exit) !== 0)
        .length,
      false_positives: inP.filter((f) => f.false_positive).length,
    });
  }
  return {
    id: jigId,
    history,
  };
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const root = process.env.MW_REPO_ROOT || repoRoot();
const jig = process.env.MW_JIG_DIR || `${root}/.madewell/jig`;
const config = { ...DEFAULT_CONFIG };
const corrections = readJsonl(`${jig}/corrections.jsonl`);
const firings = readJsonl(`${jig}/firings.jsonl`);
const groups = correctionGroups(corrections, config);

const promote = [];
const hold = [];
for (const g of groups) {
  const r = shouldAbsorb(g, config);
  const row = {
    id: g.id,
    n: g.recurrences.length,
    tax: g.recurrences.reduce((s, x) => s + x.tax, 0),
    cost: g.fence_build_cost + g.fence_maintenance,
    surplus: r.surplus,
    ratify: r.ratificationFires,
  };
  (r.promote ? promote : hold).push(row);
}

const drop = [];
const keep = [];
const rum = [];
for (const id of jigIds(firings, `${jig}/registry.json`)) {
  const wall = historyFor(firings, id, config.window, WEEK);
  if (!wall) continue;
  const row = {
    id,
    taxPrevented: taxPrevented(wall, config.window, config),
    maintenanceCost: maintenanceCost(wall, config.window, config),
  };
  // Live ledger cannot see sunset outcome (did violations return after relax?).
  // Do not invent regurgitate from silence. Economics → DROP; silence → SUNSET.
  if (shouldSlough(wall, config)) drop.push({ ...row, verdict: 'SLOUGH' });
  else if (shouldRuminate(wall, config)) rum.push({ ...row, verdict: 'RUMINATE' });
  else keep.push({ ...row, verdict: 'SURVIVES' });
}

const overrides = corrections.filter((l) => l.proposed != null).length;

const report = {
  corrections: corrections.length,
  overrides,
  firings: firings.length,
  promote,
  hold,
  drop,
  ruminate: rum,
  keep,
};

if (overrides === 0) {
  report.note =
    'No proposed side recorded. Tax for shop-made jigs is zero until an override is written to .madewell/jig/proposed.json (consumed at commit).';
}

process.stdout.write(JSON.stringify(report, null, 2) + '\n');

process.stderr.write('\nTAX\n');
if (report.note) process.stderr.write(`  ${report.note}\n`);
process.stderr.write(`  overrides ${overrides} / commits ${corrections.length} · firings ${firings.length}\n`);
for (const r of promote) {
  process.stderr.write(
    `  RATIFY (shop-made)  ${r.id}  Σtax ${r.tax}h > cost ${r.cost}h  surplus ${r.surplus}h  n=${r.n}\n`,
  );
}
for (const r of hold) {
  process.stderr.write(
    `  HOLD (below price)  ${r.id}  Σtax ${r.tax}h ≤ cost ${r.cost}h  n=${r.n}\n`,
  );
}
for (const r of drop) {
  process.stderr.write(`  DROP                 ${r.id}  ${r.verdict}\n`);
}
for (const r of rum) {
  process.stderr.write(`  SUNSET               ${r.id}  ${r.verdict}\n`);
}
for (const r of keep) {
  process.stderr.write(`  KEEP                 ${r.id}  SURVIVES\n`);
}
if (promote.length + hold.length + drop.length + rum.length + keep.length === 0) {
  process.stderr.write('  (nothing to score — no overrides, no firings)\n');
}
