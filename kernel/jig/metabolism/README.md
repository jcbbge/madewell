# Shop-made / take-down — decision functions

Absorbed from the lab (`~/rumen/metabolism/`, R1 harness, 6/6). The math is
unchanged. Function names in the source still say slough/ruminate/absorb —
that is the proven API. Made Well names:

| In the code | Here |
|---|---|
| wall | a wired jig |
| slough | take the jig down |
| ruminate | sunset: relax and watch |
| regurgitate | violations come back → restore |
| absorb | shop-made: tax crossed the price → ratify a new jig |
| cud | the correction log (`../CORRECTIONS.md`) |

The tax is the live ledgers, not this table:

```
sh .madewell/bin/mw-tax.sh
node .madewell/jig/metabolism/live-feed.mjs   # jsonl → RATIFY/HOLD/DROP/SUNSET/KEEP
node .madewell/jig/metabolism/harness.mjs     # function-rot (synthetic 6/6) + live-feed
```

Honest limits: grouping “same correction” is unsolved; hours in `DEFAULT_CONFIG` are
illustrative; ratification is a flag, not a UI; sunset restore vs retire is not in the
log (you have to watch).
