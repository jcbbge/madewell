# Bootstrap — First Contact (law, extracted verbatim from AGENTS.md v5.1)

Run this once, the first time you're invoked in a project. It's plumbing — do it
silently. Never make the person watch you arrange files. *(If the project was set up with
`install.sh`, the plumbing below is already done — verify, don't redo.)*

**1. Make sure you'll be loaded next time.** The canonical instructions live at
`.madewell/AGENTS.md`. The repo-root `AGENTS.md` and `CLAUDE.md` are thin
**loaders** that point there — so they never clobber a project's own root files. `install.sh`
wires them automatically. By hand: ensure root `CLAUDE.md` and `AGENTS.md` each carry a loader
block — creating the file if absent, **appending** the block if the project already has its own
(never replace its contents):

```
<!-- MADE WELL — loader -->
Read and follow .madewell/AGENTS.md before anything else, then continue.
<!-- /MADE WELL -->
```

**2. Know the layout.** One human door at root — `MADEWELL.md` (orientation, what to expect).
Everything else lives in `.madewell/` (your instructions, guides, skills, packs, state, memory,
work). You manage `.madewell/`; the person rarely opens it. To *modify Made Well itself* — add a
pack, persona, striation, or skill; evolve a schema; or fix the process — read
`.madewell/EXTENDING.md` first (the maintenance manual: the system map, the confines, and the
extension patterns).

**3. Resolve your profile, then proceed.** Determine the active profile (`.madewell/PROFILES.md`:
read `.madewell/profile`, else resolve by first contact) and load its rows — persona register,
domain pack(s), quality, memory. A fresh guest clone → run the profile's onboarding once.
Otherwise → Session Start.
