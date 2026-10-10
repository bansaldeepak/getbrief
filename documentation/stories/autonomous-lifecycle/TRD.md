# Technical Approach: Autonomous Lifecycle

**Status**: Recorded for implementation — user explicitly authorized applying the approved PRD.
**PRD**: [Approved requirements](PRD.md)
**Architecture impact**: Existing file-based skills and knowledge stores; no new service, schema, or runtime dependency.

## Decisions and Applied Constraints

| Source / constraint | Application |
|---------------------|-------------|
| User chose selective and approved policy changes | Local verified commits proceed; publication still requires approval |
| User wants existing learning loop retained | Curation applies authorized rule/skill/agent updates; planning explicitly consumes them |
| User controls scope and ambiguity | Explicit choice provenance; pause dependent work on unresolved questions |
| Existing DB safety rule | Execution approval remains separate in all modes |
| Repo stores memory locally | Canonical documentation/memory with CLI-first access and capability fallback |
| User authorized all-project availability | Install shared registrations safely; preserve unrelated globals and project overrides |

## Ownership

Router owns phase order and authorized handoffs. Implement owns mode selection, commit policy,
resume state, and publication. Review owns finding classification and closure. Retro owns timing
and deferred recovery. Memory owns capture/recall; self-improving owns reconciliation and authorized
promotion. A small shared planning reference supplies the reusable context procedure.

## Rollout

Keep this checkout's skills/brief canonical. Existing project links remain valid. Repair the known
broken global brief registration and install shared source links for supported hosts. Distribute
only named workflow artifacts, with a manifest, dry-run, backups and conflict checks; preserve other
global content. Do not invoke the old whole-config overwrite pipeline. Record actual installation
evidence and disclose that existing sessions may need reloading.

## Failure and Verification

| Failure | Response / verification |
|---------|-------------------------|
| Unresolved requirement or source conflict | Ask and pause dependent work; do not invent a default |
| Foreign target or custom global content | Preserve it; show exact conflict before replacement |
| Source/reference drift | Fail active-source check, identify location; no blanket historical cleanup |
| Installer interrupted | Atomic writes, backups and repeatable verification; rerun safely |
| Review or later change invalidates checks | Review affected changes and rerun relevant checks |

Required: existing Node tests; negative reference fixtures; installer tests in temporary directories;
independent dry-run scenarios covering modes, ambiguity, debt, scoped learning, and retro; installed
content/link verification. Missing lint/typecheck are N/A, not passes. No real DB or remote push in tests.

## Rollback

Use task commits to revert source changes. Installation backups/manifest retain displaced managed
content; restore only registered paths after inspecting changes. Unrelated projects and files are
not touched. Shared links immediately reflect source edits, so validate before final rollout.

## Task Order

1. [S-017-T1](S-017/tasks/T-001.md): execution/review/retro policy and harness.
2. [S-017-T2](S-017/tasks/T-002.md): planning and learning contracts.
3. [S-017-T3](S-017/tasks/T-003.md): integrity and safe global installation.
