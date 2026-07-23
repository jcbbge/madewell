# Excavation Track A — Lineage: Iterations 1-4

**Run:** 2026-07-22, excavation orchestrator. Research only; every claim cited to a file read or session transcript excavated this run.
**Ground truth caveat:** the archives for iterations 2 and 4 (`~/constellation-ts`, `~/constellation-gl`) are ABSENT from disk (ls errors, verified this run), as are both prior-art docs referenced by v5 (`~/Documents/_agents/decisions/ADR-009-surrealdb-as-constellation-nebula.md`, `~/Documents/projects/_workspaces/constellation/2026-01-28-constellation-emergent-intelligence-layer.md` — both "No such file or directory"). Session-memory (pickbrain) reaches back only to ~April 2026; iterations 1-4 predate the index. What survives of them is what v5 and v6 documents chose to preserve.

## The canonical lineage record

/Users/jrg/constellation-zg/VISION.md:9-17:

> "This is Josh's fifth iteration on Constellation. Each failed. Each crystallized something irreplaceable."

| Iteration | Runtime | Key Contribution (VISION.md:13-16) | Fate |
|---|---|---|---|
| 1 | Various | "Named the metaphor: stars, constellations, galaxies" | Collapsed |
| 2 | TypeScript (v.01) | "Pheromone model, stigmergic coordination, nQ=0 protocol" | Archived at `~/constellation-ts` (ABSENT) |
| 3 | TypeScript (v.02) | "SurrealDB as Nebula, cross-harness pheromone emission" | Archived |
| 4 | Gleam/BEAM | "Actor model, fault isolation, ETS nebula" | Archived at `~/constellation-gl` (ABSENT) |

Corroborated by /Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:30-37, which adds per-iteration glosses: v1 "the celestial namespace", v3 "+ the Adliyye Codex visual", v4 "supervision instinct (ETS nebula)".

## Iteration 1 — what it taught

1. **The celestial namespace.** VISION.md:13 ("Named the metaphor: stars, constellations, galaxies"); CONSTELLATION-V6-CONVERGENCE.md:32 ("the metaphor: stars, constellations, galaxies, the celestial namespace"). This namespace is still the addressing scheme of v5's entire fractal (TAXONOMY.md:10-17) and was re-adopted for v6 on 2026-07-22 (CONSTELLATION-V6-CONVERGENCE.md:279-282: "Celestial namespace — adopted from constellation").
2. **Naming precedes building.** The only iteration whose sole recorded contribution is vocabulary — and it is the one contribution every later iteration kept unchanged. (Inference from the two lineage tables above; labeled as reading, not fact.)

**UNKNOWN:** which runtimes v1 used ("Various"), why it "Collapsed", any code. No archive path is even named for it. Would be resolved by: pre-April-2026 chat exports or any surviving v1 repo.

## Iteration 2 (TypeScript v.01) — what it taught

1. **Stigmergic coordination / the pheromone model.** VISION.md:34: "The stigmergic trace insight — the inspiration behind the original constellation framework — is in this prior work. Desire lines. Pheromone trails. Ants coordinating without talking." Elaborated at VISION.md:198-213 (desire lines: "it watches itself run and learns what it is"). The mechanism survives concretely in v5's Pheromone Contract (HARNESS_RUNTIME_SPEC.md:287-305: stars never talk directly; they write/read Nebula files, `pheromone/desire_lines.ndjson`).
2. **The nQ protocol (star-to-star questions).** VISION.md:14; implemented in v5 as the Orbit Contract: HARNESS_RUNTIME_SPEC.md:99 ("`orbit.zig` — nQ protocol. Star emits question, waits for answer file in Nebula") and :307-320 (q_001.json / a_001.json shapes). v6 plans to upgrade it: CONSTELLATION-V6-CONVERGENCE.md:84-88 — "v5 polls `orbit/a_001.json`; in Lisp a star that needs an upstream answer **signals a condition** and the coordinator **invokes a restart** — no polling, resume in place."
3. **Three named prior-art PRDs** (VISION.md:28-30): PRD-008 nebula-dashboard-broad (the Adliyye Codex origin), PRD-007 observability-data-layer, PRD-006 constellation-concierge ("The Concierge/Nexus design" — the ancestor of Markarian). All live only inside the absent `~/constellation-ts` archive.

**UNKNOWN:** the PRDs' contents beyond what VISION.md and ADLIYYE_CODEX.md preserved; why v.01 failed. Would be resolved by: recovering `~/constellation-ts` (git remote? Time Machine?).

## Iteration 3 (TypeScript v.02) — what it taught

