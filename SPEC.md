# Made Well — Storage & Movement Specification

**Version:** 2 · **Date:** 2026-08-25 · **Status:** normative
**Supersedes:** v1 (the `events.jsonl` ledger + `mw` CLI + door-script spec, 2026-08-04)

This document is the **format**: where an item lives, how it moves, and what enforces the
move. It says nothing about what the beats *mean* — that is `LIFECYCLE.md`, which in turn
names no paths. The two cannot disagree.

Key words MUST, MUST NOT, SHOULD, MAY per RFC 2119.

---

## 0. The v1 retraction

v1 specified an append-only JSONL ledger with a SHA-256 hash chain, a `mw` CLI with
`advance`/`check`/`fsck` verbs, per-door check scripts, and a ten-case conformance suite.
All of it was built. **None of it ever ran** — across every Made Well install, zero
`events.jsonl` files were ever created.

The retraction is not "it failed to catch on." It is that **v1 reimplemented git**.
Append-only history, a hash chain, tamper evidence, actor attribution, timestamps,
replication, and review — git provides every one, already, with better tooling and no
adoption cost. A second ledger sitting inside a git repo is a second copy of the truth
that can drift from the first.

**Made Well is files. There is no CLI, and there will not be one.** Anything a tool would
have told you, `ls` and `git log` tell you.

---

## 1. Two state classes

| Class | Examples | Lives | Governed by |
|---|---|---|---|
| **Lifecycle state** | which beat an item is at, what is admitted, what is open | in the repo, committed | this spec |
| **Host telemetry** | worker heartbeats, token odometry, pane state, dashboards | wherever the host wants | nothing here |

**Rule 1 — the portability invariant.** Nothing that determines an item's position may
live outside the repository. No database, no service, no network. This is what keeps an
instance runnable by any harness, any provider, any tool — including none.

**Rule 2 — plain text, committed.** Lifecycle state is files in git. Git is the
durability, history, and replication layer. Nothing else is load-bearing.

---

## 2. Position is path

> **An item's position in the lifecycle is the directory it is in. Nothing else records
> it. Nothing else may contradict it.**

There is no status field, no JSON projection, no ledger line, and no second copy. To ask
where something is, look at where it is.

```
.madewell/
├── pool/                       OUTER POOL — candidates. Discovery shapes them in place.
│   └── <slug>.md
├── queue/                      OUTER QUEUE — admitted by Commit. Awaiting Build.
│   └── <slug>.md
├── build/                      OPEN CYCLES — one directory per Cycle.
│   └── <slug>/
│       ├── ITEM.md             the committed item itself
│       ├── pool/               INNER POOL — decomposed by Imagine.
│       │   └── <nn>-<slug>.md
│       ├── queue/              INNER QUEUE — admitted by Plan. In Make.
│       │   └── <nn>-<slug>.md
│       └── done/               Verify passed: tests green on main.
│           └── <nn>-<slug>.md
└── landed/                     LANDED or ABANDONED. Closed units.
    └── <slug>.md
```

A fresh instance has all five directories, empty, each with a `.gitkeep`.

**Reading position — the whole API:**

```sh
ls .madewell/pool/                 # the pool: candidates. Expected to be large.
ls .madewell/queue/                # the queue: what is admitted. Expected to be short.
ls .madewell/build/*/ITEM.md       # every Cycle OPEN right now
ls .madewell/build/*/queue/        # everything in Make right now, across all Cycles
ls .madewell/build/*/pool/         # imagined but not yet admitted by Plan
git log --follow .madewell/landed/<slug>.md    # one item's complete history
```

**A Cycle is open iff `build/<slug>/ITEM.md` exists.** Land moves that file out; the
Cycle's `done/` stays behind as its record. So `build/` accumulates directories forever
and is not itself a measure of what is in flight — `ITEM.md` is.

If `queue/` is empty and no `ITEM.md` exists, the next move is a Commit. That is the
resume rule, and it needs no implementation.

---

## 3. Movement is `git mv`

A beat is walked by moving a file. **The move is the door.** One move per commit.

### 3.1 The complete state machine — five legal moves

