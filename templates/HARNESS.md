# Brief Workflow

## Full Lifecycle Workflow

```text
discover → prd (approval) → trd (approval) → plan → implement (selected mode)
  → review/fix → retro → review changes/final checks → push/PR (approval) → user tests → merge (approval)
```

All phases use `/brief <phase>`; the router owns ordering. Continue authorized local story work
through review, retro, and checks without repeated handoff permission. Never cross an unanswered gate.
Explicit user approval at its stated scope remains valid.

## Story-Based Execution

- **Feature folder**: `documentation/stories/<feature-name>/` — groups PRD, TRD, stories, decisions
- **Story ID**: `S-NNN`. **Task ID**: `S-NNN-T1`, `S-NNN-T2`, etc.
- **One task = one commit** — atomic unit of work
- **Mandatory PRD/TRD**: Always exist in every feature folder (skip-justified for trivial work)
- **Story-first rule**: `story.md`, `tasks/T-NNN.md`, `summary.md` must exist BEFORE implementation
- **After each task**: `qa` agent → commit → update task status + `summary.md` → commit story updates separately
- **Legacy compat**: If story has `tasks.md` or `tasks/index.md`, continue that format. New stories use individual `tasks/T-NNN.md` files (status lives in each task file).
- **Execution modes**: user selects strict (each commit), selective (critical/manual checkpoints), or auto (local story completion). Recommend from risk and verification; persist selection on resume.
- **Ambiguity**: investigate first, then ask if unresolved; pause dependent work in every mode. Do not re-ask settled decisions or infer answers from silence.
- **Review before publication**: fix all introduced/worsened findings, including minor ones. Existing debt is the user's fix/defer choice.
- **Retro before publication**: capture learning and complete authorized rules/skills/agents updates, then review changes and run final checks. Explicit urgency may defer with owner/revision/trigger.
- **Publication**: user approves push/PR for the reviewed changes; user testing follows. Later changes need review and affected checks; after merge use a linked follow-up branch.
- **Merge**: separate user approval. Successful testing without changes needs no repeat retro.

## Plan Mode

Planning explicitly applies relevant user choices, decisions, rules, skills, and agent guidance in PRD/TRD/tasks. Resolve known questions before execution. Implementation still checks current rules. Preserve required artifacts and applicable user approvals.

## Memory

Memory lives **in the repo** — never in provider global config. Full format: `/brief memory` skill.

Capture explicit user choices immediately with source and stated scope. Ask before broader promotion.
Mandatory reconciliation checkpoints (if nothing's notable, say so explicitly):
- **Post-planning** — decisions, scope boundaries, rejected alternatives
- **Post-implementation** — gotchas, patterns that emerged, surprises
- **Post-ship** — what worked, what didn't, user-feedback context

### Skills & Rules

Read the installed brief skill and applicable project rules explicitly; provider auto-loading differs.
Project-specific conventions remain in the project. Shared skill updates do not authorize overwriting custom project instructions.

## Documentation & References

- Docs updated BEFORE stories or code. **Doc sync on commit**: grep docs, skills, READMEs and update all references.
- Every file referenced in documentation must exist inside the repo. Never reference global paths.
- Web fetching: try `https://<domain>/llms.txt` first, then find exact doc pages, fallback to homepage.
