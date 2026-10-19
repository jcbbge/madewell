---
name: made-well
description: Run work durably through Made Well on Pi Durable - separate agents per phase (discover, ideate, challenge, plan, test-plan, implement, verify), state kept on disk, survives crashes. Use when the person asks to run something durably, to start, check, resume or answer a Made Well work unit, or to see what a unit is waiting on.
---

# Made Well

Made Well runs one unit of work through separate agents, one per phase, and keeps the whole record
on disk. You do not do the phases yourself. You start the unit, let it run in the background, report
its state in plain words, and pass the person's answers back when it waits on them.

Every command below is `pi-durable`. If that is not on PATH, use exactly this instead:

    {{cli}}

Always pass `--workspace <dir>`: the folder the work is about. Every command then uses that
workspace's record, the same one pi and Codex see.

## Start a unit

Write the source to a file: the person's request in their own words, then the facts, paths, scope,
constraints and what "done" means. Then:

        pi-durable start --objective "<one line>" --source-file <file> --workspace <dir>

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

`status` shows the state `human-hold` and the questions. Put them to the person as they are. Write
their answer, in their words, to a file, then:

    pi-durable answer <id> <answer-file> --workspace <dir>

The runner continues the work.

For a failed check, the answer must name its cause, one of:

- `pre-existing` - the defect was there before this work; it gets its own fix first
- `implementation` - the making was wrong; the planner plans again
- `test` - the check was wrong; the check designer writes it again

        pi-durable answer <id> <answer-file> implementation --workspace <dir>

## Inspect or resume

    pi-durable show <id> --workspace <dir>      # objective, phase, holds, failures, attempts
    pi-durable report <id> --workspace <dir>    # the last worker's report
    pi-durable run --background --workspace <dir>   # resume after a crash or a stop

State `stopped` or `worker-failed` means start the runner again; it continues from the saved state.

## If nothing can run

    pi-durable doctor

It says which harnesses and cards work on this machine and how to fix what does not.
