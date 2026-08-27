# S-011: Brief Project Setup & Scoped Skills Architecture -- Summary

## What Changed
- **T1**: Relocated 12 skills from `custom-skills/` to `brief/skills/brief/`. Created `/sdlc` thin alias at `brief/skills/sdlc/`. Merged brief + sdlc routers into single `/brief` router with relative paths. Renamed: project-plan→plan, decision-doc→decision, project-memory→memory. Updated all `/sdlc` refs to `/brief`. Global symlinks updated.
- **T2**: Created `lib/detect.mjs` with `findAgentDirs()` and `detectStack()`. Pure read-only detection: agent directories, languages (codegraph + extension fallback), frameworks/testing from manifests, runtime inference, CI detection. 30 unit tests passing.
- **T3**: Created `lib/symlink.mjs` with `createLink()`, `verifyLink()`, `fallbackCopy()`, `removeStale()`. Idempotent symlink management with EPERM copy fallback. 16 unit tests passing.
- **T4**: Rewrote `lib/init.mjs` as async interactive installer. Full flow: scaffold → detect → prompt → symlinks → filtered rules → manifest → gitignore → codegraph. `--non-interactive` flag for CI. Idempotent. 19 integration tests passing.
- **T5**: Created `lib/rules-gen.mjs` with `generateRuleSkeletons()`. Per-agent format: Claude (frontmatter+markers), Codex (AGENTS.md section), Gemini (plain md). Exports `MARKER_OPEN`/`MARKER_CLOSE` for T6. 13 unit tests passing.
- **T6**: Created `lib/markers.mjs` (parseMarkers + mergeContent) and `skills/brief/init/SKILL.md`. Marker parser handles code-block escaping, nested/unclosed errors. Skill instructs agent to read code and fill rule skeletons. 13 unit tests passing.

## Decisions Made
- One story (S-011) with 8 tasks, matching TRD's implementation order
- T1 includes sdlc alias creation (not deferred)
- Open questions resolved inline in task specs (implementing agent doesn't stop to ask)
- `--non-interactive` flag: YES (uses detected defaults, suitable for CI/scripts)
- `brief init` creates `AGENTS.md` only if Codex detected and file doesn't already exist

## Testing
- Unit tests: symlink.mjs, detect.mjs, rules-gen.mjs, marker parser, doctor.mjs
- Integration tests: full init flow, idempotency, migration paths
- Manual verification: <TBD at implementation>

## Follow-up
- TODO-012: Verify Gemini `.agents/rules/` compatibility with live test
- TODO-013: `brief update` + `brief uninstall` commands (Phase 2)
- Template reclassification (PRD R8) — separate epic if needed
