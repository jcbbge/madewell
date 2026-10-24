# Observability Lenses — locked design model for Made Well

## Purpose

This dossier locks the observability design model for Made Well B2. It is a specification for implementation, not a transcript.

Made Well is already durable. The TypeScript + Effect rewrite made work items, invocations, steps, stages, phases, lanes, events, calls, tool events, flags, the glass, and exports survive across process death and repeated invocations. Durability is not the ask here, and this dossier does not re-spec it.

The ask is **trust**.

Trust comes from **sight**. A vending machine that cannot be seen into is not trusted even when it works: the operator hears the widget drop, but it never reaches his hand, so he is out a dollar and a turn. The fix is not to make the vending machine more durable. The fix is to make it **glass**: the operator watches the item travel through the entire mechanism to his hand.

A non-specialist must be able to see:

```text
item -> mechanism -> jam -> next action
```

The top-level signal must remain a light switch: binary, immediate, and verifiable. On / not-on. Done / not-done. Worked / did-not-work. When the switch reads not-on, the same system must let the operator zoom inward until the broken layer is visible: the item, the mechanism, the jam, and the next action.

## Kernel

Made Well is the kernel of **any work**, not just software delivery.

The same shape applies to sales, marketing, product, a backend team, a legal workflow, a finance process, a department, an org, or an entire company. The domain changes; the work kernel does not.

The governing model is:

```text
input -> function -> output
```

Made Well itself is one function:

```text
Made Well(idea) -> delivered idea
```

Discovery is a function. Delivery is a function. Each phase is a function. Each lane is a function. Each agent call is a function. A sales campaign, product launch, backend migration, support escalation, department plan, and company operating cadence are also functions at their respective altitudes.

Do not bind the design to whether an internal implementation is a DAG, a state machine, a workflow engine, or a functional program. The operator's model is recursive and sufficient:

```text
arg -> invocation -> return -> output
```

B2's job is to make that work tree visible at the right altitude and viewer depth without making the operator trust a hidden machine.

## Fractal / recursive spine

Work is self-similar across scales:

```text
function -> task -> feature -> project -> team -> department -> org -> company
```

Every node in that spine has the **same shape**:

1. two lanes: **Discovery** and **Delivery**;
2. three reads: **surface**, **section**, and **cause**.

The two lanes are permanent chambers of the node. Discovery contains the search, framing, evidence, candidate generation, and promotion path. Delivery contains the execution, verification, shipping, and closeout path.

The three reads are not three systems:

- **surface**: the plain-language trust read: what is this, what is happening, done/not done, and what is the next action?
- **section**: the mechanism read: where in the lanes, phases, stages, jobs, holds, checks, calls, or budgets is the work?
- **cause**: the obstruction read: what localized jam, crack, occlusion, missing field, failed check, quota, loop, non-progress interval, or unlocalized cause explains the stop?

A node's cause can be atomic or composite. When it is composite, it bottoms out into the two-lane fleet of that node's children. That is the essential recursion: the cause of a parent can be the active state of a child fleet, and each child exposes the same Discovery / Delivery lanes and surface / section / cause reads.

This recursion must be true in the **state model**, not merely drawn by a renderer. The telemetry contract must store recursive work-nodes with stable identity, parent references, ordered child references, lane state, read projections, and obstruction state. If the state model is flat, no renderer can faithfully express the design.

### Work-node state requirements

A work-node must carry at least:

- stable node id;
- node kind / altitude, such as function, task, feature, project, team, department, org, or company;
- title and domain-neutral objective;
- parent id or null for the root;
- ordered child ids;
- sibling order / navigation handles;
- Discovery lane state;
- Delivery lane state;
- current surface read;
- current section read;
- current cause read;
- obstruction localization: lane, phase, stage, call, child id, field, check, or `cause not localized`;
- durable returned-call evidence;
- live in-flight evidence;
- history rings;
- projection metadata for user, developer, and agent viewer depths.

Only one altitude is in focus at a time. The parent may be ghosted above. Children may be hinted below. Siblings may be reachable laterally. The system must support continuous zoom and traversal, but it must never splay the whole fractal at once as the default experience.

## Contract vs skin

The core architectural split is:

```text
telemetry contract = what exists to display
skin = how it is displayed
```

### Telemetry contract

The authoritative, durable layer is the **telemetry contract**. It owns the truth. It specifies what there is to display, how it is addressed, and what projections can be requested.

