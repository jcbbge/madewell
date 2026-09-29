#!/usr/bin/env bash
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd); fails=0
ok(){ printf 'ok   %s\n' "$1"; }; bad(){ printf 'FAIL %s\n' "$1"; fails=$((fails+1)); }
check(){ local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }
skills_of(){ sed -n '1,/^---$/s/^skills:[[:space:]]*//p' "$ROOT/kernel/stars/$1.md" | head -1 | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;/^$/d'; }
exact(){ [ "$(skills_of "$1" | paste -sd, - | sed 's/,/, /g')" = "$2" ]; }
count(){ n=$(skills_of "$1"|wc -l|tr -d ' '); [ "$n" -ge 3 ] && [ "$n" -le 5 ]; }
real(){ while read -r n; do [ -f "$ROOT/kernel/skills/$n.md" ] || return 1; done < <(skills_of "$1"); }
words(){ [ "$(wc -w <"$ROOT/kernel/stars/$1.md")" -le 220 ]; }
debugging_separation(){ grep -qF "rerun the exact failing behavior or the smallest experiment; never rerun Orion's check" "$ROOT/kernel/skills/debugging.md" && ! grep -qF 'rerun the named check' "$ROOT/kernel/skills/debugging.md"; }
registered(){ python3 - "$ROOT" <<'PY'
import json, pathlib, sys
root=pathlib.Path(sys.argv[1]); data=json.loads((root/'kernel/guides/SKILLS.json').read_text())['skills']; seen={s['name']:s['file'] for s in data}
want={'collaborative-critique':'skills/collaborative-critique.md','grounded-planning':'skills/grounded-planning.md','tenex':'skills/tenex.md','debugging':'skills/debugging.md','intent-driven-checks':'skills/intent-driven-checks.md','execution-checklist-discipline':'skills/execution-checklist-discipline.md','failure-triage':'skills/failure-triage.md'}
assert all(seen.get(k)==v and (root/'kernel'/v).is_file() for k,v in want.items())
PY
}
brief_paths(){ star=$1; step=$2; out=$(cd "$ROOT" && bash -c 'KERNEL=$0; R=$(mktemp -d); CST=.constellation; STARS=$KERNEL/stars; STATE=$R/state; mkdir -p "$R/.constellation/bench"; printf "# Demo\n\n**Making:** demo\n**Not making:** -\n**Done when:** done\n**Waits on:**\n" >"$R/.constellation/bench/demo.md"; git -C "$R" init -q; git -C "$R" config user.email t@t; git -C "$R" config user.name t; . "$KERNEL/lib/constellation/core.sh"; . "$KERNEL/lib/constellation/trade.sh"; . "$KERNEL/lib/constellation/run.sh"; compose_brief demo "$1" ""' "$ROOT/kernel" "$step"); while read -r n; do grep -qF "\`$ROOT/kernel/skills/$n.md\`" <<<"$out" || return 1; done < <(skills_of "$star"); }
check 'vega exact skills' exact vega 'exploring-possibilities, synthesizing-insights, reframing, challenging-assumptions, blind-spots'
check 'polaris exact skills' exact polaris 'collaborative-critique, think-critically, blind-spots, challenging-assumptions'
check 'cassiopeia exact skills' exact cassiopeia 'grounded-planning, systems-thinking, verify-then-write, think-critically'
check 'sirius exact skills' exact sirius 'tenex, debugging, verify-then-write'
check 'orion exact skills' exact orion 'intent-driven-checks, challenging-assumptions, systems-thinking, blind-spots'
check 'aldebaran exact skills' exact aldebaran 'execution-checklist-discipline, failure-triage, verify-then-write'
for s in vega polaris cassiopeia sirius orion aldebaran; do check "$s count" count "$s"; check "$s real" real "$s"; check "$s words" words "$s"; done
check 'seven new skills registered' registered
check 'polaris behavior' grep -qF 'Steel-man it first' "$ROOT/kernel/stars/polaris.md"
check 'cassiopeia behavior' grep -qF 'executable, evidence-backed plan' "$ROOT/kernel/stars/cassiopeia.md"
check 'sirius behavior' grep -qF 'smallest coherent maintainable diff' "$ROOT/kernel/stars/sirius.md"
check 'sirius debugging keeps maker out of checker run' debugging_separation
check 'orion behavior' grep -qF 'No count or coverage theater' "$ROOT/kernel/stars/orion.md"
check 'aldebaran behavior' grep -qF 'Run exactly the named commands, in order' "$ROOT/kernel/stars/aldebaran.md"
check 'vega brief paths' brief_paths vega vega
check 'polaris brief paths' brief_paths polaris polaris-peer
check 'cassiopeia brief paths' brief_paths cassiopeia cassiopeia
check 'sirius brief paths' brief_paths sirius sirius
check 'orion brief paths' brief_paths orion orion
check 'aldebaran brief paths' brief_paths aldebaran aldebaran
[ $fails -eq 0 ] && echo 'constellation-star-curricula: all tests passed' || { echo "constellation-star-curricula: $fails failure(s)"; exit 1; }
