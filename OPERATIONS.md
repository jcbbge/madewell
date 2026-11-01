# Operating Made Well

Use this runbook to install, configure, drive, inspect and recover Made Well. It explains the operating procedure; [FOUNDATION.md](FOUNDATION.md) remains operator law.

## Enter with the right context

On a new session or context reset, read in this order:

1. [FOUNDATION.md](FOUNDATION.md), beginning with the governing model and mandatory organs.
2. [AGENTS.md](AGENTS.md), then this guide.
3. [README.md](README.md) for the selected runtime/API contract, and the task's actual source, saved context and relevant project instructions.
4. The applicable contract: [Ground and Rumen](dossiers/2026-10-31-ground-rumen.md), [three-legged rubric](dossiers/2026-10-24-three-legged-rubric.md), and [DESIGN.md](DESIGN.md) for display work.

An agent taking over reads `mw context <id>` before acting, then follows its evidence links. The task is durable; agents, calls and job worktrees are disposable. Accepted outputs, answers, holds and evidence stay on that task. Never rebuild a handoff by repeatedly copying prompts between agents or phases.

The operator supplies intent, selects work and owns intentional checkpoints and product judgment. A delegated execution agent acts only within its authority. The operator's observing agent reads and explains through the read surface; it does not promote, answer, retry or otherwise move work.

## Know what is being driven

The model is **capture raw input → generate tasks → complete tasks**. Its purpose is to remove manual context transfer while making each step’s completion, output and evidence inspectable. Notes, transcripts, documents and rough discussion are sufficient input. Discovery prepares useful intent and candidates; its output is a selection surface, not authorization to deliver every candidate.

The prescribed discovery labels and job IDs are:

| Display label | Job ID |
|---|---|
| `Declare()` | `declare` |
| `lookFirst()` | `look-first` |
| `classify()` | `classify` |
| `Lenses()` | `lenses` |
| `oneThing()` | `one-thing` |
| `route()` | `route` |
| `confirm()` | `discover` |

Every selected task owes ideation, planning, implementation and verification. These are obligations, not a requirement for seven discovery agents or four fresh agent calls for every small task. Domain-specific methods and completion conditions come from the task and configured pack.

For the software runtime, ideation uses `ideate` and `challenge`; `plan` produces the fixed brief; `implement` and `test-plan` run as parallel, blind makers; engine-owned `verify` runs the checks against the candidate. The test architect authors acceptance independently of the implementer. Neither maker sees the opposing maker's private work or awards its own acceptance. `arbitrate` diagnoses failures; it is not permission for implementation to redesign the plan.

Every agent handoff uses NQ: the receiver confirms understanding or identifies unclear, ambiguous or missing input; the sender clarifies. Reuse saved answers and answer IDs. Resolve decisions from context, then repository intent, then the three-legged rubric. Three answered turns with questions still open hold for a specification defect, including under `full` autonomy. Full autonomy does not expand authority or bypass evidence.

Apply the linked rubric to consequential choices: record DX, UX and AX gains, costs and reasons. Three hits support building with conviction; two permit proceeding; fewer require reshaping or stopping. Predictions remain predictions until measured or independently checked.

### Keep the three preparations distinct

| Contract | Purpose |
|---|---|
| `organPreparation` in producer output | Mandatory console-owned Ground, Rumen and usable preparation for every configured successor. |
| Discovery's `preparation` array | Domain promises between candidate tasks; preserve its identities and executable dependency edges. |
| Project `prepare` command | Makes each fresh software job worktree usable: dependencies, environment, resources and functional probes. |

New CLI/HTTP work pins the organ contract regardless of cartridge selection. Ground cites actual relevant material; Rumen accounts for selected fences, judgment, taste and vocabulary; each successor gets its brief and required references. Terminal producers explicitly have no successors. The console validates and saves receipts atomically and rechecks required material before consumption. Blocked partials do not claim readiness. Historical records without the pin remain readable with unknown evidence. See the organ dossier for canonical output, allowed references and legacy compatibility; fingerprints do not prove comprehension or executed acceptance.

## Install without coupling applications to the source checkout

