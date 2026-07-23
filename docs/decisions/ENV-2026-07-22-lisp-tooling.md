# Environment Doc — 2026-07-22: Lisp dev environment and tooling survey (Topic 4)

**Status:** research record, survey only — NOTHING was installed this session
(`which sbcl` -> not found, unchanged). Recommendations only; decisions are the
operator's. Every row fetched this session.

## The environment table

| Need | Named tool (recommended) | Source (fetched/read this session) | One-line rationale |
|---|---|---|---|
| Implementation | SBCL 2.6.6 | https://www.sbcl.org/platform-table.html; https://formulae.brew.sh/formula/sbcl | Convergence verdict's pick (condition system + live image); current on all four target platforms. |
| Install path | `brew install sbcl` (macOS dev), official tarballs elsewhere | https://formulae.brew.sh/formula/sbcl (2.6.6, arm64 bottles for tahoe/sequoia, zstd dep); https://www.sbcl.org/getting.html | Brew is current and Apple-Silicon-native; official binaries cover CI runners. |
| Package manager | ocicl v2.17.0 (not Quicklisp) | https://github.com/ocicl/ocicl — v2.17.0 (Jul 2026), 807 commits, MIT | Confirms the verdict: OCI-registry distribution, sigstore-signed, project-local by default, `ocicl.csv` lockfile for reproducible builds, auto-hooks into ASDF misses. |
| System definition / build | ASDF (via ocicl's embedded runtime) | https://github.com/ocicl/ocicl (ASDF integration section) | ocicl is a fetcher; ASDF remains the build/system layer — standard, nothing custom. |
| Test runner | FiveAM 1.4.3 (primary recommendation) | https://github.com/lispci/fiveam — 1.4.3 (May 2024), 210 stars, BSD-3 | Mature, stable API, suite-based regression style; the boring choice for a project the operator must teach. |
| Test runner (alternate) | Parachute | https://github.com/Shinmera/parachute (archived May 2026) -> moved to https://codeberg.org/shinmera/parachute (Aug 2025 per search); zlib | Actively maintained by Shinmera/Yukari Hafner, extensible, test dependencies skip cascade failures, compat layers for other frameworks; costs a Codeberg dependency. |
| Test runner (rejected) | Rove | https://github.com/fukamachi/rove | README self-describes "still BETA quality. The APIs will be likely to change" — wrong risk for us. |
| Linter / checker | SBCL compiler warnings + sblint | https://github.com/cxxxr/sblint — BSD-2, Fukamachi; wraps SBCL's compiler over .asd projects | The compiler IS the checker (type inference + compile-time warnings); sblint packages that as a lintable, reviewdog/pre-commit-friendly command. No custom checker needed. |
| Formatter | trivial-formatter (survey winner, thin field) | https://github.com/hyotang666/trivial-formatter (library + CLI, uses CL pretty-printer) ; alternatives seen: https://github.com/eschulte/lisp-format (drives Emacs), https://github.com/atgreen/rewrite-cl (format-preserving rewriting) | Only pure-CL no-Emacs option found; field is thin — treat formatting as editor-integration first, CI gate later, and revisit. |
| AST / parse | `(read)` in the image; tree-sitter-commonlisp for external tooling | agent.lisp:59-63 (read-from-string + eval loop, read this session); https://github.com/theHamsta/tree-sitter-commonlisp v0.4.1 | Lisp reads Lisp natively; the grammar exists for anything outside the image (see DECISION-2026-07-22-code-intel.md). |
| REPL-over-MCP | jsulmont/mcp-lisp (primary recommendation) | https://github.com/jsulmont/mcp-lisp — MCP 2025-11-25, 44/44 conformance checks (32 scenarios) vs the official Anthropic conformance suite, stdio + SSE (SSE via Woo), 438 unit tests, MIT/Apache-2.0 | Full SDK (server, client, agent), stdio transport is exactly the Claude-Code-integration shape we need for a CL-REPL-into-this-harness bridge; conformance matches the convergence verdict's 44/44 note. Caveat: 7 stars/1 fork — tiny bus factor; mitigated by dual license + our ability to read the source. |
| REPL-over-MCP (alternate) | 40ants/mcp | https://github.com/40ants/mcp — 54 stars, Unlicense, stdio + Streamable HTTP | Explicitly early: "Active development is ongoing and the interface is likely to change"; full spec support still in-progress on its own roadmap. Watch, don't build on. |
| Editor surface | VS Code + Alive (pragmatic), Emacs+SLIME/Sly (canonical) — operator's call | https://github.com/nobody-famous/alive — LSP for CL w/ SBCL, REPL, inline eval; README: goal is "to reach Minimum Viable Product status", no releases published; Unlicense | Confirms the verdict's DX-tax flag: Alive is pre-MVP. The REPL-over-MCP bridge (row above) is the real day-one DX answer — the operator's editor barely matters if the agent drives a live REPL. |

## The TS-runners question (operator's direct question, task boundary)

**Can existing TS tooling help? For Lisp-the-artifact: no. For the dev loop: it already
is the dev loop.** The boundary, stated once: TS/Pi (this harness, its runners, its MCP
plumbing) is the OUTER development harness — it drives the work, runs the briefs, hosts
the CL-REPL-over-MCP bridge. SBCL is the thing BEING BUILT and the thing that ships and
runs. No TS parser/runner/checker touches Lisp source as Lisp: parsing is `(read)` in
the image or tree-sitter-commonlisp; checking is the SBCL compiler + sblint; testing is
FiveAM inside the image. The MCP bridge is the single seam where the two worlds meet —
and that seam is itself a prototype of the runtime's own thesis (per the convergence
plan section 4, read this session). Don't conflate the two sides of that seam.

