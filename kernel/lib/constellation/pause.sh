# constellation — pause and go: one word stops every piece at its next handoff, one word starts them again. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
# A pause is the operator's, on this machine: a file in the state directory, never in the run record.
# Nothing is killed. A star at work finishes its step and hands off (the stop gate still holds it to
# that); the handoff is recorded as always, and what would have started next is held instead. go
# starts what was held. While paused, run and resume are refused: no new step starts.

pause_file() { printf '%s/%s/PAUSED' "$STATE" "$(basename "$R")"; }
held_file() { printf '%s/%s/held' "$STATE" "$(basename "$R")"; }
paused() { [ -e "$(pause_file)" ]; }
hold() { mkdir -p "$(dirname "$(held_file)")"; printf '%s\n' "$1" >>"$(held_file)"; }
not_paused() { # refuse a new start while paused
  R=$(main_repo); ! paused || die "everything is paused: nothing new starts until go (constellation go)"
}

cmd_pause() {
  R=$(main_repo)
  if paused; then say "Already paused. Say go to pick up."; return 0; fi
  mkdir -p "$(dirname "$(pause_file)")"; now >"$(pause_file)"
  notify "paused: every piece stops at its next handoff — constellation go to pick up"
  say "Paused. Whatever is being worked on finishes the step it is on and saves; nothing new starts. Say go to pick up."
}

drain_held() { # start everything held; the list is claimed by a rename, so go and a late hold never both start a piece
  local claim slug; claim="$(held_file).$$.$RANDOM"; DRAINED=()
  mv "$(held_file)" "$claim" 2>/dev/null || return 0
  while IFS= read -r slug; do [ -n "$slug" ] && DRAINED+=("$slug"); done < <(awk '!seen[$0]++' "$claim")
  rm -f "$claim"
  for slug in ${DRAINED[@]+"${DRAINED[@]}"}; do ( advance "$slug" ) || say "$slug: could not start again (constellation status $slug)"; done
}

cmd_go() {
  R=$(main_repo); local was=0
  paused && was=1; rm -f "$(pause_file)"
  [ $was = 1 ] || [ -f "$(held_file)" ] || { say "Nothing is paused."; return 0; }
  notify "going again"; drain_held
  say "Going again.${DRAINED[0]:+ Picked up: ${DRAINED[*]}.}"
}
