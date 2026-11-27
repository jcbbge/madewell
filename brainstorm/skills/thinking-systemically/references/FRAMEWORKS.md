# Systems Thinking Frameworks Reference

Apply the evidence, boundary, and delay rules in SKILL.md. Framework rankings and illustrative diagrams are hypotheses about leverage, not measured effects in the current system. Distinguish stocks from flows, throughput constraints from delivery-time paths, and causal evidence from correlation. Use only the framework needed for the current intervention.

This reference provides detailed frameworks for deeper systems analysis. Load these when you need:
- Specific leverage point identification
- Decision context determination (Cynefin)
- Constraint-based optimization (Theory of Constraints)
- Framework selection guidance

## Table of Contents

1. [Meadows' 12 Leverage Points](#meadows-12-leverage-points-weakest-to-strongest)
   - Understanding Leverage
   - Points 12-1 (Weakest to Strongest)
   - Framework Selection
2. [Cynefin Framework - Context-Appropriate Response](#cynefin-framework---context-appropriate-response)
   - Five Contexts for Decision Making
   - Application for Solo Developers
3. [Theory of Constraints (TOC) - Five Focusing Steps](#theory-of-constraints-toc---five-focusing-steps)
   - Core Principle
   - Steps 1-5
4. [Integrating Frameworks](#integrating-frameworks)
   - When to Use Each Framework
   - Sequential Application
   - Framework Synergies
5. [Practical Framework Selection Guide](#practical-framework-selection-guide)

---

## Meadows' 12 Leverage Points (Weakest to Strongest)

### Understanding Leverage

**Key principle:** The higher the number, the deeper the intervention, the more system resistance, but the greater the potential impact.

**Common mistake:** Focusing on easy, low-leverage points (parameters) instead of harder, high-leverage points (paradigms).

---

### 12. Constants, Parameters, Numbers (Weakest Leverage)

**Description:** Changing quantities - subsidies, taxes, standards, work hours, prices.

**Indie dev examples:**
- Working 10 hours vs 12 hours per day
- Charging $100/hr vs $150/hr
- Deploying once vs twice per day
- Emergency fund of $5k vs $10k

**Why low leverage:** Doesn't change system structure. If relationships stay same, changing numbers has limited effect.

**When to use:** Quick wins, immediate relief, but don't expect fundamental change.

---

### 11. Buffers - Size of Stabilizing Stocks

**Description:** Size of reserves relative to flows - inventory, savings, capacity.

**Indie dev examples:**
- Emergency fund size (financial buffer)
- Code coverage (quality buffer)
- Time buffer between projects (recovery capacity)
- Feature backlog (product buffer)

**Why matters:** Buffers absorb shocks and buy time, but bigger isn't always better - can slow response.

**Optimal sizing:** Large enough to handle normal variation, not so large you miss signals.

---

### 10. Stock-and-Flow Structures

**Description:** Physical structure of who can do what, where, when.

**Indie dev examples:**
- Client onboarding workflow structure
- Development → Testing → Deployment pipeline
- Knowledge accumulation systems
- Revenue flow vs expense flow timing

**Why significant:** Changing physical structure can enable new behaviors, but bounded by paradigms.

**Intervention:** Redesign workflows to change what's physically possible.

---

### 9. Length of Delays Relative to Rate of System Change

**Description:** Speed of feedback relative to speed of change.

**Indie dev examples:**
- Slow client feedback on work (delayed course correction)
- Annual performance reviews vs continuous feedback
- Monthly financial review vs weekly
- Long build times hiding code quality issues

**Why critical:** Delays cause oscillation and overshoot. Shortening feedback loops improves control.

**High-leverage intervention:** Shorten time between action and feedback.

---

### 8. Strength of Negative Feedback Loops (Balancing)

**Description:** How strongly system resists change and maintains goals.

**Indie dev examples:**
- **Strong resistance:** Hourly billing → always need more hours (hard to escape)
- **Weak resistance:** Product pricing → can adjust without losing all revenue
- **Too strong:** Perfectionism loop → nothing ships
- **Too weak:** No quality standards → technical debt spirals

**Intervention strategies:**
- Weaken loops that trap you (billing model)
- Strengthen loops that maintain good states (quality standards)

---

### 7. Gain Around Driving Positive Feedback Loops (Reinforcing)

**Description:** Strength of growth or collapse amplification.

**Indie dev examples:**
- **Virtuous:** Good work → referrals → better clients → more time → better work
- **Vicious:** Burnout → poor work → client problems → more stress → more burnout
- **Skill compound:** Learning → better solutions → more interesting work → more learning
- **Debt compound:** Skip tests → bugs accumulate → debugging time → less time for tests

**Intervention strategies:**
- Strengthen virtuous cycles (create referral systems)
- Weaken or break vicious cycles (hard stops on work hours)
- Slow runaway growth (compound interest on technical debt)

---

### 6. Information Flows - Who Does and Doesn't Have Access

**Description:** Making feedback visible to decision makers.

**Indie dev examples:**
- **Add visibility:** Dashboard showing technical debt impact on velocity
- **Remove blindness:** Time tracking reveals where hours actually go
- **Create feedback:** Client satisfaction surveys after each milestone
- **System observability:** Wide events showing system behavior patterns

**Why powerful:** Information changes behavior without force. People self-correct when they see effects.

**Application:** Make system state visible to those who can act on it.

---

### 5. Rules - Incentives, Punishments, Constraints

**Description:** Formal rules that govern system behavior.

**Indie dev examples:**
- **Quality rules:** No deploy without tests passing
- **Boundary rules:** No work after 6pm or weekends
- **Client rules:** Minimum project size, payment terms
- **Process rules:** Code review required, no solo deployments

**Why significant:** Rules shape behavior without constant oversight.

**Design principles:**
- Clear, enforceable rules better than vague guidelines
- Rules should align incentives with desired outcomes
- Fewer, stronger rules > many weak rules

---

### 4. Self-Organization - Power to Add/Change/Evolve System Structure

**Description:** Ability of system to change its own structure, add feedback loops, evolve.

**Indie dev examples:**
- **Enable:** Build systems that adapt to changing needs (modular architecture)
- **Block:** Rigid infrastructure that resists adaptation
- **Encourage:** Learning culture that updates practices based on experience
- **Product evolution:** Architecture that allows feature experimentation

**Why powerful:** Self-organizing systems adapt without external intervention.

**Intervention:** Create conditions for adaptation, remove rigidity.

---

### 3. Goals - Purpose or Function of System

**Description:** What the system is trying to achieve.

**Indie dev examples:**
- **Shift from:** Maximize billable hours → Maximize impact per hour
- **Shift from:** Ship features fast → Ship features that stay shipped
- **Shift from:** Grow revenue → Build sustainable business
- **Shift from:** Be productive → Be effective

**Why powerful:** Changing goals immediately reorients all system behavior.

**Application:** When system optimizes for wrong thing, change the goal.

---

### 2. Paradigms - Mindsets from Which System Arises

**Description:** Fundamental assumptions and beliefs that generate goals and rules.

**Indie dev examples:**
- **Time = Money** → Impact = Value (changes entire approach)
- **Code = Asset** → Code = Liability (minimalism over accumulation)
- **Work = Hours** → Work = Outcomes (results over presence)
- **Growth = Success** → Sustainability = Success (changes strategy)

**Why most powerful:** Paradigm shifts cascade through entire system.

**Recognition:** Paradigms are hardest to see when you're inside them.

**Intervention:**
- Question fundamental assumptions
- Expose yourself to different paradigms
- Small experiments that challenge current paradigm

---

### 1. Transcending Paradigms (Strongest Leverage)

**Description:** Ability to see multiple paradigms, not be captured by any single one.

**Indie dev application:**
- Hold "time = money" AND "impact = value" simultaneously
- Recognize when to optimize, when to satisfice, when to experiment
- Move between paradigms based on context
- Avoid ideological capture by any single mental model

**Why ultimate leverage:** Flexibility to adopt appropriate paradigm for situation.

**Practice:** Study different mental models, notice when paradigm is helping vs constraining.

---

## Framework Selection: When to Use What

### Use Leverage Points When:
- Need to identify where to intervene in complex system
- Multiple possible interventions, unclear which has most impact
- Want to avoid low-leverage "working harder" traps
- Facing deep systemic issues requiring structural change

**Application pattern:**
1. Map current system structure
2. Identify which leverage level current problem exists at
3. Look for interventions at higher levels than obvious solutions
4. Test with small experiments

---

## Cynefin Framework - Context-Appropriate Response

### Five Contexts for Decision Making

**Purpose:** Match response strategy to problem complexity.

---

### Clear Context (Obvious)

**Characteristics:**
- Cause-effect relationships clear to everyone
- Best practices known and proven
- Repeatable, predictable situations

**Indie dev examples:**
- Setting up version control
- Basic security practices
- Standard deployment procedures
- Known performance optimizations

**Response:** **Sense - Categorize - Respond**
1. Assess situation
2. Apply known best practice
3. Execute efficiently

**Danger:** Complacency - assuming everything is clear when complexity hidden.

---

### Complicated Context

**Characteristics:**
- Cause-effect relationships exist but not obvious
- Requires expertise to analyze
- Multiple good answers possible
- Expert disagreement on best approach

**Indie dev examples:**
- Architecture decisions for new product
- Choosing tech stack
- Performance optimization strategies
- Scaling infrastructure

**Response:** **Sense - Analyze - Respond**
1. Assess situation
2. Analyze with expertise (research, consult, model)
3. Apply good practice (may be multiple options)

**Key:** Expertise matters. Don't skip analysis.

---

### Complex Context

**Characteristics:**
- Cause-effect only obvious in retrospect
- Emergent patterns
- Unpredictable interactions
- Multiple stakeholders with different perspectives

**Indie dev examples:**
- Product-market fit discovery
- Team dynamics and collaboration patterns
- Ecosystem evolution (languages, frameworks, platforms)
- User behavior and adoption patterns

**Response:** **Probe - Sense - Respond**
1. Run safe-to-fail experiments
2. Observe what emerges
3. Amplify what works, dampen what doesn't
4. Iterate based on feedback

**Key:** You can't predict, you must discover through experimentation.

**Common mistake:** Trying to analyze complex situations like complicated ones.

---

### Chaotic Context

**Characteristics:**
- No cause-effect relationships discernible
- High turbulence
- Needs immediate action to stabilize
- Crisis mode

**Indie dev examples:**
- Production system down, revenue stopped
- Security breach in progress
- Critical bug affecting all users
- Running out of money imminently

**Response:** **Act - Sense - Respond**
1. Take immediate action to stabilize
2. Assess impact
3. Work toward complexity or complicated context
4. Prevent recurrence

**Key:** Speed over analysis. Stabilize first, understand later.

**Goal:** Move from chaos → complex → complicated as quickly as possible.

---

### Confused Context (Disorder)

**Characteristics:**
- Unclear which context you're in
- Different people assume different contexts
- No agreement on approach
- Paralysis or conflicting actions

**Indie dev examples:**
- "Should we rewrite or refactor?" (depends on context)
- "Is this a simple fix or complex problem?"
- Team disagrees on whether situation is clear or complex
- Oscillating between analysis and action without progress

**Response:** Break down into smaller pieces and assign each to appropriate context.

**Key:** Confusion often signals need to decompose problem.

---

### Cynefin Application for Solo Developers

**Decision process:**
1. Assess which context problem lives in
2. Match response strategy to context
3. Watch for context shifts (complicated → complex, complex → chaos)
4. Use appropriate skill based on context:
   - Clear: Execute efficiently
   - Complicated: Analyze deeply (use systems thinking)
   - Complex: Experiment (use exploring-possibilities)
   - Chaotic: Act immediately, understand later

**Integration with systems thinking:**
- Complicated problems benefit from systems analysis
- Complex problems need probe-sense-respond loops (systems thinking helps interpret results)
- Clear problems don't need systems thinking (over-complicating)
- Chaotic problems need action first, systems analysis after stabilization

---

## Theory of Constraints (TOC) - Five Focusing Steps

### Core Principle

**Every system has ONE constraint that limits throughput.** Optimizing anywhere except the constraint is waste.

---

### Step 1: Identify the System's Constraint

**For indie developers, common constraints:**
- Time/attention (most common)
- Money (cashflow)
- Energy/health
- Skills/knowledge
- Tools/infrastructure
- Market access

**Identification method:**
- Where does work queue up?
- What limits output most?
- If you had more X, would throughput increase?

**Critical insight:** Your constraint is often NOT where you think it is.

---

### Step 2: Decide How to Exploit the Constraint

**Exploit = Get maximum from existing constraint without investment.**

**If time is constraint:**
- Eliminate context switching
- Batch similar work
- Remove interruptions
- Delegate or automate non-critical tasks

**If money is constraint:**
- Focus on highest-margin work
- Reduce unnecessary expenses
- Accelerate revenue collection
- Defer non-critical investments

**If energy is constraint:**
- Tackle hardest work when energy highest
- Protect recovery time religiously
- Eliminate energy drains
- Optimize sleep, exercise, diet

**Key:** Squeeze maximum from constraint BEFORE investing to expand it.

---

### Step 3: Subordinate Everything Else to the Constraint

**Align entire system around constraint.**

**If time is constraint:**
- Say no to opportunities that don't leverage existing skills
- Don't optimize processes that aren't bottlenecked by time
- Let non-constraint resources be partially idle (counterintuitive!)

**If money is constraint:**
- Prioritize revenue-generating work over interesting projects
- Accept technical debt if it accelerates revenue
- Don't gold-plate deliverables (use constraint efficiently)

**Common mistake:** Optimizing non-constraint resources. If you have spare capacity somewhere that's NOT the bottleneck, that's fine - don't optimize it.

---

### Step 4: Elevate the System's Constraint

**Elevate = Invest to expand constraint capacity.**

**If time is constraint:**
- Hire contractor for specific tasks
- Buy tools that automate workflows
- Invest in training to work faster
- Change business model to need less time

**If money is constraint:**
- Take loan/investment
- Bring on revenue-sharing partner
- Presell product for upfront cash
- Cut burn rate significantly

**If energy is constraint:**
- Address health issues professionally
- Significantly change work environment
- Take extended break to recover
- Change work that's energy-draining

**Key:** Only elevate AFTER exploiting current capacity.

---

### Step 5: Go Back to Step 1 (Don't Let Inertia Become Constraint)

**When constraint breaks:**
- System behavior changes
- New constraint emerges
- Old optimization patterns now harmful

**Warning signs:**
- Solutions stop working
- Different problems emerge
- Old bottleneck no longer limiting

**Example shift:**
- Was time-constrained → hired help → now money-constrained
- Was money-constrained → got funding → now hiring/management constrained
- Was skill-constrained → trained up → now market access constrained

**Key:** Regularly reassess which constraint is binding.

---

## Integrating Frameworks

### When to Use Each Framework

**Meadows' Leverage Points:**
- Problem: Need to identify where to intervene
- Use when: Many possible solutions, unclear which has most impact
- Output: Ranked intervention options by leverage level

**Cynefin:**
- Problem: Need to choose response strategy
- Use when: Unsure whether to analyze, experiment, or act
- Output: Context determination and appropriate response mode

**Theory of Constraints:**
- Problem: Need to focus limited resources
- Use when: Feeling pulled in many directions
- Output: Identification of the ONE thing that matters most

### Sequential Application

**Complex problem workflow:**
1. **Cynefin:** Determine context (complicated vs complex vs chaotic)
2. **TOC:** Identify the constraint limiting progress
3. **Leverage Points:** Find high-leverage interventions on constraint
4. **Systems Thinking:** Map second-order effects of interventions
5. **Experiment:** Test highest-leverage intervention at small scale

### Framework Synergies

**TOC + Leverage Points:**
- TOC identifies WHERE to intervene (the constraint)
- Leverage Points identifies HOW to intervene (at what level)

**Cynefin + Systems Thinking:**
- Cynefin determines IF systems analysis appropriate (complicated = yes, complex = partial, chaotic = no)
- Systems thinking provides the analysis method

**All Three:**
- Cynefin: What context? → Complicated
- TOC: What's the constraint? → Time/attention
- Leverage Points: Best intervention? → Change paradigm from hours-based to value-based work
- Systems Thinking: What are second-order effects? → More time per client but higher rates

---

## Practical Framework Selection Guide

**Start with Cynefin if:**
- Unsure whether to analyze or act
- Team/internal disagreement on approach
- Recent interventions haven't worked as expected

**Start with TOC if:**
- Feeling overwhelmed with many problems
- Unclear where to focus limited resources
- Many "important" things competing for attention

**Start with Leverage Points if:**
- Know the constraint/problem area
- Have multiple possible solutions
- Want to avoid low-leverage interventions

**Start with Systems Thinking if:**
- Problem keeps recurring despite fixes
- Worried about unintended consequences
- Need to understand "why this keeps happening"

---

This frameworks reference provides deep knowledge for appropriate situations. Return to SKILL.md for core operating instructions and practical examples.
