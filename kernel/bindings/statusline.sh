#!/bin/sh
# statusline.sh — Claude Code's status line shows `constellation line` for the project the session
# is in: '2 being made · 1 question for you', or 'all quiet'. Silent where there is no Made Well.
# Wire it in the project's .claude/settings.json (or ~/.claude/settings.json):
#
#   "statusLine": { "type": "command", "command": "sh .madewell/bindings/statusline.sh" }
#
# Claude Code sends the session as JSON on stdin; its workspace.current_dir is where to look.
in=$(cat 2>/dev/null || true)
dir=$(printf '%s' "$in" | tr ',{}' '\n\n\n' | sed -n 's/^[[:space:]]*"current_dir"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' | head -1)
[ -n "$dir" ] || dir=$(printf '%s' "$in" | tr ',{}' '\n\n\n' | sed -n 's/^[[:space:]]*"cwd"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' | head -1)
[ -n "$dir" ] && [ -d "$dir" ] || dir=$PWD
c=$(cd "$(dirname "$0")/../bin" 2>/dev/null && pwd)/constellation
[ -x "$c" ] || c=$(command -v constellation) || exit 0
cd "$dir" && "$c" line 2>/dev/null
exit 0
