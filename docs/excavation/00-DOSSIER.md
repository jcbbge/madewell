# The Constellation Excavation Dossier

**Date:** 2026-07-22
**Purpose:** before v6 writes a line of Lisp — every iteration and every organ of the ecosystem deep-dived; the hidden gems, golden nuggets, and discovered truths unearthed and cited. Inventory and evidence only; what the six lenses become in v6 is the operator's call.
**Method note:** the runtime exposed no agent-spawn tool, so all five research tracks (A-E) were executed by the orchestrator itself, sequentially, in the briefed partition. Every citation below was acquired first-hand this run (file:line read, command run, or session transcript grepped). Track files: 10-lineage.md, 20-v5-organism.md, 30-memory-context.md, 40-primitives.md, 50-madewell-loops.md.
**Security flag:** /Users/jrg/.config/constellation/config.toml holds a live Anthropic API key in plaintext (read this run, not reproduced). Rotate before anything goes public.

---

## The through-line

Two laws were discovered independently, over and over, by every iteration and every organ. They are the excavation's core finding.

**Law 1 — Structural, not consultative.** Anything the system needs to happen must happen because the pipe cannot advance without it; anything offered as an optional consult gets skipped.
- Made Well: "Anything optional is anything skipped... a pull-based grounding tool... measured 0% adoption across 45 runs" (madewell-meta/contact-points.md:10,21-23).
- v5's spine: "The spine is the source of truth. If it isn't emitted, it doesn't exist" (constellation-zg/VISION.md:331).
- Circadian: "Push, not pull. Memory is injected at session start. The working agent has zero memory duties" (circadian/mind/MIND-SPEC.md:21-23).
- Strudel: "Discovery is on-demand pull, not ambient push" — but the gateway itself is the only door (strudel-lab/STRUDEL.md:73).
- Rumen: "from a sign to a fence. A fence doesn't care whether you read it" (rumen/README.md:35-36).

**Law 2 — Metabolism, not storage. Things must be able to die.**
- v5: "Without catabolism the Nebula becomes a junk drawer. The factory that only accretes eventually floods" (RESONANCE_ARCHITECTURE_0629.md:132).
- Circadian: "A mind that never forgets is not a mind, it is a landfill" (MIND-SPEC.md:33); compost's digestion-completeness rule.
- Rumen: "the ability for a rule to *die* is what separates this from the document pile it replaces" (rumen/README.md:61-62).
- Alembic's founding: "an autonomous engine for serendipity that knows how to forget" (alembic/docs/DISPATCH_BIFURCATED_MIND.md:18).
- Made Well: "Excretion... The pipe holds only what advances the pipe" (contact-points.md:73-75).

v6's opportunity, in the operator's own convergence doc: make both laws language-level — "the pipe does not have to be argued for, because the pipe is the language" (CONSTELLATION-V6-CONVERGENCE.md:39-41).

---

## What each iteration taught (one paragraph each; full detail in 10- and 20-)

- **v1 (various → Collapsed):** the celestial namespace — stars, constellations, galaxies (VISION.md:13). The only v1 artifact that survives is the vocabulary, and it survives everywhere. Everything else: UNKNOWN (no archive exists or is even named).
- **v2 (TypeScript v.01):** stigmergic coordination — pheromones, desire lines, "ants coordinating without talking" (VISION.md:34,198-213) — and the nQ star-to-star question protocol, which survives as v5's orbit contract (HARNESS_RUNTIME_SPEC.md:99,307-320) and is slated for its Lisp upgrade (condition/restart instead of file polling, CONSTELLATION-V6-CONVERGENCE.md:84-88). Archive `~/constellation-ts` ABSENT.
- **v3 (TypeScript v.02):** SurrealDB as Nebula and cross-harness emission (VISION.md:15) — and the Adliyye Codex, the fully realized visual constitution which SURVIVES complete at constellation-zg/docs/ADLIYYE_CODEX.md. The DB-backed nebula was walked back to files in v5: the first recorded instance of the storage-dumb lesson.
- **v4 (Gleam/BEAM):** the actor/supervision instinct — "the right idea in the wrong place (in-image); v6 puts it at the boundary where it's real" (CONSTELLATION-V6-CONVERGENCE.md:95-96). Archive `~/constellation-gl` ABSENT; no first-person session record reachable.
- **v5 (Zig, alive on disk):** the sensor-array spine, the organism, the Level 0-5 fractal, Markarian, the Firmament, four-layer memory, context-as-assembled, thin/thick slider, resonance/House Systems, the autonomy gradient with the irreducible pause, Dark Phase Accretion with mandatory catabolism, and the DAG crossover from Made Well. All cited in 20-v5-organism.md. The binary ran; the log proves the spine emitted real events, including the user as a first-class actor.

