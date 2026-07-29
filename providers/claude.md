
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
