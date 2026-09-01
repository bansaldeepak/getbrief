# S-012: Harness Injection & Init Rework

**Status**: planned
**Branch**: feature/harness-injection
**Created**: 2026-09-01

## Context
brief init currently scaffolds project structure but doesn't inject workflow instructions into AGENTS.md/CLAUDE.md. Developers must manually wire them. Additionally, BRIEF_SKILLS_PATH is hardcoded to a path that only works on the original developer's machine.

## Goal
After `brief init`, agents in any initialized project immediately know how to use /brief phases — zero manual wiring.

## User Story
As a developer using brief, I want `brief init` to automatically inject workflow instructions into my project's agent config files, so that agents can use /brief phases without manual setup.

## Acceptance Criteria
- [ ] `brief init` in empty project creates .brief/HARNESS.md + markers in AGENTS.md + CLAUDE.md
- [ ] `brief init` in project with existing AGENTS.md preserves content, adds inline marker
- [ ] `brief init` is idempotent (re-run doesn't duplicate)
- [ ] BRIEF_SKILLS_PATH resolves from import.meta.url, not homedir()
- [ ] Codex detection uses .codex/ only (AGENTS.md presence decoupled)
- [ ] Philosophy rules installed to .claude/rules/
- [ ] This repo self-migrated: .brief/HARNESS.md exists, root HARNESS.md removed
- [ ] All existing tests pass (regressions updated)
- [ ] New tests cover all 5 injection matrix rows + error paths

## Scope
**In scope:** HARNESS injection, BRIEF_SKILLS_PATH fix, Codex detection decoupling, philosophy rules, self-migration
**Out of scope:** brief update/uninstall (TODO-013), rules-gen.mjs cleanup (TODO-014), Gemini rules verification (TODO-012)

## References
- [PRD.md](../PRD.md) — Requirements R1-R11
- [TRD.md](../TRD.md) — Architecture, injection matrix, implementation order
- [discovery.md](../discovery.md) — Problem space analysis
