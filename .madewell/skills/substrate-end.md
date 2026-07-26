# Substrate End

**Run before session-end. Logs execution events before madewell.json update.**

---

## When to Use

Every session. Before updating madewell.json.

---

## Step 1 — Identify completed tasks

List every task completed this session:
- Task ID (from madewell.json)
- Scope
- One-line summary

---

## Step 2 — Log completion events

For each completed task:

```jsonl
{"ts":"...","type":"task_completed","session":"SESSION_ID","task":"TASK_ID","summary":"..."}
```

---

## Step 3 — Log blocked tasks (if any)

```jsonl
{"ts":"...","type":"task_blocked","session":"SESSION_ID","task":"TASK_ID","reason":"..."}
```

---

## Step 4 — Log session end

```jsonl
{"ts":"...","type":"session_end","session":"SESSION_ID","summary":"...","open_thread":"..."}
```

- `summary` — what was accomplished
- `open_thread` — exact entry point for next session

---

## Step 5 — Continue to normal session-end

Now update madewell.json, DECISIONS.md, PRODUCT.md as usual.

The event log was written first. Even if session-end fails, the execution truth survives.
