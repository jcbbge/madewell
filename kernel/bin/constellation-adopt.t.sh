#!/usr/bin/env bash
# constellation-adopt.t.sh — `constellation adopt` against scratch projects: it installs the kernel,
# wires the hooks, makes ideas/, runs the enforcer checks and welcomes the person in plain words;
# a second run is harmless; a failing check is never welcomed; a plain folder becomes a project;
# and uninstall still leaves no residue. Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-adopt-test.XXXXXX")
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
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
has() { grep -qF -- "$1" <<<"$2"; }            # has <text> <output>
lacks() { ! grep -qiE -- "$1" <<<"$2"; }       # lacks <regex> <output>
hooks_of() { git -C "$1" rev-parse --path-format=absolute --git-path hooks; }
snapshot() { (cd "$1" && find . -path ./.git -prune -o -type f ! -name VERSION -print | sort | xargs sha1sum; cat "$(hooks_of .)/pre-commit" "$(hooks_of .)/post-commit"; git log --oneline | wc -l); }

# --- a project with history and files of its own ---------------------------------------------
P=$T/proj; mkdir -p "$P/src"; git init -q -b main "$P"; echo 'export const a = 1' >"$P/src/a.js"
printf '# Our notes for agents\n\nBe kind.\n' >"$P/CLAUDE.md"
printf '#!/bin/sh\necho our own pre-commit\n' >"$P/.git/hooks/pre-commit"; chmod +x "$P/.git/hooks/pre-commit"
git -C "$P" add -A; git -C "$P" commit -qm init
before=$(git -C "$P" rev-parse HEAD)
cd "$P"
out=$("$C" adopt 2>"$T/err"); rc=$?; err=$(cat "$T/err")
check "adopt with no argument sets up the current project" test "$rc" = 0
check "install: the kernel is in the project" sh -c "test -x .constellation/bin/constellation && test -f .constellation/stars/vega.md && test -f .constellation/skills/adopt.md"
check "install: the two places exist, and no done shelf" sh -c "test -d .constellation/stock && test -d .constellation/bench && test ! -e .constellation/finished && ! grep -qF finished .gitignore"
check "install: the same loader in CLAUDE.md and AGENTS.md" sh -c "test \"\$(sed -n '/CONSTELLATION — loader/,/\/CONSTELLATION/p' CLAUDE.md)\" = \"\$(sed -n '/CONSTELLATION — loader/,/\/CONSTELLATION/p' AGENTS.md)\""
check "parity: CLAUDE.md and AGENTS.md differ, and adopt says which to copy over" has "copy CLAUDE.md over AGENTS.md (it says everything AGENTS.md says, and more)" "$err"
check "install: the loader is appended and the project's own words are kept" sh -c "grep -qF 'Be kind.' CLAUDE.md && grep -qF '.constellation/HOST.md' CLAUDE.md && grep -qF '.constellation/HOST.md' AGENTS.md"
check "hooks: the commit gate and jigs are wired" sh -c "grep -qF 'cst-gate.sh' '$(hooks_of "$P")/pre-commit' && grep -qF 'cst-record.sh' '$(hooks_of "$P")/post-commit'"
check "hooks: the project's own pre-commit hook still runs" grep -qF 'echo our own pre-commit' "$(hooks_of "$P")/pre-commit"
check "ideas/: the drop box exists and git will keep it" test -f ideas/.gitkeep
check "a project with history is not committed for (the agent commits the adoption)" test "$(git rev-parse HEAD)" = "$before"
check "welcome: says it is set up, by the project's name" has "Constellation is set up in proj." "$out"
check "welcome: says what the person can do next" has "What you can do next:" "$out"
check "welcome: tells them about the ideas folder" has "Drop any file into the ideas folder" "$out"
check "welcome: names the four questions" has "the four questions" "$out"
check "welcome: says what is being made and what is done can be asked" has "Ask what is being made, or what is done" "$out"
check "welcome: says there are no commands to learn" has "There are no commands to learn." "$out"
check "welcome: no engine words, paths or commands (below the name line)" lacks 'stock|bench|finished|rack|vega|polaris|cassiopeia|sirius|orion|aldebaran|constellation (take|run|adopt)|git|hook|\.md|/' "$(sed 1d <<<"$out")"
check "the stock commit gate still works after adopt (legal commit passes)" sh -c "git add -A && CONSTELLATION_GATE=off git commit -qm 'adopt' && printf '# Later\n' >.constellation/stock/later.md && git add .constellation/stock/later.md && git commit -qm 'rack: later'"

