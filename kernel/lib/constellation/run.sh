# constellation — run and resume: launching a star, and the brief it reads. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

launch() { # launch <slug> <step> <harness> <model> <effort> <cmd> <note>
  local slug=$1 step=$2 h=$3 model=$4 effort=$5 cmd=$6 note=$7 star wt dir brief tl win
  star=$(star_of "$step"); wt=$(work_of "$slug")
  [ -d "$wt" ] || die "no worktree for $slug at $wt (constellation take $slug first)"
  h=${h:-${CONSTELLATION_HARNESS_DEFAULT:-$(star_field "$star" harness)}}; h=${h%%,*}; h=${h// /}; h=${h:-claude}; effort=${effort:-$(star_field "$star" effort)}; effort=${effort:-high}
  model=${model:-${CONSTELLATION_MODEL:-}}
  dir="$STATE/$(basename "$R")"; brief="$dir/$slug.$step.brief.md"; tl="$dir/$slug.$step.TASKS.md"
  compose_brief "$slug" "$step" "$note" >"$brief"
  [ -f "$tl" ] || printf '# Tasks\n\n## NOW\n\n## LATER\n\n## DONE\n' >"$tl"
  record "$slug" "$step" started "$h" "${note:-}" "constellation done, in the pane"
  local base; base=$(git -C "$wt" rev-parse HEAD)
  local run
  if [ -n "$cmd" ]; then run=${cmd//\{brief\}/$brief}
  else case "$h" in
    claude) run="claude --dangerously-skip-permissions --effort '$effort'${model:+ --model '$model'} \"\$(cat '$brief')\""
            trust "$wt" ;;
    pi)     run="pi --approve${model:+ --model '$model'} --thinking '$effort' \"\$(cat '$brief')\"" ;;
    *) die "harness $h: pass --cmd '<command with {brief}>' to run it" ;;
  esac; fi
  [ "${CONSTELLATION_DRY:-}" = 1 ] && run="sleep 3600"
  win="$slug·$step"
  tmux has-session -t "=$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _ -c "$wt"
  tmux kill-window -t "=$SESSION:=$win" 2>/dev/null || true
  tmux new-window -d -t "=$SESSION:" -n "$win" -c "$wt"
  tmux send-keys -t "=$SESSION:=$win" "export CONSTELLATION_PIECE='$slug' CONSTELLATION_STEP='$step' CONSTELLATION_REPO='$R' CONSTELLATION_BASE='$base' CONSTELLATION_HARNESS='$h' TASKS_FILE='$tl' AGENT_ROLE='$star' WORKER_ID='$slug' CIRCADIAN_ROLE=AGNT CIRCADIAN_LANE='$slug'${CONSTELLATION_MODEL:+ CONSTELLATION_MODEL='$CONSTELLATION_MODEL'}${CONSTELLATION_HARNESS_DEFAULT:+ CONSTELLATION_HARNESS_DEFAULT='$CONSTELLATION_HARNESS_DEFAULT'}${CONSTELLATION_STATE:+ CONSTELLATION_STATE='$CONSTELLATION_STATE'} PATH='$(dirname "$SELF")':\"\$PATH\"; clear; $run" Enter
  say "$slug: $step ($star, $(act_of "$step")) started on $h in $SESSION:$win"
}
trust() { # pre-accept Claude Code's folder-trust dialog for a worktree
  [ "${CONSTELLATION_DRY:-}" = 1 ] && return 0
  command -v jq >/dev/null && [ -f "$HOME/.claude.json" ] || return 0
  jq --arg p "$1" '.projects[$p] = ((.projects[$p] // {}) + {hasTrustDialogAccepted:true, hasClaudeMdExternalIncludesApproved:true})' \
    "$HOME/.claude.json" >"$HOME/.claude.json.tmp" && mv "$HOME/.claude.json.tmp" "$HOME/.claude.json"
}
compose_brief() { # compose_brief <slug> <step> <note>
  local slug=$1 step=$2 note=$3 star; star=$(star_of "$step")
  printf '# %s — %s\n\n' "$(sed -n '1s/^# //p' "$STARS/$star.md")" "$slug"
  printf 'You are wearing the %s profile for one step of this piece. The piece is the actor;\n' "$star"
  printf 'you are the hands for this step only. When it is done, hand off and stop.\n\n'
  printf 'Ignore any project instruction that makes you the host or tells you to talk to the person.\n'
  printf 'You are a star: you never speak to the person; the host does.\n\n'
  [ "$step" = polaris-peer ] && printf '**This step: peer, after Vega.**\n\n'
  [ "$step" = polaris-triage ] && printf '**This step: arbiter. A verify run failed; its output is in the run below.**\n\n'
  [ -n "$note" ] && printf '**Note for this start:** %s\n\n' "$note"
  printf '## First, the relay\n\n'
  printf 'Before any work, review what you were handed (the piece and the run below). Is anything\n'
  printf 'ambiguous, missing or contradictory for your step?\n'
  printf -- '- If nothing: `constellation clear`, then do the work.\n'
  printf -- '- If something: `constellation clarify "<your questions>"`, then stop and wait. Whoever\n'
  printf '  handed you this work answers in this pane. Repeat until nothing is left, then `constellation clear`.\n'
  printf 'Three rounds at most: a fourth set of questions goes to the person, because the brief is wrong.\n'
  printf '`constellation done` is refused until you have cleared.\n\n'
  if [ -f "$STARS/LAW.md" ]; then sed 's/^#/##/' "$STARS/LAW.md"   # the star law, one level under this brief
  else printf '## The star law\n\nMISSING: %s/LAW.md is not in this install; say so in your handoff.\n' "$STARS"; fi
  printf '\n'
  star_body "$star"; printf '\n'
  star_overlay "$star"
  local skills; skills=$(star_field "$star" skills)
  [ -n "$skills" ] && printf '\nLoad these skills if your harness has them: %s.\n' "$skills"
  printf '\n## The piece\n\n'; cat "$R/$MW/bench/$slug.md"
  printf '\n## The run so far (every handoff before you)\n\n'
  local s e h d any=0
  while IFS=$'\t' read -r s e h d; do
    [ "$e" = started ] && continue; any=1
    printf -- '- **%s** %s (%s): %s\n' "$s" "$e" "$h" "$d"
  done < <(events "$slug")
  [ $any = 1 ] || printf 'Nothing yet: you are first.\n'
  printf '\n## Where you are\n\n'
  printf -- '- Worktree: %s, branch %s. The main checkout is %s; do not work there.\n' "$(work_of "$slug")" "$(branch_of "$slug")" "$R"
  printf -- '- If an earlier start of this step was interrupted, read `git log` and `git status` here and continue from what is already done.\n'
  printf -- '- Every `constellation …` command here is run with your shell tool. Writing one as text does nothing.\n'
  printf -- '- Finish with `constellation done …` as your last act (it is on your PATH). Nothing else hands off, and\n'
  printf '  your turn cannot end without it: that is how the next star, and the host, learn you are done.\n'
}

