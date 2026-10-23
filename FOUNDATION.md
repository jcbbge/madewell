# Foundation

The operator's law for Made Well. It binds every implementation, every agent and every evaluation.

## Rulings of 2026-10-21

1. **Made Well is two vending machines.** Each takes an input and produces an output every time. Discovery turns raw context into candidate work items; delivery turns one promoted work item into that item delivered. See "Discovery and delivery".
2. **The four stages need at least six agents,** because each profile has its own capabilities, reasoning and prompt.
3. **Every agent-to-agent interaction enters the NQ protocol.** Non-negotiable.
4. **Profiles only, no names.** The earlier names were temporary placeholders.
5. **The quota swap is non-negotiable.** A usage limit never reaches the human. See "Uninterrupted".
6. **Made Well is open source.** Anyone can install it locally, and it works with any coding-agent harness, provider, model and runtime. It is built for agents first: efficient, and every error and lock carries rich context and the next steps. It is a distro on GitHub: one-click install, and the operator points their agent at one thing. From there the agent onboards itself and uses Made Well across all of the operator's projects. Onboarding, everyday use and recovery are optimized for that agent, a 10× agentic experience, so it can help its operator through the whole software development lifecycle.
7. **Every step is evaluable.** Each step's inputs and outputs are recorded and versioned, and evals can be run against them. A debug mode traces every invocation; it is toggled on and off and is never shown to the client or user.
8. **Promoting an item authorizes its own deploy.** That includes a pre-existing-defect fix item the Arbiter spawns. Shipping that item to production is not an authority question.
9. **Only the item's own checks gate its merge to main,** even when items run in parallel. Never the whole suite. With them, the project's registered gates (its linters and formatters) run on the item's own changed files; Made Well runs them, in place of a git hook manager.
10. **Every decision is settled in ideation and planning, by the experience rubric.** Every question passes through its three governing questions, and the answer they give is the decision. The operator hears of a question only when an NQ exchange is still open after three turns, because that means the design, brief, spec or plan is wrong.
11. **Checks are disposable.** They exist for one work item and are gone once it ships. A later problem re-enters the pipeline and gets new checks.
12. **After planning, the work splits.** The implementer and the test architect work from the same plan, in parallel, as different agents on different runtimes, and neither sees the other's output. Only Made Well's own run of the checks receives both (ruling 14). The maker never runs its own checks: it would change the code to pass them and hide the three possible causes, which are a pre-existing defect, a wrong implementation or a wrong test.
13. **Conservation: leave no trace.** Every job ends with aftercare. Worktrees are removed, processes are stopped, and anything provisioned (database branches, dev clones, servers) is torn down. Made Well keeps the smallest footprint: no stray files, markdown or artifacts in the product repo or on the machine, and no trace that an agent did the work beyond the delivered change itself. The same applies to Made Well's own code.
14. **A pass ships without an agent.** Made Well runs the item's check commands itself, and exit 0 ships. Only a failure calls an agent: the Arbiter, with the logs. The verifier's job becomes Made Well's own code. The six agents are the ideator, ideation peer, planner, test architect, implementer and Arbiter.

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

## Discovery and delivery: two vending machines

*Ruling of 2026-10-21. It supersedes the earlier rule that discovery fed delivery first in, first out, with nobody approving it and no go-ahead.*

- **Discovery:** raw context (notes, transcripts, meetings) in → a list of candidate work items (features, bug fixes, chores) out. Discovery preserves sources, establishes understanding, surfaces uncertainty, and distills the source into separate items. The items form a queue.
- **Promotion:** the operator chooses which items to promote. Each promoted item runs on its own through the one shared delivery pipeline. Items may run in parallel; a stop in one item stops only that item.
- **Delivery:** one work item in → that item delivered: checks green, merged to main, deployed to production. It takes the item through the inner loop under a bounded contract. Verification ships automatically when every check passes; when a check fails, the Arbiter rules on the cause. There is no separate ship stage.

Every item carries its purpose, decisions, scope, and acceptance conditions across the seam, with the discovery report as its handoff. The source is preserved, not replaced by a summary.

