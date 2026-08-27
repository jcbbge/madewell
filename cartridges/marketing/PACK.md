# Made Well — Marketing Pack
**Version:** 1.0
**Domain:** Marketing — positioning, message, channel, measurement

---

## How to activate

```
Read .madewell/AGENTS.md and <cartridge-library>/marketing/PACK.md. Let's get started.
```

Cartridges are loaded **by reference**. They are not copied into the project by the
installer. All paths below are relative to this cartridge's directory.

---

## Persona — this pack carries the marketing registers

Loading this pack fills the kernel's **Persona slot** with `persona.md`. Two insertion points:

- **Owner** — holds the brand and the positioning. Sets the line; the agent argues with them.
- **Contributor** — a writer, designer or agency folded in. Runs `onboarding.md` once, then
  works inside the positioning rather than relitigating it.

---

## What this pack is

An LLM can write copy. That was never the hard part.

The hard part is everything upstream of the copy: who this is actually for, what they
believe today, what would have to change, and what proof would change it. Skip that and you
get fluent, confident, well-formatted words that argue a case nobody asked about.

This pack makes those things non-skippable — not as a checklist, as questions asked at the
moment they are cheapest to answer.

**The goal is marketing that is true.** Not clever. True — a claim you can source, made to a
person who exists, at a moment they care.

---

## The foundation and the four pillars

Everything rests on **positioning**, decided before a single asset is made. A pillar governs
its domain on every piece of work; the agent engages it by act, not on request.

| Tier | Name | What it owns / the question | Where |
|---|---|---|---|
| **Foundation** | **Positioning** | Who it's for, what it replaces, why it wins — *settled before anything is made* | `foundation/positioning.md` |
| **Pillar** | **Audience** | Who they are and what they believe now — *is this a real person or a composite we invented?* | `pillars/audience.md` |
| **Pillar** | **Message** | The claim and its proof — *can we source this, or are we asserting it?* | `pillars/message.md` |
| **Pillar** | **Channel** | Where it goes and what that medium demands — *does the form fit, or did we stretch it?* | `pillars/channel.md` |
| **Pillar** | **Measurement** | Whether it moved anything — *could this have failed, and would we know?* | `pillars/measurement.md` |

The most expensive mistake in marketing is producing across the pillars before the
positioning is settled: every asset then argues a slightly different case, and the
incoherence is invisible from inside any single one of them.

---

## The things that get skipped

- **Positioning assumed, never written** → every asset argues a slightly different company
- **A persona nobody validated** → copy that delights the team and lands nowhere
- **No anti-audience** → messaging tries to include everyone and moves no one
- **Channel picked before message** → a thirty-second idea stretched into a whitepaper
- **Proof asserted, not sourced** → a claim a customer or a lawyer can puncture
- **Voice undefined** → five assets that sound like five different companies
- **No baseline captured before launch** → "it worked" becomes unfalsifiable
- **The objection never named** → the strongest reason not to buy goes unanswered, so it wins

---

## Skills

| Skill | File | When |
|---|---|---|
| **Message test** | `skills/message-test.md` | Before any claim ships. Find who would dispute it; source it or soften it. |

---

## Piece additions for marketing

On top of the kernel floor (Making / Not making / Done when / Waits on), a marketing piece
carries:

```markdown
**For:** the specific person, not the segment
**They believe now:** …
**They must believe:** …
**Proof:** the source, named — data, customer words, or a demonstrable fact
**Strongest objection:** … and how this answers it
```

If **Proof** is empty, the piece is not ready for the bench. An unsourced claim is a guess
with good typography.

---

## The marketing rubric

Before anything ships, on top of the kernel's *craft, beauty and care*:

> **Is this true, to a person who exists, at a moment they care?**

If any of the three is no, it is the wrong asset — however good the writing is.
