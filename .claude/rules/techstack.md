---
description: Tech stack, runtime config, path aliases, and directory structure.
---

## Stack
<!-- brief:auto section="stack" version="0.2.0" generated="2026-09-05T00:00:00.000Z" -->
- Node.js 24, pure ESM (`.mjs`), no TypeScript
- Dependencies: `yaml` (YAML parsing), `@colbymchenry/codegraph` (code indexing)
- Test runner: `node --test` (built-in)
<!-- /brief:auto -->

## Runtime & Config
<!-- brief:auto section="runtime" version="0.2.0" generated="2026-09-05T00:00:00.000Z" -->
- Global CLI (`brief`) installed via `npm link` or symlink to `./cli.mjs`
- Version in `package.json` — read at runtime for marker stamping
- No env vars or config files — all state is file-based in `documentation/`
<!-- /brief:auto -->

## Aliases
<!-- brief:auto section="aliases" version="0.2.0" generated="2026-09-05T00:00:00.000Z" -->
- None — relative `./` imports only, no path aliases or tsconfig
<!-- /brief:auto -->

## Structure
<!-- brief:auto section="structure" version="0.2.0" generated="2026-09-05T00:00:00.000Z" -->
- `lib/` — core modules (`harness.mjs`, `markers.mjs`, `detect.mjs`, `tracker.mjs`, `search.mjs`, …)
- `lib/commands/` — CLI command handlers
- `templates/` — scaffolding templates (harness, project-structure, rules)
- `providers/` — provider-specific agent configs (`claude.md`, `gemini.md`, `codex.md`)
- `agents/` — agent role definitions (`qa.md`, `reviewer.md`, `researcher.md`, `self-improving.md`)
- `rules/` — distributable rule templates (copied to projects by `brief init`)
- `skills/` — distributable skill definitions (`brief/`, `sdlc/`)
- `scripts/` — utility scripts (reference checks, migration, session recording)
- `test/` — test files (`<module>.test.mjs`)
- `documentation/` — brief's own project tracking (stories, TODOs, decisions, memory)
<!-- /brief:auto -->
