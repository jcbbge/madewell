#!/bin/sh
# .madewell/bin/doors/land.sh — Land walls (W1–W5).
#
# Run by `mw advance land` (gate) or `mw check land` (gauge) per SPEC.md §6.
# Reads the HEAD commit + madewell.json + work/tax.jsonl and reports which walls fired.
# W1–W4 from SPEC.md §6.4; W5 from the legacy land-check.sh's existing logic
# (see SPEC.md Correction note for the W4-vs-W5 spec discrepancy).
#
# Contract (SPEC §6.1/§6.2):
#   argv:  $1 = repo-root  $2 = cycle-id  $3 = item-id (always empty for land)
#   env:   MW_LEDGER (events.jsonl path), MW_MODE (gate|gauge)
#   stdout: one line per wall:  <wall-id> <pass|fail> <message>
#   exit:   0 = all pass  1 = at least one fail  2 = N/A in this context
#
# Rule 1 (SPEC §1): this script only reads inside the repo.

set -u

repo_root=$1

cd "$repo_root" || { printf 'L0 fail cannot cd to %s\n' "$repo_root"; exit 1; }

mw_dir=.madewell
tax=$mw_dir/work/tax.jsonl
madewell_json=$mw_dir/madewell.json

fail_count=0
fire_pass() { printf '%s %s %s\n' "$1" "pass" "$2"; }
fire_fail() { printf '%s %s %s\n' "$1" "fail" "$2"; fail_count=$((fail_count + 1)); }

msg=$(git log -1 --pretty=%B 2>/dev/null) || msg=""
changed=$(git show --name-only --pretty=format: HEAD 2>/dev/null | sed '/^$/d')

# W1 — record complete: the Land record carries all three net-new faces.
for face in LEARNED PROPAGATED TAX; do
  if printf '%s\n' "$msg" | grep -q "^$face:"; then
    :
  else
    fire_fail W1 "commit message missing '$face:' trailer"
  fi
done
[ "$fail_count" -eq 0 ] && fire_pass W1 "LEARNED/PROPAGATED/TAX trailers present"

# W2 — state advanced (or explicitly marked n/a / OWED).
if printf '%s\n' "$changed" | grep -q "^$madewell_json$"; then
  fire_pass W2 "$madewell_json advanced in this commit"
else
  if printf '%s\n' "$msg" | grep -Eq '^PROPAGATED:.*state:(n/a|OWED)'; then
    fire_pass W2 "madewell.json not advanced; PROPAGATED state marked n/a or OWED"
  else
    fire_fail W2 "$madewell_json did not advance in this commit (and PROPAGATED state not marked n/a or OWED)"
  fi
fi

# W3 — docs moved when code did.
code=$(printf '%s\n' "$changed" | grep -E '\.(js|ts|tsx|jsx|py|go|rs|sh|sql|mjs|cjs)$' || true)
docs=$(printf '%s\n' "$changed" | grep -E '\.(md|mdx|txt)$|CHANGELOG' || true)
if [ -n "$code" ] && [ -z "$docs" ]; then
  if printf '%s\n' "$msg" | grep -Eq '^PROPAGATED:.*docs:(n/a|OWED)'; then
    fire_pass W3 "code changed but no docs moved; PROPAGATED docs marked n/a or OWED"
  else
    fire_fail W3 "code changed but no docs moved (and PROPAGATED docs not marked n/a or OWED)"
  fi
else
  fire_pass W3 "docs/code ratio acceptable for this commit"
fi

# W4 — tax recorded: this landing added a line to the tax ledger.
if printf '%s\n' "$changed" | grep -q "^$tax$"; then
  if git show HEAD -- "$tax" 2>/dev/null | grep -Eq '^\+\{'; then
    fire_pass W4 "tax line added to $tax this commit"
  else
    fire_fail W4 "tax ledger touched but no tax line added this commit"
  fi
else
  fire_fail W4 "no tax line added to $tax this commit"
fi

# W5 — discovery source promoted (port from legacy land-check.sh lines 54-58).
# SPEC.md §6.4 names only W1–W4 for land; the shipped reference has always had W5
# (the legacy script's lines 54-58). Logged in SPEC.md Correction; behavior kept.
if printf '%s\n' "$msg" | grep -Eq 'STG-[0-9]'; then
  if printf '%s\n' "$msg" | grep -q 'PROMOTED'; then
    fire_pass W5 "commit references a STG- source and marks it PROMOTED"
  else
    fire_fail W5 "commit references a STG- source but does not mark it PROMOTED"
  fi
else
  fire_pass W5 "no STG- source referenced (W5 not applicable)"
fi

if [ "$fail_count" -eq 0 ]; then
  exit 0
else
  exit 1
fi
