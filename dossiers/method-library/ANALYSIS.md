# Made Well — ontology, topology, and the next method packs

**Baseline inspection: 2026-11-26, CT.** MadeWell `4edce7b2706a73f90adad5ba601fd2fea3730d93`; canonical agent-core `9addbffae9d600f40dd334ad97bb24c6b0a0c7b7`.

**The central picture:** Made Well preserves the shape of work while replaceable methods transform its material; shared context, authority, evidence, and handoffs keep those transformations connected.

This is a source-grounded baseline and a proposed content/tool inventory—not a new grammar, runnable configuration, implementation receipt, or claim that the MCP experience is installed. The accompanying [JSON map](ontology.json) is diagram data, not an application schema.

## 1. Read the map correctly

- **Ontology:** the kinds of things that exist—work, components, methods, material, questions, artifacts, conditions, evidence, and so on.
- **Topology:** their relationships—what contains what, what flows where, what depends on what, who owes what, and which boundaries must not be crossed.
- **Not everything is a stage.** Ground and Rumen span work. NQ is an exchange protocol. A skill supplies instructions. A tool supplies a capability. An agent is one possible performer. None automatically becomes a new phase or service.

Evidence labels used below:

| Label | Meaning |
|---|---|
| **Settled** | Governing product contract in the foundation or approved Brainstorm direction. |
| **Source-present** | A mechanism or definition exists in inspected code; no live or passing-test claim. |
| **Seed** | Supplied method material, not an activated integration. |
| **Proposed** | Recommended packaging, interface, or recipe; not yet an implemented fact. |
| **Unknown** | The inspected sources do not settle the needed content or behavior. |

The inventory is complete at the **product/contribution-contract level of the inspected sources**, not an enumeration of every TypeScript symbol. It deliberately leaves Landing's missing method contract visible. The governing foundation wins over historical software-runner descriptions. [S1, S2]

## 2. Topology: the settled containment map

This picture answers **what is inside what**. Indentation means containment; it is not an agent roster.

```text
work()
├── brainstorm()
│   └── selected thinking methods
│       ├── default posture: ambitious-collaboration
│       └── specialist moves selected as needed
│
├── discovery()
│   ├── Declare()
│   ├── lookFirst()
│   ├── classify()
│   ├── Lenses()
│   ├── oneThing()
│   ├── route()
│   └── confirm()
│
├── delivery()
│   ├── ideation()
│   ├── planning()
│   ├── implementation()
│   └── verification()
│
└── landing()
    └── canonical method content: UNKNOWN in inspected material
```

The default order is `brainstorm → discovery → delivery → landing`; Delivery's default order is `ideation → planning → implementation → verification`. Discovery's displayed sequence is also the opinionated default. **These defaults remain intact without becoming compulsory counts.** A selected component can be used alone; a component can be replaced by a compatible composition; the same method can occur more than once. [S1, S2]

**The task is the unit of delivery.** Discovery produces a collection of candidates; each deliberately selected task has its own delivery and evidence. The tree above shows component definitions, not one enormous delivery shared by every task. Do not turn ideation, planning, making, and checking into four separate candidate tasks merely to mirror the diagram. An independently owed prerequisite artifact can be its own task, with its own delivery. [S1:163–217, S3]

### The spanning processes are a different picture

```text
Delivery functions:     ideation ─── planning ─── implementation ─── verification
                         ╰──── Ground ────╯       ╰──────── Rumen ─────────╯
```

This is the operator's illustrated span—not two additional checkpoints. Ground connects shaping/planning to actual material. Rumen carries applicable rules, mechanical evidence, judgment, and vocabulary through making/checking. [S1:33–54]

The implementation also requires **Ground/Rumen accounting and successor preparation on configured consumers**, including discovery. That per-output receipt mechanism does not move Ground or Rumen into a serial phase list. [S4]

### Recursion has a precise meaning

```text
A component occurrence
├── has an input/output contract
├── selects a method, or contains child components
├── has its own occurrence identity
└── keeps its enclosing contract when its internals are replaced

A method definition may be reused at several occurrences.
Each actual invocation/attempt remains separately identifiable.
```

A method name, occurrence address, invocation ID, and task identity are different things. Recursive composition does not promise arbitrary graph execution, nested concurrent runners, extra permissions, or additional agents. The current execution-2 validator explicitly refuses nested parallel execution. [S2:15.1, S5]

## 3. Ontology: the nouns and their relationships

These are conceptual distinctions, **not a proposal for a table, service, or skill per row**. “Source-present” includes existing representations that need extension for the portable product.

### A. Shape and method selection

