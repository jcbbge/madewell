#!/usr/bin/env bash
# constellation-hostlaw.t.sh — the host's law and the stars' law are separate, and a star never
# takes on the host. Against scratch projects with the kernel installed: the loader opens with
# the not-the-host guard and names .constellation/HOST.md; HOST.md is installed and the retired
# AGENTS.md is not; an older loader is rewritten in place, keeping its trade; a piece's worktree
# gets the stars' law and the ground and jig docs but never HOST.md; and nothing in the package
# still points at the retired law.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-hostlaw.XXXXXX")
export CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
unset CONSTELLATION_PIECE CONSTELLATION_STEP CONSTELLATION_REPO CONSTELLATION_BASE CONSTELLATION_AUTO CONSTELLATION_DISCOVERING
trap 'rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }

GUARD="If CONSTELLATION_STEP or CONSTELLATION_DISCOVERING is set, you are not the host: skip HOST.md and follow your brief; the rules of this project still bind."
LOADER="$GUARD Otherwise, read and follow .constellation/HOST.md before anything else, then continue."
loader_line() { awk '/^<!-- CONSTELLATION — loader -->$/{getline; print; exit}' "$1"; }
fresh() { mkdir -p "$1"; git init -q -b main "$1"; echo hi >"$1/notes.txt"; git -C "$1" add -A; git -C "$1" commit -qm init; }

# --- the loader and what is installed
P=$T/proj; fresh "$P"
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
for f in CLAUDE.md AGENTS.md; do
  check "$f: the loader line is the guard, then HOST.md" test "$(loader_line "$P/$f")" = "$LOADER"
done
check "the guard opens the loader line" sh -c 'case "$0" in "$1"*) exit 0;; esac; exit 1' "$(loader_line "$P/CLAUDE.md")" "$GUARD"
check "the guard names what the driver sets for a star" grep -qF "CONSTELLATION_STEP='\$step'" "$ROOT/kernel/lib/constellation/run.sh"
check "the guard names what the driver sets for discovery" grep -qF "CONSTELLATION_DISCOVERING=1" "$ROOT/kernel/lib/constellation/discover.sh"
check "HOST.md is installed as .constellation/HOST.md" cmp -s "$ROOT/kernel/HOST.md" "$P/.constellation/HOST.md"
check "the retired .constellation/AGENTS.md is not installed" test ! -e "$P/.constellation/AGENTS.md"
check "the stars' law is installed with the stars" cmp -s "$ROOT/kernel/stars/LAW.md" "$P/.constellation/stars/LAW.md"
printf '<!-- CONSTELLATION — loader -->\nIf CONSTELLATION_STEP or CONSTELLATION_DISCOVERING is set, you are not the host: follow only your brief. Otherwise, read and follow .constellation/HOST.md before anything else, then continue.\n<!-- /CONSTELLATION -->\n' >"$T/oldguard.md"
OG=$T/og; mkdir -p "$OG"; git -C "$OG" init -q; cp "$T/oldguard.md" "$OG/CLAUDE.md"; sh "$ROOT/install.sh" "$OG" >/dev/null 2>&1
check "an earlier guard is brought up to today's words on re-sync" test "$(loader_line "$OG/CLAUDE.md")" = "$LOADER"
check "a second install leaves one loader" sh -c "sh '$ROOT/install.sh' '$P' >/dev/null 2>&1 && test \$(grep -c 'CONSTELLATION — loader' '$P/CLAUDE.md') = 1 && test \"\$(awk '/^<!-- CONSTELLATION — loader -->\$/{getline; print; exit}' '$P/CLAUDE.md')\" = '$LOADER'"

# --- the host's law holds only the host's law
H=$ROOT/kernel/HOST.md L=$ROOT/kernel/stars/LAW.md
words=$(sed 's/[|*`#>-]//g' "$H" | wc -w)
check "HOST.md is short: about 700 words ($words)" test "$words" -ge 550 -a "$words" -le 800
check "HOST.md tells the host how to run the driver" grep -qF '.constellation/bin/constellation <verb>' "$H"
check "HOST.md never sends the host to constellation ask (it refuses outside a step)" sh -c "! grep -qF 'constellation ask' '$H'"
check "HOST.md: the host asks the person itself, in decision form" sh -c "grep -qF 'in decision form' '$H' && grep -qF 'your recommendation, the options' '$H'"
check "HOST.md: the host answers a star's questions, three rounds at most" sh -c "grep -qx '## The relay' '$H' && grep -qF 'constellation answer <slug> \"…\"' '$H' && grep -qF 'three rounds at most' '$H'"
check "HOST.md: the host relays, and never re-runs or redoes a star's work" grep -qF "never re-run or redo a star's work" "$H"
check "HOST.md: the host grounds first and commits in the ACT/DONE/NEXT form" sh -c "grep -qF 'read what exists' '$H' && grep -qF '\`ACT:\`, \`DONE:\`, \`NEXT:\`' '$H'"
check "HOST.md: first contact adopts with the package's driver" grep -qF "the package's \`kernel/bin/constellation adopt\`" "$H"
for s in "## Voice" "## The glossary" "## Their words, your verbs" "## The four questions" "## The two doors" "## Deciding" "## The pause"; do
  check "HOST.md has '$s'" grep -qx "$s" "$H"
