#!/usr/bin/env bash
# constellation-lock.t.sh — parallel agents never collide in a project's main checkout: every write
# constellation makes there holds one lock per repository ($(git rev-parse --git-common-dir)/constellation.lock),
# and a second writer waits its turn instead of failing. Two takes at once, then two lands at once
# (each piece with its own code, so the second must rebase onto the first), both succeed with a clean,
# linear history; a writer that finds the lock held waits for it; nothing the lock guards is left locked
# by a child. The commit hook is slowed down so that, without the lock, the writers would overlap.
# Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-lock-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers CONSTELLATION_AUTO=0
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_HARNESS
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'x' >"$P/README"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm "adopt Constellation"
cd "$P"
hook=$(git rev-parse --path-format=absolute --git-path hooks)/pre-commit
printf 'sleep 1\n' >>"$hook"   # a slow commit gate: two writers at once would overlap on the index
for s in alpha beta; do
  printf '# %s\n\n**Making:** %s\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' "$s" "$s" >".constellation/stock/$s.md"
done
git add .constellation/stock; git commit -qm "rack: alpha, beta" -m "ACT: ideate
DONE: two pieces on the rack
NEXT: —"

# --- two takes at once
"$C" take alpha >"$T/ta.out" 2>&1 & a=$!
"$C" take beta >"$T/tb.out" 2>&1 & b=$!
wait $a; ra=$?; wait $b; rb=$?
sed 's/^/     | /' "$T/ta.out" "$T/tb.out"
check "two takes at once: both succeed" test "$ra:$rb" = 0:0
check "two takes at once: both pieces are on the bench, with their branches" sh -c "test -f .constellation/bench/alpha.md && test -f .constellation/bench/beta.md && git rev-parse -q --verify piece/alpha && git rev-parse -q --verify piece/beta"
check "two takes at once: the main checkout is clean" test -z "$(git status --porcelain --untracked-files=no)"
check "two takes at once: one commit each, each moving only its own piece" sh -c "
  test \"\$(git show --no-renames --name-status --format= HEAD~1 HEAD | sort | tr '\n' '|')\" = 'A	.constellation/bench/alpha.md|A	.constellation/bench/beta.md|D	.constellation/stock/alpha.md|D	.constellation/stock/beta.md|' &&
  test \"\$(git show --no-renames --name-status --format= HEAD | wc -l)\" = 2"
check "the lock lives in the repository's git directory" test -f "$(git rev-parse --path-format=absolute --git-common-dir)/constellation.lock"

