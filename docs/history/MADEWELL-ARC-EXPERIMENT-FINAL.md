# Made Well × Arc — Final Experiment Report

**Date:** 2026-09-23
**Subject:** Whether Made Well's execution binding survives contact with a real Arc development history
**Ruling:** **Ready for bounded operational adoption, not yet a complete autonomous delivery authority**

## Executive judgment

Made Well now provides a credible durable execution binding for agent work. In the tested boundary it prevents the most dangerous category errors: reporting is not acceptance, acceptance is not repository position, a stale proof is not fresh proof, and a finished command is not a finished unit. Arc history exposed real coordination failures; the experiment converted them into concrete scenarios, ran a disposable lifecycle, found defects in legal movement and durable persistence, repaired those defects, and independently verified the result.

The experiment does **not** establish that Made Well alone proves a deployment is live, that it enforces every role in the conceptual four-hand model, or that every crash/concurrency/provider combination is safe. Those are explicit next boundaries, not hidden claims.

The right next move is controlled adoption in one real Arc unit while measuring operator burden. A broad rollout or additional framework expansion would be premature.

## Original intent

This mission was an evaluation of `~/madewell`, using Arc as the real-world laboratory and Claude Code/Pi session history as primary evidence. The question was not whether the methodology sounded coherent. The question was whether its persisted state and execution rules told the truth about how work actually happened.

The mission therefore:

1. audited the execution schema and transition rules;
2. mined Arc history for actual coordination failures;
3. converted those failures into acceptance scenarios;
4. exercised a disposable Arc lifecycle;
5. repaired defects found by that exercise;
6. required independent verification before landing the repair.

`~/source` was used only as inspection evidence where historical artifacts lived. It was never the working or deployment target.

## What was measured

### 1. Execution state and repository position remain distinct

The binding records commands, attempts, actors, evidence, acceptance, phases, and events without pretending that those fields prove Git integration or deployment. The static audit found explicit separation between:

- command result and phase acceptance;
- current proof and retained historical evidence;
- execution status and stock/bench/finished position;
- candidate acceptance and later integrated bytes.

Primary implementation: `kernel/bin/mw-session.py`. Contract: `kernel/bindings/SESSION.md`.

### 2. Arc supplied six reproducible failure scenarios

Historical Arc evidence produced six acceptance scenarios:

1. credential continuity must not become an invented claim that another live agent owns work;
2. authority provenance cannot be replaced by an imaginary owner;
3. a drained parent can be finished even when retained directories survive;
4. empty telemetry is not proof that machinery is absent;
5. changed candidate bytes invalidate acceptance for the changed candidate without erasing history;
6. published ancestry does not authorize bypassing movement hooks.

These scenarios came from Arc commits, `.madewell` records, and the original Claude transcript `ed564b63-a24a-4449-9034-2350d62e4026.jsonl`. No Pi-specific event is claimed as scenario provenance; separate Pi evidence belongs to the later execution-binding verification. Observed fact and inference were kept distinct rather than flattened into one narrative.

### 3. The disposable Arc pilot found a real movement defect

The pilot demonstrated that host finish could leave an uncommitted stock → bench → finished path appearing as an illegal stock → finished candidate. The existing commit gate correctly refused that illegal commit, so the bad transition did not land. The lifecycle defect was that prevention happened too late: the host lacked a legal floor operation and finish did not require committed bench arrival. The repair moved refusal earlier and supplied the missing legal path.

### 4. The repair made the lifecycle landable

Commit `17006ff13d5386b7fd188380a6f7237f608b5252` (`fix(session): make fresh execution lifecycle landable`) added:

- a gated floor operation;
- committed-bench-arrival enforcement before finish;
- atomic same-directory piece replacement;
- file and directory fsync;
- permission preservation;
- temporary-file cleanup on pre-replace failure;
- adversarial failure injection around partial writes, replacement, and fsync;
- a full Arc-shaped lifecycle regression.

It followed the initial durable execution implementation in `f6f5f3c`.

### 5. Independent verification passed

The final verifier reported:

- **63 Python tests passed**;
- **12 refused / 10 allowed Pi callback cases passed**;
- parser/schema malformed-input checks passed;
- **13 movement checks passed**;
- `git diff --check` passed;
- jig and tax gates passed;
- an additional real-filesystem post-replace directory-fsync probe behaved honestly.

The last probe established an important boundary: after a replacement succeeds but directory fsync fails, the new piece may exist while the session success event does not. The implementation does not claim two-file transactional atomicity; the caller must inspect and reconcile after that storage fault.

