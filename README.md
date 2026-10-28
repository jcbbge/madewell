# Made Well

Made Well is a work OS: **capture raw input → generate tasks → complete tasks**. A durable notebook and to-do list, independent of domain, team, framework, provider and model. Each task runs its own configured input/output functions. NQ governs agent handoffs; the same saved record holds answers, outputs, recovery and execution evidence.

The software-delivery pack remains the installation default for compatibility. It is one configuration, not the definition of Made Well. Use a **function pack** below for a single operation, non-software work or a different composition; it needs no Git repository and adds no implicit planning, testing or shipping steps.

## Install

Requires Node 24.15 or later.

```sh
npm install -g --install-links github:jcbbge/madewell
```

## Use

Put your notes in, from any project. That is the whole act:

```sh
mw discover --source-file notes.md        # or: mw start --objective "<one line>" --source "<your words>"
```

With the default software pack, Made Well discovers the work in the notes and pauses for you to choose what to deliver. Each promoted piece goes through ideation, planning, implementation and verification, then pauses before shipping: merged on main, pushed to its upstream, and deployed by your ship command if the project has one (`mw init --ship "<command>"`). The machine starts itself; no separate runner command is needed.

How involved you are is yours to choose, per project (`mw init --autonomy <level>`) or per run (`--autonomy` on `discover` and `start`):

| Level | Made Well stops |
|---|---|
| `checkpoints` (default) | after discovery, and before each item ships |
| `steps` | at the checkpoints, and between the phases of delivery |
| `full` | no routine checkpoints; the responsible agent resolves questions within NQ, with a hold for a spec defect after three answered turns |

Start with checkpoints; choose fewer stops as you become comfortable. Explicit project or run settings are preserved. `mw init --autonomy full` opts a project into hands-off delivery.

At a stop, `mw go <id>` carries on and `mw answer <id> "<what should change>"` steers. Something the machine cannot do itself (a credential, a failing ship command) holds the item at any level, with the exact command that unblocks it.

Tell it the rules your repo's work follows that no linter catches, and every plan is held to them with a check that proves it:

```sh
mw init --conventions '["Colours and spacing come from the design tokens in src/tokens.css"]'
```

Let your own agent watch: `mw next` says what needs you now, `mw status` and `mw show <id>` say where everything is, and `mw ui` shows it all live. Every command prints JSON, and every answer and error lists the `next` commands.

Questions and answers stay on the durable record and travel to later handoffs. Exact repeats reuse their saved answers automatically. For reworded questions, intake or the originator references the saved answer by id; Made Well validates the reference, inserts that answer verbatim, and remembers the new wording. The operator is not asked to settle the same question again. Implementation and test-design exchanges remain separate so neither maker sees the other's work.

## Cartridges

Made Well is a console with cartridges plugged in. The console keeps the durable work record, NQ, saved answers, holds, card swaps and traces. A pack declares ordered discovery and delivery cartridges. Each cartridge contains nodes: agent calls, trusted commands, or groups composing child nodes. Functions can be added, removed, replaced and nested without changing the console.

### Open function packs

Save this as `pack.json` for an implementation-only agent:

```json
{
  "name": "one-task",
  "version": "1",
  "runtime": "functions",
  "discovery": [],
  "delivery": [{
    "cartridge": "work",
    "steps": [{
      "job": "implement",
      "profile": "implementer",
      "duty": "Carry out only the authorized task and report the result.",
      "access": "make",
      "output": {"type": "object", "required": ["result"], "properties": {"result": {"type": "string"}}}
    }]
  }]
}
```

```sh
mw cartridges --check pack.json
mw init --cartridges pack.json          # register for this workspace
mw start --objective "<done means>" --source "<authorized task>"
mw start --cartridges other.json --objective "<done means>" --source "<task>"
mw cartridges --item 1                 # inspect the run's pinned configuration
mw cartridges --update revised.json --item 1
```

- **Composition:** zero, one or many nodes; no reserved stage names. `children` nests nodes, executed depth-first in order; a group returns its children's outputs keyed by job. Job identities must be unique. Empty flows complete with zero work, not a verification or shipping claim.
- **Input:** `{item: {id, title, objective, source}, args, received}`. Set `args` for configuration, `receives` for earlier outputs (default: previous node; groups: direct children), and optional `input` schema. Agent packets include this under `function` along with the effective node and pack. Profile/duty/task/tier/access/budget configure agent execution; every agent handoff still uses NQ.
- **Command nodes:** replace profile/duty with `run`, e.g. `"run": "python3 transform.py"`. JSON input arrives on stdin. Return a JSON object on stdout, exit zero, and send logs/intermediate values to stderr. Outputs must match `output`. Contracts support type, properties, required, items, enum and anyOf. A returned string `blocked` holds the task. Commands run with the host's permissions: install only trusted code, do not put credentials in arguments/logs, and make side effects retry-safe. An interrupted, unaccepted call can run again; accepted calls do not.
- **Discovery:** configure any capture/generation nodes; the last returns `{"items":[{"title":"…","objective":"…","text":"…"}]}`. Candidates inherit delivery configuration. Checkpoints wait for promotion; full autonomy queues them. Empty discovery produces no tasks. `steps` pauses between cartridges; function completion has no implicit merge/deploy step or final shipping checkpoint.
- **Updates:** project files are reread for new runs. Existing runs pin their pack. `--update` validates and records a replacement, applied at the next saved node boundary. Accepted and attempted/in-flight nodes stay unchanged and in place. Updating a parent group must preserve its already executed children. Completed runs require a new run. The live display shows requested/applied/rejected updates.
- **Evidence:** every command/group and agent call records arguments, output, timing, logs and failures. Only emitted locals are visible; arbitrary process memory and private model internals are not. Token usage is unknown when not reported. Completion means configured contracts passed, not an independent assertion of real-world correctness. Specify verification appropriate to the task.

