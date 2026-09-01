#!/bin/sh
# mw-enforcers — the jig on the ledger itself.
#
# A jig claims to be a stop. This checks that the stop exists.
#
# The failure it fossilizes: a row that reads FENCE while the thing it names is
# absent. That is worse than no jig at all, because the ledger now actively
# lies — every reader downstream believes a class of mistake is impossible and
# stops watching for it. Three instances in one day (2026-09-01) on this
# machine: a CLI built but never installed while four hooks called it and every
# gate silently no-opped; a sync registry pointed at files its generator had
# stopped writing, reporting green; a multi-argument sync that honoured only
# the last argument.
#
# The rule this enforces, in one line:
#
#   A CLAIM OF ENFORCEMENT MUST SHIP ITS OWN FALSIFIER.
#
# So every jig carrying a `run` (FENCE at mode block, SIGN at mode warn) must
# also carry a `probe`: a command that exits 0 only when that jig's machinery
# is actually reachable. A jig with no `run` is DOCTRINE and is exempt — it
# never claimed to be a stop.
#
# Usage:
#   mw-enforcers.sh          probe every claiming jig; non-zero if any is dead
#   mw-enforcers.sh --list   print the tier of every jig and exit 0
#
# Zero deps beyond POSIX sh + python3, matching the rest of kernel/bin.

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
reg="$repo_root/.madewell/jig/registry.json"
# Package-repo shape: the kernel's own registry lives beside the kernel.
[ -f "$reg" ] || reg="$repo_root/.madewell/jig/registry.json"
[ -f "$reg" ] || exit 0

MODE=probe
[ "${1:-}" = "--list" ] && MODE=list

python3 - "$reg" "$repo_root" "$MODE" <<'PY'
import json, subprocess, sys
from pathlib import Path

reg_path, root, mode = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    data = json.loads(Path(reg_path).read_text())
except Exception as e:
    sys.stderr.write(f"mw-enforcers: cannot read {reg_path}: {e}\n")
    sys.exit(1)

jigs = data.get("jigs") or []


def tier(j):
    """FENCE refuses, SIGN reports, DOCTRINE is honoured by agents alone."""
    if not j.get("run"):
        return "DOCTRINE"
    return "FENCE" if (j.get("mode") or "warn") == "block" else "SIGN"


if mode == "list":
    if not jigs:
        print("mw-enforcers: no jigs registered")
    for j in jigs:
        ident = j.get("id") or j.get("run") or "<unnamed>"
        p = j.get("probe")
        note = "" if tier(j) == "DOCTRINE" else ("  probe: " + (p or "MISSING"))
        print(f"{tier(j):<9} {ident}{note}")
    sys.exit(0)

unprobed, dead = [], []

for j in jigs:
    t = tier(j)
    if t == "DOCTRINE":
        # Never claimed to be a stop. Exempt by construction, not by mercy.
        continue
    ident = j.get("id") or j.get("run")
    probe = j.get("probe")
    if not probe:
        unprobed.append((ident, t))
        continue
    r = subprocess.run(probe, shell=True, cwd=root, capture_output=True, text=True)
    if r.returncode != 0:
        dead.append((ident, t, probe, (r.stderr or r.stdout or "").strip()[:200]))

if not unprobed and not dead:
    sys.exit(0)

out = sys.stderr.write
out("\nmw-enforcers: the ledger is claiming enforcement it cannot prove.\n\n")

for ident, t in unprobed:
    out(f"  {ident}: claims {t} with no probe.\n")
    out("      A jig that cannot be falsified is a jig nobody can trust. Add:\n")
    out('        "probe": "<command that exits 0 only when this jig can actually fire>"\n')
    out("      or drop `run` and let it stand honestly as DOCTRINE.\n\n")

for ident, t, probe, err in dead:
    out(f"  {ident}: claims {t}, but its probe FAILED — the stop is not there.\n")
    out(f"      probe: {probe}\n")
    if err:
        out(f"      said:  {err}\n")
    out("      Repair the machinery, or demote the row to DOCTRINE until you do.\n")
    out("      Leaving it as-is is the worst of the three: every reader below\n")
    out("      you believes this mistake is already impossible.\n\n")

sys.exit(1)
PY
