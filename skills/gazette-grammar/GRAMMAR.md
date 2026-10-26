# Gazette Grammar

A design system for interfaces in a terminal or on the web, taken from the statistical charts of
*Cerîde-i Adliyye* (the Justice Gazette, Ankara, mid-1920s).
Source: https://casualarchivist.substack.com/p/poetic-justice. Eleven chart sheets were studied
there on 2026-10-25.

## The one law

**A view is written before it is drawn.** Every screen exists first as a *blazon*: a short
description in words (and in data) of its sheet, its colours and its marks. A renderer paints the
blazon and adds nothing of its own. The terminal and the browser are two painters working from the
same blazon, as two heralds paint the same arms. If a design choice cannot be written in the
blazon, it is not part of the system.

Everything below is the vocabulary a blazon may use.

---

## 1. Tinctures

The values live in one place, [`tinctures.json`](tinctures.json), and every painter reads them
from there. They were sampled from the scans: saturated pixels were binned by hue, and the median
of each bin taken. Scans fade and yellow, so tune the values on a real screen. **The hue
relationships are the law; the exact values are not.**

### Grounds (the paper)

| Name | Seen as |
|---|---|
| Paper | the ordinary sheet |
| Buff | warmer sheets |
| Wash | a pale blue sheet (the fan-web chart) |
| Slate | a grey-green sheet (the concentric-arcs chart); also the surface around a sheet on screen |

### Inks

| Name | Seen as | Hatching |
|---|---|---|
| Ink | keylines, lettering, hairlines, the black band in rings | none |
| Vermilion | the principal colour: discs, bars, the stepped vessel | vertical lines |
| Rose | the soft partner of vermilion: arcs, the map | sparse vertical lines |
| Ochre | crescents, dots, bars | dots |
| Sage | the vessel field, the green half of mirrored forms | diagonal lines |
| Slate blue | the rare cool ink: bars, dots | horizontal lines |

Reserve inks, which appear on a single sheet each: Olive, Orange, Teal, Maroon. Use one only when
a blazon needs a seventh distinction.

### The law of tinctures

1. **Two inks never touch without a keyline of Ink between them.** An ink may sit directly on a
   ground. In the stepped chart, vermilion meets sage only across an Ink line. In the ring chart,
   rose and ochre are parted by an Ink band.
2. **The keyline falls on the shadow side:** the lower and right edges of a filled form, one unit
   thick and hard-edged. This is the only depth cue the system has, and it is drawn, never blurred.
3. **At most three inks per mark and five per sheet.** The sheets studied use three to five.
4. **Light inks are not grounds.** Rose and ochre are for marks; they are never used as a sheet.
5. **Every inked shape is bounded by Ink.** The inks are light against Paper (vermilion 2.75 : 1,
   sage 1.56 : 1, ochre 1.28 : 1, all short of the 3 : 1 that meaningful graphics need), so the
   shape is carried by its Ink keyline and rules, which reach 11 : 1. Ink on vermilion is 4.0 : 1,
   so lettering on vermilion is set large and bold, at least 19px.
6. **Meaning never rests on colour alone.** Each ink is drawn with its hatching, the engraver's
   pattern that heraldry uses for the same problem (after Petra Sancta, 1638). Where a renderer
   is too coarse for hatching, words carry the second cue instead.
7. **One ink, one meaning per sheet.** If vermilion means "waits on you", everything vermilion
   on that sheet waits on you, including the count and the one action.

## 2. The sheet

- **Portrait**, about 2 : 3. A wide screen holds sheets side by side; it does not stretch one.
- **Double-rule frame:** a heavy outer rule and a thin inner rule, with a margin inside them.
- **Masthead:** the sheet's name in the display hand, top centre. The sheet number goes in one
  top corner and the date in the other. Every view has one, so you always know which sheet you
  are on.
- **One principal form per sheet,** centred, and symmetric about the vertical axis wherever the
  data allows.
- **Colophon:** one line of small text at the foot that says where the figures came from.
- **The margin stays empty.** Air around the form is part of the form.

## 3. Ordinaries: the structure that carries the marks

| Ordinary | What it is | Carries |
|---|---|---|
| **Ledger rule** | a hairline grid: Ink rules on a ground, or ground-coloured rules on a tinted fill | every count; it is the unit of the whole system |
| **Frame** | the double rule | the sheet's edge |
| **Masthead** | name, number, date | which sheet this is |
| **Legend of discs** | a row or column of small inked discs, each with one word | what each ink means; it is the only free-standing key allowed |
| **Seal** | a round emblem near the masthead | that the sheet is authoritative: a passed, signed or final state |
| **Notice** | a short paragraph under a rule, keyed to its mark by a numbered disc | what one mark means for the reader, and what to do |
| **Stamp** | a square-cornered control: a ground or ink fill, an Ink rule, a keyline on the shadow side | an action. Pressed, it sinks into its keyline. At most one stamp per sheet is filled with vermilion. |

Rules separate the parts of a sheet, as column rules do in a newspaper. They never box a group:
there are no cards.

## 4. Charges: the marks that carry data

Every chart in the source is built from a small set of marks. A blazon names the charge, then
says what it is charged with.

