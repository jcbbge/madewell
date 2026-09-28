# Profiles — one switch fills every row

A **profile** is a named bundle that selects an implementation for *every* contract row at
once — persona, trade(s), quality, memory, onboarding, door. It is the layer above the
contract lattice: instead of choosing each row by hand, you declare *who you are and how you're
inserting*, and the profile fills the rest.

> "I'm the lead on this project" · "I'm a contractor joining it" · "I'm a founder with an idea"
> — each is **one selection that loads a whole stack.**

Manifest: `.madewell/profiles.json`. The contract rows it binds: **persona · domain · quality
· memory · onboarding · door.**

---

## The named profiles

| Profile | Who | Door | Persona | Domain | Quality | Onboarding |
|---|---|---|---|---|---|---|
| **guide** | a person who would rather just talk — often not technical | **just talk** | Guide register | trade (loaded), if any | trade-supplied, else Rubric-inline | first-session Orientation |
| **lead** | the owner who holds the project (solo maintainer + agent, as peers) | **show me the engine** | trade-supplied Lead register | trade (loaded) | trade-supplied, if any | none — they define the reality |
| **contributor** | a technical guest folded into an existing project | show me the engine | trade-supplied Contributor register | trade (loaded) | trade-supplied, if any | trade-supplied first-contact read-out |
| **naked** | machines, CI, headless agents | none — no person | none (substrate) | per-task | per-task | none |

`lead` and `contributor` share a base loadout (same trade + quality) and differ only in
**persona** and **onboarding** — the two things the insertion-point axis controls. That is the
whole Lead-vs-Contributor distinction, made selectable.

Concretely: a project running a software trade with these two profiles — **lead** (the
maintainer) and **contributor** (a guest) — shares the base loadout and differs only in
persona + onboarding. The contributor profile is the same kernel with the guest's register and
onboarding bound on top. Trades are not part of the kernel install; a project loads a
trade by explicit reference (see the trade library).

---

## The two doors

The person meets Constellation through one of two doors, **chosen once at adoption** and
stored as the profile: **just talk** is `guide`, **show me the engine** is `lead`. The host asks
the question once (`AGENTS.md` § Host) and never again; if the person later asks for the other
door, the host rewrites `.madewell/profile`.

Both doors keep the same work, the one voice and the glossary. A door decides only **which
surfaces the person sees**:

| Surface | just talk (`guide`) | show me the engine (`lead`) |
|---|---|---|
| the conversation with the host, in the glossary's words | yes | yes |
| the front page — `constellation brief`, told in the host's words | yes | yes |
| the status line — `constellation line` | yes | yes |
| a question with a recommendation, answerable in one word | yes | yes |
| the save line after each step, and night-shift notices | yes | yes |
| the receipt when something is done | yes | yes |
| the engine's names beside the plain words — "a second look (polaris)" | no | yes |
| the commands the host runs, shown as it runs them | no | yes |
| where every piece is and its whole run — `constellation status` | no | yes |
| the helpers' own windows, live | no | yes |
| the files under `.madewell/` and the history of commits | no | yes |
| the jig reading — `constellation tax` | no | yes |

Behind either door, **the person is never asked to type a command or an engine word.** Behind
show me the engine they may, if they want to; nothing depends on it. `contributor` shows what
`lead` shows. `naked` has no person and so no door.

---

## How the active profile is resolved (session start)

In order, first hit wins:

1. **`.madewell/profile`** — a local, git-ignored one-line file naming the active profile (e.g. `guide`). This is *your* clone's choice; it is never committed, so a maintainer's `lead` never forces a guest into it.
2. **First-contact resolution:**
   - headless / CI / no human in the loop → **naked**
   - a human on a *fresh clone* of a trade-bearing project (no prior state authored by them) → **contributor** → run the trade's onboarding
   - any other human → **adoption**, which asks the door question once, plainly: *"Would you rather just talk, and I'll handle everything behind the scenes — or shall I show you the engine as we go?"* — just talk → **guide**, show me the engine → **lead**

Write the resolved choice to `.madewell/profile` so it's silent next time.

---

## Loading a profile

Once resolved, the kernel loads the profile's rows:

- **persona** → read that register (or none, for naked)
- **domain** → load the listed pack(s)
- **quality** → if the loaded trade supplies a quality skill, use it; else fall back to the Rubric asked inline
- **memory** → the memory substrate (default: flat files)
- **onboarding** → if set, run it **once** on first contact, then never again
- **door** → show the person that door's surfaces (§ The two doors), and no others

The **function** (the Orchestrator) is identical under every profile. A profile changes what's
loaded around it — never the work lifecycle itself.

---

## Adding a profile

A profile is just a row-selection. To add one (a `sales` profile, a `reviewer` profile, a
domain-expert-guest profile): add an entry to `profiles.json` naming its persona, domain
pack(s), quality, memory, whether it onboards, and its door. No kernel change — that's the
point. The kernel depends only on the contracts; profiles compose them. There are two doors,
not one per profile: a new profile picks one of them.