Prerequisites are Node **24.15 or later**, plus Git and a POSIX shell/process environment for software delivery. Native Windows execution is not established by the local Mac/Linux checks. Install and authenticate the harnesses you will actually prescribe in the execution environment. Use their supported authentication procedures; do not put credentials in source, work input, context facts or prescriptions.

The following are templates. Replace every `/absolute/path/...`, `SELECTED_REF`, uppercase command placeholder and `<id>` with reviewed values before running anything. Use a disposable store for experiments; do not point examples at an existing operational store.

Acquire a source checkout at the intended revision. Do not assume the default branch contains a requested delivery; this delivery line is `feat/ground-rumen` until integrated elsewhere.

```sh
git clone https://github.com/jcbbge/madewell.git /absolute/path/madewell-source
cd /absolute/path/madewell-source
git switch --detach SELECTED_REF
npm ci
npm run bundle
npm run typecheck
node dist/mw.mjs
```

`SELECTED_REF` may be the reviewed commit or `origin/feat/ground-rumen`. The final command prints the generated JSON manual. Direct source execution (`node src/cli.ts`) needs the source checkout's dependencies; the built entrypoint is `node dist/mw.mjs`.

For a copy-only runtime, run `npm pack` after bundling, then unpack the returned archive into a versioned runtime directory. Preserve the complete package layout, including bundled UI, fonts, prescriptions and guidance. Run `node dist/mw.mjs` there, or invoke that file by absolute path from an application. No global installation or runtime link to another project's checkout or `node_modules` is required. Keep the previous runtime directory for rollback.

## Configure an isolated home before queueing

Choose persistent paths outside the application and outside the Made Well source checkout. The selected store's parent owns `projects.json`, items, live evidence and worktrees. `MW_STORE` overrides the default database path and determines those sibling paths. Job worktrees must also have no ancestor guidance files such as `AGENTS.md` or `CLAUDE.md`; otherwise unrelated law would be inherited and `worktree_root_unclean` refuses execution. Check the whole ancestor chain when choosing the location.

Copy the supplied `prescriptions.json` to your own configuration path and adapt it before starting work. Define this same environment in every terminal used for this store, including UI and runner terminals:

```sh
export MW_HOME=/absolute/path/neutral/madewell-home
export MW_STORE="$MW_HOME/madewell.db"
export MW_PRESCRIPTIONS=/absolute/path/your-prescriptions.json
mw() { node /absolute/path/runtime/dist/mw.mjs "$@"; }
mw
```

The shell function is only a convenience wrapper around the packed entrypoint. Preserve the same selected paths on restart; changing them selects different state rather than recovering the old task.

Prescriptions define tiers of cards `{harness, provider, account, model, effort}` and job mappings `{tier, access, budget}`. Choose currently available, authenticated combinations rather than treating the supplied model list as a universal prescription. Keep cards sharing a quota pool on the same `account`. In software delivery, `verify` is engine-owned and has a budget, not an agent card. Built-in harnesses and custom `harnesses` entries are described by the manual/source; extra credential variable names must be allowlisted through the harness or prescriptions `env`. Do not store secret values in that JSON. A usage limit swaps cards or waits for the earliest reset when all accounts are exhausted.

### Environment and adapter boundaries

| Variable | Meaning |
|---|---|
| `MW_HOME` | Default state directory; absent overrides, `~/.local/share/madewell`. |
| `MW_STORE` | Selected SQLite file; overrides `$MW_HOME/madewell.db` and determines sibling registry/worktree paths. |
| `MW_PRESCRIPTIONS` | Card/harness configuration file; defaults to the selected CLI package’s `prescriptions.json`. |
| `MW_AUTORUN` | `0` leaves queue driving explicit; otherwise authorized work-giving commands can wake a detached runner. |
| `MW_WORKER_COMMAND` | Optional trusted command adapter replacing built-in harness execution; see the distinct envelope below. |
| `MW_TELEMETRY` | Optional directory receiving machine/store JSONL evidence. |
| `MW_TELEMETRY_LEVEL` | `metrics` omits prose from that telemetry export; `full` includes it. This does not redact the SQLite record. |
| `MW_DEBUG` | `0` disables default Effect span-file logging, not durable work transitions or receipts. |
| `MW_UI_ORIGINS` | Comma-separated exact trusted browser origins; not a replacement for authentication on a public network. |