This is explicit configuration loading and boundary replacement inspired by pi.dev, not pi API compatibility, a package installer, an extension sandbox or automatic upgrades.

### Software compatibility pack

The default pack is software development: ideation (ideate, challenge), planning (plan), implementation (implement and the checks, side by side), verification. Change it by plugging in your own:

```sh
mw cartridges | jq .pack > pack.json      # start from the default
$EDITOR pack.json                         # add, remove or reword steps
mw init --cartridges pack.json            # this project's new work runs it
```

The software runtime can add steps before the plan, hold several discovery cartridges, and unplug checks. Only this runtime keeps five slots: `discover`, `plan`, `implement`, `test-plan` and `verify`. Its Git isolation, independent maker/check tracks and shipping guarantees remain intact. `mw cartridges --check pack.json` reports contract problems before anything runs.

### Optional decision cartridge

The [three-legged rubric](dossiers/2026-10-24-three-legged-rubric.md) is the default: agents judge DX, UX and AX through their 3×3 matrices, and settled decisions must pass at least two legs. No external inference is needed.

An optional entry in prescriptions selects a registered advisory renderer:

```json
{
  "decisionModel": {
    "enabled": true,
    "provider": "<registered decision provider>",
    "options": {}
  }
}
```

No provider is registered by the CLI today. Hosts can supply named `DecisionProvider` functions through the engine's `decisionProviders` registry, following `src/decision.ts`: bounded request and options in, an Effect returning a schema-checked result out. Guidance is supplied at ideation/planning and NQ originator boundaries, never at maker execution or verification. The console records the chosen path in `decision-resolution` events and reuses it on redrive. Absence, `enabled: false`, malformed settings, unknown providers, failures, invalid results and a five-second timeout all fall back to the normal in-process rubric. Providers cannot grant authority, extend NQ or bypass holds. The structured operator-hold UX remains deferred.

## Watch a run

**`mw ui`** serves the work display at `/` (also `/runs`) and prints its address. It starts with plain-language status, what needs attention and the task's configured steps. Open **Activity & technical details** for calls, timing, runner/heartbeat, exact failures, configuration, inputs, outputs and logs. Read projections never retry or steer work; the versioned operator API below separately accepts explicit submissions and answers. Unknown usage is not zero. The [design system](DESIGN.md) pairs locally served Plex Sans with Plex Mono system messages and derives spacing from the primary line height.

The earlier Gazette remains at `/gazette`, and the detailed console at `/console` shows:

- how much has shipped, and what needs you, with the questions asked and the exact command to run;
- every item's pipeline (ideate, challenge, plan, implement and checks side by side, verify, ship) with what is happening now and who owes the next move;
- what each running agent is doing, read from its live output: the files it reads, the commands it runs, what it says;
- a timeline of every agent call and Made Well step, and where the agent time and tokens go by job: NQ intake, originator answers, the job itself;
- for any item: its idea, plan, checks and their results, the diff, every NQ question and answer, and every call with its packet, answer, transcript and trace.

The console only reads the store, so it is safe beside a running `mw run`. `mw replay` writes the same console as one page with the whole record inside it, to read or share with no server.

- From another computer: `ssh -L 4747:localhost:4747 <machine>`, then open the same address.
- In an Amp orb: expose the supervised UI service through its portal; add the exact returned portal origin to `MW_UI_ORIGINS` and restart the UI service before using the versioned API.
- `mw ui --host 0.0.0.0` serves your network. This is not multi-tenant authentication: restrict network access to the operator and explicitly allow the UI origin.

**`mw watch`** gives the same view in a terminal (tmux, Ghostty, any SSH session), redrawn every second. When a program reads it, it streams every event as one JSON line instead, so any agent can follow a run with `mw watch --since <seq>`.

### Context and operator input contract (v1)

