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

### Step 0: Declare the run

Write this before reading the artifact. A run that does not declare its mode cannot be
interpreted later, and its findings are **not admissible to the rack**.

```
Mode:     live | blind
Ground:   on | skipped (blind)
Rack:     loaded | not loaded (+ why)
```

- **`live`** — the normal case. Ground runs (`ground/PROTOCOL.md`), the rack is loaded.
- **`blind`** — evaluation only. Ground is **skipped and recorded as skipped**, and the rack,
  prior analyses of this artifact, and the built material are all withheld.

Grounding and evaluating are in direct opposition: Ground reads what already exists, and for a
retrospective evaluation what already exists *is* the answer key. Declare the mode; never infer it.

### Step 0.5: Look before you add (don't re-rack duplicates)

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
| **FIELD** — *a recording of the customer's own work, with none of our process in it* | there is no success criterion, because this is not our process. Read the domain **as practised**, not our plan for it |

**FIELD is the maturity people forget, and it inverts the Subtext rubric.** In a recording of
someone else's work, a deflection is a **tooling gap**, not a stance — they are not dodging you,
the information does not exist where they are standing. Same observation, opposite meaning.

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
  HIGH density AND spans 5+ distinct topics. Confirm the topic map with the
  person before fanning out (mechanics: `orchestrate.md`).

  **Count topics, never lines.** Line count measures how verbosely something was transcribed,
  not how much is in it — a 1,100-line dump of one subject is single-pass; a 300-line meeting
  that moved through seven decisions is deep-comb. A block is a span the participants themselves
  treat as one subject. And breadth is not enough on its own: if the blocks are serial sections
  of one walkthrough and every high-value finding is a cross-cut, slicing destroys the result —
  override the trigger and say why.

  **Slicing needs a stable address space.** Transcription often arrives as one unbroken line, and
  a slice cannot be assigned a line range that does not exist. Fold the source into numbered
  segments, **commit that folded copy beside the original**, and cite segments. A citation into a
  scratch file is a citation into nothing.
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

- *Solo artifacts — a voice note, a journal, thinking out loud with no audience:* neither rubric
  above fits. There is no second party to deflect and no assistant whose vocabulary could be
  inherited. The physics are **revision over time, not interaction**: the speaker contradicts
  themselves across minutes, circles a word until it sharpens, and abandons a line mid-sentence.
  Read for what they keep returning to, what they talk themselves out of, and the vocabulary that
  changes between the start and the end. Acceptance and pushback do not exist here; **self-
  correction is the whole signal.**

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
ID | Lens | Finding (one sentence) | Disposition | Evidence | Attribution
```

**Attribution is a field, not a footnote.** Where the source carries no speaker labels — most raw
transcription — *every* assignment is inferred. Mark each finding `stated` or `inferred`, and where
the reading changes the finding, say so. An inferred attribution presented as fact is a citation
that cannot be checked.

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

Ask: **"Does that match what you meant?"**

**Their answer is a second artifact, and usually the denser one.** What comes back is not feedback
on your reading — it is primary material, in the vocabulary of the person who owns the domain. By
default it arrives in conversation and dies there. So:

- **Draft first, ask second.** A finding they have not seen is not eligible for the rack. The
  ordering is the mechanism, not a courtesy.
- **Capture rulings verbatim, with a timestamp.** Paraphrase destroys the thing that made them
  valuable — their words *are* the domain's vocabulary (`context.language`).
- **Cite the ruling inline** in the finding it changed, naming them and the time.
- **Record confirmations too.** An unrecorded confirmation is a rumour.
- **A ruling that contradicts a finding wins, and the original stays struck through, not deleted.**
  The wrong first reading is how the next person learns the domain — and the only way to tell later
  whether the intake is getting better.
- If they are unavailable, rack the finding and carry the open question. Never rack past silence
  as though it were agreement.

On confirmation:
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

*Pre-requisite (Step 0.5):* load the current design/direction docs, or you'll judge the
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

---

## Why these rules exist

Each one is a fossilised correction, not a preference. Kept short on purpose — the evidence is the
argument, and without it the rules read as ceremony and get skipped.

- **Ground, all three sources.** For five months there was no Ground step. One careful reader
  invented it, recorded it in a status line, and never made it a step — so six weeks later nobody
  ran it, and a single pass came within one review of racking **six already-shipped designs**.
  Later, with the step in place, two independent readings of one artifact *both* built a headline
  on an enum whose values live in an external CRM. Both were grounded — against the wrong source.
  Hence `ground/PROTOCOL.md`: name the owner before you read the mirror.
- **The operator pass, written down.** One session's five most valuable items existed only in a
  chat log and survived because somebody hand-transcribed a dead session.
- **Position is path, and no second list.** A pool file accumulated twelve status values against
  three documented ones, because the field was free text and nothing read it.
- **Meta findings edit this file.** Findings about the intake were once written into a log, where
  nothing read them, and sat until someone audited the process by hand. A log is not an address.
- **Count topics, not lines.** The old trigger keyed on line count, which measures transcription
  verbosity and nothing else.
- **Subtext earns its place.** A six-lens version of this workflow produced **zero** subtext
  findings on an artifact where the seven-lens version produced **fourteen** — a quarter of its
  output, in a category the earlier one could not represent at all.
- **Name the mode.** Grounding reads what exists; evaluating must not. Without a declared mode,
  no past run can be interpreted and the intake cannot be measured at all.
