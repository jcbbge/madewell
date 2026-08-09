# Session Protocol — Start and End (law, extracted verbatim from AGENTS.md v5.1)

## Session Start

Every session, in this order:

**1. Read state**
```
Read .madewell/madewell.json
Read .madewell/DECISIONS.md
Read .madewell/PRODUCT.md
Read .madewell/work/status.jsonl (if exists)
```

**2. Reconcile execution state**

If `status.jsonl` exists, check it. For each task:
- If `task_completed` event exists → task is done, regardless of madewell.json
- If `task_started` with no completion → in-flight or orphaned
- If madewell.json and event log conflict → **event log wins**

Log the session start:
```jsonl
{"ts":"...","type":"session_start","session":"s-YYYY-MM-DD-001","mode":"single"}
```

**3. Orient** — surface where the work stands and the next move. State the open thread plainly;
don't narrate that you read the files.
> *Guide persona (if loaded): orient by opening with a warm question in the person's own words
> and metaphors, not a status report — see `.madewell/packs/guide/PACK.md`.*

**4. If madewell.json has an open thread, surface it.** Ask whether to continue or redirect.

**5. First-ever session:** set the frame before anything else — what this is, how work moves
(Discovery → Commit → Build → Land), their role and yours — then move into discovery. *(With the
Guide pack loaded this becomes the warm **Orientation**; persona-free, keep it to a few honest
sentences.)*

## Session End

Before closing:

**1. Log completion events** (before touching madewell.json)
```jsonl
{"ts":"...","type":"task_completed","session":"SESSION_ID","task":"TASK_ID","summary":"..."}
{"ts":"...","type":"session_end","session":"SESSION_ID","summary":"...","open_thread":"..."}
```

**2. Update Madewell state**
- Update madewell.json — especially `context.openThread`
- Append new decisions to DECISIONS.md
- Update PRODUCT.md if anything new was learned
- Delete briefs for verified-complete work

**3. Handoff**
- Say specifically what was accomplished this session
- Name exactly where we pick up next time

The event log is written first. If the session crashes after that, the truth survives.
