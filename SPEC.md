# Made Well — Storage & Movement

**Version:** 3 · **Date:** 2026-08-25 · **Status:** normative
**Supersedes:** v2 (same day — vocabulary collapse), v1 (the `events.jsonl` ledger + `mw` CLI)

Where a thing lives, how it moves, what refuses an illegal move. This file names no
meanings — that is `LIFECYCLE.md`, which names no paths. They cannot disagree.

Key words MUST, MUST NOT, SHOULD, MAY per RFC 2119.

---

## 0. What was removed, and why

**v1** specified an append-only JSONL ledger with a SHA-256 hash chain, an `mw` CLI with
`advance`/`check`/`fsck`, per-door check scripts, and a ten-case conformance suite. All of
it was built. **None of it ever ran** — across every install, zero `events.jsonl` files
have ever existed. It reimplemented git: append-only history, hash chain, tamper
evidence, actor, timestamps, replication. Deleted. **Made Well is files. There is no CLI.**

**v2** kept the model but carried sixteen terms — pool, queue, valve, stage, phase, cycle,
outer, inner, Discovery, Imagine, Plan, Make, Verify, Commit, Build, Land — for a process
that has four positions. It claimed the loops were self-similar and then named their beats
differently at each level, which forced a translation table. Deleted. **Four words now,
and the directory is the word.**

---

## 1. Two kinds of state

| Kind | Examples | Lives | Governed by |
|---|---|---|---|
| **Lifecycle** | where a thing is | in the repo, committed | this file |
| **Telemetry** | heartbeats, tokens, panes, dashboards | wherever the host wants | nothing here |

**Rule 1.** Nothing that determines a thing's position may live outside the repository.
No database, no service, no network. This is what keeps an instance runnable by any
harness, any provider, any tool — including none.

**Rule 2.** Lifecycle state is plain text in git. Git is the durability, history, and
replication layer. Nothing else is load-bearing.

---

## 2. Position is path

> **A thing's position is the directory it is in. Nothing else records it. Nothing else
> may contradict it.**

No status field, no JSON projection, no ledger, no second copy. To ask where something
is, look at where it is.

```
.madewell/
├── shaping/                    grows without limit
│   └── <slug>.md
├── committed/                  stays short
│   └── <slug>.md
├── making/
│   ├── <slug>.md                   a leaf — one owner, does not break down
│   └── <slug>/                     breaks down — the same four, one level in
│       ├── ITEM.md
│       ├── shaping/
│       ├── committed/
│       ├── making/
│       └── landed/
└── landed/
    └── <slug>.md
```

**The four names recur at every depth.** `making/<slug>/making/<sub>/` is legal and means
exactly what it looks like. Depth is bounded only by the work.

**Reading position — the whole API:**

```sh
ls .madewell/shaping/            # candidates. Expected to be large.
ls .madewell/committed/          # said yes to. Expected to be short.
ls .madewell/making/             # in flight at the top level
ls .madewell/landed/             # closed
git log --follow .madewell/landed/<slug>.md    # one thing's whole history

# every leaf in flight, any depth — a .md sitting DIRECTLY in some making/
find .madewell -type f -name '*.md' | grep -E '/making/[^/]+\.md$'

# every thing that broke down and is still open, any depth
find .madewell -type f -name ITEM.md
```

Note the `[^/]` in that first `find`: a plain `-path '*/making/*'` also matches everything
*beneath* a `making/<slug>/` directory — including its already-landed children — and
silently over-reports what is in flight.

A thing that breaks down is **open** iff its `ITEM.md` exists. Landing moves that file
out; the `landed/` beneath it stays as the record. So a `making/<slug>/` directory can
outlive the work — `ITEM.md` is the liveness signal, not the directory.

---

## 3. Movement is `git mv`

**The move is the transition.** One move per commit.

### 3.1 The whole state machine

At any depth, with `P` standing for the containing path (`.madewell`, or
`.madewell/making/<slug>`, or deeper):

| Move | From | To | Also required |
|---|---|---|---|
| **commit** | `P/shaping/X.md` | `P/committed/X.md` | in / out / done-when (§4.2) |
| **start (leaf)** | `P/committed/X.md` | `P/making/X.md` | — |
| **start (breaks down)** | `P/committed/X.md` | `P/making/X/ITEM.md` | the four child dirs created in the same commit |
| **land (leaf)** | `P/making/X.md` | `P/landed/X.md` | proven by someone who did not make it |
| **land (parent)** | `P/making/X/ITEM.md` | `P/landed/X.md` | its `shaping/`, `committed/`, `making/` all empty |

That is the complete inventory. **Every other move of a file under `.madewell/` is
illegal.** No force flag, no skip, no rewind. A file MUST NOT move backward and MUST NOT
be deleted from a lifecycle directory — things leave by landing.

**Abandoning** is a land with `**ABANDONED:** <reason>` as the first line. A recorded
outcome, not an undo.

**Failure is not a move.** A thing that fails its proof stays in `making/`. The retry is a
new commit against the same file. Attempts accumulate in `git log`; position does not
change until it passes.

### 3.2 The commit message is the record

```
<type>(<scope>): <summary>

PHASE: <shaping | committed | making | landed>
DONE: <completed this session>
TODO: <the handoff; write `—` if none>
BLOCKED: <omit if none>
```

