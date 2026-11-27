# Pre-Mortem Worksheet

## Instructions
Use this optional worksheet only when an extended premortem is warranted or requested. The failure story is hypothetical, not a forecast or fact. Trace each material scenario back to a present assumption and a discriminating observation; do not infer likelihood from vividness. Use existing evidence before directing questions to the user.

---

## Project/Decision Details

**Project name:** _______________________________________________

**Timeline:** It's _____________ (date/timeframe) from now

**Status:** This project/decision has failed

---

## Part 1: The Failure Story

*Write 2-3 paragraphs describing the failure vividly. Make it real.*

What happened?

```
[Write failure narrative here]







```

---

## Part 2: Root Cause Analysis

### What went wrong?

**Technical failure:**
```
[What technical problems occurred?]



```

**Resource failure:**
```
[What resource constraints caused problems?]



```

**Assumption failure:**
```
[What assumptions proved wrong?]



```

**External shock:**
```
[What external events contributed?]



```

---

## Part 3: Warning Signs

### What warning signs did we miss?

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
4. _______________________________________________
5. _______________________________________________

---

## Part 4: Failed Assumptions

### What assumptions proved wrong?

| Assumption | Why it was wrong | Actual reality |
|------------|------------------|----------------|
|            |                  |                |
|            |                  |                |
|            |                  |                |
|            |                  |                |

---

## Part 5: Preventive Actions

### How could we have prevented this?

**Technical preventions:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Resource preventions:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Process preventions:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Part 6: Risk Assessment

### Identified risks and mitigation

| Risk | Severity (1-10) | Probability (1-10) | Mitigation |
|------|-----------------|-------------------|------------|
|      |                 |                   |            |
|      |                 |                   |            |
|      |                 |                   |            |
|      |                 |                   |            |
|      |                 |                   |            |

---

## Part 7: Decision Point

Based on this analysis, what should we do?

### Option A: Proceed with changes
**Changes required:**
- _______________________________________________
- _______________________________________________
- _______________________________________________

**Timeline impact:** _______________________________________________

**Cost impact:** _______________________________________________

---

### Option B: Proceed as planned
**Accepted risks:**
- _______________________________________________
- _______________________________________________
- _______________________________________________

**Monitoring plan:** _______________________________________________

**Contingency plan:** _______________________________________________

---

### Option C: Modify approach
**Modifications:**
- _______________________________________________
- _______________________________________________
- _______________________________________________

**How this addresses key risks:** _______________________________________________

---

### Option D: Cancel or postpone
**Reasons:**
- _______________________________________________
- _______________________________________________
- _______________________________________________

**What would need to change to proceed:** _______________________________________________

---

## Final Decision

**Chosen option:** [ ] A [ ] B [ ] C [ ] D

**Reasoning:**
```
[Why this option makes sense given the analysis]





```

**Next steps:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Review date:** _______________________________________________\
*Schedule follow-up to check if assumptions still hold*

---

## Notes & Additional Considerations

```
[Any additional thoughts, concerns, or observations]









```

---

## Example: VPS Migration Pre-Mortem

**Project:** Migrate from AWS to VPS\
**Timeline:** It's 6 months from now\
**Status:** Migration has failed

### Failure Story
The server went down during a traffic spike. I was at a conference with spotty WiFi. By the time I could SSH in, we'd lost 4 hours of uptime. 15 customers churned immediately.

The incident revealed our backup system wasn't actually working—we discovered this when we needed it most. I spent the next week firefighting, migrating back to managed hosting at 3x the cost in panic mode.

The "95% cost savings" ended up costing us $15K in lost revenue and emergency migrations. I'm exhausted, customers are angry, and I'm 6 weeks behind on product development.

### What went wrong?
- **Technical:** Inadequate monitoring, single point of failure, untested backups
- **Resource:** Underestimated ops time, no backup availability during travel
- **Assumption:** "It won't break," "I can handle this," "backups are working"
- **External:** Traffic spike during my unavailability

### Warning signs missed:
1. Never tested backup restore process
2. No redundancy or failover plan
3. Assumed availability during conference season
4. Didn't account for time cost of operations
5. No documented incident response procedures

### Preventive actions:
**Technical:**
1. Set up comprehensive monitoring before migration
2. Test backup/restore process thoroughly
3. Build redundancy and failover systems
4. Create gradual migration with rollback plan

**Resource:**
1. Calculate true time cost including ops burden
2. Arrange backup support coverage for travel
3. Build operational runbooks for common tasks
4. Set up emergency contact/escalation

**Process:**
1. Dry-run entire migration in staging
2. Load testing before production cutover
3. Document incident response playbook
4. Schedule regular disaster recovery tests

### Decision: Modify approach
Proceed with migration BUT:
- Test everything in staging first
- Migrate gradually (dev → staging → production)
- Maintain AWS as hot backup for first 3 months
- Document all ops procedures before cutover
- Arrange support coverage with another developer
