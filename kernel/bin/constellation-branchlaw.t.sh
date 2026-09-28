#!/usr/bin/env bash
# constellation-branchlaw.t.sh — a project whose own hooks refuse direct commits on main (Arc's
# branch law) still gets constellation's bookkeeping: the commit goes in through a short chore/
# branch merged straight back, and nothing is left behind. Scratch project, isolated tmux.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-branchlaw-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers CONSTELLATION_AUTO=0
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_HARNESS
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }

P=$T/proj; git init -q -b main "$P"; echo x >"$P/README"; git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1; git -C "$P" add -A; MW_GATE=off git -C "$P" -c core.hooksPath=/dev/null commit -qm adopt
# the project's own law: no commit typed into main (a merge commit does not run pre-commit)
hook=$P/.git/hooks/pre-commit
{ head -1 "$hook"; printf '[ "$(git branch --show-current)" = main ] && { echo "branch law: no direct commit on main" >&2; exit 1; }\n'; tail -n +2 "$hook"; } >"$T/h" && cat "$T/h" >"$hook"
cd "$P"
check "the project refuses a direct commit on main" sh -c "! git commit -q --allow-empty -m direct"

printf '# Greet\n\n**Making:** a greeting\n**Not making:** more\n**Done when:** it exists\n**Waits on:** nothing\n' >.madewell/stock/greet.md
git add .madewell/stock/greet.md; git switch -q -c chore/rack; git commit -qm "rack: greet"; git switch -q main; git merge -q --no-ff chore/rack -m "merge: rack"; git branch -q -d chore/rack
"$C" take greet >"$T/take.out" 2>&1; rc=$?
check "take succeeds under the branch law" test $rc -eq 0
check "the piece is on the bench on main" sh -c "git ls-tree -r --name-only main | grep -qx .madewell/bench/greet.md"
check "it arrived as a merge, not a commit typed into main" sh -c "git log -1 --format=%s main | grep -qx 'merge: take greet to the bench'"
check "the short branch is gone" sh -c "! git branch --list 'chore/constellation-*' | grep -q ."
check "main is checked out again, clean" sh -c "test \"\$(git branch --show-current)\" = main && git diff --cached --quiet"

# the gate still judges the move itself on the short branch: an illegal move is refused there too
git show main:.madewell/bench/greet.md >.madewell/finished/greet.md; git add .madewell/finished/greet.md
check "a move the gate refuses is refused on the short branch as well" sh -c "! bash -c '. \"$ROOT/kernel/lib/constellation/core.sh\"; R=$P; main_commit \"sneak\" \"ACT: plan\"'"
check "and main is left as it was" sh -c "test \"\$(git branch --show-current)\" = main && ! git ls-tree -r --name-only main | grep -qx .madewell/finished/greet.md"
git reset -q; rm -f .madewell/finished/greet.md

[ $fails -eq 0 ] && echo "constellation-branchlaw: all tests passed" || { echo "constellation-branchlaw: $fails failure(s)"; exit 1; }
