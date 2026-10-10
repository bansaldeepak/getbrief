---
name: portable-installs-and-feature-scoped-concurrent-records
description: Approved Brief local/global packages, pinned updates, canonical records, scoped IDs and immutable logs
metadata:
  type: feedback
created: 2026-10-10
updated: 2026-10-10
valid_until: permanent
importance: 5
---

# Approved portable installation and concurrent-record choices

**Source:** User decisions on 2026-10-10; see [PRD](../stories/portable-concurrent-workflows/PRD.md), [audit](../stories/portable-concurrent-workflows/AUDIT.md), and [TRD](../stories/portable-concurrent-workflows/TRD.md).
**Scope:** Brief installation, distributed workflow guidance and concurrent project records. No unrelated project migration or actual home-package migration is authorized here.
**Status:** Explicitly approved and implemented locally in S-018. See [summary](../stories/portable-concurrent-workflows/S-018/summary.md) for final verification and publication status.

## User choices

- Offer global machine installation and Git-tracked project-local workflow copies. Recommend local for teams; retain the user's selected scope. Global packages update independently. Pinned local copies receive notices and explicit reviewable updates that preserve customizations.
- Preserve historical monolithic logs and existing entries. Each new log is a separate immutable entry associated with session and agent; avoid a shared mutable session index.
- Individual records own state. tracker.yaml and PROJECT-TRACKER.md are generated local views outside routine commits.
- New IDs are human-readable and feature-scoped: checkout/S-001 and checkout/S-001-T1. Different features can each use S-001. Preserve existing IDs; no random visible suffixes or silent identity-conflict resolution.
- Implement/test on top of published feature/autonomous-lifecycle before merge. User selected selective mode separately for S-018.

**Rationale supplied:** Teammates and servers need the same skills; Git must expose updates; parallel agents need fewer incidental conflicts.

## Application

Follow [records and installation](../../skills/brief/references/records-and-installation.md). Local .brief/workflow packages take precedence over global skills; global scope uses the independent home package. Updates use available local sources without an automatic upstream fetch. The CLI runtime is separate.

A tracked .brief/records.json marker selects canonical Markdown authority with complete reserved _brief metadata. Task progress derives from individual task files. Existing projects retain legacy authority until an explicitly authorized migration with a reviewed dry-run. Preserve IDs, links, unknown metadata, custom files and old log bytes. Use CLI-returned IDs and brief verify-records --base=<review-base>.

Apply these constraints in PRD/TRD/tasks and implementation rule checks. Separate records avoid shared tracker writes; edits or allocations within the same record/feature still require coordination.

## Rollout boundary

The parent branch was pushed at 02a3457 under explicit authorization. S-018 is stacked above it. Follow-up push, PR, merge and real-project/home migrations require their own applicable authority. Isolated fixtures do not establish deployment or user application testing.

### Note (2026-10-10)

User clarification on 2026-10-10: Brief is CLI-only; the old MCP server was removed and MCP setup is not wanted. Npm onboarding should use brief install to create the home workflow package. Source is optional; test installed/npm-linked defaults and explicit local directory or symlink sources. Scope: Brief distribution and project setup; no npm publication or real-home migration authorized.
