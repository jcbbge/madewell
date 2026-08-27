# Design as a First-Class Concern

**What:** Design is not decoration. It's how the product feels.
**Why:** 10X experience or people won't use it.
**Philosophy:** Craft, beauty, and care in every decision.

---

## The Rubric

Before every UI decision, ask:

> **Does this lead to craft, beauty, and care?**

If the answer is no: wrong move. Doesn't matter if it works. Doesn't matter if it's faster. Doesn't matter if "users won't notice."

Users notice everything. They just can't articulate it. The sum of all your small decisions is the feeling of using your product.

---

## Design Before You Build

Don't start coding UI until you can answer:

1. **Who sees this?** Specific person, specific context.
2. **What are they trying to do?** The actual job.
3. **What mood should it evoke?** (Calm? Urgent? Playful? Professional?)
4. **What does success look like?** They accomplish their goal and...?
5. **What's the anti-reference?** What should this NOT feel like?

Write these down. Reference them during implementation.

---

## The Two Registers

Every UI is either **brand** or **product**:

**Brand register:**
- Marketing pages, landing pages, portfolios
- Design IS the product
- Express personality, be memorable
- More creative freedom

**Product register:**
- Apps, dashboards, tools
- Design SERVES the product
- Enable function, reduce friction
- Clarity over creativity

Know which you're building. The rules differ.

---

## Universal Design Laws

These apply to everything:

### Color

- **Never pure black or white.** Tint toward your brand hue. `#000000` and `#FFFFFF` are lazy.
- **Reduce chroma at extremes.** High saturation at very light or very dark looks garish.
- **Pick a color strategy first.** Don't add colors randomly.
  - Restrained: Neutrals + one accent ≤10%
  - Committed: One saturated color at 30-60%
  - Full palette: 3-4 named roles, deliberately used

### Typography

- **Cap line length at 65-75 characters.** Long lines are hard to read.
- **Use scale contrast.** At least 1.25x ratio between type sizes.
- **Flat type scales = monotony.** Vary size and weight for hierarchy.

### Layout

- **Vary spacing for rhythm.** Same padding everywhere is boring.
- **Cards are overused.** Use them only when they're truly the best affordance.
- **Nested cards are always wrong.** Find another structure.
- **Not everything needs a container.** Most things don't.

### Motion

- **Don't animate layout properties.** Use transform and opacity.
- **Ease out, exponentially.** Ease-out-quart, quint, expo. No bounce, no elastic.
- **Motion communicates.** Every animation should have a reason.

---

## Things That Look AI-Generated

Avoid these patterns. They're the training-data reflex:

1. **Side-stripe borders.** `border-left: 3px solid accent` on cards, callouts, alerts.
2. **Gradient text.** `background-clip: text` with gradients. Always wrong.
3. **Glassmorphism everywhere.** Blur and glass cards as default, not intentional choice.
4. **The hero-metric template.** Big number, small label, supporting stats, gradient accent.
5. **Identical card grids.** Same-sized cards with icon + heading + text, repeated.
6. **Modal as first thought.** Modals are usually laziness. Try inline first.

---

## The Category Reflex

Don't let the category dictate the design:

- Observability → dark blue? (Cliché)
- Healthcare → white + teal? (Cliché)
- Finance → navy + gold? (Cliché)
- Crypto → neon on black? (Cliché)

If someone could guess your palette from your category, you've defaulted to the training data.

Instead: **Write a physical scene.** Who uses this, where, under what light, in what mood? Let the scene force the answer.

---

## Dark vs. Light

Not "dark because tools look cool dark." Not "light to be safe."

Write one sentence: "A [person] using this [where] at [time] in [mood] needs [light/dark]."

"Someone who uses this" is not enough. "An SRE triaging incidents at 2am in a dim room on a 27-inch monitor" is.

---

## Copy Rules

Every word earns its place.

1. **No restated headings.** If the heading says it, the intro doesn't need to say it again.
2. **No em dashes.** Use commas, colons, semicolons, periods, or parentheses.
3. **No filler.** "Click the button to submit" → "Submit"
4. **Action verbs in buttons.** Not "Okay" or "Continue" — say what it does.
5. **Error messages that help.** What happened AND what to do about it.

---

## Before Shipping UI

Run this checklist:

- [ ] Does it work on mobile?
- [ ] Does it work with no data?
- [ ] Does it work with too much data?
- [ ] Does it work with slow network?
- [ ] Does it work with failed network?
- [ ] Are error states handled?
- [ ] Is there a loading state?
- [ ] Can you use it with keyboard only?
- [ ] Would a first-time user know what to do?

---

## For More

Create these files in your project:

**PRODUCT.md** — Brand, users, tone, anti-references
**DESIGN.md** — Colors, typography, spacing, component patterns

When starting UI work, load these files first. They keep you consistent and prevent drift.

---

## Remember

> "Users don't consciously notice good design. They notice bad design."

The sum of a thousand small decisions is whether your product feels loved or feels thrown together. Every padding value. Every transition duration. Every word in every label.

Craft, beauty, and care. Not because users demand it explicitly. Because it's right.

---

*"The product should feel like it was made for them — not like a generic tool they have to adapt to."*