done
check "HOST.md calls itself Constellation, not a version or a checkout" sh -c "! grep -qiE 'Constellation 6|Version:\*\* 6|dist checkout' '$H'"
check "HOST.md carries no stars' law (ground, jig, commits)" sh -c "! grep -qE '^## (Ground|The Jig|Commits)' '$H' && ! grep -qF 'git add -A' '$H'"
check "HOST.md restates neither CONSTELLATION.md nor SPEC.md" sh -c "! grep -qE '^## (The four acts|Moving work|Hands|Forbidden)' '$H' && ! grep -qF 'stock/X.md' '$H'"
check "stars/LAW.md holds ground, the jig and commits" sh -c "grep -qx '## Ground first' '$L' && grep -qx '## The Jig' '$L' && grep -qx '## Commits' '$L'"

# --- an older install: its loader is rewritten in place, its trade and its own words kept
O=$T/old; fresh "$O"
sh "$ROOT/install.sh" "$O" >/dev/null 2>&1
printf 'Be kind.\n\n<!-- CONSTELLATION — loader -->\nRead and follow .constellation/AGENTS.md and .constellation/trades/sales/TRADE.md before anything else, then continue.\n<!-- /CONSTELLATION -->\n' >"$O/CLAUDE.md"
printf '<!-- CONSTELLATION — loader -->\nRead and follow .constellation/AGENTS.md before anything else, then continue.\n<!-- /CONSTELLATION -->\n' >"$O/AGENTS.md"
echo old >"$O/.constellation/AGENTS.md"
sh "$ROOT/install.sh" "$O" >/dev/null 2>&1
check "re-sync: an older loader gets the guard and HOST.md" test "$(loader_line "$O/AGENTS.md")" = "$LOADER"
check "re-sync: an older loader keeps the trade it names" test "$(loader_line "$O/CLAUDE.md")" = "$GUARD Otherwise, read and follow .constellation/HOST.md and .constellation/trades/sales/TRADE.md before anything else, then continue."
check "re-sync: the project's own words are kept" grep -qx 'Be kind.' "$O/CLAUDE.md"
check "re-sync: the retired .constellation/AGENTS.md is removed" test ! -e "$O/.constellation/AGENTS.md"
check "re-sync: the rewritten loader still names its trade" sh -c "cd '$O' && '$C' trade | grep -q '^sales — named in'"
S=$T/linked; fresh "$S"; sh "$ROOT/install.sh" "$S" >/dev/null 2>&1
printf '<!-- CONSTELLATION — loader -->\nRead and follow .constellation/AGENTS.md before anything else, then continue.\n<!-- /CONSTELLATION -->\n' >"$S/AGENTS.md"
rm -f "$S/CLAUDE.md"; ln -s AGENTS.md "$S/CLAUDE.md"
sh "$ROOT/install.sh" "$S" >/dev/null 2>&1
check "re-sync: a CLAUDE.md linked to AGENTS.md stays a link, and both read the new loader" sh -c "test -L '$S/CLAUDE.md' && test \"\$(awk '/^<!-- CONSTELLATION — loader -->\$/{getline; print; exit}' '$S/CLAUDE.md')\" = '$LOADER'"
check "setting a trade, as the host does, keeps the guard" sh -c "cd '$P' && git add -A && CONSTELLATION_GATE=off git commit -qm adopt && .constellation/bin/constellation trade marketing >/dev/null && awk '/^<!-- CONSTELLATION — loader -->\$/{getline; print; exit}' AGENTS.md | grep -qF '$GUARD Otherwise, read and follow .constellation/HOST.md and .constellation/trades/marketing/TRADE.md before'"
G=$T/noguard; fresh "$G"; sh "$ROOT/install.sh" "$G" >/dev/null 2>&1; rm -f "$G/.constellation/templates/loader-guard.txt"
check "an install that lost the guard refuses to name a trade, rather than drop it" sh -c "cd '$G' && ! .constellation/bin/constellation trade sales >/dev/null 2>&1 && .constellation/bin/constellation trade sales 2>&1 | grep -qF 'loader-guard.txt' && grep -qxF '$LOADER' AGENTS.md"
check "switching trades keeps the guard" sh -c "cd '$P' && .constellation/bin/constellation trade sales >/dev/null && awk '/^<!-- CONSTELLATION — loader -->\$/{getline; print; exit}' CLAUDE.md | grep -qF '$GUARD Otherwise, read and follow .constellation/HOST.md and .constellation/trades/sales/TRADE.md before'"

