# Made Well

Read [`FOUNDATION.md`](FOUNDATION.md) before changing this application; it is operator law. Changes to its rules need the operator's explicit word.

- **Every agent-to-agent interaction is an NQ exchange.** No hand-off skips intake; a new card is a new agent.
- **Profiles only.** Never give agents personal names (ideator, ideation peer, planner, test architect, implementer, arbiter, dispatcher, operator).
- **The work item is the durable object.** Save every transition to the store before the next call. Recovery is redriving the saved state; there is no other recovery path.
- **A usage limit never reaches the operator.** Swap cards; wait for the earliest reset when every account is out.
- **Built for agents first.** Every command prints JSON. Every failure is a `MadeWellError` with `code`, `message`, `context` holding the facts needed to act, an optional `cause`, and `next` commands. Never throw a bare `Error` to the caller.
- **TypeScript + Effect.** Services are `Context.Service` classes provided as layers (`Store`, `Worker`). Engine steps are `Effect.fn('mw.<name>')`, so each is a traced span. Time comes from `Clock`, so `TestClock` drives tests. Node runs the `.ts` sources directly; keep syntax erasable (no enums, namespaces or parameter properties).
- **Tests.** Assert observable results through the engine or the CLI, with a scripted worker. Run `npm test` and `npm run typecheck` after changes.
- Never commit without an explicit request.
