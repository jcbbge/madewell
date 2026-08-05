# Package c001-04: Independently verify the supervisor (src/supervisor.lisp)
**Cycle:** c001 (item i004) · **Date:** 2026-08-05 · **Role spawned:** Test-Designer (then Test-Runner)

## What This Is

Independent verification of one-for-one supervision at the OS-process boundary. Its
implementer wrote its tests. What needs independent eyes: **real child death → real
restart → real orphan-freedom under failure** — not the happy path. The reaping rule is
this package's law: every process started is waited on before its handle is dropped; a
supervisor that leaks children is worse than none.

## The Wall (binding)

- Read **only**: this brief, `README.md`, `docs/CONSTELLATION-V6-CONVERGENCE.md` (§2
  supervision rows), and `src/package.lisp`.
- Never read `src/supervisor.lisp`, other implementation files, or anything in `tests/`.

## Public Contract (from src/package.lisp, acquired this session)

Exports: `child`, `child-p`, `child-pid`, `child-alive-p`, `child-command`,
`child-restarts`, `supervisor`, `supervisor-p`, `supervisor-children`,
`start-supervisor`, `supervise`, `shutdown-supervisor`.

## Behavioral Intent

1. **A child is a real OS process with a real pid; death is a real exit status; restart
   is a real fresh address space.** `start-supervisor` takes a list of argv lists and
   launches one child per command. `child-alive-p` is true only while the process runs.
2. **One-for-one restart only.** `supervise` runs one *pass* (not a loop — the caller
   owns scheduling): every child found dead is replaced, every live child left alone;
   it returns the children that were restarted. A restart touches that child and no
   sibling. `child-restarts` counts replacements (observation, not policy — nothing
   branches on it).
3. **`child-pid` changing IS the evidence a replacement happened.**
4. **The reaping rule is not optional.** `shutdown-supervisor` terminates and reaps every
   child; after it returns, no process the supervisor started is alive — including
   replaced ones, which were reaped at replacement time (the corpse is collected before
   the handle is dropped). Supervised commands must be SIGTERM-respecting.
5. **Births, reaps, and restarts are recorded on the spine**; a supervision pass and a
   shutdown each close a span.

## Your Output

Test brief + test code to `.madewell/specs/2026-08-05-c001-supervisor.test.md`;
executable code to `.madewell/work/verification/supervisor-verify.lisp`. Against the
loaded `constellation` system; FiveAM via ocicl. Do NOT modify `constellation.asd`,
`src/`, or `tests/`.

## How We'll Know It's Done

- [ ] Every intent line 1–5 has a check traceable to it
- [ ] **Real death**: start a supervisor over a SIGTERM-respecting command (e.g.
      `/bin/sleep 30`), kill a child by pid (SIGKILL is fine — death must be real), run
      `supervise`, assert: the child was restarted, its pid CHANGED, `child-restarts`
      incremented, siblings untouched (pids unchanged, restarts 0)
- [ ] **Orphan-freedom under failure**: after every check — including FAILED ones —
      prove no supervised process remains alive (walk the child pids, probe with
      `kill -0` or /bin/ps; the check harness itself must reap in cleanup on every path)
- [ ] `shutdown-supervisor` on a fully-live supervisor: all pids dead after return
- [ ] A dead-then-replaced-then-shutdown sequence leaves zero live processes, including
      the replacement
- [ ] Spine visibility: restart/reap/shutdown emissions asserted against the actual spine
- [ ] No mocks (project invariant — real processes only); no run-order dependence; no
      pinned volatile refs (pids captured mid-run are per-run facts, not expectations)

## What Could Go Wrong

1. **Your own harness leaking processes** — a verification that leaves orphans commits
   the exact sin it grades. Every check must reap on every exit path.
2. Racing the kernel: a just-killed process may need a beat before `child-alive-p` is
   false; design for the reaping reality, not a fixed sleep assumption.
3. Zombie ambiguity: a dead child not yet waited on is a zombie, not a leak — distinguish
   in your checks.

## Out of Scope

Fixes. Restart budgets, strategies, trees (explicitly v5 features, absent by design —
do not test for their presence). Report contract ambiguities in the test brief.
