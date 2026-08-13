
## Claude-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

**NEVER write memory to `~/.claude/projects/*/memory/`.** Global claude config gets a pointer only.

**Writing:** Always write to properly formatted files in the repo — `memory/`, `documentation/decisions/`,
`context.md`, `retro.md`. These are the source of truth regardless of whether a knowledge graph exists.

**Reading:** If `.project/knowledge.db` exists, use `knowledge_context`, `knowledge_search`,
`knowledge_status` MCP tools — they index the same files. Fallback (no DB): read files directly.

**`MEMORY.md`:** A lightweight index/redirect, not a data dump. Keep under ~40 lines.

Full format and strategy: the `project-memory` skill.

### Skills & Rules

Skills in `~/.claude/skills/` (symlinked from `~/.agents/skills/`). Rules in `~/.claude/rules/` (symlinked from `~/.agents/rules/`). Both auto-apply based on description/globs.

### Model Strategy

Default: **opusplan** — Opus during plan mode, Sonnet during execution. Skills/commands with `model:` frontmatter override.

NOTE: Your code will be reviewed by OPENAI CODEX && GOOGLE GEMINI.

### Codex CLI login note

If `codex login status` (or any codex command) reports "not logged in", that's a false alarm on this
machine — auth here is Azure OpenAI via the Keychain, not ChatGPT/OpenAI login, so that check doesn't
apply. Don't try to fix it or avoid using Codex as a second opinion because of it; the codex skills
already know how to run it. If asked for a second opinion with DeepSeek specifically:

```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
