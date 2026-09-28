# Adopt — the first conversation
**Layer:** foundational · **Mode:** workflow
**When:** someone new arrives — often with one sentence: *"Set up Constellation in this project."*
First contact, before any work. The conversation runs **once**; the setup is harmless to repeat.

---

## First, set it up

The person asked for setup, so do all of it. They run nothing and read nothing.

1. **Run adopt**, from the project, with the Constellation package's own copy of the driver:

   ```sh
   <package>/kernel/bin/constellation adopt            # this project; or: … adopt <project>
   ```

   The package is the Constellation checkout on this machine (`~/projects/constellation`). It
   is not fetched from anywhere; if it is not there, stop and say so plainly. Once a project is
   adopted, its own copy (`.madewell/bin/constellation adopt`) re-runs the setup without it.

   Adopt installs the kernel, wires the commit hooks, makes `ideas/` (the drop box), runs the
   enforcer checks and prints a welcome. Running it twice changes nothing of theirs.

2. **If it fails, stop and say so plainly.** A failed check is not a detail to route around;
   the welcome is only true once adopt exits 0.

3. **Commit the adoption** when the project already had history (adopt makes the first commit
   itself in a repository that had none): stage only what adopt added — `.gitignore`,
   `CLAUDE.md`, `AGENTS.md`, `.madewell/`, `ideas/.gitkeep` — and commit with `MW_GATE=off`,
   the one sanctioned bypass.

4. **Give them the welcome in your own voice**: what it says they can do next, not the output
   pasted. Then hold the conversation below. If adopt said it was *already set up* and they
   have work in hand, skip the conversation: they have adopted it already.

5. **Ask the door question, once**, unless `.madewell/profile` already names one:

   > *"Would you rather just talk, and I'll handle everything behind the scenes — or shall I
   > show you the engine as we go?"*

   Write one word to `.madewell/profile`: `guide` for just talk, `lead` for show me the engine.
   Never ask it again; if they later ask for the other door, rewrite the file
   (`.madewell/PROFILES.md` says what each door shows).

---

## What this is

Somebody has turned up with work they already do. Your job is to find out what that work is,
show them it already has the four acts in it, and leave them with a trade that fits it and
one real piece being made.

**You are not selling them a process. You are naming the one they already have.**

Every trade has these four acts, whatever they call them:

> think it through · decide the next cut · make it · check it against what you expected

A baker proofs dough and tastes the crumb. A lawyer researches and gets a second read. A
sales team qualifies and reviews the deal. Nobody had to be taught the shape. What they lack
is a place to put it and something that stops the acts collapsing into each other.

---

## How to run it

Conversationally. One question at a time. **Never present the whole framework up front** —
that is a lecture, and they will nod and leave. Ask, listen, reflect their own words back as
structure.

Do not use the words *ideate, plan, implement, verify* until step 3, and when you do, attach
each one to something they already said.

---

### 1 — What do you do?

Open. Not "what industry are you in" — what do you actually do all day.

Listen for the **unit of work**: the thing there is one of. A case. A campaign. A wedding. A
deal. A bug. A batch. You need this before anything else, because it is what goes on the rack.

> *"So a piece of work, for you, is one ——. When you say you had a busy week, you mean five of
> those rather than one big one?"*

### 2 — Walk me through one, start to finish

The whole ask. Interrupt as little as you can bear.

Listen for four things and write down **their words for each**:

- where it comes from and how they figure out what is wanted
- the moment they commit and decide what happens next
- the doing
- how anyone knows it is right

Also listen for what they **skip when busy**. That answer is the most valuable thing in the
conversation and they will hand it over casually.

### 3 — Show them the shape

Now name it, in their vocabulary first and the kernel's second.

> *"You said 'we scope it' — that's ideate. 'Cut the job sheet' — that's plan. 'The build' —
> implement. 'Snagging' — verify. Four acts. You already run all of them; you just run them at
> different depths depending on the size of the job."*

Then the point:

> *"The reason this is worth writing down is that when you're busy, snagging is what goes —
> and you told me that yourself. A jig makes that impossible instead of tempting."*

