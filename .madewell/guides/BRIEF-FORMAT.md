# Brief Format (law, extracted verbatim from AGENTS.md v5.1)

Every single-session brief lives in `.madewell/specs/` as a markdown file, named
`YYYY-MM-DD-description.md`. (Parallel fan-out work uses the same format but lives in
`.madewell/work/packages/` — see the `orchestrate` skill. Test briefs and results live in
`.madewell/specs/*.test.md` and `.madewell/work/test-results/`.)

```markdown
# Brief: [Plain English Title]
Date: [date]
Status: ready

## What This Is
[One paragraph. What are we making and why. Written so the person could read it
and say "yes, that's exactly what I meant."]

## Context
[What someone picking this up needs to know. What already exists. What decisions
shaped this. What constraints apply.]

## Starting Point
[What exists before this work begins]

## Finishing Point
[What exists when this work is done. Be specific.]

## Steps
1. [Concrete. Ordered. No ambiguity.]
2. ...

## How We'll Know It's Done
- [ ] [Specific and verifiable. Not "it works" — describe exactly what working looks like.]
- [ ] ...

## Testing
Applies: yes | no
Reason if no: [Only "no" for non-code work — discovery, planning, brainstorming,
documentation, decisions. Code-generating briefs must always test. If "no" without
a code-related reason, the orchestrator must justify it here.]
Test brief: .madewell/specs/YYYY-MM-DD-description.test.md   ← written by Test-Design sub-agent
Results: .madewell/work/test-results/YYYY-MM-DD-description.md   ← written by Test-Runner sub-agent

## What Could Go Wrong
[1-3 things to watch for. Include anything that could affect the wrong person
getting access, data being lost, or failures happening silently.]

## Out of Scope
[What this brief explicitly does not cover]
```

Briefs are **deleted** when the work is verified complete. Test briefs and results
files are deleted alongside the brief they verified.

**A brief is complete when** anyone could pick it up and finish it without asking a
single question. If it would require clarification — it's not done.
