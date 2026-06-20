# Land — Grounding Run (5 real Arc PRs)

**Purpose:** pressure-test `LAND-SPEC.md` against real merged work before building machinery.
5 PRs chosen for variety. Verdict: **spec holds on Delta/Learned/Propagated; one refinement
(PROPAGATED needs an OWED state); TAX is structurally unrecoverable retroactively (expected —
it proves Tax must be captured live).**

---

## #28 · review-pr.sh · `9e8e41a` · feat/tooling

```
DELTA:       scripts/review-pr.sh (up/down, any PR# as arg) + `bun run review-pr`;
             per-PR worktree + dev-pr<N> Neon branch, isolated from main + dev-josh. (2 files, +98)
LEARNED:     → work: isolation needs BOTH a worktree AND a per-PR Neon branch, and teardown
                     must not clear main's .env.local.  → memory + lexicon ("dev-pr<N>")
             → factory: none
PROPAGATED:  [x] docs n/a (self-documenting) · [x] state n/a · n/a STG · [x] lexicon ("dev-pr<N>")
TAX:         UNRECOVERABLE retroactively (no first-pass on record). Live-only.
```

## #27 · snake_case + integer-cents · `a0da95e` · refactor (max propagation)

```
DELTA:       removed dto.ts mappers; snake_cased every column key across all schema + zod +
             every consumer; money → bigint integer cents; migration 0044 extended. (~30+ files)
LEARNED:     → work: sub-cent precision DROPPED on galley *_cents (lossy, needs confirm);
                     payments.amount_value is dual-unit (cents|basis-points).  → ADR (money repr)
             → factory: none
PROPAGATED:  [x] consumers reconciled (api/web/@arc/email/zod) · [x] lexicon (snake_case = the
             canonical key convention — wall-shaped) · n/a STG
             [OWED] migration 0044 apply → dev-ci then prod   → queued
GATES:       human-confirm sub-cent drop + dual-unit interpretation  → blocked/decision (NOT queue)
TAX:         UNRECOVERABLE. (Would have been large — huge surface.)
```

## #25 · dev.sh no orphans · `e6c16b2` · fix/infra

```
DELTA:       startup reaper + perl-setsid trap + process-group teardown + repo-signature sweep;
             dev:doctor; .dev.pid. (4 files, +178)
LEARNED:     → work: a startup reaper is the ONLY backstop that survives SIGKILL/terminal-close
                     (no trap can catch those).  → memory + lexicon
             → factory: none
PROPAGATED:  [x] docs (self-doc + dev:doctor) · [x] state n/a · n/a STG · n/a lexicon
TAX:         UNRECOVERABLE. (Commit recorded Verify evidence — adjacent to tax, not tax.)
```

## #26 · install Rumen · `572a656` · feat/meta (factory installing its own organ)

```
DELTA:       .rumen/ pack home, first wall check-raw-hex (warn-only, 17 live violations),
             cud-capture post-commit hook, AGENTS pointer. (10 files, +606)
LEARNED:     → work: none (pure factory)
             → factory: this IS the quality-kernel install; TODO names "build R3 tax sensor to
                        read the ledger" — the exact organ we are now spec'ing.  → metabolism
PROPAGATED:  [x] AGENTS pointer · [x] lexicon (flora/walls ARE the lexicon install) · n/a STG
             [OWED] graduate walls warn→block once 17 violations clear; wire into turbo check → queued
TAX:         UNRECOVERABLE. (Once R3 ships, this pack's future installs would emit tax.)
```

## #18 · data-boundary guard · `7a3927b` · feat/ci (surfaced downstream work)

```
DELTA:       verify-data-boundary.mjs (Rule A clean+gating; Rule B flagging real violation)
             + lefthook + validate.yml + ci-parity + AGENTS pointer. (5 files, +158)
LEARNED:     → work: Rule B surfaced a hidden pre-existing breach — CollectionTable endpoint
                     HTTP mode, driven by 3 list-over-fetch routes.  → memory
             → factory: "conservation layer" pattern — prose architecture → executable
                        unskippable guard, registered in ci-parity so neither layer silently
                        drops.  → metabolism (reusable factory pattern)
PROPAGATED:  [x] CI+lefthook+parity wired · [x] AGENTS · [x] source D01-S5/S6 → PROMOTED
             [OWED→QUEUED] fetch-read-migration (build-index/developer→deals PGlite,
                           EmailPlayground TBD, remove CollectionTable endpoint mode)
SURFACED:    the fetch-read-migration → QUEUE  (textbook: new work goes to the queue, not a field)
TAX:         UNRECOVERABLE.
```

---

## Findings

1. **Holds on 3 of 4 fields, across all 5 types.** DELTA = the commit's `DONE:`. LEARNED, PROPAGATED slot on cleanly for feat/refactor/fix/meta/ci alike. The record never felt heavy — even the infra fix carried a real LEARNED worth keeping; trivial work would yield trivial exhaust.

2. **TAX is unrecoverable retroactively on all 5** — we have only the landed commit, never the agent's first pass. This is not a failure; it *proves the spec right*: Tax must be captured **live**, at land. Backfilling is structurally impossible.

3. **Refinement found — PROPAGATED needs an `OWED` state.** 3 of 5 had deliberately-deferred propagation (migration not applied; walls not graduated; fetch-migration delegated). PROPAGATED is not binary done/n-a — a third state, `OWED → queued as <task>`, captures debt without blocking the land. **Spec updated.**

4. **Land disambiguates the overloaded `TODO:` line.** The legacy commit `TODO:` conflated three Land-distinct things: next-work (→ queue), human-gates (→ blocked/decision), and propagation-owed (→ PROPAGATED OWED). #27's TODO held all three at once. Land separates them by destination — a concrete improvement, not just a rename.

5. **The theoretical paths fired in the wild.** #18 = textbook Surfaced→queue *and* discovery-sourced (D01 → PROMOTED). #26 = textbook factory-LEARNED (recorded its own next metabolic organ). The two-route LEARNED and the queue-not-a-field rule are real, not invented.
