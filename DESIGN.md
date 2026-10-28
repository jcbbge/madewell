# Work display

Made Well is a notebook for work, used by nontechnical people. The first screen answers: what is this task, is it finished, and does anything need attention? Technical depth is available without becoming the default reading experience.

## Typography sets the proportions

The live tokens and shared notebook styles are exported as `NOTEBOOK_STYLE` from `src/monitor.ts`. Both the Work page and `src/qa-notebook.ts` use that same source, rather than independently chosen dimensions.

| Role | Font | Size / line height |
|---|---|---|
| Prose and controls | IBM Plex Sans | 16 / 24px |
| Supporting prose | IBM Plex Sans | 14 / 24px |
| Section title | IBM Plex Sans, medium | 20 / 24px |
| Task title | IBM Plex Sans, medium | 32 / 36px; narrow 24 / 30px |
| System messages, status, time | IBM Plex Mono | 14 / 24px |
| Technical data | IBM Plex Mono | 13 / 18px |

All sizes are rem-based. The primary line height is 1.5rem; its quarter is the spacing unit, 0.375rem (6px at the default text size). Space uses 1, 2, 3, 4, 6, 8 and 12 units: 6, 12, 18, 24, 36, 48 and 72px. Headings have more space above than below. Body copy stays within 68ch. Technical text wraps and scrolls within its own block, never the whole viewport.

The font assets are local, with no third-party font request: Fontsource 5.3.0 `@fontsource-variable/ibm-plex-sans` (Latin normal wght) and `@fontsource/ibm-plex-mono` (Latin normal 400). Their SIL Open Font Licenses live beside the WOFF2 files in `ui/fonts`. The fallback stack uses platform sans/mono. Preserve licenses when updating fonts.

## Quiet surfaces, meaningful states

White paper, pale gray-green task list, dark green-gray ink. Forest green means completed/selected; amber means attention; red is reserved for errors. Text states always accompany color. No decorative icons, metric hero cards, gradients or status animations. Mono is explicitly requested for system messaging, not for ordinary reading.

The task list is persistent on wide screens and sits above the task on narrow screens. Completed, held, not-running, empty and disconnected states must remain distinct. Last refresh is not the last worker activity. A quiet step is not automatically stuck. No configured steps means no work was performed, even if the run has ended.

## Operator input stays with the task

**New work** opens a form in the existing detail pane, never a modal or third column. Select a registered workspace, enter a clearly labelled short objective and describe the work. The description is the exact original source; neither field is trimmed, summarized or rewritten before submission. Existing project configuration determines the steps.

The task's **Conversation** sits directly beneath its steps. It displays recorded source, questions and answers with their actual roles, not invented chatbot prose. Recent messages are the default; long text has an exact full-text disclosure and the complete conversation can be paged on demand. A completed function task exposes its recorded `proof.completion.output.result` as prose only when it is a string. Arbitrary objects remain technical evidence, never a fabricated sentence.

Show a new-reply form only when the versioned context allows an answer, including a required cause selector when advertised. Otherwise explain the saved answer policy and keep any draft accessible without offering an unauthorized new answer. A pending request may still be retried to recover its receipt; this does not create a new instruction. No general chatbot, automatic answer, retry scheduler or shell control is introduced.

Keep the live composer mounted while polling so focus, selection and input composition are not interrupted. Save exact draft fields, the original revision and immutable pending request body/ID in origin-local browser storage before sending. Drafts survive task switching and reload on that browser; they are not a second work record or cross-device storage. Explain storage failure and do not send a new request without a persisted retry identity. Shared-browser users should treat saved drafts as local sensitive data.

Distinguish sending, confirmed acceptance, definite refusal and uncertain outcome. Disable duplicate sends and lock pending text. An uncertain retry sends the same body and request ID, even after reload or session renewal; refresh CSRF credentials without rewriting the request. Only confirmed acceptance clears the draft. Preserve server problems and warnings, with raw error context behind a disclosure. A stale answer requires loading the latest conversation, explicit operator review, then a new request; never silently rebase the answer onto a newer revision.

This is the operator's authorized write surface over the existing API. The observing agent still does not move work. The same local single-operator security assumptions and exact trusted-origin configuration documented in the foundation apply.

