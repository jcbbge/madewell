# Granular process acceptance tests — thread 104

Authority: accepted Cassiopeia plan, `ACCEPTED-3-plan.md` in packet
`00149956-d5c1-4ec9-adb4-f199dd4a48ed`; `FOUNDATION.md`.
These expected outcomes are derived from that contract, not the implementation.

## Execution status and boundaries

- Authored: `test/granular-process-contract.test.mjs` (two real SQLite close/reopen cases).
- The test uses the existing `openStore/create/get/list/close` interface. It names
  the new persisted discriminator `processVersion`; this is an explicit test seam,
  not a claim that the implementation already supplies it.
- Written below: integration acceptance procedures, including crash injection and
  live-worker proof. These are NOT executable automated tests and NOT passed checks.
- Not run: any command. This session has no command tool. Existing code inspected
  has no process discriminator; a red result is expected but was not observed.
- Git ownership, Doctor state and backend health remain unverified. Only these two
  new test artifacts are owned by this contribution; no existing files were edited.
- New granular task, discovery-confirmation and projection API shapes are not fixed
  by the plan. Bind the procedures below to the implemented public interfaces in a
  test-only follow-up; do not invent a parallel scheduler or weaken their oracles.

## Common apparatus / evidence

Use a fresh temporary workspace and real Pi Durable SQLite store for each case.
Never drive the shared store or Doctor #70. Retain failed-run evidence outside the
store before cleanup. Cleanup all test-owned children, store handles and directories
in `finally`/test teardown, including assertion failures. Use bounded waits with
explicit failure diagnostics; never use elapsed time as evidence of completion.

Capture before interruption and after reopening: work document, stored task and
checkpoint evidence, projection timestamp, task/attempt/session/round IDs, process
version, exchange IDs and turns, source bytes, command logs and evidence references.
Terminal tasks may disappear from the live graph: retain their committed results in
the work document. An event label alone does not prove a durable task existed.

For every boundary test, interrupt immediately before and immediately after its
commit, in separate runs. Restart in a NEW OS process against the SAME SQLite file.
Use a deterministic barrier at the boundary rather than a timing guess. The barrier
must not supply the state transition being tested. Verify the actual commit via the
store before killing the test-owned driver. Replaying a committed operation must
not increment turns, create another finding/task/delivery, or repeat completed work.
An external side effect before its commit is uncertain: inspect it rather than claim
exactly-once external execution.

## G01 — boundary inventory (plan done-when 1)

Execute and inspect each row, not merely the final total:

| Boundary | Owner | Required stored result |
| --- | --- | --- |
| discovery.declare | Driver | exact source reference and explicit live/blind mode |
| discovery.inspect | Vega | existing purpose, work and decisions inspected |
| discovery.classify | Vega | classification |
| discovery.lenses | Vega | findings across documented lenses |
| discovery.central-finding | Vega | central finding OR explicit absence |
| discovery.route | Vega | stable finding IDs, keep/decide/let-go, stated/inferred, source references |
| discovery.confirm | Operator | committed verbatim answers, corrections and confirmed findings |
| delivery ideation/options | Vega | options |
| delivery ideation/challenge | Polaris | challenge |
| delivery planning/contract | Cassiopeia | bounded contract and ordered implementation items |
| delivery planning/independent checks | Orion | named checks and expected evidence |
| delivery implementation/item A, item B | Sirius | one durable task/result per planned item |
| delivery implementation/consolidated report | Sirius | consolidated evidence and open items |
| delivery verification/command A, command B | Aldebaran | separate tasks with command, exit, output/evidence |
| delivery verification/verdict | Aldebaran | independent verdict grounded in named outcomes |
| assignment/intake | receiving agent | readiness or questions |
| receiver question | receiving agent | question and exchange/turn identity |
| originator answer | originating agent | answer and exchange effects |
| receiver confirmation | receiving agent | explicit confirmation before execution |
| reported result/handoff | sender then receiver | reported evidence then distinct acceptance |
| failed-check referral | failing agent | actionable failure evidence |
| Arbiter ruling | Arbiter | cause, answer and routing |
| human hold/response/reconfirmation | Operator then recipient | wait, exact response, recipient readiness |
| prerequisite link/wait/resumption | responsible linked work then verifier | linkage, completion condition, exact check to rerun |

