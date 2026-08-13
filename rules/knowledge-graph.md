# Knowledge Graph — Primary Memory Read Path

A project-local SQLite knowledge graph surfaced via MCP server. Indexes project context (TODOs,
decisions, constraints, memory, retro findings) from source files, linked to specific code via anchors.

## If `.project/knowledge.db` exists in the project

**USE IT. This is not optional.** The knowledge graph is the primary read path for project memory.
Do NOT skip it and read `memory/` files directly — the MCP tools are faster and more complete.

| Tool | Use For |
|------|---------|
| `knowledge_context` | Get relevant knowledge (TODOs, decisions, constraints, memory) for a file path — **call this before editing any file with known constraints** |
| `knowledge_search` | Search project knowledge by keyword, optionally filtered by type — **use instead of grepping through memory/ or decisions/ files** |
| `knowledge_status` | Get project status (active stories, open TODOs) — **use instead of reading PROJECT-TRACKER.md or TODOS.md** |

### When to call these tools

- **Before editing a file**: `knowledge_context` with the file path — surfaces constraints, decisions, and TODOs anchored to it
- **When searching for project history/decisions**: `knowledge_search` — replaces reading individual `memory/` files
- **When checking project state**: `knowledge_status` — replaces reading tracker or todo files
- **At memory checkpoints**: Query before writing to avoid duplicating what's already captured

### Writing memory

Write to source files (`memory/`, `documentation/decisions/`, `context.md`, `retro.md`) with proper
format — the knowledge DB indexes them. Never write to the DB directly. See `project-memory` skill
for file formats.

## If `.project/knowledge.db` does NOT exist

The project hasn't set up a knowledge graph. Read `memory/`, `documentation/decisions/`, and
`documentation/TODOS.md` directly as needed.
