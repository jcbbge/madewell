# The Made Well Lifecycle — Canonical Model

**Version:** 2 · **Ruling:** 2026-08-25 (operator)

This file is the **model**: the loops, the beats, the vocabulary. It names no files and no
commands. Where the model is *stored* is `SPEC.md`'s subject, and `SPEC.md` says nothing
about semantics. The two documents cannot disagree, because they no longer overlap.

Nothing else in Made Well gets to redefine what is here.

---

## One shape, twice

Made Well is **one four-beat pattern applied at two scales**. The pattern:

| Beat | What it does |
|---|---|
| **take in** | fills a **pool** with candidates |
| **converge** | a **valve** — admits one candidate from the pool to the **queue** |
| **build** | drains the **queue** |
| **release** | the item leaves, and what it taught flows back |

Applied twice:

```
raw input (transcripts, sessions, requests)
      │  intake — OUTSIDE the loop; the pipeline's job, not the lifecycle's
      ▼
  OUTER POOL ····························· candidates
      │
      ├─▶ DISCOVERY   take in    clay-block a candidate's rough edges
      │
      ├─▶ COMMIT      converge   THE VALVE. Bound it. Admit to the OUTER QUEUE.
      │
      ├─▶ BUILD       build      open a Cycle — the inner loop runs here
      │        │
      │        ├─▶ IMAGINE  take in    decompose the item → INNER POOL
      │        │
      │        ├─▶ PLAN     converge   THE VALVE. Sequence, name deps.
      │        │                       Admit to the INNER QUEUE.
      │        │
      │        ├─▶ MAKE     build      produce the artifact
      │        │
      │        └─▶ VERIFY   release    a DIFFERENT agent. Done-when:
      │                                tests pass, green on main.
      │
      │        the Cycle stays open while the inner pool or inner queue holds anything
      │
      └─▶ LAND        release    close the unit: reflect, harvest, drain it.
                                 Learnings return to the OUTER POOL.
```

### Two reservoirs, at both scales

A pool is not a queue. This was ruled for the outer loop on 2026-08-13 and is **now true
of the inner loop too** — that symmetry is the 2026-08-25 correction.

|  | fills the pool | the valve | drains the queue |
|---|---|---|---|
| **outer** | Discovery | **Commit** | Build |
| **inner** | Imagine | **Plan** | Make |

A pool is *supposed* to outgrow its drain. Saying "not now" is the valve's entire job. A
`while` condition over a pool never terminates and cannot be planned against. **The loop
drains the queue, never the pool.**

Before 2026-08-25 the inner loop had a pool and no valve: "the inner queue is the Imagine
items" made every imagined thing automatically admitted. Plan is the valve. Imagining a
piece of work does not commit you to building it.

### What each valve may demand

A valve checks **bounding**, never **decomposition**. Decomposition belongs to the beat
*after* the valve.

- **Commit** may demand: what's in, what's out, done-when. That sitting **is** Imagine —
  when it has already happened, the Cycle opens at Plan and no one re-imagines it.
- **Commit may NOT demand:** a file partition, a task breakdown, verified line numbers, a
  dependency graph. Those are Plan artifacts and do not exist yet. Demanding them at
  Commit is *premature binding* — one requirement carrying two beats' duties, which is
  how a brief comes to fail a bar nobody can name.
- **Plan** may demand: the dependency graph, the frontier, the partition, the exemplars.

---

## Concurrency is the default

**The loop is one item's trajectory. It is not the project's scheduler.**

A stage is a **position**, not a timeslot. Any number of items may occupy the same
position at once, moving at their own rates. The project is N items on N trajectories —
not one cursor walking a list.

- Many candidates sit in the outer pool.
- Many items sit in the outer queue.
- **Many Cycles are open at once.** Each owns its own inner pool, queue, and workers.
- Inside one Cycle, every inner-queue item whose dependencies are met runs concurrently.

