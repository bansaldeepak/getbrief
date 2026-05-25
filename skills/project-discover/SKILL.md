---
name: project-discover
description: "/project-discover -- Structured problem discovery and validation. Runs BEFORE /product-requirements to ensure we're solving the right problem. Brainstorm → Assumptions → Experiments → Discovery Plan."
user_invocable: true
model: opus
---

# /project-discover -- Problem Discovery Skill

Structured problem validation before writing requirements. Ensures we understand the problem space deeply before committing to a solution direction.

**Usage**: `/project-discover <problem area, feature idea, or user pain point>`

**Source**: Adapted from phuryn/pm-skills discovery workflow (Teresa Torres' Opportunity Solution Tree).

## When Claude Should Auto-Invoke

- User describes a vague feature idea without clear problem definition
- Scope is ambiguous and multiple interpretations exist
- The request could affect multiple user segments differently
- Ask user: "This seems like it needs discovery first. Want me to run `/project-discover`?"

## Instructions

You are entering discovery mode. Do NOT write code, stories, PRDs, or tasks. Your job is to deeply understand the problem space and produce a discovery plan.

### Phase 1: Context Gathering

Read relevant code, docs, analytics, and user-facing flows to understand the current state.

**Output**: A "Current Reality" section with:
- How things work today (Mermaid diagram)
- Known pain points or friction
- Existing workarounds users employ

### Phase 2: Brainstorm (Multi-Perspective)

Generate ideas from three lenses:
- **User lens**: What does the user actually need? What job are they trying to do?
- **Technical lens**: What's possible? What constraints exist? What's surprisingly easy or hard?
- **Business lens**: What moves the needle? What's the cost of inaction?

For each perspective, generate 3-5 opportunity statements:
> "Users who [context] need a way to [job-to-be-done] so they can [outcome]"

### Phase 3: Identify Assumptions

For each top opportunity, list assumptions across four categories:

| Category | Question |
|----------|----------|
| **Value** | Will users want this? Will it solve their problem? |
| **Usability** | Can users figure out how to use it? |
| **Feasibility** | Can we build it with current tech/resources? |
| **Viability** | Does it work for the business? Compliance? Cost? |

**Prioritize assumptions** using Impact × Risk:
- **High Impact, High Risk** → Must test before building
- **High Impact, Low Risk** → Monitor but proceed
- **Low Impact** → Ignore for now

### Phase 4: Design Experiments (for High-Risk Assumptions)

For each high-risk assumption, propose a lightweight experiment:

```markdown
### Assumption: <statement>
- **Risk level**: High
- **Experiment**: <what to do to validate>
- **Signal**: <what result would confirm/deny>
- **Effort**: Hours / Days / Weeks
- **Can we test before building?**: Yes/No
```

Prefer experiments that don't require code: user interviews, data analysis, prototypes, competitive analysis, manual processes.

### Phase 5: Discovery Plan

Compile into a structured output:

```markdown
## Discovery Summary

### Problem Space
<2-3 sentences capturing the core problem area>

### Top Opportunities (ranked by Opportunity Score: Importance × (1 - Satisfaction))
1. **O1: <name>** — <one-line summary> [Score: H/M/L]
2. **O2: <name>** — <one-line summary> [Score: H/M/L]

### Critical Assumptions to Validate
1. **A1**: <assumption> → Experiment: <method> → Timeline: <effort>
2. **A2**: <assumption> → Experiment: <method> → Timeline: <effort>

### What We Already Know (Low-Risk Assumptions)
- <assumption we're confident about and why>

### Recommended Path
<Which opportunity to pursue, which assumptions to validate first>

### Open Questions
<Things we can't answer without research or user input>

### Next Step
- If assumptions need validation: "Run experiments, then `/product-requirements <focused-scope>`"
- If problem is clear enough: "Ready for `/product-requirements <specific-feature>`"
- If trivial: "This is small enough to skip to `/project-plan`"
```

**Wait for user input before proceeding to /product-requirements.**

## Rules

- Never jump to solutions — stay in problem space
- At least 3 distinct opportunities before converging
- At least 2 experiments per high-risk assumption
- Use Mermaid diagrams for any flow or relationship
- Challenge the premise: "Do we even need to solve this?" is valid
- If the problem is trivial (< 30 min), say so and redirect to `/project-plan`
- Keep output under 400 lines
- Invoke the `researcher` agent for deep codebase/data exploration if needed
