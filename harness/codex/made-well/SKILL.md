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
workspace's record, the same one pi and Claude Code see.

## Start a unit

1. Write the source to a file: the person's request in their own words, then the facts, paths,
   scope, constraints and what "done" means.
2. Ask yourself whether the person authorized building, not only looking. Only then add `--delivery`.

        pi-durable start --objective "<one line>" --source-file <file> --workspace <dir> [--delivery]

It prints the unit's `id` and starts the driver in the background. Starting is not finishing.

## Watch it

    pi-durable status <id> --workspace <dir>          # the state, the phase, what happens next
    pi-durable status <id> --workspace <dir> --json   # the same, for reading

Check status when the person asks or after a while; do not loop on it. Do not run
`pi-durable watch`: it follows the unit live and never exits; it is for the person's own terminal.

## When it waits on the person

`status` lists holds first (state `human-hold`) with the questions. A hold names who handed the work over, who asked and the cause. Put them to the person as they are. Write
their answer, in their words, to a file, then:

    pi-durable answer <id> <answer-file> --workspace <dir>
    pi-durable drive <id> --background --workspace <dir>

For a failed check, the answer must name its cause, one of:

- `pre-existing` - the defect was there before this work; it gets its own fix first
- `implementation` - the making was wrong; the planner plans again
- `test` - the check was wrong; the check designer writes it again

        pi-durable answer <id> <answer-file> implementation --workspace <dir>

If the state is `delivery-authorization-required`, ask the person whether to build. Only on a yes:

    pi-durable drive <id> --delivery --background --workspace <dir>

## Inspect or resume

    pi-durable show <id> --workspace <dir>      # objective, phase, holds, failures, attempts
    pi-durable report <id> --workspace <dir>    # the last worker's report
    pi-durable drive <id> --background --workspace <dir>   # resume after a crash or a stop

State `stopped` or `worker-failed` means drive it again; it continues from the saved state.

## If nothing can run

    pi-durable doctor

It says which harnesses and cards work on this machine and how to fix what does not.
