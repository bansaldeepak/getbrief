---
{
  _brief:
    {
      version: 1,
      record_id: 53ea4ce9-01d5-4205-8764-5e4ed6545799,
      item:
        {
          id: S-004,
          type: story,
          title: brief v0.3 — CLI Command Enhancements,
          status: done,
          feature: brief-v0-3-cli-command-enhancements,
          branch: feature/brief-v03-cli-enhancements,
          category: feat,
          created: 2026-08-21,
          tasks: 6,
          story: documentation/stories/brief-v0-3-cli-command-enhancements/S-004/story.md,
          link: null,
          pr: https://github.com/bansaldeepak/agents-setup/pull/21
        },
      legacy: { current_task: null }
    }
}
---
# S-004: brief v0.3 — CLI Command Enhancements

**Status**: done
**Branch**: feature/brief-v03-cli-enhancements
**Created**: 2026-08-21

## Context

brief CLI commands create template files with placeholder comments, requiring 4+ tool calls per create operation (create → read → edit → verify). Models waste tokens and latency on every story/task/todo creation. Additionally, output format varies per command (unparseable), and completing a task leaves `current_task` stale in the tracker.

## Goal

One command = one complete file. Every create accepts full markdown body, prints a parseable path, and tracker state stays accurate automatically.

## Acceptance Criteria

- [ ] All create commands accept `--body="content"` and stdin pipe
- [ ] `brief log` stores multi-line body below frontmatter (not just `note:` field)
- [ ] All create commands print `path: <repo-relative>` as final output line
- [ ] `brief story task update S-NNN-TN status=completed` clears `current_task` and sets `last_task`
- [ ] Backward compatible — no body = template as before

## Scope

**In scope:** log, item (todo/decision/research/audit), story, story task — create commands + output format + task completion tracker logic

**Out of scope:** context command (already works), new resource types, tracker version field, auto-advance to next task
