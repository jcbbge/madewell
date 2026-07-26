# Debug Hypothesis

**When to use:** Debugging any non-trivial bug — wrong output, crash, flaky test, performance regression, or "it works locally but not in CI."

---

## The Problem This Solves

The #1 failure mode: Form a theory, write 150 lines of "fix" code, it doesn't work, write another 150 lines going deeper into the same wrong theory.

This skill forces a scientific-method loop: **Observe → Hypothesize → Experiment → Conclude**

---

## Phase 1: OBSERVE

**Goal:** Collect raw facts. Reproduce the bug. Separate what you *know* from what you *assume*.

**Steps:**
1. Reproduce the bug. Get exact error message, stack trace, or wrong output.
2. Find minimal reproduction. Strip away unrelated code.
3. Record environment: OS, runtime version, dependencies, config.
4. Note what *does* work. The boundary between working and broken is where the bug lives.
5. Write observations to `DEBUG.md` under `## Observations`.

**Exit criteria:**
- [ ] Bug reproduced (or documented as non-reproducible)
- [ ] Exact error message recorded
- [ ] Minimal reproduction identified
- [ ] Observations written down

---

## Phase 2: HYPOTHESIZE

**Goal:** Generate 3-5 possible root causes. Rank by likelihood.

**Steps:**
1. List 3-5 hypotheses. Not 1. Three minimum.
   - Data: wrong input, missing field, type mismatch
   - Logic: wrong condition, off-by-one, race condition
   - Environment: config, version, dependency, permissions
   - State: stale cache, leaked state, initialization order

2. For each hypothesis, write:
   - **Supports:** evidence that backs this theory
   - **Conflicts:** evidence against it
   - **Test:** minimal experiment to prove/disprove

3. Mark the **ROOT HYPOTHESIS** — supporting evidence, no conflicts, easiest to test.

**Example format:**
```markdown
## Hypotheses

### H1: Race condition in session middleware (ROOT)
- Supports: only happens under concurrent requests
- Conflicts: none yet
- Test: add mutex lock, check if bug disappears

### H2: Stale cache returning expired token
- Supports: works after restart
- Conflicts: cache TTL is 5min, bug appears in 30s
- Test: disable cache, reproduce

### H3: Wrong env variable in CI
- Supports: works locally, fails in CI
- Conflicts: env diff shows identical values
- Test: print actual runtime value in CI
```

**Exit criteria:**
- [ ] At least 3 hypotheses written
- [ ] Each has supporting/conflicting evidence
- [ ] Each has a specific test
- [ ] ROOT HYPOTHESIS identified

---

## Phase 3: EXPERIMENT

**Goal:** Test the ROOT HYPOTHESIS with the smallest possible change.

**Rules:**
- One variable at a time. Don't combine two fixes.
- **Maximum 5 lines.** If you need more, hypothesis is too vague.
- Write diagnostic code, not production fix: logs, assertions, hardcoded values.
- Revert after recording results. Keep tree clean.

**Steps:**
1. Write experiment before running: What will you change? What confirms? What rejects?
2. Make the change (max 5 lines).
3. Run the reproduction from Phase 1.
4. Record result: confirmed, rejected, or inconclusive.
5. Revert experimental code.

**Exit criteria:**
- [ ] Experiment executed (one change, one variable)
- [ ] Result recorded
- [ ] Experimental code reverted

---

## Phase 4: CONCLUDE

**Goal:** Confirm root cause, write real fix, add regression test.

**If ROOT HYPOTHESIS confirmed:**
1. Write root cause in one sentence.
2. Now — and only now — write production fix code.
3. Add regression test that fails without fix, passes with it.
4. Commit fix and test together.

**If ROOT HYPOTHESIS rejected:**
1. Record rejection and evidence.
2. Promote next hypothesis to ROOT.
3. Return to Phase 3.
4. If all rejected, return to Phase 1 with new observations.

**Exit criteria:**
- [ ] Root cause identified in one sentence
- [ ] Fix committed
- [ ] Regression test committed
- [ ] Original reproduction now passes

---

## Anti-Bulldozer Rule

If you catch yourself:
- Writing more than 5 lines before confirming → STOP. Back to Phase 2.
- Trying same approach a second time → STOP. Hypothesis rejected. Next one.
- Ignoring conflicting evidence → STOP. Write it down. Re-rank.
- Feeling "almost there" after 3 failed attempts → STOP. You are bulldozing.

**Write it down. Test it. Prove it. Then fix it.**

---

## DEBUG.md Template

```markdown
# Debug: [Brief description]

## Observations
- Error message: 
- Reproduction steps:
- Environment:
- What works:
- What doesn't:

## Hypotheses

### H1: [Name] (ROOT)
- Supports:
- Conflicts:
- Test:

### H2: [Name]
- Supports:
- Conflicts:
- Test:

### H3: [Name]
- Supports:
- Conflicts:
- Test:

## Experiments

### Experiment 1: [Testing H1]
- Change:
- Expected if confirmed:
- Expected if rejected:
- Result:

## Root Cause
[One sentence]

## Fix
[What was changed]
```
