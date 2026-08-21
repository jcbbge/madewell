# The Made Well Lifecycle — Canonical Model

This file is the **single source of truth** for how work moves through Made Well:
the loops, the stages, the phases, the vocabulary, and where state lives. Everything
else — AGENTS.md, the skills, the packs — implements *this*. When another document
disagrees with this one, this one wins.

---

## Two loops, one shape

Made Well runs **two nested while-loops**. They are the *same four-beat pattern* at two
scales — this self-similarity is the point, not a coincidence:

```
OUTER LOOP — the Made Well lifecycle
  while QUEUE is not empty:            (Discovery fills the pool; Commit admits to the queue)
    pull one item → Commit → Build → Land
                            └── Build runs an INNER LOOP
    ↳ pause: surface to the user, take feedback, then continue

INNER LOOP — one Cycle (lives inside Build)
  while inner work remains:
    [Imagine if shape is still open] → Plan → Make → Verify
    ↳ pause: surface to the user, take feedback, then continue
```

**The first beat of each loop is a queue. The loop drains that queue — but cooperatively:**
after every iteration it **pauses**, surfaces the result, and takes the user's feedback before
the next pull. It is a `while not empty` loop *with a human checkpoint each turn* — never an
autonomous drain. It still terminates when its queue is empty; it just yields between iterations
so the user can steer, redirect, or stop.

- **Outer queue = what Commit admitted.** Discovery fills the pool; Commit admits; pull one
  admitted item, run it, pause; repeat until the QUEUE drains (not the pool).
- **Inner queue = the Cycle's work list.** Default: Imagine items. Locked-spec Commit
  (below): Plan items — Imagine is already done.
- **Discovery feeds Commit, not Build.** Intake fills the **pool**. Commit admits one
  item to the **queue** and mints a Cycle. Build runs that Cycle. When the Cycle Lands,
  the outer loop may pull the next **admitted** item (not the next raw transcript).

**Where a session resumes — inner first.** Most work lives in the inner loop. A session picks
up by checking it first: if there's an active Cycle with pending inner items (`imagine` or
`phase: plan` after a locked-spec Commit), resume there. Only if nothing is in flight does it
drop to the outer loop (Commit the next pool item). Only if both are empty is it a fresh
discovery conversation.

---

## The outer loop — four **stages**

A *stage* is a position in a linear progression: you pass through it once, in order.

| Stage | Beat | What happens |
|---|---|---|
| **Discovery** | take in | Intake. Raw input becomes shaped, **queueABLE** work-items — candidates, not queue members. |
| **Commit** | converge | The gate. Pull one item, bound it. Say no here so nothing floods downstream. **Admission to the queue happens HERE.** |
| **Build** | build | Run a Cycle (the inner loop) against the committed item. |
| **Land** | release | Ship + reflect. Drain the item from the queue; record what was learned. |

The outer loop is the engine that runs the whole project: **`while queue not empty`**.

> **Two reservoirs, not one** (operator ruling 2026-08-13, from a real project at scale).
> Earlier wording made this `while Discovery not empty`, which conflates the intake pool with
> the queue. Discovery is a **feeder**; it fills a **staging pool of candidates**. Commit is
> the **valve** that admits a candidate to the **queue**. The loop drains the queue, not the
> pool.
>
> Why it matters, from the case that surfaced it: one discovery session produced 11 staged
> items and the project's staging pool held 166. Reading Discovery as the queue makes the
> loop appear to have 166 pending iterations, when the true queue held three. A `while`
> condition over the pool never terminates and cannot be planned against — the pool is
> *supposed* to accumulate faster than it drains, because saying "not now" is Commit's whole
> job. See the `land` skill: an undrained staging lake is the diagnostic, not the disease.
>
> Small installs may keep pool and queue in one list; at scale they separate, and the schema
> already anticipates it — `discovery[]` is the pool, `active[]` is what Commit admitted.

---

## The inner loop — four **phases**

A *phase* is a recurring mode within one unit of work. One full pass through all four is
a **Cycle**.

| Phase | Beat | What happens |
|---|---|---|
| **Imagine** | take in | Understand what's wanted; break it into the smallest completable items. Default inner queue. |
| **Plan** | converge | Sequence the items; name dependencies; cut to what's next. Orchestrator. No new product votes. |
| **Make** | build | Produce the artifact. Implementer — not the orchestrator, not the verifier. |
| **Verify** | release | Confirm it became what was imagined. A **different** agent than Make. Pass → Land. Fail → diagnose. |

The inner loop runs inside Build.

### Locked-spec Commit — Imagine already done (operator 2026-08-20)

Product shape is settled **before** Promote/Commit when the item is bounded: what's in,
what's out, done-when, written (a spec, a locked finding). That sitting **is** Imagine.
Promote is the Commit valve: no further product decisions in the Cycle.

Then Build **starts at Plan**. Mint the Cycle `phase: "plan"`. The orchestrator decomposes
into parallel tasks and briefs; it does **not** re-ideate. Make = coder. Verify = a
separate agent. Tests green and merged to the project's main line → outer **Land**.

If a product fork appears mid-Make, it returns to the Discovery **pool**. It is not
decided in Build.

