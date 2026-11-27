# Made Well method library — remaining phase packs and shared guidance

**Mode: COORDINATED.** Ready to begin the ungated content work; not a claim that all release inputs are available.

**Assigned to:** the cloud lead receiving this dossier in an actual task assignment. **Report back to:** Josh through that originating assignment/conversation. The lead owns every child it delegates and names an independent acceptance owner before accepting work.

**This is the content companion to [v7/PLAN.md](../../v7/PLAN.md), chiefly W2, with explicit handoffs to W0/W1/W3/W4/W5/W6.** It does not replace that plan, authorize its entire implementation merely by being read, or create another orchestration system. A source-only assignment returns source/evidence; an integrated assignment additionally closes the applicable v7 criteria.

**Inspected baselines:** MadeWell `4edce7b2706a73f90adad5ba601fd2fea3730d93`; agent-core `9addbffae9d600f40dd334ad97bb24c6b0a0c7b7`. The accompanying analysis was inspected at those revisions. Reconcile later code before applying it; never reset a checkout to the baseline.

## Synthesis

- **Tasks:** reconcile contracts/ownership; extract shared guidance; package the seven Discovery methods; package the four Delivery methods; recover Landing content without inventing it; pin/package the sources and hand them to the existing integration streams; independently verify source and behavior.
- **Parallelism:** M0 freezes the shared boundaries first. M1, M2, M4 inventory and M6 test design can then proceed independently. M3 consumes M0's agreed task/handoff contract and M1 guidance; it need not wait for every Discovery file. M5 integrates accepted unit-ready outputs. Runtime ownership stays with the corresponding v7 streams.
- **Unknowns:** Landing's canonical content remains v7 U2. Exact native host support, hosted custody, publication/license and commercial launch decisions gate their dependent slices. Actual checkout/access/execution permissions come from the assigning environment, not from this document.

## Background & context

Made Well is Josh's established grammar for work, refined through two years of use. The problem is manual copying and reconstruction of methods, context and handoffs—not whether the grammar works. Preserve:

```text
work()
  brainstorm() → discovery() → delivery() → landing()

discovery() default methods
  Declare() → lookFirst() → classify() → Lenses() → oneThing() → route() → confirm()

delivery()
  ideation() → planning() → implementation() → verification()
```

Every component is independently usable, replaceable, extensible and recursively composable. These are defaults, not fixed engine counts or required agent calls. Delivery belongs to each selected task; do not create a new candidate for every phase merely to imitate the picture.

Ground and Rumen span the illustrated Delivery functions; they are not extra serial checkpoints. NQ governs agent-to-agent exchanges. Skills provide methods; tools provide capabilities; performers apply them under actual authority. Selecting a method, promoting a candidate, having a paid entitlement and authorizing execution are different actions.

The approved [Brainstorm seed](../../brainstorm/README.md) already supplies twenty ordinary skills and its effort recipes. Do not recreate or silently rewrite it. The other phases have substantial existing method material, but not the finished portable skill packages this assignment calls for. [ANALYSIS.md](ANALYSIS.md) contains the full ontology, phase contribution tables, tool inventory, skill candidates, effort proposals and implementation overlay. [ontology.json](ontology.json) is analysis/diagram data, not a runtime schema or a second work record.

### Read order

