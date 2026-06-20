# Contributor Onboarding — first contact only
**Runs:** once, the first time a technical guest (and their agent) joins the project.
**Then:** goes quiet — the Contributor operates in the technical register (`persona.md`).

---

## The principle — onboarding is a read-out, not a written doc

The Lead must never become the onboarding teacher. Onboarding a teammate by hand — writing
setup docs, explaining conventions, teaching their agent the system, teaching the human to use
their agent — is a cost paid **again for every hire**, out of band, in the Lead's time, tokens,
and money. That is the disease.

The fix: **the system already holds everything a newcomer needs, because the Lead produced it
by working.** Onboarding is an emergent *read-out* of the system's accumulated reality —
assembled live, always current, at ~zero marginal cost to the Lead. The Lead pays the encoding
cost **once** (by working in Made Well); every guest is onboarded from that, automatically.

And the newcomer's agent does not get *taught* the project — it **loads** it. It is already
plugged in, because the project carries its own instructions and memory.

## What onboarding reads (the established reality, from where it already lives)

| The guest needs… | Read it from… |
|---|---|
| **Scope** — what this is, who it's for | `PRODUCT.md` |
| **Roadmap** — done / in-flight / next | `STATE.json` (active + backlog) + the queue + recent git log handoffs (DONE/TODO) |
| **Conventions** — how we build, what's non-negotiable | `DECISIONS.md` + the quality organ's packs (fences / judges / signs / lexicon — `.rumen/` if installed) + the dev pack pillars |
| **Workflow** — how work moves | the four-leg lifecycle: Discovery → Commit → Cycle → Land (`AGENTS.md`) |
| **Environment / setup** — how to run it | the project's setup + CI files (the dev pack's ci-cd pillar knows where) |
| **Their lane** — what's theirs to touch | the tasks assigned to them; the Isolation Mandate; surface-findings-to-the-Lead |

None of this is authored *for* onboarding. It is the same memory the Lead uses every session.
Onboarding just **replays** it to a newcomer.

## The flow (first contact)

1. **Plug in the agent.** The guest's agent loads `AGENTS.md` + `.madewell/` (state, decisions, product) + the dev pack + the quality packs. It is now operating inside the established reality — same scope, roadmap, conventions, lifecycle as the Lead's agent. No teaching required.
2. **Walk the human through, briefly.** Surface — in plain, peer-level terms — the scope, where the project stands right now, the few non-negotiable conventions they'll hit first, how to run it, and the lifecycle. Not a lecture; a peer handing off a shared codebase. Use the read-out table; don't invent content.
3. **Confirm the lane.** Name exactly what's theirs to work on (their active tasks), what's out of bounds, and the rule: anything that wants to change architecture or convention is a *finding to surface to the Lead*, not a unilateral move. The resolution order is the canonical ladder — `escalation.md` (spec → codebase → docs → lead).
4. **First safe contribution.** Point them at one well-scoped task with a clear exemplar to match. They make it; it runs the lifecycle and Lands — and Land emits a status event back to the Lead (`../../guides/schemas/status-event.schema.json`: brief_taken → … → brief_landed). The loop is now theirs.

Then onboarding is done — it never runs again for this guest.

## What this buys the Lead

No hand-written setup docs. No teaching the guest's agent the system. No teaching the human to
use their agent. Bring on a teammate; the system folds them in — and the Lead gets back the
time, tokens, and money that onboarding was burning.
