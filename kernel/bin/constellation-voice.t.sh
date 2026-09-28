#!/usr/bin/env bash
# constellation-voice.t.sh — the host speaks one voice, in plain words, behind one of two doors.
# Against a scratch project with the kernel installed: .constellation/HOST.md carries the host's
# law (one voice, relay and rephrase, the glossary, the person's words mapped to verbs, the
# session opening with the brief, the two doors); PROFILES.md and profiles.json say which
# surfaces each door shows; and nothing in kernel/skills/*.md or the README's top section tells
# the person to type an engine word or a command. The detector is proved on planted lines
# first, so a green verdict means it looked, not that it could not see.
set -uo pipefail
KB=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$KB/../.." && pwd)
T=$(mktemp -d "${TMPDIR:-/tmp}/constellation-voice.XXXXXX")
export CONSTELLATION_STATE=$T/state CONSTELLATION_DRY=1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
trap 'rm -rf "$T"' EXIT
fails=0
ok()   { printf 'ok   %s\n' "$1"; }
bad()  { printf 'FAIL %s\n' "$1"; fails=$((fails + 1)); }
check() { local n=$1; shift; if "$@" >/dev/null 2>&1; then ok "$n"; else bad "$n"; fi; }

P=$T/proj; mkdir -p "$P"; git init -q -b main "$P"; echo hi >"$P/notes.txt"
git -C "$P" add -A; git -C "$P" commit -qm init
sh "$ROOT/install.sh" "$P" >/dev/null 2>&1
A=$P/.constellation/HOST.md
# The host's law is the whole file: nothing else in it is anyone else's.
HOST=$(cat "$A")
has() { grep -qF -- "$1" <<<"$HOST"; }
row() { grep -F -- "$1" <<<"$HOST" | grep -qF -- "$2"; }   # one line carries both

# --- the host's law, as installed
check "installed .constellation/HOST.md carries the host's law" test -s "$A"
check "the host is the only voice the person hears" has "the host is the only voice the person hears"
check "star output is relayed and rephrased" has "relayed and"
check "the stars never speak to the person" has "The stars never speak to the person"
check "the glossary is mandatory in anything shown to the person" has "Mandatory in anything shown to the person"
for pair in "stock|ideas" "bench|being made" "finished|done" "the floor|the four questions" \
  "vega|thinking it through" "polaris|a second look" "cassiopeia|planning it" "sirius|making it" \
  "orion|writing the checks" "aldebaran|checking it"; do
  check "glossary: ${pair%%|*} is '${pair#*|}'" row "| ${pair%%|*}" "**${pair#*|}**"
done
check "the person never types an engine word or a command" has "The person never types an engine word or a"
check "'continue' means constellation resume" row '"continue"' 'constellation resume'
check "'stop' and 'wait' mean constellation pause" row '"stop", "wait"' 'constellation pause'
check "'go' means constellation go" row '"go"' 'constellation go'
check "the session opens with constellation brief" has 'The session opens with `constellation brief`'
check "the two doors are chosen once, at adoption" has "Chosen once, at adoption"
check "just talk is stored as the guide profile" row "just talk" '`guide`'
check "show me the engine is stored as the lead profile" row "show me the engine" '`lead`'
check "the door is stored in .constellation/profile" has '`.constellation/profile`'
check "after a piece lands, the host relays its receipt" has "After a piece lands, relay its receipt"
check "the receipt comes from constellation receipt, told in plain words" sh -c 'grep -qF "Run \`constellation receipt <slug>\` and tell the" "$0" && grep -qF "in plain words and your voice" "$0"' "$A"

