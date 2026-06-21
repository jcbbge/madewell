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

INNER LOOP — one Cycle (lives inside Build)
  while Imagine is not empty:
    pull one item → Plan → Make → Verify
```

**The first beat of each loop is a queue. The loop drains that queue. The loop ends when
the queue is empty.** Same rule at every scale.

- **Outer queue = Discovery.** The outer loop runs until Discovery drains.
- **Inner queue = Imagine.** The inner loop runs until Imagine drains.
- **Discovery feeds Imagine.** A committed Discovery item enters Build; Build seeds that
  Cycle's Imagine queue; the inner loop drains it through Plan → Make → Verify. When
  Imagine is empty, the Cycle Lands and the outer loop pulls the next Discovery item.

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

**Concurrency & the fractal.** Cycles are not one-at-a-time. The outer loop can dispatch
many committed items at once; each mints its own `cycles/<id>.json` and runs concurrently —
no write-contention, because each Cycle owns its file. A Cycle that itself spawns sub-cycles
just mints more inner stores: a tree of stores mirroring the spawn tree. One store could
never represent that. The two-store rule **is** the fractal, expressed in the filesystem.

---

## What this file does not cover

- **Orchestration mechanics** (how Cycles are dispatched to agents, the verification roles) —
  the baseline default is Made Well's own; a host harness may override it. See AGENTS.md and
  `skills/orchestrate.md`.
- **Persona / domain / quality / memory / onboarding** — selected per profile. See `PROFILES.md`.
- **Skill layering** (foundational meta-flow vs. pack/striation skills) — see `guides/SKILLS.json`.

Those compose *around* this lifecycle. They never change it.
