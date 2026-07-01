# The Motion Language

### The MOTION channel of the Feedback Doctrine

**Written:** 2026-06-13
**Author:** Josh
**Derives from:** [`DOCTRINE.md`](./DOCTRINE.md) (§3 · §4 · §5)
**Grounded in:** the `emil-design-eng` skill and Emil Kowalski's essays — _developing-taste_, _train-your-judgement_, _agents-with-taste_, _the-magic-of-clip-path_. **That skill is the technique bible; this doc is the motion spec that points to it — not a copy of it.**
**Status:** Motion Language — v0.2 (draft). Token _values_ are starting points to tune by feel; the _structure_ is the spec.

---

## 0. What this is

The MOTION channel, fully specified: tokens, named motions, the §3 × §4 mapping.
If the Doctrine says _what the app can say_, this says _how it moves when it
says it._ One of three channel languages (motion · color · sound).

---

## 1. Two primitives, chosen by interruptibility

v0.1 said "springs are the primary primitive." Emil sharpens it: **motion has
two engines, and you choose by whether the user can interrupt it mid-flight.**

- **CSS transitions + custom easing** — for **predetermined** motion (entries,
  fades, settles, expands, stagger, the Guide ring, the Notice nudge). Runs off
  the main thread, stays smooth even while the app loads data, and
  `@starting-style` animates entries with no JS. **This is the default.**
- **JS springs (`useSpring`) or WAAPI** — for **interruptible / gesture /
  momentum** motion (drag-follow, lift/drop, anything reversible mid-motion).
  Springs keep velocity when retargeted; CSS keyframes restart from zero — which
  is exactly why gestures need springs.
- **Caveat (Emil):** under load, CSS beats JS — Framer Motion's `x`/`y`
  shorthands run on `requestAnimationFrame` and drop frames during page loads;
  use the full `transform` string for hardware acceleration.
- **Transform & opacity only. Never animate layout.** GPU path; honors Law 7.
- **Springs ≠ bounce.** Near-critically-damped (`bounce: 0`) reads crisp and
  physical — _not_ the elastic 04-DESIGN warns against. A small `bounce: 0.1–0.2`
  is allowed **only at primary magnitude**. (Emil: avoid bounce in most UI;
  0.1–0.3 when used.)

---

## 2. Tokens (v0.2 — Emil-grounded starting points)

