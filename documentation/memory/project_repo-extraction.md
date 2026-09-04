---
name: repo-extraction
description: "brief extracted to standalone repo at ~/Work/Arcitae/brief. Old ~/.agents deprecated. AGENTS.md → HARNESS.md. BRIEF_SKILLS_PATH needs update."
type: project
created: 2026-08-27
updated: 2026-08-27
valid_until: 2026-11-27
importance: 5
---

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

### Outstanding debt

- `BRIEF_SKILLS_PATH` in `lib/init.mjs` hardcodes `~/.agents/brief/skills/brief/` — must be updated to resolve from the actual brief install location
- `build.sh`/`check.sh` still sync to `~/.claude/CLAUDE.md` etc. — works but needs proper "harness injection" pattern
- GitHub repo is still named `agents-setup` — may want to rename to `brief`

**Why:** Brief outgrew being a subdirectory of agent config. It's a standalone tool with its own CLI, tests, and release lifecycle.
**How to apply:** All new brief work happens in this repo. `~/.agents` can be deleted once symlinks are re-pointed (next story).

Related: [[skills-cli-local-sources]], [[project-next-steps-scaffold]].
