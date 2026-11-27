# Implement the Brainstorm base jump pack

**Assignment:** seed the new Made Well MCP experience with this approved brainstorming library and its effort dials. Build on the existing product; do not redesign or re-prove its grammar.

**Report to:** the originator of your actual agent assignment. Obtain the assignment's communication/authority context rather than inventing an agent identity. Preserve its NQ exchange and independent acceptance boundaries.

**Status:** source seed supplied; runtime integration and commercial enforcement not implemented by this package.

## Synthesis

- **Tasks:** integrate the standard-skill seed; resolve and persist effort; expose the supported Brainstorm handoff; enforce managed access; independently verify behavior and distribution.
- **Dependencies:** reconcile the current repository and freeze shared selection/handoff contracts first. Skill-loading and access-boundary work can then proceed in parallel against those contracts. Native host acceptance and paid launch require their respective release inputs.
- **Unknowns:** exact client, hosting/identity, billing terms, and product publication remain scoped gates. Brainstorm content is supplied here; landing content is not. None blocks reading this package or implementing the local base-pack plumbing.

## Read first and preserve

Read [AGENTS.md](../AGENTS.md), the governing [foundation](../FOUNDATION.md), and the complete [v7 plan](../v7/PLAN.md). This handoff supplies the Brainstorm content and commercial direction missing from that earlier plan; it does not replace its shared contracts or grant deployment authority.

The fixed goals:
- One collaborative conversation can begin from a seed, existing project, fragment, or resumed/stuck thread.
- Preserve exact material, the user's goal and settled decisions, live alternatives, uncertainty, and next useful move.
- Pair `brainstorm` with `ambitious-collaboration`; select specialist methods by need rather than running a fixed chain.
- Preserve standalone and recursive composition. No mandatory discovery/delivery work just to use Brainstorm.
- Light is the free default. Focused and Deep are selected paid managed-workflow options, not provider reasoning controls.
- Promoting ideas and executing tasks remain separately authorized; a successful brainstorm does neither automatically.

### Design judgment

- **Developer experience:** reuse ordinary skill packages and shared service contracts instead of a second skill dialect or database.
- **User experience:** useful free brainstorming, explicit extra work behind the deeper options, continuity without an intake questionnaire every turn.
- **Agent experience:** discoverable methods, pinned content and effort, supported result packets, explicit access/capability failures rather than guessed state.

These are design reasons, not measured gains or a performance score.

## Grounded reuse inventory

Inspected application baseline: `288533725ca187dcdfb91d4fc81ae84597c98652`. Reconcile later code before editing; this is evidence, not permission to reset a checkout.

| Classification | Existing source / observation | Required treatment |
|---|---|---|
| REUSE | [This skill snapshot](skills/brainstorm/SKILL.md), [provenance](PROVENANCE.json), supporting references/assets and eval definitions | Keep skill bytes and licenses intact; make deliberate upstream changes rather than an edited vendored fork. |
| EXTEND | `src/jump-packs.ts`: `JUMP_SLOTS`, `JumpMethod`, `JumpPack`, `resolveJumpPacks` | The inspected JSON schema has discovery/delivery slots and rejects unknown ones. `tier` and `budget` fields are not a standard-skill loader, Brainstorm profile resolver, or billing entitlement. |
| EXTEND | `src/settings.ts`: `WorkSettings`, `defaultSettings`, `validateSettings` | Existing autonomy and discovery/delivery settings do not supply these effort/access contracts. Keep autonomy, effort, and commercial access separate. |
| REUSE / EXTEND | `src/functions.ts`: `functionInput`, `requestPackUpdate`, `advanceFunctions`; `src/store.ts`: `openStore`, `openReadOnlyStore`, existing `request` receipts | Use the v7 non-executing prepare/record boundary, durable revisions, and saved material. Do not route ordinary Brainstorm preparation into executable runner behavior. |
| REUSE | v7 §§3, 7, 15–17: composition, file access, handoff, promotion, privacy, and recovery contracts | Implement one shared meaning across CLI/UI/MCP, not separate lifecycle or mutation rules per adapter. |
| BUILD NEW where still absent | Standard-skill ingestion/binding, standalone Brainstorm handoff, effort resolution, managed entitlement seam | At the inspected baseline, no matches for MCP-server/modelcontextprotocol/entitlement/billing/payment integration were found in `src/` and `package.json`. Inspect current code before adding anything; a keyword search is not proof about uninspected systems. |
| EXTEND | `package.json` distribution allowlist and the eventual loader | The handoff directory is not automatically a shipped runtime asset. Include only chosen runtime material and notices; keep evals/reviews out of runtime payloads unless needed. |
| DO NOT REBUILD | Work ledger, receipt/revision machinery, source/answer provenance, privacy boundaries, runtime, scheduler, provider routing | No new workforce, second task system, or payment engine as a prerequisite to using ordinary skills. |

