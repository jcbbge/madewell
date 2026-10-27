# Independent watch review

## Scope and verdict

Read-only product review of `/Users/jrg/madewell-watch` on base HEAD `7ee8c7079e8102f6844376aedb33b3d232575a6b`. Parent edited product files concurrently. This report distinguishes the initial findings from source fixes observed during review. No product files, tests, dependencies, staging or commits were changed by this reviewer.

Bounded review is complete. Launch acceptance is NOT established: the reviewed bundle is stale relative to fixes, PTY verification was blocked by the execution guard, and Linux/VPS/full-suite acceptance belongs to the parent. The parent explicitly instructed this reviewer to leave PTY verification unproven rather than route around the guard.

Read: AGENTS.md, FOUNDATION.md, launch checklist, watch/machine implementation, targeted tests, and the store/lane/engine/trace/CLI changes. Focus: persistence, project filtering, terminal text safety, read-only behavior and navigation.

## Findings and disposition

### 1. C1 terminal controls survived sanitization — fixed in inspected source, bundle not verified

Initial `src/watch.ts:16` stripped ESC-form sequences and ASCII controls but left the C1 range untouched. Measured:

- `clean('\u009d52;c;abc\u009c')` returned the C1 OSC/ST sequence unchanged.
- `clean('\u0085HELLO')` retained C1 NEL.
- ESC-form OSC was correctly removed.

This violated the untrusted agent/tool-text boundary on terminals interpreting C1 controls. No actual terminal clipboard action was attempted or claimed.

Parent changed current `src/watch.ts:17` to remove `\x7f-\x9f`. Recheck returns plain `52;c;abc` for the C1 OSC example: no C1 control bytes remain. Retaining literal payload text is not terminal execution. PTY/terminal-level proof remains open.

### 2. Returned continuation lost project scope — fixed in source, still reproduced in bundle

Initial and currently reviewed bundled CLI:

`MW_STORE="$PWD/.watch-review/nonexistent-resume-test.db" MW_DEBUG=0 node dist/mw.mjs watch --once --workspace "$PWD"`

returns `next.run = "mw watch --since 0"`, dropping the explicit workspace. Following that command from a different cwd or as a non-TTY stream changes its scope; non-TTY defaults to global. This is a concrete project-isolation/continuation defect.

Current source `src/watch.ts:132` retains `--workspace` or `--all`. Running the same probe through `node src/cli.ts` returns `mw watch --since 0 --workspace /Users/jrg/madewell-watch`.

**Open packaging gate:** rebuild `dist/mw.mjs`, rerun this exact bundled probe (including a workspace containing shell metacharacters/spaces), then verify the installed artifact. Passing source tests does not establish bundle correctness.

### 3. Lexical workspace comparison hid equivalent symlink paths — fixed for inspected existing-path case

Initial `src/watch.ts:37-47` used `resolve()` only. Pure projection reproduction with recorded `/var/tmp/review-project` and cwd `/private/var/tmp/review-project` produced zero visible items.

Current `src/watch.ts:38-49` uses `realpathSync` with a lexical fallback. Recheck using the real existing aliases `/var/tmp` and `/private/var/tmp` returns the recorded scope and one visible item. Unavailable/deleted paths necessarily fall back to lexical comparison; no claim is made that their physical identity can be recovered.

### 4. Frozen pack failed its own validity rules — fixed in inspected source

Initial `snapshotPack()` copied compiled maker `receives` and compiled verify metadata into Pack. `problemsOf(snapshotPack())` returned three errors: maker receives for implement/test-plan, and disallowed verify metadata.

This was a representation/round-trip defect. I did NOT demonstrate an engine resumption crash from it; the engine's stored-pack consumption need not call `problemsOf`.

Current `src/lane.ts:175` snapshot behavior passes `problemsOf(snapshotPack())` with `[]`; the saved verify step is `{job:"verify"}`. The parent is intentionally leaving fixed console-owned boundaries outside configurable pack defaults. Cross-version behavior of those fixed boundaries remains a contract limitation, not something this test proves frozen.

### 5. Raw input chunk was treated as one key — source implementation replaced, live proof open

Initial `onKey` compared `b.toString()` against a single key sequence. Combined `jj` or `q\r`, or fragmented CSI input, could not be decoded correctly by that handler. This finding was from source inspection, not a successful PTY reproduction.

Current source uses `emitKeypressEvents(process.stdin)` and `keypress` with `key.sequence`, removing that direct chunk-equals-key assumption (`src/watch.ts:161-198`). Actual buffered/pasted keys, split CSI, Escape ambiguity, Ctrl-C and terminal cleanup still require the parent's live terminal test.

An auxiliary extraction-based handler probe was abandoned when concurrent edits changed the handler signature and introduced a `finished` dependency; its ReferenceError was in the probe harness, not evidence of a product failure.

## Measured checks