## Six agents, one per job

| Profile | Responsibility |
|---|---|
| **Ideator** | Understand, shape, and explore the work. Also runs discovery. |
| **Ideation peer** | Challenge, strengthen, and sharpen ideas. Failure questions route through NQ to the responsible answerer; this profile is not automatically the answerer for every failure. |
| **Planner** | Inspect the actual environment and produce the grounded plan and actionable contract. |
| **Test architect** | Derive the checks from the agreed plan, in parallel with the making and blind to it. |
| **Implementer** | Execute the fixed implementation instructions without changing scope. |
| **Arbiter** | Rule on a failed check: whose question it is. Ruling on a failure is its own job, separate from the ideation peer. |

Verification is not an agent. Made Well runs the item's checks itself, merges and ships on a pass, and calls the Arbiter only on a failure (ruling 14). Two parties sit outside the six: the **dispatcher** starts, stops and steers work and never does it; the **operator** is the person who decides.

The six agents separate the ideator from its challenging peer and separate test design from implementation and from test execution. The planner grounds work in actual sources; the implementer follows the plan; the test architect derives checks from the same plan without seeing the making; Made Well runs the checks. No agent accepts its own contribution. Profiles are not permanently running processes: each job is one call on its prescribed card.

**After planning, the implementer and the test architect are vending machines.** They execute the plan. They do not think, plan, design or improvise, and they never change the spec under everyone else. If the plan cannot be done as written, they stop and report it, and the Arbiter rules.

## Inner loop: ideation → planning → implementation → verification

These four stages are required and distinct:

1. **Ideation:** shape and challenge what should be done (ideator, ideation peer).
2. **Planning:** ground the actionable implementation and independent test design in the real environment and agreed contract (planner). The plan then splits: the test architect writes the checks while the implementer makes (ruling 12).
3. **Implementation:** execute the fixed plan (implementer), while the test architect writes the checks.
4. **Verification:** Made Well runs the item's checks against the implementer's change on the current main. A pass merges and ships; a failure goes to the Arbiter with the logs (ruling 14).

Everything is front-loaded. Ideation and planning resolve every design choice; after planning, agents execute the plan exactly as written: they do not think, improvise, change or alter. A plan that cannot be followed as written is a question for the Arbiter, never a workaround.

A failed attempt accumulates evidence. It does not erase history, redefine the objective, or silently reopen scope. A revision is made by planning again, never smuggled into implementation.

### Checks are written from the plan, blind to the making

Checks are written from the plan, blind to the making, and the maker never sees them. They verify intent, not only correctness: correct code that ignores the project's design system passes a correctness check and still misses the point. A correctness check after the making is an optional extra, not part of the minimal setup.

Only the work item's own checks are run: a delivery is one work item, and Made Well runs that item's named checks, never the whole suite, pipeline or app. The project's gates run with them, on the item's changed files alone.

### Dependency holds preserve position

A blocked item retains its identity, valid completed work, failure history, and exact resumption point. Record the linked prerequisite, responsible owner, required completion evidence, and operation to resume. For example: wait for an independently verified prerequisite fix, then rerun the original item's checks. Prerequisite completion releases the condition for resumption; it does not prove the original item passes or authorize unrelated rework. Do not rewind unaffected stages or represent a hold with only an unexplained “blocked” label.

### Completion requires something verifiable

Default to **not complete** until there is a tangible, inspectable result and sufficient verification against the assignment's acceptance conditions. Starting an action, returning from a command, or an agent declaring success does not necessarily establish that the requested result exists and is correct. The burden of proof belongs to the party claiming completion, not to the operator to discover that work is missing.

No proof means not complete; it does not prove that nothing happened. After an interruption, inspect the workspace before repeating work. Artifact existence enables inspection; it does not replace correctness or independent acceptance.

## NQ protocol: every agent-to-agent exchange

