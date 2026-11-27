# System Archetypes for Indie Developers

Illustrative patterns for generating causal hypotheses, not diagnoses or guaranteed outcomes. A resemblance does not establish a loop: verify each material link, operating condition, and delay under SKILL.md. Personal or organizational examples are not evidence about the current user; do not infer motives or health states from an archetype.

## Table of Contents

1. [How to Use This Reference](#how-to-use-this-reference)
2. [Archetype 1: Burnout Loop](#archetype-1-burnout-loop-reinforcing---vicious-cycle)
3. [Archetype 2: Attention Death Spiral](#archetype-2-attention-death-spiral-reinforcing---collapse)
4. [Archetype 3: Technical Debt Compound Interest](#archetype-3-technical-debt-compound-interest-reinforcing---acceleration)
5. [Archetype 4: Revenue Trap](#archetype-4-revenue-trap-balancing---resistance-to-change)
6. [Archetype 5: Quality-Speed Tradeoff](#archetype-5-quality-speed-tradeoff-balancing---oscillation)
7. [Archetype 6: Success to Failure Transition](#archetype-6-success-to-failure-transition-balancing---goal-shifting)
8. [Cross-Archetype Patterns](#cross-archetype-patterns)
9. [Archetype Selection Guide](#archetype-selection-guide)

---

## How to Use This Reference

**Pattern recognition process:**
1. Notice recurring problem that resists simple solutions
2. Map variables and feedback loops
3. Match pattern to archetype below
4. Apply breaking strategy for that archetype
5. Predict second-order effects of intervention

**Key insight:** These archetypes appear across domains (technical, business, personal). Same structural pattern, different variables.

---

## Archetype 1: Burnout Loop (Reinforcing - Vicious Cycle)

### Structure

```
Work intensity (+) → Stress/exhaustion
Stress/exhaustion (-) → Work quality
Lower quality → More rework needed
More rework (+) → Work intensity
```

**Loop type:** Reinforcing (collapse spiral)\
**Time signature:** Accelerates over weeks/months

### Recognition Criteria

**You're in this loop when:**
- Working harder produces worse results
- Need more hours to compensate for mistakes made when tired
- Quality problems accumulate faster than you can fix them
- Feel trapped: "can't stop working, but working makes it worse"

**Domains where this appears:**
- Technical: Long hours → bugs → debugging → longer hours
- Business: Client pressure → rushed work → unhappy clients → more pressure
- Personal: Overwork → health issues → less capacity → need to work more

### Why Standard Solutions Fail

**"Work harder"** - Strengthens the loop (more intensity → more stress)\
**"Take a day off"** - Temporary relief, loop resumes Monday\
**"Power through"** - Accelerates collapse

### Breaking Strategy

**High-leverage interventions:**

1. **Break the loop with hard boundary** (Leverage Point #5: Rules)
   - No work after 6pm, ever
   - No weekend work, period
   - Two weeks complete disconnect annually
   - Enforce with accountability (tell others, automatic shutdowns)

2. **Change the paradigm** (Leverage Point #2: Paradigm)
   - From: "More hours = more output"
   - To: "Rested hours = effective hours"
   - Recognition: One good hour > three tired hours

3. **Shift the constraint** (Theory of Constraints)
   - From: Maximize hours worked
   - To: Maximize output per rested hour
   - Invest in recovery, not endurance

4. **Weaken feedback loop strength** (Leverage Point #7)
   - Raise rates → need fewer hours for same income
   - Drop low-value clients → reduce work intensity
   - Build passive income → reduce dependency on hourly work

### Second-Order Effects to Expect

**Immediate (first week):**
- Anxiety about "not doing enough"
- Guilt about boundaries
- Client pushback

**Medium-term (weeks 2-4):**
- Work quality improves noticeably
- Complete more in less time
- Energy levels start recovering

**Long-term (months):**
- Higher-quality work attracts better clients
- Better clients respect boundaries
- Virtuous cycle replaces vicious cycle

---

## Archetype 2: Attention Death Spiral (Reinforcing - Collapse)

### Structure

```
Number of active projects (+) → Attention fragmentation
Fragmentation (-) → Progress per project
Low progress → Frustration
Frustration → Abandon projects or add new ones
```

**Loop type:** Reinforcing (accelerating collapse)\
**Time signature:** Visible within days, critical in weeks

### Recognition Criteria

**You're in this loop when:**
- Constantly starting new projects before finishing others
- Every project feels stalled
- Context-switching exhaustion
- Can't remember where you left off on each project
- "Just one more project will fix everything"

**Manifestations:**
- Technical: Multiple codebases all half-finished
- Business: Exploring several product ideas simultaneously
- Learning: Started five courses, finished none

### Why Standard Solutions Fail

**"Better time management"** - Can't manage attention into existence\
**"Just focus"** - Doesn't address structural problem\
**"Work harder on all of them"** - Worsens fragmentation

### Breaking Strategy

**High-leverage interventions:**

1. **Change the constraint** (Theory of Constraints)
   - Recognize: Attention is THE scarce resource
   - Constraint determines throughput
   - Multiple projects = fractional attention each
   - One project = full attention

2. **Serial, not parallel** (System structure change)
   - Choose ONE project
   - Complete it
   - Use success momentum for next project
   - Resist temptation to parallelize

3. **Make the cost visible** (Leverage Point #6: Information)
   - Track context-switch count daily
   - Log actual progress on each project
   - Calculate: "If all attention went to ONE project, where would it be?"
   - Visibility creates motivation to consolidate

4. **Create project completion incentive** (Leverage Point #5: Rules)
   - Rule: Can't start new project until current one ships or killed
   - Rule: Maximum 2 active projects (1 main, 1 background)
   - "Killed" means explicitly documented why, not abandoned

### Second-Order Effects to Expect

**Immediate:**
- Anxiety about "abandoning" other projects
- FOMO on new ideas
- Pressure from others expecting progress on multiple fronts

**Medium-term:**
- ONE project actually ships
- Feeling of completion/momentum
- Confidence from finishing something

**Long-term:**
- Track record of completed projects
- Better ability to evaluate which projects worth starting
- Serial success habit replaces parallel stagnation

---

## Archetype 3: Technical Debt Compound Interest (Reinforcing - Acceleration)

### Structure

```
Skip quality practices → Ship faster (short-term)
Fast shipping → Technical debt accumulates
Debt accumulation → Maintenance burden increases
Maintenance burden → Less time for quality practices
Less quality practices → More debt (reinforcing)
```

**Loop type:** Reinforcing (exponential growth)\
**Time signature:** Invisible initially, then sudden crisis

### Recognition Criteria

**You're in this loop when:**
- "Just this once" happened many times
- Spend more time debugging than building
- Fear making changes (unknown ripple effects)
- Velocity slowing despite working more
- New features break old features

**Debt manifestations:**
- No tests → can't refactor safely
- No documentation → can't remember decisions
- Copy-paste code → fix in 5 places or miss some
- Hardcoded values → configuration hell

### Why Standard Solutions Fail

**"We'll fix it later"** - Later never comes, debt compounds\
**"Rewrite from scratch"** - Usually fails, debt follows you\
**"Freeze features, clean up"** - Rarely get permission/discipline

### Breaking Strategy

**High-leverage interventions:**

1. **Add balancing loop** (Leverage Point #8: Strengthen negative feedback)
   - Hard quality gates: Tests must pass to deploy
   - Code review required: Debt visible before merge
   - Technical debt tracking: Make cost visible
   - These create resistance to debt accumulation

2. **Change the goal** (Leverage Point #3)
   - From: "Ship features fast"
   - To: "Ship features that stay shipped"
   - Reframe: Bugs are unshipped features

3. **Pay interest before principal** (TOC: Exploit constraint)
   - Don't try to pay down all debt
   - Identify which debt costs most velocity
   - Pay that debt first
   - Continue with new features, but with quality gates

4. **Make debt visible** (Leverage Point #6: Information)
   - Dashboard showing test coverage
   - Time-to-implement trending up? (debt signal)
   - Bug count trending up? (debt signal)
   - Visibility creates pressure to address

### Second-Order Effects to Expect

**Immediate:**
- Slowdown in feature delivery (painful)
- Pushback from stakeholders wanting features
- Temptation to skip quality gates "just this once"

**Medium-term:**
- Velocity stabilizes then improves
- Confidence in making changes increases
- Fewer production issues

**Long-term:**
- Compound interest works FOR you (good practices compound)
- New features don't break old features
- Codebase becomes asset, not liability

---

## Archetype 4: Revenue Trap (Balancing - Resistance to Change)

### Structure

```
Need income → Take any client
Any client → Some are bad clients
Bad clients → Consume all time
All time consumed → Can't build products
Can't build products → Still need income
Still need income → Take any client (trapped)
```

**Loop type:** Balancing (maintains undesired state)\
**Time signature:** Stable but unsatisfying indefinitely

### Recognition Criteria

**You're in this loop when:**
- Know you should build products but "can't afford to"
- Every month same cycle: client work fills all time
- Want to fire bad clients but need the money
- Trajectory is flat despite working hard
- "Just one more client month then I'll start the product"

**Trap mechanism:** Immediate income need creates balancing loop that prevents long-term income building.

### Why Standard Solutions Fail

**"Save money first"** - Client work prevents saving time for product\
**"Work nights/weekends on product"** - Leads to Burnout Loop\
**"Quit clients cold turkey"** - Usually not financially viable

### Breaking Strategy

**High-leverage interventions:**

1. **Change the paradigm** (Leverage Point #2)
   - From: "Security = client income"
   - To: "Security = diversified income"
   - Recognition: Client dependency is risk, not safety

2. **Create asymmetric bet** (Exploit constraint)
   - Allocate 10% time to product (1 day per 2 weeks)
   - Small enough to be sustainable
   - Large enough to make real progress over months
   - Protect this time absolutely

3. **Raise rates significantly** (Leverage Point #12: Parameters, but combined with goal shift)
   - 2x current rates
   - Lose half the clients
   - Same income, half the time
   - Use freed time for product
   - Raises filter bad clients automatically

4. **Change client filter rules** (Leverage Point #5)
   - Minimum project size
   - Payment terms favorable to you
   - Compatibility with your schedule (no weekends, etc.)
   - Fewer, better clients > many poor clients

### Second-Order Effects to Expect

**Immediate:**
- Fear about losing clients
- Income dip possible (if rate increase loses clients)
- Guilt about not maximizing short-term income

**Medium-term:**
- Better clients respect boundaries
- Product starts taking shape
- Confidence in product viability emerges
- Optionality increases

**Long-term:**
- Product generates income (even if small)
- No longer dependent on any single client
- Can choose clients strategically
- Virtuous cycle: good work → referrals → better clients

---

## Archetype 5: Quality-Speed Tradeoff (Balancing - Oscillation)

### Structure

```
Pressure to ship fast → Cut quality
Low quality → Problems emerge
Problems → Fix problems (slower delivery)
Slow delivery → Pressure to ship fast (restart cycle)
```

**Loop type:** Balancing (oscillates between extremes)\
**Time signature:** Oscillation period: weeks to months

### Recognition Criteria

**You're in this loop when:**
- Alternating between "ship anything" and "fix everything"
- Swinging between "move fast" and "be careful"
- Never finding sustainable middle ground
- Team/clients complain about both speed AND quality

**Oscillation pattern:**
1. Ship fast → quality problems
2. Fix quality → shipping slows
3. Pressure builds → ship fast again
4. Repeat indefinitely

### Why Standard Solutions Fail

**"Just find the right balance"** - Doesn't address structural oscillation\
**"Be consistent"** - Pressure forces swing back\
**"Set standards"** - Standards relaxed under pressure

### Breaking Strategy

**High-leverage interventions:**

1. **Change the goal** (Leverage Point #3)
   - From: "Maximize shipping speed OR quality"
   - To: "Optimize for sustainable velocity"
   - Recognize: Velocity = speed × quality
   - Low quality destroys speed eventually

2. **Add stock buffer** (Leverage Point #11)
   - Build quality buffer BEFORE pressure hits
   - High test coverage = buffer against bugs
   - Documentation = buffer against confusion
   - Technical health = buffer against slowdown
   - Buffer absorbs pressure without compromising quality

3. **Strengthen quality feedback loop** (Leverage Point #8)
   - Automated quality gates
   - Can't merge without tests
   - Can't deploy without review
   - Make quality non-negotiable (removes decision fatigue)

4. **Shorten feedback delays** (Leverage Point #9)
   - Continuous deployment (find problems fast)
   - Automated testing (immediate quality signal)
   - User feedback channels (catch issues early)
   - Shorter feedback = less oscillation

### Second-Order Effects to Expect

**Immediate:**
- Slower shipping initially (building buffers)
- Resistance to process overhead
- Pressure to skip quality steps "just this once"

**Medium-term:**
- Oscillation amplitude decreases
- More predictable velocity
- Fewer fire drills and crisis fixes

**Long-term:**
- Sustainable pace becomes default
- High quality enables high speed (not opposes it)
- Compounding returns: good code → faster development

---

## Archetype 6: Success to Failure Transition (Balancing - Goal Shifting)

### Structure

```
Success → Increased demand
Demand → Work expands
Expansion → Quality/attention dilutes
Dilution → Success metrics decline
Decline → Pressure to restore success
Pressure → Work expands more (worsens problem)
```

**Loop type:** Balancing (resists maintaining success)\
**Time signature:** Success → failure over months/years

### Recognition Criteria

**You're in this loop when:**
- "Victim of own success"
- What made you successful now breaking down
- Can't keep up with demand success created
- Quality declining despite working harder
- Customers who loved you now complaining

**Examples:**
- Successful product → too many feature requests → product becomes bloated
- Popular freelancer → too many clients → quality drops → reputation suffers
- Viral content → pressure to produce more → quality drops → engagement falls

### Why Standard Solutions Fail

**"Work harder"** - Already working hard, that's the problem\
**"Hire help"** - New constraint (management), same pattern\
**"Say no to growth"** - Resists market opportunity

### Breaking Strategy

**High-leverage interventions:**

1. **Change the paradigm about success** (Leverage Point #2)
   - From: "Success = growth in volume"
   - To: "Success = sustainable impact"
   - Recognition: Scaling breaks systems designed for small scale

2. **Add explicit capacity limit** (Leverage Point #11: Buffer)
   - Set hard limit on projects/clients/commitments
   - Build waitlist instead of overcommit
   - Increase prices instead of volume
   - Constraint as strategy, not failure

3. **Change business model** (Leverage Point #10: Structure)
   - From: Linear (more clients = more work)
   - To: Leveraged (products, content, automation)
   - Structure enables growth without proportional work

4. **Systematize the success factors** (Leverage Point #4: Self-organization)
   - Document what makes work successful
   - Create systems/checklists that maintain quality
   - Make excellence repeatable, not heroic
   - System maintains standards when demand increases

### Second-Order Effects to Expect

**Immediate:**
- Anxiety about "leaving money on table"
- Pressure from market to accept all demand
- Short-term revenue slower than it could be

**Medium-term:**
- Quality maintained despite demand
- Premium positioning (exclusivity)
- Better customer satisfaction (sustainable service)

**Long-term:**
- Success sustainable long-term
- Reputation for quality remains strong
- Growth creates virtuous cycles not vicious ones

---

## Cross-Archetype Patterns

### Reinforcing Loops (Collapse Spirals)
- Burnout Loop
- Attention Death Spiral
- Technical Debt Compound

**Common breaking strategy:** Add balancing loop or break the reinforcing loop entirely.

### Balancing Loops (Trapped States)
- Revenue Trap
- Quality-Speed Oscillation
- Success-to-Failure

**Common breaking strategy:** Change the goal/paradigm that creates the balancing loop.

---

## Archetype Selection Guide

**Use this reference when:**
- Facing recurring problem despite multiple "fixes"
- Problem has cycles or patterns over time
- Simple solutions haven't worked
- Feeling "trapped" or stuck in pattern

**Pattern recognition process:**
1. Map the feedback loop structure
2. Identify loop type (reinforcing or balancing)
3. Match to archetype
4. Apply breaking strategy from archetype
5. Predict second-order effects

**Integration with other frameworks:**
- Archetypes reveal WHAT pattern you're in
- Leverage Points reveal WHERE to intervene
- Theory of Constraints reveals WHICH constraint to address
- Cynefin reveals HOW to approach (probe vs analyze vs act)

---

Return to SKILL.md for core analysis process and integration with other skills.
