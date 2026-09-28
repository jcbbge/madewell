# Task — 2026-07-22: v6 pre-flight research & discussion (before any code)

**Type:** research + discussion + brainstorm. NO code this session unless a spike is explicitly agreed.
**Stance:** agent runs as Markarian-in-prose (concierge) — Discovery mode until each topic is named,
then facilitate. The operator (jrg) must understand every mechanism inside-out: he will teach it,
live-stream building it, and defend the design decisions on air. Depth over speed. Nothing hand-wavy.
**Parent plan:** `./CONSTELLATION-V6-CONVERGENCE.md`. **Prior facts:** `./the-runtime-convergence.html`,
`~/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md`, `TAXONOMY.md`.

**Hard rule for this whole thread (the operator's words):** "I don't want the agent to guess, make
shit up, or assume. We have the source code." Every claim about Lisp, its API, its tooling, or the
ecosystem must be grounded in acquired material this session (fetched docs, read source, run
command). No plausible values. This is Made Well's own epistemics law applied to the build.

---

## Topic 0 (GATING — verify FIRST) — Is Constellation-Lisp a distributable program a non-Lisp user can run in a terminal AND a browser?

**Why this is first:** the entire Lisp direction rests on an assumption never explicitly verified. If
the answer is "no" for a target the operator requires, it reshapes or invalidates the vehicle choice.
Verify before spending the session on conceptual architecture (Topics 1–4).

**The requirement (operator, verbatim intent):** Constellation-Lisp must be a distributable program an
ordinary user downloads and runs — like any CLI tool, or a native Mac/Windows app, or in a web browser.
**The user never knows it's Lisp.** They don't type Lisp, don't learn Lisp syntax, don't know Lisp
exists. It is an agnostic agent environment: they use it (with the model as the brain) to work on
their OWN projects in JS/TS/Python/Rust/whatever. Lisp is purely the implementation language of the
tool — invisible to the user, exactly as Ruby is invisible to someone using a Ruby CLI, or C is
invisible to someone using git.

**Verified this session (2026-07-21), from `./the-runtime-convergence.html`:**
- CLI/native leg is STRONG: SBCL produces a **12 MB compressed single binary, ~50 ms startup**;
  maintained SBCL Docker images exist. This is a better ops surface than the Node/Bun lineage.
- Caveat, stated in the essay: **"no cross-compilation — build per platform."** You compile the
  binary ON each target OS/arch (or in CI matrix runners), not once for all.
- The essay says **NOTHING about the browser.** That leg is entirely unverified.

**What to verify next session (each grounded — fetch/read/probe, no assuming):**
1. **Terminal / native (expected: YES).** Confirm `sb-ext:save-lisp-and-die :executable t` produces a
   standalone binary with no runtime install required by the end user (the SBCL runtime is baked in).
   Confirm the distribution model: per-platform binaries built in CI (mac-arm64, mac-x64, linux-x64,
   windows-x64) — the same matrix any Go/Rust/Zig project ships. This makes it identical, from the
   user's view, to downloading any compiled CLI. VERIFY: SBCL platform support list (does it target
   Windows natively? Apple Silicon?), binary size with our deps linked, startup time with the image
   loaded.
2. **Browser (OPEN — the real question).** Two distinct sub-questions, don't conflate:
   - **(a) Lisp-in-the-browser (client-side):** Can SBCL compile to WASM? Provisional answer to verify:
     SBCL does NOT target WASM today. Alternatives to research: (i) other CL impls with WASM stories,
     (ii) a WASM-friendly Lisp/Scheme, (iii) reframe the question —
   - **(b) Browser as a THIN CLIENT to a server-side Lisp (recommended framing to test):** the
     Constellation-Lisp binary runs as a local (or remote) server; the browser is just a UI over
     HTTP/SSE/WebSocket. The user opens a web app; Lisp runs behind it; the user never touches Lisp
     OR a terminal. This is almost certainly the right architecture (it also matches the v5 spine's
     `--serve` mode and the whole telemetry-drives-the-visual vision) and it sidesteps WASM entirely.
     VERIFY: CL HTTP/WebSocket server story (dexador is a client; need a SERVER — research hunchentoot,
     woo, clack/lack, or the `--serve` broadcast already in constellation-zg). Confirm SSE/WebSocket
     for the live token/telemetry stream.
