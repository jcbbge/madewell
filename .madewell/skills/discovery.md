# Discovery Workflow

**Mode:** Workflow (produces artifacts, updates madewell.json)
**Trigger:** Brain dump, transcript, meeting notes, thinking out loud
**Artifacts:** Staged insights in madewell.json

---

## What This Does

Processes unstructured input (brain dumps, transcripts, meeting notes) into structured insights that flow into your task system.

This is a **workflow**, not just a lens. It:
1. Ingests raw input
2. Applies five lenses
3. Extracts insights with routes
4. Writes to madewell.json `staged` array
5. Proposes promotions for your approval

---

## The Protocol

### Step 1: Classify the Input

| Field | Value |
|-------|-------|
| **Source** | [brain dump / transcript / meeting / client call] |
| **Date** | [when] |
| **Participants** | [who] |
| **Phase** | [Imagine / Plan / Make / Verify] |

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

### Step 3: Extract Insights

For each insight:
```json
{
  "id": "stg-001",
  "source": "[which input]",
  "lens": "[which lens found this]",
  "insight": "[one sentence]",
  "route": "active | backlog | decision | dismiss",
  "evidence": "[what supports this]",
  "status": "staged"
}
```

### Step 4: The One Thing

Answer in one sentence:

> **What is the single most important thing this reveals that isn't written down anywhere else?**

### Step 5: Update madewell.json

Add insights to `staged` array:

```json
"staged": [
  {
    "id": "stg-001",
    "source": "braindump-2026-05-10",
    "insight": "Users expect autosave, not manual save",
    "route": "backlog",
    "status": "staged"
  }
]
```

### Step 6: Propose Promotions

```
Insights ready for promotion:

[STG-001] "Users expect autosave" → backlog
[STG-002] "Must work offline" → active (blocks MVP)
[STG-003] "Consider subscription pricing" → decision needed

Approve? (yes/no/modify)
```

On approval, agent moves items from `staged` to appropriate array and updates `status`.

---

## Output Artifacts

**madewell.json updates:**
- New items in `staged` array
- Items moved to `active`, `backlog`, or `decisions` on approval
- `context.lastSession` updated

**Optional transcript archive:**
- `discovery/transcripts/YYYY-MM-DD-slug.md`
- Raw input preserved for reference

---

## Example Run

**Input:** "I keep thinking about how users will save their work. Right now I'm imagining a save button but that feels old. Everyone expects autosave now. Also worried about offline — I travel a lot and hate losing work when wifi drops. Oh and pricing... should this be subscription or one-time? I don't know yet."

**Output:**

```
## Discovery Analysis — 2026-05-10

### Classification
- Source: Brain dump
- Phase: Imagine

### Lens Findings

**Product:** Save mechanism is a core UX decision. Autosave vs manual affects architecture.
**User:** You are the primary user. Travel context matters. Offline is a real constraint.
**Technical:** Autosave implies state management, conflict resolution. Offline implies local-first.
**Process:** Pricing decision is blocking — affects scope and timeline.
**Gaps:** No user research yet. Assuming your preferences match others'.

### Insights Staged

[STG-001] Product: "Users expect autosave, not manual save" → backlog
[STG-002] Technical: "Must work offline — user travels frequently" → active (constraint)
[STG-003] Business: "Pricing model undecided: subscription vs one-time" → decision
[STG-004] Gap: "No validation that your preferences match target users" → backlog

### The One Thing
You're building for yourself, but haven't validated that others share your constraints.

---

Approve staging these insights? (yes/no/modify)
```

---

## Integration with madewell.json

After approval:
```json
{
  "active": [
    {"id": "t004", "task": "Design for offline-first", "scope": "technical", "status": "pending", "context": "From STG-002: user travels, can't lose work"}
  ],
  "backlog": [
    {"id": "b001", "task": "Research autosave patterns", "scope": "ux", "context": "From STG-001"},
    {"id": "b002", "task": "Validate assumptions with target users", "scope": "research", "context": "From STG-004"}
  ],
  "staged": [
    {"id": "stg-003", "insight": "Pricing model undecided", "route": "decision", "status": "pending_decision"}
  ]
}
```

---

*Discovery isn't just thinking. It's thinking that flows into action.*
