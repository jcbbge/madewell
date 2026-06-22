#!/bin/sh
# Made Well — Land walls (the file-decidable gauge).
#
# A WARNING gauge, never a halt. Reads the HEAD commit (the Land record)
# + madewell.json + the tax ledger and reports which walls fired. Exit is ALWAYS 0: the walls
# warn; turning them into a blocking fence (a pre-commit hook) is the quality organ's job
# (Rumen) — the pro upgrade behind this same contract.
#
# Run at Verify→Land, just after the landing commit. Dependencies: git + POSIX sh only.

set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "land-check: not a git repo — skipping"; exit 0; }
cd "$root" || exit 0

mw=".madewell"
tax="$mw/work/tax.jsonl"
msg=$(git log -1 --pretty=%B)
sha=$(git rev-parse --short HEAD)
changed=$(git show --name-only --pretty=format: HEAD | sed '/^$/d')

warn=0
fire() { printf '  ⚠ %s\n' "$1"; warn=$((warn + 1)); }

printf 'Land walls — HEAD %s\n' "$sha"

# W1 — record complete: the Land record carries all three net-new faces.
for face in LEARNED PROPAGATED TAX; do
  printf '%s\n' "$msg" | grep -q "^$face:" || fire "record incomplete — commit message missing '$face:' trailer"
done

# W2 — state advanced (or explicitly marked n/a / OWED): a unit that landed should move the queue.
if printf '%s\n' "$changed" | grep -q "^$mw/madewell.json$"; then :; else
  printf '%s\n' "$msg" | grep -Eq '^PROPAGATED:.*state:(n/a|OWED)' \
    || fire "madewell.json did not advance in this commit (and PROPAGATED state not marked n/a or OWED)"
fi

# W3 — docs moved when code did.
code=$(printf '%s\n' "$changed" | grep -E '\.(js|ts|tsx|jsx|py|go|rs|sh|sql|mjs|cjs)$' || true)
docs=$(printf '%s\n' "$changed" | grep -E '\.(md|mdx|txt)$|CHANGELOG' || true)
if [ -n "$code" ] && [ -z "$docs" ]; then
  printf '%s\n' "$msg" | grep -Eq '^PROPAGATED:.*docs:(n/a|OWED)' \
    || fire "code changed but no docs moved (and PROPAGATED docs not marked n/a or OWED)"
fi

# W4 — tax recorded: this landing added a line to the tax ledger.
if printf '%s\n' "$changed" | grep -q "^$tax$"; then
  git show HEAD -- "$tax" | grep -Eq '^\+\{' \
    || fire "tax ledger touched but no tax line added this commit"
else
  fire "no tax line added to $tax this commit"
fi

# W5 — discovery source promoted.
if printf '%s\n' "$msg" | grep -Eq 'STG-[0-9]'; then
  printf '%s\n' "$msg" | grep -q 'PROMOTED' \
    || fire "commit references a STG- source but does not mark it PROMOTED"
fi

if [ "$warn" -eq 0 ]; then
  printf '  \342\234\223 all walls clear — the outlet opened clean\n'
else
  printf '  %s wall(s) fired — the outlet did not fully open (gauge only; not a halt)\n' "$warn"
fi

exit 0