The contract must include:

- the recursive node spine;
- parent, child, and sibling handles;
- lane state for Discovery and Delivery;
- surface / section / cause reads;
- durable returned-call trace;
- live in-flight trace;
- obstruction localization;
- history rings;
- a projection protocol.

The projection protocol must answer requests shaped like:

```text
give me node X at viewer-depth {user|developer|agent}, with its parent handle and child handles
```

The result must be the same underlying node collapsed for the requested viewer depth, not a different truth source.

The existing `?lens=ux|dx|ax` API is a primitive version of this projection protocol. It should evolve into the right-dial viewer axis:

```text
ux -> user -> surface
dx -> developer -> section
ax -> agent -> cause
```

The compatibility lesson is important: same data, different collapse.

### Skins

Skins are swappable presentation layers over the telemetry contract. They decide layout, metaphor, density, color, motion, affordances, and input feel.

Skins must be:

- replaceable without changing the telemetry contract;
- selectable by the operator, ideally click-to-change;
- user-buildable, like Winamp skins over a music visualizer;
- allowed to collapse the same data differently per viewer;
- forbidden from owning the truth.

The skin **is** the collapse. The telemetry contract supplies node X and its projection. The skin decides how user, developer, and agent views feel.

If a skin is absent, disabled, invalid, or failing, Made Well still works and the trace still exists. Terminal, headless JSON, browser, sidecar, TUI, static HTML, GPU canvas, or future display surfaces are cartridges over the same contract.

The invariant is:

```text
one telemetry contract -> many skins / render cartridges
```

## Two-dial "faux-ROPTOR" navigation

Navigation has two orthogonal axes.

### Left dial: space

The left dial changes **which node** is in focus. It traverses the fractal:

- up to parent;
- down into child;
- across siblings.

This is the spatial axis of the work tree. Moving the left dial never changes how much is revealed about the current node; it changes the node.

### Right dial: viewer

The right dial changes **how much is revealed** about the node already in focus:

```text
user -> developer -> agent
surface -> section -> cause
```

This is the information-depth axis. Moving the right dial never changes which node is being inspected; it changes the collapse of that node.

### Cooperation between the dials

The dials are independent but cooperative.

The right dial at agent / cause depth can name a culprit child. The left dial can then travel to that child. The user can inspect the parent at surface depth, rotate the right dial to expose the cause, then rotate the left dial down into the child where that cause lives.

The design must preserve object permanence across both axes. A node remains the same node as the viewer depth changes. A viewer depth remains the same viewer depth as the focused node changes.

## Frame / manifold

The operator sits at the center of a plus-sign manifold.

```text
          parent ghost
              |
previous viewer — focused cell — next viewer
              |
           child hint
```

- The vertical arm is **space**: parent ghosted above, child ghosted below.
- The horizontal arm is **viewer**: user · developer · agent.
- One cell is always prominent.
- Four neighbors are ghosted at the edges.
- A dial slides the manifold so a neighbor becomes prominent.

The UI should feel like a stable object moving under the operator, not like pages being replaced. Object permanence is mandatory across both axes.

The default experience must not show the whole fractal. It must show one focused node, enough context to move, and enough projection to trust what is happening.

## Default skin: glass core section

Skin #1 is the default implementation target. It renders each node as a transparent specimen: a glass core section.

Each node has two permanent chambers:

- **Delivery**;
- **Discovery**.

Each chamber can contain many cores. The fleet is the set of active and historical cores inside the lanes. Discovery fans out promoted candidates into Delivery as parallel async rockets. The `mw next` loop is the heartbeat advancing cores through the machine.

The three reads are rendered as physical inspection depths:

- **surface**: a plain-language sentence on the specimen;
- **section**: the visible mechanism inside the two chambers;
- **cause**: a physically located obstruction in the specimen.

A stop is never merely a red status. A stop is a localized cause: jam, crack, occlusion, missing field, failed check, quota gap, loop, no-progress interval, broken handoff, unparseable return, or blocked operator action.

If the agent cannot localize the cause, the visible obstruction is:

```text
cause not localized
```

That phrase is not a fallback label to hide uncertainty. It is the obstruction. It creates 10x self-debug pressure on the agent and the system: if the machine cannot say where the jam is, the jam is its inability to localize.

