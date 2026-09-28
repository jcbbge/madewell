#!/usr/bin/env bash
# constellation-adopt.t.sh — `constellation adopt` against scratch projects: it installs the kernel,
# wires the hooks, makes ideas/, runs the enforcer checks and welcomes the person in plain words;
# a second run is harmless; a failing check is never welcomed; a plain folder becomes a project;
# and uninstall still leaves no residue. Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-adopt-test.XXXXXX")
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
out=$("$C" adopt 2>&1); rc=$?
check "adopt with no argument sets up the current project" test "$rc" = 0
check "install: the kernel is in the project" sh -c "test -x .madewell/bin/constellation && test -f .madewell/stars/vega.md && test -f .madewell/skills/adopt.md"
check "install: the three places exist" sh -c "test -d .madewell/stock && test -d .madewell/bench && test -d .madewell/finished"
check "install: the loader is appended and the project's own words are kept" sh -c "grep -qF 'Be kind.' CLAUDE.md && grep -qF '.madewell/HOST.md' CLAUDE.md && grep -qF '.madewell/HOST.md' AGENTS.md"
check "hooks: the commit gate and jigs are wired" sh -c "grep -qF 'mw-gate.sh' '$(hooks_of "$P")/pre-commit' && grep -qF 'mw-record.sh' '$(hooks_of "$P")/post-commit'"
check "hooks: the project's own pre-commit hook still runs" grep -qF 'echo our own pre-commit' "$(hooks_of "$P")/pre-commit"
check "ideas/: the drop box exists and git will keep it" test -f ideas/.gitkeep
check "a project with history is not committed for (the agent commits the adoption)" test "$(git rev-parse HEAD)" = "$before"
check "welcome: says it is set up, by the project's name" has "Constellation is set up in proj." "$out"
check "welcome: says what the person can do next" has "What you can do next:" "$out"
check "welcome: tells them about the ideas folder" has "Drop any file into the ideas folder" "$out"
check "welcome: names the four questions" has "the four questions" "$out"
check "welcome: says what is being made and what is done can be asked" has "Ask what is being made, or what is done" "$out"
check "welcome: says there are no commands to learn" has "There are no commands to learn." "$out"
check "welcome: no engine words, paths or commands (below the name line)" lacks 'stock|bench|finished|rack|vega|polaris|cassiopeia|sirius|orion|aldebaran|madewell|constellation (take|run|adopt)|git|hook|\.md|/' "$(sed 1d <<<"$out")"
check "the stock commit gate still works after adopt (legal commit passes)" sh -c "git add -A && MW_GATE=off git commit -qm 'adopt' && printf '# Later\n' >.madewell/stock/later.md && git add .madewell/stock/later.md && git commit -qm 'rack: later'"

# --- idempotence: a second run changes nothing of theirs -------------------------------------
echo 'a thought from a call' >ideas/call.txt
printf '\n2026-09-28 | our decision | ours\n' >>.madewell/DECISIONS.md
git add -A; git commit -qm "our work"
snap=$(snapshot "$P")
out2=$("$C" adopt "$P" 2>&1); rc=$?
check "a second adopt succeeds" test "$rc" = 0
check "a second adopt says it was already set up" has "Constellation was already set up in proj." "$out2"
check "a second adopt still says what to do next" has "What you can do next:" "$out2"
check "a second adopt leaves the tree clean: nothing of theirs changed" test -z "$(git status --porcelain)"
check "a second adopt changes no file, hook or commit" test "$snap" = "$(snapshot "$P")"
check "a second adopt keeps one loader, one gitignore block, one hook block" sh -c "test \$(grep -c 'MADE WELL — loader' CLAUDE.md) = 1 && test \$(grep -c 'MADE WELL — begin' .gitignore) = 1 && test \$(grep -c 'MADE WELL — begin' '$(hooks_of "$P")/pre-commit') = 1"
check "the project's own copy re-runs adopt without the package" sh -c "'$P/.madewell/bin/constellation' adopt | grep -qF 'already set up' && test -z \"\$(git status --porcelain)\""

# --- a failing check is never welcomed ------------------------------------------------------
cp .madewell/jig/registry.json "$T/registry.json"
python3 - .madewell/jig/registry.json <<'PY'
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
cp "$T/registry.json" .madewell/jig/registry.json

# --- a plain folder becomes a project; its first commit is the adoption ---------------------
F=$T/folder; mkdir -p "$F"; echo 'my notes' >"$F/notes.txt"
check "a folder that is not a repository is adopted" sh -c "'$C' adopt '$F' | grep -qF 'Constellation is set up in folder.'"
check "it becomes a git repository with the hooks wired" sh -c "git -C '$F' rev-parse --git-dir && grep -qF 'mw-gate.sh' '$(hooks_of "$F" 2>/dev/null)/pre-commit'"
check "its first commit is the adoption, and only adopt's own paths" sh -c "test \$(git -C '$F' rev-list --count HEAD) = 1 && git -C '$F' ls-files | grep -qx ideas/.gitkeep && ! git -C '$F' ls-files | grep -qx notes.txt"
check "the person's file is left for them, untracked" sh -c "git -C '$F' status --porcelain | grep -qx '?? notes.txt'"
check "after that, an ordinary commit goes through the hooks" sh -c "cd '$F' && git add notes.txt && git commit -qm notes"
check "a second adopt of it is harmless too" sh -c "'$C' adopt '$F' | grep -qF 'already set up' && test \$(git -C '$F' rev-list --count HEAD) = 2 && test -z \"\$(git -C '$F' status --porcelain)\""

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
check "no git identity: adopt still sets the project up" sh -c "test $rc = 0 && test -x '$N/.madewell/bin/constellation' && test -f '$N/ideas/.gitkeep'"
check "no git identity: it says the first commit could not be made" has "the first commit could not be made" "$out4"
check "no git identity: and still welcomes" has "Constellation is set up in noid." "$out4"
check "adopt refuses more than one project" sh -c "! '$C' adopt '$P' '$F'"

# --- a linked worktree (its .git is a file) still gets its hooks from install ------------------
git -C "$U" worktree add -q "$T/wt" -b side 2>/dev/null
check "install wires the hooks in a linked worktree" sh -c "sh '$ROOT/install.sh' '$T/wt' | grep -qF 'Made Well hooks:'"

[ $fails -eq 0 ] && echo "constellation-adopt: all tests passed" || { echo "constellation-adopt: $fails failure(s)"; exit 1; }
