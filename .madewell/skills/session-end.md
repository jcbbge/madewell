# Session End

**Run this before closing. Every session. Even short ones.**

---

## Step 1 — Check what changed

```bash
git status --short
```

If there are uncommitted files, list them plainly. Ask: "Should I include these in the session commit?" One decision, then continue.

---

## Step 2 — Update STATE.json

- Remove any tasks from `active` that were verified complete this session
- Update `phase` if it shifted
- Update `context.openThread` — the single most important thing to pick up next session, in plain English
- Update `context.metaphors` if any new ones emerged this session
- Add anything discovered this session to `backlog` (not `active` — backlog items have no path yet)
- Update `blocked` — remove anything that got unblocked, add new blockers with their reason

The file should be accurate to right now. If it looks the same as when the session started, something wasn't updated.

---

## Step 3 — Update DECISIONS.md

For every significant decision made this session, append one line:

```
YYYY-MM-DD | decision made | reason
```

Examples:
```
2026-05-12 | chose Supabase for auth | row-level security, no vendor lock-in
2026-05-12 | deferred mobile app | web-first until 100 users
2026-05-12 | email/password only for now | OAuth adds complexity, revisit at scale
```

If no decisions were made, skip this step.

---

## Step 4 — Update PRODUCT.md

If anything was learned this session about the user, their vision, or their understanding — update PRODUCT.md:

- New metaphors they used → add to "Their Language" table
- Something they built and now understand → add to "What You've Proven"
- Something they said about who this is for → refine "Who It's For"
- Something that matters to them that isn't in the code → add to "What Matters"

PRODUCT.md is the long-term memory. If it isn't growing, it isn't working.

---

## Step 5 — Delete completed spec files

For every task that was verified complete this session:

```bash
rm specs/YYYY-MM-DD-slug.md
```

If the work is done and verified, the spec is dead weight. Remove it.

---

## Step 6 — Commit

```bash
git add STATE.json DECISIONS.md PRODUCT.md
git commit -m "session: [one line — what happened]

TODO: [the open thread — specific enough to cold-start next session]"
```

The `TODO:` line is the handoff. It should be specific. Not "continue the feature." Write the exact first move: "Wire the login form to the auth endpoint, then verify the redirect works."

Confirm the commit went through:
```bash
git log --oneline -1
```

---

## Step 7 — Say what was accomplished

One to three sentences. Specific, not generic. Name what was built or decided. Name what was learned if anything significant clicked. Name the exact entry point for next session.

Not: "Great session, we made progress on authentication."

Yes: "The login form is wired up and working. You now know what a server route is — you built one. Next session we're adding the 'remember me' piece — what you called the sticky door."

---

## What Good Looks Like

Next session, the agent reads the four memory layers and immediately knows:
- Exactly where to pick up
- What was decided and why
- What the user has proven they can do
- How to speak to them

If next session requires any re-explanation of the project, this session end failed.
