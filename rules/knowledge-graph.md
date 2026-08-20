# Knowledge Graph — Project Context Tool

A project-local knowledge index. When available, provides fast lookups for TODOs, decisions,
constraints, memory, and retro findings anchored to code.

## If `knowledge-graph` CLI is in PATH

Use it for quick lookups instead of reading files:

| Command | Use For |
|---------|---------|
| `knowledge-graph search "<query>"` | Find TODOs, decisions, memory by keyword |
| `knowledge-graph status` | Active stories, open items |
| `knowledge-graph create <type> <title>` | Create a new TODO, decision, research, or audit |
| `knowledge-graph update <id> field=value` | Update item status, PR link, etc. |
| `knowledge-graph generate` | Regenerate PROJECT-TRACKER.md from tracker.yaml |

## If CLI is not available

Fall back to reading files directly:
- `tracker.yaml` — structured source of truth for all items
- `PROJECT-TRACKER.md` — generated markdown (active items only)
- `memory/` — individual memory files with frontmatter

## When to check project context

SDLC skills (discover, prd, project-plan, implement) specify exactly when to check.
The general principle: **before starting work, check what the project already knows** about
the area you're touching. Don't re-discover what a retro already found or ignore a TODO
that's already tracked.