Each executable row must have actual stored task/checkpoint identity linked to its
work record, committed evidence before its successor starts, responsible role and
next party. Human waits require a durable pending boundary, not an active model
loop. Test both explicit central-finding absence and presence. Tool calls and free
text progress updates must not manufacture extra accepted process steps.

## G02 — discovery authority and idempotency (2)

Seed findings F1 (stated, keep), F2 (inferred, decide), F3 (let-go), with distinct
source references. Existing delivery permission covers F1's stated objective only.
Before operator confirmation, restart twice: confirmation stays pending, no model
approves it and no delivery for F2/F3 starts. Respond with exact multiline text,
including a correction and non-ASCII punctuation; select F1 only. Interrupt after
confirmation commit before delivery creation, then restart twice. Assert exact
answer bytes/correction history, stable finding IDs, exactly one linked delivery
for F1 and none for F2/F3. Unselected findings remain inspectable. Discovery done
must not mark the new delivery verified. Repeat with explicit selection of F2
without authorization: no execution until its authority is recorded. Test blind
mode as an explicit declaration, never an inferred fallback.

## G03 — reporting is not acceptance (3)

Finish an execution task, stop before the receiving agent accepts the handoff.
Reopen: result/evidence remain reported; neither task terminality nor progress
changes them to accepted. The next responsible party is the receiver. Resume the
handoff once: acceptance is recorded without rerunning the completed worker and
without creating another reviewer. Final completion still requires Aldebaran.

## G04 — NQ recovery and atomicity (4)

For assignment, phase handoff, failure referral, Arbiter ruling, authority consult
and human response: receiver asks Q, originator answers A, crash after answer
commit and before confirmation. Reopen: identical Q/A, exchange/operation/turn key,
session and turn count; execution remains blocked pending receiver confirmation.
Replay answer delivery: no second turn/effect. After three answered turns allow a
clear confirmation; a further question holds that item, with no fourth agent-only
answer. Carry Q across a different handoff and rephrase it using the originator's
repeat linkage: it retains the shared count. Human answer consumes one turn, but
never substitutes for recipient confirmation. Another work item remains runnable.
Crash around task creation/reference commit: no orphan task or dangling work
reference. Keep `nq.mjs` as authority; do not implement these counts in the tests.

## G05 — ordered implementation and verification (5)

Contract: item A writes artifact A; item B depends on A and writes artifact B.
Checks CA and CB each append an execution marker to a test-owned log and inspect
those artifacts. Reject duplicate item IDs, unknown dependencies and cycles before
launch, or hold with an actionable contract question; never execute an ambiguous
list. Commit A, crash before B; resume: A's identity/evidence unchanged and one
execution marker only, B executes next. Commit CA, crash before CB; resume: CA is
not repeated and CB executes. A failed command cannot be hidden by a later passing
command. Report lists the same bounded items used to execute, not an independent
checklist. Ordinary progress text does not finish an item. Inspect access/card
selection for each semantic substep: correct existing role permissions, Orion not
Sirius, Aldebaran independent of Sirius.

## G06 — legacy restart (6)

Create a v1 record using the pre-change runtime in an isolated store; omit the
version field, leave an implementation attempt interrupted with an existing session.
Preserve that store as a test fixture, not a copied shared production database.
Open it under the changed runtime. Assert original seven-job interpretation,
`work.execute` v1 checkpoint, same attempt/session, no migration or synthetic
Discovery checkpoints. Resume, then exercise legacy failure routing and view.
Also test explicit v1 if supported. Unknown future versions must refuse execution
with an actionable error, not fall back to the newest array. Test new work in the
same store separately; it must persist its new version. Version lookup must govern
execution/permissions/routing as well as rendering.

