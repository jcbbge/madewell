# Dev Pack — Canonical Software Brief
**Status:** canonical, framework-owned. The dev-pack instantiation of the kernel **Brief Format**
(`AGENTS.md`) for software work. A project's brief template (e.g. `docs/<queue>/_TEMPLATE.md`) is
an **instance** of this — same schema, project bindings.

A brief is the deliverable of **Commit → Make**: a complete, self-contained spec an executor
(a human + their agent, as one unit) can drive to a merged PR **without asking a single
question**. If it would need clarification, it isn't done. If it can't be **one clean PR**, it is
two briefs — split before delegating.

## The canonical "what is a task" rule (shared — BEND 2)

> A brief/task = `<queue>/*.md` **excluding** any basename starting with `_` and `README.md`.

- The `_` prefix marks a **draft/proposal not yet admitted** to the live queue.
- This **one** rule is imported by every lane (authoring *and* reading) — never re-implemented,
  or the lanes silently drift.

## Authoring & the Commit gate (ruling — open authoring, lead-gated admission)

Authoring is **open**: anyone (Lead or Contributor) may draft a brief. A Contributor's draft
lands as a `_`-prefixed proposal (excluded from the live queue by the rule above). **Promoting it
— dropping the `_` — is the COMMIT leg, and Commit is the Lead's authority.** So the verb is
ungated; *admission* is lead-gated. Draft-to-propose is encouraged (it surfaces a finding as
proposed work); the Lead makes the call. No new mechanism — the `_` exclusion **is** the gate.

## The schema (each field maps to the kernel Brief Format)

````
# NN — <Title>
**Task ID:** <QUEUE-NN>
**Owner:** <executor(s) + lane split, or one unit>
**Deadline:** <date or —>
**Depends on / unblocks:** <links or —>

<One paragraph: what this delivers, why it is ONE clean PR.>      ← kernel: What This Is

## 1. Intent — the single outcome (2–4 sentences)                 ← kernel: What This Is
## 2. Current state — PRE-VERIFIED by the orchestrator            ← kernel: Context / Starting Point
     every claim cites file:line / exact command+output / endpoint shape; the executor does NOT re-discover
## 3. Desired behavior — precise, testable, each bullet observable ← kernel: Finishing Point (+ Edge Cases)
## 4. Lanes & touchpoints — no collision                          ← dev: the contract between executors
     each lane's exact files; the contract between lanes (endpoint + request/response shape, or the data-write path)
## 5. Architecture constraints — bind to these, no deviation      ← kernel: What Could Go Wrong (guardrails)
## 6. Implementation outline — ordered, ONE PR                    ← kernel: Steps
## 7. Scope — exact files to touch                                ← kernel: Out of Scope (inverse)
## 8. Acceptance — four lanes, all must pass                      ← kernel: How We'll Know It's Done + Craft Check
     logic · backend · ui (agent-driven browser) · ux (human-in-browser)
## 9. Test plan — NO MOCKS (real dependencies, real data)         ← kernel: Testing: Applies
## 10. Open questions — resolved spec→codebase→docs; truly-open flagged for the lead   ← escalation.md
---
Delegation contract: the executor unit drives this brief to a merged PR. On any question they
escalate per packs/dev/escalation.md (spec → codebase → docs → lead). Never guess, never stall.
````

The **four-lane acceptance**, **no-mock testing**, **one-PR sizing**, and **pre-verified facts**
(§2) are the dev pack's hardening of the kernel's Verification Protocol + Isolation Mandate —
non-negotiable for code work. A project keeps the schema and binds the specifics (its env command,
its DB, its lane names).
