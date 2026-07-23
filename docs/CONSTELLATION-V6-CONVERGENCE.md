# Constellation v6 — the Lisp Level-0 Harness: convergence plan + lineage mining

**Date:** 2026-07-21
**Status:** founding plan. The starting-point document for the v6 build. Living — expect corrections.
**What this is:** the deep-dive user research you asked for — mine v1–v5 for everything worth
keeping, decide how each lands in Lisp, and lay out how we build it: from scratch, dogfooding
Made Well, with the agent as concierge and you in the loop the whole way.

**Identity (decided):** This is **Constellation 6** — specifically **Constellation's Level-0
Harness, built in its native language (Common Lisp)**. The scope changed: earlier Constellations
were the whole organism reaching for a substrate; v6 is the substrate itself — the pipe-owning
kernel where Made Well's laws stop being prose and become primitives. Not "Made Well Lisp" (Made
Well is the host-agnostic grammar; pinning it to Lisp would violate its own ethos). Not "something
new" (the temporal axis, contact-points, the ratchet, the pause are all preserved and hardened).
The v1→v5 lineage gets a namesake note in the open-source README; v6 starts clean.

Sources read this session (all this machine, 2026-07-21):
`~/madewell-meta/runtime/{the-runtime-convergence.html, EXPLORE-epistemics.md, lisp-agent/{agent.lisp,README.md}}`,
`~/madewell-meta/{the-temporal-axis.md, contact-points.md, wire--two-doors-into-the-pipe.md, rubric.md}`,
`~/constellation-zg/{VISION.md, PROGRAM.md, TAXONOMY.md, TELEMETRY.md,
docs/{HARNESS_RUNTIME_SPEC.md, DAG_ARCHITECTURE_0629.md, RESONANCE_ARCHITECTURE_0629.md,
AUTONOMY_GRADIENT_0629.md}}`.

---

## 1. The lineage (namesake note for the README)

From `constellation-zg/VISION.md` — five iterations, each failed, each crystallized something:

| # | Runtime | Crystallized (the irreplaceable thing) |
|---|---------|-----------------------------------------|
| 1 | various | the metaphor: stars, constellations, galaxies, the celestial namespace |
| 2 | TypeScript v.01 | pheromone model, stigmergic coordination, nQ (star-to-star question) protocol |
| 3 | TypeScript v.02 | SurrealDB as Nebula; cross-harness pheromone emission; the Adliyye Codex visual |
| 4 | Gleam/BEAM | actor model, fault isolation, supervision instinct (ETS nebula) |
| 5 | Zig | the telemetry spine as a *sensor array*; the organism model; the fractal (Level 0–5); the Firmament (primitive composition); the four-layer memory; thin/thick slider; resonance; autonomy gradient; Dark Phase Accretion |
| **6** | **Common Lisp** | **the pipe becomes the language** — every crystallized idea above stops being emulated and becomes a primitive (this document) |

The through-line the convergence verdict named: *"the frame was never the IP … what Lisp offers
is a body where the pipe does not have to be argued for, because the pipe is the language."*

---

## 2. The best of each iteration — what we pull, and how it lands in Lisp

Ranked by load-bearing-ness. Each row: the idea, which iteration it came from, why it's worth
keeping, and the Lisp form it takes at Level 0.

### Tier 1 — the spine and the shape (build first; everything hangs on these)

**A. The telemetry spine as sensor array (v5, TELEMETRY.md — "do not compress").**
Not a logger — the nervous system. Every primitive fire is a neuron; the Envelope
(`id, parent_id, phase, ts, duration_ns, actor_id, name`) is the impulse; `parent_id` encodes the
call tree (hook→tool→mcp→provider) so nesting is *structure, not inference*. This is the raw
telemetry pipeline you always wanted — the thing the (deferred) visualizer eats.
→ **Lisp:** the spine is a stream of typed values, and because code is data the event *is* the
same substrate the loop runs on. Emit is a function call in the recursion; `parent_id` is the
dynamic-extent parent binding (`*current-parent*` special var) — nesting is automatic, not
threaded by hand. The ring buffer is a vector; NDJSON out is one `shasht:write-json`. **Keep the
Envelope contract byte-compatible with v5** so any future visualizer/skin reads both.

