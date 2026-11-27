# Problem Reframing Examples and Case Studies

These are illustrative reframing patterns, not verified case histories or scripts to perform on the user. Treat the dialogue as already-available context when it is present; inspect before asking. Claimed metrics, historical attributions, and outcomes below require primary-source verification before citation or use as evidence. SKILL.md governs the current evidence-first behavior.

## Table of Contents

1. [Technical Problem Reframing](#technical-problem-reframing)
2. [Product Development Reframing](#product-development-reframing)
3. [Career and Personal Reframing](#career-and-personal-reframing)
4. [Business Strategy Reframing](#business-strategy-reframing)
5. [Real-World Case Studies](#real-world-case-studies)

---

## Technical Problem Reframing

### Example 1: Database Performance

**Stated problem:** "Our database queries are too slow. How do I optimize them?"

**Reframing dialogue:**

```
Before diving into query optimization, let me understand the context:

1. How slow is "too slow"? What's the actual performance vs requirement?
2. When did this become a problem? What changed?
3. Who's experiencing slow queries? All users or specific use cases?
4. What's the business impact? Lost revenue? User complaints? Team velocity?

User answers:
- Queries take 2-3 seconds, need under 1 second
- Became problem after user base grew 10x
- Mainly affects the analytics dashboard
- Impact: Dashboard times out, executives can't get reports

Alternative reframes:

A. Real-time vs batch: "Do executives need real-time data, or would daily/hourly
   batch processing work? That changes everything about architecture."

B. Data model: "The slow queries might be a symptom of a data model that wasn't
   designed for these query patterns. Should we look upstream at the schema?"

C. Caching: "If queries rarely change, aggressive caching might be simpler than
   query optimization. Have you considered that angle?"

D. Expectations: "Is 2-3 seconds actually slow for analytics, or is this about
   perception? Could a loading indicator solve the problem?"

E. Requirements: "Do executives need all this data, or can we show them a smaller,
   pre-aggregated summary that loads instantly?"
```

**Outcome:** User realizes the real problem is "executives can't get the insights they need" not "queries are slow." Solution becomes: daily pre-aggregated dashboard (batch) + drill-down on demand (cache + optimize specific queries). Simpler and better than optimizing all queries.

---

### Example 2: Should I Learn Framework X?

**Stated problem:** "Should I learn React Native for mobile development?"

**Reframing dialogue:**

```
Let me understand what problem you're trying to solve:

1. What problem would learning React Native solve for you?
2. Do you have a specific mobile project, or is this general skill-building?
3. What's your current tech stack? What do you already know?
4. What's the opportunity cost? What else could you learn/build with this time?
5. What's driving this question now?

User answers:
- Want to build a mobile app for my side project
- Currently know web development (JavaScript/React)
- No immediate job requirement
- Considering React Native vs learning native iOS/Android
- Excited to ship my first mobile app

Alternative reframes:

A. Validate first: "Have you validated that people want this app? Could you test
   the core idea with a web app before investing in mobile?"

B. Faster path: "What if you used a no-code/low-code platform to ship v1, then
   rebuild in React Native if it gains traction?"

C. Native vs cross-platform: "React Native makes sense if you need iOS + Android.
   But if you only need one platform, native might be simpler to learn."

D. Web-first: "Could this be a mobile-optimized web app (PWA)? You already know
   React, and PWAs are surprisingly capable now."

E. Actual goal: "Is your goal 'learn mobile development' or 'ship this specific
   app'? Because those suggest different paths."
```

**Outcome:** User realizes goal is "ship app to validate idea" not "learn mobile dev." Decides to build mobile-optimized web app first, validate traction, then invest in native mobile if it takes off. Saves months of learning time.

---

### Example 3: Microservices Architecture

**Stated problem:** "Our monolith is getting too big. Should we migrate to microservices?"

**Reframing dialogue:**

```
Let's challenge this reframe before we commit to a major architectural change:

1. What specific problems is the monolith causing? Be concrete.
2. How big is the team? How many independent workstreams?
3. What would success look like after moving to microservices?
4. What would "too big" mean? Lines of code? Deploy time? Team coordination?
5. Have you tried modularizing within the monolith first?

User answers:
- 3-person team, one codebase, 50k lines
- Deploy takes 15 minutes
- Want faster iteration, less merge conflicts
- Getting tangled dependencies between features

Alternative reframes:

A. Team size: "Microservices add significant complexity. With a 3-person team,
   the operational burden might slow you down more than the monolith does."

B. Actual bottleneck: "Are merge conflicts from code structure or from how you're
   working? Better branching strategy might be simpler than microservices."

C. Modular monolith: "Could you create clear module boundaries in the monolith?
   Get the benefits of separation without distributed system complexity."

D. Deploy time: "15 minutes isn't slow. Are you solving the wrong problem?"

E. Future-proofing: "Are you solving today's problem or preparing for scale you
   don't have yet? Microservices make sense at 30+ engineers, not 3."
```

**Outcome:** User realizes the real problem is "tangled dependencies making changes risky." Solution: Refactor monolith into clear modules with defined interfaces. Much simpler than microservices, solves actual problem. Microservices deferred until team grows significantly.

---

## Product Development Reframing

### Example 4: Feature Prioritization

**Stated problem:** "Users are asking for feature X. Should we build it?"

**Reframing dialogue:**

```
Let's understand what users actually need:

1. How many users asked? Is this a vocal minority or widespread need?
2. What problem are they trying to solve with feature X?
3. Did you ask them about their underlying goal, or just hear "we want X"?
4. What are they doing now without feature X? Workarounds?
5. Would solving their underlying problem differently work better?

User answers:
- 5 power users asking insistently
- They want batch import of contacts (CSV upload)
- Currently manually entering contacts one by one
- It's tedious, takes 30+ minutes
- They have 100+ contacts to enter

Alternative reframes:

A. Scale of problem: "Is this 5 users with 100 contacts each, or 500 users with
   10 contacts? The solution changes based on scale."

B. Underlying goal: "They want their contacts in the system quickly. CSV upload
   is one solution, but could we integrate with their existing tools instead?"

C. Workaround quality: "How painful is manual entry really? If they're willing to
   spend 30 minutes once, maybe it's not a high-value feature."

D. Future users: "Will most users need this, or just these power users? Are we
   building for current users or future market?"

E. Alternative solutions: "What if we built an API and published a Python script
   they can use? Serves power users without building full UI."
```

**Outcome:** User realizes these are B2B customers who need CRM integration, not just CSV upload. Reframed problem: "How do we integrate with their existing systems?" Built API + Zapier integration instead of CSV upload. Served broader use case and differentiated product.

---

### Example 5: User Retention Problem

**Stated problem:** "Our user retention is low. How do we increase engagement?"

**Reframing dialogue:**

```
Let's understand what's actually happening:

1. What's the retention curve? Where do users drop off?
2. What do successful users (who stick around) do differently?
3. Have you talked to churned users about why they left?
4. Is this a product problem, onboarding problem, or market-fit problem?
5. What's "low" retention? Compared to what benchmark?

User answers:
- 60% drop off after first session
- Successful users complete the core workflow once
- Haven't done churn interviews yet
- Retention is 30% at 30 days, want 50%+
- Benchmark: Similar products are 40-45%

Alternative reframes:

A. Onboarding: "60% first-session drop-off screams onboarding problem, not product
   problem. Users aren't reaching the value moment."

B. Activation metric: "Users who complete core workflow stick around. So the problem
   is 'how do we get more users to that activation point?'"

C. Expectation mismatch: "Are you attracting wrong users, or failing to show value
   to right users? Different problems, different solutions."

D. Time to value: "How long does it take to reach first value? If it's 10+ minutes,
   that's your problem. Fast time to value = better retention."

E. Product-market fit: "30% retention might be fine if you're still finding PMF.
   Are you sure this is an engagement problem vs market-fit problem?"
```

**Outcome:** Realized 60% first-session drop-off was the real problem. Did user testing and found people didn't understand how to start. Rebuilt onboarding with a 2-minute "success path" that gets users to value fast. Retention improved from 30% to 48% without any feature work.

---

## Career and Personal Reframing

### Example 6: Career Change

**Stated problem:** "I'm thinking about leaving my job. Should I quit?"

**Reframing dialogue:**

```
Let's understand what's driving this:

1. What specifically is making you want to leave? Be concrete.
2. When did you start feeling this way? What changed?
3. What would success look like in a new job? What needs to be different?
4. Have you tried changing anything in your current situation first?
5. What would you lose by leaving? What would you gain?

User answers:
- Feeling unchallenged, not learning anything new
- Started feeling this way 6 months ago
- Want to work on cutting-edge technology
- Haven't talked to manager about it
- Would lose great team, good comp; gain novelty

Alternative reframes:

A. Role evolution: "Have you asked your manager about new challenges? Could you
   shift to a different team or project without quitting?"

B. Side projects: "Could you scratch the 'cutting-edge tech' itch through side
   projects while keeping the stable job?"

C. Learning vs novelty: "Is this about learning/growth (career) or just boredom
   (novelty)? Different problems need different solutions."

D. Grass is greener: "New job will have novelty for 6-12 months, then same feeling.
   Is this a job problem or a you problem?"

E. What's actually missing: "You said 'not learning anything new.' What would you
   want to learn? Can you learn it where you are?"
```

**Outcome:** User realizes they haven't tried changing their current situation first. Had conversation with manager, moved to a different team working on new product. Got the challenge they wanted without the risk/upheaval of job change. Sometimes the problem is "I haven't asked for what I need" not "I need to quit."

---

### Example 7: Creative Outlet

**Stated problem:** "I need a creative outlet. Should I start a blog?"

**Reframing dialogue:**

```
Let's understand what you're really looking for:

1. What need would a creative outlet fulfill? What's missing right now?
2. Why now? What changed that created this need?
3. What would "success" look like? Audience? Personal satisfaction? Skill building?
4. Why a blog specifically? Have you tried other creative outlets?
5. What's your history with creative projects? Do you finish them?

User answers:
- Work is all analytical, want to do something creative
- Recently felt like my life is all work, no play
- Success = feeling fulfilled, not necessarily audience
- Haven't tried other outlets recently
- Started several blogs before, all abandoned after 2 months

Alternative reframes:

A. Actual need: "Is this about creativity, or is it about meaning/fulfillment?
   Maybe you need a different kind of engagement entirely."

B. Pattern recognition: "You've started and abandoned blogs before. Why would this
   time be different? Might need to address the root pattern."

C. Lower commitment: "What if you did something with no audience pressure? Like
   journaling, drawing, or music just for yourself?"

D. Social connection: "Sometimes 'creative outlet' is code for 'I want to connect
   with people.' Could this be about community?"

E. Work-life balance: "Is the real problem 'work is all-consuming'? If so, creative
   outlet won't fix that—boundary-setting will."
```

**Outcome:** User realizes they're seeking meaning and social connection, not specifically creativity. Joins a local meetup for their hobby (board games) instead of starting another blog. Gets the social connection and playfulness they were missing, without the pressure of maintaining a blog. Solved the actual need.

---

## Business Strategy Reframing

### Example 8: Pricing Strategy

**Stated problem:** "Our product is too expensive. Should we lower prices?"

**Reframing dialogue:**

```
Let's understand the business context:

1. What evidence suggests it's too expensive? Lost deals? Customer feedback?
2. Who's saying it's too expensive? Ideal customers or wrong-fit customers?
3. What's your customer acquisition cost (CAC) and lifetime value (LTV)?
4. Are you competing on price or value? What's your positioning?
5. What would lowering prices achieve? More volume? Different customers?

User answers:
- Lost 10 deals last month, all said "too expensive"
- These are exactly our ideal customer profile
- CAC is $500, LTV is $2000 (after churning)
- Trying to compete on features/quality, not price
- Want to win more deals, increase revenue

Alternative reframes:

A. Value articulation: "Are you 'too expensive' or are you failing to demonstrate
   value? Those are different problems."

B. Deal size: "Could you offer a smaller starting package? Maybe they want to
   try before committing to full price."

C. Comparison: "What are they comparing your price to? Your competitors or their
   status quo (doing nothing)?"

D. Payment terms: "Is it the total price or the payment structure? Annual upfront
   vs monthly might matter more than the actual amount."

E. Wrong segment: "If ideal customers say you're too expensive, either they're not
   actually ideal, or your positioning doesn't match your price point."
```

**Outcome:** Realized they were losing deals not because of price but because of risk. Customers wanted to try before committing. Created a smaller "starter" tier at lower price point. After 3 months, most starters upgraded to full tier. Revenue increased without dropping core pricing. Problem was risk, not price.

---

### Example 9: Market Expansion

**Stated problem:** "We should expand to Europe. How do we enter the European market?"

**Reframing dialogue:**

```
Let's challenge whether market expansion is the right move:

1. Why Europe? Why now? What's driving this?
2. Have you saturated your current market? What's your market penetration?
3. What specific problem would European expansion solve?
4. What's your current growth rate? Is it slowing?
5. What's the opportunity cost? What else could you invest in?

User answers:
- Competitor just expanded to Europe, don't want to be left behind
- US market penetration is only 5% of addressable market
- Want to increase growth, hit revenue targets
- Growth slowing from 50% YoY to 30% YoY
- Could invest in product, sales, or Europe

Alternative reframes:

A. Competitor reaction: "You're reacting to competitor moves rather than customer
   pull. Is there actual European demand?"

B. Current market: "At 5% penetration, you have 20x room to grow in your current
   market. Why jump to a harder market?"

C. Growth diagnosis: "Growth slowing from 50% to 30% is natural maturation. Is
   Europe going to change that trajectory?"

D. Actual bottleneck: "What's actually limiting your growth? Product? Sales?
   Marketing? Europe doesn't fix any of those."

E. Easier growth: "What if you doubled down on sales/marketing in US? That would
   be simpler and faster than Europe expansion."
```

**Outcome:** Realized they were reacting to competitor fear rather than strategic opportunity. At 5% market penetration, they had massive room to grow domestically. Invested in sales team expansion instead of Europe. Revenue grew 60% next year vs projected 30%. Europe deferred until 30%+ market penetration. Sometimes the best move is to go deeper, not wider.

---

## Real-World Case Studies

### Case Study 1: Airbnb Trust Problem

**Original problem formulation:** "How do we make people comfortable staying in a stranger's home?"

**Initial approach:** Safety guidelines, verification, reviews

**Reframe:** "How do we build trust between strangers at scale?"

**Key insight:** Trust isn't binary (safe/unsafe), it's about reducing perceived risk through:
- Verified identity
- Social proof (reviews)
- Host profiles showing real people
- Secure payment handling
- Insurance backing

**Result:** Created systems that made peer-to-peer lodging feel safer than hotels in many cases. Reframing from "stranger danger" to "trust systems" enabled the entire marketplace.

**Lesson:** Sometimes the problem formulation limits the solution space. Reframing from safety (prevent bad things) to trust (create positive assurance) opened up different solutions.

---

### Case Study 2: Toyota Manufacturing

**Original problem formulation:** "We have quality defects. How do we catch them better?"

**Initial approach:** More inspectors, more testing at end of line

**Reframe:** "Why are defects happening in the first place?"

**Five Whys application:**
- Why defects? → Workers making mistakes
- Why mistakes? → Process unclear
- Why unclear? → Workers not trained properly
- Why not trained? → Training not standardized
- Why not standardized? → No system to capture best practices

**Result:** Created Toyota Production System with built-in quality, standard work, and continuous improvement. Prevented defects instead of catching them.

**Lesson:** Catching problems ≠ solving problems. Reframing from detection to prevention changed automotive manufacturing forever.

---

### Case Study 3: IDEO Healthcare

**Original problem formulation:** "How do we design better medical equipment?"

**Initial approach:** Improve ergonomics, features, functionality

**Reframe:** "What's the patient experience through their entire healthcare journey?"

**Key insight:** Medical equipment is just one touchpoint. The real opportunity was in designing the entire service experience—from scheduling to post-visit care.

**Result:** Shifted from equipment design to service design. Created new patient experiences that improved outcomes and satisfaction while using existing equipment better.

**Lesson:** Zooming out from the stated problem to the broader context can reveal more valuable problems to solve. Equipment was a local optimum; service experience was the global optimum.

---

## Pattern Summary

Across these examples, common reframing patterns emerge:

### Symptom → Root Cause
"Database slow" → "Data model doesn't match query patterns"
"Low engagement" → "Users don't reach first value moment"

### Solution → Goal
"Learn React Native" → "Ship mobile app to validate idea"
"Need CSV upload" → "Integrate with their existing tools"

### Local → Systemic
"Equipment design" → "Healthcare service experience"
"Query optimization" → "Real-time vs batch architecture"

### Constraint → Opportunity
"Too expensive" → "Need to reduce perceived risk"
"2-week deadline" → "What's the minimum viable version?"

### Reaction → Strategy
"Competitor expanded to Europe" → "Maximize domestic opportunity first"
"Monolith too big" → "Modularize within current architecture"

### Deficit → Strength
"Low retention" → "What makes successful users stick?"
"Quality defects" → "Build quality in from start"

---

## Using These Examples

When reframing problems:

1. **Start with evidence:** Answer diagnostic questions from the available context first.
2. **Distinguish mechanisms:** Keep only reframes that change a consequential next action.
3. **Preserve goals:** Test whether the reframe advances the user's stated outcome.
4. **Respect authority:** Keep settled preferences and binding constraints; do not force a reframe.
5. **Lead to action:** Recommend a supported next step; ask only for a decision genuinely reserved to the user.

These examples are templates, not formulas. Real situations are messy. Use judgment, ask questions, and collaborate with the human to find the right framing for their specific context.
