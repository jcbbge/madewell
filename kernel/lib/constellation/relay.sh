# constellation — the relay and the handoffs: done, clear, clarify, reply, ask, answer, stop-check. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

changed_since() { git -C "$1" diff --name-only "$2" HEAD --; }
commits_since() { git -C "$1" log --format='%H %s' "$2..HEAD" | grep -v ' run(' || true; }
cmd_done() {
  local mode=done route="" text
  while [ $# -gt 0 ]; do case "$1" in
    --fail) mode=fail;; --route) mode=route; route=$2; shift;; *) break;; esac; shift; done
  text=${1:-}; [ -n "$text" ] || die 'usage: constellation done [--fail | --route sirius|orion|operator] "<handoff>"'
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-} base=${CONSTELLATION_BASE:-}
  [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step (no CONSTELLATION_PIECE/STEP)"
  R=$(main_repo); local wt; wt=$(work_of "$slug")
  since_start "$slug" "$step" | cut -f2 | grep -qx clear || die "the relay comes first: review what you were handed, then constellation clear (or constellation clarify \"<questions>\")"
  [ -z "$(git -C "$wt" status --porcelain --untracked-files=no)" ] || die "uncommitted changes in the worktree: commit what belongs to this step, or undo it, then hand off"
  local why; why=$(check_write_rule "$step" "$wt" "$base") || die "$why"
  case "$mode" in
    fail) [ "$step" = aldebaran ] || die "only aldebaran fails a run"; record "$slug" "$step" fail "${CONSTELLATION_HARNESS:-}" "$text" "polaris (arbiter)" ;;
    route) [ "$step" = polaris-triage ] || die "only the arbiter routes"
           case "$route" in sirius|orion|operator) ;; *) die "route to sirius, orion or operator";; esac
           record "$slug" "$step" "route:$route" "${CONSTELLATION_HARNESS:-}" "$text" "$route" ;;
    done) [ "$step" != polaris-triage ] || die "the arbiter rules with --route"; local n; n=$(next_step_after "$slug" "$step")
          record "$slug" "$step" done "${CONSTELLATION_HARNESS:-}" "$text" "$n" ;;
  esac
  say "$slug: $step handed off"
  notify "$slug: $step $mode — $(cut -c1-80 <<<"$text")"
  if [ "${CONSTELLATION_AUTO:-1}" != 0 ]; then
    local nx; nx=$(next_step "$slug")
    case "$nx" in
      land) cmd_land "$slug" ;;
      operator|wait:*|running:*) notify "$slug needs the operator: constellation status $slug" ;;
      *) ( CONSTELLATION_PIECE= CONSTELLATION_STEP= CONSTELLATION_BASE= launch "$slug" "$nx" "" "" "" "" "" ) ;;
    esac
    [ "${CONSTELLATION_DRY:-}" = 1 ] || ( sleep 5; tmux kill-window -t "=$SESSION:=$slug·$step" 2>/dev/null ) >/dev/null 2>&1 &
  fi
}
next_step_after() { case "$2" in vega) echo polaris-peer;; polaris-peer) echo cassiopeia;; cassiopeia) echo sirius;; sirius) echo "orion or aldebaran";; orion) echo aldebaran;; aldebaran) echo land;; *) echo -;; esac; }

