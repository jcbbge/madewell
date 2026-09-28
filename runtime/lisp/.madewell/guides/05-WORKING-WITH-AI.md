# Working With AI Effectively

**What:** How to get good results from AI assistants like Claude.
**Key insight:** AI is a partner, not a replacement for your thinking.

---

## The Fundamental Truth

AI will build what you ask for, not what you need.

If you don't know what you need, AI will confidently build something that works but isn't right. "Vibe code" happens when you outsource thinking to the AI. Good results happen when you do the thinking and let AI help execute.

---

## The Partnership Model

**You bring:**
- Understanding of the problem
- Decisions about tradeoffs
- Domain knowledge
- Judgment about what's "right"
- Accountability for the outcome

**AI brings:**
- Rapid implementation
- Pattern recognition
- Boilerplate generation
- Research and explanation
- Consistency checking
- Fresh perspective

Neither works alone. The combination is powerful.

---

## How to Give Good Instructions

### Be Specific

Bad: "Build me a login page"
Good: "Build a login form with email and password fields, submit button, and error states for invalid email format and wrong password"

### Provide Context

Bad: "Add a button"
Good: "In the TaskItem component, add a 'Mark Complete' button that calls PATCH /api/tasks/:id with {completed: true}"

### State Constraints

Bad: "Make it look nice"
Good: "Use the color palette from DESIGN.md, minimum touch target 44px, mobile-first"

### Define Done

Bad: "Make it work"
Good: "Done when: form submits, success redirects to /dashboard, errors display inline, works on mobile"

---

## How to Review AI Output

AI is confident even when wrong. Your job is verification.

### Before Accepting Any Code

1. **Read it.** Don't just run it. Understand what it does.
2. **Question it.** Why this approach? What alternatives exist?
3. **Test it.** Does it work? Does it work with edge cases?
4. **Check assumptions.** What does it assume about input, state, environment?

### Red Flags

- Code that's more complex than necessary
- Patterns that don't match how the rest of the project is written
- No error handling
- "Happy path only" implementations
- Import statements for libraries you don't have
- Comments explaining what code does (instead of why)

### What to Push Back On

- "This should work" → "Test it first"
- Complex solution to simple problem → "What's the simplest approach?"
- Code you don't understand → "Explain this line by line"
- Missing error handling → "What happens when this fails?"

---

## The Collaboration Modes

### Exploration Mode

When you don't know what to build. AI helps you think.

- Ask questions, don't give commands
- "What are the tradeoffs between X and Y?"
- "How do other apps handle this?"
- "What am I not thinking about?"
- Don't accept answers as final — they're inputs to your thinking

### Execution Mode

When you know what to build. AI helps you implement.

- Give clear, specific instructions
- Reference existing code patterns
- Define done conditions
- Review output carefully
- Iterate quickly

### Learning Mode

When you need to understand something.

- Ask for explanations, not just solutions
- "Why does this work?"
- "What would break this?"
- "How would I debug this?"
- Build understanding, not just working code

---

## Common Mistakes

### Vibe Coding

**What it looks like:** "Build me an app that does X"
**Why it fails:** AI builds something that seems right but isn't grounded in your needs.
**Fix:** Discovery first. Know what you're building before asking AI to build it.

### Accepting Without Reading

**What it looks like:** Copy-paste the first response.
**Why it fails:** Bugs, security issues, wrong patterns sneak in.
**Fix:** Read every line. If you can't explain it, don't commit it.

### Over-Relying on AI Judgment

**What it looks like:** "What should I do here?"
**Why it fails:** AI doesn't know your context, users, or constraints.
**Fix:** Make the decision yourself. Use AI to implement it.

### Complexity Creep

**What it looks like:** Accepting increasingly complex solutions because AI generated them.
**Why it fails:** You end up with code you can't maintain.
**Fix:** Always ask "what's the simplest solution?" and mean it.

---

## Effective Prompts

### For Planning

```
I'm building [feature]. Here's the context:
- Users: [who]
- Goal: [what they're trying to do]
- Constraints: [technical, time, etc.]

What are the main pieces I need to build? What order should I build them?
```

### For Implementation

```
In [file], I need to add [feature].

Current state: [what exists]
Goal: [what it should do after]
Constraints: [patterns to follow, libraries to use]

Implement this following the existing code style.
```

### For Debugging

```
This code isn't working:
[code]

Expected: [what should happen]
Actual: [what happens]
I've tried: [what you've attempted]

What's wrong and how do I fix it?
```

### For Review

```
Review this code for:
- Edge cases I'm missing
- Potential bugs
- Security issues
- Simplifications possible

[code]
```

---

## The Red Lines

Things AI should never do:

1. **Make decisions about tradeoffs.** That's your job.
2. **Skip tests.** Tests are non-negotiable.
3. **Suppress errors.** Errors are information.
4. **Commit secrets.** API keys, passwords, etc.
5. **Deploy without verification.** Always test first.
6. **Override your explicit instructions.** AI should do what you say.

If AI pushes back, listen to the reasoning. But the final call is yours.

---

## When AI Gets Stuck

AI will sometimes:
- Give the same wrong answer repeatedly
- Claim something works when it doesn't
- Miss context that's obvious to you

When this happens:
1. Restate the problem differently
2. Provide more context
3. Break the problem into smaller pieces
4. Try a completely different approach
5. If still stuck, step away and think without AI

---

## The Meta-Skill

The best developers using AI are not prompt engineers. They're good at:

1. **Knowing what they want** before asking
2. **Recognizing wrong answers** quickly
3. **Iterating** based on feedback
4. **Maintaining quality** despite speed

AI amplifies whatever you bring to it. Bring clarity, get clarity. Bring confusion, get confident-sounding confusion.

---

*"AI is a multiplier. Zero times anything is still zero. Bring something real, and AI will help you build it faster."*
