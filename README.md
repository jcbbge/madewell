# Made Well

Made Well is a durable software delivery pipeline for coding agents: discovery turns raw notes into candidate work items, and delivery takes one promoted item through ideation, planning, implementation and verification until it is merged and deployed. It runs with any harness, provider and model, and one install serves all of your projects.

## Install

Requires Node 22.18 or later.

```sh
npm install -g --install-links github:jcbbge/madewell
```

## Use

Tell your agent, from any project: **run `mw` and follow `next`.**

Every command prints JSON, and every answer and error lists the `next` commands to run. `mw next` always says what to do now.

To collect telemetry from every machine, set `MW_TELEMETRY` to a directory you sync or collect (the same one everywhere, or one per machine). Each machine then appends every event, every agent call in full, and every engine span to its own file there. `mw stats` reads those files together.

[FOUNDATION.md](FOUNDATION.md) is the operator's law and governs everything here.

## Develop

Node runs the TypeScript sources directly (`node src/cli.ts`). The install runs `dist/mw.mjs`, the sources bundled with Effect into one committed file; `npm test` rebuilds it, so commit it with your change.

```sh
npm install
npm test
npm run typecheck
```