A `MW_WORKER_COMMAND` adapter receives a serialized `WorkerRequest` on stdin, including `kind`, `job`, `card`, `cwd`, `system` and the JSON-string `prompt`. It handles intake, execution, originator and repair calls using their supplied schemas. Return one `WorkerResult` on stdout: `{"ok":true,"output":"<phase JSON as a string>"}`, `{"ok":false,"error":"<failure>"}`, or `{"ok":false,"limit":{"account":"<quota pool>","resetsAt":null,"message":"<limit>"}}`. Optional `raw` and `version` are strings. Use stderr for logs. Malformed envelopes are failures, not completed work.

A function-pack command node’s `run` is a different boundary: it receives function input and returns its bare output object, not a `WorkerResult` wrapper. New successful phase output still owes `organPreparation` from its actual packet. Never conflate either adapter boundary with an accepted task result. Commands are trusted host code; retry-safe side effects and resource ownership remain their responsibility.

Before software work, inspect the actual application instructions, worktree state, current branch, upstream, preparation and delivery commands. Select the intended delivery branch, usually `main`, in that product checkout. The runtime records the branch actually checked out; it does not silently choose `main`.

Register configuration before `discover` or `start`:

```sh
mw cartridges --check builtin:grammar
mw init --workspace /absolute/path/product --cartridges builtin:grammar --autonomy checkpoints
mw cartridges --workspace /absolute/path/product
```

Add the real project settings with `mw init --workspace /absolute/path/product` and the applicable flags below. Omitted settings preserve existing registration; JSON `[]` removes an array setting. Registration lives in `projects.json` beside the selected store, not inside the application.

| Setting | Configuration and responsibility |
|---|---|
| `--prepare 'PROJECT_PREPARE_COMMAND'` | Runs in every fresh job worktree before the job. Use ignored files for generated environment/dependency material. |
| `--inputs '[{"id":"fixture","path":"fixtures/input.json","kind":"file","jobs":["verify"]}]'` | Declare real supplied file/directory/executable bindings. Relative paths stay within the prepared worktree; absolute paths are explicit host bindings. Use `input:fixture` in environment evidence. |
| `--gates '[{"id":"project-check","run":"PROJECT_GATE_COMMAND","glob":"*.ts"}]'` | Mechanical commands; `{files}` expands to surviving matched changed paths. Omit `glob` for a whole-project fence. |
| `--conventions '["ACTUAL_PROJECT_CONVENTION"]'` | Judgment constraints that planning must address or explain as inapplicable. |
| `--ship 'PROJECT_SHIP_COMMAND'` | The complete post-merge shipment procedure, including push when required and the actual release/live check. |
| `--alert 'PROJECT_ALERT_COMMAND'` | Optional once-per-hold notification; receives hold JSON on stdin. A nonzero exit is a recorded notification failure. |

`prepare` receives `MW_ITEM`, `MW_JOB`, `MW_NAME`, `MW_WORKTREE`, `MW_PROJECT` and `MW_BASE`. Its last JSON line may return `{"provisioned":[{"kind":"resource-kind","id":"resource-id","teardown":"TEARDOWN_COMMAND"}]}` for owned cleanup. Missing declared resources enter the receiving job's NQ exchange; availability alone does not prove the resource works. Do not modify supplied prepared inputs as implementation artifacts.

Shipping receives `MW_ITEM`, `MW_TITLE`, `MW_KIND` and `MW_COMMIT`; the command must perform and report the actual release/live check. Alert commands receive `MW_ITEM`, `MW_TITLE`, `MW_HOLD` and `MW_MESSAGE` as well as hold JSON on stdin.

Typed Rumen guidance is supported by the project registry as `rumen: [{id,kind:"judge"|"sign"|"lexicon",text,jobs?}]`; `mw init` has **no `--rumen` flag**. Review the registry schema before an authorized edit and preserve other entries. Mechanical fences remain in `gates`.

`builtin:grammar` selects `made-well-autonomy-lab` **1.3**, with discovery, acceptance and handoff contracts `1`. It includes all seven discovery obligations and four delivery phases and is opt-in. The installation default remains the compatibility software pack. Inspect pins with `mw cartridges --item <id>`: changing project configuration affects new work, not historical tasks. `mw init --cartridges default` removes that selection; only init treats `default` specially.

