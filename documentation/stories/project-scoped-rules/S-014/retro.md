# S-014 Retrospective

**Date**: 2026-09-04
**Story**: Project-Scoped Rules & Smart Init
**Duration**: 2026-09-04 → 2026-09-04

## Scope Accuracy
- **Planned tasks**: 9
- **Actual tasks**: 9 + 1 review-fix commit (review caught 2 important issues)
- **Scope change**: None added or removed; one unplanned commit to resolve PR review findings

## What Went Well
- TRD was detailed enough (exact file:line, exact diffs) that every task was mechanical — zero ambiguity during implementation
- Single-pass regex decision from eng review was correct and caught upfront — no ordering bugs in body.mjs
- Exporting `matchesDetection` directly enabled the reviewer to catch the null guard gap and the dead manifest entry; integration-only tests would have missed both
- PR review found 2 real bugs that would have reached main — review process working correctly
- 183 → 198 tests (+15) with zero regressions across 9 implementation commits

## What Didn't Go Well
- TRD had a contradiction: Design Decisions table row said "B" for escape handling while the expanded section ultimately resolved to "A" — required a cleanup commit in T-008
- `@remix-run/react` was added to the manifest without adding it to `FRAMEWORK_PATTERNS.npm` in `detect.mjs` — the manifest and detection code are coupled but the coupling isn't obvious; the error was silent (no test, no warning)

## Learnings

| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | Adding a framework to a manifest `file:framework` pattern requires the same name in `detect.mjs` FRAMEWORK_PATTERNS — one without the other is silently dead | Saved feedback memory: manifest-detect-sync |
| 2 | Exported functions need null guards on params that internal callers previously guaranteed | Saved feedback memory: export-null-guards |
| 3 | TRD Design Decisions table is the source of truth; expanded sections contradicting the table cause cleanup work | Saved feedback memory: trd-decisions-table |

## System Improvements Made
- 3 feedback memories saved to `/Users/db/.claude/projects/-Users-db-Work-Arcitae-brief/memory/`
- TODO-015 created tracking the observability detection gap (detectStack doesn't scan for @sentry/posthog/@opentelemetry)
- TODO-014 deferred with CEO review rationale

## Recommendations for Next Story
- When writing TRD: fill the Design Decisions table row first, then write the expanded section — don't write the expanded section as a thinking-out-loud discussion that arrives at the answer later
- Before committing any manifest detect pattern changes: verify every `package.json:X` entry has X in `lib/detect.mjs` FRAMEWORK_PATTERNS
- S-012-T7 (self-migrate this repo) is still in_progress and should be the next story
