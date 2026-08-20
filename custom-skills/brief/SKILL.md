---
name: brief
description: "Router for brief CLI project management. Setup, migration, and verification of brief in any project. Invoke as /brief <action>."
user-invocable: true
argument-hint: "[setup|migrate|verify]"
---

# /brief — Project Management CLI Router

Setup, migrate, and verify `brief` in any project.

## Commands

| Action | When to use |
|--------|-------------|
| `setup` | First time — scaffold documentation structure in a project |
| `migrate` | One-time data conversion from legacy formats to brief format |
| `verify` | Run `brief status` + queries to confirm everything works — report gaps |

## /brief setup

Run in a project directory to scaffold the brief structure.

```bash
brief init
```

This creates:
- `documentation/` with subdirectories: stories, decisions, todo, logs, memory
- `documentation/tracker.yaml` — item registry
- `documentation/PROJECT-TRACKER.md` — generated markdown view
- `MEMORY.md` — memory index at project root
- `.project/` — local-only data (gitignored knowledge.db)

**Post-setup checklist:**
1. Confirm `brief status` returns counts
2. If project has existing stories in `documentation/stories/`, run `/brief migrate`
3. Add `documentation/logs/` and `.project/` to `.gitignore` if appropriate
4. Commit the scaffold: `chore: initialize brief project structure`

## /brief migrate

One-time conversion of existing project data into brief's format. This is NOT `brief migrate`
(the CLI command, reserved for brief schema upgrades). This skill runs migration scripts.

**What it converts:**
1. Monolithic `TODOS.md` → individual `documentation/todo/TODO-NNN-<slug>.md` files
2. Monolithic `log.md` → individual `documentation/logs/<timestamp>.md` files
3. Existing story folders → `documentation/tracker.yaml` entries

### Instructions

**Step 1 — Assess what exists:**
```bash
ls documentation/TODOS.md documentation/log.md documentation/tracker.yaml 2>&1
ls documentation/todo/ documentation/logs/ 2>&1
brief status
```

**Step 2 — Branch from main:**
```bash
git checkout main
git pull
git checkout -b chore/brief-migrate
```

**Step 3 — Run migration scripts:**
```bash
# Generate tracker from existing stories (always safe — creates new file)
node ~/.agents/scripts/taiboli-migrate/generate-tracker.mjs . --dry-run
# If output looks correct:
node ~/.agents/scripts/taiboli-migrate/generate-tracker.mjs .

# Split TODOS.md into individual files (if TODOS.md exists)
node ~/.agents/scripts/taiboli-migrate/split-todos.mjs . --dry-run
# If output looks correct:
node ~/.agents/scripts/taiboli-migrate/split-todos.mjs .

# Split log.md into individual files (if log.md exists)
node ~/.agents/scripts/taiboli-migrate/split-logs.mjs . --dry-run
# If output looks correct:
node ~/.agents/scripts/taiboli-migrate/split-logs.mjs .
```

**Step 4 — Verify:**
```bash
brief status
brief story list --all
brief todo list
brief log list
```

**Step 5 — Clean up legacy files (user decision):**
- Keep `TODOS.md` and `log.md` as archives? Or delete them?
- Ask user before removing originals

**Step 6 — Commit:**
```bash
git add documentation/tracker.yaml documentation/todo/ documentation/logs/
git commit -m "chore: migrate project data to brief format"
```

## /brief verify

Confirm brief is working in the current project. Any agent (Claude, Codex, Gemini) can run this.

### Instructions

Run these commands and report results:

```bash
which brief                        # CLI in PATH?
brief status                       # project detected? counts correct?
brief story list                   # stories visible?
brief todo list                    # TODOs visible?
brief log list                     # logs visible?
brief search "<relevant keyword>"  # search returns results?
test -f documentation/tracker.yaml # tracker exists?
```

**Report format:**
```
brief verify:
  ✓ CLI in PATH
  ✓ Project detected (N stories, M TODOs, K decisions)
  ✓ Stories: N active
  ✓ TODOs: N open
  ✓ Logs: N entries
  ✓ Search: functional
  ✓ tracker.yaml: present
```

**If any check fails**, report the failure and suggest the fix (usually `brief init` or PATH issue).

## Rules

- Always `--dry-run` first for destructive migrations
- Always branch from main for migration work — never from an active feature branch
- Migration scripts live in `~/.agents/scripts/taiboli-migrate/` — they are NOT committed to target repos
- After migration, verify with `/brief verify` before committing
- Ask user before deleting legacy source files (TODOS.md, log.md)
