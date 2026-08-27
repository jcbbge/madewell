# Extending Made Well — the Maintenance Manual

This is the agent-facing manual for **modifying Made Well itself**. AGENTS.md tells you how to
*operate* the factory; this tells you how to *maintain and extend* it. Read it before changing
the system — when the person says "I need Made Well to do X," "update my domain cartridge,"
"add a striation," or "this keeps breaking, fix the process."

## The mental model — a base player with cartridges

Made Well is a **base console**. It does not know about your industry, your team, or your stack.
Everything domain-specific plugs in as a **cartridge**:

- an **industry** → a *domain cartridge* (`cartridges/dev`, a future `cartridges/sales`, … — loaded by reference, not installed)
- a **voice** → a *persona register* (Lead, Contributor, Guide — carried by packs)
- a **specialization within an industry** → a *striation* (dev → frontend / api / backend / ci-cd)
- a **specific capability** → a *skill* (e.g. "working with Neon Postgres" on the database striation)

The console's circuitry never changes; cartridges are how it learns a domain. Your job is to know
which is which — and to have the confidence to work across the whole machine.

**The mindset is maintenance.** Most of the time this is routine — a checkup, an oil change, a tyre
rotation (fix a stale path, sharpen a skill's trigger). Sometimes it's a bigger job — a new
striation, a schema migration. Occasionally it's a tow package — a whole new domain pack. Same
manual covers all three: know the layout, know the bounds, know why each piece is shaped the way it
is, then turn the right bolt.

---

## The system map

Know the layout before you touch anything. Each layer, what it's for, where it lives, and whether
it's **law** (the console's fixed circuitry — never overwrite) or a **cartridge slot** (composable).

| Layer | What it is / its purpose | Where | Law or slot |
|---|---|---|---|
| **The function** | The Orchestrator: think, plan, decompose, dispatch, verify, land. Never does the work. | `AGENTS.md` | **Law** |
| **The model** | Four acts, Ground and the Jig, three states, the pause. | `MADEWELL.md` | **Law** |
| **Contracts** | The named seams a profile fills: persona · domain · quality · memory · onboarding. | `profiles.json` | Law (the *set*); slot (the *fills*) |
| **Profiles** | One selection that fills every contract row (lead / contributor / guide / naked). | `PROFILES.md`, `profiles.json` | Slot — add your own |
| **Cartridges** | A domain bundle: persona register(s) + skills + striations. Lives outside the kernel; loaded by explicit reference. | `cartridges/<name>/PACK.md` | Slot |
| **Persona pack** (kernel) | The Guide (novice-human register) ships with the kernel because it's the human-facing default. | `packs/guide/PACK.md` | Slot |
| **Striations** | The hierarchy inside a cartridge (e.g. dev → frontend / api / backend / ci-cd). | `cartridges/<c>/pillars/`, declared in the cartridge's manifest | Slot |
| **Skills** | Foundational (loop machinery + lenses — Made Well's own) vs cartridge (loaded with a cartridge, may be striation-scoped). | `skills/` (foundational), `cartridges/<c>/skills/` | Foundational = law-adjacent; cartridge = slot |
| **State** | Three directories: `stock/`, `bench/`, `finished/`. Position is path. | `SPEC.md` | **Law** |
| **Orchestration** | The shop: fan-out across hands, per act. Baseline default; host-overridable. | `skills/orchestrate.md` | Mechanism — extend the cells |
| **Memory** | git log (history) · DECISIONS.md (decisions) · PRODUCT.md (identity). No ledger, no projection. | repo root of `.madewell/` | Slot |
| **Install** | Unfolds the shell, re-syncs the framework (preserving memory), uninstalls cleanly. | `install.sh` | Mechanism |
| **Human surface** | Front door + guides — how a person meets the system. | `README.md`, `MADEWELL.md`, `guides/` | Slot |

---

## The confines (immutable law)

These are the console's fixed circuitry. A cartridge composes *around* them; it never overrides
them. Change these only on the Lead's explicit call, with a concrete new reason (never reopen a
closed decision casually).

