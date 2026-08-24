# Skills Cleanup & Consolidation — Retrospective

**Date**: 2026-08-24
**Stories**: S-007, S-008, S-009, S-010
**Duration**: 2026-08-22 → 2026-08-24 (3 days)
**Branch**: feature/skills-cleanup-consolidation

## Scope Accuracy

- **Planned tasks**: 15
- **Actual tasks**: 15
- **Scope change**: +1 template (product-analytics added after initial 6), +1 search enhancement (logs+stories), +1 deferred doc. No tasks removed or split.

## What Went Well

- **Scope held exactly** — 15 planned, 15 delivered. The PRD/TRD/project-plan gating worked; no scope creep despite mid-flight discoveries.
- **Grep-before-delete discipline** — caught the db-safety rule misunderstanding immediately (thought skill AND rule were redundant; only the skill was).
- **One-task-one-commit** — atomic commits made mid-flight corrections trivial to reason about.
- **D9 decision (copy-all init)** — eliminated entire classes of complexity (detection parsing, interactive selection, partial installs). Simpler code, simpler tests.
- **TRD-driven implementation** — task specs were detailed enough that implementation was mechanical. No ambiguity about what to build.
- **Search enhancement discovered organically** — the "do logs get searched?" question surfaced a real gap that would have been missed in a formal plan.

## What Didn't Go Well

- **stdin hang in tests** — `readBody()` tried reading stdin when `process.stdin.isTTY` was falsy in test runner. Cost ~15 minutes debugging. The fix (set isTTY=true in beforeEach) is fragile.
- **Deleted db-safety rule by mistake** — task spec said "db-safety skill was redundant with rule" meaning the SKILL was redundant. Misread as both being redundant. Caught by user question, fixed with `git checkout`.
- **Reviewer agent produced no text summary** — hit turn limit while still investigating. Had to extract findings manually. The reviewer agent needs a turn budget that leaves room for the summary.
- **Pre-mortem location unclear initially** — took a user prompt to realize pre-mortem belongs in BOTH discover (strategic) and bug (tactical). The PRD only mentioned bug absorption.

## Learnings

| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | "X is redundant with Y" can mean X is redundant because Y exists, not both are redundant | Added to Verification Discipline in AGENTS.md: "Task claims are unverified" |
| 2 | Search should cover ALL documentation types — gaps are invisible until someone asks | Fixed: added stories + logs + log.md fallback to search.mjs |
| 3 | Rule templates should include ALL project-specific concerns identified during skill deletion | Added product-analytics as 7th template mid-flight |
| 4 | Project-specific skills (hono-*) need reclassification: conventions → rules, procedures → skills | Documented in deferred.md for Epic 1 |
| 5 | stdin.isTTY in test environments needs a standard pattern | Fragile fix in place; monitor for test flakiness |
| 6 | Reviewer agent needs enough turns to produce a summary after investigating | Note for agent config tuning |

## System Improvements Made

- `brief/lib/search.mjs` — stories, tasks, and logs now searchable (was a gap since project creation)
- `documentation/stories/skills-cleanup-consolidation/deferred.md` — handoff artifact for Epic 1
- `rules/coding-standards.md`, `rules/observability.md`, `rules/documentation-standards.md`, `rules/git-workflow.md` — new universal rules extracted from deleted skills

## Recommendations for Next Story

- **Epic 1 (Project Setup)** should start with the deferred.md document — it captures all decisions that constrain that epic's design
- Consider bumping reviewer agent maxTurns or switching to a workflow-based review that guarantees a summary phase
- The `readBody` stdin pattern needs a proper fix: either detect test environment explicitly, or make body reading opt-in via a flag rather than ambient stdin detection
