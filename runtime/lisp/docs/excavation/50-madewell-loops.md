# Excavation Track E — Made Well: Loops (L4), Irreducible Units (L5), Console/Cartridges (L6)

**Run:** 2026-07-22. Sources: /Users/jrg/madewell, /Users/jrg/madewell-meta, /Users/jrg/rumen, /Users/jrg/project-closeloop, session transcripts.

---

## L4 — The outer loop + inner loop as a cyclic graph: what already exists

### The two loops as they exist today

- **Inner loop (one unit of work): imagine → plan → make → verify.** /Users/jrg/madewell-meta/INDEX.md:13-21 (module board with per-phase instruments and maturity marks). Directory structure verified on disk: madewell-meta/inner-loop/{imagine,plan,make,verify}.
- **Outer loop (the project): discovery → commit → build → land.** INDEX.md:24-29. Directories: madewell-meta/outer-loop/{discovery,commit,land} (build has no directory yet — consistent with its ○ maturity).
- The kernel promise: /Users/jrg/madewell/MADEWELL.md:12-18 — "break work into small isolated pieces, run the right thinking workflows at the right time... the entire factory running as a persistent flywheel... **Made. Not vibed.**"

### The operator's own definition of the loops (verbatim, founding closeloop session)

/Users/jrg/project-closeloop/journal/2026-07-19-the-agent-is-the-application.md:58 (jrg, unedited):
> "If I'm operating within my Madewell framework, there's 4 stages. There's the ideation and planning stage that's on one side of a wall. And then there is the implementation and testing stage that's on the other side of the wall... the inner loop is basically a [while] loop where, [if] there are items in the queue, then the loop continues until there are no items in the queue. But then, the same for the outer loop... once you're outside of that inner loop, there is this other outer loop. And I've codified that in Madewell also, where it's a similar four step process that essentially fills the queue."

Structure, not strict definition: **the outer loop fills the queue; the inner loop drains it; both are while-loops over queues; and the queue is a graph.**

### The queue IS a graph (the cyclic-graph evidence)

- /Users/jrg/madewell-meta/inner-loop/make/MODULE.md:11-26: "The Imagine queue is a DAG. Items carry `dependsOn: []`. Dispatch is not sequential — it finds the frontier (all pending items whose deps are all done) and dispatches the entire frontier concurrently... Empty frontier + pending items = deadlock — surface which items are waiting and why... The queue is just a degenerate graph (every step depends on the previous one). The graph is the general case."
- Decision record (:44-47): "2026-06-29: `dependsOn` field added to both imagine queue (cycle schema) and discovery queue (madewell schema). Adjacency list inline in existing JSON stores — no new files, no JSONL, no SQLite."
- The crossover into Constellation: /Users/jrg/constellation-zg/docs/DAG_ARCHITECTURE_0629.md:6,137 — "Madewell has already implemented the foundation"; "The Madewell implementation is the reference... the algorithm is already proven there."

### The cycle as an engine (why it loops rather than terminates)

/Users/jrg/madewell-meta/the-temporal-axis.md:34-41: "Made Well *oscillates*: ratchet (compress, irreversible, entropy down) → pause (human injects noise, entropy up) → ratchet → pause. It's a dissipative structure held at the edge of chaos... **The cooperative pause is the entropy-injection port** that keeps the engine alive."
And the founding choice (:10-21): "Made Well manufactures determinism on the axis of *time*, not the axis of *space*... freeze the *order* of the doors, the ratchet's one-way ticks, the pause cadence — freeze *when* things may advance." Resumability falls out free (:28-32): "A temporal ratchet *is* a position. You always know which tooth you're on ('resume inner-first, check for pending imagine items')."

### The doors (the loop's edges are contact points)

/Users/jrg/madewell-meta/wire--two-doors-into-the-pipe.md:20-25, 43-56: `[Ground] → Imagine → Plan → Make → [Verify] → Land` — "They bracket Build. They are the two doors into the pipe — the door where context enters, and the door where a claim of doneness has to survive contact with someone who did not build it... The four-beat isn't just a rhythm. It's a sequence of doors... **The doors are the framework. The phases are the corridor between them.**"

### L4 named-but-unbuilt

- **build** module: "orchestration/fan-out protocol — ○ — Tower review first" (INDEX.md:28)
- **land** module: "ship + reflect checklist; capture `## Correction` → the GEPA signal — ○ — design the instrument" (INDEX.md:29)
- The outer loop's "front half" question, posed and unresolved in the operator's own words: "what determines the features to add?... that's like the front half of the outer loop" (closeloop journal :58); the journal's answer-sketch is the three-loops model (:22): Build / Heal / Become, with Become's oracle "human judgment informed by observed use — not mechanizable, but supportable."

---

## L5 — The inner loop's irreducible primitives of work: what is already named

