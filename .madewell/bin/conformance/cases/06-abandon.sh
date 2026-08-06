#!/bin/sh
# Case 06: abandon closes without unlocking consumed doors. (DEFERRED)
#
# Per SPEC §9.6: `abandon` closes an item or cycle without landing it,
# but doors already passed (plan, verify) remain consumed - you cannot
# re-plan or re-verify the abandoned item.
#
# This case requires the `mw abandon <item-id>` subcommand, which is not
# in the v1 kernel (per the brief's "conformance and fsck out of scope"
# boundary for the initial slice; abandon was identified as future work).
# See ~/madewell/SPEC.md §3.3 (abandon event kind).
#
# When `mw abandon` is added, this case should test:
#   1. abandon i001 in flight -> i001 cannot be re-planned or re-verified
#   2. abandon i001 with no verify -> ledger has abandon event, position
#      moves past i001 (next item becomes eligible to plan)
#   3. abandon the whole cycle -> cycle is closed, position returns to
#      discovery, no land event ever fires

echo "CASE 06-abandon: DEFERRED (needs mw abandon <item-id>)"
echo "See README.md and SPEC.md §3.3 for the planned shape."
exit 0