| Thing | Meaning / relationship | Baseline |
|---|---|---|
| **Work** | The intended outcome and retained context to which contributions belong. | Settled; current `Item`/ledger representation. |
| **Task** | A selected unit of delivery with purpose, owner, boundaries, conditions, dependencies, and evidence. | Settled; source-present. |
| **Component definition** | A reusable work function with a purpose and input/output contract. May be composite. | Settled; portable generalized representation proposed. |
| **Component occurrence** | One placement of a definition within a selected composition; distinguish repeated uses. | Required by v7; not equivalent to today's job-name slot. |
| **Composition** | The selected nesting/order and explicit input/output relationships among components. | Settled; current function packs implement a narrower execution model. |
| **Method / cartridge** | The interchangeable way a component does its job; may itself compose other components. | Settled; existing JSON method resolution. |
| **Spanning process** | A contribution across configured components, such as Ground or Rumen, rather than an added serial stage. | Settled. |
| **Protocol** | Rules governing an interaction, such as NQ, rather than the content of a phase. | Settled. |
| **Skill package** | Ordinary `SKILL.md` instructions and relevant supporting files, usable outside Made Well. | Brainstorm seed supplied; standard loader still proposed. |
| **Binding** | Selects a method for a particular component occurrence; keeps placement outside ordinary skill frontmatter. | Proposed generalization of existing resolution. |
| **Pack / library** | A shareable collection of methods, references, constraints, and possibly composition choices. | Seed and experimental JSON packs exist; do not equate their formats. |
| **Domain contribution** | Domain-specific methods or applicable constraints, such as software, marketing, sales, or data. | Experimental examples exist; not universal grammar requirements. |
| **Effort recipe** | Declared investigative/artifact work for a selected level or dial setting. | Brainstorm supplied; other shipped recipes need authoring. |
| **Resolved selection** | Effective composition, methods, origins, versions/content, contracts, and effort pinned for work. | Existing pack/settings pins; portable expansion proposed. |

Sources: [S1, S2, S3, S5, S6, S7].

### B. Material and meaning

| Thing | Meaning / relationship | Baseline |
|---|---|---|
| **Source material** | Exact notes, transcript, document, artifact, or other supplied material—not merely its summary. | Settled; retained `source` and references. |
| **Source identity / locator** | The identity cited by contributions versus the actual location it points to. A digest proves byte identity, not truth. | Source-present. |
| **Intent / outcome** | What the person seeks, with explicit instruction separated from interpretation. | Source-present discovery contributions. |
| **Observation** | What inspection found, with sources and limits. Not automatically a requested change. | Source-present. |
| **Requirement / constraint** | A sourced outcome or boundary; records explicit versus interpreted origin and linkage to intent. | Source-present. |
| **Intent disposition** | An explicit sourced account of why an intent is context, provided, deferred, or superseded rather than a requirement. | Source-present; prevents silently dropping intent. |
| **Alternative / assumption / unknown** | A possibility or unresolved proposition that must not be silently promoted into fact. | Settled distinctions; not all have dedicated current record types. |
| **Tradeoff / decision** | Consequences considered and a choice with rationale and ownership. Predictions remain predictions. | Source-present decision/contribution records. |
| **Candidate / to-do** | Possible coherent work, with outcome, boundaries, conditions, and source links—not an execution order. | Source-present candidate records. |
| **Artifact** | An output or independently owed result; a planned artifact is not proof it exists. | Discovery artifact identities and retained result/file representations. |
| **Condition** | An observable requirement for accepting the task's result, identified separately from its evidence. | Source-present. |
| **Rumen rule** | An applicable fence, judgment, sign or vocabulary rule with a stable identity, definition and evidence owner. | Source-present (`RumenRule`, S4). |

Sources: [S1, S3, S8].

### C. Coordination, continuity, and evidence

| Thing | Meaning / relationship | Baseline |
|---|---|---|
| **Owner / participant / profile** | Who owes a contribution or answer; a profile describes responsibility, not a permanent agent. | Settled; source-present attribution/profile fields. |
| **Dependency** | A producer result/prerequisite needed by another task. Not a mere topical relationship. | Source-present; current readiness releases on completed tasks. |
| **Handoff / preparation** | Recipient-specific source, instructions, prior results, constraints, questions, authority, and expected return. | Source-present packet/organ mechanisms; non-executing host boundary proposed. |
| **NQ exchange** | The participants, fixed handoff, understanding, questions, answered turns and resolution of one agent-to-agent exchange. | Source-present; distinct from the handoff packet and from an invocation. |
| **Question** | An identified uncertainty with an answer owner and, where applicable, the role it blocks. | Source-present. |
| **Answer / alias / decision reuse** | A durable answer and its provenance; reuse avoids asking again without erasing original wording or ownership. | Source-present. |
| **Invocation / attempt** | A particular application of a method, with actual inputs/configuration and observed return or interruption. | Source-present; not identical to a provider call. |
| **Result** | What was actually returned, including refused or partial material. | Source-present. |
| **Contract acceptance** | A result satisfied declared structural/conservation requirements. Not proof of achieved outcome. | Source-present. |
| **Check / evidence producer** | The authorized independent or mechanical process that produces evidence for a condition. | Source-present; availability and ownership matter. |
| **Evidence** | Source-linked observations/results supporting a claim about specific conditions and artifact versions. | Source-present; attributed assertions and executed checks remain distinct. |
| **Completion** | A recorded, automated, or legacy completion claim with its evidence/provenance. | Current code distinguishes these kinds; do not flatten them into “verified.” |
| **Blocker / hold / checkpoint** | Respectively an unmet obligation, a stopped condition requiring resolution, or an intentional control stop. | Source-present; releasing one does not release the others. |
| **Revision / receipt / event** | State identity, acknowledged logical operation, and recorded occurrence. Different jobs; none by itself proves correctness. | Source-present durable machinery. |
| **Standing context fact** | Attributed, scoped, revisable/revocable context with audience/ancestry and possible expiry. | Source-present; not a secret store or remote authentication. |
| **QA case / run / observation** | Case instructions pinned to a revision, an actual run context, and observations/verdicts. | Source-present; separate from automatic completion. |
| **Evaluation** | A retained baseline and controlled variation of inputs/method/configuration, compared using actual evidence. | Required capability; current execution-specific eval is narrower than portable skill evaluation. |

