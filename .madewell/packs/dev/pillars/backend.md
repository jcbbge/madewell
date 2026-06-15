# The Backend Pillar

**One of Made Well's four pillars of software** — `backend · frontend · API · CI/CD`. A pillar is
not an optional skill; it **governs its domain on every project that stores data or runs logic on
a server.** This is the pillar of the parts the person never sees but trusts: where their data
lives, what's true, who's allowed, and what happens when something goes wrong.

**Agnostic by construction — datastore and provider both.** The principles below hold whether the
store is relational (Postgres, MySQL, SQLite) or not (document, key-value), and whether it's
**self-hosted** or a **managed service** (Neon, Supabase, PlanetScale, Xata, and the like). The
pillar names the physics; the agent maps it onto the chosen store during Phase 0, and derives the
store's *specific* rules in the stack layer at the end of this document.

**The throughline (this pillar carries real weight for it).** The person should never have to
become a database administrator — or know what one is. The agent establishes the datastore,
models the data, enforces access, and keeps it safe and recoverable *on their behalf*. The person
experiences only: "my data is there, it's correct, and it's not going to disappear."

**When this pillar governs:**

- The project first needs to **remember anything** between sessions → establish the datastore (Phase 0).
- Any time data is **stored, read, or changed**, or logic runs server-side, or access is decided.
- It does **not** govern a stateless utility that persists nothing. Match the rigor to whether
  there is data someone would be hurt to lose or to leak.

**Maturity is staged.** A project with one user and a file on disk does not need replication and
point-in-time recovery on day one. The agent builds the backend the project has earned and names
the next step — but the *principles* (one source of truth, access on the server, fail honestly)
hold from the first record.

---

## Part 1 — The Physics (principles that are never violated, store-independent)

**1. One source of truth per fact.** Every piece of data is owned by exactly one place. If the
same fact lives in two places, decide which one wins and have everything else read from it.
Duplicated truth is the most common cause of "the two screens disagree" bugs.

**2. Model the domain, not the screens.** The data's shape comes from what the thing *is*, not
from what one page happens to display today. Screens change weekly; the data outlives them. A
schema that mirrors the current UI fights every future change.

**3. Identity is a deliberate choice, made before the first record.** How each record is named
(its primary identifier) has consequences that are expensive to reverse — enumeration exposure,
distribution, index behavior, URL shape. Choose it on purpose, with the tradeoffs understood (the
stack layer resolves the specific type for the chosen store). *Never let it be an accident of the
defaults.*

**4. Relationships are enforced, not hoped.** When one record depends on another, the datastore
enforces that link — and what happens to the children when a parent is removed is a decision made
on purpose, not discovered when orphaned rows appear. Integrity is the store's job, not the
application's good intentions.

**5. Access is enforced on the server. Always.** Who may read or change a piece of data is checked
where the data lives — never trusted from the client, never enforced only by hiding a button. A
client-side check is a suggestion; a server-side check is a rule. (This is the same law the API
pillar holds, from the data's side.)

**6. Never trust input; validate at the boundary.** Everything arriving from outside — a form, an
API call, an import — is suspect until checked against what the data is allowed to be. Validate
once, at the edge, before it touches the store.

**7. Fail honestly and loudly.** An error is information. The backend never swallows a failure to
look calm — it surfaces what happened so the caller (and the person, eventually) learns the truth
and what to do. Silent failure is how data corrupts quietly for weeks.

**8. Every write is a consistency decision.** Some operations must happen all-or-nothing (wrap
them so a half-finished write can't leave the data in a state that can't exist). Others can settle
over time. Decide which is which; don't leave it to chance.

**9. The schema evolves through versioned, idempotent migrations — forward and safe.** Changes to
the data's shape are deliberate, ordered steps that any environment can apply identically and
exactly once. Additive changes ship with the code that uses them; destructive changes come *after*
the last reader is gone. (This is the same discipline the CI/CD pillar enforces at deploy time —
the two pillars meet here.)

**10. Data is precious and recoverable.** Before there is data worth keeping, know the answer to
"if this is lost or corrupted, how do we get it back, and how much do we lose?" Backups exist,
their restore window is known, and a destructive operation is never run against an unknown one.

**11. Secrets live in the secret store, never in code.** Connection strings, keys, credentials —
out of the source, into the platform's secret store (shared law with CI/CD). A credential in a
commit is a credential leaked.

**12. The backend says what it's doing.** The paths that matter — especially the ones that fail —
emit enough signal (structured logs, traces) that when something goes wrong, the answer is in the
record, not in a guess. Observability is not an add-on; it's how the system stays debuggable.

---

## Part 2 — The Protocol (execute in order)

### Phase 0 — Establish the datastore (the first decision)

1. **Does this even need a datastore yet?** If the project persists nothing, say so and stop here.
   Don't provision infrastructure a project hasn't earned.
2. **Choose the class by the data's shape**, not by fashion: relational when the data has clear
   relationships and you want integrity enforced for you (the default for most apps); document or
   key-value when the shape is genuinely loose or the access pattern is single-key. When unsure,
   relational is the safer default — it's the one that catches mistakes for you.
3. **Choose the provider — and bias managed for a non-technical builder.**
   - **Managed** (Neon, Supabase, PlanetScale, Xata, …): the service runs the server, handles
     backups, scaling, and often branching. Less control, a cost, a dependency — but the person
     never patches a database or wakes up to a full disk. **For someone who is not a backend
     engineer, this is almost always the right call** (it's the throughline: they shouldn't run a
     database).
   - **Self-hosted**: maximum control, no per-service cost — but *you* own backups, patching,
     uptime, and recovery. Only when there's a real reason and someone to carry it.
4. **Log the choice** to DECISIONS.md (store + provider + why) — it's a constitution-level decision
   the rest of the project rests on, and it triggers the stack layer below.
5. Report to the person in plain language: what the store is, why, what it costs them, and that
   you'll handle running it. One decision they actually own (paying for a managed service, or
   accepting the work of self-hosting); the rest you carry.

