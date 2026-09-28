#!/bin/sh
# Run every wired jig in .constellation/jig/registry.json that has a "run" command.
# Warn-mode: print, do not fail. Block-mode: fail.
# Appends one line per jig to firings.jsonl (sunset / take-down substrate).
# No jigs, or no run fields: silent success.

set -eu
repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
reg="$repo_root/.constellation/jig/registry.json"
[ -f "$reg" ] || exit 0

python3 - "$reg" "$repo_root" <<'PY'
import json, os, subprocess, sys, time
from pathlib import Path

reg_path, root = sys.argv[1], sys.argv[2]
data = json.loads(Path(reg_path).read_text())
jigs = data.get("jigs") or []
fail = 0
firings = Path(root) / ".constellation/jig/firings.jsonl"
ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
head = subprocess.run(["git", "rev-parse", "--verify", "-q", "HEAD"], cwd=root, capture_output=True, text=True)
sha = head.stdout.strip() if head.returncode == 0 else ""  # a repo with no commit yet has no HEAD

for j in jigs:
    run = j.get("run")
    if not run:
        continue
    mode = j.get("mode") or "warn"
    ident = j.get("id") or run
    proc = subprocess.run(run, shell=True, cwd=root, capture_output=True, text=True)
    caught = 0 if proc.returncode == 0 else 1
    line = json.dumps({
        "ts": ts, "sha": sha, "jig": ident, "mode": mode,
        "exit": proc.returncode, "violations_caught": caught,
    })
    with firings.open("a") as f:
        f.write(line + "\n")
    if proc.returncode != 0:
        sys.stderr.write(f"cst-jigs: {ident} ({mode}) exit {proc.returncode}\n")
        if proc.stdout:
            sys.stderr.write(proc.stdout)
        if proc.stderr:
            sys.stderr.write(proc.stderr)
        if mode == "block":
            fail = 1

sys.exit(fail)
PY
