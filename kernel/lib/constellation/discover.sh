# constellation — discover: the outer loop, notes → pieces on the rack. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_discover() {
  local notes=${1:-}; [ -f "$notes" ] || die "usage: constellation discover <notes-file>"
  R=$(main_repo); notes=$(readlink -f "$notes")
  local dir="$STATE/$(basename "$R")"; mkdir -p "$dir"; local brief="$dir/discover.$(date +%s).brief.md"
  { printf '# Discovery — the outer loop\n\nDigest these notes into pieces on the rack. Follow `%s/%s/skills/discovery.md` (the discovery skill) exactly: pieces go to `%s/stock/<slug>.md`, one per actionable item, each with a title and what it is about; write the floor (**Making:** / **Not making:** / **Done when:** / **Waits on:**) where the notes already settle it. Never move anything to the bench. Commit the new stock pieces in one commit.\n\nThe notes: %s\n' "$R" "$MW" "$MW" "$notes"; } >"$brief"
  local run="claude --dangerously-skip-permissions --effort high \"\$(cat '$brief')\""
  [ "${CONSTELLATION_DRY:-}" = 1 ] && run="sleep 3600"
  tmux has-session -t "=$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _ -c "$R"
  tmux new-window -d -t "=$SESSION:" -n "discover" -c "$R"
  tmux send-keys -t "=$SESSION:=discover" "export AGENT_ROLE=vega; clear; $run" Enter
  say "discovery started on $notes in $SESSION:discover"
}