**B. The fractal (v5, TAXONOMY.md).** `X = Harness<Y>` all the way down:
Arc→Star→Constellation→Galaxy→Cosmos→Multi-Org. Same substrate (spine, session, loop, lifecycle)
at every level. This is Made Well's "the loop is fractal — runs on a task and on the whole
project" made into an addressing scheme.
→ **Lisp:** one `(defun harness (level orchestrates state) ... (harness ...))` recursion,
parameterized by level. The fractal is literally the same function calling itself with a different
`orchestrates`. This is the single biggest win of the Lisp move — v5 had to write orchestrator.zig
+ star.zig + fleet.zig as separate code; here they're one recursive form.

**C. Contact points as the shape of the recursion (Made Well + convergence thesis).** The two
doors (Ground at entrance, Verify at exit), the ratchet, the pause — all become primitives.
→ **Lisp:** grounding = claims-as-typed-values + acquisition-as-scheduler-constraint; ratchet =
a linear token consumed by the door; pause = the condition system (`restart-case`/`signal`/
`invoke-restart` — resume in place). Covered fully in the prior "Made Well in Lisp" diagram
(canvas page 7). These are Tier-1 because they are the ethos.

### Tier 2 — the coordination model (build once stars exist)

**D. Stigmergic coordination / pheromones / nQ (v2–v3).** Stars don't call each other; they
write to and read from the Nebula (file-based pheromone store). The nQ protocol = a star emits a
question, polls for an answer. Desire lines = paths walked many times.
→ **Lisp:** the Nebula stays file-based and git-friendly (v5's `~/.constellation/nebula/{traj}/`
layout is good — keep it). nQ, though, gets *upgraded by the substrate*: v5 polls
`orbit/a_001.json`; in Lisp a star that needs an upstream answer **signals a condition** and the
coordinator **invokes a restart with the answer** — no polling, resume in place. Pheromones remain
files (durable, inspectable, feed the visualizer); the *synchronous ask* becomes a condition.
This is the one place the Lisp body strictly beats every prior iteration.

**E. Supervision at the process boundary (v4 Gleam instinct + convergence verdict).** Workers are
OS processes (the Isolation Mandate demands it: builder≠verifier, and workers are often other
harnesses). BEAM's guarantees — heap isolation, kill-a-wedged-worker, restart — are *free* at the
OS-process boundary; you need the isolation, not the cheapness.
→ **Lisp:** `uiop:launch-program` for spawn/monitor/kill/exit-code; a ~100-line one-for-one
supervisor. v4's actor model was the right idea in the wrong place (in-image); v6 puts it at the
boundary where it's real. First-cut board #3 in the convergence verdict.

**F. The Resonance Ring + House Systems + Flux Nebula (v5, RESONANCE_ARCHITECTURE).** Markarian
(the Quasar) should be a *minority stakeholder* (<⅓ of coordination) — a gravitational center, not
traffic control. Houses become semi-autonomous House Systems anchored by a Focal Star; non-adjacent
pairs (Dawn↔Descent, Meridian↔Night) share intelligence directly via Nebula channels; the Flux
Nebula fires Stellar Events on pheromone thresholds.
→ **Lisp:** House Systems are sub-harnesses (the fractal again). The Resonance Ring is
read/write to named Nebula channels — no new mechanism. Flux Nebula = a lightweight process
reading Nebula state on an interval, signaling on threshold. **Defer to after single-trajectory
works** — this is scale architecture, not MVP.

### Tier 3 — the intelligence layers (the differentiators; build after the loop breathes)

