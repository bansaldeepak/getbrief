---
name: project-next-steps-scaffold
description: "brief CLI — project management tool. Resource-based CLI for stories, TODOs, decisions, research, logs. File-based, multi-agent safe, dual-write to tracker.yaml + .md files."
type: project
created: 2026-08-13
updated: 2026-08-20
valid_until: 2026-11-01
importance: 5
---

## brief CLI — Implemented (2026-08-20)

### What it is

`brief` is a project management CLI that agents use as their primary interface for tracking work.
Installed globally via `npm link` from `~/.agents/brief/`. Available in PATH at `~/.vite-plus/bin/brief`.

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

# Views
brief status          # summary counts by type × status
brief pending         # all open items
brief active          # all in_progress
brief search "<q>"    # full-text across types (OR with |, AND with space)
brief stats           # usage per project per day

# Setup
brief init            # scaffold project structure
brief migrate         # brief format version upgrades (reserved)
brief generate        # regenerate PROJECT-TRACKER.md
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

### What's NOT implemented yet

- `brief context` command (context graduates to feature/ folder with ID) — deferred
- SQLite/knowledge.db indexing of tracker.yaml — deferred (file-based works)
- `@constraint` anchoring in code — deferred
