---
name: memory-mechanisms
description: Three separate memory systems exist on this machine and have never been reconciled — audit before adding a fourth
type: project
created: 2026-07-29
updated: 2026-07-29
valid_until: 2026-10-29
importance: 4
---

Noticed while running the post-ship checkpoint that created this file. **Unresolved — do not assume
one of these is authoritative until it is.**

1. **Repo `MEMORY.md` + `memory/`** — the documented convention (`project-memory` skill), index
   capped at ~40 lines, feature context flushed to `context.md`. Curated by `/sdlc memory-review`
   via the `self-improving` agent.
2. **Host hook scripts** — `~/.claude/settings.json` runs `memory-checkpoint.sh` on
   `UserPromptSubmit` and `memory-reset-counter.sh` on `SessionStart`. Neither was written by, nor
   is referenced by, any skill in this repo. Their contents have never been reviewed.
3. **Provider-side memory directories** — `~/.claude/projects/*/memory/` in the host's own
   frontmatter format (`metadata.type`), which the global `CLAUDE.md` explicitly forbids writing to.
   `project-memory` says these get a pointer only, and to treat anything found there as a cache.

**Why it matters:** three systems that can each claim to hold "what we remember" is exactly how a
stale fact survives a prune — each curator assumes another owns it.

**How to apply:** before extending memory in any direction, read the two hook scripts and decide
whether they feed system 1 or compete with it. If they compete, retire one.

Irony worth recording: this repo defines the `MEMORY.md` convention and had neither `MEMORY.md` nor
`memory/` until the day it shipped that skill.

Related: [[cross-reference-drift]] — same root cause, no single owner.
