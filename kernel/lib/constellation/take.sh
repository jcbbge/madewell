# constellation — take: stock → bench, the piece branch and its worktree. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# A piece reaches the bench with its floor: the four questions, answered. With no floor,
# take does not refuse and stop: it prints the questions in plain words for the host to ask
# the person, as a conversation, and exits 3 (nothing moved). The host then takes it with
# the person's answers, which take writes into the piece before the move:
#   constellation take <slug> --making '…' --not-making '…' --done-when '…' --waits-on '…'
# A line the piece already states needs no flag; a flag replaces the line it names.

FLOOR_KEYS=(Making 'Not making' 'Done when' 'Waits on')
FLOOR_FLAGS=(--making --not-making --done-when --waits-on)
FLOOR_ASK=(
  "What are we making? One sentence is enough."
  "What are we not making: what is left out of it, for now?"
  "How will we know it is done? What would they look at to say \"yes, that's it\"?"
  "Is it waiting on anything: someone, something, a decision? (\"Nothing\" is a fine answer.)"
)

cmd_take() {
  local slug="" i given=(0 0 0 0) value=("" "" "" "")
  while [ $# -gt 0 ]; do
    case "$1" in
      --making|--not-making|--done-when|--waits-on)
        [ $# -ge 2 ] || die "$1 needs the person's answer (--waits-on may be '')"
        for i in 0 1 2 3; do [ "$1" = "${FLOOR_FLAGS[i]}" ] && { given[i]=1; value[i]=$2; }; done; shift 2 ;;
      -*) die "unknown flag $1 (constellation help)" ;;
      *) [ -z "$slug" ] || die "usage: constellation take <slug> [--making '…' --not-making '…' --done-when '…' --waits-on '…']"
         slug=$1; shift ;;
    esac
  done
  [ -n "$slug" ] || die "usage: constellation take <slug> [--making '…' --not-making '…' --done-when '…' --waits-on '…']"
  R=$(main_repo); local src="$R/$MW/stock/$slug.md" dst="$R/$MW/bench/$slug.md"
  [ -f "$src" ] || die "no piece $MW/stock/$slug.md on the rack"
  local missing=()
  for i in 0 1 2 3; do
    [ "${given[i]}" = 1 ] || grep -qi "^\*\*${FLOOR_KEYS[i]}:\*\*" "$src" || missing+=("$i")
  done
  [ ${#missing[@]} -eq 0 ] || { floor_interview "$slug" "${missing[@]}"; exit 3; }
  [ -z "$(git -C "$R" diff --cached --name-only)" ] || die "the index already holds staged changes; commit or unstage them first"
  for i in 0 1 2 3; do [ "${given[i]}" = 1 ] && floor_write "$src" "${FLOOR_KEYS[i]}" "${value[i]}"; done
  git -C "$R" mv "$src" "$dst"
  git -C "$R" add -- "$dst"
  git -C "$R" commit -q -m "take $slug to the bench" -m "ACT: plan
DONE: $slug is in hand (its floor is stated)
NEXT: constellation run $slug (vega, ideate)" || {
    git -C "$R" reset -q -- "$src" "$dst" 2>/dev/null; mv "$dst" "$src"
    die "the move was refused (mw-gate); $slug stays on the rack"; }
  local wt; wt=$(work_of "$slug"); mkdir -p "$(dirname "$wt")"
  git -C "$R" worktree add -q -b "$(branch_of "$slug")" "$wt" HEAD || die "could not make the worktree for $slug"
  seed_framework "$wt"
  say "took $slug to the bench — branch $(branch_of "$slug"), worktree $wt
next: constellation run $slug"
}

floor_interview() { # floor_interview <slug> <index>… : the questions still open, for the host to ask
  local slug=$1 i names=() flags=""; shift
  for i in "$@"; do names+=("${FLOOR_KEYS[i]}"); flags+=" ${FLOOR_FLAGS[i]} '…'"; done
  local gaps; gaps=$(printf '%s, ' "${names[@]}"); gaps=${gaps%, }
  say "$slug is not being made yet: first, the four questions. The piece is missing $gaps.
Ask the person these in your own words, one at a time, as a conversation, not a form. Skip
anything they have already told you, and keep their words:"
  for i in "$@"; do say "  - ${FLOOR_ASK[i]}"; done
  say "Then take it with their answers:
  constellation take $slug$flags"
}

floor_write() { # floor_write <piece> <key> <value> : replace the piece's **Key:** line, or add it after the rest
  local f=$1 tmp; tmp=$(mktemp)
  FK=$2 FV=$(tr '\n' ' ' <<<"$3" | sed 's/[[:space:]]*$//') awk '
    BEGIN { k = ENVIRON["FK"]; line = "**" k ":** " ENVIRON["FV"]; sub(/ $/, "", line); pat = "^\\*\\*" tolower(k) ":\\*\\*" }
    tolower($0) ~ pat && !done { print line; done = 1; next }
    { print; last = $0 }
    END { if (!done) { if (last != "" && tolower(last) !~ /^\*\*(making|not making|done when|waits on):\*\*/) print ""; print line } }' "$f" >"$tmp" &&
    cat "$tmp" >"$f"; rm -f "$tmp"
}

seed_framework() { # the vendored Made Well framework is gitignored; a worktree needs it for the commit gate
  local wt=$1 d
  for d in bin lib guides skills templates registers bindings stars trades; do
    [ -d "$R/$MW/$d" ] && [ ! -e "$wt/$MW/$d" ] && cp -a "$R/$MW/$d" "$wt/$MW/$d"
  done; return 0
}