When shape is still open (no spec, cannot bound in a sentence), Commit is refused or the
Cycle starts at Imagine as before. Do not fake a locked spec to skip Imagine.

---

## Vocabulary — fixed

| Term | Meaning |
|---|---|
| **Stage** | One of the four outer positions: Discovery, Commit, Build, Land. |
| **Phase** | One of the four inner modes: Imagine, Plan, Make, Verify. |
| **Cycle** | One complete run through the four phases. The thing you spawn N of. ("We ran 10 cycles.") |
| **Step** | An atomic action inside a phase (e.g. a brief's numbered steps). |
| **Loop** | The while-construct that drains a queue. Outer loop / inner loop. |
| **Pool** | The staging reservoir the take-in beat fills. Discovery (outer). Candidates, not queue members. |
| **Queue** | What the loop drains. Outer: what Commit admitted (`active[]`). Inner: Imagine items, or Plan items after a locked-spec Commit. |

Do not reuse these words for other things. "Cycle" is never a stage; "Build" is the stage,
"Make" is the phase where you produce.

---

## State — two stores

Because cardinality, write-contention, and lifetime all differ between the loops, state
lives in **two kinds of store**, never one.

```
madewell.json               OUTER store. One per project. Permanent.
                            Holds the Discovery pool (`discovery[]`) + admitted
                            queue (`active[]`) + outer lifecycle state.

.madewell/cycles/<id>.json  INNER store. One per spawned Cycle. Ephemeral.
                            Holds that Cycle's inner queue + phase state.
                            Born at Commit→Build, removed at Land.
                            Locked-spec Commit: `phase: "plan"` (Imagine skipped).

status.jsonl                Append-only event log. Ties parent ↔ children across both
                            stores. The event log wins when a store disagrees with it.
```

Each store **leads with its queue**. Each loop drains the queue in its own store.

**Concurrency.** Cycles are not one-at-a-time. The outer loop can dispatch many committed
items at once; each mints its own `cycles/<id>.json` and runs concurrently — no
write-contention, because each Cycle owns its file. One store could never represent many
concurrent Cycles; the two-store rule is what makes the fleet possible.

---

## Orchestration — the recursive coordination layer

Orchestration is how the loops **coordinate distributed work**. Because the lifecycle is
fractal, orchestration is fractal too: the *same* coordination beat recurs at every loop, and
any node can recurse into a child loop. It is **not** a single layer bolted onto one phase — it
is a pattern that lives wherever work can be split.

> **This is the north-star, not a finished spec.** One cell is built (Make-phase fan-out); the
> rest are work in progress. The map exists so no piece reads as "all there is."

**Two coordinated layers, one pattern:**

- **Outer-loop orchestration — a fleet of Cycles.** Commit can dispatch many Discovery items at
  once; N Cycles run concurrently. Orchestration here partitions them so they don't collide
  (scope / file claims), lets them share findings (a board), and reconciles their Lands back
  into the project.

- **Inner-loop orchestration — within one Cycle, every phase, not just Make.** Each phase has
  its own fan-out shape:
  - **Imagine** → parallel *understanding* (explore/research workers map the problem) → collect → shape the Imagine queue
  - **Plan** → parallel *options* (a panel of approaches, scored) → synthesize the plan
  - **Make** → parallel *execution* (implementers, partitioned, no collisions) — *the built cell*
  - **Verify** → parallel *adversarial verification* (independent verifiers / failure triage)

**Recursion = forward motion, nothing fancier.** It's just the loop repeating until its queue
is empty, so the plate drains and the work doesn't stall. The inner loop repeats until Imagine
is empty; the Cycle then Lands and returns to the outer loop, which repeats until Discovery is
empty. The outer loop *feeds* the inner: an item on the outer queue progresses down into a
Cycle; when that Cycle's queue empties, control returns to the outer queue for the next item.
Cooperative throughout — it pauses for the human each iteration; recursion only guarantees the
queue keeps moving, never that it runs autonomously.

Even a single orchestration step is the four-beat: fan out (take-in) → collect (converge) →
distribute execution (build) → synthesize / merge (release).

**Invariants — true at every node, every scale (these never flex):**
- **Isolation Mandate** — planner ≠ executor, builder ≠ verifier.
- **Cooperative pause** — every loop yields to the human between iterations; the recursion never runs away autonomously.

**Built vs. WIP:**
- ✅ Inner-loop fan-out — **Imagine**, **Plan**, **Make + Verify** (the 5-role jump pack).
- ✅ Outer-loop / fleet — concurrent Cycles, partition, board, Land reconciliation.

All cells have a baseline design in `skills/orchestrate.md`; the mechanisms deepen with use.
(Recursion is not a cell — it's just the loop repeating until its queue empties.)

---

## What this file does not cover

- **Orchestration *mechanics*** — the per-cell spawn/dispatch protocols. The *model* is above;
  the one built cell (Make) lives in `skills/orchestrate.md`. The baseline is Made Well's own; a
  host harness may substitute the spawn mechanism, preserving the invariants.
- **Persona / domain / quality / memory / onboarding** — selected per profile. See `PROFILES.md`.
- **Skill layering** (foundational meta-flow vs. pack/striation skills) — see `guides/SKILLS.json`.

Those compose *around* this lifecycle. They never change it.
