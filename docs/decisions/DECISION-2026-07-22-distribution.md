# Decision Record — 2026-07-22: Constellation-Lisp distribution (Topic 0, GATING)

**Status:** research record. Recommendations only — final decisions are the operator's.
**Question:** Is Constellation-Lisp a distributable program a non-Lisp user can run in a
terminal AND a browser, with zero Lisp exposure?

## GATE VERDICT: PASS — decided by the operator 2026-07-22

**Operator decision (verbatim intent):** executable runtime first. CLI-only for now;
the browser arrives later as a thin client on top of the running Lisp binary (via a
`--serve` broadcast mode for the spine telemetry). No Lisp execution inside the
browser — client-side WASM is off the table. "Let's not focus on a browser as a
window right now. Let's just focus on the Lisp process."

Consequences: the terminal/native leg below is the active distribution target; the
thin-client architecture in §2b is confirmed as the future browser shape (not a
current work item); §2a (client-side WASM) is closed NO and will not be revisited
unless the ecosystem changes.

Original research verdict before the decision: PASS-WITH-CAVEATS —

- **Terminal/native leg: PASS.** Standalone per-platform binaries via
  `sb-ext:save-lisp-and-die :executable t`, built in a CI matrix, confirmed feasible
  from SBCL source and platform table (details below).
- **Browser leg: PASS-WITH-CAVEATS.** Client-side Lisp (WASM) is NOT viable with SBCL
  today. The thin-client architecture (browser as UI over a server-side Lisp binary via
  HTTP/WS/SSE) IS viable on a verified CL server stack — but it is a recommendation that
  needs the operator's confirmation, and the strongest server pieces carry maturity
  caveats (Woo self-describes as BETA; websocket-driver is small).

No hard "no" on a required leg was found, so no escalation alert was raised. The one
sub-question that fails (SBCL-to-WASM) is not required under the recommended framing.

---

## 1. Terminal / native leg (expected YES — confirmed YES)

### 1a. Does `:executable t` produce a standalone, no-runtime-install binary? YES.

The `save-lisp-and-die` docstring in SBCL's own source says of `:executable`:

> "If true, arrange to combine the SBCL runtime and the core image to create a
> standalone executable. If false (the default), the core image will not be
> executable on its own."

Source: `https://raw.githubusercontent.com/sbcl/sbcl/master/src/code/save.lisp` (fetched
this session). The end user downloads one file; the SBCL runtime is baked in. Note the
default is `nil` — you must pass `:executable t` (the sbcl.org manual-page summary
suggesting "true (the default)" was contradicted by the source docstring; source wins).

`:compression` (zstd levels -7 to 22, default level 9 when `t`) is available if the
runtime was built with `:sb-core-compression` — same docstring.

### 1b. Platform support: Windows native? Apple Silicon? YES and YES.

From the SBCL platform table (https://www.sbcl.org/platform-table.html, fetched):

| Target | Status |
|---|---|
| Linux x86-64 | Available and supported, 2.6.6 (newest) |
| Windows x86-64 | Available and supported, natively, 2.6.6 (newest) |
| macOS ARM64 (Apple Silicon) | Available and supported; table shows 2.4.0 binary |
| macOS x86-64 | Supported (binaries listed on the same table) |

Caveat: the macOS ARM64 prebuilt binary on the table lags (2.4.0 vs 2.6.6) — but
Homebrew ships SBCL 2.6.6 with ARM64 bottles (https://formulae.brew.sh/formula/sbcl,
fetched), so current versions on Apple Silicon are a solved problem for CI and dev.

### 1c. Per-platform CI matrix feasibility (no cross-compilation)? YES, matrix required.

- SBCL's INSTALL (https://raw.githubusercontent.com/sbcl/sbcl/master/INSTALL, fetched)
  describes the standard build as running ON the target platform using a host Common
  Lisp ("build SBCL using an already installed SBCL" via `sh make.sh`). The `--xc-host`
  flag selects which host Lisp bootstraps the build; no supported "build once on one
  OS/arch, emit binaries for all others" distribution flow was found this session.
- sbcl.org/getting.html (fetched) confirms official binaries are per-platform tarballs.
- Consequence: ship binaries the way Go/Rust/Zig projects effectively do in practice —
  a CI matrix with one runner per target (mac-arm64, mac-x64, linux-x64, windows-x64),
  each running `save-lisp-and-die :executable t`. GitHub Actions provides all four
  runner types; this is the same matrix constellation-adjacent projects already use.
  Confirmed feasible; no exotic infrastructure needed.

### 1d. Realistic binary size and startup with an image loaded

Measured-by-others (fetched sources), not measured by us (no SBCL installed, installs
banned this session):

- A vanilla SBCL core of ~43 MB compresses to ~9 MB; compression cost "about a dozen
  milliseconds of start-up time, which is still under 50ms"
  (https://xach.livejournal.com/295584.html via search; corroborated by
  https://lispcookbook.github.io/cl-cookbook/scripting.html and
  https://github.com/lisp-tips/lisp-tips/issues/20, which cites the Nyxt browser at
  23 MB compressed vs 120 MB uncompressed).
- The prior essay's figures (12 MB compressed single binary, ~50 ms startup, from
  `./the-runtime-convergence.html`, verified 2026-07-21) sit inside this envelope.
