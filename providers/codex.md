
## Codex-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

All memory goes to project repo `MEMORY.md` + `documentation/memory/` directory. Never to `~/.codex/memories/`.

### Skills & Rules

Skills in `~/.codex/skills/` (symlinked from `~/.agents/skills/`). Rules in `~/.codex/rules/` (symlinked from `~/.agents/rules/`).

### Tool Mappings

| Workflow step | Codex equivalent |
|---------------|-----------------|
| `qa` agent | Run project-configured checks; inapplicable checks are N/A; missing or unavailable required checks block readiness |
| `/pr-review` | Follow brief pr-review: classify origin, fix all new issues, record user decisions for existing debt |
| `self-improving` | Follow brief memory-review and self-improving procedure: reconcile choices and apply authorized rules/skills/agents improvements |

NOTE: Your code will be reviewed by CLAUDE && GOOGLE GEMINI.

