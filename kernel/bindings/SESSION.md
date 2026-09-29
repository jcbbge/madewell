# Session execution binding

Executable door: `bin/cst-session.py`. Optional Pi host: `bindings/pi.ts`.
Requires Python 3.9+ on a POSIX host. No model, agent runtime, service, or
third-party Python package is required by the door.

A piece's position remains its path. A session record describes **execution
within that piece**, not a second stock/bench ledger. Verification never moves a piece implicitly. Successful independent verification
permits a separate legal finish through the existing movement door. Bound pieces
require current, fresh, independently accepted execution at both the movement
and commit gates. Legacy unbound pieces intentionally remain allowed.

## Storage and observability

`.constellation/sessions/<id>.json` is the authoritative execution record: goal,
piece reference, current phase, actor, deadline, every phase's actionable
checklist, expected results, dependencies, command attempts, file hashes,
acceptances, prior failed cycles, and timestamped events. Logs are separate
artifacts referenced by that record, not an alternate state authority.

Each mutation holds a filesystem lock, writes a complete temporary record,
fsyncs it, atomically replaces the previous record, and fsyncs the directory.
Readers cannot see a half-written snapshot. Claims, record mutations, legal movement and rebinding share one repository
execution lock. Commands release it while running. Paused and historical done
sessions retain their bindings; start cannot replace them and erase makers.
Missing claimed paths fence new claims until explicit reconciliation.

Command start is persisted before execution. Running commands have controller
and process IDs, an attempt ID, start time, and a log path. The session lock is
released during command execution, so its running state remains observable.
A timeout or interrupt is not success. No command is retried automatically.

## CLI contract

One JSON request on stdin; one JSON result on stdout:

```sh
python3 kernel/bin/cst-session.py --root "$PWD" --session example --actor operator
```

Installed path: `.constellation/bin/cst-session.py`. IDs use letters, digits, `_`, `-`.
The caller supplies identity; the standalone CLI is a trusted local binding,
not an authentication service. The Pi binding supplies the native session ID
itself and does not expose an actor override to the model.

For new work, `start` may include `create_piece: true` with a new
`.constellation/stock/<slug>.md` path. This creates only stock material, not code;
existing files are never overwritten. Existing pieces need no creation flag.
During ideate/plan, `floor` writes the four SPEC lines on that bound stock piece:

```json
{"op":"start","piece":".constellation/stock/example.md","goal":"Write and verify an output file","create_piece":true}
{"op":"floor","making":"output.txt containing hello","not_making":"Other product changes","done_when":"Independent exact-content assertion passes","waits_on":""}
```

`floor` is owner-only and stock-only, not a general file editor. All four fields
are required single-line strings; only `waits_on` may be empty. It replaces the
four canonical floor lines, preserving the title and other prose. It neither
stages nor moves the piece, advances an act, nor refreshes previously captured
proof. Revise stale proof through the existing retry/record path.

For fresh work, declare implementation steps to stage/commit the stock arrival,
commit the bench arrival, and make the artifact, plus independent verification
steps. After planning, use `run` for the stock arrival commit, then the separate
`move` with `action: "bench"`, then `run` for the bench arrival commit. Stage only
the piece path and commit each position transition separately. Never call `move`
inside `run`. If commit authority is unavailable, stop and hand off that obligation;
do not combine staged moves or bypass the commit gate.

For example, the planned stock-arrival step may run:

```json
{"op":"run","step":"stock-commit","argv":["sh","-c","git add -- .constellation/stock/example.md && git commit -m 'chore(example): stock arrival' -m 'ACT: implement\nDONE: Record stock arrival\nNEXT: Move to bench'"]}
{"op":"move","action":"bench"}
{"op":"run","step":"bench-commit","argv":["git","commit","-m","chore(example): bench arrival","-m","ACT: implement\nDONE: Record bench arrival\nNEXT: Make the artifact"]}
```

These commit examples assume no unrelated paths are staged. Include both steps
in the plan before advancing to implement; execution does not invent steps.

Request examples for an **already committed bench piece**, in sequence
(one invocation per request):

```json
{"op":"start","piece":".constellation/bench/example.md","goal":"Write and verify an output file","minutes":60}
{"op":"propose","step":"understand","title":"Establish goal and exclusions","expected":"A concrete intended outcome and non-goals"}
{"op":"record","step":"understand","result":"Produce output.txt containing hello; do not modify other product files."}
{"op":"advance","reason":"Goal and exclusions established"}
{"op":"propose","step":"design","title":"Choose the actions and acceptance check","expected":"Implementation and verification checklists declared"}
{"op":"propose","phase":"implement","step":"write","title":"Create output.txt","expected":"File contains hello"}
{"op":"propose","phase":"verify","step":"check","title":"Assert the file content","expected":"Assertion exits zero"}
{"op":"record","step":"design","result":"Write output.txt, then independently assert its exact content."}
{"op":"advance","reason":"Actionable work and its check are planned"}
{"op":"run","step":"write","argv":["python3","-c","from pathlib import Path; Path('output.txt').write_text('hello')"],"evidence":["output.txt"]}
{"op":"advance","reason":"The planned output exists","artifacts":["output.txt"]}
{"op":"stop","reason":"Hand off verification"}
```

