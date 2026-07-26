# The M1 Archive — what we actually tried, 2026-01 to 2026-03

**Date:** 2026-07-25
**Source:** `m1ganttbook.local` (`ssh m1`), read this session. Nothing copied, nothing modified.
**Corpus:** 27,782 lines of markdown across `~/constellation-gl/constellation_v.01`, `constellation_v.02`,
`~/constellation-ts/docs`, `~/constellation-gl/workspace/vision`, `~/nebula`, `~/Documents/_agents/decisions`.
**Why this exists:** the excavation dossier covers v5 well and v1–v2 from memory. The primary sources
were on a laptop nobody could reach. Now they've been read. This is what they say.

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

## 3. What didn't work

**The failure was never technical.** Not one iteration died of a bug, a performance wall, or a
language limitation. Every one died in planning.

The evidence is in the project's own words, February 1:

> "I feel like I keep going in circles with different agents planning and not remaining true to my
> overall vision. Everything. All of the above. I want to build this and start using it."

The response to that was **Phase 0: Realignment** — a six-session structured process whose entire
output was more documents. The cure was another dose of the disease. And the diagnosis at the time
was already correct: *"The problem is NOT architecture — it's scattered documentation, planning loops,
and lack of execution."* It was named, written down, and then not acted on.

The ratio is the finding: **27,782 lines of markdown against ~650 lines of runner that worked.**

**Substrate churn.** Four database decisions in under two months, each properly reasoned, each with a
record: libSQL → pgLite (ecosystem consistency) → `bun:sqlite` (zero dependencies) → SurrealDB
(persistence + live queries) → ETS in Gleam → SurrealDB again in ADR-009. None of these were ever the
thing standing in the way.

**Runtime churn.** TypeScript → Gleam → back to TypeScript → Zig → Common Lisp. ADR-008 is the honest
one: the Gleam rewrite was started for BEAM's fault isolation, then stalled because *"Josh doesn't yet
know Gleam well enough to move fast."* The remedy chosen was to maintain **two parallel
implementations** of the same system.

**The mock trap.** `constellation-ts/docs/architecture.md` records the status plainly:

| Star | Status |
|---|---|
| Vega | real LLM ignite implemented |
| Polaris, Cassiopeia, Orion, Sirius, Aldebaran | **mock ignite only** |

One of six stars was real. That state was documented, committed, and never advanced. Meanwhile eleven
PRDs were written.

**Rewriting instead of finishing.** ADR-008 states that TS v.01 was *"40% complete with all conceptual
decisions locked."* Forty percent complete with the hard thinking already done is the point at which a
project is closest to working. That was the moment a second runtime got opened.

**No remotes, ever.** Five iterations, zero pushes. The complete history of the project has been
sitting on one laptop, with 4,918 uncommitted files in the Gleam tree and `CONSTELLATION_GENESIS.md`
in the Trash.

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

## 5. What this means for v6

The recurring ideas — isolation walls, one-table stigmergy, nQ=0, the recursive houses, the concierge
— have now been independently rediscovered across five runtimes on four substrates. They are not
preferences. They're the actual invariants, and v6's plan already carries all of them.

The recurring *failure* has also been constant, and it has nothing to do with substrate. It is:
plan thoroughly, build 40%, discover the plan was too big, restart on a better foundation.

The specific pattern to watch: **the moment of maximum danger is not early, it's at ~40% working.**
That's where v.01 was when a second runtime opened. Both prior stalls happened right after a genuine
success — Sprint 2 worked, and three weeks later the repo went quiet.

Current v6 state, for the record: 1,785 lines of documentation, ~100 lines of code, and the first
slice not yet chosen. The prior corpus reached 27,782 to 650. The ratio is the thing to watch, and
`make test` going green is the only number that moves it in the right direction.

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
