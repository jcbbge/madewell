# The fold: Constellation and Pi Durable into Made Well

Operator rulings of 2026-10-16. This file is the one place they are written down. `FOUNDATION.md`
stays operator law; where the two differ, this file records the newer ruling and the change made.

## What the fold is

Made Well is one thing. Its grammar is the list of work (`REDESIGN.md`). Constellation was how
agents carried the grammar out; Pi Durable is what makes a run survive a crash. They become one
engine on Pi Durable.

**The work is the durable thing, not the agent.** A piece of work carries its contract (Making /
Not making / Done when / Waits on) and a prescription: what kind of worker each step needs. Any
harness, provider and model can pick it up. The only real agent is the dispatcher, which starts,
stops and steers work and never does it.

## The jobs

The star names (Vega, Polaris, Cassiopeia, Orion, Sirius, Aldebaran) are kept as labels only.
Each names a job.

| Job | Label | Stage | Thinks? | May change |
|---|---|---|---|---|
| Dispatch | concierge | — | yes | the work record, through its verbs; never project files |
| Discover | Vega | discovery | yes | the to-do list only |
| Ideate | Vega | ideation | yes | nothing |
| Challenge | Polaris | ideation | yes | nothing |
| Plan | Cassiopeia | planning | yes | nothing but the plan |
| Design the check | Orion | planning | yes | check files only |
| Make | Sirius | implementation | **no** | only what the plan names |
| Run the check | Aldebaran | verification | **no** | nothing |
| Rule on a failure | Arbiter | verification | yes | nothing |

Every job is a fresh session. The maker never writes or runs its own check.

## The rulings

1. **Checks are written before the making, blind to it.** They verify intent, not only
   correctness. Correct code that ignores the project's design system passes a correctness
   check and still misses the point. A correctness check after the making is an optional extra,
   not part of the minimal setup.
2. **A failed check has three sources.** This is definitive.
   - pre-existing defect → its own work item; the original waits, then runs its checks again
   - bad implementation → back to the **planner**
   - bad test → back to the **check designer**
3. **The maker and the check runner are vending machines.** They execute. They don't think,
   plan, design or improvise, and they never change the spec under everyone else. If the plan is
   wrong, they stop and report it.
4. **Ruling on a failure is its own job** (the Arbiter), separate from the challenger.
5. **Only the work unit is checked.** A delivery is one discovered work unit. The runner runs that
   unit's named checks, never the whole suite, pipeline or app.
6. **Prescriptions are a config file** (`prescriptions.json`). Each job maps to a tier and an
   access level; each tier maps to an ordered list of cards.
7. **A card is always harness + provider + model** (plus effort). Claude Code is Anthropic's
   harness, Codex is OpenAI's, and pi is an open harness that takes any provider. Quota belongs to
   the provider account, not the harness.
8. **When a usage limit hits, swap automatically.** The operator is not involved; the goal is to
   finish the work unit. The swap moves to the next card in the same tier on a **different provider
   account** and is written to the work record.
9. **One worktree per work unit, for now.** A VM or sandbox per unit is the likely direction, but
   that infrastructure isn't built until the industry settles. The QA problem comes first: a
   running copy of the unit's app to open in a browser.

## The NQ protocol (required at every handoff)

Every transition of work between agents runs NQ. It cannot be turned off.

1. **Ask.** The receiving agent states what it understood and is asked for questions. If it has
   none, it starts work. Rounds are never invented for a clear handoff.
2. **Answer.** The **originating** agent answers: a fresh headless call on its own card, given its
   own handoff and the questions. For the first step the originator is the dispatcher; after a
   failure ruling it is the Arbiter.
3. **Repeat.** Each question and answer is one round.
4. **Flag after three.** If questions remain after three rounds, the handoff was ambiguous or
   wrong. The work stops on a hold and flags the operator automatically. No fourth round, and no
   switching agents to get around it.

