---
id: TODO-013
title: brief update + brief uninstall commands (Phase 2)
priority: P3
status: open
created: 2026-08-25
story: null
link: null
_brief:
  version: 1
  record_id: 2cb2e552-e283-44d6-90be-00eddd02a25c
  item:
    id: TODO-013
    type: todo
    title: brief update + brief uninstall commands (Phase 2)
    status: open
    priority: P3
    created: 2026-08-25
    link: null
    pr: null
---

## What

brief update + brief uninstall commands (Phase 2)

## Why

## What
Add `brief update` (refresh rule skeletons from updated templates) and `brief uninstall` (remove symlinks + manifest, leave rule content intact).

## Why
The manifest + doctor pattern from this epic creates the foundation. Users need a way to:
- Pull new rule templates when brief is updated (update)
- Cleanly remove brief from a project without manual symlink hunting (uninstall)

## Context
TRD Long-Term Trajectory section explicitly names these as Phase 2. The manifest schema (version, symlinks array, rules_installed) provides all the state needed to implement both.

## Effort
M (human) → S (with CC). Mostly fs operations using manifest as the source of truth.

## Depends on
- This epic completing (manifest must exist)
- TODO-010 Epic 1 items 1.1-1.4 being shipped

## Context

<!-- Where in the code this lives. Relevant files, functions, constraints. -->

## Resolution

_Filled when done:_
- Resolved by: <!-- S-NNN / inline fix -->
- PR: <!-- #NNN -->
- Date: <!-- YYYY-MM-DD -->
