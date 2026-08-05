#!/bin/sh
# run-tests.sh — acceptance suite for bin/claim-gate.sh (package c001-06)
#
# Designed by td-claim-gate from .madewell/work/packages/c001-06-claim-gate.md ONLY.
# Isolation Wall (WORKER-CONTRACT §2): the Designer has never read the script under test.
# Test brief (read it first): .madewell/specs/2026-08-05-c001-claim-gate.test.md
# Executed by the independent Test-Runner role. Results go to:
#   .madewell/work/test-results/2026-08-05-c001-claim-gate.md
#
# Usage:  cd <repo root> && sh .madewell/work/verification/claim-gate/run-tests.sh
#         SKIP_SLOW=1 skips T11 (default-timeout case, ~2 minutes).
#
# Suite exit: 0 = all checks passed · 1 = at least one check failed · 2 = environment abort.
#
# Board discipline (per package brief): the suite appends clearly-synthetic claims
# (topic claim-gate-test-<pid>[-case]) to the real board for T01/T02/T03/T06 and
# NEVER deletes, edits, or truncates board lines — no cleanup, they stay.
# Missing-board / empty-board / malformed-board / default-timeout / read-only cases
# run with HOME pointed at a mktemp dir and never reference the real board path.
# Every gate invocation is watchdog-bounded; the suite leaves no orphan processes.

set -u

REPO_ROOT=$PWD
GATE_REL="bin/claim-gate.sh"
GATE_ABS="$REPO_ROOT/$GATE_REL"
REAL_BOARD="$HOME/.tower/board.jsonl"
SUITE_TOPIC="claim-gate-test-$$"
WORKER="cg-test-worker-$$"
OTHER_WORKER="cg-other-worker-$$"
SCRATCH=""
APPENDER_PID=""
PASS=0
FAIL=0
CLAIM_N=0
CLAIM_LINE=""
RWW_ELAPSED=0

say()  { printf '%s\n' "$*"; }
pass() { PASS=$((PASS + 1)); say "PASS $1"; }
fail() { FAIL=$((FAIL + 1)); say "FAIL $1"; }
abort() { say "ABORT: $1"; exit 2; }

# shellcheck disable=SC2329  # invoked indirectly via trap below
cleanup() {
  if [ -n "$APPENDER_PID" ]; then kill "$APPENDER_PID" 2>/dev/null; fi
  if [ -n "$SCRATCH" ] && [ -d "$SCRATCH" ]; then rm -rf "$SCRATCH"; fi
}
trap cleanup EXIT INT TERM

print_file() { # indent a captured stream into the log
  if [ -s "$1" ]; then
    while IFS= read -r _l; do say "    | $_l"; done < "$1"
  else
    say "    | (empty)"
  fi
}

# make_claim <from> <topic> <cwd> <body> -> sets CLAIM_LINE (one JSONL board line)
# Field order per package brief's documented line shape; no assertion depends on order.
make_claim() {
  CLAIM_N=$((CLAIM_N + 1))
  _ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  CLAIM_LINE="{\"id\":\"cgtest-$$-${CLAIM_N}\",\"ts\":\"${_ts}\",\"cwd\":\"$3\",\"type\":\"claim\",\"from\":\"$1\",\"topic\":\"$2\",\"body\":\"$4\"}"
}

# rww <limit-sec> <out-file> <err-file> <cmd...>
# Runs cmd with a defusable watchdog (no orphan sleeps: the watchdog polls a done-file
# and is always reaped). Sets RWW_ELAPSED. Returns the command's exit code, or 124 if
# the watchdog fired (any kill, rc >= 128, is reported as 124 — the gate spec only
# produces 0/1/2/3).
rww() {
  _limit=$1; _out=$2; _err=$3; shift 3
  _done="$SCRATCH/watchdog.done"
  rm -f "$_done"
  _start=$(date +%s)
  "$@" >"$_out" 2>"$_err" &
  _pid=$!
  (
    _i=0
    while [ "$_i" -lt "$_limit" ]; do
      [ -f "$_done" ] && exit 0
      sleep 1
      _i=$((_i + 1))
    done
    [ -f "$_done" ] || kill "$_pid" 2>/dev/null
  ) &
  _dog=$!
  wait "$_pid" 2>/dev/null
  _rc=$?
  : > "$_done"
  wait "$_dog" 2>/dev/null
  _end=$(date +%s)
  RWW_ELAPSED=$((_end - _start))
  if [ "$_rc" -ge 128 ]; then return 124; fi
  return "$_rc"
}

# ---------------------------------------------------------------- preamble

