# TRD: Brief Project Setup & Scoped Skills Architecture

**Author**: Deepak / Claude
**Date**: 2026-08-25
**Status**: Draft
**PRD**: [PRD.md](./PRD.md)

## Overview

Rewrite `brief init` to create single-level symlinks from the brief package into project agent directories, add tech stack detection for relevance filtering, implement `brief doctor` for health checks, and create the `/brief init` agent skill that generates per-agent rule formats (Claude `.claude/rules/`, Codex `AGENTS.md`, Gemini `.agents/rules/`) from inferred project conventions using marker-based merge.

## Agent Compatibility Matrix

| Agent | Skills Location | Rules/Instructions | Reads `.agents/`? |
|-------|----------------|-------------------|-------------------|
| Claude | `.claude/skills/` only | `.claude/rules/*.md` (glob frontmatter) + `CLAUDE.md` | NO |
| Codex | `.agents/skills/` (scans cwd→root) | `AGENTS.md` (per-dir, concatenated, 32KB cap) | Skills only |
| Gemini | `.agents/skills/` | `.agents/rules/` (plain md, no frontmatter) + `GEMINI.md` | Skills + Rules |

**Consequence**: Skills need symlinks into `.claude/skills/` (Claude) AND `.agents/skills/` (Codex/Gemini). Rules need per-agent generation — three formats from one source.

## Current Architecture

```
~/.agents/
├── brief/                         # CLI package (v0.2.0, ESM)
│   ├── cli.mjs                    # Entry point, command router
│   ├── lib/
│   │   ├── init.mjs              # Current init (148 lines, NOT idempotent)
│   │   ├── story.mjs, item.mjs   # Resource handlers
│   │   ├── search.mjs            # Grep-based search
│   │   └── ...                   # 13 modules total
│   ├── templates/
│   │   └── rules/
│   │       ├── manifest.json     # 7 detect patterns
│   │       └── *.md              # Rule skeleton files
│   └── package.json              # bin: brief → cli.mjs
│
├── custom-skills/                 # Skills live HERE (not in brief/)
│   ├── brief/SKILL.md            # Agent skill: /brief (routes to CLI)
│   ├── sdlc/                     # 10 lifecycle skills
│   └── project-memory/SKILL.md   # Memory management skill
│
├── templates/
│   └── project-structure/         # 9 scaffold files (tracker.yaml, AGENTS.md, etc.)
│
└── rules/                         # Global rule symlinks → .claude/rules/
```

**Current init flow** (init.mjs):
1. Create 8 directories under `documentation/`
2. Copy 9 scaffold files from `~/.agents/templates/project-structure/`
3. Read `manifest.json`, match detect patterns against project files, copy matching rule templates to `.claude/rules/`
4. Run `codegraph init` for code indexing
5. Add `.codegraph/` to `.gitignore`

**Problems with current implementation:**
- Not idempotent — re-running overwrites existing rules
- No symlinks — skills are not available in projects
- No multi-agent awareness
- Rule templates copied without relevance check beyond framework detection
- No health checking or install state tracking

## Proposed Architecture

