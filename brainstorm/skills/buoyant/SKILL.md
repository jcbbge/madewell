---
name: buoyant
description: Identify model-shaped scaffolding and stale artifacts, then name what can be removed now or after an observable capability change. Use as /buoyant, on "is it buoyant?", after an implementation diff, or for an explicit repository hygiene pass. Preserve load-bearing guarantees; a better model does not authorize deleting safeguards or someone else's work.
---

# Buoyant

Buoyant work can shed scaffolding when its reason for existing disappears. The audit is a concrete disposition list, not an essay about simplicity.

## Distinguish ballast from the hull

For each candidate, identify the file or mechanism, why it exists today, what depends on it, and what would fail without it.

Two piles for genuinely model-shaped work:
- **Tide:** better model capability may improve the outcome without changing this structure. Leave it; do not promise that an unspecified future model will improve it.
- **Compensation:** a layer, instruction, duplicate artifact, or workaround exists to cover a specific current limitation. Name the evidence that would make it removable.

Intrinsic requirements are not either kind of model debt. Access control, durable state, recovery, privacy, auditability, and useful human explanations can remain necessary regardless of model capability. Do not delete a guarantee because the new model seems more obedient, confident, or fluent.

## Cut — this implementation's diff

Inspect what was actually added or changed: helper layers, speculative branches, repeated instructions, duplicate documents, and temporary plans or notes. Follow the relevant caller or consumer before calling something dead. Lack of a reference in one search is not always proof of non-use.

For compensation, specify **current necessity → observable removal condition → exact deletion or replacement scope**. "When models get better" and a future version number are not removal conditions. A relevant held-out behavior check, integration result, or eliminated dependency can be one; the external contract must still hold.

A bounded example: a schema-expansion helper can become removable when the intended model reliably consumes the compact schema on the relevant success and failure cases, and direct callers pass their integration checks without expansion. That does not imply deleting unrelated validation.

Prefer deletion to a more sophisticated wrapper when the wrapper's job is no longer needed. Do not mark necessary unfamiliar code as compensation merely because you cannot immediately explain it; inspect or say UNKNOWN.

## Corpus — the repository

Only use repository scope when requested. Inspect docs, notes, plans, internal glue, and source in relation to their consumers. Find an actual removable weight; do not infer bloat from size, age, or aesthetic dislike.

Recommend or perform a bounded authorized cleanup, then verify the directly affected behavior and references. Do not start a wholesale rewrite. Deleting user data, another person's work, or a required safeguard remains subject to the existing approval boundary. An audit request alone is not permission for destructive cleanup.

## Output

- **Delete now:** only targets whose removal conditions are already evidenced and whose deletion is authorized. Give that evidence and the focused verification; do not claim a proposed deletion has happened.
- **Comes off when:** any target with an unmet or unverified removal condition. Name the present limitation, observable capability/dependency trigger, and exact scope. Never put a conditional future removal under “Delete now.”
- **Tide / leave:** what benefits from capability improvement without surgery, and anything inspected that is actually load-bearing rather than model debt.

Use the existing local comment, test, or work record for a needed removal condition. Do not introduce a second debt ledger, automatic deletion service, or new framework to track a small amount of scaffolding. An empty delete list is a valid result when nothing inspected qualifies.

**Take weight off the boat without mistaking the hull for ballast.**
