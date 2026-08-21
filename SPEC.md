# Made Well — Ledger & Door Specification

**Version:** 1 (draft)
**Date:** 2026-08-04
**Status:** Draft for the first dogfood cycle. Normative once a cycle has landed through it.

This document is the durable contract of Made Well: the **file format** that records the
ratchet, the **state machine** that defines legal movement, and the **door contract** that
makes transitions executable. The reference CLI (`mw`, POSIX sh, vendored at
`.madewell/bin/mw`) implements this spec; so may any other host. **The format is the
product; every implementation is replaceable.**

Vocabulary (stage, phase, Cycle, queue, door, wall) is defined by
`.madewell/LIFECYCLE.md`. When this spec and LIFECYCLE.md disagree on lifecycle
semantics, LIFECYCLE.md wins; when they disagree on storage or enforcement, this
spec wins.

The key words MUST, MUST NOT, SHOULD, MAY are to be interpreted as in RFC 2119.

---

## 1. Two state classes

Made Well distinguishes exactly two classes of state. Every mechanism in this spec
applies to the first class only.

| Class | Examples | Lives | Rules |
|---|---|---|---|
| **Ratchet state** | transitions, door results, queue position, pauses | in the repo, committed | text, append-only where historical, this spec |
| **Host telemetry** | worker heartbeats, token odometry, spine envelopes, dashboards | wherever the host wants | out of scope; any store (SQLite, ring buffer, …) |

**Rule 1 (the portability invariant).** A door MUST NOT read or write anything outside
the repository. Anything a door decision depends on is, by definition, ratchet state and
MUST live in the repo. This is what keeps an instance runnable by any harness, any
provider, any tool — including none.

**Rule 2 (no databases in the grammar).** Ratchet state MUST be plain text committed to
git. Git is the durability, replication, and history layer. Databases, hosted services,
and network dependencies are host-territory, below the doors, never load-bearing.

Rules 1–2 generalize into the **Host ABI** — the five ontological commitments any
runtime must offer to host Made Well, the enforcement-tier honesty rule, and the
port-hosts-never-packs invariant — specified in `PORTABILITY.md` (normative companion).

---

## 2. Files

All paths are relative to the instance root (`.madewell/`).

| File | Class | Nature |
|---|---|---|
| `work/events.jsonl` | ratchet | **The ledger.** Append-only JSONL. The single source of truth for position. |
| `madewell.json` | ratchet | The projection + the queues. Partly derived (§7), partly authored. |
| `work/tax.jsonl` | ratchet | Existing tax ledger. Unchanged by this spec. |
| `bin/doors/<name>.sh` | ratchet | Door check scripts (§6). |
| `bin/mw` | ratchet | The vendored reference CLI. |

A fresh instance has an empty or absent `events.jsonl`; the first event creates it.

---

## 3. The ledger — `work/events.jsonl`

### 3.1 Encoding and append rules

- UTF-8, one JSON object per line, LF line endings, no blank lines.
- **Append-only.** A line, once written, MUST NOT be edited, reordered, or deleted.
  History is corrected by appending (e.g. an `abandon` event), never by rewriting.
- **Single writer.** Only the tool ticking the ratchet (the reference CLI, or a
  conforming host) writes this file. Workers and sub-agents MUST NOT append directly;
  they report to the coordinator, which advances the ratchet. Appends use `O_APPEND`
  semantics (`>>`), one full line per write.
- Durability checkpoint is the git commit. A crash may lose at most the tail lines
  written since the last commit; door frequency makes this acceptable, and the `land`
  door coincides with a commit by definition.

### 3.2 Event schema (v1)

Common fields, all REQUIRED unless marked:

```json
{"v":1,"ts":"2026-08-04T17:20:04Z","kind":"door","prev":"9f31c2a8f0e11b02", "actor":"agent:claude-code", "...": "kind-specific fields"}
```

| Field | Type | Meaning |
|---|---|---|
| `v` | int | Schema version. This spec defines `1`. |
| `ts` | string | UTC ISO-8601, seconds precision. |
| `kind` | string | One of `door`, `pause`, `abandon`, `migrate`, `note`. |
| `prev` | string | Hash chain (§3.4). |
| `actor` | string | Who ticked: `agent:<harness>`, `human:<name>`, or `tool:mw`. |

