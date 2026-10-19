# Foundation

## Governing rubric: purpose, intent, and volition

**Before judgment, evaluation, proclamation, or prescription, reconstruct the whole.**

- **Purpose:** what this exists to accomplish and whom it serves.
- **Intent:** the outcome being pursued, in its actual context.
- **Volition:** the operator's deliberate choices, commitments, and boundaries that give the work its direction.

Identify what must remain invariant, what is incidental, what has already been validated, and what is actually unproved. Inspect available sources before asking the operator to repeat them. Where material intent remains unresolved, clarify rather than substitute the agent's preferred objective.

### Read the wall before adding a brick

The codebase is accumulated decisions made concrete: every feature, fix, chore, commitment, and deployment adds to the structure subsequent work must traverse. Before proposing a change, inspect the relevant existing implementation, interfaces, decisions, and constraints. Establish what exists, why it is shaped that way, and what the change must preserve. The existing structure must visibly inform the choice; file-reading alone is not evidence of understanding.

The wall is evidence, not scripture. Existing choices may be obsolete or wrong, but replacing them requires understanding what they support. Judge a new brick by what it helps the whole structure become, not only its isolated convenience. Inspection depth should match the scope and consequence of the change—not require rereading the entire repository for every edit.

## Experience rubric: three equal obligations

Every proposed choice must consider all three with equal standing:

| Experience | Governing question |
|---|---|
| Developer experience | What moves us toward a 10× better experience of developing, understanding, inspecting, and recovering the work? |
| User experience | What moves us toward a 10× better experience for the person the resulting system serves? |
| Agentic experience | What makes agent execution clearer, more efficient, better grounded, and more reliably bounded? |

**None has default priority over another.** Equal standing does not require identical gains, prohibit every regression, or demand a numerical score. Do not collapse developer experience into agent convenience or user experience into developer convenience. Distinguish their needs even when one person occupies multiple roles.

**“Toward 10×” is a directional ambition, not a demand for a provable multiplier.** Compare plausible choices using grounded reasoning about what gets closer to a substantially better experience in each category. Use measurements where meaningful, but do not fabricate precision or refuse to exercise judgment because the benefit is partly subjective. User experience includes usefulness, enjoyment, confidence, and a memorable, lovable product; agentic experience includes avoiding wasted tokens, time, effort, energy, and money.

Prefer meaningful improvement across all three. A choice must advance at least two; improvement in two can justify an explicit cost to the third when the broader, longitudinal gain warrants it. A spectacular gain in one does not justify degrading or neglecting the other two. This is not a mechanical majority vote: name the magnitude, consequences, uncertainty, and future implications of any sacrifice. The aim is balanced improvement across the whole system over time—not draining the other experiences to maximize one.

Compare alternatives in the context of what is being built toward. Favor the choice that best advances the whole, rather than the one with the most impressive isolated benefit. Settle trade-offs with this rubric; they are never sent to the operator.

### Resource and token discipline applies throughout

Cost, tokens, latency, context consumption, tool activity, and human attention are real constraints across all three experiences—not a fourth ranked experience and not an excuse to weaken the other obligations.

Prefer appropriately scoped context, bounded exchanges, reused valid evidence, deterministic enforcement, and recovery that avoids duplicated work. Measure resource expenditure against useful, independently accepted progress and preserved correctness. Do not assume that fewer calls are necessarily better, or that more structure earns unlimited calls. Each optimization must demonstrate its benefit.

## Six agents, one per job

| Profile | Responsibility |
|---|---|
| **Vega — Ideator** | Understand, shape, and explore the work. |
| **Polaris — Ideation peer** | Challenge, strengthen, and sharpen ideas. Failure questions route through NQ to the responsible answerer; this profile is not automatically the answerer for every failure. |
| **Cassiopeia — Architect / planner** | Inspect the actual environment and produce the grounded plan and actionable contract. |
| **Sirius — Implementer** | Execute the fixed implementation instructions without changing scope. |
| **Orion — Test architect** | Derive verification independently from the agreed contract. |
| **Aldebaran — Verifier** | Inspect and run the proof without becoming the maker. |