**G. The Firmament — primitive composition (v5, HARNESS_RUNTIME_SPEC).** The real solution to
"past ~30 primitives the agent forgets what it has and defaults to the same 2–3." Three gates:
**scan** (hybrid search for intent-matching primitives across 10 kinds — never sees the full list),
**align** (compose N primitives across M kinds into layered, dependency-resolved sets), **fuse**
(execute; improvise via a cascade: exact→resonant-substitute→cross-kind-compose→invent→surface-gap).
This is *Strudel's pantry, promoted to a first-class runtime organ* — it IS the "converge Strudel
in" piece.
→ **Lisp:** scan/align/fuse are three functions; an Alignment is a list of layers (data);
improvisation is a `cond` cascade. The improvise-and-register-a-draft step is trivial when code is
data — an invented primitive is a form the image can `eval` and keep. This is where the Lisp move
pays off hugely versus the Zig struct-heavy Firmament.

**H. Four-layer memory + context-as-assembled (v5, HARNESS_RUNTIME_SPEC).** Working (ephemeral) /
Episodic (spine queries) / Semantic (deferred) / Procedural (skills). Context window is a *lens
assembled fresh each turn* from budgeted queries, not "fill until full then compress." Per-star
isolation by default (anti-collusion); cross-star transfer only through Nebula artifacts.
→ **Lisp:** memory layers are query functions; the transcript-is-the-state insight from lisp-agent
(`remember (cycle (recall)))`) makes episodic memory nearly free. Semantic stays deferred — plug
SurrealDB (`:6000`, already running) behind the `semantic-query` function pointer when needed.
Keep the budget hierarchy (defaults→constellation→star→task).

**I. The autonomy gradient (v5, AUTONOMY_GRADIENT).** THE answer to your "stay out of the loop"
goal, and it's already designed on-axis. Four levels (Supervised→Nominal→Minimal→Autonomous);
the cooperative pause doesn't disappear, its *frequency* drops as confidence is *earned* (derived
from spine: trajectory accuracy, escalation rate, charter adherence, proposal acceptance). Per-House-
System, not per-project (Dawn/Meridian earn freedom fast; Descent stays leashed longer). The
**irreducible pause**: Emergence Proposals at boot — the factory runs dark, but never changes its
own opinions without you. This is exactly the "two pauses" split from the analysis: custodial
frequency drops to zero; the generative pause survives as the boot-time proposal review.
→ **Lisp:** autonomy level is a field on the Spectral Charter (per-House TOML); confidence
thresholds are computed from spine queries; promotion is a Markarian reading you accept. The
mechanism is the same condition-system pause fired at different frequencies.

**J. Dark Phase Accretion + Catabolism (v5, RESONANCE + VISION processing-sigils layer).** When
the factory idles, analyze desire lines into Emergence Proposals (arc-combos→composite primitives,
tool-sequences→plugins, recurring failures→recovery handlers). Crucially **catabolism**: also
prune (decay detection, merge pressure, fidelity check, compression) — "the factory that only
accretes eventually floods." This is GEPA/self-improvement as a metabolic phase.
→ **Lisp:** accretion reads the spine + pheromone history, proposes forms; because the harness is
a live image, an accepted proposal can `eval` into the running system (Circadian's REM as literal
self-modification). This is §5f of the analysis (topology corrections) with a home.

### Tier 4 — the surface (stretch goals; the point is the data, not the render)

**K. The organism model + narrative arc + emotional telemetry (v5, VISION/TELEMETRY).** Boot-to-
shutdown as one breath; sessions have dramatic structure (exposition→climax→resolution) readable
from behavior shape; flow vs frustration readable from the telemetry, not the words.
→ **Lisp:** these are *interpretations of the spine*, so they cost nothing at the runtime layer —
they're downstream readers. Keep the spine rich enough (per-kind fields from TELEMETRY.md) that
these remain possible. Don't build them yet.

**L. The skin system — "Winamp for agent cognition" (v3 Adliyye Codex + v5 skins).** The spine
signal is fixed; the rendering is not. Visual skins (Constellation, Adliyye Codex, Spectrum,
Organism, Watercolor…) + audio skins (Harmonic, Ambient, Arcade, Silence). The Adliyye Codex
(1926 Ankara Justice Gazette — process as record, one-page continuity, the Phoropter Moment) is
the most-developed prior visual and must not be lost.
→ **Lisp:** nothing to build now. The mandate is only: **the spine must emit enough that any skin
is possible later.** You said it yourself — the point is the raw telemetry to iterate on; the
visualizer comes when it comes. Preserve the Codex PRD reference in the README so it survives.

