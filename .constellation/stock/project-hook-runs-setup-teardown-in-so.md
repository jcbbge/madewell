# project_hook runs setup/teardown in $(

**Source:** task later, 2026-09-29

project_hook runs setup/teardown in $(...), so a setup that backgrounds a process without redirecting its output makes take wait for that process to exit (seen: (sleep 30 &) held take 30s)
