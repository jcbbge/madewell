# Session end — hand off

**Mode:** Workflow. Run before the session closes.

---

## Commit what moved

Stage explicitly, by path. **Never `git add -A`** — it sweeps up work that is not yours.

```
<type>(<scope>): <summary>

ACT: <ideate | plan | implement | verify>
DONE: <what actually got done>
NEXT: <the handoff; be specific, or write `—`>
```

`NEXT:` is the whole point of the commit message. The next session reads it cold. "Continue
the work" is not a handoff; "the jig refuses cross-depth moves — see the parse() case" is.

## Report honestly

Say what failed, what you skipped, and what you are unsure of. A session summary that only
lists wins is worse than none, because the next session inherits your blind spots without
knowing it.

**You do not get to declare your own work done.** Report the state; let someone else call it.

## Leave the bench tidy, not empty

Do not rush a piece to `finished/` to make the session look complete. A piece left properly
on the bench with a clear `NEXT:` is a good handoff. A piece finished without a proof is a
lie the next session has to discover.
