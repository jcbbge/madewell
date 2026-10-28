# Foundation

The operator's law for Made Well. It binds every implementation, every agent and every evaluation.

## Governing model: capture input → generate tasks → complete tasks

*Operator ruling, 2026-10-28. This section records the operator's three-step diagram and clarification. It takes precedence wherever older rulings or implementation descriptions below make the software-delivery pipeline the identity of Made Well or impose it on every kind of work. The core is preserved; this is not permission to discard NQ, durable work records, answer reuse, independent acceptance or recovery.*

**Made Well is a work OS: a notebook for a to-do list.** It is agnostic to framework, platform, provider, model, tool, technology, industry, team and organization. Software delivery is one application of it, not its definition. A task need not concern code, a repository, a build, a merge or a deployment.

**There are three top-level steps:**

1. **Capture raw input.**
2. **Generate the task list.**
3. **Complete the task list.**

These are not three agent profiles or three software-delivery phases. Delivery belongs inside each task. Do not replace this model with one undifferentiated pipeline for every input.

### Step 1): Capture Raw Input

The diagram's input box reads:

```text
RAW INPUT
- notes
- transcripts
- documents
- specs/briefs
```

An arrow leads from raw input into a group containing these operations, top to bottom, with the operator's exact spelling and capitalization:

```text
Declare()
lookFirst()
classify()
Lenses()
oneThing()
route()
confirm()
```

The connector leaves this whole group and enters the task-list group. Raw input is not drawn going directly into implementation. These labels do not prescribe seven agents, seven model calls or seven new subsystems. The diagram establishes their names and placement, not additional function contracts invented by an implementer.

### Step 2) generate task list

The task list contains separate tasks. The diagram shows three, colored pink, green and blue, each labelled `TASK X`. Each contains its own delivery:

```text
TASK X

delivery(){
    ideation()
    planning()
    implementation()
    verification()
}
```

In each task, the four function boxes appear horizontally in that order. `ideation()` and `planning()` are faded; `implementation()` and `verification()` are darker. The diagram provides no legend defining the faded state. Preserve that distinction without asserting that it means optional, already complete or skipped, and without turning every listed function into a mandatory fresh agent call.

**The task is the unit of delivery; the task list is the organizing object.** Implementation means carrying out that task; verification means checking its result against its acceptance conditions. Neither inherently means coding or running software tests. A simple file edit must not acquire the entire software-delivery pipeline merely because Made Well records it. Complex work must retain its separate tasks, context and completion evidence rather than being flattened into one oversized assignment. Reuse settled decisions and answers; the operator must not repeatedly reconstruct the work for each agent.

### Step 3) complete the fucking task list

Each illustrated task has its own right-pointing arrow to its own same-colored result box. All three result boxes read:

```text
TASK X
Delivered
```

There is no arrow chaining the tasks to one another. The diagram does not mandate serial or parallel scheduling. Each task must reach its own verified delivered result; a generated list or an agent's claim is not completion. What constitutes delivery comes from the task's contract, not a universal requirement to merge code or deploy software.

### Every block is a function; every run produces data

*Further operator ruling, 2026-10-28. This governs capture, task generation, delivery and their constituent operations, not only calls to agents. It supersedes any older wording that makes detailed capture optional debug output or treats telemetry, metrics and evaluation as expendable peripherals.*

**Every step, phase and block in the diagram is a function: it accepts input and produces output.** Composed functions are functions too. In delivery, `ideation()`, `planning()`, `implementation()` and `verification()` each have an input/output contract every time a task traverses them. Their combined calls and outputs constitute the task's delivery checklist and its evidence of completion. Keep those contributions linked to the task; do not replace them with an untraceable final summary or a separate status ledger. A function call is not necessarily an agent call, and a stable contract does not mean an agent returns identical content on every run.

**Every single run must be inspectable as structured, machine-readable data.** Capture:

- **Identity and linkage:** the function called, its implementation/version, invocation identity, parent call, task and run, including separate attempts and nested calls.
- **Before the call:** the actual arguments, effective configuration, incoming state and outputs from preceding calls that form this call's input. Record invocation before execution so an interrupted call does not disappear.
- **Inside the call:** runtime variables and state changes, intermediate values, nested function and tool calls, events, logs and errors. Instrument the computation, not just its outer start and finish. Externally inaccessible internals must be identified as unavailable, never fabricated or described as captured.
- **After the call:** the actual returned output, outgoing state, acceptance/check results and the connection to the next consumer. Preserve failures, partial output and interruption evidence; no return is not a successful return. A future return cannot be recorded before execution: before/after means the incoming values and prior returns versus this call's actual result.
- **Telemetry and metrics:** timing, duration, outcome and available resource/usage measurements linked to the invocation that produced them. Unknown measurements remain unknown, not zero. Metrics are derived from recorded executions, not substituted for their inputs, outputs and logs.
- **Agent-call configuration:** the effective prompt and supplied context, profile, harness, provider, model, settings, tools and their results, alongside the returned response. Capture the configuration actually used, not merely its defaults. This records observable execution data, not inaccessible model internals. Credentials and secret values are redacted explicitly rather than exposed in traces.

The same durable record supports detailed inspection, aggregate metrics and evaluation. A simple task may have a small trace; it does not get an invisible execution path. A concise user-facing view must not discard the underlying evidence. Capture remains available for failed and interrupted runs and is not conditional on a debug toggle. Existing access boundaries, including independent maker/check-design isolation, still apply: recording evidence does not grant every worker access to it.

**Evaluation is a required capability.** The operator needs to inspect a function's recorded input/output, vary its arguments or configuration, run it again, and compare the results. For agent functions, tunable inputs include prompts, settings and profiles. Preserve the baseline, the changed inputs, the resulting outputs and the acceptance evidence so the effect of a change can be assessed. Evaluations must distinguish replay of saved evidence from fresh execution; repeating a side effect still requires its normal authority and an appropriate isolated environment. A comparison does not itself authorize automatic tuning or changes to live work.

**Actual use generates the evidence.** Agents must use Made Well for work managed through Made Well, rather than doing the work outside it and entering a completion claim afterward. Synthetic fixtures help test the machinery but do not replace data from real runs. The requirement is a simple work model with rich execution evidence—not simplification by deleting telemetry, metrics, logs or the evaluation capability. Observing agents remain read-only; the existing execution roles produce the runs.

### Every node is a replaceable cartridge; visibility is the minimum

*Further operator ruling, 2026-10-28.* Every function, module and node is a component that plugs into the console. The four delivery functions and seven capture/discovery functions are defaults, not compulsory slots. Domain, organization, team, function and task may each need a different composition. A flow may contain one node, ten, a thousand or none. Implementation alone is valid. Additional delivery steps, nested verification steps, and replacements for `Declare()`, `lookFirst()` and `classify()` must not require rewriting the console. Empty composition performs no work; it must never masquerade as verified delivery.

The extension model takes its direction from pi.dev: discoverable contracts, replaceable components and explicit reload/update lifecycle. Made Well must know what is installed/configured, what each node accepts and returns, which version a run uses, and how to validate and apply an update. Hot swapping preserves accepted work and the configuration of a call already in flight; replacement takes effect at a saved boundary. Updates are recorded, never silent mutations of historical runs. An extension cannot bypass NQ, recording, authority or saved-state recovery.

