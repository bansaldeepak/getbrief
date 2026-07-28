---
name: project-memory-review
description: "/project-memory-review -- Manually trigger memory curation. Reviews MEMORY.md for staleness, promotes valuable entries to rules, extracts recurring patterns into skills, prunes outdated entries."
user_invocable: true
---

# /project-memory-review -- Memory Curation

Manually triggers the self-improving agent's memory curation cycle. Reviews, promotes, extracts, and prunes memory entries.

**Usage**: `/project-memory-review`

**Source**: Adapted from alirezarezvani/claude-skills self-improving agent pattern.

## Instructions

Invoke the `self-improving` agent with the following task:

0. **Feature context check** — Before auditing, scan MEMORY.md for feature-specific context (decisions, gotchas, patterns) belonging to a completed or inactive feature:
   - If found: flush to `documentation/architecture/<feature>/context.md` (or `documentation/stories/<feature>/context.md` if no arch folder) per the format in CLAUDE.md "Feature Context Files"
   - If switching topics: prompt "Previous feature context not flushed — flush to [path] before continuing?"
   - After flush: remove flushed content from MEMORY.md

1. **Read** current MEMORY.md and all referenced memory files
2. **Audit** each entry for:
   - **Staleness**: Is this still true? Check against current code/config
   - **Duplication**: Is this captured elsewhere (CLAUDE.md, rules, skills)?
   - **Value**: Has this been useful? Would it be useful in future sessions?
3. **Promote** high-value, recurring patterns:
   - Feedback memories that apply broadly → `.claude/rules/<name>.md` with path scoping
   - Project patterns that are now conventions → Update relevant skill
4. **Extract** complex memory entries into standalone skills if they describe a repeatable workflow
5. **Prune** entries that are:
   - Stale (code/config has changed, making the memory wrong)
   - Duplicated (already in CLAUDE.md, skills, or rules)
   - Ephemeral (was only useful for that one conversation)
6. **Report** changes made and reasoning

Present the proposed changes and wait for user approval before modifying skills or rules. Memory pruning (removing stale entries) can proceed automatically.

## Rules

- Never delete a memory without explaining why
- Promote before pruning — extract value first
- Keep MEMORY.md under 30 lines for active-feature context; flush completed-feature context to context.md
- After curation, MEMORY.md should be a clean, high-signal index (pointers + active patterns only)
