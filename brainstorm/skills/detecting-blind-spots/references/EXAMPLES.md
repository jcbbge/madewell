# Extended Blind Spot Detection Examples

These are illustrative scenarios, not facts about the current user or verified case histories. Supplied numbers and imagined motives must not be imported into another task. Answer investigative questions from existing evidence first, distinguish intentional exclusions from unknown coverage, and follow SKILL.md rather than reproducing an interview.

## Table of Contents
1. [Technical Architecture Decisions](#technical-architecture-decisions)
2. [Business Strategy and Planning](#business-strategy-and-planning)
3. [Product Development](#product-development)
4. [Personal Development and Wellbeing](#personal-development-and-wellbeing)
5. [Resource Allocation](#resource-allocation)
6. [Common Patterns Across Domains](#common-patterns-across-domains)

---

## Technical Architecture Decisions

### Example 1: VPS Migration for Cost Savings

**Context:** Solo developer considering migrating from managed hosting to VPS to save money (~$50/month)

**Stated reasoning:**
- "It's straightforward - just need to set up Docker and configure nginx"
- "I know how to do this, did it years ago"
- "The cost savings will add up over time"

**Blind spots to surface:**

**Time/complexity opportunity cost**
- Q: "You're optimizing for money but not mentioning time investment. Why?"
- Q: "What's your hourly rate for freelance work? How many hours will migration + ongoing maintenance take?"
- Q: "Is saving $50/month worth 10+ hours of setup + 2 hours/month maintenance?"

**Knowledge gap (masked as certainty)**
- Q: "You said you 'know how to do this' from years ago. How much has changed? Docker networking? Security practices? Monitoring?"
- Q: "What will you do when something breaks at 2am and clients are affected?"

**Mental health contingency**
- Q: "You're confident in your ability to manage this, but you've also mentioned burnout and floating. What happens if your mental health crashes and you can't handle server emergencies?"
- Q: "Is technical confidence assuming stable mental state?"

**Future collaboration**
- Q: "What happens when you want to hire someone or collaborate? Does this architecture make that easier or harder?"
- Q: "Are you optimizing for solo-forever or is this potentially limiting?"

**Temporal changes**
- Q: "What happens in 2 years when you need to upgrade OS, reconfigure everything, handle security patches?"
- Q: "Is this technical debt or technical investment?"

**Emotional factors being rationalized**
- Q: "Is this about cost, or is this about control and independence?"
- Q: "Are you solving for 'I don't want to pay someone else' vs 'this is the best use of resources'?"

**Why these blind spots matter:**
The $600/year savings seems significant in isolation, but the real cost is time (~$2000+/year at modest hourly rate), stress (server emergencies), and future flexibility (hiring/collaboration harder). Decision is driven by independence need, not pure optimization.

---

### Example 2: Rewriting Application in New Framework

**Context:** Developer planning to rewrite working application in newer framework (e.g., React to Solid)

**Stated reasoning:**
- "The new framework is better/faster/cleaner"
- "I'll learn valuable skills"
- "Current code is messy, good time to clean it up"

**Blind spots to surface:**

**Opportunity cost**
- Q: "What could you build with the 200+ hours this rewrite will take?"
- Q: "What problem for users are you solving by rewriting?"
- Q: "Is this the highest leverage use of your time?"

**Underestimating complexity**
- Q: "Rewrites notoriously take 2-3x as long as estimated. Have you accounted for this?"
- Q: "What happens to features and users during the months-long rewrite?"
- Q: "What breaks that you won't discover until deep into migration?"

**Learning vs shipping confusion**
- Q: "Is the goal to learn, or is the goal to ship better products?"
- Q: "Could you learn the framework on a NEW project instead of risking existing users?"

**Sunk cost fallacy (reverse)**
- Q: "You're about to throw away working code. What makes you confident the rewrite will actually be better?"
- Q: "Have you accounted for all the edge cases and bug fixes built into current code?"

**Emotional drivers**
- Q: "Is this about the framework, or is this about being bored with current codebase?"
- Q: "Are you solving 'messy code' or avoiding 'building new features'?"

**Platform risk**
- Q: "What if the new framework falls out of favor or breaks changes?"
- Q: "How are you evaluating framework maturity and ecosystem?"

**Why these blind spots matter:**
Rewrites rarely deliver expected value and often take 3x as long while providing zero new user value. Usually driven by developer preferences, not user needs. Better to learn new framework on new project while maintaining working product.

---

## Business Strategy and Planning

### Example 3: Solo SaaS Launch

**Context:** Developer planning to build and launch SaaS product alone

**Stated plan:**
- "Build MVP in 3 months"
- "Launch on Product Hunt"
- "Iterate based on feedback"

**Blind spots to surface:**

**Customer development absence**
- Q: "I notice customer development is completely absent from your plan. Is that intentional?"
- Q: "How will you know people actually want this before you build it?"
- Q: "What if you build something technically impressive that nobody wants to pay for?"

**Build = value assumption**
- Q: "You're assuming building the product creates value. What if value is in distribution, positioning, or support?"
- Q: "What percentage of success is building vs everything else?"

**Go-to-market blindness**
- Q: "Product Hunt launch is one day. How do people discover you on day 2, week 2, month 2?"
- Q: "What's your strategy for the 99% of time when you're not launching?"
- Q: "How will you compete with established products that already have distribution?"

**Solo assumption**
- Q: "What makes solo the right approach vs finding a co-founder with complementary skills?"
- Q: "Are you solving for independence or for product success?"
- Q: "What if 'solo' is the constraint, not the solution?"

**Timeline optimism**
- Q: "Your timeline assumes everything goes perfectly. What's the realistic timeline accounting for unknowns?"
- Q: "What happens if MVP takes 6 months instead of 3?"
- Q: "Can you sustain working on this with no revenue for 6+ months?"

**Support and scaling**
- Q: "What happens when you have 100 users and they all need help?"
- Q: "Can you support customers while also building new features?"
- Q: "What if success overwhelms your capacity?"

**Why these blind spots matter:**
Most SaaS failures aren't technical failures - they're customer development and go-to-market failures. Building alone means wearing every hat (development, design, marketing, support, sales), which creates bottlenecks. Timeline optimism leads to burnout when reality diverges from plan.

---

### Example 4: Expanding Services/Offerings

**Context:** Freelancer considering adding new service offering (e.g., development + design, or consulting + implementation)

**Stated reasoning:**
- "Clients keep asking for this"
- "I can charge more for bundled services"
- "Diversification reduces risk"

**Blind spots to surface:**

**Capability gap**
- Q: "You're confident adding design, but when did you last do professional design work?"
- Q: "What's the quality gap between your design and specialists? Will clients notice?"
- Q: "Are you creating value or creating liability?"

**Attention split**
- Q: "You're already stretched thin. Where does time for new offering come from?"
- Q: "What are you giving up to add this?"
- Q: "Can you deliver quality in both domains simultaneously?"

**Positioning dilution**
- Q: "You're known for X. Does adding Y strengthen or weaken your positioning?"
- Q: "Are you making it easier or harder for clients to understand what you do?"
- Q: "Does 'full service' signal 'expert' or 'mediocre at everything'?"

**Market demand validation**
- Q: "'Clients keep asking' could mean many things. Have they actually bought bundled services?"
- Q: "Are they asking because they want it from you specifically, or because it's generally convenient?"
- Q: "Would they pay premium for bundled service from you vs hiring specialists?"

**Operational complexity**
- Q: "How does pricing, contracts, and delivery change with two services vs one?"
- Q: "What happens when design and development timelines conflict?"
- Q: "Are you creating coordination overhead that eats the margins?"

**Why these blind spots matter:**
Expanding services can dilute expertise positioning and split attention without increasing effective capacity. "Clients keep asking" doesn't validate willingness to pay or quality expectations. Better to partner with specialists or refer than to be mediocre at everything.

---

## Product Development

### Example 5: Feature Prioritization

**Context:** Developer deciding which features to build next for existing product

**Stated approach:**
- "Users requested these features"
- "Competitors have these features"
- "These would be cool to build"

**Blind spots to surface:**

**Request vs need**
- Q: "When users request features, are they describing what they need or prescribing solutions?"
- Q: "What problem are they actually trying to solve?"
- Q: "Could different features solve the same underlying need better?"

**Vocal minority vs silent majority**
- Q: "Who's requesting these features? Power users or typical users?"
- Q: "What do the 90% of users who don't request features actually need?"
- Q: "Are you optimizing for the loud or the many?"

**Competitive parity assumption**
- Q: "Your competitors have these features. Does that mean they're working?"
- Q: "What if copying competitors makes you more similar, not more competitive?"
- Q: "What could you do that competitors can't or won't?"

**Build excitement vs user value**
- Q: "'These would be cool to build' - for you or for users?"
- Q: "Are you solving for your technical interest or user problems?"
- Q: "What features would users pay more for vs what you want to build?"

**Opportunity cost invisible**
- Q: "What are you NOT building by building these features?"
- Q: "What's the impact of polish on existing features vs new features?"
- Q: "Where's the highest leverage use of development time?"

**Retention vs acquisition confusion**
- Q: "Are these features for keeping existing users or getting new users?"
- Q: "Do you know which problem is more critical right now?"
- Q: "What data informs this prioritization?"

**Why these blind spots matter:**
Feature requests are often proxies for underlying needs that could be met better different ways. Competitive parity creates commodity products. "Cool to build" optimizes for developer interest, not user value. Prioritization without clear strategic intent leads to feature bloat without cohesive product.

---

### Example 6: Pricing Strategy

**Context:** Developer pricing new product or considering price changes

**Stated approach:**
- "I'll start cheap to get users"
- "I'll price based on what seems reasonable"
- "I'll charge what competitors charge"

**Blind spots to surface:**

**Value anchor missing**
- Q: "What value does your product create for users? In dollars?"
- Q: "Are you pricing based on your costs or on their value?"
- Q: "What would users pay for this value from any provider?"

**Race to bottom**
- Q: "'Start cheap to get users' - then what? Raise prices on existing users?"
- Q: "Are you training users to expect low prices?"
- Q: "What if cheap attracts wrong customers (high support, low retention)?"

**Competitor irrelevance**
- Q: "Why should your pricing match competitors if your product is different?"
- Q: "What if competitors are also pricing wrong?"
- Q: "Are you competing on price or on value?"

**Psychological pricing blindness**
- Q: "Price sends a signal. What does your price say about your product?"
- Q: "Does low price signal 'great deal' or 'probably not very good'?"
- Q: "What does premium pricing filter for?"

**Cost structure ignorance**
- Q: "Have you calculated customer acquisition cost?"
- Q: "What's the lifetime value at this price point?"
- Q: "What's the margin after support, hosting, payment processing?"

**Willingness to pay assumptions**
- Q: "Have you actually asked potential customers what they'd pay?"
- Q: "Are you anchoring on what you'd personally pay or what they'd pay?"
- Q: "What's the difference between hobby users and business users?"

**Why these blind spots matter:**
Pricing is positioning - it signals quality, target market, and value. Starting too low makes raising prices difficult and attracts price-sensitive customers (high churn, high support). Competitor pricing might be wrong or target different segment. Without understanding value created and costs incurred, pricing is guesswork.

---

## Personal Development and Wellbeing

### Example 7: "I Need a Creative Outlet"

**Context:** Person feeling burnout/frustration, stating they need creative outlet

**Stated desire:**
- "I want to do something creative"
- "I need an outlet for expression"
- "I want to make something just for fun"

**Blind spots to surface:**

**Actual need underneath**
- Q: "When you say 'creative outlet,' what are you actually seeking?"
- Q: "Could this be about connection, recognition, purpose, autonomy, or mastery rather than creativity per se?"
- Q: "What's missing that you're trying to fill?"

**Timing trigger**
- Q: "Why now? What changed recently?"
- Q: "What's the actual trigger for this need appearing right now?"
- Q: "Are you running toward something or away from something?"

**Public vs private mismatch**
- Q: "You said 'creative outlet' but everything you're describing is public performance (streaming, content creation). Is privacy important?"
- Q: "Is this about creating or about being seen creating?"
- Q: "Would private creation satisfy this need?"

**Energy state assumption**
- Q: "You're planning this creative outlet while also describing burnout. Where does the energy come from?"
- Q: "Are you assuming a future energy state that might not materialize?"
- Q: "What if you're too tired to actually do this?"

**Sustainability blindness**
- Q: "This sounds like it requires consistent energy and engagement. Can you sustain that?"
- Q: "What happens when initial enthusiasm fades?"
- Q: "Is this adding to your load or genuinely rejuvenating?"

**Outcome expectations**
- Q: "What does success look like for this creative outlet?"
- Q: "Are you expecting audience, recognition, or something else?"
- Q: "What if you create and nobody sees it or cares?"

**Why these blind spots matter:**
"Need creative outlet" often masks deeper needs (connection, recognition, autonomy, escape from current situation). If actual need is misidentified, creative outlet won't satisfy it. Public performance is very different from private creation - understanding which is needed matters. Energy requirements might not match current capacity.

---

### Example 8: Learning New Technology/Skill

**Context:** Developer planning to learn new framework, language, or technology

**Stated plan:**
- "I'll work through tutorials and docs"
- "I'll build a practice project"
- "I'll devote weekends to this"

**Blind spots to surface:**

**Motivation sustainability**
- Q: "What happens when initial enthusiasm fades (usually 2-3 weeks)?"
- Q: "Have you started and abandoned similar learning plans before?"
- Q: "What makes this time different?"

**Application timeline**
- Q: "When will you actually use this skill in production?"
- Q: "What's the gap between learning and applying?"
- Q: "Do you remember skills you don't use for months?"

**Opportunity cost**
- Q: "What are you not doing by spending weekends on this?"
- Q: "Could you hire someone with this skill instead of learning it?"
- Q: "Is this the highest leverage use of learning time?"

**Learning path efficiency**
- Q: "Tutorials and docs are passive. Are you learning through building real things?"
- Q: "What's your feedback loop? How do you know you're learning correctly?"
- Q: "Are you learning what you'll actually need or what tutorials teach?"

**Energy assumption**
- Q: "You're planning weekend learning. How many weekends have you sustained new habits?"
- Q: "What happens when work is exhausting and weekends are for recovery?"
- Q: "Are you planning your ideal self or your actual self?"

**Why vs how focus**
- Q: "You've explained HOW you'll learn but not WHY you need this skill"
- Q: "What problem does this skill solve that you can't solve now?"
- Q: "Is this curiosity or career investment?"

**Why these blind spots matter:**
Most learning plans fail due to motivation fade, not capability. "Weekend learning" assumes energy that might not exist. Learning without near-term application leads to forgetting. Tutorial-focused learning often doesn't transfer to production use. Understanding WHY (clear application) sustains HOW better than willpower.

---

## Resource Allocation

### Example 9: Time Investment in Tools/Automation

**Context:** Developer considering building custom tools or automation

**Stated reasoning:**
- "This will save time in the long run"
- "I'll use this tool constantly"
- "Automation is always worth it"

**Blind spots to surface:**

**Break-even analysis**
- Q: "How long will building this take? How much time will it save per use? When do you break even?"
- Q: "Have you calculated: (build time + maintenance) vs (time saved * frequency of use)?"
- Q: "Is the math actually favorable?"

**Frequency assumptions**
- Q: "You say you'll use this constantly. Based on what evidence?"
- Q: "How often have you needed this in the past?"
- Q: "What if actual usage is 1/10th of projected?"

**Maintenance invisibility**
- Q: "You're counting build time but not maintenance. What breaks? What needs updating?"
- Q: "What's the ongoing cost of owning custom tools?"
- Q: "In 6 months when APIs change, who fixes it?"

**Off-the-shelf alternatives**
- Q: "Does something good enough already exist?"
- Q: "What if 80% solution that exists now is better than 100% solution in 2 months?"
- Q: "Is perfect the enemy of good here?"

**Build excitement vs utility**
- Q: "Is this about saving time or about wanting to build something?"
- Q: "Are you solving for efficiency or for technical interest?"
- Q: "Would buying or using existing save more time than building?"

**Opportunity cost**
- Q: "What could you do with the 40 hours you'll spend building this?"
- Q: "Is tool-building the highest leverage use of time?"
- Q: "What if you just did the task manually and shipped products instead?"

**Why these blind spots matter:**
The "famous xkcd comic" about automation shows most automation doesn't break even. People overestimate frequency of use and underestimate build + maintenance time. "Will save time" is often rationalization for "I want to build this." Better to use good-enough existing solutions and focus on user-facing value.

---

### Example 10: Hiring Decisions

**Context:** Solo developer/founder considering first hire

**Stated approach:**
- "I'll hire for my weakest skill"
- "I'll find someone cheaper than me"
- "I'll hire when I'm too busy"

**Blind spots to surface:**

**Weakest skill fallacy**
- Q: "Your weakest skill might not be the bottleneck. What's actually blocking growth?"
- Q: "Could you improve weakest skill faster than finding and onboarding someone?"
- Q: "What if your strength could be amplified instead?"

**Cost myopia**
- Q: "You're comparing hourly rates but not onboarding, management, and coordination costs"
- Q: "What's the total cost of having an employee vs solo?"
- Q: "How much does coordination reduce your productivity?"

**Timing signals**
- Q: "'Too busy' is a lagging indicator. By then you're already behind"
- Q: "What's the leading indicator? Revenue? Opportunity backlog? Dropped clients?"
- Q: "Can you afford to wait until crisis?"

**Role clarity**
- Q: "What exactly will this person do every day?"
- Q: "Do you have 40 hours/week of clear work for them?"
- Q: "What happens when you don't have clear tasks?"

**Management capacity**
- Q: "Have you managed people before? Are you accounting for learning curve?"
- Q: "How much of your time will management take?"
- Q: "What if managing reduces your effective capacity?"

**Cultural fit blindness**
- Q: "You're focused on skills but not on working style, communication, values"
- Q: "What does good collaboration look like?"
- Q: "What makes someone successful in your environment?"

**Why these blind spots matter:**
First hire is rarely just about filling skill gap - it's about amplifying capacity, but requires management capability and clear direction. "Hire for weakness" might not address actual constraint. Timing based on "too busy" means you're already overwhelmed when trying to onboard. Total cost includes coordination overhead, not just salary.

---

## Common Patterns Across Domains

### Pattern 1: Planning Fallacy (Optimistic Timelines)

**Surfaces as:**
- "This should take about 2 weeks"
- "I can knock this out over the weekend"
- "Quick project, probably 10 hours"

**Blind spots:**
- Not accounting for unexpected complexity
- Assuming everything goes right
- Forgetting time for rework, bugs, edge cases
- Ignoring context switching and setup/cleanup
- Not buffering for interruptions

**AI response pattern:**
"Your timeline assumes everything goes perfectly. What's realistic accounting for unknowns? Similar projects typically take how long?"

---

### Pattern 2: Emotional Rationalization

**Surfaces as:**
- "This is purely practical/strategic"
- "I'm being objective about this"
- "The numbers support this decision"

**Blind spots:**
- Independence need masked as optimization
- Recognition need masked as user value
- Control need masked as efficiency
- Fear masked as risk management
- Boredom masked as improvement opportunity

**AI response pattern:**
"I notice you're framing this as purely practical. Could there be emotional factors? Is this about autonomy/recognition/purpose?"

---

### Pattern 3: Present Bias (Temporal Blindness)

**Surfaces as:**
- Focus on immediate costs/benefits
- Ignoring future states
- Assuming current energy/motivation/context persists
- Not accounting for what changes over time

**Blind spots:**
- Future-you with different energy levels
- Compounding maintenance costs
- Context shifts (platform changes, market moves)
- Relationship evolution
- Opportunity cost accumulation

**AI response pattern:**
"You're focused on right now. What happens in 3 months, 6 months, 2 years? What changes?"

---

### Pattern 4: Sunk Cost Influence

**Surfaces as:**
- "I've already invested so much time/money"
- "I can't give up now"
- "Just need to finish this"

**Blind spots:**
- Past costs are irrelevant to future decisions
- Continuing might mean throwing good resources after bad
- Alternative uses of future resources
- Opportunity cost of persisting

**AI response pattern:**
"I hear you've invested a lot. But that's gone regardless. Looking forward only, what's the best use of your next 40 hours?"

---

### Pattern 5: Availability Bias (Recent Events Dominate)

**Surfaces as:**
- Decisions heavily influenced by recent experiences
- Overweighting vivid or emotional events
- Ignoring base rates and statistics

**Blind spots:**
- Recent isn't representative
- One example isn't a pattern
- Emotional weight doesn't equal probability
- Base rates matter more than anecdotes

**AI response pattern:**
"You mention [recent event] heavily. How often does this actually happen? What's the base rate?"

---

### Pattern 6: Expertise Blindness

**Surfaces as:**
- "I know how to do this"
- "This is standard/straightforward"
- "Everyone does it this way"

**Blind spots:**
- Expertise creates blind spots (can't see beginner problems)
- Confident assertions without recent experience
- "I did this years ago" ignores how much changed
- Underestimating what you've forgotten

**AI response pattern:**
"You're confident about this. When did you last do it? How much has changed? What don't you know that you don't know?"

---

### Pattern 7: Solo vs Collaborative Default

**Surfaces as:**
- Always assuming solo approach
- Or always assuming need for team
- Not questioning the collaboration model

**Blind spots:**
- Solo isn't always optimal but might be emotional
- Collaboration has coordination costs
- Partnership creates dependencies
- Working style preferences vs strategic choices

**AI response pattern:**
"I notice you default to [solo/team]. Is that strategic or emotional? What's the actual best approach for this?"

---

## Integration: Applying Across Contexts

**Recognition patterns:**
1. **What's conspicuously absent?** (absence detection)
2. **What's being assumed?** (assumption mapping)
3. **Where's overconfidence?** (knowledge gap identification)
4. **Who else would see this differently?** (perspective shifting)
5. **What changes over time?** (temporal blindness)

**Calibration by stakes:**
- Low stakes: Single gentle question
- Medium stakes: Multiple exploratory questions
- High stakes: Systematic framework application (pre-mortem, red team)

**Delivery approach:**
- Frame as expanding options, not correcting errors
- Explain WHY the blind spot matters
- Offer paths forward, not just identify problems
- Validate whether actually relevant
- Pull back if user becomes defensive

**Success indicators:**
- User says "good point, hadn't thought of that"
- User asks follow-up questions
- User thanks you for catching something
- Decision improves through expanded consideration

**Failure indicators:**
- User becomes defensive
- You're repeating yourself
- Blind spot isn't actually relevant
- False alarm on your part

These patterns and examples show blind spot detection in action across technical, business, product, and personal domains. The skill transfers by recognizing underlying cognitive patterns regardless of surface content.
