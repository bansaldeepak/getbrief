---
name: memory-review
description: "Trigger memory curation. Flushes inactive feature context, then reviews MEMORY.md for staleness, promotes valuable entries to rules or skills, and prunes what's dead."
user_invocable: true
---

# /brief memory-review -- Memory Curation

**Usage**: `/brief memory-review`

The curation procedure lives in the `self-improving` agent, and the memory format lives in
`project-memory`. This skill is the entry point — it does not restate either.

## Instructions

1. **Flush inactive feature context first.** Scan `MEMORY.md` for decisions, gotchas, or patterns
   belonging to a completed or inactive feature and move them to that feature's `context.md` — see
   `project-memory` for the location table and format. If the user is switching topics with context
   still unflushed, ask before proceeding.

2. **Invoke the `self-improving` agent** to review, promote, extract, and prune what remains.

3. **Report** the agent's curation summary.

Memory pruning proceeds automatically. **Wait for user approval before modifying skills or rules** —
those are shared configuration, not project state.

## Rules

- Flush before curating — otherwise finished work gets pruned as "stale" instead of preserved
- Never delete a memory without saying why
- Promote before pruning: extract the value, then remove the entry
- After curation `MEMORY.md` is a clean index of active work, under ~40 lines