**Every sender owes every receiving agent a role-appropriate, sufficiently provisioned exchange under the same shared contract, at every boundary.** This obligation applies at every level of the work cascade, across stages, roles, and relationships—not only manager-to-worker delegation. It covers assignments, clarification, peer exchanges, research delivery, coordination, verification, failure escalation, return reports, and replacement handoffs.

Work must be front-loaded so the recipient can perform its actual job without rediscovering known facts, locating unspecified resources, inferring missing instructions, or repairing avoidable gaps in its provisioning. Treat each exchange as a white-glove service: the sender prepares what the recipient needs to succeed. A coordinating agent must provision its downstream exchanges in turn, not merely forward the original conversation. The same responsibility applies on the return journey: findings must be usable by their recipient; failures must carry actionable evidence rather than an unexplained status.

One shared protocol foundation applies across the board, with role-specific requirements—not separate incompatible protocols for each profile. Every exchange establishes, in proportion to its scope:

- **Purpose and outcome:** why the exchange exists and what it must accomplish.
- **Parties and responsibilities:** who owes what to whom, linked to the relevant work and prior exchange.
- **Provisioning:** relevant verified sources, existing decisions, context, resources, access, tools, and exact locations needed for the job.
- **Scope and authority:** permitted actions and decisions, exclusions, delegation rights, and constraints to preserve.
- **Expected response and evidence:** the artifact, answer, decision, or proof owed and its acceptance conditions.
- **Resolution and contingencies:** how understanding is confirmed, results are accepted, dependencies are handled, and unresolved or unexpected conditions are escalated.

Completeness is relative to the recipient's job, not document size. A read-only researcher needs a provisioned investigation and clear boundaries, not a predetermined conclusion. An orchestrator additionally needs delegation authority and downstream responsibilities. An implementer needs actionable instructions, not unresolved design choices disguised as implementation work. Preserve genuine unknowns as explicit work; do not pretend that front-loading eliminates discovery, judgment, or contingencies. Do not dump an undifferentiated transcript on the receiver and call it provisioning. The obligation does not mandate another agent, document, or ceremonial round for every small message.

Distinguish genuinely new information encountered during execution from information the sender should already have supplied. The former invokes the contingency path; the latter is an exchange-provisioning defect to repair. NQ confirms readiness and understanding; it is not a substitute for sender preparation. Independent acceptance establishes whether delivered work satisfies its contract; understanding, delivery, and acceptance remain distinct.

### One work record for execution and updates

Use the same work list to execute the assignment, attach tangible results, and report progress. Do not create a separate checkpoint hierarchy, reporting checklist, or synchronized status ledger. Recipient-proposed decomposition remains within the authorized scope; a checklist is not permission to redesign an implementation assignment. Deliverable boundaries are the default progress signals, not elapsed-time estimates or activity narration.

Receipt acknowledges the assignment; NQ establishes readiness. A completed item carries inspectable evidence. No update asks permission to continue. Blockers enter NQ when discovered. Final delivery still requires independent acceptance; intermediate updates do not imply it.

A worker that reports no deliverable for **5 minutes** gets a check-in: what prevents the next deliverable, and what support it needs. A tangible progress update restarts the window. The check-in is a question, not a deadline, a kill or a retry. Properly decomposed tasks rarely take more than 10 minutes; a task running far past that warrants examining its scope or decomposition.

### Every agent-to-agent hand-off is an NQ exchange

The recipient establishes its understanding of purpose and raises questions or ambiguities before executing. The originating agent answers: a fresh headless call playing the role that made the handoff, on that role's card, answering from its own accepted handoff and the source. Before any stage has handed off, that is the dispatcher, from the objective and source; normally it is the previous stage's role; after a failure ruling sends the work back, it is the Arbiter, from its ruling. For a delivery item, it is the discovery that found the item, from the discovery report. The originator clarifies what it handed over and never changes its handoff or the work. The recipient confirms whether anything remains unresolved.

**Operator ruling, 2026-10-16, verbatim:**

