# Orchestrate

**Parallel execution mode. Delegate work to sub-agents.**

> **Scope:** this skill is **one cell** of the orchestration map (`LIFECYCLE.md` →
> "Orchestration — the recursive coordination layer"): the **Make phase** of the inner loop —
> fanning planned work out to parallel implementers + the 5-role verification jump pack. It is
> the one built cell; outer-loop/fleet orchestration, the other inner phases, and the recursion
> contract are still WIP. The spawn mechanism below is Made Well's **baseline default**; a host
> harness may substitute its own, preserving the invariants (isolation, cooperative pause).

---

## Provider-Agnostic Parallel Execution

This skill uses **parallelized asynchronous sub-agents** running in the background. The orchestrating agent delegates work packages; sub-agents execute independently and report results back.

Different runtimes expose this capability differently:
- Claude Code: "dynamic workflows", "ultracode", "create a workflow"
- OpenAI: "parallel function calls", "async tool use"
- Custom harnesses: "subagent", "spawn", "fan-out"
- General: "background workers", "parallel tasks", "concurrent agents"

**The pattern is universal:** Fan out work → run in parallel → collect results → synthesize.

**Universal keywords** (any runtime should recognize):
- "parallel", "concurrent", "async"
- "sub-agent", "worker", "background"
- "fan out", "spawn", "delegate"
- "independent execution"
- "report back when complete"

---

## When to Use

When work can be parallelized:
- Multiple independent features
- Batch refactoring across modules
- Codebase-wide audits, migrations, or searches
- Any scope where sub-agents can work in isolation

---

## Step 1 — Carve packages from backlog

Each package is a unit of work that:
- Can be completed independently
- Has a clear scope
- Has defined acceptance criteria
- Can be picked up by any agent without context

Create briefs in `.madewell/work/packages/`:
```
.madewell/work/packages/01-auth-flow.md
.madewell/work/packages/02-api-routes.md
```

---

## Step 2 — Log orchestration initialization

```jsonl
{"ts":"...","type":"orchestration_initialized","session":"...","packages":["feat/auth","feat/api"]}
```

---

## Step 3 — Delegate to sub-agents (parallel: Implementer + Test-Designer)

For each code-generating package, **spawn TWO independent sub-agents in parallel
from the same brief**. They never see each other's output while working.

For non-code packages (discovery, planning, documentation, brainstorming,
decisions), spawn only the Implementer and skip directly to Step 5. The brief
must declare `Testing: Applies: no` with a reason.

**Implementation sub-agent:**

```
SPAWN PARALLEL SUB-AGENT — IMPLEMENTATION

Task: [package-name]
Role: Implementer
Brief: .madewell/work/packages/[NN-package-name.md]
Mode: Independent execution, async, report on completion

Instructions:
1. Read the brief completely before starting
2. Build what the brief specifies
3. DO NOT write or run tests for your own work — a separate agent owns that
4. Do not modify files outside scope

ON COMPLETION, REPORT:
- What was done
- Files changed
- Blockers or notes
```

**Test-Design sub-agent** (spawned at the same time, from the same brief):

```
SPAWN PARALLEL SUB-AGENT — TEST DESIGN

Task: [package-name]
Role: Test Designer
Brief: .madewell/work/packages/[NN-package-name.md]
Mode: Independent execution, async, report on completion

Instructions:
1. Read ONLY the brief — do not look at any implementation
2. Write the test suite against the brief's Finishing Point and
   How We'll Know It's Done sections — these are the contract
3. Output test specifications and test code to:
   .madewell/specs/YYYY-MM-DD-[package-name].test.md
4. DO NOT run the tests you write — a separate agent owns that

ON COMPLETION, REPORT:
- Test brief path
- What is covered
- Any contract ambiguities found in the brief
```

Log the assignments:
```jsonl
{"ts":"...","type":"impl_assigned","package":"...","agent":"impl-1"}
{"ts":"...","type":"test_design_assigned","package":"...","agent":"td-1"}
```

---

## Step 4 — Run tests (Test-Runner sub-agent)

After **both** Implementer and Test-Designer report complete, spawn a third
independent agent to run the tests.

```
SPAWN SUB-AGENT — TEST RUNNER

Task: [package-name]
Role: Test Runner
Brief: .madewell/work/packages/[NN-package-name.md]
Test brief: .madewell/specs/YYYY-MM-DD-[package-name].test.md
Mode: READ-ONLY on code and tests

Instructions:
1. Read the implementation and the test brief
2. Run the test suite as specified
3. Write a results file to:
   .madewell/work/test-results/YYYY-MM-DD-[package-name].md
4. May write diagnostic logs alongside the results file
5. NEVER edit code. NEVER edit tests. NEVER write implementation files.

ON COMPLETION, REPORT:
- Pass/fail counts
- Results file path
- Failure details if any
```