History is not a separate timeline. History appears as rings on the specimen: prior attempts, returns, checks, holds, quota swaps, NQ turns, correction rounds, exports, and shipped proofs are growth rings around the core.

## Animation belongs to skins, not architecture

Animation is a skin detail. The telemetry contract must not encode hinge metaphors, dolly metaphors, easing curves, CSS decisions, or animation state beyond the stable node/projection identity needed for object permanence.

Skin #1 default animation is a two-edge-hinge pivot implemented with pure CSS 3D transforms:

- left-edge hinge = space axis;
- right-edge hinge = viewer axis.

Skin #2 may use a dolly-for-space metaphor:

- push in = child;
- pull out = parent;
- Powers-of-Ten continuous zoom.

Both skins must read the same telemetry contract. Neither animation model is architecture.

## One data core

There is exactly one source of truth: the durable and live recursive work-node trace.

The trace is not a user status system, developer diagnostics system, and agent log system glued together. It is one durable and live work tree, collapsed differently depending on the viewer depth and rendered differently depending on the skin.

The core must include both bodies of evidence:

1. **Durable returned-call trace** — the material Made Well already records after transitions and calls return: items, events, calls, tool events, tokens, flags, holds, verification results, glass snapshots, exports, runner events, and telemetry.
2. **Live in-flight trace** — the missing material B2 must start capturing while a function is still running: raw stream fragments, tool starts/results, heartbeat/progress, active invocation, elapsed time, last output, repeated patterns, and stall/loop/no-progress signals.

The first body mostly already exists. The second body is the black box.

Every projection reads from this one core. A skin may choose what to show. It must not invent a second truth.

## Viewer-depth projections

The prior "three fixed lenses" model is superseded by the right-dial viewer axis over the skinnable telemetry contract. The still-valid content remains as the semantics of the three viewer depths.

### User depth / surface read

#### Observer

The operator as a non-specialist user of the machine.

#### Question answered

What am I working on? What is Made Well doing? Is it done — yes or no? If not, what do I do next?

#### Projection shape

This is the light switch and the glass vending-machine surface. It must collapse the work-node into tangible, binary or near-binary facts:

- node title and objective;
- current top-level state;
- done / not done;
- needs you / does not need you;
- waiting / working / shipped / failed;
- the next operator action, if any;
- visible proof that output reached the hand: shipped commit, command, check result, candidate list, hold, or exported artifact;
- one plain-language sentence for the visible item, mechanism, jam, and next action.

It should not show raw harness streams, implementation internals, uncollapsed call trees, provider-specific noise, or speculative diagnostics by default.

The user depth is not less true because it is compressed. It is the same node collapsed to the operator's immediate trust question.

### Developer depth / section read

#### Observer

The developer peeking under the hood.

#### Question answered

Where exactly is the work, where did it stop, and what evidence explains that state?

#### Projection shape

This depth shows the machine corridor and the two-lane section:

- phase, lane, stage, job, profile, and track;
- Discovery versus Delivery position;
- NQ state: awaiting receiver, awaiting originator, clear, turns spent;
- split-track state after planning: implementer and test architect independently;
- current card, harness, model, account, budget, elapsed time;
- call outcomes: ok, rejected, error, limit;
- holds and their context;
- verification/gate/check result summaries;
- correction count and round;
- quota state and reset time;
- runner owner, active item, and runner-lost evidence;
- rule-break flags;
- export and replay entry points;
- parent, child, and sibling handles.

The developer depth is where the durable trace is already strong. Calls, events, tool events, flags, verification results, glass, export folders, and telemetry already exist after calls return. B2 should surface those facts legibly rather than re-capture them.

It must make these distinctions obvious:

- actively running versus queued;
- waiting on quota versus waiting on operator;
- retrying after a rejected answer versus doing useful work;
- NQ churn versus execution;
- verification failure routed to arbiter versus operator hold;
- runner alive versus runner lost;
- call over budget versus still within budget;
- captured failure versus live in-flight blind spot;
- parent obstruction versus child obstruction.

The developer should not need to open SQLite, inspect export folders, or infer from a spinning process that something is wrong.

### Agent depth / cause read

#### Observer

The agent and any agentic debugger operating at ground level.

#### Question answered

What function am I inside, what arguments did I receive, what did I invoke, what returned, what output did I produce, and am I stuck/erroring/looping right now?

#### Projection shape

