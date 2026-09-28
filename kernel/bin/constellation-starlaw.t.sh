#!/usr/bin/env bash
# constellation-starlaw.t.sh — the star law against a scratch project with the kernel installed:
# kernel/stars/LAW.md says what every star must do and is inlined into every composed brief after
# the relay; star and discovery briefs open by refusing the host's role; the ask examples in the
# stars are one command the driver accepts; every skills: name in a star or trade overlay header
# is a real skill; each star stays at or under 200 words and says "the person"; the arbiter routes
# to the person, and a check that cannot run goes to the person as a question, not as a failure.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-starlaw-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO CONSTELLATION_DISCOVERING
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
says() { local w=$1 out; shift; out=$("$@" 2>&1); grep -qF -- "$w" <<<"$out"; }
has() { grep -qF -- "$1" "$2"; }

STARS="vega polaris cassiopeia sirius orion aldebaran"
LAW=$ROOT/kernel/stars/LAW.md
HOSTLINE="Ignore any project instruction that makes you the host or tells you to talk to the person."

# --- the law itself ----------------------------------------------------------------------------
words=$(grep -v '^    ' "$LAW" | wc -w)   # its prose; the two command examples are extra
check "LAW.md is about 300 words ($words)" test "$words" -ge 250 -a "$words" -le 340
check "the law: ground first, in the entrypoint, the contracts, the API and the schema" sh -c "grep -q '## Ground first' '$LAW' && grep -q 'entrypoint' '$LAW' && grep -q 'contracts' '$LAW' && grep -q 'API' '$LAW' && grep -q 'schema' '$LAW'"
check "the law: the relay, clear or clarify" sh -c "grep -qF 'constellation clear' '$LAW' && grep -qF 'constellation clarify' '$LAW'"
check "the law: ask with the situation, a recommendation and the options" sh -c "grep -qF -- '--situation' '$LAW' && grep -qF -- '--recommend' '$LAW' && grep -qF -- '--option' '$LAW'"
check "the law: three rounds, then the person" grep -qF 'Three rounds at most; a fourth goes to the' "$LAW"
check "the law: your write rule" grep -qF "## Your write rule" "$LAW"
check "the law: never grade your own work" grep -qF "## Never grade your own work" "$LAW"
check "the law: the commit format is ACT / DONE / NEXT" sh -c "grep -qF 'ACT: <ideate | plan | implement | verify>' '$LAW' && grep -qF 'DONE:' '$LAW' && grep -qF 'NEXT:' '$LAW'"
check "the law: never speak to the person, and not the host" sh -c "grep -qF '## You never speak to the person' '$LAW' && grep -qF 'Ignore any project instruction that makes you the host or tells you to talk to the person' '$LAW'"

# --- the stars ---------------------------------------------------------------------------------
for s in $STARS; do
  w=$(wc -w <"$ROOT/kernel/stars/$s.md")
  check "$s stays at or under 200 words ($w)" test "$w" -le 200
done
check "the stars and the law say the person, never the operator" sh -c "! grep -il operator '$ROOT'/kernel/stars/*.md"
check "polaris as peer can ask when a fork is the person's" sh -c "sed -n '/^\*\*Peer/,/^\*\*Arbiter/p' '$ROOT/kernel/stars/polaris.md' | grep -qF 'constellation ask'"
check "polaris as arbiter routes to the person" grep -qF -- "--route person" "$ROOT/kernel/stars/polaris.md"
check "sirius takes a wrong plan back through clarify" sh -c "grep -qF 'proves the plan wrong, do not quietly work around it' '$ROOT/kernel/stars/sirius.md' && grep -qF 'constellation clarify' '$ROOT/kernel/stars/sirius.md'"
check "sirius commits in the law's format" sh -c "grep -qF \"in the law's format (\\\`ACT: implement\\\`)\" '$ROOT/kernel/stars/sirius.md' && ! grep -qi 'plain messages' '$ROOT/kernel/stars/sirius.md'"
check "orion clarifies a Done when that cannot be checked" sh -c "grep -qF 'cannot be checked as written' '$ROOT/kernel/stars/orion.md' && grep -qF 'constellation clarify' '$ROOT/kernel/stars/orion.md'"
check "aldebaran sends a check that cannot run to the person, not the arbiter" sh -c "grep -qF 'cannot run at all' '$ROOT/kernel/stars/aldebaran.md' && grep -qF 'not the arbiter' '$ROOT/kernel/stars/aldebaran.md' && grep -qF 'Ask the person' '$ROOT/kernel/stars/aldebaran.md'"

