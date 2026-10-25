# Evidence: what each mark on the Delivery sheet is drawn from

Every mark is a concept with no physical form, drawn from a field of Made Well's read API. Nothing on the
sheet is invented. (The teardown skill's evidence table, for a concept.)

| Mark | Blazon field | Drawn from | Kind |
|---|---|---|---|
| Masthead "Made Well", subtitle | `sheet.masthead.name`, `.subtitle` | fixed words | concept |
| Sheet number | `sheet.masthead.number` | `model.eventCount`: the record's entry count, so the number rises as the record moves | concept |
| Date | `sheet.masthead.date` | `model.at` | concept |
| Warning under the masthead | `sheet.warning` | the page's own state: `/api/mark` unreachable since a time, or `/api/model` with `store: null` | concept |
| Status for screen readers | `sheet.updated` | `model.at`, `model.needs.length` | concept |
| Rings, one per item | `principal.rings[]` | `model.items[]` with `kind !== 'discovery'`, ordered: waits on you, moving, shipped, dropped; at most 8 | concept |
| Ring name | `rings[].name` | `items[].id`, `items[].title` | concept |
| Step names around the rim | `principal.steps[]` | `items[].steps[].job`, in plain words (`STEP_WORDS`) | concept |
| A filled step | `rings[].fills[i]` | `items[].steps[i].state` and `items[].status`: done → sage; held, failed, or waiting while paused/held → vermilion; active with a runner, or waiting on quota or a prerequisite → slate-blue; active with no runner → vermilion; a dropped item's done steps → ochre | concept |
| Centre disc | `principal.centre` | `model.needs.length`; vermilion when more than none, Paper when none | concept |
| Notice, one per wait | `notices[]` | `model.needs[]`: `item`, `title`, `code`, `message` (quoted verbatim), `questions`, `since`, `next[]` | concept |
| Notice words ("It stopped at a checkpoint before building…") | `notices[].says` | `needs[].what`, `needs[].code`, the item's step in `waiting` state | concept |
| Stamp words | `notices[].actions[].words` | `needs[].next[].run`, mapped by `WORDS`; else the first clause of `next[].why` | concept |
| Stamp command | `notices[].actions[].run` | `needs[].next[].run`, exact | supplied |
| The one vermilion stamp | `actions[].weight === 'primary'` | the first `next` of the oldest wait | concept |
| Running notice | `notices[]` with `ink: 'slate-blue'` | `model.running[]`: `item`, `title`, `since`, `live`; `items[].doing` for the sentence | concept |
| Its output lines | `notices[].output[]` | `GET /api/live/<file>` text, each line in plain words (`lineWords`); else `running[].activity[].text` | concept |
| Legend | `legend[]` | the inks the rings and notices use | concept |
| Colophon | `colophon` | `model.host`, `summary.last`, `items.length`, `summary.calls`, `summary.tokens`, `summary.agentMs`, `summary.shipped` | concept |
| Sealed | `sheet.sealed` | `summary.shipped > 0` (Stage 1 records it; the seal ordinary is not yet painted) | concept |

## Rebuild and proof

```sh
npm run bundle                      # ui/gazette/build.mjs writes dist/gazette.html, then the CLI is bundled
node --test test/gazette.test.ts    # the blazon from a recorded model; the painter's refusals; the service on a scripted host
node dist/mw.mjs ui --port 4747     # serve; open http://127.0.0.1:4747/ (the console at /console)
```

The rendered page is inspected in the operator's Chrome over CDP (`~/.claude/skills/operator-mac/scripts/cdp.mjs`),
screenshot to a file and looked at; a file write is not proof.
