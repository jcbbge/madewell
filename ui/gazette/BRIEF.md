# Brief: a live web interface to Made Well, in the Gazette grammar

## Purpose

Made Well is a CLI for agents. Give it a web interface that the operator keeps open in Chrome on
his Mac: an always-on, read-only page that shows, live, what Made Well is doing and what waits on
him. Its character: **you can take the machine apart and look inside.** Each layer of the work can
be lifted away, like an exploded technical drawing, to reveal the mechanism beneath it, down to
the raw cause of a stop. It is a visual layer on Made Well's existing surface, and it ships as part of
Made Well: any machine that installs the distro (a Linux VPS or a Mac) can provision it as its own
always-on background service with one command. Made Well's engine, store and other commands do
not change.

## Where you work

- Repo: `~/madewell-gazette` on hive, branch `gazette-grammar` (a worktree of `~/madewell`).
  Never touch `~/madewell` itself: it holds someone else's uncommitted work.
- Build the interface's own code in `ui/gazette/` (this folder). Change `src/` only where this
  brief says: `ui.ts` (what `mw ui` serves), the `ui` and `watch` commands in `cli.ts`, and the
  build that bundles the page into `dist/`. Nothing else in `src/` changes.

## Read first, in this order

1. `skills/gazette-grammar/`: SKILL.md, then GRAMMAR.md, tinctures.json and references/layer.md.
   This is the visual law, and it is not negotiable.
2. `skills/gazette-grammar/mockup/`: the reference the operator approved. blazon.json is a screen
   written as data, and paint-web.mjs paints it. Match its look.
3. `skills/vendor/jakubkrehel/` (a pinned copy of github.com/jakubkrehel/skills, MIT; its commit is
   in VERSION):
   - `teardown`: how to draw the inside of the machine (see "Depth", below). Read its SKILL.md,
     exploded-views.md, geometry.md (its section on drawing concepts as layered parts),
     viewer-assets.md and preview-page.md.
   - `better-interface`, `better-accessibility`, `better-writing`, `better-colors`: the function
     checks. references/layer.md says how they combine with the grammar: they decide function, the
     grammar decides form.
4. `dossiers/2026-10-24-observability-ui-handoff.md`: why earlier attempts at this failed. Do not
   repeat them.

## The surface you build on (read-only; it exists already)

`mw ui --port 4747` (the `mw` on PATH) serves a read-only JSON API on 127.0.0.1:

- `GET /api/mark`: a small change marker (event and call counts, runner, live output files). Poll
  it about once a second and refetch only when it changes. That is the real-time connection:
  anything done through the CLI moves the marker.
- `GET /api/model`: every item, its steps and states, what needs the operator (`needs`, each with
  the exact `next` commands), costs and events.
- `GET /api/item/:id`, `/api/trace/:id?lens=ux|dx|ax`, `/api/call/:id`, `/api/spans/:id`: one
  item in depth. The three trace lenses are three depths of the same item, from the plain outcome
  to the full function tree.
- `GET /api/live/<file>.log?from=<byte>`: a running step's output, streamed by offset.

The API cannot change anything. Actions in the interface copy the exact command for the operator
to run, as the mockup's buttons do. Adding write endpoints is out of scope.

## Depth: taking the machine apart

This is what makes the interface Made Well's own and not a dashboard. Use teardown's
**exploded stack of plates**, its technique for concepts with no physical form: one part per
layer, built from thin plates, with the assembled view and the exploded view one switch apart.

- **Assembled**, the default: the Delivery sheet, as in the mockup. It is the closed machine.
- **Exploded**, per item: the item's layers lift apart along one explosion axis, and each plate is
  a depth of the same item:
  1. the outcome: done or not, and what waits on you (`trace?lens=ux`);
  2. the mechanism: the steps, which one stopped and why (`trace?lens=dx`, `/api/item/:id`);
  3. the calls: each agent call as a part, with its time and tokens (`/api/item/:id` calls,
     `/api/call/:id`);
  4. the cause: the raw record of the stop (`trace?lens=ax`).
- **Peering in** means choosing how far apart the plates sit and which ones show. It is one
  control, and it moves through the depths in order. Never show all depths for all items at once.
