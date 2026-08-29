#!/bin/sh
# Append one correction line for HEAD. Post-commit. Never blocks. Never fails the commit.
# Schema: .madewell/jig/CORRECTIONS.md
#
# This is not piece-position (SPEC.md forbids a status ledger). This is
# proposed − accepted, so shop-made jigs have a substrate. Git log is the
# commit; this file is the differential the lab proved you cannot recover
# from git log alone (`proposed` is not in git).

set -e
repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
jig="$repo_root/.madewell/jig"
[ -d "$jig" ] || exit 0
ledger="$jig/corrections.jsonl"
sha=$(git rev-parse HEAD 2>/dev/null) || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
stats=$(git show --numstat --format='' HEAD 2>/dev/null)
files=$(printf '%s\n' "$stats" | grep -c .)
ins=$(printf '%s\n' "$stats" | awk '{ if ($1 ~ /^[0-9]+$/) s+=$1 } END { print s+0 }')
del=$(printf '%s\n' "$stats" | awk '{ if ($2 ~ /^[0-9]+$/) s+=$2 } END { print s+0 }')
subject=$(git log -1 --format='%s' HEAD 2>/dev/null | sed 's/\\/\\\\/g; s/"/\\"/g')
proposed='null'
if [ -f "$jig/proposed.json" ]; then
  if proposed=$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))' "$jig/proposed.json"); then
    rm -f "$jig/proposed.json"
  else
    printf 'mw-record: proposed.json is not JSON; recording proposed:null and leaving the file\n' >&2
    proposed='null'
  fi
fi
printf '{"ts":"%s","sha":"%s","branch":"%s","files":%s,"insertions":%s,"deletions":%s,"subject":"%s","proposed":%s}\n' \
  "$ts" "$sha" "$branch" "${files:-0}" "${ins:-0}" "${del:-0}" "$subject" "$proposed" >> "$ledger"
exit 0
