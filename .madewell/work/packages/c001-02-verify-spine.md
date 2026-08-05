# Package c001-02: Independently verify the telemetry spine (src/spine.lisp)
**Cycle:** c001 (item i002) · **Date:** 2026-08-05 · **Role spawned:** Test-Designer (then Test-Runner)

## What This Is

Independent verification of the telemetry spine — the nervous system every other
primitive emits into. Its implementer wrote its tests. The three claims that most need
independent eyes: the **Envelope contract is byte-compatible with v5**, **nesting is
carried by dynamic binding** (structure, not inference), and **the ring's eviction and
ordering hold across the wrap**.

## The Wall (binding)

- Read **only**: this brief, `README.md`, `docs/CONSTELLATION-V6-CONVERGENCE.md` (§2.A is
  the spine's intent), and `src/package.lisp`.
- Never read `src/spine.lisp`, other implementation files, or anything in `tests/`.
- Design from intent. Intent wins disagreements.

## Public Contract (from src/package.lisp, acquired this session)

Exports: `envelope`, `envelope-id`, `envelope-parent-id`, `envelope-phase`,
`envelope-ts`, `envelope-duration-ns`, `envelope-actor-id`, `envelope-name`, `emit`,
`with-envelope`, `spine-events`, `spine-reset`, `spine-write-ndjson`, `*actor*`,
`*current-parent*`, `*spine-capacity*`.

## Behavioral Intent

From README.md and convergence doc §2.A:

1. **The Envelope field set is the v5 contract, byte-compatible:** `id`, `parent_id`,
   `phase` (`:start` | `:end` | `:point`), `ts` (universal time), `duration_ns` (set on
   `:end`, null otherwise), `actor_id`, `name`. Any reader written against v5's
   TELEMETRY.md reads v6 output unchanged. NDJSON key names are exactly these,
   snake_cased.
2. **Nesting is structure, not inference.** `with-envelope` brackets its body in `:start`
   and `:end` envelopes and rebinds `*current-parent*` for the body's dynamic extent:
   anything the body calls — however deep, through functions that know nothing about
   telemetry — emits under the right parent automatically. The `:end` envelope fires even
   when the body signals (a trace that stops mid-span is how you find the thing that
   broke); it carries a real `duration_ns`.
3. **The spine is a bounded ring.** Default capacity 10,000; once full, the oldest
   envelope is evicted per write, so a day-long process costs the same memory as a
   second-long one. `*spine-capacity*` is rebindable; `spine-reset` clears and is also
   the resize door. Envelope ids are monotonic from a counter reset by `spine-reset`.
4. **`spine-events` is the only honest reader.** It returns the retained window oldest
   first — after a wrap, that is *not* slot order. Evicted envelopes are simply gone.
5. **`*actor*` names the emitter** and is rebindable per star/worker.
6. **`spine-write-ndjson`** writes the retained window as newline-delimited JSON through
   the same honest ordering.

## Your Output

Test brief + test code to `.madewell/specs/2026-08-05-c001-spine.test.md`; executable
code to `.madewell/work/verification/spine-verify.lisp`. Runs against the loaded
`constellation` system; FiveAM via the repo's ocicl setup. Do NOT modify
`constellation.asd`, `src/`, or `tests/`.

## How We'll Know It's Done

- [ ] Every intent line 1–6 has at least one check traceable to it
- [ ] The wrap is exercised for real: rebind `*spine-capacity*` small (e.g. 8), emit more
      than capacity, assert eviction, retained-window contents, and oldest-first order —
      including order *across* the wrap boundary
- [ ] Nesting is exercised through intermediate functions that take no telemetry
      arguments — depth ≥ 3 — and the parent chain is asserted structurally
- [ ] The signaling body still closes its span (`:end` with `duration_ns`) — prove it
- [ ] NDJSON output is parsed by a third-party parser (e.g. pipe to `python3 -c` json
      lines check) and every key name/type asserted against the v5 field set
- [ ] State restored on every path (spine-reset before AND after, capacity restored);
      no run-order dependence; no mocks
- [ ] No pinned volatile refs

## What Could Go Wrong

1. Testing ring behavior only below capacity — the wrap is where the contract lives.
2. Assuming JSON validity by inspection — parse it with something that isn't the emitter.

## Out of Scope

Fixes. Report contract ambiguities in the test brief.
