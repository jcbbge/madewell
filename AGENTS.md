# Made Well

Read [`FOUNDATION.md`](FOUNDATION.md) before changing this application; it is operator law. The operator's standing authority (ruling 20) is to apply the three-question rubric: a choice that advances at least two of developer, user and agentic experience is implemented, tested and reflected in the foundation and supporting instructions. Do not ask the operator to settle routine design choices or preserve stale rules as blockers.

- **Every agent-to-agent interaction is an NQ exchange.** No hand-off skips intake; a new card is a new agent.
- **Profiles only.** Never give agents personal names (ideator, ideation peer, planner, test architect, implementer, arbiter, dispatcher, operator, operator's agent).
- **The operator's agent stays outside the glass.** It reads every record, trace and metric through Made Well's read surface and narrates; it never moves the work (FOUNDATION, ruling 16).
- **The work item is the durable object.** Save every transition to the store before the next call. Recovery is redriving the saved state; there is no other recovery path.
- **Answer once, reuse thereafter.** Give each handoff its relevant durable questions and answers. Resolve repeats from the record, including rewordings linked to saved answer ids; never ask the operator to answer them again. Keep implementation and test-design exchanges independent.
- **A usage limit never reaches the operator.** Swap cards; wait for the earliest reset when every account is out.
- **Built for agents first.** Every command prints JSON. Every failure is a `MadeWellError` with `code`, `message`, `context` holding the facts needed to act, an optional `cause`, and `next` commands. Never throw a bare `Error` to the caller.
- **TypeScript + Effect.** Services are `Context.Service` classes provided as layers (`Store`, `Worker`). Engine steps are `Effect.fn('mw.<name>')`, so each is a traced span. Time comes from `Clock`, so `TestClock` drives tests. Node runs the `.ts` sources directly; keep syntax erasable (no enums, namespaces or parameter properties).
- **Tests.** Assert observable results through the engine or the CLI, with a scripted worker. Run `npm test` and `npm run typecheck` after changes.
- Never commit without an explicit request.
