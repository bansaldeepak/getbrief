# PRD: Project-Scoped Rules & Smart Init

**Author**: Claude / Deepak
**Date**: 2026-09-03
**Status**: Approved
**Discovery**: N/A — items surfaced from S-012 dogfooding + deferred.md from skills-cleanup epic

## Executive Summary

`brief init` has partially-wired smart detection that skips some patterns, ships two Hono-specific project-skill templates that are misclassified, and duplicates philosophy rules between HARNESS.md and rule templates. This story completes the detection wiring, reclassifies project-skills as rules/generic-skills, cleans harness duplication, and fixes the `--body` newline bug in `brief log`.

## Problem

Three gaps surfaced while dogfooding S-012's harness injection:

1. **Misclassified templates** — `hono-react-router-prisma` is 100% conventions (a rule), not a procedural skill. `hono-new-module` is Hono-specific when it should be a generic scaffold skill. Both sit in `templates/project-skills/` which has no install path in `brief init`.
2. **Incomplete detection wiring** — `brief init` already uses `filterRelevantRules()` + `matchesDetection()` with the manifest's `detect` field, but several patterns are skipped (`Dockerfile`, `wrangler.toml`, `vercel.json` hit `continue` instead of matching). The display is flat instead of grouped. Manifest is missing `pyproject.toml` framework patterns for backend-standards.
3. **`--body` newline bug** — `brief log --body="line1\nline2"` writes literal `\n` instead of newlines. Pipe works; `--body` doesn't. Agents calling `brief log` with `--body` get garbled output.
4. **Harness/rule duplication** — Philosophy rules (critical-thinking, first-principles, verification-discipline, safe-modifications) exist in both HARNESS.md and `templates/rules/`. HARNESS.md should reference them, not duplicate their content. Users should be able to customize philosophy rules in `.claude/rules/`.

## Users

| Segment | Pain Level | Current Workaround |
|---------|-----------|-------------------|
| Developers running `brief init` on new projects | Med | Manually delete irrelevant rules after init |
| Agents using `/brief init` skill to fill rules | Med | Markers exist in templates but only coding-style + git-workflow are relevant to most projects |
| Agents/scripts using `brief log --body="..."` | High | Use stdin pipe instead, which is fragile in agent contexts |

## Goals & Success Metrics

| Goal | Metric | Target | Measurement Method |
|------|--------|--------|-------------------|
| Detection patterns all functional | Patterns that skip/continue | 0 | Grep `matchesDetection` for `continue` |
| Techstack rule exists | Template count | 1 new `techstack.md` template with markers | File exists in `templates/rules/` |
| `--body` escapes work | `brief log --body="a\nb"` produces 2 lines | 100% | Unit test |
| `templates/project-skills/` eliminated | Directory exists | false | `ls templates/project-skills/` fails |
| Harness clean of duplicated philosophy | HARNESS.md line count | Reduced by ~30 lines | Diff before/after |
| Grouped init display | Init prompt format | Universal collapsed, stack-specific listed | Manual verification |

## What We Are Building

### R1: Reclassify `hono-react-router-prisma` → `techstack.md` rule template (Must-have)

Create `templates/rules/techstack.md` with `<!-- brief:auto -->` markers. **Narrow scope**: tech stack list, runtime config, aliases, project structure. Route idioms stay in `backend-standards.md`; testing config stays in `coding-style.md`. Content is placeholder examples (like other rule templates). The `/brief init` skill fills markers with actual project conventions.

Detect: `["*"]` — every project has a tech stack worth documenting, even without a framework.

Remove `templates/project-skills/hono-react-router-prisma/`.

### R2: Reclassify `hono-new-module` → generic `scaffold-module` skill (Must-have)

Make it stack-agnostic: reads the project's `techstack.md` rule for structure if present, falls back to language-agnostic defaults (simple module with index + test) when no techstack.md exists. Ships as a brief sub-skill at `skills/brief/scaffold-module/SKILL.md`. Add entry to `/brief` router's route table.

Remove `templates/project-skills/hono-new-module/`.

### R3: Remove `templates/project-skills/` (Must-have)

Once R1 and R2 relocate their contents, delete the directory and its README. Update references in README.md and documentation.

### R4: Expand detection coverage + grouped display (Must-have)

The detection infrastructure (`filterRelevantRules`, `matchesDetection`, manifest `detect` field) is already wired. This requirement completes it:

1. **Fix skipped patterns**: `matchesDetection()` currently `continue`s past `Dockerfile`, `wrangler.toml`, `vercel.json` — add filesystem existence checks
2. **Add missing manifest patterns**: `pyproject.toml:django|flask|fastapi` for backend-standards, `package.json:next|nuxt` for frontend-standards
3. **Grouped display**: Universal rules collapsed to one line ("Universal: N rules (always installed)"), stack-specific rules listed individually

