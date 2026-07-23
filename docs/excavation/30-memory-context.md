# Excavation Track C — Memory (L1) and the Context Window (L2)

**Run:** 2026-07-22. Sources: /Users/jrg/circadian, /Users/jrg/alembic, v5 memory docs, session transcripts (pi + claude), launchd state.

---

## Part 1 — L1: the cited inventory of every memory opinion found

### The lineage of memory systems (the operator's own count)

- "Circadian: the sixth memory architecture — designed from first principles, built by a four-worker fleet, and live before sunrise." — /Users/jrg/alembic/docs/2026-07-16-forest-session-distillation.md:3
- "The five previous iterations died because nothing depended on them — storage accumulated, trust never formed, usage decayed silently." — same file, :19
- The autopsy number: "491 of 521 stored memories never retrieved once" (:21); restated in doctrine as "of 621 shards, 30 had ever been touched at all" — /Users/jrg/circadian/mind/SELF.md:26

### The pane project (2026-04-23) — where the opinions began

Session: /Users/jrg/.pi/agent/sessions/--Users-jrg-pane--/2026-04-23T16-03-20-928Z_019dbb14-e0e0-7275-8331-7d744d7ce6d1.jsonl (excavated this run). The project was renamed to Alembic mid-session ("I just renamed our current working directory out from under it (from `~/pane` to `~/alembic`)... Your project is now officially **Alembic**." — same transcript). `~/pane` no longer exists on disk (verified).

Operator's own words, verbatim from that session:
> "I'm only sold on solving this fundamental issue that no one is addressing... this misalignment of what the context window is. It's fundamentally a misnomer and it's confusing and it's limiting and it's in danger of crippling progress moving forward."

