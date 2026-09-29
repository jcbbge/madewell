# constellation — inbox: the drop box. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# The person drops anything into the project's ideas/ folder (notes, markdown, a call
# transcript, a voice memo, a photo of a whiteboard) and never learns a command. The inbox
# finds what is new there:
#   - each text file is moved to ideas/read/ and the discovery act starts on it there
#     (constellation discover: its pieces land on the rack, citing ideas/read/<file>);
#   - anything else is listed for the host to read with its own tools; the host thinks it
#     through with the discovery skill, then files it: constellation inbox --read <file>.
# It prints nothing when nothing is new, and what it prints is for the host, not the person.
#
# The host hook: every session start runs, from the project root,
#   .constellation/bin/constellation inbox || true
# and the host reads its output. As a Claude Code SessionStart hook, in the project's settings:
#   {"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":".constellation/bin/constellation inbox || true"}]}]}}
# Any other harness: whatever it runs at session start, with the output put in front of the agent.
# The drop box is the host's: inside a star's step or a discovery act (the same hook fires
# there too) it does nothing, so no star or discovery picks up what the person dropped.

IDEAS=ideas

cmd_inbox() {
  [ -z "${CONSTELLATION_STEP:-}${CONSTELLATION_DISCOVERING:-}" ] || return 0
  R=$(main_repo); local box="$R/$IDEAS" f rel
  if [ "${1:-}" = --read ]; then
    shift; [ $# -gt 0 ] || die "usage: constellation inbox --read <file>…"
    for f in "$@"; do
      rel=$(inbox_resolve "$f") || die "$f is not a new file in $IDEAS/"
      local to; to=$(inbox_file_away "$rel") || die "could not file $rel"; say "filed $rel → $to"
    done; return 0
  fi
  [ $# -eq 0 ] || die "usage: constellation inbox [--read <file>…]"
  mkdir -p "$box"
  local texts=() others=() empties=() to
  while IFS= read -r -d '' f; do
    rel=$IDEAS/$(basename "$f")
    if [ ! -s "$f" ]; then empties+=("$rel")
    elif LC_ALL=C grep -Iq . "$f"; then texts+=("$rel")
    else others+=("$rel"); fi
  done < <(find "$box" -mindepth 1 -maxdepth 1 -type f ! -name '.*' -print0 | sort -z)
  [ $((${#texts[@]} + ${#others[@]} + ${#empties[@]})) -gt 0 ] || return 0

  say "New in $IDEAS/ (the drop box):"
  if [ ${#texts[@]} -gt 0 ]; then
    if discover_ready; then
      for rel in "${texts[@]}"; do
        local out; to=$(inbox_file_away "$rel") || continue   # another session took it first
        if out=$(discover_start "$R/$to"); then say "  thinking through $to — $out"
        else inbox_unfile "$to" "$rel"; say "  could not start thinking through $rel; it stays in $IDEAS/"; fi
      done
    else
      for rel in "${texts[@]}"; do say "  $rel: no harness here to think it through (claude or pi on PATH); it stays in $IDEAS/"; done
    fi
  fi
  for rel in "${empties[@]}"; do to=$(inbox_file_away "$rel") && say "  set aside $rel → $to (it was empty)"; done
  if [ ${#others[@]} -gt 0 ]; then
    say "  for you to read (not text):"
    for rel in "${others[@]}"; do say "    $rel"; done
    say "  Read each with your own tools, think it through with the discovery skill ($CST/skills/discovery.md),
  then file it so it is not new again: constellation inbox --read <file>"
  fi
  [ ${#texts[@]} -eq 0 ] || say "Tell the person, in plain words, that you are thinking their ideas through; what comes of them will be on the ideas list."
}

inbox_resolve() { # inbox_resolve <file> : its path relative to the project, if it is a new file in ideas/
  local f=$1 box abs; box=$(readlink -f "$R/$IDEAS") || return 1
  if [ -f "$f" ]; then abs=$(readlink -f "$f"); elif [ -f "$R/$f" ]; then abs=$(readlink -f "$R/$f"); elif [ -f "$box/$f" ]; then abs=$(readlink -f "$box/$f"); else return 1; fi
  [ "$(dirname "$abs")" = "$box" ] || return 1
  printf '%s/%s' "$IDEAS" "$(basename "$abs")"
}

inbox_file_away() { # inbox_file_away <ideas/x> : move it into ideas/read/ under a free name; prints the new path
  local rel=$1 base stem ext to n=2; base=$(basename "$rel"); mkdir -p "$R/$IDEAS/read"
  case "$base" in ?*.*) stem=${base%.*}; ext=.${base##*.} ;; *) stem=$base; ext="" ;; esac
  to=$IDEAS/read/$base
  while [ -e "$R/$to" ]; do to=$IDEAS/read/$stem.$n$ext; n=$((n + 1)); done
  if git -C "$R" ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then # the person keeps ideas/ in git: the move is a commit
    repo_lock   # one writer at a time in the main checkout
    [ -e "$R/$rel" ] || { repo_unlock; return 1; }   # another session filed it while this one waited
    while [ -e "$R/$to" ]; do to=$IDEAS/read/$stem.$n$ext; n=$((n + 1)); done
    git -C "$R" mv -- "$rel" "$to" && git -C "$R" commit -q -m "chore(ideas): read $base" -m "ACT: ideate
DONE: $rel is in hand for discovery, at $to
NEXT: —" -- "$rel" "$to" >/dev/null || printf 'constellation: the move of %s is staged but not committed\n' "$rel" >&2
    repo_unlock   # let go before discovery starts: an agent must never hold the checkout
  else
    mv -- "$R/$rel" "$R/$to" 2>/dev/null || return 1
  fi
  printf '%s' "$to"
}

inbox_unfile() { # inbox_unfile <ideas/read/x> <ideas/x> : put an untracked file back where it was dropped
  git -C "$R" ls-files --error-unmatch -- "$1" >/dev/null 2>&1 && return 0
  [ -e "$R/$2" ] || mv -- "$R/$1" "$R/$2"
}
