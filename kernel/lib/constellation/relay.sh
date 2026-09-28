# constellation — the relay and the handoffs: done, clear, clarify, reply, ask, answer, stop-check. Sourced by kernel/bin/constellation; never run directly.
# A question to the person arrives ready to answer in one word: situation, background, assessment
# (SBAR), a recommendation, and one or two other choices. yes takes the recommendation; a number
# takes that choice. Every handoff says, in plain words, that the work is saved.
# shellcheck shell=bash

changed_since() { git -C "$1" diff --name-only "$2" HEAD --; }
commits_since() { git -C "$1" log --format='%H %s' "$2..HEAD" | grep -v ' run(' || true; }
cmd_done() {
  local mode=done route="" text
  while [ $# -gt 0 ]; do case "$1" in
    --fail) mode=fail;; --route) mode=route; route=$2; shift;; *) break;; esac; shift; done
  text=${1:-}; [ -n "$text" ] || die 'usage: constellation done [--fail | --route sirius|orion|person] "<handoff>"'
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-} base=${CONSTELLATION_BASE:-}
  [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step (no CONSTELLATION_PIECE/STEP)"
  R=$(main_repo); local wt; wt=$(work_of "$slug")
  since_start "$slug" "$step" | cut -f2 | grep -qx clear || die "the relay comes first: review what you were handed, then constellation clear (or constellation clarify \"<questions>\")"
  [ -z "$(git -C "$wt" status --porcelain --untracked-files=no)" ] || die "uncommitted changes in the worktree: commit what belongs to this step, or undo it, then hand off"
  local why; why=$(check_write_rule "$step" "$wt" "$base") || die "$why"
  case "$mode" in
    fail) [ "$step" = aldebaran ] || die "only aldebaran fails a run"; record "$slug" "$step" fail "${CONSTELLATION_HARNESS:-}" "$text" "polaris (arbiter)" ;;
    route) [ "$step" = polaris-triage ] || die "only the arbiter routes"
           [ "$route" = person ] && route=operator   # the stars say the person; the record says operator
           case "$route" in sirius|orion|operator) ;; *) die "route to sirius, orion or person";; esac
           record "$slug" "$step" "route:$route" "${CONSTELLATION_HARNESS:-}" "$text" "$route" ;;
    done) [ "$step" != polaris-triage ] || die "the arbiter rules with --route"; local n; n=$(next_step_after "$slug" "$step")
          record "$slug" "$step" done "${CONSTELLATION_HARNESS:-}" "$text" "$n" ;;
  esac
  say "$slug: $step handed off"; saved "$slug" "$step"
  notify "$slug: $step $mode — $(cut -c1-80 <<<"$text")"
  if [ "${CONSTELLATION_AUTO:-1}" != 0 ]; then
    advance "$slug"
    [ "${CONSTELLATION_DRY:-}" = 1 ] || ( sleep 5; tmux kill-window -t "=$SESSION:=$slug·$step" 2>/dev/null ) >/dev/null 2>&1 &
  fi
}
advance() { # advance <slug> : start what comes after a handoff — the next star, the land, or an answering star
  local slug=$1 nx; nx=$(next_step "$slug")
  case "$nx" in operator|wait:*|running:*) notify "$slug needs the operator: constellation status $slug"; return 0;; esac
  if [[ "$nx" == clarifying:* ]] && [ "$(originator "$slug" "${nx#clarifying:}")" = operator ]; then return 0; fi
  if paused; then # a go that ran between the check and the hold has missed it: claim the list back
    hold "$slug"; paused || { drain_held; return 0; }
    say "Paused: $slug waits here; nothing new starts until go."; return 0
  fi
  case "$nx" in
    land) cmd_land "$slug" ;;
    clarifying:*) local st=${nx#clarifying:}
      launch_reply "$slug" "$st" "$(originator "$slug" "$st")" "$(since_start "$slug" "$st" | awk -F'\t' '$2 == "clarify" { q = $4 } END { print q }')" ;;
    *) ( CONSTELLATION_PIECE= CONSTELLATION_STEP= CONSTELLATION_BASE= launch "$slug" "$nx" "" "" "" "" "" ) ;;
  esac
}