---

## 3. What we deliberately DROP or defer (so the MVP stays small)

- **The Zig codebase.** v6 starts from scratch (your call). `constellation-zg` stays as-is —
  the v5 crystallization, the reference for the spine contract and the doc corpus. Not ported line
  by line; mined.
- **The video-game surface, soundscape, 3D render.** Stretch. The spine makes them possible; we
  don't build them in the first two weeks.
- **Levels 3–5 (Galaxy/Cosmos/Multi-Org).** The fractal supports them for free later; MVP is
  Level 0 (Harness) + Level 1 (Star) + one Level 2 (a single Constellation/trajectory).
- **Semantic memory.** Interface only; SurrealDB behind it when a real need appears.
- **Policy/budget thick-star governance.** Thin star first; the slider adds these later.

---

## 4. How we build it — the operating plan (this is Made Well, dogfooded)

You said: start from scratch tomorrow, take your time, stay involved, dogfood Made Well, agent as
concierge. That maps exactly onto Made Well's own loops. We run the v6 build *as a Made Well
project*, proving the grammar on its own successor.

**The agent's stance: Markarian-as-concierge, now (in prose).** Even before the runtime exists, I
operate the way Markarian will: DISCOVERY MODE until the work is named each session, then
FACILITATION. I hold the process, surface the next honest step, never dump the fleet on you. This
is the dogfood — Made Well is prose-only and the models are now good enough that hard prose
definitions land. We test that claim by living it.