3. **Zero-Lisp-exposure invariant.** Confirm the UX contract at every distribution mode: terminal
   users type natural language (or their own code); browser users click a web UI; NO ONE sees a
   Lisp REPL, parens, or `.lisp` files unless they go looking. The Lisp REPL-over-MCP (Topic 4) is a
   DEVELOPMENT tool for US building v6 — it is NOT part of the shipped user surface. Keep that wall clear.

**Deliverable:** a distribution decision record: (1) terminal = per-platform native binary via
save-lisp-and-die + CI matrix (confirm feasible); (2) browser = thin client over a server-side Lisp
binary (confirm the CL server + WS/SSE stack), NOT WASM, unless WASM research surprises us; (3) the
zero-Lisp-exposure UX invariant written down. If any leg fails a hard operator requirement, escalate
before proceeding to Topic 1.

---

## Topic 1 — Harness vs Runtime vs Network: pin the semantics, then the two-level abstraction

**The operator's need (verbatim intent):** Confirm this is a true *constellation network*. There must
be (a) a singular agent harness that runs inside an agent *runtime* — you can spawn ONE agent and work
with it directly, like launching Claude Code or Pi; AND (b) an abstraction level ABOVE that — a runtime
that coordinates MANY agents. The known wall he hit in the Zig version: building from scratch, he
realized he needed those two distinctions and they kept blurring. Sometimes harness and runtime feel
like the same thing, sometimes different — we need to define both precisely and differentiate them.

**The desired shape (lean, not locked):** coordinator → orchestrator(s) → agent(s)/subagent(s).
A coordinator per domain (software, marketing, sales…); each coordinator spins up one or many
orchestrators; each orchestrator spins up one or many agents/subagents. The flexibility he wants:
a single agent I can talk to, that can **flip context** to become an orchestrator, or flip again to
become a coordinator. Fractal. All of it coordinated through Constellation via stigmergic coordination.

**What to resolve this session:**
- Define, in plain teachable language: **Harness** (Level 0 substrate — spine/session/loop/lifecycle,
  per TAXONOMY.md) vs **Runtime** (what actually executes and hosts a harness instance) vs **Network**
  (the coordinated field of many running harnesses talking via the Nebula). Where do they overlap,
  where are they genuinely distinct? Give the operator a one-sentence definition of each he can say on
  stream.
- Reconcile with the existing fractal: `Arc→Star→Constellation→Galaxy→Cosmos` (TAXONOMY.md) says
  `X = Harness<Y>`. Question to answer: is "coordinator/orchestrator/agent" a NEW axis, or is it the
  same fractal renamed (coordinator=Galaxy/Constellation, orchestrator=Constellation, agent=Star)?
  Decide whether we keep the celestial names, adopt coordinator/orchestrator/agent, or map between them.
- The "flip a switch" requirement: what does context-flip mean mechanically? Same process re-binding
  its role, or spawning a child harness at a higher level? (Lisp angle: a running image redefining its
  own role is native — the same recursion `harness(level, orchestrates, state)` called with a different
  `level`. This may be the cleanest answer, but VERIFY against the isolation mandate — a coordinator and
  the agents it supervises should be separate OS processes for fault isolation.)
- **Single-agent mode must be first-class**, not a degenerate case of the fleet. Confirm: the same
  harness binary, launched alone, IS a usable coding agent (the lisp-agent proves ~100 lines does this).
  The network is that same harness, recursively, coordinating instances of itself.

**Deliverable:** a short definitions doc + one diagram (canvas) showing single-agent → orchestrator →
coordinator as the SAME harness at three fractal levels, with the process/isolation boundaries drawn.

---

## Topic 2 — "Understand it inside-out before running code" (the teaching/streaming constraint)

**The need:** the operator will explain and teach this while building it live. He must know exactly what
is happening, top to bottom, and be able to discuss design decisions on air. This is a first-class
requirement, not a nicety — it shapes HOW we build (small, legible, narratable steps).

**What to resolve:**
- Establish the walkthrough discipline: before any slice is built, produce a plain-language "what
  happens and why" that the operator confirms he could teach. If he can't explain it, we haven't
  designed it clearly enough yet (this is itself a Made Well contact point — comprehension as a
  phase-advance condition).