The disposable Arc pilot itself used two asserted trusted CLI actor strings, not two native Pi processes. Its nested probe established legacy-unbound structural drainage, not recursively bound parent/child execution. It did not run Arc's full CI. The fresh-clone pilot also preceded the final fsync-hardening delta; that delta was covered by the final 63-test/source review and targeted real-filesystem post-replace probe rather than by repeating the entire clone pilot.

## What was inferred, not directly proven

- The current design is suitable for bounded real work because it passed a representative Arc lifecycle and substantial adversarial testing.
- Separating execution facts from repository position should reduce false completion claims in Arc.
- Retaining historical failed makers and stale proofs should improve diagnosis compared with overwriting a single current-state record.

These are supported engineering judgments, not universal proofs across every project or harness.

## What remains unproven

### Role model

The executable binding excludes implementation actors from independent verification, but it does not fully enforce the conceptual four-hand model or separately fence the ideator in every path.

### Landed and live

A commit, remote ref, deployment receipt, and health check remain external facts. Made Well can bind evidence about them but does not manufacture those facts from execution status.

### Failure matrix

The following remain targeted probes rather than accepted guarantees:

- process death between launch and PID persistence;
- orphan descendants;
- simultaneous claim/index/proof mutation;
- migration of older execution records;
- deep nested and symlink-parent movement;
- old-seat schema refresh;
- exhaustive provider/harness combinations;
- hardware power loss and uncommon fd/open/unlink failures.

### Operator burden

The documented simple full cycle requires roughly 16 requests, two actors, repeated titles/expectations/reasons, and later movement/commit operations. The system is truthful, but not yet effortless.

## Developer-experience assessment

### What is already memorable

- A command result cannot masquerade as accepted work.
- A verifier is structurally different from a maker.
- Changed evidence becomes stale instead of silently remaining green.
- Illegal repository movement is refused with durable history preserved.
- A restart can recover from persisted execution state rather than chat memory.

### What still creates friction

- The happy path asks the operator or agents to repeat information already available in the piece and plan.
- Execution completion and piece-position closure are intentionally separate, but the UI must make that separation obvious.
- Recovery messages need to identify the exact next legal operation rather than merely expose state.
- Raw session and review evidence is valuable but too large and volatile for normal source commits.

### World-class experience target

The best next experience is one where an agent starts from a single named piece, receives derived phase/step context automatically, performs only the irreducible decisions, and sees one honest progression:

```text
planned → making → independently verified → committed arrival → finished position → landed/live evidence owed
```

Every transition should state who owns the next action and why it is legal. The system should derive repeated fields, never weaken evidence boundaries to save clicks.

## Repository disposition

The closeout classified current artifacts as follows:

- `AGENTS.md`, `CLAUDE.md`: restored tracked loader entrypoints; they direct harnesses to `kernel/AGENTS.md`.
- `.madewell/sessions/`, `.madewell/reviews/`: retained locally and ignored. They contain valuable raw provenance but are clone-local runtime evidence.
- `.pi/pispine-ledger.json`, `.coraline/`: retained locally and ignored as harness/index state.
- `.madewell/stock/{independent-session-review,session-execution-commit,session-execution-repair}.md`: retained and **not ignored**. Done execution records still reference these pieces, and `claims()` scans all session JSON records. Deleting only the cards would create dangling authoritative claims.

This last distinction matters: **execution acceptance completed; piece-position closure is separate and remains represented honestly.** Any later archival operation must reconcile the binding and its referenced piece together.

## Decision

Made Well has passed the experiment needed to justify bounded adoption. It should not return to speculative framework design before proving that the repaired path is easier to use in a normal Arc unit.

### Recommended next phase: one-unit Arc adoption

Choose one medium-sized, non-emergency Arc change and require:

1. one canonical piece and goal;
2. one maker and one independent verifier;
3. native execution records from plan through verification;
4. legal committed arrival before finish;
5. explicit landed/live evidence or an honest `LIVE-OWED` result;
6. measurement of request count, repeated fields, recovery prompts, and operator interventions.

### Success criteria

Adoption succeeds when:

- no participant needs to invent ownership or completion state;
- stale evidence is surfaced before integration;
- the operator can understand current position and next owner at a glance;
- the full lifecycle requires materially fewer repeated inputs than the current ~16-request baseline;
- the final report can be reconstructed from durable records without transcript archaeology.

### Stop conditions

Pause adoption and repair the binding if:

- normal work requires bypassing a gate;
- two sources disagree about the current piece or actor;
- execution `done` is presented as landed or live;
- recovery requires deleting history;
- the process burden causes agents to route around the system.

## Final course correction

The original Made Well-on-Arc mission is complete after this report is independently accepted and landed. Herdr usability repairs performed during the mission were supporting infrastructure work, not a new product direction.

Do not extend this window into the next Arc implementation. Close it, preserve its evidence, and begin the adoption trial as a new bounded mission with its own acceptance criteria.