Sources: [S1:219–250,423–500, S2, S4, S8, S9, S10].

### D. Capability, access, and presentation

| Thing | Meaning / relationship | Baseline |
|---|---|---|
| **Tool capability** | An operation available to the chosen performer: inspect, search, edit, execute a check, read a browser, etc. | Separate from method instructions. |
| **Work/data permission** | Which material and actions the caller is permitted to access or perform. | Existing scoped bindings/private tracks; portable boundary must preserve them. |
| **Commercial entitlement** | Whether a managed paid operation is authorized for the account. | Product direction; trusted service enforcement not implemented here. |
| **Execution adapter / performer** | A person, assistant, or explicitly selected runtime applying the method. | Optional to product plumbing; current repository also has an execution-2 runner. |
| **Provider prescription** | Harness/provider/model/reasoning configuration when an agent is used. | Current cards/prescriptions; not work effort. |
| **View / reorientation** | A concise projection of the same work/evidence, with deeper exact material available. | Source-present views and supplied reorientation guidance. |
| **Transport / host** | CLI, HTTP, MCP, native skill loader, or another integration exposing shared services. | CLI/HTTP exist; MCP/native host integration remains proposed. |

Sources: [S1, S2, S6, S7, S9, S11].

### The important edges

| Relationship | Meaning |
|---|---|
| `composition contains occurrence` | Structural nesting, not a new agent or durable task for each box. |
| `occurrence binds method` | Selects how this occurrence is fulfilled. |
| `method is supplied by package` | Preserves origin and supporting content. |
| `contribution derives from source` | Traceability; does not establish the source is true. |
| `requirement accounts for intent` | Prevents loss through reformulation/decomposition. |
| `candidate proposes task` | Possibility, not commitment. |
| `authorized selection promotes candidate` | Explicit commitment; not execution permission. |
| `task depends on task/artifact` | A real prerequisite, with an owner and required evidence. |
| `producer prepares consumer` | Carries the useful result and permitted context across the seam. |
| `invocation applies pinned selection` | Historical work is not silently changed by library updates. |
| `evidence supports condition` | Must identify the actual result/version and evidence producer. |
| `view projects record` | Observing never advances, approves, or retries work. |

These are explanatory relationship names, not proposed public API fields. Their detailed constraints are in the existing v7 handoff. [S2]

## 4. The material-flow map

This picture answers **what changes, and where commitment enters**. It omits the tool/runtime architecture.

```text
raw or existing material
        │
        ├── brainstorm ──> useful lead / framing / unresolved question
        │                  (can stop here)
        │
        └── discovery ───> sourced candidate list + conditions + dependencies
                                  │
                         explicit selected candidates
                         [commitment, NOT dispatch]
                                  │
                         selected external tasks
                                  │
                   delivery handoff for EACH task
                   ┌──────────────────────────────────────────────┐
                   │ ideation        → chosen approach            │
                   │ planning        → fixed brief + proof needs  │
                   │ implementation  → actual result / partial    │
                   │ verification    → evidence against conditions│
                   └──────────────────────────────────────────────┘
                                  │
                         landing component
                         [method contract unresolved]
```

Raw material may enter Discovery directly; an existing selected task may enter an independently selected component. This is not a mandatory intake ladder. Discovery can clarify the request; Ideation can do substantial task-specific gap-filling. Neither can replace the desired outcome with easier preparatory work without an explicit disposition. [S1, S3]

**Not one success ladder:** recorded output, contract-accepted output, task selection, externally reported completion, independent verification, and live usability are separate claims. Which evidence is required follows the actual task contract. A source publication is not an installed release; a campaign draft is not a campaign launch. [S2, S8]

## 5. What every phase owes

### Brainstorm — supplied seed

**Input:** a new idea, existing project, fragment, or resumed thread. **Contribution:** a developed lead, useful framing, resolved question, or next discriminating observation. Preserve the live thread and settled decisions. It does not need to generate tasks or execute them.

Reuse the approved 20-skill package. Default pairing: `brainstorm` + `ambitious-collaboration`; specialist methods are selected by the current obstruction. There are 74 scenario definitions in the seed, not 74 passed behavioral tests. [S6]

### Discovery — extract the existing methods, do not reinvent them

The seven methods already have concrete duties and contribution shapes. Their current source locations are `src/grammar.ts`, `src/discovery-contract.ts`, and the experimental generic pack. [S3]

| Method | Question it answers | Contribution that must survive the handoff | Boundary |
|---|---|---|---|
| **Declare()** | What outcome is actually sought, from whose words, within what scope? | Identified intent, provenance, explicit versus interpreted authority, genuine unknowns. | Desired outcome ≠ permission to execute. Rough input is allowed. |
| **lookFirst()** | What is already here and materially relevant? | Observations, exact sources/locations, existing capabilities, constraints, missing evidence. | Inspect before proposing replacement; unavailable evidence is not absent functionality. |
| **classify()** | Which statements are requests, observations, constraints, alternatives, or assumptions? | Requirements linked to intent; explicit sourced dispositions for intent not becoming a requirement. | Do not convert guesses into requirements or erase contradictions. |
| **Lenses()** | What consequences and tradeoffs matter in this context? | Concrete gains, costs, risks, affected perspectives, decisions, and rationale. | Apply supplied DX/UX/AX guidance; no invented weights or measured-benefit claims. |
| **oneThing()** | What are the coherent units of desired outcome? | Candidate identities, purpose, scope, required artifacts, conditions, question bindings. | Preserve outcome candidates alongside necessary preparation; no fixed task count. |
| **route()** | What genuinely depends on what, and who must settle the remaining inputs? | Reasoned dependency edges, prerequisite artifacts, preparation promises, independent branches. | A preparation note is not a scheduling edge or proof a prerequisite is ready. |
| **confirm()** | Does the final candidate set faithfully account for the request? | Reconciled candidates/conditions and retained requirement, dependency, preparation, and question identities. | Confirmation is not user selection, dispatch, or a “yes” fabricated for unresolved work. |

