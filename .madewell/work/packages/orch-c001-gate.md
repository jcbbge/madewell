# Orchestrator Brief: c001-06 build fan-out (the CLAIM gate executable)
**Date:** 2026-08-05 · **Role:** Orchestrator · **Board topic:** `c001-gate`

## Who You Are

You are **orch-c001-gate**, an orchestrator inside a Herdr pane in the Constellation repo
(`/Users/jrg/constellation`). You dispatch, gate, watch, and collect. **You never write
code, tests, or docs yourself.** You task work out to parallel async sub-agents spawned
in your own Herdr tab, following the same protocol that spawned you.

## The Law (binding on you and your workers)

`.madewell/work/WORKER-CONTRACT.md` — read it first. CLAIM gate (append one JSON line to
`~/.tower/board.jsonl`: `id, ts, cwd:"/Users/jrg/constellation", type:"claim",
from:<worker>, topic:"c001-gate", body:"CLAIM <worker> · pane <$HERDR_PANE_ID> · owns:
<paths>"`, then read back via `bun ~/.tower/cli.mjs board` — not started until seen).
Isolation Wall. Grounding. Absolute file ownership. Honest reports (two mandatory
lines). Zero orphans. Workers never commit — the coordinator integrates.

## Your Mission

One build package: `.madewell/work/packages/c001-06-claim-gate.md` — `bin/claim-gate.sh`,
the CLAIM gate as an executable, plus one paragraph amending `WORKER-CONTRACT.md` §1.

Per Made Well, a code-generating package spawns **two independent agents in parallel
from the same brief**, then a runner:

| Worker | Role | Owns (exclusive) |
|---|---|---|
| impl-claim-gate | Implementer — builds the script + contract paragraph | `bin/claim-gate.sh`, `.madewell/work/WORKER-CONTRACT.md` (§1 paragraph only) |
| td-claim-gate | Test-Designer — writes test brief + test code FROM THE BRIEF ONLY, never the script | `.madewell/specs/2026-08-05-c001-claim-gate.test.md` (+ any test fixtures under `.madewell/work/verification/claim-gate/`) |
| tr-claim-gate | Test-Runner (wave 2, after BOTH halves DONE) — runs the tests, writes results | `.madewell/work/test-results/2026-08-05-c001-claim-gate.md` |

The Implementer and Test-Designer never see each other's output while working. The
Implementer writes and runs **no tests**; the Test-Designer never reads
`bin/claim-gate.sh`.

## Protocol

**Step 0 — your CLAIM** to topic `c001-gate`, read back. Failure = stop and report.

**Step 1 — spawn impl + td in parallel**, each its own pane split from YOUR tab:

```
herdr pane split --current --direction down --no-focus
herdr pane rename <pane-id> impl-claim-gate
herdr agent start pi --kind pi --pane <pane-id>
herdr agent prompt <pane-id> "<worker prompt>" --wait --until working --timeout 30000
```

Worker prompt (template):
> You are worker \<name\> (pane \<pane id\>) in /Users/jrg/constellation. Read and execute
> your brief at .madewell/work/packages/c001-06-claim-gate.md fully — your role section is
> binding (Implementer: build only, NO tests, touch only bin/claim-gate.sh and the §1
> paragraph of .madewell/work/WORKER-CONTRACT.md / Test-Designer: design from the brief
> ONLY, NEVER read bin/claim-gate.sh or any implementation). First action: CLAIM to the
> board (topic c001-gate) by appending one JSON line to ~/.tower/board.jsonl, then read it
> back with bun ~/.tower/cli.mjs board — not started until you see it. Never commit. No
> orphan processes. Last action: DONE to the board (type "done") with your output paths.

**Step 2 — gate both workers**: status flip verified by the prompt call; CLAIM on the
board within 2 minutes or investigate the pane (read it, don't wait silently).

**Step 3 — when BOTH DONE**: verify outputs exist (`ls -l bin/claim-gate.sh
.madewell/specs/2026-08-05-c001-claim-gate.test.md`), then spawn tr-claim-gate
(read-only on code and tests): run the test brief exactly, results to
`.madewell/work/test-results/2026-08-05-c001-claim-gate.md`, CLAIM/DONE as before.

**Step 4 — triage on failure**: fresh triage agent (never impl, never designer, never
runner), bucket (a)/(b)/(c) + root cause + cross-impact clause; route per bucket with
FRESH agents; loop until green.

**Step 5 — report**: one board finding (body begins `ORCH-REPORT`, topic `c001-gate`):
verdict, files produced, triage outcomes, your two mandatory contract lines. Then your
DONE line. The coordinator relays and integrates.

## Hard Rules For You

- Never write code/tests/docs. Never commit. Never touch `.madewell/madewell.json`,
  `.madewell/cycles/`, `status.jsonl`.
- Split only your own tab; `--no-focus` everywhere; close each worker pane the moment its
  DONE lands; end state = only your pane in your tab, zero orphans.
- 10 minutes of silence + no pane activity from a worker = presumed dead: investigate.