```
~/.agents/
├── brief/                         # CLI package (unified)
│   ├── cli.mjs                    # Entry + CLI command router
│   ├── lib/
│   │   ├── init.mjs              # REWRITTEN: symlinks + detection + manifest
│   │   ├── doctor.mjs            # NEW: health check command
│   │   ├── symlink.mjs           # NEW: cross-platform symlink utilities
│   │   ├── detect.mjs            # NEW: agent dirs + tech stack (codegraph + manifest reads)
│   │   ├── rules-gen.mjs         # NEW: per-agent rule format generator
│   │   └── ...                   # Existing modules unchanged
│   ├── skills/                    # ALL skills — single package
│   │   ├── brief/                # /brief — unified lifecycle + PM router
│   │   │   ├── SKILL.md          # Router (merged sdlc + brief)
│   │   │   ├── init/SKILL.md     # /brief init (agent skill: scaffold + fill rules)
│   │   │   ├── cli/SKILL.md      # /brief cli (reference for CLI commands)
│   │   │   ├── project-memory/   # /brief memory
│   │   │   ├── discover/         # /brief discover
│   │   │   ├── prd/              # /brief prd
│   │   │   ├── trd/              # /brief trd
│   │   │   ├── plan/             # /brief plan (was project-plan)
│   │   │   ├── implement/        # /brief implement
│   │   │   ├── pr-review/        # /brief pr-review
│   │   │   ├── retro/            # /brief retro
│   │   │   ├── bug/              # /brief bug
│   │   │   ├── decision/         # /brief decision (was decision-doc)
│   │   │   └── memory-review/    # /brief memory-review
│   │   └── sdlc/                 # /sdlc — thin alias ("use /brief <phase>")
│   │       └── SKILL.md
│   └── templates/
│       └── rules/
│           ├── manifest.json     # Enhanced with relevance + agent targets
│           └── *.md              # Rule skeletons (agent-agnostic source)
│
└── templates/
    └── project-structure/         # Scaffold files (unchanged)


PROJECT/
├── .agents/
│   ├── skills/                    # Codex + Gemini read natively
│   │   └── brief/ → ~/.agents/brief/skills/brief/   # ONE symlink, all sub-skills inside
│   ├── rules/                     # Gemini reads natively (plain md)
│   │   ├── coding-standards.md   # Generated by /brief init
│   │   └── techstack.md
│   └── brief-manifest.json       # Install state (GITIGNORED)
│
├── .claude/
│   ├── skills/                    # Claude reads here (symlinked)
│   │   └── brief/ → ~/.agents/brief/skills/brief/   # ONE symlink
│   └── rules/                     # Claude-specific (with frontmatter)
│       ├── coding-standards.md   # Generated by /brief init
│       └── techstack.md
│
├── AGENTS.md                      # Codex reads (conventions section managed by /brief init)
│
├── .gitignore                     # Init adds: .agents/skills/, .claude/skills/,
│                                  #   .agents/brief-manifest.json, .codegraph/
└── documentation/                 # Scaffold (unchanged)
```

### What Changes

| Component | Change Type | Description |
|-----------|------------|-------------|
| `~/.agents/brief/skills/brief/` | New | Unified router + all sub-skills (lifecycle phases, init, cli, memory) |
| `~/.agents/brief/skills/sdlc/` | New | Thin alias skill ("use /brief <phase>") for migration |
| `~/.agents/brief/lib/init.mjs` | Modified | Full rewrite: symlinks, detection, manifest, idempotent |
| `~/.agents/brief/lib/doctor.mjs` | New | Health check command |
| `~/.agents/brief/lib/symlink.mjs` | New | Cross-platform symlink utilities (create, verify, fallback) |
| `~/.agents/brief/lib/detect.mjs` | New | Agent directory + tech stack detection |
| `~/.agents/brief/lib/rules-gen.mjs` | New | Per-agent rule format generator (Claude/Codex/Gemini) |
| `~/.agents/brief/cli.mjs` | Modified | Add `doctor` command routing |
| `~/.agents/custom-skills/` | Removed | Contents move to brief/skills/brief/ as sub-skills |
| `~/.claude/skills/` (global) | Unchanged | Managed by npx skills package, NOT by brief |
| Project `AGENTS.md` | Modified | Init creates if Codex detected; /brief init appends conventions |

## System Design

### Component Interaction — `brief init`