This is the localized obstruction and subatomic trace:

- function identity: item, node, job, call kind, profile, card, harness, model;
- parent and child context;
- input arguments: system, packet, received deliverables, handoff, exchange, previous refusal, rework, scope, budget;
- invocation start, elapsed time, active state, and live heartbeat;
- tool invocation start and finish;
- tool input/output digests and sizes;
- raw stream fragments as they arrive;
- parse/decode state;
- schema requirements and missing fields;
- write/read/scope/head/allowlist/budget flags;
- repeated operation patterns;
- no-output and no-progress intervals;
- stall/loop/no-progress signal;
- return value, parse result, refusal reason, error, or limit;
- culprit child id when a composite cause bottoms out into children;
- `cause not localized` when no better location is known.

The agent depth is not a prettier log. It is the agent's mirror. An agent should be able to read its own live trace and know: I am repeating myself; my output is not parseable; my final JSON is missing fields; I have made no progress; I am stuck in a tool loop; I am about to waste the operator's turn.

B2 must make that visibility possible. Automatic self-correction is not part of B2; it is the explicit follow-on enabled by this depth.

## Surface versus capture

B2 has two distinct bodies of work. They must not be confused.

### Surface: render what Made Well already knows

After a call returns, Made Well already captures most of the record needed for user and developer depths:

- item state;
- events;
- calls;
- tool events parsed from raw streams;
- tokens;
- facts;
- rule-break flags;
- rejected calls;
- quota swaps;
- NQ turns;
- holds;
- verification/gate/check results;
- runner-started, runner-stopped, runner-lost;
- glass snapshots;
- exports with brief, packet, answer, raw stream, tools, and flags;
- telemetry and stats.

The surface work is therefore mostly low-risk re-rendering of existing durable data through the projection protocol and skins.

The user depth compresses it into the light switch.

The developer depth arranges it into phase/lane/stage diagnostics.

The agent depth reads the same returned-call facts as a function-level postmortem and live mirror.

This surface work must preserve every existing feature. `mw next`, `mw status`, `mw show`, `mw holds`, `mw replay`, `mw export`, telemetry, the glass, prescriptions, harnesses, cards, NQ, holds, verification, shipping, pruning, and evals all remain valid. B2 adds sight; it does not replace the machine.

### Capture: close the live-call black box

The real capture gap is the live, in-flight call.

Today, while an agent call is running:

- raw stdout/tool events land in the store only after the worker returns;
- the glass redraws only after saved transitions;
- there is no live progress stream in the trace;
- there is no no-output watchdog;
- there is no no-progress watchdog;
- there is no repeated-tool or repeated-turn loop detector;
- there is no "too long for this kind of work" signal;
- the per-call wall-clock budget can SIGKILL the process group, but the default budget is 30 minutes and the resulting error arrives only after the budget fires;
- a 25-minute silent spin on a 30-minute budget remains invisible until it returns or times out;
- if a call is killed before it returns, its transcript can vanish entirely, leaving only coarse runner-lost evidence later;
- a hanging ship/deploy command has the same kind of blind spot because that path is not represented as a budgeted live function trace.

This is the black box B2 must close.

The capture work is to stream the live function trace into the same data core while the invocation is happening, and to emit a first-class stall/loop/no-progress signal when the trace shows the function is not advancing.

That signal is not merely "process exceeded 30 minutes." The wall-clock budget is a last-resort kill switch. It is not sight.

The B2 signal must say, while the function is still alive:

- this invocation has produced no output for a concerning interval;
- this invocation has produced no new tool result for a concerning interval;
- this invocation is repeating the same operation pattern;
- this invocation is spending time far beyond what this call kind normally needs;
- this invocation is failing to produce parseable/schema-valid output;
- this invocation is stuck before return.

The signal belongs in the trace, not only in a skin. User depth may collapse it into "stuck." Developer depth may show the stalled phase/call/tool. Agent depth must expose the exact live function facts so an agent can debug itself.

## Failure map grounding

The design is grounded in the current failure map.

Most failures are already captured after the fact but hidden from the ordinary operator view:

- agent call errors;
- malformed or unparseable output;
- rejected answers;
- NQ churn before the turn cap;
- launch failures before the launch cap;
- quota swaps;
- verification failures;
- gate/check failures and check timeouts;
- arbiter rework loops before the correction cap;
- out-of-scope, read-only write, branch-moved, and leftover rule breaks;
- teardown records;
- alert command exit codes.

