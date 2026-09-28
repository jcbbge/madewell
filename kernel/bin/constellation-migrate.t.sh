#!/usr/bin/env bash
# constellation-migrate.t.sh — a project set up before the rename moves itself over on the next
# `constellation adopt`: the old install is made by the real installer of the last commit before the
# rename (old folder, loader, gitignore block, hook blocks in a tracked core.hooksPath, a trade named in
# the loader, a piece on the rack and one on the bench, the project's own setup script and ledgers).
# After adopt every piece is where it was, the move is staged and not committed, the printed commit
# lands it, the old name is gone outside git history, and a second run changes nothing.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-migrate-test.XXXXXX")
sock=$T/tmux.sock; tmux -S "$sock" new-session -d -s workers -n _ 'sleep 3600'
export TMUX="$sock,1,0" CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1 CONSTELLATION_TMUX_SESSION=workers
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
has() { grep -qF -- "$1" <<<"$2"; }            # has <text> <output>
lacks() { ! grep -qF -- "$1" <<<"$2"; }        # lacks <text> <output>

# The retired name, spelled in parts so the one search for it finds only history.
OLD=made''well; OLD_UP=MADE''WELL; OLD_MARK="MADE"" WELL"
OLDREV=b183de3   # the last commit of the package before the rename
residue() { (cd "$1" && grep -rIil -e "$OLD" -e "$OLD_MARK" --exclude-dir=.git . ; git config --list --local | grep -i "$OLD") 2>/dev/null; }
snapshot() { (cd "$1" && find . -path ./.git -prune -o -type f ! -name VERSION -print | sort | xargs sha1sum; git status --porcelain; git log --oneline | wc -l); }

mkdir -p "$T/old"
git -C "$ROOT" archive "$OLDREV" 2>/dev/null | tar -x -C "$T/old" 2>/dev/null
[ -f "$T/old/install.sh" ] || { echo "constellation-migrate: the package before the rename ($OLDREV) is not in this clone's history"; exit 1; }

# --- an old install: tracked hooks in .githooks, a trade in the loader, pieces, the project's own files
P=$T/proj; mkdir -p "$P/.githooks"; git init -q -b main "$P"; cd "$P"
printf '# Our notes for agents\n\nBe kind.\n' >CLAUDE.md
printf '#!/bin/sh\necho our own pre-commit\n' >.githooks/pre-commit; chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
printf 'node_modules/\n' >.gitignore
git add -A; git commit -qm init
sh "$T/old/install.sh" "$P" >/dev/null 2>&1
".$OLD/bin/constellation" trade marketing >/dev/null 2>&1   # the installed copy names the installed trade
printf '#!/bin/sh\n# prepare a worktree\ncp .%s/PRODUCT.md "$1/"\n' "$OLD" >".$OLD/setup"; chmod +x ".$OLD/setup"
git add -A; MW_GATE=off git commit -qm "adopt the old install"
printf '# An idea\n\nSee .%s/stock/idea.md and the other one.\n' "$OLD" >".$OLD/stock/idea.md"
printf '# Work\n\n**Making:** a thing\n**Not making:** another\n**Done when:** it is there\n**Waits on:** \n' >".$OLD/stock/work.md"
git add -A; git commit -qm "rack: idea, work"
git mv ".$OLD/stock/work.md" ".$OLD/bench/work.md"; git commit -qm "bench: work"
printf '{"ts":"t","sha":"s","jig":"mw-gate","mode":"block","exit":1,"violations_caught":1}\n' >".$OLD/jig/firings.jsonl"   # an ignored ledger
mkdir -p ".$OLD/sessions"; printf '{"schema": "%s.session/v1", "id": "s1", "piece": ".%s/stock/idea.md"}\n' "$OLD" "$OLD" >".$OLD/sessions/s1.json"   # an ignored session record
work_sum=$(sha1sum <".$OLD/bench/work.md")
before=$(git rev-parse HEAD)
check "fixture: the old install is what the old installer made" sh -c "test -f '.$OLD/VERSION' && grep -qF '<!-- $OLD_MARK — loader -->' CLAUDE.md && grep -qF '# $OLD_MARK — begin' .gitignore && grep -qxF '# $OLD_MARK — begin' .githooks/pre-commit && grep -qF '.$OLD/trades/marketing/TRADE.md' AGENTS.md && git ls-files --error-unmatch '.$OLD/bench/work.md'"

