# Package c001-01: Independently verify the grounding door (src/claim.lisp)
**Cycle:** c001 (item i001) · **Date:** 2026-08-05 · **Role spawned:** Test-Designer (then Test-Runner)

## What This Is

Independent verification of the grounding contact point — the first slice, and the
project's thesis in code. This package was written by the coordinator itself, making it
the worst isolation offender of the fan-out: planner, implementer, and test-designer were
one agent. Its green tests prove self-consistency. You prove correctness — or find where
it isn't.

## The Wall (binding)

- Read **only**: this brief, `README.md`, `docs/CONSTELLATION-V6-CONVERGENCE.md`, and
  `src/package.lisp` (the export list is the public contract).
- Never read `src/claim.lisp`, any other implementation file, or anything in `tests/`.
  The existing suite was written by the implementer; reading it contaminates your design.
- Design from intent. If intent and implementation disagree, intent wins the finding.

## Public Contract (from src/package.lisp, acquired this session)

Exports: `acquisition`, `acquisition-id`, `acquisition-kind`, `acquisition-detail`,
`acquisition-result`, `acquisition-ts`, `acquire-command`, `acquire-file`,
`acquire-operator`, `claim`, `claim-subject`, `claim-value`, `claim-acquisition`,
`ground`, `groundedp`, `ungrounded-claim`, `ungrounded-claim-subject`,
`ungrounded-claim-value`, `acquire`, `mark-unknown`, `refuse`, `with-grounding-policy`.

## Behavioral Intent (what the package promises)

From README.md and the file's stated purpose:

1. **An acquisition cannot be faked.** The only way to obtain one is to run the command,
   read the file, or ask the operator. Kinds: `:command`, `:file`, `:operator`,
   `:absent`. `acquire-command` runs the program for real — a non-zero exit is *still a
   successful acquisition* ("it failed" is a fact you acquired). `acquire-file` errors on
   an unreadable path — a file you could not read is not a source.
2. **A claim cannot be constructed without its acquisition.** Subject + value +
   acquisition, bound. Not a value with metadata attached.
3. **`ground` is the door.** A value with nothing behind it does not pass — it *signals*
   `ungrounded-claim` (carrying subject and value), and the stack stays alive while a
   handler picks a restart: `acquire` (supply what was missing, resume in place),
   `mark-unknown` (record the absence honestly), `refuse`.
4. **The worker never learns which restart was taken or by whom.** Recovery is named by
   the worker, chosen elsewhere.
5. **Every acquisition emits on the spine** (`acquire:<kind>` envelopes).
6. `with-grounding-policy` scopes a policy decision to a dynamic extent.

## Your Output

Test brief + test code to `.madewell/specs/2026-08-05-c001-claim.test.md`; executable
verification code to `.madewell/work/verification/claim-verify.lisp`. Tests run against
the loaded `constellation` system (FiveAM available via the repo's ocicl setup; `make
deps` has been run — `ocicl/` is populated). Do NOT modify `constellation.asd`, `src/`,
or `tests/` — your code loads standalone, e.g. via
`sbcl --non-interactive --eval '(asdf:load-system :constellation)' --load <file>`.

## How We'll Know It's Done

- [ ] Verification criteria cover every promise in Behavioral Intent, 1–6, each traceable
      to the intent line it verifies
- [ ] Checks are side-effect-free or restore all state on exit, pass or fail; no
      run-order dependence
- [ ] No mocks (project invariant): `acquire-command` checks use real commands
      (`/bin/echo`, `/bin/false`); `acquire-file` checks use real temp files cleaned up
      on every path
- [ ] The condition/restart behavior is exercised for all three restarts, including
      proof that `acquire` resumes the interrupted computation (a value computed *after*
      the ground door is reached with the resumed result)
- [ ] The spine emission promise is verified against the actual spine contents
- [ ] No pinned volatile refs (HEAD SHAs, timestamps, counters captured at author time)

## What Could Go Wrong

1. Designing against what you assume Lisp conditions do rather than what the contract
   states — the contract above is the authority; SBCL behavior you rely on must be
   exercised, not assumed.
2. Accidently strengthening the contract — if you find yourself testing behavior the
   intent doesn't state, that's a finding to report, not a check to add silently.

## Out of Scope

Fixing anything found. You design; a runner runs; triage judges. Report contract
ambiguities in your test brief.