## Choose one execution mode

**Default CLI wake:** leave `MW_AUTORUN` unset. Work-giving commands wake a detached, one-shot `run` when eligible work exists and no runner owns the store. It writes `runner.log` beside the store and stops when work is finished or cannot move. This is not an installed service and does not use `--watch`. Do not issue `run` after every phase; saved outputs feed successors automatically.

**Explicitly requested foreground operation:** set `MW_AUTORUN=0` in every participating terminal, then start one foreground watcher once:

```sh
export MW_AUTORUN=0
mw run --watch
```

Keep that terminal open. Use the same home, store, prescriptions and autorun setting in the command/UI terminal. The watcher owns the store's runner claim and waits for newly queued work. Do not start a second runner. An existing lab launcher may set `MW_AUTORUN=0`; inspect that setting before assuming a browser submission will drive itself. Interrupting it ends that foreground execution; the saved work remains resumable. Install no service or schedule unless the operator separately authorizes what runs, when, what it may change and how to stop it.

**Standalone UI:** `mw ui` serves the view and explicit operator API, normally on `127.0.0.1:4747`; it is not the queue runner. It can coexist with the one runner. Operator submissions/answers can use the configured CLI wake; with `MW_AUTORUN=0`, the foreground watcher must already be driving the store. Keep remote exposure restricted and configure exact `MW_UI_ORIGINS` for trusted forwarding. Observing agents remain read-only even though the API accepts authorized operator actions.

## Capture, select and deliver

```sh
mw discover --workspace /absolute/path/product --source-file /absolute/path/notes.txt
mw status
mw context <discovery-id>
mw promote <discovery-id> <selected-candidate-id> <another-selected-id>
```

Use actual IDs returned from this store. Promotion with no candidate IDs selects **all** candidates; use that only when all are intentionally selected. `mw go <discovery-id>` also promotes every waiting candidate. Genuine prerequisites determine readiness; phases stay inside each task rather than becoming artificial tasks.

For one already selected task, `mw start --workspace /absolute/path/product --objective "What done means" --source-file /absolute/path/source.txt` enters delivery directly. Preserve the operator's exact source; do not substitute a reconstructed summary.

| Autonomy | Intentional stops |
|---|---|
| `checkpoints` (default) | After discovery for selection; before each software shipment. |
| `steps` | Those checkpoints and boundaries between delivery cartridges. |
| `full` | No routine checkpoints; authority, unavailable resources, failed acceptance and exhausted NQ can still hold. |

Project settings and explicit `--autonomy` overrides on `discover`/`start` are preserved. At an authorized checkpoint use `mw go <id>` to continue, or `mw answer <id> "What should change"` to steer. A human selection or shipment checkpoint is an intentional control, not a failed automation step.

Software delivery assembles the candidate, runs registered gates, commits and independently verifies it before bringing the passing commit onto the recorded branch. Verification must name the actual candidate and unchanged check definitions; changed tracked candidate material or HEAD during a check invalidates acceptance. Product-changing builds must finish before candidate verification. Gates retain corrections to the captured changed paths; the implementation must deliver required tracked generated files rather than relying on unstaged gate output outside that set. Tracked leftovers after the candidate commit fail its integrity check, before legitimate independent check files become the baseline. Ignored/untracked build output is permitted. Deletions still count for gate applicability; no matching surviving file arguments means explicit not-applicable evidence, not a fabricated execution pass.

After merge, a configured `project.ship` **replaces** the default push; it must push itself if that is part of delivery. Without it, Made Well pushes the recorded branch to its configured upstream. Without either ship command or upstream, the saved shipment means local delivery only. Report implemented, verified, merged, pushed, released and presently live as distinct facts; a historical green shipment cannot prove the current deployment.

## Inspect evidence and recover the same work

Commands print JSON; errors carry factual context and `next` commands. Start with the advertised next owner and authority, not a guessed mutation.

