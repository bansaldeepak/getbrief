# S-005: Templates & Agent Config — Summary

## What Changed
<Updated after each task is completed>

## Decisions Made
- Knowledge graph fully removed (no dual-path, no "if available" — it's gone)
- `project-memory` skill collapsed to single MEMORY.md template (brief primary, file fallback)
- `.claude/CLAUDE.md` scaffolded by `brief init` with `@AGENTS.md` pointer

## Testing
<TBD at implementation>

## Follow-up
- TODO-011: brief story create should detect existing feature folders
