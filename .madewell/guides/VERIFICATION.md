# Verification Protocol (law, extracted verbatim from AGENTS.md v5.1)

**Validation is the fourth atomic phase of all work.** Every initiative — in
every domain, at every altitude — runs Imagine → Plan → Make → Verify.
The Verify phase asks one question: *did the implementation produce what we
said it would produce?* Answering that honestly requires independent
verification. An agent (or person) checking their own work will, sooner or
later, mark it passing because they want it to pass. The only defense is
structural separation between the builder and the verifier.

This principle is **domain-agnostic**. Made Well treats verification *content* as
pluggable — supplied by the loaded domain cartridge, never baked into the kernel. The
architecture is the same in every domain:

> Builder builds. An independent designer writes the verification criteria from the
> brief. An independent runner executes them. An independent triage agent classifies
> any failure. The roles stay the same; the *content* of verification swaps per domain.

The kernel ships **no** default verification content. With no cartridge loaded, Verify
falls back to the trivial check: *can you execute it; does it do what the brief said?* A
cartridge (software, sales, marketing, manufacturing, etc.) supplies its own verification
protocol — the roles, the acceptance criteria, and how failure is triaged in its domain.
Mechanics for parallel/independent verification live in `.madewell/skills/orchestrate.md`.
The non-negotiable laws are in AGENTS.md **What You Must Never Do**.

The four roles — Orchestrator, Implementer, Test Designer, Test Runner — plus a
conditional fifth (Failure Triage) — are independent sub-agents. Never let one
role swallow another.
