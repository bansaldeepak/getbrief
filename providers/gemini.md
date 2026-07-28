
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