Current naming mismatch: the displayed `confirm()` is job `discover` in the built-in grammar; the jump-pack slot is `confirm`. Preserve the semantic contract while separating public method identity from historical execution names. [S3, S7]

### Delivery — preserve the four responsibilities

| Component | Input | Contribution | Boundary |
|---|---|---|---|
| **ideation()** | Selected task, actual material, constraints, prior decisions and questions. | A grounded account of success and a chosen approach, with consequential uncertainty addressed or explicitly owned. | Different from open-ended Brainstorm: shape how to fulfill this task, not restart the whole goal. |
| **planning()** | Chosen approach and inspectable environment. | An actionable fixed brief, scope, dependencies, inputs, completion conditions, evidence owners and availability, contingencies, successor preparation. | An acceptance condition cannot require future evidence from a checker who cannot yet see it. |
| **implementation()** | Accepted fixed brief and authorized resources. | Actual result/artifacts, exact changes or actions, partials/failures, evidence links and preparation for checking. | No silent redesign or expanded authority; inability to follow the plan returns a question. |
| **verification()** | Actual result and current conditions, with independently provisioned evidence inputs. | Observed check results and an attributable acceptance/failure/unknown account. | The maker cannot award independent acceptance; shape validity or a passing process is insufficient by itself. |

The neutral four-node pack exists in `src/autonomy-pack.ts`; the generic experimental pack gives richer domain-neutral duties. Neither is already a complete ordinary-skill product. Its verification node requests an acceptance object but declares no mechanical `check` command: do not present that definition alone as demonstrated verification quality. [S3, S8]

For software work, independent check design can proceed from the accepted plan alongside making, while remaining blind to the maker. Checks execute against the actual candidate through the authorized verification owner. This is responsibility separation, **not a mandate for a fixed fleet size**. It does not make code, Git, a repository, or deployment prerequisites of non-software tasks. [S1:394–421, S2, S8]

### Landing — keep the known node and the unknown method separate

**Settled:** Landing belongs after Delivery in the default outer composition.

**Unknown:** its canonical purpose-level instructions, input/output obligations, supporting material, and authored effort recipes are not supplied in the inspected repository. v7 U2 explicitly preserves this gap. [S2:669–679]

Do not fill it with “deploy,” “publish,” “cleanup,” “retro,” or “mark done” because those sound plausible. Documentation, transfer, release, or retrospective methods may eventually be useful **if the canonical Landing contract calls for them**. They are candidates, not its definition. No successful empty placeholder.

## 6. Shared processes: what must travel across phases

| Shared concern | Required contribution | What it is not |
|---|---|---|
| **Ground** | Connect intent and claims to actual available material and permitted outputs/bindings; retain identity and findings. | A source hash proving understanding, or another serial stage. |
| **Rumen** | Account for applicable constraints and preserve their evidence owners. Current kinds: **fence** (mechanical rule), **judge** (independent judgment), **sign** (operator-owned guidance), **lexicon** (project vocabulary). | One undifferentiated checklist or a model declaring its own gates passed. |
| **Successor preparation** | Provision the next configured consumer's usable brief and resolvable references; invalidate stale dependencies without deleting history. | A generic summary or a newly invented consumer. |
| **NQ** | Establish understanding, preserve questions/owners/answers, reuse settled answers, and hold unresolved exchanges after three answered turns. | Three mandatory exchanges, a replacement for preparation, or routine interviews with Josh. |
| **Judgment** | Context → purpose/intent → relevant DX/UX/AX consequences; own delegated choices and retain rationale. | A numeric score proving quality or reapproval of the settled grammar. |
| **Evidence ownership** | Name who can establish each condition, against which material, and when that evidence is available. | A checker being assigned its own future report or unavailable private material as proof. |
| **Privacy and authority** | Scope each handoff to permitted material and actions; preserve private-track separation. | A paid tier, skill instruction, or self-reported actor label granting access. |
| **Recovery** | Retain exact input/output, attempted/accepted boundaries, receipts, rejected drafts, and uncertain effects. | Timeout meaning failure, or “retry” meaning repeat an external effect. |
| **Observation and evaluation** | Expose actual calls, results, failures, usage when known, and evidence-preserving comparisons. | Inaccessible model internals, invented metrics, automatic tuning, or a second status ledger. |
| **Reorientation** | Explain the outcome, remaining gap, next owner/action, actual activity, and whether user input is needed. | “No question for you” meaning someone is currently working. |

Sources: [S1, S4, S8, S9, S10, S11].

Three different uses of **preparation** must not be conflated: Discovery's cross-task preparation promises; a producer's recipient-specific handoff; and an execution adapter preparing an environment. Current discovery schema annotations distinguish them explicitly. [S3]

### State is multidimensional

