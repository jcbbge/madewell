# Made Well on Pi Durable

Read [`FOUNDATION.md`](FOUNDATION.md) before changing this application; it is operator law. Changes to its primitives need the operator's explicit word.

- Pi and Pi Durable are the substrate. Do not rebuild what they provide: recovery is redriving state, workers are plain pi, the store is one Pi Durable SQLite file.
- Phases are separate agents; handoff is acceptance. Do not add reviewer or receipt layers on top.
- A failed test is a question; the Arbiter decides whose (pre-existing / implementation / test), undetermined → human.
- Never pin `@earendil-works/*` packages. They track `latest`; `npm run update` refreshes them.
- Run `npm test` after code changes.
- Never commit without an explicit request.
