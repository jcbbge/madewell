#!/bin/sh
# .constellation/bin/cst-gate.sh — the jig. SPEC.md §5.
#
# A pre-commit stop, not a tool: no arguments, no verbs, silent on success.
# It can only refuse.
#
# Two state directories — stock, bench — recurring at every depth. Work moves one direction,
# and done work leaves the tree: its record is the finish commit. This enforces, over the staged index:
#
#   stock/X.md      -> bench/X.md          a leaf        (needs the floor)
#   stock/X.md      -> bench/X/PIECE.md    breaks down   (needs the floor)
#   bench/X.md      -> removed             at land, the finish commit
#   bench/X/PIECE.md-> removed             at land, with all of bench/X/ (needs its stock/ + bench/ empty)
#
# ...plus: nothing is deleted from stock/, and nothing arrives anywhere but stock/. finished/ is
# retired: nothing arrives there, and an old one may only be taken away (its history is in git).
#
# Departures from stock/ pair with arrivals by COMPUTING the legal destination rather than trusting git's
# similarity-based rename detection — a file edited while it moves (the bench move always
# edits it, to add the floor) can score below the threshold and arrive as delete + add.
#
# Zero deps: POSIX sh + git + POSIX userland. Reads nothing outside the repo.
# Bypass, for an adoption commit only: CONSTELLATION_GATE=off git commit …

set -eu

[ "${CONSTELLATION_GATE:-on}" = "off" ] && exit 0
git rev-parse --show-toplevel >/dev/null 2>&1 || exit 0
[ -d "$(git rev-parse --show-toplevel)/.constellation" ] || exit 0

CST=.constellation
fail=0
say()  { printf 'cst-gate: %s\n' "$1" >&2; fail=1; }
note() { printf '            %s\n' "$1" >&2; }
staged() { git show ":$1" 2>/dev/null || true; }

# The floor — Making / Not making / Done when / Waits on (SPEC.md §3).
check_floor() {
  b=$(staged "$1")
  printf '%s\n' "$b" | grep -qi '^\*\*Making:\*\*'      || say "$1 — no '**Making:**' (SPEC.md §3)"
  printf '%s\n' "$b" | grep -qi '^\*\*Not making:\*\*'  || say "$1 — no '**Not making:**' (SPEC.md §3)"
  printf '%s\n' "$b" | grep -qi '^\*\*Done when:\*\*'   || say "$1 — no '**Done when:**' (SPEC.md §3)"
  printf '%s\n' "$b" | grep -qi '^\*\*Waits on:\*\*'    || say "$1 — no '**Waits on:**' (SPEC.md §3)"
}

# Finishing a piece that breaks down requires its inner stock/ and bench/ to be empty.
check_drained() {
  for sub in stock bench; do
    left=$(git ls-files --cached -- "$1/$sub" 2>/dev/null | grep -v '\.gitkeep$' || true)
    if [ -n "$left" ]; then
      say "cannot finish $1 — its $sub/ is not empty (SPEC.md §2)"
      printf '%s\n' "$left" | sed 's|^|            still open: |' >&2
    fi
  done
}