| Need | Read surface |
|---|---|
| Next action / board / holds | `mw next`, `mw status`, `mw status <id>`, `mw holds` |
| Compact handoff / complete record | `mw context <id>`, `mw show <id>` |
| Outcome / diagnostics / full tree | `mw trace <id> --lens ux`, `--lens dx`, `--lens ax` |
| Follow events | `mw watch`; resume the event feed: `mw watch --since <event-seq>`; snapshot: `mw watch --once` |
| Browser / offline view | `mw ui`, `mw replay --out /absolute/path/replay.html` |
| Exact forensic evidence | `mw export <id> --out /absolute/path/export-directory` |
| Standing nonsecret facts | `mw context-fact <id>` |

UX, DX and AX are projections of one trace, not separate state or schedulers. Missing usage and inaccessible internals are unknown, never zero or invented. Live signals are diagnostic evidence; they do not automatically interrupt, repair or steer work. Exported `artifacts/history.json` describes both maker histories; available bytes are at `artifacts/<sha256>.patch` relative to the export root. Historical bytes establish neither compatible continuation nor authority to apply them.

Only an authorized operator or explicitly delegated agent writes standing facts with `mw context-fact <id> --input-file /absolute/path/fact-command.json`. Follow the generated `ContextFactCommand` schema: explicit request identity, revision, source, audience, scope and nonsecret declaration. Keep the same body/request ID on an uncertain retry. Facts are trusted local declarations, not authentication, secret storage or automatic permission. Revocation/expiry and maker provenance still constrain visibility; never copy private maker material into the other maker's context.

| Situation | Recovery |
|---|---|
| Runner stopped, saved work can move | Inspect ownership, then resume with `mw run` or the explicitly chosen watcher. Earlier accepted work is retained. |
| `store_locked` / live owner | Inspect status and wait for its quiet boundary; do not kill healthy work to obtain the claim. |
| Open questions or authority checkpoint | The authorized owner answers through the existing surface; retry cannot substitute for the answer. |
| Failed check | Inspect exact evidence; an authorized `mw answer <id> "Diagnosis" --cause <cause>` supplies the actual cause. Choose `implementation`, `test` or `pre-existing` from the evidence. |
| Missing environment/input | Correct the registered preparation/binding or resource, then follow the item's advertised retry/answer path. |
| Eligible unmerged technical hold needing a new plan | `mw retry <id> --replan "Specific nonblank reason"`; this preserves history on the same task and resets active planning onward. It does not bypass NQ or checkpoints. |
| Retryable failure / post-merge shipment failure | Fix the cause, then `mw retry <id>`; do not create a replacement task or replan already merged work. |
| Work intentionally abandoned | Authorized `mw drop <id>` keeps the record and tears down owned resources; the command acquires an exclusive runner claim, so stop a watcher or wait for the current runner to finish before dropping it. |

Partial artifacts remain evidence. A changed plan starts clean unless planning explicitly authorizes compatible role-specific continuation. A technical reset prevents pre-reset artifacts from being restored as continuation, while retaining history for reference. Never edit task rows or mark an output accepted to manufacture recovery. Do not prune records or remove their workspaces while they are still needed for review.

## Use the foreground examples deliberately

Examples are **source-checkout tools**, separate from installed onboarding. The Switch demo uses `GRAMMAR_PACK` (`made-well-grammar-demo` **1**), not installed `builtin:grammar` 1.3. Its sandbox shipment exports a local release; it is not a production deployment.

Use a separate example shell with inherited `MW_STORE` unset: the demo selects its own neutral home/store, while an inherited store path would redirect job worktrees. Choose a new demo root and authenticated prescriptions. To execute the root created by init, keep `serve` stopped:

```sh
npm run demo -- init --root /absolute/path/new-demo --prescriptions /absolute/path/your-prescriptions.json
npm run demo -- run --root /absolute/path/new-demo
npm run demo -- status --root /absolute/path/new-demo
```

Alternatively, after initialization start `npm run demo -- serve --root /absolute/path/new-demo --port 4758`, then submit raw input and select tasks through that browser. The server owns a foreground queue for browser-wake-selected roots and linked work, resuming those selections after restart. It does not automatically select the unrelated init-created root. Never run CLI `run` concurrently against that store to execute it. Stop the server before switching to the CLI-driven path. Preserve `demo.json` and its separately located neutral home for recovery; do not reinitialize an existing root.

