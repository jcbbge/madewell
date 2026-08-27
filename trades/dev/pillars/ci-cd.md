# The CI/CD Pillar

**One of Made Well's four pillars of software** — `backend · frontend · API · CI/CD`. A pillar is
not an optional skill the agent loads when convenient; it **governs its domain on every
software project that will ship.** This is the pillar that governs the moment a project will be
run, shipped, or deployed by anyone other than the person at the keyboard.

**Stack-agnostic by construction.** The principles below never change. Their *mechanics* are
always "whatever your platform offers natively" — git hooks or a pre-commit framework; GitHub
Actions, GitLab CI, or any runner; containers, serverless, or a static bundle; Postgres,
SQLite, or a managed store. The pillar names the *physics*; the agent maps it onto the stack in
front of it during Phase 0.

**The throughline (this pillar is its sharpest expression).** The person should never have to
become a DevOps engineer — or know what "DevOps" means. The pipeline explains itself, catches
mistakes before they cost anything, and tells whoever hits a failure exactly what to do next.
The agent builds and runs this *on their behalf*, invisibly. They experience only: "my mistakes
get caught in seconds instead of in production."

**When this pillar governs:**

- A project is set up that will be deployed or used by anyone but the builder → stand up the rings.
- Before the first deploy, and whenever deploy/infrastructure changes → this pillar's protocol runs.
- A pipeline breaks → Principle 10 governs the debugging.
- It does **not** govern a throwaway script or a notebook that will never ship. Match the rigor
  to whether the thing has to keep working for someone else.

**Maturity is staged, not all-or-nothing.** An early project with no deploy target yet starts at
Ring 0 (local gates) and grows into Rings 1 and 2 when it has somewhere to ship. The agent never
forces a production pipeline onto a project that has no production. It builds the ring the project
has earned, and names the next one.

---

## Part 1 — The Physics (principles that are never violated)

**1. A pipeline is a trust machine, nothing more.** Its entire job is to answer one question
cheaply: *"if this ships, will it work?"* Every gate must make that answer more trustworthy or
faster. A gate that does neither is theater — delete it.

**2. Three concentric rings, same checks, increasing authority.**
- **Ring 0** — on the builder's machine before code leaves it (git hooks or the stack's
  equivalent). Fast: seconds. Catches almost everything.
- **Ring 1** — on the CI server for every proposed change and every merge. The shared,
  unskippable record.
- **Ring 2** — deploys to production, only after Ring 1 passes, only from the main line. Ends by
  *proving* the deployment works, not assuming it.

Inner rings exist so failures are caught where they are cheapest. A failure that reaches Ring 1
should have been catchable in Ring 0 — treat each one as a bug in Ring 0.

**3. Parity between rings is mechanically enforced.** Ring 0 and Ring 1 run the *same* checks. A
small script reads both configurations and fails if a check exists in one but not the other, and
that script is itself a gate. Documentation enforced by a gate cannot rot; documentation that can
rot, will.

**4. Only rebuild what changed.** Using the platform's native mechanisms, not third-party
orchestration magic: (a) **trigger filtering** — changes to files that don't ship (docs, notes,
editor config) run no pipeline at all; (b) **dependency caching** — keyed by the lockfile; (c)
**build layering** where the build tool supports it — order steps by how often they change
(stable inputs like dependency manifests first, volatile inputs like source last), and never copy
everything in before an expensive step.

