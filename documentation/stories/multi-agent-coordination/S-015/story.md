---
{
  _brief:
    {
      version: 1,
      record_id: a93f61c9-abc9-4773-82d4-1dc7f74874ec,
      item:
        {
          id: S-015,
          type: story,
          title: Atomic ID Allocation + Agent Discipline,
          status: planned,
          feature: multi-agent-coordination,
          branch: feature/multi-agent-coordination,
          category: feat,
          created: 2026-09-09,
          tasks: 11,
          story: documentation/stories/multi-agent-coordination/S-015/story.md,
          link: null,
          pr: null
        },
      legacy: { current_task: null }
    }
}
---
# S-015: Atomic ID Allocation + Agent Discipline

**Status**: planned
**Branch**: feature/multi-agent-coordination
**Created**: 2026-09-09

## Context

Brief's `nextId()` in `lib/tracker.mjs:54` reads `max(tracker.yaml + filesystem) + 1` — a classic race condition when parallel agents run in worktrees/forks. Two agents get the same ID, both create files, merge explodes. Additionally, `writeTracker()` uses direct `writeFileSync` (non-atomic), and agents inconsistently bypass the brief CLI for documentation mutations.

PRD approved 2026-09-07. CEO review cut provider abstraction (no second provider exists). Eng review confirmed all 12 `writeTracker()` callsites need locking, identified `Atomics.wait` for retry sleep, and caught two real bugs (counter file needs atomic write, `gitCommonDir` needs `.toString().trim()`).

## Goal

Zero ID collisions across parallel agents, atomic file writes, and a discipline rule ensuring agents use brief CLI exclusively.

## User Story

As a developer running multiple parallel agents (worktrees/forks), I want brief to allocate unique IDs atomically so that story/task merges never collide and require zero manual fixup.

## Acceptance Criteria

- [ ] 5 parallel `brief story create` produce 5 unique sequential IDs
- [ ] `writeTracker()` uses .tmp + renameSync (atomic write pattern)
- [ ] Counter file `.git/brief-counter` shared across worktrees
- [ ] Non-git projects fall back to old `nextId()` behavior
- [ ] `brief next story` reserves ID (increments counter, no files created)
- [ ] Task numbering uses per-story counter (fixes story.mjs:228 race)
- [ ] Stale locks (>10s) auto-removed on next acquire
- [ ] `rules/brief-cli-ops.md` installed by `brief init`
- [ ] MEMORY.md template has harness snippet for `brief memory` commands
- [ ] Discover skill has Phase 6 auto-persist
- [ ] `brief status` shows counter state
- [ ] All existing 183+ tests pass

## Scope

**In scope:** O_EXCL lock, shared counter, atomic writes, all 12 callsite wrapping, task numbering fix, brief next reserve, agent discipline rule, MEMORY.md harness, discover Phase 6, counter in status

**Out of scope:** Provider abstraction, GitHub Issues backend, CF Worker, cross-machine coordination, enforcement mode, `brief reconcile`, Linear/Jira integration

## References

- [PRD.md](../PRD.md) — approved requirements
- [TRD.md](../TRD.md) — architecture, design decisions, pseudocode
- [DISCOVERY.md](../DISCOVERY.md) — problem exploration
