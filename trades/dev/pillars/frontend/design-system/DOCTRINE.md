# The Feedback Doctrine

### How Software Speaks Back

**Written:** 2026-06-13
**Author:** Josh
**Part of:** Made Well — the UI/UX wing. Rubric: _"Does this lead to craft, beauty, and care?"_
**Status:** Doctrine — v0.4 (draft for redline). The sensory operationalization of the craft rubric. Motion, sound, color, and the feel of every interaction answer to this document.

---

## 0. Why this exists

Made Well measures every decision — including _animation timing_ and
_feel_ — against one question: **does this lead to craft, beauty, and care?**
That rubric never said _how_ feel gets built. This doctrine is that missing arm.

The standard is not the user's threshold of perception. It is mine. Most people
will never consciously notice a settle that lands right or a sound that feels
like paper instead of a beep. I will. That is the whole point. Craft is the
decision to hold a standard higher than anyone is asking for — because the
sum of those unnoticed decisions is the difference between a tool that feels
alive and one that feels brittle.

Without this layer, everything else — the architecture, the data model, the
AI-native surface — is correct and lifeless. This is the layer that makes it
_ours_.

---

## 1. The thesis — software speaks back

An interface is a conversation. The user says something; the application
answers. Today most software can **hear** — it has clicks, presses, keystrokes,
drags — but it cannot **speak**. It receives input and silently mutates state.

> **Input is the user's half of the sentence. Motion, sound, and color are the
> app's reply.**

This doctrine gives software a voice. Not narration, not chrome — a genuine reply,
so that every action lands in a loop: _I did something → the system answered →
I know what happened and how it felt._ The same symbiotic loop as working
alongside an agent. Feedback is not decoration. It is the application's side
of the dialogue.

---

## 2. The dialogue model

```
  USER  ─────────────▶  APP          the user's input (already built)
        click · press · key · drag · scroll

  APP   ─────────────▶  USER         the app's response (this doctrine)

        THREE CHANNELS            TWO REGISTERS              TWO NATURES
        ├─ MOTION (seen)          ├─ RESPONSIVE (your reply) ├─ VOICE        the app says something
        ├─ SOUND  (heard)         └─ AMBIENT (unprompted)    └─ MATERIALITY  the interface is matter
        └─ COLOR  (state)
```

The app's voice has **three channels carrying meaning to two senses**, and it
speaks in **two registers**:

- **Channels.** _Motion_ = the app moving. _Sound_ = the app heard. _Color/light_
  = the app's complexion — how it looks like it's feeling, continuously. The
  channels are not three projects; they are one vocabulary spoken in three
  registers of sense. (A fourth channel, haptics, is out of scope on the web.)
- **Registers.** _Responsive_ is the app answering a user action — it follows
  input. _Ambient_ is the app on its own initiative — liveness, suggestion,
  status — with no user action behind it. Motion and sound carry the responsive
  voice best; color carries the ambient voice best; all three can do both.
- **Natures.** The response has **two natures**, and separating them is the key the
  system was missing. **Voice** is the app _saying_ something — a deliberate,
  semantic signal that carries meaning ("I heard you," "it worked," "no"), rendered
  as the **Utterance Taxonomy** (§3.1). **Materiality** is the interface _being_
  something physical — the diegetic sound and motion matter makes when you touch it,
  carrying **no message at all**: the mechanical click of a press, the detent of
  stepping through a list, the friction of a drag, rendered as the **Materiality
  Map** (§3.2). The difference is **speaking aloud vs. knocking on wood** — both make
  sound, only one is speech. Voice is held in check by restraint and the frequency
  floor (§4); Materiality is held in check by staying dry, short, quiet, varied, and
  **abstracted, never literal** — yet it may ride even the most frequent action (a
  mechanical keyboard clicks on every key and feels _alive_), because it is the
  physical event itself, not a remark about it.

---

## 3. What the app expresses

Two natures (§2), two maps. Every expression is one of a small, fixed set — never
random. If an interaction belongs to **neither** map, the app stays **still,
silent, and steady.** That is the rule that prevents overdoing it.

### 3.1 · Voice — the Utterance Taxonomy

The things the app has a reason to _say_. This finite list is the semantic spine:
the channel languages are just these utterances rendered in motion, sound, and color.

#### Responsive — the reply to what you did