1. **The item** — the atom of the Imagine queue: `{id, item, status, dependsOn[]}` (make/MODULE.md:13-21; DAG_ARCHITECTURE_0629.md:26-37 shows the same shape). Its law: "Small, completable units. Nothing rots morale like a task with no finish line" (rubric.md:45) / "Atomic units of work. Unambiguous 'done' is where drift stops" (rubric.md:103).
2. **The brief** — the handoff artifact from Plan into Make: "The COORDINATED mode output from PLAN feeds directly into Step 1 (carve packages). Inputs: a PLAN artifact (brief + dependency graph)" (make/MODULE.md:7-9); executor brief contract in kernel AGENTS.md (:38).
3. **The door / contact point** — the irreducible mechanism between phases: "Every mechanism must be a door or excluded" (wire doc :66); the family table at /Users/jrg/madewell-meta/contact-points.md:33-40 (Rubric, Grounding, Verify, Land, the cooperative pause, the Isolation Mandate).
4. **The phase-advance token** — consumed, linear: "the phase-advance token is **consumed** by the door it opens (linearity — spent once, never reused)" (the-temporal-axis.md:47).
5. **The role** — the irreducible actor: the 5-role coding jump pack, "Orchestrator → Implementer + Test-Designer (in parallel) → Test-Runner (runs only, never edits) → Failure-Triage (fresh agent, verdict only). None plays two roles. Event log is truth" (make/MODULE.md:27-31). The Isolation Mandate makes builder-verifies-itself "an **unspeakable arrow**, not a caught error" (the-temporal-axis.md:48-49).
6. **The emission** — what a fan-out returns: "Fan out per striation; emit bindings; the plan is *assembled from* what the emissions supply" / "emit verdicts; the unit *cannot Land* until the emissions concur" (wire doc :9-16).
7. **The correction** — the learning atom: "`## Correction` = where an executor had to ask a question the brief should have answered" (make/MODULE.md:32-33); every meta file ends with a Correction section labeled "the GEPA signal" (contact-points.md:125-129, rubric.md:202-206).
8. **The pause** — the human contact atom: "The loop cannot advance without surfacing to the human" (contact-points.md:39).

The constitutive law over all of these: "**Made Well's mechanisms are properties of the pipe, not tools the agent may consult. Anything optional is anything skipped.**" (contact-points.md:10) with empirical proof (:21-23): "a pull-based grounding tool shipped as an available consult, measured 0% adoption across 45 runs. Plumbing existed. No one reached for it." And the additive-weave corollary (:56-59): "The pipe does not check the work; the pipe supplies what the work is made of."

---

## L6 — Made Well as console; cartridges of striated lensviews: what already exists

### The console/cartridge nomenclature is settled

- /Users/jrg/madewell-meta/rubric.md:12-15: "The Rubric is a **contact interface** between the console and any cartridge — the electrical pins that must connect for the cartridge to seat... the pins either make contact or they don't."
- /Users/jrg/constellation/EXPLORE-dawn-instrument.md:36-40 (2026-07-18): "Domain expertise ships as a **cartridge**; the kernel/runtime is the **console** (consistent with `../rubric.md`). 'Pack' is released — it no longer names the persona/domain artifact, resolving the collision with Rumen's excreted packs."

### The operator's own words — console, default cartridge, striation-as-filter

Session claude 2026-07-01T14-50-13-001Z_019f1e28-b889-74da-b7f9-95464ca5611f (madewell), Jul 01 22:57, verbatim from pickbrain excavation this run:
> "assume that there is no cartridges... it's just made well. It's the bare console... you still have the code base as the cartridge itself. So the code is like the default cartridge, because you still can't make decisions without looking at the code... I can't go and start building Vue when I'm in a React app... The code itself is lightweight when it starts, but every decision, every bug fix, every feature is another layer on this filter. So any design decision... [has] to go through this filter of the code base. That's my whole entire point — nobody seems to fucking understand this concept."

The locked correction from the same exchange: "**The codebase itself is the default striation.**... Enforcement is **the fact that the code is already there.** New threads either take or they don't." (same session, agent reply, quoted from pickbrain output this run).

### Cartridge packs exist on disk

/Users/jrg/madewell/cartridges/ (verified this run): `dev/` pack containing PACK.md, persona.md, onboarding.md, escalation.md, brief-template.md, discovery-lenses.md, verify-principles.md, plus striation files: system.md, api.md, backend.md, ci-cd.md, frontend.md, and a design-system/ striation set (DOCTRINE.md, color-language.md, motion-language.md, tokens.md, typography.md), and skills/ (enforcer.md). Loading is by reference, not copy: dev/PACK.md:13-15 — "Cartridges are **loaded by reference from the cartridge library**... they are not copied into the project by the installer." The pack fills the console's Persona slot (:19-31, Lead/Contributor registers).