| Charge | Form in the source | Carries |
|---|---|---|
| **Disc** | a filled circle, sometimes charged with a number | one count or one state |
| **Rings** | concentric bands, each parted by Ink, with values written on the bands | parts of a whole; nested totals |
| **Crescent** | a band of ink wrapping part of a disc | a share of a whole, or a share of a year |
| **Spoke ellipse** | bars radiating around an oval, labelled along the rim | a cycle or a long series: hours, days, runs |
| **Snake bar** | a thick bar that turns back on itself in U-bends | one long quantity that will not fit on one line |
| **Stepped vessel** | a mirrored histogram filled cell by cell on the ledger rule, in two inks | a distribution, and how two kinds compare |
| **Blades** | upright forms rising from a vessel whose body is ruled into numbered cells | a total and what grows out of it |
| **Fan web** | a ruled grid drawn in perspective, with dots placed in its cells | two dimensions at once |

**Stepped or smooth is decided by the charge, not by the renderer.** The stepped vessel is
stepped in the source, cell by cell, so it is stepped everywhere. Rings and crescents are smooth
in the source. The web draws them smooth; the terminal draws them as finely as its cells allow.
Either way, it is the same charge.

## 5. Lettering

- **Numbers are written inside or along their form,** never in a table set apart from it.
- **Labels follow the form:** along the curve of a ring, around the rim of an ellipse.
- **Two hands only:** a display hand for the masthead, and a text hand for everything else.
- **Do not imitate the source's script.** The gazette is in Ottoman Turkish, in Arabic script, in
  its last years before the 1928 alphabet reform. Pick a Latin display hand drawn with a pen
  (broad-nib contrast); see *Open*, below.

## 6. The blazon

A view is written in words first:

> *A sheet on Paper, double framed. Masthead "Runs", sheet 12, 25 Oct. The principal form is a
> spoke ellipse of 24 spokes: vermilion for failed, sage for passed. At its centre is a disc of
> ochre charged with the total. A legend of two discs sits at the foot. Sealed.*

The same blazon as data:

```json
{
  "sheet": { "ground": "paper", "frame": "double", "masthead": { "name": "Runs", "number": 12, "date": "2026-10-25" }, "sealed": true },
  "principal": {
    "charge": "spoke-ellipse", "count": 24,
    "inks": { "failed": "vermilion", "passed": "sage" },
    "centre": { "charge": "disc", "ink": "ochre", "charged": "total" }
  },
  "legend": ["failed", "passed"]
}
```

Both renderers read only this. Anything they draw that this does not name is a defect.

## 7. The two painters

| | Terminal | Web |
|---|---|---|
| Ledger unit | one character cell | one grid cell (CSS grid or SVG units) |
| Inks | 24-bit colour from the table; a fixed 256-colour mapping as fallback | the same hex values |
| Hairlines | box-drawing characters | 1-unit SVG strokes |
| Stepped charges | whole and half blocks | filled cells on the grid |
| Smooth charges | braille or half-block approximation | SVG curves |
| Keyline | lower one-eighth block and right one-eighth block on the shadow side | a 1-unit offset stroke in Ink, below and to the right |
| Masthead | built from block letters or box rules | the display hand |

### Too fine for the medium

**A line or pattern finer than the renderer's unit is dropped, never thickened.** In a terminal
the unit is half a character cell, so hairline tracks and hatching disappear there; the labels
then carry what they carried, in words. Thickening a hairline to make it show would change what
the sheet says.

## 8. Hard avoidances

- No gradients, blur, glow, glass or soft shadows. The only depth is the drawn keyline.
- No rounded corners. A shape is square or it is round (a disc, a ring); there is nothing between.
- No paper textures, grain overlays, sepia filters or "aged" effects. The age comes from the
  grammar, not from damage. The scans' yellowing is a hundred years of decay, not the design.
- No two inks touching without a keyline.
- No pure screen colours (`#ff0000`, `#00ff00`, `#0000ff`) and no neon. The inks are muted,
  printed colours.
- No dashboard furniture: KPI tiles, card grids, rows of sparklines, sidebars of numbers.
- No free-standing tables of figures beside a chart. The numbers go inside the form.
- No form without a blazon, and no renderer-only decoration.
- No imitation Arabic or Ottoman lettering or ornament used for flavour. The source's meaning
  sits in a real script transition; borrowing its look as an exotic costume is the failure.
- No more than one principal form per sheet.

## Corrections from the evidence

The first, unseen draft of this system made two claims that the scans contradict:

- *"No pastel palette"* was wrong: Rose and Wash are pastel and central. The rule is now "no
  neon, no pure screen colours".
- *"No smooth curves on the web that the terminal can't step"* was wrong: the rings are smooth.
  Whether a mark is stepped now belongs to the charge (section 4).

It also gained a rule it did not have, the shadow-side keyline, which was visible only once the
sheets were seen up close.

The first mockup (`mockup/`) added four more: hatching as the second cue, the contrast rule for
light inks, one ink per meaning, and dropping what is too fine for the medium. It also added the
Notice and Stamp ordinaries, because the source is print and has no controls.

## Open

- **Display hand.** Recommendation: a broad-nib serif with real stroke contrast, used only in
  mastheads. Choose it on screen next to the inks.
- **On-screen tuning.** Tune the ink values against a real Paper ground in both renderers. Keep
  the hue relationships; move only lightness.