| #   | Utterance               | Saying…                              | Motion                                            | Sound                                                    | Color                                                       | Where it shows up                                                                                                         |
| --- | ----------------------- | ------------------------------------ | ------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Acknowledge**         | "I heard you."                       | tiny depress / highlight on contact               | soft dry click on press                                  | brief tint-flick on the pressed element                     | any button or card press, a selection                                                                                |
| 2   | **Confirm**             | "Done. It worked."                   | a _settle_ — arrives and rests                    | warm, resolved, material tone                            | success-hued glow that fades to rest                        | save, add an item, commit, publish                                                                                  |
| 3   | **Change state**        | "Things are different now."          | old view yields, new view arrives                 | a near-silent turn, or nothing                           | a subtle cross-tint as context shifts                       | route change, mode switch, expand / collapse                                                                         |
| 4   | **Contact**             | "These snapped / nested / detached." | snap, nest, lift, drop — physical coupling        | click-in / detach, weighted and material                 | edge-glow where pieces meet; bundle adopts a unifying tint  | a builder / board: add / remove / group items, drag-drop — physical coupling of pieces                              |
| 5   | **Refuse**              | "I can't — not that."                | small resistance or recoil, never a violent shake | a soft, low, non-punishing tone                          | brief desaturate or low warning tint (never an alarm flash) | invalid drop, blocked action, validation failure                                                                     |

#### Ambient — the app speaking unprompted

| #   | Utterance  | Saying…                                 | Motion                                                                      | Sound                               | Color                                                          | Where it shows up                                                           |
| --- | ---------- | --------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 6   | **Stir**   | "I'm alive. I'm thinking."              | a small restless _fidget_ — like a creature waiting; alive, never a spinner | none, or a faint sustained presence | slow breathing gradient — inhale / exhale luminosity           | async / loading, an AI suggestion forming                             |
| 7   | **Guide**  | "You could do this."                    | a soft expanding ring from the affordance, then gone                        | none (or the faintest tick)         | a halo pulsing out of a help point, then fading                | help affordances, first-run hints, a suggested next step               |
| 8   | **Notice** | "Look here — this changed / needs you." | a single gentle nudge, then still                                           | none, or one quiet chime if urgent  | sustained gentle tint on the thing (amber = unsaved / pending) | an upstream data change, a sync conflict, a freshly-arrived AI suggestion |

_(Voice now holds at **five responsive + three ambient**. "Move under friction" used
to sit here; it moved to the Materiality Map (§3.2), where it belongs — it carries no
message, it is pure physics. The ambient three stay distinct: **Stir** is liveness,
**Guide** is suggestion, **Notice** is the app flagging an unprompted change it knows
about — a sync update, an upstream data change, an AI suggestion that just
arrived.)_

### 3.2 · Materiality — the Materiality Map

_High-level concept. The full cross-channel spec and the soundscape itself are
**future work** (see §6) — this is the integration the system was missing, captured
here so the two paths can be built into one._

The interface is a thing made of matter, and matter makes sound and moves when you
touch it. These events carry **no meaning** — they are the diegetic _body_ of the
interaction, not a comment on it. Every row obeys one law: **abstracted, never
literal** — a stylized transient that _reads as_ the mechanism, never a recorded
real-world clip (that mismatch is exactly what sounds "off"). They are tied to the
**input gesture and surface physics**, not the outcome — so, unlike Voice, they may
fire on even the most frequent action, kept honest by staying dry, short, quiet, and
round-robin'd.

| #   | Materiality event | Physical model                                     | Triggered by                           | Notes                                            |
| --- | ----------------- | -------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| M1  | **Press**         | a key / button _down_-stroke — firm, the actuation | `pointerdown` / `keydown`              | the heavier half of a mechanical click           |
| M2  | **Release**       | the _up_-stroke — softer, the return               | `pointerup` / `keyup`                  | a distinct sound; Press + Release _is_ one click |
| M3  | **Detent**        | a clicking dial / wheel notch, one click per step  | arrow-key list nav, stepper, wheel     | round-robin so the 50th step ≠ the 1st           |
| M4  | **Glide**         | matter sliding on felt / a drawer running          | continuous drag, momentum scroll       | _was "Move under friction"_; silent at rest      |
| M5  | **Seat**          | a latch clicking shut, a brick snapping home       | drop-into-slot, dock, toggle landing   | the diegetic body of the **Contact** utterance   |
| M6  | **Boundary**      | hitting the end of a rail — soft resistance        | end-of-list, over-scroll, blocked drag | a physical _thunk_, never an error tone          |

