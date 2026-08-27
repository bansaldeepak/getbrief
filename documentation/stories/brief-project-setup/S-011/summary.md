# S-011: Brief Project Setup & Scoped Skills Architecture -- Summary

## What Changed
- **T1**: Relocated 12 skills from `custom-skills/` to `brief/skills/brief/`. Created `/sdlc` thin alias at `brief/skills/sdlc/`. Merged brief + sdlc routers into single `/brief` router with relative paths. Renamed: project-plan→plan, decision-doc→decision, project-memory→memory. Updated all `/sdlc` refs to `/brief`. Global symlinks updated.

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
