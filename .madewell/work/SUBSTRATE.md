# Work Substrate

**What:** Append-only execution layer beneath Madewell's conversational memory.

Madewell's STATE.json, DECISIONS.md, and PRODUCT.md remain the source of truth for *context*. This substrate is the source of truth for *execution* — what was assigned, what completed, what's in flight.

---

## Architecture

```
.madewell/work/
├── SUBSTRATE.md             # This file
├── status.jsonl             # Append-only event log (execution truth)
├── packages/                # Self-contained work briefs
│   └── NN-slug.md
└── reports/                 # Human-readable summaries (optional)
    └── YYYY-MM-DD.md
```

---

## The Event Log (status.jsonl)

Append-only. Each line is one event. Never modify historical events.

### Event Types

```jsonl
{"ts":"ISO8601","type":"session_start","session":"s-YYYY-MM-DD-NNN","mode":"single|orchestrated"}
{"ts":"ISO8601","type":"task_started","session":"...","task":"t001","scope":"...","description":"..."}
{"ts":"ISO8601","type":"task_completed","session":"...","task":"t001","summary":"..."}
{"ts":"ISO8601","type":"task_blocked","session":"...","task":"t001","reason":"..."}
{"ts":"ISO8601","type":"package_assigned","session":"...","package":"feat/branch","agent":"worker-id","chunks":"1.1-1.8"}
{"ts":"ISO8601","type":"package_completed","session":"...","package":"feat/branch","agent":"worker-id","summary":"...","files":[...],"tests":[...]}
{"ts":"ISO8601","type":"session_end","session":"...","summary":"...","open_thread":"..."}
```

### Session Modes

**single** — One agent, conversational. Tasks map to STATE.json `active`.

**orchestrated** — Multi-agent, parallel. Packages in `work/packages/`, delegated to sub-agents.

---

## Reading State

To reconstruct current execution state:

1. Read `status.jsonl`
2. Build maps: `task → latest event`, `package → latest event`
3. Derive:
   - `task_completed` → done
   - `task_blocked` → blocked
   - `task_started` with no completion → in-flight or orphaned
   - `package_completed` → done
   - `package_assigned` with no completion → in-flight

If STATE.json says a task is `active` but `status.jsonl` has a `task_completed` event for it, **the event log wins**. STATE.json is a cache; events are truth.

---

## Session Protocol

### Session Start (Augmented)

After reading Madewell's memory stack (STATE.json, DECISIONS.md, PRODUCT.md, git log):

```bash
tail -50 .madewell/work/status.jsonl 2>/dev/null
```

Reconstruct execution state. Reconcile with STATE.json:
- If event log shows completion that STATE.json missed → task is done
- If STATE.json shows active that event log never started → task was never begun

### Session End (Augmented)

Before committing:

1. Log `task_completed` events for every task finished this session
2. Log `session_end` event with summary and open_thread
3. Then update STATE.json as normal

The event log is written first. STATE.json updates second. If the session crashes between, the event log survives.

---

## Single-Agent Sessions

For normal sessions (one agent, conversational):

**Start:**
```jsonl
{"ts":"2026-05-30T10:00:00Z","type":"session_start","session":"s-2026-05-30-001","mode":"single"}
```

**Work:**
```jsonl
{"ts":"2026-05-30T10:05:00Z","type":"task_started","session":"s-2026-05-30-001","task":"t001","scope":"auth","description":"Wire login form to endpoint"}
{"ts":"2026-05-30T11:30:00Z","type":"task_completed","session":"s-2026-05-30-001","task":"t001","summary":"Login form wired, redirect working, tests passing"}
```

**End:**
```jsonl
{"ts":"2026-05-30T12:00:00Z","type":"session_end","session":"s-2026-05-30-001","summary":"Completed login form wiring","open_thread":"Add remember-me checkbox, wire to session persistence"}
```

---

## Orchestrated Sessions

For parallel work (orchestrator + sub-agents):

**Initialize:**
```jsonl
{"ts":"...","type":"session_start","session":"s-2026-05-30-002","mode":"orchestrated"}
{"ts":"...","type":"orchestration_initialized","session":"s-2026-05-30-002","packages":["feat/auth","feat/api","feat/ui"]}
```

**Delegate:**
```jsonl
{"ts":"...","type":"package_assigned","session":"s-2026-05-30-002","package":"feat/auth","agent":"worker-1","chunks":"1.1-1.5"}
{"ts":"...","type":"package_assigned","session":"s-2026-05-30-002","package":"feat/api","agent":"worker-2","chunks":"2.1-2.8"}
```

**Complete:**
```jsonl
{"ts":"...","type":"package_completed","session":"s-2026-05-30-002","package":"feat/auth","agent":"worker-1","summary":"Auth complete","files":["src/auth.ts"],"tests":["auth.test.ts"]}
```

---

## Relationship to Madewell

| Layer | Purpose | Mutability |
|-------|---------|------------|
| PRODUCT.md | Long-term context, user language | Append/edit |
| DECISIONS.md | Decision log | Append-only |
| STATE.json | Live task state, phase, context | Mutable (cache) |
| status.jsonl | Execution audit trail | Append-only (truth) |

**STATE.json is the view. status.jsonl is the source.**

Madewell skills (session-start, session-end) read both. The substrate augments without replacing.

---

## The Guarantee

If a `task_completed` or `package_completed` event exists in `status.jsonl`, that work is done. Period.

No agent should re-attempt work that has a completion event. The event log is the proof.
