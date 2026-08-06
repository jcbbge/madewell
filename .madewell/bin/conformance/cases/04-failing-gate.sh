#!/bin/sh
# Case 04: failing gate blocks and records nothing as passed.
# Per SPEC §9.4: a failing gate (door script exit != 0 in gate mode) refuses
# the tick. A `result:"fail"` audit line MAY be appended; nothing is appended
# with `result:"pass"`. The position must not advance.

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="04-failing-gate"
set_up_repo
trap tear_down_repo EXIT

# Set up to a state where a plan gate can run: commit, ground, write a
# deliberately broken plan artifact.
mw advance commit >/dev/null
mw advance ground >/dev/null

# A broken plan artifact: missing the Data-Flow Conformance block (P2 fail).
mkdir -p "$TEST_REPO/.madewell/specs/c001"
cat > "$TEST_REPO/.madewell/specs/c001/i001.md" <<'EOF'
# Plan: i001 (broken)

## Exemplar File

- `bin/mw`

## Framework

framework: POSIX sh
EOF

# Capture the state before the failing gate.
before_events=$(ledger_count)
before_phase=$(mw here --json | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')

# Run the failing gate.
mw_capture advance plan i001
assert_eq "failing gate refused (exit 1)" "$MW_RC" "1"

# Per §3.3: A fail line MAY be recorded. Either way, NO pass line.
# So either 0 or 1 new event, but never with result:pass.
after_events=$(ledger_count)
new_events=$((after_events - before_events))
case "$new_events" in
  0|1) pass "audit append count is 0 or 1 (got $new_events)" ;;
  *)   fail "audit append count out of range: $new_events" ;;
esac

# If there is a new event, it MUST have result:fail (never result:pass).
if [ "$new_events" -ge 1 ]; then
  last_event=$(tail -n 1 "$TEST_REPO/.madewell/work/events.jsonl")
  case "$last_event" in
    *'"result":"fail"'*) pass "new event has result:fail" ;;
    *) fail "new event should have result:fail"; note "actual: $last_event" ;;
  esac
  case "$last_event" in
    *'"mode":"gate"'*) pass "new event has mode:gate" ;;
    *) fail "new event should have mode:gate" ;;
  esac
fi

# Position must not have advanced.
after_phase=$(mw here --json | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
assert_eq "position phase unchanged after failing gate" "$after_phase" "$before_phase"

# Now write a conformant plan and try again - should pass.
write_conformant_plan c001 i001
mw_capture advance plan i001
assert_eq "conformant plan gate passes" "$MW_RC" "0"
assert_eq "ledger advanced after conformant plan" "$(ledger_count)" "$((after_events + 1))"

# The conformant plan should have appended a result:pass, mode:gate line.
last_event=$(tail -n 1 "$TEST_REPO/.madewell/work/events.jsonl")
case "$last_event" in
  *'"result":"pass"'*'"mode":"gate"'*) pass "conformant gate appended result:pass, mode:gate" ;;
  *) fail "conformant gate should append result:pass, mode:gate"; note "actual: $last_event" ;;
esac

assert_chain_intact "hash chain intact after failing + passing gates"

report_case