Log:
```jsonl
{"ts":"...","type":"test_run_assigned","package":"...","agent":"tr-1"}
{"ts":"...","type":"test_results","package":"...","passed":N,"failed":N,"results":"..."}
```

---

## Step 5 — Triage on failure (Failure-Triage sub-agent)

If any test fails, **do not route the failure back to the original Implementer
or Test-Designer.** Spawn an independent triage agent.

```
SPAWN SUB-AGENT — FAILURE TRIAGE

Task: [package-name]
Role: Failure Triage
Brief: .madewell/work/packages/[NN-package-name.md]
Test brief: .madewell/specs/YYYY-MM-DD-[package-name].test.md
Results: .madewell/work/test-results/YYYY-MM-DD-[package-name].md
Mode: READ-ONLY, independent verdict

Instructions:
1. Read the brief, the implementation, the test brief, and the results
2. Determine which bucket the failure falls into:
   (a) Pre-existing bug in the codebase the new work surfaced
   (b) Implementation does not satisfy the brief
   (c) Test does not correctly express the brief
3. Report the bucket and a one-paragraph root-cause explanation

DO NOT fix anything. Verdict only.
```

Log:
```jsonl
{"ts":"...","type":"triage_assigned","package":"...","agent":"tri-1"}
{"ts":"...","type":"triage_verdict","package":"...","bucket":"a|b|c","summary":"..."}
```

The **orchestrator** then routes the fix based on the verdict:
- (a) → new brief for the underlying bug; current brief blocked until resolved
- (b) → spawn a **fresh** Implementer with the failure report; do not reuse the original
- (c) → spawn a **fresh** Test-Designer to rewrite the test; do not reuse the original

Loop back to Step 3 (or Step 4 if only the test needed fixing) until tests pass.

---

## Step 6 — Collect reports and close

When tests pass and all packages complete:

```jsonl
{"ts":"...","type":"package_completed","package":"...","summary":"...","files":[...]}
{"ts":"...","type":"orchestration_completed","session":"...","summary":"All N packages complete"}
```

---

## Constraints

1. **Orchestrator does not write code, write tests, run tests, or judge failures** — delegate everything
2. **Implementer never writes or runs its own tests** — separation of duties is structural
3. **Test-Designer writes against the brief, not the build** — they never see the implementation while designing
4. **Test-Runner runs only** — never edits code or tests
5. **Failure-Triage is always a fresh agent** — never the original Implementer or Test-Designer
6. **Event log is truth** — every role transition logged
7. **No implicit completion** — done when `test_results` shows zero failures and `package_completed` is logged

---

## Recovery

If a session ends mid-orchestration, next session reads `status.jsonl` and
reconstructs the state of each package using the event sequence. The package
lifecycle is now multi-stage; recovery checks each stage in order.

**Per-package state machine** (events evaluated newest-relevant first):

| Last relevant event(s) | Package state | Recovery action |
|---|---|---|
| `package_completed` | Done | Skip. Truth is logged. |
| `triage_verdict` (no follow-up assignment yet) | Awaiting fix routing | Orchestrator routes per verdict bucket (a/b/c). Re-enter Step 3 or Step 4. |
| `triage_assigned` (no verdict) | Triage in flight | Wait or re-spawn triage with same inputs. |
| `test_results` with `failed > 0` (no triage assigned) | Failure unrouted | Spawn Failure-Triage (Step 5). |
| `test_results` with `failed == 0` | Tests passed | Log `package_completed`. |
| `test_run_assigned` (no results) | Runner in flight | Wait or re-spawn Test-Runner. |
| `impl_completed` AND `test_designed` (no `test_run_assigned`) | Ready to run | Spawn Test-Runner (Step 4). |
| `impl_completed` only | Waiting on test design | Wait or re-spawn Test-Designer. |
| `test_designed` only | Waiting on implementation | Wait or re-spawn Implementer. |
| `impl_assigned` AND `test_design_assigned` (neither completed) | Both in flight | Wait or re-spawn whichever has stalled. |
| `impl_assigned` only | Test design missing | Spawn Test-Designer (Step 3, parallel half). |
| `test_design_assigned` only | Implementation missing | Spawn Implementer (Step 3, parallel half). |
| No package events | Not started | Spawn Implementer + Test-Designer in parallel (Step 3). |

**Rules of recovery:**

1. **Event log wins** over madewell.json on any conflict.
2. **Never re-run completed stages.** A `test_results` event with `failed == 0`
   means the tests passed — do not re-run them.
3. **Re-spawn, don't resume.** If a sub-agent stalled, spawn a fresh one with
   the same inputs. Sub-agents are stateless from Made Well's perspective.
4. **For non-code packages** (`Testing: Applies: no`), the lifecycle collapses
   to: `impl_assigned` → `impl_completed` → `package_completed`. Skip the
   test design, run, and triage stages entirely.

The event log makes recovery deterministic.
