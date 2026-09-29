# Isolate the other suites' scratch tmux servers from the operator's tmux

**Source:** task later, 2026-09-29

Isolate the other suites' scratch tmux servers from the operator's tmux.conf (-f /dev/null): its session-created/after-new-window hook runs 'home gather' against them
