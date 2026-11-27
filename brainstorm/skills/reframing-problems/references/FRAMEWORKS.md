# Problem Reframing Frameworks Reference

Use the relevant framework only when SKILL.md identifies a concrete distinction it can resolve. Its questions are diagnostic prompts to answer from evidence, not a mandatory interview. Preserve the user's stated goals and binding constraints; causal chains and worked numbers below are illustrations, not evidence about the current task.

## Table of Contents

1. [Five Whys Technique](#five-whys)
2. [Ladder of Inference](#ladder-of-inference)
3. [Constraint Mapping](#constraint-mapping)
4. [Theory of Constraints](#theory-of-constraints)
5. [Systems Thinking](#systems-thinking)
6. [Appreciative Inquiry](#appreciative-inquiry)
7. [Wicked vs Tame Problems](#wicked-vs-tame-problems)

---

## Five Whys

**Origin:** Toyota Production System (Taiichi Ohno)

**When to use:** The problem appears to have a clear causal chain. You suspect the stated problem is a symptom rather than root cause.

**How it works:** Ask "why" five times (approximately) to drill down from symptom to root cause.

### Protocol

1. State the problem clearly
2. Ask "Why does this happen?"
3. For each answer, ask "Why does *that* happen?"
4. Continue only while each causal link has support; stop and mark the gap when evidence ends.
5. Test whether changing the proposed cause changes the original problem. Do not infer causation from a plausible chain alone.

### Example application

```
Problem: Database queries are slow

Why? → Query optimizer isn't using indexes efficiently
Why? → Tables don't have proper indexes
Why? → No one planned indexes when schema was designed
Why? → Schema was designed without understanding query patterns
Why? → We built the schema before understanding product requirements

Root cause: Building data model before understanding usage patterns
Reframed problem: How do we align data modeling with actual product needs?
```

### Common pitfalls

- Stopping too early at symptoms
- Following only one causal path (there may be multiple)
- Accepting vague answers ("it just happens that way")
- Blaming people instead of processes

### When to stop

Stop when you reach:
- A process you can change
- A decision you can remake
- A systemic issue you can address
- A constraint you can challenge

Do not force a controllable explanation when the supported cause is external. Distinguish a real constraint from an unexplored one. Avoid personal blame without evidence, and do not invent a process defect to complete the chain.

---

## Ladder of Inference

**Origin:** Chris Argyris and Peter Senge

**When to use:** The problem formulation seems based on assumptions, interpretations, or mental models that could be questioned.

**How it works:** Trace how someone climbed from observable data to conclusions, challenging each step.

### The ladder steps (bottom to top)

1. **Observable data:** Raw facts available to all
2. **Selected data:** What you chose to pay attention to
3. **Interpreted data:** Meaning you assigned to selected data
4. **Assumptions:** What you assumed based on interpretations
5. **Conclusions:** What you concluded based on assumptions
6. **Beliefs:** What beliefs you formed or reinforced
7. **Actions:** What actions you took based on beliefs

### Protocol

For each level, ask:
- "What data am I using?"
- "What data am I ignoring?"
- "What meaning am I assigning?"
- "What am I assuming?"
- "Is this conclusion warranted?"
- "What beliefs is this reinforcing?"

### Example application

```
Stated problem: "We need to hire more engineers"

Trace down the ladder:
- Action: Hire more engineers
- Belief: Engineering capacity is the bottleneck
- Conclusion: Projects are delayed due to engineering shortage
- Assumption: Delays mean insufficient engineering resources
- Interpretation: Project delays = "we can't ship fast enough"
- Selected data: Projects ship 2-3 months late
- Ignored data: Requirements changed mid-project, unclear priorities

Reframed problem: "How do we ship projects predictably?"
Alternative angles:
- Better requirement stability?
- Improved prioritization?
- Reduced scope creep?
- Or actually: more engineers?
```

### Key questions

- "What am I observing vs interpreting?"
- "What else could this data mean?"
- "What am I not seeing?"
- "What assumptions am I making?"
- "Could I be wrong about this?"

---

## Constraint Mapping

**When to use:** The problem formulation includes constraints that seem to severely limit solution space. You suspect some constraints are assumptions rather than requirements.

**How it works:** Explicitly list all constraints, then categorize them as hard (real requirements) or soft (assumptions), and challenge the soft ones.

### Protocol

1. **List all constraints:** Everything limiting your solution space
2. **Categorize constraints:**
   - **Hard:** Laws of physics, legal requirements, budget limits
   - **Soft:** Assumptions, preferences, traditional approaches
   - **Artificial:** Self-imposed, organizational, cultural
3. **Challenge soft constraints:** "What if we relaxed this? What becomes possible?"
4. **Test constraint sources:** "Where does this constraint come from?"

### Constraint types

**Real constraints (probably can't change):**
- Laws of physics
- Regulatory requirements
- Budget hard limits (money doesn't exist)
- Technical impossibilities

**Assumed constraints (might change):**
- "That's how we've always done it"
- Unstated preferences
- Organizational norms
- Perceived limitations

**Hidden opportunities:**
- Constraints that could be relaxed
- Constraints that reveal better problems
- Constraints that are outdated

### Example application

```
Stated problem: "How do I fit this project into 2 weeks?"

Constraint analysis:
- Hard: Launch date is regulatory deadline [VALIDATE: Is it really?]
- Soft: "2 weeks" came from manager's estimate
- Soft: "This project" includes 10 features
- Assumed: All 10 features needed for launch
- Assumed: Current team size is fixed
- Assumed: Must be built from scratch

Challenge soft constraints:
- What if only 3 core features for launch?
- What if deadline could move 1 month? (Real regulation or preference?)
- What if we found an existing solution to adapt?
- What if we got contractor help for 1 month?

Reframed problems:
1. "What's the minimum viable version we can launch?"
2. "Is this deadline negotiable given scope?"
3. "What can we buy vs build?"
```

### Questions to ask

- "Where does this constraint come from?"
- "What would happen if we violated it?"
- "Is this a real constraint or a preference?"
- "What becomes possible if we relax constraint X?"
- "Which constraints are coupled?" (Changing one affects another)

---

## Theory of Constraints

**Origin:** Eliyahu Goldratt

**When to use:** The problem involves a system or process with multiple steps. You suspect one bottleneck is creating the entire problem.

**How it works:** Identify the system constraint (bottleneck), then frame the problem around maximizing throughput of that constraint.

### Five Focusing Steps

1. **Identify the constraint:** What limits system throughput?
2. **Exploit the constraint:** Get maximum value from current constraint
3. **Subordinate everything else:** Align other steps to support constraint
4. **Elevate the constraint:** Increase constraint capacity if needed
5. **Repeat:** The constraint shifts; find the new one

### Protocol

1. Map the full system/process
2. Identify the constraint for the actual objective: limiting capacity for throughput, or the binding dependency path for delivery time. The longest individual step is not automatically the bottleneck.
3. Ask: "What if we removed this bottleneck?"
4. Consider whether the stated problem is actually about the bottleneck
5. Reframe around maximizing constraint throughput

### Example application

```
Stated problem: "Our deployment pipeline is slow"

System analysis:
- Code review: 2 hours
- Tests: 4 hours ← BOTTLENECK
- Build: 30 minutes
- Deploy: 15 minutes

Reframed problem: "How do we speed up our test suite?"

Further reframe: "Do we need all these tests? Can tests run in parallel?"

Meta-reframe: "What's the actual cost of slow deployments?"
- If deploying once/day: 4 hour tests barely matter
- If deploying 10x/day: 4 hour tests are critical bottleneck
```

### Key insights

- Optimizing non-constraints is waste
- The constraint determines system capacity
- Moving the constraint may reveal unexpected problems
- Sometimes eliminating the constraint eliminates the problem

---

## Systems Thinking

**Origin:** Peter Senge, Russell Ackoff, Donella Meadows

**When to use:** The problem involves multiple interconnected factors, feedback loops, or has failed "obvious" solutions before.

**How it works:** Look for systemic patterns, feedback loops, and leverage points rather than linear cause-effect.

### Key concepts

**Feedback loops:**
- **Reinforcing (R):** Self-amplifying (virtuous or vicious cycles)
- **Balancing (B):** Self-correcting (resistance to change)

**Leverage points:** Places where small change creates large effect

**Delays:** Time between action and consequence creates confusion

### Protocol

1. Map the system components and their relationships
2. Identify feedback loops (reinforcing and balancing)
3. Look for delays between action and consequence
4. Find leverage points (where intervention has greatest effect)
5. Consider whether the "problem" is the system finding equilibrium

### Example application

```
Stated problem: "Our team is always behind on maintenance work"

System mapping:
- New features create technical debt
- Technical debt slows development
- Slower development creates pressure for more features
- More features = more debt = slower still (REINFORCING LOOP)

Balancing forces:
- Team wants to fix debt
- Management wants features
- Neither side fully "wins" → chronic state

Reframed problem: "How do we break the feature-debt spiral?"

Leverage points:
- Explicit debt budget (% of time)
- "Done" includes fixing debt
- Slow down to speed up
- Make debt visible to stakeholders
```

### Systems thinking questions

- "What feedback loops are at play?"
- "Where are the delays between action and consequence?"
- "What happens if we do nothing? (System equilibrium)"
- "What would break these reinforcing loops?"
- "Where are the leverage points?"
- "Is this problem the system working as designed?"

### Common system archetypes

**Fixes that fail:** Quick fix works short-term, makes problem worse long-term

**Shifting the burden:** Address symptoms, not root cause, making root cause worse

**Limits to growth:** Growth hits constraint, constraint blocks further growth

**Tragedy of the commons:** Individual optimization depletes shared resource

---

## Appreciative Inquiry

**Origin:** David Cooperrider

**When to use:** The problem framing is deficit-focused (what's wrong, what's broken). A strength-based reframe might be more productive.

**How it works:** Shift from "what's broken?" to "what's working?" and "how do we build on strengths?"

### 4-D Cycle

1. **Discovery:** What's working well? When does the problem not occur?
2. **Dream:** What could be? Ideal future state?
3. **Design:** What should be? Structure to reach ideal?
4. **Destiny:** What will be? Action and commitment?

### Protocol

1. Identify when the problem doesn't occur
2. Ask what's different in those situations
3. Reframe from fixing weakness to building strength
4. Shift from "problem to solve" to "opportunity to pursue"

### Example application

```
Deficit frame: "Our team has low morale"

Discovery questions:
- When do people seem engaged?
- What projects excite the team?
- When was morale high? What was different?

Findings:
- Morale high during autonomy-rich projects
- Engagement increases with visible customer impact
- Team excited when learning new skills

Reframed problem: "How do we increase autonomy, customer impact, and learning?"

vs original frame: "How do we fix low morale?"
```

### Key distinction

**Problem-focused:** What's wrong → diagnose → fix → prevent recurrence
**Appreciative:** What works → understand → amplify → create more of it

Both have value; appreciative inquiry offers a different angle when deficit framing isn't productive.

---

## Wicked vs Tame Problems

**Origin:** Horst Rittel and Melvin Webber

**When to use:** To determine what type of problem you're facing and select appropriate reframing approach.

**How it works:** Classify the problem as tame (well-defined) or wicked (complex, no clear solution), then adjust approach accordingly.

### Tame problems

Characteristics:
- Clear problem statement
- Definite solution criteria
- Solutions testable (right or wrong)
- Similar problems solved before
- Limited stakeholders

**Approach:** Standard problem-solving, optimization, best practices

### Wicked problems

Characteristics:
- No definitive formulation
- No stopping rule (always could be better)
- Solutions not true/false but good/bad
- Every problem is unique
- Every solution has consequences
- Multiple stakeholders with different goals

**Approach:** Iterative reframing, stakeholder collaboration, experimental

### Protocol

1. **Assess problem type:**
   - Is there a clear success criterion? (Tame)
   - Do stakeholders disagree on what success is? (Wicked)
   - Will "solving" it create new problems? (Wicked)

2. **Adjust your approach:**
   - **Tame:** Optimize, use best practices, find "right" answer
   - **Wicked:** Frame as ongoing management, not "solving"

### Example application

```
Stated problem: "Fix the database performance issue"
Type: TAME (clear success = faster queries)
Approach: Analyze, optimize, measure improvement

vs

Stated problem: "Improve team productivity"
Type: WICKED
- No clear definition of "productivity"
- Stakeholders disagree on what matters
- Solutions create tradeoffs
- Success criteria evolve

Reframe: "What experiments can we run to learn what improves team effectiveness?"
```

### Wicked problem reframing

For wicked problems:
- Frame as continuous improvement, not "solving"
- Focus on next experiment, not final solution
- Expect to reframe repeatedly as you learn
- Get comfortable with "good enough for now"
- Acknowledge legitimate disagreement on goals

---

## Framework Selection Quick Reference

| Situation | Use Framework |
|-----------|---------------|
| Problem seems like a symptom | Five Whys |
| Based on assumptions/interpretations | Ladder of Inference |
| Constrained solution space | Constraint Mapping |
| System with bottleneck | Theory of Constraints |
| Multiple interconnected factors | Systems Thinking |
| Deficit-focused framing | Appreciative Inquiry |
| Unclear if problem is well-defined | Wicked vs Tame |

## Combining frameworks

Often effective to use multiple frameworks in sequence:

1. **Ladder of Inference** → Challenge assumptions
2. **Five Whys** → Find root cause
3. **Constraint Mapping** → Expand solution space
4. **Systems Thinking** → Understand interactions

The frameworks are tools, not rules. Use what fits the situation.
