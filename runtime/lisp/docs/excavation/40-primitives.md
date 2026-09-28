# Excavation Track D — Primitives as First-Class Citizens + the Strudel Gateway (L3)

**Run:** 2026-07-22. Sources: /Users/jrg/strudel, /Users/jrg/strudel-lab, /Users/jrg/agent-core, /Users/jrg/constellation-zg.

---

## 1. The 10 primitive kinds — cited from source

**strudel-lab (the canonical typed enum),** /Users/jrg/strudel-lab/packages/bakery/src/types.ts:22-32:

```
export type IngredientKind =
  | "directive" | "slash_command" | "skill" | "tool" | "mcp"
  | "plugin" | "hook" | "rule" | "agent" | "subagent";
```

Doc comment (:5-20): "The ten conceptual primitives the Master Baker can compose. Provider-agnostic: these are the canonical primitive kinds that appear across every major agent harness (Claude Code, Cursor, OpenCode, Pi, Aider, ...), validated by the research in agent-core. Paradigm names like `claude-skill` or `pi-extension` are ingestion-time concerns only." The agent/subagent split is deliberate: "kept as separate kinds so a recipe asking for one and getting the other fails at discovery time, not at runtime" (:19-20).

Prose definitions: /Users/jrg/strudel-lab/STRUDEL.md:23-38 and /Users/jrg/strudel-lab/docs/vocabulary.md:36-53 (table of all ten).

**v5's parallel list,** /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:746-761: Directive, Skill, Tool, Hook, Rule, MCP, Plugin, Agent, Subagent, **Command**. Difference: v5 says `Command`, strudel-lab says `slash_command` (a strudel-lab doc treats the relabeling as a live issue: docs/recommendations/slash-command-relabeling.md:216-228).

**v5's wider taxonomy,** /Users/jrg/constellation-zg/TAXONOMY.md:225-238, groups primitives into five categories and adds signal kinds beyond the ten: Execution (Tool, MCP, Provider, Command), Context (Skill, Rule, Plugin), Ambient (Directive, Model), Coordination (Hook, Arc, Agent/Subagent), **Signal (Pheromone, Silence, User, Decision)** — telemetry-first kinds that the gateway lists do not carry.

## 2. The "TWO primitive kinds" question — FOUND

The operator's live-brainstorm phrase "the TWO primitive kinds" matches a two-class split that exists verbatim in source, twice:

1. **/Users/jrg/strudel/README.md:51-54:** "**Two classes of primitive.** *On-demand* kinds (skills, tools, MCPs, subagents, commands) go through the gateway. *Ambient* kinds (rules, hooks) are always-on and declarative — they stay as ordinary Pi extensions, because you don't 'search for' a rule."
2. **/Users/jrg/constellation-zg/TAXONOMY.md:237-238:** "Ambient primitives (Directive, Model) are never invoked. Present for session lifetime. Visual expression: the field through which everything moves — not particles, but atmosphere."