| # | Move | Beat | Additionally required |
|---|---|---|---|
| 1 | `pool/X.md` → `queue/X.md` | **Commit** | the file states in / out / done-when (§4.2) |
| 2 | `queue/X.md` → `build/X/ITEM.md` | **Build opens** | `build/X/{pool,queue,done}/` created in the same commit |
| 3 | `build/X/pool/i.md` → `build/X/queue/i.md` | **Plan** | the file states its `dependsOn` (§4.3) |
| 4 | `build/X/queue/i.md` → `build/X/done/i.md` | **Verify** | tests green on main; the verifying agent is not the making agent |
| 5 | `build/X/ITEM.md` → `landed/X.md` | **Land** | `build/X/pool/` and `build/X/queue/` are both empty |

**Every other move of a file under `.madewell/` is illegal.** There is no force flag, no
skip verb, and no rewind move. A file MUST NOT move backward, and MUST NOT be deleted
from `pool/`, `queue/`, `build/`, or `landed/` — items leave only by landing or
abandoning.

**Abandon** is move 5 with `**ABANDONED:** <reason>` as the file's first line. It is a
recorded outcome, not an undo: consumed beats stay consumed.

**Failure is not a move.** A failed Verify leaves the item in `build/X/queue/`. The
retry is a new commit against the same file. Attempts accumulate in `git log`; position
does not change until it passes.

### 3.2 The commit is the record

The move's commit message is the entire door record. v1's event schema, minus the
reinvention:

```
<type>(<scope>): <summary>

PHASE: <Imagine | Plan | Make | Verify>
DONE: <completed this session>
TODO: <the handoff; write `—` if none>
BLOCKED: <omit if none>
```

Git already supplies what v1's event fields duplicated: `ts` → commit date, `actor` →
author, `prev` → parent commit, the hash chain → the commit graph, `kind`/`door` → the
rename itself. Tamper evidence is `git fsck`; authentication, if wanted, is commit
signing. **Do not add a ledger file.**

---

## 4. Item files

Content is prose. This spec constrains *when* work may move, never *what* the work says —
determinism on time, not on space. Each stage has a floor, and nothing above the floor.

### 4.1 Pool item (to exist in `pool/`)

A title, where it came from, and what it is asking. It is *shaped*, not bounded. That is
all Discovery owes.

### 4.2 Queue item (to pass Commit, move 1)

Adds exactly three things:

```markdown
**In:** …
**Out:** …
**Done when:** …
```

