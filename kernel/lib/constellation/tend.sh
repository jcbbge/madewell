# constellation — tend: the night shift. One pass over every piece on the bench; a step whose agent
# died, hit a usage limit or went quiet starts again by itself, on the next harness. Sourced by
# kernel/bin/constellation; never run directly. The timer (bindings/constellation-tend.timer) runs
# `constellation tend --all` every five minutes.
# shellcheck shell=bash

TEND_TRIES=2   # restarts per step; after that the step is flagged and the person is asked
TEND_LIMIT='usage limit|hit your [a-z -]*limit|rate[ _-]?limit|limit reached|limit will reset|quota exceeded|exceeded your [a-z ]*quota|too many requests|error: 429'

cmd_tend() { # cmd_tend [--all] : this project's bench, or every project with a piece worktree under $STATE
  case "${1:-}" in
    "") R=$(main_repo); tend_bench ;;
    --all) local r; while read -r r; do ( R=$r; tend_bench ) || say "$(basename "$r"): could not tend this project"; done < <(tend_projects) ;;
    *) die "usage: constellation tend [--all]" ;;
  esac
}
tend_projects() { # the main checkout behind every piece worktree in $STATE, once each
  local wt c
  for wt in "$STATE"/*/*/; do
    [ -e "$wt.git" ] || continue
    c=$(git -C "$wt" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || continue
    [ -d "$(dirname "$c")/$MW/bench" ] && dirname "$c"
  done | sort -u
}
tend_bench() { # one pass over R's bench: only a running step can have lost its agent
  local f slug nx why
  ! paused || return 0   # paused: a quiet step is meant to be quiet
  for f in "$R/$MW"/bench/*.md; do
    [ -e "$f" ] || continue; slug=$(basename "$f" .md)
    nx=$(next_step "$slug" 2>/dev/null) || continue
    [[ "$nx" == running:* ]] || continue
    why=$(tend_trouble "$slug" "${nx#running:}") || continue
    ( tend_restart "$slug" "${nx#running:}" "$why" ) || say "$slug: could not start ${nx#running:} again; see constellation status $slug"
  done
}
tend_trouble() { # tend_trouble <slug> <step> : prints gone | limit | quiet, or fails when the step looks alive
  local t="=$SESSION:=$1·$2" act last
  act=$(tmux list-windows -t "=$SESSION" -F '#{window_activity} #{window_name}' 2>/dev/null | awk -v w="$1·$2" '{ a = $1; sub(/^[^ ]* /, "") } $0 == w { print a; exit }')
  [ -n "$act" ] || { echo gone; return 0; }   # (display-message falls back to the current window when its target is gone)
  tmux capture-pane -p -t "$t" 2>/dev/null | sed '/^[[:space:]]*$/d' | tail -n 15 | grep -qiE "$TEND_LIMIT" && { echo limit; return 0; }
  last=$(git -C "$R" log -1 --format=%ct "$(branch_of "$1")" 2>/dev/null || echo 0)
  [ "${last:-0}" -gt "${act:-0}" ] && act=$last
  [ $(( $(date +%s) - ${act:-0} )) -ge "${CONSTELLATION_STUCK_SECONDS:-1800}" ] && { echo quiet; return 0; }
  return 1
}
tend_tries() { # tend_tries <slug> <step> : night-shift restarts of this run of the step (a flag starts the count again)
  events "$1" | awk -F'\t' -v s="$2" '$1 != s || $2 == "flag" { n = 0; next } $2 == "started" && index($4, "night shift:") == 1 { n++ } END { print n + 0 }'
}
tend_harnesses() { # tend_harnesses <star> : its harness: line as a list, first preferred; a lone claude or pi gets the other after it
  local hs=(); IFS=', ' read -ra hs <<<"$(star_field "$1" harness)"
  [ ${#hs[@]} -gt 0 ] || hs=(claude)
  [ ${#hs[@]} -eq 1 ] && case "${hs[0]}" in claude) hs+=(pi) ;; pi) hs+=(claude) ;; *) hs+=(claude pi) ;; esac
  printf '%s\n' "${hs[@]}"
}
tend_next_harness() { # tend_next_harness <star> <current> : the one after current in the list (wrapping), else the first
  local hs=() i; mapfile -t hs < <(tend_harnesses "$1")
  for i in "${!hs[@]}"; do [ "${hs[$i]}" = "$2" ] && { echo "${hs[$(( (i + 1) % ${#hs[@]} ))]}"; return; }; done
  echo "${hs[0]}"
}
tend_restart() { # tend_restart <slug> <step> <gone|limit|quiet>
  local slug=$1 step=$2 why=$3 tries cur h what reason
  tries=$(tend_tries "$slug" "$step"); what=$(tend_plain_step "$step")
  case "$why" in
    gone) reason="its window closed" ;;
    limit) reason="it hit a usage limit" ;;
    *) reason="it went quiet for $(( ${CONSTELLATION_STUCK_SECONDS:-1800} / 60 )) minutes" ;;
  esac
  if [ "$tries" -ge "$TEND_TRIES" ]; then
    record "$slug" "$step" flag "" "night shift: $why again after $tries restarts; stopped trying" "the operator looks, then constellation resume $slug"
    tend_tell "$slug: $what stopped again ($reason). I have already started it again twice, so I have stopped trying: it needs you. Tell me when to pick it up again."
    return 0
  fi
  cur=$(events "$slug" | awk -F'\t' -v s="$step" '$1 == s && $2 == "started" { h = $3 } END { print h }')
  h=$(tend_next_harness "$(star_of "$step")" "$cur")
  launch "$slug" "$step" "$h" "" "" "" "night shift: the last agent stopped ($why, on ${cur:--}); started again on $h, attempt $((tries + 1)) of $TEND_TRIES" >/dev/null
  tend_tell "$slug: $what stopped ($reason), so I started it again with a different assistant ($h). That was try $((tries + 1)) of $TEND_TRIES."
}
tend_plain_step() { # the person's words for a step
  case "$1" in
    vega) echo "thinking it through" ;; polaris-*) echo "a second look" ;; cassiopeia) echo "planning it" ;;
    sirius) echo "making it" ;; orion) echo "writing the checks" ;; aldebaran) echo "checking it" ;; *) echo "the work" ;;
  esac
}
tend_tell() { say "$1"; notify "$1"; }