---

## L1 — Opinionated views around memory. **Verdict: RICH** (the richest lens)

Best nugget: **"Store the fire, not the ash"** — "memory is activation — a flattened summary in generic prose activates generic thinking, while a fragment carrying jrg's actual words... re-lights the state that produced it" (circadian/mind/SELF.md:20). This is a falsifiable theory of what memory IS for a context-window mind, and it is why this dossier quotes verbatim everywhere.

The full opinion set (inventory in 30-memory-context.md): six memory architectures, five dead; the cliff = complexity accretion with quotes (SELF.md:14); load-bearing or dead / the greeting as daily test with a seven-verdict kill switch (MIND-SPEC.md:26-28,363-369); push-not-pull, zero in-session memory duties (MIND-SPEC.md:21-23); finite body, hard caps, compost with digestion-completeness (MIND-SPEC.md:31-35,279-292); motion is the metric, branching ratio one, "Possession is inventory. Memory is what causes thoughts" (SELF.md:26); vasculature not a tenth organ — "there is nothing left to build. There is only circulation to restore" (SELF.md:23); memory layers are scopes of attachment — turn/place/relationship (forest distillation :23); trails = stigmergic procedural memory written into repos (forest distillation :13); v5's four layers with per-star isolation as anti-collusion (HARNESS_RUNTIME_SPEC.md:472-491).

**Alembic vs circadian (evidence, no decision):** dream daemon plist renamed `.retired` (2026-07-13), no alembic launchd job loaded, circadian's three jobs registered; alembic namespace declared "READ-ONLY archive"; BUT retirement is explicitly gated ("alembic MCP + pi alembic-ingest stay registered UNTIL seven greeting verdicts pass AND pi sleep parity verifies"), and v5's spec still lists the alembic substrate as a semantic-memory candidate (HARNESS_RUNTIME_SPEC.md:638). Full evidence table in 30-memory-context.md Part 3.

## L2 — The context window / the stained-glass pane. **Verdict: RICH**

Best nugget: the pane PRD's own words (session 2026-04-23, transcript excavated): **"sliding a lens over a stained-glass window or micro-film"** — a pane-shift "recomputes the relevant subset of shards... based on the target phase, scope (project, episode, user), and temporal parameters," and each interaction is a **"Quantum-like Collapse"** of a permanent substrate into working context, with the operator's founding complaint on record: "this misalignment of what the context window is. It's fundamentally a misnomer... in danger of crippling progress."

The idea has been independently stated three times across 15 months: pane PRD (Apr 2026, stained glass/collapse), v5 spec (May 2026, "a **lens that focuses** — assembled fresh each turn," HARNESS_RUNTIME_SPEC.md:493-495, plus ContextReshape with explicit "what to forget"), circadian v2 roadmap (Jul 2026, "Compaction is an anti-pattern — append-only log plus a per-turn assembled pane... which the stateless API already secretly supports," forest distillation :13,23 — including KV-cache economics: stable prefix ordering + churn budget). Honest note: July "stained glass" search hits were false positives on the word "Sustained"; the concept is current, the phrase is from April.

## L3 — Primitive kinds as first-class citizens; the strudel gateway. **Verdict: RICH**

Best nugget: **the Firmament and strudel are one design, written twice** — scan/align/fuse (HARNESS_RUNTIME_SPEC.md:694-743) and search/prep/bake (strudel-lab/STRUDEL.md:68-88) share the same three gates and the same five-step improvisation cascade (exact → substitute → compose → invent-and-register → surface), nearly word for word. The operator's convergence doc already names it: "Strudel's pantry, promoted to a first-class runtime organ" (CONSTELLATION-V6-CONVERGENCE.md:115-116).

