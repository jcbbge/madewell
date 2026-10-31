# The Three-Legged Rubric — a product-decision framework for Made Well

## Purpose / lineage

This rubric is derived from Calvin Grunewald's essay "My New Agentic Workflow" (*The Building Machine*, Oct 2026), whose core move is reframing the optimization function from "maximize agent output" to "minimize human attention," expressed as an attention × impact matrix with tools mapped to regions.

It is generalized here for a solo indie developer who optimizes for speed and craft simultaneously. Grunewald's single 2-axis matrix becomes **three Eisenhower-style 3×3 matrices**, one per stakeholder.

The three legs divide by **who is served** — the developer, the end-user, and the agent — **not** by artifact type. This stakeholder basis is why the stool stays at exactly three legs. For example, "UI" is a facet of the end-user's experience, not a fourth leg.

## The vending-machine principle

All intelligence is spent at the front.

Planning, speccing, briefing, and every decision are front-loaded before any implementation. By the time work reaches implementation or testing, the agent is a **DETERMINISTIC FUNCTION**: it executes the brief and reports. It does not think, improvise, guess, weigh options, brainstorm, or invent, and there is no mid-stream interfacing with the operator.

Ambiguity is designed out upfront, never negotiated at runtime. This is the north star behind **AX = Capability × Ambiguity**: the whole game is driving ambiguity to zero before the function runs.

## Waste is the symptom, not the problem

The symptom is **waste** in every form: wasted tokens, effort, money, time, and resources.

These are not the problem. They are signals and diagnostics. When waste appears in any form, the cause is upstream: ambiguity, a defective spec, an agent improvising, or an agent over-complicating.

Do not optimize the symptom. Do not build a cost mechanism, token mechanism, or metric and mistake that for solving the problem. Eliminate the cause by front-loading clarity, and the waste disappears.

## The triple gate

Before any decision, feature, or choice, run the three leg-questions and score hit/miss on each:

1. **DX** — "What leads to a world-class developer experience?"
2. **UX** — "What makes a memorable and lovable user experience?"
3. **AX** — "What gives an efficient, optimized agentic experience?"

Verdict:

- **Hit all three** → something special; build with conviction.
- **Hit at least two** → a good spot; proceed.
- **Hit fewer than two** → below the bar; reshape or stop.
- **Hit zero** → do not build; stop; you are burning time, money, effort, and resources you cannot spare.

This is an **enforced procedure with judged inputs**. It always runs, and the threshold is fixed. It is mechanical in the sense that it is never skipped; it is not a blind tally in the sense that each leg's pass/fail is a judgment rendered through its 3×3 matrix.

The point is to codify the fence so the operator does not have to run it by hand each time.

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

Waste-of-all-kinds is deliberately **not** an axis. It is the shadow of ambiguity: agents waste tokens, effort, money, time, and resources when uncertain, under-specified, or forced to improvise. Efficiency falls out of staying away from the high-ambiguity corner rather than treating waste itself as the dimension to optimize.

Cells: rows = Capability HIGH/MED/LOW; columns = Ambiguity LOW/MED/HIGH.

| Capability \ Ambiguity | LOW | MED | HIGH |
|---|---|---|---|
| **HIGH** | ① **The dream slice** — full power, full clarity; act & prove. Build toward here. | ② **Strong** — tighten the brief/context | ③ **Powerful but blind** — great tools, unclear goal; resolve the ambiguity or the power is wasted |
| **MED** | ④ **Clear but limited** — give it better tools/feedback | ⑤ **Workable middle** — default, fine on the path | ⑥ **Shaky** — limited power, murky goal; don't rely on the result |
| **LOW** | ⑦ **Clear but hamstrung** — understands, can't do much; low-stakes only | ⑧ **Weak** — little power, murky goal; avoid | ⑨ **Blind guessing** — no tools, no clarity; where agents hallucinate and burn effort. Never operate here. |

## The dual use

The rubric runs in two directions:

1. **Forward** — the lens an agent uses to make a decision autonomously: score the options across the three legs, then pick the one that best clears the triple gate.
2. **Reverse** — the schema for how an agent surfaces a decision that needs the operator on the rare occasion the runtime bounds are exhausted.

## Runtime questions: the two touchpoints

If front-loading worked, runtime questions should be rare. When a question does arise at runtime, there are exactly two surfaces:

1. **Agent-to-agent via the NQ protocol.** This is bounded to 3 turns. The answering agent resolves in priority order:
   1. its own context;
   2. the repository's intent and purpose;
   3. the rubric.
2. **Escalation to the operator.** This happens **only** when the 3-turn NQ bound is exhausted. Exhaustion is not a normal decision point; by definition, it signals a fundamental defect in the spec, plan, or dossier.