1. **SurrealDB as the Nebula** (VISION.md:15) — the stigmergic store as a database rather than files. v5 reversed this to file-based Nebula (HARNESS_RUNTIME_SPEC.md:101: "Nebula file structure... Git-friendly"), and v6 keeps files (CONSTELLATION-V6-CONVERGENCE.md:83: "the Nebula stays file-based and git-friendly"). The reversal itself is a nugget: the DB-backed nebula was tried and walked back — the same storage-dumb lesson circadian later codified (see 30-memory-context.md).
2. **The Adliyye Codex** — attributed to the v2/v3 TS era (VISION.md:28 names its PRD; CONSTELLATION-V6-CONVERGENCE.md:34 files it under v3). The full codex SURVIVES on disk at /Users/jrg/constellation-zg/docs/ADLIYYE_CODEX.md (12.7K): "It is a living decree... the canonical design authority for Constellation" (:8); source: the Ceride-i Adliyye Justice Gazette, Ankara 1925-1927 (:10); ten non-negotiable laws (:59-71) including "The Page Is Sacred — the viewport is one physical lithographed sheet. No floating cards" and "Poetic Justice Final Law — the user must feel they have opened a living Justice Gazette from 1926."
3. **Cross-harness pheromone emission** (VISION.md:15) — the idea that multiple different harnesses emit into one shared trace substrate. This is the earliest recorded form of the multi-harness ambition that v5 encodes as "Multi-project scope always" (VISION.md:338).

**UNKNOWN:** ADR-009's actual stigmergic-store design (file absent); what distinguished v.02's failure from v.01's.

## Iteration 4 (Gleam/BEAM) — what it taught

1. **The actor model + fault isolation instinct.** VISION.md:16; CONSTELLATION-V6-CONVERGENCE.md:35 ("actor model, fault isolation, supervision instinct (ETS nebula)").
2. **The verdict on where that instinct belongs** — the sharpest recorded lesson of v4, written in the v6 convergence doc (CONSTELLATION-V6-CONVERGENCE.md:90-96): "BEAM's guarantees — heap isolation, kill-a-wedged-worker, restart — are *free* at the OS-process boundary; you need the isolation, not the cheapness... v4's actor model was the right idea in the wrong place (in-image); v6 puts it at the boundary where it's real." v5 already embodied this: stars are OS subprocesses (TAXONOMY.md:54, HARNESS_RUNTIME_SPEC.md:265-285), not in-VM actors.
3. **ETS nebula** — the pheromone store moved into BEAM's in-memory term storage. Like v3's SurrealDB nebula, later reversed to files. Two consecutive iterations put the Nebula inside a runtime; both were abandoned; v5/v6 keep it on disk. (Pattern reading from the lineage tables + HARNESS spec; labeled as reading.)

**UNKNOWN:** any first-person account of the Gleam period. Pickbrain sweeps ("gleam constellation actor BEAM", "nQ protocol") returned no pre-v5 constellation sessions — the session index does not reach that far back. Would be resolved by: recovering `~/constellation-gl`.

## What v5 says crystallized in v5 (bridge to Track B)

VISION.md:19-20: "**What crystallized this time:** the form became visible. The telemetry spine is not a logger. It is a sensor array." The v5 origin of the harness-runtime spec is on the session record: on 2026-05-29 the operator said "I realize that I need to build a constellation ZIG agent harness runtime that is different from the current path of the project... I want this to be an exact agent harness runtime built and tailored to constellation as a whole" (pickbrain hit, session /Users/jrg/.pi/agent/sessions/ claude 2026-05-29T17-56-37-989Z_019e74e1-87e5-7290-be43-a443402d270e, quoted verbatim from search output this run).

## The through-line the operator already named

CONSTELLATION-V6-CONVERGENCE.md:39-41: "the frame was never the IP ... what Lisp offers is a body where the pipe does not have to be argued for, because the pipe is the language."

---

## SOURCES

- /Users/jrg/constellation-zg/VISION.md:9-34, 198-213, 338 (read this run)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:99, 265-320 (read this run)
- /Users/jrg/constellation-zg/docs/ADLIYYE_CODEX.md:1-80 (read this run)
- /Users/jrg/constellation-zg/TAXONOMY.md:10-17, 54 (read this run)
- /Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:26-41, 83-96, 279-282 (read this run)
- `ls ~/constellation-ts ~/constellation-gl` → No such file or directory (run this session)
- `ls ~/Documents/_agents/decisions/ADR-009-...md ~/Documents/projects/_workspaces/constellation/2026-01-28-...md` → No such file or directory (run this session)
- pickbrain sweeps run this session: "constellation typescript pheromone stigmergic", "nQ protocol zero questions clarifying", "gleam constellation actor BEAM", "adliyye codex justice gazette" via `bun ~/.claude/skills/super-search/search.ts ... --scope memory`