The `pack-design.json` file is **design data only**. It does not conform to the inspected legacy `JumpPack` schema and must not be presented as runnable by `mw`.

## Work A — Resolve the seed and effort contract

**Purpose:** turn selected ordinary methods and requested effort into a reproducible prepared conversation, without hidden changes or execution.

**Current state / gap:** skill content and work recipes are supplied; the inspected runtime lacks the needed standard-skill/Brainstorm resolver. This is missing integration, not evidence that the grammar is defective.

1. Reconcile the baseline and reuse any work already delivered by v7 W1/W2/W3.
2. Use [pack-design.json](pack-design.json) as the reference selection data; agree the actual schema with the existing composition owner.
3. Bind `brainstorm` to the Brainstorm component and pair the ambient posture. Keep the full catalog selectable, but load only selected instruction bodies and relevant supporting files.
4. Resolve Light when effort is absent. Preserve explicit Focused/Deep requests, custom dial requests, and output-length preferences separately.
5. Persist the resolved method/content identities, composition, requested/effective effort, and actual allowed capabilities at a saved boundary. Existing work retains its pinned selection.
6. Reject unavailable explicit selections, missing files, path escapes, conflicting bindings, unsupported schema, or corrupt material visibly. Loading executes no scripts.
7. Preserve ordinary standalone use outside Made Well. Public skill files do not require a product subscription.

**Out of scope:** rewriting the twenty methods, universal engine effort enums, marketplace/dependency solving, silent updates, provider/model switching.

**Done:** independent evidence for B01–B05 and B11 below, alongside the applicable v7 acceptance criteria.

## Work B — Carry the conversation through the real host

**Purpose:** eliminate manual copying while preserving a useful collaborative thread rather than imposing a rigid creativity ceremony.

**Current state / gap:** this package describes behavior; it has not established a native client integration.

1. Reuse the actual host-supported skill loading and non-executing prepare/record services. Do not invent an MCP tool name or claim a slash command exists merely from a folder name.
2. Accept a rough seed or existing context. Do not require every field or a complete specification to begin.
3. Carry decisions and live branches between turns; do not restart the intake or reopen settled goals on each invocation.
4. Prepare only authorized material from explicit roots or an actual package-input bridge. A remote connection alone does not read the user's repo.
5. Record an exploratory result containing the useful opening, mechanism/example, sources and uncertainty, live alternatives, and next discriminating move. Record requested versus performed effort honestly.
6. At an explicit pause or selected successor, retain complete material behind any summary. Choosing a direction does not promote every idea or invoke a worker.
7. Present the current effort and any material access/capability mismatch in the existing host experience. Do not build a new dashboard merely to expose a dial.

**Out of scope:** whole-product UI redesign, mandatory subagents, executing optional skill scripts, deployment or publication.

**Done:** B01–B05, B09–B12 and the applicable host/continuity/privacy v7 criteria, with exact client/version/transport evidence.

## Work C — Separate commercial access from effort

**Purpose:** keep the useful Light path free while making protected managed Focused/Deep operations enforceable and honest.

**Current state / gap:** the operator supplied the access direction, not provider credentials, prices, usage terms, or a finished billing system.

1. Implement against the actual identity/authorization architecture selected for the product. Reuse existing verified entitlements if available; do not create a competing customer/account store.
2. Keep a narrow service-side entitlement decision at the protected operation boundary. A model-selected profile is a request, not authorization.
3. Validate the effective resolved composition, aliases, custom dials, and continuation rather than trusting a `light` label.
4. Distinguish unavailable entitlement from unavailable evidence/tools. Refuse a new protected operation on unknown entitlement; preserve work and offer the permitted free path.
5. Keep an explicit entitlement-free local/standalone usage path for the ordinary skills, without advertising it as an enforced commercial deployment.
6. Preserve logical request idempotency and receipts. Do not select a billing unit or charge by raw MCP request count without approved terms.
7. Add checkout/provider-specific integration only after its release gates are answered and implementation is authorized. Test fixtures may represent entitlements; a fixture is not a live billing integration.

**Out of scope:** real charges, automatic upgrades, purchasing a service, inventing prices/quotas, treating public prompts as protected intellectual property, bundled inference by implication.

**Done:** B06–B10 for the implemented boundary. A live paid release additionally requires the approved commerce/hosting policy and independent end-to-end evidence.

## Work D — Independent verification and delivery

**Purpose:** prove implementation fidelity and actual host behavior, without confusing parseable files, scenarios, or source publication with outcomes.

**Current state:** the source-authoring pass checked the five changed skills' structure, references, and scenario JSON. It did not execute behavioral scenarios. This snapshot contains 74 scenario definitions; the five new/modified skills account for 40. Earlier developmental probes of other revisions are not certification of this seed.

