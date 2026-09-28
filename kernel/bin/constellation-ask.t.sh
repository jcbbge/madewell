#!/usr/bin/env bash
# constellation-ask.t.sh — every question to the person arrives ready to answer in one word, and
# one word stops or restarts everything: ask refused without SBAR, a recommendation and a choice;
# answered with yes or a number; a clarify to the operator carrying the same; pause holds every
# piece at its next handoff and go starts it again; every handoff prints the save line.
# Scratch project with the kernel installed, isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-ask-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO CONSTELLATION_REPLY_FOR
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
refused() { ! "$@" >/dev/null 2>&1; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }
refuses_saying() { local w=$1 out; shift; out=$("$@" 2>&1) && return 1; grep -qF -- "$w" <<<"$out"; }

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm "adopt Constellation"
cd "$P"
printf '# Greet the user\n\n**Making:** a greeting\n**Not making:** localisation\n**Done when:** greet() returns "hello"\n**Waits on:** \n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet"
"$C" take greet >/dev/null; WT=$T/state/proj/greet
"$C" run greet >/dev/null

as() { export CONSTELLATION_PIECE=greet CONSTELLATION_STEP=$1 CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=claude CONSTELLATION_BASE; CONSTELLATION_BASE=$(git -C "$WT" rev-parse HEAD); }
op() { env -u CONSTELLATION_PIECE -u CONSTELLATION_STEP -u CONSTELLATION_REPLY_FOR -u CONSTELLATION_BASE "$C" "$@"; }
next() { op status greet | sed -n 's/^  next: //p'; }
win() { tmux list-windows -t workers -F '#W' | grep -qx "greet·$1"; }
SAVE_V='Saved: Greet the user — thinking it through, just now. You can close this any time; say continue to pick up.'
SBAR=(--situation "the page has no greeting" --background "the piece asks for one" --assessment "a plain hello fits")

# --- a clarify to the operator carries SBAR and choices -----------------------------------
as vega
check "clarify to the operator: half an SBAR is refused, naming what is missing" \
  refuses_saying "your recommendation (--recommend)" "$C" clarify "does greet take a name?" --situation "no name in the piece"
check "clarify to the operator carries SBAR, the recommendation and the choices" \
  says "went to the host" "$C" clarify "does greet take a name?" "${SBAR[@]}" --recommend "no name: greet() alone" --option "greet(name)"
check "the question on the record reads as SBAR with numbered choices" \
  sh -c "'$C' status greet | grep -F 'Situation: the page has no greeting' | grep -F 'Background: the piece asks for one' | grep -F 'Assessment: a plain hello fits' | grep -qF '1. no name: greet() alone (recommended) · 2. greet(name)'"
check "a number beyond the choices is refused" refuses_saying "a number from 1 to 2" op answer greet 3
check "the operator answers the clarify with yes: the recommendation is delivered" \
  says "yes — the recommendation: no name: greet() alone" op answer greet yes
check "the reply on the record is the recommendation, from the operator" \
  sh -c "'$C' status greet | grep 'reply:operator' | grep -qF 'the recommendation: no name: greet() alone'"
check "a bare clarify to the operator still goes (a free answer)" says "went to the host" "$C" clarify "anything else?"
check "and a bare clarify takes no stale choices: yes stays yes" says "(vega): yes" op answer greet yes
"$C" clear >/dev/null

# --- ask: refused without SBAR, a recommendation and a choice ------------------------------
check "ask refuses a bare question" refuses_saying "missing the situation (--situation)" "$C" ask "which greeting?"
check "ask refuses a question without --recommend" \
  refuses_saying "your recommendation (--recommend)" "$C" ask "which greeting?" "${SBAR[@]}" --option "hi"
check "ask refuses a question without an --option" \
  refuses_saying "at least one other choice (--option)" "$C" ask "which greeting?" "${SBAR[@]}" --recommend "hello"
check "ask refuses more than three choices in all" \
  refuses_saying "two or three choices in all" "$C" ask "which greeting?" "${SBAR[@]}" --recommend "hello" --option "hi" --option "hey" --option "yo"
check "ask refusals teach the whole shape" refuses_saying '--recommend "<what you would do>"' "$C" ask "which greeting?"
check "nothing was asked by the refusals" test "$(next)" = running:vega
check "ask with SBAR, a recommendation and two choices is accepted, and saves" \
  says "$SAVE_V" "$C" ask "which greeting?" "${SBAR[@]}" --recommend "hello" --option "hi" --option "hey there"
