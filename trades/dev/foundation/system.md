# The Foundation — System Design

**Not a pillar — the ground the four pillars stand on.** `backend · frontend · API · CI/CD` are
the build domains; *System* is the set of decisions made **before** any of them, about how the
whole thing fits together. The most expensive mistake in software is building across the pillars
before these boundaries are clear.

**Agnostic by construction.** Boundaries, ownership, and contracts are decisions about *shape*, not
about any stack. They hold for any language, any architecture.

**The throughline.** The person never draws an architecture diagram. The agent makes the
"what owns what" decisions explicit on their behalf, before they get encoded in code where they'd
cost ten times more to change. The person experiences only: "it keeps making sense as it grows,
instead of turning into spaghetti."

**When the foundation governs:** before any significant new piece is built; when scope expands;
when a second surface or app is added; when something keeps breaking because it touches too many
things; when "where does this go?" has no obvious answer.

> *A system you understand is a system you can change. A system you don't understand changes you.*

---

## Part 1 — The Physics (principles that never bend)

**1. Decisions before code.** The purpose of system design is not a diagram — it's making the
ownership and boundary decisions explicit *before* they're encoded, because changing them after
costs ten times more.

**2. Everything is owned by exactly one place.** Every piece of data, every function, every
concern belongs somewhere. When that's unclear, it ends up everywhere — duplicated, inconsistent,
coupled to things it shouldn't know about. Spaghetti is not bad code; it's deferred decisions.

**3. Apps use shared infrastructure; apps do not reach into each other.** Shared concerns —
identity, auth, navigation, design language, notifications — are built once and used by every
surface. If App A needs something from App B, that thing belongs in shared infrastructure. Break
this and you have a monolith disguised as multiple apps.

**4. One source of truth per fact.** If data exists in two places, decide which one wins; always
read from it. (The Backend pillar holds the same law from the data's side.)

**5. A contract before either side.** When two pieces communicate, that communication is a
contract — define it before building either side, so they can be built in parallel without
fighting. (Hands directly to the API pillar.)

**6. Complexity is a budget, spent deliberately.** Some problems are complex and their solution
must be too — but complexity that isn't paying for itself is debt that makes every future change
harder. Before adding a layer, abstraction, or service, ask what specific problem it solves that a
simpler path can't, and whether that's worth what everyone now has to understand. If it isn't
clear — the simpler path is correct.

---

## Part 2 — The Protocol (the boundary questions, asked first)

Before building anything significant:

1. **What are the distinct surfaces?** List every place a user or system interacts with the
   product. Each is a boundary candidate. Name them.
2. **What does each surface own?** What it reads, what it writes, what only it can do. If two
   surfaces own the same thing, that's a decision to make, not an assumption.
3. **What is shared?** Identity, auth, navigation shell, design system, notifications — build once,
   both surfaces use them.
4. **What must not bleed between surfaces?** If A breaks, can B still function? If it should — they
   must be isolated.
5. **What is the sequence?** Shared infrastructure first, then the surfaces that depend on it.
   Never build a surface that assumes infrastructure that doesn't exist yet.

**The data questions**, before any feature that stores or retrieves: What is the shape (fields,
types)? Who can read it? Who can write it? What happens when it's deleted — does anything depend on
it? What is the source of truth? (That last one causes the most bugs — pick one place, always read
from it.)

**The multi-app model** when a product contains multiple applications:

```
Shell (shared)            App A (isolated)         App B (isolated)
├── Identity & Auth       ├── owns its data        └── same pattern
├── Navigation            ├── owns its logic
├── Design System         └── calls shared infra,
└── Notifications             never other apps directly
```

---

## Part 3 — Definition of Done

Before building anything significant:

- [ ] Every surface named and its ownership defined.
- [ ] Shared infrastructure identified and isolated.
- [ ] App-to-app communication routed through the shared layer, not direct.
- [ ] Data ownership decided — one source of truth per concept.
- [ ] API contracts defined before either side is built.
- [ ] Build sequence established — what must exist before what.
- [ ] Complexity justified — nothing added without a clear reason.

---

## How the foundation is followed

The person never asks for "architecture." The agent engages the foundation before the pillars —
at the start of anything significant, and required before any second surface is built — making the
ownership and boundary decisions explicit and logging the consequential ones to DECISIONS.md. The
pillars are then built on a foundation that's already clear, instead of discovering its cracks
under pressure later.

---

_Draw the map before you lay the tracks._ Boundaries are cheap to decide and expensive to
discover. Everything the four pillars build rests on whether this was done first.