Implementation decision: preserve the existing two-column notebook and native controls, use a separate short objective rather than infer one from source, and keep retry state only in the browser. **DX hit, cell 2:** one API contract and no framework; cost is explicit draft/retry handling. **UX hit, cell 2:** familiar inline work and recoverable exact text; cost is a deliberate review step for changed tasks. **AX hit, cell 1:** source and answer evidence remain exact and API-owned; cost is loading full text when previews are insufficient. All three hit. Browser interaction and visual acceptance are independently checked after implementation; script parsing alone does not establish them.

## Details are an opt-in reading depth

Keep metrics, exact commands, configuration and JSON behind **Activity & technical details**. Each call has its own disclosure for arguments, output, logs and agent evidence. Never drop those fields to simplify the surface. Keep the same durable trace API; this page is not a scheduler or another record of work.

Use native buttons and disclosures, visible keyboard focus and a skip link. Polling must preserve open details, focused controls and technical scroll positions. Feedback uses short background transitions; reduced-motion users get no transitions. Avoid decorative entrances and loading animation.

Verify loaded fonts, computed spacing, text contrast, keyboard navigation and real task states in the browser, including narrow layouts and connection failure. Impeccable's typeset, distill and craft-floor guidance informs this system; the operator's intent and the recorded execution evidence govern it.

## Manual QA is another page of the notebook

Work and **Manual QA** link reciprocally in the same host; QA lives at `/qa`. The fixed direction uses the existing Plex type roles, 68ch reading measure, quarter-line spacing, paper/list colors and responsive two-column layout. No visual exploration, framework, independent theme or dashboard is added. Impeccable's typeset, distill and harden guidance informs this implementation; independent acceptance, not the maker, checks the rendered result.

Start with a compact saved-run bar: chooser and actions share a row on desktop and stack at narrow widths. Options show run ID, application and date; the complete application, environment and known-with-source or explicitly unknown version remain readable beneath, without repeating the environment in the chooser. Counts show all four manual states without equating tested with passed. Search stays visible; Project, Area, **Source / change group** and Manual result filters sit inside a native, initially collapsed **Filter cases** disclosure with an active-filter count. They apply to the selected run's pinned instructions. Source grouping uses reference labels, not invented release metadata. The case list remains keyboard-scrollable on narrow layouts. A missing record, an empty catalog, no matching cases and a refresh failure are not completion.

The selected case reads in this order: manual state and pinned/outdated revision, what changed, prerequisites, test data, ordered actions and optional source references, then **expected behavior → short editable actual behavior → explicit manual verdict → notes**. Additional reproduction and evidence editors stay mounted inside a native, initially collapsed disclosure; opening it is reading depth, not an edit or a save. The four native radio choices are **Untested**, **Passed**, **Failed** and **Needs refinement**. Recording a verdict is an explicit form submission with a manual attestation; non-reset verdicts require actual behavior. The chosen radio is a draft, not an accepted result. Technical/historical reports, entered-by provenance and claimed verifiers remain clearly labelled evidence behind disclosures, never manual success. User text is literal DOM text; only absolute HTTP(S) references become links, with no attachment upload or external availability claim.

Acceptance correction: the supplied 1280×900 screenshot showed no case buttons because run chrome and secondary filters consumed the first viewport. Apply the fixed reading-order correction rather than change the Plex design or evidence contracts. **DX hit, cell 4:** native disclosures and existing spacing tokens keep the change local, costing a small layout adjustment. **UX hit, cell 2:** prioritize cases and the expected/actual/verdict sequence, costing an extra disclosure for secondary controls. **AX hit, cell 4:** stable field identities and explicit read-versus-save labels reduce ambiguity, costing opening disclosures to inspect optional editors. All three hit; this is implementation, not proof that the fold or recovery acceptance now passes. The parent owns independent browser acceptance and tests; the maker ran no product self-checks and did not restart services.