```
User: brief init [--non-interactive]
       │
       ▼
┌─────────────────────┐
│  cli.mjs (router)   │
└─────┬───────────────┘
      │
      ▼
┌─────────────────────┐     ┌──────────────────┐
│  init.mjs           │────▶│  detect.mjs      │
│  (orchestrator)     │     │  - findAgentDirs()│
│                     │     │  - detectStack()  │
│  1. Scaffold dirs   │     └──────────────────┘
│  2. Copy templates  │
│  3. Detect agents   │     ┌──────────────────┐
│  4. Detect stack    │────▶│  readline prompts │
│  5. PROMPT user *   │     │  (interactive)    │
│  6. Create symlinks │     │  - confirm agents │
│  7. Copy rules      │     │  - select rules   │
│  8. Write manifest  │     └──────────────────┘
│  9. Print welcome   │
│                     │     ┌──────────────────┐
│  * --non-interactive│────▶│  symlink.mjs     │
│    skips prompts,   │     │  - createLink()  │
│    uses detected    │     │  - verifyLink()  │
│    defaults         │     │  - fallbackCopy()│
└─────────────────────┘     └──────────────────┘
```

#### Interactive Prompt Flow (R4)

When running interactively (default), after detection:

```
  brief init
  ──────────────────────────────────────────────────
  Project: /Users/dev/my-app
  Detected: Node.js (Hono v4, Prisma)
  Agents:   Claude (.claude/ found)

  Skills to install:
    ✓ brief/      (lifecycle, project management, memory — all-in-one)

  Rules to install (based on detected stack):
    ✓ coding-style.md
    ✓ backend-standards.md
    ✗ frontend-standards.md  (no frontend detected)

  Proceed? [Y/n] _
  ──────────────────────────────────────────────────
```

The prompt uses Node.js built-in `readline` (zero dependencies). When `--non-interactive` is passed, all detected defaults are accepted without prompting — suitable for CI/scripts.

**Prompt Decision Tree:**

1. **Show detection summary** (always): project path, detected languages/frameworks, detected agents
2. **Confirm agents** (if >1 detected): "Install skills for: [Claude, Codex]? [Y/n]" — default Y for all detected
3. **Select rules** (if >0 relevant): "Install these rules? [Y/n per item]" — items toggleable, defaults based on detection relevance
4. **Confirm proceed**: "Proceed? [Y/n]" — default Y
5. **Abort behavior**: Any "n" at step 4 exits with no changes. "n" at step 2/3 skips that item only.
6. **Ctrl-C**: Clean exit, no partial state (no files written until final confirmation).

### Component Interaction — `/brief init` (agent skill)

```
Agent invokes /brief init
       │
       ▼
┌─────────────────────────────┐
│  init/SKILL.md       │
│  (agent reads instructions) │
└─────┬───────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check brief installed   │──▶ Read .agents/brief-manifest.json  │
│  2. Detect agents present   │──▶ Which dirs exist (.claude, etc.)  │
│  3. Read project files      │──▶ package.json, src/, tests/        │
│  4. Infer conventions       │──▶ Language, framework, patterns     │
│  5. Generate per-agent:     │                                      │
│     ┌──────────────────────────────────────────────────────┐      │
│     │ IF .claude/ detected:                                 │      │
│     │   Write .claude/rules/*.md (with frontmatter globs)  │      │
│     │   Use markers: <!-- brief:auto section="X" -->       │      │
│     ├──────────────────────────────────────────────────────┤      │
│     │ IF Codex detected (AGENTS.md exists or .codex/):     │      │
│     │   Update AGENTS.md section (fenced with markers)     │      │
│     │   Respect 32KB cap, append conventions section       │      │
│     ├──────────────────────────────────────────────────────┤      │
│     │ IF Gemini detected (.gemini/ or .agents/rules/):     │      │
│     │   Write .agents/rules/*.md (plain md, no frontmatter)│      │
│     │   Use same markers for merge safety                  │      │
│     └──────────────────────────────────────────────────────┘      │
│  6. Report: what was filled/updated per agent                      │
└───────────────────────────────────────────────────────────────────┘
```

### Per-Agent Rule Format

Same conventions, adapted to each agent's native format:

