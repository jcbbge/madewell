# Constellation

**Source:** task later, 2026-09-29

Constellation: a step's own done auto-lands inside the step's tmux window (relay.sh advance -> cmd_land), so a host closing that window right after done kills the landing mid-hook; Arc 2026-09-29 17:50 lost riverwood's finish this way. Run the land outside the step's window, or have hosts wait for it. A SIGKILL still cannot be trapped.
