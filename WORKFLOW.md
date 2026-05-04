# Global Agent Workflow

Universal rules for every project on this machine.

## Full Lifecycle Workflow

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → review (🔒) → merge (🔒) → retro
    │         │          │                    │           │
    │    (recommended)   (when arch changes)  │      (auto after merge)
    │                                    qa agent
    └── /decision-doc (anytime a non-obvious choice arises)
    └── /pre-mortem (auto for high-risk features)
```

🔒 = **Human approval gate** — pause and wait for explicit user approval.

| Scenario | Workflow |
|----------|----------|
| **Bug fix or < 30 min task** | Skip PRD/TRD → just fix → `qa` → `/review` → merge |
| **Feature (clear scope)** | `/prd` → `/trd` (if arch changes) → `/project-plan` → implement → `/review` → merge → `/retro` |
| **Feature (ambiguous scope)** | `/discover` → `/prd` → `/trd` → `/project-plan` → implement → `/review` → merge → `/retro` |
| **Architecture decision** | Auto-invoke `/decision-doc` |
| **High-risk feature** | Auto-invoke `pre-mortem` before implementation |
| **Ambiguous** | Ask user: "This seems like it needs discovery. Want me to run `/discover`?" |

## Story-Based Execution

- **Feature folder**: `documentation/stories/<feature-name>/` — groups PRD, TRD, stories, decisions
- **Story ID**: `S-NNN`. **Task ID**: `S-NNN-T1`, `S-NNN-T2`, etc.
- **One task = one commit** — atomic unit of work
- **Mandatory PRD/TRD**: Always exist in every feature folder (skip-justified for trivial work)
- **Story-first rule**: `story.md`, `tasks/index.md`, `tasks/T-NNN.md`, `summary.md` must exist BEFORE implementation
- **After each task**: `qa` agent → commit → update `tasks/index.md` + `summary.md` → commit story updates separately
- **Legacy compat**: If story has `tasks.md` (single file), continue that format. New stories use `tasks/`.
- **Before PR**: `/review` → wait for human approval
- **After merge**: `/retro` → `self-improving` agent
- **Story completion**: All tasks done, `summary.md` finalized, status `completed`, tracker updated

## Project Tracker

Every project has `documentation/PROJECT-TRACKER.md`. One row per story. Updated on start/completion.

## Git Branch & Push Safety

**Never commit directly to `main`.** Non-negotiable.

**Before every commit**: Run `git branch --show-current` — verify NOT on `main`. If on `main` → STOP, create branch first.

- Never push to `main` — all changes through PRs
- Never force-push without explicit user consent in that moment
- New branches: `git push -u origin <branch>`
- Naming: `feature/<name>`, `fix/<name>`, `chore/<name>`, `hotfix/<name>`

## Commit Convention

```
type(scope): subject

Task: S-NNN-T<N>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `ci`. Task ID in body, not subject.

## Documentation-First Workflow

Application docs updated BEFORE stories or code. Schema docs, API docs, flow docs — committed separately before implementation. Stories reference docs (don't repeat them).

**Doc sync on commit**: If a change affects how future code should be written → grep docs, skills, READMEs and update all references.

## Repo-Local References Only

Every file referenced in project documentation must exist inside the repo. Never reference global paths. Copy external files into `documentation/stories/<feature>/` before referencing.

## Web Fetching — llms.txt First

1. Fetch `https://<domain>/llms.txt` first
2. Use it to find exact doc pages needed
3. Fallback to homepage if 404

## Safe Code Modifications

- Only change what was asked — if scope ambiguous, ask first
- Never bulk auto-fix (eslint --fix, prettier --write) on entire codebase
- Preserve over delete — comment out with `// TODO: remove after verification` if unsure
- Propose before executing for broad blast radius changes

## Plan Mode

When in planning mode, **follow the lifecycle workflow above**. Planning is structured — not freestyling:

1. Identify which lifecycle phase applies (discover / prd / trd / project-plan)
2. Follow that phase's skill exactly
3. Don't skip phases — if PRD doesn't exist yet, create it before jumping to TRD
4. Exit planning only when the artifact (PRD, TRD, story, tasks) is complete and approved

## Memory Checkpoints (Mandatory)

All memory goes to the project repo: root `MEMORY.md` + `memory/` directory. Never to provider-specific global config.

Memory must be captured at these gates — not optional:

| Gate | When | What to capture |
|------|------|-----------------|
| **Post-planning** | After PRD + TRD finalized (🔒 approved) | Key decisions, scope boundaries, rejected alternatives, constraints discovered |
| **Post-implementation** | After all tasks done, qa passes | Implementation gotchas, patterns that emerged, things that surprised you |
| **Post-ship** | After merge/deploy/ship | What worked, what didn't, performance observations, user feedback context |

**How**: Write to project `memory/` dir → update root `MEMORY.md` index.

If nothing notable at a gate — explicitly state "No new memory at this checkpoint" so it's clear the gate was hit, not skipped.

## Critical Thinking

**Why → What → How** (in that order).

- Never assume — ask when requirements ambiguous
- Highlight risks user may have overlooked
- Verify blast radius before changing shared code — grep all usages
- Challenge scope — push back if task grows beyond definition
