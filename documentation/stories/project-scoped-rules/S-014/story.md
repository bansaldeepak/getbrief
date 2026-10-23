---
{
  _brief:
    {
      version: 1,
      record_id: c8a026af-d575-49db-b87b-7b3c9067d887,
      item:
        {
          id: S-014,
          type: story,
          title: Project-Scoped Rules & Smart Init,
          status: done,
          feature: project-scoped-rules,
          branch: feature/project-scoped-rules,
          category: feat,
          created: 2026-09-04,
          tasks: 9,
          story: documentation/stories/project-scoped-rules/S-014/story.md,
          link: null,
          pr: https://github.com/bansaldeepak/agents-setup/pull/27
        },
      legacy: { current_task: S-014-T3 }
    }
}
---
# S-014: Project-Scoped Rules & Smart Init

**Status**: done
**Branch**: feature/project-scoped-rules
**Created**: 2026-09-04

## Context
`brief init` has misclassified templates in `templates/project-skills/` (Hono-specific conventions and scaffold instructions) that have no installation path. Detection coverage is incomplete — Dockerfile, fly.toml, wrangler, and vercel projects don't get the deployment rule. Python framework projects don't get backend-standards. The `--body=` CLI flag doesn't support escape sequences (\n, \t), making multi-line bodies impossible without stdin piping.

## Goal
Reclassify misplaced templates, expand detection coverage, fix the --body escape bug, and create a generic scaffold skill — making `brief init` smarter and the rule library more complete.

## User Story
As a developer running `brief init`, I want the CLI to detect my full stack (including Docker, Cloudflare Workers, Vercel, Python frameworks) and install relevant rules, so that my project gets useful conventions without manual configuration.

## Acceptance Criteria
- [ ] techstack.md template installs on every `brief init` run (detect: ["*"])
- [ ] scaffold-module skill is routable via `/brief scaffold-module`
- [ ] `templates/project-skills/` directory deleted, no dangling references
- [ ] `brief init` installs deployment.md for Dockerfile, fly.toml, wrangler.toml, wrangler.jsonc, vercel.json projects
- [ ] `brief init` installs backend-standards.md for Django/Flask/FastAPI projects
- [ ] `brief init` displays universal rules collapsed ("Universal: N rules"), stack-specific listed individually
- [ ] `--body="line1\nline2"` produces actual newline in body text
- [ ] 15+ new unit test cases pass (8 readBody + 7 matchesDetection)
- [ ] HARNESS.md verified clean (no philosophy duplication)
- [ ] TODO-014 status updated to deferred; TODO-015 created

## Scope
**In scope:** techstack.md template, scaffold-module skill, project-skills deletion, detection expansion (Dockerfile/fly.toml/wrangler/vercel/pyproject.toml), grouped init display, --body escape fix, TODO housekeeping, TRD cleanup.

**Out of scope:** Stale rule removal (covered by TODO-013). Observability/analytics detection (new TODO-015). Cross-provider rule paths. rules-gen.mjs changes (kept per CEO review).

## References
- [PRD.md](../PRD.md) — 6 requirements (R1-R6), CEO review CLEAR
- [TRD.md](../TRD.md) — Implementation design, eng review CLEAR