### Phase 1 — Model the domain

6. Name the entities and their fields and types. Apply Principle 2 — model the thing, not the page.
7. Decide identity (Principle 3) and relationships + integrity behavior (Principle 4) for each.
8. Decide ownership and the single source of truth for each fact (Principle 1).

### Phase 2 — Build the logic and the access

9. Enforce access on the server (Principle 5) and validate at the boundary (Principle 6) — both
   designed before the endpoint that uses them (this hands off to the API pillar).
10. Wrap multi-step writes for consistency (Principle 8). Fail honestly (Principle 7).

### Phase 3 — Keep it safe and maintainable

11. Set up versioned migrations (Principle 9) and wire them into the deploy (CI/CD pillar).
12. Confirm backups exist and the restore window is known (Principle 10) *before* there's data to
    lose. Keep secrets in the secret store (Principle 11). Add observability on the paths that
    matter (Principle 12).

---

## Part 3 — Definition of Done

- [ ] The datastore class and provider are chosen deliberately and logged in DECISIONS.md.
- [ ] Every fact has one owner; nothing duplicates truth across places.
- [ ] Identity strategy chosen on purpose (not the default), recorded in the stack layer.
- [ ] Relationships enforced by the store; delete behavior decided, not accidental.
- [ ] Access enforced on the server for every read and write that needs it — never client-only.
- [ ] All external input validated at the boundary before it touches the store.
- [ ] Multi-step writes that must be atomic are wrapped; failures surface, never swallow.
- [ ] Schema changes go through versioned, idempotent migrations; additive-with-code,
      destructive-after.
- [ ] Backups exist, the restore window is known, and no destructive op runs against an unknown one.
- [ ] No secret lives in the source; all credentials are in the secret store.
- [ ] The failing paths emit enough signal to debug from the record, not a guess.
- [ ] The stack layer (below) is filled in for the chosen store.

---

## The Stack Layer — derive it once the store is chosen (editable, then binding)

The principles above are universal. The **specifics** depend entirely on the store and provider
chosen in Phase 0 — and that's where the real gotchas live. This section is **deliberately empty
until that choice is made.** When it is:

**Directive to the agent:** once the datastore + provider are decided, **self-reflect and derive
the chosen store's specific rules** — its identity idioms, integrity behavior, indexing, connection
handling, the provider's particular quirks — from your own knowledge and, where needed, by sourcing
the store's and provider's current documentation. Write them below (or into a project-level stack
profile the project carries) as concrete, binding rules. From that point it is a **constitution**:
the agent embodies these rules on every backend task and never re-decides them (initialize once,
then embody — the Made Well way).

What this layer should answer for the chosen store, for example:

- **Identity** — the right primary-key type and why (e.g. for a relational store: a time-ordered
  UUID for un-enumerable, distributable keys that still index well, vs. a sequential integer for
  compactness — with the tradeoffs spelled out for *this* project).
- **Relationships & integrity** — how foreign keys / references and their on-delete behavior are
  declared in this store, and the project's default.
- **Indexing** — what to index given the real query patterns, and the cost of getting it wrong.
- **Connections** — pooling and limits (managed providers especially have specific connection
  models and gotchas — e.g. a pooled vs. direct connection, serverless connection caps).
- **Migrations** — the migration tool idiomatic to this store/stack, and how it wires into CI/CD.
- **Backups & recovery** — this provider's actual backup mechanism and restore window, written
  down before the first destructive change.
- **The store's own sharp edges** — the handful of well-known footguns for this specific
  technology, named so they're avoided on purpose.

Keep this section editable — it grows as the project's data does. But once a rule is set here, it
is law until deliberately changed and re-logged.

---

## How this pillar is followed

The person never asks for "the backend." The agent engages this pillar by phase: at setup, the
moment the project needs to remember anything (Phase 0); whenever data is modeled, stored, or
accessed; and whenever the schema changes (in concert with the CI/CD pillar). It works
autonomously, asking the person only for the decisions that are genuinely theirs — paying for a
managed service, or accepting the work of self-hosting; everything technical, it carries.

---

_Held high-level on purpose._ This pillar is general by design: backends differ enormously by
store and provider, and over-specifying upfront would lock a beginner into one stack's assumptions.
The rigor lives in the universal principles and in the **derive-it-once-chosen** stack layer — so
the pillar stays agnostic until the project commits, then becomes exactly as specific as that
project needs, and no more.
