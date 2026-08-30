# Ground — where to look in this project

Seeded once. Re-sync does not overwrite this file. Add roots this project actually has.
Do not list trees that do not exist.

## Kernel (always)

- `.madewell/DECISIONS.md`
- `.madewell/PRODUCT.md`
- `.madewell/stock/`, `.madewell/bench/`, `.madewell/finished/`
- `.madewell/jig/`
- `AGENTS.md`, `MADEWELL.md`, `.madewell/SPEC.md` (or `SPEC.md` in the dist checkout)

## This project

- `docs/` — if present
- loaded trade — if this project named one

## Systems of record we do not own

Values that are authoritative *outside* this repo. Our code mirrors them; the mirror
is not the source. Name each system, what it owns, and how to read it. An empty
section is a claim that this project owns every value it uses — say so deliberately.

- `<system>` — owns `<which values>` — read via `<API / property definition / console>`
