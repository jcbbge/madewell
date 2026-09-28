#!/usr/bin/env bash
# constellation-nested.t.sh — a piece that broke down (bench/<slug>/PIECE.md, with its own stock/,
# bench/ and finished/) is read wherever a leaf piece is: status, next_step, brief, line and tend
# treat it as one piece being made, titled from PIECE.md, with its parts' progress in plain words;
# drained, it reads as ready to finish; an empty scaffold is not listed; take and land still work
# for a leaf beside it. Every move below is a legal one, through the commit gate. Isolated tmux.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-nested-test.XXXXXX")
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
lacks() { ! grep -qF -- "$2" <<<"$1"; }

P=$T/proj; git init -q -b main "$P"; echo 'x' >"$P/README"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm "adopt Constellation"
cd "$P"
floor() { printf '# %s\n\n**Making:** %s\n**Not making:** more\n**Done when:** it exists\n**Waits on:** \n' "$1" "$1"; }
rack() { # rack <dir> <slug> <title> : a piece arrives on the rack at <dir> (.constellation, or a piece's own)
  floor "$3" >"$1/stock/$2.md"; git add "$1/stock/$2.md"; git commit -qm "rack: $2" -m "ACT: ideate
DONE: $2 on the rack
NEXT: —"
}
move() { # move <from> <to> : one legal move, one commit, through the gate
  git mv "$1" "$2" && git commit -qm "move $(basename "$1")" -m "ACT: plan
DONE: moved
NEXT: —"
}
broken() { # broken <slug> <title> : on the rack, then to the bench broken down
  rack .constellation "$1" "$2"
  "$C" move bench "$1" --break >/dev/null && git commit -qm "take $1 to the bench, broken down" -m "ACT: plan
DONE: $1 breaks down
NEXT: —"
}

# --- a leaf, taken as always
rack .constellation greet "Greet the user"
check "take: a leaf still goes to the bench, with its branch" sh -c "'$C' take greet && test -f .constellation/bench/greet.md && git rev-parse --verify piece/greet"
"$C" run greet >/dev/null

# --- a piece that broke down, into eight parts: 3 done, 1 being made, 4 on the rack
broken obs "See everything: one console"
check "the breakdown is a legal move: PIECE.md and its three states, committed" sh -c "test -f .constellation/bench/obs/PIECE.md && test -d .constellation/bench/obs/stock && test -z \"\$(git status --porcelain -- .constellation)\""
O=.constellation/bench/obs
for i in 1 2 3 4 5 6 7 8; do rack "$O" "part$i" "Part $i"; done
for i in 1 2 3 4; do move "$O/stock/part$i.md" "$O/bench/part$i.md"; done
for i in 1 2 3; do move "$O/bench/part$i.md" "$O/finished/part$i.md"; done
check "the parts moved legally (the gate let every one through)" sh -c "test -f $O/finished/part3.md && test -f $O/bench/part4.md && test -f $O/stock/part8.md && test -z \"\$(git status --porcelain -- .constellation)\""
# one depth in: a part that itself broke down (bench/obs/bench/part5/PIECE.md), and an empty scaffold beside it
mkdir -p "$O/bench/part5/stock" "$O/bench/part5/bench" "$O/bench/part5/finished" "$O/bench/gone/stock"
for s in stock bench finished; do touch "$O/bench/part5/$s/.gitkeep"; done; touch "$O/bench/gone/stock/.gitkeep"
git mv "$O/stock/part5.md" "$O/bench/part5/PIECE.md"; git add -f "$O/bench/part5"
check "a part breaks down, one depth in, through the gate" git commit -qm "part5 breaks down" -m "ACT: plan
DONE: part5 breaks down
NEXT: —"
git add -f "$O/bench/gone"; CONSTELLATION_GATE=off git commit -qm "an empty scaffold inside a breakdown"

# --- a piece that broke down and is drained: every part done
broken docs "Write the handbook"
D=.constellation/bench/docs
for i in 1 2; do rack "$D" "ch$i" "Chapter $i"; move "$D/stock/ch$i.md" "$D/bench/ch$i.md"; move "$D/bench/ch$i.md" "$D/finished/ch$i.md"; done

# --- an empty scaffold (no PIECE.md, only .gitkeep), and a finished breakdown's leftover directory
mkdir -p .constellation/bench/stale/stock .constellation/bench/stale/bench .constellation/bench/stale/finished
touch .constellation/bench/stale/stock/.gitkeep .constellation/bench/stale/bench/.gitkeep .constellation/bench/stale/finished/.gitkeep
git add -f .constellation/bench/stale; CONSTELLATION_GATE=off git commit -qm "an empty scaffold, as Arc has"
broken old "An old breakdown"; rack .constellation/bench/old one "One"; move .constellation/bench/old/stock/one.md .constellation/bench/old/bench/one.md
move .constellation/bench/old/bench/one.md .constellation/bench/old/finished/one.md
"$C" move finish old >/dev/null && git commit -qm "finish old" -m "ACT: verify
DONE: old
NEXT: —"
check "a finished breakdown leaves its directory and its record" sh -c "test -f .constellation/finished/old.md && test -f .constellation/bench/old/finished/one.md && test ! -e .constellation/bench/old/PIECE.md"

