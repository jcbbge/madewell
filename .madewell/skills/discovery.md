# Discovery Workflow

**Mode:** Workflow — runs **ideate** on raw input. Hosts the Lens Slot.
**Trigger:** Brain dump, transcript, meeting notes, AI-chat log, thinking out loud, first session
**Artifacts:** Pieces on the rack (`.madewell/stock/`); decisions surfaced; The One Thing written down

---

## What This Does

Discovery is the **intake instrument** of the outer loop — the take-in beat that fills the
`discovery` **pool**. It turns raw input (a brain dump, a transcript, a meeting, an AI-chat)
into shaped, queueable **candidates**.

It **never** takes a piece to the bench. Saying "no" / "not now" /
taking a piece to the bench (`bench.md`) is a separate act, made deliberately later. A pipeline that
classifies, lenses, and routes into staging is **Discovery only** — not Commit, not Build.

This engine is domain-agnostic. It carries a **universal lens core**; a loaded trade
may extend the lens set for its lane of work (see *The Lens Slot* below).

---

## The Protocol

### Step 0: Look before you add (don't re-rack duplicates)

- `ls .madewell/stock/` — what is already on the rack. Grep it per candidate at write
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
  adopted-untested vocabulary is a **translation task to queue, named once** — never a
  repeated observation about the human's conduct. Silent adoption is high-charge only at
  PLANNING+, where acceptance reads as commitment. State findings about the artifact, not
  verdicts about the person.

**6. Meta** — what does this artifact reveal about the discovery process itself?
- What should update this skill, the queue, or how intake is run

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

### Step 3: Route Every Finding

Every meaningful finding appears once, with exactly one route:

| Route | Meaning | Where it goes |
|-------|---------|---------------|
| **discovery** | Real, captured work | onto the `discovery` queue |
| **decision** | Needs a call before it can be queued | surfaced now; one line in `DECISIONS.md` once decided |
| **release** | Not worth keeping | let it go — *named*, never silently dropped |

```
ID | Lens | Finding (one sentence) | Route | Evidence
```

**Adoption — in-flight work is its own case.** When discovery runs on a project with work
already half-built (adopting Made Well mid-stream, migrating an existing tracker), work
found mid-execution is neither an idea nor releasable: route it to `discovery` **flagged
`in-flight`**. The flag means: this already holds work-in-progress and gets verdicted
*first* at the Commit gate — bound what's mid-stream before queueing anything new. It
must still pass the gate; being half-built is a claim on attention, not a bypass.

### Step 4: Name Things

Name every pattern, gap, and shadow workflow — short, precise, memorable. Named things
can be designed against; unnamed things stay invisible.

### Step 5: Propose the Queue (approval gate)

Reflect back in plain language — "here's what I heard" — then propose:

```
Ready to queue (route: discovery):
  [d-new] "…"   scope: …
Needs a decision before queueing:
  "…"
Releasing (not kept):
  "…"
```

Ask: **"Does that match what you meant?"** On confirmation:
- Append `discovery`-routed items to the queue (`{id, item, scope, dependsOn?}`, fresh ids)
- Record made decisions in `DECISIONS.md`; carry unmade ones as open threads
- Update `PRODUCT.md` with anything new about the person or their vision
- Refresh `context.summary` / `context.openThread` / `context.language`

Findings never skip to `active` — promotion is the Commit gate's call.

**Preserve the source — the intake record.** Queue lines are deliberately lossy. When the
artifact carries nuance the one-liners can't hold (a rich transcript, a table, a sketched
user journey), keep it beside the piece it produced and have the rack
pieces cite it — ideate reads the intake record when the piece goes to the bench, so nothing
sharp is flattened into a headline and lost.

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

*Pre-requisite (Step 0):* load the current design/direction docs, or you'll judge the
incoming artifact only against memory and miss its mis-assignments.

---

## Live Conversation Mode

When the input is the person talking to you right now (not a document):

1. "Tell me everything — don't organize it, just go."
2. Listen. Don't interrupt.
3. Apply the lenses internally; classify Maturity as you listen.
4. Then run Steps 2.5–5 as above, out loud.

Mid-session capture: when something comes up that isn't the current work, add it to
`discovery` immediately, say "captured," and return to what you were doing.

---

*Discovery isn't just thinking. It's thinking that flows onto the queue — surface
everything here, so Commit has something real to say no to.*
