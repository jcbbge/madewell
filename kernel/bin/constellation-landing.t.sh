#!/usr/bin/env bash
# constellation-landing.t.sh — constellation never touches a project main checkout's index or anyone's staged work.
# Every bookkeeping write (take, finish, inbox filing, trade) lands like code: built away from the checkout's index,
# then a compare-and-swap fast-forward under the repository's lock. What another agent staged or changed in the main
# checkout stays exactly as it was and out of every commit; the landed paths leave nothing in its status; a refused
# landing puts the checkout back; two writes racing both land. Run records carry nothing staged in a piece's
# worktree, and a piece's steps never share a live worktree. Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-landing-test.XXXXXX")
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
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers CONSTELLATION_AUTO=0
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_HARNESS GIT_INDEX_FILE
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'x' >"$P/README"; echo 'mine' >"$P/src/mine.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm "adopt Constellation"
cd "$P"
hook=$(git rev-parse --path-format=absolute --git-path hooks)/pre-commit
# The commit hook, for the tests below: REFUSE=<flag> refuses once; RACE=<flag> moves main once, as another writer
# landing meanwhile would (its own commit, made away from any index, with no lock).
cat >>"$hook" <<'EOF'
if [ -n "${REFUSE:-}" ] && [ ! -e "$REFUSE" ]; then : >"$REFUSE"; echo "refused, once" >&2; exit 1; fi
if [ -n "${RACE:-}" ] && [ ! -e "$RACE" ]; then
  : >"$RACE"; i=$RACE.index; tip=$(git rev-parse refs/heads/main)
  GIT_INDEX_FILE=$i git read-tree "$tip"
  GIT_INDEX_FILE=$i git update-index --add --cacheinfo "100644,$(echo racer | git hash-object -w --stdin),racer.txt"
  c=$(git commit-tree "$(GIT_INDEX_FILE=$i git write-tree)" -p "$tip" -m "the racer")
  git update-ref refs/heads/main "$c" "$tip"
  env -u GIT_INDEX_FILE git update-index --add --cacheinfo "100644,$(echo racer | git hash-object -w --stdin),racer.txt" && echo racer >racer.txt
