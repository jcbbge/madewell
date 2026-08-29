/**
 * harness.mjs — function-rot check for metabolism.mjs (synthetic 6/6).
 *
 * That table is not the tax. The tax is jsonl → tax.mjs (live-feed.mjs, mw-tax.sh).
 *
 * Run: node .madewell/jig/metabolism/harness.mjs
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  wallVerdict,
  shouldAbsorb,
  taxPrevented,
  maintenanceCost,
  DEFAULT_CONFIG,
} from './metabolism.mjs';

import {
  wallA,
  wallB,
  wallC,
  wallD,
  correctionGroupP1,
  correctionGroupP2,
} from './fixtures.mjs';

// ─── Config ───────────────────────────────────────────────────────────────────
const config = { ...DEFAULT_CONFIG };

// ─── Scenario definitions ────────────────────────────────────────────────────
const scenarios = [
  {
    id:          'S1',
    label:       'Wall A — load-bearing, active',
    run:         () => wallVerdict(wallA, config),
    expected:    'SURVIVES',
    detail:      () => {
      const tp = taxPrevented(wallA,  config.window, config).toFixed(2);
      const mc = maintenanceCost(wallA, config.window, config).toFixed(2);
      return `taxPrevented=${tp}h  maintenanceCost=${mc}h`;
    },
  },
  {
    id:          'S2',
    label:       'Wall B — stale / internalized (no regurgitation)',
    run:         () => wallVerdict(wallB, config),
    expected:    'RUMINATE→SLOUGH',
    detail:      () => {
      const tp = taxPrevented(wallB,  config.window, config).toFixed(2);
      const mc = maintenanceCost(wallB, config.window, config).toFixed(2);
      return `taxPrevented=${tp}h  maintenanceCost=${mc}h  regurgitates=${wallB.violations_regurgitate}`;
    },
  },
  {
    id:          'S3',
    label:       'Wall C — crying wolf (high FP rate)',
    run:         () => wallVerdict(wallC, config),
    expected:    'SLOUGH',
    detail:      () => {
      const tp = taxPrevented(wallC,  config.window, config).toFixed(2);
      const mc = maintenanceCost(wallC, config.window, config).toFixed(2);
      return `taxPrevented=${tp}h  maintenanceCost=${mc}h`;
    },
  },
  {
    id:          'S4',
    label:       'Wall D — load-bearing but quiet (regurgitates on ruminate)',
    run:         () => wallVerdict(wallD, config),
    expected:    'RUMINATE→RESTORE',
    detail:      () => {
      const tp = taxPrevented(wallD,  config.window, config).toFixed(2);
      const mc = maintenanceCost(wallD, config.window, config).toFixed(2);
      return `taxPrevented=${tp}h  maintenanceCost=${mc}h  regurgitates=${wallD.violations_regurgitate}`;
    },
  },
  {
    id:          'P1',
    label:       'Promotion P1 — tax crosses fence price → ABSORB',
    run:         () => {
      const result = shouldAbsorb(correctionGroupP1, config);
      return result.promote ? 'ABSORB' : 'NO-PROMOTE';
    },
    expected:    'ABSORB',
    detail:      () => {
      const result = shouldAbsorb(correctionGroupP1, config);
      const tax = correctionGroupP1.recurrences.reduce((s, r) => s + r.tax, 0).toFixed(2);
      const cost = (correctionGroupP1.fence_build_cost + correctionGroupP1.fence_maintenance).toFixed(2);
      return `Σtax=${tax}h  fenceCost=${cost}h  surplus=${result.surplus.toFixed(2)}h  ratificationFires=${result.ratificationFires}`;
    },
  },
  {
    id:          'P2',
    label:       'Promotion P2 — tax below fence price → NO-PROMOTE',
    run:         () => {
      const result = shouldAbsorb(correctionGroupP2, config);
      return result.promote ? 'ABSORB' : 'NO-PROMOTE';
    },
    expected:    'NO-PROMOTE',
    detail:      () => {
      const result = shouldAbsorb(correctionGroupP2, config);
      const tax = correctionGroupP2.recurrences.reduce((s, r) => s + r.tax, 0).toFixed(2);
      const cost = (correctionGroupP2.fence_build_cost + correctionGroupP2.fence_maintenance).toFixed(2);
      return `Σtax=${tax}h  fenceCost=${cost}h  surplus=${result.surplus.toFixed(2)}h  ratificationFires=${result.ratificationFires}`;
    },
  },
];

// ─── Run scenarios ────────────────────────────────────────────────────────────
const results = scenarios.map(s => {
  const actual = s.run();
  const pass   = actual === s.expected;
  return { ...s, actual, pass };
});

// ─── Print table ──────────────────────────────────────────────────────────────
const COL = { id: 4, label: 48, expected: 22, actual: 22, verdict: 7 };

function pad(str, n) { return String(str).padEnd(n); }
function padL(str, n) { return String(str).padStart(n); }

const hr = '─'.repeat(COL.id + COL.label + COL.expected + COL.actual + COL.verdict + 8);

console.log('\n' + hr);
console.log(
  pad('ID',       COL.id)   + '  ' +
  pad('Scenario', COL.label) + '  ' +
  pad('Expected', COL.expected) + '  ' +
  pad('Actual',   COL.actual)   + '  ' +
  'RESULT'
);
console.log(hr);

for (const r of results) {
  const verdict = r.pass ? 'PASS ✓' : 'FAIL ✗';
  console.log(
    pad(r.id,       COL.id)   + '  ' +
    pad(r.label,    COL.label) + '  ' +
    pad(r.expected, COL.expected) + '  ' +
    pad(r.actual,   COL.actual)   + '  ' +
    verdict
  );
  // Detail line — economics visible
  console.log('      ' + r.detail());
  console.log();
}

console.log(hr);

// ─── Summary ──────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const total  = results.length;

console.log(`\nSummary: ${passed}/${total} passed, ${failed} failed.\n`);

if (failed > 0) {
  console.log('FAILED scenarios:');
  for (const r of results.filter(r => !r.pass)) {
    console.log(`  ${r.id} — ${r.label}`);
    console.log(`    expected: ${r.expected}`);
    console.log(`    actual:   ${r.actual}`);
  }
  console.log();
}

// ─── Config dump (sensitivity visible) ───────────────────────────────────────
console.log('Config used:');
for (const [k, v] of Object.entries(config)) {
  console.log(`  ${k}: ${v}`);
}
console.log();

const live = spawnSync(
  process.execPath,
  [join(dirname(fileURLToPath(import.meta.url)), 'live-feed.mjs')],
  { encoding: 'utf8' },
);
process.stdout.write(live.stdout || '');
process.stderr.write(live.stderr || '');

process.exit(failed > 0 || live.status !== 0 ? 1 : 0);
