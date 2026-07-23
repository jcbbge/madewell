# Excavation Track B — v5 Deep Read: the Zig Organism

**Run:** 2026-07-22. Sources: /Users/jrg/constellation-zg (docs + live artifacts). Each concept: citation, plain-language explanation, lens(es) fed.

## 1. The telemetry spine as sensor array — feeds L1, L2

**Cites:** VISION.md:19-20 ("The telemetry spine is not a logger. It is a sensor array."); TELEMETRY.md:3 ("*Captured from live session revelation — do not summarize, do not compress*"), :11 ("It is a **sensor array** — the nervous system of a living organism."), :402 ("the nervous system of a **coordinated mesh of entities**. Every entity in the mesh is a first-class emitter. Every event knows who caused it."); VISION.md:331 ("The spine is the source of truth. If it isn't emitted, it doesn't exist.").

**Plain language:** telemetry is not observability bolted on; it IS the system's ground truth. Every primitive fire carries an Envelope (`id`, `parent_id`, `phase`, nanosecond `ts` — VISION.md:305-311); `parent_id` makes nesting structure, not inference. Feeds L1 because episodic memory is defined as spine queries (below); feeds L2 because any context "pane" is a reader over this signal.

**Live proof it ran:** /Users/jrg/.constellation/constellation.log (4,403 lines, sampled with head/tail/grep this run) shows real emissions: `emit id=0 kind=session phase=invoked name=dev-boot`, arc segments discovered (`10-assemble`, `10-start`, `10-receive`, `10-done`, `10-send`), star lifecycle (`kind=star phase=completed name=aldebaran`), `kind=plugin ... name=pheromone:emit`, `markarian: api status=.ok`, and — notably — **the user as a first-class telemetry actor**: `kind=user phase=invoked name=menu_displayed / option_selected / prompt_displayed / input_received`. The binary exists at /Users/jrg/bin/constellation.

**SECURITY FLAG (not reproduced here):** /Users/jrg/.config/constellation/config.toml contains a live Anthropic API key in plaintext (read this run). Recommend rotation before the v6 repo goes public-adjacent.

## 2. The organism model — feeds L4

**Cites:** VISION.md:52-63: "Constellation is not a tool. It is a **living organism**" with nervous system (spine), heartbeat (agent loop), metabolism (primitive dispatch), memory (session arena, pheromone trails), children (stars), lifespan ("boot to shutdown, one breath"). Boot and shutdown are first-class events (VISION.md:321-324: "The discovery pulse at boot is the **opening note**. The telemetry flush at shutdown is the **final chord**.").

**Plain language:** the runtime is modeled as a body with a lifespan, not a service. Every later concept (accretion, catabolism, resonance) is a metabolic phase of this body.

## 3. The fractal, Level 0-5 — feeds L4

**Cites:** TAXONOMY.md:6-17 (table: 0 Harness → 1 Star → 2 Constellation → 3 Galaxy → 4 Cosmos → 5 Multi-Org) and :21-32, "The Recursive Truth": `MultiOrg = Harness<Cosmos> ... Star = Harness<Arc>; Arc = Pipeline<Segment>` — "Same discipline at every level. Same telemetry spine. Same `actor_id` join key across boundaries." Also TAXONOMY.md:208: "The Cosmos and Galaxy layers (Levels 3-4) are trivial once Constellation works — they're just the harness pattern applied" — the fractal is a cost-collapse claim, not just an aesthetic.

**Plain language:** one substrate, recursively parameterized by what it orchestrates. v6's biggest planned win: the fractal becomes literally one recursive function (CONSTELLATION-V6-CONVERGENCE.md:62-69).

## 4. The six stars / four houses / Markarian the Quasar — feeds L4, L6

**Cites:** TAXONOMY.md:56-68 (Vega, Polaris, Cassiopeia, Sirius, Orion, Aldebaran; Polaris "has exactly two functions"); :133-141 (Dawn→STARCHART.md, Meridian→SPEC_SHEET.md, Descent→code+TEST_SUITE.md, Night→VERIFIED_COMMIT); :212-221 ("The 6-star / 4-house structure is not specific to software... Any domain. Any industry. The stars change skills; the structure holds."). Markarian: TAXONOMY.md:78-126 — "not a star... the persistent awareness of the Constellation," actor_id `concierge`, DISCOVERY MODE ("No arc starts... Until the work is named," :98-105) then FACILITATION MODE; "Speaks to the user. The fleet does not." (:118).

