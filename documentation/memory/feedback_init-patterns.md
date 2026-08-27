---
name: init-patterns
description: "Patterns and gotchas from building brief init (S-011): atomic manifest, recursive mtime, marker merge, extension scanning"
type: feedback
created: 2026-08-27
updated: 2026-08-27
valid_until: permanent
importance: 3
---

## Patterns that worked

- **Atomic manifest write**: write to `.tmp` then `rename()` — prevents corrupt state on crash.
- **Recursive file mtime** for stale-copy detection: directory mtime only reflects direct children,
  not nested file edits. Walk the tree and check each file.
- **Marker-based merge** (`<!-- brief:auto section="X" -->`) for idempotent rule generation — safe
  to re-run without clobbering user edits outside markers.
- **SKIP_DIRS set** for extension scanning: without it, `node_modules/` makes detection take seconds
  and returns noise. Always skip: `node_modules`, `dist`, `build`, `vendor`, `.next`, `.nuxt`, `coverage`.
- **Line-level gitignore matching**: substring match (`content.includes(entry)`) gives false positives
  when entries are substrings of other lines. Split into lines and use `===`.

## Gotchas

- **`utimesSync` in tests**: to backdate for stale-copy tests, you must target the *file* inside
  the directory, not the directory itself — directories only reflect direct-child changes.
- **`await import()` inside `describe()`**: Node test runner rejects this at parse time. Move
  dynamic imports to top-level.
- **Indented code fences**: CommonMark allows up to 3 leading spaces on ` ``` `. The marker parser
  must use `/^ {0,3}\`\`\`/` to detect code blocks, otherwise markers inside indented fenced blocks
  are mis-parsed.

**Why:** These patterns came from real bugs during S-011 implementation and pr-review.
**How to apply:** Reference when building or extending any file-scanning, template-merging, or
manifest-writing feature in brief.

Related: [[project-next-steps-scaffold]], [[skills-cli-local-sources]].
