# Decisions

One line per decision. Append only. Never delete.

Format: `YYYY-MM-DD | decision | reason`

---

2026-05-21 | use Made Well for this project | structured workflow, no cold starts, state persists across sessions
2026-05-21 | start with the smallest useful version | prove it works for one person before adding scope
2026-05-30 | validation is the fourth atomic phase of all work, executed by independent sub-agents | every initiative runs Ideate → Plan → Implement → Validate. The builder never validates their own work — structural separation between builder and verifier is the only defense against self-marking success. Validation criteria are pluggable "jump packs": coding has one, sales/marketing/ops would each have their own. The four-role shape (Builder, Designer, Runner, Triage) is universal; the verification content swaps per domain.
2026-05-30 | coding jump pack — independent test-design, test-run, and failure-triage sub-agents | an agent that writes its own tests will fudge them to pass. Test-Designer runs in parallel with Implementer from the same brief. Test-Runner is read-only on code/tests. Failure-Triage is a fresh agent that classifies failures as (a) pre-existing bug, (b) wrong implementation, or (c) wrong test. Applies to code-generating work only; non-code briefs declare Testing: Applies: no with reason.
2026-06-14 | the rubric is "Does this lead to craft, beauty, and care?" — one root question, system-wide, including the agent's prime directive | unifies three drifting rubric statements into one constitution; craft/beauty/care is the standard, and the sum of those is something the person is proud of
2026-06-14 | Made Well is a two-audience system with two root entry doors | the human door (MADEWELL.md) orients the person — who/what/why, expectations, "it works if you go slow"; the agent door (the root instruction file) boots the agent. Keep them separate; never collapse the human entry into the agent system. System contents live in their own directory.
2026-06-14 | a first-run Orientation phase precedes Discovery | before asking someone what they want to build, the mentor sets the frame — what's about to happen, their role and the agent's, why deliberate beats fast. Runs ONCE on the first session then goes quiet (initialize-then-embody). Gives the person informed control.
2026-06-14 | the agent instruction file lives at the repo ROOT in the runtime's convention | runtimes auto-load a root file (CLAUDE.md for Claude Code; AGENTS.md as the cross-tool standard). On first contact the agent ensures the correct root file exists so Made Well loads next session, regardless of provider. Provider-agnostic by design.
2026-06-14 | reliability for the non-technical user outranks leanness in Made Well's own construction | the audience must never carry cognitive overhead to run the system — it runs smoothly, consistently, reliably on their behalf, invisibly. When elegance/leanness and reliable-for-the-user conflict, choose reliable. This is the project throughline (see AGENTS.md "The Throughline"); it is why every-session essentials stay in the auto-loaded AGENTS.md rather than thinned to on-demand skill pointers.
