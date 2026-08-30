#!/usr/bin/env node
/**
 * Prove tax.mjs on jsonl, not on in-memory fixtures.
 * Fixture harness (6/6) is function-rot. This is the promote / hold / drop / sunset feed.
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'mw-tax-'));
const t0 = Date.parse('2026-01-01T00:00:00Z');

function iso(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const corrections = [
  { ts: iso(t0), sha: 'a1', proposed: null, subject: 'noise' },
  ...[0, 1, 2, 3].map((i) => ({
    ts: iso(t0 + i * WEEK),
    sha: `p1-${i}`,
    proposed: { convention: 'correction-p1', summary: 'recurring miss', tax: 1.5 },
  })),
  ...[0, 1].map((i) => ({
    ts: iso(t0 + i * WEEK),
    sha: `p2-${i}`,
    proposed: { convention: 'correction-p2', summary: 'cheap miss', tax: 0.2 },
  })),
];

function weekLine(jig, i, extra) {
  return {
    ts: iso(t0 + i * WEEK),
    sha: `${jig}-${i}`,
    jig,
    mode: 'block',
    ...extra,
  };
}

const firings = [
  ...[0, 1, 2, 3, 4, 5].map((i) =>
    weekLine('wolf', i, { exit: 1, violations_caught: 2, false_positive: true }),
  ),
  ...[0, 1, 2, 3, 4, 5].map((i) =>
    weekLine('load-bearing', i, { exit: 1, violations_caught: 2 }),
  ),
  ...[0, 1, 2].map((i) => weekLine('sunset-me', i, { exit: 1, violations_caught: 2 })),
  ...[3, 4, 5].map((i) => weekLine('sunset-me', i, { exit: 0, violations_caught: 0 })),
];

writeFileSync(join(dir, 'corrections.jsonl'), corrections.map((l) => JSON.stringify(l)).join('\n') + '\n');
writeFileSync(join(dir, 'firings.jsonl'), firings.map((l) => JSON.stringify(l)).join('\n') + '\n');
writeFileSync(join(dir, 'registry.json'), JSON.stringify({ jigs: [] }));

let report;
try {
  const stdout = execFileSync(process.execPath, [join(here, 'tax.mjs')], {
    encoding: 'utf8',
    env: { ...process.env, MW_JIG_DIR: dir, MW_REPO_ROOT: dir },
  });
  report = JSON.parse(stdout);
} catch (e) {
  rmSync(dir, { recursive: true, force: true });
  console.error('live-feed: tax.mjs failed');
  console.error(e.stderr || e.message);
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

const ids = (rows) => rows.map((r) => r.id).sort();
const fail = [];

if (report.overrides !== 6) fail.push(`overrides ${report.overrides} ≠ 6`);
if (!ids(report.promote).includes('correction-p1')) fail.push('P1 must RATIFY (Σtax 6h > cost 2.5h)');
if (report.promote.some((r) => r.id === 'correction-p1' && r.ratify !== true)) {
  fail.push('P1 ratificationFires must be true — never auto-build');
}
if (!ids(report.hold).includes('correction-p2')) fail.push('P2 must HOLD (Σtax 0.4h ≤ cost 2.5h)');
if (!ids(report.drop).includes('wolf')) fail.push('wolf must DROP (false positives cost more than tax prevented)');
if (!ids(report.keep).includes('load-bearing')) fail.push('load-bearing must KEEP');
if (!ids(report.ruminate).includes('sunset-me')) {
  fail.push('sunset-me must SUNSET (silent 3 periods; restore vs retire is not in the log)');
}

console.log('LIVE FEED (jsonl → tax.mjs)');
console.log(`  RATIFY  ${ids(report.promote).join(', ') || '—'}`);
console.log(`  HOLD    ${ids(report.hold).join(', ') || '—'}`);
console.log(`  DROP    ${ids(report.drop).join(', ') || '—'}`);
console.log(`  SUNSET  ${ids(report.ruminate).join(', ') || '—'}`);
console.log(`  KEEP    ${ids(report.keep).join(', ') || '—'}`);

if (fail.length) {
  console.log('FAIL');
  for (const f of fail) console.log(`  ${f}`);
  process.exit(1);
}
console.log('PASS — promote and drop are decided from the ledger, not the fixture table');
process.exit(0);
