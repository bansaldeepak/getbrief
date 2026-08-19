# Project Memory

Memory is stored in `memory/` as individual markdown files with frontmatter.
The knowledge graph (`.project/knowledge.db`) is the **primary read path** — use
`knowledge_search` and `knowledge_context` MCP tools instead of reading files directly.

If the knowledge graph is unavailable, fall back to reading `memory/*.md` files.

## Index

<!-- One line per memory, under ~40 lines total. Format: -->
<!-- - [slug](memory/slug.md) — one-line summary -->