**Claude** (`.claude/rules/coding-standards.md`):
```markdown
---
paths:
  - "src/**/*.ts"
  - "lib/**/*.mjs"
---
<!-- brief:auto section="conventions" -->
## Conventions
- Use ESM imports, never CommonJS
- Prefer async/await over .then()
<!-- /brief:auto -->
```

**Codex** (`AGENTS.md` — append section):
```markdown
<!-- brief:auto section="conventions" -->
## Coding Conventions (generated by /brief init)
- Use ESM imports, never CommonJS
- Prefer async/await over .then()
<!-- /brief:auto -->
```

**Gemini** (`.agents/rules/coding-standards.md`):
```markdown
<!-- brief:auto section="conventions" -->
## Conventions
- Use ESM imports, never CommonJS
- Prefer async/await over .then()
<!-- /brief:auto -->
```

The marker format (`<!-- brief:auto -->`) works in all three because they all consume markdown. Codex's `AGENTS.md` is also markdown. HTML comments are invisible to all agents.

### Design Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Symlink level | Two-level (package→canonical→agent), Single-level (package→agent directly) | Single-level | Fewer failure points. Outside voice confirmed two-level adds breakable hop with no benefit. |
| Symlink direction | Relative, Absolute | Relative where possible | Less brittle across machines. Absolute only when crossing filesystem boundaries (home→project). |
| Skills packaging | Keep sdlc/project-memory separate, Move into brief/skills/ | Move all into brief/skills/ | Unified package: one install, one symlink source, one distribution unit. |
| Manifest storage | .agents/brief-manifest.json, .brief-lock, package.json field | .agents/brief-manifest.json | Brief-specific, not overwritable by other tools, lives next to what it describes. |
| Git tracking of symlinks | Track, Gitignore | Gitignore | Symlinks contain machine-specific paths. Init re-creates on clone. |
| Git tracking of rules | Track, Gitignore | Track | Rule content (including setup-filled content) is project knowledge — should be versioned. |
| Rule format strategy | Single format for all, Per-agent generation | Per-agent generation | Claude needs frontmatter, Codex needs AGENTS.md, Gemini needs plain .agents/rules/. Same content, three outputs. |
| Rule merge mechanism | Overwrite, Append, Marker-based sections | Marker-based | Only approach that supports both idempotency and manual edit preservation. Works in all three formats. |
| Interactive library | inquirer, prompts, readline (built-in) | readline (built-in) | Zero new dependencies; brief is dependency-light. |
| Copy fallback | Fail hard, Silent copy, Copy with warning | Copy with warning | Windows/Docker can't symlink. Users need to know updates won't propagate. |
| Tech detection priority | Must-have (blocks setup), Should-have (nice to have) | Must-have | R5 depends on R6 — can't determine relevance without detection. |
| Global skills management | Brief manages, npx skills manages | npx skills manages global | Brief only handles project-level. Global ~/.claude/skills/ (gstack, shadcn-ui) owned by skills CLI. |

### Tech Stack Detection Strategy (`detect.mjs`)

Two-layer detection, zero new dependencies:

**Layer 1 — Languages** (via codegraph, if initialized):
```bash
codegraph status --json <projectRoot>
# → {"languages": ["javascript", "typescript", "python"], ...}
```
If codegraph not initialized: fall back to file extension scan (`*.ts`, `*.py`, `*.go`, `*.rs`).

**Layer 2 — Frameworks** (via manifest file reads):
| File | What we extract |
|------|----------------|
| `package.json` | dependencies → hono, react, express, next, prisma, etc. |
| `Cargo.toml` | `[dependencies]` → actix, tokio, serde |
| `go.mod` | `require` → gin, echo, fiber |
| `pyproject.toml` / `requirements.txt` | django, flask, fastapi |
| `Gemfile` | rails, sinatra |
| `tsconfig.json` | strict mode, path aliases, target |
| `.eslintrc*` / `biome.json` | linting config signals |