- Decide the narration format for streams: annotated REPL sessions? a running "director's commentary"
  doc per slice? The spine helps here — a live telemetry stream IS a narratable surface (v5 VISION's
  "narrative arc" / organism model). Even pre-visualizer, the raw event stream can be read aloud.
- Confirm the dogfood loop makes the operator the reviewer at every pause (Made Well cooperative pause
  = the teaching beat). He's in the loop by design here, not as overhead.

**Deliverable:** a "comprehension-gate" note added to the build protocol: no slice advances Plan→Make
until the operator can restate it in his own words.

---

## Topic 3 — Ingest the Lisp source into code intelligence (no guessing about the language)

**The need (verbatim):** Download the Lisp source code to `~/source`, map/define/dictionary/lookup it so
the agent never guesses about Lisp — its API, how to run it, how it works. Use KotaDB (the operator said
"CodaDB" — confirmed as KotaDB, the MCP code-intelligence server in the stack) to ingest and map it.
**If KotaDB doesn't support Lisp, figure out a way — build our own mapping/dictionary tool if we must,
but that comes FIRST, before any v6 code.**

**Verified this session (2026-07-21):**
- No Lisp toolchain installed: `which sbcl ecl ccl clisp ros ocicl` all empty; no brew lisp packages.
- `~/source` exists (ai-octet-stream, coraline, gepa, hyperframes, solid, surrealdb, surrealdb-docs,
  zig) — no lisp yet.
- **KotaDB (`~/kotadb`)**: `index_repository` accepts `localPath` + a `language` filter, but the code's
  language enum shows go/python/rust (schema.sql). No lisp/scheme/commonlisp found in its parser deps
  (`@typescript-eslint/parser`, swagger-parser). **Provisional: KotaDB does NOT parse Lisp.** VERIFY
  next session by reading `~/kotadb/app/src/mcp/tools.ts` around the parser/index path + get_index_statistics.
- **Coraline (`~/.cargo/bin/coraline` v0.8.3)**: tree-sitter grammars found in the binary =
  {c_sharp, cpp, elm, scala} only (string scan — may be incomplete, but no commonlisp/scheme symbols
  surfaced). **Provisional: Coraline does NOT parse Lisp either.** VERIFY by `coraline` docs / a probe
  index on a tiny .lisp file.

**What to resolve / do (in order):**
1. **Pick which "Lisp source" we actually want mapped.** Candidates, decide with the operator:
   - **SBCL** (the chosen implementation per the convergence verdict) — its own source is C + Lisp;
     the teachable/lookup-worthy part is the Common Lisp standard library + SBCL extensions.
   - The **HyperSpec / ANSI CL standard** (the API surface — this is what "the API for Lisp" means).
   - The **key libraries** we'll actually depend on: `cl-completions`, `dexador`, `shasht`, `ocicl`,
     the MCP servers (`40ants/mcp`, `jsulmont/mcp-lisp`). These are what the agent will call — mapping
     THESE is higher-value than mapping SBCL internals.
   - Recommendation to discuss: map the HyperSpec (API truth) + the handful of dependency libs (call
     truth). SBCL internals only if we go deep on the runtime itself.
2. **Confirm tool support empirically** (read tools.ts; probe coraline on a .lisp fixture).
3. **If neither supports Lisp** (likely): evaluate, in preference order (operator's rule — reuse before
   build):
   - **tree-sitter-commonlisp** exists (official-ish grammar) — the fastest path to an AST/symbol map.
     Check: does KotaDB/Coraline accept a pluggable tree-sitter grammar? If Coraline is tree-sitter-
     based (it is), adding a grammar may be a config/rebuild, not a new tool.
   - SBCL's own introspection: `(describe)`, `(apropos)`, `documentation`, `swank`/`sly` symbol data —
     Lisp is uniquely self-describing; a "dictionary" can be *generated from the live image* rather than
     parsed from text. This is the on-axis move (the language maps itself).
   - Last resort: build a small mapper (Rust/Go/Zig, or Lisp itself) that walks packages/symbols and
     emits KotaDB-ingestible records. Prefer Lisp-native (it's homoiconic — reading Lisp with Lisp is
     trivial) unless speed demands otherwise.

