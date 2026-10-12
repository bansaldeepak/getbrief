---
{
  _brief:
    {
      version: 1,
      record_id: 1e1c61d8-48b9-4662-9f6d-f67654be02cd,
      item:
        {
          id: S-011,
          type: story,
          title: Brief Project Setup & Scoped Skills Architecture,
          status: done,
          feature: brief-project-setup,
          branch: feature/brief-project-setup,
          category: feat,
          created: 2026-08-25,
          tasks: 8,
          story: documentation/stories/brief-project-setup/S-011/story.md,
          link: null,
          pr: https://github.com/bansaldeepak/agents-setup/pull/24
        },
      legacy: { current_task: S-011-T2 }
    }
}
---
# S-011: Brief Project Setup & Scoped Skills Architecture

**Status**: done
**Branch**: feature/brief-project-setup
**Created**: 2026-08-25

## Context
Developers adopting agentic workflows have no install path for structured project management. Brief's `init` command copies documentation scaffolds and rule templates but doesn't create symlinks, detect agents, or support multi-agent setups. Skills live in `~/.agents/custom-skills/` (a separate directory from the brief package), making distribution fragile and updates manual.

## Goal
Transform `brief init` into an interactive multi-agent installer with tech detection, symlink management, per-agent rule generation, and health checking — getting any developer from zero to productive agent session in under 10 minutes.

## User Story
As a developer setting up a new project with brief, I want `brief init` to detect my agents and tech stack, create proper symlinks, and scaffold rules in native formats, so that Claude/Codex/Gemini all find skills and rules without manual configuration.

## Acceptance Criteria
- [ ] Core skills (brief, sdlc, project-memory) relocated to `~/.agents/brief/skills/brief/`
- [ ] `/sdlc` thin alias skill exists at `~/.agents/brief/skills/sdlc/SKILL.md`
- [ ] All SKILL.md router references rewritten from `custom-skills/` to `brief/skills/brief/`
- [ ] Global `~/.claude/skills/` symlinks point to new locations
- [ ] `brief init` creates single-level symlinks into `.claude/skills/` and `.agents/skills/`
- [ ] Agent directory detection (Claude, Codex, Gemini) works passively
- [ ] Tech stack detected from codegraph + manifest files (package.json, Cargo.toml, etc.)
- [ ] Interactive prompt flow: summary → confirm agents → select rules → confirm → write
- [ ] `--non-interactive` flag accepts detected defaults without prompting
- [ ] Per-agent rule skeletons generated (Claude frontmatter, Codex AGENTS.md, Gemini plain md)
- [ ] `/brief init` skill fills rule content via marker-based merge (`<!-- brief:auto -->`)
- [ ] `brief doctor` validates symlinks + manifest + consistency (exit 0/1, `--json`)
- [ ] Old `custom-skills/` symlinks auto-detected and migrated on re-init
- [ ] `.agents/brief-manifest.json` written with full schema + gitignored
- [ ] All operations idempotent (second `brief init` run = no filesystem changes)

## Scope
**In scope:** Skills relocation, symlink utilities, agent/tech detection, init rewrite, rule generation, agent skill for content fill, doctor command, migration detection
**Out of scope:** npm package distribution, `brief update`/`brief uninstall`, template reclassification (R8), `brief serve`

## References
- [PRD.md](../PRD.md) — Requirements R1-R8
- [TRD.md](../TRD.md) — Architecture, component design, implementation order
- [discovery.md](../discovery.md) — Initial exploration and alternatives
- [S-010](../../skills-cleanup-consolidation/S-010/story.md) — Prior work: rule templates + init enhancement (foundation)
- [TODO-012](../../../todo/TODO-012.md) — Verify Gemini .agents/rules/ compatibility
