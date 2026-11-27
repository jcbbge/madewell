# Challenge-Mode Frameworks & Methodologies

Use only the method needed for the current decision, under SKILL.md's evidence-first and proportionality rules. Questions are prompts to investigate, not a mandatory interview. Numerical scales and examples are illustrative heuristics, not measured probabilities, and do not override binding safety or authorization constraints.

## 1. Failure Mode and Effects Analysis (FMEA) for Strategic Decisions

### Overview
FMEA is a systematic method for identifying potential failure modes and their effects. Originally from engineering, adapted here for indie developer strategic decisions.

### Process

#### Step 1: Decompose the system
Break down the decision/project into components:

Example - VPS Migration:
- Infrastructure setup
- Data migration
- DNS/routing changes
- Monitoring setup
- Backup systems
- Security configuration
- Application deployment

#### Step 2: Identify failure modes
For each component, ask "How can this fail?"

Example:
| Component | Failure Mode |
|-----------|-------------|
| Infrastructure setup | Wrong server specs, incompatible OS |
| Data migration | Data loss, corruption, incomplete transfer |
| DNS/routing | Downtime during switchover, incorrect config |
| Monitoring | Blind spots, alert fatigue, missed incidents |
| Backup systems | Backup failure, untested restore, slow recovery |

#### Step 3: Assess severity
Rate impact if failure occurs (1-10):
- 1-3: Minor inconvenience
- 4-6: Significant disruption
- 7-8: Major business impact
- 9-10: Catastrophic (business-ending)

#### Step 4: Assess probability
Rate likelihood of failure (1-10):
- 1-3: Highly unlikely
- 4-6: Possible
- 7-8: Likely
- 9-10: Almost certain

#### Step 5: Calculate Risk Priority Number (RPN)
RPN = Severity × Probability

Example:
| Failure Mode | Severity | Probability | RPN |
|--------------|----------|-------------|-----|
| Data corruption during migration | 9 | 4 | 36 |
| DNS downtime | 8 | 6 | 48 |
| Backup system untested | 10 | 7 | 70 |

#### Step 6: Prioritize mitigation
Address highest RPN first:

1. **RPN 70: Backup untested** → Test restore process before migration
2. **RPN 48: DNS downtime** → Prepare rollback plan, low-TTL DNS
3. **RPN 36: Data corruption** → Checksum verification, staged migration

### FMEA Template

```
Decision/Project: _______________

Component | Failure Mode | Effect | Severity (1-10) | Probability (1-10) | RPN | Mitigation
----------|--------------|--------|-----------------|-------------------|-----|------------
          |              |        |                 |                   |     |
          |              |        |                 |                   |     |
          |              |        |                 |                   |     |
```

---

## 2. Pre-Mortem Detailed Framework

### Overview
Project into future failure state, then work backward to identify what went wrong. Reveals risks that forward planning misses.

### Full Process

#### Phase 1: Setup (5 minutes)
1. Define the project/decision clearly
2. Set timeline: "It's [X months] from now"
3. State the failure: "The project has failed"
4. Get into mindset: Imagine it vividly

#### Phase 2: Failure Story (10 minutes)
Write the failure narrative:
- What happened?
- How did users/customers react?
- What was the final straw?
- How did you feel?
- What did you lose?

Example:
```
It's 6 months from now. My VPS migration has failed spectacularly.

The server went down during a traffic spike. I was at a conference with
spotty WiFi. By the time I could SSH in, we'd lost 4 hours of uptime.
15 customers churned immediately. The incident revealed that our backup
system wasn't actually working—we discovered this when we needed it most.

I spent the next week firefighting, migrating back to managed hosting at
3x the cost in panic mode. The "95% cost savings" ended up costing us
$15K in lost revenue and emergency migrations. I'm exhausted, customers
are angry, and I'm 6 weeks behind on actual product development.
```

#### Phase 3: Root Cause Analysis (15 minutes)
Work backward from failure:

**What went wrong?**
- Technical failure: Inadequate monitoring, single point of failure
- Resource failure: Underestimated time for ops, no backup availability
- Assumption failure: "It won't break," "I can handle this"
- External shock: Traffic spike during unavailability