Narrow focus correction: at widths up to 48rem, the QA app header uses `position:static` so it scrolls away rather than covering the selected case heading; desktop keeps the shared sticky header, with fonts, spacing and QA state unchanged. The supplied 390×844 evidence showed 13px of heading overlap. **DX hit, cell 4:** one local override avoids shared-style changes, costing a documented responsive exception. **UX hit, cell 4:** unobscured focus and reading outweigh losing sticky navigation on narrow screens. **AX hit, cell 4:** a fixed breakpoint and unchanged state keep the correction explicit, costing a separate narrow browser recheck. All three hit; implementation is not acceptance, and the parent owns browser and engine verification.

Explicit case selection focuses the article with `preventScroll:true`, then calls `scrollIntoView({block:'start'})` so reading starts at its heading rather than the middle of a long article. The supplied follow-up measured heading y=-597 at 390×844 with ordinary focus. Polling (`focus=false`), editing focus, existing scroll margin and the narrow static header remain unchanged; browser and engine acceptance remain with the parent.

### Saving is not a reason to stop typing

Notes/actual behavior/reproduction/evidence are one complete note snapshot, autosaved independently of the verdict. Per-entry serialization covers notes, verdicts and links. The immutable URL/body/request ID is persisted before sending; newer typing lives in separate draft fields. A receipt acknowledges only its sent snapshot and revision. It cannot replace newer text or a newer selected verdict/link. An exact-empty note at positive revision is valid, and the latest note's empty string must remain empty rather than falling back to older text. API validation and transactional CAS remain authoritative.

Show Saving, Saved, Save failed or Acceptance uncertain with a next action. Header record-read timestamps and **Refresh record (not drafts)** describe polling only; they never stand in for the editor's draft-save feedback. An uncertain request is retained and retried byte-for-byte with the same ID; each attempt obtains current same-origin CSRF credentials without changing payload identity. Storage failure blocks new sends and offers a draft download. A changed entry or stale refusal retains the local draft, loads saved content for comparison and requires explicit confirmation before a new request/revision. Rejected input and problem details remain inspectable; duplicate associations show the existing link rather than repeatedly creating IDs.

Each page instance owns a separate browser-storage namespace, including after reload or duplicated-tab navigation. **Locally saved drafts** offers explicit copy recovery and download without deleting or overwriting another page's record. Recovery never claims to be SQLite, cross-device synchronization or human authentication. Unsaved recoveries require review; uncertain requests must recover their receipt before newer changes can be sent. There is no local-draft expiry or cleanup of other tabs' copies. Shared-browser users must treat these records as sensitive. The live editor stays mounted during polls; observation and association disclosures are appended rather than rebuilt.

### Explicit start, link, retest and export

**Start review** is an inline form over existing authored cases. It asks for the existing owner work item, exact workspace, application, environment and version declaration, and displays selected revision pins with instruction previews. Case authoring/revision stays with the existing agent CLI/API, not a human JSON editor. A saved run is resumed by reading, not by copying verdicts or mutating its environment.

**Fix references & retests** links a real existing observation to existing same-workspace work, an opaque reference or a compatible later run. Captured work status is explicitly status at association, not proof of resolution. Unavailable work retains its saved context; incoming/outgoing retests link to their own independent manual results. A new retest uses two deliberate requests: create an untested run with reviewed pins and explicit environment/version; after its confirmed receipt, review and submit the separate original-observation link. A failed link never deletes or recreates the run. No control launches agents, changes work authority or resets another run.

**Export this review** downloads whole-run or current manual follow-up selections as Markdown or authoritative JSON using the existing export endpoint. Full history stays in the export; external evidence is reference-only. History, rejected drafts, technical IDs and immutable association context remain available through disclosures instead of dominating the default page.

Implementation trade-off within the accepted direction: **DX hit, cell 2** — one real style source and the existing QA API, at the cost of explicit native-DOM recovery code. **UX hit, cell 2** — the familiar notebook, uninterrupted typing and deliberate stale review protect operator intent, at the cost of recovery/retest confirmation steps. **AX hit, cell 1** — pinned versions, exact retry identities and complete exports preserve inspectable evidence, at the cost of loading the complete selected-run export and retaining browser recovery copies. All three hit; no measured performance gain is claimed. The maker ran no product self-checks. Independent tests, typecheck, browser interaction, layout and actual human/Arc acceptance remain the parent's responsibility.
