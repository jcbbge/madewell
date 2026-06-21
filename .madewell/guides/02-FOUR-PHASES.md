# The Four Phases

**Every piece of work — a feature, a fix, a decision — moves through four phases.**
You can't skip them. You can rush them, but you'll pay for it later.

```
IMAGINE → PLAN → MAKE → VERIFY
```

This isn't a software concept. It's how all work gets done well.
A chef imagines the dish, plans the prep, makes it, verifies it before it leaves the kitchen.
A builder imagines the room, plans the build, makes it, verifies it holds.
You imagine what you're making, plan how to make it, make it, verify it became what you imagined.

---

## These four are the *Cycle* — the engine room

The four phases are the core of a larger loop. Around them sit two membranes: work has to
get *in*, and — just as important — it has to get *out*.

```
DISCOVERY → COMMIT → [ IMAGINE → PLAN → MAKE → VERIFY ] → LAND
 get it in   choose it      the four phases (this page)    ship it + learn from it
```

- **Discovery** — get what's in your head into a form you can act on. (See *Discovery*.)
- **Commit** — the choice to do *this, not that, now*, and to keep the active list short.
- **Land** — how a finished piece leaves cleanly: it ships, and it feeds back what it taught.

Without Land, work piles up — finished-but-never-closed — until the system clogs. The four
phases build the thing; Land is how you set it down so you can pick up the next.

---

## IMAGINE

**Purpose:** Understand what you're making and why — before touching anything.
**Done when:** You can explain it simply. You know what "done" looks like.

Questions to answer:
- What exactly are we making?
- Why does this matter?
- Who is it for?
- What's the smallest version that solves the problem?
- What are we explicitly NOT making?
- What could go wrong?

Output: one sentence describing the thing, one sentence describing what done looks like, a short list of what's out of scope.

---

## PLAN

**Purpose:** Figure out how to make it before you start making it.
**Done when:** You have a sequence of steps small enough that each one can be completed and verified independently.

Questions to answer:
- What are all the pieces?
- What order do they need to happen?
- What needs to exist before something else can be built?
- What's the first concrete action?

Output: a numbered sequence of steps. Each step small enough to finish in one sitting. Clear enough that a fresh session could pick it up and continue.

**Example:**
```
Making: Sign-in with email
Done when: Someone can sign in, stay signed in, and sign out.
Not making: Social login, password reset, account creation.

Steps:
1. Create the data store for accounts
2. Build the sign-in endpoint
3. Add session handling
4. Build the sign-in form
5. Connect form to endpoint
6. Handle success and failure states
7. Verify: correct password works
8. Verify: wrong password shows a clear message
9. Verify: staying signed in across sessions works
```

---

## MAKE

**Purpose:** Do the work. One step at a time.
**Done when:** The thing works — happy path confirmed.

Rules:
- Follow the plan. One step at a time.
- Verify each piece before moving to the next.
- When something comes up that wasn't in the plan — add it to the backlog. Don't pull the thread sideways.
- If you're stuck for more than 20 minutes, stop and ask. Don't spin.

Output: the thing works. The steps are done. The work is saved.

---

## VERIFY

**Purpose:** Prove it works — including when things go wrong.
**Done when:** You'd be comfortable if a real person used this right now.

This phase gets skipped most often. It's where quality is actually made.

Questions to ask:
- What breaks this?
- What if the input is empty? Wrong? Unexpected?
- What if something fails mid-way?
- What does a first-time person see?
- What does an error look like to the person using it?

The checklist:
- [ ] Empty inputs handled
- [ ] Failure states show something human, not a crash
- [ ] Works the same way the 100th time as the first
- [ ] A person who wasn't there for the building can figure it out

Output: the thing works correctly, including when things go wrong.

---

## Moving Between Phases

**IMAGINE → PLAN** when you can say what you're making, why, and what done looks like.

**PLAN → MAKE** when you have a clear sequence and a clear first step.

**MAKE → VERIFY** when the thing works — happy path confirmed, work saved.

**VERIFY → LAND** when you'd let a real person use it right now — then Land it: ship it, and capture what building it taught.

---

## The Fractal

These four phases apply at every level of scale.

A single task has its own four phases.
A feature has its own four phases.
A product has its own four phases.
A company has its own four phases.

You can zoom in or zoom out. The pattern holds.
Each level runs the same loop — just at a different altitude.

---

## The Anti-Patterns

| What people do | What to do instead |
|---|---|
| Jump straight to making | Spend time in Imagine first. 15 minutes saves hours. |
| Plan in their head | Write it down. Plans that aren't written aren't plans. |
| Skip Verify | Budget time for it. This is where trust is won or lost. |
| Change scope mid-Make | Capture it in the backlog. Finish what's in flight first. |
| Call it done when it runs | Ask: would I let a real person use this right now? |
