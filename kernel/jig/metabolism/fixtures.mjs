/**
 * fixtures.mjs — Fabricated walls A–D and correction groups P1/P2.
 *
 * Time is faked: each wall carries a `history` array of 6 period objects.
 * The most-recent period is last. Each period: { violations_caught, false_positives }.
 *
 * `violations_regurgitate` encodes what happens during sunset review
 * (ruminate): did violations come back when the wall was relaxed?
 *
 * Stable IDs: the equivalence relation (R7) is an open problem; we
 * stub it by assigning explicit string IDs so "is this the same thing?"
 * is given by the fixture, not solved.
 *
 * All numbers are illustrative — chosen to make the economic outcomes
 * unambiguous, not to model any measured real-world system.
 */

// ─── WALLS ────────────────────────────────────────────────────────────────────

/**
 * Wall A — "load-bearing, active"
 * Fires 8 violations across 6 periods. Low false positives.
 * Expected verdict: SURVIVES.
 *
 * taxPrevented  = (8 × 1.0) − (2 × 0.5)  = 7.0h
 * maintenanceCost = 2.0 + (2 × 0.25) + 0.5 = 3.0h
 * mc < tp → does NOT slough.
 * Not silent → does NOT ruminate.
 * → SURVIVES  ✓
 */
export const wallA = {
  id: 'wall-a',
  label: 'load-bearing, active',
  history: [
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 1, false_positives: 1 },
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 1, false_positives: 0 },
    { violations_caught: 1, false_positives: 1 },
    { violations_caught: 1, false_positives: 0 },
  ],
  violations_regurgitate: false, // irrelevant — never reaches rumination
};

/**
 * Wall B — "stale / internalized"
 * 0 violations across 6 periods. Low FP. On sunset relax: NOTHING regurgitates.
 * Expected verdict: RUMINATE→SLOUGH.
 *
 * taxPrevented  = 0 − 0 = 0h
 * maintenanceCost = 2.0 + 0 + 0.5 = 2.5h
 * mc > tp → shouldSlough = true → would SLOUGH immediately.
 *
 * BUT: with zero FP across 6 periods, mc = 2.0 + 0 + 0.5 = 2.5h
 * and tp = 0h — so economics DO catch it first.
 *
 * DESIGN CHOICE: a truly silent, zero-FP wall with zero violations still
 * carries amortized build cost + churn cost (2.5h) against 0h of tax
 * prevented — so it sloughs economically before reaching rumination.
 *
 * To surface the ruminate path distinctly for Wall B, we give it a tiny
 * positive tax signal (1 violation in an earlier period) so taxPrevented > 0
 * but it falls silent for exactly silence_periods=3 recent periods.
 * The silence check still triggers and sunsetOutcome governs the final call.
 * This is documented in README.md §Design choices.
 *
 * Revised history: 1 old violation, then 3 consecutive silent periods.
 * taxPrevented  = (1 × 1.0) − 0           = 1.0h
 * maintenanceCost = 2.0 + 0 + 0.5         = 2.5h
 * mc > tp → shouldSlough = true → SLOUGH before rumination check.
 *
 * SECOND REVISION: to keep Wall B on the ruminate path (the intent of the
 * scenario), we must ensure mc ≤ tp first. We give it enough early history
 * to break even economically, then fall silent.
 *
 * history (6 periods):
 *   periods 1-3: active — 2 violations, 0 FP each
 *   periods 4-6: silent — 0 violations, 0 FP
 *
 * taxPrevented over window=6: (6 × 1.0) − 0 = 6.0h
 * maintenanceCost             = 2.0 + 0 + 0.5 = 2.5h
 * mc < tp → does NOT slough economically.
 * shouldRuminate: last 3 periods all zero → TRUE.
 * sunsetOutcome: violations_regurgitate = false → SLOUGH.
 * → RUMINATE→SLOUGH  ✓
 */
export const wallB = {
  id: 'wall-b',
  label: 'stale / internalized',
  history: [
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
  ],
  violations_regurgitate: false,
};

/**
 * Wall C — "crying wolf" (dead linter, R9)
 * Fires frequently but ~70% false positives. High triage cost → mc > tp.
 * Expected verdict: SLOUGH.
 *
 * history: 6 periods × { violations_caught: 2, false_positives: 5 }
 * taxPrevented  = 6 × (2 × 1.0 − 5 × 0.5) = 6 × (2.0 − 2.5) = 6 × (−0.5) = −3.0h
 * maintenanceCost = 2.0 + (6 × 5 × 0.25) + 0.5 = 2.0 + 7.5 + 0.5 = 10.0h
 * mc > tp → SLOUGH  ✓
 */
export const wallC = {
  id: 'wall-c',
  label: 'crying wolf — high FP rate',
  history: [
    { violations_caught: 2, false_positives: 5 },
    { violations_caught: 2, false_positives: 5 },
    { violations_caught: 2, false_positives: 5 },
    { violations_caught: 2, false_positives: 5 },
    { violations_caught: 2, false_positives: 5 },
    { violations_caught: 2, false_positives: 5 },
  ],
  violations_regurgitate: false, // irrelevant — sloughs before rumination
};

/**
 * Wall D — "load-bearing but quiet"
 * 0 recent violations, but on sunset relax violations REGURGITATE.
 * Expected verdict: RUMINATE→RESTORE.
 *
 * Same structure as Wall B but violations_regurgitate = true.
 *
 * history: same as B — active early, silent last 3 periods.
 * taxPrevented  over window=6: 6.0h
 * maintenanceCost             : 2.5h
 * mc < tp → does NOT slough economically.
 * shouldRuminate: last 3 periods all zero → TRUE.
 * sunsetOutcome: violations_regurgitate = true → RESTORE.
 * → RUMINATE→RESTORE  ✓
 */
export const wallD = {
  id: 'wall-d',
  label: 'load-bearing but quiet',
  history: [
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 2, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
    { violations_caught: 0, false_positives: 0 },
  ],
  violations_regurgitate: true,
};

// ─── CORRECTION GROUPS ────────────────────────────────────────────────────────

/**
 * P1 — High-cost recurring correction. Tax crosses the fence price.
 * Expected: shouldAbsorb → { promote: true, ratificationFires: true }
 *
 * Σtax = 4 × 1.5 = 6.0h
 * fence_build_cost + fence_maintenance = 2.0 + 1.0 = 3.0h
 * 6.0 > 3.0 → ABSORB  ✓
 */
export const correctionGroupP1 = {
  id: 'correction-p1',
  label: 'high-cost recurring — crosses fence price',
  recurrences: [
    { tax: 1.5 },
    { tax: 1.5 },
    { tax: 1.5 },
    { tax: 1.5 },
  ],
  fence_build_cost:    2.0,
  fence_maintenance:   1.0,
};

/**
 * P2 — Cheap/rare correction. Tax does NOT cross the fence price.
 * Expected: shouldAbsorb → { promote: false, ratificationFires: false }
 *
 * Σtax = 2 × 0.2 = 0.4h
 * fence_build_cost + fence_maintenance = 2.0 + 1.0 = 3.0h
 * 0.4 < 3.0 → does NOT promote  ✓
 */
export const correctionGroupP2 = {
  id: 'correction-p2',
  label: 'cheap / rare — below fence price',
  recurrences: [
    { tax: 0.2 },
    { tax: 0.2 },
  ],
  fence_build_cost:    2.0,
  fence_maintenance:   1.0,
};
