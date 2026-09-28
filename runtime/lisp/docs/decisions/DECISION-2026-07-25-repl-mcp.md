# Decision Record — 2026-07-25: REPL-over-MCP (jsulmont/mcp-lisp)

**Verdict: GO on `jsulmont/mcp-lisp`, conditional on two mandatory mitigations and one
new system prerequisite.** It was cloned, built, and driven through a real MCP stdio
handshake this session; a Common Lisp form was evaluated in a live SBCL image through an
MCP `tools/call` and the value came back. Verbatim output below.

**Status:** decision record. Three of the seven numbers carried forward from
`ENV-2026-07-22-lisp-tooling.md` are wrong, and two defects that the 2026-07-22 survey
could not have seen — because nothing was installed — are load-bearing. The GO is real
but it is not free.

**Question:** Is `jsulmont/mcp-lisp` a thing we can build the CL-REPL-into-this-harness
bridge on, today? The 2026-07-22 survey recommended it having read only its README. That
is a bookmark, not a decision. This record converts it.

---

## Claimed (2026-07-22) versus observed (2026-07-25)

Every "observed" cell is from a fetch or a command run this session; the producing source
is named in SOURCES.

| # | Claim (`ENV-2026-07-22-lisp-tooling.md:21`) | Observed 2026-07-25 | Verdict |
|---|---|---|---|
| 1 | MCP protocol `2025-11-25` | `2025-11-25` — `src/core.lisp:16` `+protocol-version+`, and echoed live in the `initialize` result | **CONFIRMED** |
| 2 | 44/44 conformance checks (32 scenarios) | README:5 still asserts it. **NOT verified by me** — I did not run `@modelcontextprotocol/conformance`. Status: UNKNOWN, claim unreproduced. | **UNVERIFIED** |
| 3 | stdio + SSE (SSE via Woo) | Both transports present; `run-server :transport` accepts `:stdio` / `:sse` (`src/server/server.lisp:254-263`). stdio exercised end-to-end this session; SSE not exercised. | **CONFIRMED (stdio proven, SSE present-not-proven)** |
| 4 | 438 unit tests | Suite runs green, but the number is wrong in both directions: **468** test definitions across 25 files, **2975** FiveAM checks, Pass 2975 (100%), Fail 0. README:334 still says "438 unit tests" — the README undercounts its own suite. | **REFUTED (understated; suite is green)** |
| 5 | MIT/Apache-2.0 dual license | **There is no license file in the repository.** `find` repo-wide for `*licen*`/`COPYING*` = zero hits; GitHub API `.license` = `null`. README:340 says "Dual-licensed under MIT OR Apache-2.0"; `mcp-lisp.asd:7` says `:license "MIT"`. The dual-license claim is one README sentence, contradicted by the `.asd`, with no license text behind either. | **REFUTED as stated** |
| 6 | 7 stars | 7 | **CONFIRMED** |
| 7 | 1 fork | 1 | **CONFIRMED** |

Liveness, which the survey did not record at all:

| Property | Observed 2026-07-25 |
|---|---|
| HEAD | `ca7f66e`, authored 2026-06-30T15:11:48+02:00, "feat(agent): defer-only tool-search option, robust stop reasons, REPL-friendly example" |
| Commits | 167 |
| Created | 2026-01-07 |
| Open issues | 1 — #2 "Offer: Free trust verification for mcp-lisp" (solicitation, not a bug) |
| Archived / disabled | no / no |
| Builds | yes, under SBCL 2.6.6 + ocicl 2.17.0, once libev is present (below) |

**Nothing in the library changed between the 2026-07-22 research and today** — HEAD
predates that research by three weeks. Every discrepancy above was present on 2026-07-22
and was missed because the survey read the README instead of the repository.

---

## The three findings that cost something

### 1. An unconditional native dependency: libev. It blocks the build outright.

`mcp-lisp.asd:13` lists `woo` unconditionally, so *any* consumer — including a
stdio-only bridge that will never serve HTTP — loads `woo` → `lev` → `libev`. On a
machine without it, `asdf:load-system "mcp-lisp"` does not degrade, it fails:

```
LOAD-FAILED: Unable to load any of the alternatives:
   ("libev.4.dylib" "libev.dylib")
```

`libev` was not installed on this machine (`brew list libev` → `Error: No such keg`). I
installed it (`brew install libev` → libev 4.33, `/opt/homebrew/lib/libev.4.dylib`) and
the load then succeeded. **This is a system-level prerequisite, installed outside the
worktree, and it is now a fact about our build environment that was not in
`ENV-2026-07-22-lisp-tooling.md`.**

This bears directly on `DECISION-2026-07-22-distribution.md`, which prefers Hunchentoot
as the boring default with **Woo optional** (that record, line 148). mcp-lisp makes Woo
mandatory. Consequence: a native C shared library enters the dependency set of every
build and every shipped per-platform binary, for a transport we do not need. Options if
that is unacceptable: patch the `.asd` to make the SSE transport a secondary system
(small, local, and we have the source), or vendor the stdio transport only.

### 2. Loading the library registers 11 tools we never asked for, including `shell`.

`main.lisp:188` imports from `mcp-lisp/src/agent/tools`. Because this is a
`:package-inferred-system`, that import *loads* `src/agent/tools.lisp`, whose top-level
`define-tool` forms register into `*global-tool-registry*`. `run-server` with no explicit
registry serves that global registry (`server.lisp:264` → `effective-tool-registry`,
`server.lisp:96-97`). Net effect: a server that defines exactly one tool of its own
advertised **twelve**.

The eleven inherited tools, verbatim from the `tools/list` result of the unmitigated run:
`eval_lisp`, `clear_repl`, `shell`, `read_file`, `write_file`, `list_tools`,
`web_search`, `http_fetch`, `diff`, `grep_files`, `find_files`. Two of them —
`shell` ("Execute a shell command", `src/agent/tools.lisp:181`) and `write_file` —
are arbitrary host execution and arbitrary host writes, exposed by default, annotated
`destructiveHint: true`, to any client that connects.

This is not a vulnerability in the library — those tools are the point of its *agent*
SDK. It is a defect in the *default* for anyone using it as a *server* SDK: the tool
surface is opt-out, not opt-in, and the opt-out is not public API (below).

### 3. The stdio transport writes non-JSON to stdout — and the library's own helper for this makes it worse.

MCP stdio is newline-delimited JSON on stdout. log4cl's console appender writes there
too. Unmitigated, the server's first stdout lines are ` <INFO> ... MCP server starting`.

The library ships `setup-file-logging` for exactly this, and the examples call it
(`examples/echo-server.lisp:77`). **It does not work.** `src/transport/mcp-stdio.lisp:40-45`
adds a daily file appender and then calls `(log:config :sane2)`, which re-establishes
console logging, and then sets level `:debug`. Measured: with `setup-file-logging` in
place, **13 of 20 stdout lines were not JSON** — strictly worse than doing nothing,
because it promotes every request to a DEBUG line on the wire.

**Both defects are mitigable, in two lines, and I verified the mitigation.** The fix is:

```lisp
(log4cl:clear-logging-configuration)   ; NOT setup-file-logging — see above
(funcall (find-symbol "CLEAR-TOOLS" "MCP-LISP/SRC/PRIMITIVES/TOOLS/REGISTRY"))
```

Note the second line: `clear-tools` exists (`src/primitives/tools/registry.lisp:90`) but
is **not exported** from `mcp-lisp/main`, so scoping our own tool surface requires
reaching into an internal package. That is the kind of thing that breaks on an upgrade of
a 7-star, 1-fork library. It is a cost, not a blocker.

---

## The handshake (mitigated run) — verbatim

Probe: `constellation-repl-probe3.lisp` in the session scratchpad (outside every
constellation tree), loaded via ocicl/ASDF — no Quicklisp, despite README:9 requiring it.
It defines one tool, `lisp-eval`, that `eval`s a form in the live image; it applies the
two mitigations above; it serves `:stdio`. Four frames were piped in on stdin:
`initialize`, `notifications/initialized`, `tools/list`, `tools/call lisp-eval`, plus a
fifth probing for the `shell` tool. Command:

```
sbcl --noinform --non-interactive --load constellation-repl-probe3.lisp \
     < h2-in.jsonl > h3-out.jsonl 2> h3-err.txt      # exit 0
```

Complete stdout, all 4 lines, every line valid JSON (audited line-by-line with
`json.loads`; `total_lines=4 non_json=0`):

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","serverInfo":{"name":"constellation-repl-probe2","version":"0.0.1"},"capabilities":{"tools":{"listChanged":true},"prompts":{"listChanged":true},"resources":{"listChanged":true,"subscribe":true},"completions":{},"logging":{}}}}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"lisp_eval","description":"Evaluate a Common Lisp form in the live image and return its printed value.","inputSchema":{"type":"object","properties":{"form":{"type":"string","description":"A Common Lisp form to evaluate"}},"additionalProperties":false,"required":["form"]}}]}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"3"}]}}
{"jsonrpc":"2.0","id":4,"error":{"code":-32601,"message":"Tool not found: shell"}}
```

Read that in order: protocol negotiated at `2025-11-25`; the advertised tool surface is
exactly the one tool we defined; `(+ 1 2)` was evaluated **in the image** and returned
`3` through MCP; and `shell` is gone, `-32601`, proving the mitigation holds.

From the earlier unmitigated run, the same round-trip carrying real image truth —
`(list (lisp-implementation-type) (lisp-implementation-version) (* 6 7))`:

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"(\"SBCL\" \"2.6.6\" 42)"}]}}
```

That is the seam the convergence plan wants, working: the harness asks, the live image
answers, and the answer is the image's own truth about itself.

---

## The alternate, verified rather than assumed: 40ants/mcp