Some failures already surface as holds:

- NQ turn exhaustion;
- worker failing after repeated failed launches;
- too many corrections;
- arbiter undetermined;
- prepare failed;
- no ship command;
- nonzero ship failure;
- teardown failed;
- product leftovers.

The missing class is live invisibility:

- in-flight stalls before wall-clock budget;
- loops that finish before timeout and therefore leave no stall diagnosis;
- killed in-flight calls whose transcript never reaches the store;
- hanging ship/deploy commands;
- alert delivery failure as an operator-notification failure rather than merely an exit code in hold metadata;
- malformed discovery candidates silently dropped from the candidate list without explicit diagnostic shape.

B2's surface work handles the first two groups by rendering what already exists. B2's capture work handles the third group by making the live invocation itself part of the trace.

## Preservation constraints

B2 must preserve every existing Made Well feature.

Specifically:

- no existing command disappears;
- no existing JSON contract is casually broken;
- no current durable record becomes less available;
- no current glass/export/telemetry affordance is removed;
- no current NQ, hold, quota, verification, ship, prune, eval, prescription, harness, or card behavior is replaced by a renderer;
- no renderer or skin becomes required for work to proceed;
- no live-capture stream is allowed to become the only durable record;
- no agent auto-action is introduced as part of B2.

B2 adds sight to the existing machine. It does not ask the operator to trust a different machine.

## Enabled follow-on: agent self-correction

The agent / cause depth deliberately enables a later capability: agent automatic self-correction.

That follow-on is out of scope for B2.

B2 must not build automatic loop-breaking, automatic retry shaping, automatic self-repair, or autonomous correction behavior. It must build the trace and signal that make those behaviors possible later.

The boundary is:

- **B2 builds:** recursive work-node state, telemetry contract, projection protocol, skinnable rendering seam, two-dial navigation, default glass core section skin, surfacing of already-durable data, live in-flight capture, and first-class stall/loop/no-progress signal.
- **Future work builds:** agents acting on that signal to interrupt themselves, correct their output, change strategy, or escalate before wasting a turn.

This matters because trust comes before autonomy. The operator must first see the machine. Only then should the machine be allowed to act on what it sees.

## Decision summary

The settled design is:

1. Made Well's observability is a trust-through-sight feature, not a durability feature.
2. Made Well is the kernel of any work, not only software.
3. Work is a recursive, self-similar spine from function to company.
4. Every work-node has the same shape: Discovery and Delivery lanes plus surface, section, and cause reads.
5. A composite cause bottoms out into the two-lane fleet of child nodes.
6. The recursion must be true in the state model through parent/child work-nodes, not merely drawn in a renderer.
7. Only one altitude is in focus at a time; parent and child context are ghosted or hinted, not fully splayed.
8. The authoritative durable layer is the telemetry contract: what exists to display.
9. Skins are how the contract is displayed: swappable, click-to-change, and user-buildable.
10. The existing `?lens=ux|dx|ax` API is a primitive projection protocol and should evolve into viewer depths: user, developer, agent.
11. The two dials are orthogonal: left dial changes space / node, right dial changes viewer / reveal depth.
12. The frame is a plus-sign manifold: vertical space axis, horizontal viewer axis, one prominent cell, four ghosted neighbors.
13. Object permanence across both axes is mandatory.
14. Animation is a skin detail, not architecture.
15. Skin #1 is the glass core section with two permanent chambers, Delivery and Discovery.
16. A stop is a localized obstruction, not a red status.
17. If the system cannot localize the cause, `cause not localized` is itself the visible obstruction.
18. The fleet is two lanes populated with many cores; Discovery fans promoted candidates into Delivery as parallel async rockets.
19. The `mw next` loop is the heartbeat advancing cores.
20. History is rings on the specimen, not a separate timeline.
21. The glass vending machine metaphor is locked: item -> mechanism -> jam -> next action.
22. Existing returned-call data is mostly already captured; B2 must surface it legibly.
23. The live in-flight call is the black box; B2 must start capturing it while it runs.
24. The key missing capture is a stall/loop/no-progress signal, not another after-the-fact timeout.
25. Every existing Made Well feature and command must survive.
26. Agent auto-self-correction is explicitly enabled by B2 but not built in B2.
