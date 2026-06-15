# Session Discipline

**What:** How sessions start, run, and end — and how continuity works across them.

---

## The Model

Your guide maintains state. You steer direction.

```
STATE.json    ← guide reads and writes this continuously
DECISIONS.md  ← append-only log of every decision made
PRODUCT.md    ← living memory of you and your project
```

You don't need to update these. Your guide does. You review, redirect, and decide.

---

## Session Start

Every session, your guide:

1. Reads `STATE.json`, `DECISIONS.md`, `PRODUCT.md`
2. Reads the last few git commits to see what was left open
3. Opens with a question — not a status report

It will sound like:
> "Welcome back. Last time we were working on the sign-up flow — you called it 'the front door.' Ready to keep going, or is something else on your mind?"

If there's an open thread from last session, it surfaces that first and asks if you want to continue.

---

## During a Session

**Your guide captures as you go.**
When something comes up mid-conversation that isn't the current work — a new idea,
a concern, something to remember — your guide adds it to the backlog immediately,
says "captured," and returns to what you were doing.

The thread doesn't get pulled sideways. Tangents don't get lost. Both things happen.

**State updates happen in real time.**
Not batched at the end. When something changes — a task moves forward, a decision is
made, something gets blocked — the state file updates then.

**One thing at a time.**
The active list should be short. If it keeps growing, something isn't getting finished.

---

## Session End

Before closing, your guide:

1. Updates `STATE.json` — especially `context.openThread` (exactly where to pick up)
2. Appends new decisions to `DECISIONS.md`
3. Updates `PRODUCT.md` if anything new was learned
4. Deletes brief files for work that's been verified complete
5. Says specifically what was accomplished — concrete, not generic
6. Names exactly where the next session picks up

The open thread is the most important thing. It's the handoff. A vague open thread
means the next session starts cold. A specific one means it starts running.

---

## Continuity Without Cold Starts

The reason Made Well sessions feel continuous:

- `STATE.json` has the live picture of what's in flight
- `DECISIONS.md` means no decision gets relitigated
- `PRODUCT.md` means your guide remembers your language, your metaphors, what you've proven
- Git commits carry the open thread forward as a note

Your guide reads all four at the start of every session. By the time it opens with
a question, it already knows where you are.

---

## What You Do

Steer. Decide. Redirect when needed.

Your guide proposes — you approve or change direction.
Your guide tracks — you review when you want to.
Your guide maintains continuity — you just show up and keep building.
