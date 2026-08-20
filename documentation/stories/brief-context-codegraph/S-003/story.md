# S-003: Bundle Codegraph + Unified Context Command

**Status**: planned
**Branch**: feature/brief-context-codegraph
**Created**: 2026-08-20

## Context
Agents use two separate systems for context -- `brief` (text/docs) and `codegraph` (code AST) -- with no shared setup, no unified query, and no way to structure ad-hoc context into tracked items. This causes wrong-tool calls and slow grep fallbacks.

## Goal
One `brief init` installs both systems; `brief query` finds code + docs in one call; `brief context` manages graduated context.

## User Story
As an AI agent working in a project, I want a single unified query command that searches both code symbols and documentation, so that I get the full picture in one call without knowing which tool to use.

## Acceptance Criteria
- [ ] `brief query "symbol"` returns code results (from codegraph) + doc results (from search.mjs)
- [ ] `brief query --callers "fn"` returns caller chain (capped at 10 display)
- [ ] `brief query --impact "fn"` returns blast radius (capped at 10 display)
- [ ] `brief query --json "x"` returns structured JSON matching PRD schema
- [ ] `brief init` creates `.codegraph/` index when missing
- [ ] `brief init --reindex` force-rebuilds the index
- [ ] `echo "body" | brief context graduate "title"` writes `documentation/context/<slug>.md`
- [ ] `brief context list` shows graduated context table
- [ ] `brief context <query>` searches graduated context
- [ ] `brief search` remains doc-only (no breaking change)
- [ ] `serve.mjs` code search routes through `code-index.mjs`
- [ ] All 32 identified codepaths have test coverage (node:test)
- [ ] Standalone codegraph rules replaced by updated `rules/brief.md`

## Scope
**In scope:** R1-R16 from PRD, all eng review amendments (mtime refresh, TTY guard, callers cap, test infra)
**Out of scope:** Semantic/vector search, auto-reindex, cross-project search, context update/delete lifecycle, Windows/pnpm support

## References
- PRD: `documentation/stories/brief-context-codegraph/PRD.md`
- TRD: `documentation/stories/brief-context-codegraph/TRD.md`
- CEO Plan: `~/.gstack/projects/bansaldeepak-agents-setup/ceo-plans/2026-08-20-brief-context-codegraph.md`
- Research: `documentation/research/RES-001-brief-context-codegraph.md`
- Resolves: TODO-006
