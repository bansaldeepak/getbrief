
## Claude-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

**NEVER write memory to `~/.claude/projects/*/memory/`.** Project repo `MEMORY.md` + `memory/` only. Global claude config gets a pointer only. Format, and where completed feature context is flushed to: the `project-memory` skill.

### Skills & Rules

Skills in `~/.claude/skills/` (symlinked from `~/.agents/skills/`). Rules in `~/.claude/rules/` (symlinked from `~/.agents/rules/`). Both auto-apply based on description/globs.

### Model Strategy

Default: **opusplan** — Opus during plan mode, Sonnet during execution. Skills/commands with `model:` frontmatter override.

NOTE: Your code will be reviewed by OPENAI CODEX && GOOGLE GEMINI.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