# --- adopt from the new package moves it over
out=$("$C" adopt "$P" 2>"$T/err"); rc=$?; err=$(cat "$T/err")
check "adopt succeeds on an old install" test "$rc" = 0
check "the old folder is gone and the new one holds the framework" sh -c "test ! -e '.$OLD' && test -x .constellation/bin/cst-gate.sh && test -x .constellation/bin/constellation && head -1 .constellation/VERSION | grep -q '^constellation '"
check "the rack keeps its piece" test -f .constellation/stock/idea.md
check "the bench keeps its piece, word for word" test "$(sha1sum <.constellation/bench/work.md)" = "$work_sum"
check "the move is staged as renames, not committed" sh -c "test \"\$(git rev-parse HEAD)\" = '$before' && git diff --cached --name-status -M | grep -q '^R.*\.$OLD/bench/work.md.*\.constellation/bench/work.md'"
check "a path to the old folder inside a piece now points at the new one" grep -qF 'See .constellation/stock/idea.md' .constellation/stock/idea.md
check "the project's own setup moved, points at the new folder, and still runs" sh -c "test -x .constellation/setup && grep -qF 'cp .constellation/PRODUCT.md' .constellation/setup"
check "an ignored ledger moved with it and names the new gate" grep -qF '"jig":"cst-gate"' .constellation/jig/firings.jsonl
check "a session record moved and carries the new schema and path" grep -qF '{"schema": "constellation.session/v1", "id": "s1", "piece": ".constellation/stock/idea.md"}' .constellation/sessions/s1.json
check "the root document has the new name" sh -c "test -f CONSTELLATION.md && test ! -e $OLD_UP.md"
check "loader: the new markers, the new folder, the trade kept, the project's own words kept" sh -c "grep -qxF '<!-- CONSTELLATION — loader -->' CLAUDE.md && grep -qxF '<!-- /CONSTELLATION -->' CLAUDE.md && grep -qF '.constellation/HOST.md and .constellation/trades/marketing/TRADE.md' CLAUDE.md && grep -qF 'Be kind.' CLAUDE.md && grep -qF '.constellation/trades/marketing/TRADE.md' AGENTS.md"
check "the trade is still marketing" sh -c "'$C' trade | grep -q marketing"
check "gitignore: one block, the new markers, the new folder" sh -c "test \$(grep -c '# CONSTELLATION — begin' .gitignore) = 1 && grep -qxF '# CONSTELLATION — end' .gitignore && grep -qxF '!.constellation/bench/' .gitignore && grep -qxF 'node_modules/' .gitignore"
check "hooks: the tracked core.hooksPath has the new blocks and the project's own hook" sh -c "grep -qxF '# CONSTELLATION — begin' .githooks/pre-commit && grep -qF 'cst-gate.sh' .githooks/pre-commit && grep -qF 'echo our own pre-commit' .githooks/pre-commit && grep -qF 'cst-record.sh' .githooks/post-commit && test \$(grep -c 'CONSTELLATION — begin' .githooks/pre-commit) = 1"
check "no trace of the old name outside git history" test -z "$(residue "$P")"
check "adopt says the work moved with it, in plain words" has "under its old name" "$out"
check "adopt tells the agent the move is staged, not committed" has "the move is staged, not committed" "$err"
check "adopt prints what to commit, the tracked hooks included" sh -c "grep -q '^  commit: git add -A -- .constellation .gitignore CLAUDE.md AGENTS.md .githooks/pre-commit .githooks/post-commit' '$T/err' || grep -q '^  commit: git add -A -- .constellation .gitignore CLAUDE.md AGENTS.md .githooks/post-commit .githooks/pre-commit' '$T/err'"
commit_cmd=$(sed -n 's/^  commit: //p' "$T/err")
check "the printed commit lands the move; only adopt's new drop box is left to commit" sh -c "$commit_cmd >/dev/null && test \"\$(git status --porcelain)\" = '?? ideas/'"
check "after the move, the old paths are gone from the tree git tracks" test -z "$(git ls-files | grep -F ".$OLD")"
check "the new gate governs: a legal move passes with the hooks on" sh -c "git mv .constellation/bench/work.md .constellation/finished/work.md && git commit -qm 'finish: work'"
check "the new gate governs: an illegal arrival is refused" sh -c "printf '# X\n' >.constellation/bench/x.md && git add .constellation/bench/x.md && ! git commit -qm 'illegal'; git reset -q -- .constellation/bench/x.md; rm -f .constellation/bench/x.md"

# --- running it twice changes nothing
snap=$(snapshot "$P")
out2=$("$C" adopt "$P" 2>&1)
check "a second adopt says nothing about a move" lacks "moved" "$out2"
check "a second adopt says it was already set up, as before" has "It is up to date, and nothing of yours was changed." "$out2"
check "a second adopt changes no file, hook or commit" test "$snap" = "$(snapshot "$P")"
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
check "a second install changes nothing either" test "$snap" = "$(snapshot "$P")"

# --- an old install never committed, hooks in .git/hooks: the folder moves by hand, the hooks are rewired
Q=$T/plain; git init -q -b main "$Q"; echo x >"$Q/x"; git -C "$Q" add x; git -C "$Q" commit -qm init
sh "$T/old/install.sh" "$Q" >/dev/null 2>&1
printf '# Loose\n' >"$Q/.$OLD/stock/loose.md"
out3=$(sh "$ROOT/install.sh" "$Q" 2>&1); rc=$?
check "untracked old install: moved over" sh -c "test $rc = 0 && test ! -e '$Q/.$OLD' && test -f '$Q/.constellation/stock/loose.md'"
check "untracked old install: .git/hooks rewired, no old block" sh -c "grep -qF 'cst-gate.sh' '$Q/.git/hooks/pre-commit' && ! grep -qF '$OLD_MARK' '$Q/.git/hooks/pre-commit' '$Q/.git/hooks/post-commit'"
check "untracked old install: no trace of the old name" test -z "$(residue "$Q")"
check "untracked old install: install prints what to commit" has "  commit: git add -A -- .constellation" "$out3"

# --- both folders present: the old one is kept and said, never merged by guesswork
B=$T/both; git init -q -b main "$B"; echo x >"$B/x"; git -C "$B" add x; git -C "$B" commit -qm init
sh "$ROOT/install.sh" "$B" >/dev/null 2>&1; mkdir -p "$B/.$OLD/stock"; printf '# Stray\n' >"$B/.$OLD/stock/stray.md"
out4=$(sh "$ROOT/install.sh" "$B" 2>&1)
check "both folders: the old one is kept" test -f "$B/.$OLD/stock/stray.md"
check "both folders: and it is said" has "kept .$OLD/" "$out4"

[ $fails -eq 0 ] && echo "constellation-migrate: all tests passed" || { echo "constellation-migrate: $fails failure(s)"; exit 1; }
