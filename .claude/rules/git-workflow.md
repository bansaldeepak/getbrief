---
description: Project-specific git conventions — extends the global git-workflow rule.
---

## Branch Naming
<!-- brief:auto section="branch-naming" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Format: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`
- Slug derived from feature/story name (kebab-case, lowercase)
- Never commit directly to `main` — all changes via PR
<!-- /brief:auto -->

## PR Conventions
<!-- brief:auto section="pr-conventions" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Commit message: `type(scope): subject` — e.g. `feat(harness): inline injection`, `fix(markers): unclosed marker`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `ci`, `test`
- One task = one commit (atomic); story bookkeeping committed separately from implementation
- Task ID in commit body: `Task: S-NNN-TN`
- Retro commit lands on the same PR branch before merge
<!-- /brief:auto -->

## CI Checks
<!-- brief:auto section="ci-checks" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Required: `node --test` (Node.js built-in runner)
- No separate lint or typecheck step — plain `.mjs` with no TypeScript
<!-- /brief:auto -->

## Release Process
<!-- brief:auto section="release-process" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Version in `package.json` — also read at runtime by `harness.mjs` for marker stamping
- `brief init` CLI reads VERSION to stamp `<!-- brief:auto ... version="x.y.z" -->` in injected files
<!-- /brief:auto -->
