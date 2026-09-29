#!/usr/bin/env bash
# constellation-parity.t.sh — CLAUDE.md and AGENTS.md are one text: different assistants read
# different ones, so they must never disagree. This repository's own two are identical; install
# writes the same loader into both, fresh or appended to a project's own words, and a trade named
# later lands in both; adopt says plainly which one to copy over when a project's two differ
# (constellation-adopt.t.sh covers each way it chooses). Isolated tmux server, no harness.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); C=$KB/constellation
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-parity-test.XXXXXX")
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
loader() { sed -n '/^<!-- CONSTELLATION — loader -->$/,/^<!-- \/CONSTELLATION -->$/p' "$1"; }

# --- this repository: one text, word for word
check "this repository's CLAUDE.md and AGENTS.md are identical" cmp -s "$ROOT/CLAUDE.md" "$ROOT/AGENTS.md"

# --- a fresh project: install writes both, and they are one text
P=$T/fresh; git init -q -b main "$P"; echo x >"$P/x"; git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
check "fresh install: both files are written" sh -c "test -f '$P/CLAUDE.md' && test -f '$P/AGENTS.md'"
check "fresh install: CLAUDE.md and AGENTS.md are identical" cmp -s "$P/CLAUDE.md" "$P/AGENTS.md"
check "fresh install: a second install keeps them identical" sh -c "sh '$ROOT/install.sh' '$P' >/dev/null 2>&1 && cmp -s '$P/CLAUDE.md' '$P/AGENTS.md'"
git -C "$P" add -A; CONSTELLATION_GATE=off git -C "$P" commit -qm adopt
( cd "$P" && "$C" trade marketing >/dev/null 2>&1 )
check "a trade named later is named in both, and they stay identical" sh -c "grep -qF 'trades/marketing/TRADE.md' '$P/CLAUDE.md' && cmp -s '$P/CLAUDE.md' '$P/AGENTS.md'"

# --- a project with words of its own in one of them: the same loader goes into both
Q=$T/own; git init -q -b main "$Q"; printf '# Our notes\n\nBe kind.\n' >"$Q/CLAUDE.md"; git -C "$Q" add -A; git -C "$Q" commit -qm init
sh "$ROOT/install.sh" "$Q" >/dev/null 2>&1
lc=$(loader "$Q/CLAUDE.md"); la=$(loader "$Q/AGENTS.md")
check "own words: the same loader in both" sh -c "test -n \"\$1\" && test \"\$1\" = \"\$2\"" _ "$lc" "$la"
check "own words: the project's words are kept" grep -qF 'Be kind.' "$Q/CLAUDE.md"
git -C "$Q" add -A; CONSTELLATION_GATE=off git -C "$Q" commit -qm adopt
err=$("$C" adopt "$Q" 2>&1 >/dev/null)
check "own words: adopt says they differ, and which one to copy over" grep -qF 'copy CLAUDE.md over AGENTS.md' <<<"$err"
cp "$Q/CLAUDE.md" "$Q/AGENTS.md"
check "copied over: adopt has nothing to say about them" sh -c "! '$C' adopt '$Q' 2>&1 >/dev/null | grep -q 'differ'"

[ $fails -eq 0 ] && echo "constellation-parity: all tests passed" || { echo "constellation-parity: $fails failure(s)"; exit 1; }
