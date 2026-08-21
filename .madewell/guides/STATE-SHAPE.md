# State Shape — Two Stores (law, extracted verbatim from AGENTS.md v5.1)

State lives in two stores, never one (see `LIFECYCLE.md` for why). Schemas:
`guides/schemas/madewell.schema.json` (outer) and `guides/schemas/cycle.schema.json` (inner).

**Outer store — `madewell.json`** (one per project, permanent). The Discovery **pool** + the
admitted **queue** (`active[]`) + the outer **stage** pointer:

```json
{
  "project": "name in their words",
  "profile": "lead | contributor | guide | naked | null   (project-pinned fallback; local .madewell/profile overrides)",
  "stage": "discovery | commit | build | land",
  "updated": "ISO date",
  "context": {
    "summary": "one sentence — what's happening right now",
    "openThread": "exactly where to pick up next session",
    "language": { "concept": "their word for it" }
  },
  "discovery": [
    { "id": "d001", "item": "plain-language work item", "scope": "area of the project", "dependsOn": [] },
    { "id": "d002", "item": "work item that requires d001 first", "scope": "...", "dependsOn": ["d001"] }
  ],
  "active": [
    { "id": "d001", "cycle": ".madewell/cycles/c001.json" }
  ],
  "blocked": [
    { "id": "d002", "reason": "why it's blocked", "unblocks": "what resolves it" }
  ]
}
```

**Inner store — `.madewell/cycles/<id>.json`** (one per spawned Cycle, ephemeral — born at
Commit→Build, deleted at Land). The inner queue + **phase** pointer. Locked-spec Commit
mints `phase: "plan"` (Imagine skipped). Open shape mints `phase: "imagine"`.

```json
{
  "id": "c001",
  "parent": "d001",
  "created": "ISO date",
  "phase": "imagine | plan | make | verify",
  "imagine": [
    { "id": "i001", "item": "smallest completable piece", "status": "pending", "dependsOn": [] },
    { "id": "i002", "item": "piece that needs i001 first", "status": "pending", "dependsOn": ["i001"] },
    { "id": "i003", "item": "piece that can run alongside i002", "status": "pending", "dependsOn": ["i001"] }
  ],
  "brief": ".madewell/specs/2026-06-21-description.md"
}
```

`stage` (outer) and `phase` (inner) are different pointers at different scales — never collapse
them into one field. `discovery[]` is the **pool**; `active[]` is the outer **queue**; the
Cycle's inner queue is `imagine` items unless a locked-spec Commit started at Plan. Each
loop drains its own queue, not the pool.

**Rules:**
- Update immediately when state changes. Never batch.
- **Write stores atomically.** Never edit `madewell.json` or a cycle store in place — write the
  full new content to `<file>.tmp`, then `mv <file>.tmp <file>` (rename is atomic on POSIX). A
  death mid-write must never leave a store unparseable. Append-only files (`status.jsonl`,
  `board.jsonl`, `tax.jsonl`) are exempt — appending a whole line is the atomic unit there.
- On Commit (`discovery` → `active`): mint the cycle store (`phase: "plan"` if locked spec,
  else `phase: "imagine"`), add an `{id, cycle}` pointer to `active`.
- On Land: delete the cycle store and its brief, remove the item from `active`, say what was accomplished.
- The stores get shorter as work gets done. If `madewell.json` keeps growing, something is wrong.
- New intake goes straight into `discovery`. Route it to a decision or release it — don't let it pile up unrouted.

**Dependency and dispatch rules (`dependsOn`):**
- `dependsOn` is an optional array of sibling item IDs. Absent or empty = no dependencies = immediately eligible.
- **Frontier** = all `pending` items whose every `dependsOn` ID has `status: "done"`. These are the items eligible to run right now.
- Dispatch the entire frontier concurrently, not one item at a time.
- After each item completes, recompute the frontier — newly unblocked items may now be eligible.
- If the frontier is empty and pending items remain, a cycle is blocked. Surface which items are waiting on which, and why.
- `dependsOn` is set during the **Plan phase** and does not change after that. It is not an event — do not log it to `status.jsonl`.