- `npm run typecheck`: exit 0, run twice during review, including after the source fixes.
- `node --test test/watch.test.ts`: exit 0, 5 passed / 0 failed, repeated after source fixes.
- The existing targeted persistence test launches a writer, persists pack/output/split state and an unreturned trace fragment, kills that writer with SIGKILL, opens the database read-only, and verifies the saved data and containment structure. This provides real process-death evidence for those stored fields.
- Legacy inspection test preserves the missing pack and labels its definition unknown without writing history.
- Scope/group tests cover independent counts, sibling-prefix avoidance and one-group-per-item behavior.
- Pure projection tests cover narrow rows, long content scrolling, ESC-form control stripping, and a CJK width example. They are not terminal-emulator tests.
- Non-TTY CLI test exercises the bundle, but does not assert preservation of workspace in the continuation. Its pass therefore did not catch finding 2.
- Direct current-source checks: C1 control stripping; equivalent existing-path workspace selection; `problemsOf(snapshotPack())`; source-vs-bundle continuation comparison.

No live data store was mutated. The nonexistent-store probes did not create their named store. In-memory SQLite stores were closed. Requested tests manage their own temporary fixtures.

## Persistence assessment and missing acceptance conditions

Observed: pack snapshotting at creation is durable; accepted output, maker track state, discovery/child links and trace fragments survive the tested process death. Read-only open skips schema initialization/migration and disables telemetry writes. Watch does not call the delivery engine.

Not established by the five tests:

1. End-to-end engine restart/redrive of both maker tracks after an actual interrupted job, including no duplicate transition/ship and preservation of accepted work. The kill test checks stored records; it is not a complete recovery execution.
2. Cross-build topology/default compatibility. An unpinned legacy item is pinned at resumption to installed defaults (`src/engine.ts:165`), with a durable `historicalDefinition: unknown` event. Historical defaults cannot be recovered by that act. Ensure presentations do not imply the old definition is known merely because a current pack is now saved.
3. Host sample persistence across an actual observed invocation and multiple heartbeats. `src/trace.ts` writes machine samples at start/heartbeat, but the new tests do not assert their durable contents or restart inspection.
4. Live terminal cleanup on q, Ctrl-C, SIGTERM, rendering error and resize; alternate screen/cursor restoration; raw-mode restoration and input listener lifecycle. PTY invocation was refused by the harness guard. No bypass was attempted.
5. Actual long-history performance and UI responsiveness while concurrent recorded work grows. The test uses 35 items and a small evidence sentinel, not a production-size AX document.
6. Full requested coverage in VPS/tmux, including discovery-to-candidate navigation, ready/dependency-held queue separation, per-item pipeline, parent/child navigation, host unavailable state, scroll and narrow-pane resizing.
7. Bundled/installed parity after the fixes. The final source and bundle hashes below are different review generations.
8. Full Linux/VPS test suite. I did not run it. The brief's 122-pass/7-fail Mac suite is parent-reported context, not independently verified by this review; those failures must be classified and the launch gate recorded honestly.

These are unproven acceptance conditions, not asserted new defects. The launch dossier still controls acceptance.

## Exact final reviewed hashes

Hashes obtained after the source fixes and repeated targeted checks:

```
596a06668221c36baac1c6158b0bd1265462b545849fb1d15e2e06bb9c3393e0  src/watch.ts
f40b69d164577c46c8381c11b2c696573e7c346f9a7a1d643eaf5ffa00581ef1  src/machine.ts
7013ee59da6967519a70bbaaeaaf49dd519589beb3cde85bd37d5b8ce2ee9881  src/store.ts
0c5b8993bcffc85f495dbfba887c02f944f1533e2e5b0506413bf2bdda71c88d  src/lane.ts
069098e265b1fe9c0fda9c35e3f5c32f0138569c2561c50efedca69304ac88a4  src/trace.ts
a1db3fa0905c52f8546db738b72868126e1a29c6d6315121759efcfaa6b7a062  src/engine.ts
5f783549f18d010271cc3d03ad9a99287c93ee5c1ff01a6d1ece61ea75b63544  src/cli.ts
a5dd2c79349694b92517b88f9f3b8ba3aed076e6bac17e441d69542648dedb55  test/watch.test.ts
2985d42bbf4e3087d611127055339c90f9b2f5c7f83108509fb22f8066eb9f5b  dist/mw.mjs
```

Initial watch hash was `d57fa2edabc8840317fd164e1a94dd1d4c440d956e04e9168018bdded22ba0e7`; initial lane hash was `c90124c16bc2d372bc88fe308b89c29f0418c89c53fd62fb48d883dc09da7d94`. Later parent edits are outside this exact-version review unless explicitly rechecked.

## Owner handoff

Parent received findings during review and owns the product fixes, build refresh, full-suite classification and actual VPS/tmux launch checks. This report completes the assigned independent bounded review, not launch approval.
