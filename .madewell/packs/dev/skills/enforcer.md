---
name: enforcer
description: >
  Stateful, recursive, file-by-file code quality protocol. Builds a tree map of
  the codebase, tracks progress in enforcer-state.json at repo root, and runs a
  machine-gated autophagy + hardening pass on one source file per invocation.
  Resumes across sessions. Use when user says "run the enforcer", "enforcer pass",
  "clean up the codebase", or "continue enforcer".
argument-hint: <optional — path to start from, defaults to repo root>
allowed-tools: Bash Read Write Edit Grep
metadata:
  author: jrg
  version: "2.0"
  tags: quality, autophagy, refactor, hardening, canonical, stateful
---

# The Enforcer

Stateful, file-by-file autophagy and hardening protocol.
One file per invocation. Machine-verified gates. No self-certification.

**Primary purpose:** Excavate hidden assumptions and canonicalize. Line deletion is the
side effect. Assumption surfacing is the artifact.

---

## Invocation

The user says "run the enforcer", "continue enforcer", or similar.
Optional argument: path to scan. Defaults to git repo root.

---

## Step 0 — Orient

```bash
git rev-parse --show-toplevel
```

All paths are relative to repo root (`$ROOT`).

---

## Step 1 — Load or Initialize State

State lives at `$ROOT/enforcer-state.json`. It is the only source of truth.

### State schema

```typescript
interface EnforcerState {
  version: 2;
  root: string;               // absolute path
  created: string;            // ISO 8601
  updated: string;            // ISO 8601
  patterns: PatternEntry[];   // canonical idioms discovered so far — grows across runs
  summary: {
    total: number;
    completed: number;
    flagged: number;
    skipped: number;
    pending: number;
  };
  files: Record<string, FileEntry>;
}

interface PatternEntry {
  name: string;        // e.g. "error-handling", "map-over-switch"
  description: string; // what it is and where it was first seen
  first_seen: string;  // file path
}

interface FileEntry {
  status: "pending" | "in-progress" | "completed" | "flagged" | "skipped";
  order: number;
  completed_at?: string;
  result?: {
    lines_before: number;
    lines_after: number;
    reduction_pct: number;
    assumptions_surfaced: string[];  // named, not counted
    tests_added: string[];           // "<test-file>:<test-name>"
    patterns_applied: string[];      // names from state.patterns
    patterns_discovered: string[];   // new ones found in this file
    flags: Flag[];
  };
}

type Flag =
  | "phase-1-no-deletion"
  | "phase-2-no-compression"
  | "phase-3-inconsistency"
  | "phase-4-no-assumptions"
  | "phase-5-no-tests"
  | "phase-5-tests-agent-created"  // developer must review
  | "phase-6-lint-fail"
  | "phase-6-tests-fail";
```

### Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not yet processed |
| `in-progress` | Claimed this session — if found on resume, re-process from scratch |
| `completed` | All gates passed |
| `flagged` | One or more gates failed — work done, moved on |
| `skipped` | Excluded by file selection rules |

### If the file does not exist → Initialize

1. Build the file tree (see **File Selection** below).
2. Compute order (see **Ordering** below).
3. Estimate duration: `pending_count × 12 minutes`.
4. Write `enforcer-state.json` with all files as `"pending"` and `patterns: []`.
5. Print INIT REPORT.

### If the file exists → Resume

1. Read it.
2. **Check for `in-progress` files.** If any exist, reset them to `"pending"` — a
   previous session died mid-file. Log which files were reset.
3. Print RESUME REPORT.
4. Pick the next file.

---

## File Selection

### Include — source code only

`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` `.py` `.go` `.rs` `.swift` `.zig`
`.c` `.cpp` `.h` `.hpp` `.java` `.kt` `.rb` `.ex` `.exs` `.cs`

### Exclude — hard rules

- `node_modules/` `dist/` `build/` `out/` `.next/` `.nuxt/` `coverage/`
- Any path segment starting with `.` (hidden dirs) — **except** `.github/`
- Test files: `*.test.*` `*.spec.*` `__tests__/` `test/` `tests/`
- Generated: `*.generated.*` `*.d.ts` `*.min.*`
- Docs/config: `*.md` `*.mdx` `*.txt` `*.json` `*.yaml` `*.yml` `*.toml`

### Ordering — leaf-first, high blast-radius last

Do not use fan-in alone. Use fan-in minus fan-out as a blast-radius proxy:

```bash
# For each pending file, compute (files that import it) - (files it imports)
# Lower score = safer to touch first
for f in <pending files>; do
  fan_in=$(grep -rl "$(basename $f .ts)" --include='*.ts' --include='*.js' \
    --include='*.py' 2>/dev/null | grep -v "$f" | wc -l | tr -d ' ')
  fan_out=$(grep -c "^import\|^from\|require(" "$f" 2>/dev/null || echo 0)
  echo "$((fan_in - fan_out)) $f"
done | sort -n
```

