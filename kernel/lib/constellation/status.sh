# constellation — status: where every piece is. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

finish_commit() { # finish_commit <slug> : "<hash>, <date>" of the move that finished it: the one commit that takes
  # bench/<slug>.md (or bench/<slug>/PIECE.md) out of a folder and puts finished/<slug>.md into that same folder,
  # so a later move of the whole folder (a rename) is not taken for it
  git -C "$R" log --no-renames --name-status --format=$'\x1e%h, %ad' --date=short -- \
    ":(glob)*/finished/$1.md" ":(glob)*/bench/$1.md" ":(glob)*/bench/$1/PIECE.md" 2>/dev/null | awk -v RS='\x1e' -v s="$1" '
    { n = split($0, L, "\n"); delete a; delete d
      for (i = 2; i <= n; i++) {
        if (L[i] ~ "^A\t[^/]+/finished/" && L[i] == "A\t" substr(L[i], 3, index(L[i], "/") - 3) "/finished/" s ".md") a[substr(L[i], 3, index(L[i], "/") - 3)] = 1
        if (L[i] ~ "^D\t[^/]+/bench/") { p = substr(L[i], 3, index(L[i], "/") - 3)
          if (L[i] == "D\t" p "/bench/" s ".md" || L[i] == "D\t" p "/bench/" s "/PIECE.md") d[p] = 1 }
      }
      for (p in a) if (p in d) { print L[1]; exit } }'
}

cmd_status() {
  R=$(main_repo)
  if [ -n "${1:-}" ]; then
    local slug=$1 s e h d where
    if [ -f "$R/$CST/bench/$slug.md" ]; then where='on the bench'
    elif broken_down "$slug"; then where="on the bench, in parts: $(parts_said "$slug")"
    elif [ -f "$R/$CST/finished/$slug.md" ]; then where=finished
    else where='not on the bench'; fi
    say "$slug — $where"
    while IFS=$'\t' read -r s e h d; do printf '  %-15s %-14s %-7s %s\n' "$s" "$e" "$h" "$d"; done < <(events "$slug")
    local nx; nx=$(next_step "$slug")
    if [ "$nx" = done ]; then  # the finish commit is the one that put it in finished/ (land deletes its branch)
      local fin; fin=$(finish_commit "$slug")
      say "  done${fin:+: finished in $fin}"; return
    fi
    say "  next: $nx"; return
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