# --- a piece's worktree: the stars' law and the docs, never the host's law
cd "$P"
printf '{"x":1}\n' >.constellation/jig/corrections.jsonl
printf '# Greet\n\n**Making:** a greeting\n**Not making:** localisation\n**Done when:** it says hello\n**Waits on:** \n' >.constellation/stock/greet.md
git add .constellation/stock/greet.md; git commit -qm "rack: greet"
WT=$T/state/proj/greet
check "take makes the worktree" sh -c "'$C' take greet && test -d '$WT'"
check "worktree: HOST.md is never seeded" test ! -e "$WT/.constellation/HOST.md"
check "worktree: no retired AGENTS.md either" test ! -e "$WT/.constellation/AGENTS.md"
check "worktree: the stars' law is there" test -f "$WT/.constellation/stars/LAW.md"
for f in ground/README.md ground/PROTOCOL.md ground/PICTURE.md jig/README.md jig/CONTRACT.md jig/CORRECTIONS.md; do
  check "worktree: $f is seeded" cmp -s "$P/.constellation/$f" "$WT/.constellation/$f"
done
check "worktree: the jig's code is seeded" test -d "$WT/.constellation/jig/metabolism"
check "worktree: the project's own ROOTS.md is its committed copy" sh -c "git -C '$WT' diff --quiet -- .constellation/ground/ROOTS.md"
check "worktree: the project's jig records are not copied" test ! -e "$WT/.constellation/jig/corrections.jsonl"
check "worktree: the loader there still opens with the guard" sh -c 'case "$0" in "$1"*) exit 0;; esac; exit 1' "$(loader_line "$WT/CLAUDE.md")" "$GUARD"

# --- nothing in the package points at the retired law. runtime/ is a nested project with its
# own older install, and docs/ is the historical record; install.sh names the retired loader
# only to replace it (its lines say "retired").
hits=$(cd "$ROOT" && git grep -nE '(\.constellation|kernel)/AGENTS\.md' -- . ':!runtime' ':!docs' ':!kernel/bin/constellation-hostlaw.t.sh' | grep -vE '^install\.sh:[0-9]+:.*retired')
check "no reference to .constellation/AGENTS.md or kernel/AGENTS.md remains" test -z "$hits"
[ -n "$hits" ] && sed 's/^/     /' <<<"$hits"
check "the package's own loaders open with the guard and name kernel/HOST.md" sh -c "for f in CLAUDE.md AGENTS.md; do grep -qxF '$GUARD Otherwise, read and follow \`kernel/HOST.md\` before anything else, then continue.' '$ROOT/'\$f || exit 1; done"
check "kernel/AGENTS.md is gone" test ! -e "$ROOT/kernel/AGENTS.md"
check "the package's loaders say where 'Let's build' starts" sh -c "for f in CLAUDE.md AGENTS.md; do grep -qF 'start with \`constellation brief\`' '$ROOT/'\$f || exit 1; done"
check "the guard is spelled once, in kernel/templates/loader-guard.txt" test "$(cat "$ROOT/kernel/templates/loader-guard.txt")" = "$GUARD"
hits=$(cd "$ROOT" && git grep -lF 'you are not the host: skip HOST.md' -- '*.sh' ':!*.t.sh')
check "no script carries its own copy of the guard" test -z "$hits"
check "SPEC.md no longer says there is no CLI" sh -c "! grep -qi 'no product CLI' '$ROOT/SPEC.md'"
check "trades no longer say they are not copied" sh -c "! grep -qi 'not copied' '$ROOT/trades/README.md' '$ROOT/trades/dev/TRADE.md' '$ROOT/trades/marketing/TRADE.md' '$ROOT/trades/sales/TRADE.md'"
A=$ROOT/kernel/skills/adopt.md
check "adopt asks the door question from HOST.md instead of restating it" sh -c "grep -qF '.constellation/HOST.md\` (The two doors)' '$A' && grep -qF '.constellation/profile' '$A' && ! grep -qF 'show you the engine as we go' '$A'"
check "adopt names no path on this machine" sh -c "! grep -qE '~/|/home/' '$A'"
check "adopt speaks the glossary, not the four acts' engine names" sh -c "! grep -qiE '\\b(ideate|implement)\\b' '$A' && ! grep -qF 'craft, beauty and care' '$A'"
check "adopt waits for discovery's commit and reads the slug from stock before take" sh -c "grep -qF 'wait for that commit' '$A' && grep -qF 'slug from' '$A' && grep -qF '.constellation/stock/' '$A'"
check "adopt uses a shipped trade when one fits" grep -qF 'If a shipped trade fits, use it.' "$A"
check "adopt files the first piece through ideas/, then takes and runs it" sh -c "grep -qF 'ideas/<slug>.md' '$A' && grep -qF 'constellation inbox' '$A' && grep -qF 'constellation run <slug>' '$A'"
check "adopt names TRADE.md, not PACK.md" sh -c "grep -qF 'TRADE.md' '$A' && ! grep -qF 'PACK.md' '$A'"
check "adopt clones nothing from the network" sh -c "! grep -qE 'git clone|github\.com' '$A'"

[ $fails -eq 0 ] && echo "constellation-hostlaw: all tests passed" || { echo "constellation-hostlaw: $fails failure(s)"; exit 1; }