> "This is the NQ protocol. Every turn is one round. Agent A delivers the initial to B; if B has a question, that's one turn. Agent A responds; if B has a question, that's two turns. Agent A responds; if B has a question, that's three turns. If after three turns the agent is still asking questions then the issue is that their scope is not properly configured. The spec is not designed correctly. Something is wrong if the agent has to keep asking questions. So at that point, human is alerted."

> "The pipeline process is one unit of work. One unit of work traverses the four phases. Discovery is a queue. Delivery is a queue. Once a work item is started, it progresses through the four phases. You can fire these off parallel and asynchronously. It doesn't stop the whole operation. It stops the process of the single work unit. Stop saying phase, stop saying unit. It's every interaction from an agent to an agent: NQ protocol. Any interaction, I don't care if it's at the beginning, at the end, at the start, at the finish, for one unit, for one queue, for the whole process. Every interaction from one agent to another follows the NQ protocol. If an agent is spawning another agent: NQ protocol. There's no ifs, no ands, no buts, no other way around it. Agent to agent: NQ protocol. That needs to be codified, baked into Made Well, then put into pi or Claude Code, I don't care how you do it, but that is the requirement."

> "If an agent spawns another agent, they are responsible. This is a top-down cascade."

**The law.** Every interaction in which one agent hands anything to another agent is an NQ exchange:

- the sender states what it is handing over;
- the receiver states its understanding and answers three questions: What is unclear? What is ambiguous? Do I have everything I need to proceed? With nothing unclear, nothing ambiguous and everything it needs, it proceeds; otherwise it asks;
- the sender answers; that completes one turn;
- after three turns, if the receiver still has questions, the spec or the receiver's scope is wrong: that one work item holds and the human is alerted. Other work items are untouched.

No interaction is exempt. The covered interactions:

- a stage hand-off to the next stage's worker;
- the dispatcher's hand-off to the first worker: the dispatcher answers from the operator's source alone, so the source must be complete;
- the Arbiter's ruling to the responsible worker, which confirms it understands or asks;
- a failed check, or a maker or check designer that could not do its step, handed to the Arbiter: the failing step is the originator and answers the Arbiter's questions;
- an originator's "only the operator can authorize this", handed to the dispatcher, who holds the operator's source: the originator answers the dispatcher's questions;
- a human answer delivered back to a worker: the worker confirms it understands or asks, and the same count applies;
- a sub-agent a worker spawns: the spawner originates the exchange, answers for it, and puts its understanding, its answers and the result in its report.

The pipeline's own code re-asking a worker that returned a malformed result is not an agent hand-off.

**Authority.** When the originator says only the operator can authorize something, the dispatcher first reads the operator's own source. If the source authorizes it (explicitly, or as a necessary part of what it asks for) or forbids it, the dispatcher answers and the work goes on. It holds for the operator only when the source leaves it open, or it is destructive, irreversible, or touches production, money, credentials or anything outside the workspace. Shipping a promoted item, including its deploy, is already authorized (ruling 8).

**The count.**

- A turn is one answered question, whether the answer came from the originator or from the human.
- The same question carried across consecutive hand-offs counts as one question: three answers across hand-offs, and the next raise holds at once. The originator recognises a repeat in other words and says so; a claimed repeat that matches no recorded question is ignored.
- A hold stops only that work item and alerts the human. It names the hand-off, who handed the work over, who asked, the cause (questions still open after three turns or after a human answer; an authority question; three failed corrections; a cause the Arbiter could not determine; a pre-existing defect too deep) and the questions.
- Every hold alerts, once. The alert is recorded against the hold, so redriving never sends it twice, and a lost alert is sent on the next drive.

The exchange itself:

- Bind each exchange to its delegation, participants, and fixed brief.
- Clear understanding with no open questions permits execution; do not manufacture three turns for a clear brief.
- Only questions block. Assumptions and points already settled are notes: they travel, they do not count as a turn.
- A hand-off missing its required parts is refused as the receiving step's intake question: one exchange, one count. Parts must be complete, not merely present.
- After turn three, allow the recipient to confirm understanding. If questions remain, stop that work item on a durable human hold that names the originator. No fourth agent-only turn and no switching agents to get around it.
- The executing recipient receives the whole exchange: its questions, the originator's answers and any human answers.
- Human clarification and release do not themselves authorize execution: recipient confirmation is still required.
- Preserve questions, answers, confirmation, escalation, and release as inspectable evidence. The exchange is durable state: it survives a crash, and a transport retry or a card swap mid-exchange must not consume a new turn or duplicate an effect.

