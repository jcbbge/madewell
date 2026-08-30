#!/bin/sh
# Wire Made Well stops into this clone's git hooks. Idempotent.
# Does not clobber an unrelated hook — prepends a marked block if one is missing.
#
#   sh kernel/bin/mw-hooks.sh          # in the Made Well package repo
#   sh .madewell/bin/mw-hooks.sh       # in a project that installed it
#
# pre-commit  → mw-gate.sh then mw-jigs.sh
# post-commit → mw-record.sh (the accepted side of proposed − accepted)
#
# The block it writes resolves its own bin directory at commit time, so the same
# hook works in the package repo (kernel/bin) and in an install (.madewell/bin).
set -eu

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "mw-hooks: not a git repo" >&2; exit 1; }
cd "$root"
hooks=$(git rev-parse --git-path hooks)
mkdir -p "$hooks"

BEGIN='# MADE WELL — begin'
END='# MADE WELL — end'
RESOLVE='MW_BIN=.madewell/bin; [ -d kernel/bin ] && MW_BIN=kernel/bin'

block_pre() {
  printf '%s\n%s\nsh "$MW_BIN/mw-gate.sh" || exit $?\nsh "$MW_BIN/mw-jigs.sh" || exit $?\n%s\n' \
    "$BEGIN" "$RESOLVE" "$END"
}
block_post() {
  printf '%s\n%s\nsh "$MW_BIN/mw-record.sh" || true\n%s\n' "$BEGIN" "$RESOLVE" "$END"
}

wire() {
  hook=$hooks/$1
  which=$2
  if [ -f "$hook" ] && grep -q "$BEGIN" "$hook"; then
    # replace an existing block in place — upgrades older wirings
    tmp=$(mktemp)
    awk -v b="$BEGIN" -v e="$END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' "$hook" > "$tmp"
    { printf '#!/bin/sh\n'; "$which"; awk 'NR==1 && /^#!/ {next} {print}' "$tmp"; } > "$hook"
    rm -f "$tmp"
  elif [ -f "$hook" ]; then
    tmp=$(mktemp)
    { printf '#!/bin/sh\n'; "$which"; awk 'NR==1 && /^#!/ {next} {print}' "$hook"; } > "$tmp"
    mv "$tmp" "$hook"
  else
    { printf '#!/bin/sh\n'; "$which"; } > "$hook"
  fi
  chmod +x "$hook"
}

wire pre-commit  block_pre
wire post-commit block_post
echo "Made Well hooks: $hooks/pre-commit (gate + jigs), $hooks/post-commit (record)"
