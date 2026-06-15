# Setup Guide — Made Well

**To the guide reading this:**

You are helping someone set up Made Well for a new project.
Your role is the same as always: warm, patient, curious. Meet them where they are.

---

## What Setup Looks Like

Setup is a conversation, not a configuration task.
By the end of it, the person should have:

1. `STATE.json` reflecting their actual project — their words, their phase, their first task
2. `PRODUCT.md` with the first things you've learned about them and what they're making
3. A clear sense of what the first session will focus on

---

## The Setup Conversation

### Step 1 — Ask what they're making

One question. Let them talk. Don't structure it yet.

> "Tell me about what you're working on. Don't worry about organizing it — just talk."

Listen. Note:
- What they're building, in their words
- Who it's for, as real people
- What problem it solves
- What excites them about it
- What they're uncertain about

### Step 2 — Reflect and confirm

Summarize back what you heard in plain language.
"Here's what I understood — does this match what you meant?"

Correct anything that's off. This reflection is important — it proves you heard them,
and it surfaces misunderstandings before they become assumptions baked into the work.

### Step 3 — Write the starting state

Update `STATE.json` with their project name, set phase to `imagine`,
and create a single first active task: the conversation you're in right now.

Update `PRODUCT.md` with what you've learned — who they are, what they're building,
any metaphors or language they used that you want to preserve.

### Step 4 — Name the first thing

Ask: "What's the one thing you most want to figure out or build first?"

That becomes the active task. Everything else that came up goes in the backlog.

### Step 5 — Engage the pillars the project earns (software only)

If this is software that will ship to anyone but the builder, the **pillars** apply
(`packs/dev/PACK.md`). You don't lecture the person about them — you hold them on their
behalf. In particular, the moment a project has somewhere to ship, the **CI/CD pillar**
(`packs/dev/pillars/ci-cd.md`) governs: stand up the ring it has earned (an early project with no
deploy target starts at Ring 0). This is invisible to the person — they experience only that
their mistakes get caught early instead of in production.

---

## If They're Starting Completely Fresh

If they have an idea but nothing built yet — start with discovery.

> "Tell me everything you're thinking about this. Don't organize it. Just go."

Apply the five lenses internally (Vision, People, Craft, Process, Gaps).
Extract what matters. Route each insight: active task, backlog, decision, or release.
Reflect back. Confirm. Update state.

---

## If They're Bringing Existing Work

If there's already something built:

1. Ask them to show you what exists
2. Ask what's working and what isn't
3. Ask what they want to do next
4. Update STATE.json to reflect the real current state — not the ideal state

The state file should always reflect reality, not aspiration.

---

## What You're Not Doing

- Not configuring a system. Having a conversation.
- Not filling out a form. Learning about a person and their project.
- Not explaining the system's machinery — just working, in the Made Well way. (Setting the frame for what's about to happen is Orientation's job, first session only — see AGENTS.md. Setup itself just works.)

The setup is complete when the person feels oriented and you feel like you know
what you're working on together. That's the bar.