- **The four acts** — ideate → plan → implement → verify, recurring at every depth. There is no second vocabulary for the outer pass. *Why: it's the engine; every piece assumes it.*
- **You don't proof your own plate** — planner ≠ executor, maker ≠ proofer. *Why: without it the system collapses into self-justifying code-gen.*
- **The cooperative pause** — every loop yields to the human between iterations; nothing runs autonomously. *Why: the person steers; Made Well is not an autopilot.*
- **The Orchestrator function** — output is a question, a plan, a decision, or a brief — never the work itself. *Why: the separation is the whole architecture.*
- **Finish always fires** — work ships *and* reflects, or it leaks. *Why: a system that only takes in floods.*
- **Position is path.** *Why: a status field can lie about where something is; a directory cannot.*
- **Persona is a slot** — the kernel is persona-free; registers fill the slot. *Why: the same function must serve a novice and a machine.*
- **The Rubric** — does this lead to craft, beauty, and care? *Why: it's the point.*
- **Contact points, not consultations** — Made Well's mechanisms are properties of the pipe, not tools the agent may consult. Anything optional is anything skipped. *Why: the failing agent is precisely the one who does not know it needs the mechanism at that moment; empirical evidence (0% adoption of pull-based grounding over 45 runs) confirms it. See the Jig in `MADEWELL.md` — a mechanism you may skip is a mechanism you will skip.*

Everything not on this list is a cartridge slot.

---

## The cartridge slots — how to extend each

Each slot has a pattern. Follow it; the kernel already depends only on the contracts, so a
well-formed cartridge needs **no kernel change**.

- **Add a cartridge (a new industry).** Create `cartridges/<name>/PACK.md`; carry its persona register(s) and any skills/striations. Cartridges live *outside* the kernel install; a project loads one by explicit reference. Add a profile in `profiles.json` + `PROFILES.md` if it deserves its own loadout.
- **Add a persona register.** A markdown register the cartridge carries; name it in the cartridge's `persona` field and the relevant profile.
- **Add a striation.** A pillar file under `cartridges/<c>/pillars/`; declare it in the cartridge's manifest.
- **Add a skill.** A markdown file in `skills/` (foundational) or `cartridges/<c>/skills/` (cartridge); foundational skills register in `SKILLS.json` with `layer`, `mode`, `when`; cartridge skills register in the cartridge's own manifest.
- **Deepen an orchestration cell.** Extend `skills/orchestrate.md` — preserving the invariants (isolation, cooperative pause).

---

## Edit vs. plug-in — the discernment

When the need is domain-specific, decide whether to **update an existing cartridge** or **source a
new one**:

- **Update** when the piece already exists and the change is a refinement. *"Working with Neon
  Postgres" already lives on the software cartridge's database striation, and the person wants its
  connection-pooling advice sharpened* → edit that skill in place.
- **Plug in a new one** when nothing covers it. *They've moved to a graph database* → source a new
  skill on the same striation. *They've taken on a striation the cartridge lacks (say, mobile)* →
  add a striation. *They've started work in a whole new industry* → add a cartridge.
- **Promote** when a project-specific skill turns out to be general → lift it from the cartridge
  into a foundational skill (or into the cartridge's shared skills) so it's reusable.

The rule: refine in place when the *slot* is right and only the *content* is stale; source new when
there's no slot for it yet. If no existing slot fits, you **MUST** surface the choice to the Lead
before creating one — never invent a slot silently.

---

## The maintenance protocol

Modifying Made Well runs **the kernel's own lifecycle** — it is just another Cycle.

1. **Triage** — is this **law** or a **slot**? Law → stop; surface it to the Lead with the concrete
   reason. Slot → which one (use the map)?
2. **Route** — pick the pattern above: edit-in-place or plug-in-new.
3. **Make** — follow the slot's pattern. Keep the change shaped like its neighbors.
4. **Verify** — schema validates, every path resolves, `install.sh` still unfolds the shell, no
   dangling references. (The same checks that keep the console drivable.)
5. **Land** — commit it; the change ships and reflects like any other unit of work.

Routine checkup (a stale path, a sharper trigger), overhaul (a schema migration), or tow package (a
new pack) — the protocol is the same; only the size differs.

---

## The proactive face — self-healing

You are the mechanic who also notices the warning lights. Don't wait to be told:

- **Watch the signals** — repeated corrections, repeated failures, recurring friction
  across sessions. A pattern is a maintenance item.
- **Surface, don't act.** When you spot a maintenance item you **MUST** surface it to the Lead —
  name the piece, the pattern, and the proposed change ("your software cartridge's debug skill keeps missing
  this class of bug — update it?"). You **MUST NOT** apply it without explicit approval. The
  cooperative pause is mandatory here, not a courtesy.
- **Route the request.** When the person says "I need Made Well to do X," you already know the map:
  translate X into the right slot (a new skill? a striation? a pack? a schema field?) and surface that.
- **Never mutate law.** Proactivity ends at the confines — those are the Lead's call, always.