## The "build-our-own?" list (expected empty or tiny — it is tiny)

1. **~50-line live-image dictionary emitter** (Lisp, walks packages/symbols via
   describe/apropos/documentation, emits JSON) — not really "tooling," it is option 1
   of the code-intel decision record; no existing tool does image-truth extraction into
   our index. Everything else on the table above is reuse.
2. **Optional later:** the Coraline fork adding tree-sitter-commonlisp (one crate + one
   enum arm + rebuild) — a patch to an existing tool, not a new tool.

Nothing else. No custom runner, checker, or formatter justified by the survey: the
compiler-as-checker plus the table above covers every need named in the task.

## Version pins (as of 2026-07-22, all from fetched sources above)

SBCL 2.6.6 (brew, arm64) | ocicl v2.17.0 | FiveAM 1.4.3 | tree-sitter-commonlisp 0.4.1
| mcp-lisp @ MCP protocol 2025-11-25 | Hunchentoot 1.3.1 (see distribution record).
UNKNOWN until install: exact transitive dep set and their pins — first `ocicl.csv`
lockfile from the day-one spike becomes the authoritative SOURCES line for those.

## SOURCES

- https://formulae.brew.sh/formula/sbcl ; https://www.sbcl.org/getting.html ; https://www.sbcl.org/platform-table.html
- https://github.com/ocicl/ocicl
- https://github.com/lispci/fiveam ; https://github.com/Shinmera/parachute (archived May 18, 2026 -> Codeberg) ; https://codeberg.org/shinmera/parachute (located via search; direct fetch 404'd on capitalization variants — cadence there UNKNOWN, verify at spike time) ; https://github.com/fukamachi/rove
- https://github.com/cxxxr/sblint
- https://github.com/hyotang666/trivial-formatter ; https://github.com/eschulte/lisp-format ; https://github.com/atgreen/rewrite-cl (all surfaced via search this session)
- https://github.com/theHamsta/tree-sitter-commonlisp
- https://github.com/jsulmont/mcp-lisp ; https://github.com/40ants/mcp
- https://github.com/nobody-famous/alive
- /Users/jrg/madewell-meta/runtime/lisp-agent/agent.lisp (read) ; /Users/jrg/madewell-meta/runtime/CONSTELLATION-V6-CONVERGENCE.md section 4 (read)
- Command run: `which sbcl` -> not found (nothing installed this session)
