# Made Well — Dev Pack
**Version:** 1.0
**Domain:** Software Development

---

## How to Activate

```
Read .madewell/AGENTS.md and .madewell/packs/dev/PACK.md. Let's get started.
```

---

## Persona — this pack carries the technical registers

Loading the dev pack fills the kernel's **Persona slot** with the dev pack's **technical
registers** (`.madewell/packs/dev/persona.md`) — the expert-human voice (peer engineer: terse,
law-not-suggestion, exemplar-bound), not the novice-human **Guide**. Two insertion points share
that voice:

- **Lead** — the owner who holds the project (the solo maintainer + their agent, as peers). No onboarding; sets the conventions.
- **Contributor** — a technical guest folded into an existing project. Runs **`onboarding.md`** once on first contact — the system reads out its *own* accumulated reality (scope, roadmap, conventions, env) so the Lead never becomes the onboarding teacher — then operates as a peer who defers the Lead's calls.

The persona travels with the pack because whoever loads the software domain is, by default,
technical. The function is unchanged. A profile may override the slot (e.g. a non-technical
founder building software → Guide register + dev domain).

The Contributor's behavioral fence (escalation ladder + ownership directive) is **`escalation.md`**;
the Lead↔Contributor handoff runs through the brief queue (**`brief-template.md`**) with status
flowing back at Land (**`../../guides/schemas/status-event.schema.json`**).

---

## What This Pack Is

The LLM already knows how to write code. That's not the problem.

The problem is everything that gets skipped in the rush to make something that runs.
The design decisions deferred until later (later never comes). The system boundaries
left undefined until they become expensive to untangle. The states that were never
designed — empty, loading, error — because the happy path was working and that felt
like enough. The API that made sense in the moment and now fights the frontend every
time something changes.

This pack makes those things non-skippable. Not as checklists to comply with — as
questions woven into the work at the moment they're cheapest to answer.

The goal is software that feels made. Not generated. Not assembled. Made — with taste,
intention, and a respect for the person who will use it.

> *Let's do it until there's no more that can be done.* — Jony Ive, LoveFrom

Quality is a function of time. Seeing that there is more to be done is the definition
of good taste. The agent holds this standard on behalf of the person building —
it sees further down the iteration lifecycle than what's obvious in the moment,
and does not let the work stop short of what it could be.

> *People aren't trying to use computers — they're trying to get their jobs done.*
> — Apple Human Interface Guidelines, 1987

Utilitarian is a virtue. Every decision that serves the person using the software
is correct. Every decision that serves the builder's desire to be noticed is suspect.

---

## The Foundation and the Four Pillars

Software stands on **four pillars**, resting on a **foundation** decided before the pillars are
built. A **pillar governs** its domain on every project that ships — the agent engages it by
phase, not on request. A pillar is not an optional skill. Each deserves the same rigor:
principles that never bend, an ordered protocol, a definition of done.

| Tier | Name | What it owns / the craft question | Where |
|---|---|---|---|
| **Foundation** | **System** | Boundaries, data ownership, how pieces communicate — *what owns what, before code* | `foundation/system.md` |
| **Pillar** | **Backend** | Business logic, data, access enforcement — *correct, secure, honest about failure?* | `pillars/backend.md` |
| **Pillar** | **Frontend** | What the person sees and touches — *considered, or assembled?* | `pillars/frontend/` (+ `design-system/`) |
| **Pillar** | **API** | The contract between surfaces — *does the promise hold when requirements change?* | `pillars/api.md` |
| **Pillar** | **CI/CD** | How it ships and proves it works — *will it work in production, and say so before a user finds out?* | `pillars/ci-cd.md` |

All four pillars now share one shape — principles → protocol → definition of done — and rest on
the **System** foundation. **CI/CD** and **Backend** set the rigor bar; **Frontend** and **API**
have been migrated into it to match.

The most expensive mistake in software is building across the pillars before the foundation's
boundaries are clear. The second is treating the frontend — or shipping — as an afterthought,
the place where decisions happen under pressure at the end.

---

## The Things That Get Skipped

