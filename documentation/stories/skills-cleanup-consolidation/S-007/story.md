# S-007: Harness & Core Rules Restructure

**Status**: planned
**Branch**: feature/skills-cleanup-consolidation
**Created**: 2026-08-22

## Context
The global agent harness has 28 skills — most are conventions masquerading as skills, dead, or project-specific. AGENTS.md mixes thinking frameworks, git rules, and process. This story restructures the foundation: converting skills to lean rules, consolidating AGENTS.md, and cleaning up dead weight.

## Goal
Reduce global skills from 28 to ~5 by converting conventions to rules, consolidating AGENTS.md (<100 lines), and deleting dead/project-specific skills.

## User Story
As a developer using Claude Code, I want the global harness lean and focused, so that every session loads only relevant rules and skills without noise.

## Acceptance Criteria
- [ ] 4 new rule files exist: coding-standards, documentation-standards, observability, git-workflow
- [ ] AGENTS.md < 100 lines with first-principles + agent-discipline merged in
- [ ] Git-workflow content extracted from AGENTS.md into its own rule
- [ ] Dead/converted skills deleted (9 skill directories)
- [ ] 13 project-specific symlinks removed
- [ ] No dangling references (grep confirms clean)

## Scope
**In scope:** Rule creation, AGENTS.md consolidation, skill deletion, symlink cleanup
**Out of scope:** Rule content tuning (that happens via retros), template creation (Story B)

## References
- [PRD.md](../PRD.md) — R1-R5
- [TRD.md](../TRD.md) — Component Change Table, Decision D8 (no rename)
- [discovery.md](../discovery.md) — D1-D18
