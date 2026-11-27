# Made Well v7 — Cloud-Agent Handoff

**Start with [PLAN.md](PLAN.md).** It is the self-contained, coordinated implementation blueprint: grounded reuse inventory, requirements, bounded workstreams, ownership, dependency order, interface contracts, acceptance criteria, verification, and explicit unknowns.

This folder packages the conversation's product direction, recommended delivery mechanism, relevant protocol research, and operating policies. **“v7” names the handoff folder; it does not claim that a version-7 runtime exists or has been deployed.**

## The assignment

Operationalize the established Made Well chain and eliminate manual copying of skills, inputs, context, results, and handoffs between tools.

```text
work()
  brainstorm() → discovery() → delivery() → landing()

delivery()
  ideation() → planning() → implementation() → verification()
```

- Made Well already works; Josh has used and refined it manually for two years. Do not redesign or re-prove the grammar.
- Defaults are opinionated, not compulsory counts. Every component can be extended, replaced, composed recursively, or used alone.
- Made Well shapes to-dos and helps promote selected to-dos into tasks. It does not become a workforce or launch work merely because a task was selected.
- Keep it independent of domain, provider, model, harness, and orchestration runtime. Rivet is not a product dependency.
- The delivery direction is portable, shareable ordinary skills, optional repo-local configuration, Made Well defaults, and explicit overrides. The plan recommends a small external binding configuration rather than a new skill format.
- A remote MCP server cannot read a user's local repo just because a client connects. The plan distinguishes local access from an explicit package-input bridge.

## Material in this folder

| File | Use |
|---|---|
| [PLAN.md](PLAN.md) | Primary execution artifact. Read all 20 sections before dividing work. |
| [MCP-AND-SKILLS-RESEARCH.md](MCP-AND-SKILLS-RESEARCH.md) | Source-linked protocol, skill-format, delivery, security, and compatibility findings; separates facts from recommendations. |
| [DELEGATED-JUDGMENT.md](DELEGATED-JUDGMENT.md) | How to make delegated decisions without unnecessary interviews, fabricated facts, or hidden failures. |
| [REORIENTATION.md](REORIENTATION.md) | How to restore control from zero context and report honest completion/activity/intervention state. |

The existing repository remains the implementation source of truth:
- [AGENTS.md](../AGENTS.md) — repository work and independent-verification rules.
- [FOUNDATION.md](../FOUNDATION.md#settled-foundation-operationalize-the-established-grammar) — governing settled product contract.
- [README.md](../README.md) and [OPERATIONS.md](../OPERATIONS.md) — current implementation, not mandatory product dependencies.
- The plan cites actual source symbols, tests, and commits; do not replace that inventory with a fresh greenfield design.

The original plan inspected [agent-core-public at the earlier revision](https://github.com/jcbbge/agent-core-public/tree/09b5a8926767e9ec1465505fd89f17501e8c9034/primitives/skills). The plan identifies reuse and licensing boundaries. The separately requested [Brainstorm seed](../brainstorm/README.md) supplies a pinned, byte-identical 20-skill snapshot from [the later published revision](https://github.com/jcbbge/agent-core-public/tree/9addbffae9d600f40dd334ad97bb24c6b0a0c7b7/primitives/skills), plus effort/access guidance. Keep canonical edits upstream and refresh deliberately; neither snapshot nor probes certify behavior.

The [full method-library dossier](../dossiers/method-library/README.md) supplies the complete ontology/topology, phase/tool/skill assessments and [cloud content handoff](../dossiers/method-library/HANDOFF.md) for the remaining methods. Use it as the W2 companion, not a competing runtime plan; the new method bodies are not delivered merely because their assignment is documented.

## Read order and authority

1. Read the current repository `AGENTS.md` and governing foundation.
2. Read `v7/PLAN.md`.
3. Read the research and two operating policies as applicable; for Brainstorm, also read [brainstorm/HANDOFF.md](../brainstorm/HANDOFF.md) and [EFFORT-AND-ACCESS.md](../brainstorm/EFFORT-AND-ACCESS.md).
4. For W2/remaining method content, read the complete [analysis](../dossiers/method-library/ANALYSIS.md) and [handoff](../dossiers/method-library/HANDOFF.md); preserve the stated canonical-source and independent-acceptance boundaries.
5. Inspect current source/history and the files assigned to the workstream.
6. Execute the assigned scope, preserving independent verification and the explicit release gates.

The settled foundation overrides historical engine-heavy assumptions. The plan's recommendations are labeled; do not mistake proposed paths, schemas, or MCP operation names for implemented features.

The earlier MCP report's Rivet-dependent recommendation and its dependent estimates were withdrawn. The research note here carries forward relevant technical findings without republishing that mistaken product architecture, personal infrastructure details, or obsolete estimates.

## What has and has not been delivered

This handoff is documentation. It does not implement the proposed skill loader, composition changes, host handoff interface, or MCP adapter. It does not establish passing runtime tests, interoperability, installed activation, or deployment.

The approved [Brainstorm package](../brainstorm/README.md) resolves that portion of the earlier missing-content gate. Landing method content, exact first client/topology, hosted privacy/deployment terms, and package-release authority remain open. Light is now the free product default; Focused and Deep are intended paid options, with commercial launch decisions documented in the supplement. Continue independent plumbing work; do not invent these values or turn them into another debate about the grammar.

## Suggested cloud-agent assignment

> Read `AGENTS.md`, the settled foundation in `FOUNDATION.md`, and the entire `v7/PLAN.md`. Use `v7/` as the wider handoff and `brainstorm/` as the approved base-pack seed, including its effort and commercial-access boundaries. For remaining method content, also use `dossiers/method-library/ANALYSIS.md` and `dossiers/method-library/HANDOFF.md` as the W2 companion. Implement the authorized plan incrementally in this repository, reusing the cited code rather than rebuilding it. Preserve standard-skill portability, recursive composition, exact context handoffs, and non-executing promotion. Follow the plan's ownership and independent-verification boundaries. Resolve inspectable unknowns yourself; explicitly hold only slices requiring unavailable input or reserved approval. Report completion and evidence honestly. Do not install, publish, deploy, or change live stores without separate authority.