- **The Gazette grammar paints it.** Plates are drawn in Ink linework on Paper, filled with the
  inks and their hatching, with the shadow-side keyline. Teardown's line roles map to Ink
  hairlines, and its part fills map to tinctures (references/layer.md). Plain words label each
  plate: never "UX", "DX", "AX", "lens", "cartridge", "profile" or "NQ".
- Follow teardown's own discipline where it applies: an `evidence.md` in which every plate is
  classified as a concept and names the API field it is drawn from; one model, from which every
  view is derived; and a rendered, inspected result, never a file write taken as proof.
- Teardown warns against a frame around its default drawing. Here the exploded drawing **is** the
  principal form of a Gazette sheet, so the sheet's frame stays. Build it to teardown's
  preview-page.md, which covers integrating into a project's interface.

## What to build, in two stages

Show the operator after stage 1, and do not start stage 2 until he has used it.

**Stage 1: the live sheet, served and provisioned by Made Well**

1. `mw ui` serves the Gazette page at `/`, from the same process and port (4747) as its API.
   There is no second server. The existing console stays reachable at `/console` so nothing
   disappears silently. The page is bundled into `dist/`, so an installed distro serves it with
   no build step. Loopback only by default, as today.
2. One function, model → blazon, that turns `/api/model` into a blazon shaped like
   `mockup/blazon.json`. All judgement (plain words, which charge, which ink) lives here.
3. A painter that reads only the blazon and tinctures.json, reusing paint-web.mjs's logic in the
   browser. It repaints when `/api/mark` changes.
4. When a step is running, a notice that shows its live output (`/api/live`).
5. **Made Well provisions it, on any machine.** The operator has already approved this (decided
   2026-10-25), so do not ask him again. Add three flags to `mw ui`:
   - `mw ui --install` provisions an always-on background service for this user that runs
     `mw ui`, restarts on failure and starts at boot. On Linux it is a systemd user unit, and
     lingering is enabled where the system allows it, so the service runs without a login. On
     macOS it is a LaunchAgent. On any other platform it fails with a Made Well error that names
     the platform and the next step. Running it again is safe and changes nothing.
   - `mw ui --uninstall` stops the service and removes every file `--install` wrote. This keeps
     Foundation ruling 13 (leave no trace): the service exists only while the operator wants it.
   - `mw ui --status` says whether it is installed and running, and gives its address.
   Like every Made Well command, each prints JSON with `next` steps, and every error carries its
   context and the next step.
6. **The terminal view links to it.** When the service is up, `mw watch` shows the web address on
   its first line, and pressing `w` opens it in the browser (`open` on macOS, `xdg-open` where
   there is a desktop). On a machine with no browser, it shows the SSH port-forward line
   instead. When the service is not installed, the line says `mw ui --install`.

**Stage 2: depth.** The exploded view above, for one item at a time, reached from that item's
ring or notice on the sheet.

## Rules

- The grammar's avoidances hold everywhere. In particular: no dashboard tiles, cards, gradients,
  blur, soft shadows or rounded corners; one vermilion action per sheet; every inked shape bounded
  by Ink; hatching as the second cue; one ink, one meaning per sheet.
- No Made Well jargon on screen. Quote Made Well's own messages verbatim; write everything else
  in plain words.
- If the grammar has no way to do something the interface needs, extend GRAMMAR.md and say so in
  your report. Never quietly break the grammar.
- New ideas go in a backlog line in your report, not into the build.

## Done when

- Stage 1: on hive, `mw ui --install` has been run and `--status` reports the service running.
  The service survived its process being killed. The operator opened http://localhost:4747/ on
  his Mac (his machine already forwards 4747 to hive) and saw it change live while a CLI command
  ran, for example after he ran `mw go <id>`. A worker report or a file is not done.
- Stage 1, macOS: the LaunchAgent path is covered by a test that checks the files written and
  removed. It is proven live when the operator runs `mw ui --install` on his Mac. Say so plainly
  in your report; do not claim it.
- Stage 2: he opened one item, took it apart to its raw cause and put it back together.
- `better-interface` has been run on the live page, with contrast measured, and every finding is
  resolved through references/layer.md or reported.
- Committed on `gazette-grammar` and pushed, with a message saying what and why. Not merged to
  main.

## Report back

What is now true; what you measured and how; what is unproven; any decision he owes, with your
recommendation; what is still running and how to stop it.