# --- the doors, as installed: which surfaces each shows
PJ=$P/.constellation/profiles.json PM=$P/.constellation/PROFILES.md
doors() { python3 - "$PJ" "$@" <<'PY'
import json, sys
m = json.load(open(sys.argv[1])); d = m["doors"]; p = m["profiles"]; s = m["surfaces"]
talk, eng = d["just talk"], d["show me the engine"]
checks = {
  "map":     talk["profile"] == "guide" and eng["profile"] == "lead"
             and p["guide"]["door"] == "just talk" and p["lead"]["door"] == "show me the engine",
  "known":   all(x in s for x in talk["shows"] + eng["shows"]),
  "superset": set(talk["shows"]) < set(eng["shows"]),
  "plain":   not {"commands", "engine-names", "status", "windows", "files", "tax"} & set(talk["shows"]),
  "both":    {"conversation", "brief", "questions", "receipt"} <= set(talk["shows"]),
  "contract": "door" in m["contracts"] and all("door" in v for v in p.values()),
}
sys.exit(0 if checks[sys.argv[2]] else 1)
PY
}
check "profiles.json: just talk is guide, show me the engine is lead" doors map
check "profiles.json: every surface a door shows is named" doors known
check "profiles.json: the engine door shows everything just talk shows, and more" doors superset
check "profiles.json: just talk shows no commands, engine names, windows or files" doors plain
check "profiles.json: both doors show the conversation, the brief, questions and the receipt" doors both
check "profiles.json: door is a contract row every profile fills" doors contract
check "PROFILES.md has a section on the two doors" grep -qx '## The two doors' "$PM"
check "PROFILES.md: just talk is guide, show me the engine is lead" sh -c "grep -F 'just talk' '$PM' | grep -qF '\`guide\`' && grep -F 'show me the engine' '$PM' | grep -qF '\`lead\`'"
check "PROFILES.md: a surfaces table with one column per door" grep -qF '| Surface | just talk (`guide`) | show me the engine (`lead`) |' "$PM"
check "PROFILES.md: commands are an engine-door surface only" grep -qE '^\| the commands the host runs.*\| no \| yes \|$' "$PM"
check "the Guide register opens the session from the brief" grep -qF 'constellation brief' "$P/.constellation/registers/guide/REGISTER.md"

# --- nothing tells the person to type an engine word or a command
VERBS=$(sed -n 's/^  \([a-z-]*\)) .*/\1/p' "$ROOT/kernel/bin/constellation" | paste -sd'|' -)
[ -n "$VERBS" ] || VERBS=take
# The detector reads paragraphs, not lines, so a wrapped sentence cannot hide a hit. A skill
# speaks to the agent: it offends when it has the agent tell the person to type, or puts a
# command in the host's mouth. The README's top section (above the How it works part) speaks to
# the person: command-like text in a code block, or beside an imperative, tells them to type
# it; a paragraph that opens by addressing the assistant, and a code block right after one,
# are not speaking to the person.
cat >"$T/tells.py" <<'PY'
import re, sys
mode, path, label, verbs = sys.argv[1:5]
CMD = r"constellation (<|(%s)(?![a-z-]))" % verbs
CL = re.compile(CMD + r"|(^|`)\s*(\$ |(git|sh|bash|ls|cd|npm|npx|make|python3?|curl|brew|tmux) )|cst-[a-z]|\.constellation/"
                r"|\b(stock|bench|vega|polaris|cassiopeia|sirius|orion|aldebaran|ideate|slug|the rack|the floor)\b", re.I | re.M)
TELL = re.compile(r"\b(tell|ask|have|get|let|invite|remind|show|teach|instruct)s? (them|the person|the user|the operator"
                  r"|people|the human|the client|him|her)( how)? to (type|run|enter|say|use|call|invoke|paste)\b", re.I)
IMP = re.compile(r"\b(type|run|enter|say|paste|use)\b|\bact through\b", re.I)
TO_AGENT = re.compile(r"^\W*(for (the|your) (assistant|agent)s?|for agents)\b", re.I)
text = open(path).read()
if mode == "readme":
    text = text.split("\n# How it works\n")[0]
units, cur, fence, first = [], [], False, 0      # (kind, first line number, text)
for n, line in enumerate(text.split("\n"), 1):
    if line.startswith("```"):
        if cur: units.append(("code" if fence else "prose", first, "\n".join(cur)))
        cur, fence = [], not fence
        continue
    if not fence and not line.strip():
        if cur: units.append(("prose", first, "\n".join(cur)))
        cur = []
        continue
    if not cur: first = n
    cur.append(line)
if cur: units.append(("code" if fence else "prose", first, "\n".join(cur)))
def told(u):   # an imperative with command-like text after it, in the same sentence
    for sen in re.split(r"[.!?](?:\s|$)", " ".join(u.split())):
        m = IMP.search(sen)
        if m and CL.search(sen, m.end()):
            return True
    return False
