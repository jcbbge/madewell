---
name: made-well
description: Run work durably through Made Well on Pi Durable - separate agents per phase (discover, ideate, challenge, plan, test-plan, implement, verify), state kept on disk, survives crashes. Use when the person asks to run something durably, to start, check, resume or answer a Made Well work unit, or to see what a unit is waiting on.
---

# Made Well

Made Well runs one unit of work through separate agents, one per phase, and keeps the whole record
on disk. You do not do the phases yourself. You start the unit, let it run in the background, report
its state in plain words, and pass the person's answers back when it waits on them.

Every command below is `pi-durable`, resolved through PATH. If it is missing, repair the global
installation; never substitute a checkout-specific absolute path.

Always pass `--workspace <dir>`: the folder the work is about. Every command then uses that
workspace's record, the same one pi and Codex see.

## Start a unit

Write the source to a file: the person's request in their own words, then the facts, paths, scope,
constraints and what "done" means (checks of the work itself, never `pi-durable doctor`: see DISPATCH.md). Then:

        pi-durable start --objective "<one line>" --source-file <file> --dispatcher-file <sender.json> --request-id <stable-id> --workspace <dir>

`sender.json` records your own provenance: `actor`, `harness`, `provider`, `model`, `sessionId`,
and `card` (the actual account/effort/model selection when known). Unknown fields are null;
never substitute the receiving worker's identity. Preserve the source verbatim, not a summary.
Reuse the same request ID only when retrying the same call; it deduplicates busy and idle intake.

The dispatcher → first worker handoff starts NQ, like every agent-to-agent interaction.
The receiving worker confirms understanding or asks; the originating dispatcher answers from
the person's source. After three answered turns, remaining questions hold that work for the
person. A human answer still requires the receiver's confirmation before execution.

It prints the unit's `id` and starts the runner in the background. Discovery splits the request
into items; each item joins the delivery queue and runs on its own, oldest discovery first. Nobody
approves delivery. Starting is not finishing. If the runner is busy, `start` prints `queued` and
the runner takes the request between steps.

## Change the order

The person's only say over delivery is the order. When they want a discovery run's items next:

    pi-durable first <id> --workspace <dir>     # <id>: the discovery or any of its items

The item that is running finishes first; the order is read again before each item.

## Watch it

    pi-durable status <id> --workspace <dir>          # the state, the phase, what happens next
    pi-durable status <id> --workspace <dir> --json   # the same, for reading

Check status when the person asks or after a while; do not loop on it. `pi-durable watch <id>
--workspace <dir>` follows it live, so run it in the background if you use it at all.

## When it waits on the person

`status` lists holds first (state `human-hold`) with the questions. A hold names who handed the work over, who asked and the cause. Put them to the person as they are. Write
their answer, in their words, to a file, then:

    pi-durable answer <id> <answer-file> --workspace <dir>

The runner continues the work.

For a failed check, the answer must name its cause, one of:

- `pre-existing` - the defect was there before this work; it gets its own fix first
- `implementation` - the making was wrong; the planner plans again
- `test` - the check was wrong; the check designer writes it again

        pi-durable answer <id> <answer-file> implementation --workspace <dir>

## Receive a report

A final agent report returned to you is another NQ handoff, not merely a status read. Inspect
its return exchange with `show`, then use the same record and your original actor:

    pi-durable return clear <id> <understanding.txt> --actor <actor> --request-id <stable-id> --workspace <dir>
    pi-durable return question <id> <questions.txt> --actor <actor> --request-id <stable-id> --workspace <dir>

The report's originating agent answers questions; the receiver confirms understanding. Three
answered turns with open questions hold only that work. Deterministic status reads need no
extra agent or reviewer. `return answered` is for the originating agent's answer, not the receiver.

## Inspect or resume

    pi-durable show <id> --workspace <dir>      # objective, phase, holds, failures, attempts
    pi-durable report <id> --workspace <dir>    # the last worker's report
    pi-durable run --background --workspace <dir>   # resume after a crash or a stop

State `stopped` or `worker-failed` means start the runner again; it continues from the saved state.

## If nothing can run

    pi-durable doctor

It says which harnesses and cards work on this machine and how to fix what does not.
