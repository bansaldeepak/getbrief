---
name: project-next-steps-scaffold
description: "brief CLI — project management tool. Resource-based CLI for stories, TODOs, decisions, research, logs. File-based, multi-agent safe, dual-write to tracker.yaml + .md files."
type: project
created: 2026-08-13
updated: 2026-08-27
valid_until: 2026-11-01
importance: 5
---

## brief CLI — Implemented (2026-08-20)

### What it is

`brief` is a project management CLI that agents use as their primary interface for tracking work.
Installed globally via `npm link` from `~/Work/Arcitae/brief/`. Available in PATH at `~/.vite-plus/bin/brief`.
Standalone repo (extracted from `~/.agents` on 2026-08-27). Old `~/.agents` path deprecated.

### Architecture

- **Resource-based**: `brief <resource> <action> [args] [flags]`
- **Dual-write**: create/update writes BOTH `tracker.yaml` AND individual `.md` files
- **File-based fallback**: `scan.mjs` scans directories when `tracker.yaml` is missing
- **Multi-agent safe**: logs are individual files (no shared file corruption)
- **Usage tracking**: append-only `~/.brief/usage.log`, stats per project per day

### Canonical Project Structure

```
MEMORY.md                    ← memory index at project root
documentation/
  PROJECT-TRACKER.md         ← generated, active items only
  tracker.yaml               ← full source of truth
  todo/TODO-001.md           ← individual item files
  decisions/DEC-001.md
  research/RES-001.md
  audit/AUD-001.md
  logs/<timestamp>.md        ← one file per log entry
  memory/                    ← agent memory files
  stories/<feature>/S-NNN/
    story.md, tasks/T-001.md, summary.md, retro.md
```

### Commands Implemented

```bash
# Resource CRUD
brief story create|list|tasks|task|update
brief todo create|list|update|show
brief decision create|list|update|show
brief research create|list|update|show
brief log add|list|show

# Code + Doc Search (S-003, 2026-08-21)
brief query "<symbol>"         # unified code + docs — shows callees & callers
brief query --full "<symbol>"  # full explore: source, all edges, usages, impact
brief query --json "<q>"       # structured JSON output

# Graduated Context (S-003, 2026-08-21)
echo "body" | brief context graduate "title"   # save cross-cutting knowledge
brief context list                             # list all graduated context
brief context "<query>"                        # search context

# Views
brief status          # summary counts by type × status
brief pending         # all open items
brief active          # all in_progress
brief search "<q>"    # doc-only search (OR with |, AND with space)
brief stats           # usage per project per day

# Setup (S-011, 2026-08-27 — interactive multi-agent installer)
brief init                   # interactive: detect → prompt → symlink → rules → codegraph
brief init --non-interactive # CI/scripted: no prompts, scaffold everything detected
brief init --reindex         # force-rebuild codegraph index
brief doctor                 # verify symlinks, manifest, rules health
brief doctor --json          # structured output for automation
brief migrate                # brief format version upgrades (reserved)
brief generate               # regenerate PROJECT-TRACKER.md
```

### Skills & Rules

- **`/brief` skill** (`custom-skills/brief/SKILL.md`) — setup, migrate (one-time scripts), verify
- **`brief` rule** (`rules/brief.md`) — auto-loads on `documentation/**` and `*.md` files
- **SDLC skills updated** — project-plan, implement, retro all reference brief commands with fallback

### What tracker tracks (and doesn't)

**IN**: stories, TODOs, decisions, research, audits — items with lifecycles
**NOT IN**: memory (volatile, managed by self-improving agent), logs (append-only events)

### Migration Scripts

One-time scripts for converting existing projects: `~/.agents/scripts/taiboli-migrate/`
- `split-todos.mjs` — monolithic TODOS.md → individual TODO-NNN.md
- `split-logs.mjs` — monolithic log.md → individual timestamped files
- `generate-tracker.mjs` — scan stories/todos/decisions/research → tracker.yaml

### Lifecycle Position

```
discover → prd → trd → project-plan → implement → pr-review → retro → merge
                                                                  ↑
                                              retro is last step before merge,
                                              commits to same PR after user tests
```

### Codegraph Integration (S-003, 2026-08-21)

- `@colbymchenry/codegraph` 1.5.0 bundled as npm dep (no separate brew install needed)
- `lib/code-index.mjs` wraps JS API: search, callers, callees, usages, edges, impact, getNodeDetail
- mtime-based cache: reopens DB handle only when `.codegraph/codegraph.db` changes on disk
- `brief init` creates `.codegraph/` index using bundled binary via `execFileSync`
- serve.mjs removed — MCP server was dead code (knowledge.db never running)

### Init Architecture (S-011, 2026-08-27)

`brief init` is now an interactive multi-agent installer:

```
scaffold docs → detect stack → filter rules → prompt user → migrate old symlinks
  → create symlinks → copy rules → write manifest → update .gitignore → codegraph
```

Key components:
- `lib/detect.mjs` — `findAgentDirs()` + `detectStack()` (codegraph or extension scan)
- `lib/symlink.mjs` — cross-platform symlinks with EPERM→copy fallback
- `lib/init.mjs` — full interactive flow, `--non-interactive` for CI
- `lib/rules-gen.mjs` — per-agent rule format scaffolder with marker-based merge
- `lib/markers.mjs` — `<!-- brief:auto section="X" -->` parse + idempotent merge
- `lib/doctor.mjs` — health check: manifest, symlinks, rules, stale copies

Manifest: `.agents/brief-manifest.json` (gitignored) — records mode, detection, symlinks, rules.
Migration: detects old `custom-skills/` symlinks, removes stale ones (`sdlc`, `project-memory`).
Skills path: always `~/.agents/brief/skills/brief/` — single-level symlinks into projects.

### What's NOT implemented yet

- Context lifecycle (update/delete commands) — deferred
- SQLite/knowledge.db indexing of tracker.yaml — deferred (file-based works)
- `@constraint` anchoring in code — deferred
- Semantic/vector search layer
- Auto-reindex on file save
- Rule content fill (markers are scaffolded empty; agent fills via `/brief init` skill)
- Dockerfile/fly.toml/wrangler.jsonc detection (not in DetectionResult yet)
