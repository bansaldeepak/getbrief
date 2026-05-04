---
name: project-plan
description: "/project-plan -- Story-Based Planning Skill. Interactive planning for breaking features into tracked stories and tasks."
user_invocable: true
model: opus
---

# /project-plan -- Story-Based Planning Skill

Interactive planning skill for breaking features into tracked stories and tasks.

**Usage**: `/project-plan <feature description>`

## Instructions

You are entering planning mode. Do NOT write any implementation code. Your job is to produce a story with tasks that will guide implementation.

### Phase 0: Ensure PRD/TRD Exist

**Every feature folder must have both `PRD.md` and `TRD.md`.** No exceptions — we don't skip steps.

Before planning, check `documentation/stories/<feature-name>/`:

1. **PRD.md**:
   - If it exists and is approved (🔒) → reference it as the source of truth for scope
   - If it exists but is not approved → stop and redirect: "PRD needs approval first. Run `/prd` to finalize."
   - If it doesn't exist → create it. For non-trivial features, run the full `/prd` flow. For trivial work (bug fixes, config changes), create a minimal PRD with skip justification:

   ```markdown
   # PRD: <Feature Name>

   **Status**: skipped
   **Reason**: <Why full PRD is unnecessary — e.g., "Single bug fix with clear reproduction steps", "Config change with no user-facing impact">

   ## What
   <One-sentence description of the change>
   ```

2. **TRD.md**:
   - If it exists → reference it for architecture decisions and implementation order
   - If it doesn't exist → create it. For arch changes, run the full `/trd` flow. For work with no arch impact, create a minimal TRD with skip justification:

   ```markdown
   # TRD: <Feature Name>

   **Status**: skipped
   **Reason**: <Why full TRD is unnecessary — e.g., "No new services, schemas, or architectural patterns introduced">

   ## Approach
   <One-sentence summary of implementation approach>
   ```

### Phase 1: Gather Context

Read relevant files to understand the current state:
- **PRD.md and TRD.md** (always present — created in Phase 0)
- Project AGENTS.md and documentation/rules/
- Database schema (prisma/schema.prisma if it exists)
- Existing modules/components related to the feature
- Any referenced docs, decision docs, or requirements

### Phase 2: Requirement Gathering (PM Hat)

Before discussing *how* to build anything, understand *why* and *what*. This is mandatory.
If a PRD exists, use it as the foundation — don't re-ask questions already answered there.

**Step A -- Why**: What problem does this solve? Who is affected? Cost of inaction?
**Step B -- What**: What changes from the user's perspective? Success criteria? Explicitly out of scope?
**Step C -- Clarifying Questions**: Present your understanding, then ask 2-3+ concrete questions. Include interpretation, scope, architecture options, edge cases, risks.

For **tech upgrades**: also ask about migration path, rollback plan, incremental approach.

**Wait for the user to answer before proceeding.**

### Phase 3: Propose Breakdown

Based on answers, propose:
- Story title and goal (one sentence)
- Acceptance criteria (checkboxes)
- Ordered task list with task ID, description, files to create/modify, dependencies

**Documentation impact analysis** -- For each task, assess whether the change affects how the project is understood. If any task introduces new patterns, configs, commands, or conventions, include a doc sync step.

**Wait for user approval or adjustments before proceeding.**

### Phase 4: Create Story Files

Determine the next story ID by scanning all `documentation/stories/*/S-NNN/` folders. IDs are sequential per project. Determine the feature folder name -- use an existing one if the story belongs to an in-progress feature, or create a new one (name matches branch slug).

#### `documentation/stories/<feature-name>/S-NNN/story.md`

```markdown
# S-NNN: <Title>

**Status**: planned
**Branch**: feature/<name>
**Created**: <today's date>

## Context
<Why this work is needed>

## Goal
<One sentence outcome>

## User Story
As a <role>, I want <capability>, so that <benefit>.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Scope
**In scope:** ...
**Out of scope:** ...

## References
<Links to relevant docs, schema, requirements>
```

#### `documentation/stories/<feature-name>/S-NNN/tasks/index.md`

Lightweight roster — only status overview. This is what gets loaded for quick status checks.

