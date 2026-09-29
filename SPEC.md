# Constellation — where the work lives

The model is `CONSTELLATION.md`. This file says only **where things sit and how they move**.
It defines no meanings; that file names no paths. They cannot disagree.

Constellation is files. The driver, `.constellation/bin/constellation`, runs the work on top of them
and keeps nothing of its own that says where a piece is: no dashboard, no second ledger of
piece position.

`.constellation/bin/cst-move` is scaffolding for §2. It is `git mv` and `git rm` that refuse
everything else. Delete it and the shop still runs: `git mv`, `git rm` plus `cst-gate` on
pre-commit. The binary is not the work.

---

## 1. Position is path

> **A piece's state is the directory it is in. Nothing else records it.**
> **Done work is gone: it leaves the tree when it lands, and git log is where it is done.**

No status field, no projection, no ledger **of piece position**, and no shelf of done work. To ask where something is,
look at where it is. The Jig's `corrections.jsonl` is a different file: proposed − accepted
for shop-made jigs (`jig/CORRECTIONS.md`). It does not say where a piece sits.

```
.constellation/
├── stock/                    uncut. Grows without limit.
│   └── <slug>.md
└── bench/
    ├── <slug>.md                 a leaf — one pair of hands, does not break down
    └── <slug>/                   breaks down — the same two, one depth in
        ├── PIECE.md
        ├── stock/
        └── bench/
```

The two names recur at every depth. `bench/<a>/bench/<b>/` is legal and means what it
looks like. Depth is bounded only by the work. **Done** is not a directory: it is the
finish commit that took the piece out of the tree (§2), with the piece's receipt as its body.

**Reading it — the whole interface:**

```sh
ls .constellation/stock/       # material on the rack. Large is correct.
ls .constellation/bench/       # what is being worked, top level
git log --grep='^finish '      # done: every finish commit, newest first

find .constellation -type f -name '*.md' | grep -E '/bench/[^/]+\.md$'   # every leaf in hand, any depth
find .constellation -type f -name PIECE.md                                # everything open that breaks down
git log -- .constellation/bench/<slug>.md                                 # one piece's whole history, to its finish
```

A piece that breaks down is **open** while its `PIECE.md` exists. Its parts leave its inner
`bench/` the way any piece leaves, each in its own finish commit; when all are done, its
finish commit takes the whole `bench/<slug>/` away. (An older install finished into a
`finished/` directory; `constellation adopt` removes it, since its history is in git.)

---

## 2. Movement is `git mv`

**The move is the transition.** One move per commit. `P` is the containing path —
`.constellation`, or `.constellation/bench/<slug>` at any depth.

| Move | From | To | Also required |
|---|---|---|---|
| **to the bench** (leaf) | `P/stock/X.md` | `P/bench/X.md` | the floor (§3) |
| **to the bench** (breaks down) | `P/stock/X.md` | `P/bench/X/PIECE.md` | the floor, plus `stock/ bench/` created in the same commit |
| **finish** (leaf) | `P/bench/X.md` | removed (`git rm`), at land | — |
| **finish** (breaks down) | `P/bench/X/PIECE.md` | removed, with all of `P/bench/X/`, at land | its `stock/` and `bench/` are empty |

That is the complete inventory. **Every other move under `.constellation/` is illegal.** No force
flag, no skip, no rewind. Nothing is deleted from `stock/`, nothing arrives anywhere but
`stock/`, and a piece leaves the bench only by finishing. `finished/` is retired: nothing
arrives there, and an old one may only be taken away.

**The finish commit is the record of done.** `constellation land` makes it: subject
`finish <slug>`, the receipt (what changed, how we know it works, how to see it, what it cost)
as its body, the trailer below. `constellation receipt`, `status` and `brief` read it back
from `git log`. The piece's text is in the commit before it.

**Abandoning** is a finish whose commit body opens with `ABANDONED: <reason>`. A recorded
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

