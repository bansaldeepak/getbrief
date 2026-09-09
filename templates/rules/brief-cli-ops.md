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
brief story update S-NNN status=done
brief story task update S-NNN-TN status=completed
brief todo update TODO-NNN status=done
brief decision update DEC-NNN status=superseded

# Read
brief story show S-NNN
brief story task S-NNN-TN
brief search "<query>"
```

Direct `Write` to `story.md`, `summary.md`, or task files is allowed only for content edits (not creation or status changes).
