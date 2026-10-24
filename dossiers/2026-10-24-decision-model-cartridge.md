# Decision Model Cartridge — optional plug-and-play decision extension for Made Well

## Purpose

This dossier specifies the extension seam for an optional Made Well decision model cartridge. It is a sibling to [`2026-10-24-three-legged-rubric.md`](./2026-10-24-three-legged-rubric.md), which defines the default decision philosophy: the DX / UX / AX triple gate, the vending-machine principle, and the two-touchpoint runtime procedure.

This artifact does **not** specify a provider and does **not** implement anything. It defines the architecture that keeps Made Well open to a future decision model without making that model part of the core machine.

## Console and cartridge thesis

Made Well should behave like a console that accepts cartridges:

- plug a component in and it works;
- pull it out and the system still works fine;
- the console owns the invariant flow;
- the cartridge is optional capability, not a dependency.

The decision model is exactly this kind of cartridge.

**Default, with no cartridge inserted:** Made Well remains fully functional. The agent applies the three-legged rubric itself, in process, using the existing brief, packet, NQ protocol, and rubric instructions. There is no external inference and no provider requirement.

**Optional cartridge, when enabled:** Made Well may ask a decision model to render or shape the decision call. The cartridge supplements or offloads the decision step, but it does not become the authority over the pipeline. Made Well still owns the work item, the NQ bound, the hold rules, the output schema, and the fallback.

**If the cartridge is absent, disabled, invalid, out, or failing:** Made Well cleanly falls back to the in-process rubric. No item should be unable to proceed merely because a decision cartridge is missing.

## Design reference: Pi's extension surface

The reference model is Pi's extension/package shape: small surface, explicit registration, config-controlled loading, and graceful absence. Pi packages can declare extension files; an extension gets a narrow API and registers capabilities such as tools, commands, providers, or request routers. If a package is not present, the host still runs with its defaults.

Made Well should adopt that spirit, not copy Pi's implementation:

- one small decision-extension API;
- no provider baked into core;
- configuration selects whether the cartridge is loaded;
- failure to load or call the cartridge degrades to the default rubric path;
- the core console keeps the workflow contract.

## Current grounding in Made Well

Made Well currently applies the rubric through agent instructions and schemas, not through a central decision service.

The relevant places in the current structure are:

- `src/engine.ts` `BRIEF`: every worker call receives the governing rubric language.
- `src/lane.ts` `Decision` / `Decisions`: ideation, challenge, and planning deliverables record decisions with a `why` tied to the three governing questions.
- `src/engine.ts` `step(...)`, `intake(...)`, and `originate(...)`: every hand-off enters NQ; a receiver asks questions; the originator answers; after 3 answered turns the item holds.
- `src/engine.ts` `originatorParts(...)`: the originator is explicitly told that a decision question is settled by the three governing questions and that operator escalation is only for authority the source leaves open.
- `src/cards.ts` / `prescriptions.json`: Made Well already treats runtime execution choices as configuration: cards, tiers, harnesses, access, budgets, and parallelism are data, with built-ins plus optional overrides.
- `src/harness.ts`: a harness is a data entry with a small contract, and prescriptions can add or replace built-ins.

There is no general plugin system today. The closest existing pattern is the prescription/harness model: a minimal data contract, built-in defaults, optional overrides, and validation before use. The decision model cartridge should follow that minimalism.

## Exact seam

The seam should live at the **decision-resolution boundary**, not in worker launch, verification, implementation, or a provider-specific adapter.

Concretely, the future core should introduce one wrapper conceptually named `resolveDecision(input)` and use it only where Made Well is already asking someone to apply the rubric:

1. **Forward decisions in ideation and planning.** Ideator, ideation peer, and planner jobs already settle and record decisions in their deliverables. If a cartridge is enabled, the worker packet may include decision-model guidance or the engine may pre-resolve a specific candidate choice through `resolveDecision`. If no cartridge is enabled, the agent keeps doing what it does now: apply the rubric itself and record `decisions[]`.
2. **Runtime NQ resolution.** The sharpest seam is in the NQ originator path around `originate(...)` / `originatorParts(...)`: a receiver asked a question; the originator must answer from its context, the repository's intent and purpose, and the rubric. This is the real runtime decision point. A cartridge can help render that answer or recommendation before the originator response is finalized.
3. **Operator hold shaping after NQ exhaustion.** When 3 NQ turns are exhausted, the item holds because the spec, plan, or dossier is defective. If a cartridge is enabled, it may shape the structured decision request shown to the operator. It must not create extra turns or bypass the hold rule.

The seam belongs here because it is where Made Well already turns ambiguity into either a resolved hand-off or a hold. It does not belong in `execute(...)`: implementation and test-writing are deterministic functions once their briefs are clear. It does not belong in `verify(...)`: verification is Made Well's own mechanical run of checks. It does not belong in `worker.ts` or `harness.ts`: those launch agents; they should not know what a decision means.

