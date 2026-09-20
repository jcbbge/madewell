# Orchestrate — execute pieces without losing their obligations

Use the execution binding in `bindings/SESSION.md` (package checkout:
`kernel/bindings/SESSION.md`). The executable contract is SPEC.md §6.
A prose event recipe is not a substitute for a running gate.

## One piece, one execution owner

Default to one piece at a time. Parallel width is the lead's explicit decision.
Partition independent pieces before dispatch; do not assign overlapping file
scopes to concurrent makers. A session owns one piece and records its actor.
The reference door fences duplicate unfinished sessions for that piece; it does
not claim to detect all overlapping source-file scopes across different pieces.

The host owns agent launch and identity. Made Well does not require a particular
agent runtime and does not spawn agents by itself. Each worker uses the same
execution door. A process being launched or becoming idle is not completion.

## Four acts, with recorded work inside each

1. **Ideate:** propose the thinking steps, record the intended outcome and
   exclusions, then accept that act through the door.
2. **Plan:** record the approach, declare the actionable implementation steps
   and verification checks (expected results and dependencies), then advance.
   Implementation stays locked until this checklist exists and planning ends.
3. **Implement:** execute the planned steps through the door. It records what
   ran, who ran it, the result, and supporting artifacts. A failed or interrupted
   command cannot complete a step. New scope requires returning to planning.
4. **Verify:** a different actor runs the declared checks against the actual
   implementation artifacts. Changed evidence invalidates the old conclusion.
   Accept completion only after the checklist and evidence pass.

The lead can inspect the session record throughout. The current act, checklist,
responsible actor, running command, dependencies, failures and evidence are
execution facts—not a separately maintained status narrative.

## Failure and recovery

- Failure preserves the attempt. Use an explicit reason to repeat the necessary
  act; downstream results are reset, while prior cycles remain inspectable.
- Stop records a pause, not success. Resume preserves unfinished obligations and
  explicitly assigns the next actor and time bound.
- After a crash, inspect the durable record. Recovery refuses takeover while a
  recorded command/controller is alive. An expired deadline is not evidence that
  a process stopped or that side effects did not happen.
- Reconcile uncertain side effects before repeating a command. The reference
  binding does not promise exactly-once execution of arbitrary shell commands.
- A previously passed check applies only to its evidence. Never inherit a green
  result after the relevant artifact changed merely because an old event says
  `passed`. A fresh run and a resumed obligation are different facts.

## Finish

Execution `done` means the verification gate accepted the session. It does not
move the piece. Perform the legal finish move separately; existing move gates
still apply. Session execution records never override piece position.

Neither a worker report nor a model's confidence is independent acceptance.
If the host binding is absent, say that execution is not mechanically gated.