## G07 — corrections and dependencies (7)

Run each branch with a failed named check and inspect prior evidence after restart:

- test: Orion correction then verification; no Sirius implementation rerun and no
  Cassiopeia replanning. Existing legacy test expecting implement after test-plan is
  NOT the new-process oracle; preserve legacy behavior separately.
- implementation: Cassiopeia, Orion, Sirius, Aldebaran in order for the correction.
- pre-existing: one linked prerequisite with its own independent verification;
  original stays at the failed check, with owner, required evidence and resumption
  operation. Child completion releases the wait but does not pass that check.
  Force the resumed original check to fail once to prove it is actually rerun.
- undetermined: durable human hold, no speculative correction execution; preserve
  ruling/response and require recipient reconfirmation after release.

After three unsuccessful corrective iterations, the next failure holds for the
human, preserving all four failure records. Reopening/replaying must not create an
extra correction or prerequisite. A nested prerequisite reaching the existing depth
limit holds rather than silently restarting the parent. Keep unaffected accepted
work and original verification position throughout.

## G08 — projection parity (8, 9)

At every G01 boundary capture the canonical projection and render it through the
terminal and browser paths. Compare semantic values, not ANSI/HTML: lane, act, job,
substep, committed checkpoint, task/attempt/correction identity, responsible role,
executing session, next party, status, evidence, questions, prerequisite and resume
operation. Exercise pending/running/reported/accepted/failed/waiting individually.
Capture projection timestamp and liveness separately. Remove the projection, age
it without a new commit, and stop the test-owned worker: none may become done.
A stale running snapshot must not assert current running liveness. An already
verified historical record may remain verified while current liveness is unknown.
Clear completed tasks from the live graph: historical evidence must remain visible.
Rendering must cause no store writes, scheduling or acceptance. Browser and terminal
must consume the same mapping; a second hardcoded job list is not parity proof.

## G09 — actual runtime proof (10, 11)

Required full-suite command from repository root: `npm test`.
Focused command: `node --test test/granular-process-contract.test.mjs`.
Existing regression commands (also included in npm test):
`node --test test/work.test.mjs test/nq-law.test.mjs test/nq-ledger.test.mjs`
and `node --test test/run-view.test.mjs test/run-view-driven.test.mjs`.

Aldebaran must additionally execute G01–G08 against the implementation, including
an actual kill/restart of an isolated SQLite-backed driver, not just object fixture
replay. Record PID ownership and kill only that test process. Supply exact executable
commands once the new public interfaces exist; this document is not a runnable
substitute and must not be recorded as a passing script.

Run one bounded real-worker scenario in the disposable workspace using the selected
backend, with fake harness environment disabled. Verify a durable substep result,
owner/session/checkpoint and next handoff against the stored record and both views.
Restart the same session at an unfinished boundary and prove accepted work is not
repeated. Bound calls/time; backend auth/transport errors are a blocked live gate,
not a fixture success or permission to restart Doctor. No always-on services. Stop
all children started for this proof. Record command, exit/signal, backend identity,
store path and evidence locations without credentials. A scripted worker may prove
transition plumbing but never live backend health.

## G10 — delivery evidence (12)

Before staging, inspect status/diff and reconcile ownership with Doctor/other work.
Stage explicit owned paths only, inspect the staged diff, run the full suite and
report failures for Arbiter determination. Authorized commit and push must report
commit ID, remote result and owned paths separately from runtime verification.
A successful push is not proof of G01–G09. No commit/push was attempted by Orion.

## Handoff gate

The two automated persistence cases alone do not meet this contract. Integration
procedures G01–G08 still need executable bindings and independent execution; G09
needs a command-capable verifier and real backend access. If implementation alters
the public seam, return that question to Orion rather than making the implementer
change expected outcomes to fit its code. Do not declare these gates passed on
artifact existence, prose, fixture-only tests, or an unexecuted command list.
