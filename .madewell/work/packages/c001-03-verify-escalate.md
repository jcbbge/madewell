# Package c001-03: Independently verify escalation / resume-in-place (src/escalate.lisp)
**Cycle:** c001 (item i003) · **Date:** 2026-08-05 · **Role spawned:** Test-Designer (then Test-Runner)

## What This Is

Independent verification of the escalation contact point — the door a *decision* passes
through, one level up from grounding. Its implementer wrote its tests. The claim that
most needs independent proof: **resume-in-place is genuine** — the worker continues from
the exact line it stopped on, nothing re-run — not merely asserted by a counter the same
agent wrote.

## The Wall (binding)

- Read **only**: this brief, `README.md`, `docs/CONSTELLATION-V6-CONVERGENCE.md`, and
  `src/package.lisp`.
- Never read `src/escalate.lisp`, other implementation files, or anything in `tests/`.

## Public Contract (from src/package.lisp, acquired this session)

Exports: `escalation`, `escalation-question`, `escalation-actor`, `escalation-default`,
`escalate`, `with-work-unit`, `with-escalation-policy`, `answer`, `use-default`,
`abandon`, `*work-unit*`.

## Behavioral Intent

1. **A worker reaches a decision that is not its to make and says so mid-computation** —
   it signals an `escalation` (an error condition) carrying the question, the actor
   (defaults to `*actor*`), and the default fallback the worker itself named. The
   signalling frame is still alive when a handler runs.
2. **Three restarts, matching the three things a coordinator can actually say:**
   - `answer <value>` — the ruling; `escalate` returns VALUE and the worker continues
     from the exact point it stopped. Nothing is re-run.
   - `use-default` — no ruling; `escalate` returns the worker's named default.
   - `abandon` — unwind to the enclosing `with-work-unit`, which yields `:abandoned`;
     with no unit open, `escalate` simply returns `:abandoned`.
3. **The worker never learns which restart was taken, or by whom.**
4. **`with-work-unit`** delimits one abandonable unit as a span on the spine; an abandoned
   unit still closes its span (its `:end` envelope fires — an abandoned unit is visible
   in the trace, not a hole in it).
5. **`with-escalation-policy`** runs a body under a standing policy — a restart name or a
   function of the condition that invokes a restart itself (how a coordinator supplies a
   real ruling). A policy naming a restart that isn't on offer falls through to the next
   handler up, unchanged.
6. **The spine records the stop even if nobody handles it** — the emission happens before
   the signal, and each restart choice is itself emitted.

## Your Output

Test brief + test code to `.madewell/specs/2026-08-05-c001-escalate.test.md`; executable
code to `.madewell/work/verification/escalate-verify.lisp`. Against the loaded
`constellation` system; FiveAM via ocicl. Do NOT modify `constellation.asd`, `src/`, or
`tests/`.

## How We'll Know It's Done

- [ ] Every intent line 1–6 has a check traceable to it
- [ ] **Resume-in-place is proven structurally**: arrange a computation with observable
      side effects both BEFORE and AFTER the `escalate` call inside it; invoke `answer`;
      assert the before-part ran exactly once (not re-run) and the after-part ran with
      the supplied value. A counter the same form increments is not proof — the
      before/after ordering is.
- [ ] All three restarts exercised; `use-default` returns the exact default value named
      at the call site; `abandon` yields `:abandoned` from the work unit (and from a bare
      `escalate` with no unit open)
- [ ] The abandoned unit's span closes (`:end` envelope present for the unit's name) —
      asserted against the actual spine
- [ ] `with-escalation-policy` exercised in both forms (restart name; function supplying
      a ruling), including the fall-through case
- [ ] State restored on every path; no run-order dependence; no mocks; no pinned
      volatile refs

## What Could Go Wrong

1. Mistaking "the restart ran" for "execution resumed at the signal site" — the finding
   this package exists to catch or confirm.
2. Handler-run-position confusion: the handler runs while the signalling frame is alive;
   checks that unwind before asserting will see nothing.

## Out of Scope

Fixes. Report contract ambiguities in the test brief.