`mw context <id>` returns the same compact projection as `GET /api/v1/items/<id>` **without a server**. It includes objective/source, state/current node, a saved-state revision, recent questions/answers, evidence links and next actions with owner, authority, reason, structured inputs and preconditions. Read-only `show`/`trace`/`status` actions belong to the observer; answers and other mutations remain the operator's. Full records and AX traces are linked, not nested. Source previews stop at 8,000 characters; recent conversation previews stop at 20 messages, 2,000 characters each and 12,000 characters total. Truncation is explicit; conversation and raw evidence remain available. These limits do not alter capture, packets or saved answers.

HTTP evidence links remain unchanged; `evidence.cli` additionally names `{record:"mw show <id>",trace:"mw trace <id> --lens ax",context:"mw context <id>"}` and `observation.command` names `mw context <id>`. A headless agent can follow the evidence without starting a server or deriving commands from URLs.

Discovery is `GET /api/v1`; `GET /api/v1/openapi.json` describes **only the new operations** in OpenAPI 3.1.1. The CLI manual embeds that same context schema. OpenAPI is an operation contract, not telemetry. Legacy CLI output and `/api/model`, `/api/item`, `/api/trace`, etc. are unchanged.

| Operation | Contract |
|---|---|
| `GET /api/v1/session` | `{apiVersion:"1",csrfToken,header:"X-MW-CSRF",maxBodyBytes:65536}`; token rotates on UI restart |
| `GET /api/v1/projects` | `{apiVersion:"1",projects:[{workspace,autonomy,pack}]}`; includes registered projects even without existing work |
| `POST /api/v1/items` | `{requestId,workspace,objective,source,title?}`; uses the selected registered project's existing pack/autonomy, starts one delivery task, never guesses a shell command or chat intent |
| `GET /api/v1/items/<id>` | Shared context projection; use `answer.allowed`, `answer.causeRequired`, `answer.causes` and `answer.reason` to offer/explain answering |
| `POST /api/v1/items/<id>/answers` | `{requestId,revision,text,cause?}`; cause is `implementation`, `test` or `pre-existing` only where advertised; engine `answer` retains NQ and hold rules |
| `GET /api/v1/items/<id>/conversation?after=<event-seq>` | `{apiVersion:"1",item,revision,messages:[{id,at,role,kind,text,event}],nextAfter,hasMore}`; absent `after` begins with the exact source, up to 50 messages/page, then saved questions/answers; no invented bot reply |
| `GET /api/v1/items/<id>/otlp` | OTLP/HTTP JSON `ExportTraceServiceRequest` (`resourceSpans`), described below |

For writes send **`Content-Type: application/json`** (optional `charset=utf-8`), **`X-MW-CSRF: <session.csrfToken>`**, and **`Origin: <exact UI origin>`** (browsers supply Origin). No Content-Encoding. Unknown body fields are rejected. Request IDs are 16–128 ASCII letters, digits, `_` or `-`; `crypto.randomUUID()` works. Limits: whole UTF-8 JSON body 65,536 bytes; source/answer 32,768 Unicode code points; objective 2,000; optional title 300; workspace 4,096. JSON Schema character limits count Unicode code points, not UTF-16 units. Text must contain non-whitespace; accepted text is never trimmed. The answer's item ID belongs in the path, **not the body**: fill the null text/requestId slots in a context HTTP action's `inputs` and POST it to that action's `href`.

Success is `{apiVersion:"1",accepted:true,requestId,receipt:{item,revision,event,replayed},context,warnings}`: 201 for a new submission, 200 for an answer or replay. The receipt records acceptance, **not task completion**. State changes, exact text and the receipt commit atomically in the existing SQLite store. Reuse the **same request ID and same input** after an uncertain network result, including after UI restart; refresh the CSRF token if necessary. A changed payload under the same ID is 409 `request_id_conflict`. A new answer with an old revision is 409 `stale_revision`; refresh context, review the question, retain the draft and create a new request only after review. Observational heartbeat events alone do not change the item revision. Receipts survive pruning: replay may return `context:null` for a removed item, but never recreates it. A runner-wake failure returns accepted input with a warning; it does not invite a new submission.

Errors are RFC9457 **`application/problem+json`** with `type`, `title`, `status`, `detail`, `instance`, plus `code`, `reason`, factual `context`, current `task` when permitted, legacy `next` commands and `recovery.preserveDraft:true`. Preserve draft/focus and errors until acceptance is known. The UI owns local draft recovery; the server does not save unaccepted drafts. `not_answerable` retains actionable engine alternatives; `cause_required` requires selecting an advertised cause. An existing engine no-op on repeated checkpoint text returns 409 `answer_not_applied`, never a false receipt.

**Security assumptions:** this is a local, single-operator process, not a public service or an authentication system. Loopback UI origins are accepted by default. `MW_UI_ORIGINS` is a comma-separated list of exact trusted HTTP(S) origins (no paths), for example a trusted Amp portal origin. Host is allowlisted; Origin, CSRF token and Fetch Metadata are checked; requests have a 10-second body deadline and bounded bytes. Forwarded host/protocol headers grant no trust, and CORS is not enabled. Proxy identity/access control stays at the proxy. Do not expose the UI to untrusted network users; anyone with local process/network access is within the local operator trust boundary. Observing agents still must not submit or answer on the operator's behalf.

