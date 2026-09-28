# Constellation

**Constellation's Level-0 Harness, built in its native language (Common Lisp).**

The pipe-owning kernel: the layer where the laws an agent runtime is supposed to
obey stop being prose in a document and become primitives in a language. Grounding,
verification, the ratchet, the cooperative pause — expressed as forms, not as a
framework asking to be followed.

Status: **first slice cut.** The toolchain is standing and grounding works. See
`docs/CONSTELLATION-V6-CONVERGENCE.md` for the plan and `docs/excavation/` for what the
previous five iterations crystallized.

## The first slice: grounding

An agent that states a fact it did not acquire is not making a small error — the caveat
dies with the session and the fabricated value persists looking verified. So grounding
is not a rule an agent is asked to follow. It is a property of the values.

- **`acquisition`** — evidence something actually happened this session. No constructor
  takes your word for it; the only way to get one is to run the command, read the file,
  or ask the operator.
- **`claim`** — a subject, a value, and the acquisition behind it. Not a value with a
  source attached; a value that cannot be built without one.
- **`ground`** — the door. A value with nothing behind it does not pass. It *signals*,
  and the stack stays alive while a coordinator picks a restart: `acquire` (supply what
  was missing and resume in place), `mark-unknown` (record the absence, honestly), or
  `refuse`.

The worker names its recovery options and keeps going. It never learns which policy was
in force. Every acquisition and every door-crossing emits a telemetry Envelope, with the
call tree carried by dynamic binding rather than threaded by hand.

## Lineage

Five prior runtimes, each abandoned, each leaving one irreplaceable idea behind:

| # | Runtime | Crystallized |
|---|---------|--------------|
| 1 | various | the celestial metaphor and namespace |
| 2 | TypeScript v.01 | pheromone model, stigmergic coordination, the nQ protocol |
| 3 | TypeScript v.02 | SurrealDB as Nebula; the Adliyye Codex visual |
| 4 | Gleam/BEAM | actor model, fault isolation, supervision instinct |
| 5 | Zig | the telemetry spine as sensor array; the organism model; the fractal; the Firmament; four-layer memory; resonance; the autonomy gradient |
| **6** | **Common Lisp** | **the pipe becomes the language** |

This repo builds from [Made Well](https://github.com/) — the host-agnostic grammar
of contact points and loops. Made Well is referenced, not vendored; Constellation is
one host that happens to implement it natively.

## Requirements

| Tool | Version | Install |
|---|---|---|
| SBCL | 2.6.6 | `brew install sbcl` |
| ocicl | 2.17.0 | `brew install ocicl` |
| mpfr | — | `brew install mpfr` (ocicl links against it) |

ocicl needs one line of setup: `ocicl setup` prints a snippet for `~/.sbclrc`.
Paste it in. It makes failed ASDF lookups fall through to ocicl, which fetches
systems from an OCI registry into a project-local `ocicl/` directory pinned by
`ocicl.csv`.

Dependencies are restored with `make deps`. `ocicl.csv` is committed; `ocicl/` is not.

## The dev loop

```
make hello   # build the system and print the greeting
make test    # run the FiveAM suite — exit 0 is green
make tour    # the annotated Lisp feature walkthrough
make repl    # interactive REPL with the system loaded
make build   # dump a native binary to ./constellation
make clean   # remove the binary and the fasl cache
```

Every target is one-shot. No watchers, nothing to tear down.

## Layout

```
constellation.asd   two systems: constellation, constellation/tests
src/                the library
tests/              FiveAM suite
tour/tour.lisp      runnable Common Lisp walkthrough — read it with `make tour`
docs/               the plan, the decisions, the excavation of v1–v5
ocicl.csv           dependency lockfile (committed)
```

## Learning the language

`tour/tour.lisp` is a runnable, annotated tour of Common Lisp in thirteen sections,
ending with the four features this project is actually built on: macros, the
condition system, multiple dispatch, and the live image. Run `make tour` and read
the source alongside the output. `docs/lisp-primer.html` is the prose companion.

## License

MIT.
