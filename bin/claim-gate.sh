#!/bin/sh
# claim-gate.sh — the CLAIM gate as an executable (WORKER-CONTRACT §1,
# orchestrator side). A worker is not started until this gate opens.
#
# Usage: claim-gate.sh <worker-name> <topic> [timeout-seconds]
#
# Polls ~/.tower/board.jsonl for a type:"claim" line whose "from" equals
# <worker-name>, whose "topic" equals <topic>, AND whose "cwd" equals the
# current directory ($PWD). All three must match on the same line.
#
# Exit 0: claim found — the matching board line is printed to stdout.
# Exit 1: timeout — stderr gets the wait duration, the exact match criteria,
#         and the last claim lines seen for the topic (any cwd).
# Exit 2: wrong arguments (usage to stderr).
# Exit 3: the board file does not exist.
#
# Read-only on the filesystem: this script never writes to the board,
# never truncates anything. Every non-match path fails closed (non-zero).

set -u

POLL_INTERVAL=2
DEFAULT_TIMEOUT=120

usage() {
    printf 'usage: %s <worker-name> <topic> [timeout-seconds]\n' "${0##*/}" >&2
    exit 2
}

# --- arguments -------------------------------------------------------------

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
    usage
fi

WORKER=$1
TOPIC=$2
TIMEOUT=${3:-$DEFAULT_TIMEOUT}

if [ -z "$WORKER" ] || [ -z "$TOPIC" ]; then
    usage
fi

case $TIMEOUT in
    ''|*[!0-9]*)
        usage
        ;;
esac
# Strip leading zeros so integer comparison is safe in any sh.
TIMEOUT=$(printf '%s' "$TIMEOUT" | sed 's/^0*//')
if [ -z "$TIMEOUT" ]; then
    TIMEOUT=0
fi

BOARD=${HOME:?claim-gate: HOME is not set}/.tower/board.jsonl

if [ ! -f "$BOARD" ]; then
    printf 'claim-gate: board file does not exist: %s\n' "$BOARD" >&2
    exit 3
fi

# --- matcher ---------------------------------------------------------------
# Board line shape (verified this session via tail/grep on
# ~/.tower/board.jsonl): the canonical writer emits
#   {"id":"...","ts":"...","cwd":"...","topic":"...","type":"claim","from":"...","body":"..."}
# but key order is NOT stable across writers (observed lines lead with
# "type" or place "topic" before "type", and some lack "cwd" entirely), so
# each field is matched independently as a fixed string (-F), never as one
# long substring. The closing quote in every pattern anchors the value:
# "from":"td-claim" must not open the gate for "from":"td-claim-gate", and
# ".../constellation" must not match ".../constellation-wt/escalate".
# Any mismatch or format drift fails closed as a timeout, and the timeout
# diagnostics show what the board actually holds.

match_claim() {
    grep -F -e '"type":"claim"' "$BOARD" 2>/dev/null |
        grep -F -e "\"from\":\"$WORKER\"" |
        grep -F -e "\"topic\":\"$TOPIC\"" |
        grep -F -e "\"cwd\":\"$PWD\"" |
        tail -n 1
}

claims_for_topic() {
    grep -F -e '"type":"claim"' "$BOARD" 2>/dev/null |
        grep -F -e "\"topic\":\"$TOPIC\"" |
        tail -n 5
}

# --- poll ------------------------------------------------------------------

START=$(date +%s)

while :; do
    LINE=$(match_claim)
    if [ -n "$LINE" ]; then
        printf '%s\n' "$LINE"
        exit 0
    fi

    NOW=$(date +%s)
    ELAPSED=$((NOW - START))

    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        {
            printf 'claim-gate: TIMEOUT after %ds (limit %ds)\n' "$ELAPSED" "$TIMEOUT"
            printf 'claim-gate: match criteria: "type":"claim" AND "from":"%s" AND "topic":"%s" AND "cwd":"%s"\n' \
                "$WORKER" "$TOPIC" "$PWD"
            printf 'claim-gate: board: %s\n' "$BOARD"
            printf 'claim-gate: last claim lines for topic "%s" (any cwd):\n' "$TOPIC"
            SEEN=$(claims_for_topic)
            if [ -n "$SEEN" ]; then
                printf '%s\n' "$SEEN" | sed 's/^/  /'
            else
                printf '  (none)\n'
            fi
            printf 'claim-gate: worker is NOT started — investigate the pane; never send further instruction\n'
        } >&2
        exit 1
    fi

    sleep "$POLL_INTERVAL"
done
