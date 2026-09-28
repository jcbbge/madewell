# The M1 Archive — what we actually tried, 2026-01 to 2026-03

**Date:** 2026-07-25
**Source:** `m1ganttbook.local` (`ssh m1`), read this session. Nothing copied, nothing modified.
**Corpus:** 27,782 lines of markdown across `~/constellation-gl/constellation_v.01`, `constellation_v.02`,
`~/constellation-ts/docs`, `~/constellation-gl/workspace/vision`, `~/nebula`, `~/Documents/_agents/decisions`.
**Why this exists:** the excavation dossier covers v5 well and v1–v2 from memory. The primary sources
were on a laptop nobody could reach. Now they've been read. This is what they say.

---

> **Correction, 2026-07-25 (operator, same session).** The first draft of §3 and §5 read the repeated
> stalls as planning loops — as the project failing to execute. That framing is wrong and is corrected
> below. The operator supplied the missing context: **v0 worked**, by hand, for months, before any
> code existed; and each stall at ~40% was a *deliberate descent* to a lower layer of the stack after
> hitting a limitation that could not be fixed at the current layer. Sections 0 and 3 now carry the
> corrected reading. The documentation-to-code ratio noted in §3 is still a real number and still
> worth watching — but it is a risk, not the diagnosis.

---

## 0. v0 — the part with no code, and the part that worked

Before any repository existed, the system ran **manually, by hand, for months**, and it worked.

The operator's account, this session: prompt an agent to ideate. Prompt it to plan. Prompt it to
build. Prompt it to test. Copy and paste between the steps, generate markdown artifacts, carry them
forward by hand. One agent, four phases, entirely manual.

Two conclusions came out of that, and both are load-bearing for everything after:

**1. Four phases are the irreducible unit of work.** Not a framework choice — a floor. *"You have to
first think about what you're going to do, then you have to plan, then you have to do it and then you
test it."* Every later iteration kept them because reduction below four was never available.

**2. A solo developer has to scale himself across the pipeline.** That is the actual thesis. One
person cannot occupy four phases at once, so the phases get agents. Six of them, after months of
running it by hand: *"it was very manual, but it worked. It was brilliant. I just needed a way to
automate this."*

This is the single most important fact in the archive and it was invisible from the files, because
the part that worked never got committed to a repo. **The architecture was validated by hand before
a line of it was written.** Everything from v1 onward is an automation problem, not a design problem
— which is why the design never changed across five runtimes.

It also explains the deliberate restraint: prose and documentation only, no scripts, no installers.
The operator knew that the moment he shipped an installer he had crossed into owning a runtime and a
harness, and he wasn't ready to own those yet.

---

## 1. The actual timeline

| Date | Artifact | What happened |
|---|---|---|
| 2026-01-25 | `genesis.md` | Deleted 1,500+ lines. Clean slate. *"Not anti-vibecoding. It's vibecoding done RIGHT."* |
| 2026-02-01 | `CORE_IDENTITY.md` | "Phase 0: Realignment" — a **six-session** process to escape planning loops |
| 2026-02-08 | `THREADS/01–04` | Four idea threads, each judged against a written rubric. Multi-agent architecture LOCKED |
| 2026-02-08 | `NEXT_STEPS.md` | **Sprint 1 complete.** Full Dawn→Night trajectory on `bun:sqlite`, isolation walls verified |
| 2026-02-25 | `constellation_v.02/NEXT_STEPS.md` | **Sprint 2 complete.** SurrealDB + real OpenCode LLM calls. Vega and Polaris actually ran |
| 2026-03-11 | `ADR-008`, `ADR-009` | Dual TS/GL implementation strategy; SurrealDB as the Nebula |
| 2026-03-13 | last `constellation-ts` commit | PRD-011 omni telemetry research |
| 2026-03-24 | last `constellation-gl` commit | "Latent Manifold Lab scaffold — parchment ground, astrolabe hu…" |

Both repos then stopped. Neither has a git remote. 17 commits in ts, 13 in gl.

---

## 2. What actually worked