**The two layers fire together.** A press plays M1/M2 (the body) _and_ may be an
Acknowledge (the voice); a bundle-drop plays M5 (the seat) _and_ a Confirm. On a
high-frequency action the Voice layer stays silent (the frequency floor, §4) and
**Materiality carries it alone** — which is _why_ the app feels responsive on every
click without ever "saying" anything. The press has a body, not a voice.

---

## 4. The three magnitudes

Every utterance is defined at **three levels — primary, secondary, tertiary** —
and the level is not decoration. **The level encodes consequence.**

> A small thing said small. A big thing said big.

And consequence is inversely tied to frequency: the action you take constantly
gets the **most restrained** render so it never fatigues; the rare, weighty
action earns the **richest** render. This is what makes the variety _legible_ —
you can hear and see _how much just happened_ — and it auto-enforces Law 1.

**And the floor is zero.** Before "how big," ask Emil Kowalski's first question:
_should this animate at all?_ Things done 100+ times a day — and **every
keyboard-initiated action** (route shortcuts, a command palette) — get
**no motion**. Animating a keyboard action makes the app feel slow and
disconnected; Raycast has no open/close animation, and that is correct. The
richest renders are reserved for the rare and earned.

**This floor governs the Voice, not Materiality (§3.2).** It silences the app's
_commentary_ on frequent actions — no "success" chime, no animated route swap on
every keypress. It does **not** silence the interface's _physicality_: a dry detent
click on each arrow-key step, or a tactile down/up on a press, may ride the most
frequent action, because materiality is the event's body, not a remark about it.
Voice earns its volume by rarity; Materiality earns its presence by staying dry,
short, quiet, and abstracted.

**How each channel scales across the three levels:**

| Channel    | Tertiary (frequent, light) →      | → Primary (rare, weighty)                           |
| ---------- | --------------------------------- | --------------------------------------------------- |
| **Motion** | short travel, snappy, one element | longer settle, overshoot, a cascade of elements     |
| **Sound**  | single dry tick, quick decay      | layered material chord, fuller body, longer decay   |
| **Color**  | faint brief tint                  | fuller glow, wider spread, a sweep across the group |

**Worked example — a builder's "add" action, one utterance at three magnitudes:**

- **Add one item** (you do this constantly) → _tertiary Contact_: a small snap,
  a dry tick, a faint edge-glow. Gone in a blink.
- **Add a staged multi-selection** (less often) → _secondary Contact_: several
  pieces settle together, a slightly richer layered tick, a brief group-glow.
- **Drop a saved bundle** (rare, consequential) → _primary Contact_: the full
  choreography — pieces cascade into place and settle, a warm resolved material
  chord, a unifying tint sweeping the new group.

Same word, three volumes. The Lego metaphor holds: one brick clicks; a handful
clicks louder; a whole assembly lands with weight.

---

## 5. The laws

Non-negotiable. These are the taste filters that keep the language coherent and
keep it from ever costing the user something.

1. **Speak only when you have something to say — and touch only like matter.**
   Every expression maps to either an utterance (Voice, §3.1) or a materiality
   event (§3.2) — nothing is pure decoration. Voice keeps the frequency floor (§4):
   the default is still, silent, steady. Materiality keeps its own floor —
   abstracted, dry, and quiet, never a literal clip. Restraint _is_ the craft in both.

2. **Physically motivated.** Motion obeys mass, momentum, friction, and settle —
   never linear, never robotic. Sound is **material** (paper, wood, felt, a soft
   mechanism) before it is **digital** (blip, beep). Color **breathes and warms**
   like light, it does not blink like an LED. Analog ages well; digital dates
   fast.

3. **Subtle over flashy.** The user should _feel_ it before they _notice_ it.
   The moment they register an animation _as an animation_, it is too much.

4. **One language, everywhere.** The same utterance, at the same magnitude,
   looks and sounds and glows the same wherever it occurs. No per-route bespoke
   effects. Coherence is what makes this a language and not a pile of effects.

5. **Input-agnostic.** The language must never imply an affordance only one input
   device has — no left/right _directional_ route transitions, because keyboard
   shortcuts change routes with no direction and keyboard parity is a hard
   requirement. Motion expresses **meaning**, not **which device you used.**

6. **Ambient voice is peripheral.** The app may speak unprompted, but it must
   never _demand._ Stir, Guide, and Notice live at the edge of attention and
   yield instantly the moment the user acts. A living thing breathes quietly; it
   does not tug your sleeve. (Notice may persist — an amber "unsaved" tint stays
   until resolved — but it stays _quiet_ while it persists.)