Lowest score first. Alphabetical tiebreaker. If the script is slow or unavailable,
fall back to alphabetical — always acceptable.

**Warning:** `index.ts`, `main.*`, and `mod.*` files often have fan-in 0 but
fan-out 40+. Check before assuming they are safe leaves.

---

## Step 2 — Pick the Next File

Select first `"pending"` file by order. Mark it `"in-progress"`. Write state immediately.
If no pending files remain → print COMPLETION REPORT and stop.

---

## Step 3 — Run the Protocol (4 Phases)

Four phases. Each has a machine-verified gate. You may not self-certify any gate.
Gate output must come from a tool call — show the actual output, not a summary of it.

---

### Phase 1 — Autophagy + Compression

**This is one phase.** Deletion and compression are the same operation: removing what
does not earn its place.

**Read the file first.** Record baseline:
```bash
wc -l <file>
```

Then apply — in this order:

1. Delete unused imports (grep to verify no call sites before deleting)
2. Delete dead functions (grep to verify no call sites)
3. Delete commented-out code blocks
4. Delete TODO/FIXME comments describing already-implemented behavior
5. Merge duplicate logic
6. Inline trivial single-use abstractions
7. Reduce nesting via early returns and guard clauses
8. `switch/case` → map lookup where the map is not harder to read
9. Flatten nested ternaries into named variables or flat conditionals

**Apply the codebase's own canonical patterns** from `state.patterns` before inventing
new ones. If a pattern in state says "use `Result<T>` for error handling," apply it here.

**Gate — show actual output:**
```bash
wc -l <file>
```
Record `lines_before` and `lines_after`. If neither moved, flag `phase-1-no-deletion`
AND `phase-2-no-compression`. Move on. Do not get stuck.

Note: line count reduction is a proxy, not the goal. A file that gains 5 lines from
a `switch→map` refactor that removes 3 duplicate branches is a win. Record both the
count and the rationale.

---

### Phase 2 — Assumption Excavation + Canonicalization

**This is one phase.** Surfacing assumptions and canonicalizing are the same operation:
making the implicit explicit and the inconsistent singular.

**For each non-trivial function:**

1. State what it assumes about its inputs
2. State what it assumes about its callers
3. State what breaks if those assumptions are wrong
4. Fix each broken assumption in code — add a guard, throw a typed error, or encode
   it in the type system. Do not leave assumptions as comments.

**Canonicalize within this file:**

