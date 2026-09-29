#!/usr/bin/env bash
# constellation-hooks.t.sh — a project's own worktree setup and teardown: take runs .constellation/setup
# in a new piece's worktree, land runs .constellation/teardown before the worktree goes; a failing setup
# is said plainly; the gitignore lets both into git. Scratch project, isolated tmux.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-hooks-test.XXXXXX")
sock=$T/tmux.sock   # the scratch server: the operator's tmux.conf ignored, and gone on every exit, a killed run too
scratch_down() { # scratch_down <status> : kill the server, then whatever it started, then the scratch dir
  trap - EXIT INT TERM
  local left; left=$(scratch_tree "$(tmux -S "$sock" display -p '#{pid}' 2>/dev/null)")
  tmux -S "$sock" kill-server 2>/dev/null; [ -z "$left" ] || kill $left 2>/dev/null
  rm -rf "$T"; exit "$1"
}
scratch_tree() { local p c; for p in $1; do for c in $(pgrep -P "$p"); do printf '%s ' "$c"; scratch_tree "$c"; done; done; }
trap 'scratch_down $?' EXIT; trap 'scratch_down 130' INT; trap 'scratch_down 143' TERM
tmux -S "$sock" -f /dev/null new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_HOOKS=1 CONSTELLATION_TMUX_SESSION=workers CONSTELLATION_AUTO=0
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_HARNESS
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }

P=$T/proj; git init -q -b main "$P"; echo x >"$P/README"; git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1; cd "$P"
printf '#!/bin/sh\necho "set up $1 from $2" >"$1/.setup-ran"\n' >.constellation/setup
printf '#!/bin/sh\necho "torn down $1" >>"%s/teardown.log"\n' "$T" >.constellation/teardown
chmod +x .constellation/setup .constellation/teardown
check "the gitignore lets the project's setup and teardown into git" sh -c "git add .constellation/setup .constellation/teardown && git ls-files --error-unmatch .constellation/setup .constellation/teardown"
git add -A; CONSTELLATION_GATE=off git -c core.hooksPath=/dev/null commit -qm adopt
printf '# Greet\n\n**Making:** a greeting\n**Not making:** more\n**Done when:** it exists\n**Waits on:** nothing\n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet"
"$C" take greet >/dev/null 2>&1
WT=$T/state/proj/greet
check "take runs the project's setup in the new worktree" grep -qx "set up $WT from $P" "$WT/.setup-ran"
printf '#!/bin/sh\necho "no database for you" >&2; exit 1\n' >.constellation/setup
git add .constellation/setup; git commit -qm "setup breaks"
printf '# Wave\n\n**Making:** a wave\n**Not making:** more\n**Done when:** it exists\n**Waits on:** nothing\n' >.constellation/stock/wave.md
git add .constellation/stock/wave.md; git commit -qm "rack: wave"
out=$("$C" take wave 2>&1); rc=$?
check "a failing setup is refused out loud" test $rc -ne 0
check "and says what failed" grep -q 'no database for you' <<<"$out"
check "and names the step to rerun" grep -q "own setup for its worktree failed" <<<"$out"
# land runs the same hook as teardown, before the worktree is removed
check "teardown runs in the piece's worktree with the main checkout" bash -c ". '$ROOT/kernel/lib/constellation/take.sh'; R='$P'; CST=.constellation; project_hook teardown greet '$WT' && grep -qx 'torn down $WT' '$T/teardown.log'"
check "land calls the teardown hook" grep -q 'project_hook teardown' "$ROOT/kernel/lib/constellation/land.sh"

[ $fails -eq 0 ] && echo "constellation-hooks: all tests passed" || { echo "constellation-hooks: $fails failure(s)"; exit 1; }
