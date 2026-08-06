#!/bin/sh
# lib.sh — shared helpers for the Made Well conformance suite (SPEC §9).
# POSIX sh. No mocks; each test gets a fresh temp git repo.
#
# This file is meant to be sourced by individual case scripts:
#   . "$(dirname "$0")/../lib.sh"

set -u

# ---------- paths ----------
KERNEL_MW=/Users/jrg/madewell/.madewell/bin/mw
KERNEL_PLAN=/Users/jrg/madewell/.madewell/bin/doors/plan.sh
KERNEL_LAND=/Users/jrg/madewell/.madewell/bin/doors/land.sh
KERNEL_NOTIFY=/Users/jrg/madewell/.madewell/bin/notify.sh

# ---------- counters ----------
PASS_COUNT=0
FAIL_COUNT=0
CASE_NAME="${CASE_NAME:-unnamed}"

# ---------- output ----------
# Pass: green marker (no emoji; uses ASCII per brief: no emojis anywhere).
pass() { printf '  ok   %s\n' "$1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { printf '  FAIL %s\n' "$1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

note() { printf '       %s\n' "$1"; }

assert_eq() {
  desc=$1; actual=$2; expected=$3
  if [ "$actual" = "$expected" ]; then
    pass "$desc"
  else
    fail "$desc"
    note "expected: $expected"
    note "actual:   $actual"
  fi
}

assert_contains() {
  desc=$1; haystack=$2; needle=$3
  case "$haystack" in
    *"$needle"*) pass "$desc" ;;
    *) fail "$desc"; note "expected to contain: $needle"; note "actual: $haystack" ;;
  esac
}

assert_fails() {
  desc=$1; expected_msg=$2; actual_msg=$3
  case "$actual_msg" in
    *"$expected_msg"*) pass "$desc" ;;
    *) fail "$desc"; note "expected to contain: $expected_msg"; note "actual: $actual_msg" ;;
  esac
}

# ---------- test repo setup ----------
# Sets TEST_REPO to a fresh temp dir, wires the kernel scripts in, and
# seeds a minimal madewell.json with a single discovery item that has
# two Imagine items (i001 with no deps, i002 depending on i001).
set_up_repo() {
  TEST_REPO=$(mktemp -d -t mw-conform-XXXXXX) || { echo "mktemp failed"; exit 1; }
  export TEST_REPO

  mkdir -p "$TEST_REPO/.madewell/work"
  mkdir -p "$TEST_REPO/.madewell/specs"
  mkdir -p "$TEST_REPO/.madewell/bin/doors"

  # Wire the kernel scripts in (symlinks, not copies, so the suite always
  # tests the live kernel).
  ln -s "$KERNEL_MW"        "$TEST_REPO/.madewell/bin/mw"
  ln -s "$KERNEL_PLAN"      "$TEST_REPO/.madewell/bin/doors/plan.sh"
  ln -s "$KERNEL_LAND"      "$TEST_REPO/.madewell/bin/doors/land.sh"
  ln -s "$KERNEL_NOTIFY"    "$TEST_REPO/.madewell/bin/notify.sh" || true

  # Initial madewell.json with a single discovery item + 2 Imagine items.
  cat > "$TEST_REPO/.madewell/madewell.json" <<'JSON'
{
  "project": "Conformance Test",
  "profile": "kernel",
  "context": {
    "summary": "conformance test repo",
    "openThread": null,
    "language": {}
  },
  "discovery": [
    {
      "id": "d001",
      "item": "Test fixture",
      "items": [
        { "id": "i001", "dependsOn": [], "title": "First item" },
        { "id": "i002", "dependsOn": ["i001"], "title": "Second item" }
      ]
    }
  ],
  "active": [],
  "landed": [],
  "blocked": [],
  "position": { "stage": "discovery" }
}
JSON

  : > "$TEST_REPO/.madewell/work/events.jsonl"
  : > "$TEST_REPO/.madewell/work/tax.jsonl"

  # git init + initial commit
  (
    cd "$TEST_REPO" || exit 1
    git init -q -b main
    git config user.email "conform@local"
    git config user.name "Conformance"
    git add -A
    git -c user.email=conform@local -c user.name=Conformance commit -q -m "Initial: madewell skeleton"
  )
}

