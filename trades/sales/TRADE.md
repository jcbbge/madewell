# Made Well — The Sales Trade
**Version:** 1.0
**Domain:** Sales — qualification, discovery, proposal, close, handoff

---

## How to activate

```
Read .madewell/AGENTS.md and <trade-library>/sales/TRADE.md. Let's get started.
```

Trades are loaded **by reference**. They are not copied into the project by the
installer. All paths below are relative to this trade's directory.

---

## Persona — this trade carries the sales registers

Loading this trade fills the kernel's **Persona slot** with `persona.md`:

- **Owner** — carries the number and the relationships. Sets what we will and will not sell.
- **Contributor** — a rep, an SE, or a partner working deals inside someone else's book. Runs
  `onboarding.md` once, then works inside the qualification bar rather than around it.

---

## What this trade is

An LLM can write a follow-up email. That was never the hard part.

The hard part is knowing whether the deal is real, what it is actually worth to them, who
signs, and what happens after they say yes. Skip that and you get a fluent, responsive,
well-organised pipeline full of deals that will never close, and nobody can tell which ones
until the quarter ends.

This trade makes those things non-skippable. Not as a CRM field to fill in — as questions
asked at the moment they are cheapest to ask, which is early.

**The goal is a pipeline you can believe.** Fewer deals, correctly understood, beats more
deals held hopefully.

---

## The foundation and the four pillars

Everything rests on **qualification**, decided before real effort is spent.

| Tier | Name | What it owns / the question | Where |
|---|---|---|---|
| **Foundation** | **Qualification** | Is this real, and is it ours? — *settled before effort* | `foundation/qualification.md` |
| **Pillar** | **Discovery** | What is broken, for whom, costing what — *quantified, or assumed?* | `pillars/discovery.md` |
| **Pillar** | **Proposal** | The shape of the offer — *an argument, or a price list?* | `pillars/proposal.md` |
| **Pillar** | **Close** | Decision path and blockers — *do we know how they buy?* | `pillars/close.md` |
| **Pillar** | **Handoff** | What delivery inherits — *does the customer have to repeat themselves?* | `pillars/handoff.md` |

The most expensive mistake in sales is effort spent across the pillars before qualification is
honest. The second is treating handoff as an afterthought — the place where everything learned
in the deal quietly evaporates.

---

## The things that get skipped

- **Qualification skipped because the logo is exciting** → a quarter spent on a deal that was
  never real
- **Pain assumed, never quantified** → no urgency; the deal dies of natural causes and nobody
  can say when
- **Talking to a champion, never a decider** → surprise at the end, every time
- **A proposal that is a price list** → the customer compares on price, because you gave them
  nothing else to compare on
- **The decision process never mapped** → "we're just waiting to hear back", indefinitely
- **Next step not booked in the room** → the deal cools between calls and re-warming costs
  more than the call did
- **Handoff as a document dump** → delivery rediscovers everything, the customer repeats
  themselves, trust spent on day one
- **A loss never examined** → the same deal is lost again next quarter

---

## Skills

| Skill | File | When |
|---|---|---|
| **Deal review** | `skills/deal-review.md` | Before forecasting, and before any proposal. Adversarial: what kills this? |

---

## Piece additions for sales

On top of the kernel floor (Making / Not making / Done when / Waits on):

```markdown
**Their problem, in their words:** …
**Cost of the status quo:** a number, or `UNQUANTIFIED`
**Who signs:** name and role — not "the team"
**How they buy:** the steps between yes and signature
**What kills this:** the single most likely failure
```

`UNQUANTIFIED` cost or an unnamed signer means the piece stays on the rack. Those are not
details to fill in later — they are the reasons deals die.

---

## The sales rubric

On top of the kernel's *craft, beauty and care*:

> **Would this customer be glad, a year from now, that we sold this to them?**

If no, it is the wrong deal — however good the quarter looks.