**OTLP scope:** the export endpoint uses the actual `resourceSpans → scopeSpans → spans` wire shape, 32/16-character hex IDs, numeric enums, decimal nanosecond timestamp strings, and typed `stringValue`/`intValue`/`doubleValue` attributes. It exports saved finished invocations with bounded identifier metadata and known positive usage counts, not raw prompts/arguments/logs, exception bodies or tool events. Source precision is milliseconds. IDs are stable when reopening the same store path; moving the store changes the trace namespace. Spans are INTERNAL roots, not invented timed parents. Running/lost/interrupted or invalid-time records remain on the native trace; an empty export does not mean no work. This is neither full OTel SDK instrumentation nor collector delivery, logs/metrics export or access to model internals. The current Amp external-worker bridge exposes dispatch/result and heartbeat, **not Amp tool-by-tool streams**; no surface invents that missing evidence.

### Three lenses, one trace

`mw trace <id>` is the read-only light switch: **done / not done**, needs you or not, the next action, and recorded proof (delivery, checks, candidates or hold). It defaults to **UX / 30,000 ft**, with no raw harness stream.

- `mw trace <id> --lens dx`: **DX / 15,000 ft** — lane and stage, NQ and independent maker tracks, cards and budgets, calls and refusals, quota, runner ownership/loss, verification, flags and live diagnostics.
- `mw trace <id> --lens ax`: **AX / 0 ft** — the work → round/job → invocation → tool tree, original inputs, outputs, stream fragments, tool starts/results, heartbeat and parse/schema evidence. Invocation ids distinguish interrupted attempts from their redrives.
- The same JSON is available at `/api/trace/<id>?lens=ux|dx|ax` on `mw ui`. Replay embeds the AX record, and exports retain interrupted fragments in `item.json` alongside the existing completed-call folders. No renderer is required; these are headless projections, not a browser redesign.

Agent calls (including repairs), prepare, gates/checks, ship and alerts append live evidence to the **existing event store**, before returning. The transient `live/` files are still convenient tails; they are no longer the only copy of in-flight output. A killed runner leaves its invocation and captured fragments readable as **lost**, never as a successful returned call. Old calls retain their original record; missing historical live evidence is not invented.

Signals are evidence, not automatic correction. A five-second heartbeat observes **60 seconds without output**, **120 seconds without a reported tool result** (including an outstanding-tool signal), three consecutive identical tool inputs or output lines, repeated NQ question sets, JSON-looking stream parse failures, and unusual duration. Duration uses three times the median of at least three prior returned invocations of the same item/job/kind, with a 30-second floor; before that it uses one minute for intake/repair and three minutes otherwise. These are explicit heuristics, not proof that work is useless. Returning output/results clears the corresponding live signal. Existing budgets, NQ, holds, retries and shipping decisions are unchanged; ship/alert commands gain observation, not a new timeout.

Hosts can pass an optional `TraceRenderer` to `serve`, or call `renderTrace` over `lensOf` (`src/trace.ts`). Missing/invalid renderers, failure, non-JSON output and a five-second timeout fall back to the JSON lens. Renderers do not own state or get an engine control API. Discovery records dropped candidate positions and missing fields; a nonzero alert exit is explicitly a notification failure, never “sent.”

Everything is recorded by default in Made Well's home (`~/.local/share/madewell`):

- the store holds every item, event and agent call in full;
- `live/` holds the output of each step while it runs;
- `spans.jsonl` traces every engine step (`MW_DEBUG=0` turns it off).

**Updates reach a running `mw run` by themselves.** Reinstall Made Well and the runner notices its build changed: it finishes the steps in flight, starts nothing new, and replaces itself with the new build in the same process, keeping its pid and the runner claim. `kill -HUP <pid>` does the same on demand. Nothing is stopped or restarted by hand.

To collect telemetry from every machine, set `MW_TELEMETRY` to a directory you sync or collect (the same one everywhere, or one per machine). Each machine then appends every event, every agent call in full, and every engine span to its own file there, each line stamped with the Made Well build that wrote it and each call with its harness's version. `mw stats` reads those files together. Set `MW_TELEMETRY_LEVEL=metrics` to keep your repo's content out: prompts, answers, raw streams, errors and messages are written as their lengths, and `mw stats` reads the same numbers.

[FOUNDATION.md](FOUNDATION.md) is the operator's law and governs everything here.

## Manual QA backend (v1)

Manual QA is durable evidence **on existing work**, not another task scheduler or automated acceptance gate. Select an existing `workItem` from `mw status`; `workspace` must exactly match that item's workspace. A capture/manual-QA task is a valid anchor for historical instructions with no original delivery. The checkout need not exist or be Git, and QA never registers a project or creates work implicitly. Authorized execution roles may author instructions and append technical/historical evidence; observing agents remain read-only.

