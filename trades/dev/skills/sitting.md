# Sitting — how a software cut is made
**Slot:** contact point on every act in the software lane.
**Not a skill you invoke.** The trade engages it by act. A file you may skip is a file you will skip.

This does not replace the four acts, the floor (`Making` / `Not making` / `Done when` / `Waits on`), or `finish.md`. It fills what the software sitting actually *does* at each act so the loop stays the loop.

Source of the folds: Lauren Tan's pstack SOPs, taken as law for a cut, not as a second process; reconstruct-purpose (what the object is for before you act), taken the same way. No slash commands. No sticky mode. No plugin. The Cursor desk may still run those tools; this trade does not name them.

Already in this trade, do not restated as a new gate:
- Runtime proof of the running product → `verify-principles.md`
- Source-text quality → `skills/enforcer.md`
- You don't proof your own plate → kernel `finish.md`

The four questions sit on the *piece*, not as a fifth act. Ask them of the object under care:

1. What is this for?
2. What must not change?
3. What is leftover on purpose?
4. Where is it heading?

A claim that it is stupid is not a reconstruction. More environment variables and a bolder markdown file are not a reconstruction.

---

## Ideate — look, then name

Before a piece is written onto the rack, or when a piece on the rack is still clay:

- **How it works now.** Trace the current runtime path. Read the code this session. A claim without a lookup this sitting is not a fact.
- **Why it is this way.** Git history, the brief, `DECISIONS.md`. If no evidence, say so. Do not invent a reason that makes the next cut feel justified.
- **What it is for.** Answer the four questions on this object: for, must-not, leftover-on-purpose, heading. Name essential vs accidental vs leftover. Until that account exists, do not name a cut.
- **Teach it once.** One plain account: what it is, how it runs, why that shape, what it is for. Not a file tour.
- **Blast radius.** If the cut looks small, name what else it could break, and what run would prove it is safe. Vibe is not a proof.

Read-only. This act does not take a piece to the bench.

---

## Plan — settle the shape, not the file list

The floor is still four lines. This sitting tightens what those lines *mean* for software, **in the terms the reconstruction named**:

- **Making** names the change in terms of the caller's use, the types, the boundary it crosses, and the reconstructed purpose. Not a function list.
- **Not making** names the shapes you refused, not just the tickets you deferred — including cleanups that would erase leftover-on-purpose.
- **Done when** names a real artifact someone can run or inspect, in those same terms. "It compiles" is not done-when.
- **Waits on** stays empty unless a real dependency exists.

If the cut crosses a module or ownership boundary, settle the caller's usage and the types *before* implement. If two shapes are cheap, compare them. If the later implement keeps adding casts, optional fields that are always present, or parameters the floor never named, the shape is wrong — scrap it and plan again. That is still plan. It is not a rewind.

Do not demand a file list, a task breakdown, or line numbers here. Those are implement-time facts.

---

## Implement — smallest proved cut

One owner. Failure stays on the bench.

- Smallest change that solves the floor. Delete dead path before adding a new one. Leftover the reconstruction named leftover-on-purpose is not dead path.
- Illegal states stay unrepresentable where the type system can hold them. Validate at the boundary; trust the inside.
- A bug is reproduced first. A characterization of current behavior exists before a refactor moves.
- Sequence work so each step ends in a state you can check. The next step does not start on a hope.
- Where a cheap local test path exists, the failing check is written before the fix.
- Taste inside the cut: fewer layers, less hidden state, user delight over builder convenience. These never move a file.
- No junior cleanup. "This is stupid, fix it" is banned unless the floor named that cleanup.

Do not start a second vocabulary. Do not open a parallel process. Do not land your own work.

---

## Verify — other eyes, real artifact

The kernel already forbids proofing your own plate. This sitting names what the other pair of hands attacks:

- Run `Done when` against the real thing (the command, the flow, the record), not a proxy.
- Hand the reconstruction with the diff. Other eyes read what it is for, then try to break the artifact. They sort findings: act / consider / noted / dismissed. Dismissed stays visible.
- Then the runtime judge in `verify-principles.md` and the enforcer. Both still fire. This sitting does not replace them.

A green build is not verify.

---

## After finish — one lesson, encoded

Finish already ships *and* reflects. The lesson is a rule in structure if you can (a check, a lint, a flow spec), or a line in `DECISIONS.md` if you cannot. One strange sitting does not become standing law.

Do not invent a fifth act.

---

## Leave on the desk

These are Cursor-desk factory moves. They time and ship work. Made Well already times work with path. They are not this trade:

sticky routing, babysit / shipping / autopilot / orchestrate / overnight loops, Graphite, a second style-router, "never block on the human," "the best spec is code so skip plan."

---

## Done when this file has fired

A software piece moved through the four acts with the matching paragraph applied at that act — not as a checklist at the end. The four questions were answered on the piece at ideate, and the later acts used those answers.
