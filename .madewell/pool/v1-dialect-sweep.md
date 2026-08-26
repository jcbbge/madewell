# v1 dialect sweep — retire `madewell.json` and `cycles/` from the framework's own prose

**Source:** SPEC.md v2 (2026-08-25). Position is now path; the projection and the
per-Cycle JSON have no successor and no reader.

**Asking:** 23 files across `.madewell/skills/`, `.madewell/guides/`, `profiles.json`,
and `cartridges/dev/` still instruct agents to read and write `madewell.json`,
`.madewell/cycles/<id>.json`, `discovery[]`, and `active[]` — roughly 90 references.
Until they are swept, a session started from those skills will maintain a store the spec
no longer recognises, and the drift this whole revision was meant to end starts again
from the framework's own documentation.

`install.sh` still seeds `madewell.json` and `cycles/` on a fresh install for exactly
this reason: stopping mid-sweep would break `session-start.md` on day one. That seeding
is transitional and comes out with this item.

**Known reference sites** (`grep -rlE 'madewell\.json|\.madewell/cycles|discovery\[\]|active\[\]'`):

- heaviest: `skills/session-start.md` (11), `work/SUBSTRATE.md` (11), `guides/STATE-SHAPE.md` (7)
- `.madewell/AGENTS.md` (8), `guides/SESSION-PROTOCOL.md` (6), `skills/substrate-start.md` (6)
- `skills/{commit,discovery,session-end,substrate-end}.md` (4 each), `EXTENDING.md` (4)
- `guides/{00-SETUP-GUIDE,03-SESSIONS,ORCHESTRATION}.md` (3 each), `guides/schemas/madewell.schema.json` (3)
- `profiles.json` (2), plus single hits in `PROFILES.md`, `guides/README.md`,
  `guides/SKILLS.json`, `skills/land.md`, `skills/orchestrate.md`, `cartridges/dev/onboarding.md`

**Open question for the sitting:** `guides/02-THE-LOOPS.md` and `guides/STATE-SHAPE.md`
describe the inner loop as a single Imagine queue. SPEC v2 gives the inner loop a pool,
a valve (Plan), and a queue. Deciding whether STATE-SHAPE survives at all, or is replaced
by a pointer to SPEC §2, is part of bounding this.
