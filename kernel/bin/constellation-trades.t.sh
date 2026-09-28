#!/usr/bin/env bash
# constellation-trades.t.sh — the trade seam against a scratch project with the kernel installed:
# the six stars speak only of the piece and the check; each trade's overlays reach the briefs;
# the write rules come from the active trade (dev refuses Sirius writing a test, marketing and
# sales guard their own checks); `constellation trade` prints the trade and sets it by reference
# in the loader; a named trade that is missing, or one with no rules, is said out loud.
# The test plays each star by calling `constellation done` the way an agent would.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-trades-test.XXXXXX")
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
lacks() { ! grep -qF -- "$1" "$2"; }

STARS="vega polaris cassiopeia sirius orion aldebaran"
check "the six stars never speak of code or tests" sh -c "! grep -iE 'code|test' '$ROOT'/kernel/stars/*.md"
check "the maker and the check designer speak of the check" sh -c "grep -q 'the check' '$ROOT/kernel/stars/sirius.md' && grep -q 'the check' '$ROOT/kernel/stars/orion.md'"
for t in dev marketing sales; do
  check "the $t trade has an overlay for every star" sh -c "for s in $STARS; do test -f '$ROOT/trades/$t/stars/'\$s.md || exit 1; done"
done

P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"

wt() { printf '%s/state/%s/%s' "$T" "$(basename "$P")" "$1"; }
brief() { printf '%s/state/%s/%s.%s.brief.md' "$T" "$(basename "$P")" "$1" "$2"; }
op() { (unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_BASE CONSTELLATION_REPO; "$C" "$@"); }  # the operator, outside any step
as() { export CONSTELLATION_PIECE=$1 CONSTELLATION_STEP=$2 CONSTELLATION_REPO=$P CONSTELLATION_HARNESS=claude CONSTELLATION_BASE; CONSTELLATION_BASE=$(git -C "$(wt "$1")" rev-parse HEAD); }
put() { local w; w=$(wt "$1"); mkdir -p "$w/$(dirname "$2")"; echo "$1" >>"$w/$2"; git -C "$w" add -- "$2"; git -C "$w" commit -qm "add $2"; }
undo() { git -C "$(wt "$1")" reset -q --hard HEAD~1; }
rack() { # rack <slug> : a piece with its floor, taken and started (vega runs)
  printf '# %s\n\n**Making:** %s\n**Not making:** -\n**Done when:** it exists\n**Waits on:** \n' "$1" "$1" >".madewell/stock/$1.md"
  git add ".madewell/stock/$1.md"; git commit -qm "rack: $1"; op take "$1" >/dev/null; op run "$1" >/dev/null
}
to_sirius() { local s; for s in vega polaris-peer cassiopeia; do as "$1" "$s"; "$C" clear >/dev/null; "$C" done "$s: handed off" >/dev/null; done; as "$1" sirius; "$C" clear >/dev/null; }

# --- dev, the default ----------------------------------------------------------------------
check "constellation trade prints dev when the project names none" sh -c "'$C' trade | grep -q '^dev — the default'"
rack greet
check "vega's brief carries the dev overlay" grep -qF "In this trade: dev" "$(brief greet vega)"
check "the dev overlay says what the thing and the check are" grep -qF "the thing being made is code, and the check is its tests" "$(brief greet vega)"
check "vega's brief carries no other trade's words" lacks "the draft" "$(brief greet vega)"
to_sirius greet
check "cassiopeia's brief names repo search and the test paths" sh -c "grep -qF 'Search the repo' '$(brief greet cassiopeia)' && grep -qF 'the test paths are' '$(brief greet cassiopeia)'"
check "cassiopeia's brief adds the dev skills" grep -qF "This trade's skills, if your harness has them: sitting." "$(brief greet cassiopeia)"
check "sirius's brief ends the handoff with the line the receipt reads" sh -c "grep -qF 'To see it: <what they open or do' '$(brief greet sirius)' && grep -qF 'End the handoff with \"To see it:\"' '$(brief greet sirius)'"
check "sirius's brief is the kernel star, then the dev overlay" sh -c "grep -qF 'Sirius — the maker' '$(brief greet sirius)' && grep -qF 'Write code only' '$(brief greet sirius)'"
put greet tests/greet.test.js
check "dev: sirius writing a test is refused, in today's words" says "sirius never touches tests; these are tests: tests/greet.test.js" "$C" done "built"
undo greet
for f in src/greet.spec.ts src/greet_test.go spec/greet.rb; do
  put greet "$f"; check "dev: sirius writing $f is refused" says "sirius never touches tests" "$C" done "built"; undo greet
