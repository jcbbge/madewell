# Brief: Escalation Hardening — the Water Borrowings
Date: 2026-08-05
Status: ready

## What This Is

Three small, targeted upgrades to the escalation and policy surface, distilled from an
evaluation of `manthanguptaa/water` (Apache-2.0 Python agent harness, evaluated
2026-08-05 at its commit 454a86b): **grounded rulings** (an escalation answer is itself
an assertion and must pass the grounding door), **severity on the escalation condition**
(so a policy can rule on classes of questions, not just individual ones), and an
**autonomy budget** (a policy combinator that consumes itself and then starts asking).
Ideas are borrowed; no water code is vendored.

## Context

Water's `ApprovalGate` (`water/agents/approval.py`) records `decided_by: "auto" |
"human:<name>" | "timeout"` on every ruling, grades every request with an ordered
`RiskLevel` and auto-approves below a policy threshold (`ApprovalPolicy.auto_approve_below`),
and caps autonomous decisions with `max_auto_approvals`. Those three ideas expose one real
design gap and two cheap wins in Constellation:

- **The gap:** the `answer` restart (`src/claim.lisp` is the door for *values*;
  `src/escalate.lisp:100-104` is the door for *decisions*) accepts a **bare value with no
  provenance**. A coordinator's ruling is the one value in the system that bypasses
  grounding. The fix is composition, not new machinery: route the ruling through `ground`,
  sourced by an acquisition (`acquire-operator` already exists for exactly this).
- **Cheap win 1:** `escalation` carries question/actor/default but no weight — every
  question is equally grave. One ordered `severity` slot lets a standing policy
  auto-answer below a threshold and pause only above it (the v5 autonomy gradient,
  expressed in one slot and one comparison).
- **Cheap win 2:** a policy that spends itself — permissive for its first N invocations,
  strict afterwards — is a pure closure. It works unchanged under both
  `with-grounding-policy` and `with-escalation-policy`, because both already accept
  function policies.

House rules that bind this work: all changes land inside the existing files
(`src/escalate.lisp`, `src/claim.lisp` if needed) — **no new module**; every new
behavior emits on the spine; FiveAM aggregation uses `run` + `explain!` +
`results-status`, never `count-if` over `run!`'s return (DECISIONS.md 2026-08-05).

SOURCES: water repo read locally from a clone of github.com/manthanguptaa/water at
454a86b — `water/agents/approval.py:40-48` (ApprovalPolicy), `:111-118` (auto-approve +
budget), `:62` (decided_by); Constellation `src/escalate.lisp:78-114` (escalate + answer
restart), `src/claim.lisp:74-77` (acquire-operator), `:120-157` (ground).

## Starting Point

- `src/escalate.lisp` as committed: `escalation` condition (question/actor/default),
  `escalate` with restarts `answer` / `use-default` / `abandon`, `with-work-unit`,
  `with-escalation-policy`. Test suite green (51/51 checks as of c001, 2026-08-05).
- `src/claim.lisp` as committed: acquisitions, claims, `ground` with restarts
  `acquire` / `mark-unknown` / `refuse`, `with-grounding-policy`.
- `make test` exits 0.

## Finishing Point

- A ruling supplied through the `answer` restart carries an acquisition, or the
  grounding door fires on it. The spine trace of an answered escalation shows the
  provenance chain (`acquire:operator` … `ground:…` … `answered:…`).
- `escalation` has an ordered `severity` slot; `escalate` accepts `:severity`; the
  condition report includes it; policies can branch on it.
- An exported `budgeted-policy` combinator exists and works under both policy macros.
- Full suite green; no new files under `src/`.

## Steps

1. **Severity** (independent; do first — smallest).
   - Add a `severity` slot to the `escalation` condition: one of `:low :medium :high
     :critical`, default `:medium`, exposed as `escalation-severity`.
   - Add `:severity` keyword to `escalate`, passed through to the condition.
   - Include severity in the condition's `:report` output.
   - Export a rank helper (e.g. `severity-rank` returning 0–3, or `severity<=`) so a
     function policy can write `(when (severity<= (escalation-severity c) :medium) …)`.
     Pick one comparison surface and document it; do not add a threshold DSL.

2. **Grounded rulings** (the design gap).
   - Change the `answer` restart lambda list from `(value)` to `(value &optional
     acquisition)`.
   - Restart body: build the ruling's claim by calling `(ground <question> value
     :acquisition acquisition)` — where `<question>` is the escalation's question — and
     return `(claim-value <claim>)` (or the `mark-unknown`/`refuse` outcome the grounding
     door produces: `:unknown`, or `nil` on refusal). The worker's contract is unchanged:
     `escalate` still returns a plain value.
   - Consequence to preserve, not soften: `(invoke-restart 'answer value)` with no
     acquisition now signals `ungrounded-claim` from inside the handler. That is the
     point — an unsourced ruling gets ruled on by whatever grounding policy stands, or
     stops the coordinator interactively. Keep the `answered:<question>` emission firing
     only when a claim is actually produced.
   - Update the `with-escalation-policy` docstring example to show a sourced ruling:
     `(invoke-restart 'answer (rule-on c) (acquire-operator (escalation-question c) "<the operator's words>"))`.
   - Update existing escalate tests that call bare `answer` — deliberately, one by one;
     each either gains an acquisition or becomes a test of the new door-fires behavior.

3. **Autonomy budget** (independent).
   - Add `budgeted-policy`: `(budgeted-policy n permissive strict)` → a function policy
     (one argument, the condition). Invocations 1..N delegate to `permissive`; N+1
     onward delegate to `strict`. Each of `permissive`/`strict` may be a restart-name
     symbol or a function of the condition — mirror the `etypecase` dispatch the two
     policy macros already use, factored so it is written once.
   - Emit exactly one `budget:exhausted:<n>` envelope at the flip (first invocation
     after the budget is spent), not on every subsequent call.
   - State lives in the closure — no global counters.

4. **Suite + docs.**
   - Run `make test`; everything green, exit 0.
   - Add a short "borrowings" note to the escalate file header (2–4 lines): what was
     borrowed, from where, and that the timeout idea was deliberately deferred (points
     at discovery d013).

## How We'll Know It's Done

- [ ] `(escalate "q" :severity :critical)` produces a condition whose report names the
      severity, and a function policy branching on `severity<=` auto-answers a `:low`
      escalation while letting a `:critical` one fall through to an outer handler.
- [ ] Invoking `answer` with `(acquire-operator …)` resumes the worker with the value,
      and `spine-events` shows `acquire:operator`, `ground:<question>`, and
      `answered:<question>` for that escalation.
- [ ] Invoking `answer` with no acquisition signals `ungrounded-claim`; under a standing
      `(with-grounding-policy ('mark-unknown) …)` the worker resumes with `:unknown`;
      under `'refuse` it resumes with `nil`; the spine records `unknown:`/`refused:`.
- [ ] `budgeted-policy` with n=2 rules permissively exactly twice and strictly from the
      third invocation, under **both** `with-grounding-policy` and
      `with-escalation-policy`; exactly one `budget:exhausted:2` envelope is on the spine.
- [ ] Full FiveAM suite passes: `make test` exits 0, including the consciously-updated
      escalate tests.
- [ ] No new files under `src/`; no new dependencies in `ocicl.csv`.

## Testing

Applies: yes
Test brief: .madewell/specs/2026-08-05-water-borrowings.test.md   ← written by Test-Design sub-agent
Results: .madewell/work/test-results/2026-08-05-water-borrowings.md   ← written by Test-Runner sub-agent

## What Could Go Wrong

- **Door-within-door recursion:** the `answer` restart now calls `ground` from inside an
  escalation handler. If a standing grounding policy is in force, it will silently rule
  on the *ruling's* provenance — correct by design, but the interaction must be pinned by
  tests (both nesting orders: grounding policy outside escalation policy, and inside).
- **Contract break is deliberate, not accidental:** bare `(invoke-restart 'answer v)` no
  longer silently succeeds. Any call site or test that relied on it must be updated
  knowingly; a mechanical find-replace that adds fake acquisitions would defeat the
  entire change. An acquisition must record something that actually happened.
- **Accretion creep:** the temptation is a `defclass` policy object or a severity DSL.
  Resist — three small additions to existing files, in the existing style.

## Out of Scope

- **Temporal escalation policy** (water's `timeout` + `timeout_action` — a deadline
  racing the coordinator, expiring into `use-default`/`refuse`). v6 has no async
  operator channel; handlers run synchronously in-stack, so a deadline has nothing to
  race. Captured as discovery **d013**, blocked on an async coordinator/operator ask
  channel (multi-star coordination).
- Vendoring or porting any water code (Apache-2.0; ideas only).
- Persisting the autonomy budget across sessions or images.
- Retry-with-feedback machinery — the `acquire` restart already is that loop, with the
  stack held.
