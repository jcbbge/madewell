# Made Well

**An ontology of work, and a way to run it with agents.**

Work has four acts: think it through, decide the next cut, make it, check it against what you
expected. They recur at every scale. Everything else here exists to keep you honest about them.

Made Well is **files in your repository**. No CLI, no service, no database, no account. Delete
the tooling and the work is still there, still legible.

```
ideate  →  plan  →  implement  →  verify
└─ Ground ────────┘  └─ the Jig ─────────┘
```

---

## Start here

```
Read .madewell/AGENTS.md. I want to adopt Made Well. Run adopt.
```

Your agent will ask what you actually do all day, have you walk through one job start to
finish, and name the four acts back to you **in your own words** before it uses any of its
own. Then it builds you a trade from your answers and puts one real piece of your work on
the bench. One sitting.

Already know the shape? `Let's build.`

---

## The contract

**What Made Well gives you**

- One place where every piece of work sits, and its position is where it is — no status field
  to keep in sync, no dashboard, no dual entry.
- Work that only moves forward. Nothing silently reverts, nothing gets re-litigated.
- A stop between *I made it* and *it's done*, so nothing grades its own homework.
- A record of why, in `git log`, written as the work happened rather than reconstructed after.
- Domain expertise that plugs in and out without touching the core.

**What Made Well asks of you**

- **Four lines before work starts.** Making, Not making, Done when, Waits on. If you can't
  write them, the work isn't understood yet — that is information, not an obstacle.
- **Someone other than the maker proofs it.** This is the rule people skip and it is the one
  the whole thing rests on.
- **A short bench.** The rack can hold hundreds. What you are actively working cannot.
- **Judgment.** Bookkeeping should cost you nothing; the decisions are still yours, and the
  system will stop and wait for them.

**What it does not do**

Estimates. Burndown. Velocity. Autonomy. It will not run your work while you sleep and it will
not tell you how long anything takes.

---

## Install

```sh
git clone https://github.com/jcbbge/madewell
sh madewell/install.sh /path/to/your/project
```

It drops `.madewell/` in, appends one loader line to `CLAUDE.md` / `AGENTS.md`, and touches
nothing else. Re-running re-syncs the framework and leaves your work alone. Remove it with
`--uninstall` — no residue.

Requirements: git, and a POSIX shell. You could also just copy the files by hand; the
installer isn't doing anything clever.

---

## How a piece moves

```
.madewell/
├── stock/       on the rack. Grows without limit — that's correct, not a backlog.
├── bench/       in hand. One pair of hands per piece.
└── finished/    proofed and done.
```

To leave the rack, a piece says four things:

```markdown
**Making:** a page where someone changes their email
**Not making:** account deletion
**Done when:** the change persists and survives a reload
**Waits on:**
```

Then `git mv` it to the bench. That's the whole interface — `ls` to see where things are,
`git mv` to move them, and nothing ever moves backward. A pre-commit stop
(`.madewell/bin/mw-gate.sh`, optional) refuses illegal moves.

Something on the bench either breaks down or it doesn't. A leaf is `bench/thing.md`. Something
that breaks down is `bench/thing/` with its own `stock/ bench/ finished/` inside, running the
same four acts one depth down.

---

## Ground and the Jig

Two practices, and they exist for **one** failure — which isn't getting things wrong. It's
**re-deciding something that was already decided.**

**Ground** covers ideate and plan. In etching, the ground is the acid-resist laid on the plate
before you cut a single line — no mark before the ground is laid. Here: make the existing
decisions present before designing anything. The dominant failure in agent-assisted work is
not choosing wrong; it's never thinking to look.

**The Jig** covers implement and verify. A jig makes the wrong cut physically impossible — not
advice, a stop. Tests tell you whether a thing *works*. A jig tells you whether you
*re-decided* something. Perfect code that reinvents a design system you already built passes
every test and is still wrong; no correctness gate can see that, and a jig can.

You build a jig after making the same mistake twice. Every shop fills up with them, and each
one is a fossilised correction.

---

## Four agents, and no more than six

Four minimum, because the acts must not collapse into each other. **You don't proof your own
plate.** One agent doing all four grades its own work, and when that fails the failure gets
blamed on the model.

Six at most, because past that the coordination costs more than the work.

---

## Trades

The kernel doesn't know your industry. That plugs in.

| Trade | Foundation | Pillars |
|---|---|---|
| [dev](trades/dev/) | System boundaries | Backend · Frontend · API · CI/CD |
| [marketing](trades/marketing/) | Positioning | Audience · Message · Channel · Measurement |
| [sales](trades/sales/) | Qualification | Discovery · Proposal · Close · Handoff |

Same shape, three trades. Yours isn't there? See [`trades/README.md`](trades/README.md)
— the concierge builds it with you rather than handing you a template.

---

## The rubric

One question, asked of anything before it finishes:

> **Does this lead to craft, beauty, and care?**

If no, it's the wrong move — and it doesn't matter that it works, that it was faster, or that
nobody will notice. People notice everything; they just can't always say what they noticed.

That question is what *made well* means, and it's why the framework is called that.

---

## Map

| Path | What it is |
|---|---|
| `MADEWELL.md` | **The model.** ~130 lines. Read this first. |
| `SPEC.md` | Where work lives and how it moves. |
| `.madewell/AGENTS.md` | Instructions to the agent. |
| `.madewell/skills/adopt.md` | The first conversation. The concierge. |
| `.madewell/skills/` | Workflow skills + thinking lenses. |
| `.madewell/EXTENDING.md` | The slot contract — how to extend any part. |
| `trades/` | Trades. |
| `madewell-deck.html` | A 15-slide walkthrough. Open in a browser. |

`MADEWELL.md` and `SPEC.md` are the only normative documents. If anything else disagrees with
them, they win. If anything else restates them, that's a bug — delete it.

---

## Contributing

The bar for adding a document is high: **if it restates the model, it doesn't go in.** This
framework once carried sixteen terms across six metaphor systems to describe a process with
four positions. That was the bug, and it's the one most likely to come back.

New trades are very welcome. Run `adopt` on your own trade and send the result.

## Licence

MIT.