## Minimal provider contract

Any decision-model provider must satisfy one small contract: receive a bounded decision request and return a bounded decision result.

### Input: `DecisionRequest`

A request should contain only what the decision needs:

- `item`: id, title, objective, source, kind when present.
- `mode`: `forward`, `nq`, or `operator-hold-shape`.
- `job` / `stage` / `profile`: where the question arises.
- `question`: the decision or question being resolved.
- `candidates`: optional candidate paths when known.
- `context`: the relevant hand-off, received deliverables, current NQ turns, and any operator answer already on record.
- `repoIntent`: the repository purpose, constraints, or baseline summary available to the caller; this should be supplied by Made Well from existing packet context, not discovered by the provider.
- `rubric`: a compact reference to the sibling three-legged-rubric dossier or an embedded summary of the DX / UX / AX triple gate.
- `constraints`: scope, authority limits, non-goals, and whether operator escalation is permitted.

The provider should not receive a checkout by default, should not mutate files, should not run the work item, and should not be asked to rediscover the repository. It is a decision renderer, not a worker.

### Output: `DecisionResult`

A result should be schema-checked and minimal:

- `recommendation`: the selected path or answer.
- `verdict`: one of `all-three`, `at-least-two`, `below-bar`, or `stop`.
- `legs`: exactly three judged leg records:
  - `leg`: `DX`, `UX`, or `AX`;
  - `pass`: boolean;
  - `cell`: optional matrix cell reference;
  - `gets`: what this path gains;
  - `costs`: what this path costs;
  - `why`: short rationale.
- `reasoning`: a concise explanation suitable for the work record or hold surface.
- `operatorRequest`: only for `operator-hold-shape`, the structured needs-your-attention payload described in the sibling dossier.
- `confidence` or `uncertainty`: optional, informational only.

Invalid output, timeout, provider error, missing provider, or disabled provider means: ignore the cartridge result and use the default in-process rubric path.

## Toggle and fallback

The toggle lives in **prescriptions**. This is settled.

A decision-model cartridge is configured in prescriptions exactly like Made Well's existing cards, tiers, harnesses, access levels, and budgets: runtime execution choices are data, not source edits. The prescription entry enables or disables the cartridge and names the registered decision provider.

The minimal future shape should be a single optional prescriptions entry:

```json
{
  "decisionModel": {
    "enabled": true,
    "provider": "<registered decision provider>",
    "options": {}
  }
}
```

Absence from prescriptions is the default and means off. `enabled: false` means off. Unknown provider, failed load, invalid provider contract, timeout, or invalid result also means off for that decision call, with a diagnostic recorded if useful.

Fallback is not an error path. It is the normal console behavior when no cartridge is inserted or enabled in prescriptions: the agent applies the rubric itself.

The provider registry should be provider-agnostic. The same prescriptions seam must be able to accept a future local inference model, third-party API, or basic cloud account. Those are adapters behind the same `DecisionRequest -> DecisionResult` contract; none is wired by this dossier.

## Non-goals

- Do not wire a local model now.
- Do not wire a third-party API now.
- Do not wire a cloud account now.
- Do not add a general plugin framework unless the smallest decision-cartridge seam forces it.
- Do not move the rubric out of the default agent path.
- Do not make Made Well dependent on external inference for decisions.
- Do not put decision logic in implementation, test-writing, verification, worker launch, or harness adapters.
- Do not build cost/token machinery as the reason for this cartridge; waste is diagnostic, and ambiguity is the cause to eliminate.

## Preservation of the vending-machine principle

The cartridge must preserve the rule from the sibling dossier: all intelligence is spent at the front.

A decision model may help front-load clarity. It may help judge candidate paths against DX / UX / AX. It may help shape the rare operator hold after the NQ bound is exhausted. It must not create mid-stream negotiation with implementers or test writers, and it must not let implementation become a thinking stage.

Implementation and testing remain deterministic functions: execute the brief and report. The cartridge exists only to make the brief clearer before those functions run.

## Preservation of rubric-as-default

The three-legged rubric is the default decision engine. The cartridge is optional help, not replacement law.

The core invariant is:

1. Try the configured decision cartridge only if one is present and enabled.
2. Accept its result only if it matches the minimal schema and respects the current authority bounds.
3. Otherwise fall back to the in-process DX / UX / AX rubric.
4. Record which path was used so later observers can tell whether a decision was cartridge-assisted or default-rubric.

This keeps Made Well open to future decision models without painting the architecture into a provider corner.

## Risk

The main risk is accidentally turning the cartridge into another agent stage. That would violate the console/cartridge model and the vending-machine principle. The decision model must be a narrow resolver at an existing decision boundary, not a planner, reviewer, worker, or parallel authority.

The toggle location is not open: it lives in prescriptions, matching the existing card/harness/prescriptions configuration pattern.
