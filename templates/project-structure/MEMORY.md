# Project Memory

Memory is stored in `memory/` as individual markdown files with frontmatter.

## How to access

**Primary** — use `brief` CLI:
```bash
brief search "<query>" --memory # search memory files specifically
brief status                    # summary of project state
```

**Broader search** — across all documentation:
```bash
brief search "<query>"          # searches everything (stories, todos, decisions, memory)
```

**Fallback** — read files directly:
- `documentation/memory/*.md` — individual memory files
- This file (`MEMORY.md`) — lightweight index

## Index

<!-- One line per memory, under ~40 lines total. Format: -->
<!-- - [slug](memory/slug.md) — one-line summary -->
