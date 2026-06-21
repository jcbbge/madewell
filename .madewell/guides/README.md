# Made Well

**You have something you want to make. Let's make it well.**

---

## Start a Session

Say:

> **"Let's build."**

That's it. Your assistant remembers everything and picks up where you left off.

Other ways to start:
- "Let's go."
- "Let's get started."
- "Ready to work."
- "Pick up where we left off."

---

## What Happens

Your assistant:
1. Remembers where you left off
2. Knows what's done and what's open
3. Opens with a question — not a status report

If there's unfinished work, it asks if you want to continue. If not, it asks what's on your mind.

---

## The Basics

You work in **sessions**. A session is a conversation where you make progress.

Between sessions, Made Well remembers:
- What you're building and why
- What decisions have been made
- What's done, what's in progress, what's blocked
- How you talk about your project (your words, your metaphors)

When you come back, you pick up where you left off. No re-explaining.

---

## How Work Moves — Two Loops

Made Well runs two nested loops (full walk-through: `02-THE-LOOPS.md`):

```
OUTER:  Discovery → Commit → Build → Land          the project moves: gather, choose, build, ship
INNER:                        Imagine → Plan → Make → Verify     one chosen piece gets built
```

The **outer loop** moves the whole project; the **inner loop** builds each chosen piece — and it's
the same four-beat both times. Each loop runs one step, then pauses for you; nothing runs away on
its own.

- **Imagine** — What are we making? Why? What does "done" look like?
- **Plan** — What are the steps? In what order?
- **Make** — Do the work. One step at a time.
- **Verify** — Does it actually work? What breaks it?

---

## Things You Can Say

| You say | What happens |
|---------|--------------|
| "What's active?" | Reports what's in progress |
| "I'm stuck on X" | Activates relevant thinking tools |
| "Brain dump: ..." | Extracts and organizes your thoughts |
| "What am I missing?" | Looks for blind spots |
| "Is this good?" | Reviews the work for quality |
| "Fan this out" | Creates parallel tasks, delegates to workers |
| "Create a workflow" | Same — triggers parallel execution |

---

## For Bigger Work

When you have a lot to do — multiple features, a big migration, parallel tasks — say "fan this out."

What happens:
- Work gets split into packages
- Background workers handle the pieces in parallel
- Results get checked before coming back to you
- You get one coordinated answer

Works with any AI that supports parallel execution.

---

## What Your Assistant Does

**At the start:**
- Reads your state, decisions, and project memory
- Opens with a question based on where you left off
- Never asks you to re-explain your project

**During:**
- Captures new ideas to the discovery queue immediately
- Updates state in real time
- Writes briefs for work that needs execution

**At the end:**
- Updates state with exactly where to pick up
- Logs any decisions made
- Says specifically what was accomplished

---

## What You Don't Need to Do

- You don't manage files — the assistant does
- You don't track what's done — that's automatic
- You don't coordinate parallel workers — the assistant orchestrates

Your job: steer, decide, redirect when needed.

---

## Setup

Drop Made Well into your project: the `.madewell/` folder plus `MADEWELL.md` and `AGENTS.md` at the root. That's it.

First session, just say "Let's build" and tell your assistant what you're making.

If you're building software, mention it — your assistant will use the dev tools.

---

## The Files

You don't need to touch these. Your assistant manages them.

| File | What it holds |
|------|---------------|
| `PRODUCT.md` | Your project, your words, what matters |
| `madewell.json` | What's active, blocked, or waiting |
| `DECISIONS.md` | Every decision made |
| `work/status.jsonl` | Proof of what's done |

---

## The Promise

- Your assistant remembers everything across sessions
- Work doesn't get repeated
- You end up with something you're proud of

---

*Made. Not vibed.*
