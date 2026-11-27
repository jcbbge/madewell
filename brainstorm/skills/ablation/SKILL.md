---
name: ablation
description: Find hidden value by removing functions in a counterfactual and tracing what breaks, when, and what gets blamed. Use for undervalued roles, contested systems, automation, succession, or an undifferentiated backlog. Distinguish legible failures from misattributed ones; delay and severity are separate dimensions. Do not actually disable a function without authorization and a safe test boundary.
metadata:
  version: "1.1"
  tags: subtractive-analysis, value-discovery, role-analysis, prioritization, misattribution, hidden-value, ablation-study
---

# Ablation

A subtractive instrument: remove a function from the explanation of a working system and trace the consequences. The distinctive question is not only **what fails**, but **where the failure is recorded and what cause people would infer**.

Prevention can leave little visible output. This method makes that output inspectable without assuming that every preventive function is valuable or every omission is hidden.

## Establish the counterfactual

Name the outcome, the current function, and the evidence that it operates. Split responsibilities only when their failure paths differ: "inventory management" may contain par levels, shortage sourcing, and attrition tracking. More rows are not automatically better.

For each removal, state what stays unchanged. If functions cannot be separated, name the coupling and analyze the smallest coherent bundle; do not pretend an impossible one-variable intervention is controlled.

The default removal is a thought experiment, historical comparison, replay, or sandbox test. This skill does not authorize disabling production controls, withdrawing support, or creating a safety exposure.

## Trace the attribution path

| Function removed | Failure and propagation | When felt | Where recorded / likely blame | Evidence or inference |
|---|---|---|---|---|

Follow the chain from omission to symptom to accounting or diagnosis. Name the particular handoff where the cause stops traveling with its cost. Distinguish:

- **Observed:** a documented omission, incident, record, or compensating action.
- **Inferred:** a plausible causal path or likely attribution, with its assumptions.
- **Unknown:** evidence does not support a timing, consequence, or blame target.

Do not invent precise delays. State the condition that triggers the damage when a clock estimate is unavailable. The event may occur on the next shift, the next renewal, or only under a shortage.

## Classify by attribution—not by the clock

**Class A: legible as its own absence.** The symptom preserves the missing function's identity. It may appear quickly or slowly; whether it actually gets repaired still depends on ownership and resources.

**Class B: misattributed or cause-erased.** The cost lands elsewhere and is read as another problem. It may appear within minutes or months. This is the hidden-value candidate: preventing the failure can be undercounted because the cost record has lost its cause.

**Unresolved attribution:** insufficient evidence to choose either class. Keep it explicit rather than forcing a dramatic Class B finding.

Attribution, latency, and consequence are independent. A fast crew error blamed on the crew can be Class B; slow calibration drift traced to a missed calibration can be Class A. Class B is not automatically more important than a visible safety-critical failure. Use attribution to discover neglected work, then use consequences, exposure, cost, and priorities to decide investment.

## Do not erase compensation

In a pure counterfactual, do not invent a heroic replacement to make the missing function harmless. In observed work, however, record real compensation: who catches the omission, what time or discretion it costs, and what else that effort displaces.

"Nothing broke" may mean the function was redundant—or that its work moved to someone else. Distinguish these explanations before concluding. Likewise, a bad outcome after removal is not enough to prove causation if demand, staffing, or other conditions changed.

Where safe and useful, compare a matched case or restoration: does returning the function change the predicted failure path? Name the observation that would weaken the claimed value.

## Turn the finding into a requirement

For a Class B candidate, identify the smallest trace that would reconnect cause and cost at the existing handoff. That might be provenance attached to an exception, a disposition reason, or a record of compensating work—not a new dashboard or a demand to log everything.

Do not jump from "hidden" to "automate." Preserve the judgment that does useful work; make its relevant consequence visible. Sometimes the right answer is removal, consolidation, clearer ownership, or no change. Attribution analysis alone does not decide that.

### Illustrative chain

Missing attrition tracking → available stock overstated → shortage discovered at use → emergency rental → cost booked as vendor expense. The candidate loss of attribution is between **shortage discovery** and **expense classification**. Test whether actual records support that chain; do not present it as an observed incident merely because the story is plausible.

## Deliver

Return the material removal rows, the Class A / Class B / unresolved split, the strongest cause-erasure or compensation path, and the observation or small trace that could verify it. Keep the findings tied to the requested role or system. A result with no hidden-value finding is valid.

**Remove the function from the model; do not remove the evidence from the explanation.**
