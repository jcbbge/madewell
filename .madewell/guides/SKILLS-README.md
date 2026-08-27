# Skills

**What:** the tools and protocols the agent reaches for when the situation calls for one.
**When:** not invoked by hand — the agent loads them when relevant. Manifest: `SKILLS.json`.
**Two layers:** **foundational** (Made Well's own, always available) and **cartridge** (loads
with a domain cartridge, may be scoped to a striation).

---

## Foundational — Made Well's own

**Workflow** (`mode: workflow`) — the protocols that run the four acts:

| Skill | Act | What it does |
|---|---|---|
| `discovery` | ideate | Turns raw input — a transcript, a brain dump — into pieces on the rack. Hosts the **Lens Slot** a cartridge extends. |
| `bench` | plan | Grounds against what already exists, writes the floor, takes a piece from the rack to the bench. |
| `orchestrate` | implement | Fans work out to independent hands. Partition, dispatch, share findings, reconcile. |
| `finish` | verify | Proofs a piece against its floor — by someone who did not make it — and takes it off the bench. |
| `session-start` | — | Orients from the directories and the last handoff. |
| `session-end` | — | Commits what moved, writes the `NEXT:` handoff, reports honestly. |

**Lenses** (`mode: lens`) — different ways of seeing the same thing:

| Skill | What it does |
|---|---|
| `luck` | Reveals hidden patterns, what's trying to emerge. Include when stuck. |
| `criticality` | Reads the cognitive state — subcritical (stuck) vs supercritical (overwhelmed). |
| `systems-thinking` | Maps feedback loops, leverage points, second-order effects. |
| `reframing` | Challenges how the problem is framed; finds the real one. |
| `blind-spots` | Surfaces what isn't being considered. Before major decisions. |
| `challenging-assumptions` | Steel-mans an idea, then finds its failure modes. |
| `exploring-possibilities` | Divergent thinking, before converging. |
| `debug-hypothesis` | Scientific debugging: observe, hypothesise, experiment, conclude. |

---

## The power move

```
I'm stuck on [the problem].
Load luck, [relevant skill], and one other that might help.
Analyse this through each lens and tell me what you see.
```

The insight almost always comes from the lens you didn't expect.

---

## Cartridge skills

Domain skills bolt on with a cartridge and may be scoped to a **striation**. Cartridges live
outside the kernel install — a project loads one by explicit reference, not by the installer.
Each carries its own persona register(s), skills, and striation hierarchy, registered in its
own `PACK.md`, never here.
