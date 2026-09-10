# S-015: Atomic ID Allocation + Agent Discipline — Summary

## What Changed

- **T1**: Added `brief:memory-harness` snippet to `templates/project-structure/MEMORY.md` and Phase 6 (Persist) to discover skill
- **T2**: Added `rules/brief-cli-ops.md` agent discipline rule + manifest entry for `brief init` distribution
- **T3**: Lock primitives (`acquireLock`, `releaseLock`, `withLock`) + `gitCommonDir` in tracker.mjs with 9 unit tests
- **T4**: Atomic `writeTracker` using `.tmp` + `renameSync` pattern
- **T5**: Counter file (`brief-counter`) in `.git/` with `seedCounter` and `allocateId`, 4 unit tests
- **T6**: Refactored `nextId` to delegate to `allocateId` in git repos, fallback to max+1 in non-git; added `_skipLock` option
- **T7**: Wrapped all 11 `writeTracker` callsites in `withLockIfGit` across `story.mjs`, `item.mjs`, `tracker.mjs` (commands), and `tracker.mjs` (internal). Also added `withLockIfGit` convenience wrapper.
- **T8**: Added `allocateTaskNum` for per-story task counters (`task:S-NNN` keys in brief-counter), replaced directory-scan numbering in `storyTaskCreate` with counter-based allocation in git repos.
- **T9**: Verified `brief next` already reserves (increments counter) after T6 refactor. Added test confirming no files created.
- **T10**: 4 integration tests (lock contention, 5 parallel story creates, task numbering contention, stale lock recovery) using forked child processes. Updated package.json test script to glob `test/**/*.test.mjs` to exclude helper workers.
- **T11**: `brief status` now shows `.git/brief-counter` state — type counters and per-story task counters.

## Decisions Made

- Tests folded into each implementation task (not a standalone test task) — better atomic verification
- T1-T2 are independent (templates/rules), T3-T11 form dependency chain (lock → atomic → counter → callsites → tests)
- `withLockIfGit` convenience wrapper skips locking for non-git projects
- `nextId` accepts `_skipLock` option so callers holding the lock avoid deadlock
- Integration tests in T10 use forked child processes with real git repos

## Testing
- 25 unit tests in `test/tracker.test.mjs` covering lock primitives, counter operations, allocateId, seedCounter, nextId refactor, allocateTaskNum, and reserve behavior
- 4 integration tests in `test/tracker-integration.test.mjs` using forked child processes for cross-process lock contention, parallel allocation, task numbering, stale lock recovery
- 227 total tests pass (up from 183 pre-S-015)

## Follow-up

- Cross-machine coordination (multi-machine teams) — deferred until adoption proves need
- Enforcement mode for agent discipline — observe logging first, decide later
- `generateMarkdown` atomic write — same .tmp+rename pattern, lower priority
