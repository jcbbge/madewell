# Made Well

An opinionated, durable software delivery pipeline for coding agents. It runs in any harness and on any provider and model.

Made Well is two vending machines. Each takes one input and produces one output, every time:

```
DISCOVERY   raw context (notes, transcripts, meetings)  →  candidate work items (features, fixes, chores)
DELIVERY    one promoted work item                      →  that item shipped: checks green, merged, deployed
```

[FOUNDATION.md](FOUNDATION.md) is the operator's law and governs everything here.

## Delivery

Four stages, run by six agent profiles, each a separate job on its own card:

| Stage | Jobs (profile) |
|---|---|
| ideation | ideate (ideator) → challenge (ideation peer) |
| planning | plan (planner) → test-plan (test architect) |
| implementation | implement (implementer) |
| verification | verify (verifier) → **every check passes: ship**, using the project's `madewell.json` `"ship"` command |

When a check fails, the arbiter rules on whose failure it is:
- **Bad test:** the test architect rewrites the checks, then they run again. The implementation is not rebuilt.
- **Bad implementation:** the planner replans.
- **Pre-existing defect:** it becomes its own item, starting at planning. The original item waits, then re-verifies.
- **Undetermined, or three corrections without a pass:** the item holds for the operator.

**Every agent-to-agent hand-off is an NQ exchange.** The receiver first states its understanding in a read-only intake and either confirms or asks. Whoever handed the work over answers. After three answered turns with questions still open, that one item holds for the operator. The exchange covers:
- dispatcher → first job, and each job → the next;
- failing job → arbiter, and arbiter → the job it rules responsible;
- operator → the job an answer routes to;
- a replacement agent after a quota swap.

**The work item is the durable object.** Every transition is saved to one SQLite record before the next call. Kill anything at any point; `mw run` resumes at the interrupted call.

**A usage limit never stops the work.** The call continues on the next card in its tier whose account has quota. When every account is out, the item waits for the earliest reset and continues by itself.

## Use

Requires Node 22.18 or later, which runs the TypeScript sources directly.

```sh
npm install && npm link   # puts `mw` on your PATH
mw start --objective "<one line>" --source-file <operator's words> [--workspace <dir>]
mw run [--watch]          # deliver queued items, oldest first
mw status [id]            # summary, items, and the next commands
mw show <id>              # one item and its full event history
mw answer <id> "<answer>"                                      # answer an agent's open questions
mw answer <id> --cause implementation|test|pre-existing "<answer>"   # rule on a failed check
mw retry <id>             # rerun a held call
```

Every command prints JSON. Results go to stdout. Errors go to stderr as `{error, message, context, cause?, next}` with exit code 1. Every answer lists the `next` commands that move the work.

- **Cards:** `prescriptions.json` maps each job to a tier and an access level, and each tier to an ordered list of cards (harness + provider + account + model + effort). Override its path with `MW_PRESCRIPTIONS`.
- **Store:** `~/.local/share/madewell/madewell.db`. Override with `MW_STORE`.
- **Any harness:** plug one in with `MW_WORKER_COMMAND`. The command reads `{kind, item, job, profile, card, access, system, prompt, cwd}` as JSON on stdin. It prints one of `{"ok":true,"output":…}`, `{"ok":false,"limit":{"account","resetsAt","message"}}` or `{"ok":false,"error":…}`.

## Status: required, implemented, demonstrated

**Implemented and demonstrated by tests (`npm test`):**
- the delivery lane and its auto-ship;
- arbiter routing for all four rulings, including prerequisites;
- NQ on every hand-off the pipeline makes, the three-turn hold, operator answers, and authority holds;
- the quota swap, and waiting for the earliest reset;
- holds with their next commands;
- crash recovery (`SIGKILL` mid-job);
- the runner lock;
- JSON errors.

**Required, not built yet:**
- **Harness adapters:** built-in Claude Code, Codex and pi adapters, including their usage-limit detection. Until then, use `MW_WORKER_COMMAND`.
- **Discovery:** the lane itself, and promoting its items into delivery.
- **Running items:**
  - several items running in parallel;
  - one worktree per item.
- **NQ:**
  - a question carried across hand-offs counting once;
  - the dispatcher reading the operator's source before an authority hold;
  - the final report returned to the dispatcher;
  - hold alerts;
  - refusing hand-offs with missing parts;
  - sub-agent exchanges, which are covered only by the worker prompt.
- **Observability:**
  - evals per step;
  - the debug-mode trace exporter (every call already runs in a named span);
  - status views.

## Develop

```sh
npm test
npm run typecheck
```
