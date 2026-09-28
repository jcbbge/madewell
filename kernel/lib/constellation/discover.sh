# constellation — discover: the outer loop, notes → pieces on the rack. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# One discovery act per notes file: in its own window when tmux is here, else headless in the
# background (CONSTELLATION_DISCOVER=window|headless chooses). `constellation inbox` starts one on
# every text file dropped into ideas/.

cmd_discover() {
  local notes=${1:-}; [ -f "$notes" ] || die "usage: constellation discover <notes-file>"
  R=$(main_repo); discover_ready || die "discovery needs a harness to run (claude on PATH)"
  discover_start "$(readlink -f "$notes")" || die "could not start discovery on $notes"
}
discover_ready() { # can a discovery act start here at all
  discover_how >/dev/null; [ "${CONSTELLATION_DRY:-}" = 1 ] || command -v claude >/dev/null
}
discover_how() {
  local how=${CONSTELLATION_DISCOVER:-}
  [ -n "$how" ] || { command -v tmux >/dev/null && how=window || how=headless; }
  case "$how" in window|headless) printf '%s' "$how" ;; *) die "CONSTELLATION_DISCOVER is window or headless, not '$how'" ;; esac
}
discover_start() { # discover_start <notes-path> : start the act on one file; says where it runs
  local notes=$1 dir="$STATE/$(basename "$R")" name brief run how
  how=$(discover_how) || return 1
  name=$(basename "$notes"); name=${name%.*}; name=$(printf '%s' "$name" | tr -c 'A-Za-z0-9_-' '-' | cut -c1-40)
  mkdir -p "$dir"; brief="$dir/discover.$name.$(date +%s).$RANDOM.brief.md"
  { printf '# Discovery — the outer loop\n\nDigest these notes into pieces on the rack. Follow `%s/%s/skills/discovery.md` (the discovery skill) exactly: pieces go to `%s/stock/<slug>.md`, one per actionable item, each with a title and what it is about; write the floor (**Making:** / **Not making:** / **Done when:** / **Waits on:**) where the notes already settle it. Cite the notes path on each piece as its intake record; never copy their body. Never move anything to the bench. Commit the new stock pieces in one commit.\n\nIf no one answers you here, do not wait: carry each open question on its piece, and put "here is what I heard" in the commit body, so the host can read it back to the person.\n\nThe notes: %s\n' "$R" "$MW" "$MW" "$notes"; } >"$brief"
  local tl=${brief%.brief.md}.TASKS.md   # its own task list: never the one above the project
  printf '# Tasks\n\n## NOW\n\n## LATER\n\n## DONE\n' >"$tl"
  case "$how" in
    window)
      run="claude --dangerously-skip-permissions --effort high \"\$(cat '$brief')\""
      [ "${CONSTELLATION_DRY:-}" = 1 ] && run="sleep 3600"
      trust "$R"   # a project the person never opened in claude would sit at its folder-trust question
      tmux has-session -t "=$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _ -c "$R" || return 1
      local wid; wid=$(tmux new-window -d -P -F '#{window_id}' -t "=$SESSION:" -n "discover·$name" -c "$R") || return 1
      tmux send-keys -t "$wid" "export AGENT_ROLE=vega CONSTELLATION_DISCOVERING=1 TASKS_FILE='$tl'; clear; $run" Enter || return 1
      say "discovery started on $notes in $SESSION:discover·$name" ;;
    headless)
      local log=${brief%.brief.md}.log
      run="claude -p --dangerously-skip-permissions --effort high \"\$(cat '$brief')\""
      [ "${CONSTELLATION_DRY:-}" = 1 ] && run=true
      ( cd "$R" && AGENT_ROLE=vega CONSTELLATION_DISCOVERING=1 TASKS_FILE="$tl" nohup bash -c "$run" >"$log" 2>&1 </dev/null & ) || return 1
      say "discovery started on $notes, headless (its log: $log)" ;;
  esac
}
