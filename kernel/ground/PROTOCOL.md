# Ground — protocol

Contact on **ideate** and **plan**. Not a skill. Not optional. Not a slash command.
The file you may skip is the file you will skip — this is the pipe.

**Skip only:** pure conversation; a trivial mechanical edit to a file already in this
context; work already grounded earlier this same session.

---

## Rule

**No plan, no floor, no brief, no edit until the existing decisions are present.**

A claim about how this system behaves is not a fact until a lookup *this session*
produced the evidence. Imagined code gives zero feedback — a fabricated claim looks
identical to a grounded one.

This protocol **gathers only**. It does not branch, edit, or commit. Branching is a
write to git. Grounding is safe anywhere because it touches nothing.

**Grounding is non-negotiable. Only the mechanism is tiered.** Own-context is the
default. Other hands are the exception, triggered only by size.

---

## Why own-context is the default

If grounding always meant extra readers, a wave of five streams would add a dozen
people who only read. A rule that expensive gets skipped. A cheaper rule that is
actually obeyed beats a thorough rule nobody runs.

The hands that will *cut* are the ones best placed to notice when a fact is wrong.
Delegated sweeps transcribe. Own-context questions.

Escalate only when one sitting cannot cover the sweep *and still leave room to act* —
a whole-corpus audit, a multi-stream wave. Never as the normal case. Never unsupervised
inner fan-out.

---

## When

First move for:

- a new feature, a bugfix, any change to the material
- entry to ideate (before a piece is named onto the rack)
- entry to plan (before the floor is written — `skills/bench.md` assumes this already ran)
- before any handoff that claims what exists

---

## The protocol

Read `.madewell/ground/ROOTS.md` first. That file is *this project's* list of where to
look. Kernel roots below are the floor; ROOTS may add, never subtract.

### Step 0 — Pre-flight the paths

Make absence loud. Confirm every path you are about to read actually exists, so a miss
is **`NO EXISTING IMPLEMENTATION — net new`**, never filled from memory.

From the project root, confirm what this sitting actually has (adapt; do not invent trees):

```sh
ls -d .madewell docs 2>/dev/null
ls .madewell/stock .madewell/bench .madewell/finished 2>/dev/null
ls .madewell/DECISIONS.md .madewell/PRODUCT.md AGENTS.md MADEWELL.md 2>/dev/null
ls .madewell/ground .madewell/jig 2>/dev/null
```

Then confirm each path named in `ROOTS.md`.

Pull the nouns from the task (entities, files, surfaces it names). Those nouns are the
search terms for both halves below. For each noun that is a *value* rather than a
surface, name the system that owns it — ours, or someone else's (`ROOTS.md`
§ *Systems of record we do not own*).

---

### Step 1 — Own context (DEFAULT)

Do both halves yourself, in this sitting, before a plan, floor, or brief.

**Half A — Corpus ("everything on the table").**

Inventory every doc, spec, plan, idea, decision, and open question relevant to the
task, using `ROOTS.md`. Kernel floor:

| Root | What it is |
|---|---|
| `.madewell/DECISIONS.md` | locked decisions |
| `.madewell/PRODUCT.md` | identity |
| `.madewell/stock/`, `bench/`, `finished/` | work already named |
| `.madewell/jig/` | compiled conventions and wired jigs |
| `AGENTS.md`, `MADEWELL.md`, `SPEC.md` | law |
| `docs/` if present | project specs, decisions, runbooks |
| loaded trade | domain law |
| discovery / stock the task names | intake already on the rack |

Produce the corpus half of the picture — shape in `PICTURE.md`.

Every decision cited file:line. Not from memory.

**Half B — The material ("the one true source of truth").**

Ground the task in what actually exists (code, or the trade's artifacts). Locate
surfaces with exact search (`rg`) or meaning-search (`colgrep`); confirm top hits
with a direct read.

**The truth is not always ours.** For every value the task names, say which system
owns it before you ground it. Some values are authoritative in a system we do not
control — a CRM property definition, a vendor's schema, a payment processor's enum.
For those, our code is a *mirror*, and reading the mirror answers a different
question than the one asked. Read the owner, or record `OWNER: <system> — NOT READ`
and treat every claim about that value as unverified.

The failure this prevents is specific and observed: two independent readings of one
artifact each built a headline finding on an enum whose values live in an external
CRM. Neither looked. Both were grounded — against the wrong source. This is the
premature-binding law at ground level: the transcript is a bound value, the owning
system's property is the pointer.

Produce the material half of the picture — shape in `PICTURE.md`.

A search that returns nothing must say **`NO EXISTING IMPLEMENTATION — net new`**.

One pass, both halves. Every claim needs a file:line or an exact command output
from this sitting.

---

### Step 2 — Other hands only when one sitting cannot cover it

Size judgment only: the sweep is larger than one context can ground and still leave
room to act.

Split the same two halves across other hands. Same done-when. Same file:line
discipline. Do not invent a second protocol for them.

---

### Step 3 — Synthesize

Lay the two halves against each other. Produce the synthesis section of `PICTURE.md`.

**Stop and present.** Ground ends at a decision-ready picture. It does not start the
work. It does not write the floor. `skills/bench.md` is next, after.

---

## Hard rules

1. **Read-only.** Never branch, edit, write, or commit inside grounding.
2. **Own-context is the default.** Other hands are the sole exception, size-triggered.
3. **Pre-flight the paths first.** An unverified path makes absence silent.
4. **Make misses loud.** `NO EXISTING IMPLEMENTATION — net new`.
5. **Every behavioral claim carries a file:line.** This sitting, not prior.
6. **Name the owner before reading the mirror.** A value authoritative in a system we
   do not control is grounded only by reading that system, or by recording
   `OWNER: <system> — NOT READ`.
7. **End at the gap, not at a plan.** Planning is the next act.

---

## In the four acts

| Act | Ground |
|---|---|
| **ideate** | Corpus + material before a piece is named onto the rack. A trade sitting may add reconstruct-purpose *after*. |
| **plan** | Already grounded; the floor is written on this picture. If the picture is stale, ground again. |
| **implement / verify** | Not Ground. That stop is **the Jig** (`.madewell/jig/`). |

A plan whose task was never grounded is a process defect.