**Deliverable:** Lisp source acquired in `~/source`; a working symbol/API lookup the agent can query;
a decision record on which tool/approach maps it (existing vs pluggable grammar vs generated-from-image
vs custom). This gate closes before any v6 slice.

---

## Topic 4 — Local Lisp dev environment & tooling (survey the ecosystem before building)

**The need (verbatim):** the operator doesn't know Lisp or its tooling. Unsure if we can use TypeScript
runners or need Go/Rust utilities for ASTs/runners/checkers. Willing to build our own library/package in
a fast language (Rust/Go/Zig) — but ONLY as a last resort. First: survey what the Lisp community already
has. Don't reinvent wheels.

**What to resolve (survey first, decide second — every finding grounded, fetched this session):**
- **Implementation + toolchain:** confirm SBCL as the impl (convergence verdict picked it for the
  condition system + live image). Install path (brew? official?). Confirm `ocicl` (not Quicklisp) as
  the package manager (per verdict, day-one). Version-pin everything with a SOURCES line.
- **Editor/REPL:** the verdict flags the DX tax — first-class Lisp editing = Emacs + SLIME/Sly; the
  VS Code (Alive) and JetBrains plugins are pre-MVP/experimental. Decide the operator's editing surface
  (he may not want Emacs). Critically: the convergence verdict's day-one fix = **a CL REPL wired into
  THIS coding harness via MCP** — that's both the DX answer AND a prototype of the runtime's own thesis.
  Investigate `40ants/mcp` / `jsulmont/mcp-lisp` (44/44 conformance per verdict) as the REPL-over-MCP.
- **The "runner/checker/AST" question:** map each need to an existing tool before considering custom:
  - AST / parse: tree-sitter-commonlisp OR `(read)` in the image (Lisp reads Lisp natively).
  - Test runner: FiveAM / Parachute / Rove (survey; pick one).
  - Linter/checker: SBCL's own compiler warnings are strong (it type-infers and warns at compile time);
    plus `sblint`. Likely no custom checker needed — the compiler IS the checker.
  - Formatter: `cl-indent` / lisp-format / the editor's built-in. Survey.
  - Build/deps: ocicl + asdf (system definition). Confirm.
- **TS runners?** Answer the operator's direct question: can existing TS tooling help? Mostly no for
  Lisp itself — but the harness that DRIVES development (this one) is TS/Pi, and the MCP bridge is the
  seam. Clarify the boundary: TS/Pi is the outer development harness; SBCL is the thing being built and
  the thing that runs. Don't conflate.
- Only after the survey: list any genuine gaps that would justify a custom Rust/Go/Zig utility, with
  the reason each existing option failed. Default expectation: few or none — Lisp's self-hosting +
  compiler warnings + tree-sitter cover most of it.

**Deliverable:** a grounded environment setup doc (impl, pkg mgr, REPL-over-MCP, test/lint/format,
each with a source), + a short "build-our-own?" list (expected: empty or tiny).

---

## Session order (suggested)
1. **Topic 0 FIRST** — it's gating. A "no" on a required distribution leg reshapes the vehicle choice,
   so verify distributability (terminal + browser, zero Lisp exposure) before conceptual work.
2. Topic 3 + 4 setup gates next in spirit (they unblock everything) BUT they're research this session,
   not installs — decide, don't execute, unless the operator wants a spike.
3. Topic 1 is the big conceptual one — likely the heart of the discussion. Budget the most time here.
4. Topic 2 is a discipline we adopt, woven through 0/1/3/4.
5. Close with: confirmed decisions → update `CONSTELLATION-V6-CONVERGENCE.md` §6 next-actions; open
   questions carried; what (if anything) gets a spike.

## Carried open questions from the convergence plan (still live)
- Public repo name: keep "Constellation" with Made Well cited as the grammar it hosts?
- First slice: grounding (thesis) vs escalate/resume (most viscerally un-TypeScript)?
- How much celestial namespace goes live day one vs. arrives as the fractal grows?

## Do NOT do this session
- No installs, no repo creation, no Lisp code — unless a specific spike is explicitly agreed mid-session.
- No unsourced claims about Lisp/tooling/ecosystem. Fetch or read first, then state.