# Clean up the test repo. Called from trap in each case.
tear_down_repo() {
  [ -n "${TEST_REPO:-}" ] && [ -d "$TEST_REPO" ] && rm -rf "$TEST_REPO"
}

# Run a command in the test repo's CWD.
in_repo() {
  ( cd "$TEST_REPO" && "$@" )
}

# Run the kernel mw with the given args, from the test repo.
mw() {
  in_repo sh "$TEST_REPO/.madewell/bin/mw" "$@"
}

# Run the kernel mw with the given args and set globals:
#   MW_RC   - the exit code
#   MW_OUT  - the captured stdout
#   MW_ERR  - the captured stderr
# This pattern (fixed globals) lets shellcheck track variable usage
# across function boundaries; an eval-based dispatcher would trigger
# SC2154 warnings at every call site.
export MW_RC=
export MW_OUT=
export MW_ERR=
mw_capture() {
  out_file=$(mktemp); err_file=$(mktemp)
  ( cd "$TEST_REPO" && sh "$TEST_REPO/.madewell/bin/mw" "$@" ) >"$out_file" 2>"$err_file"
  MW_RC=$?
  MW_OUT=$(cat "$out_file")
  MW_ERR=$(cat "$err_file")
  rm -f "$out_file" "$err_file"
}

# Make a plan artifact for the (cycle, item) that conforms to P1-P5.
write_conformant_plan() {
  cycle=$1; item=$2
  dir="$TEST_REPO/.madewell/specs/$cycle"
  mkdir -p "$dir"
  cat > "$dir/$item.md" <<EOF
# Plan: $item

## Data-Flow Conformance

The data flow for this conformance fixture is the work/events.jsonl ledger.
Reads: door scripts read inside the repo only (Rule 1). Writes: the CLI
appends one JSONL line per door tick. No network, no databases.

## Exemplar File

- \`bin/mw\` (the reference CLI)

## Framework

framework: POSIX sh
EOF
}

# Commit a Land record with the proper trailers (so the land script passes).
write_land_commit() {
  echo '{"ts":"2026-08-05T22:30:00Z","kind":"tax","amount":0,"note":"conform"}' \
    >> "$TEST_REPO/.madewell/work/tax.jsonl"
  (
    cd "$TEST_REPO" || exit 1
    git add -A
    git -c user.email=conform@local -c user.name=Conformance commit -q -m "Build $cycle

LEARNED: conformance fixture complete.
PROPAGATED: docs:moved state:n/a
TAX: 1 line added to work/tax.jsonl"
  )
}

# Verify the hash chain of the ledger. Fails the test if broken.
assert_chain_intact() {
  desc=${1:-hash chain intact}
  prev="genesis"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    line_prev=$(printf '%s' "$line" | sed -n 's/.*"prev":"\([^"]*\)".*/\1/p')
    if [ "$line_prev" != "$prev" ]; then
      fail "$desc (break at: $line)"
      return 1
    fi
    prev=$(printf '%s' "$line" | shasum -a 256 | cut -c1-16)
  done < "$TEST_REPO/.madewell/work/events.jsonl"
  pass "$desc"
}

# Count events in the ledger.
ledger_count() {
  wc -l < "$TEST_REPO/.madewell/work/events.jsonl" | tr -d ' '
}

# Extract a JSON field from the first matching line of the ledger.
ledger_field() {
  field=$1
  grep -m1 -oE "\"$field\":\"[^\"]*\"" "$TEST_REPO/.madewell/work/events.jsonl" | \
    sed -n "s/\"$field\":\"\([^\"]*\)\"/\1/p"
}

# ---------- case runner ----------
# Each case script ends with: report_case
# report_case prints the pass/fail tally for the case and exits with
# FAIL_COUNT > 0 as the exit code.
report_case() {
  if [ "$FAIL_COUNT" -gt 0 ]; then
    printf 'CASE %s: %d passed, %d FAILED\n' "$CASE_NAME" "$PASS_COUNT" "$FAIL_COUNT"
    exit 1
  else
    printf 'CASE %s: %d passed\n' "$CASE_NAME" "$PASS_COUNT"
    exit 0
  fi
}