Required by the brief and checked today: 54 stars, 9 forks, 1 open issue, created
2025-06-16, **last commit `fd42f90` 2026-02-15 ("Update docs") — five months stale.** Not
archived. It has more stars and more forks than mcp-lisp, so the bus-factor comparison
the survey drew is not one-sided; but it has no commit in five months, and **it too has
no license file** at root (GitHub API `.license` = `null`, despite the survey's
"Unlicense"). Its own README self-describes as early ("the interface is likely to
change", per the 2026-07-22 survey's quote, which I did not re-verify).

Verdict on the alternate: **keep as fallback, do not switch.** mcp-lisp is
committed-to-this-month, ours-to-read, and proven working on stdio here today. 40ants/mcp
is quieter and unproven by us.

---

## What this GO commits us to

1. **`libev` becomes a documented system prerequisite** for building constellation, on
   every dev machine and every CI runner — or we patch the `.asd` to make Woo/SSE a
   secondary system. Recommend the patch; it is small and it protects the
   single-binary story in `DECISION-2026-07-22-distribution.md`.
2. **Two mandatory lines in any bridge entrypoint** — `clear-logging-configuration` and
   the internal `clear-tools`. `setup-file-logging` must **not** be used; it is
   actively harmful on stdio. A test should assert "every stdout line parses as JSON",
   because this is exactly the failure that silently breaks a client.
3. **Reading the source is the mitigation for the bus factor.** 7 stars, 1 fork,
   58 transitive systems, and no license file. The license gap should be raised upstream
   as an issue (one open issue total, so the maintainer is reachable); until there is
   license text in the repo, treat redistribution as UNKNOWN and vendoring as a decision
   the operator must make, not one this record makes.
4. **44/44 conformance remains an unreproduced claim.** If conformance is load-bearing
   for us, running `@modelcontextprotocol/conformance` against
   `conformance-server.lisp` is the next verification, and it is cheap.

## Not done, deliberately

**`.mcp.json` was not committed, and the wiring step is deferred.** A `.mcp.json` is only
meaningful if it points at a server entrypoint that exists, and the entrypoint must live
in `src/` (or a new `bin/`) and be declared in `constellation.asd` — three paths this
package does not own, with four packages building against them in parallel. Committing a
`.mcp.json` pointing at a file that does not exist would put a broken config in the repo
and dress an unfinished integration as a finished one. The GO is the deliverable; the
wiring is a follow-on task for whoever owns `constellation.asd`, and it now has a proven
recipe (probe script and mitigations above) to implement against.

No `src/` file was touched (`git status --porcelain src/` → 0 lines). `make test` still
runs 20 tests and exits 0, confirmed by running it, not by assuming it.

---

## SOURCES

- `gh api repos/jsulmont/mcp-lisp` (run this session) — 7 stars, 1 fork, 1 open issue, `license: null`, created 2026-01-07, `pushed_at` 2026-06-30, not archived
- `gh api repos/jsulmont/mcp-lisp/commits?per_page=1` + `Link:` header — HEAD `ca7f66e` 2026-06-30, 167 commits (`git rev-list --count HEAD` on the clone agrees)
- `gh api repos/jsulmont/mcp-lisp/issues?state=all` — 4 issues, 1 open (#2, a solicitation)
- `gh api repos/40ants/mcp` and `.../commits?per_page=1` — 54 stars, 9 forks, `license: null`, HEAD `fd42f90` 2026-02-15
- `git clone https://github.com/jsulmont/mcp-lisp.git` → session scratchpad `.../scratchpad/mcp-lisp-eval` (outside `/Users/jrg/constellation-wt/` and `/Users/jrg/constellation`), HEAD `ca7f66e`
- Files read in that clone: `mcp-lisp.asd:3-56`; `src/core.lisp:16`; `src/server/server.lisp:88-97,254-263`; `src/transport/mcp-stdio.lisp:40-45`; `src/agent/tools.lisp:102,181`; `src/primitives/tools/registry.lisp:41-90`; `main.lisp:121,188,425`; `README.md:5,9,54,334,340`; `examples/echo-server.lisp:77`; `Makefile`; `.mcp.json`
- `find` repo-wide for `*licen*` / `COPYING*` → **zero hits**; `grep -rhoE '^\(test |^\(def-test ' tests/*.lisp | wc -l` → 468 across 25 files
- Test run: `asdf:load-system "mcp-lisp/tests"` + `MCP-LISP/TESTS::RUN-TESTS` → `Did 2975 checks. Pass: 2975 (100%) Skip: 0 Fail: 0`
- Build: `asdf:load-system "mcp-lisp"` — FAILED on `("libev.4.dylib" "libev.dylib")`; `brew list libev` → "No such keg"; `brew install libev` → libev 4.33 at `/opt/homebrew/lib/libev.4.dylib`; re-run → `LOAD-OK`. ocicl fetched 58 transitive systems (`ls ocicl | wc -l`), 122-line `ocicl.csv`
- Handshake probes (session scratchpad, throwaway): `constellation-repl-probe.lisp` (unmitigated — 12 tools advertised, `("SBCL" "2.6.6" 42)` round-trip), `constellation-repl-probe2.lisp` (`setup-file-logging` — 13/20 stdout lines non-JSON), `constellation-repl-probe3.lisp` (mitigated — 4/4 stdout lines JSON, `shell` → -32601). Inputs `h2-in.jsonl`, outputs `h3-out.jsonl`
- `sbcl --version` → SBCL 2.6.6; `ocicl version` → ocicl 2.17.0, ASDF 3.3.7, pure-tls 1.12.0
- This repo, read this session: `docs/decisions/ENV-2026-07-22-lisp-tooling.md:21-22,51-53` (the claims under test); `docs/decisions/DECISION-2026-07-22-distribution.md:135,148,152` (Woo-optional preference); `docs/decisions/DECISION-2026-07-22-code-intel.md` (house format for this record)
- Floor confirmed in this worktree: `make test` → `Running test suite CONSTELLATION`, 20 tests, exit 0; `git status --porcelain src/` → 0 lines
