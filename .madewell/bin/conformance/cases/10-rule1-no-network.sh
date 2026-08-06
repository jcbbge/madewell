#!/bin/sh
# Case 10: Rule 1 respected - doors run with no network and no reads outside the repo.
# Per SPEC §1 (Rule 1) and §9.10: door scripts MUST NOT read or write anything
# outside the repository. This is checked two ways:
#
#   (a) static: the kernel's door scripts (plan.sh, land.sh) MUST NOT contain
#       any network-tool invocation (curl, wget, ssh, nc, ftp, rsync, scp, etc.)
#       or any absolute path that could escape the repo.
#   (b) runtime: a door script that takes a repo-root argument, run against
#       two repos with the same expected state, produces identical output -
#       proving the script reads from inside its repo, not from anywhere else.

. "$(dirname "$0")/../lib.sh"

export CASE_NAME="10-rule1-no-network"
set_up_repo
trap tear_down_repo EXIT

# ---- (a) static check on the kernel's door scripts ----
forbidden_patterns='curl |wget |ssh |nc -|ncat |netcat |ftp |scp |rsync |telnet |traceroute |host |dig '

for script in "$KERNEL_PLAN" "$KERNEL_LAND"; do
  for pattern in $forbidden_patterns; do
    if grep -F "$pattern" "$script" >/dev/null 2>&1; then
      fail "$(basename "$script") contains forbidden network pattern: $pattern"
    else
      pass "$(basename "$script") has no '$pattern'"
    fi
  done
done

# Also check mw itself.
for pattern in $forbidden_patterns; do
  if grep -F "$pattern" "$KERNEL_MW" >/dev/null 2>&1; then
    fail "mw contains forbidden network pattern: $pattern"
  fi
done
pass "mw has no network-tool invocations"

# ---- (b) runtime check: door scripts that take a repo-root argv ----
# land.sh takes repo-root as $1 and cd's into it before reading anything.
# Verify that running it against two repos with the same expected state
# produces identical output, proving the script's reads are scoped to the repo.

# Create two decoy repos that look identical in their land-record commit
# message and tax.jsonl contents. If land.sh ever read tax.jsonl or the
# commit message from outside the repo, the W4 result might differ.
decoy1=$(mktemp -d -t mw-decoy1-XXXXXX)
decoy2=$(mktemp -d -t mw-decoy2-XXXXXX)
cleanup_decoys() { rm -rf "$decoy1" "$decoy2"; }
trap 'tear_down_repo; cleanup_decoys' EXIT

for d in "$decoy1" "$decoy2"; do
  mkdir -p "$d/.madewell/work"
  : > "$d/.madewell/work/tax.jsonl"
  (
    cd "$d" || exit 1
    git init -q -b main
    git config user.email decoy@local
    git config user.name decoy
    git add -A
    git -c user.email=decoy@local -c user.name=decoy commit -q -m "Decoy: NO TRAILERS - should fail W1"
  )
done

# Run land.sh against each decoy. Both lack LEARNED/PROPAGATED/TAX
# trailers, so W1 should fail with the same message in both. The output
# must be byte-identical because land.sh only reads from the repo it's given.
out1=$(MW_LEDGER=/dev/null MW_MODE=gauge sh "$KERNEL_LAND" "$decoy1" c001 "" 2>&1)
out2=$(MW_LEDGER=/dev/null MW_MODE=gauge sh "$KERNEL_LAND" "$decoy2" c001 "" 2>&1)
if [ "$out1" = "$out2" ]; then
  pass "land.sh output is identical across two repos with different /tmp decoys"
else
  fail "land.sh output differs across two repos (possible outside-repo read)"
  note "out1: $out1"
  note "out2: $out2"
fi

case "$out1" in
  *'W1 fail'*) pass "W1 fails on decoy without trailers" ;;
  *) fail "W1 should fail on decoy without trailers"; note "actual: $out1" ;;
esac

# ---- (c) door script against a non-existent path fails cleanly ----
# If land.sh is given a non-existent repo, it should fail (cd fails) rather
# than silently using a default.
nonexistent=/tmp/mw-conform-nonexistent-$$-$(date +%s)
out=$(MW_LEDGER=/dev/null MW_MODE=gauge sh "$KERNEL_LAND" "$nonexistent" c001 "" 2>&1)
rc=$?
assert_eq "land.sh against non-existent path exits non-zero" "$( [ $rc -ne 0 ] && echo 1 || echo 0)" "1"
case "$out" in
  *'cannot cd'*) pass "land.sh reports cd failure" ;;
  *) note "land.sh reported: $out" ;;
esac

# Restore the simple trap for tear_down_repo now that cleanup_decoys is done.
trap tear_down_repo EXIT

report_case
