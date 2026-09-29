# constellation — the trade: what a domain means by the thing, the check, and who may write what.
# Sourced by kernel/bin/constellation; never run directly. The kernel and the six stars stay the
# same in every domain; the active trade fills them in.
#
# The active trade is the one the project loads by reference (CONSTELLATION.md, Trades): a path to
# trades/<name>/TRADE.md in its AGENTS.md or CLAUDE.md loader, or its ground ROOTS.md. A project
# that names none works in dev. `constellation trade <name>` writes the reference into the loader.
#
# The trade's stars/<star>.md overlays are printed into that star's brief, below the kernel's
# words. An overlay's header (the lines above its `---`) carries that star's write rule:
#   writes-only: <ERE>    every path the star changes must match
#   writes-never: <ERE>   no path the star changes may match
#   refusal: <words>      what a broken rule says, followed by the paths that broke it
#   skills: <a, b>        skills this trade adds for the star
# A star whose own `writes:` is `nothing` commits nothing, in every trade: a trade adds, it
# never replaces.
# shellcheck shell=bash

TRADE_DEFAULT=dev
TRADE_REF="[^[:space:]\`'\"()<>]*trades/[A-Za-z0-9._-]+/TRADE\\.md"      # a reference to a trade
TRADE_GUARD=$(cat "$KERNEL/templates/loader-guard.txt" 2>/dev/null || true)   # the one copy of the guard, install.sh's too
TRADE_LOADER="$TRADE_GUARD Otherwise, read and follow .constellation/HOST.md before anything else, then continue."  # install.sh's LOADER_LINE
TRADE_NAME=$TRADE_DEFAULT TRADE_DIR="" TRADE_FROM=""

