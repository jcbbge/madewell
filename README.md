# Constellation

**Constellation's Level-0 Harness, built in its native language (Common Lisp).**

The pipe-owning kernel: the layer where the laws an agent runtime is supposed to
obey stop being prose in a document and become primitives in a language. Grounding,
verification, the ratchet, the cooperative pause — expressed as forms, not as a
framework asking to be followed.

Status: **day one.** The toolchain is standing, the loop builds and tests, and the
first slice is not yet cut. See `docs/CONSTELLATION-V6-CONVERGENCE.md` for the plan
and `docs/excavation/` for what the previous five iterations crystallized.

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
