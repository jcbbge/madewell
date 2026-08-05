# Package c001-05: Independently verify the dictionary emitter (src/dictionary.lisp)
**Cycle:** c001 (item i005) · **Date:** 2026-08-05 · **Role spawned:** Test-Designer (then Test-Runner)

## What This Is

Independent verification of the live-image dictionary — the package where the language
maps itself, because no external code-intelligence tool parses Lisp. Its implementer
wrote its tests. The two claims that need independent eyes: **kinds are reported
correctly** (a macro must be a macro) and **the JSON is actually parseable by a
third-party parser**.

## The Wall (binding)

- Read **only**: this brief, `README.md`, and `src/package.lisp` (the export list is
  doubly relevant here — it is also the dictionary's expected contents).
- Never read `src/dictionary.lisp`, other implementation files, or anything in `tests/`.

## Public Contract (from src/package.lisp, acquired this session)

Exports: `dictionary-entries`, `dictionary-json`, `write-dictionary`.

## Behavioral Intent

1. **The image describes itself.** `dictionary-entries` returns every external symbol of
   a package (default `:constellation`) as a plist of `:name` (lowercase string), `:kind`,
   `:lambda-list` (string or nil), `:documentation` (string or nil), **sorted by name so
   output is stable across images**.
2. **Kind detection order is the point:** a macro is reported `:macro` even though it is
   also fboundp; then `:special-operator`, `:function`, `:class`, `:variable`, fallback
   `:symbol`. Lambda lists appear only for things that have them (functions, macros).
3. **The JSON is real JSON.** `dictionary-json` returns the package's external API as a
   JSON array string, one object per entry with keys `name`, `kind`, `lambda_list`,
   `documentation`; `write-dictionary` writes the same to a stream. Keywords render as
   lowercase strings; nil as null; strings escaped per RFC 8259 §7.
4. **Completeness against the contract:** for the default package, the dictionary's names
   must exactly equal the export list in `src/package.lisp` — no missing, no extras.

## Your Output

Test brief + test code to `.madewell/specs/2026-08-05-c001-dictionary.test.md`;
executable code to `.madewell/work/verification/dictionary-verify.lisp`. Against the
loaded `constellation` system; FiveAM via ocicl. Do NOT modify `constellation.asd`,
`src/`, or `tests/`.

## How We'll Know It's Done

- [ ] Every intent line 1–4 has a check traceable to it
- [ ] Kind correctness is proven on symbols whose kind is unambiguous from the contract
      (e.g. `with-envelope` must be `:macro` — macros and functions both being fboundp is
      the trap this check exists for; `ground` a `:function`; `*actor*` a `:variable`;
      `envelope` — a struct — should surface as `:class` or per the contract's kind
      ladder; assert what the contract states, report what it doesn't)
- [ ] JSON parseability is proven by a **third-party parser** (e.g. pipe
      `dictionary-json` output to `python3 -m json.tool` or `jq`), not by string
      inspection — including entries with nil lambda-lists and documentation containing
      quotes or newlines
- [ ] Completeness: dictionary names ≡ `src/package.lisp` export names (case-normalized),
      asserted both directions
- [ ] Sort stability: two calls return identical name order
- [ ] No mocks; state restored; no run-order dependence; no pinned volatile refs

## What Could Go Wrong

1. Asserting kinds from memory about CL rather than from the contract — `macro-function`
   vs `fboundp` overlap is exactly where an implementer-written test would go soft.
2. Escaping: docstrings in this project contain quotes and newlines; a hand-rolled JSON
      writer's edge cases live there. Feed the parser the real output.

## Out of Scope

Fixes. Report contract ambiguities in the test brief.
