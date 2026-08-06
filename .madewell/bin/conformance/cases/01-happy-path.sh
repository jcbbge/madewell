#!/bin/sh
# Case 01: happy-path commit -> ground -> (plan -> verify)xN -> land.
# Per SPEC §9.1: ledger and projection correct at every step.

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="01-happy-path"
set_up_repo
trap tear_down_repo EXIT

# ---- initial state ----
assert_eq "ledger starts empty" "$(ledger_count)" "0"
assert_eq "head is genesis" "$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')" "genesis"
assert_eq "stage is discovery" "$(mw here --json | sed -n 's/.*"stage":"\([^"]*\)".*/\1/p')" "discovery"
assert_eq "frontier is [commit]" "$(mw frontier --json)" '["commit"]'

# ---- commit ----
mw advance commit >/dev/null
assert_eq "after commit, 1 event" "$(ledger_count)" "1"
assert_eq "after commit, phase=ground" "$(mw here --json | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')" "ground"
assert_eq "after commit, frontier=[ground]" "$(mw frontier --json)" '["ground"]'
assert_eq "after commit, cycle=c001" "$(mw here --json | sed -n 's/.*"cycle":"\([^"]*\)".*/\1/p')" "c001"

# ---- ground ----
mw advance ground >/dev/null
assert_eq "after ground, 2 events" "$(ledger_count)" "2"
assert_eq "after ground, phase=plan" "$(mw here --json | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')" "plan"
assert_eq "after ground, frontier=[plan]" "$(mw frontier --json)" '["plan"]'

# ---- plan i001 ----
write_conformant_plan c001 i001
mw advance plan i001 >/dev/null
assert_eq "after plan i001, 3 events" "$(ledger_count)" "3"
assert_eq "after plan i001, item=i001" "$(mw here --json | sed -n 's/.*"item":"\([^"]*\)".*/\1/p')" "i001"
assert_eq "after plan i001, phase=make" "$(mw here --json | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')" "make"
assert_eq "after plan i001, frontier=[verify]" "$(mw frontier --json)" '["verify"]'

# ---- verify i001 ----
mw advance verify i001 >/dev/null
assert_eq "after verify i001, 4 events" "$(ledger_count)" "4"
assert_eq "after verify i001, frontier=[plan]" "$(mw frontier --json)" '["plan"]'

# ---- plan i002 + verify i002 ----
write_conformant_plan c001 i002
mw advance plan i002 >/dev/null
mw advance verify i002 >/dev/null
assert_eq "after verify i002, 6 events" "$(ledger_count)" "6"
assert_eq "after verify i002, frontier=[land]" "$(mw frontier --json)" '["land"]'

# ---- land ----
write_land_commit c001
mw advance land >/dev/null
assert_eq "after land, 7 events" "$(ledger_count)" "7"
assert_eq "after land, stage=discovery" "$(mw here --json | sed -n 's/.*"stage":"\([^"]*\)".*/\1/p')" "discovery"
assert_eq "after land, no open cycle" "$(mw here --json | grep -c '\"cycle\":\"c001\"' || true)" "0"
assert_eq "after land, frontier=[]" "$(mw frontier --json)" "[]"

# ---- hash chain integrity ----
assert_chain_intact "all 7 events form a valid hash chain"

# ---- projection head matches ledger head ----
last_head=$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')
last_line=$(tail -n 1 "$TEST_REPO/.madewell/work/events.jsonl")
ledger_head=$(printf '%s' "$last_line" | shasum -a 256 | cut -c1-16)
assert_eq "position head matches ledger head" "$last_head" "$ledger_head"

# c001 must be in landed[] after land.
c001_in_landed=$(awk '/"landed":/,/^[[:space:]]*\],?$/' "$TEST_REPO/.madewell/madewell.json" | grep -c '"c001"' || true)
assert_eq "c001 is in landed[]" "$c001_in_landed" "1"

# active[] must be empty (just [], no objects).
active_block=$(awk '/"active":/,/^[[:space:]]*\],?$/' "$TEST_REPO/.madewell/madewell.json")
case "$active_block" in
  *'{'*'}'*) fail "active[] should be empty after land" ;;
  *)         pass "active[] empty after land" ;;
esac

report_case
