# S-014: Project-Scoped Rules & Smart Init -- Summary

## What Changed
- T-001: Created `templates/rules/techstack.md` (4 sections: stack, runtime, aliases, structure) + manifest entry (12th template, detect:["*"])
- T-002: Created `skills/brief/scaffold-module/SKILL.md` (generic module scaffold, reads techstack.md, language fallbacks) + router entry in `skills/brief/SKILL.md`
- T-003: Deleted `templates/project-skills/` (superseded by rules/ and scaffold-module skill); updated README.md and documentation/memory/project_repo-extraction.md
- T-004: Expanded manifest detect patterns — deployment adds wrangler.toml + vercel.json; backend-standards adds pyproject.toml:django|flask|fastapi; frontend-standards adds next|nuxt|@remix-run/react
- T-005: Exported `matchesDetection` and `filterRelevantRules` from `lib/init.mjs`; replaced `continue` deferral with generic `existsSync(join(projectRoot, file))` check; 7 new test cases (190 total)
- T-006: Added grouped display to `printSummary` — universal rules collapsed to one line, stack-specific listed individually
- T-007: Added `unescapeBody()` to `lib/body.mjs` using single-pass regex `/\\([ntr\\])/g`; 8 new test cases in `test/body.test.mjs` (198 total)
- T-008: Deferred TODO-014 (CEO review decision); created TODO-015 (observability detection gap); fixed TRD Design Decisions table escape/matchesDetection contradictions
- T-009: PRD and TRD status → Approved; story status → completed; HARNESS.md verified clean

## Decisions Made
- Single-pass regex for escape handling (avoids ordering bugs with sequential .replace)
- Pass projectRoot to matchesDetection (Option A — smaller change than expanding detection result)
- detect:["*"] and detect:[".git"] classify as universal rules (collapsed in display)
- Export matchesDetection and filterRelevantRules for direct unit testing
- Check both wrangler.toml and wrangler.jsonc (user decision from eng review)
- Escape decoding proceeds as-is — no --raw-body flag needed (macOS/Linux tool, prose input)
- Keep rules-gen.mjs for cross-provider future (CEO review decision)
- techstack.md has narrow scope: stack list, runtime config, aliases, structure (not route idioms)

## Testing
- test/body.test.mjs: 8 new test cases for readBody escape handling (must use await)
- test/init.test.mjs: 7 new test cases for matchesDetection expansion
- Manual: grouped display, scaffold-module skill invocation
- <TBD at implementation>

## Follow-up
- TODO-013: brief update + brief uninstall commands (stale rule removal)
- TODO-015: expand detectStack for observability/analytics packages
- TODO-012: verify Gemini .agents/rules/ compatibility