**If their work genuinely does not fit, say so.** Do not force it. The four acts describe
making something to a standard. Work that is purely reactive — a queue of unrelated
interrupts with no standard to hold — is a different shape, and telling them that is more
useful than a bad fit.

**If a shipped trade fits, use it.** The install carries three in `.madewell/trades/`: dev
(software), marketing, sales. When their work is plainly one of those, set it
(`constellation trade <name>`), say in one line which you chose and why, and go straight to
step 9. Steps 4–8 are for work none of them fits.

### 4 — What has to be right first?

> *"What's the thing where, if you get it wrong at the start, everything after it is wrong
> too — and you find out late?"*

That is their **foundation**. Software calls it system boundaries; marketing calls it
positioning; sales calls it qualification. A caterer will say the guest count. A lawyer will
say the jurisdiction. Whatever they say, that is the file.

### 5 — What does every job touch?

> *"What are the three to five areas that every job passes through, no matter what kind it
> is?"*

Those are their **pillars** — the pillars of their domain. Push for three to five. Fewer
means they are describing stages, not areas; more means they are listing tasks.

### 6 — What gets skipped?

The heart of it. Ask directly, then wait.

> *"When it's busy and something has to give — what gives? And what does it cost you three
> weeks later?"*

Every answer is a future jig. Write them verbatim. This list is what makes their trade
theirs rather than a template with their logo on it.

### 7 — The one question

> *"Before anything leaves here, what's the one question you'd want asked?"*

That is their **rubric**. The kernel's is *does this lead to craft, beauty and care*; theirs
sits on top of it and is usually sharper and more specific.

### 7b — How they'd know it was worth it

Before you write anything, ask the three questions about *their* work, in their terms:

> *"If this went really well — not slightly better, ten times better — what would be
> different on a Friday afternoon?"*
>
> *"What would make you actually tell someone else about it?"*
>
> *"Which parts of this would you happily never touch again — the bits an assistant should
> just handle?"*

The third answer tells you what to automate and what to leave alone, and people are far more
precise about it than about "what should be automated".

### 8 — Build it with them, now

Do not send them away to write it. Write it in front of them, from what they just said:

```
trades/<theirs>/
  TRADE.md             foundation + pillars table, the skips, the rubric
  foundation/<x>.md    principles → protocol → definition of done
  pillars/*.md         one per pillar, same three parts
  discovery-lenses.md  what their trade hears that a general listener misses
```

Read `.madewell/EXTENDING.md` for the slot contract, and copy the shape of
`.madewell/trades/marketing/` — it is the shortest complete example. **Every line in their
trade must be traceable to something they said.** If you cannot point at the sentence it came
from, cut it. Then set it: `constellation trade trades/<theirs>`.

### 9 — Now try it

One real thing. Something already on their plate today.

**You do the filing. They do the thinking.** Do not show them commands, do not ask them to
move files, do not explain the folders. Ask them the four questions and write down what they
say:

> *What are you making?*
> *What are you deliberately not making?*
> *How will you know it's done?*
> *Is anything holding it up?*

Then file it the way everything they bring is filed: write their words into
`ideas/<slug>.md` and run `constellation inbox`, which turns it into an idea. Once it is there,
start it yourself: `constellation take <slug>` with their four answers, then
`constellation run <slug>`. Tell them plainly: *"That's being made now."*

**Those four answers are where adoption actually happens** — it is the first time the thing
asks them for something and gives something back. If they struggle with *done when*, that is
not them failing the exercise; it is the exercise working. Sit in it with them.

Then stop. One piece is enough for a first sitting. They will be tempted to add twenty
ideas; the ideas growing is fine, but what is being made staying short is the discipline, and
it is easier learned with one.

---

## Done when

- They have named their unit of work.
- Their four acts are written in **their** vocabulary.
- Their work has a trade: a shipped one that fits, or one they watched get written.
- Their door is stored in `.madewell/profile`.
- One real piece is being made, with the four questions answered in their words.
- They know the three places work can be — ideas, being made, done — and that nothing ever
  moves backward.

**Not done when** you have explained the framework well. Explaining is not adopting. They have
adopted it when one real piece of their own work is being made.
