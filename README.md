# Made Well

**An ontology of work, and a way to run it with agents.**

Work has four acts: think it through, decide the next cut, make it, check it against what
you expected. They recur at every scale. Everything else in this repo exists to keep you
honest about them.

Made Well is **files in your repository**. There is no CLI, no service, no database, and
no account. If you delete the tooling, the work is still there and still legible.

```
ideate  →  plan  →  implement  →  verify
└─ Ground ────────┘  └─ the Jig ─────────┘
```

---

## Install

```sh
git clone https://github.com/jcbbge/madewell
sh madewell/install.sh /path/to/your/project
```

It drops a `.madewell/` directory in, appends a loader line to `CLAUDE.md` / `AGENTS.md`,
and touches nothing else. Re-running it re-syncs the framework and leaves your work alone.

Remove it with `sh madewell/install.sh --uninstall /path/to/your/project` — no residue.

**Requirements:** git, and a POSIX shell. That's the whole list.

---

## Start

Tell your coding agent:

> **Let's build.**

It reads `.madewell/AGENTS.md` and takes it from there. You steer; it does the bookkeeping.

---

## What you actually get

**Three directories, and position is path.**

```
.madewell/
├── stock/       material on the rack. Grows without limit — that's correct.
├── bench/       what's being worked. One pair of hands per piece.
└── finished/    done.
```

To ask where something is, look at where it is. There is no status field to keep in sync,
no JSON to reconcile, no ledger to replay. `ls` is the entire interface.

**A piece moves by `git mv`, one move per commit.** Four moves are legal; a pre-commit stop
(`.madewell/bin/mw-gate.sh`) refuses everything else. Work only ever moves forward.

**To leave the rack, a piece says four things:**

```markdown
**Making:** …
**Not making:** …
**Done when:** …
**Waits on:** …
```

That's it. Nothing may demand a file list or a task breakdown at that point — those facts
don't exist yet.

---

## The two practices

Both exist for **one** failure, and it isn't getting things wrong. It's **re-deciding
something that was already decided.**

**Ground** covers *ideate* and *plan*. In etching, the ground is the acid-resist you lay on
the plate before cutting a single line — no mark before the ground is laid. Here: make the
existing decisions present before designing anything. The dominant failure in agent-assisted
work is not choosing wrong. It's never thinking to look.

**The Jig** covers *implement* and *verify*. A jig makes the wrong cut physically impossible
— not advice, a stop. Tests tell you whether a thing *works*. A jig tells you whether you
*re-decided* something. Perfect CSS that reinvents a design system you already built passes
every test and is still wrong; no correctness gate can see that, and a jig can.

You build a jig after making the same mistake twice. Every shop fills up with them, and each
one is a fossilised correction.

---

## Why four agents, and no more than six

Four minimum, because the acts must not collapse into each other. **You don't proof your own
plate** — whoever imagined it doesn't prove it worked; whoever cut it doesn't sign it off.
One agent doing all four grades its own work, and when that fails, the failure gets blamed
on the model.

Six at most, because past that the coordination costs more than the work.

---

## What this is not

- **Not a project-management tool.** No dashboards, no burndown, no estimates.
- **Not a planning system.** You have a destination; you don't have a route. This is built
  for cheap course correction, not plan adherence.
- **Not a linter.** Jigs enforce *your* prior decisions, not a style guide's.
- **Not opinionated about your stack.** It's markdown files and `git mv`.

---

## Repository map

| Path | What it is |
|---|---|
| `MADEWELL.md` | **The model.** Four acts, two practices, three states. ~110 lines. Read this first. |
| `SPEC.md` | Where work lives and how it moves. Names no meanings. |
| `.madewell/AGENTS.md` | Instructions to the agent. |
| `.madewell/bin/mw-gate.sh` | The jig that enforces the four moves. POSIX sh, zero deps. |
| `.madewell/skills/` | Thinking lenses — domain-neutral, optional. |
| `cartridges/` | Domain patterns. Load the one for the work in front of you. |
| `madewell-deck.html` | A 15-slide walkthrough. Open it in a browser. |

**`MADEWELL.md` and `SPEC.md` are the only normative documents.** If anything else
disagrees with them, they win. If anything else restates them, it's a bug — delete it.

---

## Contributing

The bar for adding a document is high: **if it restates the model, it doesn't go in.** This
framework previously carried sixteen terms across six metaphor systems to describe a process
with four positions. That was the bug, and it's the one most likely to come back.

Adding an operation to a pattern is composition and welcome. Replacing one of the four acts
is a different framework wearing this one's name.

---

## Licence

MIT.
