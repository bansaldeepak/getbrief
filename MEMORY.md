# Memory — brief

Project management CLI + multi-agent installer. Standalone repo at `~/Work/Arcitae/brief/`.

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
- [Skills CLI, local sources](documentation/memory/reference_skills-cli-local-sources.md) — brief
  init symlinks directly; skills CLI copies (used only for remote/third-party skills).

## Active

- [Repo extraction](documentation/memory/project_repo-extraction.md) — brief is standalone at
  ~/Work/Arcitae/brief. BRIEF_SKILLS_PATH and harness injection pattern are next.
- [brief CLI](documentation/memory/project_next-steps-scaffold.md) — architecture, commands (incl.
  query/context/codegraph), project structure, and what's deferred.
- [Skills cleanup decisions](documentation/memory/project_skills-cleanup-decisions.md) — D8
  superseded (renamed to HARNESS.md), item.mjs delegation, enrichment aligned to gstack reviews
- [Standards split](documentation/memory/project_standards-split.md) — why standards are three
  skills, why stack content lives in repos.
- [Cross-reference drift](documentation/memory/project_cross-reference-drift.md) — stale references
  are the dominant failure mode; nothing checks for them.
- [Memory mechanisms](documentation/memory/project_memory-mechanisms.md) — three memory systems
  coexist unreconciled.

## Feedback

- [Lifecycle: retro position](documentation/memory/feedback_lifecycle-retro-position.md) — retro
  after PR + user tests, before merge. Token usage removed from all skills.
- [Status normalization](documentation/memory/feedback_status-normalization.md) — only first word of
  status field matters; complex prose after it is ignored.
- [Init patterns](documentation/memory/feedback_init-patterns.md) — atomic manifest, recursive
  mtime, marker merge, SKIP_DIRS, line-level gitignore match.

## Conventions

- Edit `HARNESS.md` or `providers/*.md`, never the generated `~/.claude/CLAUDE.md`.
- `agents/*.md` is the source for both hosts; the Codex `.toml` is generated — never hand-edited.
- Renaming or deleting a skill is a repo-wide event: grep every consuming project, not just this one.
- `BRIEF_SKILLS_PATH` in `lib/init.mjs` still points to `~/.agents/brief/skills/brief/` — needs updating in next story.
