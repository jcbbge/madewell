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

## Watch a run

**`mw ui`** serves the live console on this machine and prints its address (`http://127.0.0.1:4747/`). It shows:

- what is running now, with each agent's output as it streams;
- where every item sits in discovery, the operator's queue and the four delivery stages;
- what needs you, with the facts and the command that resolves each hold;
- the event log, saying who acted and what happened at every step;
- the operator's `mw status`, telemetry, time per stage including time waiting on you, and the rule checks on every agent call;
- for any item or call: the packet the agent was given, its brief, its answer, its tool calls, its raw stream and its trace.

Back, Step, Play and Start over replay the whole run step by step; Live follows it as it moves. The console only reads the store, so it is safe beside a running `mw run`.

- From another computer: `ssh -L 4747:localhost:4747 <machine>`, then open the same address.
- In an Amp orb: `amp orb portal 4747`.
- `mw ui --host 0.0.0.0` serves your network.

**`mw watch`** gives the same view in a terminal (tmux, Ghostty, any SSH session), redrawn every second. When a program reads it, it streams every event as one JSON line instead, so any agent can follow a run with `mw watch --since <seq>`.

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
