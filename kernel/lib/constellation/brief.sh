# constellation — brief and line: the person's front page, and one line for a status bar.
# Sourced by kernel/bin/constellation; never run directly. Plain words only: no star names, no
# engine words. Read from the pieces' records (the piece branches, and finished/ on main); the
# last brief's time is remembered in the state dir, so "done" means done since you last looked.
# shellcheck shell=bash

# the acts as the person hears them: doing now, and done
doing_of() { case "$1" in vega) echo "thinking it through";; polaris-*) echo "getting a second look";; cassiopeia) echo "planning it";;
  sirius) echo "making it";; orion) echo "writing the checks";; aldebaran) echo "checking it";; *) echo "$1";; esac; }
did_of() { case "$1" in vega) echo "thought through";; polaris-*) echo "given a second look";; cassiopeia) echo "planned";;
  sirius) echo "made";; orion) echo "given its checks";; aldebaran) echo "checked";; *) echo "$1";; esac; }

title_of() { # title_of <piece file> : its first heading, else its slug
  local t; t=$(sed -n '1,/^# /s/^# //p' "$1" 2>/dev/null | head -1)
  printf '%s' "${t:-$(basename "$1" .md)}"
}
at() { date -d "@$1" "+$2" 2>/dev/null || date -r "$1" "+$2"; }  # at <epoch> <format> : GNU date, else BSD
clock() { # clock <epoch> : 14:02 today, else Sep 27 14:02
  if [ "$(at "$1" %Y-%m-%d)" = "$(date +%Y-%m-%d)" ]; then at "$1" %H:%M; else at "$1" '%b %d %H:%M'; fi
}
clip() { local s=$1 n=${2:-140}; [ "${#s}" -le "$n" ] && printf '%s' "$s" || printf '%s…' "${s:0:$((n - 1))}"; }
joined() { # joined <max> <items…> : "a; b; c" and "and N more" past the max
  local max=$1; shift; local out="" i=0 x
  for x in "$@"; do i=$((i + 1)); [ $i -le "$max" ] || continue; out=${out:+$out; }$x; done
  [ $# -gt "$max" ] && out="$out; and $(($# - max)) more"
  printf '%s' "$out"
}

US=$'\037'  # the field separator where a field may be empty (a tab is IFS whitespace: empties would collapse)
timed_events() { # timed_events <slug> : TIME US STEP US EVENT US DONE US RECOMMEND US OPTIONS per event, oldest first
  git -C "$R" log --reverse --all-match --grep='^STEP: ' --grep="^run($(sed 's/[.[\*^$]/\\&/g' <<<"$1")): " --format='%x1e%ct%n%B' "$(branch_of "$1")" 2>/dev/null | awk -v RS='\x1e' '
    { t = step = ev = d = rec = opts = ""; k = 1
      n = split($0, L, "\n")
      for (i = 1; i <= n; i++) {
        if (t == "" && L[i] ~ /^[0-9]+$/) t = L[i]
        else if (L[i] ~ /^STEP: /) step = substr(L[i], 7)
        else if (L[i] ~ /^EVENT: /) ev = substr(L[i], 8)
        else if (L[i] ~ /^DONE: /) d = substr(L[i], 7)
        else if (L[i] ~ /^RECOMMEND(ATION)?: /) { rec = L[i]; sub(/^RECOMMEND(ATION)?: /, "", rec) }
        else if (L[i] ~ /^OPTION: /) { k++; opts = opts (opts == "" ? "" : " · ") k ". " substr(L[i], 9) }
      }
      if (step != "") printf "%s\037%s\037%s\037%s\037%s\037%s\n", t, step, ev, d, rec, opts }'
}
recommendation_in() { # recommendation_in <recommend-trailer> <text> : the trailer, else "Recommendation: …" in the text
  if [ -n "$1" ]; then printf '%s' "$1"; return; fi
  sed -nE 's/.*[Rr]ecommend(ation|ed)?:[[:space:]]*//p' <<<"$2" | sed -E 's/[[:space:]]*([Oo]ptions?:.*)?$//' | head -1
}

# One pass over the bench. Fills WAITING (TIME US what it asks US recommendation US other choices, one per
# piece that needs the person) and MAKING (TIME<TAB>"title — act, since …"), and DID (bench pieces'
# latest done act since $SINCE).
survey() {
  WAITING=""; MAKING=""; DID=()
  local f slug title nx t st e d rec op lt ld lrec lop started dones
  for f in "$R/$MW"/bench/*.md; do
    [ -e "$f" ] || continue; slug=$(basename "$f" .md); title=$(title_of "$f")
    nx=$(next_step "$slug" 2>/dev/null || echo operator)
    lt=""; ld=""; lrec=""; lop=""; started=""; dones=""
    while IFS=$US read -r t st e d rec op; do  # the latest handoff, the latest start, the latest act done since
      [ -n "$st" ] || continue
      if [ "$e" = started ]; then started=$t; continue; fi
      lt=$t; ld=${d%% — Situation: *}; lrec=$rec; lop=$op  # the question alone: its SBAR stays in the record
      if [ "$e" = "done" ] && { [ -z "$SINCE" ] || [ "$t" -gt "$SINCE" ]; }; then dones=$st; fi
    done <<<"$(timed_events "$slug")"
    [ -z "$dones" ] || DID+=("$title was $(did_of "$dones")")
    local asks=""
    case "$nx" in
      wait:*) asks="$title asks: $ld" ;;
      clarifying:*) [ "$(originator "$slug" "${nx#clarifying:}")" = operator ] && asks="$title asks before it starts: $ld" ;;
      operator) asks="$title needs you: ${ld:-it stopped and did not say why}" ;;
    esac
    if [ -n "$asks" ]; then
      rec=$(recommendation_in "$lrec" "$ld")
      [ -z "$rec" ] || asks=$(sed -E 's/[[:space:]]*[Rr]ecommend(ation|ed)?:.*//' <<<"$asks")
      WAITING+="${lt:-0}$US$(clip "$asks")$US$(clip "$rec")$US$(clip "$lop")"$'\n'
      continue
    fi
    case "$nx" in
      running:*|clarifying:*) MAKING+="${started:-0}"$'\t'"$title — $(doing_of "${nx#*:}"), since $(clock "${started:-0}")"$'\n' ;;
      land) MAKING+="${lt:-0}"$'\t'"$title — checked and passing, ready to finish"$'\n' ;;
      *) MAKING+="${lt:-0}"$'\t'"$title — $(doing_of "$nx") is next"$'\n' ;;
    esac
  done
  WAITING=$(sort -t "$US" -k1,1n <<<"$WAITING" | sed '/^$/d'); MAKING=$(sort -n <<<"$MAKING" | sed '/^$/d')
}
finished_since() { # finished_since <epoch|""> : the title of every piece that reached finished/ on main since then
  git -C "$R" log -n 500 --no-renames --diff-filter=A --name-only --format='%x1e%ct' -- "$MW/finished/" 2>/dev/null | awk -v RS='\x1e' -v s="$1" '
    { n = split($0, L, "\n"); t = ""
      for (i = 1; i <= n; i++) { if (L[i] == "") continue; if (t == "") { t = L[i]; continue }
        if ((s == "" || t + 0 > s + 0) && L[i] ~ /\.md$/) print L[i] } }' | while read -r p; do
      if [ -f "$R/$p" ]; then title_of "$R/$p"; else basename "$p" .md | tr -d '\n'; fi; printf '\n'; done
}
open_questions() { # open_questions <piece file> : the bullets under an "Open questions" heading
  awk 'tolower($0) ~ /^#+ .*open questions/ { on = 1; next } /^#/ { on = 0 } on && /^[[:space:]]*[-*] / { n++ } END { print n + 0 }' "$1"
}
ideas_survey() { # IDEAS_LINE (the ideas on the list, new ones first) and IDEAS_ASK (the first that needs answers)
  IDEAS_LINE=""; IDEAS_ASK=""; IDEAS_READY=""; IDEAS_MORE=0
  local f title q gaps added new=() old=() n=0 need=0 what
  for f in "$R/$MW"/stock/*.md; do
    [ -e "$f" ] || continue; n=$((n + 1)); title=$(title_of "$f")
    q=$(open_questions "$f"); gaps=$(floor_gaps "$f")
    if [ "$q" -gt 0 ] || [ -n "$gaps" ]; then
      need=$((need + 1))
      if [ "$q" -gt 0 ]; then what="$q open question$([ "$q" -eq 1 ] || echo s)"; else local g; g=$(tr ',' '\n' <<<"$gaps" | grep -c .); what="$g of the four questions"; fi
      [ -n "$IDEAS_ASK" ] || IDEAS_ASK="$title needs your answers ($what) before it can start"
      what="needs your answers first"
    else what="ready to start"; [ -n "$IDEAS_READY" ] || IDEAS_READY=$title; fi
    added=$(git -C "$R" log -1 --diff-filter=A --format=%ct -- "$f" 2>/dev/null)
    if [ -n "$added" ] && { [ -z "$SINCE" ] || [ "$added" -ge "$SINCE" ]; }; then new+=("$title (new; $what)")
    else old+=("$title ($what)"); fi
  done
  [ "$n" -gt 0 ] || return 0
  IDEAS_MORE=$((need - 1))
  IDEAS_LINE="$n on the list: $(joined 3 "${new[@]}" "${old[@]}")"
}
brief_mem() { printf '%s/%s/brief.last' "$STATE" "$(basename "$R")"; }

cmd_brief() { # the front page: done since the last brief, being made now, the one thing waiting on you
  R=$(main_repo); [ -d "$R/$MW" ] || die "no Made Well here (constellation install <project>)"
  local mem; mem=$(brief_mem); SINCE=$(cat "$mem" 2>/dev/null | tr -cd 0-9 || true)
  local stamp; stamp=$(date +%s)
  survey
  local fin=() x; while IFS= read -r x; do [ -n "$x" ] && fin+=("$x is done"); done < <(finished_since "$SINCE")
  local did=("${fin[@]}" "${DID[@]}") when
  if [ -n "$SINCE" ]; then when="since your last brief ($(clock "$SINCE"))"; else when="so far"; fi
  if [ ${#did[@]} -gt 0 ]; then say "Done $when: $(joined 3 "${did[@]}")."
  elif [ -n "$SINCE" ]; then say "Nothing new is done since your last brief ($(clock "$SINCE"))."
  else say "Nothing is done yet."; fi
  local mk=(); while IFS=$'\t' read -r _ x; do [ -n "$x" ] && mk+=("$x"); done <<<"$MAKING"
  if [ ${#mk[@]} -gt 0 ]; then say "Being made: $(joined 3 "${mk[@]}")."; else say "Nothing is being made right now."; fi
  ideas_survey
  [ -z "$IDEAS_LINE" ] || say "Ideas: $IDEAS_LINE."
  if [ -z "$WAITING" ] && [ -n "$IDEAS_ASK" ]; then
    local more=""; [ "$IDEAS_MORE" -le 0 ] || more=" (and $IDEAS_MORE more after this)"
    say "Waiting on you: $IDEAS_ASK$more."
    say "  Recommended: go through them now, one at a time — say yes to start."
  elif [ -z "$WAITING" ] && [ -n "$IDEAS_READY" ]; then say "Nothing is waiting on you. Ready to start when you are: $IDEAS_READY."
  elif [ -z "$WAITING" ]; then say "Nothing is waiting on you."
  else
    local n t asks rec op; n=$(wc -l <<<"$WAITING" | tr -d ' ')
    IFS=$US read -r t asks rec op <<<"$(head -1 <<<"$WAITING")"
    local more=""; [ "$n" -le 1 ] || more=" (and $((n - 1)) more after this)"
    say "Waiting on you: $asks$more"
    if [ -n "$rec" ]; then say "  Recommended: ${rec%.} — say yes to go with it.${op:+ Or say the number: $op.}"
    else say "  No recommendation came with it."; fi
  fi
  ! paused || say "Everything is paused: what is being made stops at its next save. Say go to pick up."
  mkdir -p "$(dirname "$mem")"; printf '%s\n' "$stamp" >"$mem"
}

cmd_line() { # one line for a status bar; silent where there is no Made Well
  R=$(main_repo 2>/dev/null) || return 0; [ -d "$R/$MW" ] || return 0
  SINCE=""; survey
  local m=0 w=0 out=""
  [ -z "$MAKING" ] || m=$(wc -l <<<"$MAKING" | tr -d ' ')
  [ -z "$WAITING" ] || w=$(wc -l <<<"$WAITING" | tr -d ' ')
  local q=question; [ "$w" -eq 1 ] || q=questions
  [ "$m" -eq 0 ] || out="$m being made"
  [ "$w" -eq 0 ] || out="${out:+$out · }$w $q for you"
  ! paused || out="paused${out:+ · $out}"
  say "${out:-all quiet}"
}
