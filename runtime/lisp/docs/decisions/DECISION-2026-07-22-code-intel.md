# Decision Record — 2026-07-22: Lisp code-intelligence ingest (Topic 3)

**Status:** research record. Recommendations only — final decisions are the operator's.
**Question:** Can KotaDB or Coraline map Lisp source so the agent never guesses about
the language? If not, what is the cheapest honest path?

## Verdicts (both grounded in source/commands this session)

### KotaDB: does NOT parse Lisp. CONFIRMED from source.

- `/Users/jrg/kotadb/app/src/indexer/parsers.ts:10-19` — `SUPPORTED_EXTENSIONS` is
  exactly `.ts .tsx .js .jsx .cjs .mjs .json .sql`. No `.lisp`, no `.asd`.
- `/Users/jrg/kotadb/app/src/indexer/ast-parser.ts:31` — AST parsing is
  `.ts .tsx .js .jsx .cjs .mjs` only.
- `/Users/jrg/kotadb/app/src/indexer/constants.ts:21-29` — same list (minus .json).
- `/Users/jrg/kotadb/app/src/mcp/tools.ts:160-162, 887, 922-923` — the `language`
  filter is a free-form string passed through to queries, not a capability declaration;
  `/Users/jrg/kotadb/app/src/db/schema.sql:130` stores `language` as plain `text`.
- Correction to the prior session's provisional note: there is no go/python/rust
  language enum gating the indexer; the real gate is the extension allowlists above.
  Either way the verdict stands: a `.lisp` file is never discovered or parsed.

### Coraline (v0.8.3): does NOT parse Lisp. CONFIRMED from source AND probe.

- Probe (commands run this session, scratch dir only): wrote a 6-form `fixture.lisp`
  (defpackage/defun/defclass) to the session scratchpad, ran `coraline init` +
  `coraline index` + `coraline stats` in that directory. Result: "Indexed 0 files,
  Created 0 nodes". Coraline silently skips `.lisp`.
- Source (`~/source/coraline`, read this session):
  - `/Users/jrg/source/coraline/src/types.rs:53-93` — `enum Language` lists 36 variants
    (TypeScript...Zig, Unknown); no Lisp, Scheme, or Racket.
  - `/Users/jrg/source/coraline/Cargo.toml:144-` — 35 `tree-sitter-*` grammar crates
    are compiled-in Cargo dependencies (bash, c, cpp, elixir, erlang, go, haskell,
    java, julia, lua, perl, php, powershell, ... zig). No commonlisp/scheme crate.
  - `grep -rni "lisp|scheme|racket"` over `src/` + `Cargo.toml`: zero relevant hits.
- Pluggability: grammars are static Rust crate dependencies baked into the binary —
  there is NO runtime-pluggable grammar mechanism. Adding Lisp = add the
  `tree-sitter-commonlisp` crate, extend `enum Language` + the extension mapping, and
  rebuild. A code change, but a small one, and we have the source locally.

## The grammar that would plug in: tree-sitter-commonlisp

https://github.com/theHamsta/tree-sitter-commonlisp (fetched): v0.4.1 (Mar 2025),
123 commits, 65 stars, part of the tree-sitter-grammars ecosystem, published as BOTH an
npm package and a Rust crate (also PyPI/Swift/Go bindings). Built by extending the
tree-sitter-clojure grammar; special handling for `defun` and `loop`; known TODO on
some CL number literals (e.g. `.9`). Maintained, real, and consumable from Coraline's
existing pattern with no new tooling.

## The three mapping options, ranked (recommendation, not decision)

