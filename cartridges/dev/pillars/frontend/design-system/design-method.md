# The Design Method

### The 4-step process for rendering the Feedback Doctrine on any surface

**Written:** 2026-06-13
**Author:** Josh
**Derives from:** [`DOCTRINE.md`](./DOCTRINE.md), [`motion-language.md`](./motion-language.md), [`color-language.md`](./color-language.md)
**Status:** Design Method — v0.1 (draft). The capstone — the repeatable "metaprompt" that turns the doctrine + three channels into applied feel, and produces specs an agent can run.

---

## 0. What this is

The doctrine says _what the app can say_; the three channel languages say _how it
says it_ in motion, color, and sound. This is the **procedure** that applies all of
it to a specific surface — and emits a spec an agent (or you) can implement.

It runs in **two modes**:

- **Greenfield** — designing the feel of a new surface from scratch.
- **Audit / Upgrade** — applying the doctrine to a surface that already exists,
  **additively**. _Never demolish what's there — recommend the upgrade._ (§3.)

---

## 1. The four steps

```
ENUMERATE → MAP → RENDER → CHECK
```

This is the "4" — the process number — and it echoes Made Well's IMAGINE → PLAN →
MAKE → VERIFY one altitude down. It's fractal: run it on an element, a component, a
route, or the whole app (§4).

### 1 · ENUMERATE

List the surface's **interactive elements and states** — every affordance (button,
card, row, field, drag handle, palette), every state change (route, mode, expand),
every async/ambient moment (loading, AI thinking, unsaved).

> Output: an inventory. _What can be touched, what can change, what happens on its own._

### 2 · MAP

For each element, ask **both natures (Doctrine §3)**: which **utterances** (Voice,
§3.1) does it fire, at what magnitude (§4) — _and_ which **materiality events**
(§3.2) does its physicality produce (press / release, detent, glide, seat)? Most
fire one utterance; many fire none; most _interactive_ ones have some materiality.
Apply the floor first — Emil's question, _should this even speak?_ — but remember it
governs Voice, not Materiality: a keyboard-driven 100+/day action gets **silence and
stillness from the Voice**, yet may still carry a dry materiality click.

> Output: an element → {utterance + magnitude, materiality event} map.

### 3 · RENDER

Express each mapped utterance across the **three channels** at its magnitude,
pulling from the channel languages — a named motion (`motion-language` §3), a color
behavior (`color-language` §4), and a sound at the doctrine level (Doctrine §3 sound column). Not every
utterance uses all three channels; color often carries it alone (it survives
reduced-motion).

> Output: per utterance, the concrete motion + color + sound at that magnitude.

### 4 · CHECK

Run the result against the **eight laws** (Doctrine §5) and the floors:

- Speak only when you have something to say · physically motivated · subtle over
  flashy · one language everywhere · input-agnostic · ambient peripheral · never
  cost usability/latency/access · derived not bolted-on.
- The frequency floor (motion) and the stricter silence floor (sound).
- Reduced-motion + mute paths exist and preserve meaning.
  > Output: a pass, or a list of violations to fix. Iterate 2–4 until it passes.

---

## 2. The output — a surface spec (the agent-runnable artifact)

Each run produces one spec doc. Template:

```md
# Feel Spec — <surface name>

## Inventory (ENUMERATE)

- <element> — states: <…>

## Utterance map (MAP)

| Element | Utterance | Magnitude | Floor? |

## Render (RENDER)

| Utterance | Motion | Color | Sound |

## Laws check (CHECK)

- [ ] <each law / floor> — pass / fix

## Open questions
```

An agent reads this and implements it directly — declaring `utterance + magnitude`
per element (Law 8), the channel primitives resolving the rest. This is the "skill
file fed to an agent as a constraint" (Emil's _agents-with-taste_).

---

## 3. Audit / Upgrade mode — additive, never demolition

When applying to a surface that already has a design system (i.e. an existing app):

**The hard rule: upgrade, don't overwrite.** The existing brand, tokens,
components, and decisions are the **baseline to preserve.** This method _adds_ the
feedback/sensory layer and proposes deltas — it never deletes, rewrites, or
demolishes what's there. (A good initial system stays; we layer craft on top.)

Procedure:

1. **Read the current system as law** — brand guidelines, tones, color mapping,
   token set, component library. Inventory what exists and what's good.
2. **Run the four steps** against each surface (shell, a list, a detail view,
   settings, …).
3. **Emit a _recommendation_ spec per surface** — framed as **current → upgrade**:
   what exists today, what the doctrine adds, and the additive path. Where the
   current color/token system can be re-expressed in OKLCH/APCA, present it as a
   _migration proposal_, not a replacement.
4. **Nothing is overwritten by the audit itself.** It produces guidance; changes
   are applied deliberately afterward, with review.

> Output: a set of additive upgrade-recommendation specs — the "several spec'd
> md's an agent runs through," each preserving the established system.

---

## 4. The fractal

The method runs at any altitude:

- **Element** — one button's press.
- **Component** — a command palette's full add/remove/group vocabulary.
- **Route** — a builder route end to end.
- **App** — the shell, the cross-route consistency, the global mute/reduced-motion.

Same four steps, different scope. Run small first (one component), prove the loop,
then widen.

---

The test, as always: **does it lead to craft, beauty, and care?**
A surface that can't answer yes after CHECK is not done.
