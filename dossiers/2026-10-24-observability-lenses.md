# Observability Lenses — trust-through-sight architecture for Made Well

## Purpose

This dossier specifies B2's observability architecture for Made Well.

Made Well is already durable. The TypeScript + Effect rewrite made work items, invocations, steps, stages, phases, lanes, events, calls, tool events, flags, the glass, and exports survive across process death and repeated invocations. Durability is not the ask here, and this dossier does not re-spec it.

The ask is **trust**.

Trust comes from **sight**. A vending machine that cannot be seen into is not trusted even when it works: the operator hears the widget drop, but it never reaches his hand, so he is out a dollar and a turn. The fix is not to make the vending machine more durable. The fix is to make it **glass**: the operator watches the widget travel the entire corridor to his hand.

The top-level signal must therefore be a **light switch**: binary, immediate, and verifiable. On / not-on. Done / not-done. Worked / did-not-work. The operator should be able to look once and know whether the thing reached his hand.

When the switch reads not-on, the same system must let him zoom inward until the broken layer is visible: the switch itself, the wiring, or the power to the house.

## Everything is a function

The governing model is simple:

```text
input -> function -> output
```

Made Well itself is one function:

```text
Made Well(idea) -> delivered idea
```

Discovery is a function. Delivery is a function. Each phase is a function. Each lane is a function. Each agent call is a function. Inside each call are function definitions, invocations, arguments, nested methods, method invocations, returns, outputs, logs, traces, metrics, and telemetry.

Do not get precious about whether the internal implementation is a DAG, a state machine, a workflow engine, or a functional program. The operator's model is recursive and sufficient:

```text
arg -> invocation -> return -> output
```

The trace is this function tree all the way down to the subatomic unit.

B2's job is to make that function tree visible at the right zoom depth for the observer.

## One data core

There is exactly one source of truth: the **function-tree trace**.

The trace is not three separate observability systems. It is not an operator status system, a developer diagnostics system, and an agent log system glued together. It is one durable and live function tree, collapsed differently depending on who is looking.

The core must include both bodies of evidence:

1. **Durable returned-call trace** — the material Made Well already records after transitions and calls return: items, events, calls, tool events, tokens, flags, holds, verification results, glass snapshots, exports, runner events, and telemetry.
2. **Live in-flight trace** — the missing material B2 must start capturing while a function is still running: raw stream fragments, tool starts/results, heartbeat/progress, active invocation, elapsed time, last output, repeated patterns, and stall/loop/no-progress signals.

The first body mostly already exists. The second body is the black box.

Every lens reads from this one core. A renderer may choose what to show. It must not invent a second truth.

## The three fixed lenses

The lenses are fixed zoom depths into the same trace.

Changing lenses does not change the data. It changes the collapse: the same underlying function tree is observed at a different magnification.

## Lens 1: UX / 30,000 ft

### Observer

The operator as a non-technical user of the machine.

### Question answered

What am I working on? What is Made Well doing? Is it done — yes or no?

### Shape

This is the light switch.

It should collapse the function tree into a small number of tangible, binary or near-binary facts:

- item title and objective;
- current top-level state;
- done / not done;
- needs you / does not need you;
- waiting / working / shipped / failed;
- the next operator action, if any;
- visible proof that output reached the hand: shipped commit, command, check result, candidate list, or hold.

This lens is allowed to be beautiful. Buttons, colors, checkboxes, strong state labels, and calm affordances belong here. It is the non-technical surface that makes the vending machine feel like glass.

### It must not show

- raw harness streams by default;
- implementation internals;
- uncollapsed call trees;
- provider-specific noise;
- speculative diagnostics.

The UX lens is not less true because it is compressed. It is the same trace collapsed to the operator's immediate trust question.

## Lens 2: DX / 15,000 ft

### Observer

The developer peeking under the hood.

### Question answered

Where exactly is the work, where did it stop, and what evidence explains that state?

### Shape

This lens zooms from the light switch into the machine corridor.

It should expose:

- phase, lane, stage, job, profile, and track;
- discovery versus delivery position;
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
- export and replay entry points.

The DX lens is where the durable trace is already strong. Calls, events, tool events, flags, verification results, glass, export folders, and telemetry already exist after calls return. B2 should surface those facts legibly rather than re-capture them.

### It must distinguish

DX must make the difference between these states obvious:

- actively running versus queued;
- waiting on quota versus waiting on operator;
- retrying after a rejected answer versus doing useful work;
- NQ churn versus execution;
- verification failure routed to arbiter versus operator hold;
- runner alive versus runner lost;
- call over budget versus still within budget;
- captured failure versus live in-flight blind spot.

The developer should not need to open SQLite, inspect export folders, or infer from a spinning process that something is wrong.

## Lens 3: AX / 0 ft

### Observer

The agent and any agentic debugger operating at ground level.

