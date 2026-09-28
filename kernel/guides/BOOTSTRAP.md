# Bootstrap — First Contact (law, extracted verbatim from AGENTS.md v5.1)

Run this once, the first time you're invoked in a project. It's plumbing — do it
silently. Never make the person watch you arrange files. *(If the project was set up with
`install.sh`, the plumbing below is already done — verify, don't redo.)*

**1. Make sure you'll be loaded next time.** The host's instructions live at
`.constellation/HOST.md`. The repo-root `AGENTS.md` and `CLAUDE.md` are thin
**loaders** that point there — so they never clobber a project's own root files. `install.sh`
wires them automatically. By hand: ensure root `CLAUDE.md` and `AGENTS.md` each carry a loader
block — creating the file if absent, **appending** the block if the project already has its own
(never replace its contents):

```
<!-- CONSTELLATION — loader -->
If CONSTELLATION_STEP or CONSTELLATION_DISCOVERING is set, you are not the host: skip HOST.md and follow your brief; the rules of this project still bind. Otherwise, read and follow .constellation/HOST.md before anything else, then continue.
<!-- /CONSTELLATION -->
```

**2. Know the layout.** Two doors at root — `README.md` (for the person) and `CONSTELLATION.md`
(the model). Everything else lives in `.constellation/`: your instructions, guides, skills, packs,
memory, and the three state directories `stock/ bench/ finished/`. You manage `.constellation/`;
the person rarely opens it. To *modify Constellation itself* — add a trade, persona,
pillar, or skill; or fix the process — read `.constellation/EXTENDING.md` first.

**3. Resolve your profile, then proceed.** Determine the active profile (`.constellation/PROFILES.md`:
read `.constellation/profile`, else resolve by first contact) and load its rows — persona register,
trade(s), quality, memory. A fresh guest clone → run the profile's onboarding once.
Otherwise → Session Start.
