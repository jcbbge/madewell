# Made Well — where the work lives

The model is `MADEWELL.md`. This file says only **where things sit and how they move**.
It defines no meanings; that file names no paths. They cannot disagree.

Made Well is files. There is no product CLI — no status command, no dashboard,
no second ledger of piece position.

`.madewell/bin/mw-move` is scaffolding for §2. It is `git mv` that refuses everything else.
Delete it and the shop still runs: `git mv` plus `mw-gate` on pre-commit. The
binary is not the work.

---

## 1. Position is path

> **A piece's state is the directory it is in. Nothing else records it.**

No status field, no projection, no ledger **of piece position**. To ask where something is,
look at where it is. The Jig's `corrections.jsonl` is a different file: proposed − accepted
for shop-made jigs (`jig/CORRECTIONS.md`). It does not say where a piece sits.

```
.madewell/
├── stock/                    uncut. Grows without limit.
│   └── <slug>.md
├── bench/
│   ├── <slug>.md                 a leaf — one pair of hands, does not break down
│   └── <slug>/                   breaks down — the same three, one depth in
│       ├── PIECE.md
│       ├── stock/
│       ├── bench/
│       └── finished/
└── finished/
    └── <slug>.md
```

The three names recur at every depth. `bench/<a>/bench/<b>/` is legal and means what it
looks like. Depth is bounded only by the work.

**Reading it — the whole interface:**

```sh
ls .madewell/stock/       # material on the rack. Large is correct.
ls .madewell/bench/       # what is being worked, top level
ls .madewell/finished/    # done

find .madewell -type f -name '*.md' | grep -E '/bench/[^/]+\.md$'   # every leaf in hand, any depth
find .madewell -type f -name PIECE.md                                # everything open that breaks down
git log --follow .madewell/finished/<slug>.md                        # one piece's whole history
```

A piece that breaks down is **open** while its `PIECE.md` exists. Finishing moves that file
out; the `finished/` beneath it stays as the record. So a `bench/<slug>/` directory outlives
the work — `PIECE.md` is the liveness signal, not the directory.

---

## 2. Movement is `git mv`

**The move is the transition.** One move per commit. `P` is the containing path —
`.madewell`, or `.madewell/bench/<slug>` at any depth.

| Move | From | To | Also required |
|---|---|---|---|
| **to the bench** (leaf) | `P/stock/X.md` | `P/bench/X.md` | the floor (§3) |
| **to the bench** (breaks down) | `P/stock/X.md` | `P/bench/X/PIECE.md` | the floor, plus `stock/ bench/ finished/` created in the same commit |
| **finish** (leaf) | `P/bench/X.md` | `P/finished/X.md` | — |
| **finish** (breaks down) | `P/bench/X/PIECE.md` | `P/finished/X.md` | its `stock/` and `bench/` are empty |

That is the complete inventory. **Every other move under `.madewell/` is illegal.** No force
flag, no skip, no rewind. Nothing is ever deleted from a state directory — pieces leave by
finishing.

**Abandoning** is a finish with `**ABANDONED:** <reason>` as the first line. A recorded
outcome, not an undo.

**Failure is not a move.** A failed proof leaves the piece on the bench. The next attempt is
a new commit against the same file. Attempts accumulate in `git log`; position does not move
until it passes.

**The commit message is the record of the move.** Git supplies timestamp, author, chain,
and the transition. Do not add a *position* ledger. The Jig still records proposed −
accepted in `jig/corrections.jsonl` (gitignored) — that is tax, not location.

```
<type>(<scope>): <summary>

ACT: <ideate | plan | implement | verify>
DONE: <what got done>
NEXT: <the handoff; write `—` if none>
```

---

## 3. The floor

Content is prose. This constrains *when* work may move, never *what* it says.

**On the rack** (`stock/`) — a title and what it's about. Nothing else is owed.

**To reach the bench** — four lines, and no more may be demanded:

```markdown
**Making:** …
**Not making:** …
**Done when:** …
**Waits on:** …        (may be empty)
```

That is ideate and plan, written down. **Nothing else may be required here** — not a file
list, not a task breakdown, not line numbers. Those do not exist until the work is broken
down, and demanding them at this move is asking one gate to do two acts' jobs.

**A piece may be a pointer** — a title plus a path to where the substance lives:

```markdown
# Retry policy for the upload queue
**Source:** notes/2026-03-outage-review.md#retries
**Making:** … **Not making:** … **Done when:** … **Waits on:** …
```

This is how Made Well seats over an existing corpus without copying it. The store tracks
**position**; the pointed-at document holds the **content**. Never both.

---

## 4. Why this is parallel

One file per piece, one directory per breakdown, no shared index. Two hands never write the
same file. `bench/a/` and `bench/b/` are disjoint subtrees. There is nothing every worker
must append to.

One rule: **a piece on the bench has exactly one pair of hands.**

---

## 5. Enforcement

| Rule | Enforcer |
|---|---|
| Only the four moves (§2) | **JIG** — `.madewell/bin/mw-gate.sh` on pre-commit (`.madewell/bin/mw-hooks.sh` wires it). Optional scaffolding: `.madewell/bin/mw-move` performs them and stages; it is not the product. |
| Nothing deleted from a state directory | **JIG** |
| Arrival only into `stock/` | **JIG** |
| The floor (§3) | **JIG** |
| Finish requires the inner states drained | **JIG** |
| Wired convention detectors | **JIG** — `.madewell/bin/mw-jigs.sh` on pre-commit, from `jig/registry.json` |
| Proposed − accepted (shop-made substrate) | **JIG** — `.madewell/bin/mw-record.sh` on post-commit → `jig/corrections.jsonl`; override via `jig/proposed.json` |
| Shop-made / take-down verdict | **UNJIGGED** as a commit stop — `.madewell/bin/mw-tax.sh` at verify and session-end. Never auto-builds. |
| You don't proof your own plate | **UNJIGGED** — not machine-checkable here |
| No silent pass | **UNJIGGED** |
| Ground (did you look) | **UNJIGGED** — protocol is law; no detector can see a thought |

`mw-gate.sh` is a stop, not a tool: nobody invokes it, it takes no arguments, it can only
refuse. POSIX sh, git plus POSIX userland, reads nothing outside the repo. `mw-hooks.sh`
wires it (and `mw-jigs.sh` / `mw-record.sh`) into this clone. Do not leave it as a comment
in README.

**UNJIGGED is stated on purpose.** A rule with no jig behind it is a preference, and it says
so rather than pretending.

**Two labels, two questions — they compose, they do not compete.**
`FENCE` / `SIGN` / `DOCTRINE` (`PORTABILITY.md` §4, `jig/CONTRACT.md`) answers *what kind of
rule is this* — decidable, surfaced, or stated only. `JIG` / `UNJIGGED` answers *is this fence
wired on this host*. So: a fence with a detector is a **JIG**; a fence with no detector is
**UNJIGGED**; a sign or a doctrine was never a candidate for either. The table above reports
wiring, which is why it uses the second pair.
