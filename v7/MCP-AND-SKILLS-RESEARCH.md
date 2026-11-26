# Made Well — MCP, Skills, and Portable Delivery Research

**Purpose:** carry the useful technical research into the v7 handoff without carrying forward the rejected product framing.

**Authority:** [PLAN.md](PLAN.md) and the [settled foundation](../FOUNDATION.md#settled-foundation-operationalize-the-established-grammar) govern the product. This note records inspected specifications, source findings, and engineering implications. It is not an interoperability certificate, security acceptance, implementation receipt, or replacement architecture.

**Research date:** 2026-11-26. Core references below are explicitly versioned; extension and host-support pages are mutable. Verify the exact SDK/client versions before implementation.

## 1. The architectural distinction

| Mechanism | Useful contribution | Does not establish |
|---|---|---|
| Ordinary Agent Skill | Portable method instructions and supporting files | A Made Well binding, execution authority, or compatible result semantics |
| Made Well composition/binding | Where a method fits; selected inputs, outputs, nesting, defaults, overrides, and provenance | A need for a new skill format or a new worker runtime |
| MCP tool | A described callable operation | Permission merely because it is listed; business completion because it returned |
| MCP resource | Addressable source, instructions, packet, or result | Native skill activation or automatic context loading |
| Native MCP Skills extension | Discover/retrieve Agent Skills from a server | Filesystem synchronization from a user's repo to a remote service |
| MCP Events | Occurrences exposed to a subscriber | Authority, scheduling, exactly-once effects, or global ordering |
| MCP Tasks | Tracking of an asynchronous protocol operation | A durable Made Well business task or proof cancellation stopped effects |
| User's chosen host/assistant | Applies a method with its own authorized capabilities | A requirement that Made Well hire that assistant or become its workforce |

**Recommendation:** a thin adapter over existing Made Well services, ordinary skill packages, explicit bindings, and retained context. No provider calls or worker launches from the new prepare/record/promotion path. Optional existing execution adapters stay separate.

## 2. Ordinary skills are already portable packages

The [Agent Skills specification](https://agentskills.io/specification) defines a directory containing `SKILL.md`, with YAML frontmatter followed by Markdown. Required frontmatter is `name` and `description`. Optional fields include `license`, `compatibility`, string-valued `metadata`, and experimental `allowed-tools`.

Supporting directories such as `references/`, `assets/`, and `scripts/` are ordinary package content. Relative references resolve from the skill root. Progressive disclosure loads metadata, selected instructions, and supporting material as needed—not every skill body into every prompt.

Consequences for Made Well:

1. Do not create a Made Well-only `SKILL.md` dialect.
2. Put binding/composition information outside the skill. A method can remain usable by another host without knowing Made Well.
3. Treat standard format validation and Made Well contract compatibility as different checks.
4. Wrap natural output in the handoff envelope when appropriate; do not force every existing method to rewrite its instructions to emit raw JSON.
5. Treat scripts and `allowed-tools` as requested capability information, not automatic authority.
6. Preserve licenses and supporting files. Copying only `SKILL.md` can break a method even when its frontmatter remains valid.

A Made Well authoring profile can explain recommended input/result/uncertainty conventions and provide examples. It should not become a second standard with proprietary required frontmatter.

## 3. Repo-local layering and the delivery boundary

The plan recommends optional `.madewell/config.json` with ordinary skills in `.madewell/skills/` or other explicitly granted locations. These names are proposed conventions, not existing implementation facts.

Resolution order is explicit defaults → selected shared configurations → project bindings → per-work overrides. Equal-precedence conflicts are diagnosed; a method replacement changes one addressed binding, not the entire workflow. Additional constraints do not disappear through text concatenation or last-writer-wins merging.

Resolve to an immutable effective selection: occurrence identities, methods and origins, contract identities, supporting-file manifests, inputs, and effort. New files/defaults affect new selections, not already accepted work.

### Local MCP

A process running beside the user's repo can read explicitly granted paths. It still needs safe path resolution, package boundaries, content pinning, and no execution-on-load. Repository presence does not authorize reading arbitrary neighboring directories.

### Remote MCP

A hosted service cannot dereference the user's local path. It needs an explicit host-side file-reading/package-input integration or an explicit import by the user. Serving skills to a client is the opposite direction from uploading private repo-local skills to a server.

Do not:
- claim that an MCP connection mounts the repo;
- assume deprecated Roots behavior supplies synchronization;
- silently use defaults after an explicitly supplied override could not be loaded;
- upload the entire repository for a method that needs only one selected package;
- make an imported private skill globally discoverable;
- require remote hosting merely to support portable methods.

A host-local process is the plan's recommended first packaging option. The exact first client/topology remains a declared input, not an invented fact.

## 4. Core MCP 2026-07-28 findings

Sources: [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), [protocol metadata](https://modelcontextprotocol.io/specification/2026-07-28/basic/index), and [server/discover](https://modelcontextprotocol.io/specification/2026-07-28/server/discover), retrieved during preparation.

- The initialization handshake is removed in this revision. Requests carry explicit metadata; servers must not rely on previous requests over a connection to identify the current work.
- `server/discover` is required on servers; clients may use it but need not always call it before another operation.
- Required per-request fields are `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`.
- `io.modelcontextprotocol/clientInfo` is recommended, **not required**. Self-reported client/server names are not authenticated identities.
- Results carry `resultType`. Ordinary completion is `complete`; `input_required` supports multi-round-trip requests. Clients treat older results lacking the field as complete for backward compatibility.
- The revision removes transport SSE resumability/message redelivery. A broken response stream can require reissuing a request with a **new protocol request ID**.
- That transport retry must not become a new logical mutation. Preserve Made Well's application request identity and exact validated body.
- Roots, Sampling, and Logging are deprecated for new implementations; do not call them universally nonexistent or use them to justify rebuilding a provider runtime.
- MCP's schema requirements and the repository's limited internal schema checker are distinct. Do not advertise general schema support simply because a local subset validator accepts a document.

Application state therefore needs explicit work/selection/handoff handles. Connection identity and “the last selected project” are not durable authority.

The earlier research inspected the [tools contract](https://modelcontextprotocol.io/specification/2026-07-28/server/tools): authorized tool listings may differ by authorization, not connection-local history. Work-specific eligibility belongs in work/context data, not a catalog that mutates because a prior call chose a task.

## 5. Native Skills: retrieval is not activation

Sources: [Skills overview](https://modelcontextprotocol.io/extensions/skills/overview), [Beta specification](https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/beta/skills.mdx), and [SEP-2640](https://modelcontextprotocol.io/seps/2640-skills-extension).

The official extension is `io.modelcontextprotocol/skills`. The design proposal's Final status does not establish mature support in every SDK or host.

### Server responsibilities

- Declare Resources and the Skills extension.
- Implement `skills/list`, `skills/get`, and `resources/read`.
- Directory reading is optional and separately advertised.
- Publish unchanged frontmatter and a complete static manifest containing `SKILL.md` and all supporting files, with byte sizes and SHA-256 digests.
- Support direct URI lookup, including served skills not present in a listing.
- Preserve proper origin and cache scope; privately supplied packages must not become public cache entries.
- A dynamically generated entry may declare dynamic resources, but does not supply stable content-integrity guarantees.

### Host responsibilities

- Treat originating server identity plus skill URI as identity; names alone are not unique.
- Route loading through the host's actual skill-loading path and required approval.
- Read selected instructions and supporting material on demand.
- Verify size, digest, and frontmatter against the retained entry.
- Restrict supporting reads to the approved manifest/origin.
- Refresh changed manifests and obtain required approval again; hashes prove consistency, not benign content.
- Preserve MCP origin in caches rather than making downloaded content silently look like an unrelated local skill.
- Do not activate a nested skill or grant execution permissions merely because its files were mentioned.

**A plain `resources/read` is not native activation.** A fallback can make methods available to a host through ordinary tools/resources, but it must describe exactly that behavior, not claim unsupported native skill loading.

## 6. Events: useful observations, not another engine

Sources: [Events overview](https://modelcontextprotocol.io/extensions/events/overview), [Beta specification](https://github.com/modelcontextprotocol/ext-events/blob/main/specification/beta/events/events.mdx), and [SEP-3415](https://modelcontextprotocol.io/seps/3415-events-extension).

The official extension is `io.modelcontextprotocol/events`; its specification is Beta. Events can be listed and delivered through poll, push, or webhook modes. No one mode is universally mandatory.

- Occurrences carry `eventId`, `name`, `timestamp`, `data`, and `cursor`.
- Replay is optional. A null cursor or `truncated: true` is not a complete-history guarantee.
- Poll/push order is scoped to a subscription. Webhook retries can reorder arrivals. There is no global ordering or transactional consistency guarantee across subscriptions.
- Webhook cursors are safe-to-persist watermarks, not necessarily the individual event's position.
- A watermark can advance over delivery acknowledged **or abandoned** by the server. It does not prove the application successfully processed every earlier event.
- Delivery deduplication and idempotent business actions are different mechanisms. Neither alone proves exactly-once external effects.
- Refreshing a current snapshot can restore current state; it cannot automatically reconstruct all missed occurrences.

For Made Well, expose scoped events from the same committed state only if a real supported interaction needs them. A notification may prompt a read; it does not authorize promotion, decide the next method, or start an external job.

**First increment:** ordinary reads and explicit handoffs are sufficient. Webhooks are outside the recommended initial scope. If later introduced, they require authenticated subscription policy, callback validation, delivery authentication, replay/deduplication handling, lifecycle management, and explicit private-data scope.

## 7. MCP Tasks and continuations

Source: [Tasks overview](https://modelcontextprotocol.io/extensions/tasks/overview), retrieved during preparation; [MRTR](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr) from the preceding research.

Tasks are an optional asynchronous-operation extension. A result can return `resultType: "task"`; clients inspect via `tasks/get`, supply requested input via `tasks/update`, and request cancellation via `tasks/cancel`. Cancellation is cooperative; acknowledgment does not establish that effects stopped.

MRTR uses `input_required` and a continuation exchange for additional input. Any application continuation must bind work, actor/scope, exact action, and current state; a signed payload alone does not enforce single use.

Made Well's short inspect/prepare/record/promotion operations do not need a new asynchronous-job subsystem. Preserve the distinction between a protocol operation handle and a user's selected task. Do not add Tasks/MRTR simply because they are available.

## 8. Existing code worth preserving

See [PLAN.md §3](PLAN.md#3-reuse--what-already-exists) for the full source inventory. Key reusable mechanisms at `79e648d442af840bfbb872c538c6eecbc626b74c`:

- Store transactions, revision comparisons, canonical request fingerprints, receipts, and read-only opens.
- Pinned settings/packs and saved invocation/return evidence.
- Exact source, received outputs, answer identities, explicit ancestry, private tracks, and Ground/Rumen/preparation records.
- External work distinct from configured cartridge execution.
- Existing selector, skill-like JSON method composition, and structured conflict diagnostics.
- Read projections and scoped evidence links.

Important limits:

- Fixed jump slots and job-name-selected discovery checks are real coupling points.
- Existing promotion can include prerequisites and queue executable delivery; CLI/API callers can wake a runner. A new selection-only path must not inherit that behavior accidentally.
- The built-in verification leaf does not declare a command check. Evidence binding validates identity/coverage, not that a claimed measurement ran.
- Context/status previews can truncate; they are not the sole source for exact handoff content.
- Browser Host/Origin/CSRF protection is not remote identity/tenant authorization.
- Repository skill/example directories are not automatically included in a packed installation.
- No first-party Made Well MCP adapter was found. A transitive optional SDK peer declaration is not an implementation.

These are source observations, not tested runtime guarantees.

## 9. Security and truthful completion

Required boundaries for the planned implementation:

1. Read only explicitly granted roots and authorized work/package resources.
2. Deny path/symlink escape and arbitrary URL fetching. Preserve exact permitted package content.
3. Authenticate/authorize a remote caller before private resource lookup; do not trust body-provided actor labels.
4. Keep normal reads read-only. Loading/resolving a method does not execute its scripts.
5. Keep model-selected instructions below the service's scope/authority enforcement.
6. Bind mutations to explicit request/work/revision identities and persist receipts atomically.
7. Preserve refused drafts and uncertain effects. A retry is not permission to repeat external side effects.
8. Keep static and dynamic skill content, known and unknown history, and measured and asserted evidence distinguishable.
9. Preserve private maker/receiver boundaries when building packets, previews, events, and resources.
10. Verify the exact running adapter and claimed host behavior. Schema-valid output, successful process exit, or a model's self-report is not acceptance.

No blanket security claim follows from this checklist. Applicable checks need evidence against the actual shipped surface.

## 10. Compatibility, sequencing, and estimates

Actual native interoperability was not tested in the earlier research or while packaging this handoff. Provider documentation, community matrices, SDK support, and actual host behavior are separate evidence classes.

Before claiming a supported integration, record:
- exact client/host and version;
- exact SDK/version and protocol revision;
- transport;
- capabilities advertised and exercised;
- package/resource/approval behavior;
- reconnect and mutation-retry results;
- unsupported extensions and retained unknowns.

Useful discovery sources:
- [MCP client matrix](https://modelcontextprotocol.io/extensions/client-matrix)
- [Skills implementations](https://github.com/modelcontextprotocol/ext-skills/blob/main/docs/implementations.md)
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp#use-skills-from-mcp-servers)
- [OpenAI MCP Events documentation](https://developers.openai.com/plugins/build/mcp-events)

Do not carry vendor-specific support claims forward without checking the intended version/account. Do not assume an Events draft supported by one vendor matches the official extension.

Recommended sequencing is the dependency order in the plan: reuse contracts → skill binding/composition → non-executing handoffs → adapter/actual-client checks → optional extensions. These checks establish implementation fidelity, not whether the grammar works.

**No current effort estimate is established.** Previous estimates assumed the rejected engine/Rivet-heavy scope and are withdrawn. Do not reuse them as commitments. Estimate the corrected implementation only after the target client and concrete reuse boundaries are inspected.

## 11. Research boundaries and source map

This note is a portable synthesis, not a raw archive. It intentionally excludes private research infrastructure, agent lifecycle logs, the superseded Rivet-dependent architecture, and its obsolete estimates. The implementation plan contains the current code/history inventory and action sequence.

Primary references:
- [Agent Skills specification](https://agentskills.io/specification)
- [MCP introduction, 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro)
- [Core changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [Core metadata](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MRTR](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Authorization security](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [Skills overview](https://modelcontextprotocol.io/extensions/skills/overview)
- [Skills Beta specification](https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/beta/skills.mdx)
- [Events overview](https://modelcontextprotocol.io/extensions/events/overview)
- [Events Beta specification](https://github.com/modelcontextprotocol/ext-events/blob/main/specification/beta/events/events.mdx)
- [Tasks](https://modelcontextprotocol.io/extensions/tasks/overview)

Original requested background, not normative protocol:
- [David Cramer: MCP, skills and agents](https://cra.mr/mcp-skills-and-agents/)
- [Cloudflare: MCP v2](https://blog.cloudflare.com/mcp-v2/)

No Made Well implementation, installation, live store access, credential inspection, benchmark, or host-conformance run was performed to produce this package. Future changes must retain that distinction between sourced design, implementation, independent checks, and live use.