check "status says vega waits for the operator" test "$(next)" = wait:vega
check "the choices ride on the question's record" \
  sh -c "git log -1 --format=%B piece/greet | grep -qx 'RECOMMEND: hello' && git log -1 --format=%B piece/greet | grep -qx 'OPTION: hey there'"
check "answer with a number takes that choice" says "choice 3: hey there" op answer greet 3
check "the answer on the record is the choice's words" sh -c "'$C' status greet | grep ' answer ' | tail -1 | grep -qF 'choice 3: hey there'"
check "vega carries on" test "$(next)" = running:vega
"$C" ask "which case?" "${SBAR[@]}" --recommend "lower case" --option "Title Case" >/dev/null
check "answer yes takes the recommendation (any case)" says "yes — the recommendation: lower case" op answer greet YES
"$C" ask "which case?" "${SBAR[@]}" --recommend "lower case" --option "Title Case" >/dev/null
check "answer in words goes as written" says "(vega): shout it" op answer greet "shout it"
pane() { tmux capture-pane -pJ -S - -t '=workers:=greet·vega'; }
check "the star's pane hears who answered in its own words: the host, the person" \
  sh -c "$(declare -f pane); pane | grep -qF 'Answers from the host:' && pane | grep -qF 'The person answered: shout it' && ! pane | grep -qi operator"
check "answer with no open question is refused" refuses_saying "no open question" op answer greet yes

# --- every handoff prints the save line -----------------------------------------------------
check "done prints the save line in plain words" says "$SAVE_V" "$C" done "one function; no risk"
check "polaris starts after vega" win polaris-peer

# --- pause: every piece stops at its next handoff; go starts it again -------------------------
check "pause says, in plain words, what it does" says "nothing new starts. Say go to pick up." op pause
check "pause twice is harmless" says "Already paused" op pause
check "while paused, resume is refused" refuses_saying "everything is paused" op resume greet
check "while paused, run is refused" refuses_saying "everything is paused" op run greet
as polaris-peer; "$C" clear >/dev/null
check "while paused, the stop gate still holds a star to its handoff, and says it is paused" \
  sh -c "'$C' stop-check --claude | grep -q 'everything is paused: finish with your handoff'"
check "while paused, the star still hands off, and saves" says "Saved: Greet the user — a second look, just now." "$C" done "agree"
check "the pause holds what comes next: cassiopeia has not started" sh -c "! tmux list-windows -t workers -F '#W' | grep -qx 'greet·cassiopeia'"
check "the stop gate lets the paused star end its turn after its handoff" sh -c "'$C' stop-check --claude | wc -c | grep -qx 0"
check "status says cassiopeia is next" test "$(next)" = cassiopeia
check "go starts what the pause held" says "Picked up: greet" op go
check "cassiopeia is running after go" win cassiopeia
check "go with nothing paused says so" says "Nothing is paused" op go

as cassiopeia; "$C" clear >/dev/null; "$C" done "plan: src/greet.js" >/dev/null
check "sirius starts (not paused)" win sirius
as sirius
op pause >/dev/null
check "while paused, a clarify to a star is recorded and saved" says "Saved: Greet the user — making it, just now." "$C" clarify "which file?"
check "but the answering star is not started while paused" sh -c "! tmux list-windows -t workers -F '#W' | grep -qx 'greet·sirius·reply'"
op go >/dev/null
check "go starts the answering star with the held questions" sh -c "tmux list-windows -t workers -F '#W' | grep -qx 'greet·sirius·reply' && grep -qF 'which file?' '$T/state/proj/greet.sirius.reply.brief.md'"
check "the answering star's reply saves too" says "Saved: Greet the user — planning it, just now." env CONSTELLATION_STEP=cassiopeia CONSTELLATION_REPLY_FOR=sirius "$C" reply "src/greet.js"

check "help names pause, go and the one-word answer" sh -c "'$C' help | grep -q 'constellation pause' && '$C' help | grep -q 'constellation go' && '$C' help | grep -q 'yes takes its recommendation'"

[ $fails -eq 0 ] && echo "constellation-ask: all tests passed" || { echo "constellation-ask: $fails failure(s)"; exit 1; }
