# Independent final acceptance — watch-only launch

## Decision

**ACCEPTED for the specified VPS/Linux launch. All six obligations: YES.**

This accepts the verified working build and its documented scope, not a merge, upstream release, Mac-wide full-suite pass, or a guarantee about every possible terminal. The reviewer did not implement the product changes and made no VPS changes.

Accepted bundle SHA-256:
`555ff48042e6b1a84ac99061240bfb2623f466e8005dbf0cc57101cd24b585ea`

## Six obligations

| # | Obligation | Assessment | Acquired evidence |
|---|---|---|---|
| 1 | Map durability contract to implementation | YES | Read the source-linked matrix in dossiers/2026-10-27-watch-launch.md and checked store/lane/trace/engine changes. The matrix distinguishes persisted items, packs, NQ, independent tracks, accepted outputs, invocations, tools, prepare/check/ship evidence, runner/quota state and projections. Missing historical definitions remain explicitly unknown; hypothetical org/team workflow is not invented. |
| 2 | Prove interruption and recovery | YES | Independently reran the writer-SIGKILL/reopen test in test/watch.test.ts. Reviewed the full Linux suite's recovery/interruption results and actual tmux test implementation/receipts: two real engine pipelines are interrupted, lost invocation/output remains visible, then redrive checks and ships both while candidates remain unpromoted. |
| 3 | Correct contradictory instructions | YES | Inspected diffs in FOUNDATION.md, AGENTS.md, README.md and both observability dossiers. Watch is the read-only terminal companion; static/browser-only/mockup instructions are explicitly historical, not active scope. Existing authority and durability contracts remain governing. |
| 4 | Fix demonstrated persistence gaps | YES | Pack snapshots persist at creation and pass problemsOf; legacy redrive records installed-default pinning with historicalDefinition unknown. Durable containment derives from saved packs. Independently reran the new host start/heartbeat persistence test, reopening the store and finding the recorded samples. No separate scheduling or history store was introduced. |
| 5 | Implement the watch companion | YES | Inspected final src/watch.ts and CLI wiring; reran seven targeted tests. Scope, disjoint queues, real stages/parallel makers, detail/history, host metrics, read-only SQL under write lock, no telemetry writes, control sanitization and scope-preserving continuation are checked. Reviewed real tmux receipts for depth/scroll/project filtering, 38x16 resize/help, 102-candidate history and terminal restoration. |
| 6 | Verify live on VPS/tmux | YES | Read .watch-review/linux-suite.log: 133 pass, 0 fail, 0 skipped. Read .watch-review/tmux-evidence.json and test/watch-tmux.py: 15 recorded checks. Read installed-watch.txt: actual installed CLI rendered the real Arc workspace. Requested and read installed-hash.txt: resolved global executable and tested VPS bundle match the independently hashed local bundle exactly. Reviewed Linux real-PTY q+Return/Ctrl-C tests and their passing full-suite results. |

## Independent local reruns

Executed from `/Users/jrg/madewell-watch`:

- `npm run typecheck` — exit 0.
- `node --test test/watch.test.ts` — 7 tests passed, 0 failed, 0 skipped.
- `git diff --check` — exit 0, no whitespace errors.
- `shasum -a 256 dist/mw.mjs` — exact accepted hash above.
- Bundled `watch --once --workspace "$PWD"` against a nonexistent review-only store path — exits successfully, does not create the store, and returns continuation retaining the explicit workspace.

The Linux suite, installed VPS behavior and tmux run were performed by the parent; I inspected their retained receipts and the test code rather than claiming I reran them on the VPS. No paid agent invocation was inferred from a scripted-worker test.

## Prior findings closure

- C1 controls: final clean() removes the C1 range as well as ASCII controls; source checks and targeted tests cover this boundary.
- Scope-losing continuation: final bundled CLI now retains workspace; no stale-bundle discrepancy remains.
- Equivalent symlink workspaces: canonical existing-path matching replaces lexical-only comparison.
- Invalid frozen Pack representation: fixed maker/verify console-owned fields are not serialized as invalid configurable settings; snapshot validity checks pass.
- Input chunk assumptions: readline keypress decoding replaces whole-buffer equality. Real PTY/tmux evidence covers coalesced quit input.
- Normal completion cleanup: done() explicitly invokes idempotent cleanup before callback resume; error path also cleans up; interruption retains a cleanup finalizer. Timer, resize listener, store, terminal display state and input/raw mode are released appropriately in these paths.
- Early Ctrl-C: input handling is initialized before the first visible frame. Real-PTY regression tests pass on Linux.
- Read-only CLI boundary: watch bypasses construction of the normal writable Store layer. Targeted locked-database and telemetry assertions passed.

## Evidence identity

Final source/test hashes inspected:

```
fd2b1cd76fbca8bb1506f061472a88ff116e39167df82c0306e7353b08236aa3  src/watch.ts
7013ee59da6967519a70bbaaeaaf49dd519589beb3cde85bd37d5b8ce2ee9881  src/store.ts
0c5b8993bcffc85f495dbfba887c02f944f1533e2e5b0506413bf2bdda71c88d  src/lane.ts
069098e265b1fe9c0fda9c35e3f5c32f0138569c2561c50efedca69304ac88a4  src/trace.ts
a1db3fa0905c52f8546db738b72868126e1a29c6d6315121759efcfaa6b7a062  src/engine.ts
d479837cc5c2fd1c92575f2ce6f63c0ce361f5423e05d69bf6f384ed83534905  src/cli.ts
eff2866177b7eeeba12716ce7ff6f19c6b194c302abbf53c4e27b57131a8f0e4  test/watch.test.ts
49a54466f15863a3dfc14858a2b0be622fffe74aec3074fb28763e845ef4d019  test/watch-terminal.test.ts
e5d16273c4d963791ee66093bd638abb3bf14d3526d0bde3141459035dc5f6fe  test/watch-tmux.py
45ece929e427690a902a209a118844f5e87614b438a108c830860155c372edcd  .watch-review/linux-suite.log
6109d8578f047e1ecaebfd3c9294c031df3be0e7b16c55a86ede748c5da61c0b  .watch-review/tmux-evidence.json
2c60a69fb9bca0b8493e09cd8039a6c95a5d37a3d795b63b46f2728e4b390c3f  .watch-review/installed-watch.txt
```

`installed-hash.txt` records a fresh read-only verification at `2026-10-27T18:54:22Z`: `/home/jrg/.local/bin/mw` resolves to the global installed bundle, and its SHA equals `/home/jrg/madewell-watch/dist/mw.mjs` and the independently measured local bundle SHA.

## Limits and remaining requirements

No unmet launch-six requirement identified within its VPS/Linux scope.

- Earlier full Mac suite failures remain disclosed, not relabeled green. This is not acceptance of a changed Mac global install.
- Source/docs remain uncommitted as instructed. Accepted installed working build is not evidence of merge or upstream publication.
- Runtime evidence uses the repository's scripted worker with real CLI, SQLite, git, subprocesses, checks, shipping and tmux. It is not proof that a particular paid provider works.
- No newly invented org/team execution system is included. All actual software-runtime components are the scope.
- This acceptance applies to the exact bundle and source identities above. Later implementation changes need proportionate re-verification.
- Parent may now update the launch checklist's independent-acceptance row and overall completion state, pointing to this report. That documentation update is not an additional implementation gate.
