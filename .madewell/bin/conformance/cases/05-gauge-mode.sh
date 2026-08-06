#!/bin/sh
# Case 05: gauge mode never moves position.
# Per SPEC §9.5: `mw check <door>` runs the door script in gauge mode and
# never appends to the ledger; the position is unchanged.

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="05-gauge-mode"
set_up_repo
trap tear_down_repo EXIT

# Set up to a state where plan/land can be gauged: commit, ground, plan artifact.
mw advance commit >/dev/null
mw advance ground >/dev/null
write_conformant_plan c001 i001

before_events=$(ledger_count)
before_head=$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')
before_position=$(cat "$TEST_REPO/.madewell/madewell.json")

# Gauge a conformant plan.
mw_capture check plan i001
assert_eq "check plan i001 exit 0 (conformant)" "$MW_RC" "0"
assert_contains "check plan i001 stdout mentions P1" "$MW_OUT" "P1 pass"
assert_contains "check plan i001 stdout mentions P5" "$MW_OUT" "P5 pass"

# Ledger must be unchanged.
assert_eq "ledger unchanged after gauge" "$(ledger_count)" "$before_events"

# Position must be unchanged.
after_head=$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')
assert_eq "head unchanged after gauge" "$after_head" "$before_head"
after_position=$(cat "$TEST_REPO/.madewell/madewell.json")
assert_eq "madewell.json unchanged after gauge" "$after_position" "$before_position"

# Gauge a declarative door: ground has no script, so it should pass.
mw_capture check ground
assert_eq "check ground (declarative) exit 0" "$MW_RC" "0"
assert_eq "ledger unchanged after gauge ground" "$(ledger_count)" "$before_events"

# Now run a failing gauge on a broken plan. Overwrite the artifact to be broken.
cat > "$TEST_REPO/.madewell/specs/c001/i001.md" <<'EOF'
# Plan: i001 (now broken)
## Framework
framework: POSIX sh
EOF

mw_capture check plan i001
assert_eq "check plan i001 exit 1 (broken)" "$MW_RC" "1"
assert_contains "check plan i001 stdout mentions P2 fail" "$MW_OUT" "P2 fail"
assert_eq "ledger unchanged after failing gauge" "$(ledger_count)" "$before_events"
after_head=$(mw here --json | sed -n 's/.*"head":"\([^"]*\)".*/\1/p')
assert_eq "head unchanged after failing gauge" "$after_head" "$before_head"

report_case
