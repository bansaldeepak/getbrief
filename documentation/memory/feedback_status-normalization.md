---
name: feedback-status-normalization
description: Preserve lifecycle status during legacy scanning and migration; distinguish record metadata from narrative or section-local status.
metadata:
  type: feedback
---

# Status normalization and metadata boundaries

**Source:** Original status-formatting feedback; BUG-001 user reproduction and source investigation on 2026-10-10.
**Scope:** Brief legacy scanning, record migration, and record updates.
**Status:** Observed implementation lessons; no new user policy or migration authorization.

## Original lesson

Decision/research statuses can include explanatory prose, such as "Accepted (Option A) — validated by spike". Normalize actual lifecycle fields to canonical tokens and retain aliases accepted→active, decided→active, complete→completed, and pending→planned. This prevents raw prose from disrupting status counts and tables.

The legacy scanner defaults unrecognized values to active. That fallback must not silently reactivate a recognized deferred decision or be used to resolve a documented conflict.

## BUG-001 correction

- Preserve deferred as a lifecycle status. TODO-014 had an explicit recorded deferral that the scanner incorrectly downgraded to active.
- Read research frontmatter title/status when present; retain support for Markdown-only legacy research.
- Identify metadata before normalizing it. Record frontmatter and record-header status describe lifecycle state. Narrative memory status describes the recorded decision; section-local experiment status describes a subitem. Neither should overwrite the surrounding record's lifecycle or be rewritten by its status update.
- Validate actual record-header status, including indented and inline header formats, without altering adjacent fields.
- When Markdown and tracker metadata disagree, report both values and reconcile against recorded decisions. Do not regenerate the tracker merely to silence migration conflicts.

**How to apply:** Follow the [record contract](../../skills/brief/references/records-and-installation.md). Cover both preservation and genuine-conflict rejection when changing parsers. Use a real-project dry-run plus copied-documentation migration/rollback to supplement synthetic fixtures; fixture success does not authorize or prove a real migration.

See [BUG-001](../bugs/BUG-001.md) for the reproduction, repair, and final verification evidence.
