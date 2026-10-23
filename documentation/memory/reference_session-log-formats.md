---
name: session-log-formats
description: Where Claude and Codex record sessions and token usage, and the
  three details that make a naive reader wrong
type: reference
created: 2026-07-29
updated: 2026-07-29
valid_until: 2027-01-29
importance: 4
_brief:
  version: 1
  record_id: ab397c52-f700-42b9-b30d-3d72d4da1085
  item:
    id: reference_session-log-formats
    type: memory
    title: Where Claude and Codex record sessions and token usage, and the three
      details that make a naive reader wrong
    status: active
    link: null
    pr: null
---

Both hosts record the **git branch**, which is what makes per-story token attribution exact and
retroactive without any capture hook. Consumed by `scripts/token-usage.py`.

| | Claude Code | Codex |
|---|---|---|
| Path | `~/.claude/projects/<encoded-cwd>/<session>.jsonl` | `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` |
| Branch | `gitBranch` on entries | `session_meta.payload.git.branch` |
| Usage | `message.usage` per assistant entry | `payload.info.total_token_usage` on `token_count` |

Three things that produce wrong numbers if you assume symmetry:

1. **Codex `total_token_usage` is cumulative per session** — take the last one, never sum them.
2. **Codex nests `cached_input_tokens` inside `input_tokens`**; Claude reports cache-create and
   cache-read as separate billable input. So a Codex session's total is input + output, and adding
   its cache column again double-counts.
3. **Claude metadata is spread across entries.** The first line carrying `sessionId` is usually a
   `queue-operation` with no `cwd` and no `gitBranch`. Locking metadata in from that line makes
   every branch filter match nothing — fill each field as it first appears.

Codex records no model name in `session_meta`, only `model_provider`. Rows are labelled `Codex`.

Related: [[agent-config-loading]] for what else differs between the two hosts.
