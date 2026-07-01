# The Color Language

### The COLOR channel of the Feedback Doctrine

**Written:** 2026-06-13
**Author:** Josh
**Derives from:** [`DOCTRINE.md`](./DOCTRINE.md) (§3 · §4 · §5)
**Grounded in:** Evil Martians' **Harmonizer** (OKLCH + APCA generation) and Roman Shamin's leveled-token color-token generator. Harmonizer / `apcach` is the recommended generation **engine**; this doc is the color **spec**.
**Status:** Color Language — v0.2 (draft). Level→contrast targets and OKLCH ranges are starting points to tune; the architecture is the spec.

---

## 0. What this is

The COLOR channel has **two layers**:

- **The complexion** — the resting, accessible **palette/scale**: the token system
  the whole app is painted from. Static. (§1–§3.)
- **The voice** — how color **speaks** the utterances: glows, tints, the breathing
  gradient. Dynamic. (§4.)

Color carries the **Ambient register** best (Doctrine §2) — and it is the channel
that **remains when motion is removed** (reduced-motion keeps opacity/color), so it
quietly carries comprehension on its own.

---

## 1. Foundations (non-negotiable)

- **OKLCH is the authoring space.** `oklch(L C H)` — L = perceptual lightness
  (0–100%), C = chroma (0 → ~0.37), H = hue (0–360°). Why: **perceptual
  consistency** — colors at the same level _feel_ visually equivalent across
  hues, and changing one hue doesn't disturb the palette's relationships.
- **Contrast-first, via APCA.** Color pairs are validated with **APCA** (the
  Accessible Perceptual Contrast Algorithm, Lc values) — tuned for self-lit
  screens. Generate with **`apcach`** (Evil Martians): _"give me the color that
  has Lc X against this background, at this chroma and hue"_ → out comes OKLCH.
- **APCA is the design target; WCAG 2.1 AA is the compliance floor.** APCA is the
  WCAG 3 candidate but not yet a conformance standard. So: design to APCA for
  perceptual quality, **and validate critical text/UI against WCAG 2.1 AA** until
  WCAG 3 lands (the `ui/` accessibility mandate still governs). Harmonizer's
  `APCACH` blends both — use it.
- **No pure black, no pure white.** Neutrals are **tinted toward the brand hue**
  with chroma reduced at the extremes (04-DESIGN.md). Light bg ≈ `oklch(98% 0.004 H)`,
  dark bg ≈ `oklch(20% 0.01 H)` — never `#fff` / `#000`.
- **Light + dark are first-class and mirror by construction** (see §2).
- **Color is never the only carrier of meaning** (Law 7 — color-blindness). Every
  color signal is reinforced by motion, sound, icon, text, or position.

---

## 2. The architecture — levels are **contrast-anchored** (your open question, resolved)

You asked: full spectrum per theme, or one palette across both — "300 for dark,
600 for light"? Here's the cleaner answer Harmonizer enables.

There are two ways to define a "level":

- **Lightness-anchored** (Tailwind 50–950): a level = a fixed _lightness_. In dark
  mode you must **flip** which step a role references (text = 900 in light, 100 in
  dark). This is the "300/600" instinct — it works, but it means maintaining the
  flip map.
- **Contrast-anchored** (Harmonizer / Radix): a level = a fixed **APCA contrast
  role against the theme's background.** Level `600` means _"Lc 60 vs the current
  background"_ in **both** themes. The OKLCH lightness that satisfies that is
  darker in light mode and lighter in dark mode — but **the level number and its
  meaning never change, and you never flip.** Light and dark _mirror_ automatically.

**Recommendation: contrast-anchored.** It dissolves your question — you author
**one scale**, the level number _is_ the contrast contract, and the color resolves
correctly per theme with no flip map. This is exactly Harmonizer's promise:
_"change colors of the same level and the text contrast remains exactly the same."_

_(The specific step numbers — 600, 338, 450, whatever — are arbitrary anchors,
not magic values. The discipline is "good defaults via the contrast engine," and
the set is freely tunable; pick what reads well and move on.)_

### Two orthogonal hue families (one level system)

The palette is **two families on the same contrast-anchored level architecture** —
they may share a hue here and there, but they are conceptually orthogonal axes:

- **Family A — the brand scheme** _(derived, per-brand)._ The site's identity:
  tinted neutrals, surfaces, borders, text, and the brand **accent**. Comes out of
  the §3 derivation pipeline (brand guidelines or image), run once per brand.
- **Family B — the functional spectrum** _(universal, fixed hues)._ A complete
  signal set — **red · amber · green · blue · purple** — generated at the **same
  APCA levels** but **not derived from the brand**, because their meaning is
  cultural and must hold regardless of brand.

**Why orthogonal:** you never want the brand color to _be_ the error color — that
collapses "danger" and "identity" into one signal. So Family B is its own axis. If
the brand accent and a functional hue happen to land on the same hue, they stay
**distinct tokens** (`--accent` ≠ `--info`) so meaning never blurs.

**The invariant that ties them:** _one level system._ Because every family is
contrast-anchored on the same scale, `--accent-600`, `--red-600`, and `--green-600`
all carry the **same contrast behavior** — consistency across the whole palette.

#### Family A — brand (per-brand, derived)

| Role       | Token                                             | APCA Lc target                   |
| ---------- | ------------------------------------------------- | -------------------------------- |
| Background | `--background`                                    | — (the anchor)                   |
| Surfaces   | `--surface-1 / 2 / 3`                             | small ΔL from bg (raised planes) |
| Borders    | `--border-1 / 2 / 3`                              | Lc ~15 / 22 / 30                 |
| Text       | `--text-tertiary / secondary / primary / max`     | Lc ~45 / 60 / 75 / 90            |
| Accent     | `--accent` · `--accent-subtle` · `--accent-hover` | Lc ~60 on bg                     |
| On-accent  | `--on-accent`                                     | Lc ~75 vs `--accent`             |