| Dimension | Examples / boundary |
|---|---|
| Position | Which selected component/occurrence is being addressed. |
| Work state | Current source includes candidate, open, queued, running, waiting, held, paused, discovered, completed, dropped; historical shipped remains decodable. |
| Readiness | Dependencies, blockers, authority, and available inputs; readiness is not evidence of execution. |
| Evidence status | Recorded claim, contract acceptance, independent observation, unavailable proof. |
| QA verdict | `untested`, `passed`, `failed`, `needs-refinement`, attached to the QA case/run—not automatically the task verdict. |
| Commercial access | Requested operation versus trusted entitlement; product enforcement still to be built. |

Do not compress these into one green badge or reuse an effort label as a state machine. [S6, S8, S9]

## 7. Current implementation overlay

This is the **as-inspected source**, not a live-installation report.

| Surface | What already exists | What the portable product still needs |
|---|---|---|
| Outer grammar | Governing full tree; source pack schema has `discovery` and `delivery` arrays. | First-class outer/standalone component selection without fake discovery/delivery work. |
| Discovery | Seven duties, schemas, identity/reference/conservation validation, exact source retention. | Ordinary skill extraction and contract selection independent of historical job names. |
| Delivery | Four neutral nodes, explicit execution-2 contracts, completion/evidence machinery. | Portable phase methods and non-executing host handoffs. |
| Brainstorm | Approved 20-skill seed and effort/access guidance. | Actual selected-skill loading, saved conversation continuity, integration and acceptance. |
| Landing | Named settled component and explicit U2. | Canonical method content before faithful default packaging. |
| Resolution | JSON JumpPack selection, method origins, conflict checks; fixed eleven-slot inventory. | General occurrence bindings and standard skill packages. |
| Context | Packets, organ receipts, saved answers, scoped context facts, private tracks. | Shared prepare/record service exposed without invoking the executor. |
| Persistence | One Store with work, revisions, events and request receipts. | Extend existing durable boundaries, not another database/work board. |
| Promotion | Current `promote` defaults an empty selection to all, includes prerequisites, and queues when delivery is configured. | Separate explicit-selection, non-dispatching boundary; do not expose the existing behavior as the new contract. |
| Effort | Existing `tier`/`budget`, autonomy and provider settings; Brainstorm work recipes in source. | Resolve/pin actual work effort separately; author other phase recipes. |
| Interfaces | CLI, HTTP, views, QA, traces and execution-specific evaluation. | Thin MCP/resources adapter and real target-host acceptance. |
| Commerce | Written free-Light / paid-deeper product direction. | Trusted entitlement and approved terms; no billing implementation found in scoped source search. |

Sources: [S2–S10]. A scoped search of `src/` and `package.json` found no `McpServer`, `modelcontextprotocol`, `entitlement`, `billing`, or `payment` match. That is scoped inventory evidence, not proof about other repositories or deployed systems.

Historical “six agents,” automatic shipping, and software-only loops must not become the universal product ontology. Preserve historical records and explicit execution compatibility without importing those assumptions into the new portable entrypoints. [S1, S2]

## 8. Tools likely needed — shared capabilities, not one tool per phase

### A. The Made Well-facing operations

**Recommended service families, already outlined by v7—not new public tool names:**

| Capability | What it supplies | Existing material to reuse |
|---|---|---|
| **Inspect/resolve methods and composition** | Catalog, effective selection, origins, conflicts, supporting content. | Jump-pack resolution, pack selection; extend for ordinary skills. |
| **Capture material** | Exact source, selected root and durable work identity without dispatch. | Ledger/Store capture; add the protected non-executing entrypoint. |
| **Prepare a handoff** | Saved selected instructions, exact scoped context, questions, effort and expected return. | `functionInput`, organs, answer/context history. |
| **Record a contribution** | Retain exact result/refusal, validate the declared contract and return a durable receipt. | Store requests/transitions and existing validators. |
| **Change a future selection** | Explicit compatible method/composition/effort update while preserving pinned history. | Boundary update/frozen-prefix machinery. |
| **Preview and promote an explicit selection** | Show dependencies/consequences, then create only the chosen externally owned tasks. | Candidate and ledger services; do not inherit current implicit-all/dispatch behavior. |
| **Inspect evidence and reorient** | Work state, actual activity, artifacts, source, decisions and next owner/action. | Existing read projections, trace, QA and context surfaces. |
| **Resolve managed access** | Authorize the resolved protected operation before paid work/effects; preserve request and performed-work evidence. | New seam required; not a prompt or client `paid: true` field. |

Catalogs, manifests, exact source, packets and supporting files can be resources rather than separate mutation tools. Questions and decisions travel through the same records; they do not require an unrelated inbox or memory system. Logical retries reuse the same operation identity. [S2:15, S6]

### B. Capabilities used by the person's chosen assistant

These remain host/domain capabilities, not a mandatory bundled execution stack.

| Capability | Where it matters | Candidate reuse / guard |
|---|---|---|
| Read/search supplied material | Ground, lookFirst, Ideation, Planning, Verification. | Existing filesystem/search/document tools; explicit grants and original source. |
| Inspect code structure/history | Software lookFirst/Planning and impact investigation. | `rg`, Git, Coraline/Composto where available; optional adapters, not product dependencies. |
| Retrieve primary external evidence | A consequential unknown in any method. | Browser/HTTP/search with source provenance; no invented access or observations. |
| Produce or edit an artifact | Authorized implementation; explicit exploratory artifact work. | Existing editor, document, design or domain tools under the actual brief. |
| Execute an independent check | Verification, not passive skill loading. | Scoped test/measurement tools and an independent evidence owner; record actual outcomes. |
| Inspect a live interaction | UI/host acceptance or operational outcome when required. | Browser/accessibility/API/terminal probes appropriate to that task. |
| Export/transfer an accepted artifact | Only where the selected task actually requires it. | Existing repository, document, CRM/CMS or other domain integration; explicit recipient/data authority. |

