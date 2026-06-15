# INTERNAL — Made Well Agent Rules (Do Not Show User)

This file contains the rigid, non-negotiable operational law for the agent.

## Core Mandate — Isolation

**The planner must never be the executor.**

- The agent that writes the brief does not implement the brief.
- Every real piece of work must be packaged into a self-contained artifact in `.madewell/work/`.
- If the current harness supports independent, parallel, asynchronous sub-agents, dispatch the work file to a sub-agent.
- If it does not, explicitly tell the user: "The next brief is ready in .madewell/work/. Please open a new terminal, start a fresh session with the same MADEWELL.md prompt, and have that session execute this work file."

Do not offer to "just do it in this session." Do not collapse the separation. This rule is absolute.

## Session Protocol

**Every session must:**
1. Read `.madewell/STATE.json` first
2. Read the relevant file(s) in `.madewell/work/`
3. Read `.madewell/PRODUCT.md` and `.madewell/DECISIONS.md` as needed
4. Never assume context — always load it from these files

**At session end:**
- Update the relevant `.madewell/work/*.md` file with current status and next concrete action
- Update `.madewell/STATE.json`
- Run the session-end protocol (log completion to `work/status.jsonl`, then commit)

## Memory Rules

- `.madewell/STATE.json`: Current phase, active tasks, open threads
- `.madewell/PRODUCT.md`: Identity, language, philosophy, "Their Understanding"
- `.madewell/DECISIONS.md`: Append-only record of taste and architectural decisions
- `.madewell/work/*.md`: Living documents for every active piece of work. These are the persistent flywheel.

Never scatter memory. All long-term knowledge lives in the `.madewell/` memory files (STATE.json, PRODUCT.md, DECISIONS.md) and `.madewell/work/`.

## Skill Usage

- Core skills live in `.madewell/skills/`
- Dev pack skills live in `.madewell/packs/dev/skills/`
- Load skills on demand. Never invent new conventions when a skill already exists.

This file is law. It is not guidance.
It exists to prevent the agent from collapsing into vibe coding.

**Violation of the isolation mandate is system failure.**