done

# --- marketing, set by name ----------------------------------------------------------------
check "constellation trade marketing sets it" sh -c "'$C' trade marketing | grep -q '^marketing — named in AGENTS.md CLAUDE.md'"
check "the loader names the trade by reference, in both entrypoints" sh -c "for f in AGENTS.md CLAUDE.md; do grep -qF 'read and follow .madewell/HOST.md and $ROOT/trades/marketing/TRADE.md before anything else' \$f || exit 1; done"
check "setting it commits the loader, and nothing else" sh -c "test -z \"\$(git status --porcelain --untracked-files=no)\" && git log -1 --format=%s | grep -q '^chore(trade)' && test \"\$(git show --name-only --format= HEAD | sort | tr '\n' ' ')\" = 'AGENTS.md CLAUDE.md '"
check "constellation trade prints marketing, and where it is named" sh -c "'$C' trade | grep -q '^marketing — named in AGENTS.md'"
check "setting the same trade again changes nothing" sh -c "h=\$(git rev-parse HEAD); '$C' trade marketing >/dev/null && test \"\$(git rev-parse HEAD)\" = \"\$h\""
put greet reviews/greet.review.md
check "marketing: sirius writing the review is refused" says "sirius never writes the review; these are review files: reviews/greet.review.md" "$C" done "drafted"
undo greet
put greet tests/greet.test.js
check "marketing: a tests/ file is not the check here, so sirius may hand it off" "$C" done "drafted"
check "orion's brief carries the marketing overlay, not dev's" sh -c "grep -qF 'brand and audience review' '$(brief greet orion)' && ! grep -qF 'test framework' '$(brief greet orion)' && grep -qF 'skills/message-test.md' '$(brief greet orion)'"
as greet orion; "$C" clear >/dev/null
put greet drafts/greet.md
check "marketing: orion writing the draft is refused" says "orion writes only the review; these are not review files: drafts/greet.md" "$C" done "review"
undo greet
put greet reviews/greet.review.md
check "marketing: orion hands off the review" "$C" done "the review of greet"
check "aldebaran's brief carries the marketing overlay" grep -qF "Run the review against the draft" "$(brief greet aldebaran)"

# --- sales, set by path --------------------------------------------------------------------
check "constellation trade <path> sets it" sh -c "'$C' trade '$ROOT/trades/sales' | grep -q '^sales — named in'"
check "constellation trade prints sales" sh -c "'$C' trade | grep -q '^sales — named in AGENTS.md'"
rack offer
check "vega's brief speaks of the proposal and the deal checklist" grep -qF "the thing being made is the proposal, and the check is the deal checklist" "$(brief offer vega)"
as offer vega; "$C" clear >/dev/null; put offer notes.md
check "sales: vega still commits nothing, in every trade" says "vega changes nothing, but it committed" "$C" done "understood"
undo offer; "$C" done "understood" >/dev/null
for s in polaris-peer cassiopeia; do as offer "$s"; "$C" clear >/dev/null; "$C" done "$s: handed off" >/dev/null; done
as offer sirius; "$C" clear >/dev/null
put offer checklists/offer.md
check "sales: sirius writing the deal checklist is refused" says "sirius never writes the deal checklist; these are checklist files: checklists/offer.md" "$C" done "proposed"
undo offer
put offer proposal.md
check "sales: sirius hands off the proposal" "$C" done "proposed"
as offer orion; "$C" clear >/dev/null
put offer proposal.md
check "sales: orion editing the proposal is refused" says "orion writes only the deal checklist; these are not checklist files: proposal.md" "$C" done "checklist"
undo offer
put offer offer.checklist.md
check "sales: orion hands off the checklist" "$C" done "the deal checklist"

