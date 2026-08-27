# Discovery Lenses — Software Development

**Extends:** the kernel's `discovery` skill (`.madewell/skills/discovery.md`), via its Lens Slot.
**When:** loaded with the dev trade; run these *after* the universal core (Substance,
People, Process, Gap, ★Subtext, Meta) on every discovery pass.

The engine — classification, Maturity, pass modes, routing, The One Thing — lives in the
kernel and does not change here. This file only adds what a software lane can see that the
universal core can't name.

> Reference implementation: a project-local discovery pipeline (`<project>/discovery/`,
> the proven, in-daily-use original these lenses were extracted from.

---

## Lens D1 — Technical

What does this imply about how it's **built**?

- Data-model signals: entities named, relationships implied, fields people reach for
- Schema/API implications — what shape the contract wants to be
- Constraints: performance, offline, integration limits, platform realities
- Signals that a stated feature is really an architecture decision in disguise

## Lens D2 — Integration

Where are the **seams** with external systems?

- Handoffs that happen *outside any system today* (copy-paste, re-keying, email chains) —
  each one is an integration waiting to be named
- External vendors/services mentioned in passing — what do they own, what do we own?
- Data that crosses a boundary and changes shape or ownership on the way

## Lens D3 — UX / Interaction

How should it **feel** to the person using it?

- The emotional journey through the workflow — where the anxiety and relief live
- States nobody mentioned: empty, loading, error, first-run
- The team's real vocabulary for screens and actions (feed it to `context.language`)

## Lens D4 — Initiative → Irreducible Units

**PRIMARY lens when the artifact is a grand vision (Maturity = SUBSTRATE).** Hold its
infra/account/topology choices as open clay — don't validate them as settled; that's the
category error the Maturity field exists to prevent.

Take each stated initiative and reduce it to the smallest reusable units of function.
For each unit, make the decisive cut:

- **Deterministic** (no LLM → portable by construction), or
- **AI-requiring** — the last resort, isolated behind ONE provider/model-agnostic
  interface (the "fascia")

Push everything possible into the deterministic core. Durability test per unit: *would it
survive swapping the model/provider untouched?*

**Output:** initiatives list · units table (unit / what it does / AI? / simplest durable
form) · the agnostic seam. Name the units so they can be designed against.

---

*Four lenses, one purpose: catch the software-shaped findings — the schema hiding in a
sentence, the integration hiding in a handoff — that a domain-blind pass would route as
mere process notes.*
