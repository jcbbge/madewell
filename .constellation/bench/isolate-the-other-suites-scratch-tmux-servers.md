# Isolate the other suites' scratch tmux servers from the operator's tmux

**Source:** task later, 2026-09-29

Isolate the other suites' scratch tmux servers from the operator's tmux.conf (-f /dev/null): its session-created/after-new-window hook runs 'home gather' against them

**Making:** every Constellation test that starts a scratch tmux server starts it with the operator's config ignored and always shuts it down, even when the run is killed.
**Not making:** changes to what the tests check; the driver's own tmux use in real runs (kernel/lib).
**Done when:** every suite that runs tmux on a scratch socket passes -f /dev/null on the command that starts that server and shuts it down from one EXIT/INT/TERM trap set before the server starts; the whole gate, and a suite killed with SIGTERM partway, leave no scratch server running.
**Waits on:** 