**Browser use:** run `mw ui`, then open **Manual QA**. Cases are authored through the existing CLI/API below; start a review with pinned instructions and the tested environment/version, or resume a saved run. Review cases, record explicit manual verdicts, edit autosaved notes, and download whole-run or follow-up exports as Markdown or JSON. Stale edits retain your draft and require loading and explicitly reviewing the saved record before a new submission; uncertain requests retry with the same saved body and request ID. **Locally saved drafts** offers recovery and download on that browser, not cross-device synchronization.

**Local operator declaration, not authentication:** only `qa-verdict` / the verdicts POST accepts an explicit `enteredBy.kind:"operator"` and `attestation:"operator-manual-verdict"`. A local process can lie about its identity; CSRF and origin checks do not prove a human performed a check. Imported checkmarks, technical results, actor labels and `claimedVerifier` never set manual status. States are exactly **`untested`, `passed`, `failed`, `needs-refinement`**. No actual Arc or browser result is asserted by this backend delivery.

### Commands and HTTP

All writes read a JSON file of at most **65,536 UTF-8 bytes**, fatally reject invalid UTF-8/JSON, and require a caller-chosen `requestId` matching `^[A-Za-z0-9_-]{16,128}$`. No IDs are generated on retry. `mw` describes every file body and uses the same output schemas as OpenAPI. Path IDs do not belong in bodies. All objects, including nested actors/references/version variants, reject excess fields; strings preserve exact whitespace and Unicode.

| CLI | HTTP under `/api/v1/qa` |
|---|---|
| `mw qa-case-create --input-file case.json` | `POST /cases` |
| `mw qa-case-revise <caseId> --input-file revision.json` | `POST /cases/{caseId}/revisions` |
| `mw qa-cases [--workspace <exact>] [--work-item <id>] [--q <text>] [--area <text>] [--after <id>] [--limit <n>]` | `GET /cases` |
| `mw qa-case <caseId> [--revision <n>]` | `GET /cases/{caseId}?revision=N` |
| `mw qa-run-start --input-file run.json` | `POST /runs` |
| `mw qa-runs [--workspace <exact>] [--work-item <id>] [--case-id <id>] [--after <id>] [--limit <n>]` | `GET /runs` |
| `mw qa-run <runId>` | `GET /runs/{runId}`; resume is just a read |
| `mw qa-observe <runId> <caseId> --input-file observation.json` | `POST /runs/{runId}/cases/{caseId}/observations` |
| `mw qa-verdict <runId> <caseId> --input-file verdict.json` | `POST /runs/{runId}/cases/{caseId}/verdicts` |
| `mw qa-observations <runId> [--case-id <id>] [--after <observationId>] [--limit <n>]` | `GET /runs/{runId}/observations` |
| `mw qa-export <runId> [--selection all\|follow-ups] [--format json\|markdown]` | `GET /runs/{runId}/export?selection=all&format=json` |
| `mw qa-link <runId> <caseId> --input-file link.json` | `POST /runs/{runId}/cases/{caseId}/links` |

HTTP query names are `workspace`, `workItem`, `q`, `area`, `caseId`, `after`, `limit` as applicable; unknown/repeated parameters and non-integer or unsafe IDs are refused. Filters combine with AND. `q` is a case-insensitive **literal** substring of latest title/area/change (SQL wildcard characters have no special meaning); area/workspace are exact. Lists return `{apiVersion:"1",items,nextAfter,hasMore}` in ascending ID order; after defaults to 0, limit to 50 (maximum 100), and `nextAfter:null` means no further page. Collection GETs are not writes. QA uses the existing Host/Origin protection for reads and exact Origin/Host, CSRF, Fetch Metadata, content type/encoding, byte limit and 10-second deadline for every POST. No QA operation wakes workers or alters Item revisions, state, verification or software acceptance.

Discovery advertises `qaCases` and `qaRuns`. Item context's `evidence.qaCases` and `evidence.qaRuns` link to these lists filtered by `workItem`. QA problems use the existing RFC9457 envelope with `code:"qa_request"`, `{status,reason,facts}` in context and actionable `next` commands; task context is null, never an unrelated Item selected from a case/run ID. Missing anchors retain `item_not_found`; unreadable CLI files retain `source_unreadable`.

### Exact write bodies

The following is **labelled fixture data**, not a claim about an application. Replace work item/workspace with an existing matching anchor before submitting. `case.json`:

