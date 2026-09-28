#!/usr/bin/env bash
# constellation.t.sh — the driver end to end against a scratch project with the kernel
# installed: take, every step, each write rule refused, a failed run through the arbiter,
# a question and its answer, resume on another harness, and land. The test plays each star
# by calling `constellation done` the way an agent would. Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
refused() { ! "$@" >/dev/null 2>&1; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"
printf '# Greet the user\n\nA greeting on the home page.\n' >.madewell/stock/greet.md
git add .madewell/stock/greet.md; git commit -qm "rack: greet"
check "take refuses a piece without its floor" says "missing Making, Not making, Done when, Waits on" "$C" take greet
printf '# Greet the user\n\n**Making:** a greeting on the home page\n**Not making:** localisation\n**Done when:** src/greet.js exports greet() returning "hello"\n**Waits on:** \n' >.madewell/stock/greet.md
git add .madewell/stock/greet.md; git commit -qm "rack: greet floor"
WT=$T/state/proj/greet
check "take moves stock to bench, makes the branch and the worktree" sh -c "'$C' take greet && test -f .madewell/bench/greet.md && test -d '$WT' && git rev-parse --verify piece/greet"
check "the worktree carries the framework for the commit gate" test -x "$WT/.madewell/bin/mw-gate.sh"

as() { export CONSTELLATION_PIECE=greet CONSTELLATION_STEP=$1 CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=claude CONSTELLATION_BASE; CONSTELLATION_BASE=$(git -C "$WT" rev-parse HEAD); }
next() { (unset CONSTELLATION_PIECE CONSTELLATION_STEP; "$C" status greet | sed -n 's/^  next: //p'); }
win() { tmux list-windows -t workers -F '#W' | grep -qx "greet·$1"; }

check "run starts vega in its own window" sh -c "'$C' run greet | grep -q 'vega (vega, ideate) started'"
check "vega's window is open" win vega
check "status says vega is running" test "$(next)" = running:vega
check "a second run is refused while vega runs" refused "$C" run greet
check "vega's brief carries the piece and its star" grep -qF 'src/greet.js exports greet()' "$T/state/proj/greet.vega.brief.md"

as vega
check "done is refused before the relay clears" says "the relay comes first" "$C" done "understood"
check "the brief puts the relay first" grep -qF "First, the relay" "$T/state/proj/greet.vega.brief.md"
check "vega asks whoever handed it the piece: the operator" says "went to the operator" "$C" clarify "does greet take a name?"
check "status says vega is clarifying" test "$(next)" = clarifying:vega
check "the operator answers the first star" env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP "$C" answer greet "no name: greet() alone"
check "vega clears after the answer" "$C" clear
echo x >"$WT/src/x.js"; git -C "$WT" add src/x.js; git -C "$WT" commit -qm "vega wrote code"
check "vega may not commit" says "changes nothing, but it committed" "$C" done "understood"
git -C "$WT" reset -q --hard HEAD~1
check "vega hands off" "$C" done "greet is a one-function module; steps: add greet(); risk: none"
check "the next star starts by itself: polaris, peer" win polaris-peer
check "the handoff is in the next brief" grep -qF "greet is a one-function module" "$T/state/proj/greet.polaris-peer.brief.md"
check "the record is a Made Well trailer on the piece branch" sh -c "git log piece/greet --format=%B | grep -q '^ACT: ideate' && git log piece/greet --format=%B | grep -q '^STAR: vega'"

as polaris-peer; "$C" clear >/dev/null; check "polaris peer hands off" "$C" done "agree"
as cassiopeia; "$C" clear >/dev/null; check "cassiopeia hands off the plan" "$C" done "plan: add src/greet.js with greet(); test in tests/greet.test.js"
check "sirius starts" win sirius

as sirius
check "sirius's questions go back to cassiopeia" says "went to cassiopeia" "$C" clarify "which file?"
check "cassiopeia is brought back to answer, in a reply window" win "sirius·reply"
check "the reply brief carries the questions" grep -qF "which file?" "$T/state/proj/greet.sirius.reply.brief.md"
( export CONSTELLATION_STEP=cassiopeia CONSTELLATION_REPLY_FOR=sirius; check "cassiopeia replies" "$C" reply "src/greet.js" )
check "the answer is on the record, from cassiopeia" sh -c "'$C' status greet | grep -q 'reply:cassiopeia'"
for r in 2 3; do "$C" clarify "round $r?" >/dev/null; ( export CONSTELLATION_STEP=cassiopeia CONSTELLATION_REPLY_FOR=sirius; "$C" reply "answer $r" >/dev/null ); done
check "a fourth round of questions flags the operator" says "flagged for the operator" "$C" clarify "still unclear?"
check "status sends it to the operator" test "$(next)" = operator
check "the operator resumes the flagged step" sh -c "env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP '$C' resume greet | grep -q 'sirius (sirius, implement) started'"
as sirius; "$C" clear >/dev/null
mkdir -p "$WT/tests"; echo t >"$WT/tests/greet.test.js"; git -C "$WT" add tests; git -C "$WT" commit -qm "sirius wrote a test"
check "sirius may not touch tests" says "sirius never touches tests" "$C" done "built"
git -C "$WT" reset -q --hard HEAD~1
echo 'export const greet = () => "helo"' >"$WT/src/greet.js"; git -C "$WT" add src/greet.js; git -C "$WT" commit -qm "greet"
check "sirius refuses to hand off with uncommitted work" sh -c "echo dirt >>'$WT/src/a.js'; ! '$C' done built"
git -C "$WT" checkout -q -- src/a.js
check "sirius hands off" "$C" done "added greet()"
check "orion starts after the first build" win orion

as orion; "$C" clear >/dev/null; echo 'change' >>"$WT/src/greet.js"; git -C "$WT" add src/greet.js; git -C "$WT" commit -qm "orion touched code"
check "orion changes only test files" says "orion changes only test files" "$C" done "tests"
git -C "$WT" reset -q --hard HEAD~1
mkdir -p "$WT/tests"; echo 'expect(greet()).toBe("hello")' >"$WT/tests/greet.test.js"; git -C "$WT" add tests; git -C "$WT" commit -qm "tests for greet"
check "orion hands off" "$C" done "tests/greet.test.js proves greet() returns hello"

as aldebaran; "$C" clear >/dev/null
check "only the arbiter routes" says "only the arbiter routes" "$C" done --route sirius "x"
check "aldebaran fails the run" "$C" done --fail "tests/greet.test.js: expected hello, got helo"
check "the arbiter starts" win polaris-triage
as polaris-triage; "$C" clear >/dev/null
check "the arbiter must rule with --route" says "the arbiter rules with --route" "$C" done "it is the code"
check "the arbiter routes to sirius" "$C" done --route sirius "greet() returns helo; the test is right"
check "sirius starts again" win sirius
as sirius; "$C" clear >/dev/null; echo 'export const greet = () => "hello"' >"$WT/src/greet.js"; git -C "$WT" commit -qam "fix greet"
check "sirius hands off the fix" "$C" done "fixed the typo"
check "after a fix the run goes straight to aldebaran, not orion again" win aldebaran

as aldebaran; "$C" clear >/dev/null
check "a star asks the operator" "$C" ask "run the e2e suite too?"
check "status says it waits" test "$(next)" = wait:aldebaran
check "run is refused while a question is open" says "asked a question" env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP "$C" run greet
check "the operator answers" env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP "$C" answer greet "unit tests are enough"
check "resume starts the step again on another harness" sh -c "env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP '$C' resume greet --harness pi | grep -q 'aldebaran (aldebaran, verify) started on pi'"
check "the resumed brief carries the question and the answer" grep -qF "unit tests are enough" "$T/state/proj/greet.aldebaran.brief.md"
as aldebaran; "$C" clear >/dev/null
check "aldebaran passes; the piece lands" "$C" done "pass: 1 test, 1 passed"
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE
check "landed: finished/ holds the piece, bench does not" sh -c "test -f .madewell/finished/greet.md && test ! -e .madewell/bench/greet.md"
check "landed: main has the code and the tests" sh -c "grep -q hello src/greet.js && test -f tests/greet.test.js"
check "landed: the whole run is in main's history" sh -c "git log --format=%B | grep -c '^STEP: ' | awk '{exit !(\$1 >= 15)}'"
check "landed: the worktree and branch are gone" sh -c "test ! -d '$WT' && ! git rev-parse --verify -q piece/greet"
check "status shows the finished piece's run" sh -c "'$C' status | grep -q 'nothing on the bench'"

[ $fails -eq 0 ] && echo "constellation: all tests passed" || { echo "constellation: $fails failure(s)"; exit 1; }
