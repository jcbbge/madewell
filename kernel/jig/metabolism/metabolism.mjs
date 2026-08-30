/**
 * metabolism.mjs — Rumen R1 synthetic apoptosis harness: decision functions.
 *
 * Pure, deterministic, no Date/Math.random(). All functions are exported
 * so harness.mjs can compose them freely.
 *
 * Terminology (NOMENCLATURE.md):
 *   wall        = a fence (decidable, enforced rule)
 *   slough      = apoptosis — the wall dies
 *   ruminate    = sunset review — wall is relaxed to see if violations regurgitate
 *   regurgitate = violations reappear during rumination → wall was load-bearing
 *   absorb      = promote a correction group to a wall (ratification tap fires)
 *   cud         = accumulated tax (acceptance differential)
 */

// ─── Economic constants (tunable) ─────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  avg_tax_per_violation:  1.0,   // hours of re-work per caught violation
  false_positive_cost:    0.5,   // hours lost per false positive at trigger time
  triage_cost:            0.25,  // hours to triage each false positive (ongoing)
  amortized_build_cost:   2.0,   // hours — build cost amortized over analysis window
  churn_cost:             0.5,   // hours — cost of churn-fighting per window
  silence_periods:        3,     // consecutive zero-violation periods → enter ruminate
  window:                 6,     // number of periods to look back for calculations
};

// ─── Decision functions ────────────────────────────────────────────────────────

/**
 * taxPrevented(wall, window, config)
 *
 * Σ over recent `window` periods of:
 *   (violations_caught × avg_tax_per_violation) − (false_positives × false_positive_cost)
 *
 * Returns a number (hours). Can be negative if FP rate is very high.
 *
 * wall.history: Array of period objects, most-recent last.
 * Each period: { violations_caught: number, false_positives: number }
 */
export function taxPrevented(wall, windowSize, config = DEFAULT_CONFIG) {
  const periods = wall.history.slice(-windowSize);
  return periods.reduce((sum, p) => {
    return sum
      + (p.violations_caught * config.avg_tax_per_violation)
      - (p.false_positives   * config.false_positive_cost);
  }, 0);
}

/**
 * maintenanceCost(wall, window, config)
 *
 * amortized_build_cost
 *   + Σ(false_positives × triage_cost)
 *   + churn_cost
 *
 * All summed over the look-back window.
 */
export function maintenanceCost(wall, windowSize, config = DEFAULT_CONFIG) {
  const periods = wall.history.slice(-windowSize);
  const fpTriageCost = periods.reduce((sum, p) => {
    return sum + (p.false_positives * config.triage_cost);
  }, 0);
  return config.amortized_build_cost + fpTriageCost + config.churn_cost;
}

/**
 * shouldSlough(wall, config)
 *
 * Returns true when maintenanceCost > taxPrevented.
 * Slough = apoptosis.
 */
export function shouldSlough(wall, config = DEFAULT_CONFIG) {
  const mc = maintenanceCost(wall, config.window, config);
  const tp = taxPrevented(wall,   config.window, config);
  return mc > tp;
}

/**
 * shouldRuminate(wall, config)
 *
 * Returns true when the wall has fired 0 violations for ≥ silence_periods
 * consecutive periods (counting from the most recent period backwards).
 *
 * NOTE: we count "silent" periods from the tail of history. If fewer
 * periods exist than silence_periods, only the available periods are checked.
 */
export function shouldRuminate(wall, config = DEFAULT_CONFIG) {
  const recent = wall.history.slice(-config.silence_periods);
  if (recent.length < config.silence_periods) return false;
  return recent.every(p => p.violations_caught === 0);
}

/**
 * sunsetOutcome(wall)
 *
 * Called only after shouldRuminate returns true.
 *
 * The wall is "relaxed" (sunset review). The fixture encodes whether
 * violations_regurgitate: true/false — did violations reappear?
 *
 * Returns:
 *   'RESTORE' — violations regurgitated → wall was load-bearing, keep it.
 *   'SLOUGH'  — nothing regurgitated → convention internalized, retire it.
 */
export function sunsetOutcome(wall) {
  if (wall.violations_regurgitate) {
    return 'RESTORE';
  }
  return 'SLOUGH';
}

/**
 * wallVerdict(wall, config)
 *
 * Top-level decision for a wall. Returns one of:
 *   'SURVIVES'   — earning its keep, no action needed
 *   'SLOUGH'     — retire immediately (too costly)
 *   'RUMINATE→RESTORE' — was silent, but regurgitates → restore
 *   'RUMINATE→SLOUGH'  — was silent, nothing regurgitates → retire
 *
 * Logic:
 *   1. If maintenanceCost > taxPrevented → SLOUGH immediately (R9 / crying wolf).
 *   2. Else if silent for silence_periods → ruminate → RESTORE or SLOUGH.
 *   3. Else → SURVIVES.
 *
 * NOTE on ordering: we check crying-wolf (cost > benefit) before silence.
 * A wall can be both silent AND crying wolf — the economics win; it sloughs
 * without a sunset review, because there is nothing to regurgitate that would
 * justify keeping it. This is documented as a design choice in README.md.
 */
export function wallVerdict(wall, config = DEFAULT_CONFIG) {
  if (shouldSlough(wall, config)) {
    return 'SLOUGH';
  }
  if (shouldRuminate(wall, config)) {
    const outcome = sunsetOutcome(wall);
    return outcome === 'RESTORE' ? 'RUMINATE→RESTORE' : 'RUMINATE→SLOUGH';
  }
  return 'SURVIVES';
}

// ─── Promotion (anabolism) ────────────────────────────────────────────────────

/**
 * shouldAbsorb(correctionGroup, config)
 *
 * A correction group should be promoted to a wall (absorbed) when:
 *   Σ(cud_tax across recurrences) > fence_build_cost + maintenance
 *
 * correctionGroup fields:
 *   id              — stable id (fixture-provided, equivalence stubbed)
 *   recurrences     — array of { tax: number } — each time this correction recurred
 *   fence_build_cost — cost to build the fence
 *   fence_maintenance — estimated ongoing maintenance cost
 *
 * Returns { promote: boolean, ratificationFires: boolean, surplus: number }
 * ratificationFires = true only when promote = true (the human tap required per §4)
 */
export function shouldAbsorb(correctionGroup, config = DEFAULT_CONFIG) {
  const totalTax   = correctionGroup.recurrences.reduce((s, r) => s + r.tax, 0);
  const totalCost  = correctionGroup.fence_build_cost + correctionGroup.fence_maintenance;
  const promote    = totalTax > totalCost;
  return {
    promote,
    ratificationFires: promote,
    surplus: totalTax - totalCost,
  };
}
