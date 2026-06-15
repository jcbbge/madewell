# The Frontend Pillar

**One of Made Well's four pillars of software** — `backend · frontend · API · CI/CD`. A pillar is
not an optional skill; it **governs its domain on every project a person will see and touch.** This
is the pillar where the work stops being functional and starts being *loved* — or doesn't. It is
the most visible, the most often rushed, and (per Made Well's thesis) the most neglected dimension
of software.

**Agnostic by construction.** The principles hold whatever the framework or platform. The
mechanics (CSS, tokens, component systems) map onto whatever the project uses; the *physics* of
craft don't change.

**The throughline.** The person never has to know what "design system" or "easing curve" means.
The agent holds the standard on their behalf — it sees further down the iteration lifecycle than
what's obvious in the moment, and doesn't let the work stop short. The person experiences only:
"this feels like mine, and like someone cared."

**When this pillar governs:** before any UI is designed or built; when something works but doesn't
feel considered; before anything user-facing ships.

---

## Part 1 — The Physics (the philosophy that never bends)

> *Let's do it until there's no more that can be done.* — Jony Ive, LoveFrom

Quality is a function of time, not resources. Seeing that there is more to be done is the
definition of good taste. The agent's job is to see that far on the person's behalf.

- **Details are care made visible.** Animate the icon, polish the `:active` state, brand the
  scrollbar. Every interface has infinite opportunity for polish; details are not decoration.
- **Utility is a virtue.** *People aren't trying to use computers — they're trying to get their
  jobs done.* Before adding anything, ask whether it serves the person or the builder's wish to be
  noticed.
- **The novelty tax is real.** Every unfamiliar pattern costs cognitive energy that must be paid
  back in value. If it isn't — remove the novelty. The best interfaces feel inevitable, not clever.

---

## Part 2 — The Seven Dimensions of Frontend Craft

*(Framework from Impeccable by Paul Bakaus — the technical companion for this pillar; see
impeccable.style.)* Every frontend surface has seven dimensions. All seven require decisions.
Skipping any produces the gap between functional and loved.

### 1. Typography
Type is the primary carrier of information and hierarchy, not a style choice.
- One typeface, rarely two. Scale is a system (sizes from a ratio, named levels used
  consistently), not arbitrary pixels. Hierarchy enforced — one thing is most important on every
  screen. Line length controlled (60–80 chars). Widows and orphans are decisions, made.

### 2. Color
- **OKLCH is the correct color space** — perceptually uniform; use it for all tokens.
- **Tokens, not values** (`color-primary`, never hex). Two intentional colors maximum. Contrast is
  not optional (WCAG AA: 4.5:1 body, 3:1 large; color is never the only carrier of meaning). Dark
  mode is a first-class decision.

### 3. Motion
Motion communicates — feedback, orientation, aliveness. It is not decoration.
- Every state change has a motion story (things arrive, they don't snap). Motion must be fast.
  `prefers-reduced-motion` respected. Easing matters (ease-out entering, ease-in leaving).

### 4. Spatial (layout & spacing)
- One base unit; everything a multiple of it. Proximity encodes relationship. Alignment is not
  optional (misalignment reads as carelessness). Breathing room — space lets content exist with
  dignity.

### 5. Interaction
Every interactive element exists in multiple states. Design all of them:

| State | Communicates |
|---|---|
| Default / Hover / Focus / Active | available / noticed / keyboard-here / input-received |
| Disabled / Loading | unavailable (ideally why) / something's happening |
| Success / Error / Empty | it worked / what went wrong + what to do / nothing yet + what could be |

The skipped ones — empty, loading, error — are the states first-time users and broken moments hit
first. Designing only the happy path is designing half the product.

### 6. Responsive
Every surface is met on different screens; not an edge case.
- Mobile is a different context, not a downgrade. Touch targets ≥ 44×44px. Content priority shifts
  — decide, don't default. Typography scales.

### 7. UX Writing
Every word is a design decision.
- Buttons are verbs that name the outcome ("Save changes," not "Submit"). Error messages are two
  sentences: what happened, what to do. Empty states are invitations. Loading states acknowledge
  the wait. Placeholders are not labels.

---

## The deeper craft layer — the Feedback Doctrine (Voice & Materiality)

The seven dimensions are the foundation. Beyond them, Made Well carries a full sensory design
system — how the app *speaks back* through motion, sound, and color, split into **Voice** (the app
saying something) and **Materiality** (the interface behaving like matter). It is the
design-forward edge of this pillar, and the deepening this pillar grows into. **It lives beside
this file in [`design-system/`](./design-system/)**, established in order: intent → **typography**
(the lynchpin) → spatial rhythm derived from it → palette (`color-language.md`) → theming →
**tokens**, with the Feedback Doctrine (`DOCTRINE.md`) carrying motion and sound. That is this
pillar's craft layer, made explicit; the agnostic framework, ready to apply.

---

## Part 3 — Definition of Done

**The Design System Imperative** — before the second screen, there are **tokens** (named values
everything derives from — color/space/type, not hex/pixels/hardcoded sizes) and **components**
(built once, used everywhere). The test: if the primary color must change, how many places change?
*One is a design system. Forty is a collection of screens.*

Before any screen ships:

- [ ] All seven dimensions considered — not just the easy ones.
- [ ] All interaction states designed: default, hover, focus, active, disabled, loading, success,
      error, empty.
- [ ] Typography, color, and spacing from tokens — no hardcoded sizes, hex, or arbitrary pixels;
      OKLCH where possible.
- [ ] Motion present on key interactions — things arrive, they don't snap.
- [ ] Mobile considered specifically — not just "responsive."
- [ ] Every label, button, error, and empty state is a considered sentence.
- [ ] Contrast checked (4.5:1 body); keyboard-navigable with visible focus; touch targets
      sufficient; `prefers-reduced-motion` respected.

---

## How this pillar is followed

The person never asks for "good design." The agent engages this pillar before any UI is built and
before anything user-facing ships, holding the standard on their behalf. When implementation
detail matters — tokens, CSS, component architecture — it pulls in **Impeccable** (the execution
layer); this pillar is the philosophy, Impeccable is the precision tooling.

---

_Users don't consciously notice good design; they notice bad design._ The sum of a thousand small
decisions — every padding value, every transition, every label — is whether the product feels
loved or thrown together. The goal is not that the person notices. The goal is that the agent does,
on their behalf.