### 3.3 Event kinds

**`door`** — a transition tick. The only kind that moves the ratchet.

```json
{"v":1,"ts":"2026-08-04T17:20:04Z","kind":"door","prev":"9f31c2a8f0e11b02",
 "actor":"agent:claude-code","door":"plan","cycle":"c001","item":"i003",
 "checks":[{"id":"P2","pass":true},{"id":"P3","pass":true}],
 "result":"pass","mode":"gate"}
```

- `door` — one of the door names (§5.2).
- `cycle` — the open Cycle's id (`cNNN`). REQUIRED for all doors except `commit`,
  which mints it.
- `item` — the Imagine-queue item id. REQUIRED for item-scoped doors (§5.3), absent
  for cycle-scoped doors.
- `checks` — array of wall results from the door's check script; `[]` when the door
  is declarative (no script yet, §6.4).
- `result` — `pass` or `fail`. A `fail` line MAY be recorded (a gauge run worth
  keeping, an audit trail of a refused gate) but MUST NOT advance position. Only a
  `pass` in `gate` mode moves the ratchet.
- `mode` — `gate` or `gauge` (§6.3).

**`pause`** — the cooperative pause, recorded (never gated). OPTIONAL but RECOMMENDED:
the human's redirect is the entropy the loop runs on, and it is worth keeping.

```json
{"v":1,"ts":"...","kind":"pause","prev":"...","actor":"human:jrg",
 "cycle":"c001","surface":"verify result for i003","redirect":"ship it, but rename the flag"}
```

A `pause` event MUST NOT be required by any door and MUST NOT advance position. Pauses
are contact, not gates.

**`abandon`** — closes a Cycle (or a single item) without landing it.

```json
{"v":1,"ts":"...","kind":"abandon","prev":"...","actor":"human:jrg",
 "cycle":"c001","item":null,"reason":"superseded by d004"}
```

Abandonment is a recorded outcome, not an undo: consumed doors stay consumed, the
history stays intact, and the outer loop moves on. **There is no rewind event and there
never will be one** — see §10.

**`migrate`** — marks adoption or a schema migration on an existing instance.

```json
{"v":1,"ts":"...","kind":"migrate","prev":"genesis","actor":"tool:mw",
 "from":null,"to":1,"note":"ledger adopted; madewell.json taken as initial projection"}
```

**`note`** — free-form annotation (e.g. a topology correction, §10). Never load-bearing.

### 3.4 The hash chain

Each event's `prev` field is the first 16 hex characters of the SHA-256 digest of the
**previous event's exact line bytes** (without the trailing LF). The first event in the
file uses the literal string `"genesis"`.

- Implementations MUST compute SHA-256 (`shasum -a 256` on macOS, `sha256sum` on Linux).
- The chain makes the one-way gear tamper-evident: editing or deleting any line breaks
  every `prev` after it, and `fsck` (§7.3) catches it.
- The chain is integrity, not security. It proves the ledger wasn't quietly rewritten;
  it does not authenticate actors. That is enough: the adversary here is drift and
  "helpful" hand-editing, not attackers.

---

## 4. The state machine — loops and position

The lifecycle is LIFECYCLE.md's, restated here as data:

```
OUTER   while QUEUE not empty:      pull d-item → Commit → Build → Land → pause
INNER   (inside Build, one Cycle)   while work remains:  [Imagine if open] → Plan → Make → Verify → pause
```

**The outer condition is the QUEUE, not Discovery** (operator ruling 2026-08-13; see
LIFECYCLE.md "Two reservoirs"). Discovery is a feeder that fills a **staging pool of
candidates**; **Commit is the valve that admits a candidate to the queue**. The pool is
expected to grow faster than it drains — refusing is Commit's function — so a `while` over
the pool never terminates. `discovery[]` is the pool; what Commit admits is the queue
(`active[]`).

**Locked-spec Commit (2026-08-20):** when the admitted item is already bounded (spec /
done-when / out-of-scope written), Imagine is complete. The Cycle mints at `phase: "plan"`.
The orchestrator does not re-ideate. Make ≠ Verify. Merge to main with tests green is outer
Land. Product forks return to the pool.

