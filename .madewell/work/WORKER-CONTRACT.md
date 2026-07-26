# Worker Contract — Constellation

**Every worker brief in this project references this file. It is law, not guidance.**

Written 2026-07-25 after the first fan-out shipped five green packages while violating three
of Made Well's never-do rules. The rules below are not new; the *gates* are. Each one exists
because an instruction without a gate is a suggestion, and five workers proved it.

---

## 1. The CLAIM gate — you are not started until the board says so

Your **first action**, before reading another file or writing a line, is:

```
mcp__tower__board_post
  topic = <the program topic named in your brief>
  from  = <your worker name>
  type  = "claim"
  body  = "CLAIM <worker> · pane <your pane id> · owns: <exact paths> · branch <name>"
```

Then **read the board back** (`mcp__tower__board_read topic=<topic>`) and confirm your own
claim is in the result.

- If it is not there, the post failed. Say so in your report and stop. Do not proceed.
- Do not report "posted to the board" unless you have read it back and seen it.

**Verified 2026-07-25:** a spawned Herdr pane *can* reach Tower. A probe pane posted
successfully. So a failure here is real and worth surfacing, not an expected limitation.

**Orchestrator side of the gate:** after spawning, read the board and confirm the worker's
claim landed *before* sending it any further instruction. A worker whose claim has not
appeared within 2 minutes is treated as not-started — investigate the pane directly. Never
let work proceed on an unconfirmed claim. This is what the first fan-out skipped, and it is
why five succeeding workers would have looked dead if the board had been trusted.

---

## 2. You do not test your own code

**AGENTS.md never-do #11.** If your package generates code, you are the **Implementer** and
you write **no tests**. An independent Test-Designer works from the same brief, in parallel,
and never sees your implementation. A separate runner executes.

This is the Isolation Wall — the single strongest idea recovered from five prior
Constellations, motivated by an observed failure:

> "When the same agent was building code AND writing its own tests, tests would fail and the
> agent would update the code to satisfy the failing test rather than fix the implementation."

The model cannot reliably tell "fix the bug" from "dodge the test" when it can see both.
Prompt-based isolation is leaky; the wall must be structural. In this project the wall is a
process boundary: two panes, two worktrees, no shared output.

A green suite written by its own implementer proves self-consistency, not correctness.

---

## 3. Grounding is the product here — do not assert what you did not acquire

Every version, API shape, file path, count, or external value that reaches your code, tests,
or report must come from a command you ran or a URL you fetched **in your own session**.

- No values from memory. Not even obviously-correct ones.
- If you cannot acquire it, write `UNKNOWN` and surface it.
- Counting is acquisition too: `grep -c "Running test"` also matches the suite header line.
  Count the source of truth, not the output. This exact error was made twice today, in both
  directions.

This repo just shipped the enforcement of this rule as its first slice. Violating it here is
disqualifying.

---

## 4. File ownership is absolute

Touch only the paths your brief assigns you. `constellation.asd` and `src/package.lisp` are
**orchestrator-owned** in every fan-out — you never edit them. Deliver a "Register me" note
instead: the ASDF component to add and the symbols to export.

Workers never share a working tree. You run in your own git worktree on your own branch.
Concurrent edits to one tree revert each other silently; this has been observed here.

`/ocicl/` is gitignored, so a fresh worktree has no FiveAM — symlink the mainline vendored
directory in (`ln -s /Users/jrg/constellation/ocicl <worktree>/ocicl`) and exclude it via
`.git/info/exclude`. **Never run a package install inside a worktree.**

---

## 5. Report honestly, including what you did not do

Silent scope reduction is the one unrecoverable error. A stated gap is fine; an implied
completion is not.

Your report ends with two mandatory lines:

- **Facts in my brief that turned out to be wrong:** …
- **What I did NOT do, and why:** …

If neither applies, write "none" — do not omit the headings.

---

## 6. Long-running processes

One-shot commands only. If your package deliberately spawns processes, you own their teardown
and your report must state the orphan count, verified by process handle. A session must never
end with a process you started still running.
