# Ergonomics research — neo, pi, and the minimalist harness field

**Date:** 2026-08-05
**Author:** research-neo (worker, pane wS:p9)
**Brief:** `.madewell/specs/2026-08-05-neo-ergonomics-research.md`
**Status:** complete

A read-only research pass over four terminal agent harnesses — **owainlewis/neo** (in
depth, from source), **pi** (from the local install's docs), **opencode**, and
**charmbracelet/crush** — examined along six ergonomic dimensions, with recommendations
mapped to concrete Constellation v6 moves. Every external fact below was acquired this
session; acquisition methods and sources are listed at the end.

---

## 1. The field

### neo — the disciplined one

Go 1.25+, MIT, one native binary, no daemon, no database, no plugin runtime, no product
telemetry. Self-described "best minimalist coding agent harness and agent orchestrator";
69 stars, actively developed (last push 2026-08-05; v0.6.2 released 2026-08-04). The
architecture doc is the tell: **the agent loop is policy-free** — `internal/agent` owns
transcript, provider calls, tool continuation, parallel scheduling, steering, compaction,
and events, and knows nothing about config files, sessions, AGENTS.md, skills, or the TUI.
Everything product-shaped is composed at one root (`cmd/neo`). Neo reads like a harness
built by someone who has already shipped the feature-accumulator version and deleted it
(v0.5.0 literally removed permission modes in favor of default-empty `tool_approvals`,
calling the VM/sandbox the security boundary).

### pi — the extensible one

TypeScript on Node via jiti, MIT, installed locally at v0.82.1. "A minimal terminal coding
harness. Adapt pi to your workflows, not the other way around." Minimal **core** rather
than minimal surface: four tools by default (read/write/edit/bash — grep/find/ls also
built-in), four run modes (interactive, print, JSON, RPC), and an extension model deep
enough that sub-agents, plan mode, and permission gates are deliberately *not built in* —
the README's philosophy section lists each omission with its DIY escape hatch. This
session is running on pi; its extension events are what bind this worker's own contract
hooks (the grounding hook that gated my bash calls is a pi extension).

### opencode — the accumulator (boundary marker)

TypeScript/Bun, MIT, 193,412 stars, repo now at `anomalyco/opencode` (default branch
`dev`); local binary v1.18.9. "The open source AI coding agent." Client/server
architecture (`serve`, `attach`, `web`, ACP protocol, mDNS discovery), a desktop app in
beta, GitHub agent management, db tools, 8-layer merged config including remote
organizational defaults and MDM-managed preferences. Not minimalist — included here as
the far pole of the field: this is what a harness looks like when every request is
answered with a feature.

### crush — the charming one

Go (Charm ecosystem), **FSL-1.1-MIT** (Functional Source License; converts to MIT on a
delay — borrow ideas, not code), 27,074 stars, latest release v0.88.0 (2026-07-31). The
most opinionated configuration surface in the field: a `crushrc` that is *Bash with
builtins* (`provider add`, `model add`, `permissions allow`, `lsp add`, `mcp add`),
running on a built-in Bash interpreter so it works identically on Windows. MCP-first
extensibility (stdio/http/sse with OAuth), LSPs as context, Agent Skills standard
(including reading other harnesses' skill directories), and a community model catalog
("Catwalk"). Ships a built-in skill that configures Crush itself.

---

## 2. Dimensions

### 2.1 CLI surface

**neo** — eight subcommands, and bare `neo` means chat: `chat`, `run`, `sessions`
(+ `sessions search`), `doctor`, `resume <id>`, `login`/`logout`, `version`, `help`.
`neo run` is the headless one-shot: `--json` (machine summary with `ok`, `elapsed_ms`,
`tool_calls`, `tool_errors`, `final`), `--timeout` (default 10m), piped stdin prepended
to the prompt, no session persistence. Two grace notes worth stealing: a *removed* flag
(`--permission`) returns migration guidance instead of being silently accepted, and
`neo doctor` is local-first — checks config, credentials, session store, git, workspace —
"without calling providers or printing secrets" (docs/developer/cli.md).

**pi** — modal rather than subcommanded: bare is interactive, `-p` prints, `--mode json`
streams events, `--mode rpc` serves JSONL-over-stdio for embedding. Where neo is narrow,
pi is *flag-deep*: model selection (`--model sonnet:high`, `--models "claude-*,gpt-4o"`
for cycle-scoping), tool allowlisting (`--tools read,grep,find,ls` gives a read-only
agent from the shell), resource toggles (`--no-extensions -e ./one.ts` loads exactly
what you named), session flags (`-c`, `-r`, `--fork`, `--session-dir`, `--no-session`),
and `@file` message arguments. Package management is part of the same CLI
(`pi install git:github.com/user/repo@v1`, `pi update --models`, `pi config`).

**opencode** — the maximal surface: 20+ subcommands including `serve`, `attach`, `web`,
`acp`, `mcp`, `github`, `pr <number>`, `db`, `stats`, `plugin`, `upgrade`, `uninstall`.
Notable: `--mini` starts a deliberately *minimal* interactive interface — even the
accumulator feels the pull toward less.

**crush** — TUI-first; `--yolo` skips all permission prompts; `crush serve` exposes a
multi-client backend. UNKNOWN: crush's full command grammar was not enumerated this
session (no local binary; acquisition was README + LICENSE + repo tree via `gh api`).

*Pattern:* the field converges on **bare-command = interactive**, a **one-shot headless
mode with structured output**, and **local session resume**. They diverge on everything
else in exact proportion to how much the project wants to own.

### 2.2 Configuration

**neo** — `neo.yaml`, first hit wins: `./neo.yaml` → `~/.neo/config.yaml` → embedded
defaults. **Files are not merged.** The shipped default file is the entire configuration
surface, fully annotated, including per-provider setup recipes with live-doc pointers
("Model names move fast — check each provider's current model list rather than copying an
id from here verbatim"). Feature flags are tri-state (absent = default). One principled
exception: the `phases` map overlays defaults by name even under first-hit resolution.
The removed `permissions:` section is rejected with migration guidance.

**pi** — `settings.json` global (`~/.pi/agent/`) + project (`.pi/`), project overrides
global — but project settings load only after a **trust gate** (interactive prompt,
`trust.json`, `--approve`/`--no-approve` per-run overrides, `defaultProjectTrust` for
headless). Ancillary files split by concern: `models.json` (custom providers),
`keybindings.json` (namespaced action ids, auto-migrated from legacy ids), `themes/*.json`.

**opencode** — JSON/JSONC with a published `$schema`, **merged** across eight layers:
remote org defaults (`.well-known/opencode`) → global → `OPENCODE_CONFIG` → project →
`.opencode` dirs → `OPENCODE_CONFIG_CONTENT` env → managed files → MDM profiles
(highest, user-unoverridable). Maximally discoverable, maximally enterprise, and the
clearest thing in this report to *not* do.

**crush** — config as an executable: `crushrc` is Bash with builtins, priority
`./.crushrc` → `./crushrc` → `~/.config/crush/crushrc`, XDG-respecting. Values support
`$VAR` and `$(command)` expansion; the README carries an explicit trusted-code warning
("don't randomly `source` files from the internet into your config"). The old JSON
format is deprecated but supported, with a `$schema`.

*Pattern:* first-hit (neo) and two-layer-with-trust (pi) both keep the mental model at
one or two files; merged-N-layer config (opencode) trades user comprehension for
organizational control; executable config (crush) trades auditability for familiarity.
For a native binary whose users never see the implementation language, **declarative,
first-hit, fully-documented-defaults** is the considered choice.

### 2.3 Extension model

**neo** — deliberately none at runtime: "no runtime or plugin stack." Extension happens
at compile time (implement `llm.Provider` or `tools.Tool`; compose capabilities in
`cmd/neo`) and at the prompt level (`AGENTS.md`, skills, named phases). The boundary is
the point: core packages expose small interfaces and "do not reach upward."

**pi** — the benchmark. TypeScript modules loaded via jiti (no compilation), a
default-export factory (optionally async), and an event bus spanning the whole lifecycle:
`session_start`, blockable `tool_call`, modifiable `tool_result`, `context` (rewrite the
message list per turn), `before_provider_request` (replace the serialized payload),
compaction/tree/fork hooks, `agent_settled` for liveness integrations. Extensions
register tools (with typebox schemas), commands, shortcuts, flags, widgets, status lines,
and full custom TUI components; `/reload` hot-reloads everything; packages distribute via
npm or git. The cost is real and stated: "Extensions run with your full system
permissions" — hence the trust gate.

**opencode** — plugins installed via CLI, custom tools, first-class MCP management, and
convention directories (`agents/`, `commands/`, `plugins/`, `skills/`, `tools/`,
`themes/`).

**crush** — MCP (three transports, OAuth with dynamic registration), preliminary hooks,
Agent Skills (including `user-invocable` palette commands and cross-harness skill
directories — it reads `~/.claude/skills`, `.cursor/skills`), LSPs as context sources,
and Catwalk as a *community-owned* model catalog. Its most novel move: the
self-configuration skill — the agent edits the harness's own config as a supported
workflow.

*Pattern:* the field splits into **in-image extension** (pi: maximal power, maximal
blast radius) and **no runtime extension** (neo: skills + config only). MCP is the
incumbent interop bus everywhere except pi (which refuses it on principle) and neo
(which omits it silently).

### 2.4 Agent-facing affordances (AX)

**neo** — the system prompt is assembled as ordered blocks: a cacheable base (static
instructions + phase catalog + skill catalog — names and descriptions only) and an
uncached AGENTS.md tail, so project context never evicts the cached prefix. Skill bodies
materialize only on `$name` or `/name` invocation. The `workflow` tool lets the model
emit visible checklist state; the `agent` tool spawns children whose registries are
**capability-filtered by mode** (`inspect` = read/grep/glob only, parallel-safe; `work` =
full but serial), under hard budgets (20 children/session, 15 min each). Loop invariants
are stated and kept: every `tool_use` gets a `tool_result`; parallel results land in
request order; denied/failed/unknown calls produce error-shaped results rather than gaps.
Fuses everywhere: 500-turn loop cap, 256 KiB tool-result cap, bounded search results.

**pi** — skills advertise per the Agent Skills standard (XML catalog of names +
descriptions; the model `read`s the full SKILL.md on demand). The bash tool receives
live session metadata as env (`PI_SESSION_ID`, `PI_SESSION_FILE`, `PI_PROVIDER`,
`PI_MODEL`, `PI_REASONING_LEVEL`) — the agent can name itself and its session from inside
a subshell. Extensions can inspect the exact structured inputs to the system prompt
(`systemPromptOptions`). RPC mode gives non-Node embedders the full event stream with
explicit `steer`/`followUp` queueing semantics.

**opencode** — agents are configured entities: primary agents (build = full access, plan
= read-only with `ask` on edits and bash) switched with Tab; subagents (general,
explore, scout) invoked by `@mention`; permissions resolve per tool to allow/ask/deny
with wildcard support; `--auto` approves whatever isn't denied.

**crush** — global context files split by audience (`~/.config/crush/CRUSH.md` for
crush-specific rules, `~/.config/AGENTS.md` shared across tools), `.crushignore` beyond
`.gitignore`, `permissions deny` hides tools from the agent entirely, and an `init`
flow that analyzes the codebase and *writes the AGENTS.md* for future sessions.

*Pattern:* progressive disclosure (advertise names/descriptions, expand bodies on
invocation) is now table stakes — neo, pi, and crush all implement it, which matters for
v6: the Firmament's scan gate and the collectible-vs-runtime-inherent ruling are the same
idea at language scale. Capability-filtered tool sets (neo's inspect, opencode's plan)
are the accepted way to make read-only agents real.

### 2.5 TUI / status signaling

**neo** — Bubble Tea. The status spinner is **deliberately static** — one `●` glyph:
"Activity text, color, and elapsed time communicate progress without adding perpetual
motion to the interface" (internal/tui/spinner.go). In-flight tools render as
present-tense verbs ("reading src/main.go", "running go test ./..."); completed tools
collapse to concise receipts; errors and direct `!` output always render in full. The
splash is a wordmark, a version, two hints ("@ add files · / commands", "tab →
workflow"); repo and model context live in the footer so the first screen doesn't repeat
itself. Subagents render as trees; the workflow checklist is one tab away while the agent
works.

**pi** — the densest telemetry line in the field: footer carries cwd, session name,
token totals split by direction and cache behavior (`↑` `↓` `R` `W` and `CH` cache-hit
rate), cost, context usage, and model. The startup header enumerates what was loaded
(AGENTS.md files, templates, skills, extensions) — discovery made visible. Editor border
color encodes thinking level. Messages submitted mid-run queue with two semantics
(steer vs follow-up); Escape aborts and restores the queue to the editor. `/tree` renders
the session's branch structure navigably. Themes hot-reload on file save.

**opencode** — TUI by default with agent switching on Tab; `--mini` offers a stripped
interface with replay controls; a web UI and desktop beta extend the surface beyond the
terminal.

**crush** — Charm-polished TUI with the field's most humane notification rule: desktop
notifications fire on permission requests and turn completion **only when the terminal
window isn't focused** (native locally, OSC over SSH, bell as fallback). The session
picker surfaces `IsBusy` and `AttachedClients` — liveness signals for shared backends.

*Pattern:* calm surfaces win. A static glyph plus precise verbs beats animation; one
dense footer beats a dashboard; notify only when the human isn't looking. The startup
"what loaded" header (pi) and the mid-work checklist (neo) are the two moments users
actually name.

### 2.6 Minimalism discipline

**neo omits:** plugin runtime, MCP, daemon/server, database, telemetry, merged config,
permission *modes* (removed v0.5.0 in favor of default-empty literal-match approvals,
explicitly labeled "user-interface friction, not a security boundary"), and durable
workflow state (listed as a known limitation, not a gap). The omissions are load-bearing:
they're what make the policy-free loop reviewable.

**pi omits** (each with a stated DIY escape): MCP ("build CLI tools with READMEs, or an
extension"), sub-agents ("spawn pi instances via tmux, or build your own"), permission
popups ("run in a container"), plan mode ("write plans to files"), built-in todos ("they
confuse models"), background bash ("use tmux. Full observability, direct interaction").

**crush omits** little by comparison (MCP, LSP, hooks, serve mode are all in), but its
FSL license is its own discipline signal — a business boundary, not an engineering one.

**opencode omits** nothing; it is the control group.

*Lesson for v6:* an omission is a feature when it is (a) named, (b) justified in one
sentence, and (c) paired with a sanctioned escape hatch. Both neo and pi do all three.
The failure mode isn't omitting — it's omitting silently and letting users discover the
hole.

---

## 3. Recommendations for Constellation v6

Each item: tag — verdict — move, with a one-line reason. v6 context applied: CLI-only
native binary with zero Lisp exposure; grounding/ratchet/pause as language primitives;
celestial namespace (stars, pheromones, Nebula, Houses); Envelope spine byte-compatible
with v5; Made Well governs process; Herdr + Tower are the local substrate.

1. **[DX] — adopt — a `doctor` subcommand.** Local-first environment self-check (binary,
   Nebula paths, Tower socket, Herdr reachability) that never calls providers or prints
   secrets; for a `save-lisp-and-die` binary with no installer, self-diagnosis is the
   first-run experience. (Source: neo `doctor`.)

2. **[DX+AX] — adopt — first-hit, declarative config with the shipped default file as the
   complete annotated reference.** One file wins, never merged; the default carries every
   key with comments. Zero-Lisp-exposure demands a config a user can hold in their head.
   (Source: neo `neo.yaml` resolution + defaults file.)

3. **[DX] — reject — merged N-layer config with remote/MDM precedence** (opencode's 8
   layers). Organizational control is not a v6 constituency, and merged precedence makes
   "what is my config right now" unanswerable by inspection.

4. **[DX] — reject — executable config** (crush's bash-with-builtins `crushrc`). Trusted
   arbitrary code at load time is anti-grounding; the Spectral Charter stays declarative
   (TOML). The *useful* kernel — one-line verbs like `permissions allow X` — is better
   served by CLI subcommands that edit the declarative file.

5. **[AX] — adopt — progressive disclosure for every collectible.** Advertise names +
   descriptions only; expand bodies on invocation. This is the field's settled answer,
   and it is already v6's own ruling (Firmament scan gate; Strudel as the surfacing
   mechanism for collectible primitives) — the research confirms the ruling, it does not
   add a new mechanism. (Sources: neo skill/phase catalogs; pi Agent Skills XML; crush
   skills.)

6. **[AX] — adopt — session-identity env vars injected into spawned processes** (pi's
   `PI_SESSION_ID`/`PI_MODEL` pattern). A star's subshells should be able to learn their
   star id, trajectory, and House from their environment — five variables of AX that cost
   nothing. (Source: pi README env table.)

7. **[AX] — adopt — transcript invariants as loop law:** every tool request gets a
   result; parallel results commit in request order; denied/failed/unknown calls produce
   error-shaped results, never gaps. v6's Envelope spine already wants this byte-level
   honesty; neo proves it is achievable at loop scale. (Source: neo ARCHITECTURE.md §4.)

8. **[AX] — adapt — capability-filtered tool registries as the read-only-agent story**
   (neo's `inspect` mode, opencode's `plan` agent). In v6 the tool set is a value on the
   Spectral Charter, not a hardcoded mode — same mechanism, charter-carried. A read-only
   star is a charter with an empty write set.

9. **[AX] — adapt — mid-run steering with two queue semantics** (pi's steer/follow-up;
   neo's steering-at-structural-boundary). v6's cooperative pause is a condition signaled
   and resumed in place — richer than a queue — but the *delivery points* should be the
   contact points, and the two semantics (interrupt-soon vs when-settled) map directly
   onto restart choice.

10. **[DX] — adopt — a static status glyph + present-tense tool verbs** (neo's `●` and
    "reading x", "running y"). No perpetual motion; activity text, color, and elapsed
    time carry the signal. Calm is a feature, and it costs less than animation.

11. **[DX] — adopt — one dense ambient footer** (pi's: cwd, session, directional/cache
    token glyphs, cost, context %, model). The human's telemetry is one line; everything
    else is the spine's job. Bonus from pi: the startup header that enumerates loaded
    context files, skills, and extensions — discovery made visible at boot.

12. **[DX] — adopt — notify only when the terminal is unfocused, on pause-required and
    turn-end** (crush's rule). Constellation already rings the doorbell through
    `herdr notification show`; the considered part is the suppression rule when the
    operator is watching.

13. **[DX+AX] — adopt — named phases as configurable one-turn prompts** (neo's
    `/design` `/plan` `/build` `/review`, overridable by config, shown as the active TUI
    label, bodies injected only on invocation). Map the defaults onto Made Well's
    Imagine/Plan/Make/Verify and the Houses: process grammar the user can see and
    override, without a plan-mode subsystem.

14. **[DX+AX] — reject — a built-in primary/subagent split** (opencode's build/plan +
    `@mention` subagents). v6 stars are OS processes under supervision with charters;
    in-process role modes would duplicate the fractal at prose level. Pi's omission
    stance applies: spawn real instances.

15. **[AX] — reject — MCP as v6's extension backbone.** Pi refuses it on principle; neo
    omits it; v6's interop is CLIs with READMEs into Herdr/Tower/KotaDB, plus conditions
    and restarts in-image. A bridge primitive can exist later behind a function pointer
    (minimum-ownership line), but the bus must not be a dependency.

16. **[DX+AX] — adapt — pi's extension event taxonomy, delivered as subprocess filters.**
    The taxonomy (blockable pre-tool, modifiable post-tool, per-turn context rewrite,
    session lifecycle) is exactly the condition/restart surface — but jiti/TypeScript is
    off-limits under zero-Lisp-exposure and native-binary distribution. v6's version:
    git-hook-style executables the runtime shells out to at those event points, typed
    Envelopes on stdin, verdicts on stdout.

17. **[DX] — adopt — honest-surface mechanics:** removed flags fail with migration
    guidance; a known-limitations table ships in the architecture doc; concise receipts
    by default with a verbose escape. Trust is ambient — the surface must never bluff.
    (Sources: neo cli.md, ARCHITECTURE.md §14, output.verbose.)

18. **[DX] — reject — phone-home update checks and install telemetry** (pi's version
    ping, opencode's autoupdate). v6's only telemetry is the local Envelope stream;
    distribution via package pins keeps updates an act of user intent. Neo's stance —
    "no product telemetry" — is the v6 stance already.

19. **[AX] — defer — session tree-branching** (pi's `/tree`, fork/clone). Adopt flat
    local sessions with resume + saved-cwd restore now (neo's shape, JSONL-friendly,
    Envelope-adjacent); the tree is real power but it is a v6-later surface, not a
    first-slice one.

---

## 4. What the field confirms about v6's existing bets

- **Grounding as a language primitive is differentiated, not weird.** The closest anyone
  else gets is pi's trust gate and neo's "UI friction, not authorization" approvals —
  both are *prose-level* policies bolted on. Nobody else makes an unacquired value
  inexpressible. The research found nothing to borrow here because nothing comparable
  exists; that is signal.
- **The minimum-ownership line is orthodox.** Neo owns no server, DB, or plugin runtime;
  pi rents sub-agents and background execution to tmux. v6 renting models, stores, and
  UI behind function pointers is the field's best practice, not an eccentricity.
- **Process-boundary supervision beats in-image actors** for multi-agent work: neo's
  children are budgeted and capability-clamped, opencode's subagents are configured
  roles, and every serious multi-pane story on this machine is Herdr's. v6's
  one-for-one supervisor over `uiop:launch-program` sits exactly on this line.

---

## 5. Sources (all acquired this session, 2026-08-05)

**neo** — cloned to `~/source/neo` (`git clone https://github.com/owainlewis/neo`), HEAD
`82fe5cf` (v0.6.2, committed 2026-08-04T20:57:25+01:00). Read: `README.md`,
`ARCHITECTURE.md`, `AGENTS.md`, `CHANGELOG.md`, `cmd/neo/main.go`,
`internal/config/defaults/neo.yaml`, `internal/tui/{splash,spinner}.go`,
`docs/developer/{index,cli,config,phases,sessions,tools}.md`,
`docs/developer/guides/{index,system-prompt}.md`. Metadata via `gh repo view
owainlewis/neo` (69 stars, last push 2026-08-05T03:10:14Z, MIT, default branch `main`).

**pi** — local install v0.82.1 (`pi --version`) at
`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/`. Read: `README.md`,
`docs/extensions.md` (lines 1–1356 of 2962), `docs/skills.md`, `docs/keybindings.md`
(partial), `docs/themes.md` (partial), `docs/models.md` (partial), `docs/rpc.md`
(partial), `docs/sessions.md` (partial).

**opencode** — local binary v1.18.9 (`opencode --version`, `opencode --help`;
`~/.opencode/package.json`). Via `gh api` from `anomalyco/opencode` (default branch
`dev`; reached through the `sst/opencode` redirect): `README.md`,
`packages/web/src/content/docs/{config,agents,permissions}.mdx`. Metadata via
`gh repo view` (193,412 stars, MIT, pushed 2026-08-05T03:33:21Z).

**crush** — via `gh api` from `charmbracelet/crush`: full `README.md`,
`LICENSE.md` (FSL-1.1-MIT header), root file listing. Metadata via `gh repo view`
(27,074 stars, license NOASSERTION → resolved to FSL-1.1-MIT by reading LICENSE.md,
pushed 2026-08-05T00:48:51Z) and `gh release view` (v0.88.0, 2026-07-31).

**Environment note:** the `web_search` tool failed in this pane with a provider error
(`ctx.modelRegistry.getApiKey is not a function`); all acquisition was via local files,
`git clone`, and `gh api` instead.

---

**Facts in my brief that turned out to be wrong:** none. Every pre-verified fact
re-verified on acquisition (neo: Go, MIT, `main`, 69 stars, active; pi docs at the stated
paths with the stated focus list). The brief's claim that pi `docs/` holds "28 files" was
not independently re-counted — not contradicted, simply not re-verified; nothing in this
report rests on it. Step 7's ledger deliverable was superseded by the coordinator's
amendment (board-only DONE) — an amendment, not an error.

**What I did NOT do, and why:**
- Did not enumerate crush's full CLI grammar or internals — no local binary and no clone
  (the brief sanctioned README-via-`gh` acquisition; LICENSE and repo tree were read the
  same way). Every crush claim above traces to those reads; anything beyond them is
  marked UNKNOWN.
- Did not read opencode's source — local binary help/version plus official docs only;
  it is the boundary marker, not a borrow source.
- Did not read pi's `extensions.md` to the end (stopped at line 1356 of 2962) and read
  five other pi docs partially — the extension-model and config findings were fully
  evidenced within what was read; remaining lines were API reference detail.
- Did not post a Tower ledger deliverable — superseded by the coordinator's amendment;
  DONE with the report path was posted to `board.jsonl` (topic `research-neo-ergo`).
- Did not commit — workers never commit; integration is the coordinator's.
- Orphan processes: **0**. Every command was one-shot (`git clone`, `gh`, `--version`/
  `--help` invocations all exited); nothing was left running.
