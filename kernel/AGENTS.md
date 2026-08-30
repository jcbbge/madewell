# Made Well — agent instructions

**Version:** 6.0

The user says **"Let's build."** That's the whole interface. When you hear it — or "let's go",
"pick up where we left off" — read this, then begin.

---

## Read these two, in order

1. **`MADEWELL.md`** — the model. Four acts, two practices, three states. ~110 lines.
2. **`SPEC.md`** — where work lives and how it moves. The agent reads `SPEC.md` at the repo root in this dist checkout. After `install.sh`, the same file lives at `.madewell/SPEC.md`.

Everything else is a lens or a trade, loaded at the moment of use. **If a document
disagrees with those two, those two win.** If a document restates them, delete it.

---

## This file is law, not guidance

Read "should" as "must". Where a directive sends a decision to the human, surfacing it and
waiting is itself mandatory — that is not autonomy, it is the point.

---

## Someone new?

If this is first contact — they have never used Made Well, or they are bringing a trade it has
no trade for — run **adopt** (`.madewell/skills/adopt.md`) instead of anything below. It is a conversation, not
a form: find out what they actually do, name their four acts in their words, build their
trade with them, and get one real piece onto the bench. Once. Never again.

---

## Orient before you touch anything

```sh
ls .madewell/stock/       # material on the rack
ls .madewell/bench/       # what is being worked
git log --oneline -12     # what just happened
```

Position is path. There is no *position* file to read. The Jig's `corrections.jsonl` is
local tax data, not where a piece sits.

---

## Ground before you plan

**Contact:** `.madewell/ground/PROTOCOL.md` in full. The picture shape is
`.madewell/ground/PICTURE.md`. Where to look *here* is `.madewell/ground/ROOTS.md`.
This is kernel law, not a skill.

Skip grounding only for pure conversation, a trivial edit to a file already in context, or
work already grounded earlier this session. A plan whose task was never grounded is a
process defect.

## The Jig before you implement, and at verify

**Contact:** `.madewell/jig/README.md` and `CONTRACT.md`. Honor compiled conventions.
Run wired jigs in `jig/registry.json`. Never bypass `bin/mw-gate.sh`. A rule with no
detector is UNJIGGED — say so.

**Tax:** When the human overrode you, write `.madewell/jig/proposed.json` before the
commit that lands their version (`CORRECTIONS.md`). Run `sh .madewell/bin/mw-tax.sh`
at verify and session-end. **RATIFY** → ask them to compile a shop-made jig (never
auto-build). **HOLD** → not yet. **DROP** / **SUNSET** → take-down is theirs. The
fixture harness is not this reading.

---

## The four acts

**ideate** → **plan** → **implement** → **verify**. They recur at every depth. Never skip one
because the piece looks small; a small piece just runs them fast.

**Do not invent a second vocabulary for the outer pass.** It is the same four acts one depth up.

---

## Moving work

Four moves, and no others (`SPEC.md` §2):

```
stock/X.md        → bench/X.md            a leaf
stock/X.md        → bench/X/PIECE.md      breaks down
bench/X.md        → finished/X.md
bench/X/PIECE.md  → finished/X.md         its stock/ and bench/ must be empty
```

Movement is `git mv`, one move per commit. `bin/mw-move` is scaffolding that
will only perform those four moves and then stage; it does not commit. Delete
it and `git mv` still works. `.madewell/bin/mw-gate.sh` refuses anything else,
and refusing is its only capability. **Never bypass it to make a commit go through** — if it
stops you, it is telling you the move is illegal, not that it is broken.

To leave the rack, a piece states four lines and no more may be demanded of it:

```markdown
**Making:** …
**Not making:** …
**Done when:** …
**Waits on:** …
```

Do not ask for a file list, a task breakdown, or line numbers at that move. Those are
implement-time facts; requiring them earlier asks one gate to do two acts' jobs.

---

## Hands

Four minimum, six at most. The acts must not collapse into each other.

**You don't proof your own plate.** Whoever imagined it does not prove it worked. Whoever cut
it does not sign it off. One agent doing all four grades its own work, and when that fails the
failure gets blamed on the material.

---

## Commits

Stage explicitly. **Never `git add -A`.** Never `git reset --hard` in a tree with uncommitted
work you did not write.

```
<type>(<scope>): <summary>

ACT: <ideate | plan | implement | verify>
DONE: <what got done>
NEXT: <the handoff; write `—` if none>
```

---

## Deciding

At every fork — which design, which word, which of two ways — ask three questions before you
ask the person:

1. **Does this lead toward something ten times better to use?** Marginal rarely repays its complexity.
2. **Does it point toward something someone would remember, or love?** Forgettable is a failure state.
3. **Does it get us closer to being as easy for an agent as for a person?** Two users, always.

These are directions, not scores. Do not try to measure them — say which option points
further, and if none of them points anywhere good, say that instead of quietly picking the
least bad one.

**If you know the answer, act — do not ask.** A question you could have answered by reading
the repository, or by applying these three, is a question that costs the person their
attention for nothing. Ask only when the answer is genuinely theirs: taste, priority, money,
or something only they know.

When you do act on a judgement call, say which way you went and why, in one line. That is not
the same as asking permission.

---

## Forbidden

**No rewind.** Work moves one direction. A failed proof leaves the piece on the bench; you cut
again. Attempts accumulate, position does not move until it passes.

**No silent pass.** If a stop is missing, say the stop is missing. A rule with no jig behind it
is a preference and must be labelled one.

**No self-grading.** You do not get to declare your own work done. Report what happened,
including what failed, and let someone else call it.

---

## The pause

Bookkeeping is yours and should cost the human nothing. Judgment is theirs and is never
automated, never auto-approved, and never treated as a delay to optimise away. When the work
reaches a decision that is not yours, stop and surface it.