The operator resolves using the **identical procedure**: conversation context → repository intent → rubric. Because the procedure is the same whether the operator or the code runs it, operator escalation is in principle mechanizable. The goal is to minimize even that last human touch.

The structured decision-request is simply the **shape** the question takes on the rare occasion it must reach the operator. Instead of a contextless one-line question, the agent presents a structured **needs your attention**:

- what is being decided;
- the candidate paths;
- what each path gets and costs across DX / UX / AX;
- what happens if we do not decide;
- the agent's recommendation and reasoning;
- an explicit request for the operator's mental model, since the operator holds context the agent lacks.

Made Well already has the mechanism this upgrades: the **hold** surfaced via `mw next` / `mw holds` / the sidecar's **NEEDS YOU** panel currently emits a freeform message + questions. The reverse-direction schema is the planned upgrade to that hold's shape. This dossier flags it as the seam to a separate future UX pass; do not implement it now.

## Reconciliation with current baseline

Baseline checked against `FOUNDATION.md`, `README.md`, `AGENTS.md`, and the worker brief/instruction text in `src/engine.ts` as of the baseline this dossier extends.

### What already matches

- `FOUNDATION.md` already defines the same three stakeholder obligations: developer experience, user experience, and agentic experience.
- `FOUNDATION.md` ruling 18 already states the three-question decision discipline in compact form: world-class DX, memorable/lovable UX, and efficient/optimized agentic experience.
- `FOUNDATION.md` already requires that a choice advance at least two of the three experiences, and says a spectacular gain in one does not justify neglecting the other two.
- `FOUNDATION.md` already says none of the three has default priority and warns not to collapse developer experience into agent convenience or user experience into developer convenience.
- `AGENTS.md` and the worker brief in `src/engine.ts` carry the same three-question rubric into agent instructions.
- `README.md` does not restate the rubric independently; it points to `FOUNDATION.md` as operator law.
- `FOUNDATION.md` already says implementation and testing are execution stages that should not improvise when the plan is fixed. The vending-machine principle sharpens that into the north-star rule for the rubric.

### Deliberate divergences and extensions for the cloud agent to adopt

1. **The triple gate is resolved toward enforcement.** The baseline cautions that the rubric is "not a mechanical majority vote." This dossier intentionally supersedes that softer caution with the operator's chosen rule: the gate is an enforced procedure that is never skipped, with a fixed threshold of all three → something special, at least two → proceed, fewer than two → reshape/stop. It is not a blind tally because each leg's pass/fail is judged through its matrix, but it is mechanical in that the procedure always runs. The operator wants this codified so he is removed from running it by hand each time.
2. **This dossier operationalizes the rubric into three explicit 3×3 matrices.** The baseline has the three questions and equal obligations, but not the Leverage × Friction-to-adopt, Delight × Cognitive load, or Capability × Ambiguity matrices, and not the nine cell-level verdicts/actions.
3. **The dossier sharpens the governing questions.** Baseline Foundation wording asks what moves toward a 10× better developer/user/agentic experience; ruling 18 uses closer phrasing to this dossier. The dossier locks the questions as world-class DX, memorable/lovable UX, and efficient/optimized AX.
4. **The UX leg makes beauty and visual craft first-class inside user experience.** The baseline includes usefulness, enjoyment, confidence, memorable, and lovable product; this dossier significantly extends that by making Delight the value axis and explicitly placing beauty, dopamine, and visual craft there.
5. **The earlier token/cost tension is resolved by the waste-as-symptom reframe.** The baseline treats cost, tokens, latency, context consumption, tool activity, and human attention as constraints across the experiences. This dossier clarifies the operator's intent: waste in any form is diagnostic, not the optimization target. The cloud agent should not build token/cost machinery as the answer; it should eliminate the upstream ambiguity, defective spec, improvisation, or over-complication that produces waste.
6. **The AX leg reframes efficiency around ambiguity.** Waste-of-all-kinds is the shadow of ambiguity, not its own axis. The AX matrix should therefore drive toward capability with low ambiguity: full power, full clarity, act and prove.
7. **The reverse-direction schema extends the current hold shape.** Current Made Well holds surface freeform messages/questions through `mw next`, `mw holds`, and the sidecar. This dossier specifies a structured operator-attention schema with candidate paths, DX/UX/AX gets/costs, consequences of no decision, recommendation, reasoning, and a request for the operator's mental model.
8. **The escalation model is narrowed to the two-touchpoint procedure.** Routine decisions are not sent to the operator. Agent-to-agent resolution happens through NQ within 3 turns using context → repository intent → rubric. Only exhaustion of that bound reaches the operator, and that escalation means the spec/plan/dossier is defective. The operator uses the same procedure, making the remaining human touch mechanizable in principle.