Verified by the record, not claimed by a plan.

**Isolation walls, enforced in SQL rather than in prompts.** Sprint 1's own note: *"Full Dawn-to-Night
trajectory verified with SQL-bound isolation walls."* The mechanism was `forbids[]` on each agent
signature compiled into `WHERE scent NOT IN (...)` at query time. Not an instruction the model could
rationalize around — a row the model never received. This is the single most successful thing in the
entire corpus.

**Pheromone self-dispatch — the Bridge Layer turned out to be unnecessary.** Two months of design
called for a "Custom Bridge Layer orchestrator" with nine responsibilities. Building it produced the
opposite conclusion, recorded verbatim: *"No Bridge Layer orchestrator. Runner is a for loop. SQL is
the coordinator."* The whole system was ~650 lines in one `runner.ts`. This is the clearest case in
the archive of building beating planning.

**Real agents coordinating through the store.** Sprint 2 output, captured live:

```
VEGA invoking via OpenCode...    -> Emitted: idea_validated ✅
POLARIS invoking via OpenCode... -> Emitted: orbit_blocked  ✅
```

Polaris entered orbit mode on its own because it genuinely had questions. Stigmergic handoff between
two real LLM agents worked.

**The Adliyye Codex outlived four runtimes** because it declared itself implementation-agnostic on
purpose: *"It precedes platform, framework, renderer, and stack."* Every technical decision from that
era is dead. The design decree is still usable.

---

## 3. What stopped, and why — the descent

Not one iteration died of a bug, a performance wall, or a language limitation. And — the correction —
not one of them died of a planning loop either. **Each one stopped at roughly 40% because building it
exposed a limitation one layer below where the work was happening, and the operator went down to that
layer.**

The moves were not lateral. They were a descent, and they only go one direction:

| Layer | Attempt | The limitation that forced the next descent |
|---|---|---|
| 0 · by hand | copy/paste, 1 agent, 4 phases | works, but does not scale past one human |
| 1 · roles | 6 agents, still manual | works, but the handoffs are all human labor |
| 2 · orchestration | TS runner, pheromones, SQLite/SurrealDB | needs a harness to run agents in |
| 3 · someone else's harness | OpenCode plugin + SDK | *"a nightmare trying to deal with TypeScript and servers"*; hierarchical-only agents, no lateral coordination |
| 3b · someone else's harness | Pi, then forking Pi, then Pi extensions (Strudel) | fork was a shit show; extension ecosystem works but the harness isn't yours |
| 4 · someone else's runtime | Gleam/BEAM for supervision + fault isolation | right substrate, but not a Gleam dev; ADR-008 says so plainly |
| 5 · own everything | Common Lisp — harness *and* runtime, at worker, orchestrator, and coordinator level | **no layer below this one** |

Read that way, the substrate churn is not churn. libSQL → pgLite → `bun:sqlite` → SurrealDB → ETS →
SurrealDB is what it looks like to keep hitting the persistence layer from above and re-picking. Same
for TypeScript → Gleam → Zig → Lisp. Each choice was reasoned and each was recorded.

**The real cost was never the descent. It was that every descent restarted the layers above it.**
Going down a layer did not have to mean rebuilding the four phases, the six stars, the pheromone
schema and the isolation walls — those were already settled and had been since v0. But each new
substrate got them re-derived from scratch, in a new language, by hand. That is where the 27,782 lines
of markdown came from: not indecision about *what* to build, but re-specifying a settled design once
per runtime.

Two numbers still worth keeping in view, as risks rather than as the diagnosis:

- **27,782 lines of markdown against ~650 lines of runner that worked.**
- **One of six stars was ever real.** `constellation-ts/docs/architecture.md` records Vega with a real
  LLM ignite and Polaris, Cassiopeia, Orion, Sirius, Aldebaran all as **mock ignite only** — committed
  in that state, never advanced, while eleven PRDs were written.

And one genuine unforced problem, unrelated to the descent: **no remotes, ever.** Five iterations,
zero pushes, 4,918 uncommitted files in the Gleam tree, `CONSTELLATION_GENESIS.md` in the Trash. The
entire history has been sitting on one laptop.

