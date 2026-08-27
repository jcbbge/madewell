# Discovery Workflow

**Mode:** Workflow — runs **ideate** on raw input. Hosts the Lens Slot.
**Trigger:** Brain dump, transcript, meeting notes, AI-chat log, thinking out loud, first session
**Artifacts:** Pieces on the rack (`P/stock/`); decisions surfaced; The One Thing written down

---

## What This Does

Discovery is the **intake instrument** — it runs **ideate** on raw input and fills
**`P/stock/`** (the rack at current depth). It turns raw input (a brain dump, a transcript, a
meeting, an AI-chat) into shaped **pieces on the rack**.

It **never** takes a piece to the bench. Saying "no" / "not now" /
taking a piece to the bench (`bench.md`) is a separate act, made deliberately later — **ideate
only; never takes a piece to the bench**. A pipeline that classifies, lenses, and writes to
`P/stock/` is discovery — not plan, not implement.

This engine is domain-agnostic. It carries a **universal lens core**; a loaded trade
may extend the lens set for its lane of work (see *The Lens Slot* below).

**Fractal depth:** `P` is `.madewell` or any `bench/<slug>/` at the current depth. Discovery
at inner depth writes that depth's `stock/` — same protocol, nested rack. **Maturity** (aka
Phase in the legacy pipeline) tags the run; do not rename the field.

**Corpus boundary:** Never copy transcript bodies into the dist. Never write `STAGING.md` or
`STG-*` ids. Substance stays in the read-only corpus; the dist tracks **position** only.

---

## The Protocol

### Step 0: Look before you add (don't re-rack duplicates)

At current depth `P`:

- `ls P/stock/` — what is already on the rack. Grep it per candidate at write
  time rather than trying to hold it all in memory.
- `DECISIONS.md` — so a finding isn't re-raised as new when it was already decided.
- `PRODUCT.md` — the vision as understood so far; mis-fits get caught against it.
- A paired artifact, if this run reads a new document against an existing one
  (see *Cross-Artifact Synthesis*).

### Step 1: Classify the Input (fill before analyzing)

