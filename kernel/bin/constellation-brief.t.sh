#!/usr/bin/env bash
# constellation-brief.t.sh — the person's front page and the status line, on scratch pieces:
# brief's three parts (done since the last brief, being made now, the one thing waiting on the
# person with its recommendation), the remembered time, plain words only, `constellation line`,
# pause, and both bindings (Claude Code's status line, Pi's widget). Stars' questions go through
# `constellation ask`, or straight onto a piece's record as a handoff lands there. Isolated tmux.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-brief-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers CONSTELLATION_AUTO=0
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_HARNESS
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
has() { grep -qF -- "$2" <<<"$1"; }
matches() { grep -qE -- "$2" <<<"$1"; }
lines() { local n; n=$(wc -l <<<"$1" | tr -d ' '); [ "$n" -ge 3 ] && [ "$n" -le 5 ]; }

P=$T/proj; git init -q -b main "$P"; echo 'x' >"$P/README"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"
piece() { # piece <slug> <title> : on the rack with its floor, then taken to the bench
  printf '# %s\n\n**Making:** %s\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' "$2" "$2" >".madewell/stock/$1.md"
  git add ".madewell/stock/$1.md"; git commit -qm "rack: $1"; "$C" take "$1" >/dev/null
}
rec() { # rec <slug> <step> <event> <text> [trailer] : a handoff on the piece's record, as a star leaves it
  git -C "$T/state/proj/$1" -c core.hooksPath=/dev/null commit -q --allow-empty -m "run($1): $2 $3

ACT: ideate
STAR: $2
STEP: $2
EVENT: $3
HARNESS: claude
DONE: $4
NEXT: -${5:+
$5}"
}
brief() { "$C" brief 2>&1; }
line() { "$C" line 2>&1; }

# --- before anything: all quiet
check "line: all quiet on an empty bench" test "$(line)" = "all quiet"
B=$(brief)
check "brief: three parts even when nothing happened" lines "$B"
check "brief: nothing done yet" has "$B" "Nothing is done yet."
check "brief: nothing being made" has "$B" "Nothing is being made right now."
check "brief: nothing waiting" has "$B" "Nothing is waiting on you."
check "brief remembers its time in the state dir" test -s "$T/state/proj/brief.last"
sleep 1

# --- a finished piece, two being made, one question
piece old "Old piece"; git mv .madewell/bench/old.md .madewell/finished/old.md; MW_GATE=off git commit -qm "finish old"  # as land moves it
piece greet "Greet the user"; "$C" run greet >/dev/null
piece bye "Wave goodbye"; "$C" run bye >/dev/null; rec bye vega clear "no open questions"; rec bye vega done "a one-function module"
piece hi "Say hi"; "$C" run hi >/dev/null
( export CONSTELLATION_PIECE=hi CONSTELLATION_STEP=vega CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=claude
  "$C" clear >/dev/null && "$C" ask "run the e2e suite too?" --situation "the unit tests pass" --background "e2e takes an hour" \
    --assessment "the unit tests cover it" --recommend "unit tests are enough" --option "run e2e too" >/dev/null )

check "line: two being made, one question" test "$(line)" = "2 being made · 1 question for you"
B=$(brief); printf '%s\n' "$B" | sed 's/^/     | /'
check "brief: three to five lines" lines "$B"
check "brief (done): a piece that reached finished" has "$B" "Old piece is done"
check "brief (done): an act handed off since the last brief" has "$B" "Wave goodbye was thought through"
check "brief (being made): which act, since when" matches "$B" "Greet the user — thinking it through, since [0-9]{2}:[0-9]{2}[;.]"
check "brief (being made): the act that comes next" has "$B" "Wave goodbye — getting a second look is next"
check "brief (waiting): the question" has "$B" "Waiting on you: Say hi asks: run the e2e suite too?"
check "brief (waiting): its recommendation, the one word that takes it, and the other choices" has "$B" "Recommended: unit tests are enough — say yes to go with it. Or say the number: 2. run e2e too."
check "brief (waiting): the question alone; its situation stays in the record" bash -c "! grep -qE 'Situation|Background|Assessment' <<<\"\$0\"" "$B"
check "brief speaks plain words: no star or engine names" sh -c "! grep -qiE 'vega|polaris|cassiopeia|sirius|orion|aldebaran|bench|stock|STEP|EVENT' <<'EOF'
$B
EOF"

B=$(brief)
check "brief again: nothing new since the last brief" matches "$B" "^Nothing new is done since your last brief \\([0-9]{2}:[0-9]{2}\\)\\.$"
check "brief again: what is not done is still shown" bash -c "grep -qF 'Greet the user — thinking it through' <<<\"\$0\" && grep -qF 'Say hi asks' <<<\"\$0\"" "$B"
sleep 1

# --- more happens: only the new shows as done; a second question queues behind the first
( export CONSTELLATION_PIECE=greet CONSTELLATION_STEP=vega CONSTELLATION_REPO=$P CONSTELLATION_BASE; CONSTELLATION_BASE=$(git -C "$T/state/proj/greet" rev-parse HEAD)
  "$C" clear >/dev/null && "$C" done "greet() alone" >/dev/null )