**A bare-minimum live display is required, not optional.** Show the work list, actual configured nodes, current call, last activity/heartbeat, elapsed time, failures, holds and observational signs of silence or repetition. Expose each call's arguments, outputs, logs and available metrics. Explicitly distinguish a stopped runner, stale observation, failed call and completed work. Unknown usage is unknown, not zero. The display reads the same durable record as the agent; it is not a second scheduler. The operator's supplied screenshot is a non-authoritative example of visibility, not a mandated layout, simulated dataset or new approval policy.

**Implementation, 2026-10-28:** `runtime: "functions"` packs extend the existing pack registry with ordered agent/command nodes and nested composition. They need no Git repository or fixed stage names. Agent nodes use the existing NQ/card machinery; command nodes use a JSON stdin/stdout boundary and captured stderr. `mw cartridges` inspects and validates packs; per-task overrides and boundary updates are explicit. The existing software runtime remains available with its maker isolation and shipping guarantees. Function completion means its configured output contracts passed, not an implicit software test, merge or deploy. Trusted command extensions run with the host process's permissions; this is not a plugin sandbox. Locals are visible when extensions emit them, not through automatic inspection of arbitrary process memory. Package downloading, automatic upgrades and full pi extension API compatibility are not implemented.

Decision: **DX hit** — composition changes in data rather than engine branches, at the cost of maintaining the software compatibility path. **UX hit** — a live, minimal read surface makes failures and lack of progress visible, at the cost of a separate detailed legacy view. **AX hit** — explicit node contracts, pinned configurations and durable call evidence support inspection and tuning, at the cost of trace volume. The same store and runner remain authoritative; no new inference provider, scheduler or automatic repair policy is added.

### Readable by default; inspectable in depth

*Operator direction, 2026-10-28:* use Impeccable's design guidance, a good monospace for system messaging, and proportions derived from the primary font. The audience is nontechnical. Default to the high-level picture and offer deeper inspection without discarding evidence.

The work display starts with the task, its plain-language state, what happened, what needs attention and its configured steps. Calls, metrics, configuration, raw inputs/outputs and logs are behind explicit disclosures. A stopped runner is not completion; an empty composition explicitly says no work was performed. Silence or repetition is an observation, not a diagnosis. The observing agent explains the next action; this view does not move work.

The implemented design uses locally served IBM Plex Sans for prose and IBM Plex Mono for system messages, statuses, timestamps and technical data. The primary 16px type has a 24px line; its quarter-line gives a 6px spacing unit, expressed in rem so proportions follow text scaling. [DESIGN.md](DESIGN.md) records the tokens, audience and interaction rules. Impeccable's typography, distillation and craft guidance informs this implementation; its defaults do not override the operator's explicit monospace requirement.

Decision: **UX hit** — understandable status before diagnostics, with the cost of one extra disclosure for technical inspection. **DX hit** — shared font-derived tokens and native disclosures instead of a component framework, with two small licensed font assets to maintain. **AX hit** — the complete trace remains available through the same read API, without another status model; detailed browser inspection requires opening the disclosures. No new worker, scheduler or authority is introduced.

### Scope and implementation honesty

The software-specific stages, six profiles, worktrees, checks, merge and deployment rules below describe the software delivery configuration where applicable. They must not redefine the platform-agnostic work model. NQ still governs every actual agent-to-agent exchange; it does not require creating an exchange where the work needs none. This clarification preserves the core, not every accumulated implementation detail.

**Required is not implemented merely by writing it here.** The implementation and its evidence must state which parts of this model actually run. The compatibility software pack still defaults to the older software pipeline; a function pack opts into the open composition. Resolve remaining gaps against this model, not by rewriting the operator's intent to match the engine.

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

## Rulings of 2026-10-24

15. **Made Well is a console that takes cartridges.** `madewell()` is two while loops: discovery takes raw input (notes, transcripts, meetings) and returns what it discovered; delivery takes each discovered item and returns it delivered. The console is the fixed part: the loops, the durable item, NQ, holds, card swaps, recording and visibility. Cartridges plug into it, each a function with a contract: the shape it accepts and the shape it returns, the same shape every time for the same shape of input. Cartridges can be swapped, added and removed: delivery can run three phases or ten, and testing can be unplugged. The four stages and six profiles of this document are the default, minimal cartridge set, for software. Made Well is about work, not software: it is agnostic to provider, runtime, model, harness, platform, environment, machine, user and the kind of work (software, design, product, finance, marketing). It is built for largely non-technical people, and nothing specific to one host, orb or product goes into it. It is the next iteration of what exists, not a rewrite. See "Console and cartridges".
16. **The operator talks to one agent, and it stays outside the glass.** Nobody wants a thousand agents. The operator has one agent, the operator's agent, the one they talk to. It looks into the machine from outside and never enters it. It sees every record, log, trace and metric; it narrates, explains and reports the state of every item, step and call, so the operator never searches, digs or opens the hood. It never moves the work. See "The operator's agent".
17. **The operator chooses how involved to be: three levels of autonomy.** Made Well is a vending machine: put in the input, turn the knob, get the shipped result. **Checkpoints is the default:** pause after discovery to steer and promote, and at the end of each item's delivery before it ships. **Every step** also pauses between delivery phases. **Full** autonomy is an explicit opt-in: raw input in, discovery, every candidate delivered and shipped without routine stops. People start with visibility and control, then reduce checkpoints as they become comfortable. Explicit project and item settings are preserved. The level is a convenience, never a change to the work: the same steps run, with or without stops. Commands that give the machine work start it; a project can turn that off and start the runner itself. See "Levels of autonomy".
18. **The three questions are the standing rubric for every decision.** What leads to a world-class developer experience? What makes a memorable and lovable user experience? What gives an efficient, optimized agentic experience? Judge each leg through its 3×3 matrix, then enforce the triple gate: all three hits → build with conviction; two → proceed; one → reshape or stop; zero → stop. Under NQ the delegating agent holds the context and responsibility: resolve from context → repository intent and purpose → rubric. After three answered turns, unresolved questions hold for a spec/plan/dossier defect at every autonomy level; full autonomy never resets the bound.
19. **Shipped means the whole thing.** The item's change is added and committed, its gates and checks are green, it is merged onto main, pushed, and deployed by the project's ship command. The commit carries the item's purpose and the decisions that shaped it, so the wall records why each brick was laid; that is the work's own history, not a trace of the agent (ruling 13). A project without a ship command ships once main is pushed to its upstream, or once the change is on main when there is no upstream.
20. **Apply the rubric; do not send routine design choices back to the operator.** Made Well's implementation and its foundation are malleable. When a change advances at least two of developer, user and agentic experience, make the change, update the governing text and stale supporting instructions, and test it. A written rule is not an excuse to preserve a defect or ask for the same decision again. This standing authority covers reversible development work, not unrelated external actions, secrets or destructive operations. The operator's agent remains outside the running pipeline; maintaining Made Well is separate development work.
21. **The locked rubric is the default; a decision model is optional help.** The [three-legged rubric](dossiers/2026-10-24-three-legged-rubric.md) and [decision-model cartridge](dossiers/2026-10-24-decision-model-cartridge.md) dossiers govern the matrices, threshold, vending-machine principle and decision seam. No inference provider is wired. The optional `decisionModel` prescriptions entry selects an enabled registered renderer; absent, disabled, invalid, unknown, failing or timed-out cartridges use the in-process rubric. The console owns authority, NQ, holds and state. A renderer never becomes another stage. The structured operator hold UX is deferred.
22. **One trace, three fixed lenses.** The [observability-lenses dossier](dossiers/2026-10-24-observability-lenses.md) governs B2: UX / 30,000 ft is the done/not-done light switch with actual acceptance evidence; DX / 15,000 ft is pipeline and live diagnostics; AX / 0 ft is the work/job/invocation/tool tree with inputs, outputs and live stream evidence. All read the existing durable store. Live fragments, tool activity, heartbeat and observational silence/no-progress/repetition/parse/duration signals are saved while the call runs, including interrupted attempts and ship/alert commands. Render targets are optional cartridges over that core; their absence or failure cannot change the work. B2 never acts on its signals: no new loop-breaking, retry shaping or self-correction. Existing debug spans remain optional; AX capture is independent of that toggle.

