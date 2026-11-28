# Operating Made Well

This guide describes the current ledger/runtime implementation, not dependencies required by the portable grammar. [Settled foundation](FOUNDATION.md#settled-foundation-operationalize-the-established-grammar) governs: the process works; operationalize its established chain without revalidating it or imposing this runtime on every consumer.

Read FOUNDATION.md, AGENTS.md and this guide on entry. The durable object is a work item; the configured pack supplies its methods. The model is capture input → generate tasks → complete tasks. An observing agent reads and explains; intentional operator input moves work through supported commands/API.

The [Brainstorm seed](brainstorm/README.md) and [commercial effort notes](brainstorm/EFFORT-AND-ACCESS.md) supply approved content and product direction, not active billing. Never pass `pack-design.json` to the legacy runtime as an executable cartridge.

The [method-library dossier](dossiers/method-library/README.md) supplies the complete analysis and content assignment. Its `ontology.json` is analysis, not runtime configuration. The [source-binding examples](examples/method-library/README.md) map the shipped canonical Discovery/Delivery defaults and separate outer Landing, with explicit local overrides through the resolver and portable-work handoffs. Canonical content is pinned with provenance and upstream notices; its availability does not establish native-host activation or independent business completion.

## Local product MCP operations

Run `node /absolute/package/dist/mcp.mjs --root /absolute/project --store /absolute/selected/madewell.db` for local stdio Brainstorm. Effect owns the product service and resource lifecycle; the official SDK owns the protocol boundary. Source development uses `node src/mcp.ts` with the same flags. Use only disposable stores in acceptance. Mutations use the explicitly selected store; reads do not initialize it, and no operation launches a runner or provider. The current integration grants local Light preparation/recording, not paid activation, hosting, native Skills/Events or execution.

The five stable tools are catalog, capture, inspect, prepare and record with the `_brainstorm` suffix. Capture a rough source; prepare using its saved revision and logical request identity; record the attributed result against that handoff; prepare again to carry earlier decisions and complete results forward. Save the returned `itemId`, `revision`, `handoff.id` and request IDs rather than reconstructing them from the latest library. Lost responses are recovered by retrying the same logical request, not changing its ID. Exact source and selected method bytes stay pinned across restart and library changes. The default pair is `brainstorm` plus `ambitious-collaboration`; specialists are explicitly selected. Focused/Deep return an explicit managed-access refusal rather than silently changing effort.

The same server separately exposes `capture_work`, `inspect_work`, `prepare_work`, `exchange_work`, `record_work`, `preview_work`, `promote_work` and `replace_work` for explicit portable selections. Read the [bounded portable-work contract](README.md#explicit-portable-work-handoffs): sequential continuity through declared recursive predecessor wiring, lossless pinned packages and durable NQ exchanges, not automatic execution or authenticated private-track orchestration. Recognized Discovery contracts require their ordered predecessor prefix within each lineage; repeated independent chains are supported. Unsupported wiring or missing predecessor input fails visibly. Prepared handoffs supply contribution schemas outside the ordinary skill bodies; natural artifacts remain natural text. Confirmation creates candidates; promotion selects exactly explicit IDs/current revisions and leaves tasks external, without adding prerequisites or dispatching work. Future replacement never rewrites prepared material. Receipt recovery uses the original ID/body even after pruning.

Product protocol stdout contains JSON-RPC only. Local telemetry uses stderr or an explicit absolute `--telemetry-file`, never an inherited remote exporter. Treat traces and saved work as confidential. The designated non-maker executes `npm run --silent smoke:mcp:product` and the fixture control `npm run --silent smoke:mcp`, with the applicable scoped tests, bundle and typecheck. Actual SDK/Inspector stdio acceptance does not establish named native-client compatibility. [Product contract](README.md#local-brainstorm-mcp-server) documents inputs and retained evidence.

Optional `--skills` attaches the SDK's experimental Beta Skills adapter over the approved shipped Brainstorm runtime bytes only; it does not scan the project or serve proposed upstream methods. Metadata/manifests come from `skills/list`/`skills/get`, bytes from `resources/read`. The ordinary files and fourteen core tools remain the fallback. The host owns activation, changed-manifest reapproval and separate nested consent; the server grants no authority. Restart to acquire fresh approved bytes. SDK `serveStdio` handles legacy and modern protocol openings; user-work resources stay private with zero-TTL cache hints. Valid `_meta.traceparent` carries trace identity only, not baggage/private context or permission to export remotely. [Compatibility and limits](README.md#protocol-compatibility-and-optional-skills) are explicit; no native-host certification, Events/Tasks or hosted service is implied.

## Inspect portable methods without touching work

Use `mw cartridges --inspect --root /absolute/project [--component /discovery]` to inspect a local portable composition. This path opens no Store and needs no prescriptions, runner, registration or credentials. Optional `.madewell/config.json` supplies ordinary skill bindings; `--config` selects another file and `--override` adds a final layer, both relative to the explicit root. Do not mix inspection flags with check/update/work actions.

Read `complete` and `diagnostics` together: the shipped Brainstorm pair, seven Discovery methods, four Delivery responsibilities and separate outer Landing are available by default. Availability is not execution or completed work. Selecting a resolved subtree can succeed independently; unavailable explicit overrides fail rather than silently falling back. [Portable composition documentation](README.md#inspect-portable-compositions-and-local-skills) defines configuration v1, nominal contract matching, nested replacements, precedence and author examples.

Only the granted root and selected package material are read. No scripts or tool requests execute. Symlinks, special files, escaping paths, unsupported fields, contradictory constraints and unreadable explicit overrides fail visibly. `portable_stale` requires reviewing changed package bytes and explicitly selecting again, not silently trusting an old identity. Supporting reads use retained manifests; ordinary skill validity is not evidence of runtime activation or semantic correctness.

The CLI inspection path remains read-only; the separate product MCP service above supplies durable Light handoffs and explicit external-only selection. Neither path implicitly promotes or executes work, or grants hosting, publication or deployment. Existing executable packs, settings and historical work retain their contracts. Local inspection snapshots alone are not durable receipts.

For local development only, [MCP tooling](README.md#local-mcp-development-tooling-not-a-product-server) wraps this same resolver in a separate stdio fixture with explicit local request instrumentation. `npm run --silent smoke:mcp` remains its JSON acceptance entrypoint. The fixture and Inspector are development tools, not the product adapter; no live Store, provider, collector or hosted service is needed for its control checks.

## Identify the runtime

Record the actual executable path/revision, selected MW_HOME/MW_STORE, MW_PRESCRIPTIONS and runner owner before operational changes. Use the current invocation environment and `mw status`, `mw context <id>`, `mw settings`, `mw migrate --status`; never infer paths from another lab. Source execution and packed runtime differ. Node 24.15 or later and the existing dependencies are required; ordinary ledger use requires no repository tool or model credentials. Harness authentication is required only for scheduled agent work. Do not put credentials in work input or prescriptions.

An installed runtime preserves dist/mw.mjs, dist/gazette.html, prescriptions, local fonts/licenses and guidance. Made Well's verification owner builds with `npm run bundle`, runs affected checks and typecheck, then packs the accepted runtime. Keep a previous version for rollback. The implementer may run `npm run bundle` solely when the fixed brief requires generated product artifacts, and includes the generated tracked files in its change. Neither maker runs tests, typechecks, acceptance or verification commands, nor commits, branches or pushes; Made Well owns candidate build/check acceptance and delivery. Do not hand-edit dist. Source invocation uses `node src/cli.ts`; installed invocation uses `node /absolute/runtime/dist/mw.mjs`.

## Select durable state

```sh
export MW_HOME=/absolute/neutral/work-home
export MW_STORE="$MW_HOME/madewell.db"
export MW_PRESCRIPTIONS=/absolute/prescriptions.json
export MW_AUTORUN=0
mw() { node /absolute/runtime/dist/mw.mjs "$@"; }
mw settings
```

The Store parent contains items, scratch and invocation evidence. Keep persistent destinations outside scratch/live/per-call roots; no overlapping roots. Preserve the selected paths on restart. Read commands use a read-only Store and do not initialize a missing installation. A new write creates storage normally. `mw init` is retired and writes nothing; configure with settings.

Settings writes use a file `{requestId,revision,settings}`. Omitted fields keep values; null/[] clear them. Defaults are checkpoints, general discovery, no delivery pack, no alert, empty bindings/destinations/conventions/Rumen. Explicit values override inherited discovery, then installation; new items pin resolved settings and full packs. File selectors resolve relative to the caller; input/destination paths and alert cwd must be absolute. `builtin:grammar` pins made-well-autonomy-lab 2. Historical pins are inspectable, never silently upgraded.

Prescriptions retain configured tiers/cards/accounts/models and optional named job overrides. Validate only scheduled agent jobs. `parallel:'resources'` is default: sample host/cgroup memory, CPU pressure/load and disk before each launch, retaining 10% RAM (at least 512MiB), 20GiB disk floor and existing CPU thresholds. Record resource-wait/resource-admitted on the item, resample after yielding and wait even with no active items. Positive explicit count limits remain supported. Resource waits never kill active work. Usage limits swap cards or wait for the earliest reset; they do not ask the operator to solve quota.

MW_WORKER_COMMAND is a trusted adapter receiving WorkerRequest on stdin; return WorkerResult `{ok:true,output:'<phase JSON>'}` or a failure/limit envelope. Bare trusted cartridge commands instead receive function input and return a bare object. Never confuse either with completion evidence. Command stderr stays evidence. Native harness environment is allowlisted; packets carry only granted bindings/received outputs.

## Capture and complete work

```sh
mw start --objective 'Prepare a workshop brief' --source-file notes.txt
mw discover --source-file notes.txt
mw context 1
mw promote 1 2
mw progress 2 --input-file progress.json
mw block 2 --input-file blocker.json
mw unblock 2 --input-file resolution.json
mw complete 2 --input-file completion.json
mw answer 2 'The recorded answer' --cause implementation
mw stats --dir /absolute/telemetry
```

Source remains exact. Identical unkeyed captures are distinct; use --request-id for retry identity. A key reused with different validated input refuses request_id_conflict; identical replay returns its original receipt even after restart/default changes/pruning. All work mutations use revision CAS and atomic event/receipt writes. Preserve rejected drafts. HTTP keys are 16–128 identifier characters.

`mw answer <id> <text...> [--cause implementation|test|pre-existing]` accepts an unkeyed positional answer. For a keyed answer use `mw answer <id> --input-file <file>` with requestId, revision, text and optional cause; positional text and --input-file cannot be combined. `mw stats [--dir <directory>]` reads telemetry `.jsonl` files from --dir or MW_TELEMETRY and reports metrics per host and store.

Every lifecycle input includes requestId/revision/actor. Progress supplies remaining/nextAction/owner; block names id/reason/owner/nextAction; unblock names blockerId/resolution. Completion supplies non-null result and evidence exactly covering current conditions once, optionally declared file references. It is an attributed assertion on quiescent, unblocked external work with completed prerequisites, not an automated verification claim. Dropped work never satisfies dependencies. `mw drop` changes only its target.

General discovery has seven obligations. Candidate conditions and earlier-position dependencies are published atomically with organ receipts and the discovery completion event. Selecting a candidate preserves parent source/settings/answers. Without a delivery pack it stays external and never wakes the runner. No project selection or location is required.

`mw ui --host 127.0.0.1 --port 4747` serves Work plus Grammar, Manual QA, console and Gazette read lenses. Browser writes use the guarded versioned API. Configure exact trusted proxy origins in MW_UI_ORIGINS; preserve Host/Origin/CSRF/body limits. Pending browser requests retain their exact ID/body and original revision across reload. Conflict review precedes a new submission. Readers never fetch file results or move work. Manual QA anchors by workItem and case/run IDs; retest creation and link submission remain separate explicit requests.

## Drive configured automation

`mw run [--watch]` drives eligible cartridges using pinned execution-2 contracts; external open work is inert. Default CLI wake is a one-shot driver when enabled; MW_AUTORUN=0 keeps driving explicit. Foreground browser demonstration driving selects only operator-chosen roots and linked work. Unrelated examples remain untouched. This wiring installs no always-on service.

Each leaf requires explicit replay policy and destination grants. Scratch is acquired/released per invocation, and process groups stop on success/failure/interruption. Outputs/files are observed before cleanup. Ground/Rumen and usable successor preparation are mandatory; missing material or blocked partials do not count as acceptance. Job names grant no special behavior. Use `mw trace <id> --lens ax` for exact execution and superseded attempts; UX/DX stay read projections of the same record.

Safe correction rewinds preserve history/answers and increment bounded track counters. Explicit or writing leaves cannot be rewound. `mw retry <id>` releases function failure/exhaustion for one attempt without resetting counters. Lost explicit execution holds execution_uncertain; use `mw resolve-execution <id> --input-file file` with exact invocation/revision and either replay plus authorizeReplay:true, or external without it. Retry/go/answer/unblock cannot bypass this hold. Saved returns are consumed instead of repeated. Reconfigure only quiescent work with `mw configure-work`; legacy commands are never adopted. Unattended cartridge work requires pinned alert run/cwd. Alert attempts record missing/failed/uncertain outcomes and uncertain ones are not automatically resent. Resource teardown includes cwd; historical obligations remain inert.

## Installed cutover and recovery

The rollout owner performs these steps after candidate acceptance. Isolated migration evidence is not proof that the installed registry was removed.

1. Discover the actual current runtime, MW_HOME/MW_STORE, prescriptions and runner owner through read surfaces. Record `mw status`, `mw settings`, `mw migrate --status` and the selected runtime revision on item #14 through its supported evidence/lifecycle interface. Do not substitute a guessed lab path.
2. Stop that runner and all older writers through their real process/service boundaries. Confirm ownership is released through status. The --writers-stopped flag is an explicit attestation, not a writer detector. Readers may remain available. Do not edit SQLite or force a claim by changing rows.
3. Keep a rollback copy of the entire selected home and runtime while writers are stopped, including SQLite companions, exact registry bytes, item/artifact/evidence files, settings and prescriptions. Protect that copy from old writers. Do not delete any registered directory.
4. Install the accepted packed runtime into a separate versioned directory. Point this selected invocation at it and retain the prior runtime path. Do not start a writer yet.
5. Run `mw migrate --preview`. Save its exact token, ordered item inventory, registry hash/size/diagnostics, runner and cutoverRequired. Preview is read-only and does not visit registered directories. Investigate diagnostics before attesting; do not normalize or hand-edit the registry.
6. Run `mw migrate --apply <token> --writers-stopped`. Keep the exact JSON receipt. Apply snapshots raw documents and registry bytes, migrates inert records, removes only the snapshotted regular projects.json, fsyncs its parent and completes the journal. No old prepare/delivery/teardown command runs. Successful legacy work is labelled historical; unfinished work holds legacy_execution.
7. Run `mw migrate --status`; retain its receipt and compare to apply's result. Confirm registry absence, unchanged item IDs/history/relationships, retained QA/artifacts and honest unfinished holds through read surfaces. A missing original registry is recorded rather than fabricated. Record these actual outputs on #14. No maker report or isolated fixture replaces this rollout receipt.
8. Re-enable writers only on the accepted runtime and selected store. Explicitly configure unfinished historical work when ready; never replay old commands by implication. Observe the first intended task through context/trace.

If apply fails or is interrupted, leave older writers stopped. Read `--status`, retain the token and redrive the same `--apply` command. Durable phases are snapshot-saved, items-saved, registry-removed, complete; unlink-before-phase interruption is resumable. Changed/reappeared bytes or symlinks give migration_conflict; do not delete them manually to hide the conflict. A stale token requires a fresh preview/review; a different token against unfinished migration refuses. Matching completed-token apply returns its saved receipt without duplicate task events.

An unfinished journal gates ordinary mutations with migration_in_progress; a required cutover gates them with migration_required. Reads stay available. Missing attestation and live-owner refusals write nothing. Outcomes after successful claim permit only unchanged runner ownership bookkeeping/events and the sqlite_sequence events counter advance those inserts cause; no domain/registry/file mutation. See README for the exact contract and injectable MigrationControl boundaries.

Rollback requires stopped writers, the saved pre-cutover home and prior runtime together. Never point the older runtime at partially migrated state. Restore the reviewed backup through the installation's real file/process boundaries, retain the failed migration evidence separately under rollout ownership, and record what was restored before re-enabling writes. Once new work has been accepted, do not overwrite it with an old backup; return through the existing incident/contingency path.

A context fact needed during an NQ exchange must list both the receiver job and the originator job in jobs; contextFactsFor (src/context-facts.ts) admits a fact only when both are present.

## Evidence, extensions and retention

`mw export <id> --out directory` retains calls, results, observations and historical artifact descriptors/exact available bytes. `mw replay` produces a saved read view. Neither fetches external references or synthesizes verification. `mw eval` uses compatible execution-2 safe nodes and declared inputs in fresh scratch; missing legacy context is unavailable, and side effects require separate authority/isolated destinations. OTLP exports only actual finished spans; inaccessible tools/usage stay unknown. Observations and signals do not retry or repair work.

Prune finished work only through `mw prune --before ISO [--dry-run]`; QA anchor retention is rechecked atomically before file deletion. Permanent operator/QA receipts survive pruning. Source tests use scripted workers and temporary plain directories. Made Well's verification builds first, runs affected test/name selections and relevant typecheck, and records exact commands/results/unverified boundaries. Do not claim a whole suite, browser acceptance, measured speedup or installation activation without its actual evidence.