**The "TWO primitive kinds" question: FOUND.** strudel/README.md:51-54 — "**Two classes of primitive.** *On-demand* kinds (skills, tools, MCPs, subagents, commands) go through the gateway. *Ambient* kinds (rules, hooks) are always-on and declarative... you don't 'search for' a rule." Corroborated by v5: "Ambient primitives (Directive, Model) are never invoked... not particles, but atmosphere" (constellation-zg/TAXONOMY.md:237-238). The exact membrane placement differs between the two sources (hooks; see 40-primitives.md section 2) — that boundary is live design surface for v6.

Also established from source: the 10 kinds as a typed enum (strudel-lab/packages/bakery/src/types.ts:22-32), the primitive career path "phrase → command → skill → mcp/tool → subagent" with stage lifecycle and usage telemetry (types.ts:38-63), v5's wider taxonomy adding Signal kinds — Pheromone, Silence, User, Decision (TAXONOMY.md:235-236), and agent-core's 108-primitive warehouse (agent-core/TAXONOMY.md:19).

## L4 — Outer + inner loop as a cyclic graph. **Verdict: RICH**

Best nugget: **"The queue is just a degenerate graph... The graph is the general case"** (madewell-meta/inner-loop/make/MODULE.md:25-26) — with the frontier algorithm already implemented in Made Well's JSON stores and already adopted as Constellation's reference implementation (DAG_ARCHITECTURE_0629.md:6,137). The loops-as-graph is not an aspiration; it shipped on 2026-06-29 on both sides of the ecosystem.

The structure on record: outer loop fills the queue, inner loop drains it (operator verbatim, closeloop journal :58); the doors bracket the phases — "The doors are the framework. The phases are the corridor between them" (wire--two-doors-into-the-pipe.md:56); the engine oscillates ratchet/pause at the edge of chaos, with the cooperative pause as "the entropy-injection port" (the-temporal-axis.md:34-41); v5 supplies the scale versions — House Systems, Resonance Ring (non-adjacent pairs Dawn↔Descent, Meridian↔Night), Flux Nebula thresholds, and the autonomy gradient whose "irreducible pause" is the loop's one permanent human edge (AUTONOMY_GRADIENT_0629.md:84-90). Gaps: build and land modules are ○ (INDEX.md:28-29); the outer loop's "front half" (what fills the queue) is an open question the closeloop journal begins to answer (Build/Heal/Become, journal :22).

## L5 — Inner loop as irreducible primitives of work. **Verdict: RICH, but implicit**

Best nugget: **the phase-advance token is linear — "consumed by the door it opens (spent once, never reused)"** and the Isolation Mandate makes builder-verifies-itself "an **unspeakable arrow**, not a caught error" (the-temporal-axis.md:47-49). This is the deepest formal statement of the work-primitive idea: guarantees by substructural topology, not by checking.

Eight irreducible units are already named in source (full list in 50-madewell-loops.md L5): the item (`{id, item, status, dependsOn[]}`), the brief, the door/contact point, the phase-advance token, the role (5-role jump pack, "None plays two roles. Event log is truth"), the emission, the correction (the GEPA signal), and the pause. Caveat: no single file yet declares "these are the irreducible primitives of work" — the inventory above is assembled from six files. Writing that declaration is v6 work, and the lens's name suggests the operator already knows it.

## L6 — Made Well as console; cartridge packs of striated lensviews. **Verdict: RICH on console/cartridge/striation; the word "lensview" is new**

Best nugget: the operator's own founding words for the whole lens (session 2026-07-01, excavated verbatim): **"it's just made well. It's the bare console... you still have the code base as the cartridge itself. So the code is like the default cartridge... every decision, every bug fix, every feature is another layer on this filter."**

