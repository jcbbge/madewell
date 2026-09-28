# constellation — the core: where things are, the run record, the step machine, notify. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash

die() { printf 'constellation: %s\n' "$*" >&2; exit 2; }
say() { printf '%s\n' "$*"; }
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# --- where things are --------------------------------------------------------------------
main_repo() { # the main checkout: CONSTELLATION_REPO inside a step, else the cwd's (a worktree's main)
  if [ -n "${CONSTELLATION_REPO:-}" ]; then printf '%s' "$CONSTELLATION_REPO"; return; fi
  local common; common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || die "not in a git repository"
  dirname "$common"
}
R=""; work_of() { printf '%s/%s/%s' "$STATE" "$(basename "$R")" "$1"; }
branch_of() { printf 'piece/%s' "$1"; }
star_of() { case "$1" in polaris-*) echo polaris;; *) echo "$1";; esac; }
act_of() { case "$1" in vega|polaris-peer) echo ideate;; cassiopeia) echo plan;; sirius) echo implement;; *) echo verify;; esac; }
bench_pieces() { # every piece being made, one file per line: a leaf's bench/<slug>.md, or the PIECE.md of one that broke
  local f                  # down (a bench/<slug>/ without PIECE.md is a finished breakdown, or an empty scaffold: not listed)
  for f in "$R/$CST"/bench/*.md "$R/$CST"/bench/*/PIECE.md; do
    [ -f "$f" ] || continue
    case "$f" in */PIECE.md) [ ! -f "${f%/PIECE.md}.md" ] || continue ;; esac
    printf '%s\n' "$f"
  done
}
piece_slug() { case "$1" in */PIECE.md) basename "$(dirname "$1")" ;; *) basename "$1" .md ;; esac; }
broken_down() { [ ! -f "$R/$CST/bench/$1.md" ] && [ -f "$R/$CST/bench/$1/PIECE.md" ]; }
parts_of() { # parts_of <slug> : DONE<TAB>BEING-MADE<TAB>ON-THE-RACK, the parts of a piece that broke down
  local d="$R/$CST/bench/$1" f done=0 made=0 rack=0
  for f in "$d"/finished/*.md; do [ -f "$f" ] || continue; done=$((done + 1)); done
  for f in "$d"/bench/*.md "$d"/bench/*/PIECE.md; do [ -f "$f" ] || continue; made=$((made + 1)); done
  for f in "$d"/stock/*.md; do [ -f "$f" ] || continue; rack=$((rack + 1)); done
  printf '%s\t%s\t%s\n' "$done" "$made" "$rack"
}
parts_said() { # parts_said <slug> : how far along its parts are, in plain words ("3 of 8 parts done, 1 being made")
  local pd pm pr n; IFS=$'\t' read -r pd pm pr < <(parts_of "$1"); n=$((pd + pm + pr))
  if [ "$n" -eq 0 ]; then printf 'not broken into parts yet'; return; fi
  printf '%s of %s part%s done' "$pd" "$n" "$([ "$n" -eq 1 ] || echo s)"
  [ "$pm" -eq 0 ] || printf ', %s being made' "$pm"
}
star_field() { sed -n "s/^$2:[[:space:]]*//p" "$STARS/$1.md" | head -1; }
star_body() { sed '1,/^---$/d' "$STARS/$1.md"; }

# --- the record: the piece branch's log -------------------------------------------------
events() { # events <slug> : one line per event, oldest first: STEP<TAB>EVENT<TAB>HARNESS<TAB>DONE
  git -C "$R" log --reverse --all-match --grep='^STEP: ' --grep="^run($(sed 's/[.[\*^$]/\\&/g' <<<"$1")): " --format='%x1e%B' "$(branch_of "$1")" 2>/dev/null | awk -v RS='\x1e' '
    { step = ev = h = d = ""
      n = split($0, L, "\n")
      for (i = 1; i <= n; i++) {
        if (L[i] ~ /^STEP: /) step = substr(L[i], 7)
        else if (L[i] ~ /^EVENT: /) ev = substr(L[i], 8)
        else if (L[i] ~ /^HARNESS: /) h = substr(L[i], 10)
        else if (L[i] ~ /^DONE: /) d = substr(L[i], 7)
      }
      if (step != "") printf "%s\t%s\t%s\t%s\n", step, ev, h, d }'
}
record() { # record <slug> <step> <event> <harness> <done-text> <next> : one empty commit on the piece branch
  local slug=$1 step=$2 ev=$3 h=$4 done=$5 next=$6 wt; wt=$(work_of "$slug")
  local msg; msg=$(printf 'run(%s): %s %s\n\nACT: %s\nSTAR: %s\nSTEP: %s\nEVENT: %s\nHARNESS: %s\nDONE: %s\nNEXT: %s\n' \
    "$slug" "$step" "$ev" "$(act_of "$step")" "$(star_of "$step")" "$step" "$ev" "${h:--}" "$(tr '\n' ' ' <<<"${done:--}" | sed 's/[[:space:]]*$//')" "${next:--}")
  git -C "$wt" -c core.hooksPath=/dev/null commit -q --allow-empty -m "$msg" || die "could not record $ev for $slug"
}
next_step() { # next_step <slug> : the step to run next, or land / wait / operator / running:<step>; for a piece
  local slug=$1 last="" lev="" routes=0 orion_done=0 step ev h d  # that broke down, parts (its parts are made) or finish
  if broken_down "$slug"; then
    local pd pm pr; IFS=$'\t' read -r pd pm pr < <(parts_of "$slug")
    if [ "$pm" -eq 0 ] && [ "$pr" -eq 0 ] && [ "$pd" -gt 0 ]; then echo finish; else echo parts; fi
    return
  fi
  while IFS=$'\t' read -r step ev h d; do
    last=$step; lev=$ev
    [ "$step" = orion ] && [ "$ev" = done ] && orion_done=1
    [[ "$ev" == route:* ]] && routes=$((routes + 1))
  done < <(events "$slug")
  case "$lev" in
    "") echo vega ;;
    started|clear|answer|reply:*) echo "running:$last" ;;
    ask) echo "wait:$last" ;;
    clarify) echo "clarifying:$last" ;;
    flag) echo operator ;;
    fail) if [ "$routes" -ge 3 ]; then echo operator; else echo polaris-triage; fi ;;
    route:sirius) echo sirius ;;
    route:orion) echo orion ;;
    route:operator) echo operator ;;
    done)
      case "$last" in
        vega) echo polaris-peer ;; polaris-peer) echo cassiopeia ;; cassiopeia) echo sirius ;;
        sirius) [ $orion_done = 1 ] && echo aldebaran || echo orion ;;
        orion) echo aldebaran ;; aldebaran) echo land ;; *) echo operator ;;
      esac ;;
    *) echo operator ;;
  esac
}
since_start() { # since_start <slug> <step> : that step's events since its latest start, oldest first
  events "$1" | awk -F'\t' -v s="$2" '$1 == s && $2 == "started" { buf = ""; on = 1; next } on && $1 == s { buf = buf $0 "\n" } END { printf "%s", buf }'
}
originator() { # originator <slug> <step> : the step that handed this one its work (operator for the first)
  events "$1" | awk -F'\t' -v s="$2" '
    $1 == s && $2 == "started" { r = (o == "" ? "operator" : o) }
    $2 == "done" || $2 == "fail" || $2 ~ /^route:/ { o = $1 }
    END { print r }'
}

# --- the floor ----------------------------------------------------------------------------
floor_answered() { # floor_answered <piece> <key> : the line is there, and not a placeholder (OPEN, TBD, TODO, ?, …)
  grep -iE "^\*\*$2:\*\*" "$1" | head -1 | sed -E "s/^\*\*[^*]*:\*\*[[:space:]]*//" | grep -qivE '^((open|tbd|todo|unknown)([[:space:]]*[—–:-]([[:space:]]|$)|[[:space:]]*$)|(\?|…|\.\.\.)[[:space:]]*$)'
}
floor_gaps() { local f=$1 m=(); for k in Making 'Not making' 'Done when' 'Waits on'; do floor_answered "$f" "$k" || m+=("$k"); done; local IFS=,; printf '%s' "${m[*]}" | sed 's/,/, /g'; }

# --- commands -------------------------------------------------------------------------------

notify() { # a banner and the bell wherever the operator is attached
  command -v tmux >/dev/null || return 0
  local c; while read -r c; do tmux display-message -c "$c" -d 8000 "[constellation] $1" 2>/dev/null || true; done < <(tmux list-clients -F '#{client_name}' 2>/dev/null)
  return 0
}
