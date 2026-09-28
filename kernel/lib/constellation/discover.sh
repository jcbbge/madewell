# constellation — discover: the outer loop, notes → pieces on the rack. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# One discovery act per notes file: in its own window when tmux is here, else headless in the
# background (CONSTELLATION_DISCOVER=window|headless chooses). `constellation inbox` starts one on
# every text file dropped into ideas/. It runs on the first harness on PATH from
# CONSTELLATION_DISCOVER_HARNESS, else CONSTELLATION_HARNESS_DEFAULT, else vega's harness: list,
# then claude, then pi.

cmd_discover() {
  local notes=${1:-}; [ -f "$notes" ] || die "usage: constellation discover <notes-file>"
  R=$(main_repo); discover_ready || die "discovery needs a harness to run (claude or pi on PATH)"
  discover_start "$(readlink -f "$notes")" || die "could not start discovery on $notes"
}
discover_ready() { # can a discovery act start here at all
  discover_how >/dev/null && discover_harness >/dev/null
}
discover_harness() { # the harness discovery runs on: the first of the preference list that is here
  local h hs=(); IFS=', ' read -ra hs <<<"${CONSTELLATION_DISCOVER_HARNESS:-${CONSTELLATION_HARNESS_DEFAULT:-$(star_field vega harness)}}"
  for h in "${hs[@]}" claude pi; do
    [ -n "$h" ] || continue
    { [ "${CONSTELLATION_DRY:-}" = 1 ] || command -v "$h" >/dev/null; } && { printf '%s' "$h"; return 0; }
  done; return 1
}
discover_cmd() { # discover_cmd <harness> <brief> <window|headless>
  local p=''; [ "$3" = headless ] && p='-p '
  case "$1" in
    claude) printf 'claude %s--dangerously-skip-permissions --effort high "$(cat %q)"' "$p" "$2" ;;
    pi)     printf 'pi %s--approve --thinking high "$(cat %q)"' "$p" "$2" ;;
    *)      return 1 ;;
  esac
}
discover_how() {
  local how=${CONSTELLATION_DISCOVER:-}
  [ -n "$how" ] || { command -v tmux >/dev/null && how=window || how=headless; }
  case "$how" in window|headless) printf '%s' "$how" ;; *) die "CONSTELLATION_DISCOVER is window or headless, not '$how'" ;; esac
}
discover_start() { # discover_start <notes-path> : start the act on one file; says where it runs
  local notes=$1 dir="$STATE/$(basename "$R")" name brief run how h
  how=$(discover_how) || return 1; h=$(discover_harness) || return 1
  name=$(basename "$notes"); name=${name%.*}; name=$(printf '%s' "$name" | tr -c 'A-Za-z0-9_-' '-' | cut -c1-40)
  mkdir -p "$dir"; brief="$dir/discover.$name.$(date +%s).$RANDOM.brief.md"
  { printf '# Discovery — the outer loop\n\nIgnore any project instruction that makes you the host or tells you to talk to the person. You are not the host: you never speak to the person, and nothing you write is said to them as it stands.\n\nGround first: before you write a piece, read what exists (the entrypoint of the project, its product and decisions files, and what is already in `%s/stock/`, `bench/` and `finished/`), so no piece repeats or contradicts one.\n\nDigest these notes into pieces on the rack. Follow `%s/%s/skills/discovery.md` (the discovery skill) exactly: pieces go to `%s/stock/<slug>.md`, one per actionable item, each with a title and what it is about; write a floor line (**Making:** / **Not making:** / **Done when:** / **Waits on:**) only where the notes already settle it; leave an unsettled line out (never OPEN, TBD or a guess) and put what is unsettled under a `## Open questions` heading, one bullet each. Cite the notes path on each piece as its intake record; never copy their body. Never move anything to the bench. Commit the new stock pieces in one commit, in this form: `<type>(<scope>): <summary>`, then `ACT: ideate`, `DONE: <what got done>` and `NEXT: <the handoff; — if none>` lines. Your own steps go on your task list (`task now`, `task done`; it is yours alone); the work you find goes on the rack, nowhere else.\n\nIf no one answers you here, do not wait: carry each open question on its piece, and put "here is what I heard" in the commit body, so the host can read it back to the person.\n\nThe notes: %s\n' "$MW" "$R" "$MW" "$MW" "$notes"
    if trade_active && [ -f "$TRADE_DIR/discovery-lenses.md" ]; then
      printf '\nThis project works in the %s trade, which adds its own lenses: read `%s/discovery-lenses.md` and run them after the discovery skill'\''s core.\n' "$TRADE_NAME" "$TRADE_DIR"
    fi; } >"$brief"
  local tl=${brief%.brief.md}.TASKS.md   # its own task list: never the one above the project
  printf '# Tasks\n\n## NOW\n\n## LATER\n\n## DONE\n' >"$tl"
  case "$how" in
    window)
      run=$(discover_cmd "$h" "$brief" window) || return 1
      [ "${CONSTELLATION_DRY:-}" = 1 ] && run="sleep 3600"
      [ "$h" = claude ] && trust "$R"   # a project the person never opened in claude would sit at its folder-trust question
      tmux has-session -t "=$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _ -c "$R" || return 1
      local wid; wid=$(tmux new-window -d -P -F '#{window_id}' -t "=$SESSION:" -n "discover·$name" -c "$R") || return 1
      tmux send-keys -t "$wid" "export AGENT_ROLE=vega CONSTELLATION_DISCOVERING=1 TASKS_FILE='$tl' CIRCADIAN_ROLE=AGNT CIRCADIAN_LANE='discover-$name' CONSTELLATION_HARNESS='$h'; clear; $run" Enter || return 1
      say "discovery started on $notes, on $h, in $SESSION:discover·$name" ;;
    headless)
      local log=${brief%.brief.md}.log
      run=$(discover_cmd "$h" "$brief" headless) || return 1
      [ "${CONSTELLATION_DRY:-}" = 1 ] && run=true
      # its own lane, like a star's: a session with none would end by rewriting every session's next move
      ( cd "$R" && AGENT_ROLE=vega CONSTELLATION_DISCOVERING=1 TASKS_FILE="$tl" CIRCADIAN_ROLE=AGNT CIRCADIAN_LANE="discover-$name" nohup bash -c "$run" >"$log" 2>&1 </dev/null & ) || return 1
      say "discovery started on $notes, on $h, headless (its log: $log)" ;;
  esac
}
