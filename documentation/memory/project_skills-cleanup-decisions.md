---
name: skills-cleanup-decisions
description: Key architectural decisions for skills cleanup epic — no rename (D8), item.mjs delegation, copy-all init, enrichment aligned to gstack reviews
type: project
created: 2026-08-22
updated: 2026-08-27
valid_until: 2026-12-01
importance: 5
---

Decisions from discovery + PRD + TRD + eng review (2026-08-22):

**Foundation:**
- D8: ~~AGENTS.md stays as-is~~ → SUPERSEDED (2026-08-27): renamed to HARNESS.md during repo extraction. Context changed — brief is now its own project, HARNESS.md is a template that gets injected into user projects.
- first-principles + agent-discipline merge INTO HARNESS.md (always loaded)
- Git branching rules extract to separate `rules/git-workflow.md`
- Target HARNESS.md: <100 lines after consolidation
- coding-standards becomes lean global rule; backend/frontend go project-local as templates

**Brief CLI:**
- D2: bug.mjs and memory.mjs delegate to item.mjs CRUD engine (DRY, proven)
- Bug tracker schema: BUG-NNN with severity + escalated_to fields
- Memory files use slug-based filenames (not MEM-001.md)
- item.mjs needs tests first (zero coverage today) — prerequisite for delegation

**SDLC Enrichment:**
- PRD sections (9) aligned to plan-ceo-review 11-section check
- TRD sections (10) aligned to plan-eng-review 4-section check + required outputs
- D10: pre-mortem absorbed into sdlc/bug (4 auto-trigger criteria, 4 risk angles, Tiger-only categorization)
- pre-mortem stays functional until sdlc/bug ships in Story D, then hard-deleted

**Init & Templates:**
- D9: `brief init` copies ALL template skeletons — no detection, no interactive selection
- D6: Templates are skeletons (section headers + commented examples, ~20-30 lines each)
- Smart selection deferred to `/brief setup` (Epic 1)
- Rule catalog: `templates/rules/manifest.json` in brief package (6 templates)

**Deferred:**
- `/brief setup` + project-scoped architecture → own PRD (Epic 1)
- inquirer integration for interactive prompts → Epic 1
- Self-improving mechanism for coding-style rule → unspecified (retro-driven)

**Execution:**
- 4 stories on one branch: S-007 → S-008 → S-009 + S-010 (parallel)
- One combined PR for all 4 stories
- 15 total tasks, each = one commit

Related: [[agent-config-loading]], [[standards-split]]
