# The API Pillar

**One of Made Well's four pillars of software** — `backend · frontend · API · CI/CD`. A pillar is
not an optional skill; it **governs its domain on every project where two parts communicate.** The
API is the seam between the pieces — frontend to backend, service to service, app to shared
infrastructure. Get it right and the system stays changeable; get it wrong and every piece becomes
complicit in every other piece's problems.

**Agnostic by construction.** The principles hold whatever the style — REST, GraphQL, RPC, or a
typed function boundary. The examples below are REST-shaped because it's the common case; the
*physics* (a contract, designed first, honest about failure, stable over time) don't change.

**The throughline.** The person never designs an API and never hears the word "endpoint." The
agent makes the contracts hold so the app's pieces never discover, on integration day, that they
made incompatible assumptions. The person experiences only: "the parts fit together and keep
fitting as it grows."

**When this pillar governs:**

- Before any two pieces of the system first communicate, or a frontend makes its first call.
- Before a new endpoint is added, or an existing one changes in a way that could break a caller.
- It does not govern code that never crosses a boundary. Match the rigor to whether something
  *depends* on this contract.

---

## Part 1 — The Physics (principles that are never violated)

**1. An API is a promise.** Once something depends on it, breaking it has a cost. Design it
deliberately — *before either side is built.*

**2. Contract first, both sides to the contract.** Write what it receives, what it returns, what
it returns when something goes wrong, and who may call it — before any implementation. Both the
caller and the responder build to that contract independently. This is how parallel work is
possible, and how you avoid integration-day surprises.

**3. Predictable.** A developer who has used one endpoint can correctly guess how the next one
works. Consistency is worth more than cleverness.

**4. Minimal.** Return what the caller needs, not everything you have. Every extra field is
something to maintain and something that can break a caller when it changes.

**5. Explicit about failure.** Every endpoint can fail. Design the failure responses with the same
care as the success ones — a caller that doesn't know how you fail can't handle your failures
gracefully.

**6. Stable.** Once something depends on an API, changing it silently is a betrayal. If the shape
must change, version it or deprecate the old shape with notice.

**7. Access is enforced on the server.** Who may call this, and under what conditions, is answered
before the endpoint is built and enforced where the data lives — never as a UI constraint, never a
client-side check. Those can be bypassed; server enforcement cannot. (Shared law with the Backend
pillar, from the contract's side.)

---

## Part 2 — The Protocol (how the contract gets made)

### Define the contract first

Before any implementation: what does this receive, what does it return, what does it return on
error, and who may call it. That document is the deliverable — both sides build to it.

### Resource design — name things as the things they are

Nouns, not verbs. The method carries the verb.

```
/projects          — a collection of projects
/projects/42       — a specific project
/projects/42/tasks — tasks belonging to that project
```

- `GET` — read, no side effects · `POST` — create · `PUT`/`PATCH` — update · `DELETE` — remove

A URL with a verb in it (`/getProject`, `/deleteUser`) usually means the resource model isn't clear
yet. Find the noun.

### Response shape — consistent, always

Success and error each have one shape, defined once and used everywhere. A caller that handles one
success response can handle all of them; same for errors.

```json
// success
{ "data": { }, "meta": { "total": 100, "page": 1 } }

// error
{ "error": { "code": "VALIDATION_FAILED", "message": "Human-readable description", "fields": { "email": "Already in use" } } }
```

### Status codes — use them, correctly

| Code | Meaning |
|---|---|
| `200` / `201` / `204` | Success / Created / Success-no-body |
| `400` / `401` / `403` / `404` | Bad request / Not authenticated / Not authorized / Not found |
| `422` / `429` | Validation failed (right shape, wrong values) / Rate limited |
| `500` | Something broke on our end |

Returning `200` with `{ "success": false }` in the body is lying. Use the right code.

### What belongs in an API — and what doesn't

**Belongs:** data retrieval and mutation, business logic that produces a result, access
enforcement, input validation. **Does not:** presentation logic, client state, unrelated
operations bundled into one endpoint to save round trips. The API describes what the system *can
do*; the client decides what to *show*.

---

## Part 3 — Definition of Done

Before any endpoint is built:

- [ ] Contract written — inputs, outputs, error shapes defined.
- [ ] Resource named as a noun; the method carries the verb.
- [ ] Access rule defined and server-enforced.
- [ ] All failure cases have explicit response shapes.
- [ ] Response shape consistent with every other endpoint.
- [ ] Returns only what the caller needs — nothing extra.
- [ ] If this changes existing callers — versioned or deprecated with notice.

---

## How this pillar is followed

The person never asks for an API. The agent engages this pillar the moment two parts of the system
need to talk — writing the contract before either side, so frontend and backend can be built in
parallel without fighting. It works from the contract; the person owns only product decisions
("can a guest see this?"), never the wire format.

---

_The seam is where systems rot or stay supple._ The cost of a careless API isn't paid when it's
written — it's paid every time something changes and a dozen callers have to change with it. The
rigor here buys the right to change one part of the system without breaking the others.