**Output** — `DetectionResult` descriptor:
```javascript
{
  languages: ["typescript", "javascript"],
  frameworks: ["hono", "prisma"],
  testing: ["vitest"],     // from devDependencies
  runtime: "node",         // node | deno | bun | python | go | rust
  hasCI: true,             // .github/workflows/ exists
  agents: { claude: true, codex: false, gemini: false }
}
```

This drives both init (which rules to offer) and `/brief init` skill (which conventions to infer). Existing `templates/rules/manifest.json` detect patterns are reused — they already map framework names → rule templates.

### Design Patterns

- **Detect-and-act**: `detect.mjs` returns a descriptor object; consumers decide what to do with it. Never create directories that don't exist.
- **Manifest as source of truth**: `brief-manifest.json` records what was installed + how. Doctor and re-init read it to determine expected state. Schema:
  ```json
  {
    "version": "1.0.0",
    "installed_at": "2026-08-25T10:00:00Z",
    "mode": "symlink",
    "detection": {
      "languages": ["typescript", "javascript"],
      "frameworks": ["hono", "prisma"],
      "testing": ["vitest"],
      "runtime": "node",
      "agents": { "claude": true, "codex": false, "gemini": false }
    },
    "symlinks": [
      { "source": ".claude/skills/brief", "target": "~/.agents/brief/skills/brief", "status": "ok" },
      { "source": ".agents/skills/brief", "target": "~/.agents/brief/skills/brief", "status": "ok" }
    ],
    "rules_installed": ["coding-standards.md", "techstack.md"]
  }
  ```
- **Marker fencing**: Rule files use HTML comment markers (`<!-- brief:auto -->`) to delineate generated sections from manual content.
- **Graceful degradation**: Every operation has a fallback path. Symlink fails → copy. No tech detected → report "nothing detected". Codegraph fails → skip silently.

## Marker Format Specification

### Syntax

```markdown
<!-- brief:auto section="coding-style" generated="2026-08-25T10:00:00Z" -->
## Generated: Coding Style

- Use ESM imports (import/export), never CommonJS require()
- Prefer async/await over .then() chains
- ...

<!-- /brief:auto -->

## Manual Additions

(Everything outside markers is never touched by /brief init)
```

### Rules

1. Each marker pair has a `section` attribute identifying the generated block
2. `generated` timestamp tracks when content was last written
3. Content between markers is fully owned by `/brief init` — replaced on re-run
4. Content outside markers is user-owned — never modified
5. A rule file can have multiple marker sections (e.g., "framework" + "testing")
6. If markers are corrupted (missing close tag, nested markers), skip the file and warn
7. First run on a skeleton file: wrap entire generated content in markers, preserving any existing non-skeleton text

### Merge Algorithm

```
parseFile(content):
  sections = []
  current_position = 0
  for each <!-- brief:auto --> ... <!-- /brief:auto --> pair:
    sections.push({ type: 'manual', content: content[current_position..start] })
    sections.push({ type: 'auto', id: section_attr, content: inner })
    current_position = end
  sections.push({ type: 'manual', content: content[current_position..end] })
  return sections

merge(existing_sections, new_generated):
  for each section in existing_sections:
    if section.type == 'manual': keep as-is
    if section.type == 'auto' and new_generated has section.id:
      replace content, update timestamp
  for each new section not in existing:
    append at end (before final manual section if any)
```

## Error Handling & Failure Modes

### Exception Table

