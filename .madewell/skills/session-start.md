# Session start — orient

**Mode:** Workflow. Run once, before touching anything.

---

## Look at where things are

```sh
ls .madewell/stock/       # material on the rack
ls .madewell/bench/       # what is in hand
ls .madewell/finished/    # what is done
git log --oneline -12     # what just happened
git status --porcelain    # what is uncommitted, and whose it is
```

Position is path. There is no state file to read, no projection to reconcile, no ledger to
replay. If you want to know where something is, look at where it is.

## Read the handoff

The last commit's `NEXT:` line is the handoff. If it says `—`, there isn't one, and the
next move is the human's call.

## Notice what is not yours

`git status` will show uncommitted work. **Some of it may not be yours.** Do not stage it,
do not revert it, do not `git add -A`, and do not `git reset --hard` a tree containing it.
Ask before touching anything you did not write this session.

## Say where things stand, briefly

One short paragraph: what is in hand, what the handoff said, what you propose next. Then
stop and let the human steer.
