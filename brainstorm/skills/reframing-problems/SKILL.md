---
name: reframing-problems
description: Test whether the stated problem is a symptom, an untested constraint, or a proposed solution rather than the desired outcome. Use for stuck work, repeated failed approaches, or explicit requests to reframe. Inspect available evidence before asking questions; preserve settled goals and do not use reframing to evade a concrete authorized task.
license: MIT
metadata:
  version: "1.1"
---

# Reframing Problems

Change the question only when doing so improves the path to the user's actual outcome. A broader question is not inherently a deeper one. The original frame is a live candidate, not a strawman to defeat.

## Separate what the request contains

From the supplied context and relevant artifacts, identify:

- **Outcome:** what should become possible or different, for whom?
- **Observation:** what is actually happening?
- **Explanation:** what is assumed to cause that observation?
- **Proposed means:** what solution has already been embedded in the request?
- **Constraints:** which requirements are binding, which are uncertain, and who can change them?

Do this work yourself where the evidence permits. Do not begin with a questionnaire whose answers are already in the task. A missing fact matters only when it changes the decision; a preference expressed by the user is not a defect to reinterpret.

## Find the decision-changing distinction

Ask of the current frame: **If we solved this perfectly, would the intended outcome follow?** Name the residual obstacle if not. Conversely, could the outcome be achieved while leaving the named symptom unchanged?

These two counterfactuals expose solution-lock and proxy optimization. They do not establish a new root cause: trace the relevant observation or dependency before making that claim.

Generate only materially different frames. For each, identify what evidence it explains, what it assumes, what the first action would change, and what would make you reject it. Merge reframes that merely rename the same intervention.

A useful reframe preserves the goal while changing a causal lever. "Optimize query speed" may become "deliver the report before the meeting" when evidence locates the delay elsewhere. It must not become "accept a late report" without authority to change the requirement.

## Settle what evidence can settle

Choose the lightest discriminating observation: an end-to-end trace, a contrasting successful case, a constraint's source, or a bounded safe prototype. If all plausible frames justify the same next step, take or recommend that step without first demanding agreement on terminology.

Recommend the best-supported frame and the next action. Keep unresolved alternatives only where they imply different consequential decisions. Ask the user only for a material goal, preference, or permission that is genuinely unavailable and cannot be responsibly inferred from their instructions. Do not require them to choose among reframes merely to validate your work.

If the evidence supports the original frame, retain it. If evidence ends, stop the causal story there; do not continue asking "why" until a satisfying explanation appears. Do not relax deadlines, safety boundaries, or other binding requirements without authorization.

## Output

State the original frame, the supported distinction, the resulting frame if it changes, and the concrete next action or test. Make uncertainty explicit without printing an interview script. Skip the reframe when the user has settled the goal or a known-good fix is already available.

Load [FRAMEWORKS.md](references/FRAMEWORKS.md) only when a particular causal, constraint, or inference distinction needs deeper treatment. Use [EXAMPLES.md](references/EXAMPLES.md) only for illustrative patterns; their dialogue and outcomes are not evidence about this user or an instruction to ask every question. The evidence-first policy here governs how those examples are used.

**Reframe the means when needed. Do not quietly replace the end.**