**Outer loop (the v6 project):**
- **Discovery** (done, mostly — this document + the canvas diagrams are the intake).
- **Commit** — pick the first vertical slice. Recommended: **the grounding contact point** (First
  Cut #1 in the convergence verdict — "build it first because it is the thesis"): claims as typed
  values, acquisition-before-assertion as a scheduler constraint, in a minimal agent-loop. It's the
  smallest thing that proves the whole bet.
- **Build** — inner loops per slice (below).
- **Land** — each slice ships to the open-source GitHub repo with the lineage README note.

**Inner loop per slice (Imagine→Plan→Make→Verify), day scale, you in the loop between each:**
1. **Imagine** — I map the slice against this doc + the v5 spec; you confirm scope.
2. **Plan** — a brief (the meta-prompt) with the DAG, exemplars, acceptance. You approve at the pause.
3. **Make** — I build against a live SBCL REPL (the convergence verdict's day-one setup: SBCL +
   ocicl + cl-completions + a REPL wired into the harness via MCP — which is *itself* a prototype
   of the runtime's thesis, and the practitioner cure for "LLMs write CL worse than TS").
4. **Verify** — fresh-agent judgment + deterministic checks. Builder ≠ verifier.

**The First Cuts, in order (from the convergence verdict — a vehicle fitting, not a stress test):**
1. **grounding** — claims as typed values; acquisition-before-assertion as a scheduler constraint.
   The contact point that is "a cons cell away." Build first — it's the thesis.
2. **escalate/resume** — a worker signals a condition mid-computation; the coordinator invokes a
   restart; work resumes in place. Tower's ask_user without the polling. The asymmetric feature,
   shown in the real loop.
3. **supervisor** — three worker processes via `uiop:launch-program`; kill one mid-task; one-for-one
   restart. ~100 lines. BEAM-at-the-boundary, on your machine.
- **Day-one setup:** ocicl (not Quicklisp); cl-completions as the provider layer; a CL REPL wired
  into the coding harness via MCP.

**The through-line for all three cuts:** each is a Made Well cycle, and each *also* demonstrates one
Tier-1 primitive from §2. When cuts 1–3 pass, the spine (A), the fractal recursion (B), and the
three contact points (C) are all real — and the rest (Firmament, memory, autonomy) are additions to
a breathing loop, not scaffolding for a dead one.

---

## 5. Guardrails (from the analysis — so we don't buy out the ethos)

- **Stay on the temporal axis.** We harden *time* (order, tokens, resume), never freeze *content*.
- **The generative pause is sacred.** The autonomy gradient may drop its frequency to boot-time;
  it must never delete it. The irreducible pause (Emergence Proposals at boot) is the moat.
- **The recursion trap (§5a).** Building v6 is itself the least-bounded project we'll run, and we
  scope it inside tenant harnesses. Mitigation: thinnest-possible Made Well loop, accept lossiness,
  and make the first thing the owned runtime does be re-verify its own construction.
- **Find the minimum-ownership line early (§5b).** MVP owns scheduler + ratchet + token-flow +
  grounding. It does NOT own a model, a vector store, or a UI. Rent those behind function pointers.
- **Contact must be grounded (§5d).** As soon as the human stops eyeballing the weave, a thread
  that makes contact while being wrong propagates at machine speed. Grounding (First Cut #1) is
  first precisely because it is this guardrail.

---

## 6. Immediate next actions (updated 2026-07-22 after preflight research)

0. DONE (2026-07-22): Topic 0 distribution gate = PASS, decided by the operator. CLI-only
   first: per-platform native binary via `save-lisp-and-die :executable t` + CI matrix.
   Browser = future thin client over the same binary's `--serve` broadcast mode; NO
   client-side Lisp/WASM, ever. See DECISION-2026-07-22-distribution.md (includes the
   zero-Lisp-exposure invariant, written down).
1. DONE (2026-07-22, operator): repo stays **Constellation**. Made Well is NOT formally
   cited as "the grammar it hosts" — the lineage README references it and builds from it,
   nothing more ceremonial. Draft the lineage README note accordingly.
2. Day-one Lisp setup, now fully specified by ENV-2026-07-22-lisp-tooling.md:
   brew install sbcl (2.6.6) + ocicl (v2.17.0) + FiveAM + sblint; wire the CL REPL
   into this harness via jsulmont/mcp-lisp (44/44 conformance, stdio transport).
3. Close the code-intel gate per DECISION-2026-07-22-code-intel.md: acquire dep
   sources to ~/source; run the ~50-line live-image dictionary emitter; optionally
   fork Coraline with tree-sitter-commonlisp. KotaDB and Coraline confirmed non-Lisp.
4. Commit the first slice = **grounding** (First Cut #1) — pending operator confirmation vs
   escalate/resume. Run it as a Made Well inner loop with me as concierge:
   Imagine → Plan (brief + DAG) → your approval → Make against the REPL → Verify.
5. Emit the spine from line one — even the grounding slice emits Envelopes. The telemetry pipeline
   exists from the first commit, so there is always data to iterate on.
6. Settle the Topic 1 naming question from DRAFT-2026-07-22-harness-runtime-network.md
   (fractal-renamed vs role-axis vs both) before the second slice.

## Open questions for you
- ANSWERED (2026-07-22): Repo name — keep "Constellation". Made Well referenced and built
  from, not formally cited.
- First slice confirmation: grounding first (thesis), or would you rather feel escalate/resume
  first (the most viscerally different-from-TS moment)? — pending; operator wants an
  assembly brainstorm before committing to code.
- ANSWERED (2026-07-22): The primitive membrane — the split is **collectible vs
  runtime-inherent** (operator ruling, supersedes both prior placements). Collectible
  primitives (skills, tools, MCPs, subagents, commands — anything that accumulates in a
  collection) live in the drawer and MUST be surfaceable; Strudel IS that gateway — the
  directory/listing of every collectible item. The failure it exists to fix: "I can
  collect a hundred skills and the agent only uses three of them — it never searches the
  other skills." Runtime-inherent primitives are never searched: hooks just happen as
  part of the runtime; directives are spawned for agents, single instance. Rule: any
  primitive groupable into a collection needs a surfacing mechanism, and that mechanism
  is Strudel.
- ANSWERED (2026-07-22): Celestial namespace — adopted from constellation (which is largely
  complete). The real work: bring the orbiting pieces INTO Constellation and rename them
  (Rumen, Made Well, strudel, etc. — "room" in the earlier transcript was a mishearing of
  Rumen, the excretion organ to Made Well, at ~/rumen). Operator: "let's just do it."

## Correction
*(GEPA signal — when a claim here is corrected by the build, note what was wrong and why.)*
