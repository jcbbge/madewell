# Blind Spot Detection Frameworks

Use only a relevant coverage lens under SKILL.md's evidence and scope rules. Questions are investigative prompts, not a required interview. A simulated perspective or omitted mention is not proof of a real person's motives or an actual omission. Verify the historical citations below before treating them as sources.

## Table of Contents
1. [Johari Window Framework](#johari-window-framework)
2. [Pre-Mortem Technique](#pre-mortem-technique)
3. [Red Team Thinking](#red-team-thinking)
4. [Devil's Advocate Methodology](#devils-advocate-methodology)
5. [Cognitive Bias Framework](#cognitive-bias-framework)

---

## Johari Window Framework

**Source:** Luft, J., & Ingham, H. (2024). *The Johari Window: A Model for Interpersonal Awareness*

### Core Concept
The Johari Window divides awareness into four quadrants based on what is known/unknown to self and others:

```
                Known to Self    Unknown to Self
Known to Others    OPEN AREA       BLIND SPOT
Unknown to Others  HIDDEN AREA     UNKNOWN
```

### Application to AI Collaboration

**Open Area** - What both human and AI understand
- Explicitly stated goals, constraints, preferences
- Shared context and background
- Acknowledged assumptions

**Blind Spot** - What AI can see but human cannot
- Unstated assumptions human is taking for granted
- Patterns in behavior human doesn't recognize
- Contradictions between stated goals and actions
- Missing perspectives human hasn't considered

**Hidden Area** - What human knows but hasn't shared
- Emotional factors being rationalized away
- Concerns not yet articulated
- Past experiences influencing current decisions
- Underlying motivations

**Unknown Area** - What neither human nor AI has considered
- Emergent risks from system interactions
- Future scenarios neither anticipated
- Knowledge gaps both parties share
- External factors neither is tracking

### How AI Uses This

**Expanding the Open Area:**
- Surface blind spots through careful questioning
- Encourage sharing of hidden information through safety
- Probe the unknown through scenario exploration

**Blind Spot Detection Specific Techniques:**
- Notice what's conspicuously absent from discussion
- Identify patterns human may not see in their own behavior
- Compare stated intentions with implicit actions
- Surface assumptions being taken as givens

---

## Pre-Mortem Technique

**Source:** Klein, G. J. (2024). *Performing a Project Pre-Mortem*

### Core Concept
Imagine the project has failed catastrophically. Work backward to identify what caused the failure. This makes it psychologically safe to identify risks that might otherwise be ignored.

### The Pre-Mortem Process

**Step 1: Set the scene**
"It's [future date]. The project has failed spectacularly. It's a complete disaster."

**Step 2: Generate failure scenarios**
"What happened? Why did it fail?"
- Individual brainstorming first
- No censorship or filtering
- Specific, concrete failure modes

**Step 3: Consolidate and prioritize**
- Group similar failure modes
- Identify most likely causes
- Rank by probability and impact

**Step 4: Develop preventive strategies**
- For each major failure mode, create prevention plan
- Assign owners and timelines
- Build in monitoring and early warning systems

### Application to Blind Spot Detection

**Temporal blindness:** Forces consideration of future states

**Assumption mapping:** Exposes assumptions about what "should" work

**Risk identification:** Surfaces risks being minimized or ignored

**Permission to dissent:** Makes it safe to voice concerns

### AI Implementation Pattern

When appropriate (major decisions, high stakes):
1. Propose pre-mortem: "Would it be useful to imagine this has failed?"
2. If yes, guide through failure scenario generation
3. Surface the blind spots revealed by each failure mode
4. Help translate into preventive actions

**Example:**
User planning major migration to VPS

Pre-mortem prompt: "It's 6 months from now. The VPS migration was a disaster and you've had to move back to managed hosting. What happened?"

Likely blind spots revealed:
- Underestimated time for unexpected issues
- Didn't account for mental health fluctuations
- Backup and monitoring gaps
- Security vulnerabilities from DIY approach
- Hidden costs (time, stress, opportunity cost)

---

## Red Team Thinking

**Source:** Clarke, R. A., & Knake, R. K. (2023). *Red Team: How to Succeed By Thinking Like the Enemy*

### Core Concept
Adopt an adversarial perspective to identify vulnerabilities, weaknesses, and attack vectors. Originally from military/security but applicable to any domain.

### Red Team Principles

**1. Challenge assumptions systematically**
- What if the opposite were true?
- What are we taking for granted?
- What would break if this assumption is wrong?

**2. Think like the adversary**
- Technical projects: What could go wrong? What will break?
- Business: What would competitors do? What do users hate?
- Personal: What does future-you with different constraints think?

**3. Identify single points of failure**
- What has to go right for this to work?
- Where are the brittle dependencies?
- What happens if that one thing fails?

**4. Surface resource constraints**
- Time: What if this takes 3x longer?
- Energy: What if you burn out?
- Money: What if costs are 2x projections?
- Attention: What else competes for focus?

### Application to Blind Spot Detection

**Perspective shifting:** Forces consideration of adversarial or alternative views

**Risk identification:** Systematically hunts for vulnerabilities

**Assumption challenge:** Questions everything being taken for granted

### AI Implementation Pattern

Adopt red team perspective when:
- High-stakes decisions
- User seems overly confident
- Plan has brittle dependencies
- Groupthink risk (everyone agrees)

Red team questions:
- "What would break this?"
- "What are you assuming has to be true?"
- "What would make this impossible?"
- "If I wanted this to fail, how would I make that happen?"

**Example:**
User confident about learning path for new framework

Red team: "Let's think adversarially. What could derail this learning plan?"
- Life events (sick, family, work deadline)
- Motivation drops (initial enthusiasm fades)
- Framework changes (docs outdated)
- Prerequisites missing (assumed knowledge gaps)
- Time optimism (learning takes 2x as long)

---

## Devil's Advocate Methodology

**Source:** Nemeth, C. J., et al. (2024). "The Psychology of Devil's Advocacy and Dissent"

### Core Concept
Systematic challenge and dissent improve decision quality by forcing deeper consideration of alternatives and assumptions. Critical thinking muscle that prevents groupthink.

### Devil's Advocate Principles

**1. Legitimate the dissent**
"I'm going to play devil's advocate here" signals constructive challenge, not attack

**2. Challenge assumptions, not people**
Focus on ideas, logic, evidence - not the person or their competence

**3. Provide alternative perspectives**
Don't just criticize - offer different ways of thinking about the problem

**4. Strengthen through challenge**
Goal is to improve the decision, not win an argument

### When Devil's Advocate is Most Valuable

**Groupthink conditions:**
- Everyone agrees too easily
- Pressure to conform
- Illusion of invulnerability
- Self-censorship of doubts

**High-stakes decisions:**
- Irreversible or expensive
- Long-term consequences
- Multiple stakeholders affected

**Novel situations:**
- Limited precedent
- High uncertainty
- Many unknowns

### Application to Blind Spot Detection

**Assumption challenge:** "But what if we're wrong about X?"

**Alternative framing:** "What if we looked at this as Y instead of X?"

**Risk surfacing:** "What could go wrong that we're not discussing?"

**Stakeholder perspective:** "What would [other party] say about this?"

### AI Implementation Pattern

**Delivery approach:**
1. Signal the challenge: "Let me play devil's advocate"
2. Frame as helping strengthen the plan
3. Ask questions that reveal blind spots
4. Offer alternative perspectives
5. Return to collaborative mode

**Example:**
User: "I'll build this feature to attract users"

Devil's advocate: "Let me challenge that assumption. What if the problem isn't feature gaps but discovery? How will users find out this feature exists? And even if they discover it, what makes you confident they want it enough to switch from current solutions?"

---

## Cognitive Bias Framework

**Source:** Kahneman, D., & Tversky, A. (2024). "AI-Augmented Judgment: Enhancing Human Decision Making"

### Core Biases Creating Blind Spots

**Confirmation Bias**
- Seeking information that confirms existing beliefs
- Ignoring or dismissing contradictory evidence
- AI counter: Surface evidence against the plan

**Availability Bias**
- Overweighting easily recalled information
- Recent or vivid events seem more likely
- AI counter: Broaden the reference class, surface base rates

**Planning Fallacy**
- Systematic underestimation of time, costs, risks
- Overconfidence in ability to execute
- AI counter: Reference past performance, add buffers

**Sunk Cost Fallacy**
- Continuing because of past investment
- Ignoring that past costs are irrelevant to future decisions
- AI counter: Focus on forward-looking costs and benefits

**Optimism Bias**
- Believing you're less likely than others to experience negative events
- Underestimating risks and obstacles
- AI counter: Pre-mortem, red team thinking

**Present Bias**
- Overweighting immediate costs/benefits
- Underweighting future consequences
- AI counter: Temporal perspective (6 months, 1 year, 2 years)

**Framing Effects**
- Different presentations of same information yield different decisions
- Blind to how the framing influences the choice
- AI counter: Reframe the question, offer alternative framings

### AI Application Strategy

**Detection patterns:**
- Watch for language indicating certainty without evidence
- Notice absence of downside consideration
- Identify time/cost estimates without justification
- Spot pattern of discounting contrary information

**Intervention approaches:**
- Gentle: "Have you considered the opposite might be true?"
- Moderate: "What evidence would change your mind?"
- Strong: "Let's do a systematic bias check here"

**Validation:**
- Not every bias is active in every situation
- Ask: "Am I seeing a bias or a legitimate difference in values/priorities?"
- Calibrate intensity to stakes and evidence

---

## Integration: Using Multiple Frameworks

The frameworks complement each other:

**Johari Window** → Identifies where blind spots live (quadrants)
**Pre-Mortem** → Surfaces temporal blind spots (future failure)
**Red Team** → Challenges assumptions and identifies vulnerabilities
**Devil's Advocate** → Creates space for constructive dissent
**Cognitive Bias** → Explains why blind spots persist

### Combined Application Example

User planning to build and launch SaaS product solo:

**Johari Window:** Identify open vs. blind spots
- Open: Technical capability, desire for independence
- Blind: Customer development gap, go-to-market assumptions
- Hidden: Fear of hiring/collaborating
- Unknown: Market timing, competitive response

**Pre-Mortem:** "It's 1 year from now. The product launched but failed. Why?"
- No customers found it (discovery problem)
- Few tried it (value proposition unclear)
- Nobody paid (pricing/positioning wrong)
- Couldn't support users (overwhelmed by scale)

**Red Team:** "What would make this impossible?"
- Build takes 3x longer than expected
- Burnout before launch
- Competitor launches similar product first
- Platform changes break core functionality

**Devil's Advocate:** Challenge core assumptions
- "What if 'solo' is the problem, not the solution?"
- "What if you're solving for independence instead of success?"
- "What if technical building is the easy part?"

**Cognitive Bias Check:**
- Planning fallacy: Timeline too optimistic
- Confirmation bias: Only seeing successful solo founders
- Optimism bias: Underestimating market competition
- Present bias: Overweighting building joy, underweighting marketing pain

**Synthesis:** Major blind spots revealed
1. Customer development completely absent from plan
2. Assumption that building = value
3. No go-to-market strategy
4. Solo approach may be emotional not strategic
5. Timeline assumes everything goes right

These frameworks work together to systematically surface what's missing, ignored, or taken for granted. Use them flexibly based on context and stakes.
