# Watch-only Made Well launch

Owner: operator's direct maintenance assignment, 2026-10-27. Working tree: `/Users/jrg/madewell-watch` (`watch-durable-launch`).

**Complete: YES — all six obligations accepted for the VPS/Linux watch launch.** Independent acceptance: `.watch-review/final-acceptance.md`. Each YES is supported by the evidence below. The operator's artifact is a non-authoritative illustration, never a workflow specification. Existing FOUNDATION and runtime contracts govern. No stage may be invented to match a picture. No viewer may move delivery work.

| # | Work | Done | Evidence required / current position |
|---|---|---|---|
| 1 | Map durability contract to implementation | YES | Matrix below maps persisted state, contracts, containment and evidence; distinguishes missing definitions from hidden projections. |
| 2 | Prove interruption and recovery | YES | Existing SIGKILL/redrive, split-track, test-only recovery, multi-cartridge and trace interruption tests passed in `.watch-review/linux-suite.log`. New watch test kills a real writer process and reopens definitions, links, outputs, tracks and fragments intact. Historical unrecorded definitions remain explicitly unknown. |
| 3 | Correct contradictory instructions | YES | FOUNDATION, AGENTS, README and both observability dossiers now give watch precedence, reject mockup authority and supersede static-seed/browser-only instructions. |
| 4 | Fix demonstrated persistence gaps | YES | Effective packs saved at creation; legacy resumption pins once with unknown-history evidence. Stable lane/stage/job containment projects the stored definition. Host samples persist on existing invocation events. Writer SIGKILL/reopen, real legacy redrive, and host start/heartbeat tests pass; no second store. |
| 5 | Implement the watch companion | YES | `src/watch.ts`, `test/watch.test.ts`, `test/watch-terminal.test.ts`; terminal scope, lane/queue counts, named stages with parallel maker tracks, history/proof, parent/child and depth navigation, scrolling/resize/help, metrics and host activity. Read-only SQL even with a held write lock. Control injection, continuation scope, coalesced keys and terminal restoration checked. |
| 6 | Verify live on VPS/tmux | YES | 133/133 Linux tests, typecheck, 15 real tmux checks, installed Arc-terminal read and byte-identical installed build. Separate reviewer accepted all six rows and verified `launch-six`; report `.watch-review/final-acceptance.md`. |

## Protected concerns

- Preserve accepted outputs, independent maker tracks, calls, live fragments, NQ, dependencies, checkpoints, shipping proof and existing exports.
- Persistence means crash/restart reconstructability; a label on screen is not evidence.
- Host CPU/memory is live observation, not evidence that work progressed. Show unavailable measurements honestly.
- The viewer does not install services, schedule work, resume items, or operate another machine's delivery engine.
- No commits without an explicit request. Deployment may use the verified working build; record its exact hash and retain rollback.

## Already completed before this work unit

The VPS's obsolete sidecar processes and four web previews were stopped. The web UI service was uninstalled and the tmux sidecar auto-launch hook removed. Delivery records and source were preserved. These operations do not prove the new companion works.

## Durability matrix

The repository's definition is authoritative: a phase is the Discovery or Delivery loop, a stage is a cartridge, and a step is a named job. The default pack has one Discovery job and four Delivery cartridges. Custom packs can have multiple Discovery cartridges; the existing engine test actually drives that case. Agent-internal reasoning is not a newly invented workflow. No seven-step mockup was implemented.

| Object / component | Identity and durable representation | Resume / read evidence | Audit classification |
|---|---|---|---|
| Work item and project | `src/store.ts` Item: id, workspace, objective/source, status, job, round, timestamps | SQLite item document plus explanatory event saved atomically by `save`; `drive` redrives saved job | Durable, previously shallow display |
| Lanes / phases | `src/lane.ts` Pack.discovery and Pack.delivery; frozen on each new item | `snapshotPack`, `laneOf`, persisted job identifies active loop | Missing default-pack snapshot fixed; historical defaults cannot be reconstructed honestly |
| Stages / cartridges and steps / jobs | Ordered pack cartridges and named step contracts, profiles, duties, receives, output schemas | `snapshotPack` resolves supported defaults; fixed verification and maker isolation stay console-owned; stable containment projected by `lensOf().structure` | Durable definition now pinned; stage/job projection exposed |
| Item containment / dependencies | Item.discovery, parent, after, waitsOn; item ids and stored list order | Discovery/fix links and child references derived from saved rows; dependency status is not execution | Durable, previously hidden navigation |
| NQ / handoff | Item.exchange, from, turns, card and recorded answer events | `step`, `saveTrack`; existing durable-answer and split-intake tests | Durable; exact questions/answers exposed in detail |
| Implementation and test tracks | Item.split, each track's exchange, launches and accepted marker | Parallel tracks remain independent; test-only recovery preserves kept candidate | Durable; visible independently |
| Accepted outputs and attempts | Item.outputs, round, change/check artifacts, calls with full packet/output/raw stream | Store transactions, itemHome/patchPath, readback and recovery tests | Durable; current accepted state plus historical call/event evidence |
| Invocation and tools | `trace-started` identity and parent, output fragments, tools, heartbeat, signals, finish/call link in events | Existing SIGKILL and interruption tests; `lensOf` marks lost/interrupted rather than successful | Durable, not only transient live files |
| Prepare / verification / shipping | Observed invocations and events; provisioned/torn records, checks/results, merged commit, shipped command/output | `engine` prepare/verify/ship functions and existing engine/CLI shipping tests | Durable; ready queue does not pretend preparation already happened |
| Runner / quotas / holds | Runner table, account resets, item hold/checkpoint state and events | claimRunner records loss; drive/redrive preserves completed jobs; waits shown separately | Durable; absent runner shown explicitly |
| Host/resource measurements | New machine samples on existing trace-started and trace-heartbeat events | Historical samples remain with invocation; watch live samples do not write state | Capture added without another timer, state store or scheduler |
| Metrics and read projections | Derive scoped counts, timings, tokens, checks, NQ, hierarchy from the same store | `modelOf`, `lensOf`, `scoped`; SQLite read-only handle in watch; no normal writable CLI Store layer | Durable source, ephemeral projection; no fabricated stage progress |
| Deep generic org/team nodes | The dossier describes recursive altitudes beyond the software kernel; current item model has work/discovery/fix relationships, not independently executing org/team objects | No such runtime nodes found; do not invent persisted work or labels | Not a second workflow introduced by this terminal task; all real runtime components above are mapped |