7. **Never trade usability, latency, or access for delight.** Hard floor:
   - Respect `prefers-reduced-motion` — degrade to instant while keeping the
     meaning (a reduced-motion user still gets the state-change, minus the travel).
   - Sound is **on by default — we earned it** — with **one tap to mute in the
     settings bar, choice remembered.** Because browsers gate audio until the
     first user gesture, the opening sound rides the user's first interaction
     (the first Acknowledge), so it is never an autoplay surprise. Sounds are
     short and interaction-triggered, never required to understand state.
   - Color must never be the _only_ carrier of meaning (color-blindness) — it
     reinforces, it does not stand alone.
   - Nothing here may add perceptible input latency or block interaction.
     Feedback rides _on top of_ responsiveness; it never costs it.
   - Focus-visible, screen-reader semantics, and WCAG contrast are untouched.

8. **Derived, not bolted on.** Built as primitives — a token set plus a small
   roster of named motions, sounds, and color behaviors, each at three magnitudes
   — applied declaratively from the first component, never hand-tuned per screen
   at the end. Bolt-on craft is the brittle kind. **This is the law that lets
   craft and the MVP clock coexist:** a finite language is cheap to apply and
   compounds; bespoke polish is what blows timelines.

---

## 6. The system — how this becomes real

This doctrine is the constitution of the feedback layer. The work below derives
from it. Note where the numbers fall out on their own:

> **Three** is the artifact count — three channels, three magnitudes per
> utterance. **Four** is the process — the design method is a four-step loop.
> We honor the pattern only where it's real.

**The channel languages** _(the artifacts — build in this order of risk):_

- **`motion-language.md`** — the token set (durations, springs / easings), the
  named motions (snap, settle, lift, slide, fade, plus any app-specific
  choreography), and the §3 + §4 mapping made concrete. Built with the
  `micro-animation-director` / `emil-design-eng` craft. **Lowest risk — tooling
  and philosophy already exist. Build first.**
- **`color-language.md`** — the palette and its behaviors: the breathing
  gradient, status tints, contact glows, the warm/cool semantics, and the §3 + §4
  mapping. Built on a design-token system. **Medium risk — carries the entire
  Ambient register, so get the breathing right.**
- **Sound** — held at the doctrine level only (the §3 sound column + Law 2's
  material direction + Law 7's mute contract). Its deep channel language is
  **deferred to a separate thread** — it is the highest-risk, least-precedented
  channel and the one most prone to becoming a _toy_, so it waits until motion and
  color are proven and a clearer sound concept exists. **No sound engine, sample
  kit, or per-surface sound map is in scope now.**

**The four-step method** _(the process):_

- **`design-method.md`** — the repeatable route-breakdown (the "metaprompt").
  For any route: **(1) enumerate** the interactive elements → **(2) map** which
  §3 utterances each produces, at which magnitude → **(3) render** each across
  the three channels → **(4) check** the result against the §5 laws. This turns
  "design the feel" from inspiration into a procedure, which is the
  systematization that makes craft scale.

---

## 7. Two layers — the framework and its instantiation

This document is deliberately built in two separable layers, so the framework
stays portable across any project:

- **The framework (portable — this document).** The dialogue model (§1–2), the
  two registers, the two natures, the three channels, the utterance _types_ (§3),
  the three-magnitude scale (§4), the laws (§5), and the four-step method (§6).
  None of it names a domain, a stack, a provider, or a model.
- **The instantiation (per app).** The "where it shows up" bindings, the
  app-specific choreography, and the actual motion / sound / color assets and
  token values. Each app supplies its own; the framework supplies the language.

The seam is the worked examples and the surface-specific detail. To adopt the
framework in a new project: lift §1–6, leave the example bindings behind, and
author that app's own.

This is exactly what Emil Kowalski's _agents-with-taste_ argues for: taste
transmitted to AI as **explicit, packaged rules fed to agents as constraints**.
This doctrine and its channel languages _are_ those rules — which is precisely
Made Well's premise: deliberate, craft-first software, lean and agnostic to any
one provider or model.

---

The test for every line of this system is the rubric:
**does it lead to craft, beauty, and care?** If a motion, a sound, or a color
cannot answer yes, it does not ship.

The goal is not that the user notices. The goal is that I do.
