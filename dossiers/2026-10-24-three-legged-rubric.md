# The Three-Legged Rubric — a product-decision framework for Made Well

## Purpose / lineage

This rubric is derived from Calvin Grunewald's essay "My New Agentic Workflow" (*The Building Machine*, Oct 2026), whose core move is reframing the optimization function from "maximize agent output" to "minimize human attention," expressed as an attention × impact matrix with tools mapped to regions.

It is generalized here for a solo indie developer who optimizes for speed and craft simultaneously. Grunewald's single 2-axis matrix becomes **three Eisenhower-style 3×3 matrices**, one per stakeholder.

The three legs divide by **who is served** — the developer, the end-user, and the agent — **not** by artifact type. This stakeholder basis is why the stool stays at exactly three legs. For example, "UI" is a facet of the end-user's experience, not a fourth leg.

## The triple gate

Before any decision, feature, or choice, ask the three leg-questions and score hit/miss on each:

1. **DX** — "What leads to a world-class developer experience?"
2. **UX** — "What makes a memorable and lovable user experience?"
3. **AX** — "What gives an efficient, optimized agentic experience?"

Verdict:

- **Hit all three** → something special; build with conviction.
- **Hit two** → a good spot; proceed.
- **Hit fewer than two** → below the bar; reshape or reconsider.
- **Hit zero** → do not build; stop; you are burning time, money, effort, and resources you cannot spare.

Each leg is a 3×3 matrix on a shared meta-structure: **value axis × scarce-resource/cost axis**, each axis banded **low / med / high**. Nine cells, each a verdict + action.

## Leg 1: Developer Experience — Leverage × Friction-to-adopt

**Value axis — Leverage:** how much it compounds a developer's power — clarity, reuse, well-documented APIs, abundant examples, "understood it in 30 seconds."  
Low → nice detail · Med → real convenience · High → compounding power

**Cost axis — Friction-to-adopt:** cognitive load + setup pain to pick it up and wire it in.  
Low → drop-in · Med → some ramp · High → fight it

Cells: rows = Leverage HIGH/MED/LOW; columns = Friction LOW/MED/HIGH.

| Leverage \ Friction | LOW | MED | HIGH |
|---|---|---|---|
| **HIGH** | ① **Ship now** — flagship DX win | ② **Do it** — smooth the rough edges | ③ **Worth it** — but invest to cut the friction first / sequence it |
| **MED** | ④ **Easy yes** — batch it in | ⑤ **Default backlog** — do when it's on the path | ⑥ **Defer** — needs a real justification |
| **LOW** | ⑦ **Cheap polish** — only when idle | ⑧ **Skip** unless it unblocks something | ⑨ **The trap** — do not build |

## Leg 2: User Experience — Delight × Cognitive load

**Value axis — Delight:** love, dopamine, beauty, "I want to come back." Beauty and visual craft live here.  
Low → neutral · Med → pleasant · High → lovable/memorable

**Cost axis — Cognitive load:** everything the user's mind must carry — steps, clicks, decisions, and visual clutter/noise; not just interaction count.  
Low → effortless/calm/obvious · Med → a little thinking · High → noisy/confusing

Cells: rows = Delight HIGH/MED/LOW; columns = Cognitive load LOW/MED/HIGH.

| Delight \ Cognitive load | LOW | MED | HIGH |
|---|---|---|---|
| **HIGH** | ① **The magic moment** — beautiful & effortless; what they love you for | ② **Strong** — ship it, then quiet the noise | ③ **Locked treasure** — worth it, but the clutter buries it; cut the load |
| **MED** | ④ **Easy goodwill** — clean & simple | ⑤ **Standard** — do when it's on the path | ⑥ **Reconsider** — declutter before you commit |
| **LOW** | ⑦ **Invisible plumbing** — calm, unnoticed; fine if near-free | ⑧ **Skip** — not worth the user's attention | ⑨ **The cluttered wall** — joyless AND noisy; nothing to love, everything to parse. Never ship. |

## Leg 3: Agentic Experience — Capability × Ambiguity

**Value axis — Capability:** how much it extends what the agent can actually **do and verify** — real tools, ground truth, feedback loops, the power to act and prove rather than guess.  
Low → hamstrung · Med → workable · High → full power to act & verify

**Cost axis — Ambiguity:** how much the agent must operate blind — guess intent, hunt for context, no clear "done," no way to self-check.  
Low → fully grounded · Med → some guessing · High → blind

Token/time cost is deliberately **not** an axis. It is the shadow of ambiguity: agents burn tokens when uncertain. Token-efficiency falls out of staying away from the high-ambiguity corner rather than being its own dimension.

Cells: rows = Capability HIGH/MED/LOW; columns = Ambiguity LOW/MED/HIGH.

