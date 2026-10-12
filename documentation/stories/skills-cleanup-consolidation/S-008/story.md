---
{
  _brief:
    {
      version: 1,
      record_id: 1d06fc8a-b1bc-444d-a6ec-ba60d4006df6,
      item:
        {
          id: S-008,
          type: story,
          title: Brief CLI Enhancements,
          status: done,
          feature: skills-cleanup-consolidation,
          branch: feature/skills-cleanup-consolidation,
          category: feat,
          created: 2026-08-22,
          tasks: 4,
          story: documentation/stories/skills-cleanup-consolidation/S-008/story.md,
          link: null,
          pr: null
        },
      legacy: { current_task: null }
    }
}
---
# S-008: Brief CLI Enhancements

**Status**: done
**Branch**: feature/skills-cleanup-consolidation
**Created**: 2026-08-22

## Context
The brief CLI has a generic CRUD engine (item.mjs, 366 lines) but no dedicated bug or memory commands. Users must manually create tracker entries and memory files. This story adds thin delegation layers for bug and memory workflows.

## Goal
Add `brief bug` and `brief memory` commands as thin delegation layers over the existing item.mjs CRUD engine, with test coverage.

## User Story
As a developer, I want to create and manage bugs and memory entries via brief CLI, so that bug tracking and memory management integrate with the existing project management workflow.

## Acceptance Criteria
- [ ] item.mjs has test coverage (prerequisite for safe delegation)
- [ ] `brief bug create/list/show/update` works with type=bug in tracker
- [ ] `brief memory create/list/show/update` works with type=memory
- [ ] Both commands have their own test suites passing
- [ ] rules/brief.md documents new commands

## Scope
**In scope:** item.mjs tests, bug command, memory command, CLI registration, brief rule update
**Out of scope:** Interactive features, advanced filtering, escalation workflow (that's sdlc/bug in Story D)

## References
- [PRD.md](../PRD.md) — R6-R7
- [TRD.md](../TRD.md) — Data Model section, Design Decision D2 (delegate to item.mjs)
