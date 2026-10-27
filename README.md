# Made Well

Made Well is a durable software delivery pipeline for coding agents: discovery turns raw notes into candidate work items, and delivery takes one promoted item through ideation, planning, implementation and verification until it is merged and deployed. It runs with any harness, provider and model, and one install serves all of your projects.

## Install

Requires Node 24.15 or later.

```sh
npm install -g --install-links github:jcbbge/madewell
```

## Use

Put your notes in, from any project. That is the whole act:

```sh
mw discover --source-file notes.md        # or: mw start --objective "<one line>" --source "<your words>"
```

Made Well discovers the work in the notes and pauses for you to choose what to deliver. Each promoted piece goes through ideation, planning, implementation and verification, then pauses before shipping: merged on main, pushed to its upstream, and deployed by your ship command if the project has one (`mw init --ship "<command>"`). The machine starts itself; no separate runner command is needed.

How involved you are is yours to choose, per project (`mw init --autonomy <level>`) or per run (`--autonomy` on `discover` and `start`):

| Level | Made Well stops |
|---|---|
| `checkpoints` (default) | after discovery, and before each item ships |
| `steps` | at the checkpoints, and between the phases of delivery |
| `full` | no routine checkpoints; the responsible agent resolves questions within NQ, with a hold for a spec defect after three answered turns |

Start with checkpoints; choose fewer stops as you become comfortable. Explicit project or run settings are preserved. `mw init --autonomy full` opts a project into hands-off delivery.

At a stop, `mw go <id>` carries on and `mw answer <id> "<what should change>"` steers. Something the machine cannot do itself (a credential, a failing ship command) holds the item at any level, with the exact command that unblocks it.

Tell it the rules your repo's work follows that no linter catches, and every plan is held to them with a check that proves it:

```sh
mw init --conventions '["Colours and spacing come from the design tokens in src/tokens.css"]'
```

Let your own agent watch: `mw next` says what needs you now, `mw status` and `mw show <id>` say where everything is, and `mw watch` is the live terminal companion. Every command prints JSON, and every answer and error lists the `next` commands.

Questions and answers stay on the durable record and travel to later handoffs. Exact repeats reuse their saved answers automatically. For reworded questions, intake or the originator references the saved answer by id; Made Well validates the reference, inserts that answer verbatim, and remembers the new wording. The operator is not asked to settle the same question again. Implementation and test-design exchanges remain separate so neither maker sees the other's work.

## Cartridges

Made Well is a console with cartridges plugged in. The console runs the two loops (discovery, then delivery), keeps every step on the record, runs NQ at every hand-off and swaps cards when an account runs out. The cartridges are the work: each one is a named group of steps, and each step has a profile, a duty, what it receives and the shape of what it returns.

The default pack is software development: ideation (ideate, challenge), planning (plan), implementation (implement and the checks, side by side), verification. Change it by plugging in your own:

```sh
mw cartridges | jq .pack > pack.json      # start from the default
$EDITOR pack.json                         # add, remove or reword steps
mw init --cartridges pack.json            # this project's new work runs it
```

A pack can add steps of its own anywhere before the plan, hold several discovery cartridges, and unplug the checks. The console keeps five slots, because its own machinery acts on what they return: `discover` (ends discovery with the candidates), `plan` (the scope and done-when items the makers are held to), `implement` and `test-plan` (the makers, side by side and blind to each other) and `verify` (Made Well runs the checks, merges and ships). `mw cartridges --check pack.json` says exactly what breaks the contract before anything runs.

### Optional decision cartridge

The [three-legged rubric](dossiers/2026-10-24-three-legged-rubric.md) is the default: agents judge DX, UX and AX through their 3×3 matrices, and settled decisions must pass at least two legs. No external inference is needed.

An optional entry in prescriptions selects a registered advisory renderer:

```json
{
  "decisionModel": {
    "enabled": true,
    "provider": "<registered decision provider>",
    "options": {}
  }
}
```

No provider is registered by the CLI today. Hosts can supply named `DecisionProvider` functions through the engine's `decisionProviders` registry, following `src/decision.ts`: bounded request and options in, an Effect returning a schema-checked result out. Guidance is supplied at ideation/planning and NQ originator boundaries, never at maker execution or verification. The console records the chosen path in `decision-resolution` events and reuses it on redrive. Absence, `enabled: false`, malformed settings, unknown providers, failures, invalid results and a five-second timeout all fall back to the normal in-process rubric. Providers cannot grant authority, extend NQ or bypass holds. The structured operator-hold UX remains deferred.

## Watch a run

Run **`mw watch`** from the project's directory, including in a tmux side pane over SSH. It only reads the store; opening or closing it never starts, stops or resumes delivery. No browser, service or port forward is required.

The overview separates Discovery, candidates awaiting promotion, ready/queued delivery, dependency/quota waits and checkpoints, active per-item delivery pipelines, shipped proof, and retained history. Stage names come from each item's saved cartridge pack, not a hard-coded diagram. Ready means promoted with recorded dependencies shipped; it does **not** mean a worktree has already been prepared. Preparation evidence is in the item's trace.