say "claim-gate.sh acceptance suite (package c001-06) — designer td-claim-gate, from the package brief only"
say "date:        $(date -u +%Y-%m-%dT%H:%M:%SZ)"
say "uname:       $(uname -sm)"
say "pwd:         $PWD"
say "gate:        $GATE_ABS"
say "real board:  $REAL_BOARD"
say "topic base:  $SUITE_TOPIC"
say "SKIP_SLOW:   ${SKIP_SLOW:-0}"
if command -v shellcheck >/dev/null 2>&1; then
  say "shellcheck:  present"
else
  say "shellcheck:  absent (T00b will SKIP)"
fi
say "----"

[ -d "$REPO_ROOT/.madewell" ] || abort "run from the repo root (/Users/jrg/constellation)"
[ -f "$REAL_BOARD" ] || abort "real board $REAL_BOARD not found — environment broken"

SCRATCH=$(mktemp -d /tmp/claim-gate-suite.XXXXXX) || abort "mktemp failed"
OUT="$SCRATCH/out"
ERR="$SCRATCH/err"

# ---------------------------------------------------------------- T00 static

say "== T00 static: present, executable, sh -n clean =="
[ -f "$GATE_ABS" ] || abort "$GATE_REL not found — wait for the Implementer's DONE on board topic c001-gate (this is 'not yet built', not a test failure)"
_t00=1
if [ ! -x "$GATE_ABS" ]; then _t00=0; say "  not executable: $GATE_ABS"; fi
if ! sh -n "$GATE_ABS" 2>"$ERR"; then _t00=0; say "  sh -n reported syntax errors:"; print_file "$ERR"; fi
if [ "$_t00" -eq 1 ]; then pass "T00 present, executable, sh -n clean"; else fail "T00 static checks"; fi

if command -v shellcheck >/dev/null 2>&1; then
  if shellcheck "$GATE_ABS" >"$OUT" 2>&1; then
    pass "T00b shellcheck clean"
  else
    fail "T00b shellcheck findings:"; print_file "$OUT"
  fi
else
  say "SKIP T00b shellcheck not installed (package brief: check availability first)"
fi

# ---------------------------------------------------------------- T01 match immediately (S2, S3)

say "== T01 match found immediately =="
make_claim "$WORKER" "$SUITE_TOPIC-t01" "$PWD" "SYNTHETIC TEST CLAIM — claim-gate acceptance T01 — do not act on"
printf '%s\n' "$CLAIM_LINE" >> "$REAL_BOARD"
rww 20 "$OUT" "$ERR" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t01" 10
_rc=$?
if [ "$_rc" -eq 0 ] && grep -Fxq "$CLAIM_LINE" "$OUT"; then
  pass "T01 exit 0 and exact claim line printed (${RWW_ELAPSED}s elapsed)"
else
  fail "T01 expected exit 0 + exact claim line on stdout (rc=$_rc, ${RWW_ELAPSED}s)"
  say "  expected line: $CLAIM_LINE"
  say "  stdout:"; print_file "$OUT"
  say "  stderr:"; print_file "$ERR"
fi

# ---------------------------------------------------------------- T02 match after delay (S2, S3 polling)

say "== T02 match found after a delay (append mid-wait from a background subshell) =="
make_claim "$WORKER" "$SUITE_TOPIC-t02" "$PWD" "SYNTHETIC TEST CLAIM — claim-gate acceptance T02 — do not act on"
( sleep 2; printf '%s\n' "$CLAIM_LINE" >> "$REAL_BOARD" ) &
APPENDER_PID=$!
rww 25 "$OUT" "$ERR" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t02" 15
_rc=$?
wait "$APPENDER_PID" 2>/dev/null
APPENDER_PID=""
if [ "$_rc" -eq 0 ] && grep -Fxq "$CLAIM_LINE" "$OUT" && [ "$RWW_ELAPSED" -ge 2 ]; then
  pass "T02 exit 0 after waiting for the claim (${RWW_ELAPSED}s elapsed, append at ~2s)"
else
  fail "T02 expected exit 0 + exact line + elapsed>=2 (rc=$_rc, ${RWW_ELAPSED}s)"
  say "  expected line: $CLAIM_LINE"
  say "  stdout:"; print_file "$OUT"
  say "  stderr:"; print_file "$ERR"
fi

# ---------------------------------------------------------------- T03 timeout + diagnostics (S4, R1-cwd)

