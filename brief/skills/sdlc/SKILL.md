---
name: sdlc
description: "Lifecycle router — redirects to /brief <phase>. Use /brief directly for all lifecycle commands."
user_invocable: true
argument-hint: "[discover|prd|trd|plan|implement|pr-review|retro|decision|memory-review|bug]"
model: opus
---

# /sdlc — Alias for /brief

This skill is a compatibility alias. The lifecycle router has moved to `/brief`.

**Usage**: Instead of `/sdlc <phase>`, use `/brief <phase>`.

## Routing

When invoked as `/sdlc <phase>`, read and follow the corresponding phase file.

**Path resolution:** All paths below are relative to the `/brief` skill's base directory — i.e.,
the sibling `../brief/` directory from this skill's location. Resolve using the base path shown
in the "Base directory for this skill:" system prompt, replacing the final `sdlc` segment with `brief`.

| Phase | Read (relative to ../brief/) |
|-------|------|
| `discover` | `../brief/discover/SKILL.md` |
| `prd` | `../brief/prd/SKILL.md` |
| `trd` | `../brief/trd/SKILL.md` |
| `project-plan` | `../brief/plan/SKILL.md` |
| `plan` | `../brief/plan/SKILL.md` |
| `implement` | `../brief/implement/SKILL.md` |
| `pr-review` | `../brief/pr-review/SKILL.md` |
| `retro` | `../brief/retro/SKILL.md` |
| `decision-doc` | `../brief/decision/SKILL.md` |
| `decision` | `../brief/decision/SKILL.md` |
| `memory-review` | `../brief/memory-review/SKILL.md` |
| `bug` | `../brief/bug/SKILL.md` |

Follow the phase file exactly as if `/brief <phase>` had been invoked.

## Branch Check

Same as `/brief` — before any write, verify `git branch --show-current` is not `main`.

## The Graph

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → retro → merge (🔒)
```

🔒 = human approval gate. See `/brief` router for full lifecycle documentation.