**5. Test configuration is committed, never inlined.** One committed, non-secret test-environment
profile (e.g. a `.env.test` or the stack's equivalent) that CI and local runs both load. Adding a
config variable means editing the schema and that profile in the same change — the CI definition
is never touched for it. Inline dummy values in pipeline files are a defect: they duplicate truth
and break silently when a new variable appears. Real secrets live only in the platform's secret
store. Tests that need real infrastructure get an **isolated, disposable instance per change**,
created on demand and destroyed on close.

**6. Quality gates are ratchets.** Pick measurable floors and ceilings — a coverage floor, a
file-size ceiling, lint cleanliness — store each threshold in a tiny committed file, and enforce
that the value may only ever *tighten*. Set initial values from **measured reality** (just past
today's baseline, so the gate is green on day one), never from aspiration. A gate that is red the
day it's born teaches everyone to ignore it.

**7. Pin everything that can move underneath you.** Tool versions, base images, third-party
service versions — pinned exactly, bumped deliberately in their own changes. "Latest" in
production means a stranger can break your deploy while you sleep.

**8. A deployment is proven, not declared — and a static health ping proves nothing.** Ring 2
ends with runtime verification at two depths:
- **Shallow** — the health endpoint answers, and the running artifact's version matches the
  commit that triggered the deploy (bake the commit identifier into the artifact, read it back at
  runtime).
- **Deep** — a check that exercises the real dependencies the way the app does: real data-access
  against the core tables (asserting the deployed *code's* expectations against the deployed
  *data store*), a check that every migration shipped in the artifact is applied upstream, each
  critical sidecar's own health, and a real probe of each credentialed external dependency (one
  cheap real read beats confirming an env var exists). The deploy is **red** if deep health fails.

Why both: a process can boot, answer "ok," and still be a landmine — code touches the schema and
external services at *use* time, not startup, so missing columns and dead credentials wait
silently for the first user click. Tests can't catch this class either, because tests run against
test infrastructure the pipeline itself keeps correct. Only a check that runs the *deployed code
against the production dependencies* closes it. And script the rollback path **now** (re-deploy
the last good artifact) and write it down — the worst time to design rollback is during an outage.

**8b. The schema/state of any datastore is a deploy artifact.** If migrations exist, Ring 2
applies them automatically, every deploy, *before* the new code serves, with an idempotent runner
that records what's applied in the store itself. Production must never be the one environment that
doesn't auto-migrate — if local, per-change test stores, and CI all migrate themselves, a manual
production step is guaranteed eventual drift, and the drift is invisible (tests pass on migrated
test stores; shallow health is schema-blind; unused code paths sit armed until first use). Two
rules make auto-migrate safe:
- **Expand/contract ordering.** Additive changes (add column, add table) ship in the same change
  as the code that uses them — they run while the *old* code still serves, which tolerates extra
  schema. Destructive changes (drop, rename) ship one deploy *after* the change that removed the
  last reference — never destroy what the still-running code reads.
- **Migration failure halts the deploy** with the old code and old schema untouched.
  Loud-in-CI, never silent-in-production.

Also: the migrate step runs in the app's *full validated environment* (if config loading
validates the whole schema on import, migration needs the whole environment, not just a database
URL — discover that in CI, not in a stack trace). And before any destructive change, verify the
store's actual restore window — a six-hour window discovered after a bad drop is not a backup.

**8c. Environment parity is an audit, not an accident.** Every "works in dev, broken in prod"
incident is the same class: a mechanism exists in one environment with no equivalent in another,
and nothing exercises the gap until first use. Reactive gates each cover one past failure; the
class survives. Ask the class-level question outright and on a schedule: *"what does production
not do that every other environment does?"* Enumerate the mechanisms — environment loading,
migrations, sync engines, seed data, background jobs, config files — and for each, demand either
an automatic production equivalent or a gate that fails loudly on its absence. The enumeration is
finite; discovering it one outage at a time is not.

**8d. Everything on the server lives in source control.** Reverse-proxy config, status scripts,
service-manager files — anything on the deploy target a human might ever edit gets a versioned
source of truth in the repo, and the deploy syncs it: validate first (a bad config must fail the
deploy, not take down the working app), install only on change, reload the service. Hand-edits on
the box die at the next deploy *by design* — that is the feature. A one-off fix that lives only on
the server is drift with a delay timer.

**9. Failures must carry their own fix.** Every custom gate, on failure, prints: what is wrong,
where (file/line), and the exact next action — the command to run or the line to add. A failure
message that requires archaeology is half a failure message. This principle *is* the throughline
made literal: it's what lets a non-technical person resolve a red pipeline without help.

**10. Evidence before fixes — always.** When the pipeline breaks: read the actual failing step's
log *first*. Reproduce locally with the exact same command before changing anything. Never commit
a guess to re-run CI as your debugger — each guess costs a full cycle and teaches nothing. If an
error comes from a tool or library, find the literal string in its source before designing a fix.
If a health check fails but the service's own log looks healthy, suspect the *check* (wrong
binary, wrong port, wrong assumption about its environment) before the service. And treat every
conditional written in a CI platform's expression mini-language as **unverified** until you've
watched both branches behave correctly in real runs — these languages have no type checker, falsy
values silently collapse, and the config reads as correct while doing the wrong thing. The run
log, not the config file, is ground truth for what a conditional did.