So the dichotomy over the ten is **on-demand (searched, composed, invoked) vs ambient (always present, never invoked)**. The two sources draw the membrane in slightly different places (strudel puts hooks ambient; v5's HARNESS spec calls Hook "Triggered by events" at :755) — the boundary placement is live design surface, but the two-class principle itself is established in both codebases.

Also on record, a finer operational split (not two-way): vocabulary.md:54-58 — "Some of these are executable (tool, plugin, slash_command, skill, subagent, mcp). Some are injected into context (directive, rule). Some are installed for lifecycle events (hook). Some require runtime topology (agent)." If the operator meant something other than on-demand/ambient, this four-way split is the only other categorical cut found in source. No third candidate exists in the material read this run.

## 3. What strudel's intent-search actually does (the shipped extension)

/Users/jrg/strudel/README.md (full read this run):
- The problem statement (:9-17): "Give an agent 100 skills and it will reach for the same three to five every time — not because the rest are worse, but because it never really *sees* the catalog."
- The two moments (:22-33): utensils (`str_bigfile`, `str_colgrep`, ...) register at load; "the long tail (skills, prompts, MCP tools, commands) lives in an indexed **Pantry** searched by intent, never dumped into context"; and `strudel_run` code mode — "the model writes a short JavaScript program that composes many tools — loops, conditionals, transforms — in ONE flight, inside a QuickJS sandbox."
- The superset doctrine (:42-46): "Pi's native tools... are the floor — never rebuilt, never hidden... the loader structurally refuses any utensil that would shadow a native verb."
- One implementation, two doors (:47-50): every utensil callable directly AND injected bare-named into code-mode scripts.
- Zero-infrastructure (:55-57): Pantry persists to JSONL; storage behind a thin seam.
- Honest scope (:62-67): "The harder goals strudel is ultimately aiming at — the **context-window problem** and the **memory problem** — are explicit *future* work."

## 4. What strudel-lab adds (the empty kitchen)

/Users/jrg/strudel-lab/README.md:3: "The empty kitchen — a Pi.dev fork stripped of built-in mutating tools, wrapped in a search-and-execute gateway over all ten primitive kinds."

The gateway surface is three tools, /Users/jrg/strudel-lab/STRUDEL.md:68-88:
- `strudel_search(intent)` (:72-73): "Returns ranked primitives across all 10 kinds... Hybrid search (semantic + lexical + structural). The agent never sees the full Pantry list. Discovery is on-demand pull, not ambient push."
- `strudel_prep(goal, layers[])` (:75-76): "The agent assembles a recipe: which primitives, in what order, with what `depends_on`, with what `$N.field` bindings... **This is where multi-primitive composition lives**."
- `strudel_bake(recipe)` (:78-87): executes with an improvisation cascade — "Exact match → substitute and note → build the missing piece from parts → affinity-graph neighbor → invent it on the spot, register as draft, use it now → return full context."

Provenance of the pattern (:17): "demonstrated by executor.sh for MCP servers: instead of registering every MCP, you register a gateway... Two methods. Works at one MCP. Works at ten thousand."

The metaphor is declared load-bearing (:44-64): baking is atomic ("one named recipe, atomic, captured in bake history, evaluable"); cooking is open-ended; "That's why strudel cannot be a simple discovery API. The gateway has to support composition, substitution, and invention."

**The primitive evolution pipeline** (types.ts:38-41): "`phrase → command → skill → mcp/tool → subagent`: a `pantry promote` call advances `kind` and `stage` together as the item matures." Stage lifecycle (:44-49): cupboard → draft → active → deprecated → archived. Plus per-ingredient usage telemetry (UsageStats, :52-63: bakes, successes, failures) and shelving (`front_shelf ... cold_storage`, :35). Primitives here are not just first-class — they have a lifecycle, a metabolism, and a career path.

## 5. What agent-core adds

/Users/jrg/agent-core/TAXONOMY.md (read this run): the actual inventory — 108 primitives (:19; 68 skills, 13 subagents, 13 plugins, 10 rules, 2 commands, 2 hooks), the harness-sync doctrine (":260-266 — Agent-core is the source of truth. Harnesses should sync from here"), and the research base the strudel-lab kinds claim to be "validated by" (types.ts:10). It is the pantry's warehouse; strudel is the pantry's index; strudel-lab is the kitchen built around the index.

## 6. The convergence line (already drawn by the operator's own doc)

/Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:110-120: the v5 Firmament (scan/align/fuse — see 20-v5-organism.md section 5) "is *Strudel's pantry, promoted to a first-class runtime organ* — it IS the 'converge Strudel in' piece"; and in Lisp "an invented primitive is a form the image can `eval` and keep."

Note the exact structural identity, cited on both sides:
- scan = strudel_search (both: hybrid search, never the full list, pull not push — HARNESS_RUNTIME_SPEC.md:699-708 vs STRUDEL.md:72-73)
- align = strudel_prep (layers + depends_on + bindings — :713-726 vs :75-76)
- fuse = strudel_bake (same 5-step improvisation cascade, nearly word for word — :737-743 vs :79-86)

The Firmament spec is dated May 2026; strudel-lab's STRUDEL.md carries the same cascade. The two artifacts are one design expressed in a runtime spec and a product spec.

---

## SOURCES

- /Users/jrg/strudel/README.md (full read this run)
- /Users/jrg/strudel-lab/README.md:3; STRUDEL.md:15-89; docs/vocabulary.md:30-99; packages/bakery/src/types.ts:1-63; docs/recommendations/slash-command-relabeling.md:216-228 (grep) (all this run)
- /Users/jrg/agent-core/TAXONOMY.md (full read this run)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:669-886; TAXONOMY.md:225-238 (read this run)
- /Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:110-120 (read this run)
- pickbrain sweep this session: "primitives first class citizens two kinds"
