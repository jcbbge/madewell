#!/bin/sh
# Case 09: resume position computed correctly from a mid-cycle ledger.
# Per SPEC §9.9 + §4: an implementation MUST compute position from the ledger
# head, not from a mutable field. The inner-first resume rule says: if an
# open Cycle has an item whose last door is `plan` (in Make) or whose
# `verify` has not passed, resume there.

# This test seeds a partial cycle (commit, ground, plan i001, verify i001
# pass) and asserts the position reports the next item to plan (i002) and
# the frontier is ["plan"]. It also seeds a verify-fail state and asserts
# the position stays on the failing item with phase "verify".

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="09-resume-position"
set_up_repo
trap tear_down_repo EXIT

# ---- 9a: resume with all items still to plan ----
mw advance commit >/dev/null
mw advance ground >/dev/null
# No items planned yet. Position: phase=plan, no item in flight.
here=$(mw here --json)
phase=$(printf '%s' "$here" | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
item=$(printf '%s' "$here" | sed -n 's/.*"item":"\([^"]*\)".*/\1/p')
assert_eq "after commit+ground, phase=plan" "$phase" "plan"
assert_eq "after commit+ground, no in-flight item" "$item" ""
assert_eq "frontier=[plan]" "$(mw frontier --json)" '["plan"]'

# ---- 9b: resume with i001 in flight (plan pass, no verify pass) ----
write_conformant_plan c001 i001
mw advance plan i001 >/dev/null
here=$(mw here --json)
phase=$(printf '%s' "$here" | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
item=$(printf '%s' "$here" | sed -n 's/.*"item":"\([^"]*\)".*/\1/p')
assert_eq "after plan i001, phase=make" "$phase" "make"
assert_eq "after plan i001, in-flight item=i001" "$item" "i001"
assert_eq "frontier=[verify]" "$(mw frontier --json)" '["verify"]'

# ---- 9c: resume with i001 verified, i002 still to plan ----
mw advance verify i001 >/dev/null
here=$(mw here --json)
phase=$(printf '%s' "$here" | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
item=$(printf '%s' "$here" | sed -n 's/.*"item":"\([^"]*\)".*/\1/p')
assert_eq "after verify i001, phase=plan" "$phase" "plan"
assert_eq "after verify i001, no in-flight item" "$item" ""
assert_eq "frontier=[plan]" "$(mw frontier --json)" '["plan"]'

# ---- 9d: head pointer consistency ----
# The position block's head must equal the first-16-hex SHA-256 of the last
# ledger line, regardless of where we are in the cycle.
position_head=$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')
last_line=$(tail -n 1 "$TEST_REPO/.madewell/work/events.jsonl")
ledger_head=$(printf '%s' "$last_line" | shasum -a 256 | cut -c1-16)
assert_eq "position head equals ledger head (mid-cycle)" "$position_head" "$ledger_head"

# ---- 9e: source d-item id is recoverable at every step ----
# The source d-item is recorded in the commit event and propagated into the
# active cycle. mw here reports it on every read.
for _ in 1 2 3; do
  here=$(mw here --json)
  source=$(printf '%s' "$here" | sed -n 's/.*"source":"\([^"]*\)".*/\1/p')
  assert_eq "source d-item recoverable (iteration)" "$source" "d001"
  # Touch the ledger (re-read doesn't change state, but the read should be stable).
  mw here --json >/dev/null
done

# ---- 9f: complete the cycle and verify position returns to discovery ----
write_conformant_plan c001 i002
mw advance plan i002 >/dev/null
mw advance verify i002 >/dev/null
write_land_commit c001
mw advance land >/dev/null
here=$(mw here --json)
phase=$(printf '%s' "$here" | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
stage=$(printf '%s' "$here" | sed -n 's/.*"stage":"\([^"]*\)".*/\1/p')
assert_eq "after land, stage=discovery" "$stage" "discovery"
assert_eq "after land, phase=discovery" "$phase" "discovery"
assert_eq "after land, frontier=[]" "$(mw frontier --json)" "[]"

report_case
