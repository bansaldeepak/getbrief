---
name: memory-mechanisms
description: Three separate memory systems exist on this machine and have never been reconciled — audit before adding a fourth
type: project
created: 2026-07-29
updated: 2026-07-30
valid_until: 2026-10-29
importance: 4
---

Noticed while running the post-ship checkpoint that created this file. **Unresolved — do not assume
one of these is authoritative until it is.**

1. **Repo `MEMORY.md` + `memory/`** — the documented convention (`project-memory` skill), index
   capped at ~40 lines, feature context flushed to `context.md`. Curated by `/sdlc memory-review`
   via the `self-improving` agent.
2. **Host hook scripts** — `~/.claude/settings.json` runs `memory-checkpoint.sh` on
   `UserPromptSubmit` and `memory-reset-counter.sh` on `SessionStart`. Reviewed and rewritten
   2026-07-29; both now live in `scripts/` here and are git-tracked, and the nudge names the repo as
   the destination so it feeds system 1 rather than competing with it. **They do not fire — see
   below.**
3. **Provider-side memory directories** — `~/.claude/projects/*/memory/` in the host's own
   frontmatter format (`metadata.type`), which the global `CLAUDE.md` explicitly forbids writing to.
   `project-memory` says these get a pointer only, and to treat anything found there as a cache.

**Why it matters:** three systems that can each claim to hold "what we remember" is exactly how a
stale fact survives a prune — each curator assumes another owns it.

**How to apply:** before extending memory in any direction, check whether system 2 actually runs.
Right now it does not, so every capture in practice comes from a human asking or a lifecycle gate.

## PENDING — the checkpoint hook never fires (as of 2026-07-30)

Deferred deliberately; not yet started. `memory-checkpoint.sh` is **correct in isolation** — it fires
on the 15th invocation and survives a corrupt or missing counter (both traced by hand). But
`~/.claude/hook-state/memory_counter` read `0` after roughly 20 turns of a real session and the nudge
never appeared, so **the wiring is the fault, not the script.**

Two candidates, distinguishable in one `claude --debug` session:

1. `UserPromptSubmit` is not firing at all — check whether the hook is registered under the name the
   installed version expects, and whether its output is injected or discarded.
2. `SessionStart` fires more often than assumed, so `memory-reset-counter.sh` zeroes the count before
   it ever reaches 15. Compaction or resume would do it.

Do not "fix" the script's arithmetic; it is not wrong. Confirm the hook is invoked at all first —
`echo` a marker to a file from the hook itself and check whether the file appears.

Consequence while it stays broken: the three-gate convention in `WORKFLOW.md` is the *only* thing
capturing memory, and a long session that crosses no gate captures nothing.

Irony worth recording: this repo defines the `MEMORY.md` convention and had neither `MEMORY.md` nor
`memory/` until the day it shipped that skill.

Related: [[cross-reference-drift]] — same root cause, no single owner.