```markdown
# S-NNN Tasks

| Task ID | Title | Status | Commit |
|---------|-------|--------|--------|
| S-NNN-T1 | <title> | pending | -- |
| S-NNN-T2 | <title> | pending | -- |
| S-NNN-T3 | <title> | pending | -- |
```

**Rules for index.md:**
- Maximum ~30 lines — just the table, no detail
- Update one row when a task completes (status + commit hash)
- This is the only file loaded for status overview — keep it lean

#### `documentation/stories/<feature-name>/S-NNN/tasks/T-001.md` (one per task)

Each task gets its own file with full detail:

```markdown
# S-NNN-T1: <Title>

**Priority:** P0/P1/P2 | **Status:** pending | **Blocked By:** --

## What
One-paragraph description of the deliverable.

## Why
Why this task exists -- what breaks or is missing without it.

## How

**Step 1 -- <action>:**
<code block or file content showing exactly what to create/change>

**Step 2 -- <action>:**
<next step with code>

**Step N -- Verify:**
```bash
<verification commands>
```

## Acceptance Criteria
- [ ] Specific, testable criteria (not vague like "works correctly")
- [ ] Concrete: "typecheck passes", "returns 201 with body matching schema"
```

What makes a good "How" section:
- **File paths** -- Exact paths for files to create or modify
- **Code snippets** -- Enough to show the pattern (not necessarily full file)
- **Reference existing patterns** -- "Follow the pattern in `app/server/modules/course/routes.ts`"
- **Verification commands** -- `npm run typecheck`, `npm run build`, specific curl commands
- **Edge cases** -- Note error handling, constraint violations, auth checks

**File naming:** `T-001.md`, `T-002.md`, etc. (zero-padded for sort order)

**Token efficiency:** During implementation, only read the task file you're working on. During review, only read the task(s) being reviewed. Never load all task files at once unless doing a full retro.

#### `documentation/stories/<feature-name>/S-NNN/summary.md`

```markdown
# S-NNN: <Title> -- Summary

## What Changed
<Updated after each task is completed>

## Decisions Made
<Non-obvious choices and why>

## Testing
<How to verify the feature works>

## Token Usage
<Filled at retro — run: ~/.Codex/scripts/token-usage.sh <project-Codex-dir> --after <story-start-date>>

| Model | Input | Cache Create | Cache Read | Output | Total |
|-------|------:|-------------:|-----------:|-------:|------:|
| Opus | | | | | |
| Sonnet | | | | | |
| Haiku | | | | | |
| **Total** | | | | | |

## Follow-up
<Deferred items, future improvements>
```

### Phase 5: Update Project Tracker

Add the new story to `documentation/PROJECT-TRACKER.md` in the **Planned / Backlog** section. If the file doesn't exist, create it using the template from the `update-tracker` skill.

### Phase 6: Confirm

Report back:
- Story ID and title
- Number of tasks
- Suggested branch name: `feature/<story-slug>`
- Ask: "Ready to start S-NNN-T1?"

Also create Codex tasks (TaskCreate) mirroring the story tasks for session visibility.

## Status Values

- **draft** -- Initial idea, not yet broken down
- **planned** -- Broken down into tasks, ready to start
- **in_progress** -- Actively being worked on
- **blocked** -- Waiting on dependency
- **completed** -- Done, committed, verified

## Legacy Format Handling

Existing stories may use a single `tasks.md` file instead of the `tasks/` directory. When working with an existing story:

1. **Detect format** — Check whether `S-NNN/tasks.md` (legacy) or `S-NNN/tasks/index.md` (current) exists
2. **Legacy story (tasks.md exists)** — Continue using the single file for that story. Do NOT migrate mid-execution — finish the story in its original format
3. **New stories** — Always use the `tasks/` directory format
4. **Same for PRD/TRD** — If a feature folder predates mandatory PRD/TRD, don't retroactively create skip-justified files for completed stories. Only enforce for new work in that folder.

## Rules

- Never write implementation code during planning
- Never skip the question-asking phase
- Always wait for user approval of the task breakdown
- Tasks should be ordered so each builds on the previous
- Each task should be completable in a single commit
- If a task feels too large, split it further
- Every story must account for documentation sync
