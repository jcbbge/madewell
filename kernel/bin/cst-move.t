#!/bin/sh
# Live proof that cst-move speaks SPEC.md, not a second board.
# Run from anywhere: sh .constellation/bin/cst-move.t
set -eu
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
repo=$(CDPATH= cd -- "$here/../.." && pwd)
bin="$here/cst-move"
[ -x "$bin" ] || {
  echo "compile first: clang -O2 -o $bin $here/cst-move.c" >&2
  exit 1
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
cd "$work"
git init -q
git config user.email t@t
git config user.name t
mkdir -p .constellation/stock .constellation/bench
touch .constellation/stock/.gitkeep .constellation/bench/.gitkeep
git add .constellation
git commit -q -m 'floor'
# empty first commit so later git mv has a HEAD

fail=0
ok() { printf 'ok  %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; fail=1; }

# 1. arrive
printf '# piece\nabout this cut\n' | "$bin" arrive alpha >/dev/null
[ -f .constellation/stock/alpha.md ] || bad 'arrive wrote stock/alpha.md'
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
} > .constellation/stock/alpha.md
"$bin" bench alpha >/dev/null
[ -f .constellation/bench/alpha.md ] || bad 'bench leaf'
[ ! -f .constellation/stock/alpha.md ] && ok 'stock emptied' || bad 'stock emptied'
git add -A .constellation && git commit -q -m 'alpha to the bench'   # one move per commit (SPEC.md §2)

# 4. second bench of gone stock → 4
set +e
"$bin" bench alpha >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 4 ] && ok 'ENOENT fence' || bad "fence rc=$rc"

# 5. finish: done work leaves the tree (git rm, staged)
"$bin" finish alpha >/dev/null
[ ! -e .constellation/finished ] && ok 'finish: no done shelf' || bad 'finish: no done shelf'
[ ! -f .constellation/bench/alpha.md ] && ok 'bench emptied' || bad 'bench emptied'
git diff --cached --name-status | grep -qx 'D	.constellation/bench/alpha.md' && ok 'finish stages the removal' || bad 'finish stages the removal'
git commit -q -m 'finish alpha'

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
[ -f .constellation/bench/nest/PIECE.md ] && ok 'break → PIECE.md' || bad 'break'
[ -f .constellation/bench/nest/stock/.gitkeep ] && ok 'inner stock/' || bad 'inner stock/'
[ ! -e .constellation/bench/nest/finished ] && ok 'no inner done shelf' || bad 'no inner done shelf'
git add -A .constellation && git commit -q -m 'nest breaks down'

# 7b. finish nested while inner stock has work → 5
printf 'leftover\n' > .constellation/bench/nest/stock/child.md
set +e
"$bin" finish nest >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'nested finish blocked' || bad "nested finish rc=$rc"
rm .constellation/bench/nest/stock/child.md
"$bin" finish nest >/dev/null
[ ! -e .constellation/bench/nest ] && ok 'nested finish after drain: all of it leaves' || bad 'nested finish after drain'

# 8. illegal slug
set +e
"$bin" arrive 'bad/slug' >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'slug fence' || bad "slug rc=$rc"

# 9. duplicate arrive (a landed slug is free again: done work is gone; one on the rack is not)
printf 'x\n' | "$bin" arrive beta >/dev/null
set +e
printf 'x\n' | "$bin" arrive beta >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 5 ] && ok 'duplicate arrive' || bad "dup rc=$rc"

if [ "$fail" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi
echo "all ok"
