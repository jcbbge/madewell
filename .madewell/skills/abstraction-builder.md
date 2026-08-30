# Abstraction Builder

**Mode:** Workflow — maintenance / fold gate (not a product loop act)
**Trigger:** New artifact to absorb into Made Well — a lint rule, a blog, a correction, a
convention file, a detector, a doctrine doc, “we keep making this mistake”
**Artifacts:** A **profile** + **recommender** card; optional piece on `P/stock/` pending Lead place
**Not:** A CLI, MCP, or app. Not a harness skill.

---

## What this is

Stops **whack-a-mole**: adding rules, hooks, and markdown one at a time without sorting them.

Filter: the decidable question (`jig/CONTRACT.md`) plus placement (`EXTENDING.md` +
`PORTABILITY.md`). Honesty labels: **FENCE / SIGN / DOCTRINE**. Shop-made jig after twice.

**Feeder into the Jig.** Residue lands in `.madewell/jig/conventions/` (this project) or
`trades/<name>/jig/conventions/` (diet). Ground is `.madewell/ground/`. This skill is how
new material enters those two — not a substitute for either.

---

## Hard rules

1. **Profile before place.** No silent delete, no silent install.
2. **Label the tier you actually get.** Preference ≠ jig. UNJIGGED if there is no detector.
3. **Law is Lead-only.** Slot changes may be proposed; law mutations wait.
4. **Compile, don’t wrap.** Prefer one CI/hook on the host you already run.
5. **Shop-made.** A FENCE after the same expensive mistake twice (or Lead ratifies earlier).
6. **Contact points beat consultations.** “Optional skill” means it will be skipped.

---

## Protocol

### Step 0 — Intake

Name the artifact. One sentence: **what failure it exists to prevent.**

If it was removed or proposed for delete, recover substance first (`git show` / archive).
Deletion without this protocol is a process defect.

### Step 1 — Profile

| Field | Answer |
|---|---|
| **Problem** | Failure mode (never-looked? re-decision? taste? naming?) |
| **Audience** | Agent / human / both / CI-only |
| **Regularities** | Atomic claims (split compound docs) |
| **Already exists?** | Overlap with MADEWELL / trade / `ci/` / hooks (file:line) |
| **Live vs aspirational** | What already runs vs what is prose |
| **Cost if skipped** | Redo? Drift? Silent wrong? |

### Step 2 — Filter (tier each regularity)

For **each** claim: *Can a program return true/false on violation?*

```
convention ── decidable?
              ├─ YES + high (freq × cost) + stable ──→ FENCE (jig candidate)
              ├─ YES + cheap/rare/churning ──────────→ SIGN (or drop)
              └─ NO ─┬─ intent as rubric? ──────────→ SIGN (rubric)
                     └─ taste / novel ──────────────→ DOCTRINE → person
house names ────────────────────────────────────────→ names
```

| What you got | Host reality | Label |
|---|---|---|
| FENCE with detector/hook/CI | refused before or at push | **FENCE** |
| Rubric / optional read | rendered at the decision | **SIGN** |
| “Remember to” / taste | stated only | **DOCTRINE** / **UNJIGGED** |
| House names | dictionary | names |

### Step 3 — Recommender

```markdown
## Abstraction recommender: <name>

**Problem it solves:** …
**Tier(s):** FENCE | SIGN | DOCTRINE | names
**Honesty:** FENCE | SIGN | DOCTRINE | UNJIGGED
**Overlap:** … (or NONE — file:line)
**Recommend place:** …
**Recommend binding:** … (ci path / hook / none)
**Do not:** … (slash twin, second instrument, MCP)
**Lead decision needed:** yes/no — …
```

| Place | When |
|---|---|
| **Kernel law** | Only Lead |
| **Foundational skill** | Loop machinery / lenses |
| **Ground / Jig** | `.madewell/ground/`, `.madewell/jig/` |
| **Trade sitting / pillar / conventions** | Domain-specific |
| **Host CI / hook** | Decidable FENCE |
| **Project AGENTS / DESIGN** | Project names or project-only fence |
| **Stock only** | Not ready |
| **Drop** | Duplicate, cry-wolf, cost < noise |

### Step 4 — Place

Write the residue. Wire FENCE on the host already running. Unfinished candidates on the
rack. Never a second instrument that duplicates Ground or the Jig.

### Step 5 — Verify

Paths resolve. Install still unfolds. Every kept law names its honesty tier.

---

## Worked feed (2026-08-27)

Lab quality stop folded into Made Well names:

- Ground → `.madewell/ground/`
- The Jig → `.madewell/jig/`
- Software diet → `trades/dev/jig/conventions/`
- This skill = feeder
- `corrections.jsonl` = proposed − accepted. Contact: `proposed.json` before commit. Reading: `bin/mw-tax.sh`. Git log is not a substitute. Fixture 6/6 is not the tax.

---

## Relation

| That | Relation |
|---|---|
| `discovery.md` | Raw *work* → rack. This: raw *convention* → place. |
| `EXTENDING.md` | Slots. This is the gate before you turn a bolt. |
| `.madewell/ground/` | Stop on product work. This is the stop on *framework intake*. |
| Enforcer (trade) | Source text. This decides whether a *rule about* source text becomes a jig. |