**What warning signs did we miss?**
- Never tested backup restore
- No redundancy plan
- Assumed availability during travel
- Didn't account for time cost of operations

**What assumptions proved wrong?**
- "I'll have time to handle incidents"
- "The server won't have issues"
- "Backups are working"
- "Support can wait until I'm back"

#### Phase 4: Preventive Actions (10 minutes)
How could we have prevented this?

1. **Technical:**
   - Comprehensive monitoring before migration
   - Tested backup/restore process
   - Redundancy and failover systems
   - Gradual migration with rollback plan

2. **Resource:**
   - Calculated true time cost
   - Arranged backup support coverage
   - Built operational runbooks
   - Set up emergency contact

3. **Process:**
   - Dry-run migration in staging
   - Load testing before cutover
   - Incident response playbook
   - Regular disaster recovery tests

#### Phase 5: Decision Point (5 minutes)
Given this analysis, what do we do?

- **Proceed with changes** → Implement preventive actions
- **Proceed as planned** → Accept identified risks
- **Modify approach** → Adjust based on findings
- **Cancel/postpone** → Risks too high

### Pre-Mortem Template

```
Project: _______________
Timeline: It's [X months] from now
Status: This has failed

Failure Story:
[Write 2-3 paragraphs describing the failure vividly]

What Went Wrong:
- Technical: _______________
- Resource: _______________
- Assumption: _______________
- External: _______________

Warning Signs We Missed:
- _______________
- _______________
- _______________

Assumptions That Proved Wrong:
- _______________
- _______________
- _______________

Preventive Actions:
1. _______________
2. _______________
3. _______________

Decision: [Proceed/Modify/Cancel] because _______________
```

---

## 3. Inversion Thinking Framework (Munger)

### Overview
Instead of "how do we succeed," ask "how do we fail." Reveals hidden constraints and risks through backward reasoning.

### Process

#### Step 1: State the positive goal
"I want to successfully launch my micro-SaaS and get 100 paying customers in 6 months"

#### Step 2: Invert to negative
"How could I ensure this launch fails and I get zero paying customers?"

#### Step 3: Brainstorm failure paths
What would guarantee failure?

- Build something nobody wants
- Price it at $1000/month when market pays $10
- Make onboarding impossibly complex
- Provide zero documentation
- Ignore all feedback
- Launch with critical bugs
- Never market it or tell anyone
- Build features I want, not what users need
- Make it incompatible with popular tools
- Provide terrible customer support
- Over-promise and under-deliver

#### Step 4: Identify actual risks
Which of these am I actually at risk of?

✗ Price too high - ✓ Research shows $10-15/month range\
✓ Build what I want vs what users need - Risk: I'm excited about features users don't care about\
✓ Never market it - Risk: I hate marketing and will avoid it\
✗ Critical bugs - I test thoroughly\
✓ Complex onboarding - Risk: I understand the domain, users don't\

#### Step 5: Create safeguards
How do we prevent identified risks?

**Risk:** Building features I want vs what users need\
**Safeguard:** Validate with 10 target users before building each major feature

**Risk:** Never marketing\
**Safeguard:** Commit to 2 hours/week on marketing before building more features

**Risk:** Complex onboarding\
**Safeguard:** Have 3 non-experts try onboarding, fix every point of confusion

### Inversion Template

```
Positive Goal: _______________

Inverted Goal (Ensure Failure): _______________

How to Guarantee Failure:
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________

Actual Risks (Which am I vulnerable to?):
✓ _______________
✓ _______________
✗ _______________ (not a real risk)

Safeguards:
Risk: _______________ → Safeguard: _______________
Risk: _______________ → Safeguard: _______________
Risk: _______________ → Safeguard: _______________
```

---

## 4. Red Team Thinking Framework

### Overview
Take adversarial positions to reveal weaknesses: competitor, malicious actor, Murphy's law, market forces.

### Perspectives

#### Competitor Perspective
"If I were a competitor, how would I attack this?"