cmd_clear() {
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step"
  R=$(main_repo); record "$slug" "$step" clear "${CONSTELLATION_HARNESS:-}" "no open questions" "$step works"
  say "cleared: do the work, then constellation done"
}
cmd_clarify() {
  local q=${1:-}; [ -n "$q" ] || die 'usage: constellation clarify "<questions>"'
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step"
  R=$(main_repo)
  local rounds; rounds=$(since_start "$slug" "$step" | cut -f2 | grep -cx clarify || true)
  if [ "${rounds:-0}" -ge 3 ]; then
    record "$slug" "$step" flag "${CONSTELLATION_HARNESS:-}" "still unclear after three rounds: $q" "the operator fixes the brief, then constellation resume $slug"
    notify "$slug ($step): three rounds of questions and still unclear — the brief needs you. constellation status $slug"
    say "flagged for the operator: three rounds and still unclear means the brief is wrong. Stop here."
    return 0
  fi
  local orig; orig=$(originator "$slug" "$step")
  record "$slug" "$step" clarify "${CONSTELLATION_HARNESS:-}" "$q" "${orig} answers (round $((rounds + 1)) of 3)"
  if [ "$orig" = operator ]; then
    notify "$slug ($step) asks before starting: $q — constellation answer $slug \"…\""
    say "your questions went to the operator; wait for the answer in this pane"
  else
    launch_reply "$slug" "$step" "$orig" "$q"
    say "your questions went to $(star_of "$orig"), who handed you this; wait for the answer in this pane"
  fi
}
launch_reply() { # launch_reply <slug> <waiting-step> <originator-step> <questions>
  local slug=$1 step=$2 orig=$3 q=$4 ostar wt dir brief win run h effort
  ostar=$(star_of "$orig"); wt=$(work_of "$slug"); dir="$STATE/$(basename "$R")"; brief="$dir/$slug.$step.reply.brief.md"
  h=${CONSTELLATION_HARNESS_DEFAULT:-$(star_field "$ostar" harness)}; h=${h:-claude}; effort=$(star_field "$ostar" effort); effort=${effort:-high}
  { printf '# %s — answering for %s\n\n' "$(sed -n '1s/^# //p' "$STARS/$ostar.md")" "$slug"
    printf 'You are wearing the %s profile again. You (this profile) handed this piece to %s, and\n' "$ostar" "$(star_of "$step")"
    printf '%s has questions before it starts. Answer every one, from the piece, the run and the code.\n' "$(star_of "$step")"
    printf 'Change nothing. When the answer is genuinely the operator'"'"'s, say so in your answer.\n'
    printf 'The write rules are fixed and no answer overrides them: sirius builds and never writes tests;\n'
    printf 'orion writes the tests from the plan; aldebaran runs them; the rest change nothing.\n\n'
    printf '## The questions\n\n%s\n\n## The piece\n\n' "$q"; cat "$R/$MW/bench/$slug.md"
    printf '\n## The run so far\n\n'
    local s e hh d; while IFS=$'\t' read -r s e hh d; do [ "$e" = started ] && continue; printf -- '- **%s** %s: %s\n' "$s" "$e" "$d"; done < <(events "$slug")
    printf '\nFinish by running this with your shell tool, as your last act (writing it as text does nothing):\n    constellation reply "<answers>"\n'; } >"$brief"
  case "$h" in
    claude) run="claude --dangerously-skip-permissions --effort '$effort'${CONSTELLATION_MODEL:+ --model '$CONSTELLATION_MODEL'} \"\$(cat '$brief')\"" ;;
    pi) run="pi --approve${CONSTELLATION_MODEL:+ --model '$CONSTELLATION_MODEL'} --thinking '$effort' \"\$(cat '$brief')\"" ;;
    *) run="claude --dangerously-skip-permissions \"\$(cat '$brief')\"" ;;
  esac
  [ "${CONSTELLATION_DRY:-}" = 1 ] && run="sleep 3600"
  win="$slug·$step·reply"
  tmux kill-window -t "=$SESSION:=$win" 2>/dev/null || true
  tmux new-window -d -t "=$SESSION:" -n "$win" -c "$wt"
  tmux send-keys -t "=$SESSION:=$win" "export CONSTELLATION_PIECE='$slug' CONSTELLATION_STEP='$orig' CONSTELLATION_REPLY_FOR='$step' CONSTELLATION_REPO='$R' CONSTELLATION_HARNESS='$h' AGENT_ROLE='$ostar' WORKER_ID='$slug' CIRCADIAN_ROLE=AGNT CIRCADIAN_LANE='$slug'${CONSTELLATION_MODEL:+ CONSTELLATION_MODEL='$CONSTELLATION_MODEL'}${CONSTELLATION_STATE:+ CONSTELLATION_STATE='$CONSTELLATION_STATE'} PATH='$(dirname "$SELF")':\"\$PATH\"; clear; $run" Enter
}
deliver_answer() { # deliver_answer <slug> <step> <from> <text> : record it and type it into the waiting star's pane
  local slug=$1 step=$2 from=$3 text=$4
  record "$slug" "$step" "reply:$from" "" "$text" "$step reviews the answer"
  local msg="Answers from $from: $text — If anything is still ambiguous: constellation clarify \"…\". Otherwise: constellation clear, then do the work."
  tmux send-keys -t "=$SESSION:=$slug·$step" -l -- "$msg" 2>/dev/null && tmux send-keys -t "=$SESSION:=$slug·$step" Enter \
    || say "(its pane is gone: constellation resume $slug carries the answer in the brief)"
}
cmd_reply() {
  local a=${1:-}; [ -n "$a" ] || die 'usage: constellation reply "<answers>"'
  local slug=${CONSTELLATION_PIECE:-} for=${CONSTELLATION_REPLY_FOR:-}; [ -n "$slug" ] && [ -n "$for" ] || die "not answering for a step (no CONSTELLATION_REPLY_FOR)"
  R=$(main_repo); [[ "$(next_step "$slug")" == "clarifying:$for" ]] || die "$for is not waiting for answers"
  deliver_answer "$slug" "$for" "$(star_of "${CONSTELLATION_STEP:-}")" "$a"
  say "answered $for"
  [ "${CONSTELLATION_DRY:-}" = 1 ] || ( sleep 5; tmux kill-window -t "=$SESSION:=$slug·$for·reply" 2>/dev/null ) >/dev/null 2>&1 &
}

