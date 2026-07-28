
## Codex-Specific

### Project Instructions

Read and follow the project-level `AGENTS.md` if it exists in the repository root. It contains shared project instructions for all AI agents.

### Memory Location

All memory goes to project repo `MEMORY.md` + `memory/` directory. Never to `~/.codex/memories/`.

### Skills & Rules

Skills in `~/.codex/skills/` (symlinked from `~/.agents/skills/`). Rules in `~/.codex/rules/` (symlinked from `~/.agents/rules/`).

### Tool Mappings

| Workflow step | Codex equivalent |
|---------------|-----------------|
| `qa` agent | Run: `npm run typecheck && npm run lint && npm test` |
| `/pr-review` | Analyze diff against conventions, report issues |
| `self-improving` | Update project `MEMORY.md` after retro |

NOTE: Your code will be reviewed by CLAUDE && GOOGLE GEMINI.
