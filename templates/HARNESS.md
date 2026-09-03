# Brief Workflow

## Full Lifecycle Workflow

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → retro → merge (🔒)
                                                   │
                                            qa agent per task
```

🔒 = **Human approval gate** — pause for explicit user approval.

**All phases run through the `brief` router**: `/brief <phase>`. The router owns the full graph.

## Story-Based Execution

- **Feature folder**: `documentation/stories/<feature-name>/` — groups PRD, TRD, stories, decisions
- **Story ID**: `S-NNN`. **Task ID**: `S-NNN-T1`, `S-NNN-T2`, etc.
- **One task = one commit** — atomic unit of work
- **Mandatory PRD/TRD**: Always exist in every feature folder (skip-justified for trivial work)
- **Story-first rule**: `story.md`, `tasks/T-NNN.md`, `summary.md` must exist BEFORE implementation
- **After each task**: `qa` agent → commit → update task status + `summary.md` → commit story updates separately
- **Legacy compat**: If story has `tasks.md` or `tasks/index.md`, continue that format. New stories use individual `tasks/T-NNN.md` files (status lives in each task file).
- **PR opened**: `/brief pr-review` → wait for human approval
- **User tests**: Human verifies the build works
- **Before merge**: `/brief retro` — captures learnings, updates docs/status, commits to same PR
- **After merge**: `self-improving` agent curates memory from retro findings

## Plan Mode

Planning is structured via the lifecycle workflow. Follow the phase's skill exactly. Don't skip
phases. Exit planning only when the artifact is complete and approved.

## Memory

Memory lives **in the repo** — never in provider global config. Full format: `/brief memory` skill.

Mandatory checkpoints (if nothing's notable, say so explicitly):
- **Post-planning** — decisions, scope boundaries, rejected alternatives
- **Post-implementation** — gotchas, patterns that emerged, surprises
- **Post-ship** — what worked, what didn't, user-feedback context

### Skills & Rules

Skills in `.claude/skills/brief/` (project-local). Rules in `.claude/rules/` (project-local). Both auto-apply based on description/globs.

## Documentation & References

- Docs updated BEFORE stories or code. **Doc sync on commit**: grep docs, skills, READMEs and update all references.
- Every file referenced in documentation must exist inside the repo. Never reference global paths.
- Web fetching: try `https://<domain>/llms.txt` first, then find exact doc pages, fallback to homepage.
