# S-010: Rule Templates + Init

**Status**: done
**Branch**: feature/skills-cleanup-consolidation
**Created**: 2026-08-22

## Context
Projects currently have no way to bootstrap local rules during `brief init`. Rule templates exist as concepts in the PRD but have no implementation. This story creates skeleton rule templates and enhances init to copy them all into `.claude/rules/` — users delete what they don't need. Smart detection/selection deferred to `/brief setup` (Epic 1).

## Goal
Create rule template skeletons and enhance `brief init` to copy all templates into `.claude/rules/` for immediate project-level rule bootstrapping.

## User Story
As a developer initializing a new project with brief, I want rule templates auto-copied to `.claude/rules/`, so that I have a starting point for project-specific rules without manual creation.

## Acceptance Criteria
- [ ] `brief/templates/rules/manifest.json` exists with 6 template entries
- [ ] 6 skeleton files exist (~20-30 lines each with section headers + commented examples)
- [ ] `brief init` copies all templates to `.claude/rules/` (no interactive selection)
- [ ] Init template-copy behavior covered by tests
- [ ] Existing init behavior (documentation structure, codegraph) unchanged

## Scope
**In scope:** manifest.json, 6 skeleton templates, init.mjs enhancement, init tests
**Out of scope:** Interactive selection (deferred to /brief setup), detect logic, inquirer integration

## References
- [PRD.md](../PRD.md) — R13-R16
- [TRD.md](../TRD.md) — Rule Template Manifest, Template Content Structure, Decision D9 (copy-all)
