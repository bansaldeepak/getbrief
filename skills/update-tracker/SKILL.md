---
name: update-tracker
description: Update the project tracker (documentation/PROJECT-TRACKER.md) when a story starts or completes. Maintains a management-level summary of all work across the project. Auto-triggered by story lifecycle events.
---

# Update Project Tracker

Maintain `documentation/PROJECT-TRACKER.md` as a live management-level summary of all stories in the project. This file acts as a dashboard — other agents and team members use it to understand what's in progress, what's done, and what's planned.

## When to Update

Update the tracker at these moments:

1. **Story starts** (`in_progress`) — Add/update row when first implementation task begins
2. **Story completes** (`completed`) — Update status, add completion date and summary
3. **Story blocked** (`blocked`) — Update status, note blocker
4. **New story planned** (`planned`) — Add row with planned status

## Tracker Format

The tracker file must follow this exact structure:

```markdown
# Project Tracker

> Management-level summary of all stories. For task-level details, open the linked story.
>
> Last updated: YYYY-MM-DD

## Active Work

| Story | Title | Phase | Category | Owner | Status | Started | Completed | Tokens | Summary |
|-------|-------|-------|----------|-------|--------|---------|-----------|--------|---------|
| [S-NNN](documentation/stories/<feature>/S-NNN/) | Short title | Phase N | feat/fix/chore | agent/human | in_progress | YYYY-MM-DD | — | — | One-line summary |

## Completed

| Story | Title | Phase | Category | Owner | Status | Started | Completed | Tokens | Summary |
|-------|-------|-------|----------|-------|--------|---------|-----------|--------|---------|
| [S-001](documentation/stories/<feature>/S-001/) | ... | ... | ... | ... | completed | ... | ... | O:40Min/1Mout S:5Min/0.5Mout | ... |

## Planned / Backlog

| Story | Title | Phase | Category | Priority | Notes |
|-------|-------|-------|----------|----------|-------|
| S-NNN | ... | ... | ... | P0/P1/P2 | ... |
```

## Column Definitions

| Column | Description |
|--------|-------------|
| **Story** | Link to story folder: `[S-NNN](documentation/stories/<feature>/S-NNN/)` |
| **Title** | Short descriptive title (max 60 chars) |
| **Phase** | Project phase (e.g., Phase 0, Phase 1, MVP, etc.) |
| **Category** | `feat` / `fix` / `chore` / `docs` / `refactor` / `infra` |
| **Owner** | Who's working on it: `Codex` / `human` / person name |
| **Status** | `planned` / `in_progress` / `blocked` / `completed` |
| **Started** | Date work began (YYYY-MM-DD) |
| **Completed** | Date story completed, or `—` if in progress |
| **Tokens** | Token usage by model with IN/OUT split: `O:40Min/1Mout S:5Min/0.5Mout` (O=Opus, S=Sonnet, H=Haiku). High input = optimization opportunity (reduce context). Filled at retro via `~/.Codex/scripts/token-usage.sh`. `—` while in progress. |
| **Summary** | One-line description of what was delivered |
| **Priority** | `P0` (critical) / `P1` (important) / `P2` (nice-to-have) |
| **Notes** | Brief context for backlog items |

## Instructions

### When starting a story:

1. Read `documentation/PROJECT-TRACKER.md`
2. If file doesn't exist, create it with the template above
3. Add or move the story row to **Active Work** with status `in_progress`
4. Set the `Started` date to today
5. Commit the tracker update (can be part of the story files commit)

### When completing a story:

1. Move the story row from **Active Work** to **Completed**
2. Set status to `completed`
3. Fill in `Completed` date
4. Fill in `Tokens` column — run `~/.Codex/scripts/token-usage.sh <project-Codex-dir> --after <story-start-date>` and use the compact format: `O:1.2M S:0.5M H:0.2M`
5. Write a one-line summary of what was delivered
6. Update "Last updated" timestamp
7. Commit the tracker update

### When planning a story (during /project-plan):

1. Add the story to **Planned / Backlog** section
2. Include phase, category, priority, and brief notes
3. When the story starts, move it to **Active Work**

## GitHub Projects Integration (Optional)

If the project has a GitHub Projects board configured, sync story status there too. This provides statefulness between sessions and a visual board.

### Board Columns

`Discovery | PRD | Planned | In Progress | Review | Done`

### Sync Commands

```bash
# Check if project board exists
gh project list --owner <org>

# Create issue for a story
gh issue create --title "S-NNN: <title>" --label "story" --body "<summary>"

# Move issue to column (via project field update)
gh project item-edit --id <item-id> --field-id <status-field-id> --project-id <project-id> --single-select-option-id <option-id>
```

### When to Sync

- **Story planned** → Create GitHub Issue, add to board in "Planned" column
- **PRD approved** → Move to "PRD" column (if issue exists)
- **Implementation starts** → Move to "In Progress"
- **PR created** → Move to "Review"
- **Story completed** → Move to "Done"

### Project Board Config

Projects store their GitHub project config in `documentation/github-project.json`:
```json
{
  "projectId": "<GitHub Project ID>",
  "org": "<GitHub org name>",
  "repo": "<repo name>",
  "statusFieldId": "<field ID for Status column>"
}
```

If this file doesn't exist, skip GitHub Projects sync and only update PROJECT-TRACKER.md.

## Rules

- **One row per story** — never duplicate
- **Keep summaries short** — one line, max 80 chars. Link to story for details.
- **Move rows between sections** — don't delete completed stories, move them to Completed
- **Always update "Last updated"** timestamp when modifying the file
- **Sort Active Work** by start date (newest first)
- **Sort Completed** by completion date (newest first)
- **This is a live document** — treat it like a database that other agents read
- **GitHub Projects sync is best-effort** — if `gh` command fails, log a warning but don't block the story workflow