Definition pinning does not freeze the installed engine executable forever: fixed console behavior still upgrades under existing compatibility law. It prevents saved work's configurable lane/stage/step topology and defaults from silently following a new default pack. Existing missing historical definitions stay unknown; an active legacy item explicitly records its installed default when resumed.

## Verification and remaining defects

- **VPS full gate:** `npm test`: **133 passed, 0 failed, 0 skipped**; `npm run typecheck`: exit 0. Log: `.watch-review/linux-suite.log`.
- **Mac targeted gate:** `npm run typecheck`, `npm run bundle`, `node --test test/watch.test.ts`: exit 0, **7 passed**. Log: `.watch-review/watch-tests.log`.
- **Real PTY regression:** both `q` with a coalesced Return and Ctrl-C exit, restore termios, leave the alternate screen and restore the cursor. The live test found a callback-success cleanup bug and the full suite exposed an early-Ctrl-C race; both were fixed, then the full Linux suite reran green.
- **Live tmux gate:** `python3 test/watch-tmux.py` passed on the VPS. Uses the repository's scripted worker but real CLI, SQLite, git worktrees, subprocesses, checks and shipping in two disposable projects. Shows two concurrent pipelines, SIGKILL/lost output, legacy definition pinning, project filtering, host measurements, pipeline/full evidence, 38×16 resize/help, restored terminal, successful redrive/checks/shipping of both items, unpromoted discovery candidates, and a 102-candidate scrolling queue. `.watch-review/tmux-evidence.json` retains the screen captures and assertions. This is controlled execution, not a claim that a paid production agent was exercised. All test sessions, processes and temporary projects were removed.
- **Independent review:** `.watch-review/review.md`. C1 terminal controls, scope-losing continuation and invalid frozen-pack fields were corrected and rechecked. The final installed bundle now matches the rebuilt source, closing the review's stale-bundle finding. Final independent acceptance is complete: `.watch-review/final-acceptance.md`, six YES assessments and explicit limits.
- **Installed on hive:** `/home/jrg/.local/bin/mw` resolves to the updated global bundle. SHA-256 **`555ff48042e6b1a84ac99061240bfb2623f466e8005dbf0cc57101cd24b585ea`**, identical to the local rebuilt bundle; resolved-path/hash/cmp receipt: `.watch-review/installed-hash.txt`. Rollback copy: `/home/jrg/madewell-watch/.watch-review/rollback-mw.mjs`. No web service was reinstalled; ports 4747/4790/4791/4848 remained closed.
- **Installed live read:** ran `mw watch --once` over a real SSH terminal in `/home/jrg/projects/infinity/arc`; project scope, retained dropped history and scoped metrics rendered. Receipt: `.watch-review/installed-watch.txt`. The existing VPS store still reports 6 shipped / 2 needing attention / no running delivery. The historical Plantcards workspace no longer exists on disk; its retained record remains inspectable with `--all` or its explicit `--workspace` path. It is not silently mapped to another repo.
- **Known Mac test limitations, not a claimed green:** the earlier full Mac run had five `/var` versus `/private/var` fixture-path failures/lookup and two process-cleanup failures (one calls absent `setsid`). Preserved in `.watch-review/mac-suite-initial.log`. This launch's full acceptance platform is the VPS/Linux; the Mac global install was not changed.
- **Integration status:** the operator subsequently authorized committing and pushing the accepted work on `watch-durable-launch`. The branch commit retains the implementation, documentation and review evidence; this does not claim a merge to main. The installed VPS binary remains the verified build identified above; committing the local branch does not change the VPS checkout.