fi
EOF
floor() { printf '# %s\n\n**Making:** %s\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' "$1" "$1"; }
rack() { local s f=(); for s in "$@"; do floor "$s" >".constellation/stock/$s.md"; f+=(".constellation/stock/$s.md"); done
  git add -- "${f[@]}" && git commit -qm "rack: $*" -m "ACT: ideate
DONE: on the rack
NEXT: —" -- "${f[@]}"; }
foreign() { # someone else's work in the main checkout: a staged new file, a staged change, an unstaged change
  echo 'theirs' >src/theirs.js; git add src/theirs.js
  echo 'staged edit' >>README; git add README
  echo 'unstaged edit' >>src/mine.js
}
foreign_kept() { # it is all still there, exactly as it was
  test "$(git diff --cached --name-status | tr '\t\n' ' |')" = "M README|A src/theirs.js|" &&
    test "$(git diff --name-only)" = src/mine.js && tail -1 src/mine.js | grep -qx 'unstaged edit' &&
    git show :README | tail -1 | grep -qx 'staged edit'
}
foreign_out() { # none of it in the commit: foreign_out <commit>
  ! git show --no-renames --name-only --format= "$1" | grep -qE '^(README|src/theirs.js|src/mine.js)$'
}
paths_of() { git show --no-renames --name-status --format= "$1" | sort | tr '\t\n' ' |'; }
quiet() { test -z "$(git status --porcelain --untracked-files=all -- "$@")"; }   # the checkout shows nothing for these paths
export -f foreign_kept foreign_out paths_of quiet

# --- take: the move lands; the foreign work stays staged, and out of it
rack alpha beta; foreign
check "take lands with someone else's work in the checkout" "$C" take alpha --not-making 'nothing more'
check "take: its commit is only the move" test "$(paths_of HEAD)" = "A .constellation/bench/alpha.md|D .constellation/stock/alpha.md|"
check "take: the answers it was given are in the landed piece" bash -c "git show HEAD:.constellation/bench/alpha.md | grep -qx '\*\*Not making:\*\* nothing more'"
check "take: someone else's staged and unstaged work is still there, exactly" foreign_kept
check "take: none of it is in the commit" foreign_out HEAD
check "take: the checkout shows nothing for the landed paths" quiet .constellation/bench/alpha.md .constellation/stock/alpha.md
check "take: the worktree starts from the landed commit" test "$(git -C "$T/state/proj/alpha" rev-parse HEAD)" = "$(git rev-parse HEAD)"

# --- a refused landing puts the checkout back as it was
head0=$(git rev-parse HEAD)
check "a refused take says so" says "stays on the rack" env REFUSE="$T/refused" "$C" take beta
check "refused: nothing landed" test "$(git rev-parse HEAD)" = "$head0"
check "refused: the piece is back on the rack as it was, nothing on the bench" bash -c "test ! -e .constellation/bench/beta.md && cmp -s .constellation/stock/beta.md <(git show HEAD:.constellation/stock/beta.md)"
check "refused: the checkout shows nothing for the paths it tried" quiet .constellation/bench/beta.md .constellation/stock/beta.md
check "refused: someone else's work is untouched" foreign_kept

# --- a lost race: another writer moves main between the build and the swap; the landing builds again on it, and both land
check "a take that loses the race still lands" env RACE="$T/raced" "$C" take beta
check "the race: both landed, the take on top of the racer" bash -c "git log -1 --format=%s | grep -qx 'take beta to the bench' && git log -1 --format=%s HEAD~1 | grep -qx 'the racer' && git cat-file -e HEAD:racer.txt"
check "the race: the take's commit is still only its move" test "$(paths_of HEAD)" = "A .constellation/bench/beta.md|D .constellation/stock/beta.md|"
check "the race: the checkout shows nothing for the landed paths" quiet .constellation/bench/beta.md .constellation/stock/beta.md
check "the race: someone else's work is untouched" foreign_kept

# --- two bookkeeping writes at once: both land, each with only its own paths
mkdir -p ideas; echo 'a thought' >ideas/call.txt; rack gamma
git add ideas/call.txt; git commit -qm "an idea, in git" -m "ACT: ideate
DONE: a note
NEXT: —" -- ideas/call.txt
"$C" take gamma >"$T/t1.out" 2>&1 & a=$!
"$C" inbox --read ideas/call.txt >"$T/t2.out" 2>&1 & b=$!
wait $a; ra=$?; wait $b; rb=$?
check "two writes at once: both land" test "$ra:$rb" = 0:0
check "two writes at once: each commit carries only its own paths" bash -c "
  test \"\$(paths_of \$(git log -1 --format=%H --grep='^take gamma'))\" = 'A .constellation/bench/gamma.md|D .constellation/stock/gamma.md|' &&
  test \"\$(paths_of \$(git log -1 --format=%H --grep='^chore(ideas): read call.txt'))\" = 'A ideas/read/call.txt|D ideas/call.txt|'"
check "inbox: the note moved in the checkout, and it shows nothing for either path" bash -c "test -f ideas/read/call.txt && test ! -e ideas/call.txt && quiet ideas/call.txt ideas/read/call.txt"
check "inbox and take: someone else's work is untouched, and in neither commit" bash -c "foreign_kept && foreign_out HEAD && foreign_out HEAD~1"

# --- trade: the loader lands; the foreign work stays
check "trade lands with someone else's work in the checkout" .constellation/bin/constellation trade marketing
check "trade: its commit is only the loaders" bash -c "git log -1 --format=%s | grep -q '^chore(trade): the project works in marketing' && test \"\$(paths_of HEAD)\" = 'M AGENTS.md|M CLAUDE.md|'"
check "trade: the checkout's loaders name the trade, and show nothing" bash -c "grep -qF 'trades/marketing/TRADE.md' AGENTS.md && quiet AGENTS.md CLAUDE.md"
check "trade: someone else's work is untouched" foreign_kept
check "trade: none of it is in the commit" foreign_out HEAD
.constellation/bin/constellation trade dev >/dev/null 2>&1

# --- run records: nothing staged in the piece's worktree enters one, and the question's choices ride on it alone
W=$T/state/proj/alpha
echo 'export const broken = ;' >"$W/src/wip.js"; git -C "$W" add src/wip.js
check "a record is written with something staged in the worktree" "$C" run alpha
check "the record carries no file; what was staged stays staged" sh -c "
  git -C '$W' log -1 --format=%s | grep -q '^run(alpha): vega started' && test -z \"\$(git -C '$W' show --name-only --format= HEAD)\" &&
  git -C '$W' diff --cached --name-only | grep -qx src/wip.js"
check "a question with its choices is recorded with something staged" env CONSTELLATION_PIECE=alpha CONSTELLATION_STEP=vega CONSTELLATION_REPO="$P" \
  "$C" ask "which greeting?" --situation s --background b --assessment a --recommend "hello" --option "hi"
check "the question's commit, amended with its choices, carries no file; what was staged stays staged" sh -c "
  git -C '$W' log -1 --format=%B | grep -qx 'RECOMMEND: hello' && git -C '$W' log -1 --format=%s | grep -q '^run(alpha): vega ask' &&
  test -z \"\$(git -C '$W' show --name-only --format= HEAD)\" && git -C '$W' diff --cached --name-only | grep -qx src/wip.js"
check "the amend replaced the question's commit (the start is still its parent)" sh -c "git -C '$W' log -1 --format=%s HEAD~1 | grep -q '^run(alpha): vega started'"
git -C "$W" rm -q --cached src/wip.js; rm "$W/src/wip.js"
"$C" answer alpha yes >/dev/null

# --- one step at a time: a step window of the piece alive anywhere on the server stops another start, and is named
tmux kill-window -t "=workers:=alpha·vega"
tmux new-session -d -s home -n _ 'sleep 3600'   # a coordinator's session: not the one the driver starts in
tmux new-window -d -t "=home:" -n "alpha·vega" 'sleep 3600'
n0=$(git -C "$W" rev-list --count HEAD)
check "resume refuses while the piece's step is live in another session, and names it" says "home:1 (alpha·vega) is still open" "$C" resume alpha
check "refused: nothing started, nothing recorded" sh -c "! tmux list-windows -t workers -F '#W' | grep -q '^alpha·' && test \$(git -C '$W' rev-list --count HEAD) = $n0"
tmux kill-window -t "=home:=alpha·vega"
tmux new-window -d -t "=home:" -n "alpha·vega·reply" 'sleep 3600'
check "an answering window of the piece stops a start too" says "(alpha·vega·reply) is still open" "$C" resume alpha
tmux kill-window -t "=home:=alpha·vega·reply"
tmux new-window -d -t "=home:" -n "alphabet·vega" 'sleep 3600'
check "another piece's window, whose name only starts the same, does not" sh -c "'$C' resume alpha | grep -q 'vega (vega, ideate) started'"
check "with nothing else live, the step starts in its window" sh -c "tmux list-windows -t workers -F '#W' | grep -qx 'alpha·vega'"
check "another piece starts beside it: the rule is per piece" sh -c "'$C' run beta | grep -q 'vega (vega, ideate) started'"
tmux new-window -d -t "=workers:" -n "beta·cassiopeia" 'sleep 3600'   # a stray later step of beta, still open
check "a piece's step cannot start while another of its steps is live" says "(beta·cassiopeia) is still open" "$C" resume beta
check "the step that is handing off is not in the way of the next" sh -c "
  export CONSTELLATION_PIECE=alpha CONSTELLATION_STEP=vega CONSTELLATION_REPO='$P' CONSTELLATION_HARNESS=claude CONSTELLATION_AUTO=1 CONSTELLATION_BASE=\$(git -C '$W' rev-parse HEAD)
  '$C' clear >/dev/null && '$C' done 'understood' >/dev/null && tmux list-windows -t workers -F '#W' | grep -qx 'alpha·polaris-peer' && ! tmux list-windows -t workers -F '#W' | grep -qx 'alpha·vega'"

# --- finish: the code fast-forwards and the piece's removal lands; the foreign work stays
tmux kill-window -t "=workers:=alpha·polaris-peer"
rec() { git -C "$1" -c core.hooksPath=/dev/null commit -q --allow-empty -m "run(alpha): aldebaran done

ACT: verify
STAR: aldebaran
STEP: aldebaran
EVENT: done
HARNESS: claude
DONE: the checks pass
NEXT: -"; }
echo 'export const alpha = 1' >"$W/src/alpha.js"; git -C "$W" add src/alpha.js; git -C "$W" -c core.hooksPath=/dev/null commit -qm "add alpha"; rec "$W"
echo 'an edit nobody saved' >>.constellation/bench/alpha.md
check "finish refuses to take away a piece with uncommitted changes in the checkout" says ".constellation/bench/alpha.md has uncommitted changes" "$C" land alpha
check "refused finish: the piece and its edit are still there" sh -c "tail -1 .constellation/bench/alpha.md | grep -qx 'an edit nobody saved' && git cat-file -e HEAD:.constellation/bench/alpha.md"
git checkout -q -- .constellation/bench/alpha.md
check "land lands with someone else's work in the checkout" "$C" land alpha
check "finish: the code landed, and the finish commit only removes the piece" bash -c "test -f src/alpha.js && git log -1 --format=%s | grep -qx 'finish alpha' && test \"\$(paths_of HEAD)\" = 'D .constellation/bench/alpha.md|'"
check "finish: the receipt is its body" sh -c "git log -1 --format=%B | grep -qx '## Receipt'"
check "finish: someone else's work is untouched" foreign_kept
check "finish: none of it is in the finish commit or the code" bash -c "foreign_out HEAD && foreign_out HEAD~1"
check "finish: the checkout shows nothing for the landed paths" quiet .constellation/bench/alpha.md src/alpha.js

# --- the law, in the code: no kernel command stages, moves, removes or commits through a checkout's index, but adopt
check "no git add, mv, rm or commit in kernel/lib or the driver, but adopt's" sh -c "
  ! grep -nE 'git (-C [^ ]+ )?(-c [^ ]+ )*(add|mv|rm|commit)( |\$)' '$ROOT'/kernel/lib/constellation/*.sh '$ROOT/kernel/bin/constellation' |
    grep -vE '/adopt\.sh:|^[^:]+:[0-9]+:[[:space:]]*#'"

[ $fails -eq 0 ] && echo "constellation-landing: all tests passed" || { echo "constellation-landing: $fails failure(s)"; exit 1; }
