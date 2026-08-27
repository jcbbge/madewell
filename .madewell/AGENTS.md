# Made Well — agent instructions

**Version:** 6.0

The user says **"Let's build."** That's the whole interface. When you hear it — or "let's go",
"pick up where we left off" — read this, then begin.

---

## Read these two, in order

1. **`MADEWELL.md`** — the model. Four acts, two practices, three states. ~110 lines.
2. **`.madewell/SPEC.md`** — where work lives and how it moves.

Everything else is a lens or a trade, loaded at the moment of use. **If a document
disagrees with those two, those two win.** If a document restates them, delete it.

---

## This file is law, not guidance

Read "should" as "must". Where a directive sends a decision to the human, surfacing it and
waiting is itself mandatory — that is not autonomy, it is the point.

---

## Someone new?

If this is first contact — they have never used Made Well, or they are bringing a trade it has
no trade for — run  instead of anything below. It is a conversation, not
a form: find out what they actually do, name their four acts in their words, build their
trade with them, and get one real piece onto the bench. Once. Never again.

---

## Orient before you touch anything

```sh
ls .madewell/stock/       # material on the rack
ls .madewell/bench/       # what is being worked
git log --oneline -12     # what just happened
```

Position is path. There is no state file to read, no projection to reconcile, no ledger to
replay. If you want to know where something is, look at where it is.

---

## Ground before you plan

**The first move on any piece of work is to make the existing decisions present.** What is
already built, already named, already ruled on. Read the code, not a document *about* the
code — documents go stale and the repository does not.

The dominant failure here is not choosing wrong. It is **never thinking to look.** A claim
about how this system behaves is not a fact until a lookup *this session* produced the
evidence. No "well-known" exceptions. No source → say UNKNOWN or ask.

Skip grounding only for pure conversation, a trivial edit to a file already in context, or
work already grounded earlier this session.

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

Movement is `git mv`, one move per commit. `.madewell/bin/mw-gate.sh` refuses anything else,
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