cmd_stop_check() { # the harness's stop hook: a star may not end its turn without handing off
  # Silent and allowed outside a step. Inside one: the latest start must be answered by a handoff
  # (done / fail / route / clarify / ask / flag), and an answering star must have replied.
  # --claude prints Claude Code's block JSON; otherwise the reason goes to stdout with exit 1.
  # Three blocks in a row, then it lets the turn end and tells the operator (no loop forever).
  local mode=${1:-}
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-} for=${CONSTELLATION_REPLY_FOR:-}
  [ -n "$slug" ] && [ -n "$step" ] || return 0
  R=$(main_repo) 2>/dev/null || return 0
  local owed=""
  if [ -n "$for" ]; then
    [[ "$(next_step "$slug")" == "clarifying:$for" ]] && owed="$(star_of "$for") is waiting for your answers. Run it (with your shell tool, not as text): constellation reply \"<answers>\""
  else
    local last; last=$(since_start "$slug" "$step" | cut -f2 | { grep -vE '^(clear|reply:.*|answer)$' || true; } | tail -1)
    case "$last" in
      done|fail|route:*|clarify|ask|flag) ;;
      *) owed="you have not handed off, so nobody knows this step is over. Run one of these with your shell tool (writing it as text does nothing): constellation done \"<handoff>\" · constellation clarify \"<questions>\" · constellation ask \"<question>\"" ;;
    esac
  fi
  local mem="$STATE/$(basename "$R")/$slug.$step${for:+.reply}.stopblocks"
  if [ -z "$owed" ]; then rm -f "$mem"; return 0; fi
  local n; n=$(( $(cat "$mem" 2>/dev/null || echo 0) + 1 ))
  if [ "$n" -gt 3 ]; then rm -f "$mem"; notify "$slug ($step) ended its turn three times without handing off — constellation status $slug"; return 0; fi
  printf '%s\n' "$n" >"$mem"
  if [ "$mode" = --claude ]; then
    printf '{"decision":"block","reason":%s}\n' "$(printf 'Constellation (%s, %s): %s' "$slug" "$step" "$owed" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
  else printf 'Constellation (%s, %s): %s\n' "$slug" "$step" "$owed"; return 1; fi
}

cmd_ask() {
  local q=${1:-}; [ -n "$q" ] || die 'usage: constellation ask "<question>"'
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] || die "not inside a constellation step"
  R=$(main_repo); record "$slug" "$step" ask "${CONSTELLATION_HARNESS:-}" "$q" "the operator answers: constellation answer $slug \"…\""
  notify "$slug ($step) asks: $q"
  say "asked; wait for the answer in this pane"
}
cmd_answer() {
  local slug=${1:-} text=${2:-}; [ -n "$slug" ] && [ -n "$text" ] || die 'usage: constellation answer <slug> "<text>"'
  R=$(main_repo); local nx; nx=$(next_step "$slug")
  if [[ "$nx" == clarifying:* ]]; then deliver_answer "$slug" "${nx#clarifying:}" operator "$text"; say "answered $slug (${nx#clarifying:})"; return; fi
  [[ "$nx" == wait:* ]] || die "$slug has no open question"
  local step=${nx#wait:}; record "$slug" "$step" answer "" "$text" "$step continues"
  tmux send-keys -t "=$SESSION:=$slug·$step" -l -- "The operator answered: $text" 2>/dev/null && tmux send-keys -t "=$SESSION:=$slug·$step" Enter \
    || say "(its pane is gone: constellation resume $slug carries the answer in the brief)"
  say "answered $slug ($step)"
}