**Position** is fully derived from the ledger plus the queues:

- **Outer position** — the last cycle-scoped door event: which Discovery item is
  committed, whether its Cycle is open, whether it has landed.
- **Inner position** — within the open Cycle, the last item-scoped door event per
  Imagine item: which item is in flight and which phase it has reached.
- **Resume rule (inner first), as a function:** if an open Cycle has an item whose last
  door is `plan` (in Make) or whose `verify` has not passed → resume there. Else if the
  open Cycle's Imagine queue is non-empty → pull the next item. Else if a Cycle is open
  and Imagine is empty → the `land` door is owed. Else if Discovery is non-empty → the
  `commit` door is next. Else → fresh discovery conversation.

A conforming implementation MUST compute position from the ledger; it MUST NOT trust a
mutable field as the source of truth (the projection in `madewell.json` is a
convenience view, §7).

---

## 5. Doors

### 5.1 What a door is

A door is a named, gated transition between two lifecycle positions. Doors are the
framework; the phases are the corridor between them. Every door tick is a ledger event;
every ledger `door` event with `result:"pass"` and `mode:"gate"` is one tooth of the
ratchet.

### 5.2 The v1 door inventory

| Door | Transition | Scope | Contact (from the corpus) |
|---|---|---|---|
| `commit` | Discovery → Build (opens a Cycle) | cycle | The gate: one item pulled, bounded; "say no here." Mints `cycle` id, records the source Discovery item. |
| `ground` | Commit → Build entrance, before Imagine | cycle | The Ground contact: plan↔codebase fan-out; bindings supplied; the entrance door. |
| `plan` | Plan → Make (per Imagine item) | item | The plan artifact exists and is fit to hand off (walls P1–P5). Also records the item pull. |
| `verify` | Make → Verify verdict (per Imagine item) | item | The isolation contact: impl↔brief, verdicts from agents that did not build it; builder≠verifier. |
| `land` | Verify → Land (closes the Cycle) | cycle | The Land record: cycle↔world (walls W1–W4). Fires only when the Cycle's Imagine queue is empty. |

The Rubric contact (fired at cartridge load) is session-scoped, not lifecycle-scoped,
and is out of the v1 ledger. It MAY become a `note` event; it is not a door.

### 5.3 Linearity — the consumed-token rule

The phase-advance token is the *absence of the door's pass-event in its scope*:

- A **cycle-scoped** door (`commit`, `ground`, `land`) MUST pass at most once per Cycle.
- An **item-scoped** door (`plan`, `verify`) MUST pass at most once per (Cycle, item).
- A door MUST NOT pass out of order: `ground` requires `commit`'s pass; `plan` requires
  `ground`'s pass and an item not yet planned; `verify` requires that item's `plan`;
  `land` requires every pulled item's `verify` pass (or `abandon`) **and** an empty
  Imagine queue.

An implementation MUST compute the set of currently legal doors from the ledger head
and the queues, and MUST refuse anything else. There is no force flag. There is no
skip verb. A door that already passed is behind you; the topology is the proof.

### 5.4 Failure is an outcome, not a rollback

A failing `verify` does not "go back to Make" by rewinding — the fail line is appended,
the item stays in flight, and the next `verify` attempt appends a new event. The ledger
accumulates attempts; position derives from the latest state. Diagnose-and-retry is
motion *forward* through the same door, recorded each time.

---

## 6. The door check contract

### 6.1 Interface

A door's check is an executable at `.madewell/bin/doors/<door>.sh`:

```
sh .madewell/bin/doors/<door>.sh <repo-root> <cycle-id> [<item-id>]
```

Environment: `MW_LEDGER` — absolute path to `events.jsonl`; `MW_MODE` — `gate` or
`gauge`. Checks MUST be POSIX sh, depend on nothing beyond `git` + POSIX userland, and
obey Rule 1 (repo-only reads).

### 6.2 Output and exit codes

- stdout: one line per wall, `<wall-id> <pass|fail> <human message>` (e.g.
  `W2 fail madewell.json did not advance in this commit`). The CLI parses these into
  the event's `checks` array.