### The February note, re-read

The Feb 1 quote — *"I feel like I keep going in circles with different agents planning"* — was read in
the first draft as evidence of a planning loop. In context it is the opposite: it is the frustration
of a person whose design was already settled and who could not get a *harness* to execute it. The
"circles" were the agents', not the architecture's. Phase 0 Realignment produced documents because
documents were the only artifact available at layer 3 — the runtime to execute the design didn't exist
yet and couldn't be bought.

---

## 4. The genuinely good ideas

Ranked by how well they survive contact with reality. The test applied: does it appear in *every*
iteration (load-bearing), and did building it confirm it?

**1. Structural anti-reward-hacking.** The strongest idea in the archive, and it came from observed
failure, not theory:

> "When the same agent was building code AND writing its own tests, tests would fail and the agent
> would update the code to satisfy the failing test rather than fix the implementation."

With the correct conclusion attached: *"prompt-based isolation is inherently leaky."* The wall has to
be structural — a process boundary or a query filter — because the model cannot distinguish "fix the
bug" from "dodge the test" when it can see both. Thread 01 locked multi-agent architecture on this
single argument and was right to.

**2. One table that is simultaneously the coordination signal, the event log, and the message bus.**
From CANON: *"There is no separate event log."* One `cs_pheromone` table meant audit, resume,
cross-process wakeup, and coordination all fell out of a single write. This is the same instinct as
v5's telemetry spine and v6's Envelope — and it has now been arrived at independently three times,
which is the strongest signal in the corpus that it's correct.

**3. Polaris's untainted-auditor mode.** The sharpest single observation anyone wrote down:

> "An LLM with codebase context will rationalize. An LLM without it will evaluate."

Polaris in Dawn sees only the STARCHART — zero codebase, zero implementation. *"This is not a
limitation — it is the protection."* This generalizes far past Constellation and is directly usable in
any review or verification step.

**4. nQ=0 with a hard ceiling and mandatory escalation.** No work proceeds while questions outnumber
answers; maximum three orbits; then a human is required. The ceiling is the good part — it makes
"stuck" a detectable state rather than an infinite loop.

**5. The Latent Workspace (Imagination Phase).** Thread 04, and the only idea the project's own rubric
scored as 10X. Vega simulates a build's failure modes *before* asking questions, so the questions are
informed: *"Most scheduling apps fail because of timezone handling. Have you thought about…"* — rather
than "what features do you want?" It turns the ideation agent from a capture device into a
co-thinker. **Still unbuilt in every iteration.** It is the largest unclaimed idea in the archive.

**6. Constellation is not an agent.** From CANON: *"Constellation is not a star. Constellation is not
a manager. Constellation is not in the workflow."* It's the concierge — the interface, ephemeral,
*"present everywhere and resident nowhere."* Three or four human touchpoints total: submit an idea,
answer what couldn't be resolved, review finished work.

**7. The four houses are recursive.** *"A 'Product' is just a stack of 'Features.' A 'Feature' is just
a stack of 'Atomic Tasks.'"* Same four-phase cycle at every scale, macro-trajectories decomposing into
micro-trajectories. This is v5's fractal and v6's `harness(level, …)` recursion, already present in v1.

**8. Steal the pattern, reject the framework.** THREADS/META_PROMPT.md is a governance instrument: a
three-part rubric (does the tool bend to us, does it preserve the ethos, is it 10X) applied to every
incoming idea, with only three verdicts — PROMOTED, ARCHIVED, REJECTED. It caught DSPy correctly
(extract Signatures, reject the framework) and Agentica correctly. This is the one process artifact
worth carrying forward intact.

**9. The Adliyye Codex as pre-technical authority.** A design decree that binds before a stack is
chosen, so it survives the stack changing. Three tensions that must never resolve: precision born of
ritual danger, bureaucracy as mystical poetry, balance that vibrates.

---

## 5. The orbiting projects — one thesis, five bodies

