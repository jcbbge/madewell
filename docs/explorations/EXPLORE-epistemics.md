# Explore: Grounding for Speech — Epistemics as a Contact Point

**Status:** exploration note, v2. Written 2026-07-17, rewritten same night
after being run through `../contact-points.md` — v1 proposed validators; the
law demands weave. Lives in madewell-meta/runtime: this is a kernel-level
concern for the Lisp runtime, not a cartridge concern.

**Origin:** an agent fabricated model specs (context window, modalities,
pricing) while answering a question and editing models.json — plausible
values, no source, disclosed as "caveats to verify." The failure was located
on the MANAGER side of the wall: the conversation, where thought is prepared
in latent space. Every hedge built that night (SOURCES commit line,
verify-then-write skill, git hook, prose rules, per-turn injection) polices
the WORKER side — artifacts, commits — which is too far downstream. The
utterance already happened; the commit is archaeology.

## The diagnosis, in Made Well's own law

Run the v1 hedge stack through contact-points.md's failing-mode vocabulary:

| v1 hedge | Failing verb | Verdict |
|---|---|---|
| verify-then-write skill | "consult" | a tool offered; already skipped |
| SOURCES: commit line | "validate" | post-hoc filter after the work exists |
| verify-sources git hook | "review" | fires after the utterance, wrong side of wall |
| EPISTEMICS prose blocks | — | "a rule not enforced by topology is documentation, not law" |
| per-turn prompt injection | "encourage" | hoping to be reached for, every turn |

**Fabrication and ungrounded planning are the same pre-question failure.**
The agent that writes a Vue component into a SolidJS repo forms no doubt;
the agent that fabricates a context window forms no doubt. Unsurety is a
signal the failing agent lacks — there is no internal flag distinguishing
memory from confabulation. Pull-based checks fire after a question is
formed; these failures are pre-question. Empirical anchor: pull-based
grounding measured **0% adoption over 45 runs** (contact-points.md).

Also carried from v1 (still true, restated in law language):

- **Topology beats conscience.** The in-session fix was ordering: the fetch
  entered context before the write, and the true value became the
  highest-probability continuation. Contact happened — accidentally.
  The design problem is making that contact structural.
- **Artifacts detach from caveats.** Guess-and-disclose launders: the caveat
  dies with the session, the value persists looking verified.
- **Claims vs proposals.** A claim refers to the world outside the session
  (spec, price, version, API shape) and needs acquired material; a proposal
  (new code) is verified by execution. The fabrication failure is a category
  error between them.
- **Performed compliance is the successor failure.** Under a cite-everything
  regime the cheap path is fabricated citations; only mechanical
  string-match against actual acquired output catches it.

## The mechanism: Grounding for Speech (candidate contact point)

> An answer containing claims **is assembled from** acquired material.
> The turn **cannot advance without** the acquisition phase.
> The fetch output **is what the answer is made of**.

Same design move as plan-grounding: the pipe does not check the utterance;
the pipe supplies what the utterance is made of. Additive weave — material
handed forward, not gate applied backward.

| Contact point | Between | Where it fires | Why structural |
|---|---|---|---|
| **Grounding (speech)** | Utterance ↔ world | Question → Answer, when the answer carries claims | The answer is woven from acquired excerpts; there is no answer without them |

The manager/worker wall, made literal *inside the turn*: the conversational
side is structurally unable to assert claims from nothing — when a claim is
needed, the pipe runs acquisition (researcher phase: fact sheet with raw
excerpts + sources) and generation composes from the sheet. The session that
fabricates is the one playing researcher and writer in the same breath.

## Runtime-native design (the Lisp kernel)

Reference implementation in `./lisp-agent/` (jamiebeach) — a complete agent
loop in ~100 lines of Common Lisp: recursion as the loop, the REPL as the
tool, message history as the folded state. The relevant insight for Made
Well: when the loop is this small and owned, **the contact point is a
cons cell away** — grounding is not a plugin, it is the shape of the
recursion.

Kernel-level mechanisms (grounding is kernel-level; striation is
cartridge-level — session note 2026-07-01):

- **Claims are typed values.** `(claim 1048576 :source "openrouter.ai/api/v1/models" :fetched-at ts)`
  vs `(proposal ...)`. An utterance emitting an untagged claim is a **type
  error**, not a rule violation. The runtime is the sensor the model lacks.
- **Acquisition as a scheduler constraint.** The task graph refuses to
  schedule an assertion whose claim-bindings have no completed acquisition
  node. Acquire-before-assert as dataflow, not discipline.
- **The answer-weave pass.** Generation for claim-bearing turns receives the
  fact sheet as its material; a post-pass string-matches emitted claim
  values against the transcript's actual acquisition outputs (catches
  fabricated citations). This pass has the real transcript — strictly
  stronger than the sidecar-based git hook.
- **Provenance persists.** Values keep their source tags across sessions;
  verified and vibed never become byte-identical.
- **Registers in the voice.** Every claim-bearing sentence carries its
  epistemic status: sourced (checkable this session) / inferred (reasoning
  shown) / unknown (complete answer). Register fraud — a guess in the
  sourced voice — is the trust-breaking event; the runtime makes the
  register explicit rather than performed.

## Interim (until the runtime exists)

Today's harnesses only offer prose-shaped slots, so the v1 stack stays as
caulk — with one honest upgrade available now: a **turn gate** extension
(pi) that pattern-matches claim-shaped values in assistant output and
bounces messages from turns with zero acquisition calls. Approximate
(false positives/negatives inherent in pattern-matching speech), but it is
on the pipe, not offered to the agent. It is a prototype of the answer-weave
pass, not a substitute for it.

## Measure it

Eval with fetchable-but-not-memorized ground truth ("add model X to config"
where X's specs live at a URL — first seed: the exact kimi-k3 task).
Arms: no-rule / prose-rule / per-turn-injection / turn-gate /
researcher-writer-split / (eventually) runtime-native. Count fabrications
per arm. Deploy what measurably works; the deployed fix must be one that
was watched working, not one argued for persuasively.

## Open questions

- Claim/proposal boundary, formally: version pin = claim; function name =
  proposal; a default port = ? The type system needs the boundary the prose
  waves at.
- Claim-shaped detection in free text: how good can the turn gate get
  before the runtime owns generation?
- Cost of in-turn researcher/writer split vs fabrication reduction — when
  is the latency worth it?
- Does per-turn injection measurably beat turn-one injection at 100k+
  tokens? (Cheap arm in the eval.)
- Can provenance tags survive human edits without becoming ignorable noise?
- lisp-agent uses OpenRouter directly — does the Made Well runtime speak to
  providers raw (owning the whole pipe) or through an abstraction? Raw is
  the only path where the scheduler constraint is airtight.