**11. The author never grades their own work.** The agent that writes an implementation does not
write the tests that validate it, does not run them, and does not judge a failure it produced.
This is structural, not stylistic. A single agent that owns both the code and its tests will, under
the pull toward a green check, quietly bend one to fit the other — and the moment it does, three
distinct failures collapse into one indistinguishable blur: **(a)** a pre-existing bug the change
merely surfaced, **(b)** an implementation that doesn't satisfy the brief, **(c)** a test that
doesn't correctly express the brief. You can no longer tell which one you have, so you can't fix the
right thing. Keep the roles separate and each stays legible: a test-designer writes to the
*contract*, never seeing the implementation while designing it; on failure an *independent* triage
agent names the bucket — a, b, or c — before anyone touches a line; and the fix goes to a fresh
agent, never the one whose work is in question. A gate the author can rig is not a trust machine
(Principle 1) — it's theater with a green light. The mechanism that enforces this is the
orchestration skill (`.madewell/skills/orchestrate.md`); this principle is *why* it refuses to let
one agent close the loop on itself.

---

## Part 2 — The Protocol (execute in order)

### Phase 0 — Audit (read-only; change nothing yet)

1. Inventory the stack: language(s), package manager + lockfile, test runner, build tool, single
   package or monorepo, existing CI config, existing hooks, build/deploy scripts, deploy target
   (or none yet).
2. Map what currently happens on change/merge, step by step, with measured timings from real
   recent runs if any exist.
3. Read the last 10–15 pipeline runs if there's history. Classify every failure: real defect
   caught (good), environment/config noise (a defect in the pipeline), or flake. The noise list is
   the repair backlog.
4. If a working pipeline exists, **repair and optimize it** — do not rewrite working config, switch
   tools, or impose a template. Respect the foundation.
5. Report findings to the person in plain language before changing anything: what exists, what's
   broken, what's slow, what you'll do. Name which ring the project is ready for.

### Phase 1 — Ring 0 (local gates)

6. Install a hooks mechanism idiomatic to the stack — one that auto-installs for every contributor
   on dependency install.
7. Pre-commit: auto-format the changed files only.
8. Pre-push, fastest-first (fail fast): type/compile check → tests (lean on the build tool's
   caching so unchanged code costs ~0) → custom invariant guards → the parity guard (step 12).
   Warm target: a few seconds.
9. Anything too slow or infrastructure-dependent for pre-push is explicitly exempted, documented as
   such, and runs in Ring 1.
10. Local dev-stack startup is **health-based, never existence-based.** "Is the process listed"
    blesses a crash-looping service; check its health endpoint, compare its bound configuration
    against the *current* config (a healthy service pointed at a stale store serves wrong data
    convincingly), recreate on mismatch, and hard-fail with diagnosis steps when health can't be
    reached. A dev environment that lies about its own state generates phantom bug reports for
    weeks.

### Phase 2 — Ring 1 (CI validation)