The jump-pack lab builds on that demo configuration. Follow `examples/jump-pack-lab/README.md` in the source checkout, keep structural/scripted tests separate from real inference, and preserve failed cases. Example results do not establish provider interchangeability, semantic quality, measured savings or live application acceptance.

## Maintain, verify and extend

For a source change, use an authorized work branch rather than the detached build checkout. Inspect the current diff and remote, stage only your own paths, and follow AGENTS.md for commit authority; an explicit request to commit/push authorizes that delivery. Publish the approved branch after its checks pass. Never force-push or fold an independently frozen lab history into upstream main by assumption. Read the affected contract and consumers first, then build before CLI checks. Independent verification chooses affected test files/name selections and relevant typechecking. A useful selection for discovery-to-delivery contract work is:

```sh
npm run bundle
node --test test/discovery-organs.test.ts test/pipeline-delivery.test.ts test/verification-integrity.test.ts test/context-facts.test.ts
npm run typecheck
```

These four files cover discovery/organ coexistence, the strict pipeline through local shipment, candidate integrity and standing-context provenance. Select additional tests when the change affects their consumers. `npm test` has a pretest bundle and runs the entire suite; it is not the per-change default. Scripted workers prove machinery behavior, real inference evaluates model behavior, browser/API checks prove their exercised flow, and an application's own live check proves present operation. Report executed, failed, skipped, not applicable and unknown separately.

Before backup or rollback, stop all writers, including the runner and any UI accepting operator input. Preserve the selected store directory as a coherent whole, including SQLite sidecars, registry, item artifacts and live evidence, plus the chosen prescriptions, runtime revision and application commits. If prescriptions live elsewhere, copy them separately. An export/replay is useful evidence, not a replacement for the complete operational backup. Protect backups as sensitively as their recorded project content.

For update, build/pack and independently check a new revision in isolation, then retain it beside the previous runtime. The runner notices replacement of its executable or SIGHUP, drains in-flight steps and re-executes while retaining its claim. A switch to a different versioned path needs a controlled foreground stop/start with the same environment; changing a wrapper alone does not redirect an already running executable. For rollback, keep an untouched pre-update backup, stop writers, preserve the current state and reconcile intervening deliveries before restoring compatible runtime/state together. No automatic reverse migration or deployment rollback is promised; perform the application's own release recovery and live check.

Extension seams are explicit: prescriptions supply cards/harness recipes; project registration supplies preparation/inputs/gates/conventions/Rumen/ship; packs supply configured functions. Validate with `mw cartridges --check <selector-or-file>` before selection. Function-pack `--update` applies only at saved boundaries and preserves accepted/attempted nodes; it is not a software-pack live update. Advisory decision providers and trace renderers do not gain scheduler or acceptance authority.

Source map below is for a **source checkout only**; these paths are not promised inside the packed runtime:

| Source | Responsibility |
|---|---|
| `src/cli.ts`, `src/api.ts`, `src/ui.ts` | Generated manual, compact context, explicit operator input, UI/API and wake. |
| `src/store.ts`, `src/engine.ts` | Durable transitions, receipts, runner ownership, NQ, redrive and shipment. |
| `src/project.ts`, `src/prerequisites.ts`, `src/workspace.ts`, `src/change.ts` | Registry, preparation, inputs, isolation, artifacts, gates and candidate integration. |
| `src/grammar.ts`, `src/autonomy-pack.ts`, `src/pack-selection.ts`, `src/lane.ts`, `src/functions.ts` | Grammar, built-in selection, software/function contracts and boundary updates. |
| `src/organs.ts`, `src/rumen.ts`, `src/discovery-contract.ts`, `src/acceptance-contract.ts`, `src/context-facts.ts` | Producer obligations, discovery identities, evidence ownership and fact provenance. |
| `src/cards.ts`, `src/harness.ts`, `src/worker.ts`, `src/trace.ts`, `src/export.ts` | Execution recipes/transport, evidence lenses and exact exports. |
| `test/`, `examples/switch-demo/`, `examples/jump-pack-lab/` | Independent acceptance and separately labelled experiments. |
