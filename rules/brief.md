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

# Story detail
brief story tasks S-001             # task table
brief story task S-001-T2           # single task content

# Mutations (writes tracker.yaml + .md files)
brief todo create "Fix the thing"
brief todo update TODO-001 status=done pr=#42
brief story task update S-001-T2 status=completed
```

## If CLI is not available

Fall back to reading files directly:
- `PROJECT-TRACKER.md` — active items (lean, start here)
- `tracker.yaml` — full history
- `memory/` — individual memory files

## When to check

SDLC skills specify exactly when. General principle: **before starting work, check what the
project already knows** about the area you're touching.
