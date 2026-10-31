# Jump-pack composition lab — opt-in experiment

This branch experiment tests domain contracts against the existing Made Well executor and SQLite record. It changes no installed default pack and registers no application. The JSON packs are experimental examples, not authoritative industry guidance. Real-model cases and deterministic fixture cases are labelled separately in the console.

Open the existing demo server at **http://127.0.0.1:4758/lab**. The main view shows the original input, intended result, generated tasks, their dependencies, four delivery steps, YES/NO completion, and actual produced content. Attempts using the same input are grouped. Separately entered tasks are explicitly separate from discovery attempts. Checks of the tool itself and the exact contracts, inputs/outputs and traces remain available under technical details; a tool-check pass is never presented as completed business work. Inaccessible model internals are not captured.

## Hypotheses and falsifiers

| Hypothesis | Test | Failure means |
|---|---|---|
| Domain requirements compose | Software + database, and marketing + sales | A required contribution disappears, an implicit method wins, or one of the eleven obligations is missing. |
| Outcomes survive discovery | Re-run the exact non-authoritative transcript | Preparation replaces the desired capability, rates become invented rules, or a project is assumed. |
| Delivery is domain independent | Produce a fictional local campaign draft | The four delivery obligations require Git/software, fail to produce an artifact, or lack appropriate proof. |
| Replacement preserves accepted work | Change a future planning method | An accepted invocation repeats or an already accepted input silently changes. |
| Missing proof remains visible | Omit a required fixture artifact | Work becomes completed despite the actual checker failing. |
| Contracts retain identity and context | Compare Declare/confirm IDs and inspect child packets | IDs drift, candidate handoffs omit original facts, or the console pairs an old input with a new attempt. |
| Saved work carries a continuous run | Reject a deliberately broken confirmation, stop, resume in a fresh process, deliver generated work | Earlier work repeats, a candidate exists before valid confirmation, or delivery needs a rewritten brief. |

Discovery prepares the clay: raw notes and discussion become usable intent and candidate work. The version-4 generic example permits sourced clarification of provisional outcome descriptions, and explains consequential choices through the existing DX/UX/AX rubric. Evaluation judges useful interpretation, uncertainty and source fidelity; it does not demand a fixed task count or exact wording. The identity audit retains original anchors and permits additional outcomes when intentChanges supplies sourceRefs and a rationale. It audits coverage over both sets. Silent renaming remains invalid; an original anchor can be explicitly declined with a reason. Source references and rationale are inspectable claims, not automatically proven meaning. The continuity run #27 remains pinned to version 3; its live result does not establish the new-outcome behavior.

## Run

Initialize the preceding Switch demo once; this lab uses its path-only `.demo/demo.json` and existing worker prescriptions. Keep the foreground UI server running with `npm run demo -- serve --port 4758`.

```sh
npm run lab -- structural
npm run lab -- live --tier intake
npm run lab -- delivery --tier intake
npm run lab -- status
node examples/jump-pack-lab/continuity.ts start --tier coding
node examples/jump-pack-lab/continuity.ts status
node examples/jump-pack-lab/continuity.ts resume --id <recorded-id>
```

Run one command at a time: the existing store admits one runner. `live --resume` resumes the latest recorded tax/marketing cases without replacing their pinned configuration. `live --case marketing` or `--case tax` starts only that case. Structural runs always create fresh fixtures; `--resume` is deliberately refused there. Never reset an existing record to obtain a passing result.

`--tier` selects an already configured execution tier; it does not hardcode a model or provider. This round used the configured `intake` tier to bound trial time. Both contracts and execution tier differ from the older transcript baseline, so timing or quality differences cannot be attributed to the pack alone.

The continuity trial uses rough fictional workshop notes and an already configured tier. `start` retains a real model return, labels a deliberately injected outcome-ID mutation, and stops after rejection before the next real worker call. `resume` reads only the saved record and pinned pack, checks that the first six output bytes and invocation counts did not change, then promotes the generated outcome task and its dependencies. Its trusted artifact checker is attached to the outcome task before delivery, without changing the generated brief. A completed machine check still requires independent semantic review. This is a recovery/feasibility trial, not a controlled model-quality comparison with earlier inputs.

Neutral workspaces are created outside project checkouts, with no Git repository. They contain only case artifacts. Preserve the paths in the work record while reviewing results. No service, schedule, publication, outreach, production database connection or upstream is installed.

## Composition contract

`src/jump-packs.ts` loads explicit local JSON files and resolves one implementation per function. Generic methods are fallbacks; competing specialized methods require an explicit selection. Requirements remain additive with pack/version/id provenance. Contradictory named scalar constraints are rejected. Arbitrary prose contradictions are not automatically understood.

The generated pack contains seven discovery functions and all four delivery obligations. Its nodes use the existing function runtime and record actual calls/events. Common output fields cannot be weakened by extensions; only schema features the current validator actually supports are admitted. Each invocation carries its own effective contract. Replacements retain accepted and attempted nodes exactly; no call is silently rewritten.

`auditJumpDiscovery` validates identities, links, candidate kinds and dependency positions. This is a structural audit. Semantic fidelity requires a separate review before the hypothesis can pass. A candidate claiming to represent an outcome is not proof that it does. Honest negative verification is retained: the concrete artifact checker fails nonzero rather than accepting a success-shaped response.

Function nodes can opt into a trusted `check` command. It receives `{input, output}` on stdin, including the exact source and declared preceding outputs. Exit zero accepts the producer's original return; checker stdout cannot replace it. Failure is recorded in a separate acceptance invocation and prevents progression, for both agent and command nodes. The experimental confirmation opts into this check before candidates are created. Merely loading a pack grants no execution authority.