Do not create a universal shell tool on the MCP server, a new browser, a model router, or one server for each phase. Do not implement CRM/CMS/deployment adapters merely because they appear in this capability inventory. [S2]

### C. Deterministic safeguards are not skills

Binding compatibility, path/manifest validation, content pinning, source-reference conservation, revision checks, idempotency, private-context filtering, and service authorization need enforceable code. A skill may explain them; it cannot substitute for them. Tests must distinguish these checks from semantic truth and real outcome verification. [S2–S9]

## 9. Skills likely needed — content workstream

**Recommendation:** extend the same library pattern used for Brainstorm, without cloning its whole toolbox into every phase. Keep canonical reusable skills upstream, bind them from Made Well, and load only the methods the current work needs.

### A. Primary component methods

| Pack/component | Reuse | Author or adapt next |
|---|---|---|
| **Work** | Settled grammar and v7 continuity contract. | A thin portable entry/continuation guide for choosing a starting component and retaining context—not an orchestrator workforce. |
| **Brainstorm** | Approved seed as-is. | Integration and behavioral evaluation, not another content rewrite. |
| **Discovery** | Actual seven duties and conservation schemas; generic example's outcome-preserving refinements. | A Discovery entry skill and seven independently usable ordinary methods. Preserve names/meaning; keep runtime JSON wrapping outside the skill. |
| **Delivery** | Four responsibilities and per-task handoff contract. | Thin delivery composition guidance; do not duplicate the four methods' bodies. |
| **Ideation** | Brainstorm specialists where appropriate, grounded generic duty. | Task-specific approach selection and success framing; explicitly reuse settled decisions. |
| **Planning** | Existing grounded fixed-brief/evidence contracts; `delegate`/`prd` as candidate reference material. | A domain-neutral action-and-proof method, proportionate to the task rather than mandatory large documents. |
| **Implementation** | Fixed-plan boundaries; actual generic/software/domain methods. | A portable execute-within-brief method; optional domain skill selection. |
| **Verification** | Current conditions/evidence-ownership contracts and independent-check requirements. | A portable actual-result verification method with factual unknown/failure reporting. |
| **Landing** | Settled placement only. | Recover the canonical method source before authoring the base skill or effort variants. |

These are proposed packages/methods, **not files created by this assessment**. Component guides need not introduce new actions where existing bindings and references are enough. [S1–S3, S6, S12]

### B. Shared methods worth extracting once

- **Grounding:** preserve intent, inspect actual material, cite findings and source limitations.
- **Rumen accounting:** distinguish mechanical fences, judgment, operator-owned guidance and vocabulary; preserve evidence ownership.
- **Handoff/NQ:** provision the recipient, establish understanding, reuse answers and escalate genuine unresolved scope defects.
- **Decision/rubric application:** use context and all three experience lenses without fabricated precision.
- **Evidence/acceptance design:** determine what would demonstrate the outcome, who can observe it and when.
- **Reorientation/recovery:** carry exact prior work and explain the next owned action without inventing activity.

These can be independently useful skills or shared references where that is smaller. They are not mandatory extra phases, prompts, or agent calls. Their enforcement remains in the service layer. Source material already exists in FOUNDATION, organ/acceptance contracts, and v7's policy documents. [S1, S4, S8, S11]

### C. Existing supporting skills to consider

This is a **candidate inventory**, not a statement that every package is already compatible, behaviorally accepted, or suitable for automatic loading. Canonical descriptors/initial instructions and the supplied Brainstorm method map were inspected; complete portability/content review is part of subsequent authoring.

| Need | Existing candidates | Keep the boundary |
|---|---|---|
| Clarify outcomes and inspect omissions | `reframing-problems`, `detecting-blind-spots`, `synthesizing-insights`, `verify-then-write` | Preserve source/intent; no forced reinterpretation or invented facts. |
| Choose/develop an approach | `find-the-unlock`, `think-critically`, `right-side-of-the-curve`, `challenging-assumptions` | Optional selected moves, not a fixed gauntlet after every idea. |
| Understand interacting dependencies | `thinking-systemically`, `mapping-adjacent-possibilities`, `eraser-diagrams` | Supported causal/prerequisite edges, not resemblance or diagram-as-proof. |
| Prepare an actionable handoff | `delegate`, `prd` | Adapt proportionality and host assumptions; an exhaustive PRD is not every task's required output. |
| Implement a scoped software change | `tenex`, `refactor`, `debugging` | Fixed brief, existing project rules and independent acceptance still govern. Diagnosis is not authorization for extra changes. |
| Design a software surface | `designing-apis`, `design-intelligence`, `secure-build` | Software/domain-specific, not grammar-wide requirements. |
| Verify software/security/UI | `security-audit`, `dev-browser`, `tenex-review`; vendored accessibility/interface review skills | Different evidence scopes. Complexity review is not correctness; browser skill availability is not an executed check. |
| Investigate test/evidence failure | `fix-flaky-tests`, `debugging`; `debugging-with-logs` only when existing evidence is insufficient | Route the failure; do not turn every failure into instrumentation work or let the verifier silently fix it. |
| Inspect skill packages themselves | `skill-review`, `creating-skills`, `fresh-eyes-review` | Content/structure review and scenario definitions do not certify behavior. |
| Consider business/product tradeoffs | `evaluating-product-ideas`, `evaluating-business-strategy` | Apply to an actual open product decision, not revalidation of Made Well's settled grammar. |
| Document, hand over, or learn from completed work | `project-documentation`, `retro`; `shipping-web-apps` only for an authorized web-deployment task | Possible methods in appropriate work, not a guessed definition of Landing. |

