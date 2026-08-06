#!/bin/sh
# .madewell/bin/notify.sh — reference notify hook. Delete or replace freely.
read -r line
kind=$(printf '%s' "$line" | sed -n 's/.*"kind":"\([a-z]*\)".*/\1/p')
[ "$kind" = "pause" ] && osascript -e "display notification \"$line\" with title \"Made Well: pause\""
exit 0