# --- status and next_step
S=$("$C" status 2>&1); printf '%s\n' "$S" | sed 's/^/     | /'
check "status: the leaf is listed" has "$S" "greet"
check "status: the piece that broke down is listed, with its progress" bash -c 'grep -E "^obs +parts +3 of 8 parts done, 2 being made$" <<<"$1"' _ "$S"
check "status (next_step): a drained breakdown is ready to finish" bash -c 'grep -E "^docs +finish +2 of 2 parts done$" <<<"$1"' _ "$S"
check "status: an empty scaffold is not listed" lacks "$S" "stale"
check "status: a finished breakdown's leftover directory is not listed" bash -c '! grep -qE "^old " <<<"$1"' _ "$S"
check "status <slug>: where it is, in parts" has "$("$C" status obs 2>&1)" "obs — on the bench, in parts: 3 of 8 parts done, 2 being made"
check "status <slug>: its next is its parts" has "$("$C" status obs 2>&1)" "next: parts"
check "status <slug>: a drained one's next is finish" has "$("$C" status docs 2>&1)" "next: finish"
check "status <slug>: a finished breakdown is finished" has "$("$C" status old 2>&1)" "old — finished"
check "status <slug>: an empty scaffold is not on the bench" has "$("$C" status stale 2>&1)" "stale — not on the bench"

# --- brief and line
B=$("$C" brief 2>&1); printf '%s\n' "$B" | sed 's/^/     | /'
check "brief: titled from PIECE.md's first heading, with how far along its parts are" has "$B" "See everything: one console — 3 of 8 parts done, 2 being made"
check "brief: a drained breakdown reads as ready to finish" has "$B" "Write the handbook — 2 of 2 parts done, ready to finish"
check "brief: the leaf is still being made beside them" has "$B" "Greet the user — thinking it through"
check "brief: an empty scaffold is not being made" bash -c '! grep -qiE "stale|An old breakdown —" <<<"$1"' _ "$B"
check "brief speaks plain words: no star or engine names" bash -c '! grep -qiE "vega|polaris|cassiopeia|sirius|orion|aldebaran|bench|stock|PIECE|parts:" <<<"$1"' _ "$B"
check "line: every piece being made, the broken-down ones too" test "$("$C" line 2>&1)" = "3 being made"

# --- tend: passes over a breakdown, and still restarts a leaf whose agent is gone
tmux kill-window -t "=workers:=greet·vega" 2>/dev/null
N=$("$C" tend 2>&1); printf '%s\n' "$N" | sed 's/^/     | /'
check "tend: the leaf whose window closed starts again" has "$N" "greet: thinking it through stopped (its window closed)"
check "tend: a piece that broke down is never restarted" bash -c '! grep -qE "^(obs|docs|bare|stale):" <<<"$1"' _ "$N"
check "tend: nothing else to say about the breakdowns on a second pass" test -z "$("$C" tend 2>&1)"

# --- finishing the drained breakdown: it leaves the bench and is done
sleep 1; "$C" move finish docs >/dev/null && git commit -qm "finish docs" -m "ACT: verify
DONE: docs
NEXT: —"
check "finish: the drained breakdown's move is legal" test -f .constellation/finished/docs.md
check "brief: the finished breakdown is done, and no longer being made" bash -c 'grep -qF "Write the handbook is done" <<<"$1" && ! grep -qF "Write the handbook —" <<<"$1"' _ "$("$C" brief 2>&1)"

# --- land: a leaf still lands, with breakdowns on the bench beside it
rec() { git -C "$T/state/proj/$1" -c core.hooksPath=/dev/null commit -q --allow-empty -m "run($1): $2 $3

ACT: verify
STAR: $2
STEP: $2
EVENT: $3
HARNESS: claude
DONE: $4
NEXT: -"; }
rec greet aldebaran done "the checks pass"
check "status: the leaf that passed is ready to land" bash -c 'grep -E "^greet +land " <<<"$1"' _ "$("$C" status 2>&1)"
check "land: the leaf lands, bench → finished" sh -c "'$C' land greet && test -f .constellation/finished/greet.md && test ! -e .constellation/bench/greet.md"
check "land: the breakdowns stay on the bench, untouched" sh -c "test -f .constellation/bench/obs/PIECE.md && test -f $O/bench/part4.md"
check "line: the breakdown is what is left being made" test "$("$C" line 2>&1)" = "1 being made"

# --- a PIECE.md with no heading is named by its slug
broken bare "Bare"; sed -i '1d' .constellation/bench/bare/PIECE.md; git commit -qam "bare: no heading" -m "ACT: plan
DONE: —
NEXT: —" 2>/dev/null || CONSTELLATION_GATE=off git commit -qam "bare: no heading"
check "brief: a PIECE.md with no heading is named by its slug" has "$("$C" brief 2>&1)" "bare — not broken into parts yet"
check "status: a breakdown with no parts yet is still being made" bash -c 'grep -E "^bare +parts +not broken into parts yet$" <<<"$1"' _ "$("$C" status 2>&1)"
check "line: a breakdown with no parts yet counts as being made" test "$("$C" line 2>&1)" = "2 being made"

[ $fails -eq 0 ] && echo "constellation-nested: all tests passed" || { echo "constellation-nested: $fails failure(s)"; exit 1; }
