#!/usr/bin/env bash
# constellation-inbox.t.sh — the drop box and the four questions, against a scratch project with
# the kernel installed: inbox finds what is new in ideas/, starts discovery on each text file
# and files it in ideas/read/, lists the rest for the host; take with no floor prints the
# questions, and take with the answers writes them into the piece and takes it.
# Isolated tmux server, no harness (CONSTELLATION_DRY=1).
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-inbox-test.XXXXXX")
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
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO CONSTELLATION_DISCOVER
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }
win() { tmux list-windows -t workers -F '#W' | grep -qx "discover·$1"; }
wins() { tmux list-windows -t workers -F '#W' | grep -c '^discover·'; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm "adopt Constellation"
cd "$P"

# --- the drop box -----------------------------------------------------------------------
check "inbox with nothing new says nothing" sh -c "test -z \"\$('$C' inbox)\""
check "and leaves the drop box there for the person" test -d ideas
printf 'Call with Dana: they want a greeting on the home page.\n' >ideas/call-notes.md
printf 'buy a domain name\n' >ideas/todo.txt
printf 'WEBVTT\n\n00:00.000 --> 00:02.000\nwe should add a newsletter\n' >"ideas/Team sync.vtt"
printf 'ID3\000\001\002binary audio' >ideas/memo.m4a
: >ideas/blank.md
printf 'x' >ideas/.DS_Store
check "inside a star's step the drop box is left alone" sh -c "CONSTELLATION_STEP=vega '$C' inbox | wc -c | grep -qx 0 && test -f ideas/call-notes.md"
check "inside a discovery act too" sh -c "CONSTELLATION_DISCOVERING=1 '$C' inbox | wc -c | grep -qx 0 && test -f ideas/call-notes.md"
OUT=$("$C" inbox 2>&1); echo "$OUT" >"$T/inbox.out"
check "inbox starts discovery on each text file, in its own window" sh -c "$(declare -f win); win call-notes && win todo && win Team-sync"
check "one discovery act per text file" test "$(wins)" = 3
check "each text file is filed in ideas/read/" sh -c "test -f ideas/read/call-notes.md && test -f ideas/read/todo.txt && test -f 'ideas/read/Team sync.vtt' && test ! -e ideas/call-notes.md && test ! -e ideas/todo.txt"
check "discovery reads the filed copy, through the discovery skill" sh -c "grep -l 'ideas/read/call-notes.md' '$T'/state/proj/discover.call-notes.*.brief.md | xargs grep -q 'skills/discovery.md'"
check "the discovery act is marked, so its own session start leaves the drop box alone" sh -c "tmux capture-pane -p -t 'workers:discover·todo' | grep -q CONSTELLATION_DISCOVERING=1"
check "the discovery act gets its own task list, not the one above the project" sh -c "tmux capture-pane -pJ -t 'workers:discover·todo' | grep -q \"TASKS_FILE='$T/state/proj/discover.todo.\" && ls '$T'/state/proj/discover.todo.*.TASKS.md >/dev/null"
check "the brief says to cite the intake record and never copy it" sh -c "grep -q 'intake record' '$T'/state/proj/discover.call-notes.*.brief.md"
check "a file that is not text is listed for the host to read" grep -qF "ideas/memo.m4a" "$T/inbox.out"
check "and is left where it was dropped" test -f ideas/memo.m4a
check "the host is told how to file it once read" grep -qF "constellation inbox --read" "$T/inbox.out"
check "an empty file is set aside, not thought through" sh -c "test -f ideas/read/blank.md && ! grep -q 'thinking through ideas/read/blank' '$T/inbox.out'"
check "hidden files are not ideas" sh -c "test -f ideas/.DS_Store && ! grep -q DS_Store '$T/inbox.out'"
check "the output tells the host what to say, in plain words" grep -qF "thinking their ideas through" "$T/inbox.out"
check "no engine words reach the person's line" sh -c "! grep -i 'Tell the person' '$T/inbox.out' | grep -qiE 'stock|bench|floor|rack|vega|discover'"
OUT=$("$C" inbox 2>&1)
check "a second inbox does not think the same file through again" test "$(wins)" = 3
check "but still lists what the host has not read" grep -qF "ideas/memo.m4a" <<<"$OUT"
check "the host files what it read" says "filed ideas/memo.m4a → ideas/read/memo.m4a" "$C" inbox --read ideas/memo.m4a
check "and it is new no more" sh -c "test -f ideas/read/memo.m4a && test -z \"\$('$C' inbox)\""
check "--read refuses a file that is not in the drop box" sh -c "! '$C' inbox --read src/a.js && test -f src/a.js"
printf 'second call: also a footer\n' >ideas/call-notes.md
"$C" inbox >/dev/null 2>&1
check "a second drop of the same name keeps both" sh -c "test -f ideas/read/call-notes.2.md && grep -q greeting ideas/read/call-notes.md"
check "and its discovery reads its own copy" sh -c "grep -q 'ideas/read/call-notes.2.md' '$T'/state/proj/discover.call-notes-2.*.brief.md"
mkdir -p "$P/sub"; printf 'from a subfolder\n' >ideas/deep.md
check "inbox finds the project's drop box from anywhere in it" sh -c "cd '$P/sub' && '$C' inbox | grep -q 'thinking through ideas/read/deep.md'"
printf 'kept in git\n' >ideas/tracked.md; git add ideas/tracked.md; git commit -qm "an idea, in git"
"$C" inbox >/dev/null 2>&1
check "an idea kept in git is moved by a commit, and the tree stays clean" sh -c "git ls-files --error-unmatch ideas/read/tracked.md && test -z \"\$(git status --porcelain -- ideas/tracked.md ideas/read/tracked.md)\""
printf 'headless idea\n' >ideas/quiet.md
check "discovery can run headless" sh -c "CONSTELLATION_DISCOVER=headless '$C' inbox | grep -q 'headless' && ! tmux list-windows -t workers -F '#W' | grep -qx 'discover·quiet' && test -f ideas/read/quiet.md"
printf 'on pi\n' >ideas/onpi.md
check "discovery runs on pi when asked" sh -c "CONSTELLATION_DISCOVER_HARNESS=pi '$C' inbox | grep -q 'on pi, in workers:discover·onpi'"
FAKE="$T/fakebin"; mkdir -p "$FAKE"; printf '#!/bin/sh\nprintf "%%s\\n" "$@" >"%s/pi.args"\n' "$T" >"$FAKE/pi"; chmod +x "$FAKE/pi"
printf 'no claude here\n' >ideas/fallback.md
if PATH=/usr/bin:/bin command -v claude >/dev/null; then ok "with no claude, discovery falls back to pi (skipped: claude is on the system path)"; else
env -u CONSTELLATION_DRY PATH="$FAKE:/usr/bin:/bin" CONSTELLATION_DISCOVER=headless bash -c "'$C' inbox" >"$T/fallback.out" 2>&1; sleep 1
check "with no claude, discovery falls back to pi" grep -q 'on pi, headless' "$T/fallback.out"
check "pi is started headless, trusted, with the discovery brief" sh -c "head -3 '$T/pi.args' | tr '\n' ' ' | grep -q '^-p --approve --thinking ' && grep -q 'Discovery — the outer loop' '$T/pi.args'"
fi
printf 'no harness here\n' >ideas/stranded.md
if PATH=/usr/bin:/bin command -v claude >/dev/null; then ok "with no harness to run (skipped: a harness is on the system path)"; else
check "with no harness to run, a text file stays in the drop box" sh -c "env -u CONSTELLATION_DRY PATH=/usr/bin:/bin bash -c \"'$C' inbox\" | grep -q 'stays in ideas/' && test -f ideas/stranded.md && test ! -e ideas/read/stranded.md"
fi; rm -f ideas/stranded.md
check "discover still works on a notes file by itself" says "discovery started on" "$C" discover ideas/read/todo.txt

# --- the four questions -------------------------------------------------------------------
printf '# Greet the user\n\nDana wants a greeting on the home page.\n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet"
OUT=$("$C" take greet 2>&1); rc=$?
check "take with no floor does not take it" sh -c "test $rc -ne 0 && test -f .constellation/stock/greet.md && test ! -e .constellation/bench/greet.md"
check "it asks the four questions, in plain words" bash -c "grep -qF 'What are we making?' <<<\"\$1\" && grep -qF 'What are we not making' <<<\"\$1\" && grep -qF 'How will we know it is done?' <<<\"\$1\" && grep -qF 'Is it waiting on anything' <<<\"\$1\"" _ "$OUT"
check "as a conversation, not a form" grep -qF "as a conversation, not a form" <<<"$OUT"
check "and says how to take it with the answers" grep -qF "constellation take greet --making '…' --not-making '…' --done-when '…' --waits-on '…'" <<<"$OUT"
check "it still names what is missing" grep -qF "missing Making, Not making, Done when, Waits on" <<<"$OUT"
check "nothing was written or moved" test -z "$(git status --porcelain -- .constellation)"
printf '# Greet the user\n\n**Making:** a greeting on the home page\n**Not making:** OPEN — which pages?\n**Done when:** TBD\n**Waits on:** ?\n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet, placeholders"
OUT=$("$C" take greet 2>&1); rc=$?
check "a placeholder (OPEN, TBD, ?) is not an answer: take still asks" bash -c "test $rc -ne 0 && grep -qF 'missing Not making, Done when, Waits on' <<<\"\$1\" && test -f .constellation/stock/greet.md" _ "$OUT"
printf '# Greet the user\n\n**Making:** a greeting on the home page\n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet, making"
OUT=$("$C" take greet 2>&1)
check "a question the piece already answers is not asked again" bash -c "! grep -qF 'What are we making?' <<<\"\$1\" && grep -qF 'What are we not making' <<<\"\$1\" && grep -qF \"take greet --not-making '…' --done-when '…' --waits-on '…'\" <<<\"\$1\"" _ "$OUT"
OUT=$("$C" take greet --not-making 'localisation' --done-when 'a test proves it' 2>&1)
check "some answers but not all: still asks the rest, and writes nothing" bash -c "grep -qF 'Is it waiting on anything' <<<\"\$1\" && ! grep -qF 'How will we know' <<<\"\$1\" && test -z \"\$(git status --porcelain -- .constellation)\"" _ "$OUT"
check "an unknown flag is refused" says "unknown flag --why" "$C" take greet --why x
check "take with the answers takes it" "$C" take greet --making "a greeting that says \"hello\" & waves \\o/" --not-making 'localisation' --done-when 'src/greet.js exports greet() returning "hello"' --waits-on ''
check "the piece is on the bench, off the rack" sh -c "test -f .constellation/bench/greet.md && test ! -e .constellation/stock/greet.md"
check "the answers are written into the piece, in their words" sh -c "grep -qxF '**Making:** a greeting that says \"hello\" & waves \\o/' .constellation/bench/greet.md && grep -qxF '**Not making:** localisation' .constellation/bench/greet.md && grep -qxF '**Done when:** src/greet.js exports greet() returning \"hello\"' .constellation/bench/greet.md && grep -qxF '**Waits on:**' .constellation/bench/greet.md"
check "a given answer replaces the line, never doubles it" test "$(grep -ci '^\*\*Making:\*\*' .constellation/bench/greet.md)" = 1
check "the rest of the piece is kept" grep -qxF '# Greet the user' .constellation/bench/greet.md
check "one commit: the move with the floor in it, and nothing left over" sh -c "git log -1 --format=%s | grep -qx 'take greet to the bench' && git show --stat HEAD | grep -q 'bench/greet.md' && test -z \"\$(git status --porcelain -- .constellation)\""
check "the branch and the worktree exist" sh -c "git rev-parse --verify -q piece/greet && test -d '$T/state/proj/greet'"
check "the committed piece carries the floor" sh -c "git show HEAD:.constellation/bench/greet.md | grep -q '^\*\*Waits on:\*\*'"
check "the piece's run can start" sh -c "'$C' run greet | grep -q 'vega (vega, ideate) started'"

printf '# Multi\n\nline one\n' >.constellation/stock/multi.md; git add .constellation/stock/multi.md; git commit -qm "rack: multi"
check "a multi-line answer becomes one line" sh -c "'$C' take multi --making \"\$(printf 'one\ntwo')\" --not-making x --done-when y --waits-on 'Dana' && grep -qxF '**Making:** one two' .constellation/bench/multi.md && grep -qxF '**Waits on:** Dana' .constellation/bench/multi.md"

echo
[ "$fails" -eq 0 ] && echo "PASS: constellation inbox and take" || { echo "FAIL: $fails check(s)"; exit 1; }
