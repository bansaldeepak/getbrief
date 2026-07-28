---
name: feature-context
description: Rules for feature context.md files. Auto-applies during /retro, /memory-review, or /project-plan when flushing implementation context to permanent storage.
---

# Feature Context Files

MEMORY.md = ephemeral scratch pad. **Permanent context lives in `context.md` alongside feature docs.**

## Location

| Feature has... | Location |
|----------------|----------|
| Architecture folder | `documentation/architecture/<feature>/context.md` |
| Only story folders | `documentation/stories/<feature>/context.md` |

## What belongs

- **Implementation decisions**: Why X over Y (when not in TRD/decision-doc)
- **Gotchas**: Non-obvious issues (auth quirks, DB edge cases, API surprises)
- **Emergent patterns**: Conventions discovered during dev
- **Won't do / next time**: Scope cuts with rationale

**Does NOT belong**: architecture design, API contracts, schema definitions, task tracking, decision trade-offs (all captured elsewhere).

## Format

```markdown
# <Feature> — Implementation Context

## Key Decisions
- **[Decision]**: [Why — one sentence, what was the alternative]

## Non-obvious Patterns
- **[Pattern]**: [When it applies, code reference if helpful]

## Gotchas
- **[Gotcha]**: [What trips people up, how to avoid]

## What We'd Do Differently
- [item]
```

## When to create/update

- At `/retro` — flush feature memory to context.md, clean MEMORY.md
- At `/memory-review` — flush completed/inactive feature context
- At `/project-plan` — check if previous feature has outstanding context to flush