The executor and `/lab` share a pure structural next-action calculation over saved status, prerequisites, configured nodes and accepted outputs. It runs no checks while reading. This calculation does not enforce the lab's additional historical semantic-review or artifact-drift checks; those remain visible evidence, and must not be mistaken for a universal runtime gate.

Generic discovery now preserves 1-based earlier-candidate dependencies. Generic delivery packets resolve their parent's original source and discovery output from the same record, so a shortened candidate description cannot erase the supplied context. Software maker isolation remains on its existing path.

## Observed cases

The current record preserves successful and failed runs:

- **#8:** software/database deterministic migration. Four real command functions renamed a sandbox SQLite column and independently checked both preserved rows and schema.
- **#9:** deliberately absent receipt. Verification failed and the work stayed held; the experiment passed because the expected refusal occurred.
- **#12:** future-method replacement. Accepted ideation ran once; planning used the replacement; rewriting accepted input was refused.
- **#13:** marketing/sales method conflict. Resolution named both methods and no function started.
- **#10:** fresh exact transcript discovery. Independent review found capability outcomes retained alongside prerequisites, with uncertainty and no-project authority preserved. The package-versus-item representation still requires care.
- **#11:** first marketing trial failed. It split delivery phases into tasks, lost source facts in candidate handoffs, and applied the final draft checker to a planning prerequisite. No successful draft delivery is claimed.
- **#23:** revised generic contract produced one coherent outcome task, but confirm renamed its declared outcome ID. The link audit failed and no candidate entered delivery. This is retained as a real failure, not normalized into a pass.
- A separately labelled **explicit delivery-only** trial tests the actual local draft through four functions. It does not repair #11/#23 or establish end-to-end discovery success. Its latest result is shown in the console.

The version-2 generic cartridge keeps phases inside a task unless they produce an independently owed result. A task-specific draft checker belongs to the draft outcome only. Stable outcome identity and localized correction of a rejected confirmation remain a concrete next hypothesis; the lab currently exposes that failure rather than claiming to solve it.

## Verification

Independent tests exercise real engine commands, Store reopen, dependency validation, composition conflicts, schema bypasses, replacement, current-attempt input linkage and parent context. Live model behavior is reviewed separately. Run `npm run typecheck`, `npm test` and browser acceptance. On this Mac the known orphan-process tests depend on Linux; the complete gate is also run in a disposable Linux container with its own dependencies. Failed, skipped and executed results must be reported distinctly.

## Completed batch

The explicit delivery-only trial #25 failed with no draft after its worker reported unavailable input; its real checker kept it held. The same explicit task in fresh trial #26 used the configured coding tier, produced draft.md, completed all four functions, and passed independent source/artifact review. The recorded artifact hash is 56180d853f39205dcfeb247d62393fd969221a2c47030609b83acf41fdcc2c40. Case #23 remains failed and unpromoted. No end-to-end repair is claimed.

Final complete Linux gate: typecheck and 215/215 tests passed,0 failed or skipped. The 31new focused tests passed independently. Browser checks covered keyboard, disclosure preservation, connection failure/recovery, desktop and 390pxlayout without horizontal overflow, loaded fonts and no JavaScript page errors. Detailed per-case receipts remain in the console; `.demo/lab/results.md` is an exported report, not another status ledger.

## Work-context correction

The primary page now leads with the input, intended result, all task names, exact assigned briefs, dependencies, four delivery steps, YES/NO completion and actual output content. Same-input attempts are grouped; direct delivery remains separate from discovery. Technical checks and run configuration are secondary. Known negative phase reviews and failed coverage checks stay NO even when the historical runtime accepted a returned JSON shape. A failed latest review, missing or changed artifact also prevents a completion claim; dependency labels use the same evidence as the task itself.

This correction passed independent screen/API review and real browser checks, including task selection, preserved focus/disclosures, source/output visibility, connection recovery and narrow layout. The final Linux gate passed typecheck and 225 tests with no failures or skips; the 41 focused tests include the work-view regressions. The work state itself is unchanged: six tax proposals are unstarted, failed discovery attempts remain incomplete, and the separately entered invitation task has an actual verified draft.

## Driving the established process

The operator corrected the scope: the complete grammar has worked through two years of manual use. The engineering work here is removing manual copying and connecting execution, not repeatedly asking whether that process works.

The live continuity run **#27 → #28** completed: a deliberately injected broken confirmation was rejected before acceptance or candidate creation; a fresh process retained the exact first six outputs and invocation counts, corrected confirmation, then delivered its generated task through all four functions. The actual draft passed its independent artifact command. This run remains pinned to generic version 3; version 4's optional sourced outcome additions were checked separately. The local draft, source, rejected return, recovery and actual output are visible at `/lab?id=27`.

The browser's disconnected wake path was also fixed. Raw browser input can start discovery; a candidate's **Start task** operation atomically selects it and its prerequisites, then wakes the existing queue. The foreground server resumes explicitly marked roots after restart and preserves unrelated historical work. In the isolated browser wiring check **#29 → #30**, one submission ran all seven discovery functions, one selection ran all four delivery functions, and a real local receipt was written and checked. No phase text or context was copied between them. This deterministic fixture verifies the browser/driver connection; #27/#28 supplies the separate live-worker handoff evidence.

Latest full Linux gate: **251 passed, 0 failed or skipped**, with typecheck passing (`.demo/driver-final-linux-tests.log`). Independent API tests cover receipts, revisions, rollback, exact source, selection and wake behavior; foreground tests cover concurrency, dependencies, recovery, isolation and cancellation. Browser checks confirmed the real submission/selection flow, no JavaScript errors and no horizontal overflow at 390px. Nothing was sent, published or deployed, and no service was installed.
