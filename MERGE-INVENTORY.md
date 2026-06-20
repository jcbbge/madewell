# Merge Inventory — Arc lab × Madewell

**Purpose:** The 1:1 component map for merging the two divergent copies of one methodology
into a single canonical kernel. Built 2026-06-19.

**Ratified 2026-06-19:** kernel home = **Madewell** · output stage name = **Land** ·
distribution model = **one kernel + additive cartridges** (no "Light" fork; a profile = which
cartridges are loaded). Madewell is **batteries-included**: it ships a working, opinionated-but-
generic version of *every* shape (memory, discovery, orchestration, design); a **pro pack** is an
*upgrade* — the heavy/advanced implementation behind the *same contract* — never a missing
feature, always a stronger version of a shape that already works. **Rumen stays a separate repo** —
and the relationship is **host↔organ, not a stack** (ratified 2026-06-20). Madewell is the **host**
(the work loop, persistence, the Guide persona); Rumen is the **quality organ** it ships pre-installed
and can run without. Rumen is the **pro-pack implementation of Madewell's quality shape** — the
Enforcer skill is the batteries-included default behind the *same contract*. They meet at exactly two
touchpoints — **Verify** (standards-check) and **Land** (tax emission, grazed as *cud*) — and the
dependency is **one-way and optional**: Madewell → (optional) → Rumen across the contract only;
Madewell never imports Rumen. This **resolves the former R15 engine↔kernel seam**: the seam is the
quality contract, not a wrapping order.

