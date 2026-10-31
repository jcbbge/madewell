---
name: gazette-grammar
description: The Gazette visual language for interfaces in a terminal or on the web, taken from the 1920s Justice Gazette charts. A screen is first written as a blazon (a description of its sheet, inks and marks), then painted from it. Layered over the interface skills in jakubkrehel/skills (better-ui, better-colors, better-layout, better-typography, better-accessibility, better-writing, better-interface). Those skills decide what an interface must do; this one decides how it looks. Use when building, restyling or reviewing an interface that should carry the Gazette look. Not for an interface that has its own established design system.
---

# Gazette grammar

## Who decides what

Two layers, with a fixed order of precedence:

- **The interface skills decide function:** what must be reachable, readable, pressable, announced
  and understood. Their requirements win: contrast ratios, hit areas, visible focus, keyboard
  access, one primary action, plain words.
- **This grammar decides form:** colour, shape, depth, lettering and composition. It replaces the
  interface skills' *visual values* (a radius, a shadow recipe, an easing curve, a colour ramp).
- **A clash between the two** is settled in [references/layer.md](references/layer.md): take the
  job the rule's visual value was doing and do that job in Gazette form. If the grammar has no way
  to do the job, the grammar grows. It never drops the requirement. Hatching and the Stamp were
  both added this way.

## The law

**A view is written before it is drawn.** Read [GRAMMAR.md](GRAMMAR.md) before anything else. Its
values live in [tinctures.json](tinctures.json).

## Procedure

1. **Read the surface.** Find out what the product can show and do: its read API, its commands
   and its states. Every mark on the sheet must come from something real.
2. **Write the blazon** as data, one per sheet. Every fill, word and action is named in it. Write
   its words with `better-writing`: plain, verb-first, no internal vocabulary. Pick one principal
   charge for the data's shape (GRAMMAR.md, section 4).
3. **Paint from the blazon only.** A painter reads the blazon and `tinctures.json` and draws
   nothing else. It refuses an unknown tincture and more than one vermilion stamp.
   `mockup/paint-web.mjs` and `mockup/paint-tty.mjs` are reference painters.
4. **Check both layers.**
   - The grammar: the avoidances (GRAMMAR.md, section 8), the law of tinctures, one ink per
     meaning, nothing too fine for the medium.
   - The function: run `better-interface` on the rendered sheet, and measure contrast with
     `better-colors`.
   - Settle every clash through the layer.
5. **If the interface targets both media, paint both from the same blazon and compare them.** A
   difference that is not a medium limit is a defect in a painter, or a gap in the grammar.

## Done when

The sheet has been opened and looked at in each target medium. It passes both checks, and every
clash found is either resolved through the layer or written into GRAMMAR.md as a new rule.