```json
{
  "requestId": "fixture-case-create-001",
  "workItem": 5,
  "workspace": "/fixture/project",
  "enteredBy": {"kind": "agent", "label": "implementer"},
  "instructions": {
    "title": "Fixture: reopen a saved draft",
    "area": "Drafts",
    "change": "Draft text persists after reload",
    "sourceRefs": [{"label": "Labelled fixture, not Arc evidence", "ref": "fixture:qa/draft"}],
    "prerequisites": "Use the fixture application",
    "testData": "Draft = hello",
    "actions": ["Enter hello in the draft field", "Reload the fixture page"],
    "expected": "The draft field still contains hello"
  }
}
```

`revision.json` contains `{requestId,revision,enteredBy,instructions}`. `revision` is the expected current case revision (initially 1); `instructions` is a **complete replacement** with the same fields above, never a patch. Case identity/anchor/workspace never change; every historical revision remains readable.

`run.json` pins explicit revisions in the chosen order (1–100 distinct cases, all in the same workspace):

```json
{"requestId":"fixture-run-start-001","workItem":5,"workspace":"/fixture/project","enteredBy":{"kind":"operator","label":"operator"},"application":"Fixture application","environment":"Local labelled fixture","version":{"kind":"unknown"},"cases":[{"caseId":1,"caseRevision":1}]}
```

Version is **explicitly** `{kind:"unknown"}` or `{kind:"known",value,source:{label,ref}}`. It is never inferred from a branch or checkout. Run metadata and selection are immutable; correcting environment/version means a new run. Every new entry begins at `entryRevision:0`, `status:"untested"`, even when selecting a previously passed revision. Old runs keep pinned instructions and results when a case changes, with `outdated:true` and `currentCaseRevision` in the run view. A case alone has no global pass.

`observation.json` records evidence without declaring a manual verdict:

```json
{"requestId":"fixture-observe-001","revision":0,"kind":"historical","enteredBy":{"kind":"agent","label":"implementer"},"claimedVerifier":{"kind":"operator","label":"operator named in source"},"observedAt":null,"actual":"Source checklist says checked; no fresh execution witnessed","reproduction":"","notes":"Transcribed as historical evidence only","evidence":[{"label":"Fixture checklist","ref":"fixture:qa/old-checklist"}],"reportedResult":"passed"}
```

Allowed kinds are `note`, `technical`, `historical`. `reportedResult` is a state or null; `note` requires null. At least one nonblank actual/reproduction/notes field, evidence ref or reported result is required, except that `kind:"note"`, positive expected `revision` and exactly `notes:""` allow clearing notes without other content. All fields remain required; omitted/null notes, otherwise empty revision-0 notes, empty technical/historical observations and whitespace-only notes without other content remain invalid. A positive expected revision is not proof of existing evidence: the Store's existing lookup, pin and CAS checks remain authoritative, including `stale_revision` against an untouched entry at revision 0. Any prior observation can establish the positive counter; no prior note is required. An accepted clear appends an exact-empty note and increments that entry's counter, retaining old notes and the manual verdict/status; it never deletes history. Ordinary replay/conflict rules apply, and a fresh ID/current revision appends another clear normally. `claimedVerifier` and valid RFC3339 `observedAt` may be null and remain separate from entrant/server time. Do not send verdict/attestation fields here.

`verdict.json` is a **deliberate submit**, never autosave or a conversion from historical/technical evidence:

```json
{"requestId":"fixture-verdict-001","revision":1,"enteredBy":{"kind":"operator","label":"operator"},"attestation":"operator-manual-verdict","verdict":"passed","actual":"In this labelled fixture run, hello remained after reload","reproduction":"Entered hello, then reloaded","notes":"Fixture declaration; not evidence about Arc","evidence":[]}
```

For passed/failed/needs-refinement, actual must be nonblank. Resetting to untested allows empty text and appends a verdict; it never deletes history. The server assigns `kind:"manual-verdict"`, `claimedVerifier=enteredBy`, `observedAt=at`, `reportedResult:null`. Do not supply those server-owned fields. Actors are `{kind:"operator"|"agent"|"import",label}`. References are opaque `{label,ref}` text, not fetched or hosted, and not automatically safe links or authority. Limits: actor/ref labels, title, area and known version 300 code points; ref/workspace 4,096; application/environment 2,000; instructions change/expected/prerequisites/testData and observation actual/reproduction/notes 8,000; ordered actions 1–100 nonblank strings of at most 2,000; references 0–50. Required labels/title/area/change/expected and known version are nonblank. IDs/counters are safe integers.

### Receipts, conflicts, history and downstream seams

Every accepted write returns exactly `{apiVersion:"1",accepted:true,requestId,receipt:{operation,resource,id,caseId,revision,event,at,replayed},links:{read,workItem}}`. Operations are `createCase`, `reviseCase`, `startRun`, `observeCase`, `recordVerdict`, `linkObservation`. Resource is case/run/run-entry; id is case ID or run ID; caseId is nonnull only for run-entry. Revision is the new case/entry counter, 0 for run creation, or the **unchanged** current entry counter for a link. Event is the owning `qa-*` event sequence. No mutable view is embedded; refresh `links.read` (the existing run GET for a link), then the export for associations. New case/run creates return HTTP 201; other writes and all accepted replays return 200.

