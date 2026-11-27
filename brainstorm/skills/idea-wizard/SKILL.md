---
name: idea-wizard
description: Generate a diverse pool of 30 improvement ideas, challenge their mechanisms and assumptions, and select the strongest 5 with rationale and validation steps. Explicit user counts override these defaults. Use for project improvement or a broad idea search; reward distinct incremental value, not feature volume or confident ranking.
metadata:
  version: "1.1"
  tags: ideation, brainstorming, planning
---

# Idea Wizard

Generate broadly, then make the selection earn its place. The default is a pool of **30 ideas → 5 finalists**; follow explicit requested counts instead. The pool is working material, not a required wall of output. If the evidence supports fewer defensible finalists, say so rather than padding the result.

## Ground the improvement target

Use the actual project, user journey, failures, constraints, and existing capabilities supplied or available to inspect. Distinguish observed friction from speculative opportunities. Do not interrupt for information already available, and do not pretend imagined user research has happened.

Use the developer, user, and agent perspectives where relevant: easier correct changes, better outcomes and recovery, and more reliable authorized operation. Do not impose an unrequested hierarchy between them.

## Diversify the mechanisms

Generate across the actual opportunities: remove a step, expose state, change a representation, prevent a failure, shorten a feedback loop, or reuse an existing capability. Include subtraction and doing less; "accretive" means added value, not added features.

Represent each candidate by the friction it addresses, the mechanism that changes it, its important dependency, and its main cost. Ideas differing only in labels, color, layout, or a more ambitious scale are not automatically distinct. Replace redundant candidates with a materially different move, not more emphatic wording.

Keep speculative ideas available during generation, but mark the assumption they require. With no usage evidence, label the proposed friction as a hypothesized need rather than reporting it as an observed user problem. Do not invent API capabilities, market demand, future scale, or performance numbers to make an idea viable.

## Winnow against evidence

For each serious candidate, ask:
- What observed problem or credible opportunity does it address?
- How exactly would the mechanism improve the outcome?
- What new maintenance, migration, supervision, or user burden does it create?
- What evidence would overturn the expected benefit?
- Is a smaller intervention enough?

Reject ideas that violate binding constraints or merely move the problem elsewhere. Disabling a useful capability is not a fix for its failure unless the changed contract is explicitly acceptable: removing recovery, accessibility, or protection against lost work cannot silently count as an improvement. Validate the original failure outcome, not merely adoption of the replacement feature. Rank by supported impact on the stated outcome, feasibility, recurring burden, and uncertainty—not unsupported numeric scores or the charisma of the description.

Select a useful set, not five versions of the same winner. After selecting an idea, reassess the remaining candidates' **incremental** benefit: does it already solve their problem, or is another a prerequisite? Do not count shared benefits twice. Respect dependencies when recommending implementation order.

## Deliver the finalists

For each selected idea, give:
1. The outcome it improves and the actual friction behind it.
2. The mechanism and a concrete example of how use changes.
3. Its material tradeoff or unresolved assumption.
4. The smallest safe experiment or check that could validate the benefit.
5. Why it earns its position relative to the other finalists.

Recommend which to try first; do not end by handing the ranking work back to the user. A recommendation is not permission to implement an unrequested feature. Avoid claiming that selection proves demand, correctness, or a quantified improvement. Terms such as "ultrathink" are not evidence of reasoning quality or a required runtime control.

**Explore many; retain the few whose differences and benefits survive scrutiny.**
