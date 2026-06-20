# Land — Specification

**What:** The output stage of one unit of work — the function's return value. The stage is
called **Land** (verb: *land the change*). It fires at **Verify → Land**, because that is the
only moment the full return is knowable.
**Kernel home:** Madewell (ratified 2026-06-19). **Name:** Land (ratified 2026-06-19).
**Status:** Design crystallized. Build = file-only core now; runtime lights later.

---

## 0. Why it exists

A unit of work with no Land doesn't crash — it **leaks**. State accrues, side effects pile
up, docs drift, decisions go homeless, the staging queue never drains. That back-pressure
was Arc's actual disease (160 STAGED / 8 PROMOTED, a rotting backlog, ADR-less decisions).
Land is the **valve**: it closes each cycle so state hands off clean and you can step off the
loop at any boundary in a consistent state.

It is the function's return, **not a fifth phase.** A return isn't another statement in the
body. The four phases stay four; Land is what they emit.

---

## 1. Loop context (where Land sits)

```
while (queue not empty):
    task   = queue.nextReady()          # respects blockedBy edges
    record = invoke(task)               # imagine → plan → make → verify → LAND
    integrate(record)                   # land the brick; drain the item
# queue empty → app at a usable resting state   ← the cycle boundary (macro-valve)
```

- **Inner loop** auto-terminates when the queue empties. The empty queue is the base case.
- **Outer loop** ("run discovery again, queue N more") is **human-driven.**
- Two release granularities: **per-brick** (each Land record is clean) and **per-cycle** (queue empties → shippable resting state).
- The queue is **dependency-annotated** (`blockedBy: [ids]`), not a flat array — required for the factory to self-schedule. `nextReady()` = first task whose blockers are done; ready tasks not claiming the same files may run in parallel.

---

## 2. The Land record — four composable pieces

Each piece feeds a **different organ.** This is why it's structurally four, not forced four.

| Piece | Definition | Routes to | File-decidable? |
|---|---|---|---|
| **DELTA** | the brick that shipped (the merged diff) | the system | ✅ (git) |
| **LEARNED** | the one thing building this revealed that wasn't written down | work-knowledge → memory / ADR · factory-knowledge → metabolism | ⚠️ self-reported |
| **PROPAGATED** | existing surfaces reconciled to the new reality | docs/changelog/comments · state/queue · source STG→PROMOTED · lexicon | ✅ (file invariants) |
| **TAX** | the acceptance differential: proposed (first pass) − accepted (what passed Verify) | Made Well's own tax stream (`.madewell/work/tax.jsonl`); Rumen grazes it as **cud** *if installed* | ✅ (git: first-pass vs landed) |

### LEARNED — two routes, one field
- **About the work** → memory shard / ADR precipitate / lexicon entry. (Mirror of Discovery's required "One Thing": input distills what was *said*; Land distills what *doing it* taught.)
- **About the factory** → the metabolism (Rumen promote/retire; pipeline self-versioning). How the system learns to build better — captured as exhaust.

### TAX — a pure scalar, never polluted
- A **number** the metabolism does arithmetic on (`Σ tax of recurrence > cost to build + maintain fence`). Do **not** fold warning events into it (see §3).
- Captured at land because proposed−accepted only *exists* at land.
- In a dark run, "accepted" = what passed Verify; all corrections are mechanical diffs (no verbal noise) — autonomy makes this sensor **cleaner**, not noisier.
- **Land owns the measurement; Rumen only pulls it.** Land computes and writes the scalar to Made Well's own `.madewell/work/tax.jsonl` (sibling of `status.jsonl`). Rumen, *if installed*, grazes that stream as **cud** — Made Well never imports Rumen, never writes to `.rumen/`, and Land does not break when Rumen is absent (host↔organ; see `DECISIONS.md` 2026-06-20). Writing this field still discharges Rumen's logged risk **R3** ("prototype the tax sensor on real git history") — but as a *pulled contract, not a push*. One build, two payoffs: Made Well's valve + Rumen's starved metabolism.

---

## 3. Two instruments — never fused

| | TAX (the gauge) | WARNINGS (the check-engine panel) |
|---|---|---|
| Type | lagging, scalar | leading, event |
| Timing | after land | between phases, during the run |
| Use | metabolism math | explain/predict a tax spike; locate front-loading leaks |
| Halting? | no | **no** — a warning light, never a shutdown |

**Causal, not additive.** Warnings *predict and explain* tax. When the gauge jumps, the panel
says why. Both surface on one dashboard (Rumen-pro: `.rumen/lab/dashboard.html`); never summed.
The *detection* — the Land walls firing pass/fail — is Made Well's own and works with no
Rumen present; the dashboard is the pro **visualization** of that signal, not its mechanism.

- **NOW (file-decidable → Land walls):** return record missing/incomplete · `STATE.json` didn't advance · docs didn't move when code did · source `STG-###` not PROMOTED · self-reported per-phase confidence read.
- **LATER (runtime → needs the agent harness):** measured question count, tool-call thrash, mid-run confusion. The dashboard is identical; the harness only adds lamps.

---

## 4. Explicitly excluded (decide once — do not re-litigate)

| Rejected | Why |
|---|---|
| **Next** | the queue already holds next; a Next field is double-bookkeeping |
| **Surfaced** | new work goes *into the queue*; read it from queue growth, not a field |
| **Confidence-at-ship** | idea-confidence is gated 3×; the un-gated part (execution struggle) is the *inverse of TAX*. Don't track it twice. (Per-phase confidence survives only as a WARNING light.) |

---

## 5. The template

```
## Land — <lane>   (Verify → Done)

DELTA:       <the brick that shipped — PR #, what was added/repaired>
LEARNED:     <one thing this revealed that wasn't written down>
             → work:    [memory | ADR | lexicon | none]
             → factory: [metabolism signal | none]
PROPAGATED:  [ ] docs/changelog/comments match reality
             [ ] state/queue advanced (lane done, next ready)
             [ ] source STG-### → PROMOTED   (or n/a — not discovery-sourced)
             [ ] lexicon reconciled           (or n/a)
             each item is: [x] done · n/a · OWED→queued as <task>   (deferred propagation
             is debt, tracked as a queue item — it does not block the land)
TAX:         proposed − accepted = <diff size / correction cost>   → .madewell/work/tax.jsonl
             (Rumen grazes this as cud if installed; Made Well never writes to .rumen/)
             (warnings, if any: <which lights fired> → dashboard)
```

DELTA + handoff already half-exist in the commit convention (`DONE:` / `TODO:`).
LEARNED, PROPAGATED, and TAX are the net-new valve.

---

## 6. Open / deferred

- **R3 noise** — the tax sensor is still [BUILD] in Rumen; prototype and measure noise before trusting the promotion trigger. Land is its data source, not its proof.
- **R7 equivalence** — keying "the same correction" is unsolved for the judgment case; LEARNED's categorization may help. Open.
- **Runtime warning lights** — wait for the agent harness.
