# S-007: Harness & Core Rules Restructure — Summary

# S-007: Harness & Core Rules Restructure — Summary

## What Changed
<Updated after each task is completed>

## Tasks
- T-001: Create 4 new rule files (coding-standards, documentation-standards, observability, git-workflow)
- T-002: Consolidate AGENTS.md (merge first-principles + agent-discipline, extract git-workflow)
- T-003: Remove converted/dead skills + symlinks (9 skill dirs, 22 symlinks)

## Decisions Made
- D8: No rename — AGENTS.md stays as-is (zero functional value, high risk)
- Content consolidation only: merge in, extract out, delete dead weight

## Testing
Verification: grep for dangling references, wc -l for line count target, ls for remaining files.
<TBD at implementation>

## Follow-up
- Rule content tuning happens via retros (self-improving)
- Template creation handled in Story B (S-010)
