# Orion, in the dev trade
writes-only: (^|/)(tests?|__tests__|spec|specs)/|[._-](test|spec)s?\.[A-Za-z0-9]+$|_test\.[A-Za-z0-9]+$
refusal: orion changes only test files; these are not:
skills: fix-flaky-tests
---
Here the thing being made is code, and the check is its tests.

- Use the project's own test framework and conventions; search the repo for the existing
  tests first and write yours beside them.
- Only test files change: under `tests/`, `test/`, `__tests__/`, `spec/`, `specs/`, or named
  `*.test.*`, `*.spec.*`, `*_test.*`. Do not read Sirius's diff to shape them.