trade_named() { # the first trade reference the project makes, as <ref><TAB><file>
  local f ref
  for f in AGENTS.md CLAUDE.md "$CST/ground/ROOTS.md"; do
    [ -f "$R/$f" ] || continue
    ref=$(grep -oE -- "$TRADE_REF" "$R/$f" | head -1) || true
    [ -n "$ref" ] && { printf '%s\t%s\n' "$ref" "$f"; return 0; }
  done
  return 1
}
trade_abs() { # trade_abs <ref> : the trade's directory, relative references read from the project root
  local d=${1%/TRADE.md}
  case "$d" in /*) ;; *) d=$R/$d ;; esac
  if [ -d "$d" ]; then (cd "$d" && pwd); else printf '%s' "$d"; fi
}
trade_libraries() { # where a trade is found by name: the installed kernel's, the package's, the project's, the named trade's
  local d n
  [ -d "$KERNEL/trades" ] && (cd "$KERNEL/trades" && pwd)       # installed: .constellation/trades, shipped by install.sh
  d=$(cd "$KERNEL/.." && pwd)/trades; [ -d "$d" ] && printf '%s\n' "$d"
  [ -d "$R/trades" ] && (cd "$R/trades" && pwd)
  n=$(trade_named | cut -f1) || true
  if [ -n "$n" ]; then d=$(dirname "$(trade_abs "$n")"); [ -d "$d" ] && printf '%s\n' "$d"; fi
  return 0
}
trade_find() { # trade_find <name> : that trade's directory
  local lib
  case "$1" in ''|.|..|*[!A-Za-z0-9._-]*) return 1 ;; esac
  while read -r lib; do
    [ -f "$lib/$1/TRADE.md" ] && { (cd "$lib/$1" && pwd); return 0; }
  done < <(trade_libraries)
  return 1
}
trade_names() { # every trade reachable by name, comma-separated
  local lib t; while read -r lib; do for t in "$lib"/*/TRADE.md; do [ -f "$t" ] && basename "$(dirname "$t")"; done; done < <(trade_libraries) | sort -u | paste -sd, - | sed 's/,/, /g'
}
trade_active() { # sets TRADE_NAME, TRADE_DIR (empty when it is not on this machine), TRADE_FROM (empty: the default)
  local named ref
  TRADE_NAME=$TRADE_DEFAULT TRADE_DIR="" TRADE_FROM=""
  if named=$(trade_named); then
    ref=${named%%$'\t'*}; TRADE_FROM=${named#*$'\t'}
    TRADE_NAME=$(basename "$(dirname "$ref")")
    TRADE_DIR=$(trade_abs "$ref")
    [ -f "$TRADE_DIR/TRADE.md" ] || TRADE_DIR=$(trade_find "$TRADE_NAME") || TRADE_DIR=""
  else
    TRADE_DIR=$(trade_find "$TRADE_NAME") || TRADE_DIR=""
  fi
  [ -n "$TRADE_DIR" ]
}
skill_paths() { # skill_paths <dir> <a, b> : each skill as the file to read, or MISSING when this install lacks it
  local n sep="" IFS=,
  for n in $2; do
    n=${n#"${n%%[![:space:]]*}"}; n=${n%"${n##*[![:space:]]}"}; [ -n "$n" ] || continue
    if [ -f "$1/$n.md" ]; then printf '%s`%s`' "$sep" "$1/$n.md"; else printf '%sMISSING: %s (not in %s)' "$sep" "$n" "$1"; fi
    sep=", "
  done
}
overlay_field() { sed -n "1,/^---\$/s/^$2:[[:space:]]*//p" "$1" | head -1; }
overlay_body() { if grep -qx -- '---' "$1"; then sed '1,/^---$/d' "$1"; else cat "$1"; fi; }

check_write_rule() { # check_write_rule <step> <worktree> <base> : exit 1 with the reason on stdout when broken
  local step=$1 wt=$2 base=$3 star f only="" never="" words="" re rc changed bad
  star=$(star_of "$step")
  if [ "$(star_field "$star" writes)" = nothing ]; then
    [ -z "$(commits_since "$wt" "$base")" ] || { printf '%s changes nothing, but it committed: %s' "$step" "$(commits_since "$wt" "$base" | cut -c1-60 | tr '\n' ';')"; return 1; }
    return 0
  fi
  trade_active || { printf '%s writes, but the %s trade that says what it may write is not on this machine (constellation trade)' "$step" "$TRADE_NAME"; return 1; }
  f=$TRADE_DIR/stars/$star.md
  if [ -f "$f" ]; then only=$(overlay_field "$f" writes-only); never=$(overlay_field "$f" writes-never); words=$(overlay_field "$f" refusal); fi
  if [ -z "$only$never" ]; then
    printf 'constellation: UNJIGGED: the %s trade names no write rule for %s, so this handoff is not checked\n' "$TRADE_NAME" "$star" >&2
    return 0
  fi
  for re in "$only" "$never"; do
    [ -n "$re" ] || continue
    rc=0; grep -qE -- "$re" </dev/null 2>/dev/null || rc=$?
    [ "$rc" -lt 2 ] || { printf 'the %s trade'\''s write rule for %s is not a pattern grep can read: %s' "$TRADE_NAME" "$star" "$re"; return 1; }
  done
  changed=$(changed_since "$wt" "$base")
  if [ -n "$only" ]; then
    bad=$(grep -vE -- "$only" <<<"$changed" | sed '/^$/d' || true)
    [ -z "$bad" ] || { printf '%s %s' "${words:-$star changes only what the $TRADE_NAME trade allows it; these are not:}" "$(tr '\n' ' ' <<<"$bad")"; return 1; }
  fi
  if [ -n "$never" ]; then
    bad=$(grep -E -- "$never" <<<"$changed" | sed '/^$/d' || true)
    [ -z "$bad" ] || { printf '%s %s' "${words:-$star may not change these in the $TRADE_NAME trade:}" "$(tr '\n' ' ' <<<"$bad")"; return 1; }
  fi
  return 0
}

star_overlay() { # star_overlay <star> : what the active trade adds to that star's brief
  local f skills
  if ! trade_active; then
    printf '\n## The trade\n\nThis project works in the %s trade, but it is not on this machine: this brief carries\n' "$TRADE_NAME"
    printf 'the kernel'\''s words only, and a star that writes cannot hand off until it is found.\n'
    return 0
  fi
  f=$TRADE_DIR/stars/$1.md; [ -f "$f" ] || return 0
  printf '\n## In this trade: %s\n\n' "$TRADE_NAME"
  printf 'The trade'\''s own files (its foundation, pillars and skills) are in %s.\n\n' "$TRADE_DIR"
  overlay_body "$f"
  skills=$(overlay_field "$f" skills)
  [ -z "$skills" ] || printf '\nThis trade'\''s skills, read them too: %s.\n' "$(skill_paths "$TRADE_DIR/skills" "$skills")"
  return 0
}

cmd_trade() { # cmd_trade [<name> | <path to trades/<name>>] : print the active trade, or set it
  R=$(main_repo)
  if [ $# -eq 0 ]; then
    trade_active || die "the $TRADE_NAME trade${TRADE_FROM:+ named in $TRADE_FROM} is not on this machine; name one that is: constellation trade <$(trade_names)>"
    if [ -n "$TRADE_FROM" ]; then say "$TRADE_NAME — named in $TRADE_FROM; its files are in $TRADE_DIR"
    else say "$TRADE_NAME — the default (this project names no trade); its files are in $TRADE_DIR"; fi
    return 0
  fi
  local want=$1 dir name ref new f tmp esc changed=() puts=() tmps=()
  [ -n "$TRADE_GUARD" ] || die "the loader's guard ($KERNEL/templates/loader-guard.txt) is missing from this install; install the kernel again"
  case "$want" in
    */*|.|..) dir=$([ -f "$want/TRADE.md" ] && cd "$want" && pwd) || die "no trade at $want (a trade is a folder with a TRADE.md)" ;;
    *) dir=$(trade_find "$want") || die "no trade named $want here; these are: $(trade_names)" ;;
  esac
  name=$(basename "$dir")
  [ "$(basename "$(dirname "$dir")")" = trades ] || die "a trade lives at trades/<name>/TRADE.md; $dir is not in a trades/ folder"
  case "$dir" in "$R"/*) ref=${dir#"$R"/}/TRADE.md ;; *) ref=$dir/TRADE.md ;; esac
  new="$TRADE_GUARD Otherwise, read and follow .constellation/HOST.md and $ref before anything else, then continue."
  esc=$(printf '%s' "$ref" | sed 's/[&#\\]/\\&/g')
  repo_lock   # one writer at a time in the main checkout
  for f in AGENTS.md CLAUDE.md; do
    [ -f "$R/$f" ] || continue
    tmp=$(mktemp)
    if grep -qE -- "$TRADE_REF" "$R/$f"; then sed -E "s#$TRADE_REF#$esc#g" "$R/$f" >"$tmp"
    elif grep -qxF -- "$TRADE_LOADER" "$R/$f"; then awk -v old="$TRADE_LOADER" -v new="$new" '$0 == old { $0 = new } 1' "$R/$f" >"$tmp"
    else rm -f "$tmp"; continue; fi
    changed+=("$f")   # a loader the project keeps in git changes by a landing; one it does not, in place
    if git -C "$R" cat-file -e "HEAD:$f" 2>/dev/null; then puts+=(put "$f" "$tmp"); tmps+=("$tmp"); else cat "$tmp" >"$R/$f"; rm -f "$tmp"; fi
  done
  [ ${#changed[@]} -gt 0 ] || die "no Constellation loader in AGENTS.md or CLAUDE.md to name the trade in (constellation install <project> first)"
  if [ ${#puts[@]} -gt 0 ]; then
    land_write "chore(trade): the project works in $name

ACT: plan
DONE: the loader names the $name trade by reference ($ref)
NEXT: —" "${puts[@]}" || { rm -f "${tmps[@]}"; die "$name was not named: the commit was refused (above)"; }
    rm -f "${tmps[@]}"
  fi
  repo_unlock
  say "$name — named in ${changed[*]}; its files are in $dir"
}
