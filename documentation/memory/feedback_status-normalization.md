---
name: feedback-status-normalization
description: Preserve recorded status text in Brief scanning and migration;
  historical normalization superseded; metadata boundaries retained
metadata:
  type: feedback
_brief:
  version: 1
  record_id: 048e18dc-54e8-4fcf-ab6a-ce3ad386e15b
  item:
    id: feedback_status-normalization
    type: memory
    title: Preserve recorded status text in Brief scanning and migration; historical
      normalization superseded; metadata boundaries retained
    status: active
    link: null
    pr: null
    updated: 2026-10-11
    description: Preserve recorded status text in Brief scanning and migration;
      historical normalization superseded; metadata boundaries retained
---
# Status preservation and metadata boundaries

**Source:** Original status-formatting feedback; BUG-001 investigation on 2026-10-10; user correction on 2026-10-11 captured in [portable workflow choices](portable-installs-and-feature-scoped-concurrent-records.md) and [S-018-T9](../stories/portable-concurrent-workflows/S-018/tasks/T-009.md).
**Scope:** Brief legacy scanning, regeneration, migration validation, and record metadata handling. No cross-project progress edits or broader alias promotion.
**Status:** Normalization advice below is superseded for these operations; metadata-boundary lessons remain applicable.

## Current application

Preserve recorded status text, including qualifiers and emoji. Migration compares full strings without treating aliases as equivalent or inferring actual progress. Report conflicts for reconciliation. The user will audit actual Astro progress separately, including S-090, which they identified as not started. No automated Astro status edits or migration are authorized by that correction.

## Historical normalization advice — superseded

Decision/research statuses can include explanatory prose, such as "Accepted (Option A) — validated by spike". Normalize actual lifecycle fields to canonical tokens and retain aliases accepted→active, decided→active, complete→completed, and pending→planned. This prevents raw prose from disrupting status counts and tables.

The legacy scanner defaults unrecognized values to active. That fallback must not silently reactivate a recognized deferred decision or be used to resolve a documented conflict.

## BUG-001 correction

- Preserve deferred as a lifecycle status. TODO-014 had an explicit recorded deferral that the scanner incorrectly downgraded to active.
- Read research frontmatter title/status when present; retain support for Markdown-only legacy research.
- Identify lifecycle metadata before reading or updating it. Record frontmatter and record-header status describe lifecycle state. Narrative memory status describes the recorded decision; section-local experiment status describes a subitem. Neither should overwrite the surrounding record's lifecycle or be rewritten by its status update.
- Validate actual record-header status, including indented and inline header formats, without altering adjacent fields.
- When Markdown and tracker metadata disagree, report both values and reconcile against recorded decisions. Do not regenerate the tracker merely to silence migration conflicts.

**How to apply:** Follow the [record contract](../../skills/brief/references/records-and-installation.md). Cover both preservation and genuine-conflict rejection when changing parsers. Use a real-project dry-run plus copied-documentation migration/rollback to supplement synthetic fixtures; fixture success does not authorize or prove a real migration.

See [BUG-001](../bugs/BUG-001.md) for the reproduction, repair, and final verification evidence.

## T9 research identity lesson

Existing research IDs follow explicit filename/frontmatter identity before a unique title match. Directory order must not reassign established IDs. Reserve all declared IDs, including untracked flat legacy files, before allocating new IDs. Ambiguous mappings require reconciliation. Verify generation, migration, and rollback on a temporary copy of the complete real documentation alongside fixtures; copy-based success does not authorize or prove actual migration.
