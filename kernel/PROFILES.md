# Profiles — one word, one door

A **profile** is one word in `.constellation/profile`, a local, git-ignored file: this clone's
choice, never committed, so one person's door never forces another's. It decides which door
the person came through and how the host sounds. It never changes the work. The whole
manifest, with every row a profile fills, is `.constellation/profiles.json`.

| Profile | Who | Door | How the host sounds |
|---|---|---|---|
| **guide** | a person who would rather just talk — often not technical | **just talk** | the Guide register (`registers/guide/REGISTER.md`) |
| **lead** | the owner who holds the project, with the agent as a peer | **show me the engine** | the trade's Lead register, if it has one |
| **contributor** | a technical guest joining someone else's project | show me the engine | the trade's Contributor register, if it has one |
| **naked** | machines, CI, headless agents | none — no person | none |

---

## The two doors

The person meets Constellation through one of two doors, **chosen once at adoption** and
stored as the profile: **just talk** is `guide`, **show me the engine** is `lead`. The host asks
the question once (`HOST.md`) and never again; if the person later asks for the other door, the
host rewrites `.constellation/profile`.

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
| the files under `.constellation/` and the history of commits | no | yes |
| the jig reading — `constellation tax` | no | yes |

Behind either door, **the person is never asked to type a command or an engine word.** Behind
show me the engine they may, if they want to; nothing depends on it. `contributor` shows what
`lead` shows. `naked` has no person and so no door.

---

## At session start

1. **`.constellation/profile` names one** — use it, silently.
2. **No file yet:** headless, with no person → `naked`. A person on a fresh clone of someone
   else's project → `contributor`, and the trade's first-contact read-out, once. Anyone else →
   adoption, which asks the door question once: just talk → `guide`, show me the engine →
   `lead`.

Write the answer to `.constellation/profile` so it is silent next time.
