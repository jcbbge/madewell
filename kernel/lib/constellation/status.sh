# constellation — status: where every piece is. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_status() {
  R=$(main_repo)
  if [ -n "${1:-}" ]; then
    local slug=$1 s e h d; say "$slug — $( [ -f "$R/$MW/bench/$slug.md" ] && echo 'on the bench' || { [ -f "$R/$MW/finished/$slug.md" ] && echo finished || echo 'not on the bench'; })"
    while IFS=$'\t' read -r s e h d; do printf '  %-15s %-14s %-7s %s\n' "$s" "$e" "$h" "$d"; done < <(events "$slug")
    say "  next: $(next_step "$slug")"; return
  fi
  local f slug nx any=0
  for f in "$R/$MW"/bench/*.md; do
    [ -e "$f" ] || continue; slug=$(basename "$f" .md); any=1
    nx=$(next_step "$slug" 2>/dev/null || echo "?")
    local lastd; lastd=$(events "$slug" | grep -v $'\tstarted\t' | tail -1 | cut -f4 | cut -c1-70)
    printf '%-28s %-22s %s\n' "$slug" "$nx" "${lastd:-—}"
  done
  [ $any = 1 ] || say "nothing on the bench (constellation take <slug>)"
}