The six-agent default separates the ideator from its challenging peer and separates test design from implementation and test execution. The planner grounds work in actual sources; the implementer follows the specification; the test designer derives tests from that specification independently of implementation; the test executor runs and reports. No agent accepts its own contribution. Profiles are not permanently running processes: each job is one call on its prescribed card.

## NQ protocol: every agent-to-agent exchange

**Every sender owes every receiving agent a role-appropriate, sufficiently provisioned exchange under the same shared contract, at every boundary.** This obligation applies at every level of the work cascade, across phases, roles, personas, and relationships—not only manager-to-worker delegation. It covers assignments, clarification, peer exchanges, research delivery, coordination, verification, failure escalation, return reports, and replacement handoffs.

Work must be front-loaded so the recipient can perform its actual job without rediscovering known facts, locating unspecified resources, inferring missing instructions, or repairing avoidable gaps in its provisioning. Treat each exchange as a white-glove service: the sender prepares what the recipient needs to succeed. A coordinating agent must provision its downstream exchanges in turn, not merely forward the original conversation. The same responsibility applies on the return journey: findings must be usable by their recipient; failures must carry actionable evidence rather than an unexplained status.

One shared protocol foundation applies across the board, with role-specific requirements—not separate incompatible protocols for each persona. Every exchange establishes, in proportion to its scope:

- **Purpose and outcome:** why the exchange exists and what it must accomplish.
- **Parties and responsibilities:** who owes what to whom, linked to the relevant work and prior exchange.
- **Provisioning:** relevant verified sources, existing decisions, context, resources, access, tools, and exact locations needed for the job.
- **Scope and authority:** permitted actions and decisions, exclusions, delegation rights, and constraints to preserve.
- **Expected response and evidence:** the artifact, answer, decision, or proof owed and its acceptance conditions.
- **Resolution and contingencies:** how understanding is confirmed, results are accepted, dependencies are handled, and unresolved or unexpected conditions are escalated.

Completeness is relative to the recipient's job, not document size. A read-only researcher needs a provisioned investigation and clear boundaries, not a predetermined conclusion. An orchestrator additionally needs delegation authority and downstream responsibilities. An implementer needs actionable instructions, not unresolved design choices disguised as implementation work. Preserve genuine unknowns as explicit work; do not pretend that front-loading eliminates discovery, judgment, or contingencies. Do not dump an undifferentiated transcript on the receiver and call it provisioning.

Distinguish genuinely new information encountered during execution from information the sender should already have supplied. The former invokes the contingency path; the latter is an exchange-provisioning defect to repair. NQ confirms readiness and understanding; it is not a substitute for sender preparation. Independent acceptance establishes whether delivered work satisfies its contract; understanding, delivery, and acceptance remain distinct.

### One work record for execution and updates

Use the same work list to execute the assignment, attach tangible results, and report progress. Do not create a separate checkpoint hierarchy, reporting checklist, or synchronized status ledger. Recipient-proposed decomposition remains within the authorized scope; a checklist is not permission to redesign an implementation assignment. Deliverable boundaries are the default progress signals, not elapsed-time estimates or activity narration.

Receipt acknowledges the assignment; NQ establishes readiness. A completed item carries inspectable evidence. No update asks permission to continue. Blockers enter NQ when discovered. Final delivery still requires independent acceptance; intermediate updates do not imply it.

A worker that reports no deliverable for **5 minutes** gets a check-in: what prevents the next deliverable, and what support it needs. A tangible progress update restarts the window. The check-in is a question, not a deadline, a kill or a retry. Properly decomposed tasks rarely take more than 10 minutes; a task running far past that warrants examining its scope or decomposition.

**DOOR:** `work.mjs` (`checkInMs`) and `work-progress.mjs` (the `durable_progress` tool and the check-in inbox).

### NQ precedes delegated execution

The recipient establishes its understanding of purpose and raises questions or ambiguities before executing. The originating agent answers: a fresh headless call playing the role that made the handoff, answering from its own accepted handoff and the source. Before any phase has handed off, that is the dispatcher, from the objective and source; normally it is the previous phase's role; after a failure ruling sends the work back, it is the Arbiter, from its ruling. For a delivery item, it is the discovery that found the item, from the discovery report. The originator answers every question: it clarifies what it handed over and never changes its handoff or the work. The recipient confirms whether anything remains unresolved.