- Have an independent test-design/check owner follow repository policy. Neither implementation maker nor test-design maker awards its own acceptance.
- Run focused checks for changed loader/resolver/service/adapter files and the relevant existing tests identified by v7 §17. Do not run the entire suite by default.
- Test the packed distribution from an unrelated directory. Verify actual assets, relative supporting files, license notices, source identities, and no dependency on this checkout or personal paths.
- Exercise a real supported client. Plain resource reading is not proof of native skill activation; a catalog name is not proof its body was used.
- Evaluate representative multi-turn brainstorms with the actual loaded instructions. Include from-scratch, existing-project, fragment, resumed, creative-medium, known-good-fix, missing-access, and effort-boundary cases.
- Compare Light/Focused/Deep on the same material. Inspect actual sources, challenges, artifacts, and revisions—not response length or model self-ratings. Keep generation success separate from assertion outcomes.
- Report source acceptance, behavioral results, host interoperability, entitlement enforcement, installed activation, and billing activation separately.

### Acceptance cases to implement, not reported results

| ID | Observable condition |
|---|---|
| B01 | No effort selected resolves to Light, free of a paid entitlement requirement; no automatic upgrade, purchase, or runner action occurs. |
| B02 | Existing-project and resumed conversations preserve supplied decisions and source material; a rough seed can produce a useful first lead without an intake gate. |
| B03 | The posture and selected specialist bodies actually reach the host; unavailable explicit selections fail visibly. The whole catalog is not loaded or run by default. |
| B04 | Focused and Deep perform their declared additional work when authorized and capable; missing evidence stays explicit, and short output does not force Light. |
| B05 | Method, ambition, output length, provider reasoning, effort, work authorization, and commercial entitlement do not silently change one another. |
| B06 | Free/unauthenticated/tampered client claims cannot invoke protected managed operations. The result explains the access requirement without discarding the user's draft. |
| B07 | Verified access permits the selected paid profile; aliases, nested selections, custom dials, and resume paths use the same service-side boundary. |
| B08 | Retried logical operations do not duplicate effects or usage under the implemented policy; stale revisions and cross-account handles do not bypass authorization. |
| B09 | Payment state does not expose another user's work or grant local file access. Private material obeys actual roots/package-input and tenant permissions. |
| B10 | Entitlement outage or expiry follows the declared in-flight policy for new protected work; earlier user material and authorized receipt recovery remain available. No silent downgrade or false Deep completion. |
| B11 | The chosen runtime assets work outside the source checkout; standalone ordinary skill use remains possible; pinned work does not mutate after a library update. |
| B12 | Results distinguish proposals, selected directions, recorded outputs, and verified outcomes; no task promotion, agent launch, or external execution follows from a brainstorm alone. |

## Dependencies and ownership

Reconcile current code and shared contracts first. A owns selection/content/effort resolution; B consumes that prepared contract; C can develop the access boundary against the agreed operation schema in parallel. D owns independent test design from the start and integrated acceptance after implementation is ready.

These are responsibility boundaries, not a mandated number of agents. Reuse the wider v7 workstreams and serialize edits to shared files. Do not create circular “everyone must finish before anyone starts” acceptance gates.

## Release gates and stop rules

Existing v7 U1/U3/U4 remain: exact first client/topology, hosted identity/privacy/deployment, and publication/product-license authority. U2 now concerns landing, not the supplied Brainstorm seed.

Additional commercial decisions:
- **[UNKNOWN — needs input: What prices, currency, billing period, and subscription or purchase terms are approved?]**
- **[UNKNOWN — needs input: Which payment provider and existing account/organization identity must the managed entitlement use?]**
- **[UNKNOWN — needs input: Is usage metered; if so, what counts, what is included, and what happens on retries, partial work, cancellation, and overages?]**
- **[UNKNOWN — needs input: What is the entitlement expiry/outage/in-flight policy for a paid operation already accepted?]**

Inspect assigned infrastructure and existing policy before asking. These gates block dependent commercial release slices, not the free base pack or source-level contracts.

Stop the affected operation rather than bypass a guard, invent a credential, register a paid service, charge a customer, publish a package, or expose private data. Do not treat unknown authentication as “free means public work access.” Do not release a paywall that exists only in the prompt or UI.

## Reporting and handoff check

Report **YES/NO** for each assigned work item, with the delivered behavior, evidence, one material blocker if any, and the next owner/action. Name actual source/host versions and state explicitly whether payment handling is a fixture, integrated test system, or live service.

**Handoff check:** the seed bytes, provenance, work recipes, intended access map, reuse seams, tasks, dependencies, and acceptance cases are supplied. A receiver can start the base integration without recovering this conversation. A complete paid public launch cannot honestly be claimed without the named release decisions and evidence.

**Checklist:** synthesis, context, current gaps, purposes, ownership, exclusions, stop rules, and definitions of done are included. Exact new API/module names are deliberately left to reconciliation with the current v7 implementation, rather than inventing commands that do not exist. Follow the repository's actual build/verification instructions; this document does not authorize production deployment.
