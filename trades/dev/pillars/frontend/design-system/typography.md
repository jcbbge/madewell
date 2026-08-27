# Typography — the lynchpin

Type is not a style choice made late. It is the **first decision and the load-bearing one**:
it carries the information and the hierarchy, it sets the mood before a single word is read, and
— most importantly — **its rhythm seeds the entire spatial system.** Choose the type, and spacing,
line-height, measure, and scale all fall out of it. Get this right and the app feels cohesive and
considered; get it arbitrary and no amount of later polish recovers it.

This is established **once**, from gathered intent, and then binding (see the establishment order
in `README.md`).

---

## The three roles

Every app speaks in three typographic voices. They must be **chosen together** so they coordinate.

1. **Display / Heading** — titles and structure. Carries personality and hierarchy. This is where
   character lives.
2. **Body** — the reading voice. Comfortable, legible, unfussy at small sizes and long lengths.
   The font the person actually *lives in*. Readability outranks personality here.
3. **Mono — the system voice.** Monospaced, for status, system messages, code, data, anything the
   *computer* is saying rather than the person reading. This is the app's machine register — it
   pairs directly with the feedback doctrine's idea of the system speaking back. Most design
   systems forget it; Made Well treats it as a first-class voice.

A valid system can be **one family** used across roles (a single typeface with bold headings, a
lighter body, and the family's mono cut) or a **pairing/trio** of families that harmonize. Never
more than these three roles.

---

## How they're chosen to fit

Coordination is not taste-by-vibe; it's legible. When determining the system from intent:

- **Shared skeleton or deliberate contrast — never accidental similarity.** Fonts pair when they
  either share a structural family (similar proportions, x-height, axis) or contrast on purpose
  (a geometric display over a humanist body). The failure mode is two fonts that are *almost* the
  same — that reads as a mistake.
- **Match x-height and proportion** so sizes feel consistent across roles.
- **Match the mood to the intent.** Geometric and tight reads precise/modern/financial; humanist
  and open reads warm/approachable; a high-contrast serif reads editorial/considered; a friendly
  rounded sans reads playful. *Let the gathered intent force the answer* — a calm clinical tool and
  a playful portfolio should not land on the same pairing.
- **The mono should belong to the same world** — its character echoing the display/body, not a
  random terminal font bolted on.

**You make this determination** — from the app's archetype, or by working through known-good
pairings, grounded in how type actually pairs (structure, x-height, contrast, mood). You don't hand
the person a Google Fonts tab; you bring them a system that fits and tell them why it fits.

---

## Type drives the system (the part that matters most)

Once the type is set, **derive the spatial system from it — do not invent a separate one:**

- **Line-height becomes the base rhythm unit.** The body's line-height is the vertical beat
  everything else snaps to — spacing, padding, and margins are multiples of it. This is what makes
  unrelated components feel like one app.
- **The type scale is a ratio, not arbitrary sizes.** Pick a modular scale (e.g. a consistent
  ratio between steps); every size is a step on it, named (display, heading, body, caption, label),
  used consistently. Hierarchy is enforced: one thing is most important on every screen.
- **Measure (line length) is controlled** — 60–80 characters for body. Full-width body text is a
  typography failure.
- **The spacing scale and the type scale share the same root**, so vertical rhythm and horizontal
  spacing agree. This handoff is the input to `tokens.md`.

The attention-to-detail items — consistent rhythm, controlled measure, no widows/orphans left to
chance — are exactly what separate a design that feels professional from one that feels assembled.

---

## Definition of done

- [ ] Three roles chosen together: display/heading, body, and a monospace system voice.
- [ ] The pairing coordinates (shared skeleton or deliberate contrast; matched x-height; one mood).
- [ ] The mood matches the gathered intent — not a default.
- [ ] A modular type scale (ratio-based, named steps), hierarchy enforced.
- [ ] Body measure controlled (60–80 chars).
- [ ] **The spacing/rhythm system is derived from the type's line-height — not invented separately.**
- [ ] The choice is recorded as binding (it feeds `tokens.md` and is logged in DECISIONS.md).