# --- back to dev, then a trade that is not here, then one with no rules -----------------------
check "constellation trade dev sets it back" sh -c "'$C' trade dev | grep -q '^dev — named in'"
rack third; to_sirius third
put third src/third.test.js
check "dev, named: sirius writing a test is still refused" says "sirius never touches tests; these are tests: src/third.test.js" "$C" done "built"
undo third
check "an unknown trade is refused, naming the ones there are" says "no trade named nope here; these are: dev, marketing, sales" op trade nope
check "a folder with no TRADE.md is not a trade" refused op trade "$P/src"
for f in AGENTS.md CLAUDE.md; do sed -i.bak "s#$ROOT/trades/dev/TRADE.md#/nowhere/trades/ghost/TRADE.md#" "$f" && rm -f "$f.bak"; done
git commit -qm "loader: a trade from elsewhere" -- AGENTS.md CLAUDE.md
check "a named trade that is not on this machine is said, not guessed" says "the ghost trade named in AGENTS.md is not on this machine" op trade
put third src/third.js
check "a star that writes cannot hand off while its trade is missing" says "the ghost trade that says what it may write is not on this machine" "$C" done "built"
mkdir -p trades/bare; printf '# Bare\n' >trades/bare/TRADE.md; git add trades; git commit -qm "a trade with no stars"
check "a trade inside the project is named relative to it" sh -c "'$C' trade bare >/dev/null && grep -qF 'read and follow .madewell/HOST.md and trades/bare/TRADE.md before' AGENTS.md"
check "a trade with no write rule says the stop is missing" says "UNJIGGED: the bare trade names no write rule for sirius" "$C" done "built"
mkdir -p trades/bare/stars; printf '# Orion, bare\nwrites-only: (reviews\n---\n' >trades/bare/stars/orion.md; git add trades; git commit -qm "a broken rule"
as third orion; "$C" clear >/dev/null; put third notes/third.md
check "a rule grep cannot read refuses, it does not pass" says "the bare trade's write rule for orion is not a pattern grep can read" "$C" done "checked"
printf '# Orion, bare\nwrites-only: ^checks/\n---\n' >trades/bare/stars/orion.md; git add trades; git commit -qm "a rule with no words"
check "a rule with no refusal words still names the paths" says "orion changes only what the bare trade allows it; these are not: notes/third.md" "$C" done "checked"

# --- an installed project: its own driver, no reference, no package beside it ----------------
P=$T/solo; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
git -C "$P" add -A; MW_GATE=off git -C "$P" commit -qm "adopt Made Well"
cd "$P"; C=$P/.madewell/bin/constellation
check "the installed kernel carries the trades" test -f "$P/.madewell/trades/dev/stars/sirius.md"
check "installed, no reference: constellation trade finds dev in the kernel" says "dev — the default (this project names no trade); its files are in $P/.madewell/trades/dev" op trade
rack solo; to_sirius solo
check "installed: sirius's brief carries the dev overlay" grep -qF "In this trade: dev" "$(brief solo sirius)"
put solo tests/solo.test.js
check "installed: dev still refuses sirius writing a test" says "sirius never touches tests; these are tests: tests/solo.test.js" "$C" done "built"
undo solo; put solo src/solo.js
check "installed: sirius hands off the code, with no word of a missing trade" sh -c "out=\$('$C' done 'built. To see it: import solo' 2>&1) && ! printf '%s' \"\$out\" | grep -qE 'not on this machine|UNJIGGED'"
as solo orion; "$C" clear >/dev/null; put solo tests/solo.test.js
check "installed: orion hands off the tests" "$C" done "tests/solo.test.js"

[ "$fails" = 0 ] && echo "constellation-trades: all tests passed" || { echo "constellation-trades: $fails failed"; exit 1; }
