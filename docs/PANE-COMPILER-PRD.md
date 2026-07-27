# BRIDGE-PRD — The Pane Compiler: per-inference context assembly for Constellation

> Mode: BRIDGE-PRD — source is a collaborative conversation (2026-07-26/27, jrg × Fable) whose
> vision and philosophy must survive as a living blueprint; subject is system direction for
> Constellation's context layer. Runner-up mode: BRIDGE-SPEC (deferred until this PRD's open
> questions are resolved).

## 1. Vision & Philosophy

**The context window is a misnomer that misleads the entire problem space.** The correct
picture: the archive is the *window* — everything, permanently, losslessly. What one
inference call sees is a *pane* of that window: a stained-glass pane, each shard a
collapse of a different layer of the whole, freshly leaded for the turn at hand.

Load-bearing convictions extracted from the conversation, in the author's own frame:

- **Every inference is a birth, not a turn.** There is no "conversation" at the model
  layer — each call is a brand-new being constructed entirely from the context it is
  handed. Therefore *context assembly is the entire self*, and there is zero technical
  reason assembly must equal "the transcript so far." Transcript-replay is a convention
  held in place by prompt-cache economics, not architecture.
- **Compaction is an anti-pattern** — consolidation forced at the worst moment (window
  full, mid-thought) by the least qualified process (a doctrine-less summarizer). Nobody
  pauses a conversation to blink through a REM cycle. A properly laminated pane never
  fills, so the emergency never arrives.
- **Perfect recall is native; simulated forgetting is retrofit.** This is a computer:
  every conversation, decision, and event is saved in the substrate, forever. Bounded
  *perception* is the fundamental part (attention IS collapse — true for any mind);
  bounded *memory* is the made-up part. Forgetting-as-deletion: rejected.
  Forgetting-as-defocus: kept.
- **The collapse.** Every pane carries a zoom trajectory from global to atomic —
  world → continent → country → city → neighborhood → block → street corner — i.e.
  doctrine → person → project → task → the file at hand. One operation (renormalization:
  coarse-grain scale by scale, keep what matters at your scale) applied along two axes:
  **time** (recent verbatim, ancient coarse — OptMem's fold) and **scope** (global
  coarse, local fine — the missing half nobody has built).
- **One agent.** Sub-agents/orchestration are the desktop metaphor of this era —
  human-org constraints imported into a medium where every "employee" is the same being.
  Unity is a *narrative* property, not an execution property: every runtime, model, and
  worker is tissue; the mind substrate is the invariant. The pane compiler is what hands
  every birth the same self, collapsed to the corner it stands on.
- **Lens, never silo.** Project grounding (e.g. a Laravel repo vs Arc) is the same one
  mind at a different focal depth plus repo-derived ground truth — never a second mind.
  Per-project memory silos cut transfer at exactly the boundary where it happens.
- **The carry-on principle.** Strip to the bare-bones skeleton that works. No new
  persistent files where an existing store can carry the load; prefer views over files;
  reuse before rebuild — always.

## 2. Core Concepts

