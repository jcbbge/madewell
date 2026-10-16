# Made Well — the grammar for work

**Status:** draft spec. Nothing here is built yet.

Made Well is a small grammar for doing any kind of work: any industry, team, department or
organization. It keeps **one list** and **a few words**, so work never scatters across tools that
each keep their own list in their own language.

---

## 1. The words

These are all of them.

| Word | Meaning |
|---|---|
| **item** | Any piece of work. |
| **to-do** | An item for later. Every item starts as a to-do. |
| **task** | An item being worked on now. |
| **done** | Finished, with proof. |
| **dropped** | Let go on purpose, with a reason. Never silently deleted. |
| **discovery** | Turning raw input — notes, conversations, documents — into items. |
| **delivery** | Taking an item through four stages to done. |
| **stages** | ideation · planning · implementation · verification |
| **project** | A body of work. Every item belongs to one. |
| **operator** | The person who decides. |
| **agent** | Whoever does the work: a person or an AI. |

## 2. How an item moves

```
to-do ──start──▶ task ──finish──▶ done
  ▲                │
  └─────later──────┘
to-do or task ──drop──▶ dropped
```

- **Start** is the decision to work on it. For a delivery item, starting it is the operator's
  yes to deliver it.
- **Later** puts a task back on the list without losing its progress.
- **Finish** needs proof. A quick item is finished by whoever did it, saying what changed. A
  delivery item finishes itself when its verification passes; nobody can finish it by hand.
- Every task shows **who is on it**.

## 3. Three kinds of item

- **Quick** — something small: fix a typo, change a color, answer an email. Start it, do it,
  finish it. No stages. It lives on the same list so it cannot be forgotten.
- **Delivery** — something that deserves the four stages.
- **Discovery** — a piece of raw input waiting to be turned into items.

## 4. Two loops, with the operator between them

Discovery and delivery are separate on purpose.

```
raw input ──discovery──▶ discovered to-dos ──operator sets the order──▶ delivery ──▶ done
```

Discovery produces to-dos. It never starts them. Between the two loops the **operator decides
what comes first**: the order of the discovered to-dos is theirs. Changing the order changes
nothing else — every item stays on the list, exactly as it was. An agent may suggest an order and
say why; it never sets one.

