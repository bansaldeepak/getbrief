# S-009: SDLC Enrichment

**Status**: planned
**Branch**: feature/skills-cleanup-consolidation
**Created**: 2026-08-22

## Context
The SDLC discover/prd/trd phases lack the rigor that gstack review skills demonstrate. The pre-mortem is a standalone skill that should be absorbed into the bug workflow. This story enriches SDLC phases with structured sections aligned to what gstack reviews check, creates a dedicated bug subskill, and retires the standalone pre-mortem.

## Goal
Create sdlc/bug subskill with pre-mortem extraction, enrich discover/prd/trd phases with structured sections that pass gstack reviews on first attempt, and delete standalone pre-mortem skill.

## User Story
As a developer running the SDLC workflow, I want discover/prd/trd to produce complete documents with all sections that reviews check for, so that PRDs and TRDs pass gstack reviews without repeated back-and-forth.

## Acceptance Criteria
- [ ] `/sdlc bug` routes to new subskill with full mini-workflow (triage → risk → fix → qa → tracker)
- [ ] Discover has mode detection + 5 forcing questions + push rule
- [ ] PRD template has 9 structured sections (aligned to plan-ceo-review's 11-section check)
- [ ] TRD template has 10 structured sections (aligned to plan-eng-review's 4-section check + outputs)
- [ ] Pre-mortem skill hard-deleted (absorbed into sdlc/bug risk assessment)

## Scope
**In scope:** sdlc/bug subskill, SDLC router update, discover/prd/trd enrichment, pre-mortem deletion
**Out of scope:** gstack integration, review skill modifications, telemetry

## References
- [PRD.md](../PRD.md) — R8-R12
- [TRD.md](../TRD.md) — SDLC Enrichment Specification, Pre-Mortem Extraction spec