#### Family B — functional spectrum (universal, fixed hues, same levels)

| Hue    | Semantic alias         | Drives (utterance)                                                                                                         |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| red    | `--error` (+ subtle)   | Refuse                                                                                                                     |
| amber  | `--warn` (+ subtle)    | Notice (unsaved / pending)                                                                                                 |
| green  | `--success` (+ subtle) | Confirm                                                                                                                    |
| blue   | `--info` (+ subtle)    | informational state                                                                                                        |
| purple | `--ai` (+ subtle)      | Guide · Stir · AI-generated content _(proposed — purple = AI/assist, fitting an AI-native surface; push back if wrong)_ |

Each functional hue is a full APCA-leveled scale generated through the §3 engine —
never stock green/red, always on the same accessible levels. (Yellow → **amber** for
contrast.)

The Doctrine's **three magnitudes** draw from both families: the leveled
surfaces/borders/text _are_ the static expression of primary/secondary/tertiary;
a color utterance (§4) picks intensity and hue from these tokens.

### Multi-brand (instantiation example)

An app may serve **multiple brands**. The pipeline (§3) runs **once per brand** →
brand-scoped, accessible token sets, switched at the root. The framework (OKLCH ·
APCA · levels · pipeline) is portable; the brand seeds are the per-app instantiation.

---

## 3. The palette pipeline (derivation → accessibility — your main interest)

The two-step you described — _create the palette_, then _transform it into an
accessible space_ — as a concrete pipeline, and what an agent consumes
(agents-with-taste).

1. **Source** — seed the hue(s) from either **brand guidelines** (existing brand
   hex) **or an uploaded image** (extract dominant colors by clustering in OKLCH —
   cluster on H/C, not RGB, for perceptual grouping).
2. **Harmony** — from the seed, generate a harmony: **monochromatic · complementary
   · analogous · triadic** → the set of base hues (and their roles: brand, accent,
   status).
3. **Generate the scale** — per hue, an OKLCH ramp with **APCA-anchored levels**
   (`apcach`), consistent chroma per level, neutrals tinted toward the brand hue,
   chroma reduced at the extremes, no pure black/white.
4. **Map to semantics** — assign levels to the §2 roles; because levels are
   contrast-anchored, the light/dark mapping is automatic.
5. **Export** — CSS custom properties / Tailwind tokens / JSON (Harmonizer emits
   all three). The output is a leveled token set, light + dark, **accessible by
   construction.**

---

## 4. The color voice — the §3 × §4 utterance renders

How color _speaks_, drawn from the palette (§2). Magnitude scales intensity:
**tertiary** = faint, brief tint · **primary** = fuller glow, wider spread, a sweep
across the group.

| Utterance               | Color render                                                                          | Token source                             |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Acknowledge**         | brief tint-flick on the pressed element                                               | surface → surface+1                      |
| **Confirm**             | success-hued glow that fades to rest                                                  | `--success-subtle`                       |
| **Change state**        | subtle cross-tint as context shifts                                                   | surface/accent shift                     |
| **Contact**             | edge-glow where pieces meet; bundle adopts a unifying tint                            | `--accent-subtle`                        |
| **Move under friction** | faint trailing tint along the path; drop-target warms                                 | `--accent-subtle`                        |
| **Refuse**              | brief desaturate, or a low warning tint — never an alarm flash                        | `--error-subtle`                         |
| **Stir** _(ambient)_    | slow breathing gradient — inhale/exhale **luminosity**                                | bg ±ΔL (or `--ai` when it's AI thinking) |
| **Guide** _(ambient)_   | a halo pulsing out of the affordance, then fading                                     | `--ai-subtle`                            |
| **Notice** _(ambient)_  | sustained gentle tint (amber = unsaved/pending) — **quiet while it persists** (Law 6) | `--warn-subtle`                          |

_(Two natures, Doctrine §3: the rows above are **Voice**. "Move under friction" has
moved to **Materiality** (§3.2) — its color is the diegetic trailing tint of a drag,
not a message. Materiality's full color treatment is future work.)_

---

## 5. Light/dark & the breathing gradient (specifics)

- **Backgrounds** are tinted and off-extreme (§1). The brand hue lives faintly in
  every neutral — Roman Shamin's "amount of color in gray" knob is literally the
  neutral chroma.
- **The Stir breathing gradient** modulates **luminosity (L) only**, by a few
  percent over a slow cycle — never hue or chroma jumps, never a hard pulse. Low
  amplitude, peripheral (Law 6).
- **Status hues** (success/warn/error/info) are generated through the §3 pipeline
  at matching APCA levels, so they're accessible and _on-palette_, not bolted-on
  stock colors.
- **P3 vs sRGB** — author in P3 for wide-gamut displays with an sRGB fallback
  (Harmonizer supports both; it inherits the document color space).

---

## 6. Open to prototype / decide

- **Confirm contrast-anchored levels** (vs the lightness-anchored flip) — your call;
  it's the architecture decision everything else rests on.
- **APCA as design target + WCAG 2.1 AA as compliance floor** — confirm this dual
  stance is acceptable for your needs.
- **The canonical level count** — Harmonizer uses 100–900, Radix uses 12, Roman
  Shamin used text max/1/2/3 + surface/border 1/2/3. Pick your set (§2 is a draft).
- **Image extraction** — the clustering approach for "upload an image → palette."
- **Brand-switch mechanism** — root data-attribute vs separate stylesheets.

---

The test, as always: **does it lead to craft, beauty, and care?**
Color that can't answer yes — or can't clear the contrast floor — does not ship.
