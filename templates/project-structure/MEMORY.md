# Project Memory

<!-- brief:memory-harness -->
Use `brief memory` commands instead of reading files directly:
- `brief memory list` — concise index of all memories
- `brief memory show <name>` — view a specific memory
- `brief memory create <name> --type=<type>` — create a new memory
- `brief memory update <name>` — update an existing memory

Do NOT read `documentation/memory/*.md` files directly — use the commands above.
<!-- /brief:memory-harness -->

Memory is stored in `memory/` as individual markdown files with frontmatter.

## How to access

**Primary** — use `brief` CLI:
```bash
brief memory list               # concise index of all memories
brief memory show <name>        # view a specific memory
brief search "<query>" --memory # search memory files specifically
brief status                    # summary of project state
```

**Broader search** — across all documentation:
```bash
brief search "<query>"          # searches everything (stories, todos, decisions, memory)
```

**Fallback** — read files directly (only if CLI is unavailable):
- `documentation/memory/*.md` — individual memory files
- This file (`MEMORY.md`) — lightweight index

## Index

<!-- One line per memory, under ~40 lines total. Format: -->
<!-- - [slug](memory/slug.md) — one-line summary -->
