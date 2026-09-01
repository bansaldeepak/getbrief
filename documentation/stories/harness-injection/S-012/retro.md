# S-012 Retrospective

**Date**: 2026-09-01
**Story**: Harness Injection & Init Rework
**Duration**: 2026-09-01 → 2026-09-01
**PR**: https://github.com/bansaldeepak/agents-setup/pull/26

## Scope Accuracy

- **Planned tasks**: 7
- **Actual tasks**: 7 + 1 review-fix commit
- **Scope change**: Design pivoted 3x on harness approach (copy → @-import → inline-everywhere); task count held but each pivot required test rework

## What Went Well

- D1 detect/apply split implemented exactly as TRD designed — clean separation, no debate
- Atomic writes applied consistently throughout; zero partial-write risk
- `parseMarkers` / `mergeContent` infrastructure proved solid — idempotency held across all 5 rows without special-casing
- 183 tests passing at every commit, no test debt left behind
- BRIEF_SKILLS_PATH fix was clean and unblocked everything downstream immediately

## What Didn't Go Well

- **Three design pivots mid-implementation**: copy HARNESS.md → @-import → inline-everywhere. Each required rework on harness.mjs + test suite
- **Vestige `copied` field** survived the inline-everywhere refactor into final commit — caught in pr-review, not during implementation
- **Heading duplication bug**: `"## Brief Workflow\n\n" + template` doubled the h1 from templates/HARNESS.md — caught by manual run, not an assertion
- **`story.md` ACs not updated** when design changed to inline-everywhere; still reference `.brief/HARNESS.md`

## Learnings

| # | Learning | Action Taken |
|---|----------|-------------|
| 1 | Design pivots mid-impl require immediate test updates in the same change | Saved to memory (MEM-001) |
| 2 | When removing a return field, grep all callers immediately before moving on | Saved to memory (MEM-002) |
| 3 | Template injection tests should assert no heading duplication from prefix + template h1 | Saved to memory (MEM-003) |
| 4 | ACs in story.md should be updated when design changes significantly mid-implementation | Process note |

## System Improvements Made

- MEM-001: Design pivots mid-impl need immediate test updates
- MEM-002: Grep all callers when removing a return field
- MEM-003: Test template injection for heading duplication
- S-012 marked done in tracker with PR link

## Recommendations for Next Story

- When working with template injection, write the heading-duplication test first (before the injection code)
- After any design pivot: update story.md ACs, then update tests, then update implementation — in that order
- `brief update` / `brief uninstall` commands (TODO-013) are now unblocked since markers exist