| Field | Value |
|-------|-------|
| **Source** | brain dump / transcript / meeting / AI-chat / planning note / document |
| **Date** | when it happened (not when you're reading it) |
| **Participants** | who's in it — plus off-stage actors *named* in it |
| **Maturity** | see below — the load-bearing field |
| **Signal density** | HIGH / MED / LOW |

**Maturity is the load-bearing classification.** It sets the evaluative lens — how mature
was the *thinking* captured in this artifact:

| Maturity | Success looks like |
|---|---|
| **SUBSTRATE** (pre-ideation, clay-blocking) | volume + looseness; acceptance is correct |
| **IDEATION** | direction + tradeoffs visible; commitment not yet |
| **PLANNING** | structure + commitment — what locked, what depends on what |
| **EXECUTION** | fidelity to plan + where reality diverged |
| **VERIFICATION** | claim → evidence |

*The category error to avoid:* reading a SUBSTRATE artifact with PLANNING rigor produces
false negatives — a loose brainstorm judged as a bad plan. A grand vision is SUBSTRATE,
not PLANNING: hold its choices as open clay, don't validate them as settled.

**Mixed-maturity artifacts** (work trackers, status docs, multi-part transcripts) get
**per-section Maturity**, not one value for the whole artifact — a tracker's DONE section
is an EXECUTION record, its ACTIVE section PLANNING, its wishlist IDEATION. Classify each
section and judge it by its own maturity; never read a wishlist with PLANNING rigor just
because it shares a file with a plan.

### Step 1.5: Choose Pass Mode

- **Single-pass** (default) — apply the lenses yourself, one analysis. LOW–MED density,
  short, single-topic.
- **Deep-comb (two-pass)** — decompose into 5–8 topic slices → fan out isolated parallel
  readers, each scoped to its slice only → synthesize cross-cuts. Use when the artifact is
  long AND HIGH density AND spans 5+ distinct topics. Confirm the topic map with the
  person before fanning out (mechanics: `orchestrate.md`).
- **Cross-artifact synthesis** — when paired with a prior artifact, run the procedure
  below in place of a lens-only pass.

### Step 2: Apply the Lenses (all of them; never force findings)

**The universal core — six lenses, any lane of work:**

**1. Substance** — what must the work BE or DO?
- What-to-make signals, priority signals, edge cases
- For HIGH-density input: a Friction Inventory (# / friction / who feels it / root cause)

**2. People** — who is this for, and who's involved?
- What each person is optimizing for
- Their real vocabulary — capture their words into `context.language`

**3. Process** — how does work *actually* get done here?
- Shadow workflows (the real process vs. the official one)
- How decisions really get made; communication channels

**4. Gap** — what's missing?
- Questions unanswered, assumptions unvalidated, references unexplained

**5. ★ Subtext** (load-bearing — different rubric per artifact type)
- *Human conversations/meetings:* naming flinches · deflections (highest charge) · stances
  revealed by what someone accepts without protest · mid-thought revisions (the
  unreconciled spot is where the real decision lives) · constraints accepted in silence
- *AI-chats:* what the human stopped asking about · vocabulary the AI introduced and the
  human adopted untested · the human's own mid-conversation reconceptualizations · their
  idea vs. the AI's rephrasing of it · pushback (rare — worth flagging; acceptance is the
  default mode)

  **Weight AI-chat subtext by Maturity.** In a SUBSTRATE/IDEATION brainstorm, non-pushback
  is the *intended* mode — the human is farming ideas, not making commitments. There,
  adopted-untested vocabulary is a **translation task to rack, named once** (one stock line)
  — never a repeated observation about the human's conduct. Silent adoption is high-charge
  only at PLANNING+, where acceptance reads as commitment. State findings about the
  artifact, not verdicts about the person.

**6. Meta** — what does this artifact reveal about the discovery process itself?
- What should update this skill, the rack, or how intake is run

#### The Lens Slot

A loaded trade may **extend** this set with lenses for its lane of work (e.g. a
software trade adds Technical / Integration lenses; a sales trade adds deal-stage
and objection lenses). Trade lenses live in the trade
(`<trade>/discovery-lenses.md`) and run *after* the core. With no trade loaded,
the universal core is complete on its own.

### Step 2.5: The One Thing (required)

> **What is the single most important thing this reveals that isn't written down anywhere?**

No hedging. This is the finding that would be lost if someone only read the summary.
Write it down — in PRODUCT.md, on the rack, or DECISIONS.md.

### Step 2.6: Compression Analysis (PRD-shaped artifacts only)

If the artifact contains a PRD or other compression document, run this additional
sub-rubric (domain-agnostic):

- **What survived** the conversation → PRD compression?
- **What got dropped** that was discussed earlier?
- **What got added** in the PRD that wasn't discussed?
- **Quantification check:** flag every metric (`<200ms`, `>40% conversion`, `1000+ items`,
  `depth=3`, etc.). For each, is an instrument named? Was a baseline measured? If not —
  flag as ungrounded.
- **"Complete blueprint" claim test:** if the PRD claims comprehensiveness, list the
  structural gaps. (Persistence layer? Versioning? Migration plan? Failure modes? Auth
  model? Override propagation? Observability? Asset pipeline if visual?)

Output feeds Step 3 routing; no separate store.

### Step 3: Route Every Finding

Every meaningful finding appears once, with exactly one disposition:

| Disposition | Meaning | Where it goes |
|-------------|---------|---------------|
| **rack** | Real, captured work | `P/stock/<slug>.md` |
| **decision** | Needs a call before it can be racked | one line in `DECISIONS.md` (or open thread in `PRODUCT.md`) |
| **release** | Not worth keeping | let it go — *named*, never silently dropped |

```
ID | Lens | Finding (one sentence) | Disposition | Evidence
```

**Pointer pattern (transcript sources):** When substance lives in the read-only corpus, the
stock piece is a title plus path — never both. For transcripts under
`~/infinity/discovery/transcripts/`:

```markdown
# Retry policy for the upload queue
**Source:** ~/infinity/discovery/transcripts/2026-03-outage-review.md
**Making:** … **Not making:** … **Done when:** … **Waits on:** …
```

The dist tracks position; the corpus holds content.

**Adoption — in-flight work is its own case.** When discovery runs on a project with work
already half-built (adopting Made Well mid-stream, migrating an existing tracker), work
found mid-execution is neither an idea nor releasable: route to **`P/stock/` flagged
`in-flight`**. The flag means: this already holds work-in-progress and gets verdicted
*first* before racking more — bound what is mid-stream before adding new pieces. It
must still pass the gate; being half-built is a claim on attention, not a bypass.

### Step 4: Name Things and Track Open Questions

#### Name Things

Name every pattern, gap, and shadow workflow — short, precise, memorable. Named things
can be designed against; unnamed things stay invisible.

#### Cross-Artifact Open Questions

Maintain an open-questions tracker in `DECISIONS.md` or `PRODUCT.md`. Add new ones this
artifact raises; close ones it answers:

```
- [ ] [Question] — first seen in [source slug or path]
- [x] [Question] — answered in [source]: [brief answer]
```

Do not cache `NEEDS DECISION` on the rack without a reader — open threads live where
decisions and product vision are read.

### Step 5: Reflect and rack

Reflect back in plain language — "here's what I heard" — then propose:

```
Ready to rack:
  [d-new] "…"   scope: …
Needs a decision first:
  "…"
Releasing (not kept):
  "…"
```

Ask: **"Does that match what you meant?"** On confirmation:
- Write findings to `P/stock/<slug>.md`
- Record made decisions in `DECISIONS.md`; carry unmade ones as open threads
- Update `PRODUCT.md` with anything new about the person or their vision
- Refresh `context.summary` / `context.openThread` / `context.language`

Findings never skip to the bench — taking a piece in hand is a separate act (**plan**), made
later.

**Preserve the source — the intake record.** Rack lines are deliberately lossy. When the
artifact carries nuance the one-liners can't hold (a rich transcript, a table, a sketched
user journey), cite the corpus path on the stock piece — ideate reads the intake record
when the piece goes to the bench, so nothing sharp is flattened into a headline and lost.
Never copy the body into the dist.

