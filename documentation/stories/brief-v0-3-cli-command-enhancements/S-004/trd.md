# TRD: brief v0.3 — CLI Command Enhancements

## Architecture Decision

All changes stay within `brief/lib/`. No new dependencies. One new shared utility (`body.mjs`), modifications to three command files and the CLI router.

## Design

### Shared Body Input Utility

**New file:** `brief/lib/body.mjs`

```js
export async function readBody(rawArgs) → string | null
```

Logic:
1. Check `rawArgs` for `--body=<content>` — extract and return
2. If no `--body` and `!process.stdin.isTTY` — read stdin, return trimmed string
3. Otherwise return `null` (caller uses template as-is)

Precedence: `--body` flag wins over stdin if both provided.

Reuses pattern from `lib/commands/context.mjs` (the existing `readStdin()` function). Context command itself stays untouched — it already works correctly.

### Log Body Storage (R3)

**File:** `brief/lib/commands/log.mjs`

Current format:
```markdown
---
date: 2026-08-21
action: UPDATE
note: short message
---
```

New format (when body provided):
```markdown
---
date: 2026-08-21
action: UPDATE
note: short message
---

Full body content here.
Multiple paragraphs supported.
```

- `note:` stays as short summary (first 80 chars of message, or explicit `--note=` override)
- Body appears below closing `---`
- When no body: format unchanged (backward compatible)

### Item Create Body Injection (R1, R2)

**File:** `brief/lib/commands/item.mjs`

Templates use HTML comments as placeholders. When body provided, replace the first `<!-- ... -->` in the main content section:

| Type | Section | Placeholder replaced |
|------|---------|---------------------|
| todo | `## Why` | `<!-- Why this matters... -->` |
| decision | `## Context` | `<!-- What prompted... -->` |
| research | `## Motivation` | `<!-- Why this matters now... -->` |
| audit | `## Method` | `<!-- How the audit... -->` |

Implementation: After generating template string, if body is non-null, do a single regex replace on the first `<!--[^>]*-->` within the target section.

### Story/Task Create Body Injection (R1, R2)

**File:** `brief/lib/commands/story.mjs`

| Command | Section | Placeholder replaced |
|---------|---------|---------------------|
| `story create` | `## Context` | `<!-- Why this work is needed -->` |
| `story task create` | `## Description` | `<!-- What this task accomplishes -->` |

Same regex approach as items.

### Standardized Output (R4)

All create commands adopt this output pattern:

```
✓ Created <ID>: <title>
  <metadata lines>
path: <repo-relative-path-to-primary-file>
```

- `path:` is always the final line
- For story create (multiple files): path points to `story.md`
- For task create: path points to `tasks/T-NNN.md`
- For log: path points to `documentation/logs/<file>.md`
- For item: path points to `documentation/<type>/<ID>.md`

### Task Completion Tracker Update (R5)

**File:** `brief/lib/commands/story.mjs` — `storyTaskUpdate()`

Add after the existing `in_progress` handler (line ~267):

```js
if (["completed", "done"].includes(updates.status)) {
  const items = readTracker(root);
  const storyIdx = items.findIndex((i) => i.id === storyId);
  if (storyIdx !== -1) {
    items[storyIdx].current_task = null;
    items[storyIdx].last_task = taskId;
    writeTracker(root, items);
  }
}
```

Schema change: story entries gain optional `last_task` field (null by default). No migration needed — YAML is schema-flexible.

### CLI Router Changes

**File:** `brief/cli.mjs`

The story command import already uses `await`. Item and log commands need their handlers made async (they currently aren't). Change:
- `itemCommand` → `async itemCommand` (add `await` in cli.mjs)
- `logCommand` → `async logCommand` (add `await` in cli.mjs)

## File Change Summary

| File | Change Type | Tasks |
|------|-------------|-------|
| `brief/lib/body.mjs` | New | T1 |
| `brief/lib/commands/log.mjs` | Modify | T2, T5 |
| `brief/lib/commands/item.mjs` | Modify | T3, T5 |
| `brief/lib/commands/story.mjs` | Modify | T4, T5, T6 |
| `brief/cli.mjs` | Modify | T3, T4 (await async commands) |

## Rollback Strategy

All changes are additive. Existing command signatures unchanged. No database migrations. Rollback = revert commits.

## Testing

```bash
# Body via flag
brief todo create "test" --body="This is the why"
brief todo show TODO-011  # verify body in Why section

# Body via stdin
echo "Detailed context" | brief story create "Test stdin"
brief story show S-005  # verify Context section filled

# Log with body
echo "Full explanation" | brief log "Summary line"
brief log show <file>  # verify body below frontmatter

# Parseable output
OUTPUT=$(brief todo create "parse test")
echo "$OUTPUT" | tail -1  # → path: documentation/todo/TODO-NNN.md

# Task completion
brief story task create S-005 "Task one"
brief story task update S-005-T1 status=in_progress
brief story task update S-005-T1 status=completed
brief tracker show | grep S-005  # current_task: null, last_task: S-005-T1

# Backward compat (no body = template as before)
brief todo create "no body test"
brief todo show TODO-NNN  # still has <!-- placeholder -->
```

Clean up test data after verification.
