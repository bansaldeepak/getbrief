# S-011 Retrospective

**Date**: 2026-08-27
**Story**: Brief Project Setup & Scoped Skills Architecture
**Duration**: 2026-08-25 (planning) → 2026-08-27 (implementation + review)

## Scope Accuracy
- **Planned tasks**: 8
- **Actual tasks**: 8
- **Scope change**: None — all tasks delivered as specified

## What Went Well
- **TRD implementation order was perfect**: T1→T8 built naturally on each other with no backtracking
- **108 tests written alongside code**: caught real bugs (stale-copy mtime, gitignore dedup, indented fences)
- **Task specs were self-contained**: each had enough context to implement without re-reading the TRD
- **PR review found 11 real issues** (4 important, 7 minor) — all fixed in one pass with no test regressions
- **Zero commits on main**: branch discipline held throughout a fast-moving session
- **Idempotency worked first try**: second `brief init` run produces no filesystem changes

## What Didn't Go Well
- **`await import()` in test describe blocks**: Node test runner rejects this at parse time — cost 5 minutes debugging a cryptic error
- **Directory mtime vs file mtime confusion**: initial stale-copy detection checked directory mtime, which doesn't reflect nested file changes — required rewriting to recursive file walk
- **Extension scan without SKIP_DIRS**: first version scanned `node_modules/`, making detection slow and noisy in real projects

## Learnings
| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | Directory mtime only reflects direct-child changes, not nested files | Implemented `newestFileMtime()` recursive walker — saved to feedback memory |
| 2 | CommonMark allows 1-3 spaces before code fences | Fixed marker parser regex; documented in feedback memory |
| 3 | Gitignore substring matching causes false positives | Switched to line-level `===` comparison |
| 4 | Task specs with inline code context eliminate back-and-forth | Confirmed: self-contained specs for handoff works (verification discipline rule) |
| 5 | PR review as a separate pass catches things QA agent misses | Review found design issues (DRY, anchoring) that tests can't cover |

## System Improvements Made
- **Memory updated**: `project_next-steps-scaffold.md` (init architecture), `reference_skills-cli-local-sources.md` (rewritten for new symlink model)
- **New memory created**: `feedback_init-patterns.md` (implementation patterns and gotchas)
- **No skill/rule changes needed**: existing workflow handled this story well

## Recommendations for Next Story
- When building file-scanning utilities, always include a SKIP_DIRS set from the start
- Test stale-detection with file-level backdating, not directory-level
- Self-contained task specs (code snippets, schema, decisions inline) are the right format — continue using them
