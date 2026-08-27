# Bench — take a piece from the rack

**Mode:** Workflow — runs **plan**.
**Moves:** `stock/X.md` → `bench/X.md` (a leaf) or `bench/X/PIECE.md` (breaks down).

---

## What this is

Deciding the next actionable cut. Not deciding *whether* the work is worth doing — nothing
on the rack was rejected, it was just still on the rack.

## Ground first

Before you write a word of the floor, make the existing decisions present. What is already
built, already named, already ruled on — read the repository, not a document *about* it.

The most common failure of this act is proposing work that already exists. It looks like
productivity and it is not.

## Write the floor

Four lines. **Nothing else may be demanded here.**

```markdown
**Making:** …          one sentence
**Not making:** …      what is out of scope
**Done when:** …       how anyone can tell
**Waits on:** …        may be empty
```

Do not ask for a file list, a task breakdown, or line numbers. Those are implement-time
facts and they do not exist yet. Requiring them here asks one gate to do two acts' jobs.

## Leaf or breakdown?

- **Leaf** — one pair of hands can do it. `git mv stock/X.md bench/X.md`.
- **Breaks down** — it needs its own rack. `git mv stock/X.md bench/X/PIECE.md` and create
  `bench/X/{stock,bench,finished}/` in the same commit. Its pieces run the same four acts,
  one depth down.

If you cannot tell, it is a leaf. You will find out.

## Done when

The piece is in `bench/`, the floor is written, and the jig accepted the commit.
