---
name: verify-then-write
description: Mandatory workflow for any task that writes external-reality values — specs, prices, versions, API shapes, model parameters, config values, dates, quotes. Use BEFORE editing configs, adding models, pinning versions, citing documentation, or stating any fact about a system you did not build in this session. Trigger phrases include "add model", "update config", "what version", "set the context window", "pricing", or any task where a value refers to the world outside this repo.
---

# Verify Then Write

**The rule: acquire before assert.** A value that refers to external reality
does not get written until its source has been fetched INTO THIS SESSION and
the value read from that output. No exceptions for "well-known" values —
well-known is exactly what confabulation feels like from the inside.

## Why this exists (the mechanism, not the morality)

Generation cannot distinguish memory from confabulation — there is no internal
flag. The only reliable fix is topological: put the real data in the context
window BEFORE the write happens. Once the true value is in context, it becomes
the highest-probability continuation and the guess never gets sampled.
Ordering is the enforcement. Conscience is not.

## The two categories — know which you are writing

| Category | Definition | Verification |
|---|---|---|
| **Claim** | Refers to the world outside this session: specs, prices, versions, API shapes, endpoints, dates, quotes, model params | Must have a source acquired this session |
| **Proposal** | New code/design you are inventing; the world will verify it by execution | Verified by running it — no citation needed |

The failure mode is a category error: treating a claim like a proposal.

## The checklist (in order, no skipping)

1. **Identify every claim field** in what you are about to write.
2. **Fetch the source first** — curl the API, read the file, run the command.
   The fetch is the FIRST tool call of the task, before any edit.
3. **Write only values present in the fetched output.** If a field is not in
   the source: omit it, write UNKNOWN/null, or ask. Never a plausible value.
4. **Cite inline, same message** — name the source next to each value as you
   write it (URL + date, command, file:line).
5. **Commit with a SOURCES line** (see commit-convention rule).

## Disclosure is not a substitute

"I guessed at the specs — verify them" is a trap: the caveat dies with the
session, the fabricated value persists in the file looking identical to a
verified one. Helpful-with-caveats launders guesses into permanent-looking
facts. Refuse-or-verify, never guess-and-disclose.

## Two-phase split for high-stakes work (researcher / writer)

For anything where fabrication is expensive, separate acquisition from
assertion structurally:

1. **Researcher phase** — sole deliverable is a fact sheet: every needed value
   with its source (URL/command/file:line) and the raw excerpt proving it.
   No writing to target files.
2. **Writer phase** — may ONLY use values from the fact sheet. Any needed
   value missing from the sheet goes back to phase 1 or gets marked UNKNOWN.

Run as: subagent chain (pi), two sequential prompts (Claude Code), or two
script steps (anything). The shape is the hedge, not the harness.

## The tripwire

If the user says "cite it" or "source?": show the exact source from this
session or state plainly that the value was fabricated. No third option.
