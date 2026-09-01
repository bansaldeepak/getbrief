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

## Plan Mode

Planning is structured via the lifecycle workflow. Follow the phase's skill exactly. Don't skip
phases. Exit planning only when the artifact is complete and approved.

## Memory

Memory lives **in the repo** — never in provider global config.

Mandatory checkpoints (if nothing's notable, say so explicitly):
- **Post-planning** — decisions, scope boundaries, rejected alternatives
- **Post-implementation** — gotchas, patterns that emerged, surprises
- **Post-ship** — what worked, what didn't, user-feedback context
