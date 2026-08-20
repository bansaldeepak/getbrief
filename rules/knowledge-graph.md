# Knowledge Graph — Project Context Tool

Project management CLI. If `knowledge-graph` is in PATH, use it for lookups and mutations.
Run `knowledge-graph help` for full command reference.

## Quick Reference

```bash
# Search (works immediately — reads files, no setup needed)
knowledge-graph search "<query>"              # all types
knowledge-graph search "<query>" --todo       # filter by type

# Views (tables)
knowledge-graph story list                    # active stories
knowledge-graph todo list                     # open TODOs
knowledge-graph decision list                 # active decisions
knowledge-graph status                        # summary counts
knowledge-graph pending                       # all open items
knowledge-graph active                        # all in_progress

# Story detail
knowledge-graph story tasks S-001             # task table
knowledge-graph story task S-001-T2           # single task content

# Mutations (writes tracker.yaml + .md files)
knowledge-graph todo create "Fix the thing"
knowledge-graph todo update TODO-001 status=done pr=#42
knowledge-graph story task update S-001-T2 status=completed
```

## If CLI is not available

Fall back to reading files directly:
- `PROJECT-TRACKER.md` — active items (lean, start here)
- `tracker.yaml` — full history
- `memory/` — individual memory files

## When to check

SDLC skills specify exactly when. General principle: **before starting work, check what the
project already knows** about the area you're touching.
