# Memory — ~/.agents

Unified agent configuration for Claude Code, Codex and Gemini. One source, generated per provider.
How it fits together is in [README.md](README.md); this file is what is not derivable from the code.

## Reference

- [Config loading](memory/reference_agent-config-loading.md) — skills contribute only descriptions;
  `CLAUDE.md` and `rules/` load in full. Decides where any new rule belongs.
- [Session log formats](memory/reference_session-log-formats.md) — where Claude and Codex record
  branch and token usage, and the three asymmetries that produce wrong totals.

## Active

- [Standards split](memory/project_standards-split.md) — why standards are three skills, why stack
  content lives in repos, and what the 3,000-line-file problem actually was. Shipped 2026-07-29.
- [Cross-reference drift](memory/project_cross-reference-drift.md) — the dominant failure mode here
  is stale references, not duplication, and nothing checks for them. **Open: a reference validator
  in `check.sh` is the standing next candidate.**
- [Memory mechanisms](memory/project_memory-mechanisms.md) — three memory systems coexist
  unreconciled. **Open: read the two host hook scripts before extending memory anywhere.**

## Conventions

- Edit `WORKFLOW.md` or `providers/*.md`, never the generated `~/.claude/CLAUDE.md`. `check.sh`
  catches it if you do.
- `agents/*.md` is the source for both hosts; the Codex `.toml` is generated — never hand-edited.
- Renaming or deleting a skill is a repo-wide event: grep every consuming project, not just this one.
