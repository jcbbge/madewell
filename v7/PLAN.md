# Made Well — Operationalize the Established Grammar

> **Mode: COORDINATED** — the implementation spans composition, portable skill cartridges, context handoffs, MCP integration, and independent verification, with shared contracts that must be settled before parallel implementation.
>
> **Status:** Recommended execution blueprint for the cloud agent; not an implementation or deployment receipt. Product requirements are distinguished below from proposed engineering choices. Release-affecting unknowns are explicit in §18.
> **Repository:** https://github.com/jcbbge/madewell — `main`.
> **Inspected source baseline:** `79e648d442af840bfbb872c538c6eecbc626b74c`. This document and the governing foundation correction are later documentation changes. Reconcile subsequent code changes before implementing.
> **Owner:** The receiving cloud agent leads implementation and reports to Josh in the conversation that assigns this document. It owns any agents it delegates to. No particular agent platform is required.
> **Brainstorm supplement:** [brainstorm/README.md](../brainstorm/README.md) supplies the approved base-pack seed and [effort/access direction](../brainstorm/EFFORT-AND-ACCESS.md): free Light by default, paid Focused/Deep. It resolves Brainstorm content under U2; landing and the other release gates remain. It is not a runtime or billing delivery.

## 1. Executive Objective

Operationalize Josh's established Made Well process so a person can use their chosen assistant and tools without repeatedly copying skills, source material, context, outputs, and handoffs between applications.

Preserve the opinionated defaults:

```text
work()
  brainstorm() → discovery() → delivery() → landing()

delivery()
  ideation() → planning() → implementation() → verification()
```

Every component remains independently usable, extensible, replaceable, and recursively composable. Cartridges provide interchangeable methods inside that structure, including compositions of other methods. Anyone should be able to bring and share cartridges.

**Made Well already works.** Josh has used and refined it manually for two years. Implement and verify the plumbing against this established contract. Do not propose another experiment, pilot, demonstration, or smaller invented grammar to determine whether the process works.

**Product boundary:** Made Well shapes possible work into to-dos and helps people deliberately promote selected to-dos into tasks. It is not a workforce that performs the resulting work. A person or their chosen assistant may apply a method; Made Well supplies the structure, selected methods, context, and handoff continuity. Promotion is not permission to launch workers, run scripts, change a repository, publish a campaign, contact a prospect, or deploy software.

## 2. Background / Context

### Settled direction

