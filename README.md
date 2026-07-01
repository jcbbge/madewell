# Made Well

> Software, built deliberately — with an AI that holds the process so you don't have to.
>
> **Made. Not vibed.**

You have something you want to make. You've heard AI can build it. You've also seen the
hype break — the one-shot app that falls apart the moment you touch it, the demo that was
never real software.

Made Well is the other path. It's an opinionated system you hand to an AI assistant so the
two of you build something real, one deliberate step at a time. The assistant carries the
process — state, memory, planning, quality, the parts you'd have to *become an engineer* to
manage. You bring the vision and the decisions. Nothing gets one-shot. Everything compounds.

It works. Not because the hype is true, but because going slow and on purpose works — and the
system makes going slow the easy path instead of the disciplined one.

---

## Who it's for

People with an idea and no map. The founder who can't code yet. The designer or PM who knows
exactly what they want and not how to build it. The developer who's tired of AI sessions that
forget everything and drift into mush.

You do **not** need to know what a database, a deployment, or a design system is. The
assistant holds all of that on your behalf, and explains what you need *when* you need it —
never as a lecture, always as the next honest step.

---

## Quickstart

Install it into your project — one command, from a clone of this repo:

```
sh install.sh /path/to/your/project
```

It drops the framework in and wires your agent's loader **without overwriting anything you own**.
Re-run anytime to update (your project's memory is preserved). Remove with
`sh install.sh --uninstall /path/to/your/project` — droppable, no residue.

Then point your assistant at the project and say:

```
Let's build.
```

That's it. Everything unfolds from there — it reads its own instructions, resolves how you're
working, provisions what it needs, and on the first session orients you (what's about to happen,
your role and its). Every session after, it picks up exactly where you left off. You never set
anything up, and you never re-explain anything.

---

## How it works

**Two doors.** [`MADEWELL.md`](./MADEWELL.md) is yours — what to expect, in plain language.
[`AGENTS.md`](./AGENTS.md) is the assistant's — how it operates. You read one; it reads the
other.

**Four phases.** Every piece of work — a feature, a fix, a whole product — moves through the
same loop:

```
IMAGINE  →  PLAN  →  MAKE  →  VERIFY
```

Understand it. Sequence it. Build it, one step at a time. Prove it works, including when
things go wrong. The loop is fractal — it runs on a single task and on the whole project.

**Sessions that remember.** Between sessions, Made Well keeps what matters: what you're
building and why, every decision made (and the reason), what's done and what's next, and your
own words for your own project. No cold starts. No lost context.

**A mentor and an orchestrator.** The assistant is one persona — a patient guide who meets you
where you are — and one function — it plans and delegates the work, but never loses the
thread. It does the heavy lifting. You steer.

**Pillars, for software.** When you're building software, the work stands on a foundation
(how the pieces fit) and four pillars, each held to the same rigor:

| Pillar | Holds |
|---|---|
| **Backend** | Your data — correct, secure, and recoverable |
| **Frontend** | What you see and touch — considered, not assembled |
| **API** | How the pieces talk — a promise that keeps holding |
| **CI/CD** | How it ships — and proves it works before a user finds out |

You never operate any of them. They just mean your mistakes get caught early instead of in
front of the people you built this for.

---

## What's inside

```
madewell/
├── MADEWELL.md         ← start here (for you)
├── AGENTS.md           ← the assistant's instructions
├── CLAUDE.md           ← loader for Claude Code
├── .madewell/          ← the system (the assistant runs it; you don't touch it)
│   ├── guides/         ← how it works, in plain language
│   ├── skills/         ← the assistant's thinking tools
│   ├── packs/guide/    ← the novice-human persona (batteries-included)
│   ├── work/ · specs/  ← the persistent record of what's done and in flight
│   └── STATE · DECISIONS · PRODUCT   ← memory
└── cartridges/         ← domain cartridges (loaded by reference, not installed)
    └── dev/            ← reference cartridge: building software
```

You manage none of it. It's listed here so you can see there's nothing hidden — only nothing
you have to carry.

---

## What it believes

- **Reliability for you beats cleverness for the system.** You should never carry the
  cognitive load of running this. It runs smoothly on your behalf, or it isn't done. The
  training wheels never wobble.
- **Decide once, then live it.** A design system, an architecture, a hard choice — settled
  deliberately, then upheld forever after, never re-litigated. The way a person decides who
  they are and then simply *is* that.
- **Craft is the standard, not a finish.** Every decision answers one question: *does this
  lead to craft, beauty, and care?* If the answer is no, it's the wrong move — even if it
  works, even if it's faster.
- **Setbacks are part of it.** Things will hit walls. That's the process, not a failure. You
  bring it to the assistant and you work through it together.

---

## On the name

Made Well is built from a decade of building software and two years of building it *with* AI —
including the hard-won lesson that AI amplifies whatever you bring it. Bring clarity, get
clarity. Bring confusion, get confident-sounding confusion.

So: **made, not vibed.** Made means someone made decisions here — about the data, the spacing,
what happens when it's empty, what the button says. The sum of a thousand small decisions made
with care is the difference between something you're proud of and something you quietly stop
using.

You're going to make something well.