Both instruction revisions and **every** observation/verdict use CAS. Entry counters increment for notes too, independently per run/case. The latest manual-verdict alone sets status. Canonical key order is irrelevant to retry identity, but string bytes and array order matter. Same request ID/input replays the original receipt after restart; changed input/target/operation is 409 `request_id_conflict`. A stale request saves its exact rejected draft in one `qa-conflict` event and a permanent 409 receipt, including expected/actual revision, `conflictEvent`, read link and refresh command. Replaying that ID always returns the original conflict; it never later applies. Invalid/security requests are not saved as QA evidence. Domain rows, accepted event and receipt commit together; trace attempts may survive interruption without implying acceptance.

Downstream UI clients must keep an origin-local immutable pending body/ID plus newer unsent edits, serialize notes per entry, retry uncertain outcomes with the same ID/body, and clear pending content only after confirmed acceptance and refresh. The current editable note must honor a latest note with `notes:""`, never fall back to older nonempty text; browser clearing/reload behavior requires independent acceptance, not merely this backend contract. Polling never overwrites dirty input. A 409 retains both local text and server conflict evidence and requires explicit review/new ID/current revision, never silent rebasing. Case revisions and verdicts are explicit submissions. CSRF renewal must not change payload identity.

Run reads expose pinned `title`, `area`, `entryRevision`, `status`, `currentCaseRevision`, `outdated`, `latestVerdictId`, `instructionsHref` and `observationsHref`. `qaSnapshot(runId)` from `src/qa.ts` remains unchanged: `{schemaVersion:1,run,entries:[{caseId,caseRevision,instructions:CaseRevision,entryRevision,status,observations}]}` with complete exact text, pinned run order and ascending observation IDs in one SQLite read snapshot. The additive export reuses this projection and enriches it **inside the same read transaction**, not by composing independent reads. Existing `mw export` forensic files, replay and OTLP remain unchanged.

QA history/receipts have no deletion/TTL in this delivery. Ordinary prune retains all case/run anchors, their events/calls and managed item/export files, reporting **retained by manual QA history**. Store-level protection is rechecked under the write lock before the CLI's files-first deletion callback. A newly protected selection fails 409 `retention_changed` before any file deletion; rerun selection. This costs retained space. External evidence refs are not managed attachments.

### Complete follow-up exports

`qaExport(runId, query = {})` and both transports use the exported `QaExportQuery` / `QaExportResult` schemas. Defaults are `selection=all`, `format=json`. Only `selection` and `format` are accepted on export GET; POST links accepts no query parameters. All successes are HTTP 200 `application/json` and CLI JSON, including Markdown:

```text
{apiVersion:"1",format:"json",data:QaExportDocument}
{apiVersion:"1",format:"markdown",markdown:string}
QaExportDocument = {schemaVersion:1,selection:"all"|"follow-ups",externalEvidence:"unavailable-reference-only",run:QaRun,entries:QaExportEntry[]}
QaExportEntry = {caseId,caseRevision,case:QaCase,instructions:QaCaseRevision,entryRevision,status,currentCaseRevision,outdated,latestVerdictId,observations:QaObservation[],links:QaLinkView[],conflicts:QaConflict[]}
```

`all` includes untouched and notes-only entries. `follow-ups` includes exactly **current manual** failed/needs-refinement entries; an old failure now passed/reset or a historical/technical reported failure alone is excluded. Empty entries are valid. The original immutable run and all its ordered pins remain complete even when entries is a subset. Every selected entry retains its complete observation history in ID order, pinned instructions, exact strings, entrant/claimed verifier, historical/server timestamps and manual versus reported result. The case's current revision/outdated flag and latest manual verdict ID are read consistently.

Links include outgoing associations and incoming retest associations once each, sorted by event; prior runs' observation trees are not recursively copied. Conflicts include this run/case's rejected observe/verdict/link drafts plus case-wide rejected instruction revisions from the actual case owner. Each `QaConflict` is a closed operation-discriminated `{event,workItem,at,operation,requestId,runId,caseId,expected,actual,input}`; `runId:null` only for `reviseCase`, and `input` is that operation's exact validated rejected body. Generic trace attempts and unrelated cases/runs are excluded. Rejected drafts never set status or replace pinned instructions.

`formatQaMarkdown(document)` is pure: no store/filesystem/network reads, generated time, random IDs or output files. It labels every supplied reproduction fact, provenance, association, rejected draft and exact CLI/HTTP read location. All user-controlled text is literal inside fences longer than its backtick runs, preserving original whitespace/CRLF/Unicode with only a framing newline; empty fields are labelled not supplied. No HTML/unsafe links are activated. Missing fixtures are not invented; external content is **unavailable in this export/reference-only**, not asserted missing remotely. Full JSON is authoritative; identical saved state/query renders identical Markdown. Recorded evidence is neither repair authorization nor acceptance of a new agent handoff.

