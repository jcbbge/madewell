#!/bin/sh
# .madewell/bin/mw-gate.sh — the Made Well wall. SPEC.md §6.
#
# A pre-commit refusal, not a tool: no arguments, no verbs, silent on success.
# It can only say no. Wire it into lefthook / .git/hooks/pre-commit / husky.
#
# Enforces, over the staged index:
#   - only the five legal moves (SPEC.md §3.1)
#   - no deletion from a lifecycle directory
#   - arrival only into a pool; every other directory is reached by moving
#   - the Commit floor (in / out / done-when) and the Plan floor (dependsOn)
#   - Land requires an empty inner pool and inner queue
#
# Each departure has exactly ONE legal destination, so moves are paired by computing
# that destination rather than by trusting git's similarity-based rename detection —
# an item edited while it moves (which Commit and Plan both do) can score below the
# rename threshold and arrive as a delete + add.
#
# Zero deps: POSIX sh + git + POSIX userland. Reads nothing outside the repo (Rule 1).
# Bypass, for a migration commit only: MW_GATE=off git commit …

set -eu

[ "${MW_GATE:-on}" = "off" ] && exit 0

git rev-parse --show-toplevel >/dev/null 2>&1 || exit 0
root=$(git rev-parse --show-toplevel)
[ -d "$root/.madewell" ] || exit 0

MW=.madewell
fail=0

say() { printf 'mw-gate: %s\n' "$1" >&2; fail=1; }
note() { printf '            %s\n' "$1" >&2; }

staged() { git show ":$1" 2>/dev/null || true; }

# Commit floor — in / out / done-when (SPEC.md §4.2).
check_bounded() {
  b=$(staged "$1")
  printf '%s\n' "$b" | grep -qi '^\*\*In:\*\*'        || say "$1 — Commit floor: no '**In:**' (SPEC.md §4.2)"
  printf '%s\n' "$b" | grep -qi '^\*\*Out:\*\*'       || say "$1 — Commit floor: no '**Out:**' (SPEC.md §4.2)"
  printf '%s\n' "$b" | grep -qi '^\*\*Done when:\*\*' || say "$1 — Commit floor: no '**Done when:**' (SPEC.md §4.2)"
}

# Plan floor — dependsOn (SPEC.md §4.3).
check_deps() {
  staged "$1" | grep -qi '^\*\*dependsOn:\*\*' \
    || say "$1 — Plan floor: no '**dependsOn:**' (SPEC.md §4.3)"
}

# Land floor — the Cycle's inner pool and inner queue are drained (SPEC.md §3.1 move 5).
check_drained() {
  for sub in pool queue; do
    left=$(git ls-files --cached -- "$MW/build/$1/$sub" 2>/dev/null | grep -v '\.gitkeep$' || true)
    if [ -n "$left" ]; then
      say "Land refused — $MW/build/$1/$sub is not empty (SPEC.md §3.1 move 5)"
      printf '%s\n' "$left" | sed 's/^/            still open: /' >&2
    fi
  done
}

# The one legal destination for a departure, or "" if leaving here is never legal.
destination_of() {
  d=$1
  base=${d##*/}
  case "$d" in
    "$MW"/pool/*.md)          printf '%s/queue/%s' "$MW" "$base" ;;                       # 1 Commit
    "$MW"/queue/*.md)         printf '%s/build/%s/ITEM.md' "$MW" "${base%.md}" ;;         # 2 Build opens
    "$MW"/build/*/pool/*.md)  c=${d#"$MW"/build/}; c=${c%%/*}
                              printf '%s/build/%s/queue/%s' "$MW" "$c" "$base" ;;         # 3 Plan
    "$MW"/build/*/queue/*.md) c=${d#"$MW"/build/}; c=${c%%/*}
                              printf '%s/build/%s/done/%s' "$MW" "$c" "$base" ;;          # 4 Verify
    "$MW"/build/*/ITEM.md)    c=${d#"$MW"/build/}; c=${c%%/*}
                              printf '%s/landed/%s.md' "$MW" "$c" ;;                      # 5 Land
    *)                        printf '' ;;
  esac
}

governed() {
  case "$1" in
    *.gitkeep) return 1 ;;
    "$MW"/pool/*|"$MW"/queue/*|"$MW"/build/*|"$MW"/landed/*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- collect departures and arrivals -----------------------------------------

work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"' EXIT INT TERM
: >"$work/dels"; : >"$work/adds"

git diff --cached --name-status --find-renames --diff-filter=ADR >"$work/raw"

while IFS='	' read -r st a b; do
  [ -n "${st:-}" ] || continue
  case "$st" in
    R*) governed "$a" && printf '%s\n' "$a" >>"$work/dels"
        governed "$b" && printf '%s\n' "$b" >>"$work/adds" ;;
    D*) governed "$a" && printf '%s\n' "$a" >>"$work/dels" ;;
    A*) governed "$a" && printf '%s\n' "$a" >>"$work/adds" ;;
  esac
done <"$work/raw"

# --- every departure must reach its one legal destination --------------------

: >"$work/consumed"
while IFS= read -r old; do
  [ -n "$old" ] || continue
  want=$(destination_of "$old")

  if [ -z "$want" ] || ! grep -Fxq "$want" "$work/adds"; then
    say "illegal departure: $old"
    if [ -n "$want" ]; then
      note "The only legal move from here is → $want (SPEC.md §3.1)."
      note "Items leave a lifecycle directory by moving, never by deletion."
    else
      note "Nothing may leave this path. No rewind, no skip (SPEC.md §3.1)."
    fi
    continue
  fi

  printf '%s\n' "$want" >>"$work/consumed"

  case "$old" in
    "$MW"/pool/*.md)          check_bounded "$want" ;;
    "$MW"/queue/*.md)         check_bounded "$want" ;;
    "$MW"/build/*/pool/*.md)  check_deps "$want" ;;
    "$MW"/build/*/ITEM.md)    c=${old#"$MW"/build/}; check_drained "${c%%/*}" ;;
  esac
done <"$work/dels"

# --- every arrival is either a consumed destination, or a new pool candidate --

while IFS= read -r new; do
  [ -n "$new" ] || continue
  grep -Fxq "$new" "$work/consumed" && continue
  case "$new" in
    "$MW"/pool/*.md|"$MW"/build/*/pool/*.md) ;;
    *)
      say "illegal arrival: $new"
      note "Only a pool may be written into directly; every other directory is reached"
      note "by one of the five legal moves (SPEC.md §3.1)."
      ;;
  esac
done <"$work/adds"

[ "$fail" -eq 0 ] || printf 'mw-gate: commit refused. MW_GATE=off bypasses, for a migration commit only.\n' >&2
exit "$fail"
