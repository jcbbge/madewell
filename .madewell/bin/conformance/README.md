# Made Well conformance suite (SPEC §9)

Fixture-based, mock-free, POSIX sh. The suite is also the reference CLI's
own test suite; a future host (a Go binary, a Constellation-native host, a
bb integration) proves itself against the same cases.

## Run

```
sh conformance/run.sh                 # all cases
sh conformance/run.sh 01              # one case
sh conformance/run.sh 01 03 05        # several cases
```

Each case script sources `lib.sh`, sets up a fresh temp git repo with a
minimal `.madewell/` skeleton, exercises one behavior of the kernel, and
reports pass/fail to stdout. The runner aggregates the results and exits
0 if all run cases pass, 1 otherwise.

## Cases

| # | Behavior | Spec |
|---|---|---|
| 01 | happy-path: `commit → ground → (plan → verify)×N → land` with ledger + projection correct at every step | §9.1 |
| 02 | double-advance refused at each scope (cycle + item) | §9.2 |
| 03 | out-of-order doors refused (every illegal edge in §5.3) | §9.3 |
| 04 | failing gate blocks and records nothing as passed | §9.4 |
| 05 | gauge mode never moves position | §9.5 |
| 06 | _deferred_ — `abandon` closes without unlocking consumed doors | §9.6 |
| 07 | _deferred_ — hand-edited ledger caught by `fsck` (chain break) | §9.7 |
| 08 | _deferred_ — hand-advanced projection caught by `fsck` (drift) | §9.8 |
| 09 | resume position computed correctly from a mid-cycle ledger (inner-first rule) | §9.9 |
| 10 | Rule 1 respected: doors run with no network and no reads outside the repo | §9.10 |

Cases 06, 07, 08 are deferred because they need kernel commands that the
v1 slice does not ship yet:
- `06` needs `mw abandon <item-id>` (SPEC §3.3 `abandon` event emitter)
- `07` and `08` need `mw fsck` (SPEC §7.3 integrity checker)

When those commands land, the corresponding case files are added to
`cases/` and the `deferred` list in `run.sh` is shortened.

## Conventions

- Each case script `set -u` is enabled in `lib.sh` and exits non-zero if
  any assertion fails.
- Assertions print `ok` or `FAIL` and a one-line description; the runner
  counts and aggregates.
- Fixtures are created via `set_up_repo` in `lib.sh`. Each fixture is a
  `mktemp -d` directory with a real git repo, a minimal `.madewell/`
  skeleton, and the kernel scripts symlinked in. Cleanup is via `trap`.
- No mocks. Door scripts are the real `plan.sh` and `land.sh` from
  `~/madewell/.madewell/bin/doors/`. The `mw` binary is the real
  `~/madewell/.madewell/bin/mw`.
- No `bash`. The suite is POSIX sh and runs under `/bin/sh`.