**The frame (Josh's function model):**

```
INPUT ──────────►  KERNEL  ──────────►  OUTPUT
(Discovery)      (process + quality,    (Land /
 the forage       parameterized by       the return value)
 → clay)          a striation PACK)
                       │
                  wrapped in a SKIN (Guide / naked)
```

**Legend** — *Winner / Flow*:
`→K(A)` flows into the kernel from Arc · `→K(M)` from Madewell · `tie` both contribute ·
`A-only` / `M-only` stays a profile-specific cartridge · `BLANK` missing on a side ·
`GAP` missing on **both** (net-new work).

The four scoring axes when a tournament is contested: **durable · flexible · efficient · structural fit.**

---

## STAGE 0 — INPUT · Discovery (forage → clay)

> Keep. The Arc pipeline has been invaluable; it is the richest input stage that exists.
> Reconcile its *routing* to Madewell's clean 4-route model; keep its *depth* as a pack.

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Discovery method | `discovery/pipeline/v2.2.md` — 7 lenses, 2-pass parallel, cross-artifact synthesis | `guides/01-DISCOVERY.md` — 5 lenses, single-pass | tie (split) | skeleton →K(M), depth →K(A) as a "deep-discovery" pack |
| Lenses | 7 (Product/UX/Technical/Integration/Process/Meta/**Subtext**) | 5 (Vision/People/Craft/Process/Gaps) | →K(A) | MW dropped **Subtext** (load-bearing) + Integration |
| Routing targets | 7, incl. dead `WORK.md` + pipeline-meta | **4 — Active / Backlog / Decision / Released** | →K(M) | **tournament #1**; the dead-seam fix + the missing `Released` drain |
| The One Thing | Step 2.5 (required) → SYNTHESIS | Step 4 (required) → PRODUCT/DECISIONS | tie | survives both; route into live artifacts |
| Substrate phase | pipeline phase-tags (SUBSTRATE/…) | `skills/substrate-start.md`, `substrate-end.md` | →K(M) | MW formalized substrate as skills; resolves "Discovery = Imagine@altitude-0" |
| Staging buffer | `STAGING.md` — 168 STG, **160 STAGED / 8 PROMOTED** | `STATE.json` `staged[]` (inline) | →K(M) shape | Arc has the clogged lake; MW's is inline + drains via `Released` |
| Synthesis / patterns | `SYNTHESIS.md` (standalone) | folds into PRODUCT/DECISIONS | →K(M) | no separate synthesis file needed |
| Pipeline self-versioning | `pipeline/v1→v2→v2.2` (metabolizes itself) | — | A-only | meta-pattern: the pipeline already practices apoptosis |
| Raw corpus | `transcripts/` (23), `analyses/` (77) | — | A-only | the Infinity-specific archive; stays with Arc |
| Lane planning | `roadmap_lanes.md` | — | A-only | superseded by kernel work/lanes |

---

## STAGE 1 — KERNEL A · Process kernel (the loop + memory = function body)

> Madewell is cleaner and more complete here. Most flows are →K(M).

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Four phases | commit `PHASE:` (Ideate/Plan/Implement/Verify) | `guides/02-FOUR-PHASES.md` (Imagine/Plan/Make/Verify) — documented, fractal | →K(M) | same four, MW names them for non-technical + states the fractal |
| Session start | global `~/.claude/skills/session-start` (personal) | `skills/session-start.md` + `guides/03-SESSIONS.md` | →K(M) | MW's is project-local & portable; Arc's is your personal global |
| Session end | global `~/.claude/skills/session-end` | `skills/session-end.md` | →K(M) | same |
| State oracle | git status/log + `.rumen/ledger.jsonl` | `STATE.json` (phase/active/blocked/backlog/staged) | →K(M) | the Plan-phase oracle, explicit in MW |
| Decisions / ADRs | `docs/decisions/` — **18 real ADRs** + archive | `decisions/` + `DECISIONS.md` + `templates/DECISION.md` | tie | MW has the template; Arc has the proven corpus + cadence |
| Vision / roadmap | `ROADMAP.md` + `CONSTITUTION.md` (rich) | `PRODUCT.md` + `templates/PRODUCT.md` | tie | MW structure →K(M); Constitution's craft/beauty/care is shared canon |
| Work / lanes | git branches + `docs/backlog/` (rotted) | `work/` (`status.jsonl`, packages, reports) | →K(M) | "one lane = one PR"; MW has the work record, Arc proves branch-first |
| Memory | a database-backed substrate (Arc's own choice) | `memory/` (simple file stub) | base →K(M) · Arc = **pro pack** | base = a simple zero-dependency default; the memory pro pack swaps in *any* persistence backend behind a common deposit/recall contract — never fold a specific backend into the base |
| Orchestration | AGENTS Delegation Protocol + Tower + scout/brief | `guides/ORCHESTRATION.md` + `skills/orchestrate.md` | tie | Arc richer (Tower bus); MW has the clean guide |
| Commit / handoff | `rules/commit-convention.md` (PHASE/DONE/TODO) | implied in sessions | →K(A) | the handoff format; MW lacks an explicit one |
| Thinking skills | scattered/global (debug-hypothesis, criticality…) | `skills/` — 14 curated (blind-spots, reframing, systems-thinking, luck, exploring-possibilities…) | →K(M) | MW curated the generic thinking-tool set |
| Agent entry | `AGENTS.md` (product-specific, domain-heavy) | `AGENTS.md` + `templates/AGENTS.md` + `CLAUDE.md` loader | →K(M) | MW's is a clean, project-agnostic template |
| Human door | — | `MADEWELL.md` (the two-doors model) | →K(M) | Arc has no human-facing orientation door |
| Setup / bootstrap | — | `guides/00-SETUP-GUIDE.md` + AGENTS bootstrap | →K(M) | install flow; Arc was hand-assembled |
| Working-with-AI | CLAUDE.md rules (personal) | `guides/05-WORKING-WITH-AI.md` | →K(M) | |

---

## STAGE 1 — KERNEL B · Quality kernel (Rumen = anti-drift governor)

> Arc is the **live** dogfood here. Madewell only references enforcement. Most flows →K(A).

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Engine spec | `~/rumen/ENGINE-SPEC.md` (gen 9) | consumed via `enforcer.md` | shared | the kernel both point at |
| Live install | `.rumen/` — AGENT.md, MANIFEST, ledger, history, install-hooks | `packs/dev/skills/enforcer.md` (prose) | →K(A) | **Arc runs it; MW describes it** |
| Fences / walls | `.rumen/walls/registry.json` (enforced) | design-system DOCTRINE as prose | →K(A) | Arc has actual true/false walls |
| Lexicon / flora | `.rumen/packs/flora.json` + `scripts/mine-flora.ts` | — | →K(A) | mined house vocabulary |
| Tax sensor / drift | `.rumen/scripts/log-drift.ts` + `ledger.jsonl` | — | →K(A) | the acceptance differential, recorded |
| Metabolism | `~/rumen/metabolism/*.mjs` + `runs/bolus-001/002` | — | →K(A) | promote/retire — the load-bearing organ |
| Digested packs | `.rumen/packs/{frontend,schema,flora}.json` | `packs/dev/pillars/*` (source prose) | different forms | Arc = digested output; MW = the forage |
| Lab / experiments | `.rumen/lab/` (REPL, predictions, scores, dashboard) | — | A-only | the experimental wing; stays a lab |

---

## STAGE 2 — PACKS · Striation / domain cartridges (the function's parameter)

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Dev pack — foundation | implicit in AGENTS Data Architecture | `packs/dev/foundation/system.md` | →K(M) | system design decided before pillars |
| Pillar — Backend | AGENTS Data Arch + testing/observability | `packs/dev/pillars/backend.md` | tie | |
| Pillar — Frontend | `skills/impeccable` + `arc-ui` + `solid-*` | `packs/dev/pillars/frontend/` (full design-system) | tie (split) | **impeccable = the source MW's DOCTRINE was distilled from** |
| Pillar — API | AGENTS (Hono patterns) | `packs/dev/pillars/api.md` | →K(M) doc | |
| Pillar — CI/CD | **real** `validate.yml`/`deploy.yml` + verification protocol | `packs/dev/pillars/ci-cd.md` (doc) | →K(A) reality | Arc has the actual shipping pipeline |
| Design system | impeccable + `tokens.css` + `DESIGN.md` | `frontend/design-system/{tokens,color,motion,typography,DOCTRINE,design-method}` | tie | the cleanest extraction MW has done |
| Domain skills | `solid-2`, `solid-ref`, `solid-verify`, `tiptap`, `hubspot`, `icon-author`, `rams` | — | A-only | Arc-specific cartridges; live in an "arc pack" |
| Future striations | — | named in `PACK-CONTRACT §4` (sales/marketing/ops) | GAP | the portability thesis; unbuilt by design |

---

## STAGE 3 — SKINS · Persona rings (who's holding it)

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Guide persona (hosted skin) | — (runs naked) | `MADEWELL.md` + AGENTS Guide voice | M-only | the beginner skin |
| Naked / advanced (no skin) | Arc AGENTS (no Guide) | — | A-only | the developer profile |
| Host↔organ model / contract | — | `~/rumen/PACK-CONTRACT.md §5` | shared | the spec that says host and organ stay separable |

---

## STAGE 4 — OUTPUT · Land (the function's return value)

> **The biggest finding: this entire stage is blank on both sides.** Josh named it independently.
> It is the *return* of the function, not a 5th phase. It is also where the quality kernel
> *learns* (lexicon update, tax recording, PROMOTED marking) — so the return feeds back into
> the kernel and closes the recursive loop.

| Component | Arc (lab) | Madewell | Winner / Flow | Notes |
|---|---|---|---|---|
| Doc propagation (README / changelog / code comments) | — | — | **GAP** | the core of Land |
| PROMOTED marking (drain the staging lake) | manual | manual | **GAP** | closes Discovery→done loop |
| Lexicon update on accept | partial (`mine-flora` rerun) | — | →K(A) partial | Rumen's natural hook |
| Cleanup / graveyard | AGENTS "Graveyard" + Retention rules | — | →K(A) partial | purge deprecated on sight |
| Session handoff | commit TODO line + flight recorder | `session-end.md` | tie | partial Land already exists |

---

## Tally — where each kernel is won

- **Process kernel:** mostly **Madewell** (cleaner, documented, portable). Arc contributes commit-handoff and orchestration depth. (Memory does *not* fold in — a specific backend is a pro pack; the base is a simple zero-dep default.)
- **Quality kernel:** mostly **Arc** (live, running, with real walls/flora/ledger/bolus). Madewell only references it.
- **Input (Discovery):** **split** — Madewell's routing skeleton + Arc's lens depth as a pack.
- **Packs:** **split** — MW's pillar structure + Arc's real CI/CD, design source (impeccable), and domain skills.
- **Skins:** **disjoint by design** — the proof the rings separate (same kernel, two skins).
- **Output (Land):** **net-new on both** — the one stage to design from scratch.

## Pro packs — Arc's opinionated cartridges (pluggable, never forced on the base)

**Principle:** every shape ships a **working simplified default** (zero forced external deps, no
vendor/stack lock-in); a pro pack is the *same shape, upgraded* — the heavy implementation behind
the same contract, so base and pro are interchangeable stones (swap, don't mortar). Madewell ships
the generic version; Arc loads the upgrades on top. The base is never empty — it's batteries-included.
**The core is technology-agnostic:** shapes are described by contract; any specific tool named in
this doc is *Arc's own* choice, never a Madewell default.

| Pro pack (upgrade) | Base shipped (working, generic) | The upgrade (opt-in) | Contract / seam |
|---|---|---|---|
| `memory` | a simple zero-dependency default | any persistence backend you choose | deposit(shard) / recall(query) |
| `deep-discovery` | simplest discovery prompt (5-lens single-pass) | 7-lens + Subtext + two-pass parallel | discovery → 4-route output |
| `tower-orchestration` | simple delegation (`skills/orchestrate.md`) | Tower fleet bus (send/ask/board, verbatim guard) | spawn brief + relay |
| `impeccable-design` | base doctrine — what to look for | full impeccable DOCTRINE + motion/color/typography | the frontend pillar pack |

**Rumen is not in this table** — the upgrade-packs above are *content* (a richer diet for a shape
Madewell owns); Rumen is the **engine/organ** itself (separate repo), shipped pre-loaded by default.
There is no "lite Rumen"; it's the cartridge that's always pre-inserted. It is the **pro
implementation of the quality shape** — Madewell's built-in **Enforcer** is the batteries-included
default behind the *same* quality contract, and Rumen is the heavy upgrade behind it (fed, in turn,
by striation packs — frontend/backend/api/cicd — which *are* content cartridges). **Host↔organ:**
Rumen is not a layer Madewell sits on, nor one that sits under Madewell — it is the quality organ
Madewell hosts (ratified 2026-06-20).

**Not pro packs — project content (stays in Arc, never enters the kernel):** the domain skills
(`solid-*`, `tiptap`, `hubspot`, `icon-author`), the HubSpot/Galley/Stripe integrations, the
real `validate.yml`/`deploy.yml`. These are *what Arc is built from*, not reusable methodology.

> Full pro-pack extraction is its own pass; this seeds the obvious candidates from the bracket.
