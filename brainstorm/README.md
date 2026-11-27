# Brainstorm — base jump-pack seed

**Start here, then read [HANDOFF.md](HANDOFF.md).** Josh approved this toolbox and asked for it to seed the Brainstorm component of the new Made Well MCP product. This directory is the requested `/brainstorm` package in the repository; it does not register a slash command or implement the MCP adapter.

## What the user should experience

One continuing brainstorm, with the appropriate thinking move and an understandable effort choice—not twenty agents or a twenty-step workshop.

```text
Brainstorm conversation
├─ Start from a new project, existing work, a fragment, or a stuck thread
├─ Posture: ambitious collaboration
├─ Move when useful: change the premise / deepen a lead / simplify / another method
└─ Effort: Light by default; Focused or Deep when selected and authorized
```

The established outer grammar remains brainstorm → discovery → delivery → landing. Brainstorm can be used alone. A useful idea is not automatically a selected task, and selection is not execution permission.

## What is in this package

| Material | Purpose |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Code-grounded assignment, reuse boundaries, work order, release gates, and acceptance cases for the implementing agent. |
| [EFFORT-AND-ACCESS.md](EFFORT-AND-ACCESS.md) | Free Light / paid Focused and Deep, observable effort, entitlement boundaries, and the Rams comparison. |
| [pack-design.json](pack-design.json) | Machine-readable **design reference**, not an accepted runtime configuration schema. |
| [skills/brainstorm/SKILL.md](skills/brainstorm/SKILL.md) | The conversational entrypoint. |
| [Method map](skills/brainstorm/references/methods.md) | Choose among the complete library by the obstruction, not a fixed sequence. |
| [Effort guide](skills/brainstorm/references/effort.md) | What Light, Focused, and Deep actually ask the agent to do. |
| [Binding notes](skills/brainstorm/references/madewell.md) | Portable context/result handoff and method/effort pinning. |
| [PROVENANCE.json](PROVENANCE.json) | Exact upstream revision, file paths, Git blob identities, and SHA-256 hashes for the unmodified skill snapshot. |
| [SKILL-REVIEW.json](SKILL-REVIEW.json) | Seven-category reviews of the two **pre-reframe** skills at the earlier revision named inside. Not acceptance of the current runtime or library. |
| [LICENSE.agent-core](LICENSE.agent-core) | Upstream MIT notice for the bundled skill material; not a newly selected license for the Made Well application. |

The snapshot contains **20 ordinary skills and their supporting material**: three newly authored skills, two reframed skills, and fifteen existing skills reused unchanged. It includes **74 scenario definitions**; they are not 74 passed tests. There are no bundled execution scripts in this seed.

## The central distinctions

| Skill | Its job |
|---|---|
| `brainstorm` | Enter from the user's actual starting point, carry the thread, and select useful moves. |
| `ambitious-collaboration` | Establish an expansive, grounded posture without imposing a creativity routine. |
| `find-the-unlock` | Develop a promising lead into a specific enabling change and discriminating investigation. |
| `nonconvergence` | Change a generating premise when alternatives repeat the same mechanism. |
| `right-side-of-the-curve` | Find an enabling simplification without shrinking the desired outcome or deleting guarantees. |

**Think bigger, think differently, go deeper, and make it simpler are different requests.** Ambition, method, effort, answer length, commercial access, provider reasoning, and execution authority remain distinct.

The default pairing is `brainstorm` with `ambitious-collaboration`. Load specialists and references only when useful. Every method remains independently usable; do not activate the entire library merely because it is shipped.

Nonconvergence does not require a second domain to prove intensity or claim access to training-distribution tails. Right-side-of-the-curve can change the representation so compensating steps disappear; it is not a demand to reduce the goal. Both retain provisional leads without laundering them into verified results.

## Product direction

| Effort | Access direction | Promise |
|---|---|---|
| **Light — default** | **Free** | A useful, specific lead from available context, with uncertainty made clear. |
| **Focused** | **Paid** | Develop the lead against its key assumption and a meaningful alternative or adverse case. |
| **Deep** | **Paid** | Investigate critical dependencies, compare explanations, and revisit the lead against accessible evidence or an authorized artifact. |

Josh's direction is that shipped Light processes are the free defaults; Brainstorm is this first concrete seed. Other base processes need their own authored work recipes, not a forced universal engine ladder. The recommended starting point is **one paid entitlement unlocking both Focused and Deep**; that is a packaging recommendation, not a chosen price or billing plan.

Example user requests after a host loads the appropriate instructions:

> Brainstorm within this project. Preserve the working calendar. Start Light.

> Use nonconvergence: our alternatives change the interface but not the mechanism.

> Go Deep on this lead, stay narrow, and keep the answer short.

> Use right-side-of-the-curve: what representation would make these coordination steps unnecessary?

An unavailable paid selection must be explained and offered an explicit alternative, not silently downgraded. A catalog entry does not establish that its skill was loaded.

## Source and update policy

Canonical source: [agent-core-public at `9addbffae9d600f40dd334ad97bb24c6b0a0c7b7`](https://github.com/jcbbge/agent-core-public/tree/9addbffae9d600f40dd334ad97bb24c6b0a0c7b7/primitives/skills).

The user explicitly requested the whole toolbox here as implementation material. Keep this snapshot byte-identical to that revision; do not maintain a second edited fork of the skill bodies. Change canonical skills upstream, then deliberately refresh the snapshot and provenance. Never silently refresh already prepared work.

The bundled license permits use of these public skills independently of the hosted product. The commercial boundary is the managed service and its authorized workflows, not secrecy of the prompts.

## Read order and authority

1. Repository [AGENTS.md](../AGENTS.md) and [FOUNDATION.md](../FOUNDATION.md).
2. [v7/PLAN.md](../v7/PLAN.md) for the wider portable skills/MCP work.
3. This README, [EFFORT-AND-ACCESS.md](EFFORT-AND-ACCESS.md), and [HANDOFF.md](HANDOFF.md).
4. The chosen skill bodies and relevant supporting files—not all bodies by default.

This package supplies the Brainstorm content previously missing under v7 U2. **Landing content remains unresolved.** Exact client support, hosted privacy/deployment, payment terms, product license/publication, and live activation still require their own evidence or approval.

No application runtime, paywall, billing account, deployment, or native host activation is delivered by this source package.
