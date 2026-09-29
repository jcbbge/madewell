# constellation — receipt: what a finished piece changed, how we know it works, how to see it, what
# it cost, in the person's words. Sourced by kernel/bin/constellation; never run directly.
# shellcheck shell=bash
#
# The receipt is built from the record alone, so it can be built again for any finished piece:
# the piece's commits sit in one unbroken run on the default branch (land fast-forwards them),
# from its first run(<slug>) record up to the finish commit. Its times are author times: land's
# rebase rewrites every commit's own time to the moment it lands. Engine words never reach it: the
# whole section passes through receipt_py plain, which swaps the stars' names and the process's
# words for plain ones and leaves file paths alone.

receipt_block() { # receipt_block <slug> <tip> : the piece's commits ending at <tip>, oldest first
  local slug=$1 tip=$2 h s out=() keep=0 rec="^run\\(([^)]*)\\): (${STEPS// /|}) "
  while IFS=$'\t' read -r h s; do
    if [[ "$s" =~ $rec ]]; then
      [ "${BASH_REMATCH[1]}" = "$slug" ] || break   # another piece's record: this one's run is over
      out+=("$h"); keep=${#out[@]}
    elif [[ "$s" == "take "*" to the bench" ]]; then break
    else out+=("$h"); fi
  done < <(git -C "$R" log --first-parent --format='%H%x09%s' "$tip" 2>/dev/null)
  local i; for ((i = keep - 1; i >= 0; i--)); do printf '%s\n' "${out[$i]}"; done
}

receipt_py() { # receipt_py plain | split | cost <log dir> <from> <to> : the text work, in one place
  python3 -c '
import calendar, json, re, sys, time
from pathlib import Path
mode = sys.argv[1]
WORDS = [("polaris-peer", "the second reader"), ("polaris-triage", "the reviewer"),
         ("vega", "the thinker"), ("polaris", "the second reader"), ("cassiopeia", "the planner"),
         ("sirius", "the maker"), ("orion", "the check writer"), ("aldebaran", "the checker"),
         ("arbiter", "the reviewer"), ("handoffs", "notes"), ("handoff", "note"),
         ("handed off", "passed on"), ("hands off", "passes on"), ("relay", "hand-over"),
         ("worktrees", "working copies"), ("worktree", "working copy")]
def plain(t):
    for w, p in WORDS:  # a word, never part of a path or a name like sirius.md or cli-orion
        def sub(m, p=p): return (p[0].upper() + p[1:]) if m.group(0)[0].isupper() else p
        the = r"(?:\bthe\s+)?" if p.startswith("the ") else ""  # "the sirius" is "the maker", not "the the maker"
        t = re.sub(the + r"(?<![\w/.-])" + re.escape(w) + r"(?![\w/-]|\.\w)", sub, t, flags=re.I)
    return t
if mode == "plain":
    sys.stdout.write(plain(sys.stdin.read()))
elif mode == "split":  # the making step ends with how to exercise it: split that off
    t = sys.stdin.read().strip()
    m = re.search(r"(?i)\b(?:how to (?:exercise|see|try) it|to (?:exercise|see|try) it(?: yourself)?|exercise(?: it)?|try it)\s*[:—–-]\s*", t)
    before, after = (t[:m.start()], t[m.end():]) if m else (t, "")
    after = after.strip()
    sys.stdout.write(before.rstrip(" ;,.—–-") + "\x1f" + after[:1].upper() + after[1:])
elif mode == "cost":  # Claude Code session logs: one JSON line per event, usage on assistant messages
    d, lo, hi = Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    seen, files, read, wrote = set(), set(), 0, 0
    for f in (sorted(d.rglob("*.jsonl")) if d.is_dir() else []):
        for line in f.open(errors="replace"):
            try: o = json.loads(line)
            except ValueError: continue
            m = o.get("message") if isinstance(o, dict) and o.get("type") == "assistant" else None
            if not isinstance(m, dict) or not isinstance(m.get("usage"), dict) or m.get("id") in seen: continue
            try: ts = calendar.timegm(time.strptime(str(o["timestamp"])[:19], "%Y-%m-%dT%H:%M:%S"))
            except (KeyError, ValueError): continue
            if not lo - 60 <= ts <= hi + 600: continue  # the last star finishes its turn after it hands off
            seen.add(m.get("id")); files.add(f); u = m["usage"]
            read += sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
            wrote += u.get("output_tokens") or 0
    def about(n):
        if n >= 10**6: return "about %.1f million" % (n / 10**6)
        if n >= 10**3: return "about %d thousand" % round(n / 10**3)
        return "%d" % n
    if seen:
        print("The assistants read %s tokens and wrote %s (tokens are the units AI work is billed in), across %d session%s."
              % (about(read), about(wrote), len(files), "" if len(files) == 1 else "s"))
' "$@"
}

receipt_duration() { # receipt_duration <seconds> : "1 hour 12 minutes"
  local s=$1 h m out=""; h=$((s / 3600)); m=$(((s % 3600 + 59) / 60))
  [ "$s" -ge 60 ] || { printf 'under a minute'; return; }
  [ "$m" != 60 ] || { h=$((h + 1)); m=0; }
  [ "$h" = 0 ] || out="$h hour$([ "$h" = 1 ] || echo s)"
  if [ "$m" != 0 ] || [ -z "$out" ]; then out="${out:+$out }$m minute$([ "$m" = 1 ] || echo s)"; fi
  printf '%s' "$out"
}

receipt_compose() { # receipt_compose <slug> <tip> : the Receipt section, from the record ending at <tip>
  local slug=$1 tip=$2 hashes; hashes=$(receipt_block "$slug" "$tip")
  [ -n "$hashes" ] || return 1
  local made=() commits=() exercise="" written="" evidence="" fails=0 claude=0 first="" last="" h at subj step ev har done parts
  while IFS=$'\x1f' read -r h at subj step ev har done; do
    [ -n "$h" ] || continue
    if [ -z "$step" ] || [[ "$subj" != "run($slug): "* ]]; then commits+=("$subj"); continue; fi
    [ "$har" != claude ] || claude=1
    [ "$ev" != started ] || first=${first:-$at}   # the clock starts at the first start, and stops at the
    [ "$step:$ev" != aldebaran:done ] || last=$at  # passing check
    case "$step:$ev" in
      sirius:done) parts=$(receipt_py split <<<"$done")
                   made+=("${parts%%$'\x1f'*}"); [ -z "${parts#*$'\x1f'}" ] || exercise=${parts#*$'\x1f'} ;;
      orion:done) written=$done ;;
      aldebaran:done) evidence=$done ;;
      aldebaran:fail) fails=$((fails + 1)) ;;
    esac
  done < <(git -C "$R" log --no-walk=unsorted --format='%H%x1f%at%x1f%s%x1f%(trailers:key=STEP,valueonly,separator=)%x1f%(trailers:key=EVENT,valueonly,separator=)%x1f%(trailers:key=HARNESS,valueonly,separator=)%x1f%(trailers:key=DONE,valueonly,separator=)' $hashes)
  local title="" pf x
  for pf in "$R/$CST/bench/$slug.md" "$R/$CST/finished/$slug.md"; do [ -f "$pf" ] && title=$(sed -n '1s/^# //p' "$pf") && break; done
  {
    printf '## Receipt\n\n**%s** is done.\n\n### What changed\n\n' "${title:-This work}"
    for x in "${made[@]}"; do printf -- '- %s\n' "$x"; done
    [ ${#made[@]} != 0 ] || printf -- '- Nobody wrote down what they changed.\n'
    if [ ${#commits[@]} != 0 ]; then
      printf '\nSaved as %d change%s, oldest first:\n' "${#commits[@]}" "$([ ${#commits[@]} = 1 ] || echo s)"
      for x in "${commits[@]}"; do printf -- '- %s\n' "$x"; done
    fi
    printf '\n### How we know it works\n\n'
    [ -z "$written" ] || printf 'The checks were written by someone who did not make it: %s\n\n' "$written"
    printf 'Someone else ran them: %s\n' "${evidence:-(no result was written down)}"
    [ "$fails" = 0 ] || printf '\nIt did not pass the first time: the check failed %d time%s, and it was sent back and fixed until it held.\n' "$fails" "$([ "$fails" = 1 ] || echo s)"
    printf '\n### How to see it yourself\n\n%s\n' "${exercise:-The maker did not say how to try it. Ask for a short demonstration.}"
    if [ -n "$first" ] && [ -n "$last" ]; then
      printf '\n### What it cost\n\nIt took %s from the first start to the passing check.' "$(receipt_duration $((last - first)))"
    else printf '\n### What it cost\n\nHow long it took was not written down.'; fi
    if [ "$claude" = 1 ] && [ -n "$first" ] && [ -n "$last" ]; then  # tokens only when the harness kept logs for this piece's working copy
      local logs=${CONSTELLATION_HARNESS_LOGS:-$HOME/.claude/projects} c
      local wt; wt=$(work_of "$slug"); wt=$(readlink -f "$wt" 2>/dev/null || printf '%s' "$wt")  # the harness logs by real path
      c=$(receipt_py cost "$logs/$(sed 's/[^A-Za-z0-9]/-/g' <<<"$wt")" "$first" "$last" 2>/dev/null || true)
      [ -z "$c" ] || printf ' %s' "$c"
    fi
    printf '\n'
  } | receipt_py plain
}

receipt_of() { # receipt_of <file> : the Receipt section already in a finished piece, if there is one
  awk '/^## Receipt$/ { on = 1; print; next } on && /^## / { exit } on' "$1"
}

cmd_receipt() {
  local slug=${1:-}; [ -n "$slug" ] || die "usage: constellation receipt <slug>"
  R=$(main_repo); local f="$R/$CST/finished/$slug.md"
  [ -f "$f" ] || die "$slug is not done yet, so it has no receipt (constellation status $slug)"
  local rc; rc=$(receipt_of "$f")
  if [ -z "$rc" ]; then  # finished before receipts, or by hand: build it from the record
    local fin; fin=$(git -C "$R" log -1 --format=%H --diff-filter=A -- "$CST/finished/$slug.md")
    rc=$( [ -n "$fin" ] && receipt_compose "$slug" "$fin^" ) || die "$slug was finished without a record of how it was made, so there is nothing to build a receipt from"
  fi
  printf '%s\n' "$rc"
}