### Easing — built-ins are too weak; **never `ease-in`**

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* enter / exit — responsive   */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen movement / morph  */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* drawer / panel slide        */
/* hover / color → ease ;  constant motion → linear */
```

Pick by motion _type_: **enter/exit → ease-out · on-screen morph → ease-in-out ·
hover/color → ease · constant → linear.** Never `ease-in` — it delays the first
frame, the exact moment the user is watching.

### Springs — Apple `{duration, bounce}` notation (easier to reason about)

| Name     | `{duration, bounce}` | ≈ physics (k·d·m) | Feel                 | Used by                           |
| -------- | -------------------- | ----------------- | -------------------- | --------------------------------- |
| `snap`   | {0.25, 0}            | 500 · 44 · 1      | crisp, no overshoot  | press, snap, recoil               |
| `settle` | {0.5, 0.2}           | 260 · 24 · 1      | arrives & rests      | Confirm / Contact (primary), drop |
| `glide`  | {0.4, 0}             | 200 · 28 · 1      | smooth, no overshoot | expand, rolodex                   |
| `drift`  | {0.7, 0}             | 40 · 16 · 1       | slow, soft           | lift, ambient                     |

_(Stir's fidget is a looping low-amplitude oscillation, not a spring-to-target.)_

### Durations (Emil's table — UI stays < 300ms; drawer-class to 500)

| Class                      | Duration                                      |
| -------------------------- | --------------------------------------------- |
| press feedback             | 100–160 ms                                    |
| tooltip / small popover    | 125–200 ms                                    |
| dropdown / select / expand | 150–250 ms                                    |
| modal / drawer / route     | 200–300 ms (≤ 500 only for true drawer-class) |

Magnitude maps on: **tertiary ~120 · secondary ~200 · primary ~300** ms.

### Displacement · scale · stagger

- Entries: **`scale(0.95)` + opacity — never `scale(0)`** (nothing real appears from nothing).
- Press: `scale(0.97)` on `:active` · `snap` · `will-change: transform`.
- Lift (drag): `scale(1.03–1.05)` + shadow.
- Stagger: **30–60 ms/item**, decorative — never blocks input.

---

## 3. The frequency floor — the most important rule Emil adds

**The floor of the magnitude scale is zero.** Before "how big should this
motion be," ask Emil's _first_ question: **should it animate at all?**

| Frequency                                            | Motion                         |
| ---------------------------------------------------- | ------------------------------ |
| 100+/day · **every keyboard-initiated action**       | **None. Ever.**                |
| tens/day (hover, list nav, selection)                | drastically reduced (tertiary) |
| occasional (modals, drawers, add-to-build)           | standard (tertiary–secondary)  |
| rare / first-time (bundle drop, publish, onboarding) | can be rich (primary)          |

**Never animate keyboard actions.** Software has global keyboard shortcuts and a
command palette — those fire hundreds of times a day. Animating them makes
the app feel slow and disconnected. Raycast has no open/close animation; that is
correct.

**Consequence:** **route changes are high-frequency → keep them minimal**
(a ≤120ms cross-fade, or instant) — the _same_ whether triggered by click or
keyboard, which also satisfies Law 5. The lavish "selected card scales up into the
main view" idea is **probably over-animation for that frequency** — demoted to a
skeptical prototype. Spend rich motion where it's _rare and earned_: the bundle
drop, the publish, the first-run guide.

**Two natures (Doctrine §3).** This floor governs **Voice** — the app's _semantic_
motion (a settle that says "done," a route swap). It does **not** govern
**Materiality** — the diegetic motion of matter: drag-follow (mass + lag), the
physical give of a press, lift / drop. Materiality may ride even high-frequency
input, because it is the _body_ of the gesture, not a comment on it. The named
motions below split along this line: `settle` / `nudge` / `ring` are Voice;
`drag-follow` / `lift` / `drop` / `snap` are Materiality (the relocated "Move under
friction" lives here). Specifying materiality fully across channels is future work.

---

## 4. The named motions (Emil-refined)

- **press** — _Acknowledge._ `scale(0.97)` on `:active` via `snap`, `will-change:
transform`. The physical "I felt that."
- **settle** — _Confirm._ Arrives and rests via `settle`; small overshoot only at primary.
- **snap / nest / lift / drop** — _Contact._ The drag-and-drop / board physics.
  _lift_ (drag-start: scale-up + shadow,
  `drift`) · _snap_ (lock to slot, `snap`, no overshoot — it _clicks_) · _nest_
  (join a bundle, `settle`, staggered) · _drop_ (`settle`). Springs (interruptible).
- **fade-through** — _Change state (route)._ Cross-fade, **no directional slide**
  (Law 5). **Add `filter: blur(2px)` during the crossfade** to fuse the two
  screens into one smooth transform (Emil's mask trick; keep < 20px — Safari is
  costly). Keep ≤ 120ms (high-frequency, §3).
- **expand / collapse** — _Change state (within view)._ scaleY + fade, `glide`.
- **deck** — _Change state (shell)._ Active card lifts/brightens; switching
  **re-weights** which card is active. Reined in by §3 — subtle, not a reshuffle.
- **rolodex** — _Change state (build sections)._ Gentle flip on explicit
  sequential cycling, `glide`.
- **drag-follow** — _Move under friction._ JS spring, follows pointer with mass
  and lag. **Momentum dismiss** (velocity > ~0.11 dismisses regardless of
  distance) · **boundary damping** (drag past edge → diminishing movement, not a
  wall) · **pointer capture** · **ignore multi-touch** after drag starts.
- **recoil** — _Refuse._ Small push-back via `snap`, return. **Asymmetric** —
  deliberate where the user decides, snappy (200ms) where the system responds.
  Never a shake.
- **fidget** — _Stir._ Low-amplitude (≤ 2px), slightly irregular loop — the
  "creature waiting." Not a spinner. Suspends instantly on user action (Law 6).
  Still the riskiest motion in the set.
- **ring** — _Guide._ **Origin-aware** — scales _from the affordance_, not center
  (Emil's popover rule; the same rule means every popover/tooltip scales from
  its trigger — modals stay centered). `glide` + opacity.
- **nudge** — _Notice._ One gentle one-shot, then still; persistence carried by color.

---

## 5. Techniques — `clip-path` & friends (from the essay)

`clip-path` is hardware-accelerated and causes **no layout shift** — ideal for
reveals. Four moments:

1. **Edit-layer reveal (contract / documents route).** The brief's "page flip to
   see the editable layer" = a `clip-path: inset()` reveal of the edit surface
   over the preview. No layout shift — the edit layer is already there, just
   clipped. Mode switch = _Change state_.
2. **Active indicator (header deck / build-section tabs).** Emil's
   duplicate-and-clip technique: render an active-styled copy, clip to the active
   item, animate the clip on change — a seamless transition per-property color
   timing can't match.
3. **Theme switch (light / dark).** A `clip-path` reveal of the alternate theme,
   **or** the View Transitions API (modern, less hacky). Pairs with the
   Roman-Shamin leveled-token system. _Change state._
4. **Hold-to-confirm (destructive).** `clip-path` overlay fills over ~2s linear
   while held, snaps back 200ms ease-out on release. Asymmetric, deliberate.

---

## 6. The §3 × §4 mapping (the contract)

| Utterance               | Named motion                 | Tertiary                 | Secondary                       | Primary                                      |
| ----------------------- | ---------------------------- | ------------------------ | ------------------------------- | -------------------------------------------- |
| **Acknowledge**         | press                        | `scale(0.97)` · `snap`   | —                               | —                                            |
| **Confirm**             | settle                       | tiny settle · `snap`     | settle + 8px rise               | settle + `bounce 0.2` + color-glow handoff   |
| **Change state**        | fade-through / expand / deck | ≤120ms cross-fade + blur | expand `glide` · deck re-weight | (reserved — most state changes are frequent) |
| **Contact**             | snap/nest/lift/drop          | single snap              | several nest, staggered         | bundle cascade + settle                      |
| **Move under friction** | drag-follow                  | light lag                | medium lag + trail              | heavy lag (bundle)                           |
| **Refuse**              | recoil                       | small recoil             | recoil + dim                    | firm recoil                                  |
| **Stir**                | fidget                       | faint loop               | —                               | —                                            |
| **Guide**               | ring                         | single ring              | slow looping ring               | —                                            |
| **Notice**              | nudge                        | —                        | one nudge                       | one nudge + persistent color                 |

_Blank = not meaningful, not todo. Primary is rare by design (§3)._

---

## 7. Reduced motion — Emil's nuance: fewer & gentler, **not off** (Law 7)

Reduced motion keeps **opacity and color** transitions that aid comprehension and
removes **movement and position**. So Confirm still fades, Change-state still
cross-fades (fast), Contact items still _appear_ — they just don't _travel_.
fidget/ring become static color states. Read `prefers-reduced-motion` **once,
globally**. Meaning is never lost — only travel.

---

## 8. How it's applied (Law 8 — and Emil's "agents with taste")

Declare **utterance + magnitude**, not raw values (Law 4) — tune a preset once,
every site updates. Companions: `building-with-solidjs` / `solidjs-2.0` + the
`emil-design-eng` skill (technique bible) + WAAPI / Motion. Implementation notes:
read reduced-motion once; gate hover behind `@media (hover: hover) and (pointer:
fine)`; set `transform` directly on the element, not a shared CSS var on the parent
(avoids child-wide recalc).

> **Why this doc is shaped the way it is.** Emil's _agents-with-taste_ essay argues
> you transmit taste to AI by **packaging it as explicit skill files fed to agents
> as constraints** — _"the more you can package into a skill, the more leverage you
> get out of your agents."_ That is exactly what this motion language — and the
> whole Feedback Doctrine — is: taste made explicit and declarative, so an agent
> (or Made Well's builder) applies it correctly. We were already building the thing
> Emil describes.

---

## 9. Open to prototype / tune

- Spring constants & durations: tune by feel, **review next-day with fresh eyes**,
  slow-mo / frame-by-frame inspect (Emil's debugging method).
- The deck card-into-view: now **doubly suspect** (Law 5 + frequency §3) —
  prototype the minimal cross-fade first; only add motion if it earns it.
- Stir's fidget: the alive/distracting line.
- `clip-path` theme-switch vs the View Transitions API — pick one in prototype.

---

The test, as always: **does it lead to craft, beauty, and care?**
Motion that can't answer yes does not ship.
