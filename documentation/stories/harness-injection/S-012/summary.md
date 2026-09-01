# S-012: Harness Injection & Init Rework — Summary

## What Changed
<!-- Updated after each task is completed -->

## Decisions Made
- **D1 (Eng Review):** Split `injectHarness()` into `detectHarnessState()` + `applyHarness()` so users see planned actions before confirming. Matches existing `filterRelevantRules` pattern.
- **D2 (Eng Review):** Existing tests that break (detect.test.mjs, init.test.mjs) get explicit update tasks, not implicit fixes.
- **Inline AGENTS.md + `@` import CLAUDE.md:** Codex can't resolve `@` imports, so AGENTS.md gets inline content. CLAUDE.md gets `@../.brief/HARNESS.md` (only when it doesn't already import AGENTS.md).
- **`.brief/HARNESS.md` committed:** Clones get workflow instructions immediately. `brief init` overwrites to update.
- **Philosophy as rules:** Critical thinking, first principles, verification discipline installed as `.claude/rules/` files (user can delete).

## Testing
<TBD at implementation>

## Follow-up
- TODO-013: `brief update` / `brief uninstall` commands (depends on markers existing)
- TODO-014: Delete `rules-gen.mjs` dead code (generateRuleSkeletons never wired into init)
- TODO-012: Verify Gemini `.agents/rules/` compatibility
