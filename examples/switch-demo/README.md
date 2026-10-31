# Made Well × Switch branch experiment

This demo uses the real Made Well engine, SQLite work record, NQ, prescribed harnesses, independent makers, shell checks and local shipping. It is not a simulated dashboard. The opt-in pack records all seven discovery functions, followed by all four delivery phases for every task. The test architect remains independent of implementation.

The experiment keeps discovery context available to the responsible thinking roles, derives visible progress from recorded evidence, binds verification to the candidate and check definitions, and tests recovery without erasing valid work. Switch selects which saved evidence to inspect; it has no authority to move or accept work.

## Run

From this checkout, install dependencies with `npm ci`, then initialize a new isolated demo. Existing roots are never reset.

```sh
npm run demo -- init --prescriptions /absolute/path/to/prescriptions.json
npm run demo -- serve --port 4758
```

Open `http://127.0.0.1:4758/grammar`. Keep that foreground server running in its terminal. In another terminal:

```sh
npm run demo -- run
```

The default example asks for two independent TypeScript arithmetic modules. Workers use the supplied prescriptions and existing authenticated harnesses. There is no hardcoded model or provider in the demo. `--autonomy full` on initialization explicitly opts this sandbox into automatic task promotion and local shipping; the default retains checkpoints.

The running demo now connects browser input to the existing driver. At `/`, **New work → Raw notes → discover tasks** saves the original input and starts discovery; a short technical brief is not required. Open a generated candidate and choose **Start task** to select it and its prerequisites. The foreground server then drives the saved work through its configured steps, with existing dependencies, parallelism and checkpoints. Replies also wake the driver. Explicit browser wakes are durable, so restarting this foreground server resumes those roots; it does not sweep unrelated queued experiments into execution. Stop the foreground server to stop its workers. No service or schedule is installed.

For a transcript, initialize another root or add discovery to the existing sandbox:

```sh
npm run demo -- discover --source-file /absolute/path/to/transcript.txt
npm run demo -- run
npm run demo -- status
npm run demo -- promote --item 1 2 3
npm run demo -- run
```

Use the actual discovery and candidate IDs from the record. Passing no candidate IDs promotes all candidates using the existing engine; select IDs to deliver only those tasks. `--root /absolute/path` selects another isolated demo configuration. `go --item <id>` releases an ordinary checkpoint; `retry --item <id>` resumes a retryable failure. Neither command overrides an unanswered NQ exchange. The same store remains authoritative across process interruption and restart.

The config and sandbox product live under the selected root (default `.demo`, ignored by Git). The Made Well home is a separate neutral temporary directory so job worktrees cannot inherit this project's guidance. `demo.json` contains paths only; it is not a parallel status ledger. Preserve that directory while inspecting or resuming a run. No service or schedule is installed. The sample product has no upstream; shipping exports a local release and executes its preserved baseline module. This is a local demonstrator, not proof of production deployment or of every unseen transcript/domain.

## Bounded Switch investigation

```sh
npm run demo -- investigate --item 2 --decision-model typesafe/jev-latest
```

The selected provider is Jev. The installed Switch/pi-ai adapter reads `TYPESAFE_API_KEY` for `typesafe/jev-latest`, matching the [TypeSafe TypeScript quickstart](https://docs.typesafe.ai/introduction/quickstart#typescript). Supply the key through a private credential mechanism. The CLI still accepts any explicitly selected, registered classifier model. Credentials must stay out of source, packets and traces. Investigation can inspect the accepted plan, saved check failure, preparation evidence and candidate identity. It records the selected observations and Switch trace in the same store, without changing task status, outputs or acceptance. A failed inference produces a nonzero command exit and does not advance work. No configured classifier means live model quality is unverified; test-only scripted deciders are labelled as such.

## Acceptance and source provenance

`test/grammar.test.ts` and `test/switch-evidence.test.ts` were authored independently of the implementation. They execute the actual engine and Switch loop with explicitly scripted test workers/deciders. Software integration writes real product/check files, executes real commands, ships local commits, reopens the store, and exercises correction while preserving the candidate. Browser acceptance must additionally exercise the live HTTP view, disclosures, polling, keyboard interaction, narrow layout and disconnected states.

Run the registered gates:

```sh
npm run typecheck
npm test
```

On this Mac, the unmodified baseline CLI fixtures compare temporary paths literally; `TMPDIR=/private/tmp npm test` supplies a canonical path. The baseline orphan-process tests also assume Linux `setsid` and environment visibility through `ps`. These must be reported as platform limitations if they fail, rather than skipped or presented as demo regressions. An isolated Linux container with its own dependency installation can execute the unchanged full gate.

Switch `0.1.1` was acquired from the npm registry (`npm view @osolmaz/switch version engines exports dependencies --json`) and its installed core/model-adapter exports were inspected and imported before integration. The model adapter requires a configured classifier provider. The design is grounded in the operator's diagram and clarification in this conversation, and the existing `FOUNDATION.md`, `src/lane.ts`, `src/engine.ts`, `src/harness.ts` and `src/store.ts`. The branch has not established classifier accuracy, savings, general transcript quality, or production readiness merely by passing mechanism tests.

## Executed demonstration

The recorded sample completed all seven discovery functions, produced two tasks, and delivered both through ideation, planning, implementation and verification using live authenticated harness workers. Their execution overlapped. Nine registered checks passed against their recorded candidate commits; each candidate was exported as a local release. A separate integrated smoke check exercised both modules together, rejected invalid inputs and confirmed the preserved baseline module. An interrupted runner resumed the same work record without repeating accepted discovery.

The browser was exercised at desktop and 390px widths, including keyboard disclosure, polling with open details, actual saved invocation input, and disconnection/reconnection. No page errors or narrow horizontal overflow were observed. Independent review found no remaining blocking issues; all 18 focused acceptance tests passed.

Live Jev inference now passes through the actual installed Switch adapter using `typesafe/jev-latest` and a privately supplied key. Two investigations of the delivered sample tasks completed; one checked the complete work object before/after and asserted the durable trace matched the returned trace. Two separately labelled synthetic fault cases also completed: the missing-executable case inspected environment evidence first, and the wrong-arithmetic case inspected check results first. Both then inspected remaining available evidence and finished within the five-decision budget, without repeated observations or any work-state change. These synthetic inputs are test fixtures, not claims of additional product execution.

The first delivered-task investigation selected finish immediately, with no observations; this establishes transport only. The fault cases establish relevant evidence selection on those supplied cases, not general accuracy, discovery quality, repair ability or shipping correctness. `jev-latest` is a model alias; the stored traces do not identify the resolved backend version. Earlier failed provider attempts remain in the durable record. Evidence files are `.demo/jev-live-item-2.json`, `.demo/jev-live-item-3.json` and `.demo/jev-live-cases.json`; the synthetic case store is `.demo/jev-live-cases.db`. No key was written to the repository, packets or traces.

The final complete Linux gate passed: typecheck and 184/184 tests, with zero failures or skips (`.demo/linux-final-tests.log`). An earlier run had one transient console/watch JSON parsing failure (`.demo/linux-tests.log`, 183/184); the isolated case and final full run passed with complete output. Its original cause remains unknown. No speculative source change was made. The two previously observed Mac orphan-process failures remain platform limitations. The bundle and `git diff --check` also passed.