**1. Generate the dictionary FROM THE LIVE IMAGE (recommended primary).**
Lisp is self-describing: `describe`, `apropos`, `documentation`, and package/symbol
walking (`do-external-symbols`) exist in the language itself, and the proof-of-concept
agent already runs on exactly this loop — `agent.lisp`'s only tool is `eval`
(`/Users/jrg/madewell-meta/runtime/lisp-agent/agent.lisp:45-63`). A ~50-line Lisp
script can walk every package in the image (CL standard library + SBCL extensions +
our deps once loaded) and emit records (JSON via shasht, already a dep of agent.lisp:16)
that KotaDB can ingest as documents, or that live behind a lookup tool. Why first: it is
API truth from the running system (no parser drift), it covers exactly what the agent
will call, and it is the on-axis move — the language maps itself. Cost: requires the
SBCL install (already the day-one setup step); UNKNOWN until then: nothing material.

**2. Add tree-sitter-commonlisp to Coraline (recommended secondary, for text-level
search over source we did not load).**
Rust crate exists (above); Coraline's grammar pattern is "one crate + one enum arm +
extension mapping"; we have Coraline's source at ~/source/coraline. This gives
file/symbol/reference indexing over `.lisp` source trees (our own repo, dependency
sources in ~/source) through the existing super-search layer 2. Cost: a fork-and-rebuild
of Coraline; upstreaming is optional. Do it when we actually have a v6 repo to index.

**3. KotaDB native Lisp support (do NOT build now).**
KotaDB's indexer is TS-AST-centric (typescript-eslint based per its parse path); adding
a whole language family there is the largest change for the least marginal value, since
option 1 can emit INTO KotaDB as records and option 2 covers text/AST search. Revisit
only if graph queries (find_usages/change-impact) over Lisp become load-bearing.

**"Build our own mapper" (task's last resort): not needed.** Option 1 IS the tiny
mapper, in Lisp, ~50 lines, using only what the image already provides.

## Which "Lisp source" to map — options for the operator (task item 1)

Candidates, with the research's read (decision is the operator's):
- **HyperSpec / ANSI CL standard** — the API truth of the language. Highest teach
  value. Note: the HyperSpec is HTML under a restrictive LispWorks license; mapping it
  as a lookup (not redistributing) is the normal community pattern. Option 1 partially
  substitutes: docstrings in the live image cover much of the same surface.
- **The dependency libs we will actually call** (dexador, shasht, cl-completions, the
  MCP server lib, ocicl/asdf) — call truth; highest day-to-day value; acquire to
  ~/source per convention and index via option 2.
- **SBCL internals** — lowest priority; only if we go deep on runtime hacking.
Recommended mix (matches the task file's own recommendation): live-image dictionary
(option 1) + dependency libs in ~/source (option 2). SBCL internals deferred.

## Gate status

This gate ("a working symbol/API lookup the agent can query") CANNOT close this
session: it requires installing SBCL and acquiring sources, both banned here. What
closed: the tool verdicts (KotaDB no, Coraline no), the ranked path, and the
ready-to-execute plan. Execution belongs to the day-one setup spike.

## SOURCES

- /Users/jrg/kotadb/app/src/indexer/parsers.ts:10-19; ast-parser.ts:31; constants.ts:21-29; mcp/tools.ts:160-162,887,922-923; db/schema.sql:130 — all read this session
- Commands run: `coraline --help`; `coraline init && coraline index && coraline stats` on a one-file .lisp fixture in the session scratchpad (Indexed 0 files); `grep` runs over ~/kotadb and ~/source/coraline as cited
- /Users/jrg/source/coraline/src/types.rs:53-93 (Language enum); /Users/jrg/source/coraline/Cargo.toml:144- (35 compiled-in tree-sitter crates)
- https://github.com/theHamsta/tree-sitter-commonlisp — v0.4.1 Mar 2025, Rust crate + npm, tree-sitter-grammars org
- /Users/jrg/madewell-meta/runtime/lisp-agent/agent.lisp:16,45-63 — shasht dep; eval-as-only-tool loop
- Scratch fixture (throwaway, non-repo): /private/tmp/claude-501/-Users-jrg-madewell-meta/75c7f34d-2589-4133-99b0-de47a48b5532/scratchpad/lisp-probe/fixture.lisp