---

## Cross-Artifact Synthesis (procedure)

A new artifact read against an existing one — a proposal vs. meeting notes, a vendor doc
vs. your current direction. Don't just list findings; produce a three-part discrepancy map:

1. **ALIGNMENTS** — what already agrees. State them, mark *do not reopen*, so settled
   ground isn't relitigated.
2. **DISCREPANCY MAP** — each divergence as: what the new artifact ASSUMES · what the
   prior artifact / known state SHOWS · why it matters · the decision needed. Order by
   leverage — this list *is* the agenda.
3. **THE THROUGH-LINE** — the single root most discrepancies collapse to. Name it.

When comparing paired artifacts, optionally classify each cross-cut:

- **Independent convergence** — both arrive at the same finding from different paths
- **Direct divergence** — artifacts contradict on a load-bearing decision
- **Vocabulary mismatch** — same concept, different terms
- **Composition (not competition)** — each models part of the same lifecycle
- **Shared gap** — both fail to surface the same thing
- **Compression bias** — one preserved what the other dropped
- **Domain-grounded vs generic** — one operationally grounded, one corpus-grounded

Only cross-cuts become stock at synthesis; per-slice findings stay beside their slice until
racked individually.

*Pre-requisite (Step 0):* load the current design/direction docs, or you'll judge the
incoming artifact only against memory and miss its mis-assignments.

---

## Live Conversation Mode

When the input is the person talking to you right now (not a document):

1. "Tell me everything — don't organize it, just go."
2. Listen. Don't interrupt.
3. Apply the lenses internally; classify Maturity as you listen.
4. Then run Steps 2.5–5 as above, out loud.

Mid-session capture: when something comes up that isn't the current work, **capture on the
rack immediately** (`P/stock/<slug>.md`), say "captured," and return to what you were doing.

---

*Discovery isn't just thinking. It's thinking that flows onto the rack — surface
everything here, so the bench move has something real to take. Nothing is rejected on the
rack; Promote is **plan**, not ideate.*
