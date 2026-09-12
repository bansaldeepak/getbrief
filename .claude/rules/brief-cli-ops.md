---
paths:
  - "documentation/**"
---

## Brief CLI — Mandatory for Documentation Mutations

Never use direct `Write`/`writeFileSync` to create or modify files under `documentation/stories/`, `documentation/todo/`, `documentation/decisions/`, or `documentation/memory/`. Always use the brief CLI — it keeps `tracker.yaml` in sync and formats files consistently.

### Commands You Need

```bash
# Create
brief story create "Title" --feature=<folder>
brief story task create S-NNN "Task title" --priority=P0
brief todo create "Title"
brief decision create "Title"
brief memory create "Title" --memtype=feedback

# Update
brief story update S-NNN status=completed
brief story task update S-NNN-TN status=done
brief todo update TODO-NNN status=done
brief decision update DEC-NNN status=superseded
brief memory update <ID|slug|title> --body="new content"

# Retire (memory only — keeps file for audit trail)
brief memory retire <ID|slug|title>

# Read
brief story show S-NNN
brief story task S-NNN-TN
brief search "<query>"
```

### Status vocabulary — stories and tasks differ

A finished **story** is `completed`; a finished **task** is `done`. They are not interchangeable, and
nothing validates them — a typo lands silently and the story disappears from `brief completed`.

| Level | In flight | Finished | Other |
|---|---|---|---|
| Story | `planned` → `active` / `in_progress` | `completed` | `draft`, `superseded` |
| Task | `pending` | `done` | `blocked` |
| TODO | `open` | `done` | `obsolete`, `moot` |

`brief story update` rewrites the `**Status**:` header in `story.md` too, so the tracker and the story
file stay in step — but it leaves any parenthetical after the status untouched. Check that the
parenthetical is still true after the update.

### Memory commands accept ID, slug, or title

Memory files are slug-named (`deploy-process.md`), not ID-named (`MEM-001.md`). All memory
commands (`show`, `update`, `retire`) accept any of: `MEM-001`, `deploy-process`, or
`"Deploy process"`. Never delete memory — use `brief memory retire` to set `status: retired`
and stamp `valid_until`, preserving the file for audit trail.

### Regenerating the tracker

`brief tracker generate --markdown` rebuilds `tracker.yaml` **from the filesystem**, then regenerates
`PROJECT-TRACKER.md`. It picks up story and TODO files that were never registered, so always
`--dry-run` first and diff the id set — a rebuild should be additive, and anything it *removes* is a
finding, not a cleanup.

Direct `Write` to `story.md`, `summary.md`, or task files is allowed only for content edits (not creation or status changes).
