
## Gemini-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

All memory goes to project repo `MEMORY.md` + `memory/` directory. Never to `~/.gemini/` state files.

### Skills & Rules

Skills auto-load from `~/.agents/skills/` (native support). Use `@./file.md` imports in GEMINI.md for additional context.

### Tool Mappings

| Workflow step | Gemini equivalent |
|---------------|-----------------|
| `qa` agent | Run: `npm run typecheck && npm run lint && npm test` |
| `/pr-review` | Analyze diff against conventions, report issues |
| `self-improving` | Update project `MEMORY.md` after retro |

NOTE: Your code will be reviewed by CLAUDE && OPENAI CODEX.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

<!-- CODEX_LOGIN_NOTE_START -->
### Codex CLI login note

If `codex login status` (or any codex command) reports "not logged in", that's a false alarm on this
machine — auth here is Azure OpenAI via the Keychain, not ChatGPT/OpenAI login, so that check doesn't
apply. Don't try to fix it or avoid using Codex as a second opinion because of it; the codex skills
already know how to run it. If asked for a second opinion with DeepSeek specifically:

```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```
<!-- CODEX_LOGIN_NOTE_END -->