piece ping "Ping the server"; "$C" run ping >/dev/null
rec ping vega clarify "Situation: the name is unclear. Recommendation: call it ping."
check "line: two questions for you" test "$(line)" = "2 being made · 2 questions for you"
B=$(brief)
check "brief (done): only what is new since the last brief" bash -c "grep -qF 'Greet the user was thought through' <<<\"\$0\" && ! grep -qE 'Wave goodbye was|Old piece' <<<\"\$0\"" "$B"
check "brief (waiting): the oldest question first, and how many more" has "$B" "Waiting on you: Say hi asks: run the e2e suite too? (and 1 more after this)"
rec bye polaris-peer started "-"; rec bye polaris-peer clarify "which module?"
check "a question from one act to the one before is not the person's" test "$(line)" = "2 being made · 2 questions for you"
rec bye vega reply:vega "the greet module"
"$C" answer hi yes >/dev/null
B=$(brief)
check "brief (waiting): an answered question leaves; the next one comes up" has "$B" "Waiting on you: Ping the server asks before it starts: Situation: the name is unclear."
check "brief (waiting): a recommendation written into the question is found" has "$B" "Recommended: call it ping — say yes to go with it."
check "the answered piece is being made again" has "$B" "Say hi — thinking it through"
rec ping vega flag "still unclear after three rounds: which server?"
check "a flagged piece needs the person, and says so without a recommendation" bash -c "grep -qF 'Ping the server needs you: still unclear after three rounds' <<<\"\$0\" && grep -qF 'No recommendation came with it.' <<<\"\$0\"" "$(brief)"

# --- line is silent where there is no Made Well
mkdir -p "$T/plain"; git init -q "$T/plain"
check "line: silent in a project without Made Well" test -z "$(cd "$T/plain" && "$C" line)"
check "line: silent outside a git repository" test -z "$(cd "$T" && "$C" line)"

# --- the bindings show the same line
check "statusline: Claude Code's JSON in, the line out" test "$(cd / && printf '{"session_id":"s","workspace":{"current_dir":"%s","project_dir":"%s"}}' "$P" "$P" | sh "$ROOT/kernel/bindings/statusline.sh")" = "3 being made · 1 question for you"
check "statusline: the installed copy finds its own constellation" test "$(cd "$P" && echo '{}' | sh .madewell/bindings/statusline.sh)" = "3 being made · 1 question for you"
mkdir -p "$T/a, b"; git clone -q "$P" "$T/a, b/proj" 2>/dev/null
check "statusline: a path with a comma in it" test "$(cd / && printf '{"workspace":{"current_dir":"%s"}}' "$T/a, b/proj" | sh "$ROOT/kernel/bindings/statusline.sh")" = "4 being made"
check "statusline: silent without Made Well" test -z "$(printf '{"workspace":{"current_dir":"%s"}}' "$T/plain" | sh "$ROOT/kernel/bindings/statusline.sh")"
pihost=/; command -v pi >/dev/null && pihost=$(dirname "$(readlink -f "$(command -v pi)")")
while [ "$pihost" != / ] && [ ! -f "$pihost/dist/core/extensions/loader.js" ]; do pihost=$(dirname "$pihost"); done
if [ "$pihost" != / ]; then
  cat >"$T/pi-line.mjs" <<'EOF'
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [host, ext, cwd] = process.argv.slice(2);
const { loadExtensions } = await import(pathToFileURL(join(host, 'dist/core/extensions/loader.js')).href);
const loaded = await loadExtensions([ext], cwd);
if (loaded.errors.length) { console.log('errors', JSON.stringify(loaded.errors)); process.exit(1); }
const shown = [];
const ctx = { cwd, ui: { setWidget: (key, value) => shown.push([key, value]) } };
for (const h of loaded.extensions[0].handlers.get('session_start')) await h({ type: 'session_start' }, ctx);
for (const h of loaded.extensions[0].handlers.get('session_shutdown') ?? []) await h({ type: 'session_shutdown' }, ctx);
console.log(JSON.stringify(shown));
EOF
  echo "     | pi: $(node "$T/pi-line.mjs" "$pihost" "$ROOT/kernel/bindings/constellation-line-pi.ts" "$P" 2>&1)"
  check "pi: the widget shows the line on session start" sh -c "node '$T/pi-line.mjs' '$pihost' '$ROOT/kernel/bindings/constellation-line-pi.ts' '$P' | grep -qF '[[\"constellation\",[\"3 being made · 1 question for you\"]]]'"
  check "pi: no widget without Made Well" sh -c "node '$T/pi-line.mjs' '$pihost' '$ROOT/kernel/bindings/constellation-line-pi.ts' '$T/plain' | grep -qF '[[\"constellation\",null]]'"
else
  printf 'skip pi: the widget (Pi is not installed here)\n'
fi

# --- pause and go show on the front page and the line
"$C" pause >/dev/null
check "line: says when everything is paused" test "$(line)" = "paused · 3 being made · 1 question for you"
check "brief: says when everything is paused, and the word that picks up" has "$(brief)" "Everything is paused: what is being made stops at its next save. Say go to pick up."
"$C" go >/dev/null
check "line: go lifts the pause" test "$(line)" = "3 being made · 1 question for you"

[ $fails -eq 0 ] && echo "constellation-brief: all tests passed" || { echo "constellation-brief: $fails failure(s)"; exit 1; }