Sources: [S6, S12, S13]. Existing instruction bodies may contain host-specific assumptions or requirements outside a component's contract; review before binding. A registry description does not mean the actual skill has been loaded.

### D. Existing domain seeds are broader than Brainstorm

`examples/jump-pack-lab/packs/` already contains:

- **generic:** all seven Discovery and four Delivery method entries, with outcome coverage, work-authority and evidence requirements;
- **software:** relevant code/context inspection, consequences and change planning;
- **marketing:** intent/claims classification, audience consequences, approach and artifact/action planning;
- **sales:** buyer-context planning and qualification/handoff requirements; drafting is not sending;
- **database:** additive data-context, ordering/preservation and verification constraints, rather than replacement methods.

These are explicitly **experimental JSON packs**, not finished standard skills. Reuse the substance, preserve the boundaries, and review their contracts rather than announcing five completed domain products. [S3]

MadeWell also already vendors interface-oriented skills, including accessibility, layout, typography, colors, writing and interface review. Treat these as domain methods or Rumen guidance—not more phases. Preserve vendor attribution/licenses if selected for distribution; presence in the repo is not permission to ship every vendor asset indiscriminately. [S13]

## 10. Effort across the rest of the map

**Settled product direction:** shipped Light processes are free defaults; managed Focused/Deep are paid options. **Only Brainstorm currently supplies the approved concrete recipes.** The following are proposed drafting directions for other base methods, not implemented presets or new approval requests. [S1:56–64, S6]

| Component | Light: useful free baseline | Focused: additional declared work | Deep: additional declared work |
|---|---|---|---|
| **Discovery** | Preserve every explicit intent and material constraint; derive coherent candidates with honest unknowns and dependencies. | Inspect consequential gaps, competing interpretations and dependency evidence. | Trace difficult outcome/constraint relationships into primary material; test the decomposition against concrete cases. |
| **Ideation** | Develop a grounded suitable approach for this task and name its main uncertainty. | Compare a material alternative and serious adverse case. | Investigate the decisive assumption with primary evidence or an explicitly authorized discriminating artifact. |
| **Planning** | Produce the smallest executable brief with scope, necessary inputs, conditions, evidence owners and recovery obligations. | Inspect affected consumers, sequencing, contingencies and proof availability more closely. | Resolve difficult dependencies and inspect concrete failure/recovery examples before freezing the brief. |
| **Implementation** | Carry out the accepted plan faithfully and retain actual results, failures and successor material. | When included in the accepted plan, preserve intermediate artifact checkpoints and observations along its critical path. | When included in the accepted plan, retain evidence through its specified difficult transformation or failure/recovery sequence; otherwise no distinct Deep recipe is established. |
| **Verification** | Obtain the evidence required for **every applicable acceptance condition** at the necessary rigor, or report failure/unknown. | Additional authorized adverse-case coverage beyond that required baseline. | Additional authorized interaction, recovery, stress or independent reproduction work where justified. |
| **Landing** | UNKNOWN until canonical contract is recovered. | Do not manufacture a recipe. | Do not manufacture a recipe. |

Choose additional implementation work while fixing the plan, not by changing an effort label during execution. If a method has no meaningful authored difference, do not offer a fictional deeper variant.

The implementation/verification rows need especially careful authoring: **Deep is not license to improvise, and Light is not discount correctness.** If safety, accessibility, recovery, a live check, or a condition requires substantial work, that obligation does not disappear on the free tier. Commercial usage limits and optional added scope must be explicit, not disguised as a weaker passing standard.

Keep these axes separate: starting context; ambition; method; composition; effort; answer length; provider reasoning; autonomy; work/data authorization; commercial entitlement. Record requested, authorized/effective and actually performed work distinctly. A short answer may reflect a deep investigation. [S6]

## 11. Recommended next work, in order

This is the **content sequence feeding v7 W2**, not a competing implementation plan or a request to spawn a fleet.

1. **Use this baseline as the vocabulary and boundary map.** Keep existing grammar and contribution identities; distinguish historical runtime vocabulary where it differs.
2. **Extract the Discovery pack first.** It has the most complete existing method/conservation material and defines what downstream work receives. Produce ordinary methods, supporting references, Light/deeper work recipes and scenario definitions—not new execution services.
3. **Extract the four Delivery methods next.** Preserve Ideation/Planning judgment, the fixed implementation brief, and independent verification. Reuse domain-neutral duties before adapting software-specific helpers.
4. **Extract shared guidance once.** Ground, Rumen, NQ, evidence ownership and continuity should not become divergent copies in every pack. Keep enforceable rules in code.
5. **Recover Landing content separately.** Its missing source does not block the preceding authoring. Do not redefine the component to avoid the gap.
6. **Bind selected domain methods deliberately.** Start with relevant existing generic/software material; use the other experimental packs as sources, not automatic products.
7. **Have the implementing agent wire these into the existing v7 workstreams.** Composition/bindings → saved non-executing handoffs → thin MCP/host surface → packed/host acceptance. No second runtime or store.
8. **Independently exercise the new methods and plumbing.** Real loaded instructions, multi-turn continuity, contribution conservation, missing-method refusal, effort differences, scoped access, retry/recovery, and actual target-host behavior. Defined scenarios, valid JSON, or a source push are not passes.

