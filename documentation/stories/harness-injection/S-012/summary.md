# S-012: Harness Injection & Init Rework — Summary

## What Changed

**Delivered:** Inline-everywhere HARNESS injection with marker-based merge, Codex detection decoupling, BRIEF_SKILLS_PATH fix, and philosophy rules as `.claude/rules/`.

- **`lib/harness.mjs` (NEW)**: Detects project state, copies `templates/HARNESS.md` → `.brief/HARNESS.md`, injects HARNESS content via markers into AGENTS.md (inline) and CLAUDE.md (if needed).
- **`lib/init.mjs`**: Removed AGENTS.md creation gate; calls `detectHarnessState()` before confirmation (step 3.5) and `applyHarness()` after (step 5b). Fixed BRIEF_SKILLS_PATH to resolve from `import.meta.url`.
- **`lib/detect.mjs`**: Decoupled Codex detection from AGENTS.md presence; now checks `.codex/` only.
- **`templates/HARNESS.md`**: Trimmed (~30 lines) from root HARNESS — workflow sections only. Philosophy extracted to separate `.claude/rules/`.
- **Philosophy rules** (3 new templates): `critical-thinking.md`, `first-principles.md`, `verification-discipline.md` installed to `.claude/rules/` (user can delete).
- **This repo self-migrated**: HARNESS content injected inline into AGENTS.md via markers; root HARNESS.md removed.

## Decisions Made
- **D1 (Eng Review):** Split `injectHarness()` into `detectHarnessState()` + `applyHarness()` so users see planned actions before confirming. Matches existing `filterRelevantRules` pattern.
- **D2 (Eng Review):** Existing tests that break (detect.test.mjs, init.test.mjs) get explicit update tasks, not implicit fixes.
- **Inline everywhere (final design):** AGENTS.md gets inline HARNESS + markers; CLAUDE.md gets `@../AGENTS.md` (Codex can't resolve `@` imports, so no separate marker there). `.brief/HARNESS.md` is source; markers reference it via version info in comment.
- **Philosophy as rules:** Critical thinking, first principles, verification discipline installed as `.claude/rules/` files (user can delete, never overwritten on re-run).

## Testing

- **183 tests passing** (all 5 harness injection matrix rows, error paths, regression tests for init/detect)
- **Unit tests for harness.mjs**: detectHarnessState matrix (5 rows), applyHarness matrix (5 rows), atomicWrite, marker edge cases
- **Regression tests updated**: detect.test.mjs codex detection (AGENTS.md-only → false), init.test.mjs BRIEF_SKILLS_PATH resolution and symlink target
- **Integration tests**: full `brief init` flow, idempotency, marker preservation across re-runs
- **Manual verification**: heading duplication caught during final run (fixed during pr-review, not caught by unit tests)

## Follow-up
- TODO-013: `brief update` / `brief uninstall` commands (depends on markers existing)
- TODO-014: Delete `rules-gen.mjs` dead code (generateRuleSkeletons never wired into init)
- TODO-012: Verify Gemini `.agents/rules/` compatibility
