# Profiles — one switch fills every row

A **profile** is a named bundle that selects an implementation for *every* contract row at
once — persona, domain pack(s), quality, memory, onboarding. It is the layer above the
contract lattice: instead of choosing each row by hand, you declare *who you are and how you're
inserting*, and the profile fills the rest.

> "I'm the lead on this project" · "I'm a contractor joining it" · "I'm a founder with an idea"
> — each is **one selection that loads a whole stack.**

Manifest: `.madewell/profiles.json`. The contract rows it binds: **persona · domain · quality
· memory · onboarding.**

---

## The named profiles

| Profile | Who | Persona | Domain | Quality | Onboarding |
|---|---|---|---|---|---|
| **lead** | the owner who holds the project (solo maintainer + agent, as peers) | Lead register | dev pack | organ-if-present, else Enforcer | none — they define the reality |
| **contributor** | a technical guest folded into an existing project | Contributor register | dev pack | organ-if-present, else Enforcer | first-contact read-out (`packs/dev/onboarding.md`) |
| **guide** | a non-technical builder making their own thing | Guide register | (generic) | Enforcer | first-session Orientation |
| **naked** | machines, CI, headless agents | none (substrate) | per-task | per-task | none |

`lead` and `contributor` share a base loadout (dev pack + quality organ) and differ only in
**persona** and **onboarding** — the two things the insertion-point axis controls. That is the
whole Lead-vs-Contributor distinction, made selectable.

Concretely: a software project with the dev pack (and a quality organ) runs two profiles —
**lead** (the maintainer) and **contributor** (a guest). They share the base loadout and differ
only in persona + onboarding. The contributor profile is the same kernel with the guest's
register and onboarding bound on top.

---

## How the active profile is resolved (session start)

In order, first hit wins:

1. **`.madewell/profile`** — a local, git-ignored one-line file naming the active profile (e.g. `lead`). This is *your* clone's choice; it is never committed, so a maintainer's `lead` never forces a guest into it.
2. **`madewell.json` → `profile`** — if the project pins one.
3. **First-contact resolution:**
   - headless / CI / no human in the loop → **naked**
   - a human, dev-pack project, and they're the maintainer → **lead**
   - a human on a *fresh clone* of a dev-pack project (no prior state authored by them) → **contributor** → run its onboarding
   - a human, no dev pack, building their own thing → **guide**
   - genuinely ambiguous → ask, once, plainly: *"Are you the owner of this project, joining it, or starting something new?"*

Write the resolved choice to `.madewell/profile` so it's silent next time.

---

## Loading a profile

Once resolved, the kernel loads the profile's rows:

- **persona** → read that register (or none, for naked)
- **domain** → load the listed pack(s)
- **quality** → if the quality organ is installed, use it; else the Enforcer default
- **memory** → the memory substrate (default: flat files)
- **onboarding** → if set, run it **once** on first contact, then never again

The **function** (the Orchestrator) is identical under every profile. A profile changes what's
loaded around it — never the work lifecycle itself.

---

## Adding a profile

A profile is just a row-selection. To add one (a `sales` profile, a `reviewer` profile, a
domain-expert-guest profile): add an entry to `profiles.json` naming its persona, domain
pack(s), quality, memory, and whether it onboards. No kernel change — that's the point. The
kernel depends only on the contracts; profiles compose them.
