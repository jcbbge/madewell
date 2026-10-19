# experimental

Uncommitted work from Made Well threads 70 (doctor probes, Orion) and 104
(granular process contract), packaged here on 2026-10-18 so it is in the
history without changing the live suite.

Status: RED. These tests describe a doctor, a model probe layer and a
persisted `processVersion` that are not yet implemented. Nothing here is
loaded by `npm test` (which runs `test/*.test.mjs` only).

- `test/doctor.test.mjs`, `test/harness-fakes.mjs` — proposed replacements for
  the live files of the same name (doctor exits 1 on setup problems; fakes
  gain a probe mode and a watchdog).
- `test/doctor-probes.test.mjs`, `test/doctor-budget.test.mjs`,
  `test/fixtures-doctor/` — thread 70.
- `test/granular-process-contract.test.mjs`,
  `test/granular-process-acceptance.md` — thread 104; the acceptance doc says
  it was authored without a command tool and never run.