| Rule template | Install when |
|---------------|-------------|
| `coding-style.md` | Always |
| `git-workflow.md` | Always |
| `critical-thinking.md` | Always |
| `first-principles.md` | Always |
| `verification-discipline.md` | Always |
| `safe-modifications.md` | Always |
| `techstack.md` | Always |
| `backend-standards.md` | Backend framework detected (hono, express, fastify, django, flask, etc.) |
| `frontend-standards.md` | Frontend framework detected (react, vue, svelte, next, nuxt, etc.) |
| `deployment.md` | Dockerfile, wrangler.toml, vercel.json, or CI config detected |
| `observability-wiring.md` | Sentry, PostHog, OTel, or similar in deps |
| `product-analytics.md` | PostHog, Segment, Amplitude, Mixpanel, or similar in deps |

User can abort init and manually adjust. Per-rule selection deferred to `/brief setup`.

### R5: Fix `--body` escape handling in `readBody()` (Must-have)

Replace standard escape sequences in `--body=` values:
- `\n` → newline
- `\t` → tab
- `\r` → carriage return
- `\\` → literal backslash

Affects `brief log`, `brief story create`, `brief todo create`, and every other command using `readBody()`.

### R6: Clean philosophy content from HARNESS.md (Should-have)

HARNESS.md currently duplicates philosophy rules that also exist as `.claude/rules/` templates. Remove the duplicated content from HARNESS.md — the rule templates are the user-customizable source of truth. HARNESS.md should remain lean (lifecycle workflow + story execution + memory + skills/rules pointers + doc references).

## What We Are NOT Building

- **NOT**: Interactive selection UI (`inquirer` prompts) — deferred to `/brief setup` (Epic 1). Init uses detection + defaults.
- **NOT**: `brief update` / `brief uninstall` commands — TODO-013, separate story.
- **NOT**: Gemini `.agents/rules/` compatibility — TODO-012, needs live test environment.
- **NOT**: Self-improving coding-style rule — retro-driven, unspecified mechanism.
- **NOT**: Per-rule override in init prompt — deferred to `/brief setup`.
- **NOT**: Monorepo workspace detection — single-package root assumption.
- **NOT**: `rules-gen.mjs` deletion — kept for cross-provider rule generation future.

## Triggers & Edge Cases

| Trigger / Edge Case | Expected Behavior |
|--------------------|-------------------|
| Project has both frontend + backend frameworks | Install both `frontend-standards.md` and `backend-standards.md` |
| No framework detected (pure lib, CLI tool) | Install universal rules + techstack.md (always). No conditional rules. |
| Re-run `brief init` after detection changes (added React) | New rules installed, existing rules untouched (idempotent) |
| `--body` with no escape characters | Unchanged behavior — just return the string |
| `--body` with `\\n` (escaped escape) | Preserve as literal `\n` |
| `--body` with `\t` | Replace with tab character |
| scaffold-module on project with no techstack.md | Falls back to language-agnostic defaults |

## Dependencies

- `detectStack()` in `lib/detect.mjs` — already detects frameworks, languages, testing tools
- `filterRelevantRules()` + `matchesDetection()` in `lib/init.mjs` — already wired, needs expansion
- `manifest.json` `detect` field — already present, partially functional
- Marker infrastructure from S-012 — proven, stable

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Smart detection misses a framework | Med | Low | Universal rules always install; conditional rules are additive |
| Generic scaffold-module skill too vague to be useful | Med | Med | Keep concrete examples in markers; `/brief init` skill fills with real patterns; built-in defaults when no techstack |
| Removing `templates/project-skills/` breaks something | Low | Med | Grep all references before deleting |
| Cleaning HARNESS.md removes needed content | Low | Med | Verify rules/ templates cover everything before removing from harness |

## Open Questions

- [x] ~~Should `scaffold-module` be a brief sub-skill or standalone project skill template?~~ **Decided: brief sub-skill** (`.claude/skills/brief/scaffold-module/SKILL.md`). No standalone project skills shipped for now.
- [x] ~~Should the init prompt show detected rules grouped or flat list?~~ **Decided: grouped** — universal collapsed to one line, stack-specific listed individually.
- [x] ~~Should `readBody()` handle just `\n` or standard escape set?~~ **Decided: standard set** (`\n`, `\t`, `\r`, `\\`).
- [x] ~~Should `techstack.md` detect on frameworks only or any language?~~ **Decided: `detect: ["*"]`** — every project has a tech stack.
- [x] ~~Should `techstack.md` be broad or narrow?~~ **Decided: narrow** — tech stack list, runtime config, aliases, project structure. Route idioms in backend-standards, testing in coding-style.
- [x] ~~Should `rules-gen.mjs` be deleted?~~ **Decided: keep** — foundation for cross-provider rule generation.
- [x] ~~Should philosophy rules stay in templates or only in harness?~~ **Decided: stay in templates** (user-customizable), remove duplication from HARNESS.md.

## Timeline

| Milestone | Target Date | Notes |
|-----------|------------|-------|
| PRD Approved | 2026-09-03 | CEO review complete |
| TRD Complete | 2026-09-03 | Architecture is incremental — may skip if no new patterns |
| Implementation Start | 2026-09-03 | |
| Ship | 2026-09-04 | |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 3 proposals, 3 accepted, 0 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** CEO CLEARED — eng review required

NO UNRESOLVED DECISIONS
