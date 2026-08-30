#!/bin/sh
# Live tax report. Never blocks a commit.
# proposed − accepted → shop-made (ratify / hold)
# firings → keep / sunset / drop
#
# Runs in both shapes: kernel/ in the Made Well package repo, .madewell/ once installed.
set -eu
root=$(git rev-parse --show-toplevel)
if [ -d "$root/kernel/jig/metabolism" ]; then home=$root/kernel; else home=$root/.madewell; fi
exec node "$home/jig/metabolism/tax.mjs"