**Commit MUST NOT require anything else.** Not a file partition, not verified line
numbers, not a task breakdown, not a dependency graph — those are Plan artifacts that do
not exist yet, and requiring them here is *premature binding* (`LIFECYCLE.md`, "What each
valve may demand"). A single requirement must never carry two beats' duties.

### 4.3 Inner queue item (to pass Plan, move 3)

Adds `**dependsOn:** [<ids>]` — empty list means it is on the starting frontier. Across a
Cycle's `queue/`, the graph MUST be acyclic and MUST have a non-empty frontier.

### 4.4 Pointers are items

An item file MAY be a **pointer**: a title plus a path to where the substance lives.

```markdown
# STG-673 — peak and dwell
**Source:** ~/infinity/discovery/STAGING.md#STG-673
**Spec:** ~/infinity/discovery/specs/T23-STG673-peak-and-dwell-claim.md
**In:** … **Out:** … **Done when:** …
```

This is how an install seats Made Well over an existing corpus without copying it. The
pool tracks *position*; the pointed-at document holds the *content*. Never both. A
Made Well store that restates what another document already says is a second brain, and
the two will drift.

---

## 5. Concurrency

The layout is contention-free by construction, which is what makes `LIFECYCLE.md`'s
"concurrency is the default" implementable rather than aspirational:

- **One file per item.** Two items never share a file, so two agents never share a write.
- **One directory per Cycle.** N Cycles are N disjoint subtrees. `build/a/` and
  `build/b/` cannot collide.
- **No shared index.** There is no `madewell.json`, no `status.jsonl`, no ledger — nothing
  every agent must append to. That single file was the only serialization point in v1,
  and it is gone.
- **Position is not a cursor.** Many files in `queue/` means many admitted items, not a
  queue with a head.

One rule: **an item is owned by exactly one agent at a time.** Ownership is expressed
however the host expresses it; this spec only requires that two agents never move the
same file.

---

## 6. Enforcement

Per the enforcement law, every rule here names its enforcer.

| Rule | Enforcer |
|---|---|
| Only the five legal moves (§3.1) | **HOOK** — `.madewell/bin/mw-gate.sh`, run pre-commit |
| No deletion from a lifecycle directory | **HOOK** — same script |
| Land requires an empty inner pool + queue | **HOOK** — same script |
| Commit floor: in / out / done-when (§4.2) | **HOOK** — same script |
| Plan floor: `dependsOn` (§4.3) | **HOOK** — same script |
| Verify requires green on main | **DOCTRINE** — CI proves green; that the verifier ≠ the maker is not machine-checkable here |
| Isolation Mandate | **DOCTRINE** |
| The pause is never auto-answered | **DOCTRINE** |

`mw-gate.sh` is a pre-commit wall, not a tool: nobody invokes it, it takes no arguments,
and it can only refuse. It is POSIX sh, depends on `git` and POSIX userland, and reads
nothing outside the repo. Wire it into whatever the project already uses (`lefthook`,
`.git/hooks/pre-commit`, `husky`). Absent hook = the moves are DOCTRINE, and the spec
says so honestly rather than pretending.

The three DOCTRINE rows are unenforced on purpose and are labeled as such. A rule with no
enforcer named is a compilation bug, not a rule to remember harder.

---

## 7. Conformance

An install conforms when all five hold. There is no test suite, because there is no
implementation to test — there is only a layout to check.

1. The five directories exist.
2. `git log --diff-filter=R --name-status -- .madewell/` shows only legal moves (§3.1).
3. No file has ever been deleted from a lifecycle directory.
4. Every file in `queue/` and `build/*/ITEM.md` carries in / out / done-when.
5. Every file in `build/*/queue/` carries `dependsOn`, and each Cycle's graph is acyclic
   with a non-empty frontier.

Checks 2–5 are exactly what `mw-gate.sh` enforces going forward; run against history they
audit the past.

---

## 8. Rationale, one line each

- **Git is the ledger.** v1's chain, timestamps, actors, and tamper evidence were a
  reimplementation of the tool the repo was already sitting in.
- **Position is path.** A status field can lie about where something is. A directory
  cannot.
- **No CLI.** A format survives its tooling; tooling that must be installed and invoked
  is an adoption tax, and v1's was never paid — zero ledgers, ever.
- **No projection.** Derived state that can drift from its source is a second source.
  There is now one.
- **Pointers, not copies.** The store tracks position; documents hold content; neither
  restates the other.
- **Concurrency by disjointness.** Removing the single append-target removed the only
  thing forcing the loops to be single-threaded.
- **Determinism on time, not space.** Walls gate *when* work may advance. No schema ever
  freezes *what* the work says.
- **No rewind, ever.** That a walked-through beat is behind you is the property
  everything else rests on. Failure records forward.

---

## Appendix — Migrating a v1 install

1. Create the five directories.
2. `git rm -r .madewell/bin/{mw,doors,conformance,land-check.sh,notify.sh}` — the CLI,
   the door scripts, and the conformance suite have no successor.
3. `git rm .madewell/madewell.json` and `.madewell/cycles/` — the projection and the
   per-Cycle JSON are replaced by the directory an item sits in. Anything authored in
   them that is *content* (summaries, open threads) moves into an item file or a pointer;
   anything that was *position* is discarded, because position is now path.
4. Seed `pool/` with pointer files (§4.4) for live candidates. Do not copy the corpus.
5. Seed `queue/` and `build/<slug>/` for work already in flight. This is the one time
   items appear in a directory without having moved there — record it in the commit
   message and never do it again.
6. Install `mw-gate.sh` in the project's pre-commit path.

Nothing in the project's own documents needs to change. The store points at them.
