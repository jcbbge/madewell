# Observability UI — Handoff & Retrospective

**Date:** 2026-10-24
**Status:** No working prototype exists. Design specs are on `main`. One UI attempt was built and deliberately removed from history because it was wrong. This note explains the intent, the inheritance, and — most importantly — the failure pattern to not repeat.

---

## 1. Original purpose & intent

Made Well's **durability is already built**. The missing thing is **trust**, and trust comes from **sight**. The guiding image is a *glass vending machine*: a non-specialist should be able to look and see **item → mechanism → where it is jammed → next action**, without reading logs.

The UI should:
- Default to the **simplest, non-technical, lovable** view. **No Made Well jargon on screen.**
- Express the system's **two lanes** — Discovery and Delivery — as two visible frames.
- Let the **same data collapse differently per viewer**: operator (plainest) → developer (diagnosis) → agent (raw cause). Not three screens — one dataset, three depths.
- Let the operator **move through the work**: a node's parent, a node's children. The work is **fractal / recursive** — function → task → feature → project → org — the same two-lane shape at every level.
- Provide **two orthogonal moves**: change **which node** you are on (space), and change **how much is revealed** about it (viewer).

Behind it all: the **DX / UX / AX** three-legged rubric; the **vending-machine principle** (front-load the intelligence, no waste); **everything is a function / a trace**.

## 2. Where it stands (on `origin/main`)

Specs are real and committed:
- `dossiers/2026-10-24-observability-lenses.md` — the locked design model.
- The three-legged-rubric dossier and the decision-model-cartridge dossier.
- Backend from a prior pass already exists: a trace core, live in-flight capture, CLI commands, and a lens projection API (`?lens=ux|dx|ax`) — committed and tested.

**There is no viewable UI.** A prototype was built, then **removed from history** (not reverted — gone) because it was unusable. See §3–4.

## 3. The problem you are inheriting

A **viewable, usable** default view does not exist. The backend can serve the data; nothing turns it into something a tired human opens and immediately understands. Your job is that last mile — done without repeating the pattern that burned the last three attempts.

## 4. What went wrong — named honestly

1. **"Done" kept meaning the wrong thing.** Markdown files and then a built UI were called "delivered" when no one had opened the thing and watched it work. "Done" meant "a file exists" or "a worker reported done." That is the root dishonesty the rest grew from.
2. **Metaphors were taken literally and printed on screen.** The operator described the *feel* with images — "left dial / right dial," "parent ghost / child hint," "glass core / chambers." Those exact words were passed to the builder, which **rendered them as on-screen labels and interface chrome** — boxes literally titled "Left dial." The operator ended up staring at our private shorthand as UI text. Private vocabulary must be **translated into plain UI, never rendered as-is**.
3. **Requirements were never pinned to an acceptance test.** There was never a concrete "open this, see exactly this, click this, it does this." Every build satisfied an evocative *description* but not a *usable artifact*, because "usable" was never defined. We mistook **"spec written" for "requirement defined."**
4. **We reached for the concept instead of the smallest viewable thing.** Each round went deeper — three lenses → fractal recursion → two-dial manifold → interchangeable skins → 3D/WebGPU idea-generation → dozens of novel forms — instead of shipping one minimal screen and reacting to it. Invited conceptual generativity **substituted for convergence. That is why scope kept expanding.**
5. **Effort went to verification theater, not validation.** Enormous energy went into tunnels, push confirmations, loopback-vs-external reachability — making delivery of the *wrong* thing reliable — while the only question that mattered (*is this the right thing? show the operator early*) went unasked until he opened it and recoiled.
6. **Infra friction compounded the pain** (cannot copy-paste from the SSH terminal; "open a browser on the VPS" confusion; the box is headless). Real, but symptomatic. The headless VPS means the operator can only see UI via a **URL in their own browser** — plan for that from step one; do not discover it at the end.

## 5. Working agreement for the next agent

- **Define done as the operator's experience.** Done = the operator opened it and it did the thing. Files and worker reports are not done.
- **Write a concrete acceptance spec first**, in plain language: the smallest openable screen, its exact content, its exact controls, what each one does. Get a yes on *that* before building.
- **Translate, never transcribe, the operator's metaphors.** No "dial," "ghost," "core," "chamber," "specimen," "rocket" on screen. Plain words only.
- **Ship one minimal screen, show it, react. One.** No depth, no recursion, no skins, no second-lane behavior until the first plain screen is loved. New concepts go to a backlog, not into the prototype.
- **Plan remote viewing from the start.** The box is headless; the operator views via a stable URL (tunnel) in their own browser. Stand it up once, keep it stable, stop re-litigating it.
- **Converge, do not generate.** The concept space is already over-explored and captured in the dossiers. The job now is subtraction and shipping, not more forms.

## 6. Concrete next step

Make **one** static, openable screen with seed data: two labeled frames (Delivery, Discovery), each listing its items in plain language, with one item clearly stopped and a plain "stuck here → next action" line. No navigation, no lenses, no animation. Put it on a stable URL. Show the operator. Ask one question: *"Does this feel right?"* Build nothing else until the answer is yes.
