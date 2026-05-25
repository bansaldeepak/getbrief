---
name: technical-requirements
description: "/technical-requirements -- Technical Requirements Document. Architecture design, system design, data model changes, API contracts, technical constraints. Runs AFTER /product-requirements approval, BEFORE /plan. Human approval gate when architecture changes are involved."
user_invocable: true
model: opus
---

# /technical-requirements -- Technical Requirements Document

Translates approved PRD requirements into technical architecture and design decisions. Ensures architecture is reviewed before implementation begins.

**Usage**: `/technical-requirements <feature name>` (references the approved PRD)

## When Claude Should Auto-Invoke

- After PRD is approved and the feature involves:
  - New database tables/columns or schema changes
  - New API endpoints or changes to existing contracts
  - New services, modules, or significant refactoring
  - Third-party integrations
  - Performance-sensitive features
  - Security-sensitive features
- For simple features (UI-only, config changes), skip TRD and go to `/project-plan`
- Ask user: "This involves architecture changes. Should I write a TRD?"

## Human Approval Gate

**The TRD MUST be approved by the user before proceeding to `/project-plan` when architecture changes are involved.** Present the TRD and explicitly ask: "Does this technical approach look right? Any concerns before I plan the implementation?"

## Instructions

### Phase 1: Read the PRD

Read `documentation/stories/<feature-name>/PRD.md`. If it doesn't exist or isn't approved, stop and redirect to `/product-requirements`.

### Phase 2: Assess Current Architecture

Use the `researcher` agent to:
- Map current system architecture relevant to this feature
- Identify existing patterns, services, and data models
- Find integration points and boundaries
- Check for existing technical debt that affects this work

**Output**: "Current Architecture" section with Mermaid diagram.

### Phase 3: Draft TRD

Write the TRD in this format. Save to `documentation/stories/<feature-name>/TRD.md`:

```markdown
# TRD: <Feature Name>

**Author**: <user/claude>
**Date**: <today>
**Status**: Draft | 🔒 Approved | Superseded
**PRD**: [PRD.md](./PRD.md)

## Overview

<1-2 sentences: What technical changes are needed to fulfill the PRD requirements?>

## Current Architecture

<Mermaid diagram showing relevant parts of the current system>

## Proposed Architecture

<Mermaid diagram showing the target state>

### What Changes

| Component | Change Type | Description |
|-----------|------------|-------------|
| <component> | New / Modified / Removed | <what changes> |

## Data Model

### Schema Changes

<Mermaid ER diagram if database changes are involved>

```sql
-- Migration pseudocode (not final — final migration created during implementation)
ALTER TABLE ...
CREATE TABLE ...
```

### Data Migration

- **Backwards compatible?**: Yes/No
- **Migration strategy**: <online migration, backfill script, etc.>
- **Rollback plan**: <how to undo if something goes wrong>

## API Design

### New/Modified Endpoints

| Method | Path | Request | Response | Auth | Notes |
|--------|------|---------|----------|------|-------|
| POST | /api/... | `{ body }` | `{ data: T }` | Required | |

### API Contracts

<Zod schema definitions or TypeScript interfaces for request/response shapes>

## System Design

### Component Interaction

<Mermaid sequence diagram showing how components interact for key flows>

### Design Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| <decision> | A, B, C | B | <why B wins> |

**Record every non-obvious technical decision here.** These become the project's technical memory.

### Design Patterns

<Which existing patterns to follow, or new patterns being introduced>
- Pattern: <name> — Used for: <what> — Reference: <existing example in codebase>

## Performance Considerations

- **Expected load**: <requests/sec, data volume, concurrent users>
- **Bottlenecks**: <identified hot paths>
- **Caching strategy**: <if applicable>
- **Query complexity**: <any N+1 risks, heavy joins>

## Security Considerations

- **Auth/AuthZ changes**: <what changes to access control>
- **Data sensitivity**: <PII, financial data, etc.>
- **Input validation**: <attack surface changes>
- **OWASP top 10 relevance**: <which apply>

## Dependencies

| Dependency | Type | Risk | Mitigation |
|-----------|------|------|------------|
| <dep> | Internal/External/Package | H/M/L | <plan> |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | <services, utils> | Mock dependencies |
| Integration | <API endpoints, DB queries> | Real DB, test fixtures |
| E2E | <user flows> | If applicable |

## Open Technical Questions

- [ ] <Question that needs answering during implementation>

## Implementation Order (High-Level)

<Suggested order of implementation — this feeds into `/project-plan` task breakdown>

1. <First: data model / schema changes>
2. <Second: service layer>
3. <Third: API endpoints>
4. <Fourth: frontend>
5. <Fifth: tests and integration>
```

### Phase 4: Review & Approval

Present the TRD to the user. Highlight:
- Architecture decisions that have long-term implications
- Trade-offs made and alternatives considered
- Risks and their mitigations
- Any open technical questions that need resolution

**Ask explicitly**: "Does this technical approach look right? Any concerns about the architecture, data model, or design decisions?"

**Do NOT proceed to `/project-plan` until the user approves architecture changes.**

For minor technical details (naming, file structure), user can defer to Claude's judgment.

### Phase 5: Update Documentation

After TRD approval:
- If new patterns are introduced, update relevant documentation
- If architecture docs exist, update them to reflect planned changes
- Reference the TRD from the PRD (add link)

### Phase 6: Next Step

After approval: "Architecture approved. Running `/project-plan` to break this into stories and tasks."

## Rules

- TRD must reference an approved PRD — redirect to `/product-requirements` if missing
- Every design decision must list alternatives considered
- Use Mermaid diagrams for architecture, data model, and sequence flows
- Schema changes must include rollback plan
- Security and performance sections are mandatory (even if "N/A — no changes")
- Design decisions recorded here become the project's technical memory
- TRD lives at `documentation/stories/<feature-name>/TRD.md`
- Never proceed to /project-plan for architecture changes without user approval
- Keep the TRD focused — implementation details belong in task descriptions, not here