### The seating contract (how a cartridge plugs in)

rubric.md:180-198, the cartridge contract: instantiate the three roles in domain language; answer all nine cells ("Vagueness in any cell is failure to seat"); name its verification protocol; name its quality skill; declare its own confines ("These are *cartridge-owned*, not kernel-owned; the kernel has no opinion"). The kernel owns the qualities and roles; "a software cartridge instantiates *Maker* as 'developer,' a video cartridge as 'editor,' a content cartridge as 'writer'" (:23-26). And crucially for plug-n-play scope packs: "**The kernel does not own the striations.** Cartridges supply their own striation set. The kernel owns the *fact of a contact-point family*, not the domain-specific inventory" (contact-points.md:80-82).

### "Striated lensviews" — the pieces on record

- Striations as the filter layers the work must pass through: operator quote above + grounding's definition, "The plan is woven *from* striation threads; there is no plan without them" (contact-points.md:36).
- Lens/lensview language: the operator's rubric-as-glasses ("those three questions as a lens to view through as if you're wearing glasses" — closeloop journal :62); discovery-lenses.md exists in the dev cartridge (file listed this run, not yet read); v5's skins are "a lens over the signal, not a transform of it" (constellation-zg/VISION.md:298). The compound term "lensview" itself was NOT found in any file read this run — the components (striations, lenses, views) are all present; the fusion is new to the live brainstorm. Marked honestly: the term is unbuilt vocabulary.

### Rumen — the metabolizing organ at the console's exit

- The operator's placement: CONSTELLATION-V6-CONVERGENCE.md:281-282 — "Rumen, the excretion organ to Made Well, at ~/rumen."
- Rumen's own self-description: /Users/jrg/rumen/README.md:3-5 — "A digestion layer for AI-assisted development — it turns the conventions you care about into things an agent physically cannot ignore, instead of one more document it forgets to read." The near-miss tax (:16-19); sign vs fence (:34-37); the three-way sort (:45-51: enforced rules / judgment checks / human calls) + shared vocabulary (:53-54); the metabolism (:58-62): "a rule has to **earn its place**... and it gets **retired** when it stops paying off... the ability for a rule to *die* is what separates this from the document pile it replaces."
- The runtime symmetry already sketched: /Users/jrg/constellation/EXPLORE-dawn-instrument.md:29-33 — "**Rumen governs what leaves the loop (quality of output); the grounding instrument governs what enters it (quality of input)**... Same one-way-contract shape, opposite end of the pipe."

### L6 named-but-unbuilt

1. **The workbench view** — rubric.md:68-69: "A workbench view. One surface that shows live cycle + next brief + open decisions + last land. *(Currently a gap.)*" This is the closest existing spec line to "Made Well as console" in the UI sense.
2. **The dawn instrument** — EXPLORE-dawn-instrument.md:3-4, 42-51: "formal definition owed"; open questions include its metabolism and its tax sensor.
3. **Trust calibrated to track record** — rubric.md:124-125: "*(Currently aspirational — a session-over-session leash.)*" (v5's autonomy gradient IS this design, waiting to be claimed — AUTONOMY_GRADIENT_0629.md.)
4. **Department/scope packs beyond dev** — the rubric already names the role translations (editor, writer, "outreach owner" :185) and TAXONOMY.md:151-156 names Galaxy examples (Engineering, Marketing, Sales), but only the `dev` cartridge exists in /Users/jrg/madewell/cartridges/ (verified). Non-dev cartridges: zero built.
5. **The term "lensview"** — components exist (above); the compound does not appear in source.

---

## SOURCES

- /Users/jrg/madewell/MADEWELL.md; /Users/jrg/madewell/cartridges/dev/PACK.md:1-60; `ls -R /Users/jrg/madewell/cartridges/` (all this run)
- /Users/jrg/madewell-meta/INDEX.md; contact-points.md; rubric.md; the-temporal-axis.md; wire--two-doors-into-the-pipe.md; inner-loop/make/MODULE.md (full reads this run)
- /Users/jrg/rumen/README.md (full read this run)
- /Users/jrg/project-closeloop/journal/2026-07-19-the-agent-is-the-application.md:1-68 (read this run)
- /Users/jrg/constellation/EXPLORE-dawn-instrument.md (full read this run)
- /Users/jrg/constellation/CONSTELLATION-V6-CONVERGENCE.md:279-282 (read this run)
- /Users/jrg/constellation-zg/docs/DAG_ARCHITECTURE_0629.md; VISION.md:298; docs/AUTONOMY_GRADIENT_0629.md (read this run)
- pickbrain sweep this session: "cartridge lensview console department scope plug" (session claude 2026-07-01T14-50-13-001Z_019f1e28... quoted verbatim from output)
