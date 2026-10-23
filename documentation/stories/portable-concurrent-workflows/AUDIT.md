# Portable and Concurrent Workflows — Audit

**Date:** 2026-10-10 · **Source baseline:** `02a3457` · **Status:** read-only findings; no implementation yet.

## Confirmed Findings

| Area | Evidence | Consequence |
|---|---|---|
| Project installation | `lib/init.mjs` creates links to the checkout's absolute BRIEF_SKILLS_PATH and ignores skills/brief in provider directories | A clone does not carry usable skill contents |
| Link replacement | `lib/symlink.mjs:createLink` removes a mismatching existing destination recursively | Introducing tracked copies requires a preservation-aware install path first |
| Provenance | Init manifest contains absolute targets, timestamps and machine detection; the whole manifest is ignored | It cannot directly serve as a portable committed version record |
| Bundle closure | Implement reads a DB rule outside skills/brief; agent definitions also live outside that tree | Copying only skills/brief is insufficient for a self-contained project workflow |
| Central tracker | `lib/tracker.mjs:writeTracker` rewrites all items into documentation/tracker.yaml | Independent branches modify the same file |
| Lock scope | Shared git-common-dir lock and counter serialize local Git worktrees; separate clones have separate locks/counters | Same-checkout protection does not provide distributed allocation or conflict-free Git merges |
| Derived view | PROJECT-TRACKER.md is generated but tracked by the scaffold | Regenerated combined views can still create merge noise |
| Incomplete reconstruction | `lib/commands/tracker.mjs` preserves extra fields from the old tracker; `scan.mjs` cannot reconstruct every field | Ignoring/deleting the tracker without migration loses information |
| Duplicate IDs | `scanFiles` deduplicates by ID using first-seen wins; numeric IDs are allocated locally | Independently created records can be hidden instead of exposed as conflicts |
| Shared story progress | Task status changes also mutate tracker current_task/last_task fields | Separate task work can contend on one story progress pointer |
| Logging | `brief log` already writes individual entries, but names use milliseconds and ordinary writeFileSync | Simultaneous same-name writes can overwrite; a session/unique ID and exclusive creation are needed |
| Logging guidance | Router setup says logs may be ignored; no firm migration-era contract freezes monolithic logs | Agents can keep following old append conventions; guidance and executable validation must agree |

The previous [multi-agent TRD](../multi-agent-coordination/TRD.md) explicitly excluded Git-level
tracker conflicts. Its [summary](../multi-agent-coordination/S-015/summary.md) deferred cross-machine
coordination and stronger discipline enforcement. This request supplies the need for that follow-up.

## Captured User Choices

Source: this conversation, 2026-10-10. Scope: shared Brief installation and project-record workflows.

- Approves tracked project copies and explicit updates that preserve customizations.
- Refines installation to a user choice between machine-global and project-local copies; a global
  package can update independently and project copies should receive an update notice/choice.
- Requests legacy log files stay intact and new logs be standalone per session so agents avoid
  shared append conflicts. Unique immutable entries with session grouping are the proposed shape.
- Selects individual authoritative records and generated local tracker views.
- Selects human-readable feature-scoped story IDs: stories are numbered within each feature rather
  than across the entire project. Proposed notation is checkout/S-001 and checkout/S-001-T1.
  Exact command syntax remains a technical design detail; same-feature duplicate allocation must
  be detected and preserved for resolution. Existing IDs and links remain valid.

## gstack Reference

Inspected the installed gstack README, setup, and upgrade skill as source references to
[garrytan/gstack](https://github.com/garrytan/gstack). No gstack installation or update was executed;
this audit does not assert it is the latest remote revision.

Relevant patterns: explicit global/local scope, install-type detection, recorded source ownership,
version notices, deferred notifications, backup/recovery, and per-install upgrade results. Its team
mode also supports automatic updates; Brief's proposed project copies remain pinned until accepted.
The useful pattern is controlled scope and update visibility, not copying every gstack policy.

## Proposed Tracker Direction and Its Limit

Store authoritative state with each tracked item/task. Generate combined tracker views from those
records and keep generated state out of routine commits. Migrate all central-only fields before
retiring central authority, preserving a verifiable legacy snapshot. Keep entries from different
sessions separate, and do not mutate a shared session manifest for every log write.

This removes incidental conflicts between unrelated work. Concurrent changes to the same logical
record still need explicit conflict handling and ownership; locks cannot resolve divergent user
intent across disconnected clones. Feature-scoped numbering removes contention between different
features; it does not promise automatic reconciliation of duplicate allocations inside one feature.