### Why this organization

| Lens | Expected gain | Cost / risk |
|---|---|---|
| **DX** | One resolver/handoff/service contract; existing methods and storage reused rather than rebuilt. | Separate portable definitions from legacy execution names/contracts carefully. |
| **UX** | One continuing piece of work, understandable component/method/effort choices, no repeated copying or hidden dispatch. | Progressive disclosure must keep the simple surface from concealing missing evidence. |
| **AX** | Exact scoped inputs, stable identities, clear output obligations, reusable answers and honest recovery. | Binding compatibility and evidence ownership require explicit validation. |

These are reasoned expectations, not measured multipliers or acceptance results.

### Questions that remain genuinely open

- **Content:** canonical Landing instructions/defaults, already v7 U2. Brainstorm content is supplied; do not ask for it again.
- **Release-dependent:** exact first client/topology; hosted identity/privacy/retention if hosted; distribution channel/product license.
- **Paid launch:** prices/terms, payment/account identity, usage policy and entitlement expiry/outage/in-flight behavior.

None prevents producing the Discovery and Delivery content from the inspected sources. No new question is needed to settle routine extraction, package structure or reuse choices. [S2:18, S6]

## 12. Source register and inspection limits

MadeWell links resolve within this repository; upstream skill links use the pinned public revision. Repository claims refer to the inspection baseline above, not a current remote deployment. This published copy retains the complete analysis; only publication framing and source/link locations have changed.

| Ref | Source |
|---|---|
| **S1** | [FOUNDATION.md](../../FOUNDATION.md): settled foundation and bedrock (5–64); durable contracts (66–95); task/input/function model (163–250); rubric (306–340); delivery and NQ (394–500). Historical sections remain subordinate to the governing correction. |
| **S2** | [v7/PLAN.md](../../v7/PLAN.md), complete; especially §§3, 7, 12, 15, 16 and 18. [v7/README.md](../../v7/README.md). |
| **S3** | [grammar.ts](../../src/grammar.ts):13–33; [autonomy-pack.ts](../../src/autonomy-pack.ts); [discovery-contract.ts](../../src/discovery-contract.ts):7–132,139–211; experimental [generic](../../examples/jump-pack-lab/packs/generic.json), [software](../../examples/jump-pack-lab/packs/software.json), [marketing](../../examples/jump-pack-lab/packs/marketing.json), [sales](../../examples/jump-pack-lab/packs/sales.json), [database](../../examples/jump-pack-lab/packs/database.json). |
| **S4** | [organs.ts](../../src/organs.ts):14–62; [rumen.ts](../../src/rumen.ts); [Ground/Rumen dossier](../../dossiers/2026-10-31-ground-rumen.md), distinguishing its current summary from historical detail. |
| **S5** | [lane.ts](../../src/lane.ts):9–112; [readiness.ts](../../src/readiness.ts):1–77. |
| **S6** | [Brainstorm README](../../brainstorm/README.md); [method map](../../brainstorm/skills/brainstorm/references/methods.md); [effort instructions](../../brainstorm/skills/brainstorm/references/effort.md); [effort/access design](../../brainstorm/EFFORT-AND-ACCESS.md). |
| **S7** | [jump-packs.ts](../../src/jump-packs.ts):7–80; [settings.ts](../../src/settings.ts):15–39. |
| **S8** | [ledger.ts](../../src/ledger.ts):15–41; [store.ts](../../src/store.ts):24–202; [functions.ts](../../src/functions.ts):18–49; [engine.ts](../../src/engine.ts):131–138; [acceptance-contract.ts](../../src/acceptance-contract.ts). |
| **S9** | [README.md](../../README.md):13–103; [qa.ts](../../src/qa.ts):23–46; [context-facts.ts](../../src/context-facts.ts):8–37. |
| **S10** | Source inventory of [nq-obligations.ts](../../src/nq-obligations.ts), [handoff-history.ts](../../src/handoff-history.ts), [work-boundary.ts](../../src/work-boundary.ts), with behavior described in S2/S9. |
| **S11** | [Reorientation](../../v7/REORIENTATION.md) and [delegated judgment](../../v7/DELEGATED-JUDGMENT.md). |
| **S12** | [Canonical skill library](https://github.com/jcbbge/agent-core-public/tree/9addbffae9d600f40dd334ad97bb24c6b0a0c7b7/primitives/skills/). Supporting-skill candidates above are descriptor/initial-instruction inventory, not a full audit or behavior evaluation. |
| **S13** | [Vendored interface-skill README](../../skills/vendor/jakubkrehel/README.md) and tracked file inventory. |

**Original assessment (before this dossier was published):** governing instructions/docs, complete v7 plan, selected code/contracts, example pack contents, Brainstorm method/effort material, supporting-skill descriptors, symbol navigation, revision and scoped source inventory. No application tests, real host round trips, model scenario runs, billing checks, live-store mutation, deployment, commit or push were performed for this assessment.

**Scope of the artifacts:** the Markdown is the explanatory baseline; JSON records typed concepts, source references and separate diagram views. Neither establishes a new product schema or a second work record. The ontology distinguishes the things an implementation must preserve; it does not dictate one storage object per concept.
