# Verify Principles — the Runtime Judge
**Slot:** fills the kernel Verify engine's **Principle Slot** for the software lane.
**Pattern:** the Outcome Judge — outcome-stated principles, judged by a fresh agent over
collected evidence, in a find → fix → re-verify loop. (Lab source:
`~/.madewell-meta/inner-loop/verify/outcome-judge-pattern.md`.)

The Enforcer (`skills/enforcer.md`) judges **source text**, file by file, with machine
gates. This judges the **running product**, flow by flow, with evidence. A codebase can
pass every static gate and still ship a button that does nothing. This is the half that
catches it.

---

## The three laws

1. **Builder ≠ verifier.** The judge is a fresh agent that never saw the implementation.
   It gets the flow specs, the principles, and a browser — nothing else.
2. **Evidence or it didn't happen.** Every verdict cites a capture — console dump,
   network trace, screenshot, evaluate result. A verdict without evidence is an opinion,
   and opinions don't gate ships. (Runtime analog of the pre-verified-facts rule.)
3. **The judge never replaces a gate.** Tests, lint, types, land-check, no-mocks, and the
   four-lane acceptance stay deterministic and machine-verified. The judge covers what
   rules can't encode. Both must pass. Judged fixes land behind the draft→Commit gate —
   never auto-merged.

---

## Evidence primitives (dev lane)

Collected via the **dev-browser** skill — read its doctrine first; it carries the
one-browser rule (attach to the person's own Chrome/dev server; never launch parallel
windows or servers) and the verified capture patterns.

| Primitive | Collects | The DevTools analog |
|---|---|---|
| Console capture | log/warn/error, uncaught exceptions, CORS/CSP | Console tab |
| Network capture | method, endpoint, status, payload, per action | Network tab |
| `page.evaluate` | client state: stores, localStorage, globals | Console prompt |
| Screenshot | what the person actually sees, per state | Eyes |
| `snapshotForAI` | roles/names/structure — the accessibility tree | Elements tab |

Observation model: console/network are event streams — **attach → act → settle → dump**,
one action per script. Nothing is "checked afterward"; the evidence is arranged for
before the action fires.

---

## The principles

Each is an outcome, judged over named evidence. Derived from the pack's Craft Standard
and pillar definitions-of-done — these are the runtime-checkable ones. (Source-level
principles — tokens not hardcoded, single error-handling pattern — belong to the
Enforcer.)

1. **The flow completes as specified.** Every step of the flow spec produces its
   expected UI outcome. *Evidence: locator assertion or snapshot per step.*
2. **The console stays clean.** No errors, no uncaught rejections, no CORS/CSP
   violations anywhere in the flow. A warning is a finding until explained.
   *Evidence: console capture spanning every action.*
3. **The network tells the truth.** Each action fires exactly its expected requests —
   right method, right endpoint, right status, exactly once. No double-fires, no silent
   retries. *Evidence: network capture per action.*
4. **Every state is designed.** Empty, loading, error — each is deliberate, not
   accidental. Force each state; look at it. *Evidence: screenshot per state (force via
   evaluate/route abort).*
5. **Failure surfaces honestly.** When the server fails, the person is told in human
   words — no silent swallow, no stack trace, no infinite spinner. *Evidence: forced
   4xx/5xx + screenshot of what the person sees.*
6. **Actions acknowledge.** Something confirms each meaningful action landed — state
   change, motion, message. Dead interactions are findings. *Evidence: before/after
   screenshots.*
7. **Access is enforced at the server.** Replaying the request without auth is refused,
   regardless of what the UI hides. *Evidence: evaluate-driven fetch minus credentials →
   401/403 in the network capture.*
8. **The keyboard path exists.** The flow is completable without a pointer; interactive
   elements carry real roles and names. *Evidence: snapshotForAI roles + keyboard-driven
   run of the flow.*

---

## Flow specs — the executable half of the brief

A flow spec is an outcome sentence made drivable. Flows are authored **at brief time** —
§3 (desired behavior) states them, §8's ui/ux lanes accept them. The verify pass compiles
them into attach → act → dump scripts. They live with the work: in the brief itself, or
`docs/flows/<feature>.md` when they outlive it.

```markdown
### Flow: <name — verb phrase, e.g. "add line item to quote">
**Page:** <named dev-browser page, e.g. quote-flow>
**Preconditions:** <route, auth state, data present>

| # | Action | UI expects | Console | Network expects |
|---|--------|-----------|---------|-----------------|
| 1 | Click "Add item" | row appears in list, count +1 | clean | POST /api/quotes/:id/items → 201, once |
| 2 | <next action> | <observable> | clean | <method endpoint → status> |

**Edge steps (required):** the same flow at the boundaries — empty list, server 500
(forced), unauthenticated replay.
```

Every row is judged on all three lanes. Two lanes green and one red is not "mostly
passing" — it is a finding with a head start on its diagnosis (no request = wiring;
bad status = backend/contract; 2xx + no UI change = frontend state).

---

## Protocol

1. **Collect the flow specs** for the touched surface — from the brief's §3/§8, or
   `docs/flows/`. No spec? Write it first, from the brief's desired behavior. The spec
   is the principle; don't verify against vibes.
2. **Attach to the one browser** (dev-browser doctrine — the person's dev server, their
   Chrome when present).
3. **Run each flow** as attach → act → settle → dump scripts on one named page. Capture
   all three lanes per step. Force the edge steps — do not skip them because the happy
   path passed.
4. **Judge**: each principle, verdict + cited evidence. Every red lane is a finding:
   *principle violated, evidence, suspected lane (frontend / backend / contract).*
5. **Fix and re-verify.** Findings go back through the loop until zero remain or the
   remainder is explicitly accepted by the Lead. Fixes are commits behind the normal
   gate; the judge re-runs the affected flows after each.
6. **File the report** — flows run, verdicts per principle, evidence paths, findings and
   their fates. An escape discovered later gets a `## Correction` on this report.

---

## Definition of done

- Every flow spec green on **all three lanes**, including edge steps.
- Every principle judged, every verdict citing evidence.
- Zero unexplained console errors across the session.
- Deterministic gates (tests, lint, land-check) still pass — the judge ran *in addition*.
- The verification report exists and names its evidence.

> The pack's rubric asks: *does this work correctly — including when things go wrong?*
> This is where that question stops being rhetorical.
