#!/bin/sh
# Case 03: out-of-order doors refused.
# Per SPEC §9.3: every illegal edge in §5.3 is refused.

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="03-out-of-order"
set_up_repo
trap tear_down_repo EXIT

# Helper: assert that a door is refused with one of several possible error
# substrings (the legality check has multiple branches that may fire in
# different orders depending on state).
refused_with_any() {
  desc=$1; door=$2; item=$3; shift 3
  if [ -z "$item" ]; then
    mw_capture advance "$door"
  else
    mw_capture advance "$door" "$item"
  fi
  if [ "$MW_RC" = "1" ]; then
    matched=0
    for needle in "$@"; do
      case "$MW_ERR" in
        *"$needle"*) matched=1 ;;
      esac
    done
    if [ "$matched" = "1" ]; then
      pass "$desc"
    else
      fail "$desc"
      note "expected one of: $*"
      note "actual: $MW_ERR"
    fi
  else
    fail "$desc (expected exit 1, got $MW_RC)"
    note "stderr: $MW_ERR"
    note "stdout: $MW_OUT"
  fi
}

# ---- ground/plan/verify/land without commit ----
refused_with_any "ground without open cycle"       ground ""  "no open cycle"
refused_with_any "plan without open cycle"         plan i001   "no open cycle"
refused_with_any "verify without open cycle"       verify i001 "no open cycle"
refused_with_any "land without open cycle"         land ""     "no open cycle"

# ---- legal: commit, then ground ----
mw advance commit >/dev/null
assert_eq "after commit, 1 event" "$(ledger_count)" "1"
mw advance ground >/dev/null
assert_eq "after ground, 2 events" "$(ledger_count)" "2"

# ---- verify before plan: refuse. The legality check fires either the
# "in-flight" check (item not in flight) or the "has plan" check (no plan pass).
refused_with_any "verify i001 with no plan pass" verify i001 "no plan pass" "not in flight"

# ---- plan an item that does not exist in the queue ----
refused_with_any "plan i999 (not in queue)" plan i999 "is not in the open cycle"

# ---- get i001 in flight, then try to plan the next item ----
write_conformant_plan c001 i001
mw advance plan i001 >/dev/null
# Plan i002: refused because the legality check fires the phase check first
# ("plan not legal in phase make") since i001 is in flight. Either message
# is a valid refuse.
refused_with_any "plan i002 while i001 in flight" plan i002 "still in flight" "not legal in phase"
refused_with_any "verify i002 when i001 in flight" verify i002 "not in flight"
refused_with_any "commit while c001 open" commit "" "still open"

# ---- finish i001 ----
mw advance verify i001 >/dev/null

# ---- land while i002 is not done ----
refused_with_any "land while i002 not done" land "" "land not yet legal"

# ---- finish i002 and run legal land ----
write_conformant_plan c001 i002
mw advance plan i002 >/dev/null
mw advance verify i002 >/dev/null
write_land_commit c001
mw advance land >/dev/null
assert_eq "after legal land, 7 events" "$(ledger_count)" "7"

# ---- land when no open cycle ----
refused_with_any "land when no open cycle" land "" "no open cycle"

# ---- second cycle: inject a second discovery item, then commit + double-commit
# We rewrite madewell.json with d002 prepended. After commit, c002 is open;
# a second commit should refuse.
# Use pretty-printed multi-line JSON because apply_commit's line-range skip
# does not handle single-line JSON well (the d-item block shares a line with
# the rest of the file, so a "skip line range" would delete too much).
cat > "$TEST_REPO/.madewell/madewell.json" <<'JSON'
{
  "project": "Conformance Test",
  "profile": "kernel",
  "context": {
    "summary": "conformance test repo",
    "openThread": null,
    "language": {}
  },
  "discovery": [
    {
      "id": "d002",
      "item": "Second fixture",
      "items": [
        { "id": "i003", "dependsOn": [], "title": "Third item" }
      ]
    }
  ],
  "active": [
  ],
  "landed": [
  ],
  "blocked": [],
  "position": { "stage": "discovery" }
}
JSON

# The first commit picks d002 and mints c002.
mw_capture advance commit
assert_eq "first commit of second cycle exit 0" "$MW_RC" "0"

# Now c002 is open; a second commit should refuse (no d-items left).
mw_capture advance commit
assert_eq "second commit refused (exit 1)" "$MW_RC" "1"
case "$MW_ERR" in
  *'cycle '*'is still open'*|*'no discovery items to commit'*) pass "second commit refused (either reason valid)" ;;
  *) fail "second commit should refuse"; note "actual: $MW_ERR" ;;
esac

# ---- hash chain still intact ----
assert_chain_intact "hash chain intact across out-of-order refused calls"

report_case
