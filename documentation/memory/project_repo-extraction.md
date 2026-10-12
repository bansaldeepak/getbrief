---
name: repo-extraction
description: Historical Brief repository extraction with current portable
  installation and source-path status
type: project
created: 2026-08-27
updated: 2026-10-10
valid_until: 2026-11-27
importance: 5
_brief:
  version: 1
  record_id: 403f4a18-0c0a-430a-8d1d-676d38ae9cf5
  item:
    id: project_repo-extraction
    type: memory
    title: Historical Brief repository extraction with current portable installation
      and source-path status
    status: active
    link: null
    pr: null
    updated: 2026-10-10
    description: Historical Brief repository extraction with current portable
      installation and source-path status
---

## Current status (2026-10-10)

The source-path and managed-workflow changes are implemented. Installation now follows the [portable contract](../../skills/brief/references/records-and-installation.md). On 2026-10-10, the user selected getbrief for the npm package and GitHub repository, preserving brief as the executable and skill name. The repository rename to bansaldeepak/getbrief was verified with PRIVATE visibility retained; no push/merge or npm publication occurred. This supersedes the historical suggested rename to brief below. See [the captured choice](portable-installs-and-feature-scoped-concurrent-records.md) for scope and rollout boundaries.

## Repo Extraction (2026-08-27)

Brief is now a standalone project at `/Users/db/Work/Arcitae/brief/` (was nested at `~/.agents/brief/`).

### What moved

| From (`~/.agents/`) | To (repo root) |
|---|---|
| `brief/cli.mjs` | `cli.mjs` |
| `brief/lib/`, `brief/test/` | `lib/`, `test/` |
| `brief/skills/` | `skills/` |
| `brief/templates/rules/` | `templates/rules/` |
| `templates/project-structure/` | `templates/project-structure/` |
| `templates/project-skills/` | removed (S-014: relocated to rules/ and skills/) |
| `agents/` | `agents/` |
| `rules/` | `rules/` |
| `scripts/` | `scripts/` |
| `providers/` | `providers/` |
| `AGENTS.md` | `HARNESS.md` |
| `concepts/` | `documentation/concepts/` |

### What was deleted

- `custom-skills/` — legacy, superseded by `skills/brief/`
- `skills/gstack/`, `skills/shadcn-ui/` — third-party, user-installed (stay on user's machine, not in repo)
- `.skill-lock.json` — skills CLI state (not brief's concern)

### Outstanding debt recorded on 2026-08-27

- `BRIEF_SKILLS_PATH` in `lib/init.mjs` hardcodes `~/.agents/brief/skills/brief/` — must be updated to resolve from the actual brief install location
- `build.sh`/`check.sh` still sync to `~/.claude/CLAUDE.md` etc. — works but needs proper "harness injection" pattern
- GitHub repo is still named `agents-setup` — may want to rename to `brief`

**Why:** Brief outgrew being a subdirectory of agent config. It's a standalone tool with its own CLI, tests, and release lifecycle.
**How to apply:** All new brief work happens in this repo. `~/.agents` can be deleted once symlinks are re-pointed (next story).

Related: [[skills-cli-local-sources]], [[project-next-steps-scaffold]].
