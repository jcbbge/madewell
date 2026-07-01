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
| **lead** | the owner who holds the project (solo maintainer + agent, as peers) | cartridge-supplied Lead register | domain cartridge (loaded) | cartridge-supplied, if any | none — they define the reality |
| **contributor** | a technical guest folded into an existing project | cartridge-supplied Contributor register | domain cartridge (loaded) | cartridge-supplied, if any | cartridge-supplied first-contact read-out |
| **guide** | a non-technical builder making their own thing | Guide register | none (generic) | Rubric-inline | first-session Orientation |
| **naked** | machines, CI, headless agents | none (substrate) | per-task | per-task | none |

`lead` and `contributor` share a base loadout (same cartridge + quality) and differ only in
**persona** and **onboarding** — the two things the insertion-point axis controls. That is the
whole Lead-vs-Contributor distinction, made selectable.

Concretely: a project running a software cartridge with these two profiles — **lead** (the
maintainer) and **contributor** (a guest) — shares the base loadout and differs only in
persona + onboarding. The contributor profile is the same kernel with the guest's register and
onboarding bound on top. Cartridges are not part of the kernel install; a project loads a
cartridge by explicit reference (see the cartridge library).

---

## How the active profile is resolved (session start)

In order, first hit wins:

1. **`.madewell/profile`** — a local, git-ignored one-line file naming the active profile (e.g. `lead`). This is *your* clone's choice; it is never committed, so a maintainer's `lead` never forces a guest into it.
2. **`madewell.json` → `profile`** — if the project pins one.
3. **First-contact resolution:**
   - headless / CI / no human in the loop → **naked**
   - a human, cartridge-bearing project, and they're the maintainer → **lead**
   - a human on a *fresh clone* of a cartridge-bearing project (no prior state authored by them) → **contributor** → run the cartridge's onboarding
   - a human, no cartridge, building their own thing → **guide**
   - genuinely ambiguous → ask, once, plainly: *"Are you the owner of this project, joining it, or starting something new?"*

Write the resolved choice to `.madewell/profile` so it's silent next time.

---

## Loading a profile

Once resolved, the kernel loads the profile's rows:

- **persona** → read that register (or none, for naked)
- **domain** → load the listed pack(s)
- **quality** → if the loaded cartridge supplies a quality skill, use it; else fall back to the Rubric asked inline
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
