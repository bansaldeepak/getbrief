# TRD: Project-Scoped Rules & Smart Init

**Author**: Claude / Deepak
**Date**: 2026-09-03
**Status**: Draft
**PRD**: [PRD.md](./PRD.md)

## Overview

Incremental changes to existing modules: expand `matchesDetection()` in `init.mjs`, add `techstack.md` template to `manifest.json`, fix escape handling in `body.mjs`, create `scaffold-module` skill, delete `templates/project-skills/`. No new services, schemas, or APIs.

## Current Architecture

```
lib/
  init.mjs          ← initProject() orchestrates the full init flow
    ├── detect.mjs   ← detectStack() → {languages, frameworks, testing, runtime, hasCI, agents}
    ├── harness.mjs  ← detectHarnessState() + applyHarness() → AGENTS.md/CLAUDE.md injection
    ├── symlink.mjs  ← createLink() for skills/brief symlink
    └── body.mjs     ← readBody() for --body= and stdin pipe

templates/
  rules/
    manifest.json    ← 11 templates with detect patterns
    *.md             ← rule template files with <!-- brief:auto --> markers
  project-skills/    ← 2 Hono-specific templates (misclassified, no install path)
  project-structure/ ← scaffold files (tracker.yaml, MEMORY.md, etc.)
  HARNESS.md         ← injected into AGENTS.md/CLAUDE.md

skills/brief/        ← lifecycle skills (prd, trd, plan, implement, etc.)
```

## Proposed Architecture

```
lib/
  init.mjs          ← matchesDetection() expanded, printSummary() grouped
  body.mjs          ← readBody() with escape handling
  (everything else unchanged)

templates/
  rules/
    manifest.json    ← +1 entry (techstack.md), +detect patterns, -0 entries
    techstack.md     ← NEW: narrow scope (stack list, runtime config, aliases, structure)
    *.md             ← unchanged
  project-structure/ ← unchanged
  HARNESS.md         ← unchanged (already clean, no philosophy duplication)

  (project-skills/ DELETED)

skills/brief/
  scaffold-module/   ← NEW: generic module scaffold skill
    SKILL.md
  SKILL.md           ← +1 router entry for scaffold-module
```

### What Changes

| Component | Change Type | Description |
|-----------|------------|-------------|
| `lib/init.mjs` `matchesDetection()` | Modified | Add filesystem checks for Dockerfile, wrangler.toml, vercel.json (currently `continue`) |
| `lib/init.mjs` `matchesDetection()` | Modified | Handle `pyproject.toml:X` pattern (currently only handles `package.json:X`) |
| `lib/init.mjs` `printSummary()` | Modified | Grouped display: universal collapsed, stack-specific listed |
| `lib/body.mjs` `readBody()` | Modified | Unescape `\n`, `\t`, `\r`, `\\` in `--body=` values |
| `templates/rules/manifest.json` | Modified | Add techstack.md entry; add missing detect patterns for backend/frontend |
| `templates/rules/techstack.md` | New | Rule template with markers: stack, config, aliases, structure |
| `skills/brief/scaffold-module/SKILL.md` | New | Generic module scaffold skill |
| `skills/brief/SKILL.md` | Modified | Add scaffold-module route |
| `templates/project-skills/` | Removed | Contents relocated to rules/ and skills/ |

## Design Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Escape handling approach | A) Single-pass regex, B) Sequential `.replace()` calls, C) Custom parser | A | Single-pass regex avoids ordering bugs with `\\n` vs `\n`. See Escape Replacement Order section below. |
| `matchesDetection` file check | A) Pass `projectRoot` to matchesDetection, B) Pre-scan files into detection result | A | Fewer changes — matchesDetection already receives detection object, just needs projectRoot for `existsSync`. Or add file presence flags to detection. |
| techstack.md marker sections | A) Single section, B) Multiple sections (stack, config, aliases, structure) | B | Matches coding-style.md pattern. `/brief init` skill fills each section independently. |
| scaffold-module source of truth | A) Hardcoded defaults only, B) Read techstack.md if present + fallback | B | Respects user customization while working without it. |

**Design decision on matchesDetection file check (expanded):**

