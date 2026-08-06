#!/bin/sh
# Case 08: hand-advanced projection caught by fsck (derived-region drift). (DEFERRED)
#
# Per SPEC §9.8: fsck must recompute position and fail if the projection's
# derived region (the `position` block in madewell.json) disagrees with
# the ledger.
#
# This case requires `mw fsck`. When added, this case should:
#   1. Run the full happy-path cycle (cases 01).
#   2. Hand-edit the position block to a different head hash (simulating
#      a hand-edit by an agent that didn't realize position is derived).
#   3. Run `mw fsck`. Expect exit 1 with a "derived-region drift" message.
#   4. Run `mw here --json` - the position is still what the ledger says
#      (recomputed on every read), so `here` should reflect the ledger
#      truth even though madewell.json's projection is stale. fsck is the
#      tool that surfaces the drift.

echo "CASE 08-fsck-projection-drift: DEFERRED (needs mw fsck)"
echo "See SPEC.md §7.3 for the fsck contract."
exit 0
