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
- **NQ.** Before a phase executes, the worker states its understanding and asks; the originating agent answers, headless, as the role that made the handoff (the dispatcher for discovery, the previous phase normally, the Arbiter after a failure ruling), from its own handoff. The executing worker gets the whole exchange. Three turns still unclear (the spec or the receiver's scope is wrong), or missing authority → that work item holds and the human is alerted. Every agent-to-agent hand-off follows it: phases, the Arbiter, the authority consult, a human answer.
- **A failed test is a question.** The Arbiter decides whose: bad test → Orion, bad implementation → Cassiopeia replans, pre-existing bug → a linked prerequisite thread. Undetermined → you. Three failed corrections → you.
- **Recovery is redrive.** Kill anything. Drive again: Pi Durable re-enters the interrupted phase and the worker continues its own pi session.
- **Discovery feeds delivery; nobody approves it.** Discovery splits a request into items. Each item joins the delivery queue as its own thread, starting at ideation with the discovery report as its handoff. One runner per store delivers them one at a time: discovery runs the operator put first (`pi-durable first <id>`), then oldest first, items in the order discovery found them. The order is read again before each item.

[FOUNDATION.md](FOUNDATION.md) governs.

## Install

Clone it and point your agent at [PROVISION.md](PROVISION.md): *"set this up: follow PROVISION.md"*. It checks Node, installs the packages, finds which harnesses are installed and signed in, puts each one's front door in place, checks the machine's guard hooks, and tells you what can run.

```sh
git clone https://github.com/jcbbge/madewell.git && cd madewell
git checkout fold                 # until the fold lands on main
```

Requires Node ≥ 22.19 and at least one harness, signed in: Claude Code (`claude`), Codex (`codex`) or pi (`pi`, any provider). Each job uses the first card in its tier whose harness is installed and whose provider account has quota, so one harness is enough and more harnesses mean more room to swap. Edit `prescriptions.json` to change which cards each job may use. Update the upstream packages any time with `npm run update`.

The front doors (in [`harness/`](harness)): pi gets the package itself (`pi install "$PWD"`: `durable_work`, `/work`, the footer); Claude Code and Codex get a `made-well` skill that drives the `pi-durable` command.

## Use

In pi, just say it: *"run this durably: …"*. The agent calls `durable_work start`. The footer shows the phase; `/work` shows details. When something waits on you, answer in chat — for a failed test, say the cause (pre-existing / implementation / test) and what to do.

Command line, same store:

```sh
pi-durable start --objective <text> (--source <text> | --source-file <path>) [--workspace <dir>]
pi-durable first <id>      # this discovery run's items go next
pi-durable run [--background]   # the runner (start, answer and first launch it)
pi-durable status [id]          pi-durable watch [id]
pi-durable drive <id> [--model provider/model] [--background]   # --model: force every job onto pi with one model, no swaps
pi-durable answer <id> <answer.txt> [pre-existing|implementation|test]
pi-durable show <id>            pi-durable report <id>
pi-durable doctor [--json]      pi-durable provision [--yes]
```

`--workspace <dir>` on any command uses that workspace's store, the same one pi and the skills use. `doctor` reports what can run here (harnesses, sign-in, cards per tier, front doors, guard hooks) and the fix for each problem; `provision` installs the front doors and never replaces a changed file without `--yes`.

Stores live under `~/.local/share/pi-durable/workspaces/<hash>` per workspace (`WORK_DATA` overrides). One process owns a store; a dead owner is replaced automatically on the next drive.

## Delegated worker updates

External workers use the same work record and NQ exchanges; these verbs do not launch them:

```sh
pi-durable delegate open assignment.json
pi-durable delegate started <id> understanding.txt --actor <worker>
pi-durable delegate progress <id> update.txt --actor <worker>
pi-durable delegate locate <id> where.json --actor <sender>
pi-durable delegate dead <id> explanation.txt --actor <sender>
```

Post `progress` at each step with the tangible result or blocker in your own words. It records evidence only: it never clears a question, releases a hold, or accepts work. The board shows the worker's latest line and its age. Final delivery still uses `reported`, followed by the sender's return exchange and acceptance.

An assignment's `where` object may contain `tmux`, `steps` (TASKS.md path), and `repo`; `locate` merges updated hints without changing lifecycle or NQ. Paths resolve relative to the assignment workspace; absent paths default to `TASKS.md` and that workspace's repo. Checked tasks still present in the ledger count as recorded completions; removed tasks do not. `dead` is sender-only, terminates an unreported worker without accepting its unfinished work, and preserves the evidence.

The sidecar samples tmux and foreground process names read-only. Missing exact tmux targets are dead; shell-only panes are stale; unavailable probes are unknown. Only observed live delegated agents count as running. A process is not completion evidence.

Delegated cards show activity age in seconds, the ledger's NOW tasks and retained completion count, latest worker update and age, numeric pi footer context/tokens/printed cost when available, and the workspace repo's last commit plus uncommitted file count. Raw pane content is never retained. On older tmux versions without pane activity, a single-pane window supplies output time; a multi-pane window cannot attribute its activity to one pane and stays unknown. Missing usage is unknown, not zero. `pi-durable demo` exercises these same columns with explicitly synthetic live, dead, stale and unavailable examples; it probes no agents or repos.

## See it: the run view

Starting pi starts it: http://localhost:7788, for as long as that pi session runs. The footer reads `durable ✓ · localhost:7788` when Pi Durable is connected. `pi-durable serve` runs it without pi and opens it in your browser (from a terminal; `--no-open` skips that). It prints the address, and if the dashboard already runs on that port it says so and uses it.

`serve` shows the workspace you are in (`--workspace <dir>` names another, `--all` shows every workspace store). The page is the end-to-end Made Well picture, drawn from the durable record and nothing else: what is happening now and who holds it; where the work is (discovery, what waits on you, the four delivery stages with how long each took, how many are done); what the operator sees, the same text as the sidecar; six rules checked on the selected item, each with its evidence; the one list of every item (click one to select it); and telemetry: counts, the stops you caused and the minutes waited, checks passed and failed, tokens and cost, minutes per stage, and a log. A figure the record does not hold shows as — and says why when you hover.

Live is the default. **◀ Back**, **Step ▶**, **Play**, **Start over** and the slider (or ← →) replay the selected item over its own record, event by event; Play stops where the item waits on you. **Live** returns.

When an item waits on you, the page asks the question and takes the answer: type it and press **Send answer** (for a failed check, press the cause: pre-existing, implementation or test). The answer is sent through the CLI and the item continues. An item awaiting your go-ahead has **Start building**. If another item's driver owns that store, the button is off and the page shows the command to run instead; it never writes to a store itself, and it accepts an answer only from this machine, from its own page.

On a remote machine, forward the port over ssh (for example `ssh -L 7789:localhost:7788 <host>`) and open http://localhost:7789.

## Sidecar

Run `pi-durable sidecar` in a pane. It is one plain terminal program, read-only like the dashboard, and shows the same text as the run view's "what the operator sees": who needs you (a count and the numbers), each as a decision card with the exact command to answer; NOW, what is running, with its stage, its job, the harness and model doing it, any question turn and the fix items it waits on; TO-DO, the items nobody has started and how to start them; any account out of quota and when it resets; and what finished today. `--workspace <dir>` narrows it to one workspace; by default it shows every store, so a pane never hides a hold. It redraws on change or every 2 seconds; `q` or Ctrl-C quits. `--once` prints one frame and exits; `--width N` sets the width. Colour is used on a terminal unless `NO_COLOR` is set.

It is built for a right-hand third of the screen (60–90 columns). In tmux:

```sh
tmux split-window -h -l 33% 'pi-durable sidecar'
```

In herdr, run the same command in a pane.

## Test

`npm test` — a scripted fake pi plays every role (no model calls): the full lifecycle, every Arbiter ruling, the 3-correction hold, NQ holds, a real `kill -9` redrive, and the extension (no tool blocking).
