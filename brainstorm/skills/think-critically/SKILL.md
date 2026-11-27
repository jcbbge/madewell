---
name: think-critically
description: Resolve architecture, technology, and implementation choices using explicit constraints, evidence, material tradeoffs, and discriminating tests. Use for "which approach", "think critically", or a consequential design decision. Recommend and own ordinary delegated choices rather than ending with a clarification interview; preserve decisions and permissions reserved to the user.
metadata:
  version: "1.1"
  tags: thinking, decision-making, architecture, tradeoffs
---

# Think Critically

Turn tradeoffs into a justified choice. Listing options and asking the user to decide is not sufficient when the task already delegates the decision.

## Ground the decision

Identify the intended outcome, non-negotiable requirements, existing architecture and conventions, and the relevant evidence. Distinguish facts, assumptions, and preferences. Inspect what is available before requesting clarification.

Consider genuinely different feasible approaches, including reuse, a smaller change, or no change. Do not manufacture alternatives when one meets the contract and the others plainly do not. A binding safety, privacy, or correctness requirement is not a low-weight preference that a score can average away.

## Compare the consequences that matter

Evaluate the applicable lenses:
- **Developer:** understanding, change, testing, diagnosis, integration, and recurring maintenance.
- **User:** intended outcome, clarity, responsiveness, accessibility, confidence, and recovery.
- **Agent:** discoverable capability, inspectable state, authorized operation, verifiable results, and recovery without guessing.

Use the user's stated priorities to resolve conflicts. Do not invent universal weights, precise forecasts, or a preference hierarchy. Show who benefits, who bears the cost, and whether the cost repeats. Compare the full operating path, not merely implementation size or an attractive demo.

Prefer a supported option that improves one dimension without materially worsening the others. When none dominates, state the decisive tradeoff. An option that works across plausible assumptions may be preferable to one that wins only under an unverified condition.

## Spend information where it changes action

Identify the uncertain fact that could reverse the recommendation. Use a small safe observation or prototype when it can settle that fact. If reasonable answers imply the same next action, take or recommend that action without resolving every uncertainty first.

For a reversible tie, favor the lower recurring burden and cheaper correction, provided the required guarantees remain intact. Reversal is not cheap if the user must discover the error, reconstruct context, or clean up after it. Do not treat a local flag, a lock, or a confident explanation as evidence of a cross-system guarantee; inspect the actual failure and retry path.

Ask only for a material preference, unavailable fact, or permission genuinely reserved to the user and not responsibly settled by evidence or the existing rubric. Isolate that question and explain what its answer changes. Approval boundaries remain binding even when the technical choice is obvious.

## Commit to the supported next move

Give the recommendation, its decisive reason, the material tradeoff, and the evidence or next check. If implementation is already authorized, continue with it rather than appending "shall I proceed?" A request for analysis alone does not authorize execution or broaden the task.

Name what would cause you to revisit the choice. Stop analyzing when further comparison is unlikely to change the justified next action. Do not use confidence, elaborate scoring, or hypothetical expert agreement as proof that the choice is correct.

**Resolve what was delegated. Escalate only what was not.**
