
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

<!-- CODEX_SECOND_OPINION_START -->
## Codex CLI — Second Opinion

Codex CLI is set up and working on this machine. Use it as a second opinion — a fresh, differently-modeled read on a diagnosis, a fix, or a design choice — before assuming it's broken.

Auth is Azure OpenAI via a command-backed provider (`[model_providers.azure.auth]` in `~/.codex/config.toml`), reading the API key from the macOS Keychain (service `codex-azure`). There is no env var and no `~/.codex/auth.json` — that's expected.

`codex login status` prints "Not logged in" and `~/.codex/auth.json` is absent. **Both are normal** — that check is for ChatGPT/OpenAI login, which this setup doesn't use. **Never run `codex login`.**

To verify auth:
```bash
node -e "const m=await import('/Users/db/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/lib/codex.mjs');console.log(await m.getCodexAuthStatus(process.cwd()))"
```
Expect `loggedIn: true` and "Azure OpenAI is configured and does not require OpenAI authentication".

Run it:
```bash
codex exec --skip-git-repo-check "<prompt>" </dev/null              # gpt-5.6-sol (default)
codex exec --skip-git-repo-check -p deepseek "<prompt>" </dev/null  # DeepSeek-V4-Pro
```
`</dev/null` is required or the run hangs on "Reading additional input from stdin...". Prefix with `RUST_LOG=codex_models_manager=off` to suppress a cosmetic ~330KB JSON dump on stderr.

Harmless, ignorable warnings: "Model metadata for `DeepSeek-V4-Pro` not found", "MCP client for cloudflare-api failed to start: OAuth authorization required", "rmcp::transport::worker: worker quit with fatal ... Auth(AuthorizationRequired)".

Don't ask Codex "which model are you" — its system prompt always answers "GPT-5.6 Sol" regardless of the actual model. Trust the `model:` banner line instead.
<!-- CODEX_SECOND_OPINION_END -->