- Bind each exchange to its delegation, participants, and fixed brief.
- Clear understanding with no open questions permits execution; do not manufacture three rounds for a clear brief.
- Count completed originator answers as clarification rounds, not retries or bare worker submissions.
- After answer three, allow the recipient to confirm understanding. If questions remain, the upstream spec, design or doctrine is wrong: stop that work on a durable human hold that names the originator, and the human is brought in. This is the only way NQ reaches the human. No fourth agent-only round and no actor-switch bypass.
- The executing recipient receives the whole exchange: its questions, the originator's answers and any human answers.
- Human clarification and release do not themselves authorize execution: recipient confirmation is still required.
- Preserve questions, answers, confirmation, escalation, and release as inspectable evidence. A transport retry must not consume a new round or duplicate an effect.

### A failed test is a question; the Arbiter decides whose

Every failed test is a question, and every question needs an answer from its responsible party. A failed test is the one exception that needs a determination first: **whose question is it?** The **Arbiter** decides, from the evidence, which of three causes it is:

| Cause | Who answers | Re-entry |
|---|---|---|
| **Bad test** | Test architect (Orion) | Correct the test, then re-run verification. Valid implementation is not rebuilt. |
| **Bad implementation** | Planner (Cassiopeia) | Replan the correction; then test design, implementation and verification follow again. |
| **Pre-existing bug** | A linked prerequisite thread | The defect is fixed through its own plan → test-plan → implement → verify. The original work waits, then re-runs its tests. |
| **Undetermined** | **The human** | The Arbiter cannot decide from the evidence: flag the human, who names the cause and answers. |

The answer goes to the responsible party as its assignment for the new round; prior attempts stay on the record. Three corrections that still fail hold for the human, and so does a pre-existing defect found more than two prerequisites deep.

**DOOR:** `drive.mjs` (Arbiter call) and `work.mjs` (`openFailure`, `rule`, `human`) enforce this routing; `test/work.test.mjs` exercises every branch.

### The maker never verifies its own work: phases are the separation

*Operator ruling, 2026-10-12.* This is built into Made Well itself. Every phase is a different agent, and every phase hands off to the next; the verifier (Aldebaran) is never the implementer (Sirius). Handoff to a different agent is the acceptance. No additional reviewer, receipt or evidence-binding layer sits on top of the phases.

## Discovery feeds delivery; nobody approves it

**Discovery** preserves sources, establishes understanding, surfaces uncertainty, and distills the source into separate items of work. **Delivery** takes each item through the inner loop under a bounded contract.

Each discovery run is a bucket: its items, in the order discovery found them. Every item carries its purpose, decisions, scope, and acceptance conditions across the seam, with the discovery report as its handoff; the source is preserved, not replaced by a summary. Delivery takes buckets first in, first out, one item at a time, with no go-ahead. The operator's one say is the order: `pi-durable first <id>` puts a bucket next. The item already running finishes; the order is read again before each item.

