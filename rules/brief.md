# Knowledge Graph — Project Context Tool

Project management CLI. If `brief` is in PATH, use it for lookups and mutations.
Run `brief help` for full command reference.

## Quick Reference

```bash
# Search (works immediately — reads files, no setup needed)
brief search "<query>"              # all types
brief search "<query>" --todo       # filter by type

# Views (tables)
brief story list                    # active stories
brief todo list                     # open TODOs
brief decision list                 # active decisions
brief status                        # summary counts
brief pending                       # all open items
brief active                        # all in_progress
brief stats                         # usage per day (current project)
brief stats --global                # usage across all projects

# Story detail
brief story tasks S-001             # task table
brief story task S-001-T2           # single task content

# Mutations (writes tracker.yaml + .md files)
brief story create "Feature name" --description="Why"
brief story task create S-001 "Task title"
brief story task update S-001-T2 status=completed
brief story update S-001 status=done pr=#42
brief todo create "Fix the thing"
brief todo update TODO-001 status=done "note=Resolution details"

# Log (multi-agent safe — one file per entry)
brief log "What happened" --tag=progress --story=S-001
brief log list                      # recent entries
brief log list --tag=progress       # filter by tag
```

## If CLI is not available

Fall back to reading files directly:
- `PROJECT-TRACKER.md` — active items (lean, start here)
- `tracker.yaml` — full history
- `memory/` — individual memory files

## When to check

SDLC skills specify exactly when. General principle: **before starting work, check what the
project already knows** about the area you're touching.
