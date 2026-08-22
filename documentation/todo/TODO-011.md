---
id: TODO-011
title: brief story create should detect existing feature folders or accept --folder/--id flags
priority: P1
status: open
created: 2026-08-22
story: null
link: null
---

## What

brief story create should detect existing feature folders or accept --folder/--id flags

## Why

## What

`brief story create` always generates a new slug from the title and creates a fresh feature folder. If a feature folder already exists (e.g., from earlier PRD/discovery work), it creates a duplicate instead of placing the story inside the existing one.

## Why

SDLC workflow creates the feature folder during discovery/PRD phases (before the story exists). When project-plan runs `brief story create`, it should place the story in that existing folder, not create a parallel one.

## Context

Hit during S-005 planning: `documentation/stories/templates-agent-config/S-005/` already had discovery.md, prd.md, trd.md. Running `brief story create` generated `documentation/stories/templates-agent-config-remove-knowledge-graph-make-brief-canonical/S-006/` instead.

## Possible Fixes

1. Accept `--folder=<existing-slug>` to place story in existing feature folder
2. Accept `--id=S-NNN` to control the story ID
3. Fuzzy-match existing folders and ask "Did you mean this folder?"
4. If the branch name matches an existing folder slug, use that folder automatically

## Context

<!-- Where in the code this lives. Relevant files, functions, constraints. -->

## Resolution

_Filled when done:_
- Resolved by: <!-- S-NNN / inline fix -->
- PR: <!-- #NNN -->
- Date: <!-- YYYY-MM-DD -->
