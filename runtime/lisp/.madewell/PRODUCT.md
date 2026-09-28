# Product Context

**Project:** Constellation — v6, the Level-0 Harness in Common Lisp
**Updated:** 2026-07-25

---

## What We're Building

The pipe-owning kernel: the layer where the laws an agent runtime is supposed to obey stop being
prose in a document and become primitives in a language. Grounding, verification, the ratchet, the
cooperative pause — expressed as forms, not as a framework asking to be followed.

This is the sixth Constellation. The first five each stopped at roughly 40%, and the reason is the
key fact about this project (see *The Descent*, below).

---

## Users

### Primary User

**Who:** Josh (jrg / jcbbge) — solo developer, ~decade building software, two years building it
with AI. No following, no launched products, no industry notoriety; by his own description "just a
random person." That self-assessment is load-bearing for how he works: he is not building for an
audience, he is building because he is one person who cannot do everything himself.

**Context:** Terminal-first, Herdr as the control plane, multiple projects converging on one point.

**Goal:** Automate the entire software development lifecycle so one person can operate all of it.

**Pain now:** Five prior runtimes, each abandoned at ~40% after hitting a limitation one layer
below where the work was happening. Nothing has shipped.

**How to work with him:** Do not front-load concepts. Give the honest next step and the reasoning.
He pushes back hard and specifically, and is usually right about the underlying claim even when the
proposed mechanism isn't. Treat frustration as signal, not noise.

---

## The Thesis, in his words

> "The entire software development life cycle can and will be automated. Because me as the single
> solo developer, I can't do everything myself. So the only thing to do is to automate it. Like
> that's the only logical thing that makes sense."

Orchestration was the end goal from the beginning — before the industry had a word for it, while
everyone else was arguing about how to prompt.

---

## v0 — the part that worked, and has no repository

Before any code existed, the system ran **manually, by hand, for months**, and it worked. Prompt an
agent to ideate. Prompt it to plan. Prompt it to build. Prompt it to test. Copy and paste between
the steps, generate markdown artifacts, carry them forward by hand.

Two findings, both still load-bearing:

1. **Four phases are irreducible.** *"You have to first think about what you're going to do, then
   you have to plan, then you have to do it and then you test it."* Not a framework choice — a floor.
2. **A solo developer has to scale himself across the pipeline.** One person cannot occupy four
   phases at once, so the phases get agents. Six of them. *"It was very manual, but it worked. It
   was brilliant. I just needed a way to automate this."*

**This is why the design never changed across five runtimes.** It was validated by hand before any
of them existed. Everything since v1 is an automation problem, not a design problem.

He deliberately kept it prose-only — no scripts, no installers — because shipping an installer meant
crossing into owning a runtime and a harness, and he wasn't ready to own those yet.

---

## The Descent — why each iteration stopped

Not planning loops, and not failure. Each stall was a deliberate move to a layer below, after
hitting a limitation that could not be fixed at the current one. It only goes one direction:

| Layer | Attempt | What forced the next descent |
|---|---|---|
| 0 | by hand, 1 agent, 4 phases | works, doesn't scale past one human |
| 1 | 6 agents, still manual | works, handoffs are human labor |
| 2 | TS runner, pheromones, SQLite/SurrealDB | needs a harness to run agents in |
| 3 | OpenCode plugin; Pi; forking Pi; Pi extensions (Strudel) | *"a nightmare trying to deal with TypeScript and servers"*; the harness isn't yours |
| 4 | Gleam/BEAM for supervision + fault isolation | right substrate, not a Gleam dev |
| 5 | **Common Lisp** — harness *and* runtime at worker, orchestrator, and coordinator level | **no layer below this one** |

The real cost was never the descent. It was that each descent re-derived the settled layers above it
— four phases, six stars, isolation walls — from scratch, in a new language. That produced 27,782
lines of markdown against ~650 lines of runner that actually worked.

**The strongest argument for v6, and it appears in none of the planning docs:** there is nothing
below owning the language. The failure mode that ended v1–v5 is structurally unavailable here.

---

## The Orbiting Projects

Five projects, one thesis, each spun off when the core hit a wall it couldn't cross inline:

| Project | Why it exists |
|---|---|
| **Made Well** | His son and a friend — non-technical — asked how to build with agents. Constellation distilled to portable prose they could paste into any assistant. Host-agnostic is the whole point; must never be pinned to Lisp. |
| **Rumen** | Emerged from building Made Well; the excretion organ to it. |
| **Circadian** | Memory. Iterations 5–6. His position: **context and memory are the two biggest bottlenecks in the industry.** |
| **Strudel** | Pi extensions, after forking Pi failed. The surfacing mechanism for collectible primitives — fixes "I collect a hundred skills and the agent uses three." |
| **Tower** | Fleet coordination; the verbatim-relay guarantee between user, orchestrator, and workers. |

---

## His Language — use these words

- **Context pane, not context window.** A pane of glass — specifically *stained* glass, each shard a
  different artifact. The "window" metaphor is a misnomer he rejects.
- **The descent** — going down a layer, not failing at one.
- **Digging holes to see what comes up** — the exploratory years. *"I basically have this entire plot
  of land where I've just been trying to dig and see if I can hit a payload."*
- **Made, not vibed.**
- **Houses** (Dawn/Meridian/Descent/Night), **stars**, **pheromones**, **Nebula**, **trajectory**,
  **orbit**, **nQ=0** — the celestial namespace, adopted and largely complete.

---

## What He's Proven

- The four-phase / six-agent architecture works — by hand, for months, before any code.
- Isolation walls enforced structurally (SQL query filters, process boundaries) prevent the
  test-code contamination that prompt-based isolation cannot.
- Pheromone self-dispatch beats an orchestrator: *"Runner is a for loop. SQL is the coordinator."*
- He identified context and memory as the binding constraints early and has built against them since.

---

## What Matters To Him That Isn't In The Work

He has carried five projects toward one convergence point for two years, alone, with no external
validation. The work is unusual and early; that is observable and needs no audience to be true. The
gap between where he is and where the work should be is not credibility — it is that nothing has
shipped, and the descent explains exactly why.

**Do not let this project re-specify its settled design a sixth time.** That is the failure mode.
Executing the decided thing is the whole job.
