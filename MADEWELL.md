# Made Well

Work has four acts. They recur at every scale. Everything else in this document
exists to keep you honest about them.

---

## The four acts

Think it through. Decide the next cut. Make it. Check it against what you expected.

| | | done when |
|---|---|---|
| **ideate** | understand what you're making, and why | you can say it in a sentence — and say what's *not* in it |
| **plan** | decide the next actionable cut | there is a next cut, and you know what it waits on |
| **implement** | make the thing | it exists and the happy path works |
| **verify** | check that it became what you imagined | someone who didn't make it says so |

These are plain verbs on purpose. **No metaphor lives here.** Everything below is
scaffolding, and scaffolding is allowed to be metaphorical, because you can throw
scaffolding away without losing the building.

---

## They recur

A chair needs legs. A leg needs a tenon. Each is its own pass through the four acts.

The **outer** pass is the whole piece — understand the commission, decide what to make
first, make it, confirm it's what was wanted. The **inner** pass is one component. Same
four acts, one depth down. It nests as deep as the work goes, and no deeper.

**There is no second vocabulary for the outer pass.** Discovery, commit, build, land were
only ever the four acts at the top wearing different clothes. Four words, not eight.

---

## Ground and the Jig

Two practices. Both exist for one failure, and it isn't getting things wrong. It is
**re-deciding something that was already decided.**

### Ground — covers ideate and plan

In etching, the *ground* is the acid-resist you lay on the plate before you cut a single
line. No mark before the ground is laid.

Here it means: make the existing decisions present before you design anything. What is
already built, already named, already ruled on. The dominant failure in this work is not
choosing wrong — it is **never thinking to look.**

**The protocol is `.madewell/ground/`.** Protocol, picture, roots. A paragraph is not a
substitute for it.

### The Jig — covers implement and verify

A jig makes the wrong cut physically impossible. Not advice. Not a warning. A stop.

Tests tell you whether a thing *works*. A jig tells you whether you **re-decided**
something. Perfect CSS that reinvents a design system you already built passes every
test and is still wrong. No correctness gate can see that failure; a jig can.

**Shop-made jigs.** You build a jig after making the same mistake twice. Every shop fills
up with them, and each one is a fossilized correction. That is how the wall gets built:
corrections accumulate, the recurring expensive ones become stops, and stops that stop
earning their place come down.

**The instrument is `.madewell/jig/`.** Compiled conventions, a registry of wired jigs,
honesty tiers (FENCE / SIGN / DOCTRINE). Install wires `mw-gate.sh` and `mw-jigs.sh` on
pre-commit, `mw-record.sh` on post-commit. Whether to promote or drop is
`bin/mw-tax.sh` on the live ledgers — not the synthetic harness.

---

## Three states

Material has three states and no others.

- **stock** — what you have, uncut. Grows without limit. That is correct, not a backlog.
- **on the bench** — what you are working. One pair of hands per piece.
- **finished** — proofed, and off the bench.

There is no admission gate. You take stock to the bench. **Nothing is rejected** — it is
just still on the rack.

---

## The shop

**Four hands minimum. Six at most.**

Four, because the acts must not collapse into each other. Whoever imagined it should not
be the one who proves it worked. Whoever cut it should not be the one who signs it off.
**You don't proof your own plate.** One pair of hands doing all four grades its own work,
and when that fails, the failure gets blamed on the material.

Six at most, because past that the coordination costs more than the work.

---

## The grain

You plan the cut. Then the material tells you what it will and won't do, and you adjust.

You have a destination. You do not have a route. The next cut is chosen by whoever is
steering, whatever is most urgent, and what the material turns out to be. **That is not a
planning failure. It is the condition.**

So this is built for **cheap correction**, not for plan adherence — short cuts, small
pieces, nothing half-made for six weeks. You can read grain on a short cut and recover.
You cannot on a long one.

The hand on the work is yours. Bookkeeping should cost you nothing; judgment is never
automated, never auto-approved, and never treated as a delay.

---

## Trades

The shop is the same whether you are a joiner or a bookbinder — the same bench, the same
rack, the same rule about not proofing your own work. What differs is the **trade**.

A trade is a set of grounds and jigs for a kind of work: what has to be right before anything
else, the areas every job passes through, what gets skipped when people are busy, and the one
question asked before anything ships. You load the one for the work in front of you.

A trade may **add** operations at any edge — before ideate, between plan and implement, after
verify. It may never **replace** one of the four. Adding is composition. Replacing is a
different framework wearing this one's name.

---

## The rubric

One question, asked of anything before it finishes:

> **Does this lead to craft, beauty, and care?**

If the answer is no, it is the wrong move — and it does not matter that it works, that it was
faster, or that nobody will notice. People notice everything; they just cannot always say
what they noticed. That question is what "made well" means, and it is why the framework is
called that.

---

## The three questions

The rubric asks whether a finished thing is good. These ask whether a **decision** is
pointing the right way, and they are asked at every fork — which design, which word, which of
two ways to build it.

**1 · Does this lead toward something ten times better to use?**

Not a bit better. Ten times. Something marginally better rarely repays what it costs in
complication, and that cost is always paid later, by someone who did not make the choice.

**2 · Does this point toward something someone would remember, or love?**

Forgettable is a failure state. Correct and joyless is still a miss. If nobody would mention
it to another person, it did not land — and *why* it would not land is almost always knowable
before you build it.

**3 · Does this get us closer to being as easy for an agent as it is for a person?**

There are always two users. Something a person loves and an agent stumbles over is half
built, and so is the reverse. Ask both, every time.

**These are directions, not measurements.** You cannot score them, and you should not try —
a number here would be invented, and an invented number is worse than an honest judgement.
What you can always do is say which of two options points further along each one. That is
enough to decide with, and it is harder to game than a metric.

When none of the options points anywhere good, that is the finding. Say so rather than
picking the least bad one quietly.

---

## Forbidden

**No rewind.** Work moves one direction. A failed proof does not send the piece
backward — it stays on the bench and you cut again. Attempts accumulate; position does
not move until it passes.

**No self-proofing.** Restated, because it is the one people skip.

**No silent pass.** If a stop is missing, say the stop is missing. A rule with no jig
behind it is a preference, and it should be labelled one.