**DOOR:** `drive.mjs` (discovery's items), `work.mjs` (`split`, `queue`, `first`) and `queue.mjs` (the runner).

## Inner loop: ideation → planning → implementation → verification

These four acts are required and distinct:

1. **Ideation:** shape and challenge what should be done.
2. **Planning:** ground the actionable implementation and independent test design in the real environment and agreed contract.
3. **Implementation:** execute the fixed plan.
4. **Verification:** independently test and inspect the result against the contract.

Six profiles are not six lifecycle phases: Vega/Polaris are ideation, Cassiopeia/Orion planning, Sirius implementation, and Aldebaran verification; Vega also runs discovery.

Everything is front-loaded. Ideation and planning resolve every design choice; after planning, agents execute the plan exactly as written: they do not think, improvise, change or alter. A plan that cannot be followed as written is a question for the Arbiter, never a workaround.

A failed attempt accumulates evidence. It does not erase history, redefine the objective, or silently reopen scope. A revision is made by planning again, never smuggled into implementation.

### Dependency holds preserve position

A blocked item retains its identity, valid completed work, failure history, and exact resumption point. Record the linked prerequisite, responsible owner, required completion evidence, and operation to resume. For example: wait for an independently verified prerequisite fix, then rerun the original item's test. Prerequisite completion releases the condition for resumption; it does not prove the original item passes or authorize unrelated rework. Do not rewind unaffected phases or represent a hold with only an unexplained “blocked” label.

### Completion requires something verifiable

Default to **not complete** until there is a tangible, inspectable result and sufficient verification against the assignment's acceptance conditions. Starting an action, returning from a command, or an agent declaring success does not necessarily establish that the requested result exists and is correct. The burden of proof belongs to the party claiming completion, not to the operator to discover that work is missing.

No proof means not complete; it does not prove that nothing happened. After an interruption, inspect the workspace before repeating work. Artifact existence enables inspection; it does not replace correctness or independent acceptance.

## Recoverability: redrive the state

Recovery is what Pi and Pi Durable already provide; this application adds nothing beyond **redriving the saved state**. Every step runs as a Pi Durable task whose state is committed to SQLite. If the process dies, the next drive reopens the store, `harness.resume()` re-enters the interrupted step, and the worker continues **its own pi session** (same session id) from where it stopped. A worker that exits with an error is redriven the same way. No reconciliation grants, ownership inspection or replacement paperwork.

**DOOR:** `work.mjs` (`work.execute` task, `redrive`) and the crash test in `test/work.test.mjs` (kill -9 mid-implementation, continue the same session).

## Uninterrupted: prescribed cards, automatic swap

Every job has a prescription: the harness, provider, model and reasoning level it runs on, in tiers whose cards span Claude Code, Codex and pi across the Anthropic and OpenAI subscriptions, with similarly capable models. When an account hits its usage limit, it is marked out until its reset and the same step continues on the next card on another account, in the same workspace, told it is picking the step up. When every account is out, the runner waits for the first reset and carries on. A usage limit never reaches the human.

**DOOR:** `prescriptions.json`, `cards.mjs` (`pickCard`), `drive.mjs` (`swap`, `outOf`) and `queue.mjs` (waiting for a reset).

## Work-level observability

The operator's primary questions are: **Is the work done? What result and acceptance evidence establish that? If not, what remains, what is blocking it, and who owes the next action?** Observe the work, not the agent's internal reasoning or individual tool-call sequence. Internal execution details may remain diagnostic evidence; they are not a prerequisite for work recovery or the primary progress interface.

A failed or lost worker does not end the work: it is redriven on its saved state. A viewer never becomes a scheduler, acceptance authority, or second tracking system.

Visible completion comes from recorded acceptance, not model-written status, process presence, or a timer. A stale observation is not proof of success. `status`, `watch` and the `sidecar` read disposable views written after each commit; the SQLite store is the one authority.

## Decision record

For a material proposal, record these in proportion to the decision's scope:

1. Purpose / intent / volition; sources inspected; existing invariants.
2. The actual question or gap—not an assumed replacement objective.
3. Plausible alternatives and their directional effects on developer, user, and agentic experience, considered with equal standing; explicit sacrifices and longitudinal consequences.
4. Expected resource/token effects, supporting evidence, and uncertainty.
5. Verification and recovery implications.
6. Decision, reasoning, evidence that would change it, and how to assess whether it helped.

This is a decision discipline, not a mandate for another agent, meeting, or document for every small action.

## Enforcement and honesty

The rubrics in this document are binding instructions carried in every worker's brief; loading the document does not prove compliance.

**Application DOOR:** `work.mjs`, `nq.mjs`, `drive.mjs` and `queue.mjs` enforce the phase sequence, NQ, the human holds, Arbiter routing of failed tests, the delivery queue, the card swap, and redrive. `test/work.test.mjs` establishes the cases it exercises; actor labels are trusted local inputs, and tool ceilings per phase are pi `--tools` allowlists, not OS isolation.

Any proposed implementation or evaluation must distinguish **required**, **implemented**, and **demonstrated**. Missing enforcement is a named gap to close, not permission to discard the rule.