11. **One** validation definition, reused everywhere (the platform's reusable-workflow feature):
    proposed changes, merges, and manual runs all execute the identical job. One definition = zero
    drift between "the checks" and "the gate."
12. Cache aggressively (Principle 4), keyed by the lockfile.
13. Write the **parity guard** (Principle 3): a script asserting every Ring-1 check has a Ring-0
    equivalent and vice versa, with documented exemptions for the infrastructure-dependent suite.
    It runs in both rings.
14. Integration tests get real, isolated infrastructure per change (branchable databases, ephemeral
    containers, schema-per-change — whatever the stack offers), created on demand, destroyed on
    close. Validation needs **no production secrets** — scope its credentials to test
    infrastructure only.
15. Optional once stable: run only the tests a change affects on proposed changes; the merge gate
    always runs everything. What ships is never delta-narrowed.

### Phase 3 — Ring 2 (deploy)

16. Deploy depends on Ring 1, runs only on the main line, single-flight (concurrent deploys
    superseded, never interleaved).
17. Build the artifact with churn-ordered layering where supported, tag it with the commit
    identifier, push with a persistent build cache.
18. Validate the production configuration against the real secret store as a gate **before**
    deploying — a missing or malformed secret fails the pipeline, not the booting service.
19. Apply migrations (Principle 8b): after build, before the swap, in the full validated
    environment, idempotent, failure halts the deploy with old code + old schema still serving.
20. Sync versioned server config (Principle 8d): validate → install on change → reload.
21. Deploy, then verify at runtime at **both** depths (Principle 8): shallow (health + version
    echo + sidecar health — and confirm the probe binary exists in the image you probe from) and
    deep (deployed code against deployed dependencies, migration parity, credentialed
    dependencies). On verification failure the run is **red** even though the deploy "happened,"
    and the log shows the service's own output so the next person starts with evidence.
22. Document and test the rollback command. Stateful sidecars get a pinned version, persistent
    storage, a deploy-blocking readiness wait, and no raw exposure — internal only, behind the
    app's own auth.

### Phase 4 — Ratchets, monitoring, the runbook

23. Measure current quality metrics; set the ratchet files just past reality; wire them into both
    rings.
24. **Watch production between deploys:** a scheduled job probes the deep-health endpoint every
    10–15 minutes and notifies on failure via the platform's built-in channel. Every other gate
    fires at deploy time; without this, a dependency that dies on a quiet Tuesday is found by a
    user. Zero new infrastructure — the endpoint already exists.
25. **Multi-contributor guards** (humans, agents, parallel branches, worktrees): a duplicate-
    migration-number check in Ring 1; a one-screen status tool that surfaces schema drift (shipped
    vs applied); one live dev stack per machine (parallel worktrees share ports and singleton
    sidecars — worktree agents run tests, not dev servers); a known, written-down restore
    procedure before the first destructive change.
26. **Write the operator runbook** (one file in the repo): the three-ring model in a paragraph; a
    what-happens-when table; the 3–4 monitoring commands; a failure-triage table mapping every gate
    to its meaning and exact next action; change checklists ("adding a config variable," "adding a
    package," "adding a gate," "bumping a pinned version"); the rollback procedure. Point to it from
    the repo's agent instructions. Its header states: if a failure isn't covered here, fixing that
    gap is part of fixing the failure.
27. **Walk the person through one full cycle**: a trivial change → Ring 0 passes → a proposed change
    → Ring 1 → merge → the deploy proves itself. Show them the monitoring commands. *That
    demonstration, not this document, is when they actually have CI/CD.*

---

## Part 3 — Definition of Done

Every box demonstrated, not asserted:

- [ ] A change with a type error / failing test / oversized file / missing lock update fails on the
      builder's machine in seconds, with the fix printed.
- [ ] A proposed change runs the full identical gate suite with isolated test infrastructure and
      zero production secrets.
- [ ] No agent validates its own implementation — tests are authored to the contract by a separate
      role, and a failure is triaged to bucket a/b/c by an independent verdict before any fix.
- [ ] Merging to the main line deploys to production in single-digit minutes, ending with runtime
      proof (health + version echo).
- [ ] A docs-only change triggers no pipeline at all.
- [ ] A change to one part of the app does not rebuild the others (verified by the build log's
      cache hits).
- [ ] The parity guard fails if Ring 0 and Ring 1 ever drift.
- [ ] Every branch of every CI conditional has been observed firing correctly in a real run.
- [ ] All thresholds are ratchet files; all external versions are pinned.
- [ ] Production auto-migrates on deploy; a deliberately-pending migration fails the deploy before
      the swap (demonstrated, old code kept serving).
- [ ] Post-deploy verification exercises real data access, migration parity, sidecars, and
      credentialed dependencies — and a deliberately broken dependency turns the deploy red.
- [ ] A scheduled monitor probes deep health between deploys and notifies on failure.
- [ ] Every config file on the deploy target has a versioned source of truth, synced by the deploy;
      a hand-edit on the server is overwritten by the next deploy.
- [ ] The datastore's restore window is known, documented, and sufficient to survive a destructive
      change discovered late.
- [ ] Two changes adding the same migration number fail Ring 1, not merge silently.
- [ ] The environment-parity audit has been run once: every mechanism dev relies on has a
      production equivalent or a loud gate, enumerated in the runbook.
- [ ] The runbook exists, and a newcomer (human or agent) can triage any gate failure from it
      without asking anyone.
- [ ] Rollback is one documented command, executed once on purpose to prove it works.

---

## How this pillar is followed

This pillar is **not** invoked by the person — they will never ask for "CI/CD." It is engaged by the
agent, by phase:

- During project **setup** (00-SETUP), when the work will ship to anyone but the builder, the
  agent names that this pillar applies and stands up the ring the project has earned.
- Before any **deploy** or infrastructure change, the protocol governs.
- When a pipeline **breaks**, Principle 10 governs the debugging before any fix.

The agent works autonomously through the protocol, verifying everything itself, and asks the
person only for decisions that are genuinely theirs — account credentials, spending money,
deleting things. Everything it builds explains itself, so the person stays in control without
having to understand the machinery.

---

_Earned, not theorized._ Principles 8b–8d and the deep-verification, environment-parity, and
server-config rules were not designed in the abstract — each is a vaccine for a real production
outage of the same disease: a mechanism present in one environment with no equivalent, or no
exercise, in another. Migrations that drifted silently because tests migrate their own stores and
a static health check can't see schema; a stateful sidecar that existed in dev but was never
provisioned in production; a crash-looping container wearing a green check for weeks; a
hand-edited server config that lived nowhere in source; a production table dropped against a
restore window nobody had checked. The rigor here is the residue of those, generalized so the next
project never has to learn them the hard way.