def speech(u):
    quoted = [m.group(1) for m in re.finditer(r'\*"(.+?)"\*', u, re.S)]
    quoted += ["\n".join(l.lstrip()[1:] for l in u.split("\n") if l.lstrip().startswith(">"))]
    return [q for q in quoted if q.strip()]
agent = False   # a code block right after a paragraph addressed to the assistant is its too
for kind, n, u in units:
    flat = " ".join(u.split())
    agent = bool(TO_AGENT.search(u)) if kind == "prose" else agent
    if mode == "skill":
        hit = TELL.search(flat) or any(told(q) or re.search(CMD, q) for q in speech(u))
    else:
        hit = not agent and (TELL.search(flat) or (kind == "code" and CL.search(u)) or told(u))
    if hit:
        print("%s:%d: %s" % (label, n, u.split("\n")[0]))
PY
skill_tells() { python3 "$T/tells.py" skill "$1" "$2" "$VERBS"; }
readme_tells() { python3 "$T/tells.py" readme "$1" README.md "$VERBS"; }

F=$T/fixtures; mkdir -p "$F"
printf 'Tell them to type `constellation go` when they are ready.\n' >"$F/tell.md"
printf '> *"Just type `constellation resume greet` to pick up."*\n' >"$F/quote.md"
printf '> *"Say bench and I will show you."*\n' >"$F/word.md"
printf 'Run `constellation tax` at verify.\n> *"What are you making?"*\nDo not show them commands.\n\n> *"That is ideate. You already run all of it."*\n' >"$F/fine.md"
printf '# Constellation\n\n```sh\nconstellation take greet\n```\n\n# How it works\n' >"$F/block.md"
printf '# Constellation\n\nRun `constellation discover notes.md` first.\n\n# How it works\n' >"$F/imp.md"
printf 'When they are ready, tell them\nto type `constellation go`.\n' >"$F/wrap.md"
printf '# Constellation\n\nThen run\n`constellation take greet` and wait.\n\n*For the assistant:* run\n`constellation adopt` here:\n\n```sh\nconstellation adopt\n```\n\nThen:\n\n```sh\nconstellation run x\n```\n\n# How it works\n' >"$F/wrapped.md"
printf '# Constellation\n\nPaste this to your AI assistant: "Set up Constellation in this project."\n\n```\nSet up Constellation in this project.\n```\n\nYour assistant runs `constellation adopt` for you.\n\n# How it works\n\n```sh\nconstellation run x\n```\n' >"$F/front.md"
check "detector: catches a skill telling them to type a command" test -n "$(skill_tells "$F/tell.md" tell)"
check "detector: catches a command put in the host's mouth" test -n "$(skill_tells "$F/quote.md" quote)"
check "detector: catches telling them to say an engine word" test -n "$(skill_tells "$F/word.md" word)"
check "detector: leaves the agent's own commands and plain questions alone" test -z "$(skill_tells "$F/fine.md" fine)"
check "detector: catches a command block in the README's top section" test -n "$(readme_tells "$F/block.md")"
check "detector: catches 'run <command>' in the README's top section" test -n "$(readme_tells "$F/imp.md")"
check "detector: a line break does not hide telling them to type" test -n "$(skill_tells "$F/wrap.md" wrap)"
check "detector: a wrapped 'run <command>' is caught; one addressed to the assistant is not" test "$(readme_tells "$F/wrapped.md" | cut -d: -f2 | paste -sd, -)" = 3,16

check "detector: a plain sentence to paste is fine; below the top section is not its business" test -z "$(readme_tells "$F/front.md")"

hits=$(for s in "$ROOT"/kernel/skills/*.md; do skill_tells "$s" "kernel/skills/${s##*/}"; done)
check "no skill tells the person to type an engine word or a command" test -z "$hits"
[ -n "$hits" ] && sed 's/^/     /' <<<"$hits"
hits=$(readme_tells "$ROOT/README.md")
check "the README's top section tells the person to type nothing" test -z "$hits"
[ -n "$hits" ] && sed 's/^/     /' <<<"$hits"

[ $fails -eq 0 ] && echo "constellation-voice: all tests passed" || { echo "constellation-voice: $fails failure(s)"; exit 1; }