- Single naming convention (match the file's own dominant convention)
- Single error-handling pattern (match what the rest of the codebase uses)
- Zero parallel abstractions doing the same thing
- Zero "multiple ways to do X" within this file

**Pattern registry — mandatory:**

After canonicalizing, check `state.patterns`:
- If this file introduces a pattern not yet in the registry → add it
- If this file violates a registered pattern → fix it and note it

**Gate:**

State each assumption surfaced and how it was resolved. No assumptions found is
a valid result — but only if you worked through every non-trivial function.

Format:
```
ASSUMPTIONS SURFACED: N
  · <function name>: assumed <X> — fixed by <what you did>
  · <function name>: assumed <Y> — encoded in type as <Z>

PATTERNS APPLIED: <names from registry, or "none">
PATTERNS DISCOVERED: <new entries added to registry, or "none">
```

If you cannot produce this output, you did not run Phase 2. Flag `phase-4-no-assumptions`
(preserved for state compatibility) and move on.

---

### Phase 3 — Adversarial Hardening

Tests are not a reward after compression. They are the proof that compression was safe.

**Find the test file:**
```bash
find . \( -name "*.test.*" -o -name "*.spec.*" \) | grep -i "$(basename <file> | cut -d. -f1)"
```

**Run it before touching it** — record the baseline test count and pass/fail:
```bash
<test runner>   # use what the project uses: vitest, pytest, cargo test, go test, etc.
```

**Add or strengthen tests for:**
- Empty input
- Null / undefined where the language allows it
- Boundary values: 0, 1, maximum
- Malformed input: wrong type, missing required field
- At least one parameterized/table-driven case
- Any assumption surfaced in Phase 2 that isn't already covered

**If no test file exists:** create one with at minimum 3 edge case tests covering the
assumptions found in Phase 2. Flag `phase-5-tests-agent-created` — the developer must
review agent-created test files. Do not silently count them as hardening complete.

**Gate — show actual output:**
```bash
<test runner>
```

Record: test count before → after, pass/fail.
If test runner is unavailable → flag `phase-5-no-tests` and move on.

---

### Phase 4 — Exit

Run linter and formatter:
```bash
# Detect from project: check package.json scripts, Makefile, Cargo.toml
# Common: npm run lint, biome check --write, ruff check --fix, cargo clippy, golangci-lint
```

Run full test suite:
```bash
# Common: npm test, pytest, cargo test, go test ./...
```

**Gate — show actual output. Both must pass:**
```
LINT:  PASS / FAIL (N warnings, N errors)
TESTS: PASS / FAIL (N passed, N failed)
```

If either fails → fix it. Do not mark a file complete with a broken suite.
If lint fails on something outside the file you touched → flag `phase-6-lint-fail`,
note it, move on — do not fix unrelated files in this pass.

---

## Step 4 — Write Results to State

```json
"src/foo.ts": {
  "status": "completed",
  "order": 1,
  "completed_at": "<ISO 8601>",
  "result": {
    "lines_before": 120,
    "lines_after": 91,
    "reduction_pct": 24,
    "assumptions_surfaced": [
      "processDir: assumed root always exists — added typed ForageRootError guard"
    ],
    "tests_added": [
      "src/foo.test.ts:throws on missing root",
      "src/foo.test.ts:handles empty directory"
    ],
    "patterns_applied": ["error-handling-typed-throws"],
    "patterns_discovered": ["map-over-switch"],
    "flags": []
  }
}
```

Update `state.patterns` if new patterns were discovered.
Update `summary` counts.
Write the file.

---

## Step 5 — Print Briefcase Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENFORCER  ·  <filename>  ·  <timestamp>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LINES      <before> → <after>  (<N>% reduction)

GATES
  Phase 1 — Autophagy/Compression:  PASS / FLAGGED (<flag>)
  Phase 2 — Assumptions/Canon:      PASS / FLAGGED (<flag>)
    Assumptions: <list or "none">
    Patterns applied: <list or "none">
    Patterns discovered: <list or "none">
  Phase 3 — Hardening:              PASS / FLAGGED (<flag>)  |  tests: <N> → <N>
  Phase 4 — Exit:                   LINT: PASS/FAIL  TESTS: PASS/FAIL

KEY CHANGES
  · <specific change — what and why>
  · <specific change — what and why>

PROGRESS   <completed>/<total> files  (<flagged> flagged, <pending> remaining)
           Est. remaining: ~<N> min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Output Formats

### INIT REPORT
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENFORCER INITIALIZED  ·  <repo>  ·  <date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCANNED    <N> source files discovered
EXCLUDED   <N> files filtered
ORDER      leaf-first by blast radius
EST.       ~<N> hours total  (<N> files × ~12 min)

FIRST FILE <path/to/first.ts>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### RESUME REPORT
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENFORCER RESUMING  ·  <repo>  ·  <date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS   <completed>/<total>  (<pct>% done)
FLAGGED    <N> files  (review before closing)
RESET      <N> in-progress files requeued: <list>
PATTERNS   <N> canonical patterns in registry
NEXT FILE  <path/to/next.ts>
EST.       ~<N> hours remaining
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### COMPLETION REPORT
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENFORCER COMPLETE  ·  <repo>  ·  <date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL       <N> files
COMPLETED   <N>  (<pct>%)
FLAGGED     <N>  — listed below

AVG REDUCTION   <pct>%
TESTS ADDED     <N>  (<N> agent-created — review these)
ASSUMPTIONS     <N> total surfaced across codebase

CANONICAL PATTERNS REGISTRY (<N> entries):
  · <pattern name> — <description> — first seen: <file>

FLAGGED FILES (review manually):
  · <file> — <flags>

To re-run: set desired files back to "pending" in enforcer-state.json.
Do not delete the file — history and patterns are preserved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Resumability Contract

- `enforcer-state.json` is the only source of truth.
- Mark `in-progress` before touching any file. Write state before the first edit.
- `in-progress` on resume means the session died. Reset to `pending` and reprocess.
- Write state after every file — never batch.
- Do not delete the state file to reset. Set files back to `"pending"` manually.
  The pattern registry and flag history are valuable — preserve them.

---

## Anti-Patterns

- **Do not self-certify any gate.** Show tool output. Every phase.
- **Do not batch files.** One file per invocation. Depth over breadth.
- **Do not invent test results.** If the runner fails, show the actual error and flag it.
- **Do not touch `completed` or `flagged` files.**
- **Do not write new tests in the source file.** Tests go in the project's test directory.
- **Do not treat agent-created tests as verified.** Flag them. The developer reviews them.
- **Do not assume fan-in 0 means safe.** Check fan-out. `index.ts` is a trap.
- **Do not apply the 30-60% reduction target as a hard rule.** It is a calibration signal,
  not a quota. A file that loses 5 lines but yields 3 surfaced assumptions and 4 new
  tests is a better outcome than one that loses 40 lines of comments.