| Capability \ Ambiguity | LOW | MED | HIGH |
|---|---|---|---|
| **HIGH** | ① **The dream slice** — full power, full clarity; act & prove. Build toward here. | ② **Strong** — tighten the brief/context | ③ **Powerful but blind** — great tools, unclear goal; resolve the ambiguity or the power is wasted |
| **MED** | ④ **Clear but limited** — give it better tools/feedback | ⑤ **Workable middle** — default, fine on the path | ⑥ **Shaky** — limited power, murky goal; don't rely on the result |
| **LOW** | ⑦ **Clear but hamstrung** — understands, can't do much; low-stakes only | ⑧ **Weak** — little power, murky goal; avoid | ⑨ **Blind guessing** — no tools, no clarity; where agents hallucinate and burn tokens. Never operate here. |

## The dual use

The rubric runs in two directions:

1. **Forward** — the lens an agent uses to make a decision autonomously: score the options across the three legs, then pick the one that best clears the triple gate.
2. **Reverse** — the schema for how an agent surfaces a decision that needs the operator. Instead of a contextless one-line question, the agent presents a structured **needs your attention**:
   - what is being decided;
   - the candidate paths;
   - what each path gets and costs across DX / UX / AX;
   - what happens if we do not decide;
   - the agent's recommendation and reasoning;
   - an explicit request for the operator's mental model, since the operator holds context the agent lacks.

Made Well already has the mechanism this upgrades: the **hold** surfaced via `mw next` / `mw holds` / the sidecar's **NEEDS YOU** panel currently emits a freeform message + questions. The reverse-direction schema is the planned upgrade to that hold's shape. This dossier flags it as the seam to a separate future UX pass; do not implement it now.

## Reconciliation with current baseline

Baseline checked against `FOUNDATION.md`, `README.md`, `AGENTS.md`, and the worker brief/instruction text in `src/engine.ts` as of `origin/main` at commit `95c7081`.

### What already matches

- `FOUNDATION.md` already defines the same three stakeholder obligations: developer experience, user experience, and agentic experience.
- `FOUNDATION.md` ruling 18 already states the three-question decision discipline in compact form: world-class DX, memorable/lovable UX, and efficient/optimized agentic experience.
- `FOUNDATION.md` already requires that a choice advance at least two of the three experiences, and says a spectacular gain in one does not justify neglecting the other two.
- `FOUNDATION.md` already says none of the three has default priority and warns not to collapse developer experience into agent convenience or user experience into developer convenience.
- `AGENTS.md` and the worker brief in `src/engine.ts` carry the same three-question rubric into agent instructions.
- `README.md` does not restate the rubric independently; it points to `FOUNDATION.md` as operator law.

### Divergences, tensions, and significant extensions to flag

1. **This dossier operationalizes the rubric into three explicit 3×3 matrices.** The baseline has the three questions and equal obligations, but not the Leverage × Friction-to-adopt, Delight × Cognitive load, or Capability × Ambiguity matrices, and not the nine cell-level verdicts/actions.
2. **The dossier's triple gate is more mechanical than the baseline wording.** The baseline says a choice must advance at least two, but also says the rubric is "not a mechanical majority vote" and asks agents to name magnitude, consequences, uncertainty, and future implications. The dossier keeps the two-of-three bar but adds hit/miss scoring and direct verdicts: all three = build with conviction, two = proceed, fewer than two = reshape/reconsider, zero = stop.
3. **The dossier sharpens the governing questions.** Baseline Foundation wording asks what moves toward a 10× better developer/user/agentic experience; ruling 18 uses closer phrasing to this dossier. The dossier locks the questions as world-class DX, memorable/lovable UX, and efficient/optimized AX.
4. **The UX leg makes beauty and visual craft first-class inside user experience.** The baseline includes usefulness, enjoyment, confidence, memorable, and lovable product; this dossier significantly extends that by making Delight the value axis and explicitly placing beauty, dopamine, and visual craft there.
5. **The AX leg reframes token/time cost.** The baseline says agentic experience includes avoiding wasted tokens, time, effort, energy, and money, and has a separate "Resource and token discipline applies throughout" section. This dossier deliberately does not make token/time cost an AX axis; it treats token burn as the shadow of ambiguity. That is compatible as an implementation model, but it is a significant reframing of how token efficiency is evaluated.
6. **The cost/resource treatment is more distributed here.** The baseline treats cost, tokens, latency, context consumption, tool activity, and human attention as constraints across all three experiences. This dossier assigns each leg its own scarce-resource/cost axis — friction-to-adopt, cognitive load, and ambiguity — while still preserving the two-of-three decision bar.
7. **The reverse-direction schema extends the current hold shape.** Current Made Well holds surface freeform messages/questions through `mw next`, `mw holds`, and the sidecar. This dossier specifies a structured operator-attention schema with candidate paths, DX/UX/AX gets/costs, consequences of no decision, recommendation, reasoning, and a request for the operator's mental model.
8. **The reverse-direction schema must be reconciled with the baseline rule against routine operator escalation.** `FOUNDATION.md` says routine design choices are settled by the rubric and not sent to the operator. The dossier's reverse use is therefore only for decisions that genuinely need operator attention, not ordinary agent-resolvable choices.
