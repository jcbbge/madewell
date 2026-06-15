# The Design System

**The Frontend pillar's craft layer.** Where the visual and sensory identity of an app is
**established once and then embodied everywhere** — type, space, color, theming, icons, motion,
and sound, resolved into one token set that every screen draws from. Set it deliberately at the
start; uphold it forever after. This is initialize-then-embody at its purest: a project decides
who it is, then simply *is* that.

**Opinionated on the process, derived on the specifics.** The principles here are directives, not
suggestions. But the *choices* — which fonts, which palette — are **derived by the agent from
gathered intent**, never a menu the person navigates. You gather what they're reaching for (the
kind of app, the feeling they want) and you make the determination on their behalf. They don't
pick fonts; they're served a system that fits.

---

## The establishment order (run once, in this sequence)

Each step feeds the next. This order is the directive.

1. **Gather intent.** What is this — a financial tool, a healthcare app, a playful portfolio, a
   calm newsletter? What should it *feel* like? Pull it from how the person talks about their
   project (PRODUCT.md has their words). You decide the system from this; you don't hand them a
   font picker.
2. **Typography** → [`typography.md`](./typography.md). The lynchpin. Three coordinated roles
   (display/heading, body, and a monospace **system voice**), chosen to fit and to harmonize.
3. **Spatial rhythm — derived from the type.** Line-height becomes the base unit; the type scale
   and the spacing scale come from the same ratio. Spacing is not invented; it falls out of the
   type. *(This is what makes an app feel cohesive instead of assembled — see `typography.md`
   §"Type drives the system" and `tokens.md`.)*
4. **Palette** → [`color-language.md`](./color-language.md). OKLCH; operational roles
   (success / warning / error / info) + a brand accent + tinted neutrals; from a scheme, an image,
   or color theory. The app's overall imprint.
5. **Theming** — light and dark as first-class, contrast-anchored, WCAG-clear in both.
6. **Icons** — one set, chosen to match the type's character (geometric type wants geometric
   icons; humanist wants humanist). *(Held light for now; grows with dogfooding.)*
7. **Tokens** → [`tokens.md`](./tokens.md). The unified output: type + space + color + theme +
   motion composed into one named set everything else derives from. **The deliverable of this whole
   process**, and from here it is binding.

Then the system gets *applied* and *spoken*:

- **Apply per surface** → [`design-method.md`](./design-method.md). The 4-step loop (enumerate →
  map → render → check) that renders the system onto each screen.
- **The app's voice** → [`DOCTRINE.md`](./DOCTRINE.md) + [`motion-language.md`](./motion-language.md).
  How it speaks back through motion and sound — Voice (the app saying something) and Materiality
  (the interface behaving like matter). The interaction layer on top of the static system.

---

## Composition principles (the directives that govern every layout)

- **Negative space is the design.** Maximize space; a cluttered UI is the first thing that kills
  an app. Lean, minimal, the fewest surface touchpoints that still make every affordance obvious.
- **One base unit, derived from type.** Nothing arbitrary — every margin, pad, and gap is a
  multiple of the rhythm the type set (step 3).
- **Hierarchy is enforced.** One thing is most important on every screen.
- **The path of least clicks.** If it takes more than three to do the thing, it's too many. The
  intuitive move should be the obvious one — no one should have to *think* about what to do.
- **Leave room to explore.** Intuitive does not mean barren. Bake in the small "oh — what does
  this do?" moments, carried by the motion and sound of the doctrine.

*(Deeper UX — information architecture, flows, the full intuition-vs-exploration balance — is held
light here and grows as we dogfood. The Frontend pillar's seven dimensions and the feedback
doctrine already carry the interaction-level craft.)*

---

## Grounded in

Emil Kowalski (motion & taste) · Evil Martians + OKLCH/APCA (color) · classical typographic
pairing and modular-scale practice. The principles are explicit and declarative — the kind of taste
you package and feed to an agent as constraints, so it applies craft from line one.

**Made, not vibed.**
