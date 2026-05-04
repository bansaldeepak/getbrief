---
name: pre-mortem
description: "Risk assessment before major implementation. Categorizes risks as Tigers (real), Paper Tigers (overblown), and Elephants (unspoken). Auto-triggers before high-risk features."
---

# Pre-Mortem Skill

Risk assessment that runs before major implementation work. Uses the Tigers/Paper Tigers/Elephants framework for sharp risk categorization.

**Source**: Adapted from phuryn/pm-skills pre-mortem framework.

## When to Auto-Apply

- Feature involves database migrations or schema changes
- Feature touches authentication or authorization
- Feature has external dependencies (third-party APIs, services)
- Feature affects payment or billing flows
- Feature requires data migration
- Estimated implementation > 5 tasks
- User explicitly asks for risk assessment

## Framework

### Imagine Failure

"It's 2 weeks after launch. This feature has failed. What went wrong?"

Generate risks from multiple angles:
- **Technical**: What could break?
- **Product**: What could users hate?
- **Process**: What could slow us down?
- **External**: What's outside our control?

### Categorize Each Risk

| Category | Definition | Action |
|----------|-----------|--------|
| **Tiger** 🐯 | Real risk with real consequences | Needs mitigation plan |
| **Paper Tiger** 📄 | Sounds scary but unlikely or low-impact | Acknowledge and move on |
| **Elephant** 🐘 | Real concern nobody's talking about | Surface it, discuss openly |

### For Each Tiger

```markdown
### 🐯 Tiger: <risk name>

- **Likelihood**: High / Medium / Low
- **Impact**: High / Medium / Low
- **Classification**: Launch-blocking / Fast-follow / Track
- **Mitigation plan**: <specific actions>
- **Owner**: <who handles this>
- **Trigger**: <what signals this risk is materializing>
```

### Classification Rules

- **Launch-blocking**: Must be mitigated before launch. Has an action plan with owner.
- **Fast-follow**: Accept for launch, fix within 1 week after. Tracked as follow-up.
- **Track**: Monitor but don't act yet. Define trigger that escalates it.

## Output Format

```markdown
## Pre-Mortem: <Feature Name>

### 🐯 Tigers (Real Risks)

#### Launch-Blocking
1. <risk> — Mitigation: <plan> — Owner: <who>

#### Fast-Follow
1. <risk> — Plan: <what to do post-launch>

#### Track
1. <risk> — Trigger: <what would escalate this>

### 📄 Paper Tigers (Overblown Concerns)
1. <concern> — Why it's not a real risk: <reasoning>

### 🐘 Elephants (Unspoken Concerns)
1. <concern> — Why it matters: <impact>

### Summary
- **Launch-blockers**: N (all have mitigation plans)
- **Fast-follows**: N
- **Tracking**: N
- **Verdict**: Safe to proceed / Address blockers first
```

## Rules

- At least 1 Tiger, 1 Paper Tiger, and 1 Elephant per pre-mortem
- Every launch-blocking Tiger MUST have a mitigation plan with owner
- Paper Tigers must explain WHY they're not real risks (prevents dismissing actual risks)
- Elephants are the most valuable category — push to surface uncomfortable truths
- Keep under 80 lines — if it's longer, the feature might be too big
