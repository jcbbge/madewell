#!/bin/sh
# run.sh — Made Well conformance suite runner (SPEC §9).
# POSIX sh, no mocks, real fixtures.
#
# Usage:
#   sh conformance/run.sh              # run all cases
#   sh conformance/run.sh 01           # run only case 01
#   sh conformance/run.sh 01 03 05     # run specific cases
#
# Exit code: 0 if all run cases pass, 1 if any fail.

set -u

suite_dir=$(cd "$(dirname "$0")" && pwd)
cases_dir="$suite_dir/cases"

# Discover case scripts via a glob (avoids ls | grep).
all_cases=""
for f in "$cases_dir"/[0-9][0-9]-*.sh; do
  [ -e "$f" ] || continue
  all_cases="$all_cases $(basename "$f")"
done
# Drop the leading space.
all_cases=${all_cases# }

# Determine which cases to run.
if [ $# -gt 0 ]; then
  selected=""
  for arg in "$@"; do
    found=0
    for f in "$cases_dir"/[0-9][0-9]-*.sh; do
      [ -e "$f" ] || continue
      base=$(basename "$f")
      case "$base" in
        "${arg}-"*) selected="$selected $base"; found=1 ;;
      esac
    done
    if [ "$found" = "0" ]; then
      echo "no case matches '$arg'" >&2
      exit 2
    fi
  done
  cases_to_run=${selected# }
else
  cases_to_run=$all_cases
fi

echo "Made Well conformance suite (SPEC §9)"
echo "Cases: $(echo $cases_to_run | wc -w | tr -d ' ')"
echo

total_pass=0
total_fail=0
total_skip=0
failed_cases=""

# Cases deferred (not yet implemented - need additional mw commands).
# 06-abandon: needs `mw abandon <item-id>` - not in v1 kernel.
# 07-fsck-chain-break: needs `mw fsck` command.
# 08-fsck-projection-drift: needs `mw fsck` command.
deferred="06-abandon.sh 07-fsck-chain-break.sh 08-fsck-projection-drift.sh"

for case in $cases_to_run; do
  if echo " $deferred " | grep -q " $case "; then
    echo "CASE $case: SKIPPED (deferred - needs additional mw command)"
    total_skip=$((total_skip + 1))
    echo
    continue
  fi

  printf '=== %s ===\n' "$case"
  if sh "$cases_dir/$case"; then
    total_pass=$((total_pass + 1))
  else
    total_fail=$((total_fail + 1))
    failed_cases="$failed_cases $case"
  fi
  echo
done

echo "==================="
echo "Conformance summary"
echo "==================="
echo "  passed: $total_pass"
echo "  failed: $total_fail"
echo "  deferred: $total_skip (06, 07, 08 - need mw abandon / mw fsck)"

if [ "$total_fail" -gt 0 ]; then
  echo
  echo "FAILED CASES:$failed_cases"
  exit 1
fi

echo
echo "All run cases passed."
exit 0
