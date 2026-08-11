---
name: prd
description: "Product Requirements Document. Tight 1-2 page PRD with problem, users, goals, scope, requirements. Runs AFTER /sdlc discover (if needed), BEFORE /sdlc trd and /sdlc project-plan. Human approval gate."
user_invocable: true
model: opus
---

# /sdlc prd -- Product Requirements Document

Produces a tight, actionable PRD that becomes the single source of truth for what we're building and why. Max 2 pages.

**Usage**: `/sdlc prd <feature or problem statement>`

**Source**: Adapted from Mehdibargach/claude-code-pm-skills PRD template.

## When Claude Should Auto-Invoke

- After `/sdlc discover` produces a clear opportunity and recommended path
- User describes a feature with enough clarity to define requirements
- Ask user: "Ready to write the PRD for this?"

## Human Approval Gate

**The PRD MUST be approved by the user before proceeding to `/sdlc trd` or `/sdlc project-plan`.** Present the PRD and explicitly ask: "Does this PRD capture the requirements correctly? Any changes before I proceed?"

## Instructions

### Phase 0: Branch Check

Run the branch check from `sdlc`'s router before writing `PRD.md` — if `git branch --show-current`
prints `main`, branch out first (`feature/<slug>` from the feature name).

### Phase 1: Gather Context

If `/sdlc discover` was run, reference its output. Otherwise, read relevant code, docs, and existing features to understand the problem space.

If no discovery was done and the problem seems complex, suggest running `/sdlc discover` first.

### Phase 2: Draft PRD

Write the PRD in this exact format. Save to `documentation/stories/<feature-name>/PRD.md`:

```markdown
# PRD: <Feature Name>

**Author**: <user/claude>
**Date**: <today>
**Status**: Draft | 🔒 Approved | Superseded
**Discovery**: <link to discovery summary if exists, or "N/A">

## Problem

<2-3 sentences. What problem are we solving? For whom? What evidence do we have?>

## Users

<Who is affected? Be specific — not "all users" but "merchants who process > 100 orders/day">

| Segment | Pain Level | Current Workaround |
|---------|-----------|-------------------|
| <segment 1> | High/Med/Low | <what they do today> |

## Goals & Success Metrics

| Goal | Metric | Target | Measurement Method |
|------|--------|--------|-------------------|
| <goal 1> | <metric> | <number> | <how to measure> |

**Every metric must have a numeric target.** If you can't put a number on it, it's not a goal — it's a wish.

## What We Are Building

<Concise description of the solution. Use a Mermaid diagram for any flow.>

### Requirements

| # | Requirement | Priority | Notes |
|---|------------|----------|-------|
| R1 | <requirement> | Must-have | |
| R2 | <requirement> | Must-have | |
| R3 | <requirement> | Should-have | |
| R4 | <requirement> | Nice-to-have | |

### User Flows

<Mermaid flowchart showing the primary user journey>

## What We Are NOT Building

**This section is mandatory.** Explicitly list what's out of scope and why. This prevents scope creep during implementation.

- **NOT**: <thing 1> — because <reason>
- **NOT**: <thing 2> — because <reason>

## Triggers & Edge Cases

| Trigger / Edge Case | Expected Behavior |
|--------------------|-------------------|
| <scenario> | <what should happen> |

## Dependencies

- <External service, team, data, or feature this depends on>

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| <risk> | H/M/L | H/M/L | <plan> |

## Open Questions

- [ ] <Question that needs answering before or during implementation>

## Timeline

| Milestone | Target Date | Notes |
|-----------|------------|-------|
| PRD Approved | | |
| TRD Complete | | |
| Implementation Start | | |
| MVP / First Testable | | |
| Launch | | |
```

### Phase 3: Review & Approval

Present the PRD to the user. Highlight:
- Any assumptions that haven't been validated
- Risks that could derail implementation
- Open questions that need answers

**Ask explicitly**: "Does this PRD capture the requirements correctly? Should I adjust scope, priorities, or success metrics?"

**Do NOT proceed until the user approves.** Mark status as `🔒 Approved` once confirmed.

### Phase 4: Next Step

Mark status `🔒 Approved`, then hand back to the `sdlc` router for the next phase — it owns the graph.

## Rules

- PRD must fit in 2 pages (roughly 100-150 lines of markdown)
- Every goal needs a numeric metric target — no vague "improve X"
- "What We Are NOT Building" section is mandatory and non-empty
- Requirements use MoSCoW priority (Must/Should/Could/Won't)
- Use Mermaid diagrams for all flows
- Reference /sdlc discover output if it exists — don't repeat the analysis
- PRD lives at `documentation/stories/<feature-name>/PRD.md`
- Never proceed to /sdlc trd or /sdlc project-plan without explicit user approval
