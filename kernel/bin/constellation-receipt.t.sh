#!/usr/bin/env bash
# constellation-receipt.t.sh — the receipt after a dry end-to-end run: land writes it into the
# finished piece and prints it; `constellation receipt` prints it again, and builds it from the
# record when the section is missing; it says what changed, how we know it works, how to see it
# and what it cost, and never an engine word. Isolated tmux server, no harness: the test plays
# each star by calling `constellation done` the way an agent would.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-receipt-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export CONSTELLATION_HARNESS_LOGS=$T/logs
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }
has() { grep -qF -- "$2" "$1"; }
# The engine's words, listed here and not taken from the code under test.
ENGINE='\b(vega|polaris|cassiopeia|sirius|orion|aldebaran|constellation|madewell|stock|bench|floor|relay|arbiter|handoffs?|worktrees?|piece|trailer|jig)\b'
clean() { ! grep -qiE "$ENGINE" "$1" && ! grep -qE 'run\(|piece/|^(ACT|STAR|STEP|EVENT|HARNESS|DONE|NEXT): |\.madewell' "$1"; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"

rack() { printf '# %s\n\n**Making:** %s\n**Not making:** anything else\n**Done when:** a test proves it\n**Waits on:** \n' "$2" "$3" >".madewell/stock/$1.md"
         git add ".madewell/stock/$1.md"; git commit -qm "rack: $1"; "$C" take "$1" >/dev/null; }
as() { export CONSTELLATION_PIECE=$1 CONSTELLATION_STEP=$2 CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=$3 CONSTELLATION_BASE
       CONSTELLATION_BASE=$(git -C "$T/state/proj/$1" rev-parse HEAD); "$C" clear >/dev/null; }
out() { unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE; }

# --- one whole run, with a failed check on the way, played on the claude harness
rack greet "Greet the user" "a greeting on the home page"; WT=$T/state/proj/greet
"$C" run greet >/dev/null
as greet vega claude;         "$C" done "one function; sirius builds it, orion checks it" >/dev/null
as greet polaris-peer claude; "$C" done "agree with vega" >/dev/null
as greet cassiopeia claude;   "$C" done "plan: src/greet.js exports greet()" >/dev/null
as greet sirius claude
echo 'export const greet = () => "helo"' >"$WT/src/greet.js"; git -C "$WT" add src/greet.js; git -C "$WT" commit -qm "add greet() to the home page"
"$C" done "Added greet() in src/greet.js, as cassiopeia planned" >/dev/null
as greet orion claude
mkdir -p "$WT/tests"; echo 'expect(greet()).toBe("hello")' >"$WT/tests/greet.test.js"; git -C "$WT" add tests; git -C "$WT" commit -qm "a test that greet says hello"
"$C" done "tests/greet.test.js proves greet() returns hello; the handoff to aldebaran is clean" >/dev/null
as greet aldebaran claude;    "$C" done --fail "tests/greet.test.js: expected hello, got helo" >/dev/null
as greet polaris-triage claude; "$C" done --route sirius "the code is wrong, the test is right" >/dev/null
as greet sirius claude
echo 'export const greet = () => "hello"' >"$WT/src/greet.js"; git -C "$WT" commit -qam "greet says hello, not helo"
"$C" done "Fixed the typo the arbiter found. To exercise it: open the home page and read the greeting; it says hello" >/dev/null
# the harness kept a log for this piece's working copy: one message logged twice, and one more
logs=$T/logs/$(printf '%s' "$WT" | sed 's/[^A-Za-z0-9]/-/g'); mkdir -p "$logs/sub"; ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
m1='{"type":"assistant","timestamp":"'$ts'","message":{"id":"m1","usage":{"input_tokens":1000,"cache_read_input_tokens":2000,"output_tokens":500}}}'
printf '%s\n%s\nnot json\n{"type":"user","timestamp":"%s"}\n' "$m1" "$m1" "$ts" >"$logs/s1.jsonl"
printf '%s\n' '{"type":"assistant","timestamp":"'$ts'","message":{"id":"m2","usage":{"input_tokens":500,"output_tokens":1500}}}' >"$logs/sub/s2.jsonl"
printf '%s\n' '{"type":"assistant","timestamp":"2020-01-01T00:00:00.000Z","message":{"id":"old","usage":{"input_tokens":9000000,"output_tokens":9000000}}}' >"$logs/s3.jsonl"
as greet aldebaran claude;    "$C" done "pass: tests/greet.test.js, 1 test, 1 passed" >"$T/land.out" 2>&1
out
F=.madewell/finished/greet.md
check "the run lands the finished piece" test -f "$F"
check "land prints the receipt" has "$T/land.out" "## Receipt"
check "the receipt is appended to the finished piece, below the piece itself" sh -c "head -1 '$F' | grep -qx '# Greet the user' && grep -qx '## Receipt' '$F'"
check "the receipt landed in the finish commit (nothing left uncommitted)" sh -c "test -z \"\$(git status --porcelain --untracked-files=no)\" && git show HEAD -- '$F' | grep -q '^+## Receipt'"
"$C" receipt greet >"$T/r1" 2>&1
check "constellation receipt prints it again" has "$T/r1" "## Receipt"
check "the reprint is the section in the finished piece, word for word" sh -c "sed -n '/^## Receipt\$/,\$p' '$F' | diff - '$T/r1'"
check "the reprint is what land printed" sh -c "sed -n '/^## Receipt\$/,\$p' '$T/land.out' | diff - '$T/r1'"
check "it names what it is" has "$T/r1" "**Greet the user** is done."
check "what changed: the maker's own words, first build and fix" sh -c "grep -qF 'Added greet() in src/greet.js' '$T/r1' && grep -qF 'Fixed the typo' '$T/r1'"
check "what changed: the commit list, oldest first" sh -c "grep -A3 'Saved as 3 changes' '$T/r1' | tr '\n' '|' | grep -qF -- '- add greet() to the home page|- a test that greet says hello|- greet says hello, not helo|'"
check "how we know: the check's evidence" has "$T/r1" "1 test, 1 passed"
check "how we know: who wrote the checks, and what they prove" has "$T/r1" "tests/greet.test.js proves greet() returns hello"
check "how we know: the failed check on the way is not hidden" has "$T/r1" "the check failed 1 time"
check "how to see it: the making step's own instructions" sh -c "grep -A2 '### How to see it yourself' '$T/r1' | grep -qxF 'Open the home page and read the greeting; it says hello'"
check "how to see it is not repeated under what changed" sh -c "! grep -F -- '- Fixed the typo' '$T/r1' | grep -q 'exercise'"
check "what it cost: the time from the record" has "$T/r1" "It took under a minute"
check "what it cost: tokens from the harness log, each message once, only this run's" has "$T/r1" "read about 4 thousand tokens and wrote about 2 thousand"
check "what it cost: the sessions it came from" has "$T/r1" "across 2 sessions"
check "the stars' names become plain words, with no doubled article" sh -c "grep -qF 'as the planner planned' '$T/r1' && grep -qF 'the typo the reviewer found' '$T/r1' && grep -qF 'the note to the checker' '$T/r1' && ! grep -qi 'the the' '$T/r1'"
check "the receipt never says an engine word" clean "$T/r1"
sed -n '/^## Receipt$/,$p' "$T/land.out" >"$T/landr"
check "nor does what land printed of it" clean "$T/landr"

# --- built again from the record, when the section is missing
sed '/^## Receipt$/,$d' "$F" >"$T/bare"; cp "$T/bare" "$F"; git commit -qam "drop the receipt"
check "a finished piece without a receipt gets one built from the record" sh -c "'$C' receipt greet | diff - '$T/r1'"

# --- the next piece: its receipt is its own, and says so when a thing is missing
rack bye "Wave goodbye" "a bye() function"; WB=$T/state/proj/bye
"$C" run bye >/dev/null
as bye vega pi; "$C" done "one function" >/dev/null
as bye polaris-peer pi; "$C" done "agree" >/dev/null
as bye cassiopeia pi; "$C" done "plan: src/bye.js" >/dev/null
as bye sirius pi; echo 'export const bye = () => "bye"' >"$WB/src/bye.js"; git -C "$WB" add src/bye.js; git -C "$WB" commit -qm "add bye()"
"$C" done "added bye()" >/dev/null
as bye orion pi; mkdir -p "$WB/tests"; echo 'expect(bye()).toBe("bye")' >"$WB/tests/bye.test.js"; git -C "$WB" add tests; git -C "$WB" commit -qm "a test for bye"
"$C" done "tests/bye.test.js" >/dev/null
out; echo x >src/other.js; git add src/other.js; git commit -qm "an unrelated change made meanwhile"
as bye aldebaran pi; "$C" done "pass: 1 passed" >/dev/null
out
"$C" receipt bye >"$T/r2" 2>&1
check "landed over a moved default branch (rebased first)" sh -c "test -f .madewell/finished/bye.md && git log --format=%s | grep -qx 'an unrelated change made meanwhile'"
check "the second receipt carries only its own commits, not the other piece's or the meanwhile change" sh -c "grep -qF 'Saved as 2 changes' '$T/r2' && ! grep -qE 'greet|meanwhile' '$T/r2'"
check "a maker who did not say how to try it: the receipt says so, and what to do" has "$T/r2" "The maker did not say how to try it. Ask for a short demonstration."
check "no failed check, no failure line" sh -c "! grep -q 'did not pass the first time' '$T/r2'"
check "no harness log, no token line (the time still shows)" sh -c "grep -q 'It took' '$T/r2' && ! grep -q tokens '$T/r2'"
check "the second receipt never says an engine word" clean "$T/r2"

# --- refusals, in plain words
printf '# Soon\n\n**Making:** x\n**Not making:** y\n**Done when:** z\n**Waits on:** \n' >.madewell/stock/soon.md; git add .madewell/stock/soon.md; git commit -qm "rack: soon"
check "an idea that is not done has no receipt yet" says "is not done yet, so it has no receipt" "$C" receipt soon
"$C" move bench soon >/dev/null 2>&1 && git commit -qm "soon to the bench" && "$C" move finish soon >/dev/null 2>&1 && git commit -qm "soon finished by hand"
check "finished by hand, with no record: it says there is nothing to build from" says "without a record of how it was made" "$C" receipt soon
check "receipt needs a name" says "usage: constellation receipt <slug>" "$C" receipt
check "help names receipt" sh -c "'$C' help | grep -q 'constellation receipt <slug>'"

[ $fails -eq 0 ] && echo "constellation receipt: all tests passed" || { echo "constellation receipt: $fails failure(s)"; exit 1; }