| Error | Handler | User-Visible Result |
|-------|---------|---------------------|
| EPERM (symlink creation on Windows) | `symlink.mjs:createLink()` catches, calls `fallbackCopy()` | "Symlinks unavailable on this platform, using copy mode. Updates won't auto-propagate." |
| ENOENT (agent dir doesn't exist) | `detect.mjs:findAgentDirs()` skips missing dirs | "Detected agents: Claude. (Codex, Gemini not found — install later and re-run init)" |
| EEXIST (symlink already exists) | `symlink.mjs:createLink()` verifies target matches | If target correct: skip silently. If target wrong: remove and re-create. |
| ENOSPC (disk full) | `init.mjs` catches top-level, cleans partial state | "Error: disk full. Init incomplete — re-run when space available." (exit 1) |
| SyntaxError (codegraph malformed JSON) | `detect.mjs:detectStack()` try/catch around JSON.parse | "Warning: codegraph output invalid, falling back to extension scan." (continues) |
| ManifestInvalid (corrupt JSON in brief-manifest.json) | `doctor.mjs` catches JSON.parse error | "Manifest corrupted. Delete .agents/brief-manifest.json and re-run `brief init`." (exit 1) |
| ENOTDIR (.claude is a file) | `detect.mjs:findAgentDirs()` filters non-directories | "Warning: .claude exists but is not a directory. Skipping." |
| MarkerParseError (corrupted markers in rule file) | `/brief init` skill catches per-file | "Warning: markers corrupted in coding-standards.md. Skipping — please fix manually." |
| ManifestMissing (doctor can't find manifest) | `doctor.mjs` reports as failure | "brief-manifest.json not found. Run `brief init` first." (exit 1) |
| BrokenSymlink (target file missing) | `doctor.mjs:validateSymlinks()` | "Broken: .claude/skills/brief → (target missing). Run `brief init` to fix." |
| StaleManifest (manifest doesn't match filesystem) | `doctor.mjs:checkConsistency()` | "Stale: manifest records 3 symlinks but only 2 exist on disk." |

### Failure Modes

| Failure | Trigger | Impact | Mitigation |
|---------|---------|--------|------------|
| Init on system without symlink support | Windows without dev mode, Docker containers | Skills not dynamically linked | Detect via test symlink, auto-fallback to copy mode |
| Init with stale symlinks from old path | User had custom-skills/ symlinks from before migration | Old symlinks resolve to nothing | Detect old-path patterns in manifest, auto-update |
| Setup corrupts manually-written rule | Marker parsing bug, or user wrote inside markers | Lost manual content | Parse before write, backup original if markers found, warn if content looks manual |
| Clone on machine without brief | All symlinks in .agents/skills/ and .claude/skills/ are broken | Agent sessions have no skills | Symlinks gitignored, init detects and offers re-creation |
| Concurrent init runs | User runs init in two terminals simultaneously | Race condition on manifest write | Use atomic write (write to temp, rename) for manifest |
| Brief package updated | npm update or git pull changes skill content | Project automatically gets updates via symlinks | This is the desired behavior — no mitigation needed |
| Rule template changed upstream | manifest.json detect patterns change | New projects get updated templates, old ones don't | brief doctor --update flag (future) to refresh templates |

## Dependencies

| Dependency | Type | Risk | Mitigation |
|-----------|------|------|------------|
| Node.js fs.symlinkSync | Runtime (stdlib) | L | No external dep, always available |
| Node.js fs.readlinkSync | Runtime (stdlib) | L | Used for verification |
| Node.js path.relative() | Runtime (stdlib) | L | For computing relative symlink targets |
| yaml (^2.9.0) | Package (existing) | L | Already in package.json |
| @colbymchenry/codegraph | Package (existing) | M | Used for code indexing, not critical path |
| ~/.agents/brief/skills/ | Internal | L | Created as part of this epic (prerequisite task) |
| Claude Code skill loading | External behavior | L | Documented: reads .claude/skills/ and .agents/skills/ |
| Codex/Gemini skill loading | External behavior | M | Documented: reads .agents/skills/ — verify during implementation |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | symlink.mjs (create, verify, fallback) | Mock fs, test all error paths |
| Unit | detect.mjs (agent dirs, tech stack) | Mock fs, fixture directories |
| Unit | Marker parser (parse, merge, edge cases) | Pure function tests, string fixtures. **Negative cases required**: nested `<!-- brief:auto -->` inside another (should error), unclosed marker (no `<!-- /brief:auto -->`), markers inside triple-backtick code blocks (should be ignored), empty section between markers, duplicate section names (last wins or error?). |
| Unit | manifest read/write (atomic, consistent) | Temp dir, verify contents |
| Integration | full init flow | Temp project dir, verify all outputs |
| Integration | doctor against broken state | Create broken symlinks, verify detection |
| Integration | init idempotency | Run init twice, verify no overwrites |
| Integration | migration (old paths → new) | Create old-style symlinks, verify update |
| Manual | /brief init agent skill | Run in Claude Code, verify rule fill |
| Manual | Multi-agent (Claude + Codex in same project) | Both agents find skills after init |

### Coverage Diagram

```
symlink.mjs          detect.mjs           init.mjs (orchestrator)
┌──────────────┐     ┌──────────────┐     ┌────────────────────────┐
│ createLink   │[U]  │ findAgentDirs│[U]  │ scaffold dirs      [I] │
│ verifyLink   │[U]  │ detectStack  │[U]  │ copy templates     [I] │
│ fallbackCopy │[U]  │ matchDetect  │[U]  │ detect + symlink   [I] │
│ removeStale  │[U]  └──────────────┘     │ write manifest     [I] │
└──────────────┘                           │ migration path     [I] │
                                           │ idempotent re-run  [I] │
doctor.mjs           marker parser         └────────────────────────┘
┌──────────────┐     ┌──────────────┐
│ validateLinks│[U]  │ parseMarkers │[U]     [U] = Unit test
│ checkManifest│[U]  │ mergeContent │[U]     [I] = Integration test
│ detectStale  │[U]  │ edge cases   │[U]     [M] = Manual verification
│ --json output│[U]  └──────────────┘
│ full check   │[I]
└──────────────┘

/brief init skill                 Multi-agent
┌──────────────────────┐          ┌────────────────────────┐
│ reads manifest   [M] │          │ Claude finds skills [M]│
│ fills rules      [M] │          │ Codex finds skills  [M]│
│ preserves manual [M] │          │ Re-init after clone [I]│
└──────────────────────┘          └────────────────────────┘
```

## Verification (beyond tests)

- **Symlink resolution**: After init, `readlink -f .claude/skills/brief/SKILL.md` resolves to `~/.agents/brief/skills/brief/SKILL.md`
- **Claude skill loading**: Start a Claude Code session in the project, verify `/brief` skill is available
- **Idempotency**: Run `brief init` twice, `git status` shows no changes after second run
- **Doctor green**: After clean init, `brief doctor` exits 0 with all checks passing
- **Doctor red**: Remove a skill file, `brief doctor` exits 1 and reports the broken link
- **Clone simulation**: Remove .agents/skills/ and .claude/skills/, run `brief init`, verify restoration

## Rollback Plan

| Story/Task | Revert Strategy | Data Implications | User Impact |
|------------|----------------|-------------------|-------------|
| Skills relocation (T1) | `git revert` + restore custom-skills/ symlinks | None — no user data in skills | Agent sessions temporarily lose skills until fix |
| Init rewrite (T2) | Revert init.mjs, old init still works | Projects already init'd keep their symlinks | New projects fall back to old copy behavior |
| Tech detection (T3) | Revert, init falls back to copying all rules | Extra rule files in .claude/rules/ (harmless) | Minor: users get non-relevant rule templates |
| /brief init (T4) | Remove skill file | Rules that were filled keep their content | Users edit rules manually (status quo) |
| Doctor (T5) | Remove doctor.mjs + CLI route | No health checking available | No regression — feature didn't exist before |
| Migration detection (T6) | Revert, old symlinks stay broken | Users must manually re-run init | One-time inconvenience on update |

**Global rollback**: `git revert` the entire feature branch. All changes are contained in `~/.agents/brief/` — no external system state is modified. Projects that ran init keep their symlinks (they still work as long as brief package exists at the same path).

## Long-Term Trajectory

- **Tech debt introduced**: Relative symlinks across home→project boundary require path computation that's inherently fragile. Acceptable for now; npm package distribution (future Epic) eliminates this by using a stable install path.
- **Reversibility**: 5/5 — git revert cleanly undoes everything. No database, no external state, no breaking changes to other systems.
- **Path dependency**: This architecture assumes skills are files on disk read by agent runtimes. If any agent runtime switches to a registry/API model, the symlink approach becomes irrelevant. Low risk given current ecosystem direction.
- **Phase 2 readiness**: The manifest + doctor pattern creates the foundation for `brief update` (pull new skill versions), `brief uninstall` (remove symlinks), and eventually `brief publish` (push to npm).

## Open Technical Questions

- [x] Relative vs absolute symlinks → Relative where possible (within same filesystem), absolute when crossing boundaries
- [x] Marker format → HTML comment fences: `<!-- brief:auto section="X" -->...<!-- /brief:auto -->`
- [x] Should `brief init` prompt for global skills (gstack, shadcn-ui) or leave that to a separate flow? → Separate flow. Init installs core only. Global ~/.claude/skills/ managed by npx skills.
- [x] Do Codex/Gemini read `.agents/skills/`? → YES. Both read natively. Claude needs symlinks into `.claude/skills/`.
- [x] Rules format across agents → Per-agent generation. Same content, three native formats.
- [x] Should sdlc + project-memory move into brief? → YES. Unified in brief/skills/.
- [ ] Should `brief init --non-interactive` be a flag for CI/scripts? → Likely yes — uses detected defaults without prompting. Decide during T4 implementation.
- [ ] How does `/brief init` discover which conventions to infer? → Hardcoded list initially: naming, imports, testing, framework. Extensible later.
- [ ] Should `brief init` create `AGENTS.md` if it doesn't exist? → Lean yes (with just a header + brief:auto markers for setup to fill later). But only if Codex detected.
- [x] Codex `AGENTS.md` 32KB cap — how to handle large rule sets? → rules-gen reads file size before append. If current + new > 30KB: warn "AGENTS.md near 32KB cap, brief conventions not added for Codex" and skip Codex rule generation. Brief's section stays concise (conventions only).

## Implementation Order (High-Level)

1. **T1: Relocate core skills** — Move custom-skills/{brief,sdlc,project-memory} into brief/skills/. Grep all SKILL.md routers for `custom-skills/` paths and rewrite to `brief/skills/brief/`. Update global `~/.claude/skills/` symlinks that pointed to old paths (one-time migration, since brief originally created them).
2. **T2: detect.mjs** — Agent dir detection + tech stack detection (pure functions, testable)
3. **T3: symlink.mjs** — Relative symlink creation, validation, platform detection, copy fallback
4. **T4: Rewrite init.mjs** — Orchestrate: scaffold → detect → prompt → symlink → rules → manifest
5. **T5: rules-gen.mjs** — Per-agent rule FORMAT scaffolder (places skeleton files with correct format: Claude frontmatter, Codex AGENTS.md append, Gemini plain md). Called by CLI init (step 7). Checks AGENTS.md size before append (warn + skip if > 30KB).
6. **T6: /brief init skill** — Agent skill that reads code, infers conventions, and FILLS content inside markers placed by T5. The interface between T5 and T6 is the marker format itself — T5 creates the containers, T6 fills them.
7. **T7: brief doctor** — Health check command with --json output
8. **T8: Migration detection** — Detect old custom-skills/ symlinks, auto-update on init

Dependencies:
```
T1 ──→ T3 ──→ T4 ──→ T7
       T2 ──→ T4     T8
              T5 ──→ T6
```

T1 first (symlink targets must exist). T2 and T3 in parallel (both feed T4). T5 before T6 (setup uses the generator). T7 and T8 after T4 (need init working).