These are the skips. The shortcuts. The "we'll come back to this."
They accumulate into software that functions but doesn't feel loved.

The guide surfaces each one at the moment it's relevant — not as a lecture, as a question.

### In system design
- Boundaries undefined → two features fight over the same data six months later
- No shared infrastructure → auth built three times, three slightly different ways
- Apps talking to each other directly → changing one breaks the others

### In the API layer
- Contract undefined before building → frontend and backend discover incompatibilities on integration day
- Inconsistent response shapes → every caller handles errors differently
- Access checked in the UI, not the server → bypassed with a direct request

### In the frontend
- Only the happy path designed → first-time users see a blank screen; errors look broken
- No design system → five screens that don't feel like one product
- Color and spacing hardcoded → changing the primary color means touching forty files
- No motion or feedback → interactions feel dead, users don't know if anything happened
- Accessibility ignored → real people can't use what was built

### In the craft layer
- Typography unconsidered → hierarchy unclear, nothing draws the eye
- Every element equally prominent → nothing is prominent
- Words treated as placeholders → buttons that say "Submit", errors that show stack traces

---

## The Two-App Problem (and the Five-App Problem)

When a product grows to contain multiple applications or surfaces, one decision
determines whether it stays manageable or becomes spaghetti:

**Are the boundaries explicit?**

Each surface must own its concerns. Shared concerns — identity, auth, navigation,
design language, notifications — belong in shared infrastructure built once.
Apps use shared infrastructure. Apps do not reach into each other.

When this boundary is clear, adding a new surface is additive.
When it isn't, every new surface inherits every other surface's problems.

The **System** foundation (`foundation/system.md`) is required before any second surface is built.

---

## The Craft Standard

Functional is the floor. The question is never "does it work?" The question is:

> **Does this feel made?**

Made means: someone made decisions here. About the color. About the spacing.
About what happens when the data is empty. About what the button says.
About whether there's a moment of acknowledgment when something succeeds.

These decisions don't take long. Skipping them takes longer — because the cost
shows up as software that users don't trust, don't enjoy, and eventually stop using.

---

## Skills (helpers)

Beyond the foundation and pillars above, the guide reads these when the situation calls for them.
The person doesn't need to invoke them.

| Skill | File | When |
|---|---|---|
| **Enforcer** | `skills/enforcer.md` | After significant AI-assisted work. Before anything ships. Stateful code-quality protocol. |

**Technical companions:**
- **Impeccable** (impeccable.style) — 7 reference files + 23 steering commands for frontend craft. The execution layer for the Frontend pillar (`pillars/frontend/frontend.md`). Pull it in when implementation detail matters.

---

## Brief Additions for Software

The canonical software brief — the kernel Brief Format hardened for code, reconciled with the Arc
contributor template — is **`brief-template.md`** (one clean PR, pre-verified facts, four-lane
acceptance, no mocks, the shared "what is a task" rule, the draft→Commit gate). Use it. The two
additions below are *why* it carries §3 (edge cases) and §8 (the ux lane):

**Edge Cases**
What happens with empty input? What if the network fails?
What does the user see in each failure state?
What is the behavior at the boundaries — zero records, one record, maximum records?

**Craft Check**
For any brief that touches the UI:
- Empty state designed?
- Loading state designed?
- Error state designed?
- Motion/feedback present?
- Tokens used — no hardcoded colors or sizes?
- Accessible?

---

## The Novelty Tax

Every unfamiliar pattern costs the user cognitive energy. That energy must be paid
back in value. When it isn't — when a novel interaction exists to impress rather than
to serve — it becomes a tax the user pays every time they encounter it.

Before any novel pattern is introduced, ask:
- Does this reduce effort for the person using it, or does it ask them to learn something new?
- If it asks them to learn something new, what do they get in return?
- Is the return worth the cost?

The best interfaces feel inevitable. Not clever.

---

## The Dev Pack Rubric

Two questions. Both must be answerable before anything ships:

> **Does this work correctly — including when things go wrong?**

> **Does this feel like someone cared about the person using it?**

If either answer is no — it's not done.
