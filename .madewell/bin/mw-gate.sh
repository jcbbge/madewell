#!/bin/sh
# .madewell/bin/mw-gate.sh — the Made Well wall. SPEC.md §6.
#
# A pre-commit refusal, not a tool: no arguments, no verbs, silent on success.
# It can only say no.
#
# Four directory names — shaping, committed, making, landed — recurring at every depth.
# Work moves forward through them and never back. This enforces, over the staged index:
#
#   shaping/X.md      -> committed/X.md          (needs In / Out / Done when)
#   committed/X.md    -> making/X.md             a leaf
#   committed/X.md    -> making/X/ITEM.md        breaks down
#   making/X.md       -> landed/X.md
#   making/X/ITEM.md  -> landed/X.md             needs its children drained
#
# ...plus: nothing is ever deleted, and nothing arrives anywhere but a shaping/.
#
# Departures are paired with arrivals by COMPUTING the legal destination, not by trusting
# git's similarity-based rename detection — a file edited while it moves (which the commit
# move always does) can score below the rename threshold and show up as delete + add.
#
# Zero deps: POSIX sh + git + POSIX userland. Reads nothing outside the repo (Rule 1).
# Bypass, for an adoption commit only: MW_GATE=off git commit …

set -eu

[ "${MW_GATE:-on}" = "off" ] && exit 0

git rev-parse --show-toplevel >/dev/null 2>&1 || exit 0
[ -d "$(git rev-parse --show-toplevel)/.madewell" ] || exit 0

MW=.madewell
fail=0

say()  { printf 'mw-gate: %s\n' "$1" >&2; fail=1; }
note() { printf '            %s\n' "$1" >&2; }

staged() { git show ":$1" 2>/dev/null || true; }

# In / Out / Done when (SPEC.md §4.2).
check_bounded() {
  b=$(staged "$1")
  printf '%s\n' "$b" | grep -qi '^\*\*In:\*\*'        || say "$1 — no '**In:**' (SPEC.md §4.2)"
  printf '%s\n' "$b" | grep -qi '^\*\*Out:\*\*'       || say "$1 — no '**Out:**' (SPEC.md §4.2)"
  printf '%s\n' "$b" | grep -qi '^\*\*Done when:\*\*' || say "$1 — no '**Done when:**' (SPEC.md §4.2)"
}

# dependsOn, required of a child under a parent (SPEC.md §4.3).
check_deps() {
  staged "$1" | grep -qi '^\*\*dependsOn:\*\*' \
    || say "$1 — no '**dependsOn:**' (SPEC.md §4.3)"
}

# A parent may land only when its own shaping, committed and making are empty.
check_drained() {
  for sub in shaping committed making; do
    left=$(git ls-files --cached -- "$1/$sub" 2>/dev/null | grep -v '\.gitkeep$' || true)
    if [ -n "$left" ]; then
      say "cannot land $1 — its $sub/ is not empty (SPEC.md §3.1)"
      printf '%s\n' "$left" | sed 's|^|            still open: |' >&2
    fi
  done
}

# Split a lifecycle path into: container | bucket | name.
# .madewell[/making/<slug>]* /<bucket>/<name>       -> P, bucket, name
# .madewell[/making/<slug>]* /making/<slug>/ITEM.md -> P, "ITEM", slug
parse() {
  # NOTE: sh has no locals — every temp here is suffixed so it cannot clobber a caller's
  # loop variable. That bug cost a debugging round; do not un-suffix them.
  P_=""; B_=""; N_=""
  case "$1" in
    */ITEM.md)
      d_=${1%/ITEM.md}           # P/making/slug
      N_=${d_##*/}               # slug
      q_=${d_%/*}                # P/making
      case "$q_" in *"/making") P_=${q_%/making}; B_=ITEM ;; *) return 1 ;; esac
      ;;
    *)
      N_=${1##*/}                # name.md
      d_=${1%/*}                 # P/bucket
      B_=${d_##*/}
      P_=${d_%/*}
      case "$B_" in shaping|committed|making|landed) ;; *) return 1 ;; esac
      ;;
  esac
  # The container must be .madewell, or .madewell/making/<slug> at any depth.
  case "$P_" in
    "$MW") return 0 ;;
    "$MW"/making/*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- collect departures and arrivals -----------------------------------------

work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"' EXIT INT TERM
: >"$work/dels"; : >"$work/adds"; : >"$work/consumed"

git diff --cached --name-status --find-renames --diff-filter=ADR >"$work/raw"

while IFS='	' read -r st a b; do
  [ -n "${st:-}" ] || continue
  case "$st" in R*) o=$a; n=$b ;; D*) o=$a; n="" ;; A*) o=""; n=$a ;; *) continue ;; esac
  for p in $o $n; do
    case "$p" in "$MW"/*) ;; *) continue ;; esac
    case "$p" in *.gitkeep) continue ;; esac
    parse "$p" || { say "not a lifecycle path: $p"
                    note "Everything under $MW/ must sit in shaping/, committed/, making/ or landed/."
                    continue; }
    [ "$p" = "$o" ] && printf '%s\n' "$p" >>"$work/dels"
    [ "$p" = "$n" ] && printf '%s\n' "$p" >>"$work/adds"
  done
done <"$work/raw"

# --- each departure must reach its one legal destination ---------------------

while IFS= read -r old; do
  [ -n "$old" ] || continue
  parse "$old" || continue
  P=$P_; B=$B_; N=$N_
  base=${N%.md}
  d1=""; d2=""

  case "$B" in
    shaping)   d1="$P/committed/$N" ;;
    committed) d1="$P/making/$N"; d2="$P/making/$base/ITEM.md" ;;
    making)    d1="$P/landed/$N" ;;
    ITEM)      d1="$P/landed/$N.md" ;;
    landed)    d1="" ;;
  esac

  got=""
  [ -n "$d1" ] && grep -Fxq "$d1" "$work/adds" && got=$d1
  [ -z "$got" ] && [ -n "$d2" ] && grep -Fxq "$d2" "$work/adds" && got=$d2

  if [ -z "$got" ]; then
    say "illegal departure: $old"
    if [ "$B" = landed ]; then
      note "Nothing leaves landed/. No rewind (SPEC.md §3.1)."
    elif [ -n "$d2" ]; then
      note "The only moves from here are → $d1 (a leaf)"
      note "                            or → $d2 (breaks down)."
    else
      note "The only move from here is → $d1 (SPEC.md §3.1)."
      note "Things leave a lifecycle directory by moving, never by deletion."
    fi
    continue
  fi

  printf '%s\n' "$got" >>"$work/consumed"

  case "$B" in
    shaping)   check_bounded "$got" ;;
    committed) check_bounded "$got"
               # A child under a parent must declare its order before work starts.
               [ "$P" = "$MW" ] || check_deps "$got" ;;
    ITEM)      check_drained "$P/making/$N" ;;
  esac
done <"$work/dels"

# --- each arrival is a consumed destination, or a new shaping candidate ------

while IFS= read -r new; do
  [ -n "$new" ] || continue
  grep -Fxq "$new" "$work/consumed" && continue
  parse "$new" || continue
  if [ "$B_" != shaping ]; then
    say "illegal arrival: $new"
    note "Only shaping/ may be written into directly. Everywhere else is reached by"
    note "moving something that was already there (SPEC.md §3.1)."
  fi
done <"$work/adds"

[ "$fail" -eq 0 ] || printf 'mw-gate: refused. MW_GATE=off bypasses, for an adoption commit only.\n' >&2
exit "$fail"
