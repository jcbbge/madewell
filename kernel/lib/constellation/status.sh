# constellation — status: where every piece is. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

cmd_status() {
  R=$(main_repo)
  if [ -n "${1:-}" ]; then
    local slug=$1 s e h d where
    if [ -f "$R/$MW/bench/$slug.md" ]; then where='on the bench'
    elif broken_down "$slug"; then where="on the bench, in parts: $(parts_said "$slug")"
    elif [ -f "$R/$MW/finished/$slug.md" ]; then where=finished
    else where='not on the bench'; fi
    say "$slug — $where"
    while IFS=$'\t' read -r s e h d; do printf '  %-15s %-14s %-7s %s\n' "$s" "$e" "$h" "$d"; done < <(events "$slug")
    say "  next: $(next_step "$slug")"; return
  fi
  local f slug nx lastd any=0
  local pieces=(); mapfile -t pieces < <(bench_pieces)
  for f in ${pieces[@]+"${pieces[@]}"}; do
    slug=$(piece_slug "$f"); any=1
    nx=$(next_step "$slug" 2>/dev/null || echo "?")
    if broken_down "$slug"; then lastd=$(parts_said "$slug")
    else lastd=$(events "$slug" | grep -v $'\tstarted\t' | tail -1 | cut -f4 | cut -c1-70 || true); fi  # (grep finds nothing before the first handoff)
    printf '%-28s %-22s %s\n' "$slug" "$nx" "${lastd:-—}"
  done
  [ $any = 1 ] || say "nothing on the bench (constellation take <slug>)"
}