## A failed test is a question; the Arbiter decides whose

Every failed test is a question, and every question needs an answer from its responsible party. A failed test is the one exception that needs a determination first: **whose question is it?** The **Arbiter** decides, from the evidence. A failed check has exactly three sources; this is definitive:

| Cause | Who answers | Re-entry |
|---|---|---|
| **Bad test** | Test architect | Correct the test, then re-run verification. Valid implementation is not rebuilt. |
| **Bad implementation** | Planner | Replan the correction; then the checks and the implementation are redone in parallel, and verification follows again. |
| **Pre-existing defect** | A linked prerequisite work item | The defect is fixed through its own plan → checks and implementation → verify. The original work waits, then re-runs its checks. |
| **Undetermined** | **The human** | The Arbiter cannot decide from the evidence: flag the human, who names the cause and answers. |

The answer goes to the responsible party as its assignment for the new round; prior attempts stay on the record. Three corrections that still fail hold for the human, and so does a pre-existing defect found more than two prerequisites deep.

**A pre-existing ruling authorizes its fix.** When the Arbiter rules a failure pre-existing, that ruling authorizes the fix item to repair the defect inside the workspace, with reversible changes and no new dependencies. Destructive, irreversible, money, credentials or anything outside the workspace is still the operator's; shipping the fix item is authorized (ruling 8).

## The maker never verifies its own work: stages are the separation

*Operator ruling, 2026-10-12.* This is built into Made Well itself. Every stage is a different agent, and every stage hands off to the next; the maker never writes or runs its own check, and the checks are run by Made Well, not by an agent (ruling 14). Handoff to a different agent is the acceptance. No additional reviewer, receipt or evidence-binding layer sits on top of the stages.

## Recoverability: redrive the saved state

The work item is the durable object, not the agent. Every transition is saved before the next job starts. Recovery is redriving the saved state: a worker that is killed resumes at the interrupted job, and a worker that exits with an error is redriven the same way. No reconciliation grants, ownership inspection or replacement paperwork.

## Uninterrupted: prescribed cards, automatic swap

Every job has a prescription. Prescriptions are a config file: each agent job maps to a tier, an access level and a budget; verification, which is Made Well's own code, has a budget only (each check's timeout). Each tier maps to an ordered list of cards spanning several provider accounts. A card is always harness + provider + model (+ effort). Quota belongs to the provider account, not the harness.

When an account hits its usage limit, it is marked out until its reset and the same job continues on the next card in the same tier on another account, in the same workspace, told it is picking up the work. The swap is written to the work record. When every account is out, the work waits for the earliest reset and continues by itself. A usage limit never reaches the human. *The operator called this non-negotiable on 2026-10-21.*

**One disposable worktree per agent call, for now.** Each call works in its own worktree of the product repo, removed when the call ends; Made Well alone brings the change onto main. A VM or sandbox per item is the likely direction, but that infrastructure is not built until the industry settles.

## Work-level observability

The operator's primary questions are: **Is the work done? What result and acceptance evidence establish that? If not, what remains, what is blocking it, and who owes the next action?** Observe the work, not the agent's internal reasoning or individual tool-call sequence. Internal execution details may remain diagnostic evidence, as in the debug mode; they are not a prerequisite for work recovery or the primary progress interface.

A failed or lost worker does not end the work: it is redriven on its saved state. A viewer never becomes a scheduler, acceptance authority, or second tracking system.

Visible completion comes from recorded acceptance, not model-written status, process presence, or a timer. A stale observation is not proof of success. Views are disposable, written after each saved transition; the durable record is the one authority.

## Architecture as built

*Recorded 2026-10-22. This describes the implementation. Where it differs from the law above, the law governs and the difference is a named gap.*

