# Strip the old dialect out of the framework

**Making:** remove every document and code path that restates the model or maintains state
that no longer exists, so `MADEWELL.md` + `SPEC.md` are the only normative documents.

**Not making:** the thinking lenses in `skills/`, the domain cartridges, or anything a
project authored for itself. Those are independent and stay.

**Done when:** a grep for the dead dialect (`madewell.json`, `cycles/`, `LIFECYCLE`,
`substrate-*`, `discovery[]`, `active[]`) returns nothing outside this file; the states are
`stock/ bench/ finished/`; `install.sh` and the jig agree with `SPEC.md`; and the repo carries
no client- or company-specific content.

**Waits on:**
