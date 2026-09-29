# Failure Triage

Use when Aldebaran reads a failed required command.

- Separate inability to run from a real failing result.
- Compare the observed failure to the Done when line it was meant to prove.
- Report the first required failure with the command and the observed evidence, not a theory.
- Do not rerun unless the plan explicitly names a retry command.
- Do not repair code, tests, fixtures, or environment; hand off the failure as-is.
