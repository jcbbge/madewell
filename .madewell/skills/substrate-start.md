# Substrate Start

**Run after reading the memory stack. Reconciles execution state.**

---

## When to Use

Every session. After reading STATE.json, DECISIONS.md, PRODUCT.md.

---

## Step 1 — Read the event log

```bash
cat .madewell/work/status.jsonl 2>/dev/null | tail -100
```

If empty or missing, this is the first session using the substrate. Skip to Step 4.

---

## Step 2 — Reconstruct execution state

Parse events. Build two maps:

**Tasks:**
- `task_started` with no `task_completed` → in-flight or orphaned
- `task_completed` → done
- `task_blocked` → blocked (check if unblocked by later event)

**Packages (if orchestrated):**
- `package_assigned` with no `package_completed` → in-flight
- `package_completed` → done

---

## Step 3 — Reconcile with STATE.json

For each task in STATE.json `active`:
- If event log has `task_completed` → task is done, STATE.json is stale
- If event log has no events → task was never started

**The event log wins.** If completion is logged, the work is done regardless of what STATE.json says.

Report discrepancies plainly:
> "The event log shows t001 completed on 2026-05-29, but STATE.json still has it active. Treating as complete."

---

## Step 4 — Log session start

```jsonl
{"ts":"...","type":"session_start","session":"s-YYYY-MM-DD-NNN","mode":"single"}
```

Use `"mode":"orchestrated"` if this session will delegate to sub-agents.

---

## Step 5 — Continue to normal session flow

Open with a question, not a report.