A **different actor** then invokes:

```json
{"op":"resume","reason":"Independent verification handoff","minutes":30}
{"op":"run","step":"check","argv":["python3","-c","from pathlib import Path; assert Path('output.txt').read_text() == 'hello'"]}
{"op":"advance","reason":"The recorded expected outcome was independently checked"}
```

The final result has `status: done`. The piece has not moved automatically.

Other operations:

- `show`: full state, expiry, running-process liveness, `piece_exists` and current
  `proof: {valid, error}`. Historical `status: done` is not a freshness claim.
  No phase advance.
- `propose`: optional `after: [step IDs]`; prerequisites must already exist in
  the target phase. Only ideation/planning can propose. Planning must declare
  both implementation and verification steps before it can advance.
- `record`: only ideation/planning; nonempty result, optional relative file
  evidence. Implementation and verification cannot fabricate a passed result
  through this operation: they must execute their command.
- `run`: implementation/verification only, existing planned step only;
  argv array, optional positive timeout in seconds (default 300, capped by
  remaining session time), optional relative evidence files. Output goes to a
  mode-0600 log. A failed command is recorded as failed even though the JSON
  request itself succeeded. Check the step status, not just CLI exit zero.
- `stop`: owner-only, records a paused session without claiming completion.
- `resume`: explicitly takes ownership of a paused session and sets a new time
  bound. Previous obligations and results remain.
- `recover`: refuses while a recorded command/controller is alive. Taking a
  different actor's active session also requires a known-dead supervisor or
  expired deadline. Interrupted side effects remain unknown; reconcile them.
  A host may supply its positive `supervisor` PID on start/resume; the Pi host
  does this automatically. PID reuse errs toward refusal, not silent takeover.
- `reject`: name a step and give a reason when its result fails the actual
  expectation, even if its command exited zero, or when the plan needs revision.
  Refuses while a command is running; records a failed step without erasing its
  original command outcome. This opens an explicit retry/replan, never completion.
- `retry`: requires failed/interrupted work or stale file evidence, plus a
  reason. Choose the required act with `phase`. Prior cycles are preserved.
  Returning to implementation/verification resets the existing planned steps;
  returning to plan/ideate clears downstream plans for explicit replanning.
  The piece stays at its actual open path: another attempt, not a position rewind.
  All contributing implementation actors, including failed commands, remain
  excluded from verification across cycles. Retained upstream evidence must be
  fresh: retry its phase rather than only resetting downstream work.
  The last owner can explicitly retry a stale historical done record while its
  piece is still open (optional `minutes`). A different actor may use this same
  explicit retry only if the previous supervisor PID is recorded and proven
  dead; expiry alone or an unknown supervisor is not enough. Ownership transfers
  only on a successful retry; cycles/makers survive and downstream approval is
  invalidated. A landed piece cannot reopen or move backward.
  Missing tracking provenance in old records also permits retry for recapture;
  restart at the earliest phase containing such evidence, not just verify.
- `reconcile`: owner-only, explicit `piece` destination and `reason`, with no
  running command. Rebinds an inspected, already-performed legal move whose old
  path is missing. Arbitrary renames are refused: restore the original path
  before continuing. With `landed: true` instead of `piece`, records a piece that
  left the tree without the door; that requires fresh independent acceptance.
