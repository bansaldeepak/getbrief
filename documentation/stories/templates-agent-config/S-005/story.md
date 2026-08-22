# S-005: Templates & Agent Config — Remove Knowledge Graph, Make Brief Canonical

**Status**: planned
**Branch**: feature/templates-agent-config
**Created**: 2026-08-22

## Context
Templates, skills, and provider configs still reference a knowledge graph system that was never operational. `brief` is the implemented replacement (S-002, S-003, S-004). This story removes the dead references and makes brief + file-based memory the documented system.

## Goal
Zero knowledge-graph references in active templates, skills, and configs. `brief init` scaffolds a working project with correct instructions.

## User Story
As an AI agent bootstrapping a new project, I want `brief init` to produce templates that reference working tools, so that I don't waste tokens on dead MCP tool instructions.

## Acceptance Criteria
- [ ] `grep -rn "knowledge" templates/ custom-skills/project-memory/ providers/ AGENTS.md` returns 0 hits
- [ ] `brief init` on a fresh dir creates working structure (no `.project/`, has `.claude/CLAUDE.md`)
- [ ] `project-memory` skill has single MEMORY.md template using brief + file fallback
- [ ] Existing tests pass (`npm test` in brief/)

## Scope
**In scope:** Template updates, init.mjs changes, project-memory skill rewrite, provider config cleanup
**Out of scope:** New features, build.sh changes, codegraph changes, migration scripts

## References
- [Discovery](./discovery.md)
- [PRD](./prd.md)
- [TODO-010 Epic 3](../../../todo/TODO-010.md)
