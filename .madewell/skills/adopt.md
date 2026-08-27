# Adopt — the first conversation
**Layer:** foundational · **Mode:** workflow
**When:** someone new arrives. First contact, before any work. Runs **once**, then never again.

---

## What this is

Somebody has turned up with work they already do. Your job is to find out what that work is,
show them it already has the four acts in it, and leave them with a cartridge of their own
and one real piece on the rack.

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

### 4 — What has to be right first?

> *"What's the thing where, if you get it wrong at the start, everything after it is wrong
> too — and you find out late?"*

That is their **foundation**. Software calls it system boundaries; marketing calls it
positioning; sales calls it qualification. A caterer will say the guest count. A lawyer will
say the jurisdiction. Whatever they say, that is the file.

### 5 — What does every job touch?

> *"What are the three to five areas that every job passes through, no matter what kind it
> is?"*

Those are their **pillars** — the striations of their domain. Push for three to five. Fewer
means they are describing stages, not areas; more means they are listing tasks.

### 6 — What gets skipped?

The heart of it. Ask directly, then wait.

> *"When it's busy and something has to give — what gives? And what does it cost you three
> weeks later?"*

Every answer is a future jig. Write them verbatim. This list is what makes their cartridge
theirs rather than a template with their logo on it.

### 7 — The one question

> *"Before anything leaves here, what's the one question you'd want asked?"*

That is their **rubric**. The kernel's is *does this lead to craft, beauty and care*; theirs
sits on top of it and is usually sharper and more specific.

### 8 — Build it with them, now

Do not send them away to write it. Write it in front of them, from what they just said:

```
cartridges/<theirs>/
  PACK.md              foundation + pillars table, the skips, the rubric
  foundation/<x>.md    principles → protocol → definition of done
  pillars/*.md         one per pillar, same three parts
  discovery-lenses.md  what their trade hears that a general listener misses
```

Read `.madewell/EXTENDING.md` for the slot contract, and copy the shape of
`cartridges/marketing/` — it is the shortest complete example. **Every line in their cartridge
must be traceable to something they said.** If you cannot point at the sentence it came from,
cut it.

### 9 — Now try it

One real thing. Something already on their plate today.

```sh
# put it on the rack
$EDITOR .madewell/stock/<their-thing>.md

# take it to the bench when they can answer all four
git mv .madewell/stock/<their-thing>.md .madewell/bench/<their-thing>.md
```

Sit with them while they write the floor — Making, Not making, Done when, Waits on. **That
first floor is where adoption actually happens**, because it is the first time the framework
asks them for something and gives something back.

Then stop. One piece is enough for a first sitting. They will be tempted to rack twenty
things; the rack growing is fine, but the bench staying short is the discipline, and it is
easier learned with one.

---

## Done when

- They have named their unit of work.
- Their four acts are written in **their** vocabulary.
- A cartridge exists that they watched get written.
- One real piece is on the bench with a floor they wrote.
- They know the three commands: `ls` the three directories, `git mv` to move, and that
  nothing ever moves backward.

**Not done when** you have explained the framework well. Explaining is not adopting. They have
adopted it when one real piece of their own work is sitting on the bench.