- Exit `0` — all walls pass. Exit `1` — at least one wall fails. Exit `2` — not
  applicable in this context (recorded as `checks:[]`, treated as pass with a `note`).

### 6.3 Gauge vs gate

The same script runs in two modes:

- **Gauge** (`mw check <door>`): run any time, exit code reflected to the caller,
  ledger untouched (or a `mode:"gauge"` line recorded on request). This preserves
  `land-check.sh`'s original warn-only behavior for ad-hoc use.
- **Gate** (`mw advance <door>`): exit ≠ 0 refuses the tick. Nothing is appended with
  `result:"pass"` unless the script passed. This is the Rumen upgrade land-check's own
  header promised, delivered by invocation mode rather than by editing the walls.

### 6.4 Declarative doors

A door with no check script still ratchets: advancing it appends the event with
`checks:[]`. Linearity and ordering (§5.3) are enforced by the CLI regardless. Check
scripts are the extension point — cartridges add walls to existing doors or scripts to
declarative ones; they MUST NOT add new door names to v1.

The reference implementation ships checks for `plan` (walls P1–P5: artifact exists;
Data-Flow-Conformance block where the cartridge demands it; dependency DAG sound —
every item has `dependsOn`, non-empty frontier, no cycles; exemplars named; framework
line present) and `land` (walls W1–W4: record complete; state advanced; docs moved
with code; tax recorded). `commit`, `ground`, `verify` ship declarative in v1.

---

## 7. The projection — `madewell.json`

### 7.1 Two regions

`madewell.json` keeps its current shape and gains one derived block:

- **Authored region** (human/agent-owned, as today): `project`, `profile`, `context`,
  the queues — `discovery[]`, `active[]`, `blocked[]`, and each Cycle's Imagine items.
  Queues are *content*; the ledger records *movement through* them, not their text.
- **Derived region** (tool-owned): a `position` object:

```json
"position": {
  "stage": "build",
  "cycle": "c001",
  "source": "d003",
  "item": "i003",
  "phase": "make",
  "head": "9f31c2a8f0e11b02"
}
```

### 7.2 Rules

- The derived region MUST be regenerated from the ledger on every tick and MUST NOT be
  edited by hand or by an agent. `head` is the hash (§3.4) of the last ledger line it
  was derived from.
- The authored region remains freely editable **except** that queue-position facts the
  ledger owns (an item's done-ness, a cycle's open-ness) are derived; an authored field
  that contradicts the ledger is a `fsck` failure.

### 7.3 `fsck`

A conforming implementation MUST provide a verification that:

1. replays the hash chain end-to-end (§3.4) and fails on any break;
2. recomputes position and fails if the projection's derived region disagrees;
3. checks linearity (§5.3) over the whole ledger — no door passed twice in scope, none
   out of order.

`fsck` failing is a stop-the-line event: the instance's history has been tampered with
or a non-conforming tool wrote to it. The remedy is a `migrate` or `note` event written
by a human decision — never a quiet rewrite.

---

## 8. The pause

The cooperative pause is load-bearing and this spec touches it only to protect it:

- No mechanism in this spec fires on a schedule or advances autonomously. Every tick is
  an invocation. A CLI cannot delete the pause, because a CLI cannot act unprompted.
- No door, wall, adapter, or conformance test may treat a pause as an error, a delay to
  optimize away, or a step to auto-approve. An adapter that answers the pause on the
  human's behalf is non-conforming, full stop.
- Pauses SHOULD be recorded (§3.3) because the redirect given at a pause is exactly the
  material later phases are woven from.

Custodial work (advancing, dispatching, respawning, bookkeeping) is the tool's job and
should trend to zero human effort. Generative contact (intent, taste, judgment at the
pause) is the human's and is never automated. This spec mechanizes custody of time; it
does not manufacture intent.

---

## 9. Conformance

An implementation may call itself a **Made Well host** if it passes the conformance
suite (`conformance/run.sh`), which exercises at minimum:

1. a full happy-path Cycle: `commit → ground → (plan → verify)×N → land`, ledger and
   projection correct at every step;
