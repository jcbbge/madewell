# Skills

**What:** The thinking tools and protocols the agent reaches for when the situation calls.
**When:** They're not invoked by hand — the agent loads them when relevant. Manifest: `SKILLS.json`.
**Two layers:** **foundational** (Made Well's own, always available) and **cartridge** (loaded with a domain cartridge).

---

## Foundational — Made Well's own

**Loop machinery** (`mode: workflow`) — the protocols that run the lifecycle:

| Skill | What it does |
|---|---|
| `discovery` | Shapes raw input into items on the `discovery` queue. |
| `session-start` | Re-enters the paused loop — inner loop first, else the queue, else fresh. |
| `session-end` | Pauses the loop; persists the outer store and any active cycle store. |
| `land` | At each Verify→Land: ship the brick, drain the queue, reflect the nutrient (LEARNED/PROPAGATED/TAX). |
| `orchestrate` | Fans work out to independent sub-agents. |
| `substrate-start` / `substrate-end` | Reconcile / log execution state via the event log. |

**Thinking lenses** (`mode: lens`) — different ways of seeing the same thing:

| Skill | What it does |
|---|---|
| `luck` | Reveals hidden patterns, what's trying to emerge. Always include when stuck. |
| `criticality` | Reads the cognitive state — subcritical (stuck) vs supercritical (overwhelmed). |
| `systems-thinking` | Maps feedback loops, leverage points, second-order effects. |
| `reframing` | Challenges how the problem is framed; finds the real one. |
| `blind-spots` | Surfaces what isn't being considered. Before major decisions. |
| `challenging-assumptions` | Steel-mans an idea, then finds its failure modes. |
| `exploring-possibilities` | Divergent thinking before converging. |
| `debug-hypothesis` | Scientific debugging: observe, hypothesize, experiment, conclude. |

---

## The Power Move

```
I'm stuck on [describe the problem].
Load luck, [relevant skill], and one other skill that might help.
Analyze this through each lens and tell me what you see.
```

The insight almost always comes from the lens you didn't expect.

---

## Cartridge skills

Domain skills bolt on with a cartridge and may be scoped to a **striation**.

Cartridges live outside the kernel install — they are loaded into a project by explicit
reference, not by the installer. Each cartridge carries its own persona register(s), skills
(including a quality skill), and striation hierarchy. See the cartridge library.
