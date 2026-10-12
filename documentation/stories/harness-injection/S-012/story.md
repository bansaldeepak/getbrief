---
{
  _brief:
    {
      version: 1,
      record_id: e85744d3-0eb4-47ef-ad4d-f41233b76ca0,
      item:
        {
          id: S-012,
          type: story,
          title: Harness Injection & Init Rework,
          status: done,
          feature: harness-injection,
          branch: feature/harness-injection,
          category: feat,
          created: 2026-09-01,
          tasks: 7,
          story: documentation/stories/harness-injection/S-012/story.md,
          link: null,
          pr: https://github.com/bansaldeepak/agents-setup/pull/26
        },
      legacy: { current_task: null }
    }
}
---
# S-012: Harness Injection & Init Rework

**Status**: done
**Branch**: feature/harness-injection
**Created**: 2026-09-01

## Context
brief init currently scaffolds project structure but doesn't inject workflow instructions into AGENTS.md/CLAUDE.md. Developers must manually wire them. Additionally, BRIEF_SKILLS_PATH is hardcoded to a path that only works on the original developer's machine.

## Goal
After `brief init`, agents in any initialized project immediately know how to use /brief phases — zero manual wiring.

## User Story
As a developer using brief, I want `brief init` to automatically inject workflow instructions into my project's agent config files, so that agents can use /brief phases without manual setup.

## Acceptance Criteria
- [x] `brief init` in empty project creates .brief/HARNESS.md + inline marker in AGENTS.md (no separate CLAUDE.md marker)
- [x] `brief init` in project with existing AGENTS.md preserves content, injects inline marker with HARNESS content
- [x] `brief init` is idempotent (re-run doesn't duplicate markers or content)
- [x] BRIEF_SKILLS_PATH resolves from import.meta.url (../skills/brief), not homedir()
- [x] Codex detection uses .codex/ only (AGENTS.md presence decoupled from Codex flag)
- [x] Philosophy rules (critical-thinking, first-principles, verification-discipline) installed to .claude/rules/
- [x] This repo self-migrated: HARNESS injected inline into AGENTS.md via markers, root HARNESS.md removed
- [x] All existing tests pass with regression updates (detect.test.mjs, init.test.mjs updated)
- [x] New tests cover all 5 injection matrix rows + error paths + heading duplication assertion

## Scope
**In scope:** HARNESS injection, BRIEF_SKILLS_PATH fix, Codex detection decoupling, philosophy rules, self-migration
**Out of scope:** brief update/uninstall (TODO-013), rules-gen.mjs cleanup (TODO-014), Gemini rules verification (TODO-012)

## References
- [PRD.md](../PRD.md) — Requirements R1-R11
- [TRD.md](../TRD.md) — Architecture, injection matrix, implementation order
- [discovery.md](../discovery.md) — Problem space analysis
