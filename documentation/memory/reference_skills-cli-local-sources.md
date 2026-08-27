---
name: skills-cli-local-sources
description: "brief init creates single-level symlinks from projects into ~/.agents/brief/skills/brief/. Falls back to copy on EPERM. Old custom-skills/ path is deprecated."
type: reference
created: 2026-07-29
updated: 2026-08-27
valid_until: 2027-02-27
importance: 4
---

## Current Architecture (S-011, 2026-08-27)

`brief init` creates symlinks directly — no setup.sh, no skills CLI for local paths:

| Agent | Link created by init | Target |
|-------|---------------------|--------|
| Claude | `.claude/skills/brief` → | `~/.agents/brief/skills/brief/` |
| Codex | `.agents/skills/brief` → | `~/.agents/brief/skills/brief/` |
| Gemini | (reads `.agents/rules/` directly) | N/A |

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
