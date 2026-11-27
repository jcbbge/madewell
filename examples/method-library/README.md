# Method-library source bindings

These examples demonstrate explicit local bindings through the version-1 composition resolver. The seven Discovery and four Delivery leaf methods are also shipped defaults: select `/discovery` or `/delivery` without a config to use them. The same selection can be pinned through the product MCP server's `capture_work` operation and continued with non-executing `prepare_work`/`record_work`. Neither default selection nor these examples activates a host's native skills.

## Source custody

The cloud assignment is [HANDOFF.md](../../dossiers/method-library/HANDOFF.md); the complete dossier is [ANALYSIS.md](../../dossiers/method-library/ANALYSIS.md). Both arrived in MadeWell [95b2e6e](https://github.com/jcbbge/madewell/commit/95b2e6e0835f6523b1fe6afa67e60cad4d6f4e41).

Reusable bodies are canonical in [agent-core-public](https://github.com/jcbbge/agent-core-public), below `primitives/skills/`. The selected unmodified snapshot lives in [skills/method-library](../../skills/method-library/); its [PROVENANCE.json](../../skills/method-library/PROVENANCE.json) records the actual published revision, original source paths, sizes, SHA-256 hashes and Git blobs, including the applicable MIT notice. The older baseline `9addbffae9d600f40dd334ad97bb24c6b0a0c7b7` does not contain these methods. MadeWell owns bindings and deliberate snapshot refreshes, not a second canonical fork. Existing Brainstorm bytes and provenance remain unchanged.

The original method bodies retain their source-proposal status wording byte-for-byte. Publication of those sources is not a claim that every behavioral assertion or host integration has passed. Retained model grading is **93 PASS / 10 UNKNOWN** across 103 assertions; source/structural checks, local runtime acceptance and real native-host certification remain separate evidence scopes. Do not silently edit a snapshot to remove those limits.

| Component/method | Canonical upstream directory | Existing behavioral source |
| --- | --- | --- |
| Work | `madewell-working` | Foundation settled grammar; v7 reorientation/delegated judgment |
| Discovery entry | `madewell-discovering` | `src/grammar.ts`, `src/autonomy-pack.ts` |
| Declare | `madewell-declaring-intent` | `declare` duty and intent/evidence contract |
| lookFirst | `madewell-looking-first` | `look-first` duty and observation contract |
| classify | `madewell-classifying` | `classify` duty; intent-to-requirement/disposition conservation |
| Lenses | `madewell-applying-lenses` | `lenses` duty; supplied DX/UX/AX rubric |
| oneThing | `madewell-shaping-candidates` | `one-thing` duty; candidate/artifact/requirement identities |
| route | `madewell-routing` | `route` duty; prerequisite/preparation identities |
| confirm | `madewell-confirming` | Historical job `discover`; accepted candidate/condition/reference conservation |
| Delivery entry | `madewell-delivering` | Four duties in `src/autonomy-pack.ts`; generic experimental pack |
| Ideation | `madewell-ideating` | Grounded task-specific approach duty |
| Planning | `madewell-planning` | Fixed brief, current conditions, evidence ownership/availability |
| Implementation | `madewell-implementing` | Fixed-plan action, artifact and partial-result reporting |
| Verification | `madewell-verifying` | Actual independent evidence against current conditions |

Shared Ground/Rumen/NQ/judgment/evidence/continuity detail belongs to the Work package's package-relative references; each selected method retains essential standalone boundaries. No skill reads sibling packages implicitly. `src/discovery-contract.ts`, `src/organs.ts`, `src/rumen.ts` and `src/acceptance-contract.ts` remain MadeWell's enforcement sources, not copied public application implementations. Method semantics come from those contracts and `examples/jump-pack-lab/packs/generic.json`; ordinary instructions do not require proprietary output JSON.

## Exercise an explicit source selection

No fixture or project config is required to use the shipped defaults. To exercise a deliberate local override instead, place `discovery.json` and `delivery.json` at a disposable fixture's root. Copy only the corresponding directories from `skills/method-library/` under that fixture's `skills/`, with complete selected supporting files and the applicable upstream license notice. This is an explicit local copy, not a new canonical fork. For example, `skills/madewell-classifying/SKILL.md` is relative to the directory containing `discovery.json`. The Work/Discovery/Delivery entry guides can likewise be read as ordinary skills outside MadeWell, or copied and explicitly bound under suitable nominal contracts; they do not require a running service or the whole library.

The non-maker verifier invokes the actual source or packed executable with an absolute fixture root:

```sh
mw cartridges --inspect --root /absolute/disposable-fixture --config discovery.json --component /discovery
mw cartridges --inspect --root /absolute/disposable-fixture --config delivery.json --component /delivery
```

`discovery.json` replaces seven leaf methods; `delivery.json` replaces four. Unmentioned branches retain their existing defaults. A missing explicit package is a visible error, never a fallback. Input/output strings are the current resolver's nominal compatibility declarations; they are not a JSON Schema validator or proof that a method fulfilled its semantics. The `confirm` occurrence retains its existing output contract even though its historical internal job name is `discover`.

Inspection returns selected exact instruction text, package identities and manifests. It does not run a method, persist a handoff, select candidates, execute scripts, authorize paid effort, or certify any scenario. Durable use is a separate explicit mutation: `capture_work` accepts `component:"/discovery"` or `component:"/delivery"` alongside `requestId`, `actor` and exact `source`. Add `config:"discovery.json"` or `config:"delivery.json"` only for the corresponding explicit local override. Prepare/record retain selected bytes and contributions without invoking a performer. Discovery confirmation creates candidates; separate preview/promotion selects exactly explicit IDs as external work, never executing them. See the [portable-work API contract](../../README.md#explicit-portable-work-handoffs). Ordinary skills can be read and applied independently by an authorized chosen assistant. Authored deeper recipes do not create a managed entitlement service; required free correctness/evidence remains unconditional.

## Landing inventory and remaining integration

At `95b2e6e`, the tracked path inventory, settled foundation, complete v7 plan, Brainstorm source, method-library dossier, existing default packs and selected upstream skill inventory supply no canonical Landing method body. The documents explicitly preserve that gap. This is bounded source inventory, not a claim about private or uninspected sources.

**U2 remains:** Where are Josh's canonical landing method instructions/supporting assets, and which are the intended shipped defaults? The content lead owns obtaining that source through the assigning conversation. No Landing package or successful placeholder is created, and Landing is not redefined as deployment, cleanup or completion.

Source structure, source review, model behavior, resolver consumption, durable product handoffs, packed runtime, native-host support and live release have distinct acceptance. The retained Light milestone alone does not accept these new methods. These JSON files are bindings, not evidence of execution. Source publication does not select a product distribution license, publish an npm package, install a native host, activate billing or authorize production actions. No Landing method is supplied.
