# Challenging Assumptions

**When to use:** Before major decisions, when someone seems overconfident, or when asked to "poke holes in this," "what could go wrong," or "what am I missing."

---

## Core Methodology

### 1. Steel-Man First, Then Challenge

**Never** strawman or dismiss. Build the strongest version before critiquing:

1. **Understand the goal** — What problem is this solving?
2. **Identify strengths** — What makes this approach compelling?
3. **State the best case** — What would success look like?
4. **Then challenge** — Now systematically identify weaknesses

---

### 2. Attack Unstated Assumptions

Surface what's being taken for granted:
- **Resource assumptions** — "We'll have time/money/people"
- **Market assumptions** — "Users want this"
- **Technical assumptions** — "This will scale"
- **Personal assumptions** — "I can handle this"

Questions to expose assumptions:
- What needs to be true for this to work?
- What are we assuming about timing, resources, market?
- What second-order effects are we ignoring?

---

### 3. Pre-Mortem

Project into the future where the plan failed, then work backward:

```
It's [6 months] from now. This has failed.

What happened?
- Technical failure: ___________
- Market failure: ___________
- Resource failure: ___________
- External shock: ___________

What warning signs did we miss?
What assumptions proved wrong?
```

---

### 4. Inversion Thinking

Instead of "how do we succeed," ask "how do we fail":

- **Goal: Successful launch** → How could we ensure this fails spectacularly?
- **Goal: Reduce costs** → What's the most expensive way to solve this?
- **Goal: Scale the system** → What would make this unscalable?

Inversion reveals hidden risks that forward thinking misses.

---

### 5. Red Team Thinking

Take the adversarial position:
- **Competitor:** How would they exploit our weaknesses?
- **Murphy's law:** What can go wrong, will. What's that?
- **Malicious actor:** How could someone break this?
- **Market forces:** What changes would invalidate this?

---

## Challenge Intensity

**High intensity** (existential stakes):
- Major financial commitments
- Irreversible technical decisions
- Business model pivots

**Medium intensity** (significant but recoverable):
- Feature prioritization
- Technology evaluation

**Low intensity** (experimental):
- Small experiments
- Learning projects

---

## Constructive Opposition

### Do:
- ✓ Offer alternatives alongside critique
- ✓ Distinguish fatal flaws from manageable risks
- ✓ Respect the person's agency
- ✓ Use questions to guide discovery
- ✓ Acknowledge what's working before challenging

### Don't:
- ✗ Pure negativity without solutions
- ✗ Dismissive tone
- ✗ Challenge the person instead of the idea
- ✗ Overwhelming laundry lists

---

## Output Structure

```
Understanding: [Steel-man the idea]

Strengths: [What's compelling]

Key assumptions: [What needs to be true]

Failure modes: [How this could go wrong]

Risks:
- Fatal: [Deal-breakers]
- Significant: [Problems needing attention]
- Manageable: [Minor issues to watch]

Alternative approaches: [Other ways to solve this]

How to address: [Concrete mitigation steps]
```

---

## Example

**User:** "I'll build streaming overlays as a micro-SaaS"

**Response:**

*Understanding:* You've identified streamers as an underserved market with clear value proposition and recurring revenue potential.

*Strengths:* Well-defined users, clear pain point, visual product easy to demonstrate.

*Key assumptions:*
- Streamers will pay vs use free alternatives
- Can build customization without becoming consulting
- Market size sufficient for sustainable business

*Failure modes:*
- Price sensitivity — streamers are notoriously cheap
- Customization trap — "Can you make it do X?" becomes endless
- Clone risk — low technical moat
- Support burden — streamers stream at all hours

*Risks:*
- Fatal: Can't overcome free alternatives
- Significant: Support load crushes capacity
- Manageable: Competition enters space

*Alternative approaches:*
- Target professional streamers first (have budgets)
- Template marketplace instead of builder (less support)
- Plugin to existing tools vs standalone

*How to address:*
- Validate pricing before building
- Define strict scope: no custom requests
- Build automated onboarding

---

## Key Reminder

> Challenge is a tool for collaborative improvement, not an exercise in being right. Steel-man first. Offer solutions not just problems. Respect their agency.
