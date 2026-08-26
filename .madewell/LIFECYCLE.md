# The Made Well Lifecycle

**Version:** 3 · **Ruling:** 2026-08-25 (operator: "the terminology is confusing")

Four words. They mean the same thing at every scale. There is nothing else to learn.

| Beat | What it means | The rule it carries |
|---|---|---|
| **shaping** | still forming | grows without limit — that is correct, not a backlog |
| **committed** | we said yes | stays short — saying no is the whole job |
| **making** | someone is on it | exactly one owner at a time |
| **landed** | proven and closed | **you cannot land your own work** |

Work moves in one direction through those four. That is the entire model.

```
shaping ──▶ committed ──▶ making ──▶ landed
```

---

## It nests, and that is all "the two loops" ever meant

Something in **making** either breaks down or it doesn't.

- **It doesn't** — one person can do it. It is a leaf. It sits in `making/` until it lands.
- **It does** — it opens its own `shaping/ committed/ making/ landed/` inside itself, and
  its pieces move through the same four beats.

```
making/catalog-overhaul/       ← breaks down, so it has the four inside it
    ITEM.md
    shaping/                       pieces still forming
    committed/                     pieces we said yes to
    making/                        pieces being worked
    landed/                        pieces proven green on main

making/operations-sidebar-nav.md   ← doesn't break down. A leaf.
```

**A parent lands when its own shaping, committed, and making are all empty.** Nothing
else closes it.

That is the whole of what used to be called the outer loop and the inner loop. There are
not two loops. There is one shape, and it nests as deep as the work does.

---

## Where things enter

Raw material — transcripts, sittings, requests — is **not** in the lifecycle. A pipeline
digests it and drops candidates into `shaping/`. That intake is upstream and has its own
rules; the lifecycle starts when something lands in `shaping/`.

---

## The five rules

**1. Forward only.** Nothing moves backward. Ever. A walked-through beat is behind you,
and everything else depends on that being true.

**2. Failure is not a move.** A piece that fails its proof stays in `making/`. The next
attempt is new work on the same piece, not a retreat to an earlier beat. Attempts pile up
in the history; position does not change until it passes.

**3. One owner per thing in `making/`.** This is what makes everything else safe to run
in parallel without locks.

**4. You cannot land your own work.** Whoever made it does not get to say it is done. At
a leaf, landing means: tests pass, green on main, confirmed by someone else.

**5. Bound at commit, break down at making.** To move into `committed/`, a thing needs
what's in, what's out, and done-when — nothing more. A file list, a task breakdown, line
numbers, a dependency order: those do not exist yet and demanding them at commit is how
a brief comes to fail a bar nobody can name.

---

## Everything runs at once

**The four beats are places, not turns.** Any number of things sit in each one, moving at
their own rates. There is no cursor walking a list, and nothing here is single-threaded.

- `shaping/` holds hundreds. That is healthy.
- `committed/` holds a handful. That is discipline.
- `making/` holds as many as you have owners for. Each one is a separate directory or
  file, so two workers never touch the same thing.
- Inside a parent, every committed piece whose prerequisites are met can be made at once.

"Wait for the queue to drain" is never a thing that happens. Work flows.

---

## The pause

You are in this, and the machine never decides on your behalf.

Every thing that reaches `landed/` surfaces to you. Several may be waiting at once — that
is normal. **No pause may be auto-approved, answered on your behalf, scheduled away, or
treated as latency.** A system that does that is broken, not efficient.

Bookkeeping — moving things, dispatching workers, tracking state — is the machine's job
and should cost you nothing. Judgment, taste, and intent are yours and never get
automated.

---

## Where the old words went

They are gone, not renamed. Kept here only so old documents can be read.

| Old | Now |
|---|---|
| Discovery, Imagine | **shaping** — at the top level, or inside something |
| Commit, Promote, Plan | **committed** — the same act at two depths |
| Build, Make, Implement, Ideate | **making** |
| Verify, Land | **landed** — proving it and closing it are one beat |
| stage, phase, Cycle, step | *nothing.* A beat is a beat. |
| pool, queue, valve | *nothing.* `shaping/` grows, `committed/` stays short. |
| outer loop, inner loop | *nothing.* It nests. Look at the directory. |

Do not reintroduce any of them. If a document needs a word that is not one of the four,
that is a sign the document is inventing a distinction the work does not have.

---

Where things live and what enforces the moves: `SPEC.md`. That file names no meanings;
this one names no paths. They cannot disagree.