1. [AGENTS.md](../../AGENTS.md), [FOUNDATION.md](../../FOUNDATION.md), and the actual task assignment.
2. Complete [v7/PLAN.md](../../v7/PLAN.md), then [this dossier's README](README.md), [ANALYSIS.md](ANALYSIS.md), and this complete handoff.
3. [Brainstorm README](../../brainstorm/README.md), [HANDOFF.md](../../brainstorm/HANDOFF.md), [EFFORT-AND-ACCESS.md](../../brainstorm/EFFORT-AND-ACCESS.md), and its [provenance](../../brainstorm/PROVENANCE.json).
4. [Delegated judgment](../../v7/DELEGATED-JUDGMENT.md), [reorientation](../../v7/REORIENTATION.md), and the exact source files assigned below. Read actual selected skill bodies and their relevant references before adapting them; catalog descriptions alone are not a compatibility review.

The foundation outranks historical software-specific descriptions. The analysis distinguishes **settled**, **source-present**, **seed**, **proposed**, and **unknown**. Preserve those distinctions when turning recommendations into an implementation contract.

## Infrastructure, source custody and deployment rules

- Work in the assigned disposable checkout(s). Inspect revision, changes, environment and existing owners before writing. Preserve unrelated work. Do not call `mw discover`, `mw start`, `mw promote`, or a runner merely to author documentation/skills.
- No live-store edits, production changes, new paid service, credential creation, package publication, checkout/payment activation or installed-runtime changes are authorized by this dossier. Never print or commit secrets. Do not load a real `MW_HOME`/`MW_STORE` into checks; use explicitly isolated fixtures when needed.
- This task's instruction to publish **the dossier** is not inherited authority for downstream makers to commit, push or deploy implementations. Follow the actual assignment and repository maker/delivery policy. The designated integrator publishes only with explicit repository authority.
- **Canonical reusable skill bodies belong upstream in agent-core.** Existing upstream skills remain canonical there; never edit their MadeWell snapshot into a divergent fork. New generic portable methods should follow that same source-first pattern. MadeWell owns its component bindings, product catalog, integration contracts and deliberately refreshed snapshots.
- [agent-core-public](https://github.com/jcbbge/agent-core-public/tree/9addbffae9d600f40dd334ad97bb24c6b0a0c7b7) is public. Keep private environment details, operational paths, credentials and application internals out of it. Author portable instructions; keep MadeWell-specific schema/adaptation outside ordinary skill bodies. Do not copy application source into a publicly licensed skill merely because it supplied the behavioral requirements.
- M0 establishes whether an upstream checkout and write scope are assigned. If upstream publication is unavailable, return a clearly labeled proposed upstream patch from an authorized disposable checkout; do not call it merged or substitute a permanent second canonical source. If no upstream editing scope is assigned, hand the proposed change/contract to the lead for that scope rather than writing outside your assignment. Source investigation and contract design can continue; accepted/published upstream identity gates the final byte-pinned snapshot.
- Preserve per-package/vendor notices and provenance. The upstream skill license does not choose MadeWell's distribution license. A `.skill` archive, if useful for verification, is not a required new product format or permission to publish.
- The product must not require Rivet, a particular cloud platform, provider, harness or model. Use the actual assigned communication/execution facilities, not private machine commands copied from another environment.

### Communication card for each assignment

Before delegating, the lead records this card in the assigning platform's existing work record; each child does the same for its own children. Do not create a parallel filesystem task board.

| Field | Required value |
|---|---|
| **From** | Actual sender identity and working reply route. The sender answers the receiver's questions. |
| **To** | Actual receiver identity/run handle from the assigned platform; never an invented agent ID. |
| **Work** | Assigned M-unit, exact scope, source revisions, owned paths and applicable acceptance IDs. |
| **Authority** | Allowed checkouts, actions, data/tools, delegation and publication boundaries. |
| **Return owed** | Done YES/NO, tangible artifacts, evidence references, remaining gap/owner, NQ x of 3. |
| **Acceptance owner** | Named non-maker check executor and independently assigned test-design owner. |

NQ is not an excuse for a ritual questionnaire. Inspect supplied sources, reuse recorded answers, and make delegated engineering decisions. Three answered turns with genuine unresolved questions hold the affected assignment for a specification defect; do not reset the count or switch agents to evade it.

## Reuse / what already exists

| Treatment | Inspected source | Use here |
|---|---|---|
| **REUSE** | `src/grammar.ts`: `DISCOVERY_FUNCTIONS`, `GRAMMAR_PACK`; `src/autonomy-pack.ts`: `GENERAL_DISCOVERY`, `AUTONOMY_PACK` | Seven Discovery duties and four neutral Delivery duties. Displayed `confirm()` currently maps to job `discover`; do not turn that implementation alias into a universal skill identity. |
| **REUSE / PRESERVE** | `src/discovery-contract.ts`: contribution schemas and `validateDiscoveryContribution` | Intent/source/requirement/candidate/question/artifact/dependency identities and conservation. Valid references are not semantic truth. |
| **REUSE AS SOURCE** | `examples/jump-pack-lab/packs/{generic,software,marketing,sales,database}.json` | Generic outcome-preserving duties and domain-specific methods/constraints. Explicitly experimental, not finished ordinary skills. |
| **REUSE** | `src/organs.ts`: `organPacket`, `inspectPreparation`, `checkIncomingPreparation`; `src/rumen.ts` | Ground, Rumen kinds/evidence ownership and actual successor preparation. Do not equate cross-task preparation, a handoff, and environment setup. |
| **REUSE** | `src/acceptance-contract.ts`; `src/ledger.ts`: `Condition`, `Evidence`, `Completion` | Proof ownership, availability, current conditions, attributed completion. A candidate checker cannot prove its own future report or unavailable live state. |
| **REUSE** | `src/nq-obligations.ts`, `src/handoff-history.ts`, `src/context-facts.ts`; v7 policies | Saved questions/answers, aliases, explicit ancestry, privacy and reorientation. |
| **REUSE UNCHANGED** | `brainstorm/skills/`, `brainstorm/PROVENANCE.json`, notices | Approved seed, selected specialists, existing scenario definitions. A new full-library default load is not required. |
| **REVIEW BEFORE ADAPTING** | Canonical `delegate`, `prd`, `tenex`, `debugging`, `refactor`, `secure-build`, `security-audit`, `dev-browser`, `skill-review`, and other candidates named in ANALYSIS §9 | Relevant supporting methods, not automatic dependencies or proof of portability/behavior. |
| **REVIEW SELECTIVELY** | `skills/vendor/jakubkrehel/README.md` and selected skill bodies/notices | UI/accessibility/layout/writing methods, not universal phases or a mandate to ship the vendor tree. |
| **EXTEND THROUGH v7 OWNERS** | `src/jump-packs.ts`, `src/lane.ts`, `src/readiness.ts`, `src/pack-selection.ts`, `src/settings.ts` | Standard-skill binding and generalized composition; retain actual legacy execution constraints. |
| **EXTEND THROUGH v7 OWNERS** | `src/functions.ts`, `src/store.ts`, `src/engine.ts` | Non-executing prepare/record and explicit selection. Current `promote` can select all, add prerequisites and queue executable delivery; do not expose it unchanged. |
| **BUILD NEW CONTENT** | Ordinary default-method packages, their authored effort recipes, source mapping and behavioral cases | The missing portable method library. New content is not a new skill format. |
| **DO NOT REBUILD** | Work grammar, Store, receipts/revisions, conservation checks, answer history, private tracks, runner, scheduler or provider routing | This assignment supplies methods to existing/planned services; it does not hire a replacement workforce. |

The scoped baseline search found no first-party MCP/entitlement/billing implementation in `src/` and `package.json`. Reconcile with current code; do not infer absence elsewhere or start a second implementation if v7 work is already in flight.

## Deliverable locations and shared contract

The following **new locations/names are implementation recommendations**, not claims they exist. M0 freezes the actual map once, reusing an equivalent accepted v7 map if present.

| Deliverable | Location / owner |
|---|---|
| Generic method source | Assigned agent-core checkout, `primitives/skills/madewell-<method>/`. Use the `madewell-` prefix for new default methods unless an appropriate canonical identity already exists. |
| Work/Discovery/Delivery guides | Ordinary entry skills in that same upstream family; guides compose/select methods rather than duplicate their bodies. |
| Shared guidance | One canonical upstream owner per concern. Use ordinary skills when independently callable; otherwise relevant references. Do not force one new package per ontology noun. |
| MadeWell source snapshot/catalog | Proposed `skills/method-library/`, with selected unmodified package directories, catalog/binding references, `PROVENANCE.json` and applicable notices. Reuse an equivalent destination already selected by v7 W2/W5 instead of creating both. |
| Effort/method binding | The actual shared v7 selection contract, outside ordinary skill frontmatter. A design example must be labeled non-runnable until the corresponding resolver exists. |
| Scenario definitions | Each new/changed canonical skill's `evals/evals.json`, using the established local convention; new adapter tests belong with the affected runtime surface. |
| Execution evidence | The assigning work's existing evidence channel and approved retained artifacts; no second status ledger or fabricated pass file. |

No source maker edits `package.json`, loader/service files or shared defaults outside its owned assignment. M5 supplies its asset/catalog patch to the v7 integrator; v7 W5 owns distribution and W1/W3/W4 own their shared code.

### Every method must answer these questions

1. What purpose does it serve, and when should it be selected or skipped?
2. What actual source, prior decisions, constraints and unfinished material does it receive? Rough input is permitted where the component allows it.
3. What contribution does it produce, with source/identity preservation and honest uncertainty?
4. What does it explicitly **not** decide or authorize?
5. What useful handoff does the next selected consumer need? A terminal/standalone result need not invent a successor.
6. What changes with each authored effort choice, what stops the work, and what evidence shows the promised work was performed?

Preserve normal skill output—Markdown remains Markdown where appropriate. The host envelope provides work/occurrence/revision/request/source/method identity and validation framing; do not require proprietary JSON from every ordinary skill. Native loading, a resource read, and actual application of instructions remain distinct.

Standalone skills must retain their essential safety/intent/evidence boundaries without requiring the whole library or a running MadeWell service. Shared detailed guidance may be selected through the host; do not crawl sibling packages, silently activate missing skills or claim durable persistence the host does not provide. Keep supporting references package-relative and explicitly available.

### Effort and access

- Light is the free default for shipped base methods. Focused and Deep are paid **managed-workflow** options, not restrictions on possession or standalone use of public skills.
- Author phase-specific observable recipes. Use ANALYSIS §10 as a drafting direction, not already approved runnable definitions. If no meaningful difference is authored, do not offer a fictional deeper variant. Third-party methods acquire no invented ladder.
- Keep starting context, ambition, method, composition, effort, response length, provider reasoning, autonomy, work/data permission and commercial entitlement separate.
- Retain requested, authorized, effective and actually performed work distinctly. A paid label, long answer or claimed source count does not establish fulfillment.
- Light does not waive required evidence, correctness, privacy, safety, accessibility or recovery. Verification still owes every applicable condition at the rigor it actually requires.
- Additional implementation work is chosen while fixing the plan. A changed effort label does not reopen design or permit scope expansion during making.
- Trusted service authorization belongs to the existing Brainstorm/v7 integration owners. Missing paid access or capabilities must be explained with an explicit alternative, not silent upgrade/downgrade, billing or fabricated work.

### Unit-ready handoffs and acceptance scope

M01–M18 include content, behavioral and integration obligations. M0 records which portion each assignment actually owes and who owns the remaining portion. An independently reviewed source unit can feed a successor before runtime integration finishes; its source acceptance does not close behavioral or host criteria. Keep those criteria explicitly open until their real evidence exists. Do not turn a reference to a shared end-to-end case into a circular prerequisite for authoring its inputs.

## Task M0 — Reconcile the baseline and freeze ownership/contracts

**Owner:** cloud lead, coordinated with v7 W0/W2 and the independent verifier.

**Current state:** the analysis and approved Brainstorm seed exist; ordinary Discovery/Delivery method packages and their remaining effort recipes were not delivered by the inspected baseline. A later cloud run may already have supplied some of them.

**Purpose:** let each author work against one real method/binding/handoff contract without changing another stream's files or reconstructing the operator's intent.

**Gap / cause:** content and runtime contracts exist in different source forms. This is an extraction/integration gap, not evidence that the grammar is defective.

**Steps:**
1. From the assigned MadeWell checkout, run the read-only reconnaissance commands below; read current entrypoints and reconcile changes since the pin. Do not reset, stash away or overwrite someone else's work.
2. Establish actual upstream checkout/write scope, the canonical skill revision, the v7 integration owner and its current contracts. Verify whether any proposed destination or method already exists.
3. Freeze the method-to-component mapping, package paths, shared-guidance owners, supported contribution/envelope contract and effort representation in the existing work record. Preserve semantic identity independently of `discover`/`confirm` aliases.
4. Assign one writer per path, independent test design and a separate non-maker check executor. Fill actual communication cards before delegation.
5. Record remaining gated inputs and the exact commands/environment the verifier will use. Ordinary engineering choices are the lead's responsibility; do not ask Josh to name files or choose abstractions.

```sh
git rev-parse --show-toplevel
git rev-parse HEAD
git status --porcelain=v1
git diff 4edce7b2706a73f90adad5ba601fd2fea3730d93 -- src test package.json package-lock.json skills brainstorm v7
```

At the inspected baseline the diff is empty; later differences must be read, not treated as errors. If a shallow checkout lacks the baseline, obtain the needed authorized history or explicitly record the comparison gap—never substitute an empty comparison.

**Out of scope:** redesigning the grammar, selecting a new provider/account, defining commerce terms, claiming another stream's completion.

**Done when:** every authorized writer has real source/access, a nonconflicting owned path, fixed shared contracts, acceptance owner and return route; unresolved release slices have named owners. M01 is independently inspected and M02's expected composition examples are fixed. M02's behavioral/integration acceptance closes later; it does not block M0.

## Task M1 — Extract shared guidance and the Work entry

**Owner:** shared-content author; owns the Work guide and chosen shared-guidance source paths only.

**Current state:** Ground/Rumen/NQ/judgment/evidence/continuity material is present in FOUNDATION, organ/acceptance code and v7 policy documents, not one already accepted portable shared-method family.

**Purpose:** preserve common obligations across phases without divergent prompt copies or extra ceremonial stages.

**Gap / cause:** established guidance is embedded in implementation and operating documents; portable packaging and role-appropriate application remain to be authored.

**Steps:**
1. Extract the actual obligations: Ground; four Rumen kinds and evidence owners; recipient preparation/NQ; decision/rubric application; evidence design; reorientation/recovery.
2. Preserve the difference between operator intent, findings, assumptions, rules and authorized capabilities. Rules/fingerprints do not prove a check ran.
3. Make the Work entry orient from the actual starting point and chosen composition, carrying settled decisions and unfinished work. Do not build an agent router or require all phases.
4. Put necessary invariants in each consuming method; centralize detailed reusable guidance without mandatory whole-library loading or references that escape package grants.
5. Coordinate shared example/output obligations with M2/M3 and the verifier. Do not make a reference document an authority source for tools, payment or execution.

**Out of scope:** a new memory system, task board, NQ service, mandatory questionnaire or global harness installation.

**Done when:** a recipient can use the selected guidance with scoped material and reuse answers without receiving private sibling context, invented activity or a new stage. M03–M05 and M10–M12 cover applicable obligations.

## Task M2 — Package Discovery and its seven methods

**Owner:** Discovery author; owns the Discovery entry and seven default method packages.

**Current state:** `DISCOVERY_FUNCTIONS` lists seven display methods; `GRAMMAR_PACK`, discovery schemas and the generic experimental pack supply duties, identities and conservation rules. Ordinary independently callable packages are the missing deliverable.

**Purpose:** turn rough material into coherent, sourced possible work without losing desired outcomes or silently committing to execution.

**Gap / cause:** the useful method material currently lives mainly in code/experimental JSON rather than portable skills with authored effort and behavior cases.

**Steps:**
1. Extract the actual `Declare`, `lookFirst`, `classify`, `Lenses`, `oneThing`, `route`, and `confirm` contributions from the source inventory and ANALYSIS §5. Preserve original method meaning, not a replacement generic brainstorming workflow.
2. Retain source identities, explicit-versus-interpreted intent, requirement links/dispositions, candidate/artifact identities, questions/owners and genuine dependencies. Preserve the desired result alongside preparation needed to achieve it.
3. Keep `confirm()` separate from operator selection/promotion. Do not force the runtime's internal `discover` name into the ordinary skill or infer execution from desired intent.
4. Author a proportionate Discovery entry, method references/examples, and observable Light/Focused/Deep recipes. No finished-spec intake gate, predetermined task count or mandatory fresh call for each method.
5. Use fixtures containing contradictory input, sparse context, existing answers, unavailable evidence, shared prerequisites and a requested outcome that is tempting to replace with a research task. Preserve exact source material through the bound handoff.
6. Coordinate with the runtime owner: generalized method names must retain declared conservation validation, not rely on matching the old job names.

**Out of scope:** new dispatch logic, automatically promoting prerequisites, implementing candidate tasks or rewriting Brainstorm's twenty skills.

**Done when:** all seven methods and the Discovery entry are independently usable and traceable to their source; whole-composition behavior preserves intent and refuses false completion. M02–M08 and M10–M13 have independent evidence appropriate to the delivered slice.

## Task M3 — Package Delivery and its four responsibilities

**Owner:** Delivery author; owns the Delivery entry and Ideation/Planning/Implementation/Verification method packages.

**Current state:** `AUTONOMY_PACK` declares four neutral nodes; generic/domain examples and foundation contracts provide their responsibilities. The neutral verification node requests an acceptance object but supplies no mechanical `check` command. That definition alone is not proof of genuine verification.

**Purpose:** provision each selected task from a grounded approach through a fixed brief, actual making and independently supported acceptance.

**Gap / cause:** the responsibilities exist, but portable phase methods, meaningful effort recipes and demonstrated method behavior are not yet the supplied product.

**Steps:**
1. **Ideation:** resolve what success means for this task and choose a grounded approach. Reuse settled context; select relevant thinking specialists rather than restarting an open-ended brainstorm.
2. **Planning:** inspect the actual environment, state scope/actions/inputs, conditions, evidence owners and availability, dependencies, recovery and successor needs. Use relevant `delegate`/`prd` material without requiring a large document for every small task.
3. **Implementation:** execute the accepted brief only, with actual artifact/partial/failure reporting. A defect in the brief returns a question; an effort upgrade never grants redesign or wider actions.
4. **Verification:** compare the actual result with current conditions through an independent authorized evidence owner. Report performed checks, unavailable evidence, failures and limits. Do not accept a claim merely because it is JSON or was produced by a different label.
5. Preserve software maker/check-design isolation where applicable. Do not require code, Git, test commands or deployment for a non-software task. Candidate-time proof, manual QA and live checks remain different evidence producers.
6. Author each effort recipe before testing it. Extra implementation work must already belong to the accepted plan; a free verification result cannot omit required proof. Reuse domain helpers only after inspecting their bodies and scope.

**Out of scope:** changing the task while making, self-awarded acceptance, a universal SDLC, a new runner, automatic release, or a deployment-based definition of Landing.

**Done when:** the entry and four methods carry one selected task's context/conditions without role confusion and return honest evidence states. M02–M05, M09–M13 and M17 cover the applicable source/behavior/integration slice.

## Task M4 — Recover and scope Landing content

**Owner:** content lead or explicitly assigned inventory author.

**Current state:** Landing's existence/order is settled; the inspected repository does not supply its canonical instructions/supporting assets. v7 U2 remains open.

**Purpose:** obtain the missing method faithfully without replacing it with a plausible assistant invention.

**Gap / cause:** canonical content is unavailable in the inspected source set; its meaning cannot be recovered from the word alone.

**Steps:**
1. Inspect actual newly supplied project materials, relevant authorized history and explicitly selected skill sources. Do not sweep unrelated private files or infer absence beyond the inspected scope.
2. If canonical material is found, retain its source and resolve its input/output obligations, effort and supporting methods with the lead before authoring.
3. If not found, retain the exact U2 question below and send it to the assigning lead through NQ. Continue unrelated content work.
4. Once supplied, author and independently evaluate the selected Landing method against that actual contract; preserve its placement without equating it with shipping, cleanup or completion by default.

**Out of scope:** invented Landing behavior, successful empty placeholders, automatic publication/deployment, or reopening the settled grammar.

**Done when:** the **inventory subtask** has an attributable source or a bounded U2 handoff. The **Landing implementation** is done only when canonical content is supplied, packaged and independently checked. An honest inventory result does not satisfy M14's implemented-default condition.

## Task M5 — Pin, package and hand off to existing integration owners

**Owner:** W2 packager/integrator; sole writer of the selected snapshot/catalog/provenance files. Coordinate with v7 W1/W3/W4/W5; do not duplicate those streams.

**Current state:** Brainstorm already demonstrates deliberate source pinning; the full ordinary-skill loader, generalized binding and non-executing host boundary were still proposed at the baseline.

**Purpose:** make accepted source usable by the actual integration without a checkout dependency, conflicting defaults or silent updates.

**Gap / cause:** source packages, binding services and distribution must meet at one versioned contract; directory creation alone does not connect them.

**Steps:**
1. Take accepted canonical upstream outputs and record their actual revision, relative paths, byte sizes, hashes/blob identities and notices. Do not label an unpublished patch as an upstream commit or claim byte identity after editing a snapshot.
2. Refresh only the selected MadeWell snapshot/catalog. Preserve the existing Brainstorm pin unless a separately assigned upstream change requires an explicit refresh. Keep evals/reviews separate from runtime payload selection.
3. Map each method and effort recipe to the shared v7 component-occurrence/contract binding. Compatible subtree replacement and repeated skill occurrences must preserve external contracts and distinct identities.
4. Give the relevant runtime owners the content manifest, declared inputs/outputs, required host capabilities, source identities, effort work, failure cases and acceptance IDs. Missing explicit methods/capabilities fail visibly, never silently substitute defaults.
5. Feed tool requirements into the existing shared operations: catalog/resolve, capture, prepare, record, future selection changes, explicit preview/promotion, inspect/reorient, and the managed entitlement boundary. No tool/server per phase, generic shell endpoint, second Store or duplicate lifecycle.
6. If assigned integration, wire through those owners' services and follow v7's source/access/receipt/privacy contracts. Otherwise return the ready content/schema artifact and the exact owned integration dependency; do not report live MCP behavior.
7. Supply the selected asset allowlist/notices to W5. Have the verifier exercise the actual packed distribution outside the checkout before claiming it works there.

**Out of scope:** arbitrary package downloading, installing a harness, native-host claims without actual loading, selecting billing terms/provider, publishing packages or deploying without separate authority.

**Done when:** the claimed source snapshot is reproducible and portable, its actual integration state is explicit, and M15–M18 plus applicable v7/Brainstorm criteria have evidence. Content handoff can close independently; installed/native/billing claims cannot borrow its status.

## Task M6 — Independently design and execute verification

**Owners:** independently assigned test-design maker and a distinct non-maker check executor, following AGENTS.md. Authors do not award their own acceptance. One person/session may own several compatible responsibilities, but not both sides of a prohibited acceptance boundary.

**Current state:** the ontology assessment checked artifact structure/links; it did not run new method scenarios, host round trips or runtime acceptance. Brainstorm's scenario definitions are not behavioral passes.

**Purpose:** establish that the content and integration actually preserve the intended work and safeguards, not merely that the files parse.

**Gap / cause:** extraction and authored effort differences need direct evidence; existing snapshots, hashes and scripted outputs cannot prove model behavior or real host support.

**Steps:**
1. Design the applicable cases below from the fixed contracts before accepting author output. Include negative controls; keep expected outcomes independent of the implementation's own narrative.
2. Check ordinary-package structure, references, source/notice identity, declared bindings, selective loading and actual packed assets. These are source/structural results, not semantic acceptance.
3. Exercise actual loaded instructions through an authorized available harness/model. Retain exact method/source versions, supplied material, relevant tool observations, output and assertion decisions. Keep provider secrets out of artifacts. Do not buy an account or infer permission for new paid calls.
4. Compare effort on matched material and controlled relevant settings. Inspect actual additional grounding, challenge, artifact work and reconsideration—not response length, agent count or self-rating. Mark unavailable evidence/tools and incomplete responses explicitly.
5. Exercise multi-turn and cross-method handoffs. Use real disposable storage/restarts for runtime durability and actual target-client behavior for host claims. Scripted workers test plumbing only.
6. Run only checks directly covering changed files/features. A content-only change does not justify an application-wide suite. Runtime changes use the affected test map in v7 §17 and the repository's build/check policy.
7. Report PASS/FAIL/N/A/UNKNOWN per applicable case with artifacts/commands and source/environment identities. A failure returns to its owner; a gated case remains open instead of becoming an unevidenced pass.

**Out of scope:** grading the grammar's legitimacy, model-agreement certification, synthetic output masquerading as native activation, or a mandatory full-suite/whole-library sweep.

**Done when:** the claimed delivery slice has independent evidence, failures/unknowns are owned, exact changed-file scope and cleanup are checked, and source acceptance is separated from behavioral, interoperability, entitlement and live-release status.

### Acceptance cases — requirements, not passed results

| ID | Observable acceptance |
|---|---|
| **M01** | Baseline, actual assigned checkouts/authority, shared contracts, writer ownership, test designer and non-maker acceptance owner are recorded. |
| **M02** | Full default grammar remains intact; selected components/methods also work alone without fake predecessor work, compulsory agents or fixed stage counts. |
| **M03** | Ordinary skill frontmatter/body/support files remain portable; a selected natural output can be wrapped without rewriting it into a proprietary skill dialect. Essential standalone boundaries do not require the whole library. |
| **M04** | Actual selected bodies/references reach the performer. A missing explicit method or required capability fails visibly; catalog presence is not counted as activation. |
| **M05** | Exact source, settled decisions, relevant answers and uncertainty survive multi-turn/recipient handoffs. Private siblings/unrelated work are withheld. No repeated intake or invented in-flight activity. |
| **M06** | Discovery retains every declared intent through requirements or explicit sourced disposition; contradictions/interpretations are not silently promoted to facts. Negative dropped-intent/reference controls are refused. |
| **M07** | Coherent candidate outcomes survive alongside preparation. Existing work is reconciled; phase names do not mechanically become separate tasks; no arbitrary task count. |
| **M08** | Dependency/artifact/question identities and reasons survive Route/Confirm. Confirmation is not selection; promotion remains exact explicit non-dispatching selection, including when executable defaults exist. |
| **M09** | Ideation chooses within the actual task; Planning supplies a feasible fixed brief and evidence owners/availability. A checker is not assigned inaccessible private material or its own future result as proof. |
| **M10** | Ground and Rumen contribute at their proper boundaries without new serial stages. Rule accounting/hashes are not reported as executed checks; successor preparation is usable and stale material stays stale. |
| **M11** | NQ resolves a clear brief without manufactured rounds, reuses durable answers, preserves ownership/private scope, and holds genuinely unresolved exchanges after three answered turns without resetting them. |
| **M12** | Absent effort resolves free Light. Matched-material deeper variants perform their declared work when available/authorized; required correctness/safety/evidence is never paywalled. Missing access produces no silent substitution, charge or false fulfillment. |
| **M13** | Effort does not silently change method, answer length, provider reasoning, permissions or scope. Implementation follows the fixed brief; a new plan defect returns a question rather than unauthorized improvisation. |
| **M14** | Landing's implemented behavior is grounded in supplied canonical content and independently checked; otherwise its implementation remains UNKNOWN/open, with no successful placeholder. Inventory closure is reported separately. |
| **M15** | Canonical source revision/content and notices match the selected snapshot. A library edit does not change historical/prepared work; explicit future updates preserve previous evidence. |
| **M16** | Declared runtime assets resolve from the real packed artifact outside its source checkout. Evals/vendor assets are not indiscriminately shipped; standalone ordinary-skill use remains available. |
| **M17** | Source output, structural acceptance, externally reported completion, independent evidence and live results are distinguishable. The actual artifact satisfies each claimed condition; refusal/partial/unknown states remain visible. |
| **M18** | For an integration claim, a real supported client exercises the relevant prepare/record/resume path with exact version/transport evidence. Source-only delivery reports that boundary without claiming native loading, billing or deployment. |

### Verification commands and missing host commands

These commands are for the **designated non-maker verifier**, not permission for either maker to self-check. M0 records the concrete selected directories and target harness after inspecting them; do not invent a universal `evaluate-skill` CLI.

From the assigned agent-core root, for example, when `madewell-discovery` is the frozen new directory:

```sh
python3 primitives/skills/creating-skills/scripts/quick_validate.py primitives/skills/madewell-discovery
```

Repeat for actual new/changed package directories only. Inspect the validator's dependencies and current behavior first; it checks structure, not skill quality or behavioral fulfillment. Its failure must be fixed, not bypassed. Generator/package helper conventions do not override the current standard frontmatter or repository acceptance policy.

For actual runtime changes in the corresponding surfaces, the starting targeted MadeWell selections include:

```sh
node --test test/discovery-contract.test.ts test/discovery-organs.test.ts
node --test test/jump-packs.test.ts test/grammar.test.ts
```

Choose only directly affected files/tests, satisfy the repository's actual build prerequisites, and add the required new cases. These example selections are neither a mandatory sweep nor complete acceptance of the handoff/privacy/packaging surfaces; use v7 §17 for those changed surfaces. A source-only authoring change does not require these runtime commands.

## Parallelism and file ownership

```text
M0 — source/access, shared contracts, ownership, evidence plan
 ├─ M1 — shared guidance and Work entry
 ├─ M2 — Discovery entry and seven methods
 ├─ M4 — bounded Landing-source inventory
 └─ M6 — independent test design

M0's task/handoff contract + unit-ready shared guidance
 └─ M3 — Delivery entry and four methods

Accepted canonical method units
 └─ M5 — snapshot/catalog/bindings → existing v7 integration owners
      └─ M6 — independent checks for each claimed delivery slice

Canonical Landing content supplied
 └─ M4 — Landing method authoring → M5/M6
```

- M2 is the first content vertical slice because it already has concrete source/conservation contracts. M3 can draft against frozen handoffs without waiting for every Discovery file or final integrated test.
- Shared guidance, each method directory, the product catalog/provenance, and runtime files each have one writer. The lead serializes amendments; no two authors race on Work/shared guidance or catalog files.
- v7 W1 owns composition/resolution; W3 owns persistence/handoffs/promotion; W4 owns MCP/dependencies; W5 owns distribution/current product docs. Existing owners take the narrow patches instead of new competing implementations.
- Unit-ready output unlocks a consumer; shared end-to-end criteria close after integration. Do not create circular “all downstream checks must finish before upstream can hand off” dependencies.
- These are responsibility boundaries, not a required count of agents. Do not create an agent/service per method or ontology entity.

## Unknowns, dependencies and stop rules

### Content gate — v7 U2, unchanged

**[UNKNOWN — needs input: Where are Josh's canonical landing method instructions/supporting assets, and which are the intended shipped defaults?]**

Owner: content lead through the assigning cloud lead. Blocks faithful Landing content/full-default delivery, not Discovery, Delivery, shared guidance or source/contract work. Inspect newly supplied material before asking; Brainstorm content is already supplied.

### Conditional runtime/release gates — v7 U1/U3/U4

- **[UNKNOWN — needs input: Which exact first user-facing MCP client/version and local-versus-hosted connection must the first release support?]** Blocks exact native-host acceptance, not ordinary method authoring.
- **[UNKNOWN — needs input: If hosted MCP is required, what deployment target, identity/tenant boundary, authorized package-upload policy, and retention/deletion policy are approved?]** Blocks that hosted slice, not local/source work.
- **[UNKNOWN — needs input: What package publication channel and Made Well distribution license are authorized for a public product release?]** Blocks package publication, not authorized development or local verification artifacts.

Paid launch additionally retains the exact pricing/terms, payment/account identity, metering/retry/partial-work policy and expiry/outage/in-flight questions in [Brainstorm HANDOFF](../../brainstorm/HANDOFF.md#release-gates-and-stop-rules). Do not invent answers or turn content authors into a billing team.

### Assignment-dependent prerequisites

Actual upstream write/publication scope and an authorized model/host for behavioral checks must be obtained from the assigning context. They are not settled by a file path or this document's existence. Missing scope goes to the assigning lead with the bounded artifact/dependency; never use credentials from another project, publish under a guessed license, or report a requested test as executed. The content contract and reviewable source work can be delivered separately from gated publication/host acceptance.

### Stop only the affected operation when

- A chosen method is missing, incompatible or crosses its granted material boundary; disclose it instead of falling back silently.
- A proposed change would alter settled intent, the grammar, fixed implementation scope, acceptance ownership or another writer's contract. Carry the concrete conflict and recommendation to the lead.
- Source provenance/notice identity cannot be established, private material would enter public agent-core, or an upstream snapshot would diverge from its claimed source.
- Entitlement/permission is missing or uncertain for a protected operation; preserve material and authorized receipt recovery. Do not change request identity to evade an uncertain prior effect.
- A claimed result needs unavailable evidence, an unsupported host capability or canonical Landing content. Retain the partial result; mark the missing evidence rather than manufacturing success.
- A guard refuses an action. Read its error, identify the protected boundary, use the named supported path, and report the remaining blocker with evidence. No bypass.

## Reporting back and delivery

Each unit reports through its real From, beginning **YES** only for its evidenced assigned outcome, otherwise **NO** with the material gap. Use this compact record:

```text
Done: YES / NO — assigned unit and user-visible outcome
From / To / Work: actual identities and assignment reference
Source: actual repository revisions, owned paths and artifact references
Confirmed gap/cause: what the evidence established, or UNKNOWN
Delivered: method/source/contract/integration behavior actually supplied
Evidence: applicable M/v7/B criteria; commands/artifacts; PASS/FAIL/N/A/UNKNOWN
Boundaries: source, behavior, packed use, native host, entitlement and live release separately
NQ: answered turns x of 3; remaining question, owner and next action
Cleanup: task-owned files/processes/worktrees handled; user material preserved
```

Do not announce someone else's work as in flight without current evidence. Return a useful unit-ready artifact rather than waiting for unrelated release gates. Update documentation affected by actual changes and preserve historical pins; reap only task-owned temporary resources. The authorized integrator, not either maker, handles repository delivery under the assignment's permission.

## Handoff check

1. **Everything needed to start the ungated assignment: yes.** This dossier supplies purpose/grammar, pinned source paths, reuse boundaries, output locations, method obligations, scoped tasks, ownership, acceptance cases, reporting and integration dependencies. The complete analysis and existing v7 contracts travel in the same repo.
2. **Questions about the next action: none.** Start M0; freeze actual source/access/contracts; deliver Discovery's first vertical slice with shared guidance and independent test design, then Delivery and accepted packaging. Inspectable engineering choices stay with the lead.
3. **Unbounded ambiguity: none deliberately hidden.** Canonical versus snapshot ownership, content versus runtime scope, method versus occurrence identity, phase versus shared process, effort versus authority/access, and structural versus behavioral acceptance are explicitly separated. Landing and release-dependent missing inputs remain named gates, not invented defaults.

**This is not “all work can finish without further input.”** Landing, gated host/publication/commerce slices and missing assigned access cannot honestly be reported complete until their inputs and evidence exist.

## Checklist

- [x] Pre-write synthesis is supplied; the same task/parallelism/unknown inventory is retained here.
- [x] A new receiver can identify the existing sources, proposed destinations, work owners and integration seams without recovering the conversation.
- [x] Shown commands are concrete and scoped; M0 establishes actual selected paths/environment and real host commands instead of fictional universal tooling.
- [x] Infrastructure, secrets, source custody, independent verification and deployment boundaries are explicit.
- [x] Every task includes current state, purpose, gap/cause, steps, exclusions and observable completion.
- [x] Parallelism, shared-file ownership, unit-ready dependencies and reporting routes are explicit.
- [x] Stop rules preserve source, authority, privacy, unfinished work and uncertain effects.
- [x] Source/behavior/runtime/host/access/publication evidence cannot borrow one another's status.
- [–] Unconditional full-default/public paid release is not ready: canonical Landing content and dependent release inputs remain gated. This is intentional and does not prevent the ungated content work.

The checklist describes dossier coverage, not passed implementation or behavioral acceptance.