## Rulings of 2026-10-25

23. **The operator may name the cause after two environment rulings.** An `environment` hold is not a wall. `mw answer <id> --cause implementation|test|pre-existing` is accepted on it, and the named cause routes the item exactly as an Arbiter ruling of that cause would. A retry on an environment hold runs the held step again in a fresh worktree, never the Arbiter. Every ruling, including one that holds, is saved as a `ruling` event before the `held` event, so the record carries the cause and not only the prose.
24. **An unattended project declares how it alerts.** Full autonomy means nobody is watching, so `mw init --autonomy full` requires an alert command, and a project without one cannot be set to full. Every hold records its alert outcome once, delivered or not, with the reason; a project with no alert command is never swept for alerts.
25. **Field findings are work.** A field review of a run (the observer skill) produces issues on the tracker; each is taken as an item through this pipeline or fixed directly, never left as a note. The first review, of the 2026-10-25 run, produced issues 5 to 14.

### Recovery implementation decision, 2026-10-26

A test-only recovery track with a kept implementation is a correction, so intake and execution receive the candidate and its existing checks. The initial implementer/test-architect split remains blind. An operator's cause answer on an environment hold clears the obsolete maker split before routing to planning, check correction or a prerequisite; environment retry remains available. Environment rulings are recorded before a second ruling holds the item. **DX hit, cell 4:** the documented recovery commands work without private-state repair. **UX hit, cell 4:** delivery resumes without another round of operator setup. **AX hit, cell 1:** the correct saved work is available and its transition is inspectable. Cost: a bounded correction branch and recovery regression coverage; no new workflow or authority. Engine tests demonstrate the resumed test-only track and all three cause answers; a production delivery still needs its own live evidence.

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
| Developer experience | What leads to a world-class developer experience? Leverage × friction-to-adopt. |
| User experience | What makes a memorable and lovable user experience? Delight × cognitive load, including beauty, visual craft and clutter. |
| Agentic experience | What gives an efficient, optimized agentic experience? Capability to act and verify × ambiguity. |

**None has default priority over another.** Equal standing does not require identical gains, prohibit every regression, or demand a numerical score. Do not collapse developer experience into agent convenience or user experience into developer convenience. Distinguish their needs even when one person occupies multiple roles.

**“Toward 10×” is a directional ambition, not a demand for a provable multiplier.** Compare plausible choices using grounded reasoning about what gets closer to a substantially better experience in each category. Use measurements where meaningful, but do not fabricate precision or refuse to exercise judgment because the benefit is partly subjective. User experience includes usefulness, enjoyment, confidence, and a memorable, lovable product; agentic experience includes avoiding wasted tokens, time, effort, energy, and money.

The gate always runs, with a fixed threshold. Each leg's hit/miss is a judgment through its nine-cell matrix, not a blind tally or a hard-coded pass by cell number. Name gains, costs and rationale for DX, UX and AX. All three hits is something special; two permits proceeding; fewer than two requires reshaping or stopping; zero means do not build. The complete cell-level verdicts and actions are in the governing rubric dossier and travel in every worker brief. The gate validates the structure and arithmetic, not the truth of an agent's judgment.

Compare alternatives in the context of what is being built toward. Favor the choice that best advances the whole, rather than the one with the most impressive isolated benefit. Settle trade-offs with this rubric; they are never sent to the operator.

### Waste is diagnostic; clarity is the remedy

Wasted tokens, time, money, effort, resources and human attention are symptoms of upstream ambiguity, defective specifications, improvisation or over-complication. They are not a fourth leg or a new axis. Eliminate the cause by front-loading clarity; do not build cost/token machinery and mistake it for the solution.

Prefer appropriately scoped context, bounded exchanges, reused valid evidence, deterministic enforcement, and recovery that avoids duplicated work. Measure resource expenditure against useful, independently accepted progress and preserved correctness. Do not assume that fewer calls are necessarily better, or that more structure earns unlimited calls. Each optimization must demonstrate its benefit.

## Discovery and delivery: two vending machines

*Ruling of 2026-10-21. It supersedes the earlier rule that discovery fed delivery first in, first out, with nobody approving it and no go-ahead.*

*Read under the governing three-step model of 2026-10-28: discovery generates tasks from captured input; delivery completes each task. The software outcomes below are configuration-specific, not the definition of all work.*

- **Discovery:** raw context (notes, transcripts, meetings) in → a list of candidate work items (features, bug fixes, chores) out. Discovery preserves sources, establishes understanding, surfaces uncertainty, and distills the source into separate items. The items form a queue.
- **Promotion:** the operator chooses which items to promote. Each promoted item runs on its own through the one shared delivery pipeline. Items may run in parallel; a stop in one item stops only that item.
- **Delivery:** one work item in → that item delivered: checks green, merged to main, deployed to production. It takes the item through the inner loop under a bounded contract. Verification ships automatically when every check passes; when a check fails, the Arbiter rules on the cause. There is no separate ship stage.

Every item carries its purpose, decisions, scope, and acceptance conditions across the seam, with the discovery report as its handoff. The source is preserved, not replaced by a summary.

## Console and cartridges

*Operator ruling, 2026-10-24 (ruling 15).*

```
madewell() {
  while (rawInput: notes, transcripts, …) { console discovery() { cartridge … cartridge; return discovered } }
  while (discovered)                      { console delivery()  { ideation() planning() implementation() verification() } }
}
```

- **The console** is what never changes: the two loops, the durable work item and its record, NQ at every hand-off, holds and the operator's answers, prescribed cards and the quota swap, aftercare, and the views. Every guarantee in this document that is not about a particular stage belongs to it.
- **A cartridge** is a unit of work plugged into a loop: a named step or group of steps, each with a profile, a duty, what it receives and the shape of what it returns. The console accepts a cartridge only when it honors the contract, checked deterministically before any work runs, and holds every deliverable to its declared shape.
- **Swappable.** Discovery can hold one cartridge or eight; delivery can run three phases or ten, and a cartridge can be unplugged, testing included. What the console's own machinery acts on stays the console's contract: the plan's scope and done-when items that hold the makers, the blind split of the makers, and Made Well's own run of the checks, merge and ship. Unplugging testing leaves verification to the project's gates.
- **The default cartridge set** is software development: the four stages and six profiles of this document. Other kinds of work bring their own set; the console does not change for them.

