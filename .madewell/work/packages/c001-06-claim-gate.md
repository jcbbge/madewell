# Package c001-06: Close the coordination gap — the CLAIM gate as an executable
**Cycle:** c001 (item i006) · **Date:** 2026-08-05 · **Roles spawned:** Implementer + Test-Designer (parallel, from this brief) → Test-Runner

## What This Is

The structural fix for the failure that created this cycle. On 2026-07-25 five workers
ran a fan-out where the instruction said "post your CLAIM to the board" — and at least
two reported posting when they had not, while the board showed nothing. The instruction
was prose; nobody verified. `.madewell/work/WORKER-CONTRACT.md` §1 now defines the gate:
**a worker is not started until its claim is read back on the board, and the orchestrator
confirms the claim landed before sending further instruction.** A contract clause is still
prose. This package makes the gate an executable thing the orchestrator *runs*.

## Context

- The board is append-only JSONL at `~/.tower/board.jsonl`. Line shape (acquired this
  session): `{"id","ts","cwd","type","from","topic","body"}` — a claim is
  `type:"claim"`, scoped by `cwd` and `topic`.
- Read-back tool: `bun ~/.tower/cli.mjs board` prints the board **for the caller's cwd**
  (verified this session: the CLAIM for topic `research-neo-ergo` was posted by a worker
  and read back from `/Users/jrg/constellation`).
- The contract's timing rule: a worker whose claim has not appeared **within 2 minutes**
  is treated as not-started — investigate the pane; never let work proceed on an
  unconfirmed claim.
- This is ops tooling at the coordinator's shell, not runtime Lisp. POSIX sh, zero
  dependencies beyond tools already on this machine (`grep`, `date`; `python3` only if
  genuinely needed for JSON — prefer `grep` on the JSONL line shape, which is fixed by
  the writer).

## Starting Point

`bin/` does not exist in this repo. `WORKER-CONTRACT.md` §1 describes the gate
procedurally. No executable gate exists.

## Finishing Point

`bin/claim-gate.sh` exists, is executable, and:

1. Usage: `claim-gate.sh <worker-name> <topic> [timeout-seconds]` (default timeout 120).
2. Polls `~/.tower/board.jsonl` for a `type:"claim"` line whose `from` equals the worker
   name AND `topic` equals the topic AND `cwd` equals the current directory
   (`$PWD`).
3. Exit 0 and print the matching claim line the moment it appears.
4. Exit 1 on timeout, printing to stderr: the wait duration, the exact match criteria
   used, and the last claim lines seen for that topic (any cwd) as diagnostic.
5. Exit 2 with usage on wrong arguments; exit 3 if the board file does not exist.
6. Never writes to the board, never truncates anything; read-only on the filesystem.

`WORKER-CONTRACT.md` §1 gains one paragraph naming the executable as the gate's
enforcement point (orchestrator side). No other file changes.

## Steps (Implementer)

1. Read this brief completely; read `WORKER-CONTRACT.md` §1.
2. Verify the board line shape yourself (`tail ~/.tower/board.jsonl`) before writing a
   matcher — acquire, don't assume.
3. Write `bin/claim-gate.sh` to the Finishing Point.
4. Amend `WORKER-CONTRACT.md` §1 with the enforcement paragraph.
5. Do NOT write or run tests for your script (the wall). Report honestly per
   WORKER-CONTRACT §5.

## How We'll Know It's Done

- [ ] `bin/claim-gate.sh` exists, executable, POSIX sh (`sh -n` clean; shellcheck clean
      if available — check availability first, do not assume)
- [ ] Behaviors 2–5 each demonstrated by the Test-Runner from the Test-Designer's
      criteria
- [ ] `WORKER-CONTRACT.md` §1 amended, nothing else in the contract touched
- [ ] No board writes by the script under any invocation

## Testing

Applies: **yes** — this package generates code. Test brief:
`.madewell/specs/2026-08-05-c001-claim-gate.test.md` (Test-Designer, from this brief
only — never the script). Results: `.madewell/work/test-results/2026-08-05-c001-claim-gate.md`.
Test notes for the designer: claims for testing may be appended to the board by the
TEST itself (append is the board's write path — a test claim with a unique topic is
honest use, not pollution), but must be clearly synthetic (`topic` like
`claim-gate-test-<pid>`) and the test must not attempt cleanup (append-only means they
stay; keep them obviously synthetic). Real behaviors to cover: match found immediately;
match found after a delay (append mid-wait from a background subshell); timeout with
diagnostics; wrong-args; missing-board (point HOME at a temp dir — do NOT touch the real
board path for this case).

## What Could Go Wrong

1. Over-matching: a claim for the right topic but wrong cwd or wrong worker must NOT
   open the gate — the first fan-out's failure was claims trusted without read-back;
   a loose matcher would re-create it structurally.
2. Silent board-format drift: if the matcher's assumptions about the JSONL shape are
   wrong, the gate fails closed (timeout) — acceptable — but the diagnostics must make
   the cause obvious.
3. The script failing *open* under any error (grep not matching, empty file) — every
   non-match path must exit non-zero.

## Out of Scope

- Herdr plugin bridging, socket-API subscriptions, notification wiring
- Changes to Tower itself (`~/.tower/*`)
- Worker-side enforcement (the contract clause already governs that; this is the
  orchestrator-side gate)