- **One command, `mw`.** A TypeScript + Effect program bundled into one file, installed globally from GitHub. Every command prints JSON; `mw` alone prints the manual, generated from the command table. Every failure is a closed error code with the facts to act on and `next` commands. `mw next` returns the one action to take: run, relay to the operator, or wait.
- **Made Well's home** (`~/.local/share/madewell`, or `MW_HOME`) serves every project on the machine: the store (`madewell.db`, one SQLite file: items, events, calls, tool events, accounts, the runner claim, evals), `projects.json` (each project's ship and alert commands, its gates and its prepare command, written by `mw init`), the glass (`glass.html`, rewritten after each saved transition), the per-call worktrees, and each item's patch and checks until it ships. Nothing of Made Well is written into a product repo.
- **The engine** drives each item from its saved state, one step at a time; each step is a traced Effect span. `mw run` drives every item that can move, up to `parallel` at once (default 3). An item that builds on others (`after`, declared by discovery) starts once they ship. A hold stops only its own item.
- **Every agent call** opens with its NQ exchange: intake runs with no tools on the cheap `intake` tier and answers the three questions as JSON; the originator answers; three turns that still leave questions, or a question of authority, hold the item. The job then runs in its own worktree of the product repo at the current main, which the project's prepare command first makes usable (dependencies, env, a database; what it provisions is torn down like an agent's, and a failure holds the item), inside its prescribed access (`read`, `checks`, `make`, `run`), budget, allowlisted tools and environment, in its own process group. A read call that writes, a maker outside the plan's scope, files left in the product repo, changed git settings, a moved main and a malformed answer are each refused or held, deterministically. When the call ends, its worktree is removed, its processes are killed, including any that left the group, and what it reports as provisioned is torn down once.
- **The lane.** Discovery: the ideator turns raw notes into candidates; the operator promotes them. Delivery: ideate (ideator) → challenge (ideation peer) → plan (planner: scope, done-when ids, and for each new file the existing one it follows; a plan that creates a kind of file the repo already has without naming one is refused, and the makers receive the followed file) → implement (implementer) and write the checks (test architect) in parallel, blind to each other, the test architect preferring a different harness → verify: Made Well applies the change on the current main, runs the project's gates on the files it changed (a gate's fixes join the change; a failing gate goes to the Arbiter, and the dispatcher answers for it), and runs only the item's checks. A pass fast-forwards main and runs the project's ship command; if main moved in between, the checks run again. A failure goes to the Arbiter with the logs, and its ruling routes the work as in the table above.
- **Briefs.** One shared brief for every call (the experience rubric, the neutral host, conservation, the sub-agent rule), plus a packet: the item, what this job receives, a snapshot, its role and its exchange. Answers are schema-first JSON.
- **Harnesses are data.** Built-in entries for Claude Code, Codex, pi and Amp; operators add or replace entries in the prescriptions without code. A card is harness + provider + account + model + effort.
- **Observability.** The store keeps every call in full: brief, packet, answer, raw stream, tool events, tokens and rule-break flags. `mw status`, `show`, `holds`, `export` and `replay` read it. With `MW_TELEMETRY`, every event, call, refusal, eval and span is also appended to the machine's own JSONL file, stamped with the build and the harness version (`MW_TELEMETRY_LEVEL=metrics` drops free text); `mw stats` reads the files from every machine. `mw eval` replays recorded calls on another card or brief and recommends the cheapest card that matches. `mw prune` removes finished work and returns the space.
- **Demonstrated:** the whole pipeline with a scripted worker in the tests; live runs on Amp only (discovery, NQ and planning on this engine; six items shipped on the previous one). The Claude Code, Codex and pi entries follow their documentation and have not run live.
- **Named gaps:** the five-minute check-in is not implemented; calls have wall-time budgets instead. No VM or sandbox per item.

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

Any proposed implementation or evaluation must distinguish **required**, **implemented**, and **demonstrated**. Missing enforcement is a named gap to close, not permission to discard the rule.