- `move`: separate sanctioned host operation; `action` is `bench` or `finish`,
  optional boolean `break` for unit expansion at the bench. Uses the existing
  C movement door, stages only that move, never commits. Allowed after planning
  in implement and after done, under the session owner. Supports top-level
  pieces; nested moves use Git plus the commit gate. Finish is the removal at land
  (`git rm` of the leaf, or of a breakdown's whole folder), and requires the bound
  bench path to exist in HEAD: commit its stock-to-bench transition first, rather
  than collapsing two staged moves into an illegal stock-to-nowhere commit. The
  record is then marked `landed`: it claims nothing, and its path is free.
  Never run a move inside an
  executing step of the same bound piece: running commands fence movement.

The C door uses the Python `--move OLD NEW` and `--remove OLD` seams; the commit
gate uses `--check-move OLD NEW` and `--check-remove OLD` to validate staged moves
and removals and to rebind or land claims made before a direct Git command. Named tracked evidence must also match staged content at finish.
Proof capture retains `tracked` provenance from index or HEAD, including new
uncommitted tracked files. Finish checks capture provenance, current index and
HEAD; staged deletion, unmerged entries and non-regular tracked types refuse.
Explicitly untracked local evidence/logs remain allowed. For old proofs lacking
provenance, current index/HEAD membership still requires delivery. If neither
can establish tracking history, finish refuses with an explicit recapture
instruction: it never silently assumes that missing metadata meant untracked.
Freshness checks remain content checks; this delivery-provenance migration is
an additional finish obligation. Python check-move and check-remove refusals retain actionable
stderr while successful gate checks remain quiet.
Both share the claim lock. A crash between Git and record persistence leaves a
missing-path fence, not silent double ownership.

Refusal uses CLI exit 5 and `constellation.refused/v1`. Time expiry refuses further
work until an explicit stop/resume. It does not magically mean completion.

## Pi host: the actual tool boundary

Load explicitly from the project root:

```sh
pi -e ./kernel/bindings/pi.ts
```

In an installed project, use `pi -e ./.constellation/bindings/pi.ts`.
No global Pi settings are modified by this package. This package checkout opts
in through `.pi/extensions/constellation.ts`; it loads when Pi trusts and opens this
project (or reloads within it). Other installed projects opt in explicitly.
Starting a Pi process from another working directory does not activate this
project's binding.

The binding registers `cst_session` with `session` and a structured `request`
object (preferred). Legacy JSON-string requests remain accepted. Both forms
use the same object validation, backend and phase/tool gates; actor identity
still comes exclusively from the native host. Arrays, null and primitives
are refused; the backend continues to validate operations and their fields.
It allows read/grep/find/ls and `cst_session`. Intercom permits only `list`,
`list-cwd`, `pending`, `status`, and `reply` with a nonempty `replyTo`; pane
creation, retry/supersession, send, ask and cancel remain refused. All other
native/extension tools are blocked. Executable work goes through gated `run`
or the narrow legal `move` operation. Unknown extension
tools fail closed. This intentionally trades shell-based exploration for a
clear first enforcement boundary: read-based exploration remains available.

The footer/widget displays the selected session, phase, actor, and step states
from the same persisted record. Filesystem notifications update it during a
running command. `/cst <id>` inspects an existing record; `/cst` lists IDs.
Selection survives native-session reload via a Pi custom entry, but execution
state lives only in the repository record. Rendering rechecks proof through
the Python door, showing historical done separately from stale proof. The first
widget line starts with phase and status, before the goal, actor and checklist,
so a long session ID cannot hide them in a narrow pane. Refresh
on session events, tool calls or `/cst`; external artifact changes while idle
are not guaranteed an immediate repaint. Normal host shutdown requests a pause. Abrupt termination requires inspecting/recovering the durable record.

## Honesty boundaries

- This is a cooperating-host execution gate, **not an OS sandbox** against
  arbitrary commands or humans with filesystem access. Run commands retain
  the user's permissions. Do not put secrets in argv, recorded prose, or logs.
- The machine proves ordering, declared prerequisites, command outcomes,
  artifact existence/freshness, and identity separation supplied by the host.
  It cannot prove that an ideation statement is thoughtful or a test is adequate.
- Freshness covers the **complete current retained named proof closure**,
  across all phases, before and after dependent execution and at acceptance
  and finish. Archived retry proofs are historical, not current dependencies.
  Declare the affected scope; omitted dependencies are not magically checked.
- Legacy unbound pieces intentionally have no execution prerequisite. Once
  bound, removing or losing the execution door refuses movement when sessions
  exist. Deliberately deleting records or bypassing the Git hook is outside the
  cooperating-host trust boundary, not a supported legacy escape.
- Git and record writes are not one filesystem transaction. Reconciliation
  handles the fail-closed gap; do not mix a live old binding with a replacement
  implementation during a move. Stop cooperating hosts before upgrading.
- Recovery does not promise exactly-once side effects. A controller can die
  between launching a process and recording its PID. Such attempts require
  reconciliation; do not assume an unrecorded PID means nothing happened.
- The standalone caller can assert actor strings. The Pi tool binds actor to
  its native session identity; another native session is required for verify.
  Neither mechanism certifies reviewer competence or separate human identity.
- Installer-managed ignores currently keep execution records local in consumer
  projects. They survive process loss and re-sync, but are not automatically
  backed up or transported by Git. The existing uninstall removes `.constellation/`,
  including local execution records; do not uninstall a live workspace.
- The binding must actually be loaded before calling the host fence live.
  Installing source files is not activation.

Tests: `PYTHONDONTWRITEBYTECODE=1 python3 kernel/bin/cst-session.t.py`.
