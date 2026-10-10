---
name: portable-installs-and-feature-scoped-concurrent-records
description: Portable installs and feature-scoped concurrent records
metadata:
  type: feedback
created: 2026-10-10
updated: 2026-10-10
valid_until: permanent
importance: 5
---

Source: user statements on 2026-10-10; see documentation/stories/portable-concurrent-workflows/PRD.md and AUDIT.md.
Scope: Brief installation and concurrent project records.
Status: approved product direction; full PRD/technical design and implementation pending.

Choices:
- Offer global machine installation and Git-tracked project-local skill copies. Global packages update independently; local copies receive update notices and update through an explicit reviewable action, preserving customizations and complete portable dependencies.
- Preserve legacy monolithic logs. New logs are standalone session-associated records so agents do not append to one shared file.
- Individual records own state; tracker.yaml and PROJECT-TRACKER.md are generated local views outside routine commits.
- Future story IDs are human-readable and feature-scoped, with numbering inside each feature. checkout/S-001 is proposed syntax. Do not add random suffixes to visible story IDs or renumber existing stories without authorization.

Rationale supplied: teams and servers need the same skills; Git must expose updates; parallel agents need fewer incidental conflicts.
Application: explicit PRD/TRD/task constraints. Preserve IDs, links, tracker metadata and old log bytes; surface duplicate IDs or divergent same-item edits rather than choosing a winner. Different-feature work is independent; feature numbering does not guarantee automatic same-feature reconciliation.