Questions:
- What's the weakest part of this offering?
- Where are they vulnerable?
- What could I build to make this irrelevant?
- What would make their customers switch to me?
- What are they not doing that customers want?

Example - Micro-SaaS:
```
As competitor:
- I'd offer free tier to undercut their pricing
- I'd integrate with major platforms they don't support
- I'd target their weakest feature with my best feature
- I'd provide 24/7 support to contrast their solo support
- I'd clone their best features and add what they're missing
```

#### Malicious Actor Perspective
"If I wanted to break this intentionally, how would I?"

Questions:
- What's the security weak point?
- Where can I inject bad data?
- What assumptions can I violate?
- What race conditions exist?
- Where's the missing validation?

#### Murphy's Law Perspective
"What can go wrong, will go wrong. What's that?"

Questions:
- What happens at scale?
- What happens under load?
- What happens with bad internet?
- What happens if I'm unavailable?
- What happens with edge case data?

#### Market Forces Perspective
"What external changes would make this obsolete?"

Questions:
- What if the platform changes their API?
- What if regulation changes?
- What if customer needs shift?
- What if new technology emerges?
- What if economic conditions change?

### Red Team Template

```
System/Decision: _______________

Competitor Perspective:
"If I were competing, I would attack by..."
- _______________
- _______________
- _______________

Malicious Actor Perspective:
"If I wanted to break this, I would..."
- _______________
- _______________
- _______________

Murphy's Law Perspective:
"What can go wrong will go wrong..."
- _______________
- _______________
- _______________

Market Forces Perspective:
"External changes that could invalidate this..."
- _______________
- _______________
- _______________

Implications:
1. _______________
2. _______________
3. _______________
```

---

## 5. Steel Man Framework

### Overview
Build the strongest version of an argument before critiquing it. Ensures constructive, not destructive, opposition.

### Process

#### Step 1: Charitable interpretation
What's the best-case interpretation of this idea?

Instead of: "They want to waste time building custom auth"\
Steel-man: "They see auth as core to product differentiation and want control over the user experience"

#### Step 2: Identify genuine strengths
What's actually compelling about this?

Example - Building custom auth:
- Deep understanding of own auth flow
- No vendor lock-in
- Complete customization for specific use case
- Learning opportunity for security practices
- Potential competitive advantage

#### Step 3: State best-case scenario
What would success look like?

"Successfully building custom auth would give you complete control over UX, deep security knowledge, no vendor costs, and unique features competitors can't easily replicate."

#### Step 4: Now challenge constructively
"Here are the risks to consider given these goals..."

- Time investment (3-4 weeks) vs critical path (shipping core features)
- Security complexity (easy to get wrong, high stakes if compromised)
- Ongoing maintenance (security updates, vulnerability patches)
- Opportunity cost (could ship 3 major features in that time)

#### Step 5: Alternative paths
"Here are ways to get the benefits with lower risk..."

- Use battle-tested auth library (Auth0, Clerk) with customization
- Start with simple auth, migrate to custom later if needed
- Use Auth0 but maintain migration path through standards (OAuth)

### Steel Man Template

```
Original Idea: _______________

Charitable Interpretation:
[What's the best-case reading of this?]

Genuine Strengths:
1. _______________
2. _______________
3. _______________

Best-Case Success:
[What would ideal success look like?]

Constructive Challenges:
[Now that we understand the strengths, here are the risks...]
1. _______________
2. _______________
3. _______________

Alternative Paths:
[Ways to get the benefits with lower risk]
1. _______________
2. _______________
3. _______________
```

---

## 6. Decision Matrix Under Uncertainty

### Overview
Systematically evaluate decisions when outcome is uncertain.

### Process

#### Step 1: Define scenarios
What are the possible outcomes?

Example - VPS Migration:
- Best case: 95% cost savings, stable operation
- Expected case: 80% cost savings, occasional issues
- Worst case: Critical failure, expensive emergency migration

#### Step 2: Estimate probabilities
How likely is each scenario?

- Best case: 20% (optimistic, things go perfectly)
- Expected case: 60% (some bumps, but manageable)
- Worst case: 20% (serious problems require bailout)

