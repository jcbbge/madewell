# The cartridge library

The kernel does not know your industry. Everything domain-specific plugs in here.

A cartridge teaches Made Well one trade: what has to be right before anything else, which
areas every job passes through, what gets skipped when people are busy, and the one question
asked before anything ships.

Cartridges load **by reference** — they are not copied into your project by the installer.

```
Read .madewell/AGENTS.md and <path-to>/cartridges/<name>/PACK.md. Let's get started.
```

---

## What's in the box

| Cartridge | Foundation — settled first | Pillars |
|---|---|---|
| **[dev](dev/)** | System boundaries | Backend · Frontend · API · CI/CD |
| **[marketing](marketing/)** | Positioning | Audience · Message · Channel · Measurement |
| **[sales](sales/)** | Qualification | Discovery · Proposal · Close · Handoff |

Three trades, one shape. That is the claim the library exists to demonstrate: the four acts
are not a software process with other domains bolted on afterwards.

---

## Yours isn't here

**Then don't write one from a template — have the concierge build it with you.**

```
Read .madewell/AGENTS.md. I want to adopt Made Well. Run adopt.
```

It runs `.madewell/skills/adopt.md`: a conversation, not a form. It asks what you actually do
all day, has you walk through one job start to finish, and names the four acts back to you in
**your** vocabulary before it uses any of its own. Then it asks the three questions that
produce a cartridge —

- *What has to be right first, or everything after it is wrong?* → your foundation
- *What does every job touch?* → your pillars
- *What gets skipped when it's busy, and what does that cost you later?* → your jigs

— writes the cartridge in front of you, and puts one real piece of your work on the bench
before you leave. One sitting.

Every line in a good cartridge is traceable to something its owner said. If you cannot point
at the sentence it came from, cut it.

---

## Anatomy

```
cartridges/<name>/
  PACK.md               the manifest — activation, foundation + pillars, the skips, the rubric
  persona.md            the registers this pack carries (fills the kernel's Persona slot)
  foundation/<x>.md     what is settled before anything is made
  pillars/*.md          the striations — each: principles → protocol → definition of done
  skills/*.md           cartridge skills, including this trade's jig
  discovery-lenses.md   extends the kernel discovery skill's Lens Slot
  onboarding.md         first contact for a guest contributor — runs once
  escalation.md         what they decide, what they never decide alone, when to stop
```

Only `PACK.md` is required. The rest earn their place.

The slot contract is in [`.madewell/EXTENDING.md`](../.madewell/EXTENDING.md).
`marketing/` is the shortest complete example to copy from.

---

## The rules a cartridge obeys

**It composes around the four acts; it never replaces one.** Adding an operation at any edge
is composition. Replacing ideate, plan, implement or verify is a different framework wearing
this one's name.

**Its rubric sits on top of the kernel's, never instead of it.** *Does this lead to craft,
beauty and care?* holds everywhere. Yours is sharper and more specific.

**Its jigs enforce your prior decisions, not a style guide's.** A jig exists because you made
the same mistake twice, not because someone thinks it is best practice.
