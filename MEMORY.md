# Memory — ~/.agents

Unified agent configuration for Claude Code, Codex and Gemini. One source, generated per provider.

## How to access

**Primary** — use `brief` CLI if installed:
```bash
brief search "<query>"          # searches memory + all project context
brief search "<query>" --memory # memory only
```

**Fallback** — read files directly from `documentation/memory/`.

## Reference

- [Config loading](documentation/memory/reference_agent-config-loading.md) — skills contribute only
  descriptions; `CLAUDE.md` and `rules/` load in full. Decides where any new rule belongs.
- [Session log formats](documentation/memory/reference_session-log-formats.md) — where Claude and
  Codex record branch and token usage.
- [Skills CLI, local sources](documentation/memory/reference_skills-cli-local-sources.md) — it
  copies local paths instead of symlinking, which is why `setup.sh` still owns `custom-skills/`.

## Active

- [Standards split](documentation/memory/project_standards-split.md) — why standards are three
  skills, why stack content lives in repos.
- [Cross-reference drift](documentation/memory/project_cross-reference-drift.md) — stale references
  are the dominant failure mode; nothing checks for them.
- [Memory mechanisms](documentation/memory/project_memory-mechanisms.md) — three memory systems
  coexist unreconciled.

## Conventions

- Edit `AGENTS.md` or `providers/*.md`, never the generated `~/.claude/CLAUDE.md`.
- `agents/*.md` is the source for both hosts; the Codex `.toml` is generated — never hand-edited.
- Renaming or deleting a skill is a repo-wide event: grep every consuming project, not just this one.
