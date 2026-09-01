---
description: Project-specific coding conventions. Refined by retro findings.
---

## Naming
<!-- brief:auto section="naming" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Functions: camelCase (`detectHarnessState`, `applyHarness`, `parseMarkers`, `mergeContent`)
- Module-level constants: UPPER_SNAKE_CASE (`HARNESS_TEMPLATE`, `IMPORT_RE`, `OPEN_RE`)
- Files: kebab-case `.mjs` (`harness.mjs`, `markers.mjs`, `detect.mjs`)
- Boolean-like state vars: descriptive noun form without prefix (`agentsExists`, `claudeExists`, `inCodeBlock`, `found`)
<!-- /brief:auto -->

## Patterns
<!-- brief:auto section="patterns" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Atomic writes: write to `<path>.tmp`, then `renameSync` to final path — never write directly
- ESM `__dirname`: `const __dirname = dirname(fileURLToPath(import.meta.url))`
- Prefer `node:fs` sync APIs (`readFileSync`, `writeFileSync`, `mkdirSync`) over async
- Named exports only — no default exports, no classes
- Early return / throw on error; no silent swallowing
- No barrel `index.mjs` — import each module directly
<!-- /brief:auto -->

## Imports
<!-- brief:auto section="imports" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Always use `node:` prefix for built-ins (`node:fs`, `node:path`, `node:url`, `node:os`)
- Import order: `node:` builtins → external deps (`yaml`, `@colbymchenry/codegraph`) → internal (`./markers.mjs`, `./harness.mjs`)
- Pure ESM throughout (`"type": "module"` in package.json) — no `require()`
- No path aliases — relative `./` imports only
<!-- /brief:auto -->

## Testing
<!-- brief:auto section="testing" version="0.2.0" generated="2026-09-01T00:00:00.000Z" -->
- Runner: Node.js built-in (`node --test`) — no vitest/jest
- Pattern: `describe` / `it` from `node:test`; `assert` from `node:assert/strict`
- Test files in `test/` directory, named `<module>.test.mjs` (e.g. `test/harness.test.mjs`)
- Temp fixtures: `mkdtempSync(join(tmpdir(), "brief-<module>-"))` in `beforeEach`; `rmSync(tmp, { recursive: true })` in `afterEach`
- One behavior per `it` — arrange in `beforeEach`, assert immediately after act
<!-- /brief:auto -->
