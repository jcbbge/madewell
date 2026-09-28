#!/bin/sh
# Live tax report. Never blocks a commit.
# proposed − accepted → shop-made (ratify / hold)
# firings → keep / sunset / drop
#
# Runs in both shapes: kernel/ in the Constellation package repo, .constellation/ once installed.
set -eu
root=$(git rev-parse --show-toplevel)
if [ -d "$root/kernel/jig/metabolism" ]; then home=$root/kernel; else home=$root/.constellation; fi
exec node "$home/jig/metabolism/tax.mjs"
