#!/bin/sh
# Live proof that mw-move speaks SPEC.md, not a second board.
# Run from anywhere: sh .madewell/bin/mw-move.t
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
repo=$(CDPATH= cd -- "$here/../.." && pwd)
bin="$here/mw-move"
[ -x "$bin" ] || {
  echo "compile first: clang -O2 -o $bin $here/mw-move.c" >&2
  exit 1
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
cd "$work"
git init -q
git config user.email t@t
git config user.name t
mkdir -p .madewell/stock .madewell/bench .madewell/finished
touch .madewell/stock/.gitkeep .madewell/bench/.gitkeep .madewell/finished/.gitkeep
git add .madewell
git commit -q -m 'floor'
# empty first commit so later git mv has a HEAD

fail=0
ok() { printf 'ok  %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; fail=1; }

# 1. arrive
printf '# piece\nabout this cut\n' | "$bin" arrive alpha >/dev/null
[ -f .madewell/stock/alpha.md ] || bad 'arrive wrote stock/alpha.md'
git diff --cached --name-only | grep -q 'stock/alpha.md' && ok 'arrive stages' || bad 'arrive stages'

# 2. bench without floor → 5
set +e
"$bin" bench alpha >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'bench refuses no-floor' || bad "bench no-floor rc=$rc"

# 3. add floor, bench leaf
{
  printf '%s\n' '# piece' 'about this cut' \
    '**Making:** x' '**Not making:** y' '**Done when:** z' '**Waits on:** —'
} > .madewell/stock/alpha.md
"$bin" bench alpha >/dev/null
[ -f .madewell/bench/alpha.md ] || bad 'bench leaf'
[ ! -f .madewell/stock/alpha.md ] && ok 'stock emptied' || bad 'stock emptied'

# 4. second bench of gone stock → 4
set +e
"$bin" bench alpha >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 4 ] && ok 'ENOENT fence' || bad "fence rc=$rc"

# 5. finish
"$bin" finish alpha >/dev/null
[ -f .madewell/finished/alpha.md ] && ok 'finish' || bad 'finish'
[ ! -f .madewell/bench/alpha.md ] && ok 'bench emptied' || bad 'bench emptied'

# 6. no rewind: finish again → 4
set +e
"$bin" finish alpha >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 4 ] && ok 'no rewind' || bad "rewind rc=$rc"

# 7. --break
printf '%s\n' '# nest' '**Making:** a' '**Not making:** b' '**Done when:** c' '**Waits on:** —' \
  | "$bin" arrive nest >/dev/null
"$bin" bench nest --break >/dev/null
[ -f .madewell/bench/nest/PIECE.md ] && ok 'break → PIECE.md' || bad 'break'
[ -f .madewell/bench/nest/stock/.gitkeep ] && ok 'inner stock/' || bad 'inner stock/'

# 7b. finish nested while inner stock has work → 5
printf 'leftover\n' > .madewell/bench/nest/stock/child.md
set +e
"$bin" finish nest >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'nested finish blocked' || bad "nested finish rc=$rc"
rm .madewell/bench/nest/stock/child.md
"$bin" finish nest >/dev/null
[ -f .madewell/finished/nest.md ] && ok 'nested finish after drain' || bad 'nested finish after drain'

# 8. illegal slug
set +e
"$bin" arrive 'bad/slug' >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'slug fence' || bad "slug rc=$rc"

# 9. duplicate arrive
set +e
printf 'x\n' | "$bin" arrive nest >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'duplicate arrive' || bad "dup rc=$rc"

if [ "$fail" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi
echo "all ok"