This is how Constellation seats over an existing corpus without copying it. The store tracks
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
| Only the moves of §2 | **JIG** — `.constellation/bin/cst-gate.sh` on pre-commit (`.constellation/bin/cst-hooks.sh` wires it). Optional scaffolding: `.constellation/bin/cst-move` performs them and stages; it is not the product. |
| Nothing deleted from `stock/`; nothing arrives in `finished/` | **JIG** |
| Arrival only into `stock/` | **JIG** |
| The floor (§3) | **JIG** |
| Finish requires the inner states drained | **JIG** |
| A bench removal happens only at land | **UNJIGGED** — the gate cannot see which command made the commit; `constellation land` is the door, and its finish commit says so |
| One writer at a time in the main checkout | **The driver's door**, not a commit stop — every write the driver makes there (take, land, inbox filing, trade, adopt) holds `flock` on `<git common dir>/constellation.lock`, waiting its turn; a git command run by hand does not take it (**UNJIGGED**) |
| Wired convention detectors | **JIG** — `.constellation/bin/cst-jigs.sh` on pre-commit, from `jig/registry.json` |
| Proposed − accepted (shop-made substrate) | **JIG** — `.constellation/bin/cst-record.sh` on post-commit → `jig/corrections.jsonl`; override via `jig/proposed.json` |
| Shop-made / take-down verdict | **UNJIGGED** as a commit stop — `.constellation/bin/cst-tax.sh` at verify and session-end. Never auto-builds. |
| You don't proof your own plate | **JIG for execution-bound pieces** — current independent acceptance and fresh retained proof at legal finish; **UNJIGGED for legacy unbound pieces**, intentionally (§6) |
| No silent pass | **UNJIGGED** |
| Ground (did you look) | **UNJIGGED** — protocol is law; no detector can see a thought |

`cst-gate.sh` is a stop, not a tool: nobody invokes it, it takes no arguments, it can only
refuse. POSIX sh, git plus POSIX userland, reads nothing outside the repo. `cst-hooks.sh`
wires it (and `cst-jigs.sh` / `cst-record.sh`) into this clone. Do not leave it as a comment
in README.

**UNJIGGED is stated on purpose.** A rule with no jig behind it is a preference, and it says
so rather than pretending.

**Two labels, two questions — they compose, they do not compete.**
`FENCE` / `SIGN` / `DOCTRINE` (`PORTABILITY.md` §4, `jig/CONTRACT.md`) answers *what kind of
rule is this* — decidable, surfaced, or stated only. `JIG` / `UNJIGGED` answers *is this fence
wired on this host*. So: a fence with a detector is a **JIG**; a fence with no detector is
**UNJIGGED**; a sign or a doctrine was never a candidate for either. The table above reports
wiring, which is why it uses the second pair.

## 6. Execution within a session

Piece position (§1) and execution progress are different facts. A host may persist a
session's current act, proposed checklist, dependencies, actor, expected results,
command attempts, evidence and acceptances under `.constellation/sessions/`. Such a record
must never override stock/bench position or move a piece implicitly.

A bound execution proceeds ideate → plan → implement → verify. Planning declares the
implementation and verification steps before execution opens. Completion requires the
checklist and evidence, not a narrated status. Verification is performed by an actor
other than the maker. Failure preserves the attempt and repeats the necessary acts;
this does not rewind the piece's position. Changed evidence cannot inherit old approval. The entire current retained proof
closure is rechecked at execution, acceptance and finish, not only final artifacts.
All contributing makers, including failed implementation attempts, remain excluded
from verification across retries. Historical done and current proof validity are
separate visible facts. A stale done execution may explicitly reopen while its
piece is open; landed pieces never rewind.

Execution adoption is optional for **legacy unbound pieces**. Once bound, both
`cst-move` and `cst-gate.sh` require fresh independent completion for legal finish,
the removal at land; the record is then marked landed, claims nothing, and its path
is free for new work. They rebind the existing execution reference on the legal move,
including unit expansion, under the same lock used by claim acquisition. No position ledger is
added: the actual file path still decides where the piece is. A missing claimed
piece requires explicit reconciliation, not a new claim that forgets its maker.
The host exposes a separate legal move after done; passing verification never
performs it implicitly. Execution-aware movement requires Python in addition
to the existing Git/POSIX machinery.

A session has a start, a time bound, and a stop. An interrupted or stopped session is
not a completed task. Ownership and unfinished obligations survive; takeover is explicit.

Reference door: `bin/cst-session.py` (package: `kernel/bin/cst-session.py`). Contract and
host activation: `bindings/SESSION.md` (package: `kernel/bindings/SESSION.md`). The
optional host binding refuses alternate execution tools and renders the same persisted
state. Until that binding is actually loaded, the CLI alone is not a host-wide fence.
No provider, model, or particular agent runtime is required by the execution records.