Currently `matchesDetection` receives `(detectPatterns, detection)` — it has no access to the project root for filesystem checks. Two approaches:

**Option A — Add projectRoot parameter:**
```javascript
function matchesDetection(detectPatterns, detection, projectRoot) {
  // ...
  if (file === "Dockerfile") return existsSync(join(projectRoot, file));
}
```

**Option B — Expand detection result with file flags:**
```javascript
// In detectStack():
result.hasDockerfile = existsSync(join(projectRoot, "Dockerfile"));
result.hasWrangler = existsSync(join(projectRoot, "wrangler.toml")) || existsSync(join(projectRoot, "wrangler.jsonc"));
result.hasVercel = existsSync(join(projectRoot, "vercel.json"));
```

**Chosen: Option A** — pass `projectRoot`, replace `continue` with `existsSync`. The `continue` statement in `matchesDetection` at line 213 was explicitly a deferral marker — replace it with the actual check. Two-line change per pattern.

## Error Handling & Failure Modes

### Exception Table

| Error | Handler | User-Visible Result |
|-------|---------|---------------------|
| manifest.json malformed | None (brief's own file) | Crash — caught by tests pre-release |
| Template file missing during copy | `existsSync` guard | Rule skipped silently |
| `--body=` with no escapes | No-op (replace finds nothing) | Correct string returned |
| `--body=` with `\\n` | Sequential replace: `\\` → `\` first would break `\n`. **Order: `\\` last.** | Correct: `\\n` → literal `\n` |
| scaffold-module: no techstack.md | Fallback to defaults | Generic module structure |

### Escape Replacement Order

The order matters. Replace in this sequence:
1. `\\n` → `\n` (newline)
2. `\\t` → `\t` (tab)  
3. `\\r` → `\r` (carriage return)
4. `\\\\` → `\\` (literal backslash) — **must be last**

If `\\` were replaced first, `\\n` would become `\n` (a real newline) instead of `\n` (literal backslash + n). By replacing specific two-char sequences first and `\\` last, we get correct behavior:

| Input | After step 1-3 | After step 4 | Result |
|-------|----------------|--------------|--------|
| `a\nb` | `a<NL>b` | `a<NL>b` | Newline |
| `a\\nb` | `a\\nb` (no match) | `a\nb` | Literal `\n` |
| `a\\\\nb` | `a\\\\nb` | `a\\nb` → then... | Wait, this breaks. |

**Correction**: Use a single-pass regex to handle all escapes atomically:

```javascript
function unescapeBody(str) {
  return str.replace(/\\([ntr\\])/g, (_, ch) => {
    const MAP = { n: "\n", t: "\t", r: "\r", "\\": "\\" };
    return MAP[ch] ?? `\\${ch}`;
  });
}
```

This handles `\\n` → literal `\n` correctly because the regex consumes `\\` as one match, leaving `n` as a regular character. No ordering issue.

### Failure Modes

| Failure | Trigger | Impact | Mitigation |
|---------|---------|--------|------------|
| Detection misses new framework | Framework not in FRAMEWORK_PATTERNS | Universal rules still install; only conditional rules missed | Additive — user can manually copy |
| `existsSync` false positive (Dockerfile in wrong dir) | Monorepo with Dockerfile in subdirectory | deployment.md installed unnecessarily | Low impact — extra rule is harmless |
| scaffold-module produces wrong structure | techstack.md has unexpected format | Skill is markdown instructions, not code — agent adapts | Agent reads techstack.md content, not structure |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `readBody()` escape sequences | `test/body.test.mjs` — new test file |
| Unit | `matchesDetection()` expanded patterns | `test/init.test.mjs` — add cases |
| Unit | techstack.md template has valid markers | `test/harness.test.mjs` or new |
| Manual | Grouped display format | Run `brief init` on different projects |
| Manual | scaffold-module skill | Invoke on a test project |

### Test Cases for readBody()

```
it("replaces \\n with newline")         → readBody(["--body=a\\nb"])    === "a\nb"
it("replaces \\t with tab")             → readBody(["--body=a\\tb"])    === "a\tb"
it("replaces \\r with carriage return") → readBody(["--body=a\\rb"])    === "a\rb"
it("replaces \\\\ with backslash")      → readBody(["--body=a\\\\b"])   === "a\\b"
it("preserves literal \\n (escaped)")   → readBody(["--body=a\\\\nb"])  === "a\\nb"
it("handles no escapes")                → readBody(["--body=plain"])    === "plain"
it("handles empty body")                → readBody(["--body="])         === ""
it("handles multiple escapes")          → readBody(["--body=a\\nb\\tc"])=== "a\nb\tc"
```

### Test Cases for matchesDetection() expansion

```
it("matches Dockerfile via projectRoot existsSync")
it("matches wrangler.toml via projectRoot existsSync")
it("matches vercel.json via projectRoot existsSync")
it("matches pyproject.toml:django pattern")
it("matches package.json:next for frontend-standards")
```

### Coverage Diagram

```
  readBody()
    ├── --body= path ── escape regex ── [UNIT TESTED]
    ├── stdin pipe path ── [existing, no change]
    └── no input path ── [existing, no change]

  matchesDetection()
    ├── "*" wildcard ── [existing test]
    ├── "package.json:X" ── [existing test]
    ├── "Cargo.toml" ── [existing test]
    ├── "Dockerfile" ── [NEW TEST]
    ├── "wrangler.toml" ── [NEW TEST]
    ├── "vercel.json" ── [NEW TEST]
    ├── "pyproject.toml:X" ── [NEW TEST]
    └── ".github/workflows" ── [existing test]

  printSummary()
    └── grouped display ── [MANUAL TEST]

  scaffold-module/SKILL.md
    └── markdown skill ── [MANUAL TEST]

  techstack.md template
    └── marker format ── [UNIT TESTED via marker parser]
```

## Rollback Plan

| Scope | Revert Strategy | Data Implications | User Impact |
|-------|----------------|-------------------|-------------|
| All changes | `git revert` the PR | No state created | Returns to pre-S-013 behavior |
| R5 only | Revert body.mjs | None | `--body` escapes stop working |
| R4 only | Revert init.mjs + manifest | None | Detection goes back to partial |

Reversibility: **5/5** — all file changes, no state, no migrations.

## Dependencies

| Dependency | Type | Risk | Mitigation |
|-----------|------|------|------------|
| `detectStack()` | Internal | Low | Stable, tested, unchanged |
| `manifest.json` format | Internal | Low | Schema unchanged, just new entries |
| Marker infrastructure | Internal | Low | Proven in S-012, 183 tests pass |
| `existsSync` from `node:fs` | Package | None | Node.js built-in |

## Implementation Order

1. **T1: techstack.md template** — create template + manifest entry (no code changes)
2. **T2: scaffold-module skill** — create skill + router entry (markdown only)
3. **T3: Delete project-skills/** — remove old templates, update references
4. **T4: Expand detection** — matchesDetection projectRoot param, new patterns, grouped display
5. **T5: Fix --body escapes** — regex replace in readBody(), new test file
6. **T6: R6 verification** — confirm HARNESS.md is clean (it already is — R6 is a no-op)
7. **T7: Update PRD** — mark approved, update review report

T1-T3 are content-only (templates/skills). T4-T5 are code changes. T6 is verification. T7 is documentation. No ordering dependencies between T1-T3 or between T4-T5.

## Open Technical Questions

- [x] ~~Escape replacement order vs single-pass regex?~~ **Decided: single-pass regex** (`/\\([ntr\\])/g` with lookup map). Handles `\\n` correctly without ordering issues.
- [x] ~~matchesDetection: pass projectRoot or expand detection result?~~ **Decided: pass projectRoot** (Option A). Smaller change, keeps existing pattern.
- [x] ~~R6: Is there philosophy content in HARNESS.md to clean?~~ **Verified: No.** HARNESS.md is already clean (52 lines, no philosophy content). R6 is a no-op.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 3 proposals, 3 accepted, 0 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | -- | -- |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 2 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | -- | -- |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | -- | -- |

**VERDICT:** CEO + ENG CLEARED -- ready to implement.

NO UNRESOLVED DECISIONS
