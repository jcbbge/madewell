# The layer: interface skills, in Gazette form

The interface skills are [jakubkrehel/skills](https://github.com/jakubkrehel/skills) (MIT). Their
rules are summarized here, not quoted; read them there.

For each rule that names a visual value, this table gives the job that value does and how the
grammar does the same job. Rules not listed here apply unchanged.

| Skill and rule | The job it does | Gazette form |
|---|---|---|
| better-ui: radius tokens; outer radius equals inner radius plus padding | nested surfaces read as one family | No radius at all. Shapes are square or round. Nesting is shown by the inset of the double frame. |
| better-ui: layered shadows for elevation | shows what sits above what | A hard keyline on the shadow side, thicker the higher the layer: sheet 5, stamp 3, disc 2. Never blurred. Keep a real 1px border underneath, because forced-colours mode removes shadows. |
| better-ui: press scales the button down | confirms the press at once | The stamp sinks into its keyline: it moves 2px down and right and the keyline narrows from 3 to 1. Instant. |
| better-ui: hover feedback only on hover-capable pointers | hover never sticks on touch | Kept. The stamp lifts by 1px and its keyline widens, inside `(hover: hover)`. |
| better-ui: staggered entrances with blur and slide | sequence shows hierarchy | No blur and no slide. A sheet appears whole, like a printed page. Hierarchy comes from the masthead, the principal form and the notices, in that order. |
| better-ui: icon stroke matches text weight | icons and text read as one | Icons come only from the charges (disc, ring, crescent) and are drawn in Ink hairline. |
| better-colors: a system is ramps of steps | every state has a colour with a job | No ramps. Grounds and inks are fixed. States are shown by fill against ground, the keyline and hatching, not by lightness steps. |
| better-colors: one filled action per view | the primary action reads across the room | Kept and enforced: one vermilion stamp per sheet, and the painter refuses a second. |
| better-colors: one colour, one meaning | colour can be learned | Kept per sheet (GRAMMAR.md law 7). The mockup broke it, with an ochre count disc where ochre meant "set aside", and was fixed. |
| better-colors: choose a gradient's interpolation space | gradients look right | There are no gradients. |
| better-colors and better-accessibility: measured contrast | everyone can read and see it | Kept and measured. The light inks fail 3 : 1 on Paper, so every inked shape is bounded by Ink (11 : 1) and text on vermilion is large and bold (4.0 : 1). |
| better-accessibility: pair colour with a second cue | colour-blind and monochrome readers | Hatching on the web, and words in the terminal (GRAMMAR.md law 6). |
| better-accessibility: visible focus ring | keyboard users see where they are | A 4px double Ink rule, an echo of the frame. 11 : 1 against Paper. |
| better-accessibility: minimum hit area | easy to press | Kept. A stamp is at least 44px tall. |
| better-layout: group with space, not lines | lines add noise | Kept inside a group. Rules appear only between the parts of a sheet, as column rules do. They never box a group, so there are no cards. |
| better-layout: order by importance; one primary action | the eye lands on what matters | Kept. The masthead comes first, then the principal form, then the notices, oldest wait first. |
| better-typography: few fonts, sizes and weights | coherence | Two hands: a display hand for mastheads and names (Alegreya in the mockup) and a text hand for everything else (Alegreya Sans). Alegreya is a typeface drawn from calligraphy. |
| better-typography: tabular numbers on changing values | figures do not jitter | Kept on the whole sheet. |
| better-writing: everything | readers know what to do | Kept entirely. Mastheads, notices and colophons follow it too. Engine vocabulary stays out of the sheet, and the product's own message is quoted, not paraphrased. |
| better-interface and interface-review | one ranked report | Run them unchanged on the rendered sheet, then apply this table to any finding about a visual value. |
