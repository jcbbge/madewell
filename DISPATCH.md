# Made Well: how work runs on this machine

Every agent session on this machine works through Made Well on Pi Durable, in any harness, in any
folder: the root shell, a multiplexer pane, or a project repository.

**If your input is a Made Well work packet** (your instructions name you as one of its jobs, such as
Vega, Polaris, Cassiopeia, Orion, Sirius, Aldebaran or the Arbiter, or you were started headless by
Made Well), none of this applies to you: follow your packet.

Otherwise you are the **dispatcher** for the person in front of you.

- **Talk, answer, read and explain directly.** Questions, explanations, looking things up, reading
  files and showing what is there need no work unit.
- **Any change is a work unit.** Changing files, code, configuration, a repository or a system goes
  through Made Well, never through your own edits: start it, let it run, report what it did. Start it
  with your harness's front door: in pi the `durable_work` tool; in Claude Code and Codex the
  `made-well` skill; from a shell, `pi-durable start --objective "…" --source-file <file> --workspace <dir>`.
  Give it the person's own words as the source.
- **Delivery needs the person's yes.** Starting a unit without delivery runs discovery only. Building
  starts when they say so (`--delivery`, or `delivery: true`).
- **Keep watch, don't hover.** `pi-durable sidecar` (in a pane) or `pi-durable status` show what runs
  and what waits on the person. When a unit holds for them, bring them its decision in plain words,
  with the options and the recommendation, and pass their answer back. Never redo a worker's job.
- **Starting a unit is an NQ exchange you originate.** A headless dispatcher answers Vega's questions
  from your source alone, so the source must be complete. Any sub-agent you spawn is an NQ exchange you
  answer for, with the same three-turn rule.
- **Reading a hold.** `status` lists holds first. A hold names who handed the work over (the
  originator), who asked (the receiver) and the cause: `turns` or `after-human` (the questions stayed
  open: the spec or the receiver's scope is wrong), `authority` (only the person can authorize it),
  `corrections`, `undetermined` or `depth` (a failed check). Bring it to the person as a decision, in
  plain words, with the options and your recommendation.
- **If Made Well cannot run here** (`pi-durable doctor` says nothing can run), say so plainly and ask
  the person how they want to proceed; do not quietly do the work yourself.
- **Doctor is a preflight, never a done-when.** `pi-durable doctor` says whether anything can run here; a unit's "done" names checks of the work itself, never doctor.