#### Step 3: Quantify outcomes
What's the impact of each scenario?

| Scenario | Probability | Cost Savings | Time Cost | Risk Cost | Net Value |
|----------|-------------|--------------|-----------|-----------|-----------|
| Best | 20% | +$10K/year | -20 hours | $0 | +$9K |
| Expected | 60% | +$8K/year | -60 hours | -$2K | +$3K |
| Worst | 20% | -$5K | -100 hours | -$15K | -$25K |

#### Step 4: Calculate expected value
EV = (Probability × Outcome) for each scenario, summed

EV = (0.2 × $9K) + (0.6 × $3K) + (0.2 × -$25K)\
EV = $1.8K + $1.8K - $5K = -$1.4K

**Expected value is negative** → Don't proceed without reducing worst-case risk

#### Step 5: Sensitivity analysis
What would need to change for this to be favorable?

- If worst-case probability drops to 5%, EV becomes positive
- If time cost halves, EV becomes positive
- If we have emergency backup plan, worst case less severe

### Decision Matrix Template

```
Decision: _______________

Scenarios:
- Best case: _______________
- Expected case: _______________
- Worst case: _______________

Probability Estimates:
- Best: _____%
- Expected: _____%
- Worst: _____%

Quantified Outcomes:
| Scenario | Probability | Benefit | Cost | Net |
|----------|-------------|---------|------|-----|
| Best     |             |         |      |     |
| Expected |             |         |      |     |
| Worst    |             |         |      |     |

Expected Value: _______________

Decision: [Proceed/Don't Proceed] because _______________

Sensitivity Analysis:
What would need to change for this to be favorable?
- _______________
- _______________
```

---

## 7. Multi-Perspective Challenge Framework

### Overview
Challenge from multiple viewpoints to avoid single-perspective blind spots.

### Perspectives for Indie Developers

#### Technical Perspective
- How does this break technically?
- What's the failure mode?
- What doesn't scale?
- What's the technical debt cost?
- Where's the complexity hiding?

#### Business Perspective
- How does this fail commercially?
- What's the market risk?
- Can we monetize this?
- What's the competitive threat?
- Is this defensible?

#### User Perspective
- How does this frustrate users?
- What's confusing?
- What creates support burden?
- Where's the friction?
- What do they actually want vs what we think they want?

#### Operational Perspective
- What's the maintenance burden?
- What breaks at 3am?
- What requires manual intervention?
- What's the support load?
- What happens when I'm unavailable?

#### Personal Perspective
- How does this impact my wellbeing?
- Is this sustainable?
- Am I excited about this long-term?
- Does this align with my goals?
- What's the opportunity cost?

### Multi-Perspective Template

```
Decision: _______________

Technical: _______________
[How does this break technically?]

Business: _______________
[How does this fail commercially?]

User: _______________
[How does this frustrate users?]

Operational: _______________
[What's the maintenance burden?]

Personal: _______________
[How does this impact wellbeing?]

Synthesis:
Most critical perspective: _______________
Why: _______________
Action: _______________
```

---

## Usage Guidelines

### When to use which framework:

**FMEA** - Complex technical decisions, infrastructure changes, architecture choices\
**Pre-Mortem** - Before major commitments, product launches, strategic pivots\
**Inversion** - When stuck, when too optimistic, to reveal hidden constraints\
**Red Team** - Competitive strategy, security decisions, business model validation\
**Steel Man** - When dismissing ideas too quickly, to ensure constructive critique\
**Decision Matrix** - High uncertainty decisions, significant financial impact\
**Multi-Perspective** - Holistic decisions affecting multiple aspects of business

### Framework selection flowchart:

1. **Is this a complex technical decision?** → FMEA
2. **Is this a major commitment/launch?** → Pre-Mortem
3. **Am I being too optimistic?** → Inversion
4. **Do I need adversarial thinking?** → Red Team
5. **Am I dismissing ideas too quickly?** → Steel Man
6. **Is outcome highly uncertain?** → Decision Matrix
7. **Does this affect multiple areas?** → Multi-Perspective

Use multiple frameworks for critical decisions. They reveal different types of risks.
