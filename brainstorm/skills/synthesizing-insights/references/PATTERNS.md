# Cross-Domain Pattern Library

Use these patterns as candidate explanations, not templates that the evidence must fit. Apply SKILL.md's provenance and boundary checks. Personal-system examples do not establish a diagnosis of a user, and recurring vocabulary does not establish a shared causal mechanism.

## Table of Contents

1. [Structural Patterns](#structural-patterns)
2. [Process Patterns](#process-patterns)
3. [Transformation Patterns](#transformation-patterns)
4. [Economic Patterns](#economic-patterns)
5. [Constraint Patterns](#constraint-patterns)
6. [System Patterns](#system-patterns)
7. [Problem Cluster Patterns](#problem-cluster-patterns)
8. [Pattern Recognition Strategies](#pattern-recognition-strategies)

---

## Structural Patterns

Patterns based on organizational or relational structure.

### Hub-and-Spoke

**Structure:** Central node connected to many peripheral nodes; peripheral nodes rarely connect directly.

**Examples:**
- Airlines: Hub airports connecting to spoke airports
- Organizations: Central office with regional branches
- Social networks: Influencers with large follower bases
- Supply chains: Central distribution centers

**Characteristics:**
- Efficient for central coordination
- Single point of failure risk
- Unequal power distribution
- Economies of scale at hub

**When to look for this pattern:** Centralized distribution or coordination problems.

---

### Network Effects

**Structure:** Value increases with number of participants; each new participant benefits existing participants.

**Examples:**
- Communication platforms: More users = more valuable
- Marketplaces: More buyers attract sellers, more sellers attract buyers
- Standards: More adopters make standard more valuable
- Languages: More speakers make language more useful

**Characteristics:**
- Winner-take-all or winner-take-most dynamics
- High barriers to entry once established
- Initial users bear higher costs for lower value
- Tipping points where adoption accelerates

**When to look for this pattern:** Platform businesses, standards adoption, community growth.

---

### Layered Architecture

**Structure:** System organized in hierarchical layers; each layer builds on layer below and provides services to layer above.

**Examples:**
- Software: Operating system → middleware → applications
- Organizations: Front-line → middle management → executives
- Education: Elementary → secondary → higher education
- Protocol stacks: Physical → data link → network → transport → application

**Characteristics:**
- Abstraction and encapsulation at each layer
- Changes in one layer don't necessarily affect others
- Dependencies flow one direction (usually upward)
- Each layer handles specific concerns

**When to look for this pattern:** Complex systems requiring separation of concerns.

---

## Process Patterns

Patterns based on sequences, workflows, or temporal organization.

### Hypothesis-Test-Refine

**Structure:** Form hypothesis → test hypothesis → analyze results → refine hypothesis → repeat.

**Examples:**
- Scientific method
- Lean Startup (build-measure-learn)
- Debugging (hypothesize bug → test fix → verify)
- A/B testing (hypothesis → experiment → analyze)

**Characteristics:**
- Iterative improvement over time
- Learning from failures
- Explicit testing of assumptions
- Refinement based on feedback

**When to look for this pattern:** Learning processes, optimization problems, uncertainty reduction.

---

### Pipeline / Assembly Line

**Structure:** Linear sequence of stages; output of one stage becomes input to next stage.

**Examples:**
- Manufacturing: Raw materials → processing → assembly → finishing → packaging
- Content creation: Research → drafting → editing → publishing
- Sales: Lead generation → qualification → proposal → closing
- Data processing: Collection → cleaning → transformation → analysis

**Characteristics:**
- Specialization at each stage
- Bottlenecks determine overall throughput
- Buffer inventory between stages
- Sequential dependencies

**When to look for this pattern:** Multi-stage production or transformation processes.

---

### Diverge-Converge

**Structure:** Generate many options (diverge) → evaluate and select (converge).

**Examples:**
- Design thinking: Ideation (diverge) → prototyping → testing (converge)
- Decision-making: Gather options → narrow to finalists → choose
- Evolution: Variation (diverge) → selection (converge)
- Brainstorming: Idea generation → prioritization

**Characteristics:**
- Creativity in divergence phase
- Judgment in convergence phase
- Multiple cycles often needed
- Resist premature convergence

**When to look for this pattern:** Creative processes, decision-making, problem-solving.

---

## Transformation Patterns

Patterns describing common changes or evolutions.

### Analog to Digital

**Structure:** Continuous/physical → discrete/digital representation.

**Examples:**
- Media: Film → digital photography; vinyl → MP3
- Communication: Letters → email; phone booths → mobile phones
- Money: Cash → digital payments
- Records: Paper files → databases

**Characteristics:**
- Lossless copying becomes possible
- Distribution costs approach zero
- New capabilities emerge (search, remix, automation)
- Control and authenticity challenges increase

**When to look for this pattern:** Industry disruption, technology adoption, media evolution.

---

### Episodic to Continuous

**Structure:** Infrequent discrete events → ongoing continuous process.

**Examples:**
- Services: Annual checkups → continuous health monitoring
- Software: Periodic releases → continuous deployment
- Learning: Batch education → continuous learning
- Maintenance: Scheduled maintenance → predictive maintenance

**Characteristics:**
- Relationships shift from transactional to ongoing
- Data enables prediction and prevention
- Business models shift from per-event to subscription
- Feedback loops tighten

**When to look for this pattern:** Service businesses, monitoring systems, relationship changes.

---

### Centralized to Distributed

**Structure:** Single controlling entity → multiple autonomous entities.

**Examples:**
- Computing: Mainframes → personal computers → cloud
- Organizations: Command-and-control → autonomous teams
- Media: Broadcast → user-generated content
- Energy: Central power plants → distributed solar

**Characteristics:**
- Reduces single points of failure
- Increases resilience and adaptability
- Coordination becomes harder
- Local optimization vs. global optimization trade-offs

**When to look for this pattern:** Organizational change, technology evolution, power distribution.

---

## Economic Patterns

Patterns related to business models and economic structures.

### Two-Sided Market

**Structure:** Platform intermediates between two distinct user groups; value for each group depends on the other.

**Examples:**
- Payment cards: Merchants and consumers
- Job platforms: Employers and job seekers
- Dating apps: Different gender groups
- Advertising: Content creators and advertisers

**Characteristics:**
- Chicken-and-egg problem at launch
- Pricing strategies balance both sides
- Network effects on each side
- Platform captures value from transactions

**When to look for this pattern:** Marketplace businesses, platform economics.

---

### Freemium

**Structure:** Basic offering free, premium features paid.

**Examples:**
- Software: Free tier + paid tiers (Dropbox, Spotify)
- Games: Free to play + in-app purchases
- Content: Limited free access + subscription (news sites)
- Services: Free basic + paid advanced

**Characteristics:**
- Free tier drives adoption
- Conversion rate from free to paid critical
- Free users create value (content, network effects)
- Careful balance of free vs. paid features

**When to look for this pattern:** Digital products, low marginal costs, network effects.

---

### Razor-and-Blades

**Structure:** Sell durable good cheaply, make profit on consumables.

**Examples:**
- Printers: Cheap printers, expensive ink cartridges
- Gaming: Consoles at low margin, profit on games
- Coffee machines: Machine subsidized, profit on pods
- Cell phones: Subsidized phones, profit on service plans

**Characteristics:**
- Lock-in after initial purchase
- Recurring revenue from consumables
- Initial sale may be at loss (loss leader)
- Customer lifetime value exceeds initial cost

**When to look for this pattern:** Hardware + consumables businesses, recurring revenue models.

---

## Constraint Patterns

Patterns based on limitations and trade-offs.

### CAP Theorem Structure

**Structure:** You can have at most two of three desirable properties; optimizing one weakens others.

**Examples:**
- Distributed systems: Consistency, Availability, Partition tolerance (pick 2)
- Projects: Fast, Cheap, Good (pick 2)
- Products: Features, Simplicity, Performance (trade-offs required)
- Services: Personalized, Scalable, Affordable (tensions exist)

**Characteristics:**
- Fundamental trade-offs, not just implementation challenges
- Optimizing for one dimension reduces others
- Different use cases prioritize differently
- Acknowledge trade-offs rather than deny them

**When to look for this pattern:** System design, product decisions, resource allocation.

---

### Scaling Constraints

**Structure:** Approach that works at small scale breaks at large scale.

**Examples:**
- Organizations: Informal communication → formal processes needed
- Software: Single server → distributed systems
- Manufacturing: Handcraft → assembly line
- Communities: Everyone knows everyone → hierarchies and subgroups

**Characteristics:**
- Successful growth creates new problems
- Solutions at one scale don't transfer to another
- Non-linear effects as scale changes
- Phase transitions at certain thresholds

**When to look for this pattern:** Growth challenges, scalability problems.

---

## System Patterns

Patterns involving feedback, dynamics, and complex interactions.

### Tragedy of the Commons

**Structure:** Shared resource, individual incentive to exploit, collective outcome is resource depletion.

**Examples:**
- Fisheries: Overfishing depletes fish stocks
- Climate: Individual emissions, collective climate change
- Shared spaces: Individual littering, collective degradation
- Attention: Individual content optimization, collective information overload

**Characteristics:**
- Individual rationality leads to collective irrationality
- Delayed consequences enable overexploitation
- Coordination or governance needed to prevent collapse
- Free rider problem

**When to look for this pattern:** Resource management, collective action problems, sustainability.

---

### Fixes That Fail

**Structure:** Quick fix addresses symptom, not root cause. Problem returns, often worse. Reliance on fix increases.

**Examples:**
- Firefighting: Constant crisis response prevents preventive work
- Technical debt: Quick hacks accumulate, eventually causing bigger problems
- Addiction: Substance solves immediate discomfort, creates long-term dependency
- Bailouts: Rescue prevents pain, encourages risky behavior

**Characteristics:**
- Short-term relief, long-term harm
- Fundamental solution is neglected or atrophied
- System becomes dependent on fix
- Breaking the cycle requires short-term pain

**When to look for this pattern:** Recurring problems, symptomatic solutions, dependencies.

---

### Reinforcing Feedback

**Structure:** Change amplifies itself through feedback loop.

**Examples:**
- Virtuous cycles: Success → confidence → better performance → more success
- Vicious cycles: Stress → poor sleep → more stress
- Network effects: More users → more value → more users
- Wealth concentration: Capital → returns → more capital

**Characteristics:**
- Exponential growth or decline
- Small initial differences become large over time
- Self-sustaining once started
- Intervention needed to stop runaway processes

**When to look for this pattern:** Growth dynamics, vicious/virtuous cycles, compounding effects.

---

## Problem Cluster Patterns

Patterns where multiple problems appear together.

### Resource Depletion Cluster

**Structure:** Multiple symptoms of unsustainable extraction without replenishment.

**Examples:**
- Personal: Burnout + isolation + lack of direction
- Environmental: Soil depletion + water shortage + biodiversity loss
- Organizational: Employee turnover + low morale + declining quality
- Economic: Wage stagnation + debt accumulation + reduced investment

**Characteristics:**
- Problems appear together, not randomly
- Share common root cause (resource extraction > replenishment)
- Addressing individual symptoms doesn't fix system
- Requires addressing extraction/replenishment balance

**When to look for this pattern:** Multiple correlated problems, systemic issues.

---

### Complexity Spiral

**Structure:** System complexity increases over time as exceptions and edge cases accumulate.

**Examples:**
- Code: Feature additions → increasing complexity → harder to change → more patches → more complexity
- Regulations: New rules → exceptions needed → more rules → more exceptions
- Processes: Additional steps → workarounds → more steps → more workarounds
- Products: Feature bloat → UI complexity → more features to address complexity

**Characteristics:**
- Incremental additions seem reasonable individually
- Cumulative effect is overwhelming complexity
- Refactoring/simplification becomes increasingly difficult
- Eventually requires restart or major restructuring

**When to look for this pattern:** Growing complexity, technical debt, process bloat.

---

## Pattern Recognition Strategies

### How to Identify Patterns in New Situations

**1. Ask structural questions**
- What relates to what?
- What causes what?
- What depends on what?
- What reinforces or balances what?
- What sequences repeat?

**2. Look for familiar shapes**
- Does this structure appear in other domains you know?
- What other systems have similar organization?
- What analogies come to mind?

**3. Test multiple abstractions**
- Describe the situation at different levels of abstraction
- Which level reveals patterns most clearly?
- What's lost and gained at each abstraction level?

**4. Search for common outcomes**
- What problems appear together consistently?
- What transformations follow similar paths?
- What failures have similar root causes?

**5. Use temporal patterns**
- What sequences repeat over time?
- What feedback loops exist?
- Where are delays between action and effect?

### Pattern Validation

Once you've identified a candidate pattern:

**1. Test coverage:** Does the pattern explain all examples, or just some?

**2. Seek counter-examples:** Can you find cases that break the pattern?

**3. Check abstraction level:** Is pattern too specific (won't transfer) or too abstract (not useful)?

**4. Verify causation:** Does pattern identify real causal relationships or just correlations?

**5. Assess utility:** Does recognizing this pattern enable action or just provide description?

### Building Your Own Pattern Library

As you conduct synthesis, capture patterns you discover:

**Pattern template:**
- **Name:** Memorable label
- **Structure:** Core relationships or mechanism
- **Examples:** Concrete instances across domains
- **Characteristics:** Key properties and features
- **Recognition cues:** How to spot this pattern
- **Applicability:** When does this pattern apply or not apply?
- **Implications:** What follows from recognizing this pattern?

Over time, your pattern library becomes a powerful tool for rapid synthesis across domains.
