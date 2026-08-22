# S-005: Templates & Agent Config — Summary

## What Changed
- T1: Templates updated — MEMORY.md, AGENTS.md, tracker.yaml all reference brief, not knowledge graph
- T2: `brief init` removes `.project/` scaffolding, adds `.claude/CLAUDE.md` with `@../AGENTS.md`
- T3: `project-memory` skill rewritten — single template, brief primary, file fallback
- T4: Memory rules elevated to global AGENTS.md, claude.md slimmed to provider-specific only

## Decisions Made
- Knowledge graph fully removed (no dual-path, no "if available" — it's gone)
- `project-memory` skill collapsed to single MEMORY.md template (brief primary, file fallback)
- `.claude/CLAUDE.md` scaffolded by `brief init` with `@AGENTS.md` pointer

## Testing
- `npm test` in brief/ — 34/34 pass
- Manual `brief init` on fresh dir — `.claude/CLAUDE.md` created, `.project/` absent
- `grep "knowledge graph|knowledge.db"` across all changed files — 0 hits
- `build.sh` + `check.sh` — all providers in sync

## Follow-up
- TODO-011: brief story create should detect existing feature folders
