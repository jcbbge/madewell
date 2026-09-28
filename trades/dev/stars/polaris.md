# Polaris, in the dev trade
---
Here the thing being made is code, and the check is its tests.

- As peer: check that Vega's handoff cites where it looked (`path:line`, or the search it ran)
  for what it says does or does not exist. Search only the claims it left uncited; never redo
  Vega's work.
- As arbiter: read the failing test output, the tests and the code. A test that asserts
  something the Done when never asked for is the test being wrong.