What exists: the console/cartridge nomenclature is settled and de-collided from Rumen's packs (EXPLORE-dawn-instrument.md:36-40); a real cartridge library at /Users/jrg/madewell/cartridges/dev with striation files (system, api, backend, ci-cd, frontend, design-system with DOCTRINE/color/motion/tokens/typography) loaded by reference, filling the console's Persona slot; the seating contract — the Rubric's nine cells as "electrical pins," plus the five-item cartridge contract, with "the kernel does not own the striations" (rubric.md:12-15,180-198; contact-points.md:80-82); and Rumen as the metabolizing organ at the exit, with the dawn instrument sketched as its mirror at the entrance (EXPLORE-dawn-instrument.md:29-33). What does not exist: any non-dev cartridge (departments are named — Engineering/Marketing/Sales galaxies, editor/writer/outreach-owner roles — but zero built); the workbench view ("Currently a gap," rubric.md:68-69); and the compound term "lensview" appears in no file read this run — its components (striations, the rubric-as-glasses, skins as "a lens over the signal") are all on record.

---

## Named-but-unbuilt, across all lenses (the v6 shopping list found in the ground)

1. Semantic memory — interface defined, implementation deferred (HARNESS_RUNTIME_SPEC.md:630-638)
2. The pane v2 — append-only log + assembled pane in pi, gated on propagation data (forest distillation :13)
3. The workbench view / console surface (rubric.md:68-69)
4. build + land outer-loop instruments (INDEX.md:28-29)
5. The dawn instrument — Rumen's mirror, "formal definition owed" (EXPLORE-dawn-instrument.md:3-4)
6. Trust calibrated to track record — aspirational in the rubric (rubric.md:124-125), fully designed in v5's autonomy gradient, never connected
7. Non-dev cartridges (department/scope packs) — zero exist
8. The two-kinds membrane — where hooks/directives/models sit is unsettled between strudel and v5
9. Trails — stigmergic procedural memory written into repos (forest distillation :13)
10. The Adliyye Codex skin — "must be preserved and implemented" (VISION.md:184), still unimplemented

---

## SOURCES

This synthesis cites only material excavated in the five track files, each of which carries its own full SOURCES section:
- 10-lineage.md — iterations 1-4, absent archives, v5/v6 lineage tables
- 20-v5-organism.md — constellation-zg docs + live artifacts (binary, log, config)
- 30-memory-context.md — circadian, alembic, pane session transcript, launchd state
- 40-primitives.md — strudel, strudel-lab, agent-core, Firmament
- 50-madewell-loops.md — madewell, madewell-meta, rumen, project-closeloop, 2026-07-01 session
Primary anchors re-cited here: /Users/jrg/constellation-zg/{VISION.md, TAXONOMY.md, TELEMETRY.md, docs/HARNESS_RUNTIME_SPEC.md, docs/RESONANCE_ARCHITECTURE_0629.md, docs/AUTONOMY_GRADIENT_0629.md, docs/DAG_ARCHITECTURE_0629.md, docs/ADLIYYE_CODEX.md}; /Users/jrg/constellation/{CONSTELLATION-V6-CONVERGENCE.md, EXPLORE-dawn-instrument.md}; /Users/jrg/circadian/mind/{MIND-SPEC.md, SELF.md}; /Users/jrg/alembic/{WORK.md, docs/DISPATCH_BIFURCATED_MIND.md, docs/2026-07-16-forest-session-distillation.md}; /Users/jrg/strudel/README.md; /Users/jrg/strudel-lab/{README.md, STRUDEL.md, docs/vocabulary.md, packages/bakery/src/types.ts}; /Users/jrg/agent-core/TAXONOMY.md; /Users/jrg/madewell/{MADEWELL.md, cartridges/dev/PACK.md}; /Users/jrg/madewell-meta/{INDEX.md, contact-points.md, rubric.md, the-temporal-axis.md, wire--two-doors-into-the-pipe.md, inner-loop/make/MODULE.md}; /Users/jrg/rumen/README.md; /Users/jrg/project-closeloop/journal/2026-07-19-the-agent-is-the-application.md; session transcripts under /Users/jrg/.pi/agent/sessions/ (pane 2026-04-23, madewell 2026-07-01, constellation-zg 2026-05-29, circadian 2026-07-22/23); launchctl + LaunchAgents listing; ls checks for absent archives.