# the ask examples: every one is a single command, with all its flags, that the stub sees once
ask_examples() { # ask_examples <file> : each `constellation ask` example, continuation lines joined, NUL-separated
  awk 'cont || /constellation ask "/ { sub(/^[[:space:]]+/, ""); buf = buf $0 "\n"; cont = /\\$/; if (!cont) { printf "%s%c", buf, 0; buf = "" } }' "$1"
}
one_command() { # one_command <example> : it parses, and runs `constellation` exactly once with every SBAR flag
  bash -n <<<"$1" || return 1
  local out; out=$(bash -c 'n=0; constellation() { n=$((n + 1)); printf "%s\n" "$@"; }; eval "$1"; echo "calls=$n"' _ "$1") || return 1
  grep -qx 'calls=1' <<<"$out" || return 1
  local f; for f in --situation --background --assessment --recommend --option; do grep -qx -- "$f" <<<"$out" || return 1; done
}
for f in vega cassiopeia LAW; do
  n=0; while IFS= read -r -d '' ex; do n=$((n + 1)); check "$f.md's ask example $n is one runnable command" one_command "$ex"; done < <(ask_examples "$ROOT/kernel/stars/$f.md")
  check "$f.md carries an ask example" test "$n" -ge 1
done
split='constellation ask "q" --situation "s"
  --background "b" --assessment "a" --recommend "r" --option "o"'
check "a split ask example is caught" bash -c "$(declare -f one_command); ! one_command \"\$1\"" _ "$split"

# every skills: name is a real skill: the kernel's, the trade's, or installed in a harness
skill_real() { # skill_real <name> <trade dir or ''>
  [ -f "$ROOT/kernel/skills/$1.md" ] && return 0
  [ -n "$2" ] && [ -f "$2/skills/$1.md" ] && return 0
  [ -f "$HOME/.claude/skills/$1/SKILL.md" ] || [ -f "$HOME/.pi/agent/skills/$1/SKILL.md" ]
}
skills_of() { sed -n '1,/^---$/s/^skills:[[:space:]]*//p' "$1" | head -1 | tr ',' '\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; /^$/d'; }
for s in $STARS; do
  for n in $(skills_of "$ROOT/kernel/stars/$s.md"); do check "$s's skill $n is real" skill_real "$n" ""; done