### Question answered

What function am I inside, what arguments did I receive, what did I invoke, what returned, what output did I produce, and am I stuck/erroring/looping right now?

### Shape

This is the subatomic trace.

It should expose the function tree in machine-consumable form:

- function identity: item, job, call kind, profile, card, harness, model;
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
- return value, parse result, refusal reason, error, or limit.

The AX lens is not a prettier log. It is the agent's mirror. An agent should be able to read its own live trace and know: I am repeating myself; my output is not parseable; my final JSON is missing fields; I have made no progress; I am stuck in a tool loop; I am about to waste the operator's turn.

B2 must make that visibility possible. Automatic self-correction is not part of B2; it is the explicit follow-on enabled by this lens.

## Surface versus capture

B2 has two distinct bodies of work. They must not be confused.

## Surface: render what Made Well already knows

After a call returns, Made Well already captures most of the record needed for UX and DX:

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

The surface work is therefore mostly low-risk re-rendering of existing durable data at three zoom depths.

The UX lens compresses it into the light switch.

The DX lens arranges it into phase/lane/stage diagnostics.

The AX lens reads the same returned-call facts as a function-level postmortem.

This surface work must preserve every existing feature. `mw next`, `mw status`, `mw show`, `mw holds`, `mw replay`, `mw export`, telemetry, the glass, prescriptions, harnesses, cards, NQ, holds, verification, shipping, pruning, and evals all remain valid. B2 adds sight; it does not replace the machine.

## Capture: close the live-call black box

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

The signal belongs in the trace, not only in a renderer. UX may collapse it into "stuck." DX may show the stalled phase/call/tool. AX must expose the exact live function facts so an agent can debug itself.

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

## Render-target cartridge seam

The render target is not the architecture.

Terminal, headless JSON, browser, sidecar, TUI, static HTML, GPU canvas, or any future display surface must all read the same function-tree trace. They are cartridges over the one data core.

The invariant is:

```text
one trace core -> many render cartridges
```

A renderer may choose colors, buttons, layout, density, animation, transport, polling, streaming, or file format. It may decide whether it is optimized for UX, DX, AX, or a combined operator console. It may be present or absent.

It must not own the truth.

If a renderer is absent, disabled, invalid, or failing, Made Well still works and the trace still exists. The console owns the invariant flow. Renderers are cartridges.

This mirrors the cartridge thesis in the decision-model dossier: optional surfaces may enhance the experience, but the core machine must not depend on any one renderer.

## Preservation constraints

B2 must preserve every existing Made Well feature.

Specifically:

- no existing command disappears;
- no existing JSON contract is casually broken;
- no current durable record becomes less available;
- no current glass/export/telemetry affordance is removed;
- no current NQ, hold, quota, verification, ship, prune, eval, prescription, harness, or card behavior is replaced by a renderer;
- no renderer becomes required for work to proceed;
- no live-capture stream is allowed to become the only durable record;
- no agent auto-action is introduced as part of B2.

B2 adds sight to the existing machine. It does not ask the operator to trust a different machine.

## Enabled follow-on: agent self-correction

The AX lens deliberately enables a later capability: agent automatic self-correction.

That follow-on is out of scope for B2.

B2 must not build automatic loop-breaking, automatic retry shaping, automatic self-repair, or autonomous correction behavior. It must build the trace and signal that make those behaviors possible later.

The boundary is:

- **B2 builds:** three-lens architecture, one trace core, surfacing of already-durable data, live in-flight capture, and first-class stall/loop/no-progress signal.
- **Future work builds:** agents acting on that signal to interrupt themselves, correct their output, change strategy, or escalate before wasting a turn.

This matters because trust comes before autonomy. The operator must first see the machine. Only then should the machine be allowed to act on what it sees.

## Decision summary

The settled design is:

1. Made Well's observability is a trust feature, not a durability feature.
2. The governing metaphor is a glass vending machine with a light switch at the top.
3. The system is modeled as a recursive function tree: input -> function -> output at every level.
4. There is one data core: the durable and live function-tree trace.
5. UX, DX, and AX are fixed zoom-depth lenses over that same core, not separate data systems.
6. UX / 30,000 ft gives the operator the binary done/not-done light switch.
7. DX / 15,000 ft gives the developer phase/lane/stage/call diagnostics.
8. AX / 0 ft gives the agent the subatomic live trace needed to debug itself.
9. Existing returned-call data is mostly already captured; B2 must surface it legibly.
10. The live in-flight call is the black box; B2 must start capturing it while it runs.
11. The key missing capture is a stall/loop/no-progress signal, not another after-the-fact timeout.
12. Renderers are cartridges over the one trace core; no specific renderer is designed here.
13. Every existing Made Well feature and command must survive.
14. Agent auto-self-correction is explicitly enabled by B2 but not built in B2.