# --- the save line: every handoff tells the person, in plain words, that nothing is lost ------
plain_act() { case "$1" in vega) echo 'thinking it through';; polaris-*) echo 'a second look';; cassiopeia) echo 'planning it';; sirius) echo 'making it';; orion) echo 'writing the checks';; aldebaran) echo 'checking it';; *) echo "$1";; esac; }
piece_name() { # the piece's own title, else its slug
  local f t; for f in "$R/$MW/bench/$1.md" "$R/$MW/finished/$1.md"; do
    [ -f "$f" ] && t=$(sed -n '1s/^#[[:space:]]*//p' "$f") && [ -n "$t" ] && { printf '%s' "$t"; return; }
  done; printf '%s' "$1"
}
saved() { say "Saved: $(piece_name "$1") — $(plain_act "$2"), just now. You can close this any time; say continue to pick up."; }

# --- a question to the person: SBAR, a recommendation, choices ---------------------------------
ASK_SHAPE='constellation ask "<question>" --situation "<what is happening>" --background "<what led here>" --assessment "<what you make of it>" --recommend "<what you would do>" --option "<another choice>" [--option "<a third>"]'
read_question() { # read_question "$@" : sets Q SIT BACK ASSESS REC OPTS
  Q="" SIT="" BACK="" ASSESS="" REC=""; OPTS=()
  while [ $# -gt 0 ]; do
    case "$1" in --situation|--background|--assessment|--recommend|--option) [ $# -ge 2 ] || die "$1 needs a value: $ASK_SHAPE";; esac
    case "$1" in
      --situation) SIT=$2; shift;; --background) BACK=$2; shift;; --assessment) ASSESS=$2; shift;;
      --recommend) REC=$2; shift;; --option) OPTS+=("$2"); shift;;
      --*) die "unknown flag $1: $ASK_SHAPE";;
      *) [ -z "$Q" ] || die "one question at a time; the rest goes in --situation, --background and --assessment"; Q=$1;;
    esac; shift
  done
}
sbar_given() { [ -n "$SIT$BACK$ASSESS$REC" ] || [ ${#OPTS[@]} -gt 0 ]; }
sbar_check() { # refuse a question the person cannot answer in one word; names what is missing
  local m="" o
  [ -n "$SIT" ] || m+=", the situation (--situation)"; [ -n "$BACK" ] || m+=", the background (--background)"
  [ -n "$ASSESS" ] || m+=", your assessment (--assessment)"; [ -n "$REC" ] || m+=", your recommendation (--recommend)"
  [ ${#OPTS[@]} -ge 1 ] || m+=", at least one other choice (--option)"
  for o in ${OPTS[@]+"${OPTS[@]}"}; do [ -n "$o" ] || { m+=", a choice with words in it"; break; }; done
  [ -z "$m" ] || die "a question to the person arrives ready to answer in one word; missing ${m#, }. Ask it this way: $ASK_SHAPE"
  [ ${#OPTS[@]} -le 2 ] || die "two or three choices in all: your recommendation and one or two --option. Ask it this way: $ASK_SHAPE"
}
sbar_text() { # the question as the person reads it
  local t="$Q — Situation: $SIT · Background: $BACK · Assessment: $ASSESS · Choices: 1. $REC (recommended)" i=2 o
  for o in "${OPTS[@]}"; do t+=" · $i. $o"; i=$((i + 1)); done
  printf '%s · Answer: yes (the recommendation) or a number.' "$t"
}
attach_choices() { # attach_choices <slug> : the choices ride on the question's own record, as trailers
  local wt body o; wt=$(work_of "$1"); body=$(git -C "$wt" log -1 --format=%B)
  body+=$'\n'"RECOMMEND: $(printf '%s' "$REC" | tr '\n' ' ')"
  for o in "${OPTS[@]}"; do body+=$'\n'"OPTION: $(printf '%s' "$o" | tr '\n' ' ')"; done
  git -C "$wt" -c core.hooksPath=/dev/null commit -q --amend --allow-empty -m "$body" || die "could not record the choices for $1"
}
choices_of() { # choices_of <slug> : the open question's recommendation, then its other choices, one per line
  { git -C "$R" log --all-match --grep='^STEP: ' --grep="^run($(sed 's/[.[\*^$]/\\&/g' <<<"$1")): " --format='%x1e%B' "$(branch_of "$1")" 2>/dev/null || true; } | awk -v RS='\x1e' '
    { ev = ""; n = split($0, L, "\n")
      for (i = 1; i <= n; i++) if (L[i] ~ /^EVENT: /) ev = substr(L[i], 8)
      if (ev != "ask" && ev != "clarify") next
      for (i = 1; i <= n; i++) if (L[i] ~ /^RECOMMEND: /) print substr(L[i], 12)
      for (i = 1; i <= n; i++) if (L[i] ~ /^OPTION: /) print substr(L[i], 9)
      exit }'
}
resolve_answer() { # resolve_answer <slug> <text> : yes → the recommendation, a number → that choice, else the words
  local slug=$1 text=$2 w c=() line; w=$(printf '%s' "$text" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
  while IFS= read -r line; do c+=("$line"); done < <(choices_of "$slug")
  [ ${#c[@]} -gt 0 ] || { printf '%s' "$text"; return 0; }
  case "$w" in yes|y) w=1;; esac
  [[ "$w" =~ ^[0-9]{1,3}$ ]] || { printf '%s' "$text"; return 0; }
  w=$((10#$w)); [ "$w" -ge 1 ] && [ "$w" -le ${#c[@]} ] || die "answer yes, or a number from 1 to ${#c[@]}"
  if [ "$w" = 1 ]; then printf 'yes — the recommendation: %s' "${c[0]}"; else printf 'choice %s: %s' "$w" "${c[$((w - 1))]}"; fi
}
next_step_after() { case "$2" in vega) echo polaris-peer;; polaris-peer) echo cassiopeia;; cassiopeia) echo sirius;; sirius) echo "orion or aldebaran";; orion) echo aldebaran;; aldebaran) echo land;; *) echo -;; esac; }

cmd_clear() {
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step"
  R=$(main_repo); record "$slug" "$step" clear "${CONSTELLATION_HARNESS:-}" "no open questions" "$step works"
  say "cleared: do the work, then constellation done"
}
cmd_clarify() { # to the operator it carries SBAR and choices like ask (a bare question still goes)
  read_question "$@"; local q=$Q; [ -n "$q" ] || die 'usage: constellation clarify "<questions>" [--situation … --background … --assessment … --recommend … --option …]'
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] && [ -n "$step" ] || die "not inside a constellation step"
  R=$(main_repo)
  if sbar_given; then sbar_check; q=$(sbar_text); fi
  local rounds; rounds=$(since_start "$slug" "$step" | cut -f2 | grep -cx clarify || true)
  if [ "${rounds:-0}" -ge 3 ]; then
    record "$slug" "$step" flag "${CONSTELLATION_HARNESS:-}" "still unclear after three rounds: $q" "the operator fixes the brief, then constellation resume $slug"
    notify "$slug ($step): three rounds of questions and still unclear — the brief needs you. constellation status $slug"
    say "flagged for the host: three rounds and still unclear means the brief is wrong. Stop here."
    saved "$slug" "$step"; return 0
  fi
  local orig; orig=$(originator "$slug" "$step")
  record "$slug" "$step" clarify "${CONSTELLATION_HARNESS:-}" "$q" "${orig} answers (round $((rounds + 1)) of 3)"
  if [ "$orig" = operator ]; then
    [ -z "$REC" ] || attach_choices "$slug"
    notify "$slug ($step) asks before starting: $q — constellation answer $slug \"…\""
    say "your questions went to the host; wait for the answer in this pane"
  else
    advance "$slug"
    say "your questions went to $(star_of "$orig"), who handed you this; wait for the answer in this pane"
  fi
  saved "$slug" "$step"
}
launch_reply() { # launch_reply <slug> <waiting-step> <originator-step> <questions>
  local slug=$1 step=$2 orig=$3 q=$4 ostar wt dir brief win run h effort
  ostar=$(star_of "$orig"); wt=$(work_of "$slug"); dir="$STATE/$(basename "$R")"; brief="$dir/$slug.$step.reply.brief.md"
  h=${CONSTELLATION_HARNESS_DEFAULT:-$(star_field "$ostar" harness)}; h=${h:-claude}; effort=$(star_field "$ostar" effort); effort=${effort:-high}
  { printf '# %s — answering for %s\n\n' "$(sed -n '1s/^# //p' "$STARS/$ostar.md")" "$slug"
    printf 'You are wearing the %s profile again. You (this profile) handed this piece to %s, and\n' "$ostar" "$(star_of "$step")"
    printf '%s has questions before it starts. Answer every one, from the piece, the run and the code.\n' "$(star_of "$step")"
    printf 'Change nothing. When the answer is genuinely the person'"'"'s, say so in your answer.\n'
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
  local who=$from; [ "$from" = operator ] && who="the host"
  local msg="Answers from $who: $text — If anything is still ambiguous: constellation clarify \"…\". Otherwise: constellation clear, then do the work."
  tmux send-keys -t "=$SESSION:=$slug·$step" -l -- "$msg" 2>/dev/null && tmux send-keys -t "=$SESSION:=$slug·$step" Enter \
    || say "(its pane is gone: constellation resume $slug carries the answer in the brief)"
}
cmd_reply() {
  local a=${1:-}; [ -n "$a" ] || die 'usage: constellation reply "<answers>"'
  local slug=${CONSTELLATION_PIECE:-} for=${CONSTELLATION_REPLY_FOR:-}; [ -n "$slug" ] && [ -n "$for" ] || die "not answering for a step (no CONSTELLATION_REPLY_FOR)"
  R=$(main_repo); [[ "$(next_step "$slug")" == "clarifying:$for" ]] || die "$for is not waiting for answers"
  deliver_answer "$slug" "$for" "$(star_of "${CONSTELLATION_STEP:-}")" "$a"
  say "answered $for"; saved "$slug" "${CONSTELLATION_STEP:-}"
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
      *) owed="you have not handed off, so nobody knows this step is over. Run one of these with your shell tool (writing it as text does nothing): constellation done \"<handoff>\" · constellation clarify \"<questions>\" · $ASK_SHAPE" ;;
    esac
  fi
  [ -z "$owed" ] || ! paused || owed="everything is paused: finish with your handoff, then stop; nothing new starts after it. $owed"
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
  read_question "$@"; [ -n "$Q" ] || die "usage: $ASK_SHAPE"
  local slug=${CONSTELLATION_PIECE:-} step=${CONSTELLATION_STEP:-}; [ -n "$slug" ] || die "not inside a constellation step"
  sbar_check; local q; q=$(sbar_text)
  R=$(main_repo); record "$slug" "$step" ask "${CONSTELLATION_HARNESS:-}" "$q" "the operator answers: constellation answer $slug yes (or a number)"
  attach_choices "$slug"
  notify "$slug ($step) asks: $Q — constellation answer $slug yes (or a number)"
  say "asked; wait for the answer in this pane"; saved "$slug" "$step"
}
cmd_answer() { # yes takes the recommendation, a number takes that choice, anything else goes as written
  local slug=${1:-} text=${2:-}; [ -n "$slug" ] && [ -n "$text" ] || die 'usage: constellation answer <slug> yes | <number> | "<text>"'
  R=$(main_repo); local nx; nx=$(next_step "$slug")
  [[ "$nx" == clarifying:* || "$nx" == wait:* ]] || die "$slug has no open question"
  text=$(resolve_answer "$slug" "$text") || exit 2
  if [[ "$nx" == clarifying:* ]]; then deliver_answer "$slug" "${nx#clarifying:}" operator "$text"; say "answered $slug (${nx#clarifying:}): $text"; return; fi
  local step=${nx#wait:}; record "$slug" "$step" answer "" "$text" "$step continues"
  tmux send-keys -t "=$SESSION:=$slug·$step" -l -- "The person answered: $text" 2>/dev/null && tmux send-keys -t "=$SESSION:=$slug·$step" Enter \
    || say "(its pane is gone: constellation resume $slug carries the answer in the brief)"
  say "answered $slug ($step): $text"
}
