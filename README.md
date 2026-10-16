# Made Well on Pi Durable

You talk to pi. When work should be durable — multi-phase, crash-proof, run by separate agents — pi uses `durable_work`, and this application runs it on **Pi Durable**.

```
you ── chat ──▶ pi (your pi: extensions, skills, settings, login)
                 │  durable_work · /work · footer status
                 ▼
               pi-durable driver ── Pi Durable Harness ── one SQLite file   ← the state
                 │
                 ▼  each phase is a separate, real `pi` process
   discover → ideate → challenge → plan → test-plan → implement → verify
     Vega      Vega     Polaris  Cassiopeia  Orion     Sirius   Aldebaran
```

- **The state** is the work record in SQLite: objective, source, phase, round, briefs, NQ exchanges, attempts, failures, holds. Every change is a Pi Durable commit.
- **Every job runs on a card: harness + provider + model + effort.** `prescriptions.json` maps each job to a tier and an access level (read, checks, make, run), and each tier to an ordered list of cards (Claude Code, Codex, pi). Workers load the harness's own configuration. The maker and the check runner only execute, at low effort; thinking happens in planning.
- **A usage limit swaps automatically.** Quota belongs to the provider account. When a run hits a limit, the account is marked out until its reset and the same step continues on the next card in its tier on another account, in the same workspace, with a "picking up" note. The swap is on the record. Every account out → the drive stops as `out-of-quota` with the first reset time.
- **NQ.** Before a phase executes, the worker states its understanding and asks; the originating agent answers, headless, as the role that made the handoff (the dispatcher for discovery, the previous phase normally, the Arbiter after a failure ruling), from its own handoff. The executing worker gets the whole exchange. Three rounds still unclear (the handoff is ambiguous or wrong), or missing authority → human.
- **A failed test is a question.** The Arbiter decides whose: bad test → Orion, bad implementation → Cassiopeia replans, pre-existing bug → a linked prerequisite thread. Undetermined → you. Three failed corrections → you.
- **Recovery is redrive.** Kill anything. Drive again: Pi Durable re-enters the interrupted phase and the worker continues its own pi session.
- **Discovery never authorizes delivery.** Building needs `delivery: true` (recorded on the work).

[FOUNDATION.md](FOUNDATION.md) governs.

## Install

```sh
git clone https://github.com/jcbbge/madewell.git && cd madewell
git checkout fold                 # until the fold lands on main
npm install                       # tracks @latest pi-durable / pi-ai / chord; no lockfile
npm link                          # optional: pi-durable on PATH
pi install "$PWD"                 # adds durable_work to pi; /reload open sessions
```

Requires Node ≥ 22.19 and at least one harness, signed in: Claude Code (`claude`), Codex (`codex`) or pi (`pi`, any provider). Each job uses the first card in its tier whose harness is installed and whose provider account has quota, so one harness is enough and more harnesses mean more room to swap. Edit `prescriptions.json` to change which cards each job may use. Update the upstream packages any time with `npm run update`.

## Use

In pi, just say it: *"run this durably: …"*. The agent calls `durable_work start`. The footer shows the phase; `/work` shows details. When something waits on you, answer in chat — for a failed test, say the cause (pre-existing / implementation / test) and what to do.

Command line, same store:

```sh
pi-durable status [id]          pi-durable watch [id]
pi-durable drive <id> [--delivery] [--model provider/model] [--background]   # --model: force every job onto pi with one model, no swaps
pi-durable answer <id> <answer.txt> [pre-existing|implementation|test]
pi-durable show <id>            pi-durable report <id>
```

Stores live under `~/.local/share/pi-durable/workspaces/<hash>` per workspace (`WORK_DATA` overrides). One process owns a store; a dead owner is replaced automatically on the next drive.

## See it: the live dashboard

Starting pi starts it: http://localhost:7788, for as long as that pi session runs. The footer reads `durable ✓ · localhost:7788` when Pi Durable is connected. (`pi-durable serve` runs it without pi.)

Every workspace store, every thread: the phase rail with the current position and rounds, what is in flight right now (agent, pid, elapsed, time since last output, live tool calls and output, tokens, cost), a swimlane of who did what when (phases, intake, originator, Arbiter, you), latency per phase / judgment call / tool, and every transition. A worker is flagged **silent** after 5 minutes without output, **worker dead** if its process is gone, **no driver** if nothing is driving.

On a remote machine, forward the port over ssh (for example `ssh -L 7789:localhost:7788 <host>`) and open http://localhost:7789.

## Sidecar

Run `pi-durable sidecar` in a pane. It is one plain terminal program, read-only like the dashboard, and shows only what needs you or is moving: what waits on you, each as a decision card with the exact command to answer; what is in progress, with its stage, its job, the harness and model doing it, any question round and the fix items it waits on; any account out of quota and when it resets; and the last few finished units. It redraws on change or every 2 seconds; `q` or Ctrl-C quits. `--once` prints one frame and exits; `--width N` sets the width. Colour is used on a terminal unless `NO_COLOR` is set.

It is built for a right-hand third of the screen (60–90 columns). In tmux:

```sh
tmux split-window -h -l 33% 'pi-durable sidecar'
```

In herdr, run the same command in a pane.

## Test

`npm test` — a scripted fake pi plays every role (no model calls): the full lifecycle, every Arbiter ruling, the 3-correction hold, NQ holds, a real `kill -9` redrive, and the extension (no tool blocking).
