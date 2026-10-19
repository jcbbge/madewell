# Thread 70 — independent doctor checks

Authority: the supplied SOURCE.md and ACCEPTED-3-plan.md. Orion owns tests only.
The existing doctor API/CLI is the boundary. No production probe API is invented
or imported. `support.mjs` projects structured status records across nesting
layouts, preserving identity and case evidence; absence of a record is a failure.
String matching there selects structured evidence, never interprets hook stdout.

## Authored file inventory

Modified:

- `test/doctor.test.mjs`
- `test/harness-fakes.mjs`

Added:

- `test/doctor-probes.test.mjs`
- `test/doctor-budget.test.mjs`
- `test/fixtures/doctor/checks.md`
- `test/fixtures/doctor/support.mjs`
- `test/fixtures/doctor/run-checks.mjs`
- `test/fixtures/doctor/live-check.mjs`
- `test/fixtures/doctor/hook.mjs`
- `test/fixtures/doctor/model-cli.mjs`
- `test/fixtures/doctor/pi-stateful.ts`
- `test/fixtures/doctor/pi-two-blockers.ts`
- `test/fixtures/doctor/pi-late.ts`
- `test/fixtures/doctor/pi-no-handler.ts`
- `test/fixtures/doctor/pi-load-error.ts`
- `test/fixtures/doctor/pi-model-trap.ts`
- `test/fixtures/doctor/pi-rewrite.ts`
- `test/fixtures/doctor/pi-hang.ts`
- `test/fixtures/doctor/package/package.json`
- `test/fixtures/doctor/package/shim.ts`
- `test/fixtures/doctor/package/implementation.ts`
- `test/fixtures/doctor/package/excluded.ts`

Author-run evidence (untracked, not product files):
`.madewell/doctor-thread70-orion/syntax.log`, `syntax.json`, `suite.log`,
`suite.json`, and `fixture-smoke.json`. Commands below overwrite only their own
named evidence files. Native, budget and live evidence are generated when run;
their absence is not a pass.

## Run from the checkout

| Command | Passing result | Evidence |
|---|---|---|
| `node test/fixtures/doctor/run-checks.mjs syntax` | Every authored JS/TS file parses, exit 0. | `.madewell/doctor-thread70-orion/syntax.{log,json}` |
| `node test/fixtures/doctor/run-checks.mjs focused` | Doctor, probe and unchanged provision tests pass. | `.madewell/doctor-thread70-orion/focused.{log,json}` |
| `node test/fixtures/doctor/run-checks.mjs native` | Installed pi runtime loads directory/package fixtures and makes only the synthetic loopback model calls; no skip, exit 0. | `.madewell/doctor-thread70-orion/native.{log,json}` |
| `node test/fixtures/doctor/run-checks.mjs budget` | 10s hook, 30s pi-scenario, 45s model and 180s total budgets; cleanup and unstarted-check evidence pass. Allow several minutes; no skip. | `.madewell/doctor-thread70-orion/budget.{log,json}` |
| `node test/fixtures/doctor/run-checks.mjs suite` | Runs exactly `npm test`; exit 0. | `.madewell/doctor-thread70-orion/suite.{log,json}` |
| `node test/fixtures/doctor/live-check.mjs M5` | Execute on M5: installed preflight clean; passing fixtures produce no Check; refusing command, stateful pi and native package fixtures produce Check; installed configuration unchanged and scratch removed. | `.madewell/doctor-thread70-live/M5/` |
| `node test/fixtures/doctor/live-check.mjs hive` | Same, executed on hive itself. M5 evidence cannot substitute. | `.madewell/doctor-thread70-live/hive/` |

`DOCTOR_TEST_PI=/absolute/path/to/pi` selects another **installed** pi for native
checks. Otherwise tests resolve pi from the caller's PATH. No install/download
occurs. Ordinary `npm test` explicitly skips positive OS/native tests on hosts
without those capabilities, and skips the separate slow budget tests. Such skips
are **unverified coverage**, not satisfaction of the delivery gates. `native` and
`budget` make missing capability an error. The normal suite never uses real model
credentials; fake CLIs and a loopback HTTP provider supply every model response.
Live commands do use installed accounts and incur the plan's minimal model calls.
They must be run by the verifier, once on each named host, not by a pipeline worker
as a precondition for unrelated work. The host label is recorded with hostname;
the verifier must establish that the label names the actual host.

## Test-to-contract map