**Plain language:** roles are fixed, work cycles through phases, and one permanent non-worker entity is the only user-facing surface. Markarian is the proto-console: the thing you talk to that is not the thing that works. Feeds L6 directly (Made Well's console concept rhymes; see 50-madewell-loops.md).

## 5. The Firmament — primitive composition — feeds L3

**Cites:** HARNESS_RUNTIME_SPEC.md:669-886. The problem: ":671 — Past ~30 primitives, agents forget what they have and default to the same 2-3 every time." The fix: ":683 — Not 'search and pick one' — **search, compose N primitives across M kinds, execute as a unit.**" Terminology (:687-693): Firmament (registry), Alignment (composed set), Resonance (learned co-use), Emission (execution trace: intended/used/substituted/invented/skipped — :831-839). Three gates (:694-743): SCAN ("The star never sees the full firmament listing. Discovery is on-demand pull, not ambient push." :707-708), ALIGN (layered, dependency-resolved), FUSE with the improvisation cascade (:737-743): "exact match → resonant substitute → cross-kind composition → star-generated (invent, register as draft, use now) → unresolvable (surface)." The ten primitive kinds table: :746-761 (Directive, Skill, Tool, Hook, Rule, MCP, Plugin, Agent, Subagent, Command).

**Plain language:** a searchable catalog plus a composition engine plus a learning loop. This is strudel's pantry as a runtime organ — the convergence doc says so explicitly (CONSTELLATION-V6-CONVERGENCE.md:115-116: "This is *Strudel's pantry, promoted to a first-class runtime organ*").

## 6. Four-layer memory + context-as-assembled — feeds L1, L2

**Cites:** HARNESS_RUNTIME_SPEC.md:472-481: Working (turn-scoped, "the only ephemeral layer") / Episodic (event log, "Session → trajectory → permanent") / Semantic (deferred) / Procedural (skills). Isolation: :485-489 — "Memory is isolated per-star... Sharing risks collusion... knowledge transfer explicit and auditable" (only via Nebula artifacts or nQ). Context: :493-495 — "The industry default is 'fill until full, then compress.' Constellation treats the context window as a **lens that focuses** — assembled fresh each turn by querying memory layers." ContextAssembly + TokenBudget structs :529-554; ContextReshape hook between turns :573-601 ("Compaction is one reshape strategy" among summarization, salience filtering, recency windowing, semantic clustering); budget hierarchy defaults→constellation→star→task :605-628. Semantic memory explicitly deferred, with "Alembic substrate (already exists for agent-core memory)" listed as an option (:638).

**Plain language:** memory is four query surfaces with per-layer token budgets, and the context window is a per-turn assembly, not an accumulation. This is the v5 formalization of the same idea the pane project called the stained-glass pane (see 30-memory-context.md) — independently re-derived thirteen months apart.

## 7. Thin/thick star — the slider — feeds L3, L4

**Cites:** HARNESS_RUNTIME_SPEC.md:67 ("Slider, Not Fork"), :202-257: thin star = 5 segments ("Minimal overhead. Trust the model."), thick star = 11 segments with policy engine, approval gates ("surface = orbit — nQ protocol via Nebula"), budgets ("max_cost_per_trajectory = 10.00"). ":257 — Full governance... Same core contracts."

**Plain language:** governance depth is configuration, not a fork. One pipeline definition scales from research toy to production agent.

## 8. Resonance architecture — feeds L4

**Cites:** RESONANCE_ARCHITECTURE_0629.md. The diagnosis: ":12-14 — Markarian has become traffic control rather than gravitational center... a centralized model wearing the skin of a distributed one." The governing ratio: ":16 — Markarian should account for less than a third of the factory's total coordination activity." House Systems with Focal Stars (:35-44, "Coordination between systems is gravitational — felt through the medium, not commanded through messages"); the Resonance Ring (:50-78): two permanent non-adjacent pairs, Dawn↔Descent (intent traces / discovery traces) and Meridian↔Night (success criteria / failure patterns); Flux Nebula (:84-95): "monitors its own pheromone concentrations and fires **Stellar Events** when thresholds are crossed — a reactive field, not a database"; Spectral Charters (:99-107): "a per-House-System document encoding the opinionated DNA... When a Focal Star must decide locally, it decides against its Charter"; Orbital Completion (:138-146): "a trajectory... reaches completion without Markarian being present... degrades gracefully" (suspension trace + hold, never abort).

**Plain language:** decentralization by pheromone thresholds and local constitutions instead of a manager. The seven principles at :172-180 are quotable law.

## 9. Autonomy gradient — feeds L4

**Cites:** AUTONOMY_GRADIENT_0629.md. Four levels (:21-47): Supervised (4 pauses/trajectory) → Nominal (2) → Minimal (escalations only) → Autonomous (dark factory). Mission Confidence (:51-68): derived from spine (trajectory accuracy, escalation rate, charter adherence, proposal acceptance); "The system doesn't self-promote... The operator pulls the lever. The system earns the ask." Per-House-System, not per-project (:72-80: "Descent stays on a tighter leash longer"). **The Irreducible Pause** (:84-90): "Even in dark factory mode, Markarian presents what the factory produced and what it learned... a gate on the system's own evolution... The factory runs dark; the factory's opinions about itself never change without your approval." Madewell linkage (:112-116): "Madewell's cooperative pause... is not overridden... The cooperative pause never disappears. Its frequency is a function of earned confidence."

**Plain language:** autonomy is earned per-organ from measured telemetry, and the one pause that never disappears is the review of the system's proposals about itself.

## 10. Dark Phase Accretion + Catabolism — feeds L1, L3, L4

**Cites:** RESONANCE_ARCHITECTURE_0629.md:111-133. "When the factory goes quiescent... accumulated pheromone patterns analyzed into actionable proposals": arc-combos → composite primitives, tool sequences → plugins, recurring failures → recovery handlers, overruns → planning advisories → **Emergence Proposals**, presented by Markarian at next boot. Catabolism (:123-133): decay detection, merge pressure, fidelity check, compression — "Without catabolism the Nebula becomes a junk drawer. The factory that only accretes eventually floods." Precursor: VISION.md:217-232, the processing-sigils evolution layer ("The system proposes its own evolution... promote / prune / heal / strengthen. This is not automatic execution — it surfaces proposals.").

**Plain language:** self-improvement is a metabolic phase gated by the human, and pruning is mandatory, not optional. Note the rhyme with circadian's compost rules and rumen's rule-retirement metabolism (see 30- and 50- files) — three organs independently evolved a "things must die" clause.

## 11. DAG architecture (madewell crossing into constellation) — feeds L4, L5

**Cites:** DAG_ARCHITECTURE_0629.md:6 ("Madewell has already implemented the foundation (adjacency list in JSON stores, frontier-based dispatch, `dependsOn` field)"); two levels, same structure (:20-58): trajectory inner graph + constellation outer graph; the Focal Star as graph processor (:64-85: "dispatch all frontier items concurrently... This is the only algorithmic change"); graph-state Stellar Events incl. `trajectory.deadlock-detected` (:95-100); ":112 — The graph is not static — it's a living structure refined by the Resonance Ring's feedback." Storage: ":118-125 — No new infrastructure... `dependsOn` is a structural declaration, not an event stream."

**Plain language:** the loop-as-graph idea flows FROM Made Well INTO Constellation, with Made Well's implementation named as the proven reference (:137). Direct evidence for L4's "cyclic graph — structure, not strict definition."

## 12. Narrative arc, emotional telemetry, skins — feeds L2 (as spine readers)

**Cites:** VISION.md:93-121 (exposition→climax→resolution; "Emotional telemetry is real and readable from behavior signals" — frustration loop, flow state, flailing, mastery; the operator quoted at :115: "I have coding sessions where things are positive and fun. I have others where I'm fucking pissed off."); the skin system :152-195 ("Winamp for Agent Cognition"; "The spine signal is fixed. The rendering philosophy is not."; 8 visual skins + 5 audio skins); rendering constraint :298 ("The skin is a lens over the signal, not a transform of it.").

**Plain language:** all surface experiences are interpretations of the same fixed signal. The word "lens" recurs — the same optical grammar as the stained-glass pane and Made Well's lensviews.

---

## SOURCES

- /Users/jrg/constellation-zg/VISION.md (full read this run)
- /Users/jrg/constellation-zg/TAXONOMY.md (full read this run)
- /Users/jrg/constellation-zg/TELEMETRY.md:3,11,261,398-402 (grep + targeted read this run)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:1-120, 200-320, 460-663, 669-899 (read this run)
- /Users/jrg/constellation-zg/docs/RESONANCE_ARCHITECTURE_0629.md (full read this run)
- /Users/jrg/constellation-zg/docs/AUTONOMY_GRADIENT_0629.md (full read this run)
- /Users/jrg/constellation-zg/docs/DAG_ARCHITECTURE_0629.md (full read this run)
- /Users/jrg/.constellation/constellation.log — sampled via head/tail/grep this run (4,403 lines confirmed)
- /Users/jrg/.config/constellation/config.toml (read this run; key not reproduced)
- /Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:62-69, 110-120 (read this run)
