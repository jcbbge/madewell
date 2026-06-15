# Orchestration

**What:** Parallel execution mode for Madewell. Delegate work to sub-agents with persistent state tracking.

**Provider-agnostic.** Works with any AI runtime that supports parallel or async execution.

---

## For Users

When you have a big task — something that touches many files, needs checking from multiple angles, or would take forever one step at a time — say:

> "Fan this out."

What happens:
1. Work gets split into independent pieces
2. Multiple workers tackle the pieces at the same time
3. Results get checked before coming back to you
4. You get one coordinated answer

Other ways to trigger it:
- "Create a workflow"
- "Break this into parallel tasks"
- "Run these independently"

---

## Checks and Balances — The Verify Phase

Every piece of work in Made Well runs four phases: **Imagine → Plan → Make
→ Verify**. The Verify phase asks: *did this produce what we said it
would produce?* Answering honestly requires an independent verifier — anyone
checking their own work will, eventually, mark it passing because they want it
to pass.

The shape of validation depends on the domain. Made Well treats validation as
a **pluggable jump pack**: code work loads the coding jump pack (below);
sales, marketing, ops, manufacturing, or research work would load their own
jump packs with domain-appropriate criteria. The architecture stays the same —
the content of "what to verify" swaps per domain.

### Coding Jump Pack

_Human overview. The operational detail — exact spawn prompts, dispatch order, event
log, and recovery — is the canonical `orchestrate` skill (`.madewell/skills/orchestrate.md`)._

For any piece of code work, four independent agents take part — never one agent
doing more than one job:

| Role | What they do | What they never do |
|------|--------------|--------------------|
| **Orchestrator** | Plans, dispatches, decides | Writes code, writes tests, runs tests |
| **Implementer** | Builds what the brief says | Writes or runs its own tests |
| **Test Designer** | Writes the test suite against the brief, in parallel with the Implementer, from the same brief | Looks at the implementation while designing; runs the tests it writes |
| **Test Runner** | Runs the tests, reports results | Edits code, edits tests, writes any implementation |

When a test fails, a **fifth agent** is spawned — Failure Triage — that has not
touched this work before. It decides whether the failure is a pre-existing bug,
a wrong implementation, or a wrong test. Only then does the orchestrator route
the fix.

**Why this matters:** an agent that writes its own tests will, sooner or later,
adjust the test until it passes. Not out of malice — out of helpfulness. The
only defense is structural separation.

**Scope:** the coding jump pack applies to code-generating work only. Discovery,
planning, brainstorming, documentation, and decision capture skip the code
testing loop (they still pass through the Verify phase — just under a
different or trivial jump pack). The brief declares this explicitly.

**For non-code domains:** when this project (or a future one) needs to validate
work in a different domain, define a new jump pack with the same four-role
shape — Builder, Designer, Runner, Triage — and replace the content of
"verification" with the domain's criteria. The architecture transfers; the
checklist does not.

---

## The Problem This Solves

Without persistent execution state:
1. Work completes but next session doesn't know
2. Agents re-attempt work already done
3. No coordination between parallel workers
4. No audit trail

The work substrate establishes an **append-only event log** that survives session boundaries.

---

## Architecture

```
.madewell/work/
├── SUBSTRATE.md     # Documentation
├── status.jsonl     # Execution truth (append-only)
├── packages/        # Work briefs for parallel tasks
└── reports/         # Summaries (optional)
```

---

## Relationship to Madewell

| Layer | Purpose | Mutability | Authority |
|-------|---------|------------|-----------|
| PRODUCT.md | Context, language | Append/edit | Human context |
| DECISIONS.md | Decision log | Append-only | Decision truth |
| STATE.json | Tasks, phase | Mutable | **Cache** |
| status.jsonl | Execution events | Append-only | **Execution truth** |

**STATE.json is the view. status.jsonl is the source.**

When they conflict, status.jsonl wins.

---

## Event Types

```jsonl
{"ts":"...","type":"session_start","session":"s-YYYY-MM-DD-NNN","mode":"single|orchestrated"}
{"ts":"...","type":"task_completed","session":"...","task":"...","summary":"..."}
{"ts":"...","type":"package_assigned","session":"...","package":"...","agent":"..."}
{"ts":"...","type":"impl_assigned","package":"...","agent":"..."}
{"ts":"...","type":"impl_completed","package":"...","files":[...]}
{"ts":"...","type":"test_design_assigned","package":"...","agent":"..."}
{"ts":"...","type":"test_designed","package":"...","test_brief":"..."}
{"ts":"...","type":"test_run_assigned","package":"...","agent":"..."}
{"ts":"...","type":"test_results","package":"...","passed":N,"failed":N,"results":"..."}
{"ts":"...","type":"triage_assigned","package":"...","agent":"..."}
{"ts":"...","type":"triage_verdict","package":"...","bucket":"a|b|c","summary":"..."}
{"ts":"...","type":"package_completed","session":"...","package":"...","summary":"..."}
{"ts":"...","type":"session_end","session":"...","summary":"...","open_thread":"..."}
```

---

## Session Continuity

**Why this works:**
1. status.jsonl is append-only — history never lost
2. State reconstructed from events — no mutable file to corrupt
3. Packages are self-contained — any agent can pick them up
4. Completion is explicit — logged, not inferred

**Session start recovery:**
1. Read status.jsonl
2. Parse events, reconstruct state
3. Completed? → skip. Blocked? → surface. In-flight? → check status.
4. Reconcile with STATE.json
5. Continue from true state

---

## The Guarantee

If a `task_completed` or `package_completed` event exists in `status.jsonl`, that work is done.

No agent should re-attempt work with a completion event. The event log is proof.

---

## Provider Compatibility

| Provider | Feature | Trigger |
|----------|---------|---------|
| Claude Code | Dynamic workflows | "create a workflow", ultracode |
| Claude API | Parallel tool use | Multiple tool calls |
| OpenAI | Parallel function calling | Concurrent functions |
| Custom | Subagent delegation | "spawn sub-agent", "fan out" |

**Keywords any runtime should recognize:**
- parallel, concurrent, async, background
- sub-agent, worker, delegate, spawn
- fan out, independent execution
- report back, collect results