**Authority.** When the originator says only the operator can authorize something, the dispatcher
first reads the operator's own source. If the source authorizes it (explicitly, or as a necessary part
of what it asks for) or forbids it, the dispatcher answers and the work goes on. It holds for the
operator only when the source leaves it open, or it is destructive, irreversible, or touches
production, money, credentials or anything outside the workspace.

The exchange is durable Pi Durable state. It survives a crash, a harness swap mid-exchange
doesn't use up a round, and the whole exchange reaches the agent that executes.

Change to `FOUNDATION.md`: its NQ section said "the manager answers". It now says the originating
agent answers.

## Tiers

Pairings across vendors are judgment, not documented equivalence; calibrate them on real work.

| Tier | Jobs | Anthropic | OpenAI |
|---|---|---|---|
| deep | discover, ideate, challenge, plan, design the check, rule on a failure | Claude Code · opus · high | Codex or pi · gpt-6-astra · high |
| coding | make | Claude Code · sonnet · low | Codex or pi · gpt-6.1-sol · low |
| steady | (spare) | Claude Code · sonnet · medium | Codex or pi · gpt-6.1-sol · medium |
| fast | run the check, intake | Claude Code · haiku · low | Codex or pi · gpt-6-luna · low |

The originator's answer uses the card of the job that made the handoff. Keep Codex `ultra`, Claude
`opusplan` and fast mode out of workers' cards.

## The swap

A worker that hits a limit can't take another turn, so everything a successor needs must already
be on disk or on the record:

- the work unit, step, round and contract (the work record)
- the worktree, its base commit and current HEAD, plus uncommitted changes (stashed or committed
  as work in progress)
- the step's task list
- the last turns of the outgoing transcript, summarised into a "picking up" section of the new
  brief
- the outgoing card, session ID and the limit: account, type and reset time

Transcripts don't move between harnesses; the worktree, the record and the brief do. Swap back at
the next step boundary after the reset time passes.

Limit signals per harness (detected from transcripts, never from exit codes, which are
undocumented):

- Claude Code: `"error":"rate_limit"` with `quotaLimits.resetsAt`
- Codex: `rate_limit_reached_type` / `usage_limit_reached`, with `primary.resets_at`
- pi: "You have hit your ChatGPT usage limit … Try again in ~N min."

## Build order

Each step is one work unit, run through the process itself once the process can run it.

1. NQ with the originator answering, and the exchange reaching the executor.
2. Prescriptions read per job.
3. Launch any card (Claude Code, Codex, pi).
4. Automatic swap on a usage limit.
5. A worktree per work unit.
6. The terminal sidecar (herdr on the Mac, tmux elsewhere), reading the one record.
7. A QA preview per work unit.

Left alone: the Lisp runtime (the long-term rewrite) and the Constellation shell kernel (it retires
once this engine covers what it does).

## Status after the first pass (2026-10-16)

Built on branch `fold` (tests: `npm test`, all fakes; no real harness runs in tests):

- NQ with the originating agent answering, on its own card; the exchange reaches the executor.
- Every job, intake, originator and Arbiter call runs on its prescribed card (`prescriptions.json`).
- Launching Claude Code, Codex and pi from a card (`cards.mjs`), with each harness's usage-limit
  signals read from its own error and result events.
- Automatic swap on a usage limit to another provider account, recorded on the attempt; all
  accounts out ends the drive as `out-of-quota`. Accounts are shared across workspaces through
  one `accounts.json` in the data directory.

Still open:

- **Never run against real harnesses yet.** Claude's and Codex's live limit records, Codex's
  `--json` rate-limit events, and whether Haiku accepts `--effort` are read from docs and
  binaries, not observed. One supervised real run per harness should come first.
- A Claude worker that died before writing its session fails `--resume` three times
  (`worker-failing`); fall back to a fresh `--session-id`.
- On Codex the `run` access is `workspace-write`, so the Arbiter and the check runner can edit
  files; only their brief forbids it. Check the diff after those steps.
- Stores written before this change (attempts without a card, exchanges awaiting a manager) are
  not migrated. Start fresh stores on the new code.
- Worktree per work unit, the terminal sidecar and the QA preview are not started.