say "== T03 timeout with diagnostics; wrong-cwd claim must NOT open the gate =="
make_claim "$WORKER" "$SUITE_TOPIC-t03" "/tmp/cg-wrong-cwd-$$" "SYNTHETIC TEST CLAIM — claim-gate acceptance T03 (wrong cwd) — do not act on"
printf '%s\n' "$CLAIM_LINE" >> "$REAL_BOARD"
rww 15 "$OUT" "$ERR" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t03" 3
_rc=$?
_t03=1
[ "$_rc" -eq 1 ] || { _t03=0; say "  expected exit 1, got $_rc"; }
[ -s "$ERR" ] || { _t03=0; say "  stderr is empty — S4 requires diagnostics"; }
grep -Fq "$WORKER" "$ERR" || { _t03=0; say "  stderr lacks the worker name (match criteria)"; }
grep -Fq "$SUITE_TOPIC-t03" "$ERR" || { _t03=0; say "  stderr lacks the topic (match criteria)"; }
grep -Fq "$CLAIM_LINE" "$ERR" || { _t03=0; say "  stderr lacks the wrong-cwd claim line (any-cwd diagnostic for the topic)"; }
if [ "$_t03" -eq 1 ]; then
  pass "T03 exit 1; stderr carries worker, topic, and any-cwd claim line (${RWW_ELAPSED}s)"
else
  fail "T03 timeout/diagnostics (rc=$_rc, ${RWW_ELAPSED}s)"
  say "  wrong-cwd claim line: $CLAIM_LINE"
fi
say "  RUNNER-EYEBALL E1: stderr must state the wait duration (~3s). Captured stderr:"
print_file "$ERR"

# ---------------------------------------------------------------- T04 wrong args (S5)

say "== T04 wrong-args: 0 args, 1 arg, 4 args -> exit 2 with usage =="
_t04=1
rww 10 "$OUT" "$ERR" "$GATE_ABS"
_rc=$?
[ "$_rc" -eq 2 ] || { _t04=0; say "  0 args: expected exit 2, got $_rc"; }
{ [ -s "$OUT" ] || [ -s "$ERR" ]; } || { _t04=0; say "  0 args: no usage text on stdout/stderr"; }
cat "$OUT" "$ERR" > "$SCRATCH/t04-0args.txt"
rww 10 "$OUT" "$ERR" "$GATE_ABS" onlyone
_rc=$?
[ "$_rc" -eq 2 ] || { _t04=0; say "  1 arg: expected exit 2, got $_rc"; }
{ [ -s "$OUT" ] || [ -s "$ERR" ]; } || { _t04=0; say "  1 arg: no usage text on stdout/stderr"; }
cat "$OUT" "$ERR" > "$SCRATCH/t04-1arg.txt"
rww 10 "$OUT" "$ERR" "$GATE_ABS" a b c d
_rc=$?
[ "$_rc" -eq 2 ] || { _t04=0; say "  4 args: expected exit 2, got $_rc"; }
{ [ -s "$OUT" ] || [ -s "$ERR" ]; } || { _t04=0; say "  4 args: no usage text on stdout/stderr"; }
cat "$OUT" "$ERR" > "$SCRATCH/t04-4args.txt"
if [ "$_t04" -eq 1 ]; then pass "T04 exit 2 + usage text on 0/1/4 args"; else fail "T04 wrong-args"; fi
say "  RUNNER-EYEBALL E2: output should read as a usage message. Captured (0 args / 1 arg / 4 args):"
print_file "$SCRATCH/t04-0args.txt"
print_file "$SCRATCH/t04-1arg.txt"
print_file "$SCRATCH/t04-4args.txt"

# ---------------------------------------------------------------- T05 missing board (S5) — temp HOME, real board untouched

say "== T05 missing board -> exit 3 (HOME=temp dir; real board never referenced) =="
H5="$SCRATCH/home-t05"
mkdir -p "$H5"
_b5=$(cksum "$REAL_BOARD")
rww 15 "$OUT" "$ERR" env HOME="$H5" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t05" 3
_rc=$?
_a5=$(cksum "$REAL_BOARD")
if [ "$_rc" -eq 3 ] && [ "$_b5" = "$_a5" ]; then
  pass "T05 exit 3 on missing board; real board checksum unchanged"
else
  fail "T05 expected exit 3 + untouched real board (rc=$_rc; cksum before='$_b5' after='$_a5')"
  say "  stdout:"; print_file "$OUT"
  say "  stderr:"; print_file "$ERR"
fi

# ---------------------------------------------------------------- T06 wrong worker stays closed (R1)

say "== T06 wrong-worker claim must NOT open the gate =="
make_claim "$OTHER_WORKER" "$SUITE_TOPIC-t06" "$PWD" "SYNTHETIC TEST CLAIM — claim-gate acceptance T06 (wrong worker) — do not act on"
printf '%s\n' "$CLAIM_LINE" >> "$REAL_BOARD"
rww 15 "$OUT" "$ERR" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t06" 3
_rc=$?
if [ "$_rc" -eq 1 ]; then
  pass "T06 gate stayed closed on wrong-worker claim (exit 1, ${RWW_ELAPSED}s)"
