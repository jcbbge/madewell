# Commit Workflow

**Mode:** Workflow (updates madewell.json, mints cycle stores)
**Trigger:** Inner loop empty and `discovery` non-empty; "what's next?"; session-start dropping to the outer loop
**Artifacts:** Item(s) moved `discovery` → `active`, one cycle store per committed item, a `task_started` event

---

## What This Does

Commit is the **gate** between intake and execution — the converge beat of the outer loop.
Discovery fills the queue divergently; Commit is where you say "no" / "not now" so nothing
floods downstream. Pull one item, bound it, admit it into Build. A committed item becomes
real work: it gets a Cycle, and that Cycle's Imagine queue is the inner loop's input.

The move `discovery` → `active` is a deliberate decision. Not automatic. Not date-driven.
A choice — made here, one item at a time.

---

## The Protocol

### Step 1: Load State

- `madewell.json` — the `discovery` queue, the `active` list, `blocked`.
- Compute the **frontier**: `discovery` items whose every `dependsOn` is done. Only
  frontier items are eligible; an item waiting on a sibling cannot be committed.
- `DECISIONS.md` — so you don't commit work that contradicts a decision already made.
- If a discovery pass just ran, its proposed items are the candidates.

### Step 2: Decide — one verdict per candidate

| Verdict | Meaning | What happens |
|---|---|---|
| **COMMIT** | Worth acting on now | `discovery` → `active`; a Cycle is born |
| **HOLD** | Real, but not now | Stays on `discovery`. Most items hold — that's the gate working |
| **DISMISS** | No longer worth keeping | Removed from `discovery`, reason named out loud — never silently dropped |
| **DECISION** | Needs a call before it can be work | Surface it; once made, one line in `DECISIONS.md`, then re-verdict |

A finding that keeps getting held but never dismissed is the sign of an unmade
decision — name the decision instead of deferring a fourth time.

**In-flight items go first.** Queue items flagged `in-flight` (from an adoption/migration
discovery pass) are verdicted before all other candidates — they already hold
work-in-progress. Either COMMIT them (bound what's mid-stream) or make stopping that work
an explicit, named call. Never verdict fresh ideas while half-built work sits unbounded.

### Step 3: Bound the Item

Before it enters Build, the committed item must be **bounded** — restated as:

- **Scope** — what's in, and explicitly what's out
- **Done condition** — how Verify will know it became what was imagined

If it can't be bounded in a sentence or two, it isn't one item — split it in
`discovery` first, then commit the first piece.

### Step 4: Hold the Anti-Flood Wall

Keep `active` short — that is the gate's whole purpose. The default is **one** item.
Dispatching several frontier items concurrently (a fleet of Cycles) is allowed, but it
is a deliberate orchestration choice (see `orchestrate.md`), never a default. If
everything is promoted, nothing is committed.

### Step 5: The Mechanics (per committed item)

1. Mint the cycle store — `.madewell/cycles/<id>.json` with `parent`, and:
   - **Locked spec** (item is bounded: in/out/done-when written): `phase: "plan"`. Imagine is
     complete. Do not seed an Imagine queue to re-hash product.
   - **Open shape:** `phase: "imagine"`, empty `imagine` queue (Build seeds it).
2. Move the pointer — remove the item from `discovery`, append `{ "id", "cycle" }` to `active`.
3. Advance `stage` to `build`; refresh `context.summary` / `context.openThread`.
4. Log the event — append to `.madewell/work/status.jsonl`:
   ```jsonl
   {"ts":"...","type":"task_started","session":"SESSION_ID","task":"TASK_ID","summary":"..."}
   ```
5. If the item came from an external intake source (a staged findings doc, an analysis
   file), mark the source item **PROMOTED with a pointer to where it landed** — the inbox
   and the queue must never drift. (Skipping this bookkeeping is how stuck findings
   pile up invisibly.)

### Step 6: Hand Off to Build

**Open shape:** Build seeds the Cycle's Imagine queue from the committed item. Inner loop
starts at Imagine.

**Locked-spec Commit (2026-08-20):** Imagine already happened in the sitting that bounded
the item. Build **starts at Plan**. The orchestrator decomposes into the smallest tasks,
declares `dependsOn`, dispatches the parallel frontier as briefs. It does **not** re-ideate
and does **not** make product decisions. Make = implementer. Verify = a different agent.
Green on the project's main line → outer Land. Product forks mid-Make return to the
Discovery pool.

The outer loop's output is the inner loop's input — this is the seam where the two loops
meet.

---

## The Native-Queue Rule

Committed work lives in the project's real queue — `madewell.json` — in its native item
format. Never mint a parallel tracker, a side-ledger, or a second list, and never route
work to a retired destination. Decisions are not backlog lines: a true directional call
becomes a `DECISIONS.md` entry, and only the work it implies (if any) enters the queue.

---

## Reflection (telemetry for the gate itself)

- Dismissal reasons are signal — patterns in what gets dismissed teach Discovery what
  not to stage.
- If a committed item later proves wrong-to-build, that's a correction **on the gate**,
  not on the builder — record it (`DECISIONS.md` or memory) so the gate learns.

---

*Discovery surfaces everything. Commit is where the "no" happens — so what does enter
Build has the whole system behind it.*
