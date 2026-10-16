# pi's front door

For pi the front door is this package itself. Installing it adds the `durable_work` tool (start,
resume, status, inspect, answer), the `/work` command, the footer status and the live dashboard.

    pi install <path to this checkout>

Run it from the checkout as `pi install "$PWD"`, then `/reload` any open pi session. pi records the
package in its own settings (`pi list` shows it). `pi-durable provision` prints this command and never
edits pi's settings; `pi-durable doctor` reports whether the package is listed.

Inside Made Well's own workers (`PI_DURABLE_WORKER=1`) the package adds nothing.