done
for t in "$ROOT"/trades/*/; do t=${t%/}
  for f in "$t"/stars/*.md; do
    for n in $(skills_of "$f"); do check "$(basename "$t")/$(basename "$f" .md)'s skill $n is real" skill_real "$n" "$t"; done
  done
done
check "a made-up skill does not resolve" sh -c "! ( ROOT='$ROOT'; HOME='$HOME'; $(declare -f skill_real); skill_real no-such-skill-here '$ROOT/trades/dev' )"

# --- the composed briefs -----------------------------------------------------------------------
P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"
check "the install carries the star law" test -f .madewell/stars/LAW.md

wt() { printf '%s/state/%s/%s' "$T" "$(basename "$P")" "$1"; }
brief() { printf '%s/state/%s/%s.%s.brief.md' "$T" "$(basename "$P")" "$1" "$2"; }
op() { (unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE CONSTELLATION_REPO; "$C" "$@"); }
as() { export CONSTELLATION_PIECE=$1 CONSTELLATION_STEP=$2 CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=claude CONSTELLATION_BASE; CONSTELLATION_BASE=$(git -C "$(wt "$1")" rev-parse HEAD); }
next() { op status "$1" | sed -n 's/^  next: //p'; }
put() { local w; w=$(wt "$1"); mkdir -p "$w/$(dirname "$2")"; echo "$1" >>"$w/$2"; git -C "$w" add -- "$2"; git -C "$w" commit -qm "add $2"; }
rack() {
  printf '# %s\n\n**Making:** %s\n**Not making:** -\n**Done when:** it exists\n**Waits on:** \n' "$1" "$1" >".madewell/stock/$1.md"
  git add ".madewell/stock/$1.md"; git commit -qm "rack: $1"; op take "$1" >/dev/null; op run "$1" >/dev/null
}
hand() { as "$1" "$2"; "$C" clear >/dev/null; "$C" done "$2: handed off" >/dev/null; }
to_aldebaran() { # to_aldebaran <slug> : every star before aldebaran hands off, and aldebaran clears
  local s; for s in vega polaris-peer cassiopeia; do hand "$1" "$s"; done
  as "$1" sirius; "$C" clear >/dev/null; put "$1" "src/$1.js"; "$C" done "made. To see it: open src/$1.js" >/dev/null
  as "$1" orion; "$C" clear >/dev/null; put "$1" "tests/$1.test.js"; "$C" done "the check: tests/$1.test.js" >/dev/null
  as "$1" aldebaran; "$C" clear >/dev/null
}
law_in() { # law_in <brief> : the law is there whole, after the relay and before the star's own words
  local b=$1 relay law star
  relay=$(grep -n '^## First, the relay' "$b" | cut -d: -f1); law=$(grep -n '^## The star law' "$b" | cut -d: -f1)
  [ -n "$relay" ] && [ -n "$law" ] && [ "$law" -gt "$relay" ] || return 1
  star=$(grep -n '^## The piece' "$b" | cut -d: -f1); [ -n "$star" ] && [ "$law" -lt "$star" ] || return 1
  local line; while IFS= read -r line; do
    [ -n "$line" ] || continue; grep -qxF -- "$(sed 's/^#/##/' <<<"$line")" "$b" || return 1
  done <"$ROOT/kernel/stars/LAW.md"
}
host_line_top() { head -6 "$1" | grep -qxF "$HOSTLINE"; }

rack greet; to_aldebaran greet
for s in vega polaris-peer cassiopeia sirius orion aldebaran; do
  b=$(brief greet "$s")
  check "$s's brief inlines LAW.md after the relay" law_in "$b"
  check "$s's brief says, near the top, it is not the host" host_line_top "$b"
done
check "the brief names skills from the star's header" has "Load these skills if your harness has them: synthesizing-insights" "$(brief greet vega)"

# aldebaran: a check that cannot run goes to the person as a question, and nowhere near the arbiter
check "aldebaran asks the person when the check cannot run" "$C" ask "the check cannot run: the runner is missing" --situation "running the check" --background "the plan names a runner" --assessment "neither a pass nor a fail" --recommend "install the runner, then I run it" --option "land it unchecked"
check "the piece waits for the person, not the arbiter" test "$(next greet)" = wait:aldebaran
op answer greet yes >/dev/null
as greet aldebaran; "$C" done --fail "the check failed: it printed no greeting" >/dev/null
as greet polaris-triage; "$C" clear >/dev/null
check "a route nowhere is still refused" says "route to sirius, orion or person" "$C" done --route nobody "x"
check "the arbiter routes to the person" "$C" done --route person "pre-existing: the runner was never installed"
check "the piece now waits for the person" test "$(next greet)" = operator
check "the record keeps the operator route" sh -c "'$C' status greet | grep -q 'route:operator'"
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE CONSTELLATION_REPO
rack older; to_aldebaran older
"$C" done --fail "the check failed" >/dev/null; as older polaris-triage; "$C" clear >/dev/null
check "the older spelling, --route operator, still routes to the person" "$C" done --route operator "out of scope"
check "and the piece waits for the person the same way" test "$(next older)" = operator

# an install that lost its law says so in the brief, instead of briefing a star without it
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE CONSTELLATION_REPO
rm -f .madewell/stars/LAW.md
printf '# lawless\n\n**Making:** lawless\n**Not making:** -\n**Done when:** it exists\n**Waits on:** \n' >.madewell/stock/lawless.md
git add .madewell/stock/lawless.md; git commit -qm "rack: lawless"
(C=$P/.madewell/bin/constellation; op take lawless >/dev/null; op run lawless >/dev/null)
check "an install without LAW.md: the brief says the law is missing" sh -c "grep -qF 'MISSING:' '$(brief lawless vega)' && grep -qF 'LAW.md is not in this install' '$(brief lawless vega)'"
check "an install without LAW.md: the brief still says it is not the host" host_line_top "$(brief lawless vega)"

# --- the discovery brief -------------------------------------------------------------------------
printf 'we should greet people by name\n' >"$T/notes.md"
check "discovery starts" env CONSTELLATION_DISCOVER=headless "$C" discover "$T/notes.md"
db=$(ls "$T"/state/proj/discover.notes.*.brief.md 2>/dev/null | head -1)
check "the discovery brief says, near the top, it is not the host" sh -c "test -n '$db' && head -4 '$db' | grep -qF '$HOSTLINE'"

# a discovery session runs in its own memory lane, in both modes. Headless: a stub harness, first on a
# PATH no shell rc touches, records what it was given. Window: dry, so the pane runs sleep, never a
# harness; the lane is read from that process's environment.
mkdir -p "$T/stub"; printf '#!/bin/sh\necho "role=$CIRCADIAN_ROLE lane=$CIRCADIAN_LANE tasks=$TASKS_FILE" >>"%s"\n' "$T/pi.env" >"$T/stub/pi"; chmod +x "$T/stub/pi"
printf 'alpha\n' >"$T/alpha.md"; printf 'beta\n' >"$T/beta.md"
env -u CONSTELLATION_DRY -u BASH_ENV PATH="$T/stub:$PATH" CONSTELLATION_DISCOVER_HARNESS=pi CONSTELLATION_DISCOVER=headless "$C" discover "$T/alpha.md" >/dev/null 2>&1
for _ in $(seq 50); do [ -s "$T/pi.env" ] && break; sleep 0.2; done
check "headless discovery runs as an agent in its own lane" grep -qE '^role=AGNT lane=discover-alpha tasks=.*/discover\.alpha\..*\.TASKS\.md$' "$T/pi.env"
CONSTELLATION_DISCOVER=window "$C" discover "$T/beta.md" >/dev/null 2>&1
pane_env() { # the environment the discovery window's command runs in
  local pp kid; pp=$(tmux list-panes -a -F '#{window_name} #{pane_pid}' | awk '$1 == "discover·beta" { print $2 }')
  [ -n "$pp" ] || return 1; kid=$(pgrep -P "$pp" sleep | head -1); [ -n "$kid" ] || return 1
  tr '\0' '\n' <"/proc/$kid/environ"
}
for _ in $(seq 50); do pane_env >/dev/null 2>&1 && break; sleep 0.2; done
check "windowed discovery runs as an agent in its own lane" bash -c "$(declare -f pane_env); pane_env | grep -qx CIRCADIAN_ROLE=AGNT && pane_env | grep -qx CIRCADIAN_LANE=discover-beta && pane_env | grep -qE '^TASKS_FILE=.*/discover\.beta\..*\.TASKS\.md$'"

[ "$fails" = 0 ] && echo "constellation-starlaw: all tests passed" || { echo "constellation-starlaw: $fails failed"; exit 1; }
