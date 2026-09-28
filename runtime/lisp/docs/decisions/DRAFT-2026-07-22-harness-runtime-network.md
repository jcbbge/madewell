# Draft — 2026-07-22: Harness vs Runtime vs Network (Topic 1 definitions)

**Status:** DRAFT for discussion. Options with trade-offs, not decisions — the axis
question and the naming question are the operator's to settle. Every claim below traces
to one of four sources, cited inline: `TAXONOMY.md` (T), `HARNESS_RUNTIME_SPEC.md` (S),
`lisp-agent/agent.lisp` (A), and the task file Topic 1 (Q). Diagram deferred to canvas
per the task's deliverable note.

## 1. The three one-sentence definitions (teachable, for stream)

- **Harness** — the universal substrate that runs one agent's turns: the loop, the
  session, the telemetry spine, and the lifecycle, with no awareness of what it is
  running (T:16-17, T:40-48; S:44-49 "HARNESS (Level 0) — universal substrate: spine,
  session, loop, discovery").
- **Runtime** — the live process that hosts and executes a harness instance: in v5 a
  spawned OS subprocess per Star (T:54 "Each star runs its own harness instance as an
  OS subprocess"; S:11 "The runtime that executes an individual agent's inner life");
  in v6, concretely, a running SBCL image.
- **Network** — many running harnesses coordinating as one field, each level
  orchestrating the level below through the same substrate and talking indirectly
  through the Nebula, never directly (T:7-8 "recursive runtime... each level
  orchestrates the level below"; T:72 "Communication: via Nebula (file-based
  pheromones), not direct IPC"; S:287-289 "Stars do not communicate directly").

The overlap that kept blurring in the Zig build (Q): harness and runtime coincide
exactly when ONE harness instance is running — the singular agent you talk to is one
harness hosted by one runtime, which is why they feel identical there. They separate
the moment anything spawns: the harness is the FORM (the same code/shape at every
level), the runtime is each INSTANCE of it living in a process, and the network is the
FIELD of those instances plus the Nebula between them. Form, instance, field.

## 2. Coordinator / orchestrator / agent: new axis, or the celestial fractal renamed?

The desired shape is "coordinator per domain -> orchestrator(s) -> agent(s)/
subagent(s)" (Q). The existing fractal is Arc->Star->Constellation->Galaxy->Cosmos with
`X = Harness<Y>` (T:23-32). Three options, trade-offs stated, NO decision made here:

**Option A — the fractal renamed (a mapping, not a new axis).**
agent = Star (L1), orchestrator = Constellation (L2), coordinator = Galaxy (L3). The
correspondence is strong: a Galaxy is "one domain or team. Engineering, Marketing,
Sales" (T:153-157), which is verbatim the coordinator-per-domain want (Q: "software,
marketing, sales"). And a Constellation "orchestrates 6 stars through 4 houses"
(T:15, T:131) — an orchestrator by name and function.
Trade-off: cleanest ontology (one hierarchy, two vocabularies); but it inherits the
level RIGIDITY — in v5, levels are structural positions, and a coordinator that is
"just L3" cannot simultaneously be the small agent you talk to without moving levels.

**Option B — a genuinely new axis: role, orthogonal to level.**
Coordinator/orchestrator/agent are BEHAVIORS a harness instance performs, while the
celestial names stay ADDRESSES in the topology. Evidence this axis already exists
half-formed: Markarian is explicitly "not a star... not the orchestrator" yet is the
sole user-facing entity (T:80-126) — a role that refuses to be a level; and the spec's
primitive kinds already distinguish Agent (peer) from Subagent (hierarchical,
fire-and-forget) as kinds, not levels (S:759-760).
Trade-off: matches the flip requirement natively (a role can be re-bound without
moving in a hierarchy); costs a second vocabulary that must be taught and kept from
blurring — the exact failure mode the Zig build hit (Q).

**Option C — keep celestial as canon, adopt coordinator/orchestrator/agent as the
PLAIN-LANGUAGE projection.** Docs and stream-speak use coordinator/orchestrator/agent;
code and telemetry use the celestial names with a stated mapping (Option A's table).
Trade-off: best for teaching (two audiences, one truth); the mapping table itself
becomes a thing to maintain, and the carried namespace-rollout question (how much
celestial goes live day one) interacts with it.

Research's read, framed as input not decision: B explains the operator's flip
requirement most mechanically; C is what B looks like when spoken on stream; A alone
re-creates the v5 rigidity the flip requirement is straining against.

## 3. Context-flip, mechanically

The requirement: one agent you talk to that can flip to orchestrator, or again to
coordinator — fractal (Q). Two mechanisms, and the tension the task names:

**Mechanism 1 — same process re-binds its role.** The v6 plan's core recursion makes
level a PARAMETER: one `harness(level, orchestrates, state)` function calling itself
with a different `level` (Q, citing the convergence plan's fractal-in-Lisp form). In a
live image, re-binding the interlocutor's role is a function call; nothing restarts;
the conversation and its memory persist (A demonstrates the substrate: the whole agent
is a recursive function over a growing message list, agent.lisp:95-104, with state
that survives process death via remember/recall, A:110-129).

**Mechanism 2 — the flip spawns.** The flipped process does not DO the lower-level
work; it becomes the parent and spawns child harnesses as OS subprocesses, which is the
v5 contract (S:30-40 subprocess spawn with STAR_ID/env; T:54 one OS subprocess per
star).

**The isolation-mandate tension (named in Q, real in the sources).** Everything
supervisory in v5 lives at a process boundary: stars are subprocesses, not threads
(S:459 "Stars are subprocesses... No network boundaries inside the harness"), memory
is isolated per-star to prevent collusion (S:484-489), and knowledge crosses only via
Nebula artifacts (S:489). A coordinator that flips back down and edits code inside its
own image would merge fault domains — builder and supervisor in one heap — violating
the mandate that a coordinator and the agents it supervises be separate OS processes
(Q).

**Resolution offered for discussion (recommendation, not decision):** the flip is a
promotion of the INTERLOCUTOR, never a merger of fault domains. Concretely: your
single agent flips UP by re-binding role in place (mechanism 1 — cheap, continuous,
image-native) and from that moment delegates all subordinate work DOWNWARD by spawning
(mechanism 2 — the v5 star contract, unchanged). Flip-up = rebind; work-down = spawn.
The image re-binding its role is native Lisp; the process boundary stays exactly where
v5 put it. A flip back DOWN to "just an agent doing work" is then also safe, because at
that moment it supervises nothing.

## 4. Single-agent mode is first-class (confirmed against the sources)

The same harness, launched alone, IS a usable agent: agent.lisp is a complete working
coding/computation agent in 138 lines — model call (A:79-88), recursive tool loop
(A:95-104), persistent memory (A:110-129), one entry point (A:133-138) — with no
orchestrator above it. The network is then that same shape recursively: `Constellation
= Harness<Star>` and every other level is the same substrate re-instantiated (T:23-32).
Single-agent mode is not a degenerate fleet; the fleet is the single agent, fractally
(Q's requirement, satisfied by T's recursive truth rather than by any added machinery).

## SOURCES

- /Users/jrg/constellation-zg/TAXONOMY.md — lines cited as T:n (fractal table 12-17; recursive truth 23-32; harness components 40-48; star-as-subprocess 54; Nebula-not-IPC 72; Markarian 80-126; Constellation 131; Galaxy 153-157)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md — cited as S:n (levels diagram 24-49; runtime purpose 11; subprocess contract 263-285; pheromone contract 287-305; rejected-microservices 459; memory isolation 484-491; Agent/Subagent kinds 759-760)
- /Users/jrg/madewell-meta/runtime/lisp-agent/agent.lisp — cited as A:n (tool 45-63; model call 79-88; loop 95-104; memory 110-129; entry 133-138)
- /Users/jrg/madewell-meta/runtime/TASK-2026-07-22-v6-preflight-research.md Topic 1 — cited as Q (operator's verbatim intent, desired shape, flip requirement, isolation-mandate check)
- All four files read in full this session.
