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
  R=$(main_repo); local src="$R/$CST/stock/$slug.md"
  [ -f "$src" ] || die "no piece $CST/stock/$slug.md on the rack"
  local missing=()
  for i in 0 1 2 3; do
    [ "${given[i]}" = 1 ] || floor_answered "$src" "${FLOOR_KEYS[i]}" || missing+=("$i")
  done
  [ ${#missing[@]} -eq 0 ] || { floor_interview "$slug" "${missing[@]}"; exit 3; }
  repo_lock   # one writer at a time in the main checkout: another take or land waits its turn here
  [ -f "$src" ] || die "$CST/stock/$slug.md is no longer on the rack (taken meanwhile?)"
  local body; body=$(mktemp) || die "could not make a temporary file"
  cat "$src" >"$body"   # the piece as it stands, with the person's answers written in: the checkout is not touched until it lands
  for i in 0 1 2 3; do [ "${given[i]}" = 1 ] && floor_write "$body" "${FLOOR_KEYS[i]}" "${value[i]}"; done
  land_write "take $slug to the bench

ACT: plan
DONE: $slug is in hand (its floor is stated)
NEXT: constellation run $slug (vega, ideate)" move "$CST/stock/$slug.md" "$CST/bench/$slug.md" "$body" || {
    rm -f "$body"; die "the move was refused (above); $slug stays on the rack"; }
  rm -f "$body"
  local wt; wt=$(work_of "$slug"); mkdir -p "$(dirname "$wt")"
  git -C "$R" worktree add -q -b "$(branch_of "$slug")" "$wt" "$LANDED" || die "could not make the worktree for $slug"
  seed_framework "$wt"
  repo_unlock   # the project's setup may take a while, or leave something running: not under the lock
  project_hook setup "$slug" "$wt" || die "$slug is on the bench, but the project's own setup for its worktree failed (above); fix it, then run $CST/setup $wt $R by hand"
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

project_hook() { # project_hook <setup|teardown> <slug> <worktree> : the project's own step for a piece's worktree
  # A project may ship .constellation/setup and .constellation/teardown (tracked, executable): setup runs in
  # a new piece's worktree (its dependencies, its environment, its own database), teardown before
  # the worktree is removed at land. Each gets <worktree> <main checkout>. No file, nothing to do.
  local f="$R/$CST/$1" out
  [ -x "$f" ] || return 0
  [ "${CONSTELLATION_DRY:-}" = 1 ] && [ -z "${CONSTELLATION_HOOKS:-}" ] && return 0
  out=$(cd "$3" && "$f" "$3" "$R" 2>&1) && return 0
  printf '%s\n' "$out" | tail -n 15 >&2; return 1
}
seed_framework() { # the vendored framework is gitignored; a worktree needs it for the commit gate and the stars' law
  local wt=$1 d f
  for d in bin lib guides skills templates registers bindings stars trades; do
    [ -d "$R/$CST/$d" ] && [ ! -e "$wt/$CST/$d" ] && cp -a "$R/$CST/$d" "$wt/$CST/$d"
  done
  # ground/ and jig/ mix framework docs (ignored) with the project's own files (tracked, already in the
  # worktree): only the docs install.sh ships are seeded, never the project's jig records. HOST.md is
  # the host's law and never goes into a worktree: no star is the host.
  for f in ground/README.md ground/PROTOCOL.md ground/PICTURE.md \
           jig/README.md jig/CONTRACT.md jig/CORRECTIONS.md jig/.gitignore jig/metabolism; do
    [ -e "$R/$CST/$f" ] && [ ! -e "$wt/$CST/$f" ] && mkdir -p "$(dirname "$wt/$CST/$f")" && cp -a "$R/$CST/$f" "$wt/$CST/$f"
  done; return 0
}
