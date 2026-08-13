# Knowledge Graph

A project-local SQLite knowledge graph surfaced via MCP server. Provides project context (TODOs, decisions, constraints, memory, retro findings) linked to specific code files via anchors.

## If `.project/knowledge.db` exists in the project

Use knowledge MCP tools for project context instead of reading memory/documentation files manually:

| Tool | Use For |
|------|---------|
| `knowledge_context` | Get relevant knowledge (TODOs, decisions, constraints, memory) for a file path |
| `knowledge_search` | Search project knowledge by keyword, optionally filtered by type |
| `knowledge_status` | Get project status (active stories, open TODOs) |

When touching a file with known constraints or decisions, call `knowledge_context` with the file path to surface what you need to know before editing.

When searching for project history, prior decisions, or feedback: `knowledge_search` over reading individual `memory/` files.

## If `.project/knowledge.db` does NOT exist

The project hasn't set up a knowledge graph. Read `memory/`, `documentation/decisions/`, and `TODOS.md` directly as needed.

To set one up: `npm run knowledge:build` (if the scripts exist in `.project/scripts/`).
