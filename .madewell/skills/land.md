# Land

**The outlet. Run at every Verify→Land — the moment a unit of work is done.**

Land is how a finished brick *leaves the system clean*: it ships, it drains the queue, and
it feeds back what building it taught. A unit with no Land does not crash — it **leaks**:
state accrues, the queue never empties, the lesson evaporates, the staging lake never
drains. Land is the valve. It is the system's **catabolism** — not bookkeeping, but the
controlled breakdown that frees capacity and returns nutrient.

**Granularity:** per *unit of work* (per brick), not per session. `session-end` runs once
at session close; **Land runs once per completed unit** — there may be several Lands in one
session, and `session-end` confirms every completed unit actually Landed.

Land is the system's catabolism — the controlled breakdown that frees capacity and returns
nutrient (see `DECISIONS.md` when present, and the four-leg lifecycle in `AGENTS.md`).

---

## The Land record — four faces

The Land record **is the commit** that ships the unit, carrying four faces. Two already
live in the commit (DELTA, handoff); three are the net-new valve.

| Face | What | Where it routes |
|---|---|---|
| **DELTA** | the brick that shipped — summary + the diff | the commit itself |
| **LEARNED** | the one thing building this revealed that wasn't written down | → *work* (DECISIONS / memory / lexicon) **or** → *factory* (the metabolism) **or** `none` |
| **PROPAGATED** | every existing surface reconciled to the new reality | a checklist — each item `done` · `n/a` · `OWED→queued` |
| **TAX** | proposed (first pass) − accepted (what passed Verify) | `.madewell/work/tax.jsonl` — a pure scalar the metabolism does arithmetic on |

---

## Step 1 — Ship (the outward face)

Drain the unit *out* of the system:

- Remove the unit from `active` in `madewell.json`; delete its cycle store (`rm .madewell/cycles/<id>.json`); advance `stage`; set `context.openThread`.
- If the unit ran in a fleet: append its claim release to `.madewell/work/board.jsonl` (`{"ts","cycle","claims":[paths],"kind":"release"}`) — expiry is the safety net, release is the discipline (see `orchestrate.md`).
- Delete the unit's brief — `rm .madewell/specs/<unit>.md` — verified work needs no brief.
- Anything the unit *surfaced* goes to `discovery` (never silently into `active` — that is the Commit gate's call, made deliberately later).

## Step 2 — Reflect (the inward face)

Feed the nutrient *back*:

- **LEARNED** — name the single thing doing this revealed. Route it honestly:
  - about *the work* → a line in `DECISIONS.md`, a memory note, or a lexicon entry
  - about *the factory* (how we build) → flag it for the metabolism (the quality organ)
  - nothing real surfaced → write `none`. Do not manufacture a lesson.
- **PROPAGATED** — reconcile every surface the change touched. For each of docs/changelog/comments · STATE/queue · source `STG→PROMOTED` · lexicon, mark one of:
  - `[x]` done · `n/a` · `OWED→queued as <task>`
  - Deferred propagation is **debt**: it becomes a real `discovery`/`active` task. Debt is allowed — it does **not** block the Land — but it is never silent.
- **TAX** — append one line to `.madewell/work/tax.jsonl` (schema: `.madewell/guides/schemas/tax.schema.json`):

  ```json
  {"ts":"<ISO>","unit":"<id-or-slug>","kind":"feat|fix|refactor|docs|...","proposed":<n>,"accepted":<n>,"tax":<proposed−accepted>,"note":"<optional>"}
  ```

  TAX is the **only** number the metabolism reads — keep it a pure scalar; never fold
  warning events into it. *(File-only core: measure it coarsely from the correction diff
  between first pass and landed. Exact, low-noise capture arrives with the agent harness —
  this is Rumen's logged risk R3.)*

  **Units:** pick one consistent unit per project (corrected lines, checks, or items) and
  stick to it — the metabolism does arithmetic across Lands, so mixed units poison it.
  When you can only measure the correction diff directly (no meaningful first-pass count),
  record `proposed:<tax>, accepted:0` — the scalar stays honest; the note says how it was
  measured.

## Step 3 — Write the Land record (commit)

Commit the unit with all four faces in the message:

```
<type>(<scope>): <summary>            ← DELTA

PHASE: <Imagine|Plan|Make|Verify>
DONE:  <what shipped this unit>
TODO:  <the open thread / next in the queue>
BLOCKED: <or omit>

LEARNED: <one thing> → <work|factory|none>
PROPAGATED: docs:<x|n/a|OWED> state:<x> queue:<x> lexicon:<x|n/a>
TAX: <proposed−accepted>  (→ work/tax.jsonl)
```

## Step 4 — Check the walls (the gauge)

Run the file-decidable Land walls:

```bash
sh .madewell/bin/land-check.sh
```

Each wall that fires is a **check-engine light, never a shutdown**. It tells
you the outlet didn't fully open: record incomplete · STATE didn't advance · docs didn't
move when code did · no TAX recorded · a discovery source left un-PROMOTED. Either open it,
or make the gap an explicit `n/a`/`OWED`. The walls **warn** here; wiring them to *block*
(a pre-commit hook) is the quality organ's job (Rumen) — the pro upgrade behind the same
file-decidable contract.

---

## The law

**Even a one-line fix Lands** — Ship plus a terse Reflect (`LEARNED: none`, `TAX: ~0`) —
or it leaks. Skipping Land is how the queue floods and the weakest part cracks under the
backlog. The discipline you hold is: nothing finished is ever left un-Landed.
