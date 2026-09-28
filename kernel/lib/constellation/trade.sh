# constellation — the trade: what a domain means by the thing, the check, and who may write what.
# Sourced by kernel/bin/constellation; never run directly. The kernel and the six stars stay the
# same in every domain; the active trade fills these in (today: software, the default).
# shellcheck shell=bash

TESTPATH='(^|/)(tests?|__tests__|spec|specs)/|[._-](test|spec)s?\.[A-Za-z0-9]+$|_test\.[A-Za-z0-9]+$'

check_write_rule() { # check_write_rule <step> <worktree> <base> : exit 1 with the reason on stdout when broken
  local step=$1 wt=$2 base=$3 changed bad
  changed=$(changed_since "$wt" "$base")
  case "$step" in
    orion)
      bad=$(grep -vE "$TESTPATH" <<<"$changed" | sed '/^$/d' || true)
      [ -z "$bad" ] || { printf 'orion changes only test files; these are not: %s' "$(tr '\n' ' ' <<<"$bad")"; return 1; } ;;
    sirius)
      bad=$(grep -E "$TESTPATH" <<<"$changed" | sed '/^$/d' || true)
      [ -z "$bad" ] || { printf 'sirius never touches tests; these are tests: %s' "$(tr '\n' ' ' <<<"$bad")"; return 1; } ;;
    *)
      [ -z "$(commits_since "$wt" "$base")" ] || { printf '%s changes nothing, but it committed: %s' "$step" "$(commits_since "$wt" "$base" | cut -c1-60 | tr '\n' ';')"; return 1; } ;;
  esac
  return 0
}

star_overlay() { # star_overlay <star> : what the active trade adds to that star's brief (nothing yet)
  return 0
}