- `mw watch --workspace /path/to/repo` selects a project; a subdirectory resolves to its recorded project root.
- `mw watch --all` shows every project on this machine.
- `j` / `k` selects an item; Enter cycles overview → pipeline → full evidence. `0` returns to overview.
- Page Up / Page Down scroll; `g` / `G` moves to the beginning/end.
- `p` / `c` follows the selected item's parent/first child; `j` / `k` visits other items.
- `m` toggles host-wide CPU, memory, load and uptime. These are measurements, not work-progress claims. Invocation start/heartbeat samples are also retained in the durable trace.
- `a` toggles current/all projects; `q` or Ctrl-C exits and restores the terminal.

Per-item detail includes named stages, independent maker tracks, next owner, checks, NQ, dependencies, calls, tokens, timings, original inputs/outputs, and invocation/tool evidence. Unstarted work, waiting work and a lost runner are not reported as progress. Historical items without a saved pack explicitly report that the original default definition is unknown; no history is invented.

`mw watch --once` prints one snapshot. Piped output retains the global JSON event/call stream for existing consumers, unless `--workspace` explicitly scopes it; `--since <seq>` resumes the stream. `mw trace`, `mw show`, `mw export`, and offline `mw replay` remain available. Legacy `mw ui` commands remain compatibility surfaces, not the companion launch path; watch never launches or recommends them.

### Three lenses, one trace

`mw trace <id>` is the read-only light switch: **done / not done**, needs you or not, the next action, and recorded proof (delivery, checks, candidates or hold). It defaults to **UX / 30,000 ft**, with no raw harness stream.

- `mw trace <id> --lens dx`: **DX / 15,000 ft** — lane and stage, NQ and independent maker tracks, cards and budgets, calls and refusals, quota, runner ownership/loss, verification, flags and live diagnostics.
- `mw trace <id> --lens ax`: **AX / 0 ft** — the work → round/job → invocation → tool tree, original inputs, outputs, stream fragments, tool starts/results, heartbeat and parse/schema evidence. Invocation ids distinguish interrupted attempts from their redrives.
- The same JSON is available at `/api/trace/<id>?lens=ux|dx|ax` on `mw ui`. Replay embeds the AX record, and exports retain interrupted fragments in `item.json` alongside the existing completed-call folders. No renderer is required; these are headless projections, not a browser redesign.

Agent calls (including repairs), prepare, gates/checks, ship and alerts append live evidence to the **existing event store**, before returning. The transient `live/` files are still convenient tails; they are no longer the only copy of in-flight output. A killed runner leaves its invocation and captured fragments readable as **lost**, never as a successful returned call. Old calls retain their original record; missing historical live evidence is not invented.

Signals are evidence, not automatic correction. A five-second heartbeat observes **60 seconds without output**, **120 seconds without a reported tool result** (including an outstanding-tool signal), three consecutive identical tool inputs or output lines, repeated NQ question sets, JSON-looking stream parse failures, and unusual duration. Duration uses three times the median of at least three prior returned invocations of the same item/job/kind, with a 30-second floor; before that it uses one minute for intake/repair and three minutes otherwise. These are explicit heuristics, not proof that work is useless. Returning output/results clears the corresponding live signal. Existing budgets, NQ, holds, retries and shipping decisions are unchanged; ship/alert commands gain observation, not a new timeout.

Hosts can pass an optional `TraceRenderer` to `serve`, or call `renderTrace` over `lensOf` (`src/trace.ts`). Missing/invalid renderers, failure, non-JSON output and a five-second timeout fall back to the JSON lens. Renderers do not own state or get an engine control API. Discovery records dropped candidate positions and missing fields; a nonzero alert exit is explicitly a notification failure, never “sent.”

Everything is recorded by default in Made Well's home (`~/.local/share/madewell`):

- the store holds every item, event and agent call in full;
- `live/` holds the output of each step while it runs;
- `spans.jsonl` traces every engine step (`MW_DEBUG=0` turns it off).

**Updates reach a running `mw run` by themselves.** Reinstall Made Well and the runner notices its build changed: it finishes the steps in flight, starts nothing new, and replaces itself with the new build in the same process, keeping its pid and the runner claim. `kill -HUP <pid>` does the same on demand. Nothing is stopped or restarted by hand.

To collect telemetry from every machine, set `MW_TELEMETRY` to a directory you sync or collect (the same one everywhere, or one per machine). Each machine then appends every event, every agent call in full, and every engine span to its own file there, each line stamped with the Made Well build that wrote it and each call with its harness's version. `mw stats` reads those files together. Set `MW_TELEMETRY_LEVEL=metrics` to keep your repo's content out: prompts, answers, raw streams, errors and messages are written as their lengths, and `mw stats` reads the same numbers.

[FOUNDATION.md](FOUNDATION.md) is the operator's law and governs everything here.

## Develop

Node runs the TypeScript sources directly (`node src/cli.ts`). The install runs `dist/mw.mjs`, the sources bundled with Effect into one committed file; `npm test` rebuilds it, so commit it with your change.

```sh
npm install
npm test
npm run typecheck
```