else
  fail "T06 expected exit 1 (rc=$_rc) — a wrong-worker claim may have opened the gate"
  say "  stdout:"; print_file "$OUT"
  say "  stderr:"; print_file "$ERR"
fi

# ---------------------------------------------------------------- T08 read-only (S6) — synthetic board, gate cwd = repo root

say "== T08 gate is read-only on the filesystem =="
H8="$SCRATCH/home-t08"
mkdir -p "$H8/.tower"
make_claim "$WORKER" "$SUITE_TOPIC-t08" "$PWD" "SYNTHETIC TEST CLAIM — claim-gate acceptance T08 — do not act on"
printf '%s\n' "$CLAIM_LINE" >> "$H8/.tower/board.jsonl"
_b81=$(cksum "$H8/.tower/board.jsonl")
_b82=$(wc -l < "$H8/.tower/board.jsonl")
_b83=$(ls -A)
rww 20 "$OUT" "$ERR" env HOME="$H8" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t08" 10
_rc=$?
_a81=$(cksum "$H8/.tower/board.jsonl")
_a82=$(wc -l < "$H8/.tower/board.jsonl")
_a83=$(ls -A)
_t08=1
[ "$_rc" -eq 0 ] || { _t08=0; say "  expected exit 0 (immediate match), got $_rc"; }
[ "$_b81" = "$_a81" ] || { _t08=0; say "  board checksum changed across the run"; }
[ "$_b82" = "$_a82" ] || { _t08=0; say "  board line count changed across the run"; }
[ "$_b83" = "$_a83" ] || { _t08=0; say "  cwd top-level listing changed across the run"; }
if [ "$_t08" -eq 1 ]; then
  pass "T08 board checksum/line-count and cwd listing unchanged across a gate run"
else
  fail "T08 read-only violation (see lines above)"
fi

# ---------------------------------------------------------------- T09 empty board fails closed (R3)

say "== T09 empty board file -> fail closed (exit 1, not 0, not 3) =="
H9="$SCRATCH/home-t09"
mkdir -p "$H9/.tower"
: > "$H9/.tower/board.jsonl"
rww 15 "$OUT" "$ERR" env HOME="$H9" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t09" 3
_rc=$?
if [ "$_rc" -eq 1 ]; then
  pass "T09 empty board fails closed with exit 1 (${RWW_ELAPSED}s)"
else
  fail "T09 expected exit 1 on empty board, got $_rc"
  say "  stdout:"; print_file "$OUT"
  say "  stderr:"; print_file "$ERR"
fi

# ---------------------------------------------------------------- T10 malformed board fails closed (R2, R3)

say "== T10 malformed board lines -> fail closed (exit 1) =="
H10="$SCRATCH/home-t10"
mkdir -p "$H10/.tower"
{
  printf '%s\n' 'this is not json at all'
  printf '%s\n' '{"broken": '
  printf '%s\n' '"type":"claim" but no braces around me'
} > "$H10/.tower/board.jsonl"
rww 15 "$OUT" "$ERR" env HOME="$H10" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t10" 3
_rc=$?
if [ "$_rc" -eq 1 ]; then
  pass "T10 malformed board fails closed with exit 1 (${RWW_ELAPSED}s)"
else
  fail "T10 expected exit 1 on malformed board, got $_rc"
fi
say "  RUNNER-EYEBALL E3: would these diagnostics make board-format drift obvious? Captured stderr:"
print_file "$ERR"

# ---------------------------------------------------------------- T11 default timeout 120 (S1) — slow

if [ "${SKIP_SLOW:-0}" = "1" ]; then
  say "SKIP T11 default-timeout case (SKIP_SLOW=1)"
else
  say "== T11 default timeout is ~120s (no third argument) =="
  H11="$SCRATCH/home-t11"
  mkdir -p "$H11/.tower"
  : > "$H11/.tower/board.jsonl"
  rww 200 "$OUT" "$ERR" env HOME="$H11" "$GATE_ABS" "$WORKER" "$SUITE_TOPIC-t11"
  _rc=$?
  if [ "$_rc" -eq 1 ] && [ "$RWW_ELAPSED" -ge 100 ] && [ "$RWW_ELAPSED" -le 180 ]; then
    pass "T11 exit 1 after ${RWW_ELAPSED}s (default ~120s, window 100-180)"
  else
    fail "T11 expected exit 1 after 100-180s (rc=$_rc, ${RWW_ELAPSED}s)"
    say "  stderr:"; print_file "$ERR"
  fi
fi

# ---------------------------------------------------------------- result

say "----"
say "checks: $PASS passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  say "RESULT: PASS"
  exit 0
else
  say "RESULT: FAIL"
  exit 1
fi