cmd_run() { # cmd_run <slug> [flags] [resume]
  local slug=${1:-}; shift || true; [ -n "$slug" ] || die "usage: constellation run <slug> [--harness H] [--model M] [--effort E] [--cmd C]"
  local h="" model="" effort="" cmd="" resume=${RESUME:-0}
  while [ $# -gt 0 ]; do case "$1" in
    --harness) h=$2; shift;; --model) model=$2; shift;; --effort) effort=$2; shift;; --cmd) cmd=$2; shift;;
    *) die "unknown flag $1";; esac; shift; done
  R=$(main_repo); [ -f "$R/$MW/bench/$slug.md" ] || die "$slug is not on the bench (constellation take $slug)"
  local nx; nx=$(next_step "$slug")
  case "$nx" in
    running:*) if [ "$resume" = 1 ]; then launch "$slug" "${nx#running:}" "$h" "$model" "$effort" "$cmd" "resumed: the previous start of this step did not finish"
               else die "$slug: ${nx#running:} is already running (constellation resume $slug to start it again)"; fi ;;
    wait:*) die "$slug: ${nx#wait:} asked a question; answer it: constellation answer $slug \"…\"" ;;
    clarifying:*) if [ "$resume" = 1 ]; then launch "$slug" "${nx#clarifying:}" "$h" "$model" "$effort" "$cmd" "resumed while its questions were open; review the run and clarify again if you must"
                  else die "$slug: ${nx#clarifying:} is waiting for answers to its questions (constellation status $slug)"; fi ;;
    operator) if [ "$resume" = 1 ]; then local ls; ls=$(events "$slug" | tail -1 | cut -f1)
                launch "$slug" "$ls" "$h" "$model" "$effort" "$cmd" "the operator has looked at this step after it was flagged; start it again"; return; fi
              die "$slug needs the operator: see constellation status $slug (the last handoff says why)" ;;
    land) cmd_land "$slug" ;;
    *) if [ "$resume" = 1 ]; then launch "$slug" "$nx" "$h" "$model" "$effort" "$cmd" ""
       else launch "$slug" "$nx" "$h" "$model" "$effort" "$cmd" ""; fi ;;
  esac
}