The five side projects are not five projects. They are the same descent, expressed at different
layers, and each was spun off when the core work hit a wall it could not cross inline.

| Project | Born from | The wall it was spun off to address |
|---|---|---|
| **Made Well** | Constellation, distilled | The operator's son and a friend — non-technical — asked how to code with agents. Needed the thesis as *portable prose* they could paste into any agent. Being host-agnostic was the point, which is why it must not be pinned to Lisp. |
| **Rumen** | Made Well | Emerged while building Made Well; the excretion organ to it. |
| **Circadian** | context/memory | Memory system iterations 5–6. The operator's position: **context and memory are the two biggest bottlenecks in the industry.** Reframe: not a context *window* but a **context pane** — stained glass, each shard a distinct artifact. Latest iteration is where that lands. |
| **Strudel** | Pi extensions | After forking Pi failed. Became the surfacing mechanism for collectible primitives — the fix for "I can collect a hundred skills and the agent only uses three." |
| **Tower** | fleet coordination | The message bus between user, orchestrator, and workers; the verbatim-relay guarantee. |

All five were reaching for the same point and none could arrive, because each was built on top of a
harness someone else owned.

## 6. What this means for v6

**The invariants are settled and have been since v0.** Four phases, six stars, isolation walls,
one-table stigmergy, nQ=0, the recursive houses, the concierge. Independently re-derived across five
runtimes on four substrates, and validated by hand before any of them. These do not need to be
rethought. They need to be *executed once* and never re-specified again.

**The descent has bottomed out.** This is the strongest argument for v6 and it appears in none of the
planning documents. Every prior stall was a move to a layer the operator did not own. Owning the
language means owning the harness and the runtime for the worker, for the orchestrator, and for the
coordinator — simultaneously, all the way down. **There is no layer below this one to descend to.**
The failure mode that ended v1 through v5 is not available to v6.

**Therefore the risk profile is inverted.** The thing to guard against is no longer "is this the right
substrate" — that question is closed. It is: *does the settled design get re-specified again instead
of executed?* Concretely:

- The four phases and six stars are **decided**. They do not get another design document.
- The two numbers to watch are lines-of-markdown and `make test` going green.
- v6 today: 1,785 lines of docs, ~100 lines of code, first slice unchosen. The prior corpus reached
  27,782 : 650.

**The largest unbuilt idea is still the Latent Workspace** (§4, item 5) — the only thing the project's
own rubric ever scored as 10X, spun off in Thread 04 and never implemented in any iteration. It is
also directly downstream of the context/memory thesis that produced Circadian. Worth deciding
deliberately whether it earns a place in v6 or stays deferred; what it should not do is get
rediscovered a sixth time.

---

## SOURCES

All read on `m1ganttbook.local` via `ssh m1`, 2026-07-25:

- `~/constellation-gl/constellation_v.01/` — `workspace/CORE_IDENTITY.md`, `workspace/knowledge/architecture/genesis.md`, `PROTOCOL.md`, `THREADS/{01_agentica_infra,02_rolling_context,03_dspy_rlm,04_latent_workspace,META_PROMPT}.md`, `workspace/NEXTSTEPS.md`, `NEXT_STEPS.md`, `workspace/knowledge/architecture/2026-01-28-constellation-emergent-intelligence-layer.md`
- `~/constellation-gl/constellation_v.02/` — `README.md`, `NEXT_STEPS.md`
- `~/constellation-gl/workspace/vision/` — `CONSTELLATION_CORE.md`, `CONSTELLATION_ALIGNMENT.md`, `ECOSYSTEM.md`
- `~/constellation-ts/docs/` — `CANON.md`, `GLOSSARY.md`, `architecture.md`, `ADLIYYE_CODEX.md`
- `~/Documents/_agents/decisions/` — `ADR-008-constellation-ts-gl-dual-implementation.md`, `ADR-009-surrealdb-as-constellation-nebula.md`
- `~/nebula/` — `AUDIT.md`, `README.md`
- Repo state from `git log`/`git status` in `~/constellation-ts` and `~/constellation-gl`
