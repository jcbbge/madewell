# Compiled conventions — shape

A **conventions** file is what falls out when sources (a style guide, a lint rule, a
blog, a correction, a trade) are sorted into Made Well's honesty tiers. You feed
sources through `skills/abstraction-builder.md`. You do not hand-author this format
from nothing.

The Jig is the host's quality stop. Conventions are the meal. The kernel does not
ship opinions about color or schema; a trade or this project does.

---

## The file

```jsonc
{
  "domain": "frontend",
  "sources": ["… what was fed …"],
  "fences":  [ /* decidable — the consensus floor */ ],
  "rubrics": [ /* stated intent, assessed at the decision */ ],
  "signs":   [ /* taste — surfaced, not decided */ ],
  "names":   { /* what this project calls things */ }
}
```

Instance files live in `.madewell/jig/conventions/` (seeded, never clobbered by re-sync).
A trade may carry conventions as the diet until this repo compiles its own.

---

## Honesty tiers (`PORTABILITY.md`)

Ask first: **can a program return true/false on whether this is violated?**

| If | Then | Label when bound |
|---|---|---|
| Yes, and expensive when missed, and stable | a **fence**. Wire it → it is a **jig** in `registry.json` | **FENCE** |
| Yes, but cheap / rare / still churning | a **sign**, or drop | **SIGN** or drop |
| No, but intent can be a rubric | a **rubric** — assess output against it before proposing | **SIGN** |
| Taste / the three questions / the Rubric | a **sign** — the person's | **DOCTRINE** |
| A house name | **names** | dictionary |

A fence with no detector is **UNJIGGED**. Say so. Do not pretend a markdown rule is a jig.

**Warn → block.** A newly wired jig reports until live violations are cleared, then it
refuses.

---

## Merge

| Situation | Resolution |
|---|---|
| Two sources **agree** on a decidable rule | one fence |
| Two sources **disagree** on a decidable rule | you pick |
| Two sources **disagree** on taste | both survive as rubrics/signs |
| Intent, not decidable | rubric |
| Pure taste | sign, to the person |

---

## Shop-made, and taking them down

**Make a jig** when the cost of the recurring correction crosses the cost of building
the stop. Not a count — a price. Expensive misses can become a jig after two hits.
Never auto-build: a mined pattern may be an accident.

**Take a jig down** when keeping it costs more than the tax it still prevents (false
positives, churn). Relax, watch. If the violation comes back, restore it. If nothing
comes back, it comes down. Making jigs without taking them down is a pile.

The substrate is `corrections.jsonl` (proposed − accepted) and `firings.jsonl` (jig
runs). Schema: `CORRECTIONS.md`. The reading: `bin/mw-tax.sh`. Math: `metabolism/`.
Git log is the commit, not the differential. Fixture 6/6 is not a reading of this shop.
