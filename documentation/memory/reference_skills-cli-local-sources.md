---
name: skills-cli-local-sources
description: Brief pinned local/global packages and portable registrations, with historical live-link behavior retained
type: reference
created: 2026-07-29
updated: 2026-10-10
valid_until: 2027-02-27
importance: 4
---

## Current installation contract (2026-10-10)

Brief supports Git-tracked project-local .brief/workflow packages and a separate machine package in the home directory. Recommend local for teams. Relative local registrations work without the original developer checkout; local guidance takes precedence. The CLI runtime remains separate.

Repeated init preserves selected scope and pinned provenance. Updates compare available local source, show revisions/content changes, preserve customizations and require explicit apply. Global updates do not replace project copies or silently fetch upstream.

The symlink-only account below is historical. Never use it to replace a real directory, assume an old global checkout exists, or bypass ownership/recovery controls. See [approved choices](portable-installs-and-feature-scoped-concurrent-records.md) and [current contract](../../skills/brief/references/records-and-installation.md).

## Historical architecture snapshot (2026-08-27)

**Brief repo location**: `/Users/db/Work/Arcitae/brief/` (standalone project, npm-linked to PATH)
**Old location**: `~/.agents/brief/` (deprecated — agents repo can be deleted)

`brief init` creates symlinks directly — no setup.sh, no skills CLI for local paths:

| Agent | Link created by init | Target |
|-------|---------------------|--------|
| Claude | `.claude/skills/brief` → | `BRIEF_SKILLS_PATH` (currently `~/.agents/brief/skills/brief/`) |
| Codex | `.agents/skills/brief` → | `BRIEF_SKILLS_PATH` |
| Gemini | (reads `.agents/rules/` directly) | N/A |

**Note**: `BRIEF_SKILLS_PATH` in `lib/init.mjs` still resolves via `homedir()/.agents/brief/skills/brief`.
This needs updating in the next story to point to the actual brief install location.

**Fallback**: if symlink fails (EPERM on some Windows/network mounts), `lib/symlink.mjs` copies
the entire directory tree and logs a warning. `brief doctor` detects stale copies via recursive
file mtime comparison.

**Migration**: `brief init` detects old `custom-skills/` symlinks via path pattern match and
removes them. `sdlc` and `project-memory` skills are folded into `/brief` — their old symlinks
are simply deleted.

## Why the skills CLI doesn't own this

`npx skills add ./local-dir` **copies** (verified 2026-07-29) — no symlink option. This means
edits to the source aren't reflected until re-run. `brief init` symlinks instead, so the
git-tracked skill file IS what agents read. The skills CLI is still correct for third-party
remote skills (e.g., `gstack`).

Related: [[project-next-steps-scaffold]], [[skills-cleanup-decisions]].
