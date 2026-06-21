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
  while Discovery is not empty:
    pull one item → Commit → Build → Land
                            └── Build runs an INNER LOOP
    ↳ pause: surface to the user, take feedback, then continue

INNER LOOP — one Cycle (lives inside Build)
  while Imagine is not empty:
    pull one item → Plan → Make → Verify
    ↳ pause: surface to the user, take feedback, then continue
```

**The first beat of each loop is a queue. The loop drains that queue — but cooperatively:**
after every iteration it **pauses**, surfaces the result, and takes the user's feedback before
the next pull. It is a `while not empty` loop *with a human checkpoint each turn* — never an
autonomous drain. It still terminates when its queue is empty; it just yields between iterations
so the user can steer, redirect, or stop.

- **Outer queue = Discovery.** Pull one item, run it, pause; repeat until Discovery drains.
- **Inner queue = Imagine.** Pull one item, run it, pause; repeat until Imagine drains.
- **Discovery feeds Imagine.** A committed Discovery item enters Build; Build seeds that
  Cycle's Imagine queue; the inner loop drains it through Plan → Make → Verify. When
  Imagine is empty, the Cycle Lands and the outer loop pulls the next Discovery item.

**Where a session resumes — inner first.** Most work lives in the inner loop. A session picks
up by checking it first: if there's an active Cycle with pending `imagine` items, resume there.
Only if nothing is in flight does it drop to the outer loop (Commit the next `discovery` item).
Only if both are empty is it a fresh discovery conversation.

---

## The outer loop — four **stages**

A *stage* is a position in a linear progression: you pass through it once, in order.

| Stage | Beat | What happens |
|---|---|---|
| **Discovery** | take in | Intake. Raw input becomes shaped, queueable work-items. This is the outer queue. |
| **Commit** | converge | The gate. Pull one item, bound it. Say no here so nothing floods downstream. |
| **Build** | build | Run a Cycle (the inner loop) against the committed item. |
| **Land** | release | Ship + reflect. Drain the item from the queue; record what was learned. |

The outer loop is the engine that runs the whole project: `while Discovery not empty`.

---

## The inner loop — four **phases**

A *phase* is a recurring mode within one unit of work. One full pass through all four is
a **Cycle**.

| Phase | Beat | What happens |
|---|---|---|
| **Imagine** | take in | Understand what's wanted; break it into the smallest completable items. This is the inner queue. |
| **Plan** | converge | Sequence the items; name dependencies; cut to what's next. |
| **Make** | build | Produce the artifact (the brief is handed off; the work is executed). |
| **Verify** | release | Confirm it became what was imagined. Pass → Land. Fail → diagnose. |

The inner loop runs inside Build: `while Imagine not empty`.

---

## Vocabulary — fixed

| Term | Meaning |
|---|---|
| **Stage** | One of the four outer positions: Discovery, Commit, Build, Land. |
| **Phase** | One of the four inner modes: Imagine, Plan, Make, Verify. |
| **Cycle** | One complete run through the four phases. The thing you spawn N of. ("We ran 10 cycles.") |
| **Step** | An atomic action inside a phase (e.g. a brief's numbered steps). |
| **Loop** | The while-construct that drains a queue. Outer loop / inner loop. |
| **Queue** | The take-in beat that drives a loop. Discovery (outer) / Imagine (inner). |

Do not reuse these words for other things. "Cycle" is never a stage; "Build" is the stage,
"Make" is the phase where you produce.

---

## State — two stores

Because cardinality, write-contention, and lifetime all differ between the loops, state
lives in **two kinds of store**, never one.

```
madewell.json               OUTER store. One per project. Permanent.
                            Holds the Discovery queue + outer lifecycle state.

.madewell/cycles/<id>.json  INNER store. One per spawned Cycle. Ephemeral.
                            Holds that Cycle's Imagine queue + phase state.
                            Born at Commit→Build, removed at Land.

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
- ✅ Inner-loop fan-out — **Imagine**, **Plan**, **Make + Verify** (the 5-role jump pack) — `skills/orchestrate.md`. The full inner loop.
- ⬜ Outer-loop / fleet orchestration (concurrent Cycles, collision avoidance, board, Land reconciliation).

(Recursion is not a cell to build — it's just the loop repeating until its queue empties.)

---

## What this file does not cover

- **Orchestration *mechanics*** — the per-cell spawn/dispatch protocols. The *model* is above;
  the one built cell (Make) lives in `skills/orchestrate.md`. The baseline is Made Well's own; a
  host harness may substitute the spawn mechanism, preserving the invariants.
- **Persona / domain / quality / memory / onboarding** — selected per profile. See `PROFILES.md`.
- **Skill layering** (foundational meta-flow vs. pack/striation skills) — see `guides/SKILLS.json`.

Those compose *around* this lifecycle. They never change it.