The operator often reorders by theme, not one item at a time ("everything about scheduling comes
first now"). They can say that in words; the agent finds the matching to-dos, shows them, and
moves them together once the operator confirms.

## 5. Discovery

Discovery turns one input into many items.

1. **Declare the run.** Live (normal) or blind (testing the method itself). Undeclared runs don't count.
2. **Look before adding.** Read the project's purpose, its existing items, and the operator's past
   answers, so nothing is added twice and nothing already decided is raised again.
3. **Classify the input.** What it is, when it happened, who is in it, how mature the thinking in it
   is, how dense it is.
4. **Read it through lenses.** What must the work be or do · who it is for and who is involved ·
   how the work really gets done · what is missing · what is meant but not said · what this teaches
   about the discovery method itself. A field of work may add its own lenses.
5. **Name the one thing.** The single most important finding that is not written down anywhere.
6. **Route every finding**, each exactly once:
   - **keep** → a new to-do, marked quick or delivery, pointing back to where it came from;
   - **decide** → a question for the operator;
   - **let go** → named, never silently dropped.
   Each finding says whether it was stated or inferred.
7. **Confirm with the operator.** Show the findings before they become to-dos. Their answers are
   recorded word for word. Where they contradict a finding, they win, and the original is struck
   through, not deleted. Silence is never agreement.

The input itself is never copied into the list. Items point to it.

A discovery run is itself an item: `mw discover <input>` adds it as a to-do, and `mw start` runs
it, like any other item. It finishes when the operator has confirmed; its proof is the list of
to-dos it created and the one thing it named.

## 6. Delivery: four stages

Each stage is done by a different agent than the one before it.

| Stage | What happens | Hands over |
|---|---|---|
| **Ideation** | Shape the approach, then challenge it. | an approach that survived the challenge |
| **Planning** | Write the contract; decide how it will be checked. | the contract and the checks |
| **Implementation** | Do the work to the plan. | the work, and what was checked along the way |
| **Verification** | Someone other than the maker checks the work against the contract. | pass, or a failure with evidence |

**The contract** has four lines, no more:

```
Making:      …
Not making:  …
Done when:   …
Waits on:    …
```

**Ideation can end three ways:** go ahead · split it into several to-dos (they return to the list
and the operator orders them) · recommend dropping it (the operator decides).

**When a check fails**, decide whose problem it is, and the item goes where that answer points:

| The problem | Where the item goes |
|---|---|
| was already there before this work | a new item is created for it; this item waits on it, then is checked again |
| the work was done wrong | back to planning |
| the check itself was wrong | back to whoever wrote the check, then checked again |
| cannot be decided | the operator decides |

After three failed corrections the operator is asked.

**Rules that hold in every stage**
- No one checks their own work.
- An item that is stopped keeps its place and everything it has done; it is never rewound.
- Progress is recorded with proof, not with words like "working on it".
- Questions go to the operator only when nothing on hand can answer them.

## 7. Working sessions

A working session — a person, or a person with an agent — uses the same list:

- What the session is doing now are **tasks**; what comes up for later are **to-dos**.
- Something noticed in passing goes on the list the moment it is noticed, and the session goes back
  to what it was doing.
- **A session cannot end with one of its quick tasks open.** Each is finished or put back as a
  to-do. Nothing goes to a private list.
- Delivery tasks are not the session's. They belong to the record and carry on across sessions,
  days and crashes.

## 8. Projects

Every project is **active**, **planned** or **on hold**. By default only active projects are shown.
Moving a project between these is one command.

Every project has a short **purpose**: what it is for and who it serves. Discovery reads it and
proposes changes to it; the operator approves them. Every answer the operator gives is kept on the
item it answered, so the project's decisions can always be found and are never asked twice.

## 9. The command: `mw`

One command, plain verbs.

```
mw                      what is being worked on, and what needs the operator
mw todo "…"             add a to-do
mw start <id>           begin work on it (delivery enters ideation; discovery runs)
mw finish <id>          mark a quick item done (delivery finishes itself on a passing check)
mw later <id>           put a task back on the list
mw drop <id> "why"      let it go, with the reason
mw answer <id> "…"      answer a question an item is waiting on
mw discover <input>     add an input for discovery
mw first <id>...        put one or more to-dos at the top of the order
mw next                 the one most important item, and what moves it
mw changes              what changed since the last look
```

Every command takes `--project <name>`; every command can answer in `--json` for agents.

## 10. What people see

- **One sentence first:** how many items need the operator, what is running, whether anything is wrong.
- **Questions sit on the item they belong to**, each with what it is, why it matters, the options
  and a recommendation. They can be answered from the view itself.
- **Only checked facts.** An item never shows a state nobody verified.
- **Quiet when nothing is happening.** An empty view means all is well.
- **The same data at every size:** a one-line status, a side panel, a full screen.
- No internal identifiers, file paths or process numbers unless an item is opened.

## 11. What agents see

- `mw next` — the single most important item and the exact command that moves it.
- `mw changes` — only what changed, so agents never re-read everything.
- One short line per item by default; full detail on request.
- Every item carries its next command, so the list is a list of actions, not a report.

## 11a. Telemetry: nothing happens out of sight

Trust comes from seeing the work, so the record keeps everything and shows it.

**Every event** is recorded with the time, who did it, which item, what happened, and its proof:
an item added, started, moved, waiting, answered, checked, failed, routed, finished or dropped.

**Metrics, per item, per project, per day:**
- items in each state: to-do, task, done, dropped
- time spent in each discovery step and each delivery stage
- operator stops: how many, and how long work waited on the operator
- checks run, passed and failed; corrections made; items waiting on another item
- which agent did each step (so "no one checks their own work" can be seen, not just claimed)
- tokens and spend per stage, per item, per day

**Live, for anything running now:** who is on it, how long since its last output, and a plain
warning when it goes silent, its agent stops, or nothing is driving it.

The same record feeds the operator's view, a full-screen dashboard and `mw changes` for agents.
A rule that can be checked from the record is shown as checked, with its result.

## 12. One record

All items, for all projects, live in **one durable record**. Every view — the command, the panel,
the agents — reads it. Nothing keeps a second copy. Work survives a crash: whatever stopped is
picked up where it stopped.

## 13. Changes to this application

Made Well runs on Pi Durable. To match this spec:

1. **One record.** Replace one store per working folder with one store for all projects; give every
   item one number that is unique everywhere.
2. **The item.** Add to-do / task / done / dropped, the three kinds, and the moves.
3. **Delivery starts at ideation.** Remove the discovery step from the delivery thread; replace
   "delivery needs authorization" with `mw start`. Group the seven current steps into the four
   stages (challenge inside ideation; writing the checks inside planning).
4. **The discovery loop.** One agent runs the discovery method in section 5, read-only, ending with
   the operator's confirmation.
5. **`mw`** as the one command, and the views in sections 10 and 11.

Each change lands with its own tests passing before the next begins.
