#!/usr/bin/env bash
# constellation-tend.t.sh — the night shift against a scratch project with the kernel installed:
# a live step is left alone; a gone window, a usage-limit pane and a quiet step are each started
# again on the next harness (the star's harness: list, a lone claude falling back to pi), twice at
# most, every attempt on the run and told in plain words; the third time it stops and asks.
# The installed copy of the driver runs, so a star file can be edited. Isolated tmux, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd)
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-tend-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO CONSTELLATION_HARNESS_DEFAULT CONSTELLATION_STUCK_SECONDS
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
C=$P/.madewell/bin/constellation
cd "$P"
floor() { printf '# %s\n\n**Making:** %s\n**Not making:** anything else\n**Done when:** a test proves it\n**Waits on:** \n' "$1" "$1" >".madewell/stock/$1.md"; git add ".madewell/stock/$1.md"; git commit -qm "rack: $1"; "$C" take "$1" >/dev/null; }
floor greet
tend() { "$C" tend "$@" 2>&1; }
starts() { git log "piece/$1" --format=%B | grep -c '^EVENT: started$'; }
harness() { "$C" status "$1" | awk '$2 == "started" { h = $3 } END { print h }'; }
next() { "$C" status "$1" | sed -n 's/^  next: //p'; }
win() { tmux list-windows -t workers -F '#W' | grep -qx "$1"; }

"$C" run greet >/dev/null   # vega, on its star's harness: claude
check "a live, busy step is left alone" sh -c "'$C' tend && test \"\$(git log piece/greet --format=%B | grep -c '^EVENT: started$')\" = 1"

"$C" pause >/dev/null
check "paused: a quiet step is not started again" sh -c "CONSTELLATION_STUCK_SECONDS=0 '$C' tend && test \"\$(git log piece/greet --format=%B | grep -c '^EVENT: started$')\" = 1"
"$C" go >/dev/null
tmux kill-window -t "=workers:=greet·vega"
out=$(tend)
check "a gone window: the step starts again" win "greet·vega"
check "a gone window: the run records the new start" test "$(starts greet)" = 2
check "harness fallback: a lone claude is followed by pi" test "$(harness greet)" = pi
check "the attempt is on the run, with why" sh -c "git log piece/greet --format=%B | grep -q '^DONE: night shift: the last agent stopped (gone, on claude); started again on pi, attempt 1 of 2'"
check "the new agent's brief says why it was started again" grep -qF 'night shift: the last agent stopped' "$T/state/proj/greet.vega.brief.md"
check "the person is told in plain words" grep -qF 'greet: thinking it through stopped (its window closed), so I started it again with a different assistant (pi). That was try 1 of 2.' <<<"$out"
plain() { ! grep -qiE 'vega|running|tend|step|constellation|harness' <<<"$1"; }
check "the notice carries no engine words" plain "$out"

tmux respawn-window -k -t "=workers:=greet·vega" "printf 'You have hit your usage limit. Your limit will reset at 5am.\n'; sleep 3600"
sleep 0.5
out=$(tend)
check "a usage-limit pane: the step starts again" test "$(starts greet)" = 3
check "the next harness wraps back to the first: claude" test "$(harness greet)" = claude
check "the usage limit is told plainly" grep -qF 'thinking it through stopped (it hit a usage limit)' <<<"$out"
check "the usage limit's pane is replaced by the new agent's" sh -c "! tmux capture-pane -p -t '=workers:=greet·vega' | grep -q 'usage limit'"

out=$(CONSTELLATION_STUCK_SECONDS=0 "$C" tend 2>&1)
check "two attempts per step: the third stop starts nothing" test "$(starts greet)" = 3
check "after two it asks the person, plainly" grep -qF 'I have already started it again twice, so I have stopped trying: it needs you.' <<<"$out"
check "a quiet step is named as quiet" grep -qF 'it went quiet for 0 minutes' <<<"$out"
check "the stop is on the run as a flag" sh -c "git log piece/greet --format=%B | grep -q '^DONE: night shift: quiet again after 2 restarts; stopped trying'"
check "the piece now waits for the operator" test "$(next greet)" = operator
check "a flagged piece is left alone on the next pass" sh -c "CONSTELLATION_STUCK_SECONDS=0 '$C' tend | wc -c | grep -qx 0 && test \"\$(git log piece/greet --format=%B | grep -c '^EVENT: started$')\" = 3"
"$C" resume greet >/dev/null
tmux kill-window -t "=workers:=greet·vega"
check "after the operator resumes, the count starts again" says "That was try 1 of 2." tend

# --- the star's harness: line is a list, first preferred; --all finds every project from $STATE
sed -i 's/^harness:.*/harness: pi, claude/' .madewell/stars/sirius.md
floor bye
for s in vega polaris-peer cassiopeia; do   # the run so far: up to the plan, so sirius is next
  git -C "$T/state/proj/bye" commit -q --allow-empty -m "run(bye): $s done" -m "STEP: $s
EVENT: done
HARNESS: claude
DONE: ok"; done
"$C" run bye --harness other --cmd 'sleep 3600' >/dev/null
tmux kill-window -t "=workers:=bye·sirius"
out=$(cd "$T" && "$C" tend --all 2>&1)
check "--all tends a project from outside it" grep -qF 'bye: making it stopped (its window closed)' <<<"$out"
check "a harness not in the list goes to the list's first: pi" test "$(harness bye)" = pi
tmux kill-window -t "=workers:=bye·sirius"
tend >/dev/null
check "and then down the list: claude" test "$(harness bye)" = claude
"$C" resume bye >/dev/null 2>&1
check "run and resume take the first of a harness list: pi" test "$(harness bye)" = pi

# --- one door: tend is a verb like any other, and help still reaches the end of the header
check "help names tend" sh -c "'$C' help | grep -q 'constellation tend \\[--all\\]'"
check "help names the quiet knob and still prints the whole header" sh -c "'$C' help | grep -q CONSTELLATION_STUCK_SECONDS && '$C' help | grep -q '^Requires:'"
check "tend refuses what it does not know" sh -c "! '$C' tend --bogus"

# --- the timer: a user unit, every five minutes, one pass over every project
U=$ROOT/kernel/bindings
check "the service runs one pass of tend --all" grep -qx 'ExecStart=/usr/bin/env constellation tend --all' "$U/constellation-tend.service"
check "the service is a one-shot" grep -qx 'Type=oneshot' "$U/constellation-tend.service"
check "the timer fires every five minutes" grep -qx 'OnUnitActiveSec=5min' "$U/constellation-tend.timer"
check "the timer is wanted by the user's timers" grep -qx 'WantedBy=timers.target' "$U/constellation-tend.timer"
if command -v systemd-analyze >/dev/null; then
  check "systemd reads both units cleanly" sh -c "d=\$(mktemp -d '$T/units.XXXXXX'); cp '$U'/constellation-tend.* \"\$d\"/; systemd-analyze --user verify \"\$d\"/constellation-tend.timer \"\$d\"/constellation-tend.service"
else ok "systemd reads both units cleanly (skipped: no systemd-analyze)"; fi
check "install carries the units into the project" test -f "$P/.madewell/bindings/constellation-tend.timer"

[ $fails -eq 0 ] && echo "constellation-tend: all tests passed" || { echo "constellation-tend: $fails failure(s)"; exit 1; }
