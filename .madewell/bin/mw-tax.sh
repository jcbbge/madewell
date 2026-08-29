#!/bin/sh
# Live tax report. Never blocks a commit.
# proposed − accepted → shop-made (ratify / hold)
# firings → keep / sunset / drop
exec node "$(git rev-parse --show-toplevel)/.madewell/jig/metabolism/tax.mjs"
