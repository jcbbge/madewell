# Made Well — Portability & the Host ABI

**Version:** 1 (draft)
**Date:** 2026-08-16
**Status:** Normative companion to `SPEC.md`. Where this document and SPEC.md
disagree on storage or enforcement, SPEC.md wins; on portability semantics,
this document wins.

The key words MUST, SHOULD, MAY are per RFC 2119.

---

## 1. What Made Well is, ontologically

Made Well is not a program. Stripped to identity, it is five kinds of
declaration, none of which names a runtime:

| Kind | Examples |
|---|---|
| **vocabulary** | the lexicon: loop names, beats, stage/phase/Cycle/queue/door/wall |
| **state machines** | the loops — states and legal transitions (discover→commit→build→land; imagine→plan→make→verify) |
| **predicates** | the laws — `author(criteria) ≠ author(implementation)` · `partial ≠ success` · `no stop while holding a live claim` |
| **roles** | profiles with obligations, never providers or models |
| **rubrics** | judgment procedures with stated tie-breaks |

**Made Well is the rules of a game. Any runtime is one table.** Chess is
portable across carved wood, postal mail, and silicon because its rules are
expressed over an abstract state space — positions and legal moves — never
over any particular table. So here.

## 2. The three layers (never conflate them)

1. **Declarations** — the portable soul (§1). Runtime-free by construction.
2. **Serialization** — the wire format. Made Well travels as **plain text
   files in a git repository** (SPEC.md Rules 1–2): diffable, reviewable,
   signable, clonable, readable by a human with no tooling at all. Files
   are how Made Well *travels*, not what it *is* — a score is not the music.
3. **Binding** — per-host compilation. A digestion step (in tup terms: the
   mint) compiles the declarations into whatever enforcement forms *this*
   host offers: repo doors, CI checks, branch protections, hooks, or a
   laminated checklist on a shop wall.

**You port hosts, never Made Well itself.** No future rewrite (Rust or otherwise)
touches Made Well itself; only tables get rebuilt.

## 3. The Host ABI — five ontological commitments

A host CAN run Made Well iff it offers:

1. **Durable state** — loop position survives any process.
2. **Typed transitions** — state changes by legal moves, not free edits.
3. **Authorship identity** — who wrote the criteria vs who wrote the
   implementation is knowable.
4. **A pre-action refusal point** — somewhere a door can say no *before*,
   not audit after.
5. **An append-only record** — done work is history, not opinion.

A git repository alone satisfies 1, 2 (via doors), 3, 5, and hosts 4 in the
door scripts — which is why the reference instance needs nothing else, and
why **file-based convention is the distribution, as-is**.

## 4. Enforcement tiers and the honesty rule

Hosts differ in what commitment 4 can enforce. Compilation MUST target the
strongest tier the host offers, and the instance MUST label what each law
actually achieved *on this host*:

| Tier | Meaning |
|---|---|
| **FENCE** | mechanically refused before the act |
| **SIGN** | rendered at the decision point, not enforced |
| **DOCTRINE** | stated only — an honest label, not a rule to remember harder |

Degradation is permitted; **lying about degradation is not.** A law with no
named enforcer wears its tier label explicitly.

## 5. Worked ports (informative)

- **Bare git repo + `mw` (reference):** all five commitments; doors = FENCE.
- **GitHub alone:** issues/PR states (1, 2) · CODEOWNERS + review identity
  (3) · protected branches + required checks (4 → criteria-before-code as
  review rules, the verify beat as CI, the commit gate as branch
  protection) · git log (5). Weaker fences, same law.
- **A human team with index cards:** 1, 2, 3, 5 on paper; 4 is social →
  Made Well runs at SIGN tier, honestly labelled.
- **The tup runtime:** all five at full strength (durable objects, typed
  deposits, spawn-door identity, lockouts, hash-chained events); Made Well
  is tup's first pack, and its clean extraction from tup is a standing
  conformance test in both directions.

## 6. Conformance

A claimed host implementation passes when: (a) it satisfies the five
commitments or explicitly declares which it lacks; (b) every compiled law
carries its tier label; (c) an instance authored on the reference host runs
on it, and vice versa, with identical ledger semantics per SPEC.md §9.
