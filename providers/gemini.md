
## Gemini-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

All memory goes to project repo `MEMORY.md` + `documentation/memory/` directory. Never to `~/.gemini/` state files.

### Skills & Rules

Skills auto-load from `~/.agents/skills/` (native support). Use `@./file.md` imports in GEMINI.md for additional context.

### Tool Mappings

| Workflow step | Gemini equivalent |
|---------------|-----------------|
| `qa` agent | Run project-configured checks; inapplicable checks are N/A; missing or unavailable required checks block readiness |
| `/pr-review` | Follow brief pr-review: classify origin, fix all new issues, record user decisions for existing debt |
| `self-improving` | Follow brief memory-review and self-improving procedure: reconcile choices and apply authorized rules/skills/agents improvements |

NOTE: Your code will be reviewed by CLAUDE && OPENAI CODEX.


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