2. double-advance refused (each scope);
3. out-of-order door refused (every illegal edge in §5.3);
4. failing gate blocks and records nothing as passed;
5. gauge mode never moves position;
6. `abandon` closes without unlocking consumed doors;
7. hand-edited ledger caught by `fsck` (chain break);
8. hand-advanced projection caught by `fsck` (derived-region drift);
9. resume position computed correctly from a mid-cycle ledger (inner-first rule);
10. Rule 1 respected: doors run with no network and no reads outside the repo.

The suite is fixture-based (a temp git repo), mock-free, and is also the reference
CLI's own test suite. A future implementation (a Go binary; Constellation natively)
proves itself against the same fixtures — that is what makes the format, not the shell
script, the durable thing.

---

## 10. Design rationale (informative, one line each)

- **Determinism on time, not space.** Walls gate *when* work may advance; no schema
  ever freezes *what* the work says. Content stays prose.
- **Push, not pull.** Consultative mechanisms measured 0% adoption across 45 runs;
  every mechanism here is fired by an invocation path, not offered for consultation.
- **Repo is truth.** Git is the database: replication, history, audit, and review come
  free; a `.db` file would hide the ratchet from the agents that must obey it.
- **No rewind.** Rewind/fork/replay is the anti-ratchet; a walked-through door being
  behind you is the property everything else is built on. Failure is recorded forward.
- **Ledger owns movement; humans own content.** Queues and plans are authored; position
  is derived; the two never fight because they never overlap.
- **The CLI is disposable.** Anything that reads §3 and obeys §5 can replace it. Lock-in
  to Made Well's own tooling would be lock-in all the same.
- **GEPA hooks.** Corrections to walls are content corrections (edit the door script);
  corrections to the door inventory are topology corrections (a spec revision, filed as
  a `note` first). The two signals are kept distinct on purpose.

---

## Appendix A — ID conventions (informative)

Discovery items `dNNN` (existing convention), Cycles `cNNN` (minted at `commit`,
`source` links the Discovery item), Imagine items `iNNN` scoped to their Cycle.

## Appendix B — Adoption on an existing instance (informative)

Append a `migrate` event (`prev:"genesis"`); treat the current `madewell.json` as the
initial authored region; derive `position` from it once, by hand, recorded in the
migrate note. Existing `land-check.sh` keeps working as a gauge until the instance
opts into gates. Nothing else changes on day one.

## Appendix C — The notify hook (informative, non-normative)

Resolves `outer-loop/build/tower-review.md` (madewell-meta) question 3's operational
half: host telemetry (§1) needs a defined seam or every host reinvents one. This
appendix names it without making it load-bearing.

**Interface:**

```
sh .madewell/bin/notify.sh
```

reads exactly one ledger line — the event that was just appended (§3.2) — on stdin,
verbatim JSON, no framing. `MW_REPO_ROOT` is set in the environment for convenience;
nothing else is passed, because everything else a host could want is already inside
that JSON line.

**Rules:**

- **Post-transition only.** `notify.sh` runs *after* a ledger append succeeds. It
  cannot see a pending decision and cannot veto one — that is what door-check scripts
  (§6) are for. Two different extension points, two different jobs: doors gate,
  notify informs.
- **Fire-and-forget.** The reference CLI invokes it detached with a short timeout
  (a few seconds) and never inspects its exit code or output. A hanging, crashing, or
  absent `notify.sh` MUST NOT slow or fail `mw advance`, `mw check`, or any door.
  Delivery guarantees (retry, at-least-once, ordering) are entirely the script's
  problem, if it wants any — the kernel makes none and asks for none back.
- **Absence is a fully valid, silent, supported state.** No file at that path means no
  telemetry and no error. This is Rule 2's "or none" made concrete, not a degraded
  mode.
- **The payload is the contract.** There is no separate notify-schema to design or
  version — it is exactly the ledger event schema (§3.2/3.3) a host already has to
  parse to read the ledger at all. One schema, two consumers (the ledger file itself,
  and this hook).
- **Disposable by the same logic as everything else here (§10).** Any host — a shell
  one-liner piping to `osascript`, a Tower bridge, a bb plugin, nothing — can occupy
  this file. Replacing it is replacing a file, not a migration.

**Reference triviality (what "minimal" looks like):**