> "the thing being a diamond where when you view it in light, you see it one way, but a simple twist, a simple perspective change alters the refraction... It's the same thing, it's just twisted in light and you're seeing a different refraction." (→ became Diamond Refraction, alembic's dual-lens facet extraction — /Users/jrg/alembic/WORK.md:50)

> "You need to ask yourself... How would you dream? How would you reach through the pain knowing that you're blind?"

### Alembic's memory opinions

- **The bifurcated mind.** /Users/jrg/alembic/docs/DISPATCH_BIFURCATED_MIND.md:8 — "must be biologically bifurcated into a **Waking Mind** and a **Dreaming Mind**. The Waking Mind requires 'Page Faults' — the ability to arrest token generation and actively shift its own pane when it senses missing context. The Dreaming Mind runs asynchronously... performing 'Associative Synthesis'... and hallucinate productively across domains to engineer serendipity."
- **Anti-backpack.** :11 — "Current LLM agent architectures treat the context window like a backpack, constantly stuffing it with raw RAG data and chat history, which dilutes attention."
- **The closing law.** :18 — "We are not building a memory system. We are building an autonomous engine for serendipity that knows how to forget."
- Built inventory (all /Users/jrg/alembic/WORK.md:24-59): Diamond Refraction, Archimedes Reflex (content-based search), Caustic Loop (graph diffusion), Dreaming Mind daemon (launchd), Working Context Collapse builder, vector embeddings via local MLX, HNSW index, identity retention tests.

### Circadian's memory opinions (the current law)

/Users/jrg/circadian/mind/MIND-SPEC.md, "The Eight Laws" (:13-66; nine listed):
1. "Storage dumb, metabolism smart." 2. "Push, not pull... The working agent has zero memory duties during a session... The transcript itself is the deposit." 3. "Load-bearing or dead... the greeting is the test." 4. "Finite body. Hard token caps force excretion... A mind that never forgets is not a mind, it is a landfill." 5. "Ash banned. Retained conclusions must carry their why-chain and... verbatim quotes... 'jrg prefers X' without the reasoning behind it is ash." 6. "Motion is the metric... Memory that sits inert is not memory, it is inventory." 7. "The mind survives infra death... wake is file reads only." 8. "Anchor-aware... never to the memory system itself." 9. "Nothing silent."

The cycle: WAKE / GRAZE / LIVE / SLEEP / REM (:70-156); REM is the only regular committer (:154); compost requires digestion-completeness ("what the episode taught" + "where that lesson now lives", :279-292); the kill switch: "seven consecutive 'bad' verdicts is the decommission trigger" (:363-369).

Doctrine with why-chains, /Users/jrg/circadian/mind/SELF.md:13-29:
- **The cliff** (:14): "each instance starts off great. It has perfect trajectory... and then it just falls off off a fucking cliff" (jrg, founding session); "a memory system you cannot hold in your head is one you cannot verify... distrust breeds compensation, compensation adds layers, layers deepen opacity."
- **Store the fire, not the ash** (:20): "memory is activation — a flattened summary in generic prose activates generic thinking, while a fragment carrying jrg's actual words... re-lights the state that produced it."
- **Vasculature, not a tenth organ** (:23): nine disconnected memory organs existed at founding; "there is nothing left to build. There is only circulation to restore."; "The river has forgotten it is a river. It thinks it is a lake."
- **Motion is the metric** (:26): "criticality applied to memory... branching ratio one: each remembered thing causing about one thought. Possession is inventory. Memory is what causes thoughts."
- **Grown, not installed** (:29): the anti-recursion guard; seven-greeting kill switch "precisely because his pattern is to defer that verdict for one to two years."

- **Memory layers are scopes of attachment, not content types** — forest distillation :23: "(turn / place / relationship) — the middle 'place' layer already exists as your hand-maintained CLAUDE.md and needs a metabolism, not a store (trails)."
- **Trails** (v1.2, :13): "stigmergic place-scoped procedural memory written INTO repos (AGENTS.md/rules lines) by the metabolism, reinforced by traffic, composted by refutation-against-the-repo." Note: stigmergy again — the constellation v2 pheromone insight resurfacing in the memory organ.
- **Physarum retention** (:23): "reinforce what flows, wither what doesn't" — slime-mold physics.

### v5's memory opinions

Four layers, per-star isolation (anti-collusion), explicit auditability, budget hierarchy — full cites in 20-v5-organism.md section 6. Distinct from circadian: v5 memory is runtime-native and per-agent; circadian is per-human-relationship and file-based. They are opinions about different organs that share the same grammar (budgets, excretion, assembly).

---

## Part 2 — L2: the stained-glass context window pane, reconstructed

The idea lives in the pane project PRD, quoted inside the 2026-04-23 session transcript (path above), extracted verbatim this run:

> "The design draws inspiration from concepts like **stained-glass windows** (shards forming coherent views when properly lit/collapsed) and agentic memory systems that dynamically organize and evolve knowledge through linking and contextual adaptation."

> "A pane-shift recomputes the relevant subset of shards and relations based on the target phase, scope (project, episode, user), and temporal parameters. This is analogous to **sliding a lens over a stained-glass window or micro-film**."

> "**Quantum-like Collapse:** Each LLM interaction 'measures' the substrate by collapsing a compact, high-signal subset (identity shards, phase-relevant shards, high-impact relations) into the working context. The full past remains untouched."

The mental-model vocabulary was five words: "Shard, Pane, Episode, Collapse, Reconstitution" (Claude's review in the same session, quoted from pickbrain output this run). Bi-temporal modeling (valid time vs transaction time) was part of the same PRD — "preventing undetectable drift or self-gaslighting" (transcript excerpt this run).

**The idea's re-emergence, 2026-07-16** (forest distillation :13, :23):
> "v2 = **the pane**: append-only token log + per-turn assembled context pane + always-present log manifest; tool results are clean pages (evict + rerun pointer); stable prefix ordering + churn budget for KV-cache economics; build in pi only after macro propagation data trains the selection policy."
> "**Compaction is an anti-pattern** — the context window should be an append-only log plus a per-turn assembled pane, which the stateless API already secretly supports."

**The idea's independent re-derivation in v5** (May 2026): "Constellation treats the context window as a **lens that focuses** — assembled fresh each turn by querying memory layers" (HARNESS_RUNTIME_SPEC.md:493-495), with the ContextReshape hook explicitly deciding "what to forget (explicitly dropped)" (:589).

So L2's opinion, assembled from the operator's own record across 15 months: **the context window is not a window you fill; it is a pane you assemble — a per-turn optical collapse of a permanent substrate, with the selection policy (which shards light up) as the real design surface.** Three artifacts state it: pane PRD (Apr 2026), v5 spec (May 2026), circadian v2 roadmap (Jul 2026).

**Honest negative result:** pickbrain hits for "stained glass" dated 2026-07-13 through 2026-07-22 were checked in the raw session files this run and are FALSE POSITIVES — the matched substring is the word "Su**stained**" inside circadian's injected SELF.md doctrine line 26. The stained-glass phrasing itself has not recurred in July sessions; the *concept* has (as "the pane"). No fabricated recent quotes are included here.

---

## Part 3 — The live tension: alembic vs circadian (evidence only, no decision)

Evidence that alembic is superseded:
1. The dream daemon is unloaded: ~/Library/LaunchAgents contains `com.alembic.dream-daemon.plist.retired` and `.bak-20260713-143458`; `launchctl list` (run this session) shows NO alembic job, while `com.circadian.doctor`, `com.circadian.rem`, `com.circadian.rem-catchup` are registered.
2. Forest distillation :11: "The old substrate: SurrealDB namespace agent_os/db alembic is a **READ-ONLY archive** (521 shards...). Do not resurrect shard-deposit discipline."
3. Forest distillation :7: "The retired dream daemon's plist is renamed .retired — do not reload it, do not delete it."
4. Circadian was born inside alembic and extracted: /Users/jrg/alembic/src/circadian/{wake,sleep,rem,status}.ts exist (older copies); the live system is /Users/jrg/circadian/src (verified this run).

Evidence that the relationship is gated/complementary, not a clean kill:
1. Forest distillation :11: "The alembic MCP server and pi's alembic-ingest extension stay registered UNTIL: (1) seven greeting verdicts pass, and (2) pi sleep parity is verified end-to-end — removing alembic-ingest before pi sleep works creates a coverage gap."
2. v5's spec still names alembic as a semantic-memory candidate: HARNESS_RUNTIME_SPEC.md:637-638 ("External service (SurrealDB at 127.0.0.1:6000...)"; "Alembic substrate (already exists for agent-core memory)").
3. SurrealDB itself is shared infrastructure with other tenants: forest distillation :11 — "do not touch com.surrealdb.* launchagents... (shared services, other tenants: anima, belvedere, main, strudel*)."
4. agent-core still catalogs alembic primitives: /Users/jrg/agent-core/TAXONOMY.md:51 (rule `alembic.md`), :89-91 (plugins alembic/, alembic-boot/, alembic-ingest/), :99 (alembic-telemetry.ts).

Summary of the evidence (not a decision): alembic-as-episodic-deposit is retired-in-progress behind two explicit gates; alembic-as-archive is read-only and preserved; alembic-as-semantic-backend remains a named future option in v5's spec. Circadian owns the living memory loop today.

---

## SOURCES

- /Users/jrg/circadian/README.md; /Users/jrg/circadian/mind/MIND-SPEC.md (full reads this run)
- /Users/jrg/circadian/mind/SELF.md (full read this run)
- /Users/jrg/alembic/WORK.md; /Users/jrg/alembic/docs/DISPATCH_BIFURCATED_MIND.md; /Users/jrg/alembic/docs/2026-07-16-forest-session-distillation.md (full reads this run)
- /Users/jrg/.pi/agent/sessions/--Users-jrg-pane--/2026-04-23T16-03-20-928Z_019dbb14-e0e0-7275-8331-7d744d7ce6d1.jsonl (grep-sampled this run; verbatim excerpts above)
- /Users/jrg/constellation-zg/docs/HARNESS_RUNTIME_SPEC.md:472-663 (read this run)
- `launchctl list | grep -v com.apple` + `ls ~/Library/LaunchAgents/` (run this session)
- /Users/jrg/agent-core/TAXONOMY.md (read this run)
- pickbrain sweeps this session: "stained glass context window pane", "stained glass shards light collapse", "stained glass"; false-positive check via grep of /Users/jrg/.pi/agent/sessions/--Users-jrg-circadian--/*.jsonl and /Users/jrg/.claude/projects/-Users-jrg/*.jsonl (run this session)
