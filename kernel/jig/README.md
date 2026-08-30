# The Jig — the human door

The Jig is the stop on **implement** and **verify**. Tests say whether a thing *works*.
The Jig says whether you **re-decided** something already settled.

## What is enforced (not hoped)

Install runs `bin/mw-hooks.sh`. After that:

| Hook | Script | What happens if you skip it |
|---|---|---|
| **pre-commit** | `mw-gate.sh` | illegal stock/bench/finished move **refused** |
| **pre-commit** | `mw-jigs.sh` | each registry jig with a `run` command runs; **block** fails the commit |
| **post-commit** | `mw-record.sh` | one line appended to `corrections.jsonl`. Consumes `proposed.json` if present. Never blocks. |

`MW_GATE=off` bypasses the move-gate only, adoption commits. Do not use it to smuggle an
illegal move.

A convention with no `run` in the registry is **UNJIGGED** — agents honor it; git will not.

## Tax — promote or drop

See `CORRECTIONS.md`. The reading is `sh .madewell/bin/mw-tax.sh` (verify and session-end).
Fixture 6/6 is not that reading. `proposed.json` is the override; without it Σ(tax) is zero
and nothing ratifies. Ratify never auto-builds.

## Layout

| Path | Who owns it | What |
|---|---|---|
| `README.md` | kernel | this door |
| `CONTRACT.md` | kernel | shape of compiled conventions |
| `CORRECTIONS.md` | kernel | proposed − accepted schema |
| `metabolism/` | kernel | shop-made / take-down functions + harness |
| `conventions/` | this project | compiled conventions |
| `registry.json` | this project | wired jigs (`id`, `run`, `mode`) |
| trade `jig/conventions/` | trade | diet until this repo compiles its own |

## What needs you

- **Make this a jig?** `mw-tax.sh` printed RATIFY. You ratify. Never auto-build.
- **Take this jig down?** DROP or SUNSET. You watch or retire. Never auto-delete.
- **Two decidable rules disagree.** You pick.
- **The human overrode the assistant.** Write `proposed.json` before the commit, or the tax is a lie.
