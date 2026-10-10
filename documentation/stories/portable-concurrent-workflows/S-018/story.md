# S-018: Portable installs and concurrent project records

**Status**: in_progress
**Branch**: feature/portable-concurrent-workflows
**Created**: 2026-10-10

## Context
Implement the approved portable/concurrent-workflows PRD and TRD on top of the published feature/autonomous-lifecycle at 02a3457. User directed combined local testing before merge on 2026-10-10.

## Goal
Portable scoped Brief installations and independent project records that merge cleanly across different features.

## Scope
Global/local workflow installation and updates; authoritative record metadata and explicit lossless migration; feature-scoped new story IDs; immutable session logs and validation; combined local tests.
No remote publication of this follow-up, merge, or migration of unrelated projects.

## Applied Constraints
Preserve all existing IDs, record metadata, project customizations, and legacy log bytes. New stories are feature-scoped; same-feature collisions are reported. Project copies stay pinned until explicit update. No new database or hosted coordinator.

## Execution Policy
Mode: selective, explicitly selected by user in this conversation.
Policy/model changes described in PRD/TRD and implementation are authorized. Routine verified commits proceed.
Critical checkpoint: before any actual project migration or global installation beyond isolated test fixtures, prepare exact diff/backup plan and reuse only applicable explicit approval.
Retro before follow-up publication; no merge until combined local verification and user approval.

## Acceptance Criteria
- [x] Lossless record migration and reconstruction of local tracker views.
- [x] Feature-scoped IDs and independent task/log writes validated across clones.
- [x] Complete pinned local bundles and scoped global updates preserve customizations.
- [x] Both lifecycle and portability changes pass combined local checks.

## Local completion
All six tasks are done; combined local verification passed. Story remains open for publication/user
testing/merge decisions. No follow-up push, PR, or merge has occurred. See summary and retro.

User clarified CLI-only npm onboarding on 2026-10-10. T5 removes obsolete MCP remnants, makes
brief install own the home workflow package, and verifies optional local source overrides.

T6 adds the reader-facing pilot guide and selected getbrief package/repository naming; executable
brief is retained. Repository rename verified with private visibility unchanged. Real-project pilot pending.
