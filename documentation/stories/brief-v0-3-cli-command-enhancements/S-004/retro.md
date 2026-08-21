# S-004 Retrospective

**Date**: 2026-08-21
**Story**: brief v0.3 — CLI Command Enhancements
**Duration**: 2026-08-21 → 2026-08-21 (single session)

## Scope Accuracy

- **Planned tasks**: 6
- **Actual tasks**: 6
- **Scope change**: Expanded during implementation — added body-update for all update commands, `brief story summary` read/update, `brief context show/update`. These weren't in the original plan but emerged from user feedback mid-implementation.

## What Went Well

- Single utility (`body.mjs`) cleanly served all commands — no duplication
- The pattern "body = full content below metadata header" is simple and universal
- Backward compatibility maintained — no body = template as before
- User caught the design flaw (body replacing only one section) before we committed, saving a rework

## What Didn't Go Well

- Initial design was wrong: `--body` replaced only the first `<!-- -->` placeholder, not the full content below the header. The user had to point out that teams have different structures and body should be the entire content.
- Task files (T-001 through T-006) were created with empty templates, demonstrating the exact problem we were solving — ironic but also proved the value of the fix.
- The "ambiguous command" issue (`brief story summary S-NNN --body=...` doing both read and update) needed user feedback to catch. Should have followed the explicit-verb pattern from the start.

## Learnings

| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | `--body` should replace ALL content below metadata, not inject into one section. Teams structure differently. | Changed design before commit |
| 2 | Update commands need body support too — create-only is half the CRUD story | Added body to all update commands |
| 3 | Commands must be unambiguous — same command shouldn't do read OR write depending on flags | Split into `brief story summary S-NNN` (read) vs `brief story summary update S-NNN --body=` (update) |
| 4 | Eating your own dogfood during implementation reveals gaps immediately (task files were empty templates = the exact problem being solved) | No action needed — natural outcome |

## System Improvements Made

- `brief/lib/body.mjs` — new shared utility for all commands
- All create commands: `--body` or stdin pipe for full content
- All update commands: `--body` or stdin pipe for full body replacement
- `brief story summary` — new read/update subcommand
- `brief context show/update` — new read/update subcommands
- `path:` standardized output on all creates

## Recommendations for Next Story

- When designing CLI commands, always start with the explicit-verb pattern (create/show/update/delete) — never overload a single command with flag-dependent behavior
- For brief itself: memory and retro commands should follow the same CRUD pattern (Epic 4)
- The `brief rule` in `~/.agents/rules/brief.md` needs updating to document the new `--body`, `summary`, and `context show/update` commands
