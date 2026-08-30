# Correction log — the tax

This is how you know whether to **promote** a shop-made jig or **drop** a wired one.
The fixture harness (`metabolism/harness.mjs`) only proves the functions still compute.
It is not a reading of this shop.

```
sh .madewell/bin/mw-tax.sh
```

| Printed | Meaning | What you do |
|---|---|---|
| **RATIFY** | Σ(tax of this correction) > fence cost | You compile a shop-made jig. Never auto-build. |
| **HOLD** | tax has not crossed the price | Leave it. Do not mint a jig from one miss. |
| **DROP** | keeping the wired jig costs more than the tax it prevents | Take it down. |
| **SUNSET** | it has gone silent while still economically even | Relax, watch. Restore if the miss returns; retire if it does not. The log cannot see the experiment. |
| **KEEP** | still earning its place | Leave it. |

Git log is the accepted commit. Git log is **not** the rejected proposal. Without `proposed`, Σ(tax) is always zero and RATIFY never fires.

## Contact — `proposed.json`

When the human overrode the assistant, write `.madewell/jig/proposed.json` **before** the commit that lands their version:

```json
{ "convention": "stable-id-or-name", "summary": "what they threw away", "tax": 1.5 }
```

`bin/mw-record.sh` (post-commit) copies that object onto the new `corrections.jsonl` line as `proposed`, then deletes the file. `tax` is hours; omit it and the default is `DEFAULT_CONFIG.avg_tax_per_violation`. Grouping key is `convention`, then `summary`. Equivalence of “same correction” is still a stub (lab R7).

Do not patch jsonl by hand unless the commit already landed without the file.

## Files (local, gitignored)

| File | Who writes | What |
|---|---|---|
| `proposed.json` | the agent, when the human overrode, before commit | next `proposed` side |
| `corrections.jsonl` | `bin/mw-record.sh` on every commit | accepted + `proposed` (or null) |
| `firings.jsonl` | `bin/mw-jigs.sh` each registry run; `mw-gate.sh` on **refusal only** | take-down / sunset |

## `corrections.jsonl` line

```jsonc
{
  "ts": "ISO-8601 Z",
  "sha": "accepted commit",
  "branch": "…",
  "files": 0,
  "insertions": 0,
  "deletions": 0,
  "subject": "commit subject",
  "proposed": null   // or { "convention", "summary", "tax?" }
}
```

`proposed: null` means no override was recorded. That commit adds nothing to Σ(tax).

## `firings.jsonl` line

```jsonc
{
  "ts": "…",
  "sha": "…",
  "jig": "id from registry (or mw-gate)",
  "mode": "warn" | "block",
  "exit": 0,
  "violations_caught": 0,
  "false_positive": false   // set true when a firing was a false alarm
}
```

Live take-down counts **lines** in a week, not the lab fixture’s summed totals. Mark `false_positive` or DROP will not see crying wolf.

## Math

Functions: `metabolism/metabolism.mjs`. Live feed: `metabolism/tax.mjs`. Proof that jsonl drives RATIFY/HOLD/DROP/SUNSET/KEEP: `node .madewell/jig/metabolism/live-feed.mjs` (also run from the harness). Function-rot only: `node .madewell/jig/metabolism/harness.mjs`.