# --- idempotence: a second run changes nothing of theirs -------------------------------------
echo 'a thought from a call' >ideas/call.txt
printf '\n2026-09-28 | our decision | ours\n' >>.constellation/DECISIONS.md
git add -A; git commit -qm "our work"
snap=$(snapshot "$P")
out2=$("$C" adopt "$P" 2>&1); rc=$?
check "a second adopt succeeds" test "$rc" = 0
check "a second adopt says it was already set up" has "Constellation was already set up in proj." "$out2"
check "a second adopt still says what to do next" has "What you can do next:" "$out2"
check "a second adopt leaves the tree clean: nothing of theirs changed" test -z "$(git status --porcelain)"
check "a second adopt changes no file, hook or commit" test "$snap" = "$(snapshot "$P")"
check "a second adopt keeps one loader, one gitignore block, one hook block" sh -c "test \$(grep -c 'CONSTELLATION — loader' CLAUDE.md) = 1 && test \$(grep -c 'CONSTELLATION — begin' .gitignore) = 1 && test \$(grep -c 'CONSTELLATION — begin' '$(hooks_of "$P")/pre-commit') = 1"
check "the project's own copy re-runs adopt without the package" sh -c "'$P/.constellation/bin/constellation' adopt | grep -qF 'already set up' && test -z \"\$(git status --porcelain)\""

# --- parity: one text for every assistant ---------------------------------------------------
cp CLAUDE.md AGENTS.md; git add AGENTS.md; git commit -qm "one text"
check "parity: identical files, nothing said" sh -c "! '$C' adopt 2>&1 >/dev/null | grep -q 'differ'"
printf '\nAGENTS.md says this too.\n' >>AGENTS.md; git commit -qam "AGENTS.md grows"
check "parity: the one that says more is the one to copy" sh -c "'$C' adopt 2>&1 >/dev/null | grep -qF 'copy AGENTS.md over CLAUDE.md (it says everything CLAUDE.md says, and more)'"
sed -i 's/Be kind./Be very kind./' CLAUDE.md; sleep 1; git commit -qam "each says its own thing"
check "parity: neither says it all: the newer one, and bring the other's lines over first" sh -c "'$C' adopt 2>&1 >/dev/null | grep -qF 'copy CLAUDE.md over AGENTS.md (it is the newer; bring over anything of AGENTS.md'\''s first)'"
ln -sf CLAUDE.md AGENTS.md; git add AGENTS.md; git commit -qm "one file, linked"
check "parity: a link from one to the other is one text" sh -c "! '$C' adopt 2>&1 >/dev/null | grep -q 'differ'"
check "parity: adopt leaves a linked AGENTS.md a link" test -L AGENTS.md
git checkout -q HEAD~3 -- AGENTS.md CLAUDE.md; git commit -qm "back as they were"

# --- a failing check is never welcomed ------------------------------------------------------
cp .constellation/jig/registry.json "$T/registry.json"
python3 - .constellation/jig/registry.json <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["jigs"].append({"id": "dead-stop", "run": "true", "probe": "false", "mode": "block"})
json.dump(d, open(p, "w"))
PY
out3=$("$C" adopt 2>&1); rc=$?
check "adopt fails when an enforcer check fails" test "$rc" != 0
check "and names the dead check" has "dead-stop" "$out3"
check "and says plainly it is not working" has "a check that keeps the work honest is not working" "$out3"
check "and does not welcome" lacks "What you can do next" "$out3"
cp "$T/registry.json" .constellation/jig/registry.json

# --- a plain folder becomes a project; its first commit is the adoption ---------------------
F=$T/folder; mkdir -p "$F"; echo 'my notes' >"$F/notes.txt"
check "a folder that is not a repository is adopted" sh -c "'$C' adopt '$F' | grep -qF 'Constellation is set up in folder.'"
check "it becomes a git repository with the hooks wired" sh -c "git -C '$F' rev-parse --git-dir && grep -qF 'cst-gate.sh' '$(hooks_of "$F" 2>/dev/null)/pre-commit'"
check "its first commit is the adoption, and only adopt's own paths" sh -c "test \$(git -C '$F' rev-list --count HEAD) = 1 && git -C '$F' ls-files | grep -qx ideas/.gitkeep && ! git -C '$F' ls-files | grep -qx notes.txt"
check "the person's file is left for them, untracked" sh -c "git -C '$F' status --porcelain | grep -qx '?? notes.txt'"
check "after that, an ordinary commit goes through the hooks" sh -c "cd '$F' && git add notes.txt && git commit -qm notes"
check "a second adopt of it is harmless too" sh -c "'$C' adopt '$F' | grep -qF 'already set up' && test \$(git -C '$F' rev-list --count HEAD) = 2 && test -z \"\$(git -C '$F' status --porcelain)\""