- **Exact size/startup with OUR deps linked: UNKNOWN until first build.** Resolving it
  requires installing SBCL and building the actual image — first measurable in the
  day-one setup spike.

**Recommendation (not decision):** terminal distribution = per-platform native binary
via `save-lisp-and-die :executable t` + zstd core compression + 4-target CI matrix.

---

## 2. Browser leg (the open question — answered in two parts)

### 2a. Client-side: does SBCL target WASM today? NO.

- WASM/WASI does not appear anywhere in SBCL's platform table (fetched, see 1b).
- No official SBCL WASM port surfaced in searches this session; the Arboreta project
  (https://github.com/Arboreta/arboreta-wasm) lists SBCL-code compatibility as a far
  future goal.
- Nearest real CL-on-WASM story is ECL: a developer compiles arbitrary ASDF systems to
  WASM and links against libecl.a, but sockets and threads DO NOT work in the browser
  (https://gitlab.com/embeddable-common-lisp/ecl/-/issues/740, fetched; filed May 2024;
  turtleware's WECL work continues in this direction per 2025 posts surfaced in search).
  An agent runtime without sockets or threads is a non-starter for v6's needs.
- Real WASM-native Lisp exists but is Scheme, not CL: Spritely Hoot compiles R7RS-small
  Scheme + a Guile subset to WASM and runs in Firefox 121+/Chrome 119+/Safari 26+/Node
  22+ today, v0.9.0 (https://spritely.institute/hoot/, fetched). Adopting it would mean
  abandoning SBCL's condition system/live image — off-axis for v6.

**Answer: client-side Lisp in the browser is not a viable leg for Constellation-Lisp
today. Do not build on it.**

### 2b. Thin client: browser as UI over a server-side Lisp binary. VIABLE.

The same Constellation binary from leg 1 runs as a local (or remote) server; the
browser is plain HTML/JS speaking HTTP/WebSocket/SSE. The user opens a web page; Lisp
runs behind it. Verified CL server stack (all fetched from their repos this session):

| Piece | What | Status (fetched) |
|---|---|---|
| Hunchentoot | HTTP server + web toolkit, HTTP/1.1 chunking, persistent connections, SSL | v1.3.1 (Apr 2024), 744 stars, actively maintained, BSD-style license. No native WS/SSE, but SSE is plain chunked HTTP, which it supports. |
| Woo | libev-based non-blocking HTTP server, "fastest web server" benchmarks | 1.4k stars, MIT — but README says BETA quality. Notably: jsulmont/mcp-lisp already uses Woo for its SSE transport (see its repo), so it is in real use for exactly our pattern. |
| Clack/Lack | Rack/WSGI-style abstraction over Hunchentoot/Woo/others | 1.1k stars, MIT, Fukamachi. Lets us swap servers behind one app interface. |
| websocket-driver | WebSocket SERVER and client for CL; backends: Hunchentoot, Wookie, Woo | 112 stars, BSD-2-Clause, Fukamachi. Event-driven (:open/:message/:error/:close). Small but purpose-built. |

Also on-axis: constellation-zg's v5 spine already has this shape — `broadcast.zig`
emits NDJSON and has a "`--serve` mode for live preview"
(`/Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:103`). The thin-client
browser leg is the v6 form of an existing v5 mode, not a new invention. It also matches
the telemetry-drives-the-visual vision: the live token/telemetry stream flows over
SSE/WS to whatever skin renders it.

**Recommended browser architecture (recommendation, NOT decision — needs operator
confirmation):** Constellation binary with a `--serve` mode; Clack app layer so the
server backend stays swappable (start Hunchentoot for boring reliability; Woo optional
where throughput matters); SSE for the one-way telemetry/token stream; websocket-driver
where bidirectional control is needed. No WASM anywhere.

Caveats attached to the PASS: Woo is self-described BETA; websocket-driver is small
(112 stars) and its recent-commit cadence was not visible in the fetched page (UNKNOWN;
resolve by checking its commit log when the toolchain spike happens). Hunchentoot alone
+ SSE covers the MVP if the WS pieces disappoint.

---

## 3. The zero-Lisp-exposure invariant (written down, per Topic 0 item 3)

**Invariant:** At every distribution mode, the user never sees Lisp. Terminal users
type natural language or their own project's code (JS/TS/Python/Rust/anything); browser
users click a web UI. No REPL, no parens, no `.lisp` files are part of the shipped user
surface unless the user goes looking in the source. Lisp is the implementation language
of the tool — invisible exactly as Ruby is invisible to a Ruby-CLI user or C is
invisible to a git user (operator's verbatim framing, task file Topic 0).

Corollary, kept as a wall: the CL-REPL-over-MCP (see ENV-2026-07-22-lisp-tooling.md) is
a DEVELOPMENT tool for building v6. It is never part of the shipped user surface. Any
future "expose the REPL" idea is a new decision for the operator, not a drift.

---

## SOURCES

- https://raw.githubusercontent.com/sbcl/sbcl/master/src/code/save.lisp — save-lisp-and-die docstring (:executable default nil, standalone combine; :compression zstd -7..22)
- https://www.sbcl.org/platform-table.html — platform matrix (linux x86-64 2.6.6, windows x86-64 native 2.6.6, macOS arm64 2.4.0)
- https://www.sbcl.org/getting.html — per-platform binaries; build-from-source needs a host CL
- https://raw.githubusercontent.com/sbcl/sbcl/master/INSTALL — build on target with host lisp; --xc-host bootstraps, no build-once-for-all flow
- https://formulae.brew.sh/formula/sbcl — Homebrew SBCL 2.6.6 with arm64 bottles
- https://xach.livejournal.com/295584.html, https://lispcookbook.github.io/cl-cookbook/scripting.html, https://github.com/lisp-tips/lisp-tips/issues/20 — measured compressed-core sizes (43->9 MB; Nyxt 120->23 MB) and startup cost (~dozen ms)
- https://github.com/Arboreta/arboreta-wasm — SBCL-WASM compatibility a far-future goal
- https://gitlab.com/embeddable-common-lisp/ecl/-/issues/740 — ECL-on-WASM works partially; sockets/threads do not
- https://spritely.institute/hoot/ — Hoot v0.9.0, Scheme-to-WASM, runs in browsers today
- https://github.com/edicl/hunchentoot — v1.3.1 Apr 2024, BSD-style, maintained
- https://github.com/fukamachi/woo — BETA quality, libev, MIT
- https://github.com/fukamachi/clack — server abstraction, backends incl. Hunchentoot/Woo, MIT
- https://github.com/fukamachi/websocket-driver — WS server for Hunchentoot/Wookie/Woo, BSD-2
- https://github.com/jsulmont/mcp-lisp — uses Woo for SSE transport (real-world use of the stack)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:103 — v5 --serve broadcast mode
- /Users/jrg/madewell-meta/runtime/the-runtime-convergence.html — prior-session essay (12 MB / ~50 ms figures; per-platform-build caveat), verified 2026-07-21
- Command run this session: `which sbcl` -> not found (no local measurement possible; installs banned)