- `doctor.test.mjs`: original installation/authentication/front-door/prescription
  checks retained; setup defects now mean exit 1 while candidates remain eligible.
- `doctor-probes.test.mjs`: guarded Codex; harmless denial words; misleading worker
  flag text; structured/exit refusals; wrappers with both inherited flags absent
  and present; tool/prompt/Stop/lifecycle/subagent envelopes; both Stop recursion
  values; aliases; direct arguments; malformed/unreadable settings; unmatched and
  unsupported registrations; event-specific failure policies; raw-output limits;
  containment, cancellation, credential-write restrictions; model classifications,
  launch controls, no override/retry, custom alternative order; native pi loading,
  stateful histories, handler order, startup registration, package filters/shims,
  missing packages, load failure, excluded model extensions, and report/exit/text.
- `doctor-budget.test.mjs`: real-clock acceptance checks, separated to keep normal
  iteration inexpensive. Unknown budget/cleanup results do not satisfy these tests.
- `harness-fakes.mjs` and `model-cli.mjs`: controlled CLI responses and invocation
  records. The recorder only receives synthetic argv, selected environment fields
  and cwd. No shell text is evaluated to manufacture a model result.
- `hook.mjs`: black-box registered commands. Payload validation is independent of
  product helpers. Network/write attempts target only test-owned resources.
- `pi-*.ts`: native extension fixtures, no fake production extension API. Stateful
  fixture tracks allowed tool IDs and read/write results and requires native context.
- `package/`: manifest, shim, implementation and excluded resource. Proves native
  package discovery/filtering and runtime attribution instead of guessing filenames.

## Verifier inspection checks (also required)

Some controls cannot be proved by observing one successful request. Inspect the
new implementation alongside the named tests and record evidence in the host
summary or the verification report:

1. Native pi uses the runtime associated with the selected executable, memory
   settings/session state, native package/resource discovery and handler dispatch;
   no substitute API, static source scanner, silent skipped package or downloads.
2. Native handler wrappers preserve returns/exceptions, refresh after startup,
   retain order and mark unreached handlers unknown. Four fresh processes must
   represent blind write, bash, read/write/write, and read/write/read/write.
3. Configured default, selected model and native fallback are separate. A fallback
   success cannot certify the configured default. An extension-only provider is
   unknown with a precise limitation when the model loadout excludes extensions.
4. Codex disables each effective configured MCP/plugin tool before the request;
   unenumerable effective configuration is unknown and no request is submitted.
   Check boolean override **values**, provider-specific zero retry settings, account
   preservation and no model override. CLI launch count is not a provider-request
   count: unsupported hard caps must be reported unknown. Pi's request is capped
   at 64 output tokens, no tools, zero retries.
5. Local probes deny network and writes outside scratch. Model probes permit
   network but retain the write restriction. Failure to start OS containment never
   invokes unrestricted fallback. The unavailable-containment fixture shadows the
   launcher through PATH with a failing executable; it never supplies a pass-through
   fake sandbox. If an absolute trusted launcher bypasses that injection, the test
   explicitly skips that case and the failure path remains UNKNOWN; inspect its
   launch-error handling separately. This skip cannot certify unavailable containment.
6. Retained exports satisfy unchanged provision tests. No provision implementation,
   host directive, prescriptions, installed extensions or worker-launch changes;
   doctor remains operator-only. New runtime files are packaged. Docs scope coverage
   to home hook files and exercised cases, show unknowns/untested alternatives and
   disclose quota. Inspect `git diff --name-only`, relevant diff and package file list.

## Protocol sources acquired for this test design

- Accepted plan sections 2–6 define environments, limits, statuses and scenarios.
- Claude command/args, failure policy and event response semantics:
  <https://code.claude.com/docs/en/hooks> (read 2026-10-17).
- Codex event envelopes, apply_patch aliases and response semantics:
  <https://learn.chatgpt.com/docs/hooks> (read 2026-10-17).
- Codex invocation configuration:
  <https://learn.chatgpt.com/docs/config-file/config-reference> (read 2026-10-17).
- Installed pi package's `docs/packages.md`, `docs/models.md`,
  `dist/core/extensions/types.d.ts`, `dist/core/extensions/runner.js`, and pi-ai's
  `dist/api/openai-completions.js` were read from the runtime selected by
  `/opt/homebrew/bin/pi`. The tests resolve the runtime dynamically and pin nothing.

No commits, pushes, live M5/hive checks, or independent acceptance belong to Orion.