# --- an install from before, with a done shelf: adopt takes it away, staged, and says so in one line
S=$T/shelf; mkdir -p "$S"; git init -q -b main "$S"; echo x >"$S/x"; git -C "$S" add -A; git -C "$S" commit -qm init
"$C" adopt "$S" >/dev/null 2>&1; git -C "$S" add -A; CONSTELLATION_GATE=off git -C "$S" commit -qm adopt
mkdir -p "$S/.constellation/finished" "$S/.constellation/bench/big/finished"
printf '# Done long ago\n' >"$S/.constellation/finished/old.md"; : >"$S/.constellation/finished/.gitkeep"
printf '# A part\n' >"$S/.constellation/bench/big/finished/part.md"
git -C "$S" add -f .constellation/finished .constellation/bench/big; CONSTELLATION_GATE=off git -C "$S" commit -qm "the old shelf"
out5=$("$C" adopt "$S" 2>"$T/err5"); rc=$?
check "old shelf: adopt succeeds" test "$rc" = 0
check "old shelf: finished/ is gone, at the top and inside a breakdown" sh -c "test ! -e '$S/.constellation/finished' && test ! -e '$S/.constellation/bench/big/finished'"
check "old shelf: the removal is staged (git rm), not committed" sh -c "git -C '$S' diff --cached --name-status | grep -qxF 'D	.constellation/finished/old.md' && git -C '$S' diff --cached --name-status | grep -qxF 'D	.constellation/bench/big/finished/part.md' && git -C '$S' log -1 --format=%s | grep -qx 'the old shelf'"
check "old shelf: one line says so" sh -c "test \$(grep -c 'removed .constellation/finished/' '$T/err5') = 1 && grep -qF 'done work is in git history now' '$T/err5'"
check "old shelf: the welcome says it in plain words" has "what is done is now kept in the project's history instead of a folder" "$out5"
check "old shelf: its history is still in git" sh -c "git -C '$S' show HEAD:.constellation/finished/old.md | grep -qx '# Done long ago'"
check "old shelf: the removal commits through the gate" sh -c "git -C '$S' commit -qm 'the done shelf goes' -m 'ACT: plan
DONE: done work lives in git history
NEXT: —'"
check "old shelf: a second adopt says nothing about it" sh -c "! '$C' adopt '$S' 2>&1 | grep -q 'removed'"
mkdir -p "$S/.constellation/finished"; printf '# Mine\n' >"$S/.constellation/finished/mine.md"
check "old shelf: one holding a file git does not have is kept, and said" sh -c "'$C' adopt '$S' 2>&1 >/dev/null | grep -qF 'kept .constellation/finished/' && test -f '$S/.constellation/finished/mine.md'"
rm -rf "$S/.constellation/finished"

# --- refusals and the rest of the door -------------------------------------------------------
check "adopt refuses a folder that is not there" sh -c "! '$C' adopt '$T/nowhere'"
check "adopt refuses to adopt the package into itself" sh -c "cd '$ROOT' && ! '$C' adopt"
check "help names adopt" sh -c "'$C' help | grep -q 'constellation adopt'"
check "the adopt skill tells the agent to run it first" grep -qF "constellation adopt" "$ROOT/kernel/skills/adopt.md"
check "the README opens with the sentence to paste" sh -c "sed -n '1,4p' '$ROOT/README.md' | grep -qF 'Paste this to your AI assistant: **Set up Constellation in this project.**'"

# --- uninstall after adopt leaves no residue --------------------------------------------------
U=$T/un; mkdir -p "$U"; git init -q -b main "$U"; echo x >"$U/x"; git -C "$U" add -A; git -C "$U" commit -qm init
"$C" adopt "$U" >/dev/null 2>&1
check "uninstall after adopt leaves no residue, ideas/ included" sh -c "sh '$ROOT/install.sh' --uninstall '$U' >/dev/null && test -z \"\$(git -C '$U' status --porcelain)\" && test ! -e '$U/ideas'"

V=$T/kept; mkdir -p "$V"; git init -q -b main "$V"; echo x >"$V/x"; git -C "$V" add -A; git -C "$V" commit -qm init
"$C" adopt "$V" >/dev/null 2>&1; echo 'a voice memo' >"$V/ideas/memo.txt"
check "uninstall keeps an ideas/ the person dropped something in" sh -c "sh '$ROOT/install.sh' --uninstall '$V' >/dev/null && test -f '$V/ideas/memo.txt'"

# --- with no name and email for git, the first commit is reported, and the setup still stands
N=$T/noid; mkdir -p "$N"; printf '[user]\n\tuseConfigOnly = true\n' >"$T/noid.gitconfig"
out4=$(env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL -u EMAIL GIT_CONFIG_GLOBAL="$T/noid.gitconfig" "$C" adopt "$N" 2>&1); rc=$?
check "no git identity: adopt still sets the project up" sh -c "test $rc = 0 && test -x '$N/.constellation/bin/constellation' && test -f '$N/ideas/.gitkeep'"
check "no git identity: it says the first commit could not be made" has "the first commit could not be made" "$out4"
check "no git identity: and still welcomes" has "Constellation is set up in noid." "$out4"
check "adopt refuses more than one project" sh -c "! '$C' adopt '$P' '$F'"

# --- a linked worktree (its .git is a file) still gets its hooks from install ------------------
git -C "$U" worktree add -q "$T/wt" -b side 2>/dev/null
check "install wires the hooks in a linked worktree" sh -c "sh '$ROOT/install.sh' '$T/wt' | grep -qF 'Constellation hooks:'"

[ $fails -eq 0 ] && echo "constellation-adopt: all tests passed" || { echo "constellation-adopt: $fails failure(s)"; exit 1; }