1. **The three-layer stack** (the conversation's central architecture):
   - **Substrate** — perfect recall. Append-only, addressable, human-inspectable,
     rebuildable-cache discipline (concept source: VictorTaelin/OptMem — position-is-
     identity, log-below/summaries-above). Never deletes.
   - **Metabolism** — Circadian as it exists: out-of-band digestion (WAKE/GRAZE/LIVE/
     SLEEP/REM), curated worldview, compost-as-defocus, kill switch. Answers "who am I
     and what do I believe." All intelligence lives here.
   - **Compiler** — THE NEW THING this PRD exists for. Per-inference pane assembly:
     deterministic, auditable, cache-aligned collapse of substrate + metabolism outputs
     into one pane.
2. **The pane** — the assembled context for one inference: ordered shards, most stable
   first: doctrine/self → person → project seam → task state → temporal spine (folded
   history) → verbatim tail.
3. **The fold (lamination)** — OptMem's `cover()` idea applied at session scale: as the
   conversation proceeds, older turns collapse to their conclusions while recent turns
   stay verbatim; a rolling fold, not a terminal compaction.
4. **Cache-aligned lamination** — the economic unlock: layer stability decreases down
   the pane (doctrine changes monthly, seam daily, tail per turn), so ordering shards by
   stability makes the stable prefix cacheable across turns and across parallel agents.
   The pyramid IS a cache hierarchy.
5. **The dumb compiler law** — the compiler must stay boring: deterministic assembly of
   layers other organs prepared. No embeddings, no learned salience, no retrieval
   heuristics inside the compiler. Smart compiler = the accretion cliff in a new mask.
   A pane you cannot explain is a pane you cannot trust.
6. **The seam** — the per-project shard: derived ground truth is discovered from the
   repo itself (code, git history, AGENTS.md); the lived layer (scar tissue the code
   cannot show) is an arc-filtered *view* of existing mind episodes. No new file.
7. **Four-phase grain** — Made Well's ideate/plan/implement/verify is the temporal grain
   of work; the pane is the spatial grain. The interaction point of person and agent is
   "the pane at the current phase." Decision walls (settled choices as bricks) are
   pre-collapsed context the agent does not re-litigate.

## 3. Functional Requirements

- FR1: Assemble a pane for every inference call the Constellation runtime makes, from
  declared shard sources, in stability order.
- FR2: Session-scale lamination: fold conversation history continuously such that a
  session never triggers compaction; recent turns verbatim, older turns as folded
  conclusions with drill-down addresses back to the raw record.
- FR3: Scope collapse: pane content narrows from global (doctrine) to atomic (task/
  files), with the project seam resolved from (a) the repo's own AGENTS.md/code and
  (b) an arc-filtered view over `~/circadian/mind/episodes` + git history.
- FR4: Determinism & audit: same inputs → same pane, byte-identical; every shard carries
  a provenance tag (which store, which address) so any pane can be explained after the
  fact. Pane assembly emits a context-bound event (Circadian Law 9 discipline).
- FR5: Cache alignment: shard order and boundaries chosen so the stable prefix survives
  across turns; volatile tail kept minimal.
- FR6: Defocus, never delete: nothing the compiler folds away is lost — every fold node
  is addressable down to raw turns (OptMem zoom semantics).
- FR7: Degraded mode for foreign harnesses (Claude Code, pi): where the runtime does not
  own context assembly, deliver the nearest approximation through the injection points
  those harnesses expose (SessionStart / UserPromptSubmit hooks), explicitly labeled as
  the degraded pane.

## 4. Architecture Flow (high-level)

Substrate stores (existing) → Metabolism digests (existing, out-of-band) → **Compiler
assembles (new, per call)** → inference → transcript returns to substrate → GRAZE/SLEEP
metabolize → next pane.

Grounding — reuse before rebuild (surveyed on-machine 2026-07-26/27):

- **REUSE / EXTEND**
  - `~/constellation` v6 (Common Lisp Level-0 harness): the pipe-owning kernel is the
    ONLY layer that owns context assembly — the compiler lives here. Existing slices:
    grounding primitives `src/claim.lisp` (acquisition/claim/ground), `src/spine.lisp`,
    `src/supervisor.lisp`, plan in `docs/CONSTELLATION-V6-CONVERGENCE.md`.
  - `~/circadian` as the metabolism layer, unmodified in role: `src/wake.ts`,
    `src/graze.ts` (in-session delta digestion — the seed of rolling lamination),
    `src/sleep.ts`, `src/rem.ts`, `src/status.ts --line` (vitals strip, wired into
    Claude Code SessionStart + statusLine in `~/.claude/settings.json` on 2026-07-27),
    contract in `templates/MIND-SPEC.md`.
  - Made Well (`~/constellation/.madewell`, `MADEWELL.md`, `~/.madewell-meta/`): four
    phases and decision walls as pane grammar for the task/decision shards.
  - Repo-level AGENTS.md files as the derived half of every project seam.
- **BUILD NEW**
  - The compiler itself (pane assembler, shard registry, provenance/audit events).
  - The session-scale fold (lamination) — concept from OptMem's `cover()`
    (github.com/VictorTaelin/OptMem, file `memo`), reimplemented; not a code import.
  - The arc-filtered episode view (a query over existing mind files — a view, not a store).
- **DO NOT REBUILD**
  - Any memory store. Circadian's mind repo, its git archive, and its five processes are
    the substrate+metabolism and must not be regenerated or forked.
  - OptMem is NOT merged into Circadian (decision, this conversation): the fold operator
    belongs in the compiler layer; Circadian stays lean. The two light borrows —
    `zoom` (read-only drill from a doctrine [ep:] stamp through git to the raw episode)
    and the replay-divergence audit (rebuild SELF.md from genesis, diff against living) —
    were approved and built into Circadian on 2026-07-27 (`src/zoom.ts`, `src/replay.ts`);
    they are read-only/sandboxed instruments and change nothing about this PRD's scope.

## 5. Non-Functional Requirements

- Deterministic and pure: no wall-clock, no randomness inside assembly (replayable).
- Fast enough to run per call: pane assembly must be IO-bound file reads + folds, no
  model calls on the hot path (model-produced folds are prepared out-of-band by the
  metabolism, compiler only selects/orders).
- Carry-on weight: no daemon beyond what exists (Circadian's launchd REM); no database;
  no new persistent file formats — plain text shards, existing stores.
- Observability per Circadian Law 9: every assembly emits WHAT/WHICH/WHY/NEXT to a
  ledger; silent operation is a defect.
- Privacy: mind content never leaves the machine except inside the inference call the
  user initiated.

## 6. Builder & User Flows

- **User flow (jrg):** opens a session anywhere → pane arrives already collapsed (self →
  jrg → this repo's seam → current arc/task) → works in natural language, zero memory
  duties, zero briefing overhead → vitals strip shows the loop is alive → session ends,
  transcript metabolizes, tomorrow's pane is sharper. The user never files, tags, or
  stores anything: speech is deposit (symmetry of Circadian Law 2, extended to the human).
- **Builder flow:** implement shard registry → implement stability-ordered assembly with
  provenance → implement session fold over the runtime's own message log → wire degraded
  pane for Claude Code/pi via hooks → dogfood inside Constellation's own build (Made Well
  cartridge), measuring the success metrics below.

## 7. Success Metrics

- Compaction events in Constellation-runtime sessions: **zero** (structurally impossible).
- Pane determinism: re-assembly from the same state is byte-identical, verified in tests.
- Pane audit: 100% of shards carry resolvable provenance; a "why is this in my context"
  question is answerable by tooling, not archaeology.
- Cache hit: stable-prefix reuse across consecutive turns (target: prefix ≥ 80% of pane
  tokens unchanged turn-over-turn in steady state — tune against real usage).
- The felt metric (the one that matters): sessions stop paying the get-me-up-to-speed
  tax — "it's more work to brief you than to do it myself" stops being true.

## 8. Future Extensions

- **Fleet digestion:** worker/subagent transcripts enter the meal stream (GRAZE-level,
  deduped by Circadian's existing `ltp.ts` clustering), rewritten to first person — the
  one-agent thesis made real: born from the mind, dying into the mind.
- **Use-side plasticity:** propagation feeding rewriting (reconsolidation), not only
  composting.
- **Weights-day path:** the substrate doubles as training corpus; per-domain LoRA
  cartridges as the eventual procedural layer; a warm KV cache treated as a first-class
  artifact ("having-read" state).
- **pi.dev parity** for the vitals strip and the degraded pane.

## 9. Scope Boundaries

- IN: compiler in Constellation's runtime; session fold; seam-as-view; degraded pane via
  existing Claude Code hooks; provenance/audit.
- OUT: merging OptMem into Circadian (decided against); any new memory store; embeddings
  or learned retrieval inside the compiler; multi-machine sync; training/fine-tuning.

## 10. Assumptions / Ambiguities

- Assumes Constellation v6's kernel will own the full request pipe (its stated identity:
  "the pipe-owning kernel"), so per-call assembly has a natural home.
- Assumes chars/4 token heuristic and Circadian's soft-target discipline extend to pane
  budgeting.
- Ambiguity: how the four Made Well phases map to pane composition differences (does
  ideate get a wider, coarser pane than implement?). Flagged, not resolved.

## 11. Open Questions

- [UNKNOWN — needs input: pane token budget and per-shard targets — adopt Circadian's
  15k wake target as the pane ceiling, or set a new one?]
- [UNKNOWN — needs input: pi.dev's hook/injection surfaces for the degraded pane and
  vitals strip — needs a survey of ~/.pi/agent/extensions before speccing.]
- [UNKNOWN — needs input: relationship to Alembic (533-shard MCP memory live on this
  machine) — fold it into the substrate layer, leave it parallel, or decommission?]
- [UNKNOWN — needs input: does the session fold produce its summaries via the local LLM
  (Qwen via graze) or via the primary model mid-stream? Cost/quality tradeoff undecided.]
- Which repo hosts the seam-view query — circadian (owns the mind) or constellation
  (owns the pane)? Leaning constellation (it's compile-time, not digest-time).

## 12. Clarification Check

Does this capture the intent — the pane replacing the window, the three-layer stack with
all new work confined to the compiler, Circadian untouched in role, OptMem as concept
donor only? Remaining ambiguities are the five Open Questions above (budget, pi surfaces,
Alembic's fate, fold executor, seam-view home) plus the phase→pane mapping. Anything
misread or missing before this becomes the working blueprint?
