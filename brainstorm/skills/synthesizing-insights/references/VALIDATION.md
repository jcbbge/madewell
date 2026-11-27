# Pattern Validation and Refinement

Select only the validation needed under SKILL.md. User agreement can clarify intent but is not required ratification of every synthesis and does not establish factual truth. Check available artifacts and independent cases before asking questions; repeated summaries of one source count as one underlying observation.

## Table of Contents

1. [Validation Principles](#validation-principles)
2. [Pattern Quality Checklist](#pattern-quality-checklist)
3. [Over-Patterning Detection](#over-patterning-detection)
4. [Coherence Assessment](#coherence-assessment)
5. [Applicability Testing](#applicability-testing)
6. [User Feedback Integration](#user-feedback-integration)
7. [Refinement Strategies](#refinement-strategies)
8. [Common Validation Mistakes](#common-validation-mistakes)

---

## Validation Principles

### Principle 1: Patterns are Hypotheses

Treat every synthesized pattern as a hypothesis to be tested, not a fact to be defended.

**Implications:**
- Present patterns with appropriate uncertainty
- Actively seek disconfirming evidence
- Be willing to revise or reject patterns
- Make patterns falsifiable (testable)

---

### Principle 2: User Validation is Essential

The person requesting synthesis has domain knowledge and context you don't have. Their validation is critical.

**Why this matters:**
- You may miss important differences between contexts
- User can identify when pattern doesn't actually fit
- User knows boundary conditions and exceptions
- User can test if pattern is actionable in their context

---

### Principle 3: Multiple Tests are Better Than One

No single validation test is perfect. Use multiple complementary tests.

**Testing layers:**
- **Coverage:** Does pattern explain all examples?
- **Falsifiability:** Can pattern be disproven?
- **Counter-examples:** Are there cases that break pattern?
- **Utility:** Does pattern enable action?
- **Coherence:** Is pattern internally consistent?
- **Transferability:** Does pattern work in new contexts?

---

### Principle 4: Validation Improves Through Iteration

First synthesis is rarely optimal. Expect to refine patterns multiple times based on testing.

**Iteration cycle:**
1. Propose pattern
2. Test pattern
3. Identify weaknesses or failures
4. Refine pattern
5. Repeat

---

## Pattern Quality Checklist

Use this checklist to assess pattern quality before presenting to user:

### Coverage Check
- [ ] Pattern explains all provided examples (not cherry-picked subset)
- [ ] Pattern accounts for variation within examples
- [ ] No major examples are unexplained by pattern

**If fails:** Pattern may be too narrow or missing key elements. Consider broader pattern or multiple related patterns.

---

### Explanatory Power Check
- [ ] Pattern explains *why* examples work the way they do (not just describing surface features)
- [ ] Pattern identifies causal relationships (not just correlations)
- [ ] Pattern reveals non-obvious structure

**If fails:** May have description instead of explanation. Ask "what causes what?" to find deeper structure.

---

### Predictive Value Check
- [ ] Pattern helps anticipate new cases
- [ ] Pattern suggests what to expect in similar situations
- [ ] Pattern enables testing predictions

**If fails:** Pattern may be too abstract or too specific. Adjust abstraction level.

---

### Actionability Check
- [ ] Pattern suggests specific actions or decisions
- [ ] Pattern has practical implications
- [ ] User can do something different based on pattern

**If fails:** May need to add "so what?" and "now what?" to pattern. Connect insights to actions.

---

### Transferability Check
- [ ] Pattern applies across multiple domains (not single-domain specific)
- [ ] Pattern identifies general principle (not domain-dependent detail)
- [ ] Pattern includes boundary conditions (when it applies and doesn't apply)

**If fails:** Check abstraction level. Too specific = won't transfer. Too abstract = loses meaning.

---

### Non-Obviousness Check
- [ ] Pattern reveals something not immediately apparent
- [ ] Pattern provides genuine insight (not common knowledge restatement)
- [ ] Pattern connects things that weren't obviously connected

**If fails:** Pattern may be trivial. Test: "Would someone familiar with these domains already know this?"

---

### Testability Check
- [ ] Pattern makes claims that can be validated or falsified
- [ ] Clear what would prove pattern wrong
- [ ] Possible to find counter-examples if pattern is incorrect

**If fails:** Pattern may be too vague or circular. Make explicit, testable claims.

---

## Over-Patterning Detection

Over-patterning = seeing connections that aren't really there. This is the primary failure mode in synthesis.

### Red Flags for Over-Patterning

**1. Stretching Examples**
- Examples require significant interpretation to fit pattern
- "If you squint and look at it this way..." reasoning
- Key details of examples are ignored to make pattern work

**Test:** Can you explain the pattern without distorting the examples?

---

**2. Cherry-Picking Data**
- Pattern only works with selected subset of examples
- Convenient examples are highlighted, inconvenient ones ignored
- "Except for..." appears frequently

**Test:** Does pattern explain *all* examples or just convenient ones?

---

**3. Surface-Level Matching**
- Pattern based on superficial similarities, not structural relationships
- Matches features, not relationships
- "Both involve X" when X is very general

**Test:** Does pattern map relational structures or just surface features?

---

**4. Confirmation Bias**
- Only looking for supporting evidence
- Not actively seeking counter-examples
- Dismissing contradictions without investigation

**Test:** What would falsify this pattern? Have you looked for that?

---

**5. Post-Hoc Rationalization**
- Pattern seems to explain everything in retrospect
- But doesn't predict or illuminate
- Feels like just-so story

**Test:** Could this pattern help anticipate new cases? Does it suggest experiments or tests?

---

**6. Trivial Patterns**
- Pattern is obvious once stated
- Everyone familiar with domain would already know this
- Insight value is minimal

**Test:** Does this reveal something non-obvious? Would domain experts find this useful?

---

### Over-Patterning Safeguards

**Safeguard 1: Active Counter-Example Search**
Deliberately look for cases that would break the pattern.

**Process:**
1. State pattern explicitly
2. Ask: "What examples would falsify this?"
3. Search for those examples
4. If found, refine or reject pattern

---

**Safeguard 2: User Validation**
Present pattern as hypothesis and invite critique.

**Script:**
"I'm seeing a pattern here: [explicit statement]. Does this match your understanding? Are there examples where this doesn't fit?"

---

**Safeguard 3: Abstraction Level Test**
Check if pattern is at appropriate level.

**Too specific:** Won't generalize, limited transferability
**Too abstract:** Everything fits, but pattern isn't useful
**Appropriate:** General enough to transfer, specific enough to guide action

---

**Safeguard 4: Structural vs. Surface Test**
Verify pattern identifies structural relationships, not surface features.

**Ask:**
- What relates to what in this pattern?
- What causes what?
- What are the dependencies?

If you can't answer these clearly, pattern may be surface-level.

---

## Coherence Assessment

Coherence = pattern is internally consistent and logically sound.

### Internal Consistency Check

**Test 1: Non-Contradiction**
- Pattern doesn't claim both X and not-X
- Different parts of pattern don't conflict
- Implications follow logically from structure

**If incoherent:** Clarify definitions, resolve contradictions, or split into multiple patterns.

---

**Test 2: Completeness**
- Pattern has all necessary components
- No missing links in causal chains
- Explanatory gaps are acknowledged

**If incomplete:** Add missing elements or acknowledge where pattern is partial.

---

### External Consistency Check

**Test 3: Compatibility with Domain Knowledge**
- Pattern doesn't contradict well-established facts
- Pattern integrates with (not replaces) domain expertise
- When pattern conflicts with domain knowledge, either revise pattern or note that pattern challenges conventional understanding

**If inconsistent:** Either pattern is wrong, or you've found something genuinely new. Investigate carefully.

---

## Applicability Testing

Applicability = knowing when pattern applies and when it doesn't.

### Boundary Condition Testing

**Process:**
1. State pattern
2. Identify boundary conditions: "This pattern applies when..."
3. Test: Find cases just inside boundary (should work) and just outside boundary (should fail)
4. Refine boundaries based on tests

**Example:**
Pattern: "Episodic-to-continuous transformation"
Boundary conditions:
- Technology enables continuous monitoring ✓
- Proactive value > reactive response value ✓
- Customer willing to adopt continuous system ✓

Test cases at boundaries to verify these conditions matter.

---

### Context Sensitivity Testing

**Test:** How does pattern behave in different contexts?

**Questions:**
- Does pattern apply equally in all industries? If not, why?
- Does pattern work at all scales? Where does it break?
- Does pattern hold across cultures? What cultural assumptions does it make?
- Does pattern depend on specific technologies or constraints?

**Goal:** Map the landscape where pattern is valid vs. where it fails.

---

### Negative Case Analysis

**Process:**
1. Find cases where pattern should apply but doesn't
2. Analyze what's different about these cases
3. Use differences to refine boundary conditions

**Example:**
Pattern predicts X in situation Y, but actual outcome is Z.
Why? What's different about this case?
Update: Pattern applies to situation Y *when condition C holds*.

---

## User Feedback Integration

User feedback is the most important validation signal. Here's how to elicit and integrate it effectively.

### Eliciting Useful Feedback

**Good prompts:**
- "Does this pattern match what you're seeing?"
- "Where does this pattern break down or not apply?"
- "What examples don't fit this pattern?"
- "What am I missing in this synthesis?"

**Bad prompts:**
- "This pattern is X, right?" (leading question)
- "Don't you think...?" (assumes agreement)
- Presenting pattern as fact without inviting critique

---

### Types of User Feedback

**1. Confirmation**
"Yes, that captures it exactly."

**Action:** Good! But still ask for boundary conditions and potential failures.

---

**2. Partial Agreement**
"That's partly right, but..."

**Action:** This is gold. The "but" reveals what's missing or wrong. Dig into it.

---

**3. Correction**
"No, that's not quite right."

**Action:** Don't defend the pattern. Ask what's wrong and try different alignment.

---

**4. Extension**
"Yes, and also..."

**Action:** User is adding to pattern. Integrate their insights and re-synthesize.

---

**5. Counter-Example**
"But what about this case?"

**Action:** Excellent! Either pattern needs refinement, or this case has important differences. Investigate.

---

### Feedback Integration Process

**Step 1: Acknowledge**
Show you heard and understand the feedback.

**Step 2: Clarify**
If feedback is unclear, ask questions to understand exactly what doesn't fit.

**Step 3: Refine**
Adjust pattern based on feedback. Options:
- **Narrow:** Add boundary conditions to exclude cases where pattern fails
- **Broaden:** Generalize pattern to cover more cases
- **Modify:** Change structure of pattern to better fit examples
- **Split:** Separate into multiple related patterns
- **Reject:** Pattern doesn't actually hold; try different synthesis

**Step 4: Re-Validate**
Present refined pattern and check if it now fits better.

---

## Refinement Strategies

### Refinement Strategy 1: Boundary Clarification

**When to use:** Pattern works in some cases but not others.

**Process:**
1. Identify where pattern works vs. fails
2. Find distinguishing features
3. Make these explicit boundary conditions
4. Test refined pattern

**Example:**
Original: "Network effects create winner-take-all markets"
After refinement: "Network effects create winner-take-all markets *when switching costs are high and networks are mutually exclusive*"

---

### Refinement Strategy 2: Abstraction Adjustment

**When to use:** Pattern is too specific (doesn't transfer) or too abstract (not useful).

**Process:**
1. Identify problem (too specific or too abstract)
2. Move up or down abstraction ladder
3. Test if new level works better

**Example:**
Too specific: "SaaS companies should use freemium models"
Better: "Products with low marginal costs and network effects benefit from free tiers that drive adoption"

---

### Refinement Strategy 3: Pattern Decomposition

**When to use:** Single pattern is trying to capture too much; different aspects have different structures.

**Process:**
1. Identify distinct sub-patterns
2. Separate into multiple related patterns
3. Show relationships between patterns

**Example:**
Original: Large pattern about digital transformation
After decomposition:
- Pattern A: Analog-to-digital transition pattern
- Pattern B: Cost structure change pattern
- Pattern C: Business model implications pattern
Relationship: A enables B, which drives C

---

### Refinement Strategy 4: Structural Deepening

**When to use:** Pattern describes surface features but misses underlying structure.

**Process:**
1. Ask "why does this pattern work?"
2. Identify causal relationships
3. Reformulate pattern around deeper structure

**Example:**
Surface: "Successful startups pivot frequently"
Deeper: "Successful startups treat assumptions as hypotheses and test them rapidly, pivoting when evidence contradicts assumptions"

---

### Refinement Strategy 5: Counter-Example Integration

**When to use:** Counter-examples reveal pattern is incomplete or wrong.

**Process:**
1. Analyze counter-example carefully
2. Identify what's different about it
3. Either:
   - Add boundary condition to exclude this case
   - Generalize pattern to include this case
   - Recognize pattern was wrong and start over

**Example:**
Pattern: "Open source software always beats proprietary"
Counter-example: Adobe Creative Suite
Analysis: Professional tools with complex workflows and training investment
Refinement: "Open source tends to win when switching costs are low and customization is valuable"

---

## Common Validation Mistakes

### Mistake 1: Defending the Pattern

**Problem:** Treating pattern as something to protect rather than test.

**Why this happens:** Cognitive investment in initial synthesis creates attachment.

**Fix:** Remember patterns are hypotheses. Being wrong is progress.

---

### Mistake 2: Ignoring User Pushback

**Problem:** Dismissing user feedback that contradicts pattern.

**Why this happens:** Belief that synthesis is more objective than user's domain knowledge.

**Fix:** User has information you don't have. When they push back, there's a reason. Find it.

---

### Mistake 3: Skipping Validation

**Problem:** Presenting pattern without testing it.

**Why this happens:** Pattern seems obviously right; feels like testing would waste time.

**Fix:** Most "obvious" patterns have problems. Five minutes of validation can prevent major errors.

---

### Mistake 4: Single Test Type

**Problem:** Only checking one aspect (e.g., only asking "does it explain examples?").

**Why this happens:** First test that comes to mind feels sufficient.

**Fix:** Use multiple complementary tests. Patterns can fail in different ways.

---

### Mistake 5: Accepting Triviality

**Problem:** Pattern is correct but obvious; adds no insight value.

**Why this happens:** Focused on correctness, not value.

**Fix:** Always ask "so what?" If answer is "everyone already knows this," pattern isn't useful.

---

### Mistake 6: Perfect is the Enemy of Good

**Problem:** Over-refining pattern, trying to make it cover every possible case.

**Why this happens:** Desire for comprehensive, universal pattern.

**Fix:** Useful patterns don't need to be perfect. Acknowledge limitations and move forward.

---

## Validation Workflow Summary

**Standard validation sequence:**

1. **Self-check:** Run through pattern quality checklist
2. **Over-patterning check:** Look for red flags
3. **Coherence assessment:** Test internal consistency
4. **User validation:** Present pattern and invite critique
5. **Feedback integration:** Refine based on user input
6. **Boundary testing:** Identify where pattern applies and doesn't
7. **Final check:** Does refined pattern meet quality standards?
8. **Iteration:** Repeat if needed

**Remember:** Validation is not about proving pattern is right. It's about discovering where and how it works, where it fails, and what its limitations are. Good synthesis embraces uncertainty and makes it explicit.