The `while` in "while the queue is not empty" is scoped to **one item's remaining work**,
never to a global cursor. Serial execution is just the N=1 case. Nothing in the model
requires, implies, or rewards single-threading, and a description that reads as
single-threaded is describing the degenerate case.

What is *not* concurrent: **one writer per item.** An item is owned by exactly one agent
at a time. That is what makes N-way parallelism safe without locks.

---

## The pause

Every loop yields to the human. With concurrency, the pause is **per item at its own
release beat** — not one global checkpoint per turn.

- An item pauses at **Verify** (its result is surfaced) and at **Land** (its close is
  surfaced).
- Several pauses may be pending at once. That is normal, not a backlog.
- **No pause may be answered on the human's behalf, auto-approved, scheduled away, or
  treated as latency to optimize.** An implementation that does is non-conforming.

Custodial work — advancing, dispatching, bookkeeping, respawning — is the machine's and
should trend to zero human effort. Generative contact — intent, taste, the judgment given
at a pause — is the human's and is never automated.

---

## Motion is forward only

- **No rewind.** An item never moves backward. That a walked-through beat is behind you
  is the property everything else rests on.
- **Failure is an outcome, not a rollback.** A failed Verify does not send the item back
  to Make. The item stays where it is; the next attempt is new motion through the same
  beat. History accumulates attempts.
- **Abandon is a recorded outcome, not an undo.** An abandoned item releases without
  landing. What it consumed stays consumed.
- **A fork discovered mid-Make returns to the outer pool.** It is not decided inside the
  Cycle. Build has no product votes.

---

## Isolation

True at every node, every scale, no exceptions:

- **planner ≠ executor** — whoever sequenced the work does not do it.
- **builder ≠ verifier** — whoever made it does not judge it.

---

## Vocabulary — fixed

| Term | Meaning |
|---|---|
| **Stage** | An outer position: Discovery, Commit, Build, Land. |
| **Phase** | An inner position: Imagine, Plan, Make, Verify. |
| **Cycle** | One item's pass through the four phases. Opened at Build, closed at Land. |
| **Pool** | What a take-in beat fills. Candidates. Not drainable, not planned against. |
| **Queue** | What a valve admitted. What the build beat drains. |
| **Valve** | Commit (outer), Plan (inner). Where "no" is said. |
| **Item** | One unit of work. Outer items live in the outer pool/queue; inner items belong to one Cycle. |
| **Step** | An atomic action inside a phase. |

The four inner phases are **Imagine, Plan, Make, Verify**. Not Ideate. Not Implement.
These words are reserved: "Cycle" is never a stage, "Build" is the stage, "Make" is the
phase where you produce.

---

## Where the beats end

Each beat has exactly one done-when. These are the only ones.

| Beat | Done when |
|---|---|
| **Discovery** | the candidate states what it is and what it's asking. It is *shaped*, not bounded. |
| **Commit** | in / out / done-when are written. The item is admitted. |
| **Build** | the Cycle's inner pool and inner queue are both empty. |
| **Land** | the unit is closed, its artifacts filed, and what it taught is back in the outer pool. |
| **Imagine** | the item is decomposed into independently completable pieces. |
| **Plan** | the admitted pieces have a dependency graph with a non-empty frontier. |
| **Make** | the artifact exists and the happy path works. |
| **Verify** | **tests pass and it is green on main** — judged by an agent that did not build it. |

**Green on main is Verify's done-when, per inner item — not Land's.** Code reaching main
is how one piece proves itself. Land closes the whole committed unit: reflection,
harvesting, filing, draining. Conflating them is why "did we land it?" has been an
ambiguous question.

---

## What this file does not cover

Storage, paths, and enforcement (`SPEC.md`). Spawn and dispatch mechanics. Persona,
domain, quality, and memory selection (`PROFILES.md`). Those compose *around* this
lifecycle. They never change it.
