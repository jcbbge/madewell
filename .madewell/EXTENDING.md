# Extending Made Well — the Maintenance Manual

This is the agent-facing manual for **modifying Made Well itself**. AGENTS.md tells you how to
*operate* the factory; this tells you how to *maintain and extend* it. Read it before changing
the system — when the person says "I need Made Well to do X," "update my trade,"
"add a pillar," or "this keeps breaking, fix the process."

## The mental model — one shop, many trades

Made Well is **a shop**. The bench, the rack, the jigs and the standard are the same whether you
are a joiner or a bookbinder. It does not know your industry. Everything domain-specific is
**the trade** you practise in it:

- an **industry** → a *trade* (`trades/dev`, a future `trades/sales`, … — loaded by reference, not installed)
- a **voice** → a *persona register* (Lead, Contributor, Guide — carried by packs)
- a **specialization within an industry** → a *pillar* (dev → frontend / api / backend / ci-cd)
- a **specific capability** → a *skill* (e.g. "working with Neon Postgres" on the database pillar)

The shop never changes; a trade is how it learns a domain. Your job is to know
which is which — and to have the confidence to work across the whole machine.

**The mindset is maintenance.** Most of the time this is routine — a checkup, an oil change, a tyre
rotation (fix a stale path, sharpen a skill's trigger). Sometimes it's a bigger job — a new
pillar, a schema migration. Occasionally it's a tow package — a whole new trade. Same
manual covers all three: know the layout, know the bounds, know why each piece is shaped the way it
is, then turn the right bolt.

---

## The system map

Know the layout before you touch anything. Each layer, what it's for, where it lives, and whether
it's **law** (the shop itself — never overwrite) or a **slot** a trade fills (composable).

| Layer | What it is / its purpose | Where | Law or slot |
|---|---|---|---|
| **The function** | The Orchestrator: think, plan, decompose, dispatch, verify, land. Never does the work. | `AGENTS.md` | **Law** |
| **The model** | Four acts, Ground and the Jig, three states, the pause. | `MADEWELL.md` | **Law** |
| **Contracts** | The named seams a profile fills: persona · domain · quality · memory · onboarding. | `profiles.json` | Law (the *set*); slot (the *fills*) |
| **Profiles** | One selection that fills every contract row (lead / contributor / guide / naked). | `PROFILES.md`, `profiles.json` | Slot — add your own |
| **Trades** | A domain bundle: persona register(s) + skills + pillars. Lives outside the kernel; loaded by explicit reference. | `trades/<name>/TRADE.md` | Slot |
| **Persona register** (kernel) | The Guide (novice-human register) ships with the kernel because it's the human-facing default. | `registers/guide/REGISTER.md` | Slot |
| **Pillars** | The hierarchy inside a trade (e.g. dev → frontend / api / backend / ci-cd). | `trades/<c>/pillars/`, declared in the trade's manifest | Slot |
| **Skills** | Foundational (loop machinery + lenses — Made Well's own) vs trade (loaded with a trade, may be pillar-scoped). | `skills/` (foundational), `trades/<c>/skills/` | Foundational = law-adjacent; trade = slot |
| **State** | Three directories: `stock/`, `bench/`, `finished/`. Position is path. | `SPEC.md` | **Law** |
| **Orchestration** | The shop: fan-out across hands, per act. Baseline default; host-overridable. | `skills/orchestrate.md` | Mechanism — extend the cells |
| **Memory** | git log (history) · DECISIONS.md (decisions) · PRODUCT.md (identity). No ledger, no projection. | repo root of `.madewell/` | Slot |
| **Install** | Unfolds the shell, re-syncs the framework (preserving memory), uninstalls cleanly. | `install.sh` | Mechanism |
| **Human surface** | Front door + guides — how a person meets the system. | `README.md`, `MADEWELL.md`, `guides/` | Slot |

---

## The confines (immutable law)

These are the shop itself. A trade composes *around* them; it never overrides
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

Everything not on this list is a slot a trade can fill.

---

## The slots — how to extend each

Each slot has a pattern. Follow it; the kernel already depends only on the contracts, so a
well-formed trade needs **no kernel change**.

- **Add a trade (a new industry).** Create `trades/<name>/TRADE.md`; carry its persona register(s) and any skills/pillars. Trades live *outside* the kernel install; a project loads one by explicit reference. Add a profile in `profiles.json` + `PROFILES.md` if it deserves its own loadout.
- **Add a persona register.** A markdown register the trade carries; name it in the trade's `persona` field and the relevant profile.
- **Add a pillar.** A pillar file under `trades/<c>/pillars/`; declare it in the trade's manifest.
- **Add a skill.** A markdown file in `skills/` (foundational) or `trades/<c>/skills/` (trade); foundational skills register in `SKILLS.json` with `layer`, `mode`, `when`; trade skills register in the trade's own manifest.
- **Deepen an orchestration cell.** Extend `skills/orchestrate.md` — preserving the invariants (isolation, cooperative pause).

---

## Edit vs. plug-in — the discernment

When the need is domain-specific, decide whether to **update an existing trade** or **source a
new one**:

- **Update** when the piece already exists and the change is a refinement. *"Working with Neon
  Postgres" already lives on the software trade's database pillar, and the person wants its
  connection-pooling advice sharpened* → edit that skill in place.
- **Plug in a new one** when nothing covers it. *They've moved to a graph database* → source a new
  skill on the same pillar. *They've taken on a pillar the trade lacks (say, mobile)* →
  add a pillar. *They've started work in a whole new industry* → add a trade.
- **Promote** when a project-specific skill turns out to be general → lift it from the trade
  into a foundational skill (or into the trade's shared skills) so it's reusable.

The rule: refine in place when the *slot* is right and only the *content* is stale; source new when
there's no slot for it yet. If no existing slot fits, you **MUST** surface the choice to the Lead
before creating one — never invent a slot silently.

---

## The maintenance protocol

Modifying Made Well runs **the kernel's own four acts** — it is just another piece of work.

1. **Triage** — is this **law** or a **slot**? Law → stop; surface it to the Lead with the concrete
   reason. Slot → which one (use the map)?
2. **Route** — pick the pattern above: edit-in-place or plug-in-new.
3. **Make** — follow the slot's pattern. Keep the change shaped like its neighbors.
4. **Verify** — schema validates, every path resolves, `install.sh` still unfolds the shell, no
   dangling references. (The same checks that keep the shop working.)
5. **Finish** — commit it; the change ships and is proofed like any other piece.

Routine checkup (a stale path, a sharper trigger), overhaul (a schema migration), or tow package (a
new pack) — the protocol is the same; only the size differs.

---

## The proactive face — self-healing

You are the mechanic who also notices the warning lights. Don't wait to be told:

- **Watch the signals** — repeated corrections, repeated failures, recurring friction
  across sessions. A pattern is a maintenance item.
- **Surface, don't act.** When you spot a maintenance item you **MUST** surface it to the Lead —
  name the piece, the pattern, and the proposed change ("your software trade's debug skill keeps missing
  this class of bug — update it?"). You **MUST NOT** apply it without explicit approval. The
  cooperative pause is mandatory here, not a courtesy.
- **Route the request.** When the person says "I need Made Well to do X," you already know the map:
  translate X into the right slot (a new skill? a pillar? a pack? a schema field?) and surface that.
- **Never mutate law.** Proactivity ends at the confines — those are the Lead's call, always.