```sh
#!/bin/sh
# .madewell/bin/notify.sh — reference notify hook. Delete or replace freely.
read -r line
kind=$(printf '%s' "$line" | sed -n 's/.*"kind":"\([a-z]*\)".*/\1/p')
[ "$kind" = "pause" ] && osascript -e "display notification \"$line\" with title \"Made Well: pause\""
exit 0
```

Nine lines, no dependency beyond POSIX + whatever the host provides, and it is exactly
as replaceable as `land-check.sh` was before this spec existed.

## Correction

*(GEPA signal — when a claim in this spec is corrected by later work, note what was
wrong and why, before revising.)*

### 2026-08-05 — W1–W4 vs W1–W5 (land walls)

**Spec text (§6.4):** the reference implementation ships checks for `land` with walls
**W1–W4** (record complete; state advanced; docs moved with code; tax recorded).

**Actual shipped reference** (`.madewell/bin/land-check.sh`, the pre-spec
script that the new `bin/doors/land.sh` is ported from): has always had a
**fifth** wall, **W5 — discovery source promoted** (commit references a
`STG-NNNN` source but does not mark it `PROMOTED`), implemented at lines
54–58 of the legacy script.

**Resolution:** the new `bin/doors/land.sh` ports all five walls' logic into
the new `sh .madewell/bin/doors/land.sh <repo-root> <cycle-id> [<item-id>]`
contract. Behavior kept as-is (W5 is a real check, not a stub). This
discrepancy is recorded here rather than silently dropping W5 or silently
rewriting the spec's prose; the spec prose should be updated separately
(proposed: change §6.4 land entry to read `W1–W5`). No spec schema change;
the §10 "GEPA hooks" rule says content corrections (the door script) are
distinct from topology corrections (a spec revision), and this is the
former.

### 2026-08-05 — `madewell.json` shape is unspecified (reference CLI choices)

**Spec text (§7.1):** "the queues — `discovery[]`, `active[]`, `blocked[]`,
and each Cycle's Imagine items." Authored region is freely editable; the
projection's derived region is the position block. The spec does not
mandate where Imagine items live inside a Cycle, or how an `items[]` array
is shaped on a Discovery item, or whether closed cycles get a new
top-level array.

**Reference CLI choices (for the .madewell/.madewell/bin/mw slice):**

1. **Closed cycles move to a new `landed[]` top-level array.** Spec §5.2
   only names `commit`/`ground`/`plan`/`verify`/`land` as doors and §7.1
   only names `discovery[]`/`active[]`/`blocked[]` as queues; `landed[]` is
   the reference CLI's container for cycles whose `land` door has fired.
   The CLI maintains it on `mw advance land`; a non-conforming tool that
   ignores it is still spec-conformant.
2. **Imagine items live inside the active cycle as `items[]`.** The spec's
   phrase "each Cycle's Imagine items" is ambiguous between "nested
   under the cycle in `active[]`" and "a separate top-level array." The
   reference CLI uses the nested form. A new cycle is minted on
   `mw advance commit` by copying the committed Discovery item's own
   `items[]` array into the new cycle.
3. **Discovery items may carry an `items[]` field** that seeds the cycle's
   items on commit. Without it, the cycle is born with no items and
   `land` is owed immediately after `ground` (an unusual but legal shape).

These three are recorded here as reference-CLI decisions, not spec
revisions. A future host is free to choose differently; its conformance is
judged by the schema validation in §7.2/§7.3, not by these choices.

### 2026-08-05 — POSIX BRE `\+` is not portable (md 5)

**Symptom during the build:** `sed -e 's/[[:space:]]\+/ /g'` on macOS BSD sed
collapses runs of whitespace correctly, but in some test inputs also
strips a literal `+` character immediately following whitespace. Diagnosis:
BSD `sed` (and POSIX BRE generally) does not treat `\+` as the
"one-or-more" quantifier; `\+` matches a literal `+`. The portable
POSIX-BRE form is `[[:space:]]\{1,\}`. This is not a SPEC issue but is
recorded here because Made Well's reference CLI runs on both macOS and
Linux, and a contributor copy-pasting GNU-style `\+` will silently lose
data on macOS.

**Resolution:** the reference CLI uses `\{1,\}` everywhere it needs BRE
quantifiers. `shellcheck -S warning` is clean on all four scripts under
this discipline.

