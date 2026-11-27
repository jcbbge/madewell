---
name: right-side-of-the-curve
description: Find the smallest sufficient mechanism by changing the representation or removing machinery while preserving the outcome and its guarantees. Use in brainstorming to find an enabling simplification, or in architecture and tool selection when layers accumulate. Minimize total operating burden, not ambition; use nonconvergence when the generating premise needs to change.
---

# Right Side of the Curve

Do not start with "simple is better." Start with what the work must accomplish, including the conditions under which it must still work. Reach the mechanism that makes the outcome possible with the least unnecessary burden.

## Look for enabling compression

Do not only trim the existing design. Look for a representation, shared primitive, or changed arrangement that makes several compensating steps unnecessary. Explain which dependency disappears and which capability survives or becomes possible. “Use one system” is not a mechanism until it explains how the necessary distinctions, ownership, and failure handling remain intact.

Keep ambition and complexity independent: a larger useful outcome can sometimes require less machinery. Conversely, a small-looking solution can hide a large operating burden. In creative work, preserve a chosen medium, experience, or exploration even if a faster substitute exists.

## Preserve the contract while simplifying

- **Fix the contract.** Identify the outcome, current constraints, and required correctness, safety, recovery, and usability guarantees. In early brainstorming, use the known intent and label unsettled requirements; do not demand a complete specification to offer a provisional mechanism. Do not delete a requirement to make a solution look smaller.
- **Name the credible default.** Consider the approach a capable practitioner would ordinarily use—not a caricature engineered to lose. Include reuse of what already exists and doing nothing when they can meet the contract.
- **Make each piece pay rent.** For every proposed layer, ask: what exact failure or required capability would appear if this were absent? Remove it from the proposal when the evidence supports no needed job; an unexplained existing component is an inspection target, not proof of redundancy. If it has a job, ask whether a smaller mechanism supplies the same guarantee.
- **Count displaced complexity.** A short implementation that transfers work into manual repair, user confusion, hidden configuration, or recurring agent supervision is not necessarily simpler. Compare the complete path through use, change, failure, and recovery.
- **Test the load-bearing boundary.** Use the cheapest safe check that could show a removed piece was necessary. Inspect an actual workflow, exercise a failure case, or prototype the disputed mechanism. Do not claim irreducibility from a confident explanation alone.

Prefer local, deterministic, inspectable, and readily removable mechanisms **when they meet the same contract at lower total burden**. These are tie-breakers, not permission to discard a needed remote dependency, probabilistic capability, or durable guarantee.

For stateful work, test interruption between an external effect and its local acknowledgment or record. A local lock, checksum, or in-memory set does not by itself establish a crash-safe cross-system guarantee. Name the mechanism that actually preserves the contract, or leave that guarantee unverified.

Retain substantial machinery when its removal causes a concrete unmet requirement and no smaller supported alternative addresses it. State that reason plainly; do not add hypothetical future needs to defend the design.

Scale effort by inspecting consequential dependencies, comparing full operating paths, or exercising a disputed failure boundary—not by producing a longer deletion list. With little evidence, return a provisional simplification and what would establish it. A proposed removal is not authorization to change a live system or delete anyone’s work.

Stop when the remaining pieces have evidenced jobs and further subtraction would break the contract or needs information not currently available. "Smallest supported solution among the examined options" is honest; "globally optimal" usually is not.

Output the surviving or provisional mechanism, what it removes or enables, the decisive reason, and any material boundary that remains unverified. Do not narrate every discarded architecture or build a framework to justify not building one.

**Remove the machinery, not the guarantees.**