# Split a state path into container | state | name.
#   P/<state>/<name>        -> P, state, name
#   P/bench/<slug>/PIECE.md -> P, PIECE, slug
parse() {
  # sh has no locals — every temp is suffixed so it cannot clobber a caller's loop variable.
  P_=""; S_=""; N_=""
  case "$1" in
    */PIECE.md)
      d_=${1%/PIECE.md}; N_=${d_##*/}; q_=${d_%/*}
      case "$q_" in *"/bench") P_=${q_%/bench}; S_=PIECE ;; *) return 1 ;; esac ;;
    *)
      N_=${1##*/}; d_=${1%/*}; S_=${d_##*/}; P_=${d_%/*}
      case "$S_" in stock|bench|finished) ;; *) return 1 ;; esac ;;
  esac
  case "$P_" in "$CST") return 0 ;; "$CST"/bench/*) return 0 ;; *) return 1 ;; esac
}

work=$(mktemp -d) || exit 1
trap 'rm -rf "$work"' EXIT INT TERM
: >"$work/dels"; : >"$work/adds"; : >"$work/used"

git diff --cached --name-status --find-renames --diff-filter=ADR >"$work/raw"

while IFS='	' read -r st a b; do
  [ -n "${st:-}" ] || continue
  case "$st" in R*) o=$a; n=$b ;; D*) o=$a; n="" ;; A*) o=""; n=$a ;; *) continue ;; esac
  for f in $o $n; do
    # Only the state directories (stock, bench, and the retired finished) are governed. Everything else under .constellation/
    # — skills/, guides/, packs/, bin/, templates/ — is ordinary repo content and free.
    case "$f" in
      "$CST"/stock/*|"$CST"/bench/*|"$CST"/finished/*) ;;
      *) continue ;;
    esac
    case "$f" in *.gitkeep) continue ;; esac
    parse "$f" || { say "malformed state path: $f"
                    note "Inside a state directory, a piece is <name>.md or <slug>/PIECE.md."; continue; }
    [ "$f" = "$o" ] && printf '%s\n' "$f" >>"$work/dels"
    [ "$f" = "$n" ] && printf '%s\n' "$f" >>"$work/adds"
  done
done <"$work/raw"

# --- each departure must reach its one legal destination -----------------------
while IFS= read -r old; do
  [ -n "$old" ] || continue
  parse "$old" || continue
  P=$P_; S=$S_; N=$N_; base=${N%.md}
  d1=""; d2=""
  case "$S" in
    stock)    d1="$P/bench/$N"; d2="$P/bench/$base/PIECE.md" ;;
    finished) continue ;;   # the retired shelf: taking it away is allowed, and is all there is to do with it
    bench|PIECE) # done: the piece leaves the tree. A bound piece must be accepted first; a breakdown must be drained
      execution_door=$(CDPATH= cd -- "$(dirname "$0")" && pwd)/cst-session.py
      if [ -f "$execution_door" ]; then
        python3 "$execution_door" --root "$(git rev-parse --show-toplevel)" --check-remove "$old" >/dev/null ||
          say "$old — execution acceptance refused"
      elif [ -d "$CST/sessions" ]; then
        say "$old — execution door missing for existing session records"
      fi
      [ "$S" = PIECE ] && check_drained "$P/bench/$N"
      continue ;;
  esac

  got=""
  [ -n "$d1" ] && grep -Fxq "$d1" "$work/adds" && got=$d1
  [ -z "$got" ] && [ -n "$d2" ] && grep -Fxq "$d2" "$work/adds" && got=$d2

  if [ -z "$got" ]; then
    say "illegal departure: $old"
    note "The only moves from here are → $d1 (a leaf)"
    note "                            or → $d2 (breaks down)."
    note "Nothing is deleted from stock/; a piece leaves the bench only when it lands (SPEC.md §2)."
    continue
  fi

  printf '%s\n' "$got" >>"$work/used"
  # A bound piece cannot silently fall back to the legacy finish policy.
  execution_door=$(CDPATH= cd -- "$(dirname "$0")" && pwd)/cst-session.py
  if [ -f "$execution_door" ]; then
    python3 "$execution_door" --root "$(git rev-parse --show-toplevel)" --check-move "$old" "$got" >/dev/null ||
      say "$old — execution acceptance/rebinding refused"
  elif [ -d "$CST/sessions" ]; then
    say "$old — execution door missing for existing session records"
  fi
  check_floor "$got"
done <"$work/dels"

# --- each arrival is a used destination, or new material on the rack ----------
while IFS= read -r new; do
  [ -n "$new" ] || continue
  grep -Fxq "$new" "$work/used" && continue
  parse "$new" || continue
  if [ "$S_" = finished ]; then
    say "illegal arrival: $new"
    note "finished/ is retired: done work leaves the tree at land, and its record is the"
    note "finish commit (constellation land; SPEC.md §2)."
  elif [ "$S_" != stock ]; then
    say "illegal arrival: $new"
    note "Only stock/ may be written into directly. Everywhere else is reached by moving"
    note "something already there (SPEC.md §2)."
  fi
done <"$work/adds"

[ "$fail" -eq 0 ] || printf 'cst-gate: refused. CONSTELLATION_GATE=off bypasses, for an adoption commit only.\n' >&2
# Take-down substrate: record refusals only. Success every commit would look like silence.
if [ "$fail" -ne 0 ] && [ -d "$CST/jig" ]; then
  _sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)
  _ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"ts":"%s","sha":"%s","jig":"cst-gate","mode":"block","exit":%s,"violations_caught":%s}\n' \
    "$_ts" "$_sha" "$fail" "$fail" >> "$CST/jig/firings.jsonl"
fi
exit "$fail"