# --- each piece is made in its own worktree, and passes its check
rec() { git -C "$T/state/proj/$1" -c core.hooksPath=/dev/null commit -q --allow-empty -m "run($1): aldebaran done

ACT: verify
STAR: aldebaran
STEP: aldebaran
EVENT: done
HARNESS: claude
DONE: the checks pass
NEXT: -"; }
for s in alpha beta; do
  W=$T/state/proj/$s; mkdir -p "$W/src"; echo "export const $s = 1" >"$W/src/$s.js"
  git -C "$W" add src; git -C "$W" -c core.hooksPath=/dev/null commit -qm "add $s"; rec "$s"
done

# --- two lands at once: the second waits, then rebases onto the first
"$C" land alpha >"$T/la.out" 2>&1 & a=$!
"$C" land beta >"$T/lb.out" 2>&1 & b=$!
wait $a; ra=$?; wait $b; rb=$?
grep -h '^landed ' "$T/la.out" "$T/lb.out" | sed 's/^/     | /'
check "two lands at once: both succeed" test "$ra:$rb" = 0:0
check "two lands at once: both pieces' work is on main" sh -c "test -f src/alpha.js && test -f src/beta.js"
check "two lands at once: both pieces are done and gone from the bench" sh -c "test ! -e .constellation/bench/alpha.md && test ! -e .constellation/bench/beta.md && git log --format=%s | grep -qx 'finish alpha' && git log --format=%s | grep -qx 'finish beta'"
check "two lands at once: the history is linear (no merges) and the checkout clean" sh -c "test -z \"\$(git rev-list --merges HEAD)\" && test -z \"\$(git status --porcelain --untracked-files=no)\""
check "two lands at once: each finish commit removes only its own piece" sh -c "
  for s in alpha beta; do h=\$(git log -1 --format=%H --grep=\"^finish \$s\\\$\"); test \"\$(git show --no-renames --name-status --format= \$h)\" = \"D	.constellation/bench/\$s.md\" || exit 1; done"
check "two lands at once: the worktrees and branches are gone" sh -c "! git rev-parse -q --verify piece/alpha && ! git rev-parse -q --verify piece/beta && test ! -d '$T/state/proj/alpha' && test ! -d '$T/state/proj/beta'"
check "two lands at once: both receipts read back" sh -c "'$C' receipt alpha | grep -qx '## Receipt' && '$C' receipt beta | grep -qx '## Receipt'"

# --- two sessions filing the same idea at once: one files it, the other finds it gone; nothing collides
mkdir -p ideas; echo 'a thought' >ideas/call.txt; echo 'another' >ideas/memo.txt
git add ideas; git commit -qm "ideas: two notes" -m "ACT: ideate
DONE: notes
NEXT: —"
"$C" inbox --read ideas/call.txt >"$T/i1.out" 2>&1 & a=$!
"$C" inbox --read ideas/call.txt >"$T/i2.out" 2>&1 & b=$!
"$C" inbox --read ideas/memo.txt >"$T/i3.out" 2>&1 & c=$!
wait $a; r1=$?; wait $b; r2=$?; wait $c; r3=$?
check "filings at once: the same note is filed once, a different one beside it" sh -c "test \"\$(printf '%s\n' $r1 $r2 | sort | tr '\n' ' ')\" = '0 2 ' && test $r3 = 0 && test -f ideas/read/call.txt && test -f ideas/read/memo.txt && test ! -e ideas/read/call.2.txt"
check "filings at once: one commit per note, and a clean checkout" sh -c "test \$(git log --format=%s | grep -c '^chore(ideas): read ') = 2 && test -z \"\$(git status --porcelain --untracked-files=no)\""

# --- a writer that finds the lock held waits for it, and then goes on
printf '# gamma\n\n**Making:** g\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' >.constellation/stock/gamma.md
git add .constellation/stock/gamma.md; git commit -qm "rack: gamma" -m "ACT: ideate
DONE: gamma
NEXT: —"
lock=$(git rev-parse --path-format=absolute --git-common-dir)/constellation.lock
flock "$lock" sleep 3 & holder=$!; sleep 0.5
t0=$(date +%s); "$C" take gamma >/dev/null 2>&1; rc=$?; t1=$(date +%s); wait $holder
check "a held lock: take waits for it (not fails), then succeeds" sh -c "test $rc = 0 && test $((t1 - t0)) -ge 2 && test -f .constellation/bench/gamma.md"
check "nothing is left holding the lock after take" flock -n "$lock" true

# --- what runs under the lock and calls the driver again (a commit hook) goes through: its caller holds it
printf '# eps\n\n**Making:** e\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' >.constellation/stock/eps.md
git add .constellation/stock/eps.md; git commit -qm "rack: eps" -m "ACT: ideate
DONE: eps
NEXT: —"
flock "$lock" sleep 6 & holder=$!; sleep 0.5
t0=$(date +%s); CONSTELLATION_LOCK_HELD=$lock "$C" take eps >/dev/null 2>&1; rc=$?; t1=$(date +%s); wait $holder
check "under its caller's lock: take goes straight through, no wait" sh -c "test $rc = 0 && test $((t1 - t0)) -lt 4 && test -f .constellation/bench/eps.md"

# --- the project's own setup runs outside the lock: a setup that leaves something running holds nothing
printf '#!/bin/sh\n(sleep 30 >/dev/null 2>&1 &) ; exit 0\n' >.constellation/setup; chmod +x .constellation/setup
git add .constellation/setup; git commit -qm "our setup" -m "ACT: plan
DONE: setup
NEXT: —"
printf '# delta\n\n**Making:** d\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' >.constellation/stock/delta.md
git add .constellation/stock/delta.md; git commit -qm "rack: delta" -m "ACT: ideate
DONE: delta
NEXT: —"
CONSTELLATION_HOOKS=1 "$C" take delta >/dev/null 2>&1
check "a setup that leaves a process running does not keep the checkout locked" flock -n -w 1 "$lock" true

[ $fails -eq 0 ] && echo "constellation-lock: all tests passed" || { echo "constellation-lock: $fails failure(s)"; exit 1; }
