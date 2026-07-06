# Decisions

One line per decision. Append only. Never delete.

Format: `YYYY-MM-DD | decision | reason`

---

2026-07-05 | Durability layer stays file-based (JSONL + atomic mv), PGlite rejected | Kernel law is zero-dep POSIX drop-in; files are the agent-native medium (any harness can read them without running code); PGlite adds npm+Node per project and is single-process anyway. Snapshot-per-line JSONL for the stores also rejected — two-store overwrite + status.jsonl WAL ("event log wins") already covers recovery; gaps closed instead with the atomic-write law (AGENTS.md) and claim TTL/takeover/release on board.jsonl (orchestrate.md).