**Implemented, 2026-10-24.** A cartridge pack is a JSON file: discovery's and delivery's cartridges in order, each a list of steps with a profile, a duty, what it receives and, for a thinking step, the JSON Schema its deliverable must match. The console keeps five slots whose deliverables its machinery acts on: `discover` (the last discovery step, returning the candidates), `plan` (scope and done-when), `implement` and `test-plan` (the makers, run blind in parallel; `test-plan` may be unplugged) and `verify` (Made Well's own run, merge and ship); the arbiter is the console's too. The contract is checked before a pack is registered (`mw init --cartridges`), every item carries the pack it started with, and `mw cartridges` prints the pack a project runs. The software pack is the default. Demonstrated with a scripted worker; no live run of a non-default pack yet.

## Six agents, one per job

| Profile | Responsibility |
|---|---|
| **Ideator** | Understand, shape, and explore the work. Also runs discovery. |
| **Ideation peer** | Challenge, strengthen, and sharpen ideas. Failure questions route through NQ to the responsible answerer; this profile is not automatically the answerer for every failure. |
| **Planner** | Inspect the actual environment and produce the grounded plan and actionable contract. |
| **Test architect** | Derive the checks from the agreed plan, in parallel with the making and blind to it. |
| **Implementer** | Execute the fixed implementation instructions without changing scope. |
| **Arbiter** | Rule on a failed check: whose question it is. Ruling on a failure is its own job, separate from the ideation peer. |

Verification is not an agent. Made Well runs the item's checks itself, merges and ships on a pass, and calls the Arbiter only on a failure (ruling 14). Three parties sit outside the six: the **dispatcher** starts, stops and steers work and never does it; the **operator** is the person who decides; the **operator's agent** is the one agent the operator talks to, which watches through the glass and never moves the work (ruling 16).

The six agents separate the ideator from its challenging peer and separate test design from implementation and from test execution. The planner grounds work in actual sources; the implementer follows the plan; the test architect derives checks from the same plan without seeing the making; Made Well runs the checks. No agent accepts its own contribution. Profiles are not permanently running processes: each job is one call on its prescribed card.

**After planning, the implementer and the test architect are vending machines.** They execute the plan. They do not think, plan, design or improvise, and they never change the spec under everyone else. If the plan cannot be done as written, they stop and report it, and the Arbiter rules.

## Inner loop: ideation → planning → implementation → verification

These four responsibilities are distinct within a task's delivery. The following describes the software delivery configuration, not four mandatory fresh agent stages for every task in Made Well:

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
- after three answered turns, if the receiver still has questions, the spec, plan, dossier or receiver's scope is wrong: that one work item holds and the human is alerted. Other work items are untouched. This bound applies in full autonomy too; no fourth answer and no reset.

No interaction is exempt. The covered interactions:

- a stage hand-off to the next stage's worker;
- the dispatcher's hand-off to the first worker: the dispatcher answers from the operator's source alone, so the source must be complete;
- the Arbiter's ruling to the responsible worker, which confirms it understands or asks;
- a failed check, or a maker or check designer that could not do its step, handed to the Arbiter: the failing step is the originator and answers the Arbiter's questions;
- an originator's "only the operator can authorize this", handed to the dispatcher, who holds the operator's source: the originator answers the dispatcher's questions;
- a human answer delivered back to a worker: the worker confirms it understands or asks, and the same count applies;
- a sub-agent a worker spawns: the spawner originates the exchange, answers for it, and puts its understanding, its answers and the result in its report.

The pipeline's own code re-asking a worker that returned a malformed result is not an agent hand-off.

**Authority.** When the originator says only the operator can authorize something, the dispatcher first reads the operator's own source. If the source authorizes it (explicitly, or as a necessary part of what it asks for) or forbids it, the dispatcher answers and the work goes on. It holds for the operator only when the source leaves it open, or it is destructive, irreversible, or touches production, money, credentials or anything outside the workspace. Shipping a promoted item, including its deploy, is already authorized (ruling 8). In full autonomy the dispatcher decides even what the source leaves open, by the rubric (ruling 18); only what the machine cannot supply, such as a credential it does not have, still holds.

**The count.**

- A turn is one answered question, whether the answer came from the originator or from the human.
- **Answer once; reuse thereafter.** Questions, answers, their authors and reuse references are durable evidence, not a counter that permits three repeats. Every subsequent handoff receives the relevant saved answers, including those inherited from discovery or a prerequisite. Exact repeats are resolved from the store without another originator call. Intake or the originator recognises a paraphrase and references the saved answer's id; Made Well validates that id, supplies each distinct recorded answer verbatim once in the handoff and saves the new wording as an alias. Aliases retain their original ids, questions and authorship; exchange notes and reused parts reference those ids rather than embedding earlier answers. Older expanded history is compacted when read, without rewriting the durable record. Unknown ids are refused. Reuse never asks the operator again or spends a clarification turn. Only a genuinely new question or materially changed facts can reopen the exchange; say what changed. The independent makers never receive each other's private exchanges.
- A repeated execution failure reapplies its saved correction without asking it again. Three unsuccessful reapplications hold with the failure and correction evidence; retrying never invents another answer.
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

## Levels of autonomy

*Operator ruling, 2026-10-24 (ruling 17).* The operator's involvement is theirs to choose, from every step to none. The level is set per project (`mw init --autonomy`) and can be set for one discovery or item when it starts; candidates inherit their discovery's level.

| Level | Stops | Questions that would go to the operator |
|---|---|---|
| **checkpoints** (default) | after discovery (the operator promotes); at the end of each item's delivery, before it merges and ships | flagged to the operator |
| **steps** | the checkpoints, and between the phases (cartridges) of delivery | flagged to the operator |
| **full** (opt-in) | no routine checkpoints: discovery promotes every candidate, and each ships when checks pass | context → repository intent → rubric within NQ; unresolved after three turns holds for a spec defect |

A stop is a checkpoint, not a hold: nothing is wrong. The operator goes on (`mw go`), steers (`mw answer` with what should change, which the next step receives as the operator's word), or drops the item. Holds for things the machine cannot do itself (a failing ship or prepare command, three failed corrections, a credential it does not have) stop the item at every level.

**The machine starts itself.** Every command that gives Made Well work (`discover`, `start`, `promote`, `answer`, `go`, `retry`) starts a runner when none is alive, so turning the knob is the whole act. `MW_AUTORUN=0` turns that off for operators who run `mw run` themselves. Nobody else is ever told to run the machine.

## A failed test is a question; the Arbiter decides whose

Every failed test is a question, and every question needs an answer from its responsible party. A failed test is the one exception that needs a determination first: **whose question is it?** The **Arbiter** decides, from the evidence. A failed check has exactly four sources; this is definitive:

| Cause | Who answers | Re-entry |
|---|---|---|
| **Bad test** | Test architect | Correct the test, then re-run verification. Valid implementation is not rebuilt. The correction is written against the candidate the checks ran on: the architect's checkout holds the kept implementation as its last commit and its previous check files beside it, and only the checks are its to change. |
| **Bad implementation** | Planner | Replan the correction; then the checks and the implementation are redone in parallel, and verification follows again. |
| **Pre-existing defect** | A linked prerequisite work item | The defect is fixed through its own plan → checks and implementation → verify. The original work waits, then re-runs its checks. |
| **Environment** | Made Well | The work is not at fault: the worktree, its preparation, a service it needs or the machine failed. Made Well prepares a fresh worktree for the step that failed, prepared as before, and runs it again (the checks, or a blocked maker's job); nothing is rebuilt. A second environment ruling in a row holds the item at that step with the evidence, because the project's environment is the operator's configuration; a retry runs the step again, never the Arbiter. |
| **Undetermined** | **The human** | The Arbiter cannot decide from the evidence: flag the human, who names the cause and answers. In full autonomy the Arbiter must name the cause the evidence best supports instead. |

Before the Arbiter is called, Made Well runs each failing check once more on the same candidate, so a flaky check never reaches it, and hands it the environment's evidence with the failure: the prepare output, what was torn down, and whether main moved.

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

The operator's primary progress questions are: **Is the work done? What result and acceptance evidence establish that? If not, what remains, what is blocking it, and who owes the next action?** The progress view answers these concisely; the underlying record must also expose every function's arguments, observable runtime values, nested calls, returned outputs, logs and metrics as required by the 2026-10-28 function/data ruling. Detailed execution evidence is mandatory, not optional debug-only data. Progress and diagnostics are views of the same record, not competing definitions of observability.

A failed or lost worker does not end the work: it is redriven on its saved state. A viewer never becomes a scheduler, acceptance authority, or second tracking system.

Visible completion comes from recorded acceptance, not model-written status, process presence, or a timer. A stale observation is not proof of success. Views are disposable, written after each saved transition; the durable record is the one authority.

## The operator's agent: outside the glass

*Operator ruling, 2026-10-24 (ruling 16).* The industry builds agents for everything. The operator wants one: the agent they talk to, a white-glove service through the whole process. It was once called the concierge; that role inside the pipeline is gone. What remains is this agent outside it.

- **Outside, looking in.** The engine shop is the six profiles, the dispatcher and Made Well's own code. The operator's agent never enters it: it is not a profile, takes no job, joins no NQ exchange and holds no card in a prescription. It is whatever agent the operator already uses, in any harness, on any machine.
- **It sees everything.** Every part of the process is durable, logged and traced, so it can follow any item through any step: the store, every event, every call with its brief, packet, answer and stream, the spans, the live output of a step in flight, the telemetry and the metrics. Its window is Made Well's read surface: the JSON every `mw` read command prints (`next`, `status`, `show`, `holds`, `export`, `stats`, `watch`), and the console's JSON (`mw ui`: `/api/model`, `/api/item/<id>`, `/api/call/<id>`, `/api/spans/<id>`, `/api/live/<file>`). Whatever surface Made Well exposes later (an API, an MCP server) is a wider window, never a door.
- **It narrates and explains.** At any moment it can say what is done, what proves it, what is running and what that agent is doing, what holds and why, and who owes the next move. When something needs the operator, it lays out the decision in plain words: what was asked, what each answer would cause, and the exact command that carries it out. It answers the operator's questions about the work from the record, so the operator never has to search, dig or read a log themselves.
- **It never moves the work.** It does not start, run, answer, retry, promote, drop, prune or edit anything in Made Well, its store, its home or the product repo, and it never speaks for the operator. A decision is the operator's: the agent prepares it and the operator makes it. Fixing Made Well itself is separate work with its own authorization; it is never a remedy the observing agent applies on its own.

Made Well serves this agent by making the record complete and self-explaining: every state durable, every failure with its facts and `next` commands, every view derived from the store. A gap the agent cannot see through the glass is a defect in Made Well's read surface, not a reason for the agent to go inside.

## Architecture as built

*Recorded 2026-10-22. This describes the implementation. Where it differs from the law above, the law governs and the difference is a named gap.*

- **One command, `mw`.** A TypeScript + Effect program bundled into one file, installed globally from GitHub. Every command prints JSON; `mw` alone prints the manual, generated from the command table. Every failure is a closed error code with the facts to act on and `next` commands. `mw next` returns the one action to take: relay to the operator, or wait. Every command that gives Made Well work starts a detached runner when none is alive (its output goes to `runner.log` in Made Well's home); `MW_AUTORUN=0` leaves `mw run` to the operator.
- **Made Well's home** (`~/.local/share/madewell`, or `MW_HOME`) serves every project on the machine: the store (`madewell.db`, one SQLite file: items, events, calls, tool events, accounts, the runner claim, evals), `projects.json` (each project's autonomy level, cartridge pack, ship and alert commands, its gates and its prepare command, written by `mw init`), `live/` (the output of each agent call, prepare, check run and ship while it runs, removed once its result is saved), `spans.jsonl` (every engine span, which the console reads), the per-call worktrees, and each item's patch and checks until it ships. Nothing of Made Well is written into a product repo.
- **The engine** drives each item from its saved state, one step at a time; each step is a traced Effect span. `mw run` drives every item that can move, up to `parallel` at once (default 3). An item that builds on others (`after`, declared by discovery) starts once they ship. A hold stops only its own item.
- **Every agent call** opens with its NQ exchange: intake runs with no tools on the cheap `intake` tier and answers the three questions as JSON; already answered questions reuse the record, and the originator answers new ones. Three answered turns that still leave new questions hold the item for a spec defect at every autonomy level. Existing safety/authority and operational holds remain: optional advice never grants authorization or supplies a missing credential. The job runs in its own disposable worktree at the item's base, refreshed at planning or replanning. The project's prepare command first stocks dependencies, environment and services; preparation failure holds the item. Jobs use prescribed tools, access and budgets in their own process groups. **Writes inside a disposable read checkout are diagnostic, not a refusal:** the call records `write-under-read`, its scratch files are discarded and never join the delivered change. Maker scope, the product repo's files and settings, and branch movement remain enforced. Evaluation still protects the original workspace from writes. Malformed JSON is re-asked once on the same card with no tools; a parsed answer that breaks its contract enters NQ. Repeated execution failures reuse their correction instead of asking again, then hold if it still fails. Worktrees and processes are removed after the call, and reported provisioned resources are torn down once.
- **The lane.** Discovery: the ideator turns raw notes into candidates; in full autonomy they are queued at once, otherwise the operator promotes them. Delivery: ideate (ideator) → challenge (ideation peer) → plan (planner: scope, done-when ids, and for each new file the existing one it follows; a plan that creates a kind of file the repo already has without naming one is refused, and the makers receive the followed file; the project's conventions, the rules its work follows that no gate catches, travel on the item from the moment its base is recorded, and a plan is refused unless it holds the change to each one with a done-when item, which the checks then prove, or says why it does not apply) → implement (implementer) and write the checks (test architect) in parallel, blind to each other, the test architect preferring a different harness → verify: Made Well applies the change on the current main, runs the project's gates on the files it changed (a gate's fixes join the change; a failing gate goes to the Arbiter, and the dispatcher answers for it), and runs only the item's checks; each failing check runs once more on the same candidate, and one that passes the second time is recorded as flaky and does not fail the item. A pass fast-forwards main and ships: the commit carries the item's title, objective, done-when items and decisions; Made Well pushes main to its upstream when it has one and then runs the project's ship command if one is set; if main moved in between, the checks run again. At `checkpoints` and `steps` the item pauses before it ships, and at `steps` also between cartridges; `mw go` resumes, `mw answer` steers (before shipping, the operator's words replan the change). A failure goes to the Arbiter with the logs and the environment's evidence (the prepare command's exit and what it provisioned, what was torn down, and whether the branch moved), and its ruling routes the work as in the table above; a pre-existing ruling inside a fix already two prerequisites deep holds instead.
- **Briefs.** One shared brief for every call (the experience rubric, the neutral host, conservation, the sub-agent rule), plus a packet: the item, what this job receives, a snapshot, its role and its exchange. Answers are schema-first JSON.
- **Harnesses are data.** Built-in entries for Claude Code, Codex, pi and Amp; operators add or replace entries in the prescriptions without code. A card is harness + provider + account + model + effort. A harness may opt into file packet transport for tool-enabled calls: the original JSON packet is preserved byte for byte in the existing per-call temporary directory, and stdin carries a short index with the task/reply contract and a path for bounded reads. Built-in Codex uses this route because large inline packets can be elided before the agent can act. No-tool calls remain inline with their tools disabled; other recipes remain unchanged unless they opt in. Transport never changes authority, acceptance or the durable recorded packet, and the existing call cleanup removes the file.
- **Observability.** The store keeps every call in full: brief, packet, answer, raw stream, tool events, tokens and rule-break flags. Every agent call, prepare, check run and ship records its start before it runs and its end after, so a step in flight is visible while it runs. `mw ui` serves the live console over the store, a view derived again after each saved transition: what is done and what needs the operator (with the exact command), each item's pipeline with who owes its next move and the time, tokens and NQ questions of each step, what each running agent is doing now, a timeline of every call, where the agent time goes, and per item its idea, plan, checks and results, diff, every NQ question and answer, every call with its packet, answer and stream, and its trace. `mw watch` draws the same view in a terminal or streams events as JSON lines; `mw replay` writes the console as one page with the record inside it; `mw status`, `show`, `holds` and `export` read it too. Spans go to `spans.jsonl` beside the store. With `MW_TELEMETRY`, every event, call, refusal, eval and span is also appended to the machine's own JSONL file, stamped with the build and the harness version (`MW_TELEMETRY_LEVEL=metrics` drops free text); `mw stats` reads the files from every machine. `mw eval` replays recorded calls on another card or brief and recommends the cheapest card that matches. `mw prune` removes finished work and returns the space.
- **Demonstrated:** the whole pipeline with a scripted worker in the tests; live runs on Amp only (discovery, NQ and planning on this engine; six items shipped on the previous one). The Claude Code, Codex and pi entries follow their documentation and have not run live.
- **Answer memory.** Intake, execution and originator packets receive relevant durable questions and answers with stable ids. Exact matches reuse automatically; intake and originator replies can reference an existing answer to resolve a paraphrase, which becomes a saved alias. Older answer events recover their questions from the preceding question event. This uses the existing store, not another model, service or index. Recognising a previously unseen paraphrase is an agent judgment; resolving a reference and reusing a known wording are deterministic.
- **Named gaps:** the five-minute check-in is not implemented; calls have wall-time budgets instead. No VM or sandbox per item.

### B2 implementation decision, 2026-10-24

The missing fact was the invocation before return, not another status store. B2 appends capture to the existing event transaction and links completed calls by invocation id. `mw trace <id> --lens ux|dx|ax` and `/api/trace/<id>?lens=...` project that record; the initial renderer is JSON. Replay embeds AX and export keeps the fragments with the item's events. Original calls, tools, telemetry, commands and pipeline contracts remain intact. Renderer failure or a five-second timeout falls back to the lens. Lost processes and stale heartbeat evidence are not successful returns.

Rubric: **DX hit** — one parser and one store avoid competing diagnostics, at the cost of more event writes and larger exports. **UX hit** — explicit done/not-done and acceptance evidence reduce inference; raw detail stays out of the default lens, at the cost of deferring visual polish to render cartridges. **AX hit** — live inputs, stream fragments, tool identity and first-class signals make interruption and stalls inspectable, at the cost of heuristic signals that can be false positives. Build with conviction; no inference or automatic agent action is added.

Signals use a five-second `Clock` heartbeat: silence at 60 seconds; no reported tool result at 120 seconds for tool-capable agent calls; three consecutive identical operations/output lines or NQ question sets; JSON-looking stream parse failures and returned schema diagnostics. Unusual duration is three times the median of at least three prior returned invocations of this item/job/kind (minimum 30 seconds), otherwise 60 seconds for intake/repair and 180 seconds for other kinds. These are observational thresholds, not new deadlines, proof of useless work, or authority to act. Baselines and thresholds travel with the start event. Existing budget kills remain independent. Notification failure and dropped discovery candidates now have explicit diagnostics.

Demonstrated with scripted workers and real local subprocesses: reading output from a second store connection before return; split-track tool-id isolation; signal boundaries and clearing; cancellation without a surviving heartbeat; runner SIGKILL with preserved evidence and normal redrive; a hanging ship that remains not done until return; schema failures, dropped candidates, failed notifications and renderer failure/timeout. Production harness live behavior and long-run capture volume remain unmeasured; retain/prune the existing store rather than adding a second retention system. A future renderer can be judged without changing capture or acceptance.

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

**Implemented and demonstrated with scripted workers, 2026-10-24:** settled `decisions[]` carry exactly one DX, UX and AX judgment and a consistent verdict; fewer than two hits cannot advance. NQ answers can record new choices with the same checked shape; factual clarification and answer reuse do not invent choices. The console records `decision-resolution` events before forward ideation/planning and NQ originator calls, identifying default-rubric or cartridge-assisted guidance and reusing saved guidance on redrive. Registered renderers receive only the bounded request and options, no checkout; calls have a five-second timeout. Guidance is advisory and never directly authorizes actions. Missing/disabled/invalid/failing cartridges fall back without holding an item. No live inference provider or structured hold UX is implemented. Recognizing an unrecorded choice and truthfully judging a leg remain agent obligations, not claims of mechanical proof.

Any proposed implementation or evaluation must distinguish **required**, **implemented**, and **demonstrated**. Missing enforcement is a named gap to close, not permission to discard the rule.

### File packet transport decision

The observed failure is a complete recorded packet followed by a Codex response saying the packet was elided, with no tool use. Keeping it inline preserves simplicity but repeats that failure; truncating it would discard decisions. A temporary file plus a visible task/reply bootstrap preserves the full input and lets the job read large fields separately. **DX hit, cell 2:** reliable handoffs with an opt-in harness setting, at the cost of a file read. **UX hit, cell 4:** fewer delivery interruptions without another operator choice, at the cost of less inline detail. **AX hit, cell 1:** exact recoverable context and explicit field locations, at the cost of bounded tool reads. All three hit. No new storage, stage, authority or context truncation is introduced. Assess through transport/cleanup tests and the previously failing live handoff.

No-tool intake is an inline handoff confirmation, not source execution. Its launch projects only existing `snapshot.contents` string bodies to exact path/character-count references that explicitly defer grounding to the execute checkout and full execution packet. Missing files remain null. Task, source, decisions, history and failure evidence stay intact; the original recorded packet and tool-enabled execution transport are unchanged. This resolves a recorded upstream input-length refusal dominated by generated source snapshots without summarizing decisions or granting tools. **DX hit, cell 4:** no manual packet repair; **UX hit, cell 4:** confirmation stops blocking delivery on unavailable source tools; **AX hit, cell 1:** the role receives the context it can use, with exact deferred grounding. Cost: one transport projection with regression coverage. The large-packet regression proves bounded intake and complete execution bytes; each actual delivery still requires its live check.

### Contextual contracts and operator browser input, 2026-10-28

The operator authorizes a browser write surface for **their own** new tasks and answers. This does not change ruling 16: the observing agent remains outside the glass. `mw context <id>` and `GET /api/v1/items/<id>` are one compact projection of intent, position, saved revision, conversation and actionable inputs with owner/authority; raw evidence is linked rather than repeatedly embedded. The dogfood trace exceeded 323,765 bytes after intake and one in-flight execute, so full AX capture stays intact while the default context limits text previews and makes truncation explicit. No read projection schedules, retries, repairs or answers work.

The versioned API is additive, documented in OpenAPI 3.1.1 with RFC9457 problems. Browser answers invoke the existing engine answer function, retaining hold causes, recipient confirmation and accepted-prefix semantics. A synchronous SQLite transaction contains the command, its exact text in existing item/event fields, its input reference and a retry receipt. Receipts survive restart and pruning; a request ID with different input conflicts, and a new answer must match the saved item revision. CSRF tokens, explicit trusted origins/Host checks, bounded UTF-8 JSON and a body deadline protect the local single-operator surface. These are not multi-tenant authentication. Clients keep drafts on failure and reuse the same request ID/input on uncertain retries. There is no arbitrary shell endpoint, fabricated conversation response or second scheduler.

Answer deduplication belongs to the latest hold or checkpoint, not the item's entire history. Retrying the instruction that released that stop changes nothing; the same words at a later checkpoint are a new instruction. Dogfooding reproduced the previous false no-op and the engine regression covers both boundaries.

**Decision: reuse the store and engine, expose a bounded versioned projection instead of replacing CLI or AX output. DX hit, cell 2:** one schema/projection and engine owner reduce integration drift; cost is an additive API and receipt table. **UX hit, cell 2:** explicit browser submission/answers remove terminal dependence and retries cannot duplicate work; cost is honest conflict recovery rather than silently guessing intent. **AX hit, cell 1:** headless context names exact next inputs and evidence without repeated full packets; cost is following evidence links for omitted detail. All three hit. Exact proxy origins must be configured; trusted local access remains an explicit deployment assumption.

The OTLP endpoint exports actual `ExportTraceServiceRequest` JSON from saved finished invocation evidence, not renamed custom telemetry. It has typed attributes, stable IDs within a store path and recorded timestamps; no timed parent is invented. Running/lost/interrupted evidence stays on the native trace. This is not a full OTel SDK, collector transport or logs/metrics export. The current Amp bridge records dispatch/result and heartbeat, not Amp tool-by-tool streams; missing internals remain unavailable.

Demonstrated by targeted API tests: exact input and engine NQ release, checkpoint/cause handling, nonanswerable refusal, concurrent requests, restart replay, process death before commit, replay after pruning, request/body security, compact context and recoverable accepted-input wake failure. Browser integration and full-suite acceptance belong to the following nodes; no implementation receipt substitutes for them.

### Manual QA evidence contract, 2026-10-28

Manual QA attaches to existing durable work without becoming a delivery node, scheduler or software acceptance gate. The anchor may be a capture/manual-QA task, including historical cases with no original delivery. Exact workspace equality is required, not a live checkout or project registration. No QA write creates an Item, changes its document/state/verification/revision, claims the runner, wakes work or converts a finding into repair authority. Source material remains advisory; the existing full-autonomy and NQ authority rules are unchanged. Observing agents stay outside the glass.

The backend source adds five tables to the existing Store: cases, immutable instruction revisions, immutable runs with ordered revision pins, append-only observations and QA-specific retry receipts. `src/qa.ts` owns shared closed Effect schemas and service boundaries; the Store owns SQL/transactions; CLI and versioned HTTP call those same functions. Server times come from Clock. Each mutation has an observed function invocation and an owning-item `qa-*` event with exact input, QA counters and receipt references; interrupted trace evidence is not a successful return. Item events/export remain the evidence record, not a second tracking system or fabricated agent call.

**Manual means an explicit trusted-local declaration:** only the verdict operation accepts `enteredBy.kind:"operator"` with `attestation:"operator-manual-verdict"`. This is not human authentication. A local process can falsely claim a role; no cryptographic proof is promised. Technical/historical reported results, imported checkmarks and claimed verifiers are evidence, never manual success. The latest manual verdict sets one pinned run entry's state: `untested`, `passed`, `failed` or `needs-refinement`. Reset is a new observation. Every new run starts untested, even for previously passed revisions. Changing instructions leaves old runs pinned and visibly outdated. Application/environment and known-with-source versus explicitly unknown version are recorded without inference.

Per-case revision CAS and per-run-entry observation CAS prevent silent overwrites without making unrelated entries conflict. Every accepted note increments its entry counter. A request ID plus recursively key-sorted validated input/operation/targets identifies an attempt across transports/restart; string bytes and array order remain exact. Identical retries return the saved outcome, never another domain effect. Stale CAS saves the exact rejected draft in a `qa-conflict` event and a permanent 409 receipt. Only explicit review, current revision and a new ID can submit revised intent. Invalid/security inputs are not retained as QA evidence. Accepted domain rows, event and receipt share one synchronous transaction; read projections/snapshots share a short read transaction.

**Clearing notes is an append, not deletion or a verdict reset.** The shared observation content predicate retains every existing accepted input and additionally permits an otherwise content-empty request only when `kind:"note"`, expected `revision > 0` and exactly `notes:""`. Required fields, limits and null note `reportedResult` remain unchanged; omitted/null notes, otherwise empty revision-0 notes, empty technical/historical observations and whitespace-only notes without other content remain invalid. Positive expected revision is not evidence of existence: the Store's existing lookup, anchor, run-pin and transactional CAS checks remain authoritative; an untouched entry conflicts at actual revision 0. Any prior observation establishes a counter, not only notes. Acceptance appends the exact empty string and increments only that entry counter while retaining earlier evidence and the latest manual verdict/status. Replay and permanent stale-conflict receipts remain unchanged; another fresh ID/current revision is another append. Clients must honor the latest note even when empty rather than resurrect older text; browser clearing/reload acceptance is separate from this backend correction.

**Accepted note-clearing decision — all three hit. DX cell 4:** one shared predicate restores CLI/API editing without migrations, costing one documented exception and independent regression coverage. **UX cell 4:** ordinary clearing preserves history and verdicts without another control, costing existing conflict review and separately unproved browser integration. **AX cell 1:** exact clear intent retains CAS and stable retry identity without another operation, costing one observation/event/receipt per new accepted clear; no measured resource saving is claimed. Independent engine regression, full-suite and typecheck results remain owed by the acceptance owner; the maker ran no self-checks.

QA history and receipts have no deletion/TTL here. Ordinary prune retains every case/run anchor, its events/calls and managed item/export files. The Store rechecks all chosen IDs under `BEGIN IMMEDIATE` before invoking the synchronous files-first deletion callback; a newly created QA case/run anchor invalidates the selection with `retention_changed`, before any file or row deletion. Merely linking follow-up work does not protect that target. Opaque external evidence references are text, not managed attachments or promises of availability.

The public seams are twelve flat `mw qa-*` commands, `/api/v1/qa/cases` and `/api/v1/qa/runs` routes, OpenAPI schemas, discovery/context read links and the full ordered `qaSnapshot(runId)` projection. They inherit the existing local Host/Origin/CSRF and bounded UTF-8 body protections. The additive export/link contract below supplies formatting and explicit associations; UI, attachment hosting, Arc import and retest orchestration remain excluded. Clients use explicit new runs, never copied verdicts. Client drafts survive polling, uncertain transport and conflicts; note autosave serializes per entry, while instruction revisions, verdicts, associations and retest creation remain explicit actions.

**Accepted decision:** reuse existing work/Store, immutable evidence and guarded retention instead of another scheduler or last-writer-wins notes. **DX hit, cell 2:** one mutation owner/schema and independent per-entry CAS, costing five additive tables and retained storage. **UX hit, cell 2:** resumable pinned instructions and no silent draft loss or invented pass, costing explicit conflict review and deliberate verdict submission. **AX hit, cell 1:** exact provenance, replay identity and full snapshot/read links, costing retained trace volume and no claim of human authentication. All three hit. Destructive schema collisions require NQ, not a migration improvised by the implementer.

**Evidence status:** backend source and documented contracts are delivered for independent acceptance, not declared demonstrated by the maker. No implementation self-checks were run in this assignment. The engine owns targeted integration, full-suite and typecheck verification; subsequent UI/browser and real Arc acceptance remain separate work. Fixture declarations and a successful transport response cannot establish those outcomes.

### Manual QA export and association contract, 2026-10-28

`qaExport(runId, query={})`, `mw qa-export <runId> [--selection all|follow-ups] [--format json|markdown]` and `GET /api/v1/qa/runs/{runId}/export` share closed schemas and defaults `all`/`json`. Success is always JSON: `{apiVersion:"1",format:"json",data:QaExportDocument}` or `{apiVersion:"1",format:"markdown",markdown:string}`, HTTP 200. The version-1 document holds selection, `externalEvidence:"unavailable-reference-only"`, the full immutable run/pins and complete selected entries. Follow-ups means only current manual failed/needs-refinement, never technical/historical reported results or linked work status. Empty selections are valid. The existing `qaSnapshot` shape and behavior stay unchanged; export reuses that projection inside the same Store read transaction, adding case metadata/current revision/outdated/latest verdict, all relevant conflicts and outgoing/incoming retest associations in event order.

Markdown is a pure deterministic formatter in `src/export.ts`, with literal fenced supplied text and labelled missing data. It includes exact pinned reproduction instructions, every observation and its provenance, immutable association context, rejected drafts and read locations; no summary/truncation replaces history. User whitespace, CRLF and Unicode are not normalized. JSON remains authoritative. External evidence is reference-only and unavailable **in the export**, not probed or asserted absent remotely. Recorded evidence is not repair authorization, an accepted agent handoff, or invented missing fixtures. No generated timestamp, file writer, network fetch, agent call or scheduler is introduced. Legacy forensic `exportItem`, replay and OTLP stay unchanged.

`qaLink(runId,caseId,input)`, `mw qa-link <runId> <caseId> --input-file <file>` and `POST /api/v1/qa/runs/{runId}/cases/{caseId}/links` accept `{requestId,revision,enteredBy,observationId,target}`. The target is existing same-workspace work, an opaque reference, or an existing later run of the same workspace/application pinning the same case ID to an existing revision. Any existing source observation kind is linkable without upgrading it to a manual finding. Untouched entries are not given synthetic observations. The link supplies no new work authority. Return the existing `QaAccepted` with operation `linkObservation`, resource `run-entry`, source run/case IDs and **unchanged** entry revision, HTTP 200 for new acceptance and replay.

Associations belong only to a `qa-linkObservation` event on the source run owner, with validated immutable source/target context and a QA retry receipt committed together under the existing write lock. There is no table, mutable backlink, target Item/event update or observation insertion. Observation counters still count exactly observations. Request replay is first, including after restart/target pruning; stale CAS retains the rejected draft and permanent receipt. After normal CAS, a new ID for the same source observation/target saves terminal `link_exists` with existing event and refresh, rather than another link. Same/earlier retests or different applications return `invalid_retest`; normal not-found/workspace/case/security/storage errors remain explicit. No unlink/edit API exists.

Retests are two separately resumable explicit requests: create a run with complete reviewed pins, actor, application/environment/version, workspace/work item and a new request ID; confirm its receipt; then link the original observation to that run using another saved ID/body. Every new entry starts untested. A failed link leaves that run intact, not deleted/recreated. Linking an already observed compatible run never resets it; fix completion cannot change the original manual failure or retest verdict. Client drafts/pending requests survive errors and conflicts; links are never autosaved.

Existing retention protects case/run anchors, including all retests. Merely linked implementation work is **not** protected: its exact seven fields (`id`, `workspace`, `title`, `objective`, `source`, `status`, `updated`) are captured atomically on the source event. Normal prune may remove that target; export retains the snapshot with `targetAvailability:"unavailable"`. Captured status is status at association, not current resolution. References are `not-checked`; retained retests are present. Linking and pruning share the Store write lock: link-first captures before prune, prune-first refuses absent work. QA receipts/history remain indefinitely; no promise extends to pruned execution internals or external attachments.

**Accepted export decision — all three hit. DX cell 2:** one schema/read/formatter shared by CLI/HTTP; cost is additive types and potentially large synchronous exports. **UX cell 2:** complete readable follow-up briefs without hidden history loss; cost is long literal blocks rather than polished prose. **AX cell 1:** exact versioned provenance/conflicts and stable IDs without re-questioning; cost is full-history bytes and separately supplied external access. **Accepted association decision — all three hit. DX cell 2:** existing transaction/events/receipts avoid another owner; cost is event scans. **UX cell 2:** original failure and independently untested retest stay honest even after target prune; cost is two deliberate submissions and no link editing. **AX cell 1:** retry identity and immutable pins make evidence actionable without inferred authority; cost is unavailable pruned execution internals. Reconsider indexing only with measured history-volume latency, not speculative infrastructure.

**Implemented versus demonstrated:** source/docs are delivered for independent engine tests/typecheck; the maker ran no self-checks and asserts no acceptance count. The preceding backend's supplied acceptance is prerequisite evidence, not proof of this addition. UI controls/browser acceptance, real Arc ingestion, long-run volume and actual human verification remain separate. Labelled fixtures and valid receipts never establish those results.
