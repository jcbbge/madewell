#!/bin/sh
# Case 07: hand-edited ledger caught by fsck (chain break). (DEFERRED)
#
# Per SPEC §9.7: an implementation MUST provide `fsck` that replays the
# hash chain end-to-end and fails on any break.
#
# This case requires the `mw fsck` subcommand, which is not in the v1
# kernel. When added, this case should:
#   1. Run the full happy-path cycle (cases 01).
#   2. Hand-edit the ledger: replace one event's `prev` field with a
#      wrong value (or replace the event's bytes entirely).
#   3. Run `mw fsck`. Expect exit 1, with a clear "chain break" message
#      identifying the affected event.
#   4. Restore the correct value. Run `mw fsck` again. Expect exit 0.

echo "CASE 07-fsck-chain-break: DEFERRED (needs mw fsck)"
echo "See SPEC.md §7.3 for the fsck contract."
exit 0