Illustrative fixture commands only, not existing application/Arc results:

```sh
mw qa-export 10 --selection follow-ups --format json
mw qa-export 10 --selection all --format markdown
```

### Explicit fix and retest associations

`qaLink(runId, caseId, input)` accepts `QaLinkInput` with exactly `{requestId,revision,enteredBy,observationId,target}`. `revision` is the current observation counter, not the selected observation's original counter. Any existing observation kind on the exact source run/case/pin is linkable without upgrading its authority; an untouched entry first needs a real explicit observation, never a fabricated note. `enteredBy` is declared provenance, not authentication; observers remain read-only.

Illustrative `link.json` for an independently existing work item (IDs are fixture placeholders):

```json
{"requestId":"fixture_link_work_0001","revision":2,"enteredBy":{"kind":"operator","label":"operator"},"observationId":17,"target":{"kind":"work-item","workItem":42}}
```

```sh
mw qa-link 10 3 --input-file link.json
```

Targets are exactly `{kind:"work-item",workItem}`, `{kind:"reference",reference:{label,ref}}`, or `{kind:"retest",runId}`. Work must already exist in the source run's exact workspace; any existing status is allowed, without granting repair authority. A reference is opaque and never fetched. A retest must already exist, have a greater run ID, match workspace and application exactly, and pin the **same case ID** to an existing reviewed revision. It may have a different environment/version or already have observations; linking never resets it. Same/earlier runs or a different application return 409 `invalid_retest`; workspace/case mismatches use `workspace_mismatch`/`case_not_in_run`; absent source observations or retest runs use 404 `not_found`, absent work uses `item_not_found`.

The immutable `QaLink` is `{event,at,requestId,enteredBy,source:{runId,caseId,caseRevision,observationId},target}`. Persisted target variants are `{kind:"work-item",workItem,snapshot:{id,workspace,title,objective,source,status,updated}}`, `{kind:"reference",reference}`, and `{kind:"retest",run:QaRun,caseId,caseRevision}`. Work snapshot fields are exact existing Item fields, with no narrower QA text bounds. Saved status is **status at association**, not current resolution. `QaLinkView={link,targetAvailability:"present"|"unavailable"|"not-checked"}` reports same-transaction local work availability; retained retests are present, references always not-checked. Unavailable does not imply when/why a target disappeared.

One `qa-linkObservation` event on the **source run's work item** stores normal operation/request/target/input/before/after/receipt/links plus `association:{enteredBy,source,target}`; event seq/time supply link identity. There is no association table, backlink mutation or target event. The event and receipt commit atomically under the existing write lock. Links leave observation counters, case revisions, instructions, observations and manual verdicts unchanged. Distinct targets may accept the same unchanged entry counter; an intervening observation causes durable `stale_revision`. Request replay precedes current-resource/CAS checks, including after target pruning. A new ID for an existing source-observation/target association saves terminal 409 `link_exists` with `existingEvent` and refresh; exact repeats replay that rejection. No unlink/edit API exists.

Retest creation is **two explicit resumable requests**: first `qaStartRun` / `mw qa-run-start` with a new request ID and complete reviewed `QaStartRunInput` (workItem/workspace, actor, application/environment/version and ordered case revisions). All its entries start untested. Confirm that receipt, then separately `qaLink` / `mw qa-link` with another request ID and `{kind:"retest",runId:newRunId}`. Keep both pending IDs/bodies. A link failure leaves the created run intact: retry/review only that step, never recreate the run or clone verdicts/notes. No export, link, or verdict launches work; submitting evidence through discovery is a separate authorized action with its normal NQ exchange.

Existing retention already protects all case/run anchors, including retests. Merely linked follow-up work is **not** newly retained and may be pruned normally; its immutable seven-field snapshot and original QA context survive on the source anchor. Link-first commits the snapshot before prune; prune-first refuses a new absent-work link. Receipt replay survives pruning. Complete target execution internals/attachments and external evidence are not promised.

Downstream `/qa` review clients can read `selection=all&format=json` for all links/conflicts and expose both selection/format controls. Association and retest actions must be explicit, not autosaved; preserve immutable pending input through errors and refresh after receipts. Show `link_exists` as an existing association, not an endless new-ID retry. Render captured fix status separately from independent later manual retest status, never as a green original verdict. This backend delivery does not implement those UI controls.

**Evidence boundary:** backend source and contracts are delivered for independent engine verification. The implementer did not run self-checks. Independent targeted/full-suite/typecheck acceptance, subsequent browser integration and real Arc checks must supply their own evidence; none is established by these examples or this implementation report.

## Develop

Node runs the TypeScript sources directly (`node src/cli.ts`). The install runs `dist/mw.mjs`, the sources bundled with Effect into one committed file; `npm test` rebuilds it, so commit it with your change.

```sh
npm install
npm test
npm run typecheck
```
