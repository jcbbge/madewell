#!/bin/sh
# Case 02: double-advance refused at each scope.
# Per SPEC §9.2: a cycle-scoped door passes at most once per cycle;
# an item-scoped door passes at most once per (cycle, item).

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="02-double-advance"
set_up_repo
trap tear_down_repo EXIT

# ---- double commit (cycle-scoped) ----
mw advance commit >/dev/null
assert_eq "after first commit, 1 event" "$(ledger_count)" "1"
mw_capture advance commit
assert_eq "second commit refused (exit 1)" "$MW_RC" "1"
case "$MW_ERR" in
  *'cycle c001 is still open'*) pass "second commit error mentions the open cycle" ;;
  *) fail "second commit error should mention open cycle"; note "actual: $MW_ERR" ;;
esac
assert_eq "second commit appends nothing" "$(ledger_count)" "1"

# ---- double ground (cycle-scoped) ----
mw advance ground >/dev/null
assert_eq "after first ground, 2 events" "$(ledger_count)" "2"
mw_capture advance ground
assert_eq "second ground refused (exit 1)" "$MW_RC" "1"
case "$MW_ERR" in
  *'ground already passed'*) pass "second ground error mentions already-passed" ;;
  *) fail "second ground error should mention already-passed"; note "actual: $MW_ERR" ;;
esac
assert_eq "second ground appends nothing" "$(ledger_count)" "2"

# ---- double plan for the same item (item-scoped) ----
write_conformant_plan c001 i001
mw advance plan i001 >/dev/null
assert_eq "after first plan i001, 3 events" "$(ledger_count)" "3"
mw_capture advance plan i001
assert_eq "second plan i001 refused (exit 1)" "$MW_RC" "1"
case "$MW_ERR" in
  *'still in flight'*|*'has already been planned'*|*'not legal in phase'*) pass "second plan i001 error mentions the item" ;;
  *) fail "second plan i001 error should refuse"; note "actual: $MW_ERR" ;;
esac
assert_eq "second plan i001 appends nothing" "$(ledger_count)" "3"

# ---- double verify (item-scoped) ----
mw advance verify i001 >/dev/null
mw_capture advance verify i001
assert_eq "second verify i001 refused (exit 1)" "$MW_RC" "1"
assert_eq "second verify i001 appends nothing" "$(ledger_count)" "4"

# ---- second land: bring cycle to a legal land state, then verify only
# one land event is appended (not two) ----
write_conformant_plan c001 i002
mw advance plan i002 >/dev/null
mw advance verify i002 >/dev/null
write_land_commit c001
mw advance land >/dev/null
land_count=$(grep -c '"door":"land"' "$TEST_REPO/.madewell/work/events.jsonl" || true)
assert_eq "exactly one land event in ledger" "$land_count" "1"

# A second land would be refused because the cycle is now closed (no open cycle).
mw_capture advance land
assert_eq "second land refused (exit 1)" "$MW_RC" "1"
case "$MW_ERR" in
  *'no open cycle'*) pass "second land error mentions no open cycle" ;;
  *) fail "second land should refuse with no-open-cycle"; note "actual: $MW_ERR" ;;
esac
land_count=$(grep -c '"door":"land"' "$TEST_REPO/.madewell/work/events.jsonl" || true)
assert_eq "still exactly one land event after refused second" "$land_count" "1"

# ---- hash chain still intact after refused calls ----
assert_chain_intact "hash chain intact across refused + passing calls"

report_case
