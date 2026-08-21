# PRD: brief v0.3 — CLI Command Enhancements

## Executive Summary

brief CLI commands currently require multiple round-trips to produce a complete file — they scaffold a template, then the model edits it to fill content. This doubles token cost and adds latency on every create operation. Additionally, command output isn't consistently parseable, and task completion leaves tracker state stale.

## Problem Statement

1. **Round-trip waste**: `brief story create`, `brief todo create`, `brief log` all create placeholder files. Models must then read + edit. 2 tool calls become 4+.
2. **Unparseable output**: Each command prints differently. No reliable way for scripts/models to extract the created file path.
3. **Stale tracker**: Completing a task (`status=completed`) doesn't clear `current_task` on the story. Models must manually run a second update.

## Users

- AI agents (Claude, Codex, Gemini) — primary consumers of brief CLI during sdlc workflow
- Human developer — occasional direct use for quick creates

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Tool calls per create-with-content | 4+ (create → read → edit → verify) | 1 (create with body) |
| File path extraction from output | grep/regex per command | `tail -1` on any create |
| Tracker accuracy after task completion | Manual fix needed | Automatic |

## Requirements

### Must Have

| # | Requirement | Rationale |
|---|-------------|-----------|
| R1 | All create commands accept `--body="content"` flag | One-command full file creation |
| R2 | All create commands accept stdin pipe as body | Shell composability, long content |
| R3 | `brief log` stores multi-line body below frontmatter | Logs need detail, not just one-line notes |
| R4 | All create commands print `path: <repo-relative>` as final line | Parseable by any consumer |
| R5 | Task `status=completed` sets `current_task: null` and `last_task: <id>` | Tracker reflects reality |

### Should Have

| # | Requirement | Rationale |
|---|-------------|-----------|
| R6 | When no body provided, output indicates "template created — fill content" | Clear signal to model that editing is needed |
| R7 | `--body` and stdin are mutually exclusive (flag wins if both) | Predictable precedence |

### Won't Have (this story)

- Context command overhaul (separate epic)
- Tracker version field (Epic 4)
- Auto-advance to next task on completion

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing scripts that parse current output | Medium | Output changes are additive — existing `→` lines stay, `path:` added as new final line |
| Stdin blocking when accidentally called without pipe in TTY | Low | Check `process.stdin.isTTY` — if TTY and no `--body`, skip stdin read entirely |

## Out of Scope

- Changes to `brief context` (already has stdin body support)
- New commands or resource types
- Tracker schema changes beyond adding `last_task` field