Git supplies what v1's event schema duplicated: timestamp → commit date, actor → author,
hash chain → the commit graph, the transition → the rename itself. Tamper evidence is
`git fsck`. **Do not add a ledger file.**

---

## 4. The files

Content is prose. This spec constrains *when* work may move, never *what* it says. Each
beat has a floor and nothing above it.

**4.1 In `shaping/`** — a title, where it came from, what it is asking. Nothing more is
owed.

**4.2 To reach `committed/`** — exactly three additions:

```markdown
**In:** …
**Out:** …
**Done when:** …
```

**Nothing else may be required here.** Not a file list, not a task breakdown, not line
numbers, not an ordering. Those do not exist until the work is broken down, and requiring
them at commit is how one phrase comes to carry two beats' duties.

**4.3 To reach `making/` under a parent** — add `**dependsOn:** [<ids>]`. Empty means it
can start now. Across one parent's `committed/` and `making/`, the graph MUST be acyclic
and MUST have something startable.

**4.4 A file MAY be a pointer.** A title plus a path to where the substance lives:

```markdown
# STG-673 — peak and dwell
**Source:** ~/infinity/discovery/STAGING.md#STG-673
**Spec:** ~/infinity/discovery/specs/T23-STG673-peak-and-dwell-claim.md
**In:** … **Out:** … **Done when:** …
```

This is how an install seats over an existing corpus without copying it. The store tracks
**position**; the pointed-at document holds the **content**. Never both — a store that
restates another document is a second brain, and the two will drift.

---

## 5. Why this is parallel by construction

- **One file per thing.** Two things never share a file, so two workers never share a write.
- **One directory per breakdown.** `making/a/` and `making/b/` are disjoint subtrees.
- **No shared index.** No `madewell.json`, no `status.jsonl`, no ledger — nothing every
  worker must append to. That single file was v1's only serialization point.
- **Position is not a cursor.** Many files in `committed/` means many things said yes to,
  not a line with a head.

One requirement: **a thing in `making/` has exactly one owner.** However the host
expresses ownership, two workers must never move the same file.

---

## 6. Enforcement

| Rule | Enforcer |
|---|---|
| Only the legal moves (§3.1) | **HOOK** — `.madewell/bin/mw-gate.sh`, pre-commit |
| No deletion from a lifecycle directory | **HOOK** |
| Arrival only into `shaping/` | **HOOK** |
| Commit floor: in / out / done-when | **HOOK** |
| `dependsOn` under a parent | **HOOK** |
| Landing a parent requires it drained | **HOOK** |
| You cannot land your own work | **DOCTRINE** — not machine-checkable here |
| Green on main before a leaf lands | **DOCTRINE** — CI proves green; the link is by convention |
| The pause is never auto-answered | **DOCTRINE** |

`mw-gate.sh` is a wall, not a tool: nobody invokes it, it takes no arguments, it can only
refuse. POSIX sh, `git` plus POSIX userland, reads nothing outside the repo. Wire it into
whatever the project already runs (`lefthook`, `.git/hooks/pre-commit`, `husky`). No hook
installed means the moves are DOCTRINE — and this table says so rather than pretending.

The three DOCTRINE rows are unenforced on purpose and labeled. A rule with no enforcer
named is a compilation bug, not a rule to remember harder.

---

## 7. Conformance

Five checks. There is no test suite because there is no implementation to test.

1. `shaping/ committed/ making/ landed/` exist at the root.
2. `git log --diff-filter=R --name-status -- .madewell/` shows only legal moves.
3. Nothing has ever been deleted from a lifecycle directory.
4. Everything in `committed/` and every `ITEM.md` carries in / out / done-when.
5. Every child under a parent carries `dependsOn`; each parent's graph is acyclic with
   something startable.

2–5 are exactly what the hook enforces going forward; run over history they audit the past.

---

## 8. Rationale

- **Git is the ledger.** v1's chain, timestamps, and actors reimplemented the tool the
  repo already sat in.
- **Position is path.** A status field can lie about where something is. A directory cannot.
- **The directory is the vocabulary.** v2 needed a glossary. v3 needs `ls`.
- **Four words, every depth.** Naming the same beat differently at two scales is what made
  the self-similarity claim cost more than it paid.
- **No CLI.** A format outlives its tooling. v1's tooling was never invoked once.
- **Pointers, not copies.** The store tracks position; documents hold content.
- **Parallel by disjointness.** Removing the single append-target removed the only thing
  forcing single-threading.
- **No rewind.** That a walked-through beat is behind you is what everything else rests on.

---

## Appendix — adopting this on an existing project

1. Create the four directories.
2. `git rm` any v1 apparatus (`bin/mw`, `bin/doors/`, `bin/conformance/`,
   `land-check.sh`, `notify.sh`) and any projection (`madewell.json`, `cycles/`).
   Content authored in them moves into a file or a pointer; anything that was *position*
   is discarded, because position is now path.
3. Seed `shaping/` with pointer files (§4.4). **Do not copy the corpus.**
4. Seed `committed/` and `making/` for work already in flight. This is the one time
   things appear in a directory without having moved there — say so in the commit message
   and never do it again.
5. Install the hook.

Nothing in the project's own documents has to change. The store points at them.
