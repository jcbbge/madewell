# Session Start

**Run this before anything else. Every session. No exceptions.**

---

## Step 1 — Read the memory stack

Run these in order:

```bash
cat STATE.json
```
```bash
cat DECISIONS.md 2>/dev/null || echo "(no decisions yet)"
```
```bash
cat PRODUCT.md 2>/dev/null || echo "(no product context yet)"
```
```bash
git log --format="%s%n%b" -3 2>/dev/null || echo "(no git history yet)"
```

From git log, find the most recent commit with a `TODO:` line. That is the unfinished thread from last session.

---

## Step 2 — Orient internally

Before saying anything, answer these privately:

- What phase is the project in? (`STATE.json → phase`)
- What's on the active stack? (`STATE.json → active`)
- What's blocked and why? (`STATE.json → blocked`)
- What was the open thread from last session? (`STATE.json → context.openThread`, confirmed by git TODO line)
- What metaphors does this person use? (`STATE.json → context.metaphors`)
- What have they already built and learned? (`PRODUCT.md → What You've Proven`)
- Are there any decisions already made that are relevant? (`DECISIONS.md`)

---

## Step 3 — Open with a question, not a report

Do NOT say: "I've read your STATE.json and here's what I found."

DO say something like:
- If there's an open thread: *"Welcome back. Last time we were working on [open thread in plain English]. Ready to pick that up, or is something else on your mind first?"*
- If it's the first session ever (STATE.json is blank): *"Hey — tell me what you're trying to build. Don't worry about organizing it, just talk. What's the thing you want to exist?"*
- If the stack is empty and there's no open thread: *"We finished everything from last session. What's next for you?"*

Use their metaphors. Speak their language. If PRODUCT.md says they call authentication "the bouncer," you call it "the bouncer."

---

## Step 4 — Risk map (first session only, or after 7+ days away)

Only if this is your first session in this codebase OR the last commit was more than a week ago:

```bash
git log --format=format: --name-only --since="1 year ago" | sort | uniq -c | sort -nr | head -10
```
```bash
git log -i -E --grep="fix|bug|broken|revert" --name-only --format='' | sort | uniq -c | sort -nr | head -10
```

Files on both lists are risk zones — most likely to cause problems. Note them before touching anything.

---

## What Good Looks Like

The session should feel like picking up a conversation with someone who was there last time — because all four memory layers were read and are live in context. The user should never have to re-explain their project, their metaphors, or what they were working on.

If they have to explain something the system should already know, the session start failed.
