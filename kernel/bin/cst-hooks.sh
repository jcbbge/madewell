#!/bin/sh
# Wire Constellation stops into this clone's git hooks. Idempotent.
# Does not clobber an unrelated hook — prepends a marked block if one is missing.
#
#   sh kernel/bin/cst-hooks.sh          # in the Constellation package repo
#   sh .constellation/bin/cst-hooks.sh       # in a project that installed it
#
# pre-commit  → cst-gate.sh then cst-jigs.sh
# post-commit → cst-record.sh (the accepted side of proposed − accepted)
#
# The block it writes resolves its own bin directory at commit time, so the same
# hook works in the package repo (kernel/bin) and in an install (.constellation/bin).
set -eu

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "cst-hooks: not a git repo" >&2; exit 1; }
cd "$root"
hooks=$(git rev-parse --git-path hooks)
mkdir -p "$hooks"

BEGIN='# CONSTELLATION — begin'
END='# CONSTELLATION — end'
RESOLVE='CONSTELLATION_BIN=.constellation/bin; [ -d kernel/bin ] && CONSTELLATION_BIN=kernel/bin'

block_pre() {
  printf '%s\n%s\nsh "$CONSTELLATION_BIN/cst-gate.sh" || exit $?\nsh "$CONSTELLATION_BIN/cst-jigs.sh" || exit $?\n%s\n' \
    "$BEGIN" "$RESOLVE" "$END"
}
block_post() {
  printf '%s\n%s\nsh "$CONSTELLATION_BIN/cst-record.sh" || true\n%s\n' "$BEGIN" "$RESOLVE" "$END"
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
echo "Constellation hooks: $hooks/pre-commit (gate + jigs), $hooks/post-commit (record)"
