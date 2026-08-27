# Finish — proof it and take it off the bench

**Mode:** Workflow — runs **verify**.
**Moves:** `bench/X.md` → `finished/X.md`, or `bench/X/PIECE.md` → `finished/X.md`.

---

## You don't proof your own plate

Whoever made it does not get to say it is done. This is the one rule people skip, and
skipping it turns the system into self-justifying output.

If you made it, hand it to another pair of hands. If you are proofing, you did not make it.

## What proofing checks

**Against the floor, not against your memory of the task.** Read `Done when:` and answer it.

- Does it do what `Making:` said?
- Does it avoid what `Not making:` said?
- Would a person who was not here be able to tell?
- What happens when the input is empty, wrong, or absent?

Tests answer *does it work*. They do not answer *is it what was imagined*. That second
question is this act's whole job, and no CI run will do it for you.

## Then the rubric

Before it comes off the bench: **does this lead to craft, beauty, and care?**

If no, it is the wrong thing to finish — and it does not matter that it works, that it was
faster, or that nobody will notice. That is not a style note; it is the standard the whole
thing is named after.

## A breakdown finishes last

A piece with its own rack can only finish when its `stock/` and `bench/` are both empty.
Its `finished/` stays where it is — that is the record of how it was made.

## Failure is not a move

A failed proof does not send the piece backward. It stays on the bench and gets cut again.
Say plainly what failed and why. Attempts accumulate in `git log`; position does not move
until it passes.

## Done when

The piece is in `finished/`, and someone who did not make it said so.
