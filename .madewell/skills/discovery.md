# Discovery Workflow

**Mode:** Workflow (produces artifacts, updates madewell.json)
**Trigger:** Brain dump, transcript, meeting notes, thinking out loud
**Artifacts:** Items on the `discovery` queue in madewell.json

---

## What This Does

Processes unstructured input (brain dumps, transcripts, meeting notes) into shaped work-items
on the **outer queue**. Discovery is the take-in beat of the outer loop: it fills `discovery`,
which the loop later drains one item at a time through Commit → Build → Land.

This is a **workflow**, not just a lens. It:
1. Ingests raw input
2. Applies five lenses
3. Extracts insights and routes each one
4. Proposes what enters the `discovery` queue, for your approval
5. Routes the rest to a decision or releases it

It never writes straight into `active` — that is the Commit gate's call, made deliberately later.

---

## The Protocol

### Step 1: Classify the Input

| Field | Value |
|-------|-------|
| **Source** | [brain dump / transcript / meeting / client call] |
| **Date** | [when] |
| **Participants** | [who] |

### Step 2: Apply the Five Lenses

**1. Product Lens**
What does this reveal about what we need to build?
- Feature signals
- Priority signals
- Edge cases

**2. User Lens**
What does this reveal about who we're building for?
- Who's involved?
- What are they optimizing for?
- What words do they use?

**3. Technical Lens**
What does this imply about how to build it?
- Data model implications
- Integration requirements
- Constraints

**4. Process Lens**
What does this reveal about how work gets done?
- Current workflows
- Decision-making patterns
- Communication channels

**5. Gap Lens**
What's missing?
- Questions unanswered
- Assumptions unvalidated
- References unexplained

### Step 3: Extract and Route Each Insight

Every insight gets exactly one route:

| Route | Meaning | Where it goes |
|-------|---------|---------------|
| **discovery** | Real, captured work | onto the `discovery` queue |
| **decision** | Needs a call before it can be queued | surfaced now; recorded in `DECISIONS.md` once decided |
| **release** | Not worth keeping | let it go, name it so it isn't silently dropped |

```json
{
  "source": "[which input]",
  "lens": "[which lens found this]",
  "insight": "[one sentence]",
  "route": "discovery | decision | release",
  "evidence": "[what supports this]"
}
```

### Step 4: The One Thing

Answer in one sentence:

> **What is the single most important thing this reveals that isn't written down anywhere else?**

Write it down — in PRODUCT.md, madewell.json, or DECISIONS.md.

### Step 5: Propose the Queue

```
Ready to queue (route: discovery):
  [d-new] "Users expect autosave"            scope: ux
  [d-new] "Must work offline — user travels" scope: technical

Needs a decision before queueing:
  "Pricing model: subscription vs one-time?"

Releasing (not kept):
  "Tangent about a future mobile app"

Approve? (yes / no / modify)
```

On approval, append the `discovery`-routed items to the `discovery` queue with fresh ids
(`d001`, `d002`, …). Decisions get surfaced and, once made, recorded in `DECISIONS.md`.

---

## Output Artifacts

**madewell.json updates:**
- New items appended to the `discovery` queue (`{id, item, scope}`)
- `context.summary` / `context.openThread` refreshed if the session shifted

**Optional transcript archive:**
- `decisions/transcripts/YYYY-MM-DD-slug.md`
- Raw input preserved for reference

---

## Example Run

**Input:** "I keep thinking about how users will save their work. Right now I'm imagining a save button but that feels old. Everyone expects autosave now. Also worried about offline — I travel a lot and hate losing work when wifi drops. Oh and pricing... should this be subscription or one-time? I don't know yet."

**Output:**

```
## Discovery Analysis — 2026-05-10

### Classification
- Source: Brain dump

### Lens Findings
**Product:** Save mechanism is a core UX decision. Autosave vs manual affects architecture.
**User:** You are the primary user. Travel context matters. Offline is a real constraint.
**Technical:** Autosave implies state management, conflict resolution. Offline implies local-first.
**Process:** Pricing decision is blocking — affects scope and timeline.
**Gaps:** No user research yet. Assuming your preferences match others'.

### Routed
  discovery → "Design for offline-first — user travels, can't lose work"   scope: technical
  discovery → "Research autosave patterns"                                 scope: ux
  discovery → "Validate assumptions with target users"                     scope: research
  decision  → "Pricing model undecided: subscription vs one-time"
  release   → (nothing this round)

### The One Thing
You're building for yourself, but haven't validated that others share your constraints.

---
Approve queueing these? (yes / no / modify)
```

On approval:
```json
{
  "discovery": [
    { "id": "d001", "item": "Design for offline-first — user travels, can't lose work", "scope": "technical" },
    { "id": "d002", "item": "Research autosave patterns", "scope": "ux" },
    { "id": "d003", "item": "Validate assumptions with target users", "scope": "research" }
  ]
}
```
The pricing question is surfaced for a decision; once made it becomes a line in `DECISIONS.md`
(and, if it implies work, its own `discovery` item).

---

*Discovery isn't just thinking. It's thinking that flows onto the queue — and into action.*
