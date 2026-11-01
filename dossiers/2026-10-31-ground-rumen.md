# Ground, Rumen and preparation belong to the work

Operator requirement, 2026-10-31: work is durable; agents are disposable tools. Completing a phase includes preparing the next phase. Ground and Rumen are mandatory organs of delivery, not optional advice.

## Contract

New work submitted through CLI or HTTP carries `organs: {version: "1"}`. Discovered tasks and prerequisite work inherit it. This console-owned obligation cannot be disabled by a cartridge. Existing saved items without the pin remain readable as legacy, with no invented organ completion.

Every accepted producer output carries the console-owned `organPreparation` field. Cartridge fields, including discovery’s `preparation` array, retain their domain meaning. Existing v1 replies using the former `preparation` object remain accepted through the same validation; an explicitly supplied `organPreparation` must itself be valid. Saved outputs and receipts are never rewritten.

The organ object is:

```json
{
  "ground": {
    "intent": "The outcome this phase serves",
    "sources": [{"ref": "source", "finding": "Relevant fact or constraint"}]
  },
  "rumen": [{"rule": "rule identity from the packet", "disposition": "addressed", "evidence": "How this phase accounts for it"}],
  "next": [{"job": "configured successor", "brief": "Usable input for that successor", "requires": ["output:current-job"]}]
}
```

Ground references resolve to the task's `source`, allowed received `output:<job>`, worktree-relative `file:<path>`, or declared `input:<id>`. The engine validates actual availability and material identity, retaining fingerprints and producer findings. A file reference cannot escape the worktree through traversal or a symlink; external material needs an explicit project input. Software planning and makers must ground in an actual repository file when the repository has tracked source. These checks establish material identity and accounting, not automated proof of semantic comprehension.

Rumen uses the existing project gates as mechanical fences and conventions as judgment constraints. Optional typed `project.rumen` guidance adds judgment, taste and vocabulary without another registry. Every selected rule is accounted for exactly once in the output. A mechanical fence is carried to engine-owned verification; a worker cannot award itself a passing gate. Taste is considered and explained, not turned into a deterministic ban.

Each next configured consumer gets a nonempty brief and resolvable required references. Planning prepares both independent makers; each maker prepares verification. A terminal producer explicitly returns an empty next list. Discovery prepares the next discovery function, and its last function prepares delivery. A blocked return does not fabricate readiness or require a completed preparation claim; existing partial-work preservation remains in force.

Acceptance saves the phase's organ receipt, source identities, rule definitions, outgoing preparations and output fingerprint atomically with the output/transition. The receiver gets only its own applicable handoff and permitted receipts. The implementation/check-author split remains blind. Required material is rechecked in the receiver's prepared environment before execution; stale material returns through the existing NQ/hold path. Receipts remain durable after worker/worktree disposal and are tied to the actual output and round.

Trusted command nodes meet the same output contract. Engine-owned groups derive preparation from accepted children; engine verification derives its receipt from real candidate/check/gate results. No new mandatory agent or delivery phase is introduced.

Mechanical gate evidence records stable rule identity, definition identity, matched files and actual expanded command separately. No-match is explicit not-applicable evidence, not a successful execution. Missing evidence is unverified. Gate summaries must not compare an unexpanded template with a substituted command and falsely mark verified work incomplete.

## Verification

Independent acceptance covers missing preparation, invalid/missing/stale sources, rule accounting, successor completeness, durable atomic receipts, restart, same-task identity, private-maker isolation, command/group coverage, default CLI/API pinning, and gate applicability/identity. Use disposable real repositories/stores and scripted workers; run affected checks only. A separate real inference demonstration evaluates usable handoffs without claiming that a scripted worker proves model judgment.

DX: one explicit producer contract and usable errors; UX: explainable Ground/Rumen/readiness completion; AX: prepared inputs and constraints travel automatically with the task. Cost: compact required output fields and retained fingerprints. All three are expected gains; acceptance evidence determines delivered scope.

Independent verification checks leave tracked candidate material and HEAD unchanged after each command. Their staged check files form the expected baseline; ignored/untracked build output is allowed. Product-changing builds run as project gates before the candidate commit. A changed candidate records a failing `candidate-integrity` result and cannot ship.

Gate applicability includes staged deletions. A captured deletion that is physically absent carries `deleted:true`, distinct from an unreadable source. File-argument gates receive surviving matched paths only and explicitly record non-applicability when none survive; whole-project gates still execute for deletion-only changes.

Historical standing-context facts resolve private maker provenance through retained source, previous-fact and revocation references before visibility or mutation checks. Missing, unrecognized or conflicting lineage is withheld from makers. Read-time inference never rewrites the saved events.
