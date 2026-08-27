# Made Well

**A way of working that keeps good work from quietly going missing.**

You already know how to do your job. What's hard is that when things get busy, the same parts
always get dropped — the thinking at the start, and the checking at the end — and nobody
notices until it's expensive.

Made Well is four steps, written down, with something to stop you skipping them.

> **Think it through. Decide the next thing. Do it. Check it against what you expected.**

That's it. Every trade already does this. A baker proofs the dough and tastes the crumb. A
lawyer researches and gets a second read. You didn't have to be taught the shape — what you
lack is somewhere to put it.

---

## Start here

Open your AI assistant in a folder and say:

> **I want to adopt Made Well. Run adopt.**

It'll ask what you actually do all day, have you walk through one job start to finish, and
then show you those four steps **in your own words** before it uses any of its own. By the end
of one sitting you'll have a version tuned to your line of work, and one real thing from your
plate set up in it.

You don't need to read the rest of this page first. It'll be here afterwards.

---

## What you get, and what it asks

**What it gives you**

- One place where everything lives, and *where a thing is* tells you *how far along it is*.
  Nothing to keep in sync, no second list, no status to update.
- Work that only moves forwards. Nothing quietly slides back, nothing gets re-argued.
- A stop between *I made it* and *it's done*, so nothing marks its own homework.
- A record of why you did what you did, written as it happened instead of remembered later.
- Knowledge about **your** line of work that plugs in, without changing anything underneath.

**What it asks of you**

- **Four sentences before you start.** What you're making, what you're deliberately not
  making, how you'll know it's done, and whether anything's holding it up. If you can't answer
  them yet, that's worth knowing — it means the job isn't understood, and that's information,
  not a hurdle.
- **Someone other than the maker checks it.** This is the one people skip and the one
  everything else rests on.
- **Not much on the go at once.** The waiting list can be enormous. What you're *actively
  working* can't be.
- **Your judgment.** The filing should cost you nothing. The decisions are still yours, and it
  will stop and wait for you.

**What it won't do**

Estimates. Deadlines. Progress percentages. It won't work while you sleep and it won't tell
you how long anything will take.

---

## Three places work can be

```
waiting     things you might do. Grows without limit — that's fine, that's correct.
in hand     what you're working on now. One person per thing.
done        checked, and finished.
```

To move something from *waiting* to *in hand*, you answer four questions:

> **Making:** a page where someone can change their email
> **Not making:** deleting your account
> **Done when:** the change sticks after you reload
> **Waits on:** nothing

Your assistant handles the filing. You answer the questions.

Something in hand either breaks into smaller parts or it doesn't. If it does, those parts run
the same four steps inside it. It goes as deep as the work goes and no deeper.

---

## The two habits

Both exist for one failure, and it isn't *getting things wrong*. It's **deciding something
that was already decided.**

**Ground** — before planning anything, find out what's already been settled. What exists,
what's already named, what was already ruled on. The most common failure when working with an
assistant isn't that it chooses badly; it's that **it never thought to look**, and cheerfully
rebuilds something you already have.

**The jig** — a woodworker's jig is a block clamped to the bench that makes the wrong cut
physically impossible. Not a reminder. A stop. Checking that something *works* is a different
question from checking you didn't **redo a decision** — and only the second one catches a
beautifully built thing that ignores everything you'd already settled.

You make a jig after you've made the same mistake twice. Every workshop fills up with them.

---

## Four helpers, at most six

Four at minimum, because the steps mustn't collapse into each other. **You don't check your
own work.** One assistant doing all four marks its own homework, and when that goes wrong the
blame lands on the tool instead of on the missing step.

Six at most. Past that, keeping everyone straight costs more than the work does.

---

## Lines of work

Made Well doesn't know your industry. That part plugs in — a **trade**.

| Trade | What has to be right first | The areas every job touches |
|---|---|---|
| [Software](trades/dev/) | System boundaries | Backend · Frontend · Interfaces · Shipping |
| [Marketing](trades/marketing/) | Positioning | Audience · Message · Channel · Measurement |
| [Sales](trades/sales/) | Qualification | Discovery · Proposal · Close · Handoff |

The workshop is the same whether you're a joiner or a bookbinder — same bench, same shelf,
same rule about not checking your own work. What differs is the trade.

**Yours isn't listed?** That's expected, and it's the normal case. See
[`trades/README.md`](trades/README.md) — your assistant builds it with you from a
conversation, rather than handing you a form.

---

## The question

One question, asked of anything before it's finished:

> **Does this lead to craft, beauty, and care?**

If no, it's the wrong move — and it doesn't matter that it works, that it was faster, or that
nobody will notice. People notice everything; they just can't always say what they noticed.

That question is what *made well* means, and it's why the thing is called that.

---

## For developers

It's plain text files in a git repository. No command-line tool, no service, no database, no
account. Delete the tooling and the work is still there and still readable.

```sh
git clone https://github.com/jcbbge/madewell
sh madewell/install.sh /path/to/your/project
```

It adds a `.madewell/` folder, appends one line to `CLAUDE.md` / `AGENTS.md`, and touches
nothing else. Re-running re-syncs the framework and leaves your work alone. `--uninstall`
removes it with no residue. You can also copy the files in by hand — the installer isn't doing
anything clever.

The three places are directories: `stock/`, `bench/`, `finished/`. A piece's state **is** the
directory it's in; nothing else records it. Work moves with `git mv`, one move per commit, and
an optional pre-commit hook (`.madewell/bin/mw-gate.sh`, POSIX sh, no dependencies) refuses
any move that isn't one of the four legal ones.

Full storage contract in [`SPEC.md`](SPEC.md). How to extend any part:
[`.madewell/EXTENDING.md`](.madewell/EXTENDING.md).

---

## Map

| Path | What it is |
|---|---|
| `MADEWELL.md` | **The whole model.** About 130 lines. Read this first. |
| `SPEC.md` | Where work lives and how it moves. For developers. |
| `.madewell/skills/adopt.md` | The first conversation. |
| `.madewell/AGENTS.md` | Instructions to your assistant. |
| `.madewell/EXTENDING.md` | How to extend any part. |
| `trades/` | Lines of work. |
| `madewell-deck.html` | A 15-slide walkthrough. Open it in a browser. |

`MADEWELL.md` and `SPEC.md` are the only documents that decide anything. If something else
disagrees with them, they win. If something else *repeats* them, that's a bug — delete it.

---

## Contributing

The bar for adding a document is high: **if it restates the model, it doesn't go in.** This
once carried sixteen different terms to describe a process with four steps. That was the bug,
and it's the one most likely to come back.

New trades are very welcome. Run `adopt` on your own line of work and send the result.

## Licence

MIT — see [LICENSE](LICENSE).