- The governing product definition is [FOUNDATION.md: Settled foundation](../FOUNDATION.md#settled-foundation-operationalize-the-established-grammar). Read it before interpreting older runtime documentation.
- Made Well is a grammar for work generally, not an SDLC product. Software is the first application, not the kernel. Josh's broader use includes marketing, sales, engineering, product, design, and day-to-day solo-agency work.
- The complete default composition and independently selected components are both legitimate. Brainstorm alone is not an incomplete execution of an obligatory four-stage pipeline.
- Names, stage counts, matrices, and methods are opinionated defaults. They are not universal engine slots or fixed cardinalities.
- Ground and Rumen span appropriate functions; they are not extra serial gates. See [Bedrock](../FOUNDATION.md#bedrock-composition-spanning-processes-and-effort-dials).
- Work effort changes depth and potentially internal composition. It is not merely a token budget, provider reasoning setting, number of agents, or autonomy setting.
- Rivet, any other orchestration runtime, a particular model/provider, and a particular harness must not be consumer dependencies.

### Latest delivery direction from Josh

Josh proposes that users place project-specific cartridges in an optional dot-directory in their repository. When integrated with Made Well's MCP, Made Well supplies defaults and layers explicitly supplied cartridges over them. Portability and sharing matter more than inventing another package format. Josh is considering ordinary skills as the cartridge format rather than a Made Well-specific skill dialect.

**Recommended resolution, not a claim of prior approval:** use the existing Agent Skills format for methods, plus a small Made Well composition/binding configuration. Keep the skill usable outside Made Well. Put where/how it plugs into Made Well outside its instruction body. The detailed recommendation is in §§7 and 15.

### Corrections that must survive the handoff

- Earlier research incorrectly made Rivet central to the product. That recommendation and its dependent estimates are withdrawn.
- An earlier assistant proposal reduced the kernel to “work item + cartridge.” That is not the accepted structure.
- Existing runtime support for executing tasks does not override the clarified product boundary. Preserve compatible existing behavior without making automation a prerequisite or silently enabling it through new entrypoints.
- This is an incremental implementation plan, not permission for a rewrite, another scheduler, a new work board, or a compulsory hosted service.

## 3. Reuse / What Already Exists

### Evidence and inspection boundary

The author inspected the actual source, targeted tests, package manifest, and recent git history. `git fetch origin` showed `HEAD` and `origin/main` identical at the baseline above before the documentation commit. Tests were read, **not run**; their presence is not evidence that this revision passes them. A symbol-graph query failed with `Search failed: no such table: nodes`; direct file reads, `rg`, and git history supplied the evidence instead.

### REUSE / EXTEND

| Existing mechanism | Concrete source | Required treatment |
|---|---|---|
| Configurable function packs and recursive node descriptions | `src/lane.ts`: `Pack`, `Step`, `loadPack`, `laneOf`; `src/readiness.ts`: `functionSteps`, `problemsOf` | Extend the existing representation/validation where it fits. Preserve legacy decoding. Separate portable composition from execution-2 requirements rather than making every skill a runnable command or hired agent. |
| Method selection, fallback methods, provenance, and conflicting-requirement diagnostics | `src/jump-packs.ts`: `JumpPack`, `JumpMethod`, `resolveJumpPacks`, `loadJumpPack` | Reuse resolution logic. Replace universal `JUMP_SLOTS` assumptions with the selected composition's declared addresses and contracts. Keep useful conflict diagnostics. |
| Current default discovery and delivery methods | `src/grammar.ts`: `DISCOVERY_FUNCTIONS`, `GRAMMAR_PACK`; `src/autonomy-pack.ts`: `GENERAL_DISCOVERY`, `AUTONOMY_PACK` | Preserve the actual methods and their contribution contracts. Move defaults into declarative selection, not implicit runtime behavior. |
| Existing selector and immutable per-item configuration | `src/pack-selection.ts`: `resolvePackSelection`; `src/settings.ts`: `WorkSettings`, `validateSettings`, `defaultSettings` | Reuse explicit selection and pinning. Preserve existing `builtin:grammar` pins and execution-2 meaning; do not silently reinterpret historical work. |
| Exact input, prior outputs, grants, saved answers, preparation | `src/functions.ts`: `functionInput`; `src/organs.ts`: `organPacket`, `inspectPreparation`, `checkIncomingPreparation`; `src/packet-references.ts`: `referenceDiscovery` | Extract/reuse shared handoff construction and validation. Do not replace them with a prompt-concatenation shortcut. |
| Question identities and reusable decisions | `src/nq-obligations.ts`: `answerHistory`, `workQuestions`, `recordPhaseDecisions`; `src/handoff-history.ts`: `buildAnswerHistory`; `src/context-facts.ts`: `contextFactsFor` | Keep answer provenance, aliases, explicit ancestry, receiver scope, and private-track separation. |
| Single durable Store and atomic transitions | `src/store.ts`: `openStore`, `request`, `atomic`, `transition`, `openReadOnlyStore` | Keep this implementation's one store. `request` fingerprints operation/target/validated input; `transition` compares revisions under the transaction. Do not introduce a parallel MCP database. |
| General work capture and lifecycle | `src/ledger.ts`: `createLedgerWork`, `mutateWork`, `Condition`, `Evidence`, `Completion`; `src/engine.ts`: `promote` | Reuse durable identity, source, conditions, ownership, and relationships. Extend promotion deliberately: the existing function is not yet the safe portable promotion contract described here. |
| Boundary replacement and recovery | `src/functions.ts`: `requestPackUpdate`, `advanceFunctions`; `src/work-boundary.ts`: `invalidatedAt` | Preserve attempted/accepted prefixes, historical outputs, saved returns, and uncertainty. New host handoffs must not borrow an unsafe “retry means rerun” interpretation. |
| Read projections and browser protections | `src/api.ts`: `contextOf`, `API_SCHEMAS`, `createApi`; `src/handoff-view.ts`; `src/work-evidence.ts`; `src/console.ts` | Reuse read models and guards. A truncated status preview is not a complete method input. Do not expose raw legacy endpoints as a remote service. |
| Existing skill and domain material | `skills/`; `examples/jump-pack-lab/packs/{generic,software,marketing,sales,database}.json`; `examples/security-delivery/` | Reuse as source material and regression fixtures where applicable, not as proof that a full shareable-skill product already ships. Do not require example credentials or personal paths. |
| Existing tests and disposable fixtures | `test/fixtures/prepared-output.ts`: `regressionFixture`, `preparedOutput`; targeted files listed in §17 | Extend real Store/restart and contract checks. Scripted workers exercise plumbing, not model quality or native host support. |

### Verified gaps — BUILD NEW only where needed

1. **Standard skill-directory ingestion and Made Well bindings.** Current `JumpPack` methods are JSON fields; they are not an Agent Skills loader. Add the minimal boundary that reads ordinary skill packages and binds them into a selected composition.
2. **Full outer-composition support.** The inspected pack/runtime schemas have `discovery` and `delivery` loops. `JUMP_SLOTS` lists seven discovery and four delivery slots; it does not model brainstorm and landing as equivalent composable components. Extend composition without manufacturing dummy discovery/delivery work for standalone use.
3. **Host-driven prepare/record boundary.** Current `advanceFunctions` invokes a trusted command or an `AgentExecutor`. Add a supported non-executing handoff interface for a caller's existing assistant. Reuse packet and receipt machinery; do not expose internal Store writes.
4. **MCP adapter and skill resources.** No Made Well MCP server entrypoint or native Skills/Events implementation was found in `src/`, `test/`, or `package.json`. A lockfile reference to an optional MCP SDK peer dependency of `@google/genai` is not an installed first-party integration.
5. **Explicit effort composition.** `src/cards.ts` has provider reasoning effort; `WorkSettings` has autonomy. Neither is the required work-effort resolver. Add only the declarative effort controls actually supplied by a cartridge/default.
6. **Installed distribution of the relevant assets.** `package.json`'s `files` list does not include `skills/` or `examples/`. Add explicit distribution for the product's chosen skill assets and verify the packed artifact.

### DO NOT REBUILD

- The grammar, discovery intent/conservation checks, saved-answer system, Store, transaction/receipt machinery, private-track protections, evidence history, or project-free lifecycle.
- Git/project registration. Commit `77398d6` deliberately removed repository registration and mandatory Git assumptions. An optional `.madewell/` directory must not bring those back.
- A second runtime, scheduler, provider router, task board, general plugin marketplace, or cloud identity system as a prerequisite to the portable package.
- A different skill format. Agent Skills already defines `SKILL.md`, frontmatter, relative supporting files, and progressive disclosure.

### Relevant history and external sources

- `77398d6` — general work ledger and removal of project/Git registration assumptions.
- `09f3a05` — source-bound software-security example without making software rules universal.
- `79e648d` — composition and effort dials recorded as governing bedrock.
- Optional reusable thinking methods: [agent-core-public at `09b5a8926767e9ec1465505fd89f17501e8c9034`](https://github.com/jcbbge/agent-core-public/tree/09b5a8926767e9ec1465505fd89f17501e8c9034/primitives/skills). This revision contains the 17 revised thinking skills. Its root license is MIT; retain applicable notices if redistributing. The earlier probes did not certify behavioral improvement. Josh subsequently approved the complete [20-skill Brainstorm seed](../brainstorm/README.md), pinned to [agent-core revision `9addbffae9d600f40dd334ad97bb24c6b0a0c7b7`](https://github.com/jcbbge/agent-core-public/tree/9addbffae9d600f40dd334ad97bb24c6b0a0c7b7/primitives/skills). That explicit seed request authorizes its snapshot here; it does not require loading every method or indiscriminate runtime packaging.
- [Agent Skills specification](https://agentskills.io/specification) — retrieved 2026-11-26. Ordinary skill format, not Made Well composition semantics.
- [MCP Skills overview](https://modelcontextprotocol.io/extensions/skills/overview) and [Skills specification](https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/beta/skills.mdx) — overview retrieved 2026-11-26. Skills uses Agent Skills directories and Resources; native loading is a host responsibility.
- [MCP 2026-07-28 introduction](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro), [`server/discover`](https://modelcontextprotocol.io/specification/2026-07-28/server/discover), and [Events overview](https://modelcontextprotocol.io/extensions/events/overview) — retrieved 2026-11-26. Protocol publication does not prove SDK or client compatibility.

## 4. Problem Statement

The manual process already has the desired grammar. The implementation must remove these mechanical burdens without changing it:

1. Finding the selected method and its supporting material at each boundary.
2. Reconstructing intent, context, earlier decisions, and unanswered questions in each new tool or assistant.
3. Copying outputs into the next method and losing provenance or private-context boundaries.
4. Remembering which defaults, overrides, effort choices, and skill versions were used.
5. Distinguishing possible work from work deliberately selected as a task.
6. Resuming after disconnection without redoing accepted steps or silently substituting changed methods.

Concrete current mismatches include:

- `src/jump-packs.ts:resolveJumpPacks` requires one method for every member of a fixed `JUMP_SLOTS` list and rejects unknown slots.
- `src/functions.ts:advanceFunctions` selects discovery validation through a hard-coded list of job names. A renamed method must not lose its applicable contract; an unrelated method must not inherit a contract just because its name matches.
- `src/readiness.ts:problemsOf` requires execution-2 runnable leaves and refuses nested parallel execution. Portable recursive composition must not be confused with unlimited runner capability.
- `src/engine.ts:promote` can select all candidates when no IDs are supplied, recursively include prerequisites, and queue a configured delivery pack. `src/cli.ts` and `src/api.ts` can subsequently wake a runner. New portable selection must not inherit those side effects accidentally.
- `src/api.ts:contextOf` intentionally abbreviates source and conversation. Reusing that response as the sole handoff would lose material.

## 5. Scope

### Required implementation increment

- First-class selected compositions, including the complete default structure and standalone components.
- Ordinary skill packages as methods, with explicit Made Well bindings and optional repo-local overrides.
- Default resolution, provenance, content pinning, conflict diagnostics, and safe boundary replacement.
- Durable, non-executing host handoffs that retain exact inputs and outputs without manual copying.
- Explicit candidate selection/promotion that does not dispatch work.
- A thin MCP tools/resources adapter over the same services, with a documented exact compatibility target.
- A practical local integration that can read an explicitly selected project directory, plus an explicit contract for supplying package material when the service cannot access that directory.
- Relevant read-view/help changes, installable assets, author guidance, and independent verification.

### Recommended order of delivery

1. Composition and skill bindings.
2. Non-executing handoff and promotion services.
3. MCP tools/resources and a host-local integration.
4. Native Skills support where the selected host actually supports it.
5. Optional Events support only where it improves the supported interaction and can be verified.

These are implementation increments, not new mandatory stages of the Made Well grammar.

### Conditional follow-on, not prerequisite scope

Hosted remote service, remote identity/tenancy, webhook delivery, and host-specific automatic skill activation depend on the explicit gates in §18. Do not build a speculative hosted platform to make the first four items possible.

## 6. Non-Goals

- Revalidating Made Well, inventing a smaller kernel, or turning the established process into a trial.
- Performing users' software, marketing, sales, or other business work on their behalf.
- Starting agents, running scripts, changing files, deploying, or contacting external systems merely because a component is selected or a to-do is promoted.
- Requiring a repository, `.madewell/`, a provider account, Rivet, or a specific agent harness for the grammar itself.
- A new skill syntax, an automatic arbitrary-code plugin installer, a marketplace, automatic updates, or a package manager dependency solver.
- Arbitrary workflow graphs or a replacement execution scheduler.
- A universal numeric effort scale, universal model-to-effort mapping, or new fixed counts.
- Redesigning all existing UI, migrating live stores, replacing installed runtimes, or enabling a public endpoint under this implementation handoff alone.
- Treating JSON shape validity, model completion, receipt hashes, or a successful process exit as proof of achieved business outcomes.

## 7. Requirements

### R1 — Preserve the grammar and allow independent use

- Ship the full outer default and the nested delivery default as data-backed compositions, not enforced stage enums.
- Preserve the existing default discovery methods: `Declare()`, `lookFirst()`, `classify()`, `Lenses()`, `oneThing()`, `route()`, `confirm()`.
- A selected component can contain other components, be replaced by a compatible composition, or be used alone.
- Added components require no central edit to a list of permissible business-stage names.
- Standalone brainstorm returns its own result. It must not create fake candidates, require delivery conditions, or imply that the user committed to follow-on work.
- Use the approved [Brainstorm seed](../brainstorm/README.md); landing content remains unresolved under §18 U2. Neither component may be an empty successful placeholder.

### R2 — Use ordinary skills, not a forked standard

A method is a standard Agent Skills directory:

```text
customer-interviews/
  SKILL.md
  references/
  assets/
  scripts/              # optional; presence does not authorize execution
```

- Preserve standard frontmatter and instruction bytes. Do not require Made Well-only frontmatter for ordinary skills.
- A skill remains usable outside Made Well. Made Well-specific composition and input/output binding live in the binding configuration and handoff envelope.
- Support a documented Made Well authoring profile: explain purpose, inputs, expected result, uncertainties, and handoff needs. This is guidance and compatibility checking, not a mandatory competing file format.
- A valid skill is not automatically compatible with every component. Validate the binding against that component's input/output and authority contract; show incompatibility rather than rewriting the skill or silently downgrading the contract.
- A skill asking for Markdown can return a Markdown artifact within the handoff envelope. Do not modify every upstream skill to make its natural output raw JSON.
- Loading instructions, granting a tool permission, and executing a script are distinct actions. `allowed-tools` or a script in a package does not grant Made Well execution authority.

### R3 — Optional repo-local configuration with deterministic layering

**Proposed initial convention:** `.madewell/config.json`, with optional skills below `.madewell/skills/`. Existing skills elsewhere in an explicitly granted project root may be referenced; duplication into this directory is not mandatory.

```text
project/
  .madewell/
    config.json
    skills/
      customer-interviews/
        SKILL.md
        references/interview-guide.md
```

Example binding configuration — **proposed Made Well schema, not an existing command or industry standard**:

```json
{
  "schemaVersion": 1,
  "bindings": {
    "/delivery/ideation": {
      "skill": "./skills/customer-interviews"
    }
  }
}
```

Rules:

1. No project configuration: use the explicitly versioned shipped defaults.
2. Load only explicitly selected shared configurations, then the project configuration, then explicit per-work overrides.
3. A higher layer changes only the addresses it names. Unmentioned defaults remain intact.
4. A method binding **replaces the method at that address**. It does not concatenate competing instruction bodies or replace the entire workflow.
5. Supporting constraints/references are separately declared additions. Conflicting constraints are errors, not last-writer-wins text.
6. Competing bindings from shared packs at the same precedence require an explicit higher-layer selection. Do not choose by filesystem order, alphabetical name, model guess, or installation time.
7. Keep method selection separate from replacing a component's children. A composition replacement is explicit and validated as a whole subtree.
8. Resolve relative package references against the configuration containing them, within explicitly granted roots. Never infer authority by crawling parent directories or following a repository's symlink outside those roots.
9. Existing work retains its resolved definitions and bytes. Editing project files changes newly created work, not accepted or in-flight handoffs.
10. Users can inspect the effective composition and the origin of every binding before applying it.

### R4 — Local files must cross an explicit delivery boundary

An MCP server does not gain access to a user's filesystem because a client connects.

- **Recommended first implementation:** a host-local MCP process using an explicitly supplied project root. It can read approved local `.madewell/` configuration and skill directories without an upload service. This is packaging/transport, not a requirement that the product use one particular assistant.
- **If the MCP service is remote:** a host integration must read and explicitly provide the selected configuration/package manifest and approved files, or the user must explicitly import a package. A path string from the user's machine is not usable server-side.
- Supply only selected package material and needed work context, not the entire repository. Do not upload credentials, unrelated files, or a whole hidden configuration directory.
- Do not pretend MCP's Skills extension supplies local-to-server file synchronization. It defines server-side skill discovery and retrieval; any upload/binding bridge is a separate application feature.
- Read supporting content on demand; do not load every installed skill into every model prompt. Pin and verify the material actually used.
- If the client cannot supply local files, state that capability gap. Do not silently fall back to service defaults after an explicit local override failed.

### R5 — Carry context rather than making the person carry it

Each prepared handoff must resolve the selected method, exact applicable source, scoped prior results, decisions, unresolved questions, requirements, effort, and expected output.

- Preserve the original input, including whitespace and Unicode. Summaries are labeled secondary views.
- Retain stable identities for intentions, conditions, candidates, answers, output artifacts, and component occurrences.
- Preserve Ground/Rumen/preparation obligations where selected; do not turn their records into claims of checks that never ran.
- Expose retrievable exact material for abbreviated views. No recipient should have to ask the user to paste material already retained and authorized for that recipient.
- Never send private sibling outputs, unrelated work, or hidden authorizations to a method merely to make its prompt “complete.”
- Persist preparation and its input identity before returning the handoff; persist a submitted result and the next-state decision atomically.

### R6 — Separate to-do selection from execution

- Generated candidates are possibilities, not accepted commitments.
- Promotion requires an explicit nonempty selection, current revision/selection identity, an accountable actor, and sufficient next-step context.
- Show prerequisite consequences before commitment. For the new portable API, promote exactly the selected IDs; do not implicitly promote prerequisites or interpret an empty array as “all.” Unselected prerequisites remain visible and can block readiness.
- Record promotion and its receipt in the existing Store. Return an external task/handoff, not a queued worker invocation.
- Installation defaults containing an executable delivery pack must not override this non-executing entrypoint.
- Existing execution integrations remain explicit compatibility surfaces. Do not silently rewrite historical tasks or activate an execution adapter through new MCP calls.

### R7 — Distinguish effort, method, reasoning, and authority

- Cartridges may declare effort choices affecting investigation depth, elaboration, or selected children. Persist the effective choice and expansion.
- Do not invent a universal preset ladder. A cartridge without effort variants stays as defined.
- A caller's model reasoning setting is separate; no silent mapping from “more effort” to a particular model, provider, price, or token count.
- Greater effort never grants extra permissions, adds mandatory approvals, or makes a stronger completion claim.

### R8 — Discoverable interfaces and honest evidence

- Use a small stable set of operations; do not create a server, agent, tool, or compulsory approval for every named component.
- Reads do not initialize storage, load workers, fetch arbitrary external files, or change work state.
- Distinguish: method output recorded; shape/contract accepted; task selected; work externally reported complete; independently verified outcome. One does not imply another.
- Reorientation answers what this work is, what is done, what remains, who owns the next action, and whether the user must intervene. “No intervention needed” does not imply work is running.
- Observe existing DX/UX/AX guidance for implementation decisions. Do not hard-code its matrices as unreplaceable universal cartridge structure or claim predicted benefits are measurements.

## 8. Constraints

- Preserve TypeScript/Effect conventions, erasable syntax, existing Store services, and structured `MadeWellError` errors. `package.json` currently requires Node `>=24.15`; verify the cloud environment against the repository version actually used.
- Source facts are anchored to the baseline, not to an installed environment. Re-read touched modules and changed history before work.
- No live-store inspection, migration, secret use, installation, service restart, or deployment is authorized by this plan. Use disposable fixtures. Runtime activation requires its own explicit target and authority.
- Preserve legacy records and existing pinned contracts. A new portable composition contract needs an explicit version and compatibility mapping; do not relabel historical execution-2 data.
- Do not cap the number of business stages, skills, work records, or history to simplify implementation. Detect cycles and unavailable resources; use transport pagination and explicit machine/resource protections without silent data loss.
- Treat skill content and repository files as untrusted data. Validate paths, manifests, references, and outputs; do not execute embedded commands while loading, listing, resolving, or promoting.
- For local MCP, restrict the process to explicit roots and capabilities. Host identity strings and request-provided actor labels are not authenticated remote identities.
- For any later remote service, authenticate and authorize each object/resource before access. Browser Host/Origin/CSRF checks alone are not remote authorization. Do not publish raw traces or private skill uploads globally.
- Repo policy separates makers from independent verification. Makers do not award their own acceptance. The designated independent verification owner executes the affected checks. Do not run the whole suite as a default.
- A public source push is not an installation or a product release. Do not publish new packages or choose a product license on Josh's behalf.

## 9. Dependencies

| Dependency | Required for | Resolution / owner |
|---|---|---|
| Current checkout and history | All work | Cloud lead confirms the documentation commit and compares later source changes with the baseline. |
| Shared composition, binding, packet, receipt, promotion contracts | Parallel implementation | Cloud lead freezes §15's proposed contracts into reviewed implementation schemas before conflicting work starts. |
| Approved default method content | Claiming faithful full-default delivery | Brainstorm seed supplied in `brainstorm/`; W2 preserves it and inventories missing landing content under U2. |
| Actual client, transport, SDK capability | Native MCP/Skills interoperability | W0 resolves from the assigned cloud environment or records U1. No assumed provider compatibility. |
| Readable, explicitly granted skill material | Repo-local overrides | W2/W4 implement local loading or an explicit package-input bridge. Missing access is a visible error. |
| Independent verifier | Acceptance | Cloud lead assigns a different reviewer/check owner before implementation is accepted. |
| Remote identity, hosting, privacy policy | Hosted production service only | U3; not a dependency of local plumbing. |

No dependency on an existing personal work engine, agent session, machine name, private research directory, or provider account is permitted in the product or this handoff.

## 10. Assumptions

These are proposed implementation choices, not hidden facts:

- **A1:** Extend this repository rather than create a greenfield product. Existing storage and recovery are worth preserving.
- **A2:** Ordinary skills plus external bindings give better portability than a proprietary skill schema. Format validity and operational compatibility remain separate.
- **A3:** `.madewell/config.json` is the recommended first convention; the exact name is not an operator-set requirement. Keep it documented and versioned once selected.
- **A4:** A host-local MCP adapter is the smallest initial mechanism for repo-local overrides without a remote upload/auth platform. If the selected first client is remote-only, resolve U1 before promising that experience.
- **A5:** Ordered recursive compositions and existing declared independence are sufficient. Do not add arbitrary graphs or nested concurrent execution merely because compositions nest.
- **A6:** Optional native extensions must not make ordinary tools/resources unusable on a supported client without those extensions.
- **A7:** Engineering decisions within these boundaries are delegated to the cloud lead. Ask Josh only for unavailable, consequential information or reserved approval—not “which abstraction should I use?” or “shall I proceed?”

## 11. Ambiguities / Risks

| Risk | Consequence | Required mitigation |
|---|---|---|
| Treating layering as concatenated prompts | Contradictory methods and unpredictable authority | Deterministic binding replacement; separate constraints; explicit conflicts. |
| Treating a skill name as identity | Same-name local/default/remote skill silently replaces another | Bind origin, immutable package identity, and content digest; record selection. |
| Treating valid Agent Skills as complete Made Well contracts | Missing outputs, unsafe tool use, or unusable successors | Validate the binding and handoff contract; preserve the skill itself. |
| Remote service cannot read local files | Defaults silently win or the person resumes copy/paste | Explicit local bridge/package transfer and capability diagnostics. |
| Importing execution-2 wholesale | “Promote” launches work or ordinary methods require a runner | Non-executing service entrypoints and negative side-effect tests. |
| Losing intent/conservation checks while removing job-name coupling | Renamed methods bypass important guarantees | Select validators through explicit contract identity and retain negative controls. |
| Recursive composition mistaken for recursive authority | Nested skills gain permissions or private outputs | Each binding and handoff retains its own declared scope; composition is not consent. |
| Editing a local skill mid-work | Successor sees different instructions under the same label | Pin bytes/manifests; boundary update is explicit; retain old evidence. |
| Preview truncation mistaken for full context | Inputs disappear between tools | Separate concise views from complete retrievable handoffs. |
| Provider or host claims mistaken for demonstrated compatibility | False “works everywhere” release claim | Record exact client/SDK/version/transport and actual exercised capabilities. |
| API accepts a fabricated `userApproved: true` | Model text becomes authority | Authorization comes from configured host/service policy and real user interaction, not a body flag. |
| Cleanup deletes referenced skills or history | Reorientation and retry become impossible | Preserve pinned material; prune only unreferenced owned artifacts under the existing retention policy. |

Do not silently resolve product-content or release-authority unknowns. See §18 for their exact scope; continue independent work while a gated slice is blocked.

## 12. Workstream Decomposition

### W0 — Reconcile baseline and freeze the implementation contract

- **Owner:** Cloud lead.
- **Inputs:** This document, `AGENTS.md`, governing `FOUNDATION.md`, current source and git history.
- **Actions:**
  1. Record actual revision, environment, branch/worktree, and initial uncommitted changes. Do not overwrite unrelated work.
  2. Inspect the sources in §3 and any changes since the baseline.
  3. Record which recommendations are being adopted, including directory convention, schema identity, compatibility boundary, and first MCP transport/client.
  4. Resolve U1 from available environment/documentation where possible; inventory U2 without inventing method content.
  5. Freeze shared schemas and examples from §15, explicitly marking new symbols/files as new. Assign one owner per shared file.
  6. Give the verifier the acceptance criteria before implementation. Keep implementation and independent acceptance separate.
- **Output:** Reviewed contract/schema examples, ownership map, baseline evidence, and exact remaining release gates in the existing work record.
- **Done when:** No implementer has to choose a conflicting shared contract. Unknowns are owned and bounded rather than hidden.
- **Do not:** Redesign the grammar or turn this into an open-ended architecture study.

### W1 — Generalize composition and binding resolution

- **Owner:** Composition implementer.
- **Primary files:** `src/jump-packs.ts`, `src/lane.ts`, `src/readiness.ts`, `src/pack-selection.ts`; new narrowly scoped composition module only if needed.
- **Actions:**
  1. Represent selected components and nested children without fixed universal business-stage lists.
  2. Separate method definitions from occurrence identities so the same skill can appear at multiple addresses without collision.
  3. Implement deterministic layering, explicit subtree replacement, constraint conflict detection, cycle detection, and effective provenance.
  4. Preserve legacy execution-2 decoding/validation as an adapter, including its actual concurrency limitations. Do not remove its nested-parallel guard to claim general recursion.
  5. Make discovery contribution validation selectable by declared contract identity, not by method display name. Coordinate its narrow integration change with W3.
  6. Snapshot effective composition, skill identities, and effort expansion. Preserve attempted/accepted prefixes on updates.
- **Output:** Resolver/validator, canonical effective representation, compatibility adapter, diagnostic examples.
- **Done when:** AC01–AC06, AC12, and AC26 are independently exercised; existing relevant contracts remain readable.
- **Do not:** Add a scheduler, provider settings, or automatic plugin execution.

### W2 — Package ordinary skills and bind the defaults

- **Owner:** Skill/package implementer.
- **Primary files:** New skill-loading/binding module; selected product assets under `skills/`; default-definition portions of `src/grammar.ts` and `src/autonomy-pack.ts`; relevant examples.
- **Actions:**
  1. Load standard `SKILL.md` packages and preserve frontmatter, instruction bytes, supporting-file relationships, and license notices.
  2. Implement the optional `.madewell/config.json` convention and explicit shared-config imports against W1's contract.
  3. Read only approved roots; refuse escaping references, symlinks crossing grants, missing files, corrupt manifests, and conflicting package identity.
  4. Reuse the existing default discovery/delivery content and the approved `brainstorm/` seed, preserving free Light as the default and the explicit paid-effort boundary. Inventory missing landing content under U2; never ship successful no-op substitutes.
  5. Supply a minimal author example showing an ordinary skill used outside Made Well and bound inside it, plus a composite pack that references methods without embedding a proprietary skill dialect.
  6. Add capability diagnostics for skill scripts/tools that the selected host cannot support. Loading does not execute them.
  7. Prepare the product asset allowlist for W5's packaging changes; do not ship all vendor/example files indiscriminately.
- **Output:** Loader, manifest/provenance handling, default bindings, author example, content inventory.
- **Done when:** AC04–AC07, AC13, and AC20 pass; any U2-dependent default is explicitly unresolved rather than mislabeled complete.
- **Do not:** Rewrite the 17 thinking skills, invent personal defaults, or build a marketplace.

### W3 — Add non-executing handoffs and explicit promotion

- **Owner:** Handoff/persistence implementer.
- **Primary files:** `src/functions.ts`, `src/ledger.ts`, `src/store.ts`, `src/engine.ts`, `src/organs.ts`, `src/nq-obligations.ts`, `src/context-facts.ts`; one shared service module if extraction is needed.
- **Actions:**
  1. Factor packet preparation and result validation from execution so a host can prepare/record without importing or calling `Worker`, launching commands, or waking the runner.
  2. Preserve exact input, scoped outputs, reusable answers, declared context, preparation, and required evidence.
  3. Add durable handoff identity and state using the existing Store. Distinguish it from legacy runner invocations; no competing store or implicit execution mode.
  4. Use existing transaction/request/revision mechanisms for prepare, record, composition update, and promotion. Preserve exact retry identity and rejected drafts.
  5. Make portable promotion explicit, keyed, revision-aware, and selection-only. Keep prerequisites visible; return external work even when installation delivery defaults exist.
  6. Record schema/contract acceptance separately from verification and business completion. Keep legacy completion protections intact.
  7. Make restart return the same prepared material/accepted receipt or a factual conflict/uncertainty state; never authorize re-execution implicitly.
- **Output:** Transport-independent services, recovery semantics, exact packet/read projection, safe promotion boundary.
- **Done when:** AC08–AC12 and AC14–AC18 pass against real disposable storage/restarts.
- **Do not:** Expose raw Store mutation, change live data, or collapse uncertainty into success.

### W4 — Expose the services through MCP and the selected host integration

- **Owner:** Interface implementer.
- **Primary files:** New MCP adapter/entrypoint; narrow `src/api.ts`/`src/cli.ts` integration if needed; dependencies owned by this stream after W0's compatibility decision.
- **Actions:**
  1. Select and pin an SDK/protocol combination from actual maintained documentation and client support. Do not infer support from the optional lockfile peer dependency.
  2. Implement the stable operations in §15 over W3 services; no shell/CLI passthrough, direct SQL, or Worker calls.
  3. Serve scoped resources for complete handoffs, exact source, manifests, and required supporting files. Keep summaries separate.
  4. Support the recommended local process with an explicit root and one documented host configuration. Product behavior must not depend on which model the host uses.
  5. Define the package-input boundary for a remote caller without claiming that passing a local path uploads files. Implement remote ingestion only if U1 selects that authorized scope and U3 is resolved.
  6. Add native Skills discovery/loading support only for the documented supported capability; retain tools/resources fallback without claiming fallback resource reading equals native activation.
  7. If Events are included, derive scoped occurrences from the same committed record and provide honest cursor/replay gaps. Events never authorize promotion or execution. Webhooks are not part of the first increment.
- **Output:** Adapter, supported capability matrix, host setup instructions, real protocol round-trip evidence.
- **Done when:** AC19 and AC21–AC24 pass for the claimed transport/features. Unsupported hosts/extensions remain explicitly unclaimed.
- **Do not:** Expose a remote network service, claim all-client compatibility, or create one tool/server per component.

### W5 — Make the result discoverable and distributable

- **Owner:** Integration/documentation implementer; cloud lead owns final conflict resolution.
- **Primary files:** `README.md`, `OPERATIONS.md`, `AGENTS.md`, `CLAUDE.md`, `package.json` distribution fields, relevant views in `src/console.ts`/`src/grammar-page.ts`/`src/jump-pack-page.ts`; generated artifacts only through the approved build.
- **Actions:**
  1. Document “use defaults,” “bring a skill,” “bind/replace a method,” “use one component,” “resume,” and “promote selected to-dos” as distinct flows.
  2. Distinguish portable behavior from optional legacy execution. Remove stale current guidance affected by this change; preserve historical records as historical.
  3. Surface effective method origins, selected composition, owned next action, missing material, and explicit promotion in existing views. Do not redesign the entire app.
  4. Include exactly the necessary runtime/skill assets in the packed distribution. Retain third-party licenses and exclude private examples, credentials, and accidental development files.
  5. Have the verifier run a packed-install check from an unrelated directory, including relative supporting-file resolution and no source-checkout dependency.
- **Output:** Working user/author/operator instructions, minimal view changes, reproducible package contents.
- **Done when:** AC07, AC13, AC20, and AC25 pass; current docs agree with observed behavior.
- **Do not:** Publish a package or activate an installed runtime without separate authorization.

### W6 — Independently verify and assemble the handoff back

- **Owner:** Independent verification lead, not an implementer accepting its own changes. Keep the test-design maker separate from the non-maker check executor under repository policy; the cloud lead can own check execution if it is not a maker.
- **Inputs:** Fixed contracts and acceptance criteria, candidate revision/artifact, allowed disposable environments, scoped test map.
- **Actions:**
  1. Have the independent test-design owner author assertions for every applicable AC before accepting implementation claims; the designated non-maker executor runs them.
  2. Exercise real Store transactions, concurrency/restart boundaries, filesystem resolution, packed assets, and the actual protocol transport. Use scripted method results only where testing plumbing.
  3. Run the directly affected tests and relevant typecheck/build, not the whole suite by default.
  4. Exercise the exact target host for any native-host claim; a handcrafted client speaking to the server is not proof of that host's skill activation.
  5. Report PASS/FAIL/N/A/UNKNOWN with evidence. Return failures to their owner; keep unknown release gates visible.
  6. Verify cleanup, documentation, changed-file scope, and repository delivery authority.
- **Output:** Acceptance matrix, commands/results, compatibility evidence, remaining gates, and an actionable final report.
- **Done when:** Every claimed increment has independent evidence and no omitted completion-critical gap.
- **Do not:** Convert an incomplete method-content inventory or unsupported client into a green result.

## 13. Parallel vs Sequential Execution

```text
W0: baseline, contracts, ownership, verification design
  ├─ W1: composition/resolution
  ├─ W2: skill package loading/content inventory
  └─ W6: independent tests and negative controls

W1 + W2 shared types accepted
  └─ W3: durable non-executing handoffs/promotion
       └─ W4: MCP/host integration

W1/W2/W3/W4 behavior stable
  └─ W5: integration, package, current docs
       └─ W6: candidate acceptance and final evidence
```

- W2 may inventory content and build loader fixtures while W1 works, but must not invent incompatible shared types.
- W4 may investigate actual client/SDK compatibility during W0–W3; it must not independently implement another lifecycle.
- W5 can prepare documentation outlines early; final instructions must follow exercised behavior.
- `src/lane.ts`/`src/readiness.ts` belong to W1; `src/functions.ts`/`src/store.ts`/`src/engine.ts` belong to W3. Shared changes are handed to their owner, not edited concurrently.
- W4 owns dependency changes in `package.json`/lockfile; W5 supplies its distribution-file patch for serialized integration. One integrator applies both.
- The lead may assign multiple streams to one implementer to reduce coordination. These are responsibility boundaries, not mandatory agent counts.
- Reviewed unit-ready contracts and outputs unlock successor work; integrated acceptance criteria close in W6. A stream's reference to a shared acceptance criterion does not require a downstream stream to finish before that stream can hand off its usable output.
- Unknowns block only the dependent slice. Do not idle unrelated work or quietly report the whole product done.

## 14. Agent Responsibilities

### Cloud lead

- Own the outcome, baseline reconciliation, shared contracts, integration order, unknowns, and final report.
- Preserve this document's product boundary in every child assignment.
- Supply each child: sender, receiver, workstream, full relevant contract, owned files, inputs, expected output, acceptance owner, and reply route.
- Settle ordinary technical choices through existing conventions and DX/UX/AX tradeoffs. Do not send delegated judgment back to Josh as an unnecessary interview.
- Use the actual available communication system. Do not require a particular work engine in order to execute this plan.

### Implementers

- Work within assigned files and accepted contracts; raise a concrete contract defect to the lead before changing another stream's assumptions.
- Preserve unrelated work. Do not create competing task records or claim another stream's completion.
- Return changes, exact behavioral deltas, assumptions, and unverified boundaries. Never claim test or installation success from a model narrative.
- Follow repository maker/verification restrictions. Do not commit, push, publish, or deploy merely because this document describes eventual delivery.

### Independent verifier

- Own acceptance evidence separately from implementation.
- Check failure behavior and negative controls, not just happy-path examples.
- Distinguish accepted source, packed distribution, target-host interoperability, and installed/live activation.

### Josh

- Supplies only reserved approvals and genuinely unavailable product/deployment information identified in §18.
- Is not responsible for routine tool selection, code navigation, test debugging, or orchestration of the implementers.

For questions, reuse recorded answers and source context first. A genuine issue goes to the assigning lead with the affected requirement and proposed resolution. Do not force ceremonial clarification rounds when the contract is already understood.

## 15. Input / Output Contracts

The following are **recommended implementation contracts**, not claims that these wire fields or methods already exist. W0 turns them into one versioned schema definition reused by all adapters. Do not maintain independent CLI, HTTP, and MCP interpretations.

### 15.1 Configuration and composition

Recommended configuration v1 contains:

| Field | Meaning |
|---|---|
| `schemaVersion` | Explicit binding/configuration schema version. Reject unsupported versions. |
| `uses` | Optional explicit shared configuration references. No implicit network fetch; same-level conflicts require a higher-layer selection. |
| `bindings` | Map from component occurrence address to a method selection. Each selection identifies an ordinary skill directory/resource and optional binding arguments. |
| `composition` | Optional explicit replacement composition tree. Omission uses the shipped default; an explicitly selected subtree may be used alone. |

A component definition supplies a stable local identity, purpose, input contract, output contract, and either a method binding or ordered child components with explicit input/output bindings. Compatible existing independent-track metadata may be retained without promising new concurrent execution.

- The address identifies an **occurrence**, not merely a skill name. `/delivery/ideation` is an illustrative address in the default tree, not a hard-coded list of permitted addresses.
- Repeating the same skill at two addresses is valid; duplicate sibling occurrence IDs are not.
- Compound components preserve their declared external contract when their implementation is replaced by children.
- Cyclic component/configuration references are invalid. Shared reuse is not a cycle unless expansion returns to an ancestor.
- Do not claim general JSON Schema support while only checking a subset. Reuse the actual supported vocabulary or adopt a deliberate validator with explicit compatibility tests.

A resolved selection records: configuration schema version, selected root, complete effective component tree, method identities, origins/precedence, package manifest/content digests, declared contract identities, effective effort, and approved material references. This is the reproducible input to work; current global defaults must not be reread to reconstruct old selections.

### 15.2 Skill package boundary

- A package is an ordinary skill directory, not a generated JSON replacement for `SKILL.md`.
- Its manifest identifies each file by normalized relative path/resource URI, byte size, and SHA-256. Retain frontmatter unchanged.
- Local identity includes the approved origin plus content identity; remote native-skill identity additionally retains the originating server and URI. Names alone are never enough.
- Pin manifest/content used by work. When a selected file changes, use an explicit new selection or return a stale-content error; do not silently accept new bytes under an old digest.
- Resolve supporting references within the approved package scope. A reference to another skill does not silently activate that skill or inherit its permissions.
- Uploading/importing a package, if later supported, does not publish it to other users or authorize its code. Tenant privacy and retention belong to the separately authorized hosted design.

### 15.3 Work and handoff boundary

| Operation | Required input | Returned result / invariant |
|---|---|---|
| Inspect catalog/composition | Optional explicit selectors and authorized scope | Available methods/contracts and effective bindings, with origins and diagnostics. Read-only. |
| Capture material | Request identity, exact source, intended outcome when supplied, explicit selected root/configuration | Durable work handle and revision, pinned selection, next useful preparation. No worker launch. Rough input need not contain a finished specification. |
| Prepare handoff | Work handle, expected revision, component occurrence, request identity | Saved handoff identity, method/content identity, exact authorized inputs/references, earlier answers/results, requirements, uncertainty, effort, output contract, and next action. No inference or script execution. |
| Record method result | Work/revision/request/handoff identities, exact returned artifact, cited sources/decisions/unknowns, accountable reporting actor | Atomic receipt, retained result, explicit validation status, and eligible next handoff(s). No business-completion claim solely from schema validity. |
| Replace future binding/composition | Work/revision/request identities, explicit replacement, reason | Validated new future selection or conflict identifying frozen attempts/accepted material. Historical evidence remains. |
| Preview promotion | Work/candidate identities and current revisions | Exact selected set, dependencies, missing inputs, and commitment consequences. Read-only. |
| Promote selected candidates | Request identity, expected selection/item revisions, explicit nonempty IDs, accountable actor/authorized action | Durable externally owned tasks and receipt. No default “all,” implicit prerequisite promotion, runner wake, command execution, or provider call. |
| Inspect/reorient | Work handle and scoped cursor/detail selector where applicable | Concise current state plus complete retrievable authorized evidence. Unknown/stopped/incomplete remain distinguishable. |

Recommended MCP mapping: stable tools for capture, inspect, prepare, record, replace, preview-promotion, and promote; resources for catalog, exact source, packets, manifests, supporting files, and retained results. Exact public names are frozen in W0 and documented once. Do not implement a generic “run arbitrary command” tool or connection-dependent tool catalogs.

A handoff packet must distinguish:

1. User-authored source and requirements.
2. Selected skill instructions and their origin.
3. Observed facts and source references.
4. Prior decisions and their owners.
5. Assumptions and unresolved questions.
6. Authorized capabilities and explicit prohibitions.
7. Expected result and successor needs.

The wrapper supplies Made Well context and result framing without silently rewriting the skill. Prompt text alone is not an authority boundary; services enforce allowed transitions and material scope.

### 15.4 Retry, revision, and error behavior

- Reuse the existing canonical request fingerprint mechanism. A logical request ID reused with the same validated action/body returns its original receipt, including after restart. Reuse with changed input is an explicit conflict.
- Transport request identity is not necessarily the same as logical mutation identity. Preserve the latter through reconnects and protocol-specific retries.
- Stale work, changed source, changed selection, unsupported contracts, unavailable material, invalid output, denied authority, and uncertain prior effects have distinct factual diagnostics.
- Return the relevant current revision/record and a safe recovery action. Preserve the rejected draft; never silently regenerate it or choose a new request ID after an uncertain response.
- A malformed result can be retained as refused evidence without advancing the composition. Corrected submission is a distinct deliberate operation, not overwriting a previously accepted result.
- Preparing/recording a method does not imply that external code or business work ran. Actual external effects remain the responsibility of an explicitly chosen host/integration.

### 15.5 Native MCP capability boundaries

- Pin and test the supported protocol revision. For 2026-07-28, follow that revision's `server/discover` and required request metadata; do not graft an older initialize-only implementation onto it and advertise equivalence.
- Ordinary resources/tools remain a useful supported interface. Native Skills is additional host behavior, not a synonym for reading a resource.
- If advertising Skills, implement `skills/list`, `skills/get`, and `resources/read`, complete manifests, direct URI lookup, appropriate cache scope, and unchanged frontmatter. Follow actual host approval/origin rules; do not prefetch every supporting file into context.
- Events, if included, are scoped occurrences from committed state. Reconnect/deduplication and history gaps must be explicit. They do not trigger work or change authority.
- No native MCP Tasks extension is needed for short prepare/record/inspect calls. A protocol Task is not a Made Well task. Do not add asynchronous-job machinery simply because the extension exists.

## 16. Acceptance Criteria

These are assertions to implement and independently verify, **not results already obtained**.

| ID | Observable acceptance condition |
|---|---|
| AC01 | The default outer tree and nested delivery tree match §1; existing default discovery methods remain available with their intended contracts. |
| AC02 | Brainstorm alone uses the approved seed and can return its own method result without fake discovery candidates, mandatory delivery, or execution. Free Light is the default; explicit deeper selections follow the supplementary effort/access contract. |
| AC03 | Replace a leaf with a compatible nested composition and add an extra component at a nested address without modifying a central business-stage allowlist. Repeated use of one skill has separate occurrence identities. |
| AC04 | With no local configuration, resolved defaults are deterministic. A project binding changes only its addressed method; unchanged branches remain byte/identity equivalent. |
| AC05 | Same-precedence competing methods and contradictory constraints produce explicit diagnostics; reordered filesystem entries do not change the result. |
| AC06 | Cycles, invalid addresses, unsupported schema features, and incompatible child contracts are refused before a handoff is prepared. Legacy nested-parallel execution remains honestly unsupported. |
| AC07 | An unmodified standard skill with supporting files works as a Made Well-bound method and remains a valid ordinary skill. Loading/listing/validation executes none of its scripts. |
| AC08 | An exact-source fixture containing Unicode, CRLF, and meaningful spacing survives capture, prepare, record, restart, and the next authorized handoff without manual re-pasting or silent normalization. |
| AC09 | Relevant saved answers and decisions reach successors with identity/provenance; a repeat question can resolve from retained evidence. Unrelated/private sibling material does not appear. |
| AC10 | Renaming a method occurrence does not disable its declared discovery contract; naming an unrelated method `declare` does not impose that contract by accident. Existing conservation negative controls still refuse dropped requirements. |
| AC11 | A repeated logical mutation returns the saved receipt without duplicate records; changed-body reuse conflicts; concurrent stale updates do not overwrite accepted work or blockers. |
| AC12 | Updating local files does not alter pinned work. An explicit compatible future replacement succeeds; changes affecting attempted/accepted inputs are refused or explicitly invalidated without erasing history. |
| AC13 | From an unrelated directory, the packed product resolves its shipped defaults and declared skill assets without the source checkout, personal paths, or missing licenses. |
| AC14 | Promotion requires explicit nonempty IDs and current revisions. Unselected candidates/prerequisites stay unselected; dependency consequences remain visible. |
| AC15 | Promotion produces external tasks and makes zero Worker/provider/command/runner calls even when installation settings contain an executable delivery pack. |
| AC16 | Reading, listing, previewing, or reconnecting neither creates a store nor advances/promotes work. Relevant file/Store snapshots remain unchanged. |
| AC17 | A server/process restart between preparation, return, and acknowledgment preserves identity and returns a recoverable state. Saved accepted results are not requested again; uncertainty is not replay permission. |
| AC18 | Valid JSON or an assistant saying “verified” cannot become independent business acceptance. Recorded, contract-accepted, externally completed, and independently verified states are distinguishable. |
| AC19 | A real client process completes the supported MCP capture → prepare → record → inspect → preview/promote path and resumes after disconnection. The evidence names exact versions/transport. No provider call is made by Made Well. |
| AC20 | A new user/author can find instructions for defaults, repo-local bindings, standalone components, supporting files, conflicts, resumption, and promotion. Current docs contain no mandatory project registration or personal-infrastructure requirement. |
| AC21 | Explicit local overrides that are unreadable/unsupported fail visibly instead of falling back to defaults. Remote-only clients are not told a local path was read or uploaded when it was not. |
| AC22 | Path escape, symlink escape, changed digest, same-name origin collision, unauthorized work reference, and malicious skill instructions cannot gain file/data access or launch commands through the adapter. |
| AC23 | For every claimed native Skills host, actual activation/supporting-file/approval behavior is exercised. A tools/resources-only host remains usable without a false native-support claim. Otherwise this criterion is UNKNOWN for that host, not PASS. |
| AC24 | If Events ships, duplicate/reconnect/gap/private-scope cases are exercised and no event promotes or executes work. If not shipped, mark N/A with that exact boundary. |
| AC25 | Reorientation distinguishes task identity, completion gap, owner, actual current activity, and need for user intervention. Work not running is never described as in flight merely because it has no user question. |
| AC26 | A cartridge-declared effort change produces its declared depth/composition change and is pinned with the work; it does not silently change model reasoning settings, permissions, or completion guarantees. Cartridges without variants acquire no invented preset ladder. |

The porting examples across software, marketing, and sales check for **implementation coupling** only. They are not experiments to decide whether Josh's general grammar is valid.

## 17. Verification / Review Criteria

### Ownership and evidence

- The independent verification owner runs checks against the exact integrated candidate and records commands, exit status, assertion results, environment, and artifact revision/hash.
- Test writers may use repository fixtures to exercise deterministic handoff plumbing. They must not count scripted method output as evidence of real model reasoning, native host activation, or user-experience improvement.
- Negative controls must demonstrate that the protection under test actually rejects the bad case. A test file's existence or a model's “passed” narrative is insufficient.
- No runtime tests or product capability claims were established while authoring this plan.

### Directly relevant existing tests

| Changed surface | Starting test files; extend only as relevant |
|---|---|
| Composition and defaults | `test/jump-packs.test.ts`, `test/grammar.test.ts`, `test/discovery-contract.test.ts`, `test/discovery-organs.test.ts` |
| Handoffs and material scope | `test/ground-rumen.test.ts`, `test/packet-references.test.ts`, `test/nq-handoffs.test.ts`, `test/context-facts.test.ts`, `test/handoff-history.test.ts` |
| Durability, promotion, non-execution | `test/engine.test.ts`, `test/function-acceptance.test.ts`, `test/verification-integrity.test.ts`, `test/cli.test.ts`, `test/api.test.ts` |
| Presentation and complete context | `test/work-view.test.ts`, `test/ui-detail.test.ts`; browser tests only for changed interactions |
| Legacy compatibility / packed delivery | Relevant selections in `test/pipeline-delivery.test.ts`, `test/deletion-gates.test.ts`, and new focused packed-asset tests |
| New skill/MCP boundary | New focused loader, binding, transport, privacy, and host-integration tests; these files do not exist merely because this plan names the need. |

Example commands for the **designated non-maker check executor**, from the candidate checkout. Neither the implementation maker nor the test-design maker may treat this list as permission to run its own checks:

```sh
npm ci
npm run bundle
node --test test/jump-packs.test.ts test/grammar.test.ts test/discovery-contract.test.ts
node --test test/ground-rumen.test.ts test/packet-references.test.ts test/work-view.test.ts
npm run typecheck
npm pack --dry-run --json
```

Select only commands/tests covering the actual change; the list is not a required whole-package sweep. `npm test` currently expands to `test/*.test.ts` and has a `pretest` bundle hook, so do not use it as shorthand for a targeted run. Clear inherited `MW_*` values in the verifier's child environment and use unique disposable stores/roots. Never point these checks at a real installation.

- Build-generated tracked artifacts are generated, never hand-edited. Follow the fixed brief's authority for maker bundle generation and independent checks.
- The packed-install check must inspect and exercise actual package contents; `npm pack --dry-run` alone does not prove runtime assets load.
- Compatibility evidence must state client/host, SDK, protocol revision, transport, OS/runtime, native extensions exercised, and unsupported cases.
- Security evidence must cover the actual exposed surface. Remote auth/tenancy is N/A only if no remote surface ships; it cannot be waived for a remotely reachable service.
- Acceptance of implementation is not installed/live acceptance. Report any deployment-specific unknown separately.

## 18. Open Questions

Only the following unresolved inputs are known to affect fidelity or release scope. Resolve what inspection can resolve before asking Josh. Keep the exact markers until answered with a source.

### U1 — First client and delivery topology

[UNKNOWN — needs input: Which exact first user-facing MCP client/version and local-versus-hosted connection must the first release support?]

- **Owner:** Cloud lead with interface implementer.
- **Inspect first:** The actual assigned cloud environment and authorized client configuration; current SDK/host documentation.
- **Recommendation:** Implement the host-local process and tools/resources path first, with standard-skill bindings and portable services. This avoids claiming that a remote service can read a local repo.
- **Blocks:** Exact client-native acceptance and any promise of automatic repo-file access in a hosted client.
- **Does not block:** Composition, loading, handoff services, a real protocol client test, or explicit standard-skill compatibility.
- Do not ask Josh to choose an SDK or code abstraction. Ask only if the first supported user experience cannot be inferred from his actual target.

### U2 — Landing method content; Brainstorm seed supplied

[UNKNOWN — needs input: Where are Josh's canonical landing method instructions/supporting assets, and which are the intended shipped defaults?]

- **Owner:** Skill/package implementer through the cloud lead.
- **Resolved for Brainstorm:** Josh approved the toolbox and requested the [base jump-pack seed](../brainstorm/README.md) for the MCP product. Its skills, supporting files, effort profiles, and provenance are supplied. Use that selection; do not ask for Brainstorm content again or claim it is an implemented runtime.
- **Evidence for the remaining gap:** The earlier inspected default packs and jump slots implement discovery/delivery; this supplement supplies no landing method body.
- **Inspect first:** Authorized supplied materials, current repository history, and explicitly selected reusable skill packages. Do not infer absence outside that inspected scope.
- **Blocks:** Claiming faithful shipped landing behavior or complete full-default delivery.
- **Does not block:** Brainstorm integration, first-class component support, user-supplied skill bindings, existing discovery/delivery reuse, or contract tests with explicitly labeled fixtures.
- Do not turn “landing” into automatic deployment, cleanup, task completion, or publication based solely on its name. Do not reopen the settled existence/order of these components.

### U3 — Hosted deployment and private package custody

[UNKNOWN — needs input: If hosted MCP is required, what deployment target, identity/tenant boundary, authorized package-upload policy, and retention/deletion policy are approved?]

- **Owner:** Cloud lead; Josh retains deployment/privacy approvals.
- **Recommendation:** Keep this outside the first local implementation until it is explicitly required.
- **Blocks:** Remote production exposure and storage of users' private uploaded skills/work. No new paid service or credentials are implicitly authorized.
- **Does not block:** Local implementation or its source push.

### U4 — Distribution/release authority

[UNKNOWN — needs input: What package publication channel and Made Well distribution license are authorized for a public product release?]

- **Owner:** Cloud lead; Josh owns the release decision.
- **Evidence:** `package.json` is currently `private: true`; inspected tracked files contain a vendor license, not a root Made Well product license. This is not permission to select a new license or publish to npm.
- **Blocks:** New public package publication, not development, local packing, or the explicitly requested repository push.

**Tooling note, not a user question:** the local symbol-graph index was unavailable during plan authoring; code and git history were inspected directly. Test baseline and client interoperability remain unmeasured, not presumed passing.

## 19. Handoff Notes

### Start here

From the checkout assigned to you, use these read-only commands before implementation:

```sh
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --porcelain=v1
git log -12 --format='%h %ad %s' --date=short
git diff 79e648d442af840bfbb872c538c6eecbc626b74c -- src package.json package-lock.json test
```

Expected repository is `jcbbge/madewell`; SSH and HTTPS remote spellings are both valid. Do not reset the checkout to the old baseline. Read current code and reconcile later changes. The intended delivery branch is `main`, but the actual cloud assignment controls worktree and commit/push authority.

Read in this order:

1. `AGENTS.md` and `FOUNDATION.md`'s settled foundation/bedrock/current-contract sections.
2. This entire document, especially §§3, 7, 12, 15, 16, and 18.
3. [MCP-AND-SKILLS-RESEARCH.md](MCP-AND-SKILLS-RESEARCH.md), [DELEGATED-JUDGMENT.md](DELEGATED-JUDGMENT.md), and [REORIENTATION.md](REORIENTATION.md) for the packaged research and operator policies.
4. The modules and tests owned by your workstream.
5. `README.md` and `OPERATIONS.md` at repository root for existing implementation behavior; their labeled historical sections do not override the current foundation.

### Authority and reporting

- Josh explicitly authorized the author of this handoff to push these documentation changes to `jcbbge/madewell`. That does not automatically authorize a downstream maker to deploy, publish packages, or alter a live installation.
- Once assigned implementation, proceed within that assignment without asking whether to start each routine step. Resolve engineering judgment yourself; retain consequential unknowns and reserved approvals.
- Report back through the originating cloud-agent assignment. No private local path or personal work-engine access is necessary to understand or execute this plan.
- Each workstream report includes: done YES/NO, delivered behavior, changed files, independent evidence status, remaining gate/owner, and next action. A claim without its required evidence remains NO.
- Final report includes the integrated revision, accepted artifact, compatibility matrix, remaining unknowns, installation/publication status, and how to disable any optional integration actually enabled.
- Reap owned temporary files, processes, fixtures, worktrees, and branches when appropriate. Preserve user data, pinned package material, and retained evidence. Do not claim cleanup or live activation that was not observed.

### Document self-check

- The settled grammar, purpose, non-execution boundary, latest skills/dot-directory direction, concrete existing implementation, ownership, contracts, execution order, and verification obligations are explicit.
- A receiver can start W0 and execute the independent plumbing work without recovering this conversation or asking Josh for routine engineering choices.
- **Not all release information is available.** U1–U4 prevent an honest claim that the entire final user experience/public release can be completed without any further input. The affected slices and safe continuing work are identified; no plausible values have been invented to hide the gaps.
- This document recommends a delivery mechanism. It does not turn that recommendation into an operator-set decision or claim that the implementation already exists.

## 20. Clarification Check

Do you understand the intent and purpose: operationalize Made Well's established, recursively composable grammar, preserve standard-skill portability, and eliminate manual context transfer without becoming a workforce or requiring a particular runtime?

Are there questions that actually require clarification? Inspect the repository and supplied environment first; settle delegated engineering choices rather than sending them back to Josh.

What ambiguous details remain? U1–U4 identify the exact client/topology, missing landing method content, hosted privacy/deployment terms, and release authority. The Brainstorm supplement separately scopes the commercial launch decisions. Resolve or explicitly hold only the affected slice. Do not reopen the grammar, invent missing facts, or call an unverified boundary complete.
