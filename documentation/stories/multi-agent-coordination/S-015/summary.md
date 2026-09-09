# S-015: Atomic ID Allocation + Agent Discipline — Summary

## What Changed
<!-- Updated after each task is completed -->

## Decisions Made

- Tests folded into each implementation task (not a standalone test task) — better atomic verification
- T1-T2 are independent (templates/rules), T3-T11 form dependency chain (lock → atomic → counter → callsites → tests)
- `withLockIfGit` convenience wrapper skips locking for non-git projects
- `nextId` accepts `_skipLock` option so callers holding the lock avoid deadlock
- Integration tests in T10 use forked child processes with real git repos

## Testing
<TBD at implementation>

## Follow-up

- Cross-machine coordination (multi-machine teams) — deferred until adoption proves need
- Enforcement mode for agent discipline — observe logging first, decide later
- `generateMarkdown` atomic write — same .tmp+rename pattern, lower priority
