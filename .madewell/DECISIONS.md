# Decisions

One line per decision. Append only. Never delete.

Format: `YYYY-MM-DD | decision | reason`

---

2026-07-22 | CLI-only distribution; per-platform native binary via `save-lisp-and-die` | browser is a future thin client over the same binary's `--serve`; zero Lisp exposure to users is an invariant
2026-07-22 | Repo stays named "Constellation"; Made Well referenced, not formally cited as its grammar | Made Well is host-agnostic; pinning it to Lisp would violate its own ethos
2026-07-22 | Primitive membrane splits on collectible vs runtime-inherent | anything accumulating in a collection must be surfaceable and Strudel is that gateway; hooks/directives are never searched
2026-07-22 | Adopt the celestial namespace from prior Constellations | largely complete already; the work is bringing orbiting organs in and renaming them
2026-07-25 | Toolchain: SBCL 2.6.6 + ocicl 2.17.0 + FiveAM 1.4.3 via brew | matches the ENV-2026-07-22 pins exactly, verified by running the commands rather than reading the record
2026-07-25 | First slice is grounding, not escalate/resume | grounding is the guardrail that must exist before anything runs unattended (convergence plan 5d); building the visceral one first means retrofitting the guardrail
2026-07-25 | The grounding door SIGNALS a condition rather than returning a failure value | the operator's epistemics rule is "No source -> UNKNOWN -> ask"; a return value cannot express the ask, a restart can — grounding and the cooperative pause become one mechanism
2026-07-25 | Envelope field set frozen byte-compatible with v5's TELEMETRY.md contract | any reader or visualizer written against v5 must read v6 unchanged
2026-07-25 | Install Made Well via its own install.sh, not a fork or vendor | madewell has its own remote and active development; install.sh is non-clobbering, idempotent and droppable, so the two stay separate and re-sync by re-running
2026-07-25 | Made Well profile for this project is `lead` | solo maintainer + agent as peers, cartridge-bearing project
2026-07-25 | The M1 archive's "40% = planning loop" reading was WRONG; corrected to "the descent" | operator supplied the missing context — v0 worked by hand for months, and each stall was a deliberate move to a layer he did not own
2026-07-25 | Do not wire the mcp-lisp REPL bridge yet | verified: repository has NO license file (GitHub API `.license` = null) despite README claiming MIT/Apache-2.0; ask the author before taking a dependency into the harness/runtime seam
2026-07-25 | Made Well governs orchestration in this repo — no more ad-hoc coordinator briefs | the first fan-out bypassed it and reproduced the exact failure Made Well exists to prevent: every implementer wrote its own tests

2026-07-27 | The Pane Compiler PRD lands in constellation, not circadian | it is compile-time context assembly, not digest-time memory; the pane is Constellation's to own
2026-08-05 | Remote is private jcbbge/constellation-v6, not bare "constellation" | the bare name belongs to a PUBLIC April snapshot (created+pushed 2026-04-10, 543KB); v6 is unpublished work and stays private until the Lead says otherwise; renaming/archiving the old repo is an operator call
2026-08-05 | Neo-report recommendations land as ONE discovery item (d010), not 19 | Lead's call: the queue holds pointers, cycles pull items when their surface gets built; keeps the discovery queue from flooding — the stores get shorter as work gets done
2026-08-05 | c001's i006 is a build package (full Implementer+Test-Designer pair); i001-i005 are verification-only (Test-Designer + Runner) | the coordination-gate fix generates new code, so the wall applies to it too; the five existing packages already have implementations, so only the design/run halves of the wall are needed
2026-08-05 | c001 verification wave runs in the MAIN tree with disjoint new-file partitions (no worktrees) | all outputs are new files under .madewell/{specs,work}; no concurrent edits to shared files are possible, and the main tree's populated ocicl/ is required to load FiveAM. Code-EDITING fan-outs still use worktrees per WORKER-CONTRACT §4
2026-08-05 | Orchestrators recurse the fan-out protocol (Lead directive 2026-08-05) | herdr is the substrate, Tower the bus; an orchestrator tasks out and breaks down its work to parallel async sub-agents under the same CLAIM-gate/brief/DONE discipline that spawned it
2026-08-05 | FiveAM suites must aggregate via `run` + `explain!` + `results-status`, never `count-if` over `run!`'s return | `run!` returns `explain!`'s boolean, not a results list (ocicl fiveam-20240928 src/run.lisp:286-296); this crashed the spine verification suite's exit-code aggregation despite 53/53 checks passing, and was independently caught pre-run by a second worker on the same wave — a real, recurring trap, not a one-off typo
