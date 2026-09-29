# Intent-Driven Testing

Use when Orion writes the check.

- Derive checks from the piece floor, risks, contracts, and Cassiopeia's plan; do not fit them to Sirius's implementation.
- Prefer a few high-value checks over count or coverage theater.
- Assert observable behavior, public contracts, and meaningful failure or edge cases before internals.
- Make failures diagnostic enough to route: bad code, bad check, or out-of-scope condition.
- Only edit checks, and do not run them to declare success.
