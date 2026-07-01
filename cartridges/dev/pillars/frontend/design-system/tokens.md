# Tokens — the unified output

Tokens are where the whole design system becomes **one named set of values everything else derives
from.** They are the deliverable of the establishment process (README §"the establishment order")
and, once set, **binding** — change a token, change the app everywhere; never a hardcoded value
anywhere. This is the single artifact that makes a multi-screen product feel like one thing.

> **The test:** if the primary color (or the base spacing, or the body font) must change, how many
> places change? **One is a design system. Forty is a collection of screens.**

---

## How tokens are derived (the order is load-bearing)

Tokens are not authored arbitrarily — they fall out of the earlier steps, in sequence:

1. **Type tokens** come from `typography.md`: the three families (display, body, mono), the
   ratio-based size scale (named steps), weights, and line-heights.
2. **Space tokens** are **derived from the type's rhythm** (the body line-height as the base unit;
   the spacing scale sharing the type scale's ratio). They are not a separate invention — that's the
   typography lynchpin made concrete.
3. **Color tokens** come from `color-language.md`: OKLCH, with operational roles + a brand accent +
   tinted neutrals, generated to accessible contrast levels.
4. **Theme tokens** resolve color for **light and dark**, contrast-anchored so the same role holds
   the same contrast in both — WCAG-clear either way.
5. **The rest** — radius, border, elevation/shadow (tinted to the surface, never pure black), and
   **motion tokens** (durations and easings from `motion-language.md`) — round out the set.

---

## The token taxonomy (a starting shape, not a straitjacket)

```
type    --font-display / --font-body / --font-mono
        --text-display / -heading / -body / -caption / -label   (ratio scale)
        --leading-*  --weight-*

space   --space-1 … --space-n        (multiples of the type-derived base unit)
        --measure                    (body line length, 60–80ch)

color   --bg --surface-1/2/3 --border-1/2/3
        --text-max/-primary/-secondary/-tertiary
        --accent (+ -subtle / -hover) --on-accent
        --success --warning --error --info (+ -subtle)        (operational roles)
        — all OKLCH, all defined for light AND dark

form    --radius-* --border-* --shadow-*   (shadows tinted to surface hue)

motion  --duration-* --ease-*              (from motion-language.md)
```

Names are roles, never raw values — `--accent`, not a hex; `--space-3`, not `12px`; `--text-body`,
not `16px`. A component declares the *role* and inherits the decision.

---

## Principles

- **One source of truth.** Every visual value lives in a token. No hardcoded colors, sizes,
  spacing, or fonts in components — ever. (This is the Backend pillar's "one source of truth"
  applied to the visual layer.)
- **Derived, not bolted on.** The set is generated from the establishment order, applied from the
  first component — never hand-tuned per screen at the end. Bolt-on craft is the brittle kind.
- **Operational color is structural, not decorative.** success / warning / error / info are part
  of the token set from the start, because the app *will* need to speak those states, and they
  must be consistent and accessible wherever they appear.
- **Light and dark are one set, two resolutions** — defined together, contrast-anchored, never an
  afterthought.
- **Multi-brand by extension.** If an app carries more than one brand, the *framework* (the scale,
  the roles, the OKLCH pipeline) is shared; only the brand seeds change. One token system, swapped
  at the root.

---

## Derive once, then binding

When the establishment order is complete, the token set is generated and **recorded as the
project's design constitution** — logged in DECISIONS.md and carried as the project's token file.
From that point the agent embodies it on every screen and **never re-decides it** (initialize
once, then embody). It evolves only by deliberate, logged change — the way any constitution does.

This section, like the Backend pillar's stack layer, is **agnostic until the project commits**:
the principles and taxonomy are universal; the actual values are this project's, derived from its
gathered intent, and exactly as specific as it needs — no more.

---

## Definition of done

- [ ] Type, space, color, theme, form, and motion all expressed as named tokens.
- [ ] Space tokens derived from the type's rhythm — not invented separately.
- [ ] Color in OKLCH, with operational roles, defined for light and dark, contrast-checked.
- [ ] No hardcoded visual values anywhere — components declare roles.
- [ ] The set is recorded as binding (logged + carried), and applied from the first component.
