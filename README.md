# Made Well

Made Well is a durable software delivery pipeline for coding agents: discovery turns raw notes into candidate work items, and delivery takes one promoted item through ideation, planning, implementation and verification until it is merged and deployed. It runs with any harness, provider and model, and one install serves all of your projects.

## Install

Requires Node 24.15 or later.

```sh
npm install -g --install-links github:jcbbge/madewell
```

## Use

Tell your agent, from any project: **run `mw` and follow `next`.**

Every command prints JSON, and every answer and error lists the `next` commands to run. `mw next` always says what to do now.

**Updates reach a running `mw run` by themselves.** Reinstall Made Well and the runner notices its build changed: it finishes the steps in flight, starts nothing new, and replaces itself with the new build in the same process, keeping its pid and the runner claim. `kill -HUP <pid>` does the same on demand. Nothing is stopped or restarted by hand.

To collect telemetry from every machine, set `MW_TELEMETRY` to a directory you sync or collect (the same one everywhere, or one per machine). Each machine then appends every event, every agent call in full, and every engine span to its own file there, each line stamped with the Made Well build that wrote it and each call with its harness's version. `mw stats` reads those files together. Set `MW_TELEMETRY_LEVEL=metrics` to keep your repo's content out: prompts, answers, raw streams, errors and messages are written as their lengths, and `mw stats` reads the same numbers.

[FOUNDATION.md](FOUNDATION.md) is the operator's law and governs everything here.

## Terminal sidecar

`node dist/mw-sidecar.mjs` (packaged as `mw-sidecar` when Made Well is installed) is a read-only terminal view of `mw status` (and the current running item's recorded card from `mw show`). It shows holds first with their next commands, current work and NQ turns, queued work, quota reset times, and items shipped today. It refreshes every two seconds; `q` or Ctrl-C exits. Pass `--once [--width N]` to print a frame without staying open. `--workspace DIR` limits the view to one project; without it, the pane shows work from every registered project. The pane's bottom edge carries tmux key hints. It never starts, answers or ships work. The machine-wide store already covers every registered project; the sidecar does not use the retired Pi Durable store.

On this VPS, SSH launch choice 2 creates a new tmux session with a shell on the left and the sidecar on the right. Other windows remain plain shells.

## Develop

Node runs the TypeScript sources directly (`node src/cli.ts`). The install runs `dist/mw.mjs`, the sources bundled with Effect into one committed file; `npm test` rebuilds it, so commit it with your change.

```sh
npm install
npm test
npm run typecheck
```
